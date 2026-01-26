// ============================================================================
// WebGPU Store - WebGPU 状态管理（Worker 版 - 不卡死）
// ============================================================================
import { create } from 'zustand';
import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';
// Note: HDR compression functions removed for monorepo compatibility
// These should be handled in the main app if needed

interface WebGPUState {
  // HDR 状态
  hdrLoaded: boolean;
  hdrName: string | null;
  hdrTexture: THREE.Texture | null;
  processing: boolean;
  progress: number;
  hdrGroundAlign: boolean; // HDR 地面对齐
  selectedPreset: string;

  // Legacy controls (RaytracerLayout 依赖)
  envPreset: string;
  envIntensity: number;
  envRotation: number;
  roughness: number;
  metalness: number;

  // Actions
  setSelectedPreset: (preset: string) => void;
  setEnvPreset: (preset: string) => void;
  setEnvIntensity: (val: number) => void;
  setEnvRotation: (val: number) => void;
  setRoughness: (val: number) => void;
  setMetalness: (val: number) => void;
  loadHDRFromFile: (file: File) => Promise<void>;
  loadFromCache: () => Promise<void>;
  setHDRTexture: (texture: THREE.Texture | null, name: string | null) => void;
  setHDRGroundAlign: (align: boolean) => void;
}

export const useWebGPUStore = create<WebGPUState>((set) => ({
  // 初始状态
  hdrLoaded: false,
  hdrName: null,
  hdrTexture: null,
  processing: false,
  progress: 0,
  hdrGroundAlign: false,
  selectedPreset: 'glossyPaper',

  envPreset: 'city',
  envIntensity: 1.0,
  envRotation: 0,
  roughness: 0.5,
  metalness: 0.1,

  setSelectedPreset: (preset) => set({ selectedPreset: preset }),
  setEnvPreset: (preset) => set({ envPreset: preset }),
  setEnvIntensity: (val) => set({ envIntensity: val }),
  setEnvRotation: (val) => set({ envRotation: val }),
  setHdrTexture: (texture) => set({ hdrTexture: texture }),
  setRoughness: (val) => set({ roughness: val }),
  setMetalness: (val) => set({ metalness: val }),
  setHDRGroundAlign: (align) => set({ hdrGroundAlign: align }),

  // 🚀 健壮的 HDR/EXR 加载器
  loadHDRFromFile: async (file) => {
    set({ processing: true, progress: 0 });

    try {
      const ext = file.name.split('.').pop()?.toLowerCase();
      const objectUrl = URL.createObjectURL(file);
      set({ progress: 10 });

      let texture: THREE.DataTexture;

      // 根据扩展名选择加载器
      if (ext === 'exr') {
        texture = await new Promise<THREE.DataTexture>((resolve, reject) => {
          const loader = new EXRLoader();
          loader.setDataType(THREE.HalfFloatType);
          loader.load(
            objectUrl,
            (tex) => {
              URL.revokeObjectURL(objectUrl);
              resolve(tex);
            },
            (e) => {
              if (e.lengthComputable) set({ progress: 10 + (e.loaded / e.total) * 40 });
            },
            (err) => {
              URL.revokeObjectURL(objectUrl);
              reject(err);
            }
          );
        });
      } else if (ext === 'hdr') {
        texture = await new Promise<THREE.DataTexture>((resolve, reject) => {
          const loader = new RGBELoader();
          loader.setDataType(THREE.HalfFloatType);
          loader.load(
            objectUrl,
            (tex) => {
              URL.revokeObjectURL(objectUrl);
              resolve(tex);
            },
            (e) => {
              if (e.lengthComputable) set({ progress: 10 + (e.loaded / e.total) * 40 });
            },
            (err) => {
              URL.revokeObjectURL(objectUrl);
              reject(err);
            }
          );
        });
      } else if (['jpg', 'jpeg', 'png', 'webp'].includes(ext || '')) {
        texture = await new Promise<THREE.DataTexture>((resolve, reject) => {
          const loader = new THREE.TextureLoader();
          loader.load(
            objectUrl,
            (tex) => {
              URL.revokeObjectURL(objectUrl);
              resolve(tex as unknown as THREE.DataTexture);
            },
            (e) => {
              if (e.lengthComputable) set({ progress: 10 + (e.loaded / e.total) * 40 });
            },
            (err) => {
              URL.revokeObjectURL(objectUrl);
              reject(err);
            }
          );
        });
      } else {
        URL.revokeObjectURL(objectUrl);
        throw new Error(`不支持的格式: ${ext}，请使用 .hdr, .exr, .jpg, .png`);
      }

      set({ progress: 50 });

      // 3. 设置纹理属性
      texture.mapping = THREE.EquirectangularReflectionMapping;
      texture.needsUpdate = true;
      set({ progress: 60 });

      // 4. 尝试压缩存储（仅 HDR/EXR 有 data）
      // Note: Compression disabled for monorepo compatibility
      // const img: unknown = texture.image?.data;
      // if (img) {
      //   try {
      //     const width = texture.image.width;
      //     const height = texture.image.height;
      //     const data = img as unknown as Float32Array;
      //     const compressed = await compressHDR(data, width, height);
      //     set({ progress: 80 });
      //     saveCompressedHDR(compressed);
      //     saveToFigma(compressed);
      //   } catch (e) {
      //     console.warn('HDR 压缩跳过:', e);
      //   }
      // }

      set({ progress: 80 });

      set({ progress: 90 });

      set({
        hdrTexture: texture,
        hdrName: file.name,
        hdrLoaded: true,
        processing: false,
        progress: 100,
      });

      console.log(`✅ 环境贴图加载完成: ${file.name}`);
    } catch (error) {
      console.error('环境贴图加载失败:', error);
      set({ processing: false, progress: 0 });
    }
  },

  // 从缓存加载
  // Note: Cache loading disabled for monorepo compatibility
  loadFromCache: async () => {
    console.log('⚠️ Cache loading disabled in monorepo mode');
    // Compression functions not available in shared-stores package
  },

  setHDRTexture: (texture, name) =>
    set({
      hdrTexture: texture,
      hdrName: name,
      hdrLoaded: !!texture,
    }),
}));

// 启动时自动加载缓存
if (typeof window !== 'undefined') {
  setTimeout(() => {
    void useWebGPUStore.getState().loadFromCache();
  }, 100);
}
