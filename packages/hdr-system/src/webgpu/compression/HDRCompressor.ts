// ============================================================================
// HDR COMPRESSOR - HDR 压缩存储方案
// ============================================================================
// 核心思路：
// 1. 将 HDR 降采样到 512x256 或 1024x512
// 2. 使用 RGBM 编码压缩到 PNG（保留 HDR 信息）
// 3. 存储到 Figma pluginData 或 localStorage
// 4. 加载时解码还原
// ============================================================================

export interface CompressedHDR {
  /** 压缩后的 base64 PNG */
  data: string;
  /** 原始宽度 */
  width: number;
  /** 原始高度 */
  height: number;
  /** RGBM 最大亮度 */
  maxRange: number;
  /** 压缩时间戳 */
  timestamp: number;
}

const MAX_SIZE = 512; // 最大尺寸，平衡质量和性能

/**
 * 🗜️ 压缩 HDR 数据为 RGBM PNG
 */
export async function compressHDR(
  hdrData: Float32Array,
  width: number,
  height: number
): Promise<CompressedHDR> {
  // 1. 计算降采样尺寸
  const scale = Math.min(MAX_SIZE / width, MAX_SIZE / height, 1);
  const newWidth = Math.floor(width * scale);
  const newHeight = Math.floor(height * scale);

  // 2. 降采样
  const downsampled = downsampleHDR(hdrData, width, height, newWidth, newHeight);

  // 3. 计算最大亮度范围
  const maxRange = calculateMaxRange(downsampled);

  // 4. RGBM 编码到 Canvas
  const canvas = encodeToRGBM(downsampled, newWidth, newHeight, maxRange);

  // 5. 导出为 PNG base64
  const data = canvas.toDataURL('image/png');

  return {
    data,
    width: newWidth,
    height: newHeight,
    maxRange,
    timestamp: Date.now(),
  };
}

/**
 * 降采样 HDR 数据
 */
function downsampleHDR(
  src: Float32Array,
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number
): Float32Array {
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
  return dst;
}

/**
 * 计算最大亮度范围
 */
function calculateMaxRange(data: Float32Array): number {
  let max = 0;
  for (let i = 0; i < data.length; i += 4) {
    max = Math.max(max, data[i], data[i + 1], data[i + 2]);
  }
  return Math.max(max, 1);
}

/**
 * RGBM 编码到 Canvas
 */
function encodeToRGBM(
  data: Float32Array,
  width: number,
  height: number,
  maxRange: number
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const imageData = ctx.createImageData(width, height);

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i] / maxRange;
    const g = data[i + 1] / maxRange;
    const b = data[i + 2] / maxRange;

    // RGBM: M = max(r,g,b), RGB = rgb/M
    const m = Math.max(r, g, b, 1e-6);
    const mNorm = Math.min(m, 1);

    imageData.data[i] = Math.floor((r / mNorm) * 255);
    imageData.data[i + 1] = Math.floor((g / mNorm) * 255);
    imageData.data[i + 2] = Math.floor((b / mNorm) * 255);
    imageData.data[i + 3] = Math.floor(mNorm * 255);
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

/**
 * 🔓 解压缩 RGBM PNG 为 HDR 数据
 */
export async function decompressHDR(
  compressed: CompressedHDR
): Promise<Float32Array> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = compressed.width;
      canvas.height = compressed.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, compressed.width, compressed.height);
      const hdr = decodeRGBM(imageData.data, compressed.maxRange);
      resolve(hdr);
    };
    img.onerror = reject;
    img.src = compressed.data;
  });
}

/**
 * RGBM 解码
 */
function decodeRGBM(data: Uint8ClampedArray, maxRange: number): Float32Array {
  const hdr = new Float32Array(data.length);

  for (let i = 0; i < data.length; i += 4) {
    const m = data[i + 3] / 255;
    hdr[i] = (data[i] / 255) * m * maxRange;
    hdr[i + 1] = (data[i + 1] / 255) * m * maxRange;
    hdr[i + 2] = (data[i + 2] / 255) * m * maxRange;
    hdr[i + 3] = 1;
  }

  return hdr;
}

// ============================================================================
// 存储接口
// ============================================================================

const STORAGE_KEY = 'genki-hdr-cache';
let localStorageWarned = false;
let memoryCache: CompressedHDR | null = null;
let localStorageAvailable: boolean | null = null;

function canUseLocalStorage(): boolean {
  if (localStorageAvailable !== null) return localStorageAvailable;
  try {
    const testKey = '__genki_ls_test__';
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    localStorageAvailable = true;
  } catch {
    localStorageAvailable = false;
  }
  return localStorageAvailable;
}

/**
 * 💾 保存压缩 HDR 到 localStorage
 */
export function saveCompressedHDR(compressed: CompressedHDR): void {
  try {
    if (canUseLocalStorage()) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(compressed));
      console.log('✅ HDR 已缓存到 localStorage');
    }
    memoryCache = compressed;
  } catch (e) {
    localStorageAvailable = false;
    memoryCache = compressed;
    if (!localStorageWarned) {
      localStorageWarned = true;
      console.warn('⚠️ localStorage 存储失败，可能超出配额');
    }
  }
}

/**
 * 📂 从 localStorage 加载压缩 HDR
 */
export function loadCompressedHDR(): CompressedHDR | null {
  try {
    if (!canUseLocalStorage()) return memoryCache;
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : memoryCache;
  } catch {
    localStorageAvailable = false;
    return memoryCache;
  }
}

/**
 * 📤 保存到 Figma pluginData
 */
export function saveToFigma(compressed: CompressedHDR): void {
  parent.postMessage({
    pluginMessage: {
      type: 'SAVE_COMPRESSED_HDR',
      payload: compressed,
    },
  }, '*');
}

/**
 * 📥 从 Figma 请求加载
 */
export function requestFromFigma(): void {
  parent.postMessage({
    pluginMessage: { type: 'LOAD_COMPRESSED_HDR' },
  }, '*');
}
