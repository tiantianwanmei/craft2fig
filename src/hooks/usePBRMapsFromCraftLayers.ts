/**
 * 🎨 usePBRMapsFromCraftLayers - 从工艺层生成 PBR 贴图的 Hook (Worker 优化版)
 * 🚀 性能优化：使用 Web Worker 在后台线程处理，保持 UI 流畅
 */

import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import * as THREE from 'three';
import type { MarkedLayer } from '../types/core';
import { getPBRComputeClient } from '../workers/pbrComputeClient';
import type { CraftLayerData, DieBounds as WorkerDieBounds, CraftPBRConfig } from '../workers/pbrCompute.worker';

export type { CraftPBRConfig };

// 工艺类型判断函数 - 支持多种命名方式
const isHotfoil = (layer: MarkedLayer) =>
  layer.craftType === 'HOTFOIL' ||
  layer.crafts?.some(c => c.includes('烫金') || c.toLowerCase().includes('hotfoil') || c.toLowerCase().includes('gold')) ||
  layer.name.includes('烫金') ||
  layer.name.toLowerCase().includes('hotfoil') ||
  layer.name.toLowerCase().includes('gold foil');

const isSilverFoil = (layer: MarkedLayer) =>
  String(layer.craftType ?? '') === 'SILVER' ||
  String(layer.craftType ?? '') === 'SILVERFOIL' ||
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

/** 工艺类型对应的 PBR 参数 */
export interface CraftPBRParams {
  metalness: number;
  roughness: number;
  clearcoat: number;
  clearcoatRoughness: number;
}

/** 工艺类型 ID */
export type CraftTypeId = 'hotfoil' | 'silver' | 'uv';

/** 默认 PBR 参数 */
export const DEFAULT_CRAFT_PBR_CONFIG: CraftPBRConfig = {
  hotfoil: { metalness: 1.0, roughness: 0.2, clearcoat: 0.5, clearcoatRoughness: 0.1 },
  silver: { metalness: 1.0, roughness: 0.15, clearcoat: 0.6, clearcoatRoughness: 0.05 },
  uv: { metalness: 0.0, roughness: 0.1, clearcoat: 1.0, clearcoatRoughness: 0.05 },
};

