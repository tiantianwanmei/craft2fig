/**
 * 📤 Message Sender - 向 UI 发送消息
 */

import { isFrameNode, hasImageFill, isExportable, isClipmaskCandidate } from './utils';
import { getAllCachedNodes, refreshNodeCache, getCache } from './cache';
import { SELECTED_VECTORS_KEY, CRAFT_DATA_KEY, CRAFT_TYPES, type CraftTypeZh } from './constants';

// ========== Clipmask 盖印导出 ==========

/**
 * 获取节点的工艺类型列表
 */
function getCraftTypes(node: SceneNode): CraftTypeZh[] {
  try {
    const craftData = node.getPluginData(CRAFT_DATA_KEY);
    if (craftData) {
      const crafts = JSON.parse(craftData);
      if (Array.isArray(crafts)) {
        return crafts as CraftTypeZh[];
      }
    }
  } catch (_e) {
    // 解析失败
  }
  return [];
}

/**
 * 检查节点是否有工艺标注
 */
function hasCraftMarking(node: SceneNode): boolean {
  try {
    const craftData = node.getPluginData(CRAFT_DATA_KEY);
    if (craftData) {
      const crafts = JSON.parse(craftData);
      return Array.isArray(crafts) && crafts.length > 0;
    }
  } catch (_e) {
    // 解析失败
  }
  return false;
}

/**
 * 使用 clipmask vector 盖印其范围内的所有图层并导出为 PNG
 * @param clipVector - 作为遮罩的 vector 节点
 * @param sourceFrame - 源 Frame 节点
 * @param allClipVectorIds - 所有 clipmask vector 的 ID 集合（用于排除）
 * @returns base64 编码的 PNG 数据 URL，支持 alpha 透明
 */
async function exportClipmaskRasterize(
  clipVector: SceneNode,
  sourceFrame: FrameNode | ComponentNode | InstanceNode,
  allClipVectorIds: Set<string>
): Promise<string | undefined> {
  const bounds = clipVector.absoluteBoundingBox;
  if (!bounds) return undefined;

  try {
    // 创建临时 Frame 用于盖印
    const tempFrame = figma.createFrame();
    tempFrame.name = `__temp_clipmask_${clipVector.id}`;
    tempFrame.x = bounds.x;
    tempFrame.y = bounds.y;
    tempFrame.resize(bounds.width, bounds.height);
    tempFrame.clipsContent = true;
    tempFrame.fills = []; // 透明背景

    // 收集源 Frame 中与 clipVector 范围重叠的所有可见图层
    const layersToClone: SceneNode[] = [];

    function collectOverlappingLayers(node: SceneNode) {
      if (!node.visible) return;

      // 跳过 clipmask vector 本身（面板形状）
      if (allClipVectorIds.has(node.id)) {
        return;
      }

      const nodeBounds = node.absoluteBoundingBox;
      if (!nodeBounds) return;

      // 提前剪枝：如果节点完全不与 clipVector 重叠，跳过整个子树
      const overlaps = !(
        nodeBounds.x + nodeBounds.width < bounds.x ||
        nodeBounds.x > bounds.x + bounds.width ||
        nodeBounds.y + nodeBounds.height < bounds.y ||
        nodeBounds.y > bounds.y + bounds.height
      );

      if (!overlaps) return;

      // 跳过有工艺标注的图层
      if (hasCraftMarking(node)) {
        return;
      }

      // 如果是容器节点，递归处理子节点
      if ('children' in node && node.children.length > 0) {
        for (const child of node.children) {
          collectOverlappingLayers(child);
        }
      } else {
        // 叶子节点，直接添加
        layersToClone.push(node);
      }
    }

    // 从源 Frame 收集图层
    if ('children' in sourceFrame) {
      for (const child of sourceFrame.children) {
        collectOverlappingLayers(child);
      }
    }

    console.log(`📦 Clipmask ${clipVector.name}: found ${layersToClone.length} layers to clone`);

    // 如果没有找到任何图层，直接返回 undefined
    if (layersToClone.length === 0) {
      tempFrame.remove();
      return undefined;
    }

    // 克隆图层到临时 Frame
    for (const layer of layersToClone) {
      try {
        const clone = layer.clone();
        tempFrame.appendChild(clone);
        // 调整位置到临时 Frame 的本地坐标
        const layerBounds = layer.absoluteBoundingBox;
        if (layerBounds && 'x' in clone && 'y' in clone) {
          clone.x = layerBounds.x - bounds.x;
          clone.y = layerBounds.y - bounds.y;
        }
      } catch (e) {
        console.warn('Failed to clone layer:', layer.name, e);
      }
    }

    // 克隆 clipVector 作为遮罩（放在最后，遮罩其上方的所有图层）
    const maskClone = clipVector.clone();
    // 将遮罩移到最底层（第一个位置）
    tempFrame.insertChild(0, maskClone);
    if ('x' in maskClone && 'y' in maskClone) {
      maskClone.x = 0;
      maskClone.y = 0;
    }
    // 设置为遮罩
    if ('isMask' in maskClone) {
      (maskClone as VectorNode).isMask = true;
    }

    // 导出临时 Frame 为 PNG（支持 alpha）
    const bytes = await tempFrame.exportAsync({
      format: 'PNG',
      constraint: { type: 'SCALE', value: 1 },
    });

    // 清理临时 Frame
    tempFrame.remove();

    return `data:image/png;base64,${figma.base64Encode(bytes)}`;
  } catch (e) {
    console.warn('Failed to export clipmask rasterize:', clipVector.id, e);
    return undefined;
  }
}

