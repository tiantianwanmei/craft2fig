// ============================================================================
// MODERN HDR LOADER - 2025 最先进方案
// ============================================================================
// 技术栈：
// - Three.js 官方 RGBELoader / EXRLoader（最健壮的解析）
// - PMREMGenerator 预过滤环境贴图
// - @react-three/drei useEnvironment hook
// - 支持 HDR / EXR / 普通图片
// ============================================================================

import { useCallback, useState, useRef } from 'react';
import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';

// ============================================================================
// Types
// ============================================================================

export interface HDRLoadResult {
  texture: THREE.Texture | null;
  envMap: THREE.Texture | null;
  error: string | null;
  progress: number;
  isLoading: boolean;
}

export interface ModernHDROptions {
  /** 数据类型：HalfFloat 性能更好，Float 精度更高 */
  dataType?: typeof THREE.HalfFloatType | typeof THREE.FloatType;
  /** 是否生成 PMREM 环境贴图 */
  generatePMREM?: boolean;
  /** 加载超时（毫秒） */
  timeout?: number;
  /** 进度回调 */
  onProgress?: (progress: number) => void;
}

const DEFAULT_OPTIONS: ModernHDROptions = {
  dataType: THREE.HalfFloatType, // 推荐：性能与质量平衡
  generatePMREM: true,
  timeout: 30000,
};

// ============================================================================
// 文件格式检测
// ============================================================================

type FileFormat = 'hdr' | 'exr' | 'image' | 'unknown';

function detectFileFormat(file: File, buffer: ArrayBuffer): FileFormat {
  const ext = file.name.split('.').pop()?.toLowerCase();
  const bytes = new Uint8Array(buffer);

  // 1. 检查 EXR 魔数: 0x76 0x2f 0x31 0x01
  if (bytes[0] === 0x76 && bytes[1] === 0x2f && bytes[2] === 0x31 && bytes[3] === 0x01) {
    return 'exr';
  }

  // 2. 检查 HDR/RGBE 魔数
  const headerStr = String.fromCharCode(...bytes.slice(0, Math.min(100, bytes.length)));
  if (
    headerStr.includes('#?RADIANCE') ||
    headerStr.includes('#?RGBE') ||
    headerStr.includes('FORMAT=32-bit_rle_rgbe')
  ) {
    return 'hdr';
  }

  // 3. 根据扩展名判断
  if (ext === 'hdr') return 'hdr';
  if (ext === 'exr') return 'exr';
  if (['jpg', 'jpeg', 'png', 'webp'].includes(ext || '')) return 'image';

  return 'unknown';
}

// ============================================================================
// 核心加载函数
// ============================================================================

/**
 * 使用 Three.js 官方 RGBELoader 加载 HDR
 * 这是最健壮的方案，支持所有标准 HDR 格式变体
 */
async function loadHDRWithRGBELoader(
  buffer: ArrayBuffer,
  options: ModernHDROptions
): Promise<THREE.DataTexture> {
  return new Promise((resolve, reject) => {
    const loader = new RGBELoader();

    // 设置数据类型（Three.js r136+ 不再支持 UnsignedByteType）
    loader.setDataType(options.dataType ?? THREE.HalfFloatType);

    // 创建 Blob URL
    const blob = new Blob([buffer], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);

    const timeoutId = setTimeout(() => {
      URL.revokeObjectURL(url);
      reject(new Error('HDR 加载超时'));
    }, options.timeout ?? 30000);

    loader.load(
      url,
      (texture) => {
        clearTimeout(timeoutId);
        URL.revokeObjectURL(url);

        texture.mapping = THREE.EquirectangularReflectionMapping;
        resolve(texture);
      },
      (event) => {
        if (event.lengthComputable && options.onProgress) {
          options.onProgress(event.loaded / event.total * 0.8);
        }
      },
      (error) => {
        clearTimeout(timeoutId);
        URL.revokeObjectURL(url);
        reject(error);
      }
    );
  });
}

/**
 * 使用 Three.js 官方 EXRLoader 加载 EXR
 */
