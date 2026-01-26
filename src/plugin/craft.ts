/**
 * 🎨 Craft Operations - 工艺标记操作
 */

import type { CraftTypeZh } from './constants';
import {
  getCraftData,
  setCraftData,
  getGrayValue,
  setGrayValue,
  clearCraftData,
  findNodesByColor,
  getNodeColor,
  isPointInBounds,
  type MarkedNodeInfo,
  hasChildren,
} from './utils';
import { createCraftIndicator, removeCraftIndicator } from './indicator';
import { setInCache, removeFromCache, hasRemainingCrafts } from './cache';
import {
  sendSuccess,
  sendError,
  sendMarkedLayersFromCache,
  sendCraftLayerSelected,
  sendNormalPreviewData,
  sendClearPreviewData,
} from './messages';
import { FACE_NAMES } from './constants';

// ========== 标记状态 ==========

/** 标记操作进行中标志 */
let isMarkingInProgress = false;

/** 获取标记状态 */
export function getMarkingStatus(): boolean {
  return isMarkingInProgress;
}

/** 设置标记状态 */
export function setMarkingStatus(status: boolean): void {
  isMarkingInProgress = status;
}

// ========== 基础标记操作 ==========

/** 标记选中的图层为指定工艺 */
export async function markCraft(craftType: CraftTypeZh): Promise<void> {
  const selection = figma.currentPage.selection;

  if (selection.length === 0) {
    sendError('请先选择要标记的图层');
    return;
  }

  for (const node of selection) {
    // 允许多工艺叠加：追加 craftType
    const crafts = getCraftData(node);
    if (!crafts.includes(craftType)) {
      crafts.push(craftType);
    }
    setCraftData(node, crafts);

    // 更新缓存（避免 UI 显示滞后）
    setInCache(node.id, {
      id: node.id,
      name: node.name,
      type: node.type,
      craftType,
      crafts,
      grayValue: getGrayValue(node),
    });

    // 创建可视化边框
    createCraftIndicator(node, craftType);
  }

  sendSuccess(`已标记 ${selection.length} 个图层为「${craftType}」`);
  sendMarkedLayersFromCache({ skipRefresh: true });
}

/** 标记工艺并设置灰度值 */
export async function markCraftWithGray(craftType: CraftTypeZh, grayValue: number): Promise<void> {
  const selection = figma.currentPage.selection;

  if (selection.length === 0) {
    sendError('请先选择要标记的图层');
    return;
  }

  // 设置标志，防止选择变化事件触发
  isMarkingInProgress = true;

  // grayValue 范围 0-255，存储为 0-1
  const grayNormalized = Math.max(0, Math.min(255, grayValue)) / 255;

  // 收集当前选中节点的工艺信息
  const currentSelectionCrafts: MarkedNodeInfo[] = [];

  for (const node of selection) {
    // 允许多工艺叠加：追加 craftType
    const crafts = getCraftData(node);
    if (!crafts.includes(craftType)) {
      crafts.push(craftType);
    }
    setCraftData(node, crafts);
    setGrayValue(node, grayNormalized);


    // 更新缓存
    const nodeData: MarkedNodeInfo = {
      id: node.id,
      name: node.name,
      type: node.type,
      craftType,
      crafts,
      grayValue: grayNormalized,
    };
    setInCache(node.id, nodeData);
    currentSelectionCrafts.push(nodeData);

    // 创建边框
    createCraftIndicator(node, craftType);
  }

  sendSuccess(`已标记 ${selection.length} 个图层为「${craftType}」，灰度值: ${grayValue}`);

  // 发送当前选中节点的工艺信息
  sendCraftLayerSelected(currentSelectionCrafts);

  // 发送所有已标记节点的工艺数据
  sendMarkedLayersFromCache();

  // 延迟重置标志
  setTimeout(() => {
    isMarkingInProgress = false;
  }, 200);

  // 自动生成预览数据
  try {
    const firstNode = selection[0];
    await sendNormalPreviewData(firstNode, craftType);
  } catch (e) {
    console.warn('⚠️ Failed to auto-generate preview:', e);
  }
}

