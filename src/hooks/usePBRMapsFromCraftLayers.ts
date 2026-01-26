/**
 * 🎨 usePBRMapsFromCraftLayers - 从工艺层生成 PBR 贴图的 Hook
 * 将工艺层的遮罩转换为 metalnessMap、roughnessMap、clearcoatMap
 */

import { useMemo, useState, useEffect } from 'react';
import * as THREE from 'three';
import type { MarkedLayer } from '../types/core';

// 工艺类型判断函数 - 支持多种命名方式
const isHotfoil = (layer: MarkedLayer) =>
  layer.craftType === 'HOTFOIL' ||
  layer.crafts?.some(c => c.includes('烫金') || c.toLowerCase().includes('hotfoil') || c.toLowerCase().includes('gold')) ||
  layer.name.includes('烫金') ||
  layer.name.toLowerCase().includes('hotfoil') ||
  layer.name.toLowerCase().includes('gold foil');

const isSilverFoil = (layer: MarkedLayer) =>
  layer.craftType === 'SILVER' ||
  layer.craftType === 'SILVERFOIL' ||
  layer.crafts?.some(c => c.includes('烫银') || c.toLowerCase().includes('silver')) ||
  layer.name.includes('烫银') ||
  layer.name.toLowerCase().includes('silver');

const isUV = (layer: MarkedLayer) =>
  layer.craftType === 'UV' ||
  layer.craftType === 'SPOT_UV' ||
  layer.craftType === 'VARNISH' ||
  layer.crafts?.some(c => c.includes('UV') || c.includes('光油') || c.toLowerCase().includes('varnish')) ||
  layer.name.includes('UV') ||
  layer.name.includes('光油') ||
  layer.name.toLowerCase().includes('varnish');

/** PBR 贴图集结果 */
export interface PBRMaps {
  metalnessMap: THREE.Texture | null;
  roughnessMap: THREE.Texture | null;
  clearcoatMap: THREE.Texture | null;
}

/** 刀版图边界信息 */
export interface DieBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

