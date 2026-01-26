/**
 * @genki/folding-3d
 * 3D折叠可视化组件库
 */

// 组件导出
export { FoldingBox } from './components/FoldingBox';
export { Scene3D } from './components/Scene3D';
export { ExtrudedPanel } from './components/ExtrudedPanel';
export { HingeGroup } from './components/HingeGroup';
export { DoubleHingeGroup } from './components/DoubleHingeGroup';

// SkinnedMesh 模块导出
export {
  SkinnedFoldingMesh,
  TextureAtlasBuilder,
  GeometryStitcher,
  SkeletonBuilder,
} from './skinned';

// Store 导出
export { use3DStore } from './store/use3DStore';

// 工具导出
export {
  loadTextureFromBase64,
  loadTextureFromSVG,
} from './utils/textureLoader';

// 类型导出
export type {
  FoldingData,
  PanelData,
  Folding3DState,
  CameraState,
  EnvironmentState,
} from './types';

// SkinnedMesh 类型导出
export type {
  PanelNode,
  JointInfo,
  TextureAtlasConfig,
  TextureAtlasResult,
  AtlasRegion,
  StitchConfig,
  SkinnedFoldingMeshProps,
  FoldTimingConfig,
} from './skinned';
