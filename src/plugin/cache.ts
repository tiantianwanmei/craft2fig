/**
 * 📦 Marked Nodes Cache - 已标记节点缓存管理
 * ⚡ 懒加载架构 - 避免启动时全量遍历
 */

import type { CraftTypeZh } from './constants';
import { CRAFT_INDICATOR_PREFIX, CRAFT_GROUP_PREFIX } from './constants';
import {
  hasChildren,
  getCraftData,
  getGrayValue,
  getCraftParams,
  type MarkedNodeInfo,
} from './utils';

// ========== 缓存实例 ==========

/** 已标记节点缓存 Map: nodeId -> MarkedNodeInfo */
const markedNodesCache = new Map<string, MarkedNodeInfo>();

/** 缓存是否已初始化（懒加载标记） */
let cacheInitialized = false;

// ========== 缓存操作 ==========

/** 获取缓存 */
export function getCache(): Map<string, MarkedNodeInfo> {
  return markedNodesCache;
}

/** 清空缓存 */
export function clearCache(): void {
  markedNodesCache.clear();
  cacheInitialized = false; // 重置初始化标记
}

/** 获取缓存大小 */
export function getCacheSize(): number {
  return markedNodesCache.size;
}

/** 从缓存获取节点信息 */
export function getFromCache(nodeId: string): MarkedNodeInfo | undefined {
  return markedNodesCache.get(nodeId);
}

/** 添加或更新缓存 */
export function setInCache(nodeId: string, info: MarkedNodeInfo): void {
  markedNodesCache.set(nodeId, info);
  cacheInitialized = true; // 有数据就算初始化了
}

/** 从缓存删除 */
export function removeFromCache(nodeId: string): boolean {
  return markedNodesCache.delete(nodeId);
}

/** 获取所有缓存的节点信息 */
export function getAllCachedNodes(): MarkedNodeInfo[] {
  console.log('🔍 [Plugin] getAllCachedNodes called, cache size:', markedNodesCache.size);

  // 如果缓存为空，先尝试初始化
  if (markedNodesCache.size === 0) {
    console.log('⚠️ [Plugin] Cache is empty, calling ensureCacheInitialized...');
    ensureCacheInitialized();
    console.log('✅ [Plugin] After ensureCacheInitialized, cache size:', markedNodesCache.size);
  }

  const result = Array.from(markedNodesCache.values());
  console.log('📋 [Plugin] Returning', result.length, 'layers');

  // 打印前3个图层的详细信息
  if (result.length > 0) {
    console.log('📄 [Plugin] First 3 layers:', result.slice(0, 3).map(l => ({
      id: l.id,
      name: l.name,
      craftType: l.craftType
    })));
  } else {
    console.warn('⚠️ [Plugin] No layers found in cache!');
  }

  return result;
}

/** 按工艺类型获取缓存的节点 */
export function getCachedNodesByCraft(craftType: CraftTypeZh): MarkedNodeInfo[] {
  return getAllCachedNodes().filter((info) => info.crafts.includes(craftType));
}

// ========== 懒加载缓存初始化 ==========

/**
 * ⚡ 懒加载初始化缓存 - 仅在需要时初始化
 * 🔧 修复：递归查找所有工艺组（包括 Frame 内部的）
 */
