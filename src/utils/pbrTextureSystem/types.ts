/**
 * PBR 贴图系统类型定义
 * 将工艺层 BW 值转换为驱动 MeshPhysicalMaterial 的参数贴图
 */

/** PBR 贴图通道类型 */
export type PBRChannelType =
  | 'baseColor'      // 基础颜色 (RGB)
  | 'metalness'      // 金属度 (灰度: 0=非金属, 1=金属)
  | 'roughness'      // 粗糙度 (灰度: 0=光滑, 1=粗糙)
  | 'normal'         // 法线贴图 (RGB: 切线空间法线)
  | 'height'         // 高度/置换贴图 (灰度)
  | 'ao'             // 环境光遮蔽 (灰度)
  | 'clearcoat'      // 清漆层强度 (灰度: 用于 UV 光油)
  | 'clearcoatRoughness'  // 清漆层粗糙度

/** 工艺类型到 PBR 通道的映射关系 */
export interface CraftToPBRMapping {
  /** 影响的 PBR 通道 */
  channels: PBRChannelType[]
  /** 是否为金属材质 */
  isMetal: boolean
  /** 默认粗糙度 */
  defaultRoughness: number
  /** 是否使用清漆层 */
  useClearcoat: boolean
}

/** PBR 贴图集 */
export interface PBRTextureSet {
  /** 基础颜色贴图 */
  baseColor: ImageData | null
  /** 金属度贴图 */
  metalness: ImageData | null
  /** 粗糙度贴图 */
  roughness: ImageData | null
  /** 法线贴图 */
  normal: ImageData | null
  /** 高度贴图 */
  height: ImageData | null
  /** 环境光遮蔽贴图 */
  ao: ImageData | null
  /** 清漆层贴图 */
  clearcoat: ImageData | null
  /** 清漆层粗糙度贴图 */
  clearcoatRoughness: ImageData | null
  /** 贴图尺寸 */
  width: number
  height: number
}

/** 单个工艺层的 PBR 输出 */
export interface CraftLayerPBROutput {
  /** 工艺类型 */
  craftType: string
  /** 遮罩 (alpha 通道，决定工艺应用区域) */
  mask: Uint8ClampedArray
  /** 金属度值 (0-1) */
  metalness: number
  /** 粗糙度值 (0-1) */
  roughness: number
  /** 基础颜色 [R, G, B] (0-255) */
  baseColor: [number, number, number] | null
  /** 法线贴图数据 */
  normalData: Uint8ClampedArray | null
  /** 高度贴图数据 */
  heightData: Uint8ClampedArray | null
  /** 清漆层强度 (0-1) */
  clearcoat: number
  /** 清漆层粗糙度 (0-1) */
  clearcoatRoughness: number
}

/** PBR 材质参数 (用于 Three.js MeshPhysicalMaterial) */
export interface PBRMaterialParams {
  color: number
  metalness: number
  roughness: number
  clearcoat: number
  clearcoatRoughness: number
  envMapIntensity: number
  ior: number
  /** 各向异性 */
  anisotropy: number
  anisotropyRotation: number
}

/** 工艺参数到 PBR 的转换配置 */
export interface CraftPBRConfig {
  /** 烫金配置 */
  hotfoil: {
    metalness: number
    roughnessRange: [number, number]  // [min, max] 基于纹理类型
    envMapIntensity: number
  }
  /** UV 光油配置 */
  uv: {
    clearcoat: number
    clearcoatRoughnessRange: [number, number]  // 基于 UV 类型
  }
  /** 压印配置 */
  emboss: {
    normalStrength: number
    heightScale: number
  }
}

/** 默认 PBR 配置 */
export const DEFAULT_PBR_CONFIG: CraftPBRConfig = {
  hotfoil: {
    metalness: 1.0,
    roughnessRange: [0.05, 0.4],
    envMapIntensity: 1.5
  },
  uv: {
    clearcoat: 1.0,
    clearcoatRoughnessRange: [0.0, 0.3]
  },
  emboss: {
    normalStrength: 1.0,
    heightScale: 0.1
  }
}
