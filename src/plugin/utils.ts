/**
 * 🔧 Plugin Utilities - 类型安全的工具函数
 */

import type { CraftTypeZh } from './constants';
import {
  CRAFT_DATA_KEY,
  GRAY_VALUE_KEY,
  CRAFT_PARAMS_KEY,
  CRAFT_INDICATOR_PREFIX,
  CRAFT_GROUP_PREFIX,
} from './constants';

// ========== 类型守卫 ==========

/** 检查是否为 Frame 类型节点 */
export function isFrameNode(node: BaseNode): node is FrameNode | GroupNode | ComponentNode | InstanceNode {
  return (
    node.type === 'FRAME' ||
    node.type === 'GROUP' ||
    node.type === 'COMPONENT' ||
    node.type === 'INSTANCE'
  );
}

/** 检查是否为 Vector 类型节点 */
export function isVectorLike(node: BaseNode): node is VectorNode | BooleanOperationNode | StarNode | LineNode | EllipseNode | PolygonNode | RectangleNode {
  return (
    node.type === 'VECTOR' ||
    node.type === 'BOOLEAN_OPERATION' ||
    node.type === 'STAR' ||
    node.type === 'LINE' ||
    node.type === 'ELLIPSE' ||
    node.type === 'POLYGON' ||
    node.type === 'RECTANGLE'
  );
}

/** 检查是否可作为 Clipmask */
export function isClipmaskCandidate(node: BaseNode): boolean {
  return isVectorLike(node) || isFrameNode(node);
}

/** 检查节点是否有 fills 属性 */
export function hasFills(node: BaseNode): node is SceneNode & { fills: readonly Paint[] | typeof figma.mixed } {
  return 'fills' in node;
}

/** 检查节点是否有 children 属性 */
export function hasChildren(node: BaseNode): node is BaseNode & ChildrenMixin {
  return 'children' in node;
}

/** 检查节点是否可导出 */
export function isExportable(node: BaseNode): node is SceneNode & ExportMixin {
  return 'exportAsync' in node;
}

/** 检查节点是否有图片填充 */
export function hasImageFill(node: BaseNode): boolean {
  if (!hasFills(node)) return false;
  const fills = node.fills;
  if (fills === figma.mixed || !Array.isArray(fills)) return false;
  return fills.some((fill) => fill.type === 'IMAGE' && fill.visible !== false);
}

// ========== 节点查找 ==========

/** 查找父 Frame */
export function findParentFrame(node: BaseNode): FrameNode | ComponentNode | InstanceNode | null {
  let current = node.parent;
  while (current) {
    if (isFrameNode(current) && current.type !== 'GROUP') {
      return current as FrameNode | ComponentNode | InstanceNode;
    }
    current = current.parent;
  }
  return null;
}

/** 检查节点是否为工艺基础设施 */
export function isCraftInfrastructure(node: BaseNode): boolean {
  if (!node.name) return false;
  return (
    node.name.startsWith(CRAFT_GROUP_PREFIX) ||
    node.name.startsWith(CRAFT_INDICATOR_PREFIX)
  );
}

/** 检查节点是否在临时导出容器中 */
export function isInTempExportContainer(node: BaseNode): boolean {
  return node.parent !== null && node.parent.name === '__temp_export__';
}

// ========== 颜色工具 ==========

/** RGB 颜色 (0-255) */
export interface RGB255 {
  r: number;
  g: number;
  b: number;
}

/** 获取节点的填充颜色 (RGB 0-255) */
export function getNodeColor(node: BaseNode): RGB255 | null {
  if (!hasFills(node)) return null;
  const fills = node.fills;
  if (fills === figma.mixed || !Array.isArray(fills)) return null;

  for (const fill of fills) {
    if (fill.type === 'SOLID' && fill.visible !== false) {
      return {
        r: Math.round(fill.color.r * 255),
        g: Math.round(fill.color.g * 255),
        b: Math.round(fill.color.b * 255),
      };
    }
  }
  return null;
}

/** 检查颜色是否匹配（带容差） */
export function colorMatches(a: RGB255, b: RGB255, tolerance: number = 0): boolean {
  return (
    Math.abs(a.r - b.r) <= tolerance &&
    Math.abs(a.g - b.g) <= tolerance &&
    Math.abs(a.b - b.b) <= tolerance
  );
}

// ========== 边界工具 ==========

/** 检查点是否在边界内 */
export function isPointInBounds(
  x: number,
  y: number,
  bounds: { x: number; y: number; width: number; height: number }
): boolean {
  return (
    x >= bounds.x &&
    x <= bounds.x + bounds.width &&
    y >= bounds.y &&
    y <= bounds.y + bounds.height
  );
}

