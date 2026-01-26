/**
 * SkinnedMeshBridge - 桥接组件
 * 连接现有的 MarkedLayer 数据和 SkinnedFoldingMesh 系统
 */

import React, { useMemo, useEffect, useState } from 'react';
import * as THREE from 'three';
import { SkinnedFoldingMesh, TextureAtlasBuilder } from '@genki/folding-3d';
import type { PanelNode, TextureAtlasResult, FoldTimingConfig } from '@genki/folding-3d';
import type { MarkedLayer } from '../../types/core';
import { convertToPanelTree, calculateTreeBounds } from '../../utils/panelTreeConverter';
import { usePBRMapsFromCraftLayers, type CraftPBRConfig, type DieBounds, DEFAULT_CRAFT_PBR_CONFIG } from '../../hooks/usePBRMapsFromCraftLayers';

/** 渲染配置 */
interface RenderConfig {
  roughnessMultiplier: number;
  metalnessBoost: number;
  clearcoatBoost: number;
  envMapIntensity: number;
}

/** 组件属性 */
export interface SkinnedMeshBridgeProps {
  /** 面板数据 */
  panels: MarkedLayer[];
  /** 驱动关系映射 */
  drivenMap: Record<string, string[]>;
  /** 根面板 ID */
  rootPanelId: string | null;
  /** 折叠进度 0-1 */
  foldProgress: number;
  /** 折叠顺序 */
  foldSequence?: string[];
  /** 缩放比例 */
  scale?: number;
  /** 纸张厚度 */
  thickness?: number;
  /** 偏移 X */
  offsetX: number;
  /** 偏移 Y */
  offsetY: number;
  /** 中心 X */
  centerX?: number;
  /** 中心 Y */
  centerY?: number;
  /** 工艺图层（烫金、烫银、UV等） */
  craftLayers?: MarkedLayer[];
  /** 渲染配置 */
  renderConfig?: RenderConfig;
  /** 是否显示骨骼辅助线 */
  showSkeleton?: boolean;
  /** 是否显示线框 */
  showWireframe?: boolean;
  /** PBR 参数配置 */
  pbrConfig?: CraftPBRConfig;
}

/** 默认渲染配置 */
const DEFAULT_RENDER_CONFIG: RenderConfig = {
  roughnessMultiplier: 1.0,
  metalnessBoost: 0,
  clearcoatBoost: 0,
  envMapIntensity: 1.0,
};

/**
 * 生成折叠时序配置
 */
function generateFoldTimings(
  panelTree: PanelNode,
  sequence: string[]
): FoldTimingConfig[] {
  const timings: FoldTimingConfig[] = [];

  // 收集所有面板
  const collectPanels = (node: PanelNode, result: PanelNode[] = []): PanelNode[] => {
    result.push(node);
    node.children.forEach(child => collectPanels(child, result));
    return result;
  };

  const allPanels = collectPanels(panelTree);

  // 如果没有 sequence，使用默认顺序
  const orderedIds = sequence.length > 0
    ? sequence
    : allPanels.map(p => p.id);

  // 计算时序
  const totalPanels = orderedIds.length;
  const overlapRatio = 0.3;
  const segmentDuration = 1 / (totalPanels * (1 - overlapRatio) + overlapRatio);

  orderedIds.forEach((panelId, index) => {
    const panel = allPanels.find(p => p.id === panelId);
    if (!panel) return;

    // 根面板不折叠
    if (!panel.parentId) {
      timings.push({
        panelId,
        startTime: 0,
        duration: 0,
        easing: 'linear',
      });
      return;
    }

    const startTime = index * segmentDuration * (1 - overlapRatio);
    timings.push({
      panelId,
      startTime,
      duration: segmentDuration,
      easing: 'easeInOut',
    });
  });

  return timings;
}

/**
 * SkinnedMeshBridge 组件
 * 将 MarkedLayer 数据转换并渲染为 SkinnedMesh
 */
