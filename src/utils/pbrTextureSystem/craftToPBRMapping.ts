/**
 * 工艺类型到 PBR 参数的映射
 * 将各种印刷工艺的 BW 值转换为 PBR 材质参数
 */

import type { CraftParams } from '../../types/core'
import type { CraftLayerPBROutput } from './types'

/**
 * 烫金工艺 → PBR 参数
 * 金属度=1, 低粗糙度, 带颜色
 */
export function hotfoilToPBR(
  mask: Uint8ClampedArray,
  params: CraftParams,
  width: number,
  height: number
): CraftLayerPBROutput {
  // HSL 转 RGB
  const hue = params.hue ?? 45
  const saturation = params.saturation ?? 0.8
  const brightness = params.brightness ?? 0.9
  const [r, g, b] = hslToRgb(hue, saturation, brightness)

  // 纹理类型影响粗糙度
  const noiseType = params.noiseType ?? 'matte'
  let roughness = 0.15
  switch (noiseType) {
    case 'matte': roughness = 0.3; break
    case 'brushed': roughness = 0.25; break
    case 'leather': roughness = 0.4; break
    case 'fabric': roughness = 0.45; break
    case 'wood': roughness = 0.35; break
    default: roughness = 0.15
  }

  return {
    craftType: 'HOTFOIL',
    mask,
    metalness: 1.0,
    roughness,
    baseColor: [r, g, b],
    normalData: null,
    heightData: null,
    clearcoat: 0,
    clearcoatRoughness: 0
  }
}

/**
 * 烫银工艺 → PBR 参数
 */
export function silverFoilToPBR(
  mask: Uint8ClampedArray,
  params: CraftParams,
  width: number,
  height: number
): CraftLayerPBROutput {
  const hue = params.hue ?? 0
  const saturation = params.saturation ?? 0.05
  const brightness = params.brightness ?? 0.95
  const [r, g, b] = hslToRgb(hue, saturation, brightness)

  const noiseType = params.noiseType ?? 'matte'
  let roughness = 0.1
  switch (noiseType) {
    case 'matte': roughness = 0.25; break
    case 'brushed': roughness = 0.2; break
    default: roughness = 0.1
  }

  return {
    craftType: 'VARNISH',
    mask,
    metalness: 1.0,
    roughness,
    baseColor: [r, g, b],
    normalData: null,
    heightData: null,
    clearcoat: 0,
    clearcoatRoughness: 0
  }
}

/**
 * HSL 转 RGB
 */
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h = h / 360
  let r: number, g: number, b: number

  if (s === 0) {
    r = g = b = l
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1/6) return p + (q - p) * 6 * t
      if (t < 1/2) return q
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
      return p
    }

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1/3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1/3)
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)]
}

/**
 * UV 光油工艺 → PBR 参数
 * 使用 Clearcoat 层模拟透明涂层效果
 * BW 灰度值 → clearcoat 强度
 */
export function uvCoatingToPBR(
  mask: Uint8ClampedArray,
  params: CraftParams,
  width: number,
  height: number
): CraftLayerPBROutput {
  const uvType = params.type ?? 'gloss'

  // UV 类型决定清漆粗糙度
  let clearcoatRoughness = 0.0
  switch (uvType) {
    case 'gloss': clearcoatRoughness = 0.0; break
    case 'semi': clearcoatRoughness = 0.1; break
    case 'satin': clearcoatRoughness = 0.2; break
    case 'matte': clearcoatRoughness = 0.4; break
    case 'frosted': clearcoatRoughness = 0.3; break
    default: clearcoatRoughness = 0.05
  }

  // 强度参数影响清漆层强度
  const intensity = (params.intensity ?? 100) / 100

  return {
    craftType: 'UV',
    mask,
    metalness: 0,
    roughness: 0.5, // 底层粗糙度（纸张）
    baseColor: null, // UV 不改变颜色
    normalData: null,
    heightData: null,
    clearcoat: intensity,
    clearcoatRoughness
  }
}

/**
 * 压印/凹凸工艺 → PBR 参数
 * BW 灰度值 → 高度贴图 + 法线贴图
 */
export function embossToPBR(
  mask: Uint8ClampedArray,
  heightData: Uint8ClampedArray,
  normalData: Uint8ClampedArray,
  params: CraftParams,
  width: number,
  height: number
): CraftLayerPBROutput {
  return {
    craftType: 'EMBOSS',
    mask,
    metalness: 0,
    roughness: 0.6, // 压印区域略粗糙
    baseColor: null,
    normalData,
    heightData,
    clearcoat: 0,
    clearcoatRoughness: 0
  }
}

/**
 * 法线贴图工艺 → PBR 参数
 */
export function normalToPBR(
  mask: Uint8ClampedArray,
  normalData: Uint8ClampedArray,
  params: CraftParams,
  width: number,
  height: number
): CraftLayerPBROutput {
  return {
    craftType: 'NORMAL',
    mask,
    metalness: 0,
    roughness: 0.5,
    baseColor: null,
    normalData,
    heightData: null,
    clearcoat: 0,
    clearcoatRoughness: 0
  }
}
