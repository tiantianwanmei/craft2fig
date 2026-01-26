// ============================================================================
// HDR WORKER - 后台线程解析 HDR 文件（不阻塞主线程）
// ============================================================================
// 2025 最先进方案：
// - 在 Web Worker 中解析 HDR/EXR
// - 使用 Transferable 高效传输数据
// - 支持降采样减少内存占用
// ============================================================================

// Worker 消息类型
export interface HDRWorkerMessage {
  type: 'PARSE_HDR';
  id: string;
  buffer: ArrayBuffer;
  fileName: string;
  maxResolution?: number;
}

export interface HDRWorkerResult {
  type: 'HDR_PARSED' | 'HDR_ERROR' | 'HDR_PROGRESS';
  id: string;
  data?: Float32Array;
  width?: number;
  height?: number;
  error?: string;
  progress?: number;
}

// RGBE 解析器（纯 JS，不依赖 Three.js）
function parseRGBE(buffer: ArrayBuffer): { data: Float32Array; width: number; height: number } {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  // 1. 解析头部
  let pos = 0;
  let line = '';
  let width = 0;
  let height = 0;

  // 读取头部行
  while (pos < bytes.length) {
    const char = String.fromCharCode(bytes[pos++]);
    if (char === '\n') {
      if (line === '') break; // 空行表示头部结束

      // 解析分辨率
      const match = line.match(/-Y\s+(\d+)\s+\+X\s+(\d+)/);
      if (match) {
        height = parseInt(match[1], 10);
        width = parseInt(match[2], 10);
      }
      line = '';
    } else {
      line += char;
    }
  }

  // 检查最后一行（分辨率可能在最后）
  if (line) {
    const match = line.match(/-Y\s+(\d+)\s+\+X\s+(\d+)/);
    if (match) {
      height = parseInt(match[1], 10);
      width = parseInt(match[2], 10);
    }
  }

  if (width === 0 || height === 0) {
    throw new Error('无法解析 HDR 分辨率');
  }

  // 2. 解析像素数据
  const data = new Float32Array(width * height * 4);
  let dataPos = 0;

  for (let y = 0; y < height; y++) {
    // 检查 RLE 编码
    if (bytes[pos] === 2 && bytes[pos + 1] === 2) {
      // 新式 RLE 编码
      const scanlineWidth = (bytes[pos + 2] << 8) | bytes[pos + 3];
      pos += 4;

      if (scanlineWidth !== width) {
        throw new Error('扫描线宽度不匹配');
      }

      // 解码 4 个通道
      const scanline = new Uint8Array(width * 4);
      for (let ch = 0; ch < 4; ch++) {
        let x = 0;
        while (x < width) {
          const code = bytes[pos++];
          if (code > 128) {
            // RLE 运行
            const count = code - 128;
            const value = bytes[pos++];
            for (let i = 0; i < count; i++) {
              scanline[x * 4 + ch] = value;
              x++;
            }
          } else {
            // 原始数据
            for (let i = 0; i < code; i++) {
              scanline[x * 4 + ch] = bytes[pos++];
              x++;
            }
          }
        }
      }

      // 转换为浮点
      for (let x = 0; x < width; x++) {
        const r = scanline[x * 4];
        const g = scanline[x * 4 + 1];
        const b = scanline[x * 4 + 2];
        const e = scanline[x * 4 + 3];

        const scale = e ? Math.pow(2, e - 128 - 8) : 0;
        data[dataPos++] = r * scale;
        data[dataPos++] = g * scale;
        data[dataPos++] = b * scale;
        data[dataPos++] = 1;
      }
    } else {
      // 旧式非压缩格式
      for (let x = 0; x < width; x++) {
        const r = bytes[pos++];
        const g = bytes[pos++];
        const b = bytes[pos++];
        const e = bytes[pos++];

        const scale = e ? Math.pow(2, e - 128 - 8) : 0;
        data[dataPos++] = r * scale;
        data[dataPos++] = g * scale;
        data[dataPos++] = b * scale;
        data[dataPos++] = 1;
      }
    }
  }

  return { data, width, height };
}

// 降采样函数
function downsample(
  src: Float32Array,
  srcW: number,
  srcH: number,
  maxRes: number
): { data: Float32Array; width: number; height: number } {
  if (srcW <= maxRes && srcH <= maxRes) {
    return { data: src, width: srcW, height: srcH };
  }

  const scale = Math.min(maxRes / srcW, maxRes / srcH);
  const dstW = Math.floor(srcW * scale);
  const dstH = Math.floor(srcH * scale);
  const dst = new Float32Array(dstW * dstH * 4);

  const scaleX = srcW / dstW;
  const scaleY = srcH / dstH;

  for (let y = 0; y < dstH; y++) {
    for (let x = 0; x < dstW; x++) {
      const srcX = Math.floor(x * scaleX);
      const srcY = Math.floor(y * scaleY);
      const srcIdx = (srcY * srcW + srcX) * 4;
      const dstIdx = (y * dstW + x) * 4;

      dst[dstIdx] = src[srcIdx];
      dst[dstIdx + 1] = src[srcIdx + 1];
      dst[dstIdx + 2] = src[srcIdx + 2];
      dst[dstIdx + 3] = 1;
    }
  }

  return { data: dst, width: dstW, height: dstH };
}

// Worker 消息处理
self.onmessage = async (e: MessageEvent<HDRWorkerMessage>) => {
  const { type, id, buffer, fileName, maxResolution = 2048 } = e.data;

  if (type !== 'PARSE_HDR') return;

  try {
    // 发送进度
    self.postMessage({ type: 'HDR_PROGRESS', id, progress: 10 } as HDRWorkerResult);

    const ext = fileName.split('.').pop()?.toLowerCase();
    let result: { data: Float32Array; width: number; height: number };

    if (ext === 'hdr') {
      // 解析 RGBE 格式
      self.postMessage({ type: 'HDR_PROGRESS', id, progress: 30 } as HDRWorkerResult);
      result = parseRGBE(buffer);
    } else {
      throw new Error(`不支持的格式: ${ext}`);
    }

    self.postMessage({ type: 'HDR_PROGRESS', id, progress: 70 } as HDRWorkerResult);

    // 降采样
    const final = downsample(result.data, result.width, result.height, maxResolution);

    self.postMessage({ type: 'HDR_PROGRESS', id, progress: 90 } as HDRWorkerResult);

    // 返回结果（使用 Transferable）
    self.postMessage(
      {
        type: 'HDR_PARSED',
        id,
        data: final.data,
        width: final.width,
        height: final.height,
      } as HDRWorkerResult,
      [final.data.buffer] // Transferable - 零拷贝传输
    );
  } catch (err) {
    self.postMessage({
      type: 'HDR_ERROR',
      id,
      error: err instanceof Error ? err.message : 'HDR 解析失败',
    } as HDRWorkerResult);
  }
};

export {};
