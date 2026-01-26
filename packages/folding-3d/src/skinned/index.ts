/**
 * @genki/folding-3d - Skinned Mesh 模块
 * 程序化生成骨骼蒙皮网格
 */

// 组件导出
export { SkinnedFoldingMesh } from './SkinnedFoldingMesh';

// 构建器导出
export { TextureAtlasBuilder } from './TextureAtlasBuilder';
export { GeometryStitcher } from './GeometryStitcher';
export { SkeletonBuilder } from './SkeletonBuilder';

// 类型导出
export type {
  PanelNode,
  JointInfo,
  Point2D,
  Rect2D,
  TextureAtlasConfig,
  TextureAtlasResult,
  AtlasRegion,
  StitchConfig,
  StitchedGeometryResult,
  SkeletonBuildResult,
  SkinnedFoldingMeshProps,
  FoldTimingConfig,
  SkinnedMeshData,
  PBRMaterialProps,
} from './types';
