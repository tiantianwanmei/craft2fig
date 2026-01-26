// ============================================================================
// INLINE HDR WORKER - 内联 Worker 方案（兼容 viteSingleFile）
// ============================================================================

// Worker 代码字符串
const workerCode = `
// RGBE 解析器 - 完整版（更健壮的头部检测）
function parseRGBE(buffer) {
  const bytes = new Uint8Array(buffer);
  let pos = 0;
  let width = 0;
  let height = 0;

  // 读取一行
  function readLine() {
    let line = '';
    while (pos < bytes.length) {
      const c = bytes[pos++];
      if (c === 10) break; // \\n
      if (c !== 13) line += String.fromCharCode(c); // 忽略 \\r
    }
    return line;
  }

  // 1. 查找 HDR 魔数（在前 100 字节内搜索）
  const headerBytes = bytes.slice(0, Math.min(100, bytes.length));
  const headerStr = String.fromCharCode.apply(null, Array.from(headerBytes));

  // 跳过可能的 BOM 或前缀
  if (headerStr.includes('#?RADIANCE')) {
    pos = headerStr.indexOf('#?RADIANCE');
  } else if (headerStr.includes('#?RGBE')) {
    pos = headerStr.indexOf('#?RGBE');
  } else if (headerStr.includes('FORMAT=')) {
    pos = headerStr.indexOf('FORMAT=');
  } else {
    throw new Error('不是有效的 HDR 文件');
  }

  // 2. 跳过头部直到空行
  while (pos < bytes.length) {
    const line = readLine();
    if (line === '') break;
  }

  // 3. 读取分辨率行
  const resLine = readLine();
  const match = resLine.match(/-Y\\s+(\\d+)\\s+\\+X\\s+(\\d+)/);
  if (match) {
    height = parseInt(match[1], 10);
    width = parseInt(match[2], 10);
  } else {
    const match2 = resLine.match(/\\+X\\s+(\\d+)\\s+-Y\\s+(\\d+)/);
    if (match2) {
      width = parseInt(match2[1], 10);
      height = parseInt(match2[2], 10);
    }
  }

  if (width === 0 || height === 0) {
    throw new Error('无法解析 HDR 分辨率: ' + resLine);
  }

  const data = new Float32Array(width * height * 4);
  let dataPos = 0;

  for (let y = 0; y < height; y++) {
    if (bytes[pos] === 2 && bytes[pos + 1] === 2) {
      const scanlineWidth = (bytes[pos + 2] << 8) | bytes[pos + 3];
      pos += 4;
      if (scanlineWidth !== width) throw new Error('扫描线宽度不匹配');

      const scanline = new Uint8Array(width * 4);
      for (let ch = 0; ch < 4; ch++) {
        let x = 0;
        while (x < width) {
          const code = bytes[pos++];
          if (code > 128) {
            const count = code - 128;
            const value = bytes[pos++];
            for (let i = 0; i < count; i++) {
              scanline[x * 4 + ch] = value;
              x++;
            }
          } else {
            for (let i = 0; i < code; i++) {
              scanline[x * 4 + ch] = bytes[pos++];
              x++;
            }
          }
        }
      }

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

function downsample(src, srcW, srcH, maxRes) {
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

self.onmessage = async (e) => {
  const { type, id, buffer, maxResolution = 2048 } = e.data;
  if (type !== 'PARSE_HDR') return;

  try {
    self.postMessage({ type: 'HDR_PROGRESS', id, progress: 20 });
    const result = parseRGBE(buffer);
    self.postMessage({ type: 'HDR_PROGRESS', id, progress: 60 });
    const final = downsample(result.data, result.width, result.height, maxResolution);
    self.postMessage({ type: 'HDR_PROGRESS', id, progress: 90 });
    self.postMessage(
      { type: 'HDR_PARSED', id, data: final.data, width: final.width, height: final.height },
      [final.data.buffer]
    );
  } catch (err) {
    self.postMessage({ type: 'HDR_ERROR', id, error: err.message || 'HDR 解析失败' });
  }
};
`;

// 创建内联 Worker
let inlineWorker: Worker | null = null;
let requestId = 0;

const pendingRequests = new Map<string, {
  resolve: (result: { data: Float32Array; width: number; height: number }) => void;
  reject: (error: Error) => void;
  onProgress?: (progress: number) => void;
}>();

function getInlineWorker(): Worker {
  if (!inlineWorker) {
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    inlineWorker = new Worker(url);

    inlineWorker.onmessage = (e) => {
      const { type, id, data, width, height, error, progress } = e.data;
      const request = pendingRequests.get(id);
      if (!request) return;

      if (type === 'HDR_PROGRESS') {
        request.onProgress?.(progress);
      } else if (type === 'HDR_PARSED') {
        pendingRequests.delete(id);
        request.resolve({ data, width, height });
      } else if (type === 'HDR_ERROR') {
        pendingRequests.delete(id);
        request.reject(new Error(error));
      }
    };
  }
  return inlineWorker;
}

export async function parseHDRInWorker(
  buffer: ArrayBuffer,
  maxResolution = 2048,
  onProgress?: (progress: number) => void
): Promise<{ data: Float32Array; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const id = `hdr-${++requestId}`;
    pendingRequests.set(id, { resolve, reject, onProgress });

    const worker = getInlineWorker();
    worker.postMessage({ type: 'PARSE_HDR', id, buffer, maxResolution }, [buffer]);
  });
}

export function terminateInlineWorker(): void {
  if (inlineWorker) {
    inlineWorker.terminate();
    inlineWorker = null;
  }
}