export const SkinnedMeshBridge: React.FC<SkinnedMeshBridgeProps> = ({
  panels,
  drivenMap,
  rootPanelId,
  foldProgress,
  foldSequence = [],
  scale = 0.1,
  thickness = 0.8,
  offsetX,
  offsetY,
  centerX = 0,
  centerY = 0,
  craftLayers = [],
  renderConfig = DEFAULT_RENDER_CONFIG,
  showSkeleton = false,
  showWireframe = false,
  pbrConfig = DEFAULT_CRAFT_PBR_CONFIG,
}) => {
  const [textureAtlas, setTextureAtlas] = useState<TextureAtlasResult | null>(null);

  // 检查是否所有面板都有贴图数据
  const panelsReady = useMemo(() => {
    if (!rootPanelId || panels.length === 0) return false;
    // 检查根面板是否有 pngPreview
    const rootPanel = panels.find(p => p.id === rootPanelId);
    return rootPanel && !!rootPanel.pngPreview;
  }, [panels, rootPanelId]);

  // 转换面板数据为 PanelNode 树
  const panelTree = useMemo(() => {
    if (!rootPanelId || panels.length === 0) return null;

    // 等待贴图数据准备好
    if (!panelsReady) {
      console.log('⏳ SkinnedMeshBridge: 等待贴图数据...');
      return null;
    }

    // 调试：检查输入数据
    console.log('🔍 SkinnedMeshBridge: 输入面板数据检查');
    panels.forEach((p, i) => {
      const hasPng = !!p.pngPreview;
      const pngLen = p.pngPreview?.length || 0;
      console.log(`  Panel ${i}: ${p.name} (${p.id}) - pngPreview: ${hasPng ? `YES (${pngLen} chars)` : 'NO'}`);
    });

    const tree = convertToPanelTree(panels, drivenMap, rootPanelId, {
      jointWidth: 2,
      maxFoldAngle: Math.PI / 2,
      edgeTolerance: 10,
      offsetX,
      offsetY,
    });

    if (tree) {
      console.log('🌳 SkinnedMeshBridge: 面板树构建完成');
      // 检查树中的 rasterImage
      const checkTree = (node: PanelNode, depth = 0) => {
        const indent = '  '.repeat(depth);
        const hasRaster = !!node.rasterImage;
        const rasterLen = typeof node.rasterImage === 'string' ? node.rasterImage.length : 0;
        console.log(`${indent}📦 ${node.name} (${node.id}): rasterImage = ${hasRaster ? `YES (${rasterLen} chars)` : 'NO'}`);
        node.children.forEach(child => checkTree(child, depth + 1));
      };
      checkTree(tree);
    }

    return tree;
  }, [panels, drivenMap, rootPanelId, panelsReady, offsetX, offsetY]);

  // 生成折叠时序
  const foldTimings = useMemo(() => {
    if (!panelTree) return [];
    return generateFoldTimings(panelTree, foldSequence);
  }, [panelTree, foldSequence]);

  // 计算刀版图边界（用于 PBR 贴图坐标变换）
  const dieBounds = useMemo<DieBounds | undefined>(() => {
    if (!panelTree) return undefined;

    // 递归计算所有面板的边界
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    const traverse = (node: PanelNode) => {
      minX = Math.min(minX, node.bounds.x);
      minY = Math.min(minY, node.bounds.y);
      maxX = Math.max(maxX, node.bounds.x + node.bounds.width);
      maxY = Math.max(maxY, node.bounds.y + node.bounds.height);
      node.children.forEach(traverse);
    };
    traverse(panelTree);

    const bounds: DieBounds = {
      minX,
      minY,
      maxX,
      maxY,
      width: maxX - minX,
      height: maxY - minY,
    };

    console.log('📐 SkinnedMeshBridge - dieBounds:', bounds);
    return bounds;
  }, [panelTree]);

  // 🔍 调试：打印 pbrConfig 变化
  useEffect(() => {
    console.log('🎛️ SkinnedMeshBridge - pbrConfig 更新:', JSON.stringify(pbrConfig, null, 2));
  }, [pbrConfig]);

  // 生成 PBR 贴图（使用传入的 craftLayers 和 pbrConfig）
  const pbrMaps = usePBRMapsFromCraftLayers({
    craftLayers,
    width: 2048,
    height: 2048,
    enabled: craftLayers.length > 0,
    pbrConfig,
    dieBounds,
  });

  // 🔍 调试：打印 PBR 贴图生成结果
  useEffect(() => {
    console.log('🎨 SkinnedMeshBridge - pbrMaps 更新:', {
      hasMetalnessMap: !!pbrMaps.metalnessMap,
      hasRoughnessMap: !!pbrMaps.roughnessMap,
      hasClearcoatMap: !!pbrMaps.clearcoatMap,
    });
  }, [pbrMaps]);

  // 异步构建纹理图集
  useEffect(() => {
    if (!panelTree) {
      setTextureAtlas(null);
      return;
    }

    const buildAtlas = async () => {
      try {
        const builder = new TextureAtlasBuilder({
          width: 2048,
          height: 2048,
          padding: 16,
        });
        const atlas = await builder.buildFromPanelTree(panelTree);
        console.log('🎨 SkinnedMeshBridge: 纹理图集构建完成', atlas);
        setTextureAtlas(atlas);
      } catch (error) {
        console.error('❌ 纹理图集构建失败:', error);
      }
    };

    buildAtlas();
  }, [panelTree]);

  // 暂时不做居中偏移，让骨骼和网格保持一致
  // TODO: 后续可以在 SkinnedFoldingMesh 内部处理居中
  const groupTransform = useMemo(() => {
    return {
      position: [0, 0, 0] as [number, number, number],
    };
  }, []);

  // 检查是否有有效的 PBR 贴图
  const hasPbrMaps = !!(pbrMaps.metalnessMap || pbrMaps.roughnessMap || pbrMaps.clearcoatMap);

  // 基础纸张材质参数（无工艺区域使用这些值）
  const basePaperParams = {
    roughness: 0.85,  // 纸张粗糙
    metalness: 0.0,   // 纸张无金属感
    clearcoat: 0.0,   // 纸张无清漆
    clearcoatRoughness: 0.1,
  };

  // 🔍 调试：打印 PBR 贴图状态
  useEffect(() => {
    console.log('🎛️ SkinnedMeshBridge - PBR 状态:', {
      hasPbrMaps,
      craftLayersCount: craftLayers.length,
      pbrConfig: JSON.stringify(pbrConfig),
    });
  }, [hasPbrMaps, craftLayers.length, pbrConfig]);

  if (!panelTree) {
    return null;
  }

  // 🔥 材质策略：
  // - 基础材质使用纸张参数（metalness=0, roughness=0.85）
  // - PBR 贴图控制工艺区域的效果（贴图中白色区域 = 工艺效果）
  // - 如果没有 PBR 贴图，使用 pbrConfig.hotfoil 作为全局预览（临时方案）
  return (
    <group position={groupTransform.position}>
      <SkinnedFoldingMesh
        panelTree={panelTree}
        textureAtlas={textureAtlas ?? undefined}
        foldProgress={foldProgress}
        thickness={thickness}
        cornerRadius={2}
        jointSegments={8}
        scale={scale}
        materialProps={{
          // 基础材质：有贴图时用纸张参数，无贴图时用工艺参数预览
          roughness: hasPbrMaps
            ? basePaperParams.roughness * renderConfig.roughnessMultiplier
            : pbrConfig.hotfoil.roughness * renderConfig.roughnessMultiplier,
          metalness: hasPbrMaps
            ? basePaperParams.metalness + renderConfig.metalnessBoost
            : Math.min(1, pbrConfig.hotfoil.metalness + renderConfig.metalnessBoost),
          color: '#ffffff',
          // PBR 贴图控制工艺区域
          metalnessMap: pbrMaps.metalnessMap,
          roughnessMap: pbrMaps.roughnessMap,
          clearcoatMap: pbrMaps.clearcoatMap,
          // 清漆：有贴图时由贴图控制，无贴图时全局预览
          clearcoat: hasPbrMaps
            ? 1.0  // 启用清漆，由 clearcoatMap 控制强度
            : pbrConfig.hotfoil.clearcoat + renderConfig.clearcoatBoost,
          clearcoatRoughness: basePaperParams.clearcoatRoughness,
          // 环境光反射强度
          envMapIntensity: renderConfig.envMapIntensity,
        }}
        showSkeleton={showSkeleton}
        showWireframe={showWireframe}
        foldTimings={foldTimings}
      />
    </group>
  );
};

export default SkinnedMeshBridge;
