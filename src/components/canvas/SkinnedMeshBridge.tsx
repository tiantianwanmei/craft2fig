/**
 * SkinnedMeshBridge - 桥接组件
 * 连接现有的 MarkedLayer 数据和 SkinnedFoldingMesh 系统
 */

import React, { useMemo, useEffect, useState } from 'react';
import { SkinnedFoldingMesh, TextureAtlasBuilder } from '@genki/folding-3d';
import type { PanelNode, TextureAtlasResult, FoldTimingConfig } from '@genki/folding-3d';
import type { MarkedLayer } from '../../types/core';
import { convertToPanelTree } from '../../utils/panelTreeConverter';
import { usePBRMapsFromCraftLayers, type CraftPBRConfig, type DieBounds, DEFAULT_CRAFT_PBR_CONFIG } from '../../hooks/usePBRMapsFromCraftLayers';
// import { PanelScaler } from '../../utils/PanelScaler';

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
  /** 折痕宽度（折叠边 width） */
  jointWidth?: number;
  /** 缩放比例 */
  scale?: number;
  /** 纸张厚度 */
  thickness?: number;
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
  /** 🆕 连接器宽度缩放因子 */
  gapSizeMultiplier?: number;
  /** 🆕 折痕曲率 (默认 1.0) */
  creaseCurvature?: number;
  /** 🆕 关节插值类型 */
  jointInterpolation?: 'linear' | 'smooth' | 'arc';
  /** 🆕 X轴补偿系数 */
  xAxisMultiplier?: number;
  /** 🆕 Y轴补偿系数 */
  yAxisMultiplier?: number;
  /** 🆕 嵌套深度因子 */
  nestingFactor?: number;
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
    node.children.forEach((child: PanelNode) => collectPanels(child, result));
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
  jointWidth = 2,
  scale = 0.1,
  thickness = 0.8,
  craftLayers = [],
  renderConfig = DEFAULT_RENDER_CONFIG,
  showSkeleton = false,
  showWireframe = false,
  pbrConfig = DEFAULT_CRAFT_PBR_CONFIG,
  gapSizeMultiplier,
  creaseCurvature = 1.0,
  jointInterpolation = 'smooth',
  xAxisMultiplier = 1.0,
  yAxisMultiplier = 1.15,
  nestingFactor = 0.15,
}) => {
  const [textureAtlas, setTextureAtlas] = useState<TextureAtlasResult | null>(null);

  // 🔧 简化的 gap 处理：只计算 multiplier，不修改树结构
  // 将 UI 的折痕宽度（jointWidth）映射到 SkinnedFoldingMesh 所需的 gapSizeMultiplier
  // 逻辑：SkinnedFoldingMesh 内部基础 gap = max(thickness * 1.5, 1.5)
  //       multiplier = jointWidth / baseGap，确保滑杆能直接控制实际折痕宽度
  const effectiveGapMultiplier = useMemo(() => {
    const baseGap = Math.max(thickness * 1.5, 1.5);
    // 🔧 修复：确保 safeWidth 至少为 0.1，防止 NaN 或 0 导致几何体生成失败
    const safeWidth = Math.max(0.1, Number(jointWidth) || 0.1);
    // 直接按 UI 宽度映射，baseGap 只用于归一化
    const effectiveGapSize = safeWidth;
    return effectiveGapSize / baseGap;
  }, [jointWidth, thickness]);

  // 转换面板数据为 PanelNode 树
  const { tree: panelTree, originX, originY } = useMemo(() => {
    if (!rootPanelId || panels.length === 0) return { tree: null, originX: 0, originY: 0 };

    // 🔧 计算全局边界，用于将所有坐标归一化到原点
    let minX = Infinity, minY = Infinity;
    panels.forEach(p => {
      const bx = (p as any).x ?? p.bounds?.x ?? 0;
      const by = (p as any).y ?? p.bounds?.y ?? 0;
      minX = Math.min(minX, bx);
      minY = Math.min(minY, by);
    });

    const tree = convertToPanelTree(panels, drivenMap, rootPanelId, {
      jointWidth: 0, // 🔧 关键：逻辑树设为 0 缝隙，由物理引擎统一动态计算偏移
      maxFoldAngle: Math.PI / 2,
      edgeTolerance: 10,
      offsetX: minX,
      offsetY: minY,
    });

    return { tree, originX: minX, originY: minY };
  }, [panels, drivenMap, rootPanelId]);

  // 🔧 使用传入的 gapSizeMultiplier 或计算的 effectiveGapMultiplier
  const appliedGapMultiplier = gapSizeMultiplier ?? effectiveGapMultiplier;

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

    // 🚀 日志已移除:避免大量重复输出
    return bounds;
  }, [panelTree]);

  // 🚀 日志已移除:避免大量重复输出

  // 生成 PBR 贴图（使用传入的 craftLayers 和 pbrConfig）
  const pbrMaps = usePBRMapsFromCraftLayers({
    craftLayers,
    width: 2048,
    height: 2048,
    enabled: craftLayers.length > 0,
    pbrConfig,
    dieBounds,
  });

  // 🚀 日志已移除:避免大量重复输出

  // 异步构建纹理图集
  useEffect(() => {
    if (!panelTree) {
      setTextureAtlas(null);
      return;
    }

    const hasRaster = (node: PanelNode): boolean => {
      if ((node as any).rasterImage) return true;
      const children = Array.isArray((node as any).children) ? (node as any).children : [];
      for (const c of children) {
        if (c && hasRaster(c as PanelNode)) return true;
      }
      return false;
    };

    if (!hasRaster(panelTree)) {
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

  // 🚀 日志已移除:避免大量重复输出

  if (!panelTree) {
    return null;
  }

  // 材质策略：
  // - 基础材质使用纸张参数（metalness=0, roughness=0.85）
  // - PBR 贴图控制工艺区域的效果（贴图中白色区域 = 工艺效果）
  // - 如果没有 PBR 贴图，使用 pbrConfig.hotfoil 作为全局预览（临时方案）
  return (
    <group position={groupTransform.position}>
      <SkinnedFoldingMesh
        key={`mesh-${panelTree?.id || 'root'}-${jointWidth}-${appliedGapMultiplier}-${creaseCurvature}-${xAxisMultiplier}-${yAxisMultiplier}-${nestingFactor}`}
        panelTree={panelTree}
        textureAtlas={textureAtlas ?? undefined}
        foldProgress={foldProgress}
        thickness={thickness}
        cornerRadius={2}
        jointSegments={8}
        scale={scale}
        gapSizeMultiplier={appliedGapMultiplier}
        baseWidth={jointWidth} // 🆕 将 UI 的折痕宽度传入物理引擎作为计算基数
        originX={originX} // 🆕 传递归一化原点，修复骨骼偏移
        originY={originY} // 🆕 传递归一化原点，修复骨骼偏移
        creaseCurvature={creaseCurvature}
        jointInterpolation={jointInterpolation}
        xAxisMultiplier={xAxisMultiplier}
        yAxisMultiplier={yAxisMultiplier}
        nestingFactor={nestingFactor}
        materialProps={{
          // 
          roughness: hasPbrMaps
            ? basePaperParams.roughness * renderConfig.roughnessMultiplier
            : pbrConfig.hotfoil.roughness * renderConfig.roughnessMultiplier,
          metalness: hasPbrMaps
            ? basePaperParams.metalness + renderConfig.metalnessBoost
            : Math.min(1, pbrConfig.hotfoil.metalness + renderConfig.metalnessBoost),
          color: '#ffffff',
          // 🚀 只在贴图存在时才传递,避免 THREE.Material 警告
          ...(pbrMaps.metalnessMap && { metalnessMap: pbrMaps.metalnessMap }),
          ...(pbrMaps.roughnessMap && { roughnessMap: pbrMaps.roughnessMap }),
          ...(pbrMaps.clearcoatMap && { clearcoatMap: pbrMaps.clearcoatMap }),
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
