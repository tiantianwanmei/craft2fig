/**
 * PBR 贴图合成器
 * 将多个工艺层合并到最终的 PBR 贴图集
 */

import type { PBRTextureSet, CraftLayerPBROutput } from './types'
import { createEmptyPBRTextureSet, initializePBRTextures } from './pbrTextureGenerator'

/**
 * 混合模式
 */
export type BlendMode = 'normal' | 'multiply' | 'screen' | 'overlay' | 'max' | 'min'

/**
 * 合成选项
 */
export interface CompositeOptions {
  blendMode?: BlendMode
  opacity?: number
}

/**
 * PBR 贴图合成器类
 */
export class PBRTextureCompositor {
  private textureSet: PBRTextureSet
  private width: number
  private height: number

  constructor(width: number, height: number) {
    this.width = width
    this.height = height
    this.textureSet = createEmptyPBRTextureSet(width, height)
    initializePBRTextures(this.textureSet)
  }

  /**
   * 获取当前贴图集
   */
  getTextureSet(): PBRTextureSet {
    return this.textureSet
  }

  /**
   * 重置贴图集
   */
  reset(): void {
    this.textureSet = createEmptyPBRTextureSet(this.width, this.height)
    initializePBRTextures(this.textureSet)
  }

  /**
   * 应用工艺层到 PBR 贴图集
   */
  applyCraftLayer(layer: CraftLayerPBROutput, options: CompositeOptions = {}): void {
    const { blendMode = 'normal', opacity = 1.0 } = options
    const pixelCount = this.width * this.height

    for (let i = 0; i < pixelCount; i++) {
      const maskAlpha = layer.mask[i * 4 + 3] / 255 * opacity
      if (maskAlpha <= 0) continue

      const idx = i * 4

      // 应用金属度
      if (this.textureSet.metalness) {
        const metalValue = Math.round(layer.metalness * 255)
        this.blendChannel(this.textureSet.metalness.data, idx, metalValue, maskAlpha, blendMode)
      }

      // 应用粗糙度
      if (this.textureSet.roughness) {
        const roughValue = Math.round(layer.roughness * 255)
        this.blendChannel(this.textureSet.roughness.data, idx, roughValue, maskAlpha, blendMode)
      }

      // 应用基础颜色
      if (layer.baseColor && this.textureSet.baseColor) {
        const [r, g, b] = layer.baseColor
        this.blendChannel(this.textureSet.baseColor.data, idx, r, maskAlpha, blendMode)
        this.blendChannel(this.textureSet.baseColor.data, idx + 1, g, maskAlpha, blendMode)
        this.blendChannel(this.textureSet.baseColor.data, idx + 2, b, maskAlpha, blendMode)
      }

      // 应用清漆层
      if (this.textureSet.clearcoat) {
        const ccValue = Math.round(layer.clearcoat * 255)
        this.blendChannel(this.textureSet.clearcoat.data, idx, ccValue, maskAlpha, 'max')
      }

      // 应用清漆粗糙度
      if (this.textureSet.clearcoatRoughness) {
        const ccrValue = Math.round(layer.clearcoatRoughness * 255)
        this.blendChannel(this.textureSet.clearcoatRoughness.data, idx, ccrValue, maskAlpha, blendMode)
      }
    }

    // 应用法线贴图
    if (layer.normalData && this.textureSet.normal) {
      this.blendNormalMap(layer.normalData, layer.mask, opacity)
    }

    // 应用高度贴图
    if (layer.heightData && this.textureSet.height) {
      this.blendHeightMap(layer.heightData, layer.mask, opacity)
    }
  }

  /**
   * 混合单个通道值
   */
  private blendChannel(
    data: Uint8ClampedArray,
    idx: number,
    value: number,
    alpha: number,
    mode: BlendMode
  ): void {
    const current = data[idx]
    let result: number

    switch (mode) {
      case 'multiply':
        result = (current * value) / 255
        break
      case 'screen':
        result = 255 - ((255 - current) * (255 - value)) / 255
        break
      case 'overlay':
        result = current < 128
          ? (2 * current * value) / 255
          : 255 - (2 * (255 - current) * (255 - value)) / 255
        break
      case 'max':
        result = Math.max(current, value)
        break
      case 'min':
        result = Math.min(current, value)
        break
      default: // normal
        result = value
    }

    // Alpha 混合
    data[idx] = Math.round(current * (1 - alpha) + result * alpha)
  }

  /**
   * 混合法线贴图 (使用 Reoriented Normal Mapping)
   */
  private blendNormalMap(
    normalData: Uint8ClampedArray,
    mask: Uint8ClampedArray,
    opacity: number
  ): void {
    if (!this.textureSet.normal) return
    const dst = this.textureSet.normal.data
    const pixelCount = this.width * this.height

    for (let i = 0; i < pixelCount; i++) {
      const maskAlpha = mask[i * 4 + 3] / 255 * opacity
      if (maskAlpha <= 0) continue

      const idx = i * 4

      // 解码法线 (0-255 → -1 to 1)
      const n1x = (dst[idx] / 255) * 2 - 1
      const n1y = (dst[idx + 1] / 255) * 2 - 1
      const n1z = (dst[idx + 2] / 255) * 2 - 1

      const n2x = (normalData[idx] / 255) * 2 - 1
      const n2y = (normalData[idx + 1] / 255) * 2 - 1
      const n2z = (normalData[idx + 2] / 255) * 2 - 1

      // Reoriented Normal Mapping blend
      const t = [n1x, n1y, n1z + 1]
      const u = [n2x * -1, n2y * -1, n2z]
      const dot = t[0] * u[0] + t[1] * u[1] + t[2] * u[2]

      let rx = t[0] * dot - u[0] * (n1z + 1)
      let ry = t[1] * dot - u[1] * (n1z + 1)
      let rz = t[2] * dot - u[2] * (n1z + 1)

      // 归一化
      const len = Math.sqrt(rx * rx + ry * ry + rz * rz)
      if (len > 0) {
        rx /= len
        ry /= len
        rz /= len
      }

      // Alpha 混合
      const fx = n1x * (1 - maskAlpha) + rx * maskAlpha
      const fy = n1y * (1 - maskAlpha) + ry * maskAlpha
      const fz = n1z * (1 - maskAlpha) + rz * maskAlpha

      // 编码回 0-255
      dst[idx] = Math.round((fx * 0.5 + 0.5) * 255)
      dst[idx + 1] = Math.round((fy * 0.5 + 0.5) * 255)
      dst[idx + 2] = Math.round((fz * 0.5 + 0.5) * 255)
    }
  }

  /**
   * 混合高度贴图
   */
  private blendHeightMap(
    heightData: Uint8ClampedArray,
    mask: Uint8ClampedArray,
    opacity: number
  ): void {
    if (!this.textureSet.height) return
    const dst = this.textureSet.height.data
    const pixelCount = this.width * this.height

    for (let i = 0; i < pixelCount; i++) {
      const maskAlpha = mask[i * 4 + 3] / 255 * opacity
      if (maskAlpha <= 0) continue

      const idx = i * 4
      const srcHeight = heightData[idx]
      const dstHeight = dst[idx]

      // 叠加混合：偏离中灰的部分叠加
      const srcOffset = srcHeight - 128
      const newHeight = Math.max(0, Math.min(255,
        dstHeight + srcOffset * maskAlpha
      ))

      dst[idx] = newHeight
      dst[idx + 1] = newHeight
      dst[idx + 2] = newHeight
    }
  }
}
