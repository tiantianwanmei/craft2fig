/**
 * 📤 Message Sender - 向 UI 发送消息
 */

import { isFrameNode, hasImageFill, isExportable, findParentFrame } from './utils';
import { getAllCachedNodes, refreshNodeCache, getCache } from './cache';
import { SELECTED_VECTORS_KEY, CRAFT_DATA_KEY, type CraftTypeZh } from './constants';
import { batchExtractVectorData } from './extractionUtils';

// ========== Clipmask 盖印导出 ==========

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
export async function exportClipmaskRasterize(
  clipVector: SceneNode,
  sourceFrame: FrameNode | ComponentNode | InstanceNode,
  allClipVectorIds: Set<string>
): Promise<string | undefined> {
  const bounds = clipVector.absoluteBoundingBox;
  if (!bounds) return undefined;
  const clipBounds = bounds;

  try {
    // 创建临时 Frame 用于盖印
    const tempFrame = figma.createFrame();
    tempFrame.name = `__temp_clipmask_${clipVector.id}`;
    tempFrame.x = clipBounds.x;
    tempFrame.y = clipBounds.y;
    tempFrame.resize(clipBounds.width, clipBounds.height);
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
        nodeBounds.x + nodeBounds.width < clipBounds.x ||
        nodeBounds.x > clipBounds.x + clipBounds.width ||
        nodeBounds.y + nodeBounds.height < clipBounds.y ||
        nodeBounds.y > clipBounds.y + clipBounds.height
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
          clone.x = layerBounds.x - clipBounds.x;
          clone.y = layerBounds.y - clipBounds.y;
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
export async function exportCraftTexture(
  clipVector: SceneNode,
  sourceFrame: FrameNode | ComponentNode | InstanceNode,
  craftType: CraftTypeZh
): Promise<string | undefined> {
  const bounds = clipVector.absoluteBoundingBox;
  if (!bounds) return undefined;
  const clipBounds = bounds;

  const frameBounds = sourceFrame.absoluteBoundingBox;
  if (!frameBounds) return undefined;

  const isInSourceFrameSubtree = (node: SceneNode): boolean => {
    if (node.id === sourceFrame.id) return true;
    const p = findParentFrame(node);
    return !!p && p.id === sourceFrame.id;
  };

  const hasImageFillLocal = (node: SceneNode): boolean => {
    try {
      if (!('fills' in node)) return false;
      const fills = (node as any).fills;
      if (!Array.isArray(fills)) return false;
      return fills.some((f: any) => f && f.type === 'IMAGE' && f.visible !== false);
    } catch (_e) {
      return false;
    }
  };

  // gray2fig strategy: for IMAGE fills (often with alpha), don't override fills directly.
  // Instead, use the image node as an alpha mask over a solid rect.
  const createImageAlphaMaskGroup = (node: SceneNode, fillColor: RGB): boolean => {
    const parent = node.parent;
    if (!parent || !('insertChild' in parent) || !('children' in parent)) return false;
    try {
      const parentChildren = (parent as any).children as readonly SceneNode[];
      const idx = parentChildren.indexOf(node);

      const w = (node as any).width;
      const h = (node as any).height;
      if (typeof w !== 'number' || typeof h !== 'number') return false;

      const maskFrame = figma.createFrame();
      maskFrame.name = 'Mask group';
      maskFrame.fills = [];
      (maskFrame as any).strokes = [];
      (maskFrame as any).effects = [];
      maskFrame.clipsContent = false;

      // Preserve transform as much as possible (like gray2fig)
      try {
        (maskFrame as any).relativeTransform = (node as any).relativeTransform;
      } catch (_e) {
        // ignore
      }
      try {
        (maskFrame as any).rotation = (node as any).rotation;
      } catch (_e) {
        // ignore
      }

      maskFrame.resizeWithoutConstraints(w, h);

      // Insert at the same z-index
      (parent as any).insertChild(Math.max(0, idx), maskFrame);

      // Clone original as mask layer
      const maskNode = node.clone();
      maskNode.name = `${node.name} 1`;
      (maskNode as any).x = 0;
      (maskNode as any).y = 0;
      (maskNode as any).isMask = true;
      maskFrame.appendChild(maskNode);
      maskFrame.insertChild(0, maskNode);

      // Solid rect (white/black)
      const solid = figma.createRectangle();
      solid.name = `${node.name} 2`;
      solid.resize(w, h);
      (solid as any).fills = [{ type: 'SOLID', color: fillColor, opacity: 1 }];
      (solid as any).strokes = [];
      (solid as any).effects = [];
      (solid as any).x = 0;
      (solid as any).y = 0;
      maskFrame.appendChild(solid);

      // Remove original node (we replaced it)
      node.remove();
      return true;
    } catch (e) {
      console.warn('Failed to create image alpha mask group:', node.name, e);
      return false;
    }
  };

  const forceMaskWhite = (node: SceneNode): void => {
    // Special-case image fills with transparency: preserve alpha via mask group
    if (hasImageFillLocal(node)) {
      const ok = createImageAlphaMaskGroup(node, { r: 1, g: 1, b: 1 });
      if (ok) return;
    }
    try {
      if ('fills' in node) {
        (node as any).fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
      }
    } catch (_e) {
      // ignore
    }
    try {
      if ('strokes' in node) {
        (node as any).strokes = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
      }
    } catch (_e) {
      // ignore
    }
    try {
      if ('effects' in node) {
        (node as any).effects = [];
      }
    } catch (_e) {
      // ignore
    }
    try {
      if ('opacity' in node) {
        (node as any).opacity = 1;
      }
    } catch (_e) {
      // ignore
    }

    if ('children' in node) {
      for (const child of node.children) {
        forceMaskWhite(child as SceneNode);
      }
    }
  };

  const forceMaskBlack = (node: SceneNode): void => {
    if (hasImageFillLocal(node)) {
      const ok = createImageAlphaMaskGroup(node, { r: 0, g: 0, b: 0 });
      if (ok) return;
    }
    try {
      if ('fills' in node) {
        (node as any).fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, opacity: 1 }];
      }
    } catch (_e) {
      // ignore
    }
    try {
      if ('strokes' in node) {
        (node as any).strokes = [];
      }
    } catch (_e) {
      // ignore
    }
    try {
      if ('effects' in node) {
        (node as any).effects = [];
      }
    } catch (_e) {
      // ignore
    }
    try {
      if ('opacity' in node) {
        (node as any).opacity = 1;
      }
    } catch (_e) {
      // ignore
    }

    if ('children' in node) {
      for (const child of node.children) {
        forceMaskBlack(child as SceneNode);
      }
    }
  };

  const collectRenderableLeaves = (node: SceneNode, out: SceneNode[]): void => {
    if (!node.visible) return;
    const b = node.absoluteBoundingBox;
    if (b) {
      const overlaps = !(
        b.x + b.width < clipBounds.x ||
        b.x > clipBounds.x + clipBounds.width ||
        b.y + b.height < clipBounds.y ||
        b.y > clipBounds.y + clipBounds.height
      );
      if (!overlaps) return;
    }

    // If it's a container, traverse children to find renderable leaves.
    if ('children' in node && node.children.length > 0) {
      for (const child of node.children) {
        collectRenderableLeaves(child as SceneNode, out);
      }
      return;
    }

    // Leaf node: keep only if it has drawable properties or export capability.
    if ('exportAsync' in node) {
      out.push(node);
    }
  };

  const overlaps = (
    a: { x: number; y: number; width: number; height: number },
    b: { x: number; y: number; width: number; height: number }
  ): boolean => {
    return !(
      a.x + a.width <= b.x ||
      a.x >= b.x + b.width ||
      a.y + a.height <= b.y ||
      a.y >= b.y + b.height
    );
  };

  try {
    const tempFrame = figma.createFrame();
    tempFrame.name = `__temp_craft_${craftType}_${clipVector.id}`;
    tempFrame.x = frameBounds.x;
    tempFrame.y = frameBounds.y;
    tempFrame.resize(frameBounds.width, frameBounds.height);
    tempFrame.clipsContent = false;
    tempFrame.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }]; // 黑色背景

    // 收集该工艺类型的可渲染叶子图层：以缓存(=标注系统)为权威来源
    const craftLayers: SceneNode[] = [];
    const craftLayerIds = new Set<string>();
    const marked = getAllCachedNodes();
    for (const info of marked) {
      try {
        if (!info.crafts.includes(craftType)) continue;
        const node = figma.getNodeById(info.id);
        if (!node || !('visible' in node) || (node as SceneNode).removed) continue;
        const scene = node as SceneNode;
        if (!isInSourceFrameSubtree(scene)) continue;
        const before = craftLayers.length;
        collectRenderableLeaves(scene, craftLayers);
        for (let i = before; i < craftLayers.length; i++) {
          craftLayerIds.add(craftLayers[i]!.id);
        }
      } catch (_e) {
        // ignore
      }
    }

    console.log(`🎨 Craft ${craftType} for ${clipVector.name}: found ${craftLayers.length} layers`);

    if (craftLayers.length === 0) {
      tempFrame.remove();
      return undefined;
    }

    // ==== 视觉遮挡剔除（Blender 混合贴图需求）====
    // 严格按 Figma stacking 规则：
    // 对每个 craftLeaf，从它所在 parent 开始，收集“同父级中位于它之后的兄弟节点(=更上层)”的所有叶子；
    // 然后向上递归到祖先，继续收集祖先的后续兄弟子树。这样才能正确处理 Group/Frame 的层级遮挡。
    const occluderSet = new Set<string>();

    const collectLeavesInSubtree = (
      n: SceneNode,
      targetBounds: { x: number; y: number; width: number; height: number },
      out: Set<string>
    ): void => {
      if (!n.visible) return;
      if (craftLayerIds.has(n.id)) return;
      const b = n.absoluteBoundingBox;
      if (b && !overlaps(b, targetBounds)) return;

      if ('children' in n && n.children.length > 0) {
        for (const c of n.children) {
          collectLeavesInSubtree(c as SceneNode, targetBounds, out);
        }
        return;
      }
      if ('exportAsync' in n) {
        out.add(n.id);
      }
    };

    const collectOccludersAbove = (leaf: SceneNode): void => {
      const leafBounds = leaf.absoluteBoundingBox;
      if (!leafBounds) return;
      let current: BaseNode | null = leaf;
      while (current && current.id !== sourceFrame.id) {
        const p: BaseNode | null = current.parent;
        if (!p || !('children' in p)) break;
        const siblings = (p.children as readonly SceneNode[]);
        const idx = siblings.indexOf(current as any);
        if (idx >= 0) {
          for (let i = idx + 1; i < siblings.length; i++) {
            const sib = siblings[i] as SceneNode;
            // 只考虑在 sourceFrame 子树内的节点
            if (sib && 'visible' in sib && isInSourceFrameSubtree(sib)) {
              collectLeavesInSubtree(sib, leafBounds, occluderSet);
            }
          }
        }
        current = p;
      }
    };

    for (const craftLeaf of craftLayers) {
      collectOccludersAbove(craftLeaf);
    }

    const occluders: SceneNode[] = [];
    for (const id of occluderSet) {
      const n = figma.getNodeById(id);
      if (n && 'visible' in n && !(n as SceneNode).removed) {
        occluders.push(n as SceneNode);
      }
    }

    console.log(`🧱 Craft ${craftType} for ${clipVector.name}: occluders=${occluders.length}`);

    // 1) 先绘制白色 craft
    for (const layer of craftLayers) {
      try {
        const clone = layer.clone();
        tempFrame.appendChild(clone);
        const layerBounds = layer.absoluteBoundingBox;
        if (layerBounds && 'x' in clone && 'y' in clone) {
          clone.x = layerBounds.x - frameBounds.x;
          clone.y = layerBounds.y - frameBounds.y;
        }

        forceMaskWhite(clone as SceneNode);
      } catch (e) {
        console.warn('Failed to clone craft layer:', layer.name, e);
      }
    }

    // 2) 再绘制黑色 occluders（扣掉被遮挡区域）
    for (const layer of occluders) {
      try {
        const clone = layer.clone();
        tempFrame.appendChild(clone);
        const layerBounds = layer.absoluteBoundingBox;
        if (layerBounds && 'x' in clone && 'y' in clone) {
          clone.x = layerBounds.x - frameBounds.x;
          clone.y = layerBounds.y - frameBounds.y;
        }
        forceMaskBlack(clone as SceneNode);
      } catch (e) {
        console.warn('Failed to clone occluder layer:', layer.name, e);
      }
    }

    // 添加遮罩
    const maskClone = clipVector.clone();
    tempFrame.insertChild(0, maskClone);
    if ('x' in maskClone && 'y' in maskClone) {
      maskClone.x = clipBounds.x - frameBounds.x;
      maskClone.y = clipBounds.y - frameBounds.y;
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
  figma.ui.postMessage({
    type: 'ERROR',
    payload: { message },
  });
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
export async function sendSavedVectors(options?: { includeFrameImage?: boolean }): Promise<void> {
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

  // 刀版图面片命名模式
  const PANEL_NAME_PATTERN = /^(\d+(-\d+[TB]?)?|[A-Z]+\d*)$/i;

  // 收集所有 clipmask vector 的 IDs
  const allClipVectorIds = new Set<string>();

  console.log('🔍 sendSavedVectors - savedIds:', savedIds.length);

  if (savedIds.length > 0) {
    savedIds.forEach(id => allClipVectorIds.add(id));
  } else if ('children' in sourceFrame) {
    for (const child of sourceFrame.children) {
      if (child.type === 'VECTOR' && PANEL_NAME_PATTERN.test(child.name.trim())) {
        allClipVectorIds.add(child.id);
      }
    }
  }

  const includeFrameImage = options && options.includeFrameImage === true;

  // ========== 新方案：可选导出整个 Frame（重操作，默认关闭） ==========
  const frameBounds = sourceFrame.absoluteBoundingBox;
  if (!frameBounds) {
    figma.ui.postMessage({ type: 'savedVectors', vectors: [], frameId: null });
    return;
  }

  let frameImageBase64: string | undefined;
  if (includeFrameImage) {
    // 收集需要临时处理的图层
    // 只处理工艺标注图层 - 隐藏它们的 fills 和 strokes
    // 注意：clipmask vectors 不需要隐藏，它们只是裁剪边界，不影响导出内容
    const layersFillsToHide: Array<{
      node: SceneNode;
      originalFills: readonly Paint[] | typeof figma.mixed;
      originalStrokes: readonly Paint[];
    }> = [];

    function collectLayersToProcess(node: SceneNode) {
      if (!node.visible) return;

      // 跳过 clipmask vector - 它们不需要处理
      if (allClipVectorIds.has(node.id)) {
        return;
      }

      // 工艺标注图层 - 只隐藏 fills 和 strokes
      if (hasCraftMarking(node)) {
        if ('fills' in node && 'strokes' in node) {
          layersFillsToHide.push({
            node,
            originalFills: (node as any).fills,
            originalStrokes: (node as any).strokes,
          });
        }
        // 不 return，继续递归处理子节点
      }

      // 递归处理子节点
      if ('children' in node) {
        for (const child of node.children) {
          collectLayersToProcess(child);
        }
      }
    }

    // 收集需要处理的图层
    if ('children' in sourceFrame) {
      for (const child of sourceFrame.children) {
        collectLayersToProcess(child);
      }
    }

    console.log(`🎨 临时清空 ${layersFillsToHide.length} 个工艺图层的 fills/strokes`);

    // 临时清空工艺标注图层的 fills 和 strokes
    for (const item of layersFillsToHide) {
      const node = item.node as GeometryMixin & SceneNode;
      try {
        if ((node as any).removed) continue;
        node.fills = [];
        node.strokes = [];
      } catch (_e) {
        // ignore
      }
    }

    // 导出整个 Frame 为 PNG（只导出一次）
    console.log('📸 Exporting entire frame as PNG...');
    try {
      const frameBytes = await sourceFrame.exportAsync({
        format: 'PNG',
        constraint: { type: 'SCALE', value: 1 },
      });
      frameImageBase64 = `data:image/png;base64,${figma.base64Encode(frameBytes)}`;
      console.log('✅ Frame exported successfully');
    } catch (e) {
      console.warn('❌ Failed to export frame:', e);
    }

    // 恢复工艺图层的 fills 和 strokes
    for (const item of layersFillsToHide) {
      const node = item.node as GeometryMixin & SceneNode;
      try {
        if ((node as any).removed) continue;
        if (item.originalFills !== figma.mixed) {
          node.fills = item.originalFills as Paint[];
        }
        node.strokes = item.originalStrokes as Paint[];
      } catch (_e) {
        // ignore
      }
    }

    console.log(`👁️ 已恢复 ${layersFillsToHide.length} 个工艺图层样式`);
  }

  // 收集每个 clipmask vector 的边界信息（相对于 Frame）
  const vectors: Array<{
    id: string;
    name: string;
    x: number;
    y: number;
    width: number;
    height: number;
    // 相对于 Frame 的裁剪区域（用于 UI 端裁剪）
    cropX: number;
    cropY: number;
    cropWidth: number;
    cropHeight: number;
    // 🆕 参数化系统字段
    svgPath?: string | null;
    rasterCache?: string | null;
    originalBounds?: { x: number; y: number; width: number; height: number } | null;
  }> = [];

  // 🆕 批量提取 SVG 路径和光栅缓存
  const vectorNodes: SceneNode[] = [];
  for (const vectorId of allClipVectorIds) {
    const node = figma.getNodeById(vectorId);
    if (node && 'absoluteBoundingBox' in node) {
      vectorNodes.push(node as SceneNode);
    }
  }

  console.log(`🎨 Extracting SVG paths and raster cache for ${vectorNodes.length} vectors...`);
  const extractedData = await batchExtractVectorData(vectorNodes);

  for (const vectorId of allClipVectorIds) {
    const node = figma.getNodeById(vectorId);
    if (!node || !('absoluteBoundingBox' in node)) continue;

    const vectorNode = node as VectorNode;
    const bounds = vectorNode.absoluteBoundingBox;
    if (!bounds) continue;

    // 计算相对于 Frame 的裁剪区域
    const cropX = bounds.x - frameBounds.x;
    const cropY = bounds.y - frameBounds.y;

    // 获取提取的数据
    const extracted = extractedData.get(vectorId);

    vectors.push({
      id: vectorNode.id,
      name: vectorNode.name,
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      cropX,
      cropY,
      cropWidth: bounds.width,
      cropHeight: bounds.height,
      // 🆕 添加提取的数据
      svgPath: extracted?.svgPath ?? null,
      rasterCache: extracted?.rasterCache ?? null,
      originalBounds: extracted?.originalBounds ?? null,
    });

    console.log(`📐 Vector ${vectorNode.name}: crop(${cropX}, ${cropY}, ${bounds.width}, ${bounds.height}), SVG: ${extracted?.svgPath ? 'YES' : 'NO'}`);
  }

  console.log(`📦 Total vectors: ${vectors.length}, Frame size: ${frameBounds.width}x${frameBounds.height}`);

  // 发送 savedVectors 消息给 UI
  figma.ui.postMessage(
    includeFrameImage
      ? {
        type: 'savedVectors',
        vectors,
        frameId: sourceFrame.id,
        frameImage: frameImageBase64,
        frameWidth: frameBounds.width,
        frameHeight: frameBounds.height,
      }
      : {
        type: 'savedVectors',
        vectors,
        frameId: sourceFrame.id,
      }
  );
}

// ========== 已标记图层 ==========

/** 从缓存发送已标记图层 */
export function sendMarkedLayersFromCache(options?: { skipRefresh?: boolean }): void {

  // 先刷新缓存中所有节点的状态
  const cache = getCache();
  const idsToRemove: string[] = [];

  const skipRefresh = options && options.skipRefresh === true;

  if (skipRefresh) {
    for (const [id] of cache) {
      const node = figma.getNodeById(id);
      if (!node) idsToRemove.push(id);
    }

    for (const id of idsToRemove) {
      cache.delete(id);
    }

    const allNodes = getAllCachedNodes();
    figma.ui.postMessage({
      type: 'markedLayers',
      layers: allNodes,
    });
    figma.ui.postMessage({
      type: 'MARKED_LAYERS_RESULT',
      payload: { layers: allNodes },
    });
    return;
  }

  const ids = Array.from(cache.keys());
  let i = 0;

  const step = (): void => {
    const start = Date.now();

    while (i < ids.length) {
      const id = ids[i]!;
      i++;

      const node = figma.getNodeById(id);
      if (!node) {
        idsToRemove.push(id);
      } else {
        refreshNodeCache(node as SceneNode);
      }

      if (Date.now() - start >= 10) break;
    }

    if (i < ids.length) {
      setTimeout(step, 0);
      return;
    }

    for (const id of idsToRemove) {
      cache.delete(id);
    }

    const allNodes = getAllCachedNodes();
    figma.ui.postMessage({
      type: 'markedLayers',
      layers: allNodes,
    });
    figma.ui.postMessage({
      type: 'MARKED_LAYERS_RESULT',
      payload: { layers: allNodes },
    });
  };

  step();
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
  paddingRatio: number = 0.15,
  options?: { maxSide?: number; maxScale?: number }
): Promise<{ bytes: Uint8Array; width: number; height: number }> {
  if (!isExportable(node)) {
    throw new Error('Node is not exportable');
  }

  const bbox = (node as any).absoluteBoundingBox as { x: number; y: number; width: number; height: number } | null;
  const absTransform = (node as any).absoluteTransform as [[number, number, number], [number, number, number]] | null;

  if (!bbox) {
    throw new Error('Node has no bounding box');
  }

  // IMPORTANT: use bbox dimensions, not node.width/height.
  // node.width/height can differ from absoluteBoundingBox under transforms,
  // causing wrapper sizes to mismatch and resulting occlusion alignment errors.
  const padding = Math.max(bbox.width, bbox.height) * paddingRatio;
  const maxScale = typeof options?.maxScale === 'number' ? options.maxScale : 2;

  // 创建临时 Frame，位置在节点的绝对位置减去 padding
  const tempFrame = figma.createFrame();
  tempFrame.name = '__temp_export_wrapper__';
  tempFrame.x = bbox.x - padding;
  tempFrame.y = bbox.y - padding;
  tempFrame.resize(bbox.width + padding * 2, bbox.height + padding * 2);
  tempFrame.clipsContent = false;
  tempFrame.fills = [];

  const maxSide = typeof options?.maxSide === 'number' ? options.maxSide : undefined;
  const baseSide = Math.max(tempFrame.width, tempFrame.height);
  const cappedScale = maxSide ? Math.min(maxScale, maxSide / Math.max(1, baseSide)) : maxScale;
  const exportScale = Math.max(0.05, cappedScale);

  try {
    // 克隆节点并放入 Frame
    const clone = node.clone();
    tempFrame.appendChild(clone);

    // Position clone using absoluteTransform translation when available.
    // Using bbox.x/y can misalign rotated/transformed nodes.
    const tx = absTransform?.[0]?.[2];
    const ty = absTransform?.[1]?.[2];
    if (typeof tx === 'number' && typeof ty === 'number') {
      clone.x = tx - tempFrame.x;
      clone.y = ty - tempFrame.y;
    } else {
      clone.x = bbox.x - tempFrame.x;
      clone.y = bbox.y - tempFrame.y;
    }

    // 导出 Frame
    const bytes = await tempFrame.exportAsync({
      format: 'PNG',
      constraint: { type: 'SCALE', value: exportScale },
    });

    return {
      bytes,
      // Return pixel size (after export scale) so metadata matches decoded PNG.
      width: Math.round(tempFrame.width * exportScale),
      height: Math.round(tempFrame.height * exportScale),
    };
  } finally {
    tempFrame.remove();
  }
}

/** 发送工艺预览数据 */
export async function sendNormalPreviewData(node: SceneNode, craftType?: CraftTypeZh): Promise<void> {
  if (!isExportable(node)) return;

  try {
    const result = await exportNodeWithPadding(node, 0.15, { maxSide: 2048, maxScale: 2 });
    const isImageNode = hasImageFill(node);

    figma.ui.postMessage({
      type: 'normalPreviewData',
      imageData: result.bytes,
      width: result.width,
      height: result.height,
      isPNG: true,
      isImageNode,
      craftType,
      layerId: node.id,
      nodeName: node.name,
    });
  } catch (e) {
    console.warn('⚠️ Failed to send normal preview data:', e);
  }
}

/** 发送清除预览数据消息 */
export function sendClearPreviewData(): void {
  figma.ui.postMessage({ type: 'clearPreviewData' });
}
