/**
 * PBR 贴图生成器
 * 将工艺层 BW 值转换为 PBR 材质贴图
 */

import type {
  PBRTextureSet,
  CraftLayerPBROutput,
  CraftPBRConfig,
  DEFAULT_PBR_CONFIG
} from './types'

/**
 * 创建空白 PBR 贴图集
 */
export function createEmptyPBRTextureSet(width: number, height: number): PBRTextureSet {
  const createImageData = () => {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')!
    return ctx.createImageData(width, height)
  }

  return {
    baseColor: createImageData(),
    metalness: createImageData(),
    roughness: createImageData(),
    normal: createImageData(),
    height: createImageData(),
    ao: null,
    clearcoat: createImageData(),
    clearcoatRoughness: createImageData(),
    width,
    height
  }
}

/**
 * 初始化 PBR 贴图默认值
 */
export function initializePBRTextures(textureSet: PBRTextureSet): void {
  const { width, height } = textureSet
  const pixelCount = width * height

  // 基础颜色: 白色 (255, 255, 255, 255)
  if (textureSet.baseColor) {
    const data = textureSet.baseColor.data
    for (let i = 0; i < pixelCount; i++) {
      const idx = i * 4
      data[idx] = 255     // R
      data[idx + 1] = 255 // G
      data[idx + 2] = 255 // B
      data[idx + 3] = 255 // A
    }
  }

  // 金属度: 黑色 (0 = 非金属)
  if (textureSet.metalness) {
    const data = textureSet.metalness.data
    for (let i = 0; i < pixelCount; i++) {
      const idx = i * 4
      data[idx] = 0
      data[idx + 1] = 0
      data[idx + 2] = 0
      data[idx + 3] = 255
    }
  }

  // 粗糙度: 中灰 (128 = 0.5 粗糙度，普通纸张)
  if (textureSet.roughness) {
    const data = textureSet.roughness.data
    for (let i = 0; i < pixelCount; i++) {
      const idx = i * 4
      data[idx] = 128
      data[idx + 1] = 128
      data[idx + 2] = 128
      data[idx + 3] = 255
    }
  }

  // 法线: 中性法线 (128, 128, 255) = (0, 0, 1)
  if (textureSet.normal) {
    const data = textureSet.normal.data
    for (let i = 0; i < pixelCount; i++) {
      const idx = i * 4
      data[idx] = 128     // X
      data[idx + 1] = 128 // Y
      data[idx + 2] = 255 // Z
      data[idx + 3] = 255
    }
  }

  // 高度: 中灰 (128 = 中间高度)
  if (textureSet.height) {
    const data = textureSet.height.data
    for (let i = 0; i < pixelCount; i++) {
      const idx = i * 4
      data[idx] = 128
      data[idx + 1] = 128
      data[idx + 2] = 128
      data[idx + 3] = 255
    }
  }

  // 清漆层: 黑色 (0 = 无清漆)
  if (textureSet.clearcoat) {
    const data = textureSet.clearcoat.data
    for (let i = 0; i < pixelCount; i++) {
      const idx = i * 4
      data[idx] = 0
      data[idx + 1] = 0
      data[idx + 2] = 0
      data[idx + 3] = 255
    }
  }

  // 清漆粗糙度: 黑色 (0 = 光滑清漆)
  if (textureSet.clearcoatRoughness) {
    const data = textureSet.clearcoatRoughness.data
    for (let i = 0; i < pixelCount; i++) {
      const idx = i * 4
      data[idx] = 0
      data[idx + 1] = 0
      data[idx + 2] = 0
      data[idx + 3] = 255
    }
  }
}