/**
 * 导出特定工艺类型的贴图（用于 PBR 材质驱动）
 * @param clipVector - 作为遮罩的 vector 节点
 * @param sourceFrame - 源 Frame 节点
 * @param craftType - 工艺类型
 * @returns base64 编码的 PNG 数据 URL
 */
async function exportCraftTexture(
  clipVector: SceneNode,
  sourceFrame: FrameNode | ComponentNode | InstanceNode,
  craftType: CraftTypeZh
): Promise<string | undefined> {
  const bounds = clipVector.absoluteBoundingBox;
  if (!bounds) return undefined;

  try {
    const tempFrame = figma.createFrame();
    tempFrame.name = `__temp_craft_${craftType}_${clipVector.id}`;
    tempFrame.x = bounds.x;
    tempFrame.y = bounds.y;
    tempFrame.resize(bounds.width, bounds.height);
    tempFrame.clipsContent = true;
    tempFrame.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }]; // 黑色背景

    // 收集该工艺类型的图层
    const craftLayers: SceneNode[] = [];

    function collectCraftLayers(node: SceneNode) {
      if (!node.visible) return;

      const nodeCrafts = getCraftTypes(node);
      if (nodeCrafts.includes(craftType)) {
        const nodeBounds = node.absoluteBoundingBox;
        if (!nodeBounds) return;

        // 检查是否与 clipVector 范围重叠
        const overlaps = !(
          nodeBounds.x + nodeBounds.width < bounds.x ||
          nodeBounds.x > bounds.x + bounds.width ||
          nodeBounds.y + nodeBounds.height < bounds.y ||
          nodeBounds.y > bounds.y + bounds.height
        );

        if (overlaps) {
          craftLayers.push(node);
        }
      }

      // 递归处理子节点
      if ('children' in node) {
        for (const child of node.children) {
          collectCraftLayers(child);
        }
      }
    }

    if ('children' in sourceFrame) {
      for (const child of sourceFrame.children) {
        collectCraftLayers(child);
      }
    }

    console.log(`🎨 Craft ${craftType} for ${clipVector.name}: found ${craftLayers.length} layers`);

    if (craftLayers.length === 0) {
      tempFrame.remove();
      return undefined;
    }

    // 克隆工艺图层
    for (const layer of craftLayers) {
      try {
        const clone = layer.clone();
        tempFrame.appendChild(clone);
        const layerBounds = layer.absoluteBoundingBox;
        if (layerBounds && 'x' in clone && 'y' in clone) {
          clone.x = layerBounds.x - bounds.x;
          clone.y = layerBounds.y - bounds.y;
        }
      } catch (e) {
        console.warn('Failed to clone craft layer:', layer.name, e);
      }
    }

    // 添加遮罩
    const maskClone = clipVector.clone();
    tempFrame.insertChild(0, maskClone);
    if ('x' in maskClone && 'y' in maskClone) {
      maskClone.x = 0;
      maskClone.y = 0;
    }
    if ('isMask' in maskClone) {
      (maskClone as VectorNode).isMask = true;
    }

    const bytes = await tempFrame.exportAsync({
      format: 'PNG',
      constraint: { type: 'SCALE', value: 1 },
    });

    tempFrame.remove();
    return `data:image/png;base64,${figma.base64Encode(bytes)}`;
  } catch (e) {
    console.warn('Failed to export craft texture:', craftType, clipVector.id, e);
    return undefined;
  }
}

