// ============================================================================
// FAST HDR LOADER - 2025 最先进的 HDR 加载方案
// ============================================================================
// 技术栈：
// - Three.js 官方 RGBELoader（最健壮的 HDR 解析）
// - Three.js 官方 EXRLoader
// - createImageBitmap 高性能图像处理
// - PMREMGenerator 环境贴图预处理
// ============================================================================

import { useCallback, useState, useRef } from 'react';
import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';

export interface HDRLoadResult {
  texture: THREE.Texture | null;
  error: string | null;
  progress: number;
  isLoading: boolean;
}

export interface FastHDRLoaderOptions {
  /** 最大分辨率（自动降采样大文件） */
  maxResolution?: number;
  /** 是否生成 mipmaps */
  generateMipmaps?: boolean;
  /** 加载超时（毫秒） */
  timeout?: number;
  /** 进度回调 */
  onProgress?: (progress: number) => void;
}

const DEFAULT_OPTIONS: FastHDRLoaderOptions = {
  maxResolution: 2048,
  generateMipmaps: true,
  timeout: 30000,
};

/**
 * 🚀 异步加载 HDR 文件
 * 使用 Three.js 官方 RGBELoader（最健壮的解析方案）
 */
export async function loadHDRAsync(
  file: File,
  options: FastHDRLoaderOptions = {}
): Promise<THREE.Texture> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const ext = file.name.split('.').pop()?.toLowerCase();

  // HDR 文件：使用官方 RGBELoader
  if (ext === 'hdr') {
    return loadHDRWithRGBELoader(file, opts);
  }

  // EXR 文件：使用官方 EXRLoader
  if (ext === 'exr') {
    return loadEXRWithThreeJS(file, opts);
  }

  // 普通图片格式
  return loadImageAsEnvMap(file, opts);
}

/**
 * 使用 Three.js 官方 RGBELoader 加载 HDR
 * 这是最健壮的方案，支持所有标准 HDR 格式变体
 */
async function loadHDRWithRGBELoader(
  file: File,
  opts: FastHDRLoaderOptions
): Promise<THREE.Texture> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('HDR 加载超时'));
    }, opts.timeout);

    const objectUrl = URL.createObjectURL(file);
    const loader = new RGBELoader();

    // 使用 HalfFloatType（Three.js r136+ 推荐）
    loader.setDataType(THREE.HalfFloatType);

    loader.load(
      objectUrl,
      (texture) => {
        clearTimeout(timeoutId);
        URL.revokeObjectURL(objectUrl);

        texture.mapping = THREE.EquirectangularReflectionMapping;
        texture.generateMipmaps = opts.generateMipmaps ?? true;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;

        resolve(texture);
      },
      (event) => {
        if (event.lengthComputable && opts.onProgress) {
          opts.onProgress(event.loaded / event.total);
        }
      },
      (error) => {
        clearTimeout(timeoutId);
        URL.revokeObjectURL(objectUrl);
        reject(error);
      }
    );
  });
}

/**
 * 使用 Three.js EXRLoader 加载 EXR 文件
 */
function loadEXRWithThreeJS(
  file: File,
  opts: FastHDRLoaderOptions
): Promise<THREE.Texture> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('EXR 加载超时'));
    }, opts.timeout);

    const objectUrl = URL.createObjectURL(file);

    const onLoad = (texture: THREE.Texture) => {
      clearTimeout(timeoutId);
      URL.revokeObjectURL(objectUrl);

      texture.mapping = THREE.EquirectangularReflectionMapping;
      texture.generateMipmaps = opts.generateMipmaps ?? true;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;

      resolve(texture);
    };

    const onError = (err: unknown) => {
      clearTimeout(timeoutId);
      URL.revokeObjectURL(objectUrl);
      reject(err);
    };

    const onProgress = (event: ProgressEvent) => {
      if (event.lengthComputable && opts.onProgress) {
        opts.onProgress(event.loaded / event.total);
      }
    };

    new EXRLoader().load(objectUrl, onLoad, onProgress, onError);
  });
}

/**
 * 🖼️ 使用 createImageBitmap 高性能加载普通图片
 */
async function loadImageAsEnvMap(
  file: File,
  opts: FastHDRLoaderOptions
): Promise<THREE.Texture> {
  // createImageBitmap 在后台线程解码，不阻塞主线程
  const bitmap = await createImageBitmap(file, {
    colorSpaceConversion: 'none',
    premultiplyAlpha: 'none',
  });

  // 检查是否需要降采样
  let finalBitmap = bitmap;
  const maxRes = opts.maxResolution ?? 2048;

  if (bitmap.width > maxRes || bitmap.height > maxRes) {
    const scale = Math.min(maxRes / bitmap.width, maxRes / bitmap.height);
    const newWidth = Math.floor(bitmap.width * scale);
    const newHeight = Math.floor(bitmap.height * scale);

    // 使用 OffscreenCanvas 进行降采样（如果支持）
    if (typeof OffscreenCanvas !== 'undefined') {
      const canvas = new OffscreenCanvas(newWidth, newHeight);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(bitmap, 0, 0, newWidth, newHeight);
        finalBitmap = await createImageBitmap(canvas);
      }
    }
  }

  const texture = new THREE.Texture(finalBitmap as unknown as HTMLImageElement);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.needsUpdate = true;

  return texture;
}

/**
 * 🎣 React Hook: 高性能 HDR 加载
 */
export function useFastHDR(options?: FastHDRLoaderOptions) {
  const [state, setState] = useState<HDRLoadResult>({
    texture: null,
    error: null,
    progress: 0,
    isLoading: false,
  });

  const abortRef = useRef<boolean>(false);

  const loadHDR = useCallback(async (file: File) => {
    abortRef.current = false;
    setState({ texture: null, error: null, progress: 0, isLoading: true });

    try {
      const texture = await loadHDRAsync(file, {
        ...options,
        onProgress: (p) => {
          if (!abortRef.current) {
            setState((s) => ({ ...s, progress: p }));
          }
        },
      });

      if (!abortRef.current) {
        setState({ texture, error: null, progress: 1, isLoading: false });
      }
      return texture;
    } catch (err) {
      if (!abortRef.current) {
        setState({
          texture: null,
          error: err instanceof Error ? err.message : 'HDR 加载失败',
          progress: 0,
          isLoading: false,
        });
      }
      return null;
    }
  }, [options]);

  const cancel = useCallback(() => {
    abortRef.current = true;
    setState((s) => ({ ...s, isLoading: false }));
  }, []);

  return { ...state, loadHDR, cancel };
}
