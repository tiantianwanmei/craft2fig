/**
 * SkinnedMeshAdapter - 数据转换适配器
 * 将现有的拓扑树格式转换为 SkinnedMesh 需要的 PanelNode 格式
 */

import type { PanelNode as SkinnedPanelNode, JointInfo } from '@genki/folding-3d';
import type { PanelNode as RecursivePanelNode } from './RecursiveFoldingBox';

/** 转换配置 */
interface AdapterConfig {
  /** 关节宽度 (圆角半径) */
  jointWidth?: number;
  /** 默认最大折叠角度 */
  maxFoldAngle?: number;
}

const DEFAULT_CONFIG: AdapterConfig = {
  jointWidth: 2,
  maxFoldAngle: Math.PI / 2,
};

/**
 * 将 RecursiveFoldingBox 的 PanelNode 转换为 SkinnedMesh 的 PanelNode
 */
export function convertToSkinnedPanelNode(
  node: RecursivePanelNode,
  parentNode: RecursivePanelNode | null,
  config: AdapterConfig = {}
): SkinnedPanelNode {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // 计算关节信息
  let jointInfo: JointInfo | undefined;

  if (parentNode) {
    jointInfo = calculateJointInfo(node, parentNode, cfg as Required<AdapterConfig>);
  }

  // 转换当前节点
  const skinnedNode: SkinnedPanelNode = {
    id: node.id,
    name: node.name,
    bounds: {
      x: node.x,
      y: node.y,
      width: node.width,
      height: node.height,
    },
    center: {
      x: node.x + node.width / 2,
      y: node.y + node.height / 2,
    },
    parentId: parentNode?.id ?? null,
    children: [],
    jointInfo,
    rasterImage: node.rasterImage,
  };

  // 递归转换子节点
  skinnedNode.children = node.children.map(child =>
    convertToSkinnedPanelNode(child, node, config)
  );

  return skinnedNode;
}

/**
 * 计算关节信息
 */
function calculateJointInfo(
  child: RecursivePanelNode,
  parent: RecursivePanelNode,
  config: Required<AdapterConfig>
): JointInfo {
  const { attachEdge } = child;
  const { jointWidth, maxFoldAngle } = config;

  let type: 'horizontal' | 'vertical';
  let position: { x: number; y: number };
  let length: number;
  let direction: 1 | -1;

  switch (attachEdge) {
    case 'top':
      type = 'horizontal';
      position = { x: child.x, y: parent.y };
      length = child.width;
      direction = -1;
      break;
    case 'bottom':
      type = 'horizontal';
      position = { x: child.x, y: parent.y + parent.height };
      length = child.width;
      direction = 1;
      break;
    case 'left':
      type = 'vertical';
      position = { x: parent.x, y: child.y };
      length = child.height;
      direction = 1;
      break;
    case 'right':
    default:
      type = 'vertical';
      position = { x: parent.x + parent.width, y: child.y };
      length = child.height;
      direction = -1;
      break;
  }

  return {
    type,
    position,
    length,
    width: jointWidth,
    direction,
    maxAngle: maxFoldAngle,
  };
}