/** 通过 ID 标记工艺并设置灰度值 */
export async function markCraftWithGrayById(
  nodeId: string,
  craftType: CraftTypeZh,
  grayValue: number
): Promise<void> {
  const node = figma.getNodeById(nodeId) as SceneNode | null;

  if (!node) {
    sendError('图层不存在或已被删除');
    return;
  }

  const grayNormalized = Math.max(0, Math.min(255, grayValue)) / 255;

  // 获取现有工艺，追加新工艺
  const crafts = getCraftData(node);
  if (!crafts.includes(craftType)) {
    crafts.push(craftType);
  }
  setCraftData(node, crafts);
  setGrayValue(node, grayNormalized);

  try {
    createCraftIndicator(node, craftType);
  } catch (_e) {
    // 忽略指示器错误
  }

  sendSuccess(`已标记 1 个图层为「${craftType}」`);
  await sendMarkedLayersFromCache();

  // 自动生成预览数据
  try {
    await sendNormalPreviewData(node, craftType);
  } catch (e) {
    console.warn('⚠️ Failed to auto-generate preview:', e);
  }
}

// ========== 清除标记操作 ==========

/** 清除选中图层的工艺标记 */
export async function clearMarks(): Promise<void> {
  const selection = figma.currentPage.selection;

  if (selection.length === 0) {
    sendError('请先选择要清除标记的图层');
    return;
  }

  for (const node of selection) {
    clearCraftData(node);
    removeCraftIndicator(node);
    removeFromCache(node.id);
  }

  sendSuccess(`已清除 ${selection.length} 个图层的工艺标记`);
  await sendMarkedLayersFromCache();

  // 检查是否还有工艺图层
  const hasRemaining = hasRemainingCrafts();

  if (!hasRemaining) {
    sendClearPreviewData();
  }
}

/** 通过 ID 删除单个工艺标记 */
export function removeMarkById(nodeId: string): void {
  isMarkingInProgress = true;
  const node = figma.getNodeById(nodeId) as SceneNode | null;

  if (!node) {
    sendError('节点不存在');
    isMarkingInProgress = false;
    return;
  }

  try {
    clearCraftData(node);
    removeCraftIndicator(node);
    removeFromCache(node.id);

    sendSuccess(`已删除「${node.name}」的工艺标记`);

    // ✅ 发送增量删除消息，而不是全量数据
    figma.ui.postMessage({
      type: 'MARKED_LAYER_REMOVED',
      layerId: nodeId
    });
  } finally {
    setTimeout(() => {
      isMarkingInProgress = false;
    }, 120);
  }
}

/** 删除单个工艺（保留其他工艺） */
export function removeSingleCraft(nodeId: string, craftType: CraftTypeZh): void {
  isMarkingInProgress = true;
  const node = figma.getNodeById(nodeId) as SceneNode | null;

  if (!node) {
    sendError('节点不存在');
    isMarkingInProgress = false;
    return;
  }


  let crafts = getCraftData(node);

  // 移除指定工艺
  crafts = crafts.filter((c) => c !== craftType);

  if (crafts.length === 0) {
    // 没有剩余工艺，完全删除标记
    clearCraftData(node);
    removeCraftIndicator(node);
    removeFromCache(node.id);
  } else {
    // 更新工艺列表
    setCraftData(node, crafts);
    // 重新创建第一个工艺的指示器
    removeCraftIndicator(node);
    createCraftIndicator(node, crafts[0]);

    // 更新缓存
    setInCache(node.id, {
      id: node.id,
      name: node.name,
      type: node.type,
      craftType: crafts[0],
      crafts,
      grayValue: getGrayValue(node),
    });
  }

  try {
    sendSuccess(`已从「${node.name}」移除「${craftType}」工艺`);
    sendMarkedLayersFromCache({ skipRefresh: true });
  } finally {
    setTimeout(() => {
      isMarkingInProgress = false;
    }, 120);
  }
}

