/**
 * 工艺层 PBR 处理器
 * 便捷接口：从工艺层数据生成完整的 PBR 贴图集
 */

import type { CraftParams, CraftType } from '../../types/core'
import type { PBRTextureSet, CraftLayerPBROutput } from './types'
import { PBRTextureCompositor } from './pbrTextureCompositor'
import {
  hotfoilToPBR,
  silverFoilToPBR,
  uvCoatingToPBR,
  embossToPBR,
  normalToPBR
} from './craftToPBRMapping'

/** 工艺层输入数据 */
export interface CraftLayerInput {
  /** 工艺类型 */
  craftType: CraftType | string
  /** 遮罩图像数据 (RGBA) */
  maskData: Uint8ClampedArray
  /** 工艺参数 */
  params: CraftParams
  /** 法线贴图数据 (可选) */
  normalData?: Uint8ClampedArray
  /** 高度贴图数据 (可选) */
  heightData?: Uint8ClampedArray
}

/**
 * 将工艺类型转换为 PBR 输出
 */
export function craftLayerToPBR(
  input: CraftLayerInput,
  width: number,
  height: number
): CraftLayerPBROutput | null {
  const { craftType, maskData, params, normalData, heightData } = input
  const type = craftType.toLowerCase()

  switch (type) {
    case 'hotfoil':
    case '烫金':
      return hotfoilToPBR(maskData, params, width, height)

    case 'varnish':
    case '烫银':
      return silverFoilToPBR(maskData, params, width, height)

    case 'uv':
    case 'spot_uv':
    case '光油':
      return uvCoatingToPBR(maskData, params, width, height)

    case 'emboss':
    case 'deboss':
    case '凹凸':
      if (!normalData || !heightData) return null
      return embossToPBR(maskData, heightData, normalData, params, width, height)

    case 'normal':
    case '法线':
      if (!normalData) return null
      return normalToPBR(maskData, normalData, params, width, height)

    default:
      return null
  }
}

/**
 * 批量处理多个工艺层，生成完整的 PBR 贴图集
 */
export function processCraftLayers(
  layers: CraftLayerInput[],
  width: number,
  height: number
): PBRTextureSet {
  const compositor = new PBRTextureCompositor(width, height)

  for (const layer of layers) {
    const pbrOutput = craftLayerToPBR(layer, width, height)
    if (pbrOutput) {
      compositor.applyCraftLayer(pbrOutput)
    }
  }

  return compositor.getTextureSet()
}

/**
 * 将 PBR 贴图集导出为 Canvas 元素
 */
export function exportPBRToCanvas(
  textureSet: PBRTextureSet,
  channel: keyof PBRTextureSet
): HTMLCanvasElement | null {
  const imageData = textureSet[channel]
  if (!imageData || !(imageData instanceof ImageData)) return null

  const canvas = document.createElement('canvas')
  canvas.width = textureSet.width
  canvas.height = textureSet.height
  const ctx = canvas.getContext('2d')!
  ctx.putImageData(imageData, 0, 0)
  return canvas
}

/**
 * 将 PBR 贴图集导出为 Base64 数据
 */
export function exportPBRToBase64(
  textureSet: PBRTextureSet,
  channel: keyof PBRTextureSet,
  format: 'png' | 'jpeg' = 'png'
): string | null {
  const canvas = exportPBRToCanvas(textureSet, channel)
  if (!canvas) return null
  return canvas.toDataURL(`image/${format}`)
}