export function ensureCacheInitialized(): void {
  console.log('🔧 [Plugin] ensureCacheInitialized called, cacheInitialized:', cacheInitialized);

  if (cacheInitialized) {
    console.log('✅ [Plugin] Cache already initialized, returning');
    return; // 已初始化，直接返回
  }

  console.log('🔍 [Plugin] Starting cache initialization...');

  const page = figma.currentPage;
  console.log('📄 [Plugin] Current page:', page.name);

  let craftGroupCount = 0;
  let linkedNodeCount = 0;

  // 🔧 修复：递归查找所有工艺组，包括 Frame 内部的
  function findCraftGroups(node: BaseNode): void {
    // 跳过临时导出容器
    if (node.name === '__temp_export__' || node.name === '__temp_export_wrapper__') {
      return;
    }

    // 如果是工艺组，处理其子节点
    if (node.name && node.name.startsWith(CRAFT_GROUP_PREFIX) && hasChildren(node)) {
      craftGroupCount++;
      console.log('🎨 [Plugin] Found craft group:', node.name);

      for (const indicator of node.children) {
        if ('getPluginData' in indicator) {
          const linkedNodeId = indicator.getPluginData('linkedNodeId');
          if (linkedNodeId) {
            linkedNodeCount++;
            const linkedNode = figma.getNodeById(linkedNodeId);
            if (linkedNode && 'getPluginData' in linkedNode) {
              refreshNodeCache(linkedNode as SceneNode);
            }
          }
        }
      }
      return; // 工艺组内部不需要继续递归
    }

    // 递归处理子节点
    if (hasChildren(node)) {
      for (const child of node.children) {
        findCraftGroups(child);
      }
    }
  }

  // 从页面开始递归查找
  findCraftGroups(page);

  // 🔧 补充：如果没找到工艺组，直接扫描有 craftTypes 的节点
  if (markedNodesCache.size === 0) {
    console.log('⚠️ [Plugin] No craft groups found, scanning for craftTypes...');

    function scanForCraftTypes(node: BaseNode): void {
      if (node.name && (node.name.startsWith(CRAFT_GROUP_PREFIX) || node.name.startsWith(CRAFT_INDICATOR_PREFIX))) {
        return;
      }

      if ('getPluginData' in node) {
        const crafts = getCraftData(node as SceneNode);
        if (crafts.length > 0) {
          refreshNodeCache(node as SceneNode);
        }
      }

      if (hasChildren(node)) {
        for (const child of node.children) {
          scanForCraftTypes(child);
        }
      }
    }

    scanForCraftTypes(page);
  }

  console.log('✅ [Plugin] Cache initialization complete');
  console.log('📊 [Plugin] Stats: craft groups:', craftGroupCount, 'linked nodes:', linkedNodeCount, 'cache size:', markedNodesCache.size);

  cacheInitialized = true;
}

/**
 * ⚡ 强制全量初始化缓存（仅在必要时调用，如清除后重建）
 * 避免在启动时调用
 */
export function initializeCache(): void {
  markedNodesCache.clear();

  function collectMarkedNodes(node: BaseNode): void {
    // 跳过工艺组和工艺边框
    if ((node.name && node.name.startsWith(CRAFT_GROUP_PREFIX)) || (node.name && node.name.startsWith(CRAFT_INDICATOR_PREFIX))) {
      return;
    }

    // 跳过临时导出容器
    if (node.parent && node.parent.name === '__temp_export__') {
      return;
    }

    // 检查节点是否有工艺数据
    if ('getPluginData' in node) {
      const sceneNode = node as SceneNode;
      const crafts = getCraftData(sceneNode);

      if (crafts.length > 0) {
        const info: MarkedNodeInfo = {
          id: sceneNode.id,
          name: sceneNode.name,
          type: sceneNode.type,
          craftType: crafts[crafts.length - 1],
          crafts,
          grayValue: getGrayValue(sceneNode),
          craftParams: getCraftParams(sceneNode) || undefined,
        };
        markedNodesCache.set(sceneNode.id, info);
      }
    }

    // 递归处理子节点
    if (hasChildren(node)) {
      for (const child of node.children) {
        collectMarkedNodes(child);
      }
    }
  }

  // 遍历当前页面初始化缓存
  collectMarkedNodes(figma.currentPage);
  cacheInitialized = true;
}

/** 刷新单个节点的缓存 */
export function refreshNodeCache(node: SceneNode): void {
  const crafts = getCraftData(node);

  if (crafts.length > 0) {
    const info: MarkedNodeInfo = {
      id: node.id,
      name: node.name,
      type: node.type,
      craftType: crafts[crafts.length - 1],
      crafts,
      grayValue: getGrayValue(node),
      craftParams: getCraftParams(node) || undefined,
    };
    markedNodesCache.set(node.id, info);
  } else {
    markedNodesCache.delete(node.id);
  }
}

/** 检查是否还有工艺图层（优先使用缓存） */
export function hasRemainingCrafts(): boolean {
  // ⚡ 优先检查缓存
  if (markedNodesCache.size > 0) {
    return true;
  }

  // ⚡ 优化：先检查是否有工艺组（快速判断）
  const page = figma.currentPage;
  for (const child of page.children) {
    if (child.name && child.name.startsWith(CRAFT_GROUP_PREFIX)) {
      return true; // 有工艺组就说明有工艺图层
    }
  }

  return false; // 没有工艺组 = 没有工艺图层
}
