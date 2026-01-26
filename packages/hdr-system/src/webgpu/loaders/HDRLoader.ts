// ============================================================================
// HDR Loader - 支持 .hdr (RGBE) 和 .exr 格式
// ============================================================================

export interface HDRData {
  width: number;
  height: number;
  data: Float32Array;
  format: 'rgbe' | 'exr';
  exposure: number;
}

/**
 * RGBE (Radiance HDR) 格式解析器
 */
export class RGBELoader {
  /**
   * 从 ArrayBuffer 解析 HDR 文件
   */
  static parse(buffer: ArrayBuffer): HDRData {
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);

    let pos = 0;

    // 读取头部
    const header = this.parseHeader(bytes);
    pos = header.endPos;

    const width = header.width;
    const height = header.height;

    // 解析像素数据
    const data = new Float32Array(width * height * 4);

    for (let y = 0; y < height; y++) {
      const scanline = this.parseScanline(bytes, pos, width);
      pos = scanline.endPos;

      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const srcIdx = x * 4;

        // RGBE 转 RGB
        const e = scanline.data[srcIdx + 3];
        if (e > 0) {
          const scale = Math.pow(2, e - 128 - 8);
          data[idx] = scanline.data[srcIdx] * scale;
          data[idx + 1] = scanline.data[srcIdx + 1] * scale;
          data[idx + 2] = scanline.data[srcIdx + 2] * scale;
        } else {
          data[idx] = 0;
          data[idx + 1] = 0;
          data[idx + 2] = 0;
        }
        data[idx + 3] = 1;
      }
    }

    return {
      width,
      height,
      data,
      format: 'rgbe',
      exposure: header.exposure,
    };
  }

  private static parseHeader(bytes: Uint8Array): {
    width: number;
    height: number;
    exposure: number;
    endPos: number;
  } {
    let pos = 0;
    let line = '';
    let exposure = 1.0;
    let width = 0;
    let height = 0;

    // 跳过魔数和注释
    while (pos < bytes.length) {
      const char = String.fromCharCode(bytes[pos++]);
      if (char === '\n') {
        if (line.startsWith('EXPOSURE=')) {
          exposure = parseFloat(line.substring(9));
        }
        if (line === '') break; // 空行表示头部结束
        line = '';
      } else {
        line += char;
      }
    }

    // 读取分辨率行
    line = '';
    while (pos < bytes.length) {
      const char = String.fromCharCode(bytes[pos++]);
      if (char === '\n') break;
      line += char;
    }

    // 解析 "-Y height +X width" 格式
    const match = line.match(/-Y\s+(\d+)\s+\+X\s+(\d+)/);
    if (match) {
      height = parseInt(match[1]);
      width = parseInt(match[2]);
    }

    return { width, height, exposure, endPos: pos };
  }

  private static parseScanline(
    bytes: Uint8Array,
    pos: number,
    width: number
  ): { data: Uint8Array; endPos: number } {
    const data = new Uint8Array(width * 4);

    // 检查是否是新格式 RLE
    if (bytes[pos] === 2 && bytes[pos + 1] === 2) {
      pos += 4; // 跳过标记

      // RLE 解码每个通道
      for (let ch = 0; ch < 4; ch++) {
        let x = 0;
        while (x < width) {
          const code = bytes[pos++];
          if (code > 128) {
            // Run
            const count = code - 128;
            const value = bytes[pos++];
            for (let i = 0; i < count; i++) {
              data[x * 4 + ch] = value;
              x++;
            }
          } else {
            // Literal
            for (let i = 0; i < code; i++) {
              data[x * 4 + ch] = bytes[pos++];
              x++;
            }
          }
        }
      }
    } else {
      // 旧格式：直接读取 RGBE
      for (let x = 0; x < width; x++) {
        data[x * 4] = bytes[pos++];
        data[x * 4 + 1] = bytes[pos++];
        data[x * 4 + 2] = bytes[pos++];
        data[x * 4 + 3] = bytes[pos++];
      }
    }

    return { data, endPos: pos };
  }
}