/** 从 base64 加载图片到 Canvas */
async function loadImageToCanvas(base64: string): Promise<HTMLCanvasElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      resolve(canvas);
    };
    img.onerror = () => resolve(null);
    img.src = base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`;
  });
}

/** 根据 bounds 创建全白遮罩 Canvas（用于没有 pngPreview 的工艺层） */
function createSolidMaskCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const ctx = canvas.getContext('2d')!;
  // 填充白色不透明（表示整个区域都应用工艺效果）
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return canvas;
}

/** 工艺类型对应的 PBR 参数 */
export interface CraftPBRParams {
  metalness: number;
  roughness: number;
  clearcoat: number;
  clearcoatRoughness: number;
}

/** 工艺类型 ID */
export type CraftTypeId = 'hotfoil' | 'silver' | 'uv';

/** 所有工艺类型的 PBR 参数配置 */
export interface CraftPBRConfig {
  hotfoil: CraftPBRParams;
  silver: CraftPBRParams;
  uv: CraftPBRParams;
}

/** 默认 PBR 参数 */
export const DEFAULT_CRAFT_PBR_CONFIG: CraftPBRConfig = {
  hotfoil: { metalness: 1.0, roughness: 0.2, clearcoat: 0.5, clearcoatRoughness: 0.1 },
  silver: { metalness: 1.0, roughness: 0.15, clearcoat: 0.6, clearcoatRoughness: 0.05 },
  uv: { metalness: 0.0, roughness: 0.1, clearcoat: 1.0, clearcoatRoughness: 0.05 },
};

/** 获取工艺类型的 PBR 参数 */
function getCraftPBRParams(layer: MarkedLayer, config: CraftPBRConfig = DEFAULT_CRAFT_PBR_CONFIG): CraftPBRParams | null {
  if (isHotfoil(layer)) {
    return config.hotfoil;
  }
  if (isSilverFoil(layer)) {
    return config.silver;
  }
  if (isUV(layer)) {
    return config.uv;
  }
  return null;
}

/** 获取图层的工艺类型 ID */
export function getCraftTypeId(layer: MarkedLayer): CraftTypeId | null {
  if (isHotfoil(layer)) return 'hotfoil';
  if (isSilverFoil(layer)) return 'silver';
  if (isUV(layer)) return 'uv';
  return null;
}

/** 从工艺层生成 PBR 贴图 */
async function generatePBRMaps(
  craftLayers: MarkedLayer[],
  baseWidth: number,
  baseHeight: number,
  config: CraftPBRConfig = DEFAULT_CRAFT_PBR_CONFIG,
  dieBounds?: DieBounds
): Promise<PBRMaps> {
  // 创建三个通道的 Canvas
  const metalnessCanvas = document.createElement('canvas');
  const roughnessCanvas = document.createElement('canvas');
  const clearcoatCanvas = document.createElement('canvas');

  metalnessCanvas.width = roughnessCanvas.width = clearcoatCanvas.width = baseWidth;
  metalnessCanvas.height = roughnessCanvas.height = clearcoatCanvas.height = baseHeight;

  const metalnessCtx = metalnessCanvas.getContext('2d')!;
  const roughnessCtx = roughnessCanvas.getContext('2d')!;
  const clearcoatCtx = clearcoatCanvas.getContext('2d')!;

  // 初始化：metalness=0(黑), roughness=1(白), clearcoat=0(黑)
  metalnessCtx.fillStyle = '#000000';
  metalnessCtx.fillRect(0, 0, baseWidth, baseHeight);

  roughnessCtx.fillStyle = '#ffffff';
  roughnessCtx.fillRect(0, 0, baseWidth, baseHeight);

  clearcoatCtx.fillStyle = '#000000';
  clearcoatCtx.fillRect(0, 0, baseWidth, baseHeight);

  // 计算坐标变换参数（与 TextureAtlasBuilder 保持一致）
  const padding = 16; // 与 TextureAtlasBuilder 的 padding 一致
  const availableWidth = baseWidth - padding * 2;
  const availableHeight = baseHeight - padding * 2;

  let scale = 1;
  let offsetX = 0;
  let offsetY = 0;

  if (dieBounds) {
    scale = Math.min(
      availableWidth / dieBounds.width,
      availableHeight / dieBounds.height
    );
    offsetX = padding - dieBounds.minX * scale;
    offsetY = padding - dieBounds.minY * scale;

    console.log('🎨 PBR坐标变换:', {
      dieBounds,
      scale,
      offsetX,
      offsetY,
      availableSize: { w: availableWidth, h: availableHeight },
    });
  }

  // 处理每个工艺层
  for (const layer of craftLayers) {
    const params = getCraftPBRParams(layer, config);
    if (!params) continue;

    // 获取遮罩图片，或根据 bounds 创建全白遮罩
    const maskBase64 = layer.pngPreview || layer.svgPreview;
    let maskCanvas: HTMLCanvasElement | null = null;

    if (maskBase64) {
      maskCanvas = await loadImageToCanvas(maskBase64);
    } else if (layer.bounds && layer.bounds.width > 0 && layer.bounds.height > 0) {
      // 没有 pngPreview，使用 bounds 创建全白遮罩
      maskCanvas = createSolidMaskCanvas(layer.bounds.width, layer.bounds.height);
      console.log(`🎨 工艺层 [${layer.name}] 无 pngPreview，使用 bounds 创建遮罩:`, layer.bounds);
    }

    if (!maskCanvas) {
      console.warn(`⚠️ 工艺层 [${layer.name}] 无法创建遮罩，跳过`);
      continue;
    }

    // 获取工艺层的位置信息，并应用坐标变换
    const bounds = layer.bounds;
    const srcX = bounds?.x ?? 0;
    const srcY = bounds?.y ?? 0;
    const srcW = bounds?.width ?? maskCanvas.width;
    const srcH = bounds?.height ?? maskCanvas.height;

    // 应用与 TextureAtlasBuilder 相同的坐标变换
    const destX = srcX * scale + offsetX;
    const destY = srcY * scale + offsetY;
    const destW = srcW * scale;
    const destH = srcH * scale;

    console.log(`🎨 PBR绘制工艺层 [${layer.name}]:`, {
      srcBounds: { x: srcX, y: srcY, w: srcW, h: srcH },
      destBounds: { x: destX, y: destY, w: destW, h: destH },
      maskSize: { w: maskCanvas.width, h: maskCanvas.height },
      canvasSize: { w: baseWidth, h: baseHeight },
    });

    // 提取 alpha 通道作为遮罩
    const maskCtx = maskCanvas.getContext('2d')!;
    const maskData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);

    // 创建临时 canvas 用于绘制单色遮罩
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = maskCanvas.width;
    tempCanvas.height = maskCanvas.height;
    const tempCtx = tempCanvas.getContext('2d')!;

    // 绘制 metalness 遮罩（根据 bounds 定位）
    if (params.metalness > 0) {
      const metalnessValue = Math.round(params.metalness * 255);
      applyMaskWithValue(tempCtx, maskData, metalnessValue);
      metalnessCtx.drawImage(tempCanvas, 0, 0, maskCanvas.width, maskCanvas.height,
                            destX, destY, destW, destH);
    }

    // 绘制 roughness 遮罩（根据 bounds 定位）
    const roughnessValue = Math.round(params.roughness * 255);
    applyMaskWithValue(tempCtx, maskData, roughnessValue);
    roughnessCtx.globalCompositeOperation = 'multiply';
    roughnessCtx.drawImage(tempCanvas, 0, 0, maskCanvas.width, maskCanvas.height,
                          destX, destY, destW, destH);
    roughnessCtx.globalCompositeOperation = 'source-over';

    // 绘制 clearcoat 遮罩（根据 bounds 定位）
    if (params.clearcoat > 0) {
      const clearcoatValue = Math.round(params.clearcoat * 255);
      applyMaskWithValue(tempCtx, maskData, clearcoatValue);
      clearcoatCtx.globalCompositeOperation = 'lighter';
      clearcoatCtx.drawImage(tempCanvas, 0, 0, maskCanvas.width, maskCanvas.height,
                            destX, destY, destW, destH);
      clearcoatCtx.globalCompositeOperation = 'source-over';
    }
  }

  // 转换为 THREE.Texture
  const metalnessMap = new THREE.CanvasTexture(metalnessCanvas);
  const roughnessMap = new THREE.CanvasTexture(roughnessCanvas);
  const clearcoatMap = new THREE.CanvasTexture(clearcoatCanvas);

  // 设置纹理参数
  [metalnessMap, roughnessMap, clearcoatMap].forEach(tex => {
    tex.colorSpace = THREE.LinearSRGBColorSpace;
    tex.needsUpdate = true;
  });

  return { metalnessMap, roughnessMap, clearcoatMap };
}

/** 将遮罩的 alpha 通道应用为指定灰度值 */
function applyMaskWithValue(
  ctx: CanvasRenderingContext2D,
  maskData: ImageData,
  grayValue: number
): void {
  const { width, height, data } = maskData;
  const outputData = ctx.createImageData(width, height);
  const out = outputData.data;

  for (let i = 0; i < data.length; i += 4) {
    // 使用原图的 alpha 或亮度作为遮罩强度
    const alpha = data[i + 3];
    const luminance = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
    const maskStrength = alpha > 0 ? (luminance / 255) * (alpha / 255) : 0;

    // 输出灰度值，alpha 为遮罩强度
    out[i] = grayValue;
    out[i + 1] = grayValue;
    out[i + 2] = grayValue;
    out[i + 3] = Math.round(maskStrength * 255);
  }

  ctx.putImageData(outputData, 0, 0);
}

/** Hook 参数 */
export interface UsePBRMapsOptions {
  craftLayers: MarkedLayer[];
  width: number;
  height: number;
  enabled?: boolean;
  /** 自定义 PBR 参数配置 */
  pbrConfig?: CraftPBRConfig;
  /** 刀版图边界（用于坐标变换，与 TextureAtlasBuilder 对齐） */
  dieBounds?: DieBounds;
}

/**
 * 从工艺层生成 PBR 贴图的 Hook
 * @param options - 配置选项
 * @returns PBR 贴图集
 */
export function usePBRMapsFromCraftLayers(options: UsePBRMapsOptions): PBRMaps {
  const { craftLayers, width, height, enabled = true, pbrConfig = DEFAULT_CRAFT_PBR_CONFIG, dieBounds } = options;
  const [maps, setMaps] = useState<PBRMaps>({
    metalnessMap: null,
    roughnessMap: null,
    clearcoatMap: null,
  });

  // 序列化 pbrConfig 用于依赖比较
  const pbrConfigKey = useMemo(() => JSON.stringify(pbrConfig), [pbrConfig]);

  // 过滤出有效的工艺层
  const validCraftLayers = useMemo(() => {
    if (!enabled) return [];

    // 🔍 调试：打印所有传入的工艺层
    console.log('🔍 usePBRMapsFromCraftLayers - 检查工艺层:', craftLayers.length);
    craftLayers.forEach((layer, i) => {
      console.log(`  [${i}] ${layer.name}:`, {
        craftType: layer.craftType,
        crafts: layer.crafts,
        isHotfoil: isHotfoil(layer),
        isSilver: isSilverFoil(layer),
        isUV: isUV(layer),
        hasPng: !!layer.pngPreview,
        hasSvg: !!layer.svgPreview,
        bounds: layer.bounds,
        hasBounds: !!(layer.bounds && layer.bounds.width > 0 && layer.bounds.height > 0),
      });
    });

    const valid = craftLayers.filter(layer => {
      const hasCraft = isHotfoil(layer) || isSilverFoil(layer) || isUV(layer);
      // 支持两种情况：有遮罩图片，或有有效的 bounds（用于生成全白遮罩）
      const hasMask = layer.pngPreview || layer.svgPreview;
      const hasBounds = layer.bounds && layer.bounds.width > 0 && layer.bounds.height > 0;
      return hasCraft && (hasMask || hasBounds);
    });
    console.log('🔍 usePBRMapsFromCraftLayers - validCraftLayers:', valid.length);
    return valid;
  }, [craftLayers, enabled]);

  // 序列化 dieBounds 用于依赖比较
  const dieBoundsKey = useMemo(() => JSON.stringify(dieBounds), [dieBounds]);

  // 生成 PBR 贴图
  useEffect(() => {
    if (!enabled || validCraftLayers.length === 0 || width <= 0 || height <= 0) {
      console.log('🔍 usePBRMapsFromCraftLayers - skipping:', { enabled, validCount: validCraftLayers.length, width, height });
      setMaps({ metalnessMap: null, roughnessMap: null, clearcoatMap: null });
      return;
    }

    let cancelled = false;

    console.log('🔍 usePBRMapsFromCraftLayers - generating PBR maps...', { width, height, pbrConfigKey, dieBounds });
    generatePBRMaps(validCraftLayers, width, height, pbrConfig, dieBounds).then(newMaps => {
      if (!cancelled) {
        console.log('✅ usePBRMapsFromCraftLayers - PBR maps generated');
        setMaps(newMaps);
      }
    });

    return () => {
      cancelled = true;
      // 清理旧纹理
      maps.metalnessMap?.dispose();
      maps.roughnessMap?.dispose();
      maps.clearcoatMap?.dispose();
    };
  }, [validCraftLayers, width, height, enabled, pbrConfigKey, dieBoundsKey]);

  return maps;
}

export default usePBRMapsFromCraftLayers;