// ========== 批量操作 ==========

/** 设置节点灰度值 */
export function setNodeGrayValue(nodeId: string, grayValue: number): void {
  const node = figma.getNodeById(nodeId) as SceneNode | null;

  if (!node) {
    sendError('节点不存在');
    return;
  }

  const grayNormalized = Math.max(0, Math.min(255, grayValue)) / 255;
  setGrayValue(node, grayNormalized);

  // 更新缓存
  const crafts = getCraftData(node);
  if (crafts.length > 0) {
    setInCache(node.id, {
      id: node.id,
      name: node.name,
      type: node.type,
      craftType: crafts[0],
      crafts,
      grayValue: grayNormalized,
    });
  }

  sendMarkedLayersFromCache();
}

/** 设置整组工艺的灰度值 */
export function setGroupGrayValue(craftType: CraftTypeZh, grayValue: number): void {
  const grayNormalized = Math.max(0, Math.min(255, grayValue)) / 255;

  function updateNode(node: BaseNode): void {
    if ('getPluginData' in node) {
      const sceneNode = node as SceneNode;
      const crafts = getCraftData(sceneNode);

      if (crafts.includes(craftType)) {
        setGrayValue(sceneNode, grayNormalized);

        // 更新缓存
        setInCache(sceneNode.id, {
          id: sceneNode.id,
          name: sceneNode.name,
          type: sceneNode.type,
          craftType: crafts[0],
          crafts,
          grayValue: grayNormalized,
        });
      }
    }

    if (hasChildren(node)) {
      for (const child of node.children) {
        updateNode(child);
      }
    }
  }

  updateNode(figma.currentPage);
  sendMarkedLayersFromCache();
}

/** 删除整组工艺标记 */
export function removeGroupMarks(craftType: CraftTypeZh): void {
  function removeFromNode(node: BaseNode): void {
    if ('getPluginData' in node) {
      const sceneNode = node as SceneNode;
      let crafts = getCraftData(sceneNode);

      if (crafts.includes(craftType)) {
        crafts = crafts.filter((c) => c !== craftType);

        if (crafts.length === 0) {
          clearCraftData(sceneNode);
          removeCraftIndicator(sceneNode);
          removeFromCache(sceneNode.id);
        } else {
          setCraftData(sceneNode, crafts);
          removeCraftIndicator(sceneNode, craftType);
          for (const remaining of crafts) {
            createCraftIndicator(sceneNode, remaining);
          }

          setInCache(sceneNode.id, {
            id: sceneNode.id,
            name: sceneNode.name,
            type: sceneNode.type,
            craftType: crafts[crafts.length - 1],
            crafts,
            grayValue: getGrayValue(sceneNode),
          });
        }
      }
    }

    if (hasChildren(node)) {
      for (const child of node.children) {
        removeFromNode(child);
      }
    }
  }

  removeFromNode(figma.currentPage);
  sendSuccess(`已删除所有「${craftType}」工艺标记`);
  sendMarkedLayersFromCache();
}

// ========== 颜色选择操作 ==========

/** 按颜色选择图层 */
export function selectByColor(inClipMask: boolean): void {
  const selection = figma.currentPage.selection;

  if (selection.length === 0) {
    sendError('请先选择一个有颜色的图层');
    return;
  }

  const targetNode = selection[0];
  const targetColor = getNodeColor(targetNode);

  if (!targetColor) {
    sendError('选中的图层没有颜色');
    return;
  }


  let stampBounds: { x: number; y: number; width: number; height: number } | null = null;

  if (inClipMask) {
    stampBounds = findContainingFace(targetNode);
    if (!stampBounds) {
      sendError('未找到包含选中节点的面片 Vector');
      return;
    }
  }

  const matchedNodes = findNodesByColor(figma.currentPage, [targetColor], 2, stampBounds);

  if (matchedNodes.length > 0) {
    figma.currentPage.selection = matchedNodes;
    sendSuccess(`已选中 ${matchedNodes.length} 个相同颜色的图层`);
  } else {
    sendError('未找到相同颜色的图层');
  }
}

