/**
 * RecursiveFoldingBox - 递归折叠盒组件
 * 核心原理：子面板嵌套在父面板的 <group> 内，实现带动折叠
 */

import React, { useMemo } from 'react';
import * as THREE from 'three';

// 面板节点类型
export interface PanelNode {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  children: PanelNode[];
  attachEdge: 'top' | 'bottom' | 'left' | 'right';
  color?: string;
}

// 构建拓扑树的输入
export interface BuildTreeInput {
  vectors: Array<{
    id: string;
    name: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
  rootId: string;
  drivenMap: Record<string, string[]>;
  nameMap: Record<string, string>;
}

// 颜色映射
const PANEL_COLORS: Record<string, string> = {
  '1': '#4a90d9',      // H面 - 蓝色
  '2': '#5ba55b',      // 左1 - 绿色
  '3': '#d9a55b',      // 左2 - 橙色
  '4': '#9b5bd9',      // 左3 - 紫色
  '-2': '#d95b5b',     // 右1 - 红色
  '-3': '#5bd9d9',     // 右2 - 青色
};

const DEFAULT_COLORS = [
  '#e57373', '#f06292', '#ba68c8', '#9575cd',
  '#7986cb', '#64b5f6', '#4fc3f7', '#4dd0e1',
  '#4db6ac', '#81c784', '#aed581', '#dce775',
];

function getColorForPanel(name: string, index: number): string {
  if (PANEL_COLORS[name]) return PANEL_COLORS[name];
  return DEFAULT_COLORS[index % DEFAULT_COLORS.length];
}

/**
 * 构建拓扑树 - 将扁平的面板列表转换为嵌套的树结构
 */
export function buildTopologyTree(input: BuildTreeInput): PanelNode | null {
  const { vectors, rootId, drivenMap, nameMap } = input;

  if (!rootId || vectors.length === 0) return null;

  const vectorMap = new Map(vectors.map(v => [v.id, v]));
  const visited = new Set<string>();

  // 判断两个面板的连接边
  function getAttachEdge(parent: typeof vectors[0], child: typeof vectors[0]): PanelNode['attachEdge'] {
    const TOLERANCE = 15;

    // 子面板在父面板上方
    if (Math.abs(child.y + child.height - parent.y) < TOLERANCE) {
      return 'top';
    }
    // 子面板在父面板下方
    if (Math.abs(parent.y + parent.height - child.y) < TOLERANCE) {
      return 'bottom';
    }
    // 子面板在父面板左侧
    if (Math.abs(child.x + child.width - parent.x) < TOLERANCE) {
      return 'left';
    }
    // 子面板在父面板右侧
    if (Math.abs(parent.x + parent.width - child.x) < TOLERANCE) {
      return 'right';
    }

    // 默认根据相对位置判断
    const dx = child.x - parent.x;
    const dy = child.y - parent.y;

    if (Math.abs(dx) > Math.abs(dy)) {
      return dx < 0 ? 'left' : 'right';
    } else {
      return dy < 0 ? 'top' : 'bottom';
    }
  }

  // 递归构建节点
  function buildNode(id: string, colorIndex: number): PanelNode | null {
    if (visited.has(id)) return null;
    visited.add(id);

    const vector = vectorMap.get(id);
    if (!vector) return null;

    const name = nameMap[id] || vector.name;
    const childIds = drivenMap[id] || [];

    const node: PanelNode = {
      id,
      name,
      x: vector.x,
      y: vector.y,
      width: vector.width,
      height: vector.height,
      children: [],
      attachEdge: 'bottom', // 根节点默认
      color: getColorForPanel(name, colorIndex),
    };

    // 递归构建子节点
    childIds.forEach((childId, idx) => {
      const childVector = vectorMap.get(childId);
      if (childVector && !visited.has(childId)) {
        const childNode = buildNode(childId, colorIndex + idx + 1);
        if (childNode) {
          childNode.attachEdge = getAttachEdge(vector, childVector);
          node.children.push(childNode);
        }
      }
    });

    return node;
  }

  return buildNode(rootId, 0);
}

// 单个面板的3D渲染
interface Panel3DProps {
  node: PanelNode;
  foldProgress: number;
  scale: number;
  thickness: number;
  offsetX: number;
  offsetY: number;
  parentFolded?: boolean;
}

const Panel3D: React.FC<Panel3DProps> = ({
  node,
  foldProgress,
  scale,
  thickness,
  offsetX,
  offsetY,
  parentFolded = false,
}) => {
  // 计算面板在3D空间中的位置
  const posX = (node.x - offsetX) * scale;
  const posZ = (node.y - offsetY) * scale;
  const width = node.width * scale;
  const height = node.height * scale;

  // 计算折叠角度 (0 -> PI/2)
  const foldAngle = foldProgress * Math.PI / 2;

  // 根据连接边计算铰链位置和旋转
  const { pivotPosition, rotation, meshOffset } = useMemo(() => {
    let pivot: [number, number, number] = [0, 0, 0];
    let rot: [number, number, number] = [0, 0, 0];
    let offset: [number, number, number] = [width / 2, thickness / 2, height / 2];

    switch (node.attachEdge) {
      case 'top':
        // 铰链在父面板顶边，向上翻折
        pivot = [posX + width / 2, 0, posZ + height];
        rot = [-foldAngle, 0, 0];
        offset = [0, thickness / 2, -height / 2];
        break;
      case 'bottom':
        // 铰链在父面板底边，向下翻折
        pivot = [posX + width / 2, 0, posZ];
        rot = [foldAngle, 0, 0];
        offset = [0, thickness / 2, height / 2];
        break;
      case 'left':
        // 铰链在父面板左边，向左翻折
        pivot = [posX + width, 0, posZ + height / 2];
        rot = [0, 0, foldAngle];
        offset = [-width / 2, thickness / 2, 0];
        break;
      case 'right':
        // 铰链在父面板右边，向右翻折
        pivot = [posX, 0, posZ + height / 2];
        rot = [0, 0, -foldAngle];
        offset = [width / 2, thickness / 2, 0];
        break;
    }

    return { pivotPosition: pivot, rotation: rot, meshOffset: offset };
  }, [node.attachEdge, posX, posZ, width, height, foldAngle, thickness]);

  return (
    <group position={pivotPosition} rotation={rotation}>
      {/* 当前面板 */}
      <mesh position={meshOffset}>
        <boxGeometry args={[width, thickness, height]} />
        <meshStandardMaterial
          color={node.color || '#888888'}
          roughness={0.7}
          metalness={0.1}
        />
      </mesh>

      {/* 递归渲染子面板 - 关键：子面板在父面板的 group 内 */}
      {node.children.map((child) => (
        <Panel3D
          key={child.id}
          node={child}
          foldProgress={foldProgress}
          scale={scale}
          thickness={thickness}
          offsetX={offsetX}
          offsetY={offsetY}
          parentFolded={true}
        />
      ))}
    </group>
  );
};

// 主组件
interface RecursiveFoldingBoxProps {
  vectors: BuildTreeInput['vectors'];
  rootId: string;
  drivenMap: Record<string, string[]>;
  nameMap: Record<string, string>;
  foldProgress: number;
  thickness?: number;
}

export const RecursiveFoldingBox: React.FC<RecursiveFoldingBoxProps> = ({
  vectors,
  rootId,
  drivenMap,
  nameMap,
  foldProgress,
  thickness = 2,
}) => {
  // 构建拓扑树
  const tree = useMemo(() => {
    return buildTopologyTree({ vectors, rootId, drivenMap, nameMap });
  }, [vectors, rootId, drivenMap, nameMap]);

  // 计算边界和缩放
  const { scale, offsetX, offsetY, centerX, centerZ } = useMemo(() => {
    if (vectors.length === 0) {
      return { scale: 1, offsetX: 0, offsetY: 0, centerX: 0, centerZ: 0 };
    }

    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    vectors.forEach(v => {
      minX = Math.min(minX, v.x);
      minY = Math.min(minY, v.y);
      maxX = Math.max(maxX, v.x + v.width);
      maxY = Math.max(maxY, v.y + v.height);
    });

    const width = maxX - minX;
    const height = maxY - minY;
    const maxDim = Math.max(width, height);

    // 缩放到 100 单位
    const s = maxDim > 0 ? 100 / maxDim : 1;

    return {
      scale: s,
      offsetX: minX,
      offsetY: minY,
      centerX: (minX + maxX) / 2 * s - minX * s,
      centerZ: (minY + maxY) / 2 * s - minY * s,
    };
  }, [vectors]);

  if (!tree) {
    return null;
  }

  // 根节点位置
  const rootPosX = (tree.x - offsetX) * scale;
  const rootPosZ = (tree.y - offsetY) * scale;
  const rootWidth = tree.width * scale;
  const rootHeight = tree.height * scale;

  return (
    <group
      rotation={[-Math.PI / 2, 0, 0]}
      position={[-centerX, 0, centerZ]}
    >
      {/* 根面板（H面）- 不折叠 */}
      <mesh position={[rootPosX + rootWidth / 2, thickness / 2, rootPosZ + rootHeight / 2]}>
        <boxGeometry args={[rootWidth, thickness, rootHeight]} />
        <meshStandardMaterial
          color={tree.color || '#4a90d9'}
          roughness={0.7}
          metalness={0.1}
        />
      </mesh>

      {/* 递归渲染子面板 */}
      {tree.children.map((child) => (
        <Panel3D
          key={child.id}
          node={child}
          foldProgress={foldProgress}
          scale={scale}
          thickness={thickness}
          offsetX={offsetX}
          offsetY={offsetY}
        />
      ))}
    </group>
  );
};

export default RecursiveFoldingBox;