/** 获取图层的工艺类型 ID */
export function getCraftTypeId(layer: MarkedLayer): CraftTypeId | null {
  if (isHotfoil(layer)) return 'hotfoil';
  if (isSilverFoil(layer)) return 'silver';
  if (isUV(layer)) return 'uv';
  return null;
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
 * 从工艺层生成 PBR 贴图的 Hook (Worker 优化版)
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

  // 🚀 性能优化:日志节流 - 只在状态变化时输出,避免大量重复日志
  const lastLogStateRef = useRef<string>('');

  // 🚀 性能优化：使用 useCallback 避免函数重新创建
  const convertToWorkerData = useCallback((layer: MarkedLayer): CraftLayerData => ({
    name: layer.name,
    craftType: layer.craftType || '',
    crafts: layer.crafts,
    pngPreview: layer.pngPreview,
    svgPreview: layer.svgPreview,
    bounds: layer.bounds,
  }), []);

  // 🚀 性能优化：使用 useMemo 过滤有效工艺层
  const validCraftLayers = useMemo(() => {
    if (!enabled) return [];

    return craftLayers.filter(layer => {
      const hasCraft = isHotfoil(layer) || isSilverFoil(layer) || isUV(layer);
      const hasMask = layer.pngPreview || layer.svgPreview;
      const hasBounds = layer.bounds && layer.bounds.width > 0 && layer.bounds.height > 0;
      return hasCraft && (hasMask || hasBounds);
    });
  }, [craftLayers, enabled]);

  // 🚀 性能优化：序列化配置用于依赖比较
  const pbrConfigKey = useMemo(() => JSON.stringify(pbrConfig), [pbrConfig]);
  const dieBoundsKey = useMemo(() => JSON.stringify(dieBounds), [dieBounds]);

  // 🚀 性能优化：使用 Worker 生成 PBR 贴图
  useEffect(() => {
    if (!enabled || validCraftLayers.length === 0 || width <= 0 || height <= 0) {
      // 🚀 日志节流:只在状态变化时输出
      const currentState = `skip:${enabled}:${validCraftLayers.length}:${width}:${height}`;
      if (lastLogStateRef.current !== currentState) {
        console.log('🔍 usePBRMapsFromCraftLayers - skipping:', { enabled, validCount: validCraftLayers.length, width, height });
        lastLogStateRef.current = currentState;
      }
      setMaps({ metalnessMap: null, roughnessMap: null, clearcoatMap: null });
      return;
    }

    let cancelled = false;

    // 🚀 日志节流:只在开始生成时输出一次
    const currentState = `gen:${validCraftLayers.length}:${width}:${height}`;
    if (lastLogStateRef.current !== currentState) {
      console.log('🚀 usePBRMapsFromCraftLayers - generating PBR maps with Worker...', { width, height, layerCount: validCraftLayers.length });
      lastLogStateRef.current = currentState;
    }

    const workerData = validCraftLayers.map(convertToWorkerData);
    const workerDieBounds: WorkerDieBounds | undefined = dieBounds ? {
      minX: dieBounds.minX,
      minY: dieBounds.minY,
      maxX: dieBounds.maxX,
      maxY: dieBounds.maxY,
      width: dieBounds.width,
      height: dieBounds.height,
    } : undefined;

    const client = getPBRComputeClient();

    client.generatePBRMaps(workerData, width, height, pbrConfig, workerDieBounds)
      .then(result => {
        if (cancelled) return;

        // 将 ImageData 转换为 THREE.Texture
        const metalnessCanvas = document.createElement('canvas');
        const roughnessCanvas = document.createElement('canvas');
        const clearcoatCanvas = document.createElement('canvas');

        metalnessCanvas.width = roughnessCanvas.width = clearcoatCanvas.width = width;
        metalnessCanvas.height = roughnessCanvas.height = clearcoatCanvas.height = height;

        const metalnessCtx = metalnessCanvas.getContext('2d')!;
        const roughnessCtx = roughnessCanvas.getContext('2d')!;
        const clearcoatCtx = clearcoatCanvas.getContext('2d')!;

        metalnessCtx.putImageData(result.metalnessImageData, 0, 0);
        roughnessCtx.putImageData(result.roughnessImageData, 0, 0);
        clearcoatCtx.putImageData(result.clearcoatImageData, 0, 0);

        const metalnessMap = new THREE.CanvasTexture(metalnessCanvas);
        const roughnessMap = new THREE.CanvasTexture(roughnessCanvas);
        const clearcoatMap = new THREE.CanvasTexture(clearcoatCanvas);

        // 设置纹理参数
        [metalnessMap, roughnessMap, clearcoatMap].forEach(tex => {
          tex.colorSpace = THREE.LinearSRGBColorSpace;
          tex.needsUpdate = true;
        });

        console.log('✅ usePBRMapsFromCraftLayers - PBR maps generated (Worker)');
        setMaps({ metalnessMap, roughnessMap, clearcoatMap });
      })
      .catch(error => {
        if (cancelled) return;
        console.error('❌ PBR Worker generation failed:', error);
        setMaps({ metalnessMap: null, roughnessMap: null, clearcoatMap: null });
      });

    return () => {
      cancelled = true;
      // 清理旧纹理
      maps.metalnessMap?.dispose();
      maps.roughnessMap?.dispose();
      maps.clearcoatMap?.dispose();
    };
  }, [validCraftLayers, width, height, enabled, pbrConfigKey, dieBoundsKey, convertToWorkerData, pbrConfig, dieBounds, maps]);

  return maps;
}

export default usePBRMapsFromCraftLayers;
