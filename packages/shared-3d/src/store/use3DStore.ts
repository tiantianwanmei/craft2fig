// ============================================================================
// 3D STATE MACHINE - Zustand Store
// ============================================================================
// 管理 3D 场景状态：折叠进度、相机位置、动画参数等

import { create } from 'zustand';

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

export interface Store3DState {
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
    backgroundColor: '#1a1a1a',
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
}));
