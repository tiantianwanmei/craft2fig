// ============================================================================
// 3D STATE MACHINE - Zustand Store
// ============================================================================
// 管理 3D 场景状态：折叠进度、相机位置、动画参数等

import { create } from 'zustand';
import type { FoldingStrategy } from '../utils/advancedFoldingAlgorithm';

interface Camera3DState {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
}

interface Animation3DState {
  foldProgress: number; // 0 (平面) -> 1 (完全折叠)
  rotationSpeed: number;
  isAnimating: boolean;
  animationDuration: number; // 毫秒
}

interface Box3DState {
  length: number; // L (mm)
  width: number;  // W (mm)
  height: number; // H (mm)
  scale: number;  // 缩放比例 (用于适配视口)
  thickness: number; // T (mm) - 材质厚度
}

// 🔥 新增：背景设置
interface BackgroundSettings {
  mode: 'solid' | 'gradient' | 'hdr';  // 纯色 | 渐变 | HDR可见
  solidColor: string;                   // 纯色背景色
  gradientTop: string;                  // 渐变顶部颜色
  gradientBottom: string;               // 渐变底部颜色
  hue: number;
  saturation: number;
  lightness: number;
  contrast: number;
  exposure: number;
}

// 🔥 新增：地面设置
interface GroundSettings {
  visible: boolean;                     // 是否显示地面
  color: string;                        // 地面颜色
  reflectivity: number;                 // 反射强度 0-1
  opacity: number;                      // 不透明度 0-1
  offsetY: number;
}

// 🔥 新增：HDR 设置
interface HDRSettings {
  useForLighting: boolean;              // 使用 HDR 作为光照
  showBackground: boolean;              // 显示 HDR 背景
  intensity: number;                    // 光照强度
  groundProjection: boolean;            // 启用地面投影
  domeHeight: number;                   // 穹顶高度
  domeRadius: number;                   // 穹顶半径
}

interface Store3DState {
  // 相机状态
  camera: Camera3DState;
  setCamera: (camera: Partial<Camera3DState>) => void;

  // 动画状态
  animation: Animation3DState;
  setFoldProgress: (progress: number) => void;
  startFolding: () => void;
  stopFolding: () => void;
  setAnimationDuration: (duration: number) => void;

  // 盒子几何状态
  box: Box3DState;
  setBoxDimensions: (dimensions: Partial<Box3DState>) => void;

  // 环境设置
  environment: {
    preset: 'city' | 'studio' | 'sunset' | 'warehouse';
    backgroundColor: string;
    shadowIntensity: number;
  };
  setEnvironment: (env: Partial<Store3DState['environment']>) => void;

  // 后处理效果开关
  postProcessing: {
    bloom: boolean;
    ssao: boolean;
    vignette: boolean;
  };
  togglePostProcessing: (effect: keyof Store3DState['postProcessing']) => void;

  // 折叠策略
  foldingStrategy: FoldingStrategy;
  setFoldingStrategy: (strategy: FoldingStrategy) => void;

  // WebGPU 渲染设置
  renderSettings: {
    useWebGPU: boolean;
    renderMode: 'raster' | 'pathtrace';
    hdrIntensity: number;
    materialPreset: string;
    exposure: number;
  };
  setRenderSettings: (settings: Partial<Store3DState['renderSettings']>) => void;

  // 🔥 背景设置
  background: BackgroundSettings;
  setBackground: (bg: Partial<BackgroundSettings>) => void;

  // 🔥 地面设置
  ground: GroundSettings;
  setGround: (g: Partial<GroundSettings>) => void;

  // 🔥 HDR 设置
  hdr: HDRSettings;
  setHDR: (h: Partial<HDRSettings>) => void;
}

export const use3DStore = create<Store3DState>((set) => ({
  // 默认相机配置 (等距视角)
  camera: {
    position: [200, 200, 200],
    target: [0, 0, 0],
    fov: 35,
  },
  setCamera: (camera) =>
    set((state) => ({
      camera: { ...state.camera, ...camera },
    })),

  // 默认动画配置
  animation: {
    foldProgress: 0, // 从平面开始
    rotationSpeed: 0.5,
    isAnimating: false,
    animationDuration: 2000, // 2秒折叠动画
  },
  setFoldProgress: (progress) =>
    set((state) => ({
      animation: { ...state.animation, foldProgress: Math.max(0, Math.min(1, progress)) },
    })),
  startFolding: () =>
    set((state) => ({
      animation: { ...state.animation, isAnimating: true },
    })),
  stopFolding: () =>
    set((state) => ({
      animation: { ...state.animation, isAnimating: false },
    })),
  setAnimationDuration: (duration) =>
    set((state) => ({
      animation: { ...state.animation, animationDuration: duration },
    })),

  // 默认盒子尺寸 (标准快递盒)
  box: {
    length: 200, // mm
    width: 150,
    height: 100,
    scale: 1,
    thickness: 2, // mm
  },
  setBoxDimensions: (dimensions) =>
    set((state) => ({
      box: { ...state.box, ...dimensions },
    })),

  // 默认环境配置
  environment: {
    preset: 'city',
    backgroundColor: 'var(--semantic-fg-text-primary)',
    shadowIntensity: 0.5,
  },
  setEnvironment: (env) =>
    set((state) => ({
      environment: { ...state.environment, ...env },
    })),

  // 默认后处理效果
  postProcessing: {
    bloom: true,
    ssao: true,
    vignette: true,
  },
  togglePostProcessing: (effect) =>
    set((state) => ({
      postProcessing: {
        ...state.postProcessing,
        [effect]: !state.postProcessing[effect],
      },
    })),

  // 默认折叠策略（逐级折叠，无穿插）
  foldingStrategy: {
    mode: 'safe',
    preventCollision: true,
    respectDependencies: true,
    smoothTransition: true,
    parallelFolding: false,
  },
  setFoldingStrategy: (strategy) =>
    set(() => ({
      foldingStrategy: strategy,
    })),

  // WebGPU 渲染设置
  renderSettings: {
    useWebGPU: false,
    renderMode: 'raster',
    hdrIntensity: 1.0,
    materialPreset: 'glossyPaper',
    exposure: 1.0,
  },
  setRenderSettings: (settings) =>
    set((state) => ({
      renderSettings: { ...state.renderSettings, ...settings },
    })),

  // 🔥 背景设置
  background: {
    mode: 'hdr',  // 默认使用 HDR 背景
    solidColor: '#1a1a2e',
    gradientTop: '#2d2d44',
    gradientBottom: '#1a1a2e',
    hue: 0,
    saturation: 1,
    lightness: 1,
    contrast: 1,
    exposure: 1,
  },
  setBackground: (bg) =>
    set((state) => ({
      background: { ...state.background, ...bg },
    })),

  // 🔥 地面设置
  ground: {
    visible: false,
    color: '#3a3a4a',
    reflectivity: 0.3,
    opacity: 1.0,
    offsetY: 0,
  },
  setGround: (g) =>
    set((state) => ({
      ground: { ...state.ground, ...g },
    })),

  // 🔥 HDR 设置
  hdr: {
    useForLighting: true,
    showBackground: true,
    intensity: 1.2,
    groundProjection: true,
    domeHeight: 1600,      // 穹顶高度 (默认 1.6m)
    domeRadius: 5000,     // 穹顶半径 (默认 5m)
  },
  setHDR: (h) =>
    set((state) => ({
      hdr: { ...state.hdr, ...h },
    })),
}));
