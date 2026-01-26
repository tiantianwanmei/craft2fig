/**
 * 🎯 Craft Indicator - 工艺可视化指示器管理
 */

import type { CraftTypeZh } from './constants';
import {
  CRAFT_COLORS,
  CRAFT_INDICATOR_PREFIX,
  CRAFT_GROUP_PREFIX,
  INDICATOR_STYLE,
} from './constants';
import { findParentFrame, getCraftData, hasChildren } from './utils';
import { getCache } from './cache';

// ========== 指示器创建 ==========

/** 创建工艺可视化边框 */
export function createCraftIndicator(node: SceneNode, craftType: CraftTypeZh): void {
  // 先删除该工艺对应的旧边框（同一节点允许多工艺并存）
  removeCraftIndicator(node, craftType);

  if (!('absoluteBoundingBox' in node)) return;

  const bounds = node.absoluteBoundingBox;
  if (!bounds) return;

  // 获取该节点的所有工艺（用于日志）
  const crafts = getCraftData(node);
  if (crafts.length === 0) {
    crafts.push(craftType);
  }

  const indicatorName = `${CRAFT_INDICATOR_PREFIX}${craftType}_${node.id}`;

  // 找到父 Frame
  let parentFrame = findParentFrame(node);
  const container = parentFrame || figma.currentPage;

  // 创建边框矩形
  const rect = figma.createRectangle();
  rect.name = indicatorName;

  // 计算位置和尺寸
  const { padding, strokeWeight, dashPattern, cornerRadius, fillOpacity, strokeOpacity } = INDICATOR_STYLE;

  let rectX: number;
  let rectY: number;

  if (parentFrame && parentFrame.absoluteBoundingBox) {
    const parentBounds = parentFrame.absoluteBoundingBox;
    rectX = bounds.x - parentBounds.x - padding;
    rectY = bounds.y - parentBounds.y - padding;
  } else {
    rectX = bounds.x - padding;
    rectY = bounds.y - padding;
  }

  rect.x = rectX;
  rect.y = rectY;
  rect.resize(bounds.width + padding * 2, bounds.height + padding * 2);

  // 设置样式
  const color = CRAFT_COLORS[craftType] || { r: 0.5, g: 0.5, b: 0.5 };
  rect.fills = [{ type: 'SOLID', color, opacity: fillOpacity }];
  rect.strokes = [{ type: 'SOLID', color, opacity: strokeOpacity }];
  rect.strokeWeight = strokeWeight;
  rect.dashPattern = [...dashPattern];
  rect.cornerRadius = cornerRadius;
  rect.locked = true;

  // 分组管理
  const groupName = CRAFT_GROUP_PREFIX + craftType;

  // 在父容器中查找或创建工艺组
  let craftGroup: GroupNode | null = null;

  if (hasChildren(container)) {
    for (const child of container.children) {
      if (child.name === groupName && child.type === 'GROUP') {
        craftGroup = child as GroupNode;
        break;
      }
    }
  }

  if (parentFrame && hasChildren(parentFrame)) {
    // Frame 内：先 append 再 group/append
    parentFrame.appendChild(rect);
    if (craftGroup) {
      craftGroup.appendChild(rect);
      craftGroup.visible = true;
    } else {
      craftGroup = figma.group([rect], parentFrame);
      craftGroup.name = groupName;
      craftGroup.locked = true;
      craftGroup.visible = true;
    }
  } else {
    // Page：直接添加到页面
    figma.currentPage.appendChild(rect);
  }

  // 保存关联的节点 ID
  rect.setPluginData('linkedNodeId', node.id);
  rect.setPluginData('linkedCraftType', craftType);
}

// ========== 指示器删除 ==========