// ========== 通用消息发送 ==========

/** 发送成功消息 */
export function sendSuccess(message: string): void {
  figma.ui.postMessage({ type: 'success', data: message });
}

/** 发送错误消息 */
export function sendError(message: string): void {
  figma.ui.postMessage({ type: 'error', data: message });
}

/** 发送通知 */
export function sendNotify(message: string, timeout: number = 2000): void {
  figma.notify(message, { timeout });
}

// ========== 选择和预览 ==========

/** 发送 Frame 预览数据 */
export async function sendFramePreview(): Promise<void> {

  const selection = figma.currentPage.selection;
  if (selection.length === 0) {
    figma.ui.postMessage({ type: 'framePreview', data: null });
    return;
  }

  // 找到选中的 Frame
  let frame: FrameNode | ComponentNode | InstanceNode | null = null;
  let current: BaseNode | null = selection[0];

  while (current) {
    if (isFrameNode(current) && current.type !== 'GROUP') {
      frame = current as FrameNode | ComponentNode | InstanceNode;
      break;
    }
    current = current.parent;
  }

  if (!frame) {
    figma.ui.postMessage({ type: 'framePreview', data: null });
    return;
  }

  // 导出 Frame 预览图
  const imageBytes = await frame.exportAsync({
    format: 'PNG',
    constraint: { type: 'WIDTH', value: 800 },
  });

  figma.ui.postMessage({
    type: 'framePreview',
    data: {
      id: frame.id,
      name: frame.name,
      width: frame.width,
      height: frame.height,
      imageBytes, // ✅ 直接传输 Uint8Array，postMessage 原生支持
    },
  });
}

