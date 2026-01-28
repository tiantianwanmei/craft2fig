/**
 * 面板树转换器
 * 将 MarkedLayer[] + drivenMap 转换为 PanelNode 树结构
 * 用于 SkinnedFoldingMesh 组件
 */

import type { MarkedLayer } from '../types/core';
import type { PanelNode } from '@genki/folding-3d';

type Point2D = {
  x: number;
  y: number;
};

type Rect2D = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type JointInfo = {
  type: 'horizontal' | 'vertical';
  position: Point2D;
  length: number;
  width: number;
  direction: 1 | -1;
  maxAngle: number;
  gapSize?: number;
};

/** 转换配置 */
export interface ConvertConfig {
  /** 折痕宽度（用于圆角） */
  jointWidth?: number;
  /** 最大折叠角度（弧度） */
  maxFoldAngle?: number;
  /** 边缘检测容差 */
  edgeTolerance?: number;
  /** X 偏移（用于将 Figma 绝对坐标转换为相对坐标） */
  offsetX?: number;
  /** Y 偏移 */
  offsetY?: number;
}

const DEFAULT_CONFIG: ConvertConfig = {
  jointWidth: 2,
  maxFoldAngle: Math.PI / 2,
  edgeTolerance: 10,
  offsetX: 0,
  offsetY: 0,
};

function normalizePngPreviewToDataUrl(pngPreview: string): string {
  const s = pngPreview.trim();
  if (!s) return s;
  if (s.startsWith('data:')) return s;
  return `data:image/png;base64,${s}`;
}

/**
 * 检测两个面板之间的共享边
 */
function detectSharedEdge(
  panel1: Rect2D,
  panel2: Rect2D,
  tolerance: number
): JointInfo | null {
  const p1 = panel1;
  const p2 = panel2;

  // panel1 下边 ≈ panel2 上边
  if (Math.abs((p1.y + p1.height) - p2.y) < tolerance) {
    const overlapStart = Math.max(p1.x, p2.x);
    const overlapEnd = Math.min(p1.x + p1.width, p2.x + p2.width);
    if (overlapEnd - overlapStart > tolerance) {
      return {
        type: 'horizontal',
        position: { x: overlapStart, y: p1.y + p1.height },
        length: overlapEnd - overlapStart,
        width: 2,
        direction: -1,
        maxAngle: Math.PI / 2,
      };
    }
  }

  // panel2 下边 ≈ panel1 上边
  if (Math.abs((p2.y + p2.height) - p1.y) < tolerance) {
    const overlapStart = Math.max(p1.x, p2.x);
    const overlapEnd = Math.min(p1.x + p1.width, p2.x + p2.width);
    if (overlapEnd - overlapStart > tolerance) {
      return {
        type: 'horizontal',
        position: { x: overlapStart, y: p1.y },
        length: overlapEnd - overlapStart,
        width: 2,
        direction: 1,
        maxAngle: Math.PI / 2,
      };
    }
  }

  // panel1 右边 ≈ panel2 左边
  if (Math.abs((p1.x + p1.width) - p2.x) < tolerance) {
    const overlapStart = Math.max(p1.y, p2.y);
    const overlapEnd = Math.min(p1.y + p1.height, p2.y + p2.height);
    if (overlapEnd - overlapStart > tolerance) {
      return {
        type: 'vertical',
        position: { x: p1.x + p1.width, y: overlapStart },
        length: overlapEnd - overlapStart,
        width: 2,
        direction: 1,
        maxAngle: Math.PI / 2,
      };
    }
  }

  // panel2 右边 ≈ panel1 左边
  if (Math.abs((p2.x + p2.width) - p1.x) < tolerance) {
    const overlapStart = Math.max(p1.y, p2.y);
    const overlapEnd = Math.min(p1.y + p1.height, p2.y + p2.height);
    if (overlapEnd - overlapStart > tolerance) {
      return {
        type: 'vertical',
        position: { x: p1.x, y: overlapStart },
        length: overlapEnd - overlapStart,
        width: 2,
        direction: -1,
        maxAngle: Math.PI / 2,
      };
    }
  }

  return null;
}

/**
 * 从 MarkedLayer 提取边界信息（应用偏移）
 */
function extractBounds(layer: MarkedLayer, offsetX: number, offsetY: number): Rect2D {
  const rawX = (layer as any).x ?? layer.bounds?.x ?? 0;
  const rawY = (layer as any).y ?? layer.bounds?.y ?? 0;
  const result = {
    x: rawX - offsetX,
    y: rawY - offsetY,
    width: (layer as any).width ?? layer.bounds?.width ?? 100,
    height: (layer as any).height ?? layer.bounds?.height ?? 50,
  };

  return result;
}