/** 选中并标记相同颜色的图层 */
export function selectAndMarkByColor(
  craftType: CraftTypeZh,
  grayValue: number,
  inClipMask: boolean
): void {
  const selection = figma.currentPage.selection;

  if (selection.length === 0) {
    sendError('请先选择一个有颜色的图层');
    return;
  }

  const targetNode = selection[0];
  const targetColor = getNodeColor(targetNode);

  if (!targetColor) {
    sendError('选中的图层没有颜色');
    return;
  }


  let stampBounds: { x: number; y: number; width: number; height: number } | null = null;

  if (inClipMask) {
    stampBounds = findContainingFace(targetNode);
    if (!stampBounds) {
      sendError('未找到包含选中节点的面片 Vector');
      return;
    }
  }

  const matchedNodes = findNodesByColor(figma.currentPage, [targetColor], 2, stampBounds);

  if (matchedNodes.length === 0) {
    sendError('未找到相同颜色的图层');
    return;
  }

  // 选中这些节点
  figma.currentPage.selection = matchedNodes;

  // 标记所有匹配节点
  const grayNormalized = Math.max(0, Math.min(255, grayValue)) / 255;

  for (const node of matchedNodes) {
    const crafts = getCraftData(node);
    if (!crafts.includes(craftType)) {
      crafts.push(craftType);
    }
    setCraftData(node, crafts);
    setGrayValue(node, grayNormalized);
  }

  // 只给选中的节点添加可视化标记
  createCraftIndicator(targetNode, craftType);

  sendSuccess(`已标记 ${matchedNodes.length} 个图层为「${craftType}」`);
  sendMarkedLayersFromCache();
}

// ========== 辅助函数 ==========

/** 查找包含节点的面片 */
function findContainingFace(
  node: SceneNode
): { x: number; y: number; width: number; height: number } | null {
  if (!('absoluteBoundingBox' in node) || !node.absoluteBoundingBox) {
    return null;
  }

  const targetBounds = node.absoluteBoundingBox;
  const targetCenterX = targetBounds.x + targetBounds.width / 2;
  const targetCenterY = targetBounds.y + targetBounds.height / 2;

  // 收集所有 Vector 节点
  const allVectors: VectorNode[] = [];

  function findVectors(n: BaseNode): void {
    if (n.type === 'VECTOR' && 'absoluteBoundingBox' in n && n.absoluteBoundingBox) {
      allVectors.push(n as VectorNode);
    }
    if (hasChildren(n)) {
      for (const child of n.children) {
        findVectors(child);
      }
    }
  }

  findVectors(figma.currentPage);

  // 找到包含中心点的面片
  let bestVector: VectorNode | null = null;
  let bestArea = Infinity;

  for (const vector of allVectors) {
    if (vector.id === node.id) continue;

    const bounds = vector.absoluteBoundingBox;
    if (!bounds) continue;

    if (isPointInBounds(targetCenterX, targetCenterY, bounds)) {
      const isFaceName =
        FACE_NAMES.includes(vector.name as typeof FACE_NAMES[number]) ||
        FACE_NAMES.includes(vector.name.toUpperCase() as typeof FACE_NAMES[number]);

      if (isFaceName) {
        return bounds;
      }

      const area = bounds.width * bounds.height;
      if (area > bestArea) {
        bestArea = area;
        bestVector = vector;
      }
    }
  }

  return bestVector && bestVector.absoluteBoundingBox ? bestVector.absoluteBoundingBox : null;
}

/** 选中指定 ID 的节点 */
export function selectNodeById(nodeId: string): void {
  const node = figma.getNodeById(nodeId) as SceneNode | null;

  if (!node) {
    sendError('节点不存在');
    return;
  }

  figma.currentPage.selection = [node];
  figma.viewport.scrollAndZoomIntoView([node]);
}