/** 发送已保存的 Vectors */
export async function sendSavedVectors(): Promise<void> {
  const selection = figma.currentPage.selection;
  if (selection.length === 0) {
    figma.ui.postMessage({ type: 'savedVectors', vectors: [], frameId: null });
    return;
  }

  // 找到源 Frame
  let sourceFrame: FrameNode | ComponentNode | InstanceNode | null = null;
  let current: BaseNode | null = selection[0];

  while (current) {
    if (isFrameNode(current) && current.type !== 'GROUP') {
      sourceFrame = current as FrameNode | ComponentNode | InstanceNode;
      break;
    }
    current = current.parent;
  }

  if (!sourceFrame) {
    figma.ui.postMessage({ type: 'savedVectors', vectors: [], frameId: null });
    return;
  }

  // 获取已保存的 Vector IDs
  let savedIds: string[] = [];
  try {
    const savedJson = sourceFrame.getPluginData(SELECTED_VECTORS_KEY);
    if (savedJson) {
      savedIds = JSON.parse(savedJson);
    }
  } catch (_e) {
    // 解析失败
  }

  // 刀版图面片命名模式：
  // - 纯数字: 1, 2, 3
  // - 数字-数字T/B: 1-1T, 1-2B, 2-1T
  // - 字母: L, R, F, H, HT, HB 等
  const PANEL_NAME_PATTERN = /^(\d+(-\d+[TB]?)?|[A-Z]+\d*)$/i;

  // 先收集所有 clipmask vector 的 IDs（用于排除）
  const allClipVectorIds = new Set<string>();

  console.log('🔍 sendSavedVectors - savedIds:', savedIds.length);
  console.log('🔍 sendSavedVectors - sourceFrame children:', 'children' in sourceFrame ? sourceFrame.children.length : 0);

  if (savedIds.length > 0) {
    // 使用保存的 IDs
    savedIds.forEach(id => allClipVectorIds.add(id));
    console.log('🔍 Using saved IDs:', savedIds);
  } else if ('children' in sourceFrame) {
    // 自动检测：收集所有符合命名模式的 Vector
    for (const child of sourceFrame.children) {
      const isPanelName = PANEL_NAME_PATTERN.test(child.name.trim());
      const isVectorType = child.type === 'VECTOR';
      console.log(`  Child: ${child.name} (${child.type}) - isPanelName: ${isPanelName}, isVector: ${isVectorType}`);
      if (isVectorType && isPanelName) {
        allClipVectorIds.add(child.id);
      }
    }
    console.log('🔍 Auto-detected clipmask IDs:', Array.from(allClipVectorIds).length);
  }

  // 获取所有 Vector 的详细信息
  const vectors: Array<{
    id: string;
    name: string;
    x: number;
    y: number;
    width: number;
    height: number;
    svgPreview?: string;
    pngPreview?: string;
    // 工艺贴图（用于 PBR 材质驱动）
    craftTextures?: {
      uv?: string;        // UV 贴图 → 驱动光泽度/粗糙度
      normal?: string;    // 法线贴图 → 驱动凹凸
      hotfoil?: string;   // 烫金贴图 → 驱动金属材质
      silver?: string;    // 烫银贴图 → 驱动银材质
      emboss?: string;    // 凹凸贴图 → 驱动置换
    };
  }> = [];

  // 如果有保存的 IDs，使用它们
  if (savedIds.length > 0) {
    for (const id of savedIds) {
      const node = figma.getNodeById(id);
      if (!node || !('absoluteBoundingBox' in node)) continue;

      const bounds = (node as SceneNode).absoluteBoundingBox;
      if (!bounds) continue;

      // 使用 clipmask 盖印导出基础 PNG
      const pngPreview = await exportClipmaskRasterize(
        node as SceneNode,
        sourceFrame,
        allClipVectorIds
      );

      // 导出工艺贴图
      const craftTextures: typeof vectors[0]['craftTextures'] = {};

      // UV 贴图
      const uvTexture = await exportCraftTexture(node as SceneNode, sourceFrame, 'UV');
      if (uvTexture) craftTextures.uv = uvTexture;

      // 法线贴图
      const normalTexture = await exportCraftTexture(node as SceneNode, sourceFrame, '法线');
      if (normalTexture) craftTextures.normal = normalTexture;

      // 烫金贴图
      const hotfoilTexture = await exportCraftTexture(node as SceneNode, sourceFrame, '烫金');
      if (hotfoilTexture) craftTextures.hotfoil = hotfoilTexture;

      // 烫银贴图
      const silverTexture = await exportCraftTexture(node as SceneNode, sourceFrame, '烫银');
      if (silverTexture) craftTextures.silver = silverTexture;

      // 凹凸贴图
      const embossTexture = await exportCraftTexture(node as SceneNode, sourceFrame, '凹凸');
      if (embossTexture) craftTextures.emboss = embossTexture;

      vectors.push({
        id: node.id,
        name: node.name,
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        pngPreview,
        craftTextures: Object.keys(craftTextures).length > 0 ? craftTextures : undefined,
      });
    }
  } else {
    // 没有保存的 IDs，自动检测
    if ('children' in sourceFrame) {
      for (const child of sourceFrame.children) {
        const isPanelName = PANEL_NAME_PATTERN.test(child.name.trim());
        const isVectorType = child.type === 'VECTOR';

        if (isVectorType && isPanelName && 'absoluteBoundingBox' in child) {
          const bounds = child.absoluteBoundingBox;
          if (!bounds) continue;

          // 使用 clipmask 盖印导出基础 PNG
          const pngPreview = await exportClipmaskRasterize(
            child,
            sourceFrame,
            allClipVectorIds
          );

          // 导出工艺贴图
          const craftTextures: typeof vectors[0]['craftTextures'] = {};

          const uvTex = await exportCraftTexture(child, sourceFrame, 'UV');
          if (uvTex) craftTextures.uv = uvTex;

          const normalTex = await exportCraftTexture(child, sourceFrame, '法线');
          if (normalTex) craftTextures.normal = normalTex;

          const hotfoilTex = await exportCraftTexture(child, sourceFrame, '烫金');
          if (hotfoilTex) craftTextures.hotfoil = hotfoilTex;

          const silverTex = await exportCraftTexture(child, sourceFrame, '烫银');
          if (silverTex) craftTextures.silver = silverTex;

          const embossTex = await exportCraftTexture(child, sourceFrame, '凹凸');
          if (embossTex) craftTextures.emboss = embossTex;

          vectors.push({
            id: child.id,
            name: child.name,
            x: bounds.x,
            y: bounds.y,
            width: bounds.width,
            height: bounds.height,
            pngPreview,
            craftTextures: Object.keys(craftTextures).length > 0 ? craftTextures : undefined,
          });
        }
      }
    }
  }

  // 发送 savedVectors 消息给 UI（用于刀版图预览）
  figma.ui.postMessage({
    type: 'savedVectors',
    vectors,
    frameId: sourceFrame.id,
  });
}