async function loadEXRWithLoader(
  buffer: ArrayBuffer,
  options: ModernHDROptions
): Promise<THREE.DataTexture> {
  return new Promise((resolve, reject) => {
    const loader = new EXRLoader();
    loader.setDataType(options.dataType ?? THREE.HalfFloatType);

    const blob = new Blob([buffer], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);

    const timeoutId = setTimeout(() => {
      URL.revokeObjectURL(url);
      reject(new Error('EXR 加载超时'));
    }, options.timeout ?? 30000);

    loader.load(
      url,
      (texture) => {
        clearTimeout(timeoutId);
        URL.revokeObjectURL(url);

        texture.mapping = THREE.EquirectangularReflectionMapping;
        resolve(texture);
      },
      (event) => {
        if (event.lengthComputable && options.onProgress) {
          options.onProgress(event.loaded / event.total * 0.8);
        }
      },
      (error) => {
        clearTimeout(timeoutId);
        URL.revokeObjectURL(url);
        reject(error);
      }
    );
  });
}

/**
 * 加载普通图片作为环境贴图
 */
async function loadImageAsEnvMap(file: File): Promise<THREE.Texture> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const loader = new THREE.TextureLoader();

    loader.load(
      url,
      (texture) => {
        URL.revokeObjectURL(url);
        texture.mapping = THREE.EquirectangularReflectionMapping;
        resolve(texture);
      },
      undefined,
      (error) => {
        URL.revokeObjectURL(url);
        reject(error);
      }
    );
  });
}

// ============================================================================
// 主入口函数
// ============================================================================

/**
 * 加载 HDR/EXR/图片文件并生成环境贴图
 *
 * @example
 * const { texture, envMap } = await loadEnvironmentMap(file, renderer);
 * scene.environment = envMap;
 * scene.background = texture;
 */
export async function loadEnvironmentMap(
  file: File,
  renderer: THREE.WebGLRenderer,
  options: ModernHDROptions = {}
): Promise<{ texture: THREE.Texture; envMap: THREE.Texture }> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // 读取文件
  const buffer = await file.arrayBuffer();
  const format = detectFileFormat(file, buffer);

  let texture: THREE.Texture;

  // 根据格式选择加载器
  switch (format) {
    case 'hdr':
      texture = await loadHDRWithRGBELoader(buffer, opts);
      break;
    case 'exr':
      texture = await loadEXRWithLoader(buffer, opts);
      break;
    case 'image':
      texture = await loadImageAsEnvMap(file);
      break;
    default:
      throw new Error(`不支持的文件格式: ${file.name}`);
  }

  opts.onProgress?.(0.9);

  // 生成 PMREM 环境贴图（用于 PBR 材质反射）
  let envMap = texture;
  if (opts.generatePMREM && renderer) {
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();

    const envMapRT = pmremGenerator.fromEquirectangular(texture);
    envMap = envMapRT.texture;

    pmremGenerator.dispose();
  }

  opts.onProgress?.(1);

  return { texture, envMap };
}

// ============================================================================
// React Hook
// ============================================================================

/**
 * React Hook: 现代化 HDR 加载
 *
 * @example
 * const { loadHDR, texture, envMap, isLoading, error } = useModernHDR();
 *
 * // 在文件选择时
 * const handleFile = async (file: File) => {
 *   await loadHDR(file, gl); // gl 来自 useThree()
 * };
 */
export function useModernHDR(options?: ModernHDROptions) {
  const [state, setState] = useState<HDRLoadResult>({
    texture: null,
    envMap: null,
    error: null,
    progress: 0,
    isLoading: false,
  });

  const abortRef = useRef(false);

  const loadHDR = useCallback(
    async (file: File, renderer: THREE.WebGLRenderer) => {
      abortRef.current = false;
      setState({ texture: null, envMap: null, error: null, progress: 0, isLoading: true });

      try {
        const result = await loadEnvironmentMap(file, renderer, {
          ...options,
          onProgress: (p) => {
            if (!abortRef.current) {
              setState((s) => ({ ...s, progress: p }));
            }
          },
        });

        if (!abortRef.current) {
          setState({
            texture: result.texture,
            envMap: result.envMap,
            error: null,
            progress: 1,
            isLoading: false,
          });
        }
        return result;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'HDR 加载失败';
        if (!abortRef.current) {
          setState({
            texture: null,
            envMap: null,
            error: errorMsg,
            progress: 0,
            isLoading: false,
          });
        }
        throw err;
      }
    },
    [options]
  );

  const cancel = useCallback(() => {
    abortRef.current = true;
    setState((s) => ({ ...s, isLoading: false }));
  }, []);

  const reset = useCallback(() => {
    // 清理旧纹理
    state.texture?.dispose();
    state.envMap?.dispose();
    setState({ texture: null, envMap: null, error: null, progress: 0, isLoading: false });
  }, [state.texture, state.envMap]);

  return { ...state, loadHDR, cancel, reset };
}