/**
 * 将 MarkedLayer 转换为 PanelNode
 */
function layerToPanelNode(
  layer: MarkedLayer,
  parentId: string | null,
  parentBounds: Rect2D | null,
  config: ConvertConfig
): PanelNode {
  const bounds = extractBounds(layer, config.offsetX!, config.offsetY!);
  const center: Point2D = {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
  };

  // 检测与父节点的共享边
  let jointInfo: JointInfo | undefined;
  if (parentBounds) {
    jointInfo = detectSharedEdge(parentBounds, bounds, config.edgeTolerance!) ?? undefined;
    if (jointInfo) {
      jointInfo.width = config.jointWidth!;
      jointInfo.maxAngle = config.maxFoldAngle!;
    }
  }


  // 提取 SVG 路径（优先使用真实 svgPath，其次从 svgPreview 中提取）
  let svgPath: string | undefined;
  if (layer.svgPath) {
    svgPath = layer.svgPath;
  } else if (layer.svgPreview) {
    // 简单的正则提取 d 属性 (假设 svgPreview 是完整的 <svg>String)
    const match = layer.svgPreview.match(/d="([^"]+)"/);
    if (match) {
      svgPath = match[1];
    }
  }

  return {
    id: layer.id,
    name: layer.name,
    bounds,
    center,
    rasterImage: layer.pngPreview ? normalizePngPreviewToDataUrl(layer.pngPreview) : undefined,
    svgPath, // 传递提取的路径
    parentId,
    children: [],
    jointInfo,
    meta: {
      craftType: layer.craftType,
      crafts: layer.crafts,
      shapeMask: layer.shapeMask,
    },
  };
}

/**
 * 主转换函数：将 MarkedLayer[] + drivenMap 转换为 PanelNode 树
 */
export function convertToPanelTree(
  panels: MarkedLayer[],
  drivenMap: Record<string, string[]>,
  rootPanelId: string | null,
  config: Partial<ConvertConfig> = {}
): PanelNode | null {
  if (!rootPanelId || panels.length === 0) {
    return null;
  }

  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  // 创建面板 ID 到 MarkedLayer 的映射
  const panelMap = new Map<string, MarkedLayer>();
  panels.forEach(p => {
    if (p && p.id) {
      panelMap.set(p.id, p);
    }
  });

  // 查找根面板
  const rootLayer = panelMap.get(rootPanelId);
  if (!rootLayer) {
    console.warn(`[panelTreeConverter] 找不到根面板: ${rootPanelId}`);
    return null;
  }

  // 递归构建子节点
  const buildChildren = (
    parentId: string,
    parentBounds: Rect2D
  ): PanelNode[] => {
    const childIds = drivenMap[parentId] || [];
    const children: PanelNode[] = [];

    childIds.forEach(childId => {
      const childLayer = panelMap.get(childId);
      if (!childLayer) {
        console.warn(`[panelTreeConverter] 找不到子面板: ${childId}`);
        return;
      }

      // 1. 初始转换 (不再应用递归偏移，保持紧贴状态)
      // 🚀 核心变更：SkinnedFoldingMesh 内部会根据 gapSizeMultiplier 自动处理间隙和骨骼偏移，
      // 这里如果再做偏移会导致间隙翻倍且 Joint 位置与面板边缘脱节。
      const node = layerToPanelNode(
        childLayer,
        parentId,
        parentBounds,
        mergedConfig
      );

      // 递归构建孙节点 (传递原始 bounds 用于边缘检测)
      node.children = buildChildren(childId, node.bounds);
      children.push(node);
    });

    return children;
  };

  // 构建根节点
  const rootNode = layerToPanelNode(rootLayer, null, null, mergedConfig);
  rootNode.children = buildChildren(rootPanelId, rootNode.bounds);

  return rootNode;
}

/**
 * 计算面板树的整体边界
 */
export function calculateTreeBounds(root: PanelNode): Rect2D {
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;

  const traverse = (node: PanelNode) => {
    minX = Math.min(minX, node.bounds.x);
    minY = Math.min(minY, node.bounds.y);
    maxX = Math.max(maxX, node.bounds.x + node.bounds.width);
    maxY = Math.max(maxY, node.bounds.y + node.bounds.height);
    node.children.forEach(traverse);
  };

  traverse(root);

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}