// ========== 已标记图层 ==========

/** 从缓存发送已标记图层 */
export function sendMarkedLayersFromCache(options?: { skipRefresh?: boolean }): void {

  // 先刷新缓存中所有节点的状态
  const cache = getCache();
  const idsToRemove: string[] = [];

  const skipRefresh = options && options.skipRefresh === true;

  for (const [id] of cache) {
    const node = figma.getNodeById(id);
    if (!node) {
      idsToRemove.push(id);
      continue;
    }

    if (!skipRefresh) {
      // 刷新节点缓存
      refreshNodeCache(node as SceneNode);
    }
  }

  // 删除不存在的节点
  for (const id of idsToRemove) {
    cache.delete(id);
  }

  // 发送缓存的节点
  const allNodes = getAllCachedNodes();


  figma.ui.postMessage({
    type: 'markedLayers',
    layers: allNodes,
  });
}

/** 发送当前选中节点的工艺信息 */
export function sendCraftLayerSelected(layers: Array<{
  id: string;
  name: string;
  type: string;
  craftType: string;
  crafts: string[];
  grayValue: number;
}>): void {
  figma.ui.postMessage({
    type: 'craftLayerSelected',
    layers,
  });
}

// ========== 预览数据 ==========

/** 导出节点并添加内边距 */
export async function exportNodeWithPadding(
  node: SceneNode,
  paddingRatio: number = 0.15
): Promise<{ bytes: Uint8Array; width: number; height: number }> {
  if (!isExportable(node)) {
    throw new Error('Node is not exportable');
  }

  const padding = Math.max(node.width, node.height) * paddingRatio;
  const bbox = (node as any).absoluteBoundingBox;

  if (!bbox) {
    throw new Error('Node has no bounding box');
  }

  // 🎯 核心修复：使用绝对坐标定位（参考 figma-plugin-modern）
  // 原因：Vector 节点可能是 Group 的子节点，坐标系统是相对的

  // 创建临时 Frame，位置在节点的绝对位置减去 padding
  const tempFrame = figma.createFrame();
  tempFrame.name = '__temp_export_wrapper__';
  tempFrame.x = bbox.x - padding;
  tempFrame.y = bbox.y - padding;
  tempFrame.resize(node.width + padding * 2, node.height + padding * 2);
  tempFrame.clipsContent = false;
  tempFrame.fills = [];

  try {
    // 克隆节点并放入 Frame
    const clone = node.clone();
    tempFrame.appendChild(clone);

    // 使用绝对坐标定位（相对于 tempFrame 的原点）
    clone.x = bbox.x - tempFrame.x;
    clone.y = bbox.y - tempFrame.y;

    // 导出 Frame（而不是直接导出 Vector）
    const bytes = await tempFrame.exportAsync({
      format: 'PNG',
      constraint: { type: 'SCALE', value: 2 },
    });

    return {
      bytes,
      width: tempFrame.width,
      height: tempFrame.height,
    };
  } finally {
    tempFrame.remove();
  }
}

/** 发送工艺预览数据 */
export async function sendNormalPreviewData(node: SceneNode, craftType?: CraftTypeZh): Promise<void> {
  if (!isExportable(node)) return;

  try {
    const result = await exportNodeWithPadding(node, 0.15);
    const isImageNode = hasImageFill(node);

    figma.ui.postMessage({
      type: 'normalPreviewData',
      imageData: result.bytes, // ✅ 直接传输 Uint8Array，避免 JSON 序列化开销
      width: result.width,
      height: result.height,
      isPNG: true,
      isImageNode,
      craftType, // 携带工艺类型信息
      layerId: node.id, // 携带图层 ID
      nodeName: node.name, // 携带节点名称（用于调试）
    });
  } catch (e) {
    console.warn('⚠️ Failed to send normal preview data:', e);
  }
}

/** 发送清除预览数据消息 */
export function sendClearPreviewData(): void {
  figma.ui.postMessage({ type: 'clearPreviewData' });
}
