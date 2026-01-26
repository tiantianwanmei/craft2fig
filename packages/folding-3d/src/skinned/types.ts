/**
 * @genki/folding-3d - SkinnedMesh 类型定义
 * 用于程序化生成骨骼蒙皮网格的数据结构
 */

import type * as THREE from 'three';

/** 2D 点 */
export interface Point2D {
  x: number;
  y: number;
}

/** 2D 矩形 */
export interface Rect2D {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** 面片节点 - 树形结构 */
export interface PanelNode {
  /** 唯一标识 */
  id: string;
  /** 显示名称 */
  name: string;
  /** 在刀版图上的边界 */
  bounds: Rect2D;
  /** 中心点 */
  center: Point2D;
  /** 光栅化图像 (base64 或 ImageBitmap) */
  rasterImage?: string | ImageBitmap;
  /** SVG 路径 (可选) */
  svgPath?: string;
  /** 父节点 ID */
  parentId: string | null;
  /** 子节点列表 */
  children: PanelNode[];
  /** 折痕信息 - 与父节点的连接 */
  jointInfo?: JointInfo;
  /** 骨骼索引 (运行时分配) */
  boneIndex?: number;
  /** 额外元数据 */
  meta?: Record<string, unknown>;
}

/** 折痕/关节信息 */
export interface JointInfo {
  /** 折痕类型 */
  type: 'horizontal' | 'vertical';
  /** 折痕在刀版图上的位置 */
  position: Point2D;
  /** 折痕长度 */
  length: number;
  /** 折痕宽度 (用于圆角) */
  width: number;
  /** 折叠方向: 1 = 正向, -1 = 反向 */
  direction: 1 | -1;
  /** 最大折叠角度 (弧度) */
  maxAngle: number;
}

/** 纹理图集配置 */
export interface TextureAtlasConfig {
  /** 图集宽度 */
  width: number;
  /** 图集高度 */
  height: number;
  /** 内边距 */
  padding: number;
  /** 背景色 */
  backgroundColor?: string;
}

/** 纹理图集中的面片区域 */
export interface AtlasRegion {
  /** 面片 ID */
  panelId: string;
  /** 在图集中的位置 */
  x: number;
  y: number;
  /** 尺寸 */
  width: number;
  height: number;
  /** UV 坐标 (归一化) */
  uv: {
    u0: number;
    v0: number;
    u1: number;
    v1: number;
  };
}

/** 纹理图集结果 */
export interface TextureAtlasResult {
  /** Three.js 纹理 */
  texture: THREE.CanvasTexture;
  /** Canvas 元素 */
  canvas: HTMLCanvasElement;
  /** 各面片的区域映射 */
  regions: Map<string, AtlasRegion>;
  /** 图集尺寸 */
  width: number;
  height: number;
}

/** 顶点数据 */
export interface VertexData {
  /** 位置 */
  position: THREE.Vector3;
  /** UV 坐标 */
  uv: THREE.Vector2;
  /** 法线 */
  normal: THREE.Vector3;
  /** 骨骼索引 (最多4个) */
  skinIndices: [number, number, number, number];
  /** 骨骼权重 (最多4个) */
  skinWeights: [number, number, number, number];
}

/** 几何体缝合配置 */
export interface StitchConfig {
  /** 关节带细分段数 */
  jointSegments: number;
  /** 圆角半径 */
  cornerRadius: number;
  /** 纸张厚度 */
  thickness: number;
  /** 是否生成背面 */
  doubleSided: boolean;
}

/** 几何体缝合结果 */
export interface StitchedGeometryResult {
  /** Three.js BufferGeometry */
  geometry: THREE.BufferGeometry;
  /** 顶点数量 */
  vertexCount: number;
  /** 三角形数量 */
  triangleCount: number;
  /** 面片到顶点范围的映射 */
  panelVertexRanges: Map<string, { start: number; count: number }>;
}

/** 骨骼构建结果 */
export interface SkeletonBuildResult {
  /** Three.js Skeleton */
  skeleton: THREE.Skeleton;
  /** 根骨骼 */
  rootBone: THREE.Bone;
  /** 骨骼数组 */
  bones: THREE.Bone[];
  /** 面片 ID 到骨骼索引的映射 */
  boneIndexMap: Map<string, number>;
  /** 骨骼到面片 ID 的映射 */
  bonePanelMap: Map<number, string>;
}

/** 折叠动画状态 */
export interface FoldAnimationState {
  /** 全局折叠进度 0-1 */
  progress: number;
  /** 各骨骼的当前角度 */
  boneAngles: Map<number, number>;
  /** 是否正在动画 */
  isAnimating: boolean;
}

/** SkinnedMesh 组件属性 */
export interface SkinnedFoldingMeshProps {
  /** 面片树数据 */
  panelTree: PanelNode;
  /** 纹理图集 (可选，不提供则自动生成) */
  textureAtlas?: TextureAtlasResult;
  /** 折叠进度 0-1 */
  foldProgress: number;
  /** 纸张厚度 */
  thickness?: number;
  /** 圆角半径 */
  cornerRadius?: number;
  /** 关节细分段数 */
  jointSegments?: number;
  /** 材质属性 */
  materialProps?: {
    roughness?: number;
    metalness?: number;
    color?: string;
  };
  /** 是否显示骨骼辅助线 */
  showSkeleton?: boolean;
  /** 是否显示线框 */
  showWireframe?: boolean;
  /** 自定义折叠时序 (可选，不提供则自动生成) */
  foldTimings?: FoldTimingConfig[];
}

/** 折叠时序配置 */
export interface FoldTimingConfig {
  /** 面片 ID */
  panelId: string;
  /** 开始时间 (0-1) */
  startTime: number;
  /** 持续时间 (0-1) */
  duration: number;
  /** 缓动函数 */
  easing?: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut';
}

/** 完整的 SkinnedMesh 数据 */
export interface SkinnedMeshData {
  /** 几何体 */
  geometry: THREE.BufferGeometry;
  /** 骨骼 */
  skeleton: THREE.Skeleton;
  /** 纹理图集 */
  textureAtlas: TextureAtlasResult;
  /** 骨骼索引映射 */
  boneIndexMap: Map<string, number>;
  /** 折叠时序 */
  foldTimings: FoldTimingConfig[];
}