/** 检查节点边界是否在盖印边界内（基于中心点） */
export function isInsideBounds(
  nodeBounds: { x: number; y: number; width: number; height: number },
  stampBounds: { x: number; y: number; width: number; height: number } | null
): boolean {
  if (!stampBounds) return true;
  const nodeCenterX = nodeBounds.x + nodeBounds.width / 2;
  const nodeCenterY = nodeBounds.y + nodeBounds.height / 2;
  return isPointInBounds(nodeCenterX, nodeCenterY, stampBounds);
}

// ========== 工艺数据工具 ==========

/** 已标记节点信息 */
export interface MarkedNodeInfo {
  id: string;
  name: string;
  type: string;
  craftType: CraftTypeZh;
  crafts: CraftTypeZh[];
  grayValue: number;
  craftParams?: Record<string, unknown>;
}

/** 从节点获取工艺数据 */
export function getCraftData(node: SceneNode): CraftTypeZh[] {
  try {
    const data = node.getPluginData(CRAFT_DATA_KEY);
    if (data) {
      return JSON.parse(data) as CraftTypeZh[];
    }
  } catch (_e) {
    // 解析失败，返回空数组
  }
  return [];
}

/** 设置节点的工艺数据 */
export function setCraftData(node: SceneNode, crafts: CraftTypeZh[]): void {
  node.setPluginData(CRAFT_DATA_KEY, JSON.stringify(crafts));
}

/** 从节点获取灰度值 */
export function getGrayValue(node: SceneNode): number {
  const grayStr = node.getPluginData(GRAY_VALUE_KEY);
  return grayStr ? parseFloat(grayStr) : 1;
}

/** 设置节点的灰度值 */
export function setGrayValue(node: SceneNode, value: number): void {
  node.setPluginData(GRAY_VALUE_KEY, String(value));
}

/** 清除节点的工艺数据 */
export function clearCraftData(node: SceneNode): void {
  node.setPluginData(CRAFT_DATA_KEY, '');
  node.setPluginData(GRAY_VALUE_KEY, '');
  node.setPluginData(CRAFT_PARAMS_KEY, '');
}

/** 从节点获取工艺参数（JSON） */
export function getCraftParams(node: SceneNode): Record<string, unknown> | null {
  try {
    const raw = node.getPluginData(CRAFT_PARAMS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (_e) {
    return null;
  }
}

/** 设置节点的工艺参数（JSON） */
export function setCraftParams(node: SceneNode, params: Record<string, unknown>): void {
  node.setPluginData(CRAFT_PARAMS_KEY, JSON.stringify(params));
}

/** 从节点构建已标记节点信息 */
export function buildMarkedNodeInfo(node: SceneNode): MarkedNodeInfo | null {
  const crafts = getCraftData(node);
  if (crafts.length === 0) return null;

  return {
    id: node.id,
    name: node.name,
    type: node.type,
    craftType: crafts[0],
    crafts,
    grayValue: getGrayValue(node),
  };
}

// ========== 节点遍历 ==========

/** 遍历节点及其子节点 */
export function traverseNodes(
  node: BaseNode,
  callback: (node: BaseNode) => boolean | void
): void {
  if (callback(node) === false) return;
  if (hasChildren(node)) {
    for (const child of node.children) {
      traverseNodes(child, callback);
    }
  }
}

/** 收集满足条件的节点 */
export function collectNodes<T extends BaseNode>(
  root: BaseNode,
  predicate: (node: BaseNode) => node is T
): T[] {
  const result: T[] = [];
  traverseNodes(root, (node) => {
    if (predicate(node)) {
      result.push(node);
    }
  });
  return result;
}

/** 按颜色查找节点（带容差） */
export function findNodesByColor(
  root: BaseNode,
  targetColors: RGB255[],
  tolerance: number = 0,
  stampBounds: { x: number; y: number; width: number; height: number } | null = null
): SceneNode[] {
  const result: SceneNode[] = [];

  traverseNodes(root, (node) => {
    if (!hasFills(node)) return;

    const color = getNodeColor(node);
    if (!color) return;

    for (const target of targetColors) {
      if (colorMatches(color, target, tolerance)) {
        const sceneNode = node as SceneNode;
        const bounds = 'absoluteBoundingBox' in sceneNode ? sceneNode.absoluteBoundingBox : null;

        if (bounds && isInsideBounds(bounds, stampBounds)) {
          result.push(sceneNode);
        }
        break;
      }
    }
  });

  return result;
}