/** 删除工艺可视化边框 */
export function removeCraftIndicator(node: SceneNode, craftType?: CraftTypeZh): void {
  const indicatorName = craftType
    ? `${CRAFT_INDICATOR_PREFIX}${craftType}_${node.id}`
    : CRAFT_INDICATOR_PREFIX + node.id;

  const matchAllForNode = craftType === undefined;
  const nodeIdSuffix = `_${node.id}`;

  // 在所有可能的父容器中查找并删除
  const parentFrame = findParentFrame(node);
  const containers = [parentFrame || figma.currentPage, figma.currentPage];

  for (const container of containers) {
    if (!hasChildren(container)) continue;

    // 从后向前遍历，避免删除时索引问题
    for (let i = container.children.length - 1; i >= 0; i--) {
      const child = container.children[i];

      // 直接删除匹配的指示器
      const isExactMatch = child.name === indicatorName || child.name === indicatorName + '_inner';
      let isNodeMatch = false;
      if (matchAllForNode) {
        try {
          isNodeMatch = (typeof child.name === 'string' && child.name.startsWith(CRAFT_INDICATOR_PREFIX) && child.name.endsWith(nodeIdSuffix))
            || ('getPluginData' in child && (child as SceneNode).getPluginData('linkedNodeId') === node.id);
        } catch (_e) {
          isNodeMatch = false;
        }
      }

      if (isExactMatch || isNodeMatch) {
        child.remove();
        continue;
      }

      // 在所有工艺组内查找
      if (child.name && child.name.startsWith(CRAFT_GROUP_PREFIX) && child.type === 'GROUP') {
        try {
          const group = child as GroupNode;
          for (let j = group.children.length - 1; j >= 0; j--) {
            const groupChild = group.children[j];
            const isGroupExactMatch = groupChild.name === indicatorName || groupChild.name === indicatorName + '_inner';
            let isGroupNodeMatch = false;
            if (matchAllForNode) {
              try {
                isGroupNodeMatch = (typeof groupChild.name === 'string' && groupChild.name.startsWith(CRAFT_INDICATOR_PREFIX) && groupChild.name.endsWith(nodeIdSuffix))
                  || ('getPluginData' in groupChild && (groupChild as SceneNode).getPluginData('linkedNodeId') === node.id);
              } catch (_e) {
                isGroupNodeMatch = false;
              }
            }

            if (isGroupExactMatch || isGroupNodeMatch) {
              groupChild.remove();
            }
          }
          // 如果组为空，删除组
          if (group.children.length === 0) {
            group.remove();
          }
        } catch (_e) {
          // 组可能已被删除，忽略错误
        }
      }
    }
  }
}

/** 隐藏节点内所有工艺指示器（不删除，用于导出） */
export function hideAllCraftIndicators(node: BaseNode): void {
  if (!hasChildren(node)) return;

  for (const child of node.children) {
    if (child.name.startsWith(CRAFT_INDICATOR_PREFIX)) {
      (child as SceneNode).visible = false;
    } else if (child.name.startsWith(CRAFT_GROUP_PREFIX)) {
      (child as SceneNode).visible = false;
    } else if (hasChildren(child)) {
      hideAllCraftIndicators(child);
    }
  }
}

/** 显示节点内所有工艺指示器 */
export function showAllCraftIndicators(node: BaseNode): void {
  if (!hasChildren(node)) return;

  for (const child of node.children) {
    if (child.name.startsWith(CRAFT_INDICATOR_PREFIX)) {
      (child as SceneNode).visible = true;
    } else if (child.name.startsWith(CRAFT_GROUP_PREFIX)) {
      (child as SceneNode).visible = true;
    } else if (hasChildren(child)) {
      showAllCraftIndicators(child);
    }
  }
}

// ========== 批量操作 ==========

/** 重新生成所有工艺指示器 */
export function regenerateAllCraftIndicators(): void {
  const markedNodes: Array<{ node: SceneNode; craftTypes: CraftTypeZh[] }> = [];

  function collectMarkedNodes(node: BaseNode): void {
    // 跳过工艺基础设施
    if ((node.name && node.name.startsWith(CRAFT_GROUP_PREFIX)) || (node.name && node.name.startsWith(CRAFT_INDICATOR_PREFIX))) {
      return;
    }

    // 跳过临时导出容器
    if (node.parent && node.parent.name === '__temp_export__') {
      return;
    }

    if ('getPluginData' in node) {
      const crafts = getCraftData(node as SceneNode);
      if (crafts.length > 0) {
        markedNodes.push({
          node: node as SceneNode,
          craftTypes: crafts,
        });
      }
    }

    if (hasChildren(node)) {
      for (const child of node.children) {
        collectMarkedNodes(child);
      }
    }
  }

  collectMarkedNodes(figma.currentPage);

  // 重新创建所有指示器
  for (const { node, craftTypes } of markedNodes) {
    for (const craftType of craftTypes) {
      try {
        createCraftIndicator(node, craftType);
      } catch (_e) {
        // 忽略单个节点的错误
      }
    }
  }
}

