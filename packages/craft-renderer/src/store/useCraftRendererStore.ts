// ============================================================================
// 🎨 Craft Renderer Store - 工艺渲染器状态管理
// ============================================================================

import { create } from 'zustand';
import type {
  CraftAnnotation,
  CraftType,
  RenderMode,
  RenderQuality,
  RenderState,
  HybridRendererConfig,
  PBRMaterialConfig,
} from '../types';

// Store 状态接口
interface CraftRendererState {
  // 工艺标注
  annotations: CraftAnnotation[];
  selectedAnnotationId: string | null;

  // 渲染配置
  config: HybridRendererConfig;

  // 材质配置
  material: PBRMaterialConfig;

  // 渲染状态
  renderState: RenderState;

  // HDR 环境
  hdrPreset: string;
  hdrIntensity: number;
  // HDR Dome 配置
  hdrDome: {
    showBackground: boolean;
    groundProjection: boolean;
    domeHeight: number;
    domeRadius: number;
  };
}

// Store Actions 接口
interface CraftRendererActions {
  // 标注操作
  addAnnotation: (annotation: CraftAnnotation) => void;
  removeAnnotation: (id: string) => void;
  updateAnnotation: (id: string, updates: Partial<CraftAnnotation>) => void;
  selectAnnotation: (id: string | null) => void;

  // 渲染配置操作
  setRenderMode: (mode: RenderMode) => void;
  setRenderQuality: (quality: RenderQuality) => void;
  setPathTracingEnabled: (enabled: boolean) => void;

  // 材质操作
  setMaterial: (material: Partial<PBRMaterialConfig>) => void;

  // HDR 操作
  setHDRPreset: (preset: string) => void;
  setHDRIntensity: (intensity: number) => void;
  setHDRDome: (dome: Partial<CraftRendererState['hdrDome']>) => void;

  // 渲染状态操作
  updateRenderState: (state: Partial<RenderState>) => void;
}

// 默认配置
const DEFAULT_CONFIG: HybridRendererConfig = {
  mode: 'hybrid',
  quality: 'preview',
  pathTracing: {
    maxSamples: 256,
    bounces: 4,
    enabled: true,
  },
  autoSwitch: {
    enabled: true,
    idleThreshold: 500,
  },
};

const DEFAULT_MATERIAL: PBRMaterialConfig = {
  roughness: 0.5,
  metalness: 0.0,
  clearcoat: 0,
  clearcoatRoughness: 0,
  transmission: 0,
  ior: 1.5,
};

const DEFAULT_RENDER_STATE: RenderState = {
  isRendering: false,
  currentMode: 'realtime',
  samples: 0,
  progress: 0,
  fps: 60,
};

const DEFAULT_HDR_DOME = {
  showBackground: true,
  groundProjection: true,
  domeHeight: 100,
  domeRadius: 5000,
};

// 创建 Store
export const useCraftRendererStore = create<CraftRendererState & CraftRendererActions>(
  (set) => ({
    // 初始状态
    annotations: [],
    selectedAnnotationId: null,
    config: DEFAULT_CONFIG,
    material: DEFAULT_MATERIAL,
    renderState: DEFAULT_RENDER_STATE,
    hdrPreset: 'studio',
    hdrIntensity: 1.0,
    hdrDome: DEFAULT_HDR_DOME,

    // 标注操作
    addAnnotation: (annotation) =>
      set((state) => ({
        annotations: [...state.annotations, annotation],
      })),

    removeAnnotation: (id) =>
      set((state) => ({
        annotations: state.annotations.filter((a) => a.id !== id),
        selectedAnnotationId:
          state.selectedAnnotationId === id ? null : state.selectedAnnotationId,
      })),

    updateAnnotation: (id, updates) =>
      set((state) => ({
        annotations: state.annotations.map((a) =>
          a.id === id ? { ...a, ...updates } : a
        ),
      })),

    selectAnnotation: (id) =>
      set({ selectedAnnotationId: id }),

    // 渲染配置操作
    setRenderMode: (mode) =>
      set((state) => ({
        config: { ...state.config, mode },
      })),

    setRenderQuality: (quality) =>
      set((state) => ({
        config: { ...state.config, quality },
      })),

    setPathTracingEnabled: (enabled) =>
      set((state) => ({
        config: {
          ...state.config,
          pathTracing: { ...state.config.pathTracing, enabled },
        },
      })),

    // 材质操作
    setMaterial: (material) =>
      set((state) => ({
        material: { ...state.material, ...material },
      })),

    // HDR 操作
    setHDRPreset: (preset) =>
      set({ hdrPreset: preset }),

    setHDRIntensity: (intensity) =>
      set({ hdrIntensity: intensity }),

    setHDRDome: (dome) =>
      set((state) => ({
        hdrDome: { ...state.hdrDome, ...dome },
      })),

    // 渲染状态操作
    updateRenderState: (state) =>
      set((prev) => ({
        renderState: { ...prev.renderState, ...state },
      })),
  })
);
