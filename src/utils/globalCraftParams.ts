/**
 * 🚀 全局工艺参数（参考原版 uvSettings）
 * 使用全局变量避免 React 重渲染
 */

import type { CraftParams } from '../types/core';

// 全局参数对象（可变，不触发 React 重渲染）
export const globalCraftParams: CraftParams = {
  // 基础参数
  intensity: 100,  // 🎯 默认100%亮度，输出纯白UV
  blur: 10,
  height: 50,
  invert: false,

  // Normal Map 参数
  edgeSoftness: 0,
  blurRadius: 10,
  sharpness: 1.0,
  contrast: 1.0,
  algorithm: 'sobel',
  invertY: false,
  useGrayscale: true,

  // UV 基础参数
  type: 'gloss',
  gloss: 0.95,
  thickness: 1.0,  // 🎯 默认1.0，线性缩放，不产生抛物线效果
  roughness: 0.1,
  sharpen: 0,
  blurStrength: 0,
  uvContrast: 50,  // 🎯 默认50=无对比度调整

  // 碎片UV参数
  fragmentSize: 8,
  fragmentVariation: 60,
  fragmentRotation: 0,
  fragmentRadial: 0,
  fragmentTwist: 0,

  // 钻石UV参数
  sparkleIntensity: 40,
  sparkleFrequency: 0.5,
  diamondRotation: 0,
  diamondRadial: 0,
  diamondTwist: 0,

  // 马赛克UV参数
  mosaicSize: 6,
  mosaicVariation: 80,
  mosaicRotation: 0,
  mosaicRadial: 0,
  mosaicTwist: 0,

  // 磨砂UV参数
  frostIntensity: 30,
  frostedRotation: 0,
  frostedRadial: 50,
  frostedTwist: 50,
  frostedNoiseScaleX: 50,
  frostedNoiseScaleY: 50,
  frostedNoiseFrequency: 50,
  frostedStripeCount: 50,
  frostedDistortion: 50,
  frostedRadialRotation: 50,

  // 同心圆UV参数
  concentricMode: 'circle',
  concentricStyle: 'ring',
  ringCount: 15,
  ringSpacing: 50,
  lineWidth: 50,
  gradient: 50,
  dotSpacing: 30,
  concentricRadial: 50,
  concentricTwist: 50,
};

// 渲染回调列表
type RenderCallback = () => void;
const renderCallbacks: RenderCallback[] = [];

/**
 * 注册渲染回调（当参数变化时调用）
 */
export function onParamsChange(callback: RenderCallback): () => void {
  renderCallbacks.push(callback);
  return () => {
    const index = renderCallbacks.indexOf(callback);
    if (index > -1) {
      renderCallbacks.splice(index, 1);
    }
  };
}

/**
 * 更新参数并触发渲染（参考原版 updateUVSettings）
 */
export function updateGlobalCraftParams(params: Partial<CraftParams>): void {
  Object.assign(globalCraftParams, params);

  // 触发所有注册的渲染回调
  renderCallbacks.forEach(callback => {
    callback();
  });
}

/**
 * 🚀 重置全局参数到默认值（用于切换工艺类型时清除参数污染）
 * ⚠️ 不触发渲染回调，由调用方决定是否触发渲染
 */
export function resetGlobalCraftParams(): void {
  // 重置所有参数到默认值
  Object.assign(globalCraftParams, {
    intensity: 100,  // 🎯 默认100%亮度
    blur: 10,
    height: 50,
    invert: false,
    edgeSoftness: 0,
    blurRadius: 10,
    sharpness: 1.0,
    contrast: 1.0,
    algorithm: 'sobel',
    invertY: false,
    useGrayscale: true,
    type: 'gloss',
    gloss: 0.95,
    thickness: 1.0,  // 🎯 默认1.0线性
    roughness: 0.1,
    sharpen: 0,
    blurStrength: 0,
    uvContrast: 50,  // 🎯 默认50=无对比度调整
    fragmentSize: 8,
    fragmentVariation: 60,
    fragmentRotation: 0,
    fragmentRadial: 0,
    fragmentTwist: 0,
    sparkleIntensity: 40,
    sparkleFrequency: 0.5,
    diamondRotation: 0,
    diamondRadial: 0,
    diamondTwist: 0,
    mosaicSize: 6,
    mosaicVariation: 80,
    mosaicRotation: 0,
    mosaicRadial: 0,
    mosaicTwist: 0,
    frostIntensity: 30,
    frostedRotation: 0,
    frostedRadial: 50,
    frostedTwist: 50,
    frostedNoiseScaleX: 50,
    frostedNoiseScaleY: 50,
    frostedNoiseFrequency: 50,
    frostedStripeCount: 50,
    frostedDistortion: 50,
    frostedRadialRotation: 50,
    concentricMode: 'circle',
    concentricStyle: 'ring',
    ringCount: 15,
    ringSpacing: 50,
    lineWidth: 50,
    gradient: 50,
    dotSpacing: 30,
    concentricRadial: 50,
    concentricTwist: 50,
  });
}