export async function regenerateAllCraftIndicatorsChunked(
  options?: {
    timeBudgetMs?: number;
    yieldDelayMs?: number;
  }
): Promise<void> {
  const timeBudgetMs = options?.timeBudgetMs ?? 8;
  const yieldDelayMs = options?.yieldDelayMs ?? 0;

  const stack: BaseNode[] = [figma.currentPage];
  let sliceStart = Date.now();

  while (stack.length > 0) {
    const node = stack.pop();
    if (!node) continue;

    let nodeName: string | undefined;
    try {
      nodeName = node.name;
    } catch (_e) {
      continue;
    }

    // 跳过工艺基础设施
    if ((nodeName && nodeName.startsWith(CRAFT_GROUP_PREFIX)) || (nodeName && nodeName.startsWith(CRAFT_INDICATOR_PREFIX))) {
      continue;
    }

    // 跳过临时导出容器
    if (node.parent) {
      try {
        if (node.parent.name === '__temp_export__') {
          continue;
        }
      } catch (_e) {
        continue;
      }
    }

    if ('getPluginData' in node) {
      try {
        const crafts = getCraftData(node as SceneNode);
        if (crafts.length > 0) {
          for (const craftType of crafts) {
            try {
              createCraftIndicator(node as SceneNode, craftType);
            } catch (_e) {
              // ignore
            }
          }
        }
      } catch (_e) {
        // ignore
      }
    }

    if (hasChildren(node)) {
      for (let i = node.children.length - 1; i >= 0; i--) {
        stack.push(node.children[i]);
      }
    }

    if (Date.now() - sliceStart >= timeBudgetMs) {
      await new Promise<void>((resolve) => setTimeout(resolve, yieldDelayMs));
      sliceStart = Date.now();
    }
  }
}

/** 清除所有工艺标记和指示器 */
export function clearAllCraftMarks(): void {
  const cache = getCache();
  const page = figma.currentPage;

  const linkedNodeIds = new Set<string>();

  // 0. 收集所有工艺基础设施（不依赖缓存，避免漏删）
  const infraNodes = page.findAll((node) => {
    const name = (node as BaseNode).name;
    return Boolean(name && (name.startsWith(CRAFT_GROUP_PREFIX) || name.startsWith(CRAFT_INDICATOR_PREFIX)));
  });

  for (const node of infraNodes) {
    try {
      if ('getPluginData' in node) {
        const id = (node as SceneNode).getPluginData('linkedNodeId');
        if (id) linkedNodeIds.add(id);
      }
    } catch (_e) {
      // ignore
    }
  }

  // 1. 删除所有工艺基础设施（可能在 Frame/Group 内）
  for (let i = infraNodes.length - 1; i >= 0; i--) {
    try {
      infraNodes[i].remove();
    } catch (_e) {
      // ignore
    }
  }

  // 2. 清除所有节点的 pluginData（包括 craftTypes, grayValue, craftParams）
  const nodeIds = new Set<string>([...Array.from(cache.keys()), ...Array.from(linkedNodeIds)]);
  for (const id of nodeIds) {
    try {
      const node = figma.getNodeById(id);
      if (node && 'setPluginData' in node) {
        (node as SceneNode).setPluginData('craftTypes', '');
        (node as SceneNode).setPluginData('grayValue', '');
        (node as SceneNode).setPluginData('craftParams', ''); // 清除工艺参数
      }
    } catch (_e) {
      // 节点可能已被删除
    }
  }

  // 3. 清空缓存
  cache.clear();
}
