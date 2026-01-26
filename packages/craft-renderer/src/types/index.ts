// ============================================================================
// 🎨 Craft Renderer Types - 工艺渲染器类型定义
// ============================================================================

import type { Texture, Material, Vector3 } from 'three';

// 工艺类型枚举
export type CraftType =
  | 'emboss'    // 压凹
  | 'deboss'    // 压凸
  | 'uv'        // UV上光
  | 'hotfoil'   // 烫金
  | 'varnish'   // 上光
  | 'spotUv'    // 局部UV
  | 'texture';  // 纹理

// 渲染模式
export type RenderMode =
  | 'realtime'      // 实时光栅化
  | 'pathtracing'   // 路径追踪
  | 'hybrid';       // 混合模式

// 渲染质量
export type RenderQuality = 'draft' | 'preview' | 'production';

// 工艺标注区域
export interface CraftAnnotation {
  id: string;
  type: CraftType;
  name: string;
  // 区域定义 (UV坐标)
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  // 工艺参数
  params: CraftParams;
  // 是否可见
  visible: boolean;
}

// 工艺参数基类
export interface CraftParamsBase {
  intensity: number;  // 强度 0-1
}

// 压凹/压凸参数
export interface EmbossParams extends CraftParamsBase {
  depth: number;      // 深度 mm
  angle: number;      // 光照角度
  softness: number;   // 边缘柔和度
}

// UV/上光参数
export interface UVParams extends CraftParamsBase {
  glossiness: number; // 光泽度
  thickness: number;  // 厚度
  ior: number;        // 折射率
}

// 烫金参数
export interface HotfoilParams extends CraftParamsBase {
  metalness: number;  // 金属度
  roughness: number;  // 粗糙度
  color: string;      // 颜色 (金/银/铜等)
}

// 纹理参数
export interface TextureParams extends CraftParamsBase {
  scale: number;      // 纹理缩放
  rotation: number;   // 旋转角度
  bumpStrength: number; // 凹凸强度
}

// 工艺参数联合类型
export type CraftParams =
  | EmbossParams
  | UVParams
  | HotfoilParams
  | TextureParams;

// 混合渲染器配置
export interface HybridRendererConfig {
  mode: RenderMode;
  quality: RenderQuality;
  // 路径追踪设置
  pathTracing: {
    maxSamples: number;
    bounces: number;
    enabled: boolean;
  };
  // 自动切换阈值
  autoSwitch: {
    enabled: boolean;
    idleThreshold: number;  // ms
  };
}

// PBR材质配置
export interface PBRMaterialConfig {
  roughness: number;
  metalness: number;
  // 高级属性
  clearcoat?: number;
  clearcoatRoughness?: number;
  transmission?: number;
  ior?: number;
}

// 渲染状态
export interface RenderState {
  isRendering: boolean;
  currentMode: RenderMode;
  samples: number;
  progress: number;
  fps: number;
}
