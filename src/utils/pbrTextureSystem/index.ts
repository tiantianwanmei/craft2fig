/**
 * PBR 贴图系统
 * 将工艺层 BW 值转换为驱动 MeshPhysicalMaterial 的参数贴图
 */

// 类型导出
export type {
  PBRChannelType,
  CraftToPBRMapping,
  PBRTextureSet,
  CraftLayerPBROutput,
  PBRMaterialParams,
  CraftPBRConfig
} from './types'

export { DEFAULT_PBR_CONFIG } from './types'

// 生成器导出
export {
  createEmptyPBRTextureSet,
  initializePBRTextures
} from './pbrTextureGenerator'

// 映射函数导出
export {
  hotfoilToPBR,
  silverFoilToPBR,
  uvCoatingToPBR,
  embossToPBR,
  normalToPBR
} from './craftToPBRMapping'

// 合成器导出
export {
  PBRTextureCompositor,
  type BlendMode,
  type CompositeOptions
} from './pbrTextureCompositor'

// 处理器导出
export {
  craftLayerToPBR,
  processCraftLayers,
  exportPBRToCanvas,
  exportPBRToBase64,
  type CraftLayerInput
} from './craftLayerProcessor'
