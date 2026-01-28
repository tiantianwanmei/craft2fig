/**
 * SkinnedMeshView - 骨骼蒙皮折叠视图组件
 * 使用 SkinnedFoldingMesh 实现平滑圆角折叠
 */

import React, { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { SkinnedFoldingMesh, type FoldTimingConfig } from '@genki/folding-3d';
import { buildTopologyTree, type BuildTreeInput } from './RecursiveFoldingBox';
import { convertToSkinnedPanelNode } from './SkinnedMeshAdapter';

/**
 * 根据 drivenMap 生成折叠时序
 * 关键：被同一个父面板 driven 的面板应该同时折叠
 */
function generateTimingsFromDrivenMap(
  rootId: string,
  drivenMap: Record<string, string[]>
): FoldTimingConfig[] {
  const timings: FoldTimingConfig[] = [];
  const visited = new Set<string>();

  // 根面板不折叠
  timings.push({
    panelId: rootId,
    startTime: 0,
    duration: 0,
    easing: 'linear',
  });
  visited.add(rootId);

  // BFS 遍历 drivenMap，按层级分配时序
  let currentLevel = [rootId];
  let level = 0;

  while (currentLevel.length > 0) {
    const nextLevel: string[] = [];

    for (const parentId of currentLevel) {
      const children = drivenMap[parentId] || [];
      for (const childId of children) {
        if (!visited.has(childId)) {
          visited.add(childId);
          nextLevel.push(childId);

          // 同一层级的面板同时开始折叠
          timings.push({
            panelId: childId,
            startTime: level * 0.25,
            duration: 0.3,
            easing: 'easeInOut',
          });
        }
      }
    }

    currentLevel = nextLevel;
    level++;
  }

  return timings;
}

interface SkinnedMeshViewProps {
  vectors: BuildTreeInput['vectors'];
  rootId: string;
  drivenMap: Record<string, string[]>;
  nameMap: Record<string, string>;
  foldProgress: number | React.MutableRefObject<number>;
  onMeshReady?: (mesh: THREE.SkinnedMesh | null) => void;
  thickness?: number;
  cornerRadius?: number;
  showSkeleton?: boolean;
  showWireframe?: boolean;
  yFlipBaseline?: number | null;
  imageMap?: Record<string, { url: string | null }>;
  gapSizeMultiplier?: number;
  creaseCurvature?: number;
  jointInterpolation?: 'linear' | 'smooth' | 'arc';
  xAxisMultiplier?: number;
  yAxisMultiplier?: number;
  nestingFactor?: number;
}

export const SkinnedMeshView: React.FC<SkinnedMeshViewProps> = ({
  vectors,
  rootId,
  drivenMap,
  nameMap,
  foldProgress,
  onMeshReady,
  thickness = 1,
  cornerRadius = 2,
  showSkeleton = false,
  showWireframe = false,
  yFlipBaseline = null,
  imageMap,
  gapSizeMultiplier = 1.0,
  creaseCurvature = 1.0,
  jointInterpolation = 'smooth',
  xAxisMultiplier = 1.0,
  yAxisMultiplier = 1.15,
  nestingFactor = 0.15,
}) => {
  const vectorsFor3D = useMemo(() => {
    if (yFlipBaseline === null || yFlipBaseline === undefined) {
      return vectors;
    }
    return vectors.map((v) => ({
      ...v,
      y: yFlipBaseline - (v.y + v.height),
    }));
  }, [vectors, yFlipBaseline]);

  // 构建拓扑树并转换为 SkinnedMesh 格式
  const panelTree = useMemo(() => {
    const tree = buildTopologyTree({ vectors: vectorsFor3D, rootId, drivenMap, nameMap, yFlipBaseline: null });
    if (!tree) return null;

    // 注入图片数据
    if (imageMap) {
      const traverse = (node: import('./RecursiveFoldingBox').PanelNode) => {
        // 尝试获取 NORMAL 工艺的图片，如果没有则尝试无后缀或其他
        const key = `${node.id}_NORMAL`;
        const imgData = imageMap[key] || imageMap[node.id];
        if (imgData?.url) {
          node.rasterImage = imgData.url;
        }
        node.children.forEach(traverse);
      };
      traverse(tree);
    }

    return convertToSkinnedPanelNode(tree, null, {
      jointWidth: cornerRadius,
      maxFoldAngle: Math.PI / 2,
    });
  }, [vectorsFor3D, rootId, drivenMap, nameMap, cornerRadius, imageMap]);

  // 🔍 调试：打印 SkinnedMeshView 渲染状态
  useEffect(() => {
    console.log('🦴 SkinnedMeshView - 渲染状态:', {
      hasPanelTree: !!panelTree,
      vectorsCount: vectorsFor3D.length,
      rootId,
      foldProgress: typeof foldProgress === 'number' ? foldProgress : foldProgress.current,
      thickness,
      cornerRadius,
    });
  }, [panelTree, vectorsFor3D.length, rootId, thickness, cornerRadius]);

  // 根据 drivenMap 生成折叠时序
  const foldTimings = useMemo(() => {
    return generateTimingsFromDrivenMap(rootId, drivenMap);
  }, [rootId, drivenMap]);

  // 计算缩放和居中
  const transform = useMemo(() => {
    if (vectorsFor3D.length === 0) {
      return { scale: 1, offsetX: 0, offsetY: 0 };
    }

    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    vectorsFor3D.forEach(v => {
      minX = Math.min(minX, v.x);
      minY = Math.min(minY, v.y);
      maxX = Math.max(maxX, v.x + v.width);
      maxY = Math.max(maxY, v.y + v.height);
    });

    const width = maxX - minX;
    const height = maxY - minY;
    const maxDim = Math.max(width, height);
    const scale = maxDim > 0 ? 100 / maxDim : 1;

    return {
      scale,
      offsetX: (minX + maxX) / 2,
      offsetY: (minY + maxY) / 2,
    };
  }, [vectorsFor3D]);

  if (!panelTree) return null;

  return (
    <group
      rotation={[-Math.PI / 2, 0, 0]}
      scale={[transform.scale, transform.scale, transform.scale]}
    >
      <SkinnedFoldingMesh
        panelTree={panelTree}
        onMeshReady={onMeshReady}
        foldProgress={foldProgress}
        thickness={thickness}
        cornerRadius={cornerRadius}
        jointSegments={8}
        showSkeleton={showSkeleton}
        showWireframe={showWireframe}
        foldTimings={foldTimings}
        gapSizeMultiplier={gapSizeMultiplier}
        creaseCurvature={creaseCurvature}
        jointInterpolation={jointInterpolation}
        xAxisMultiplier={xAxisMultiplier}
        yAxisMultiplier={yAxisMultiplier}
        nestingFactor={nestingFactor}
        materialProps={{
          roughness: 0.7,
          metalness: 0.1,
        }}
      />
    </group>
  );
};

export default SkinnedMeshView;
