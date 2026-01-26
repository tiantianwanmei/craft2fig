// Fold Logic - 折叠边检测与自动命名
// 使用 @genki/folding-engine 核心算法包
// 保持向后兼容的接口

import {
  calculateSequence,
  createPanelInput,
  type FoldSequenceResult as EngineFoldResult,
  type PanelInput,
} from '@genki/folding-engine';

// --- Types (保持向后兼容) ---
export interface Vector {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FoldEdge {
  id: string;
  type: 'horizontal' | 'vertical';
  panel1Id: string;
  panel2Id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  foldAngle: number;
}

// --- Constants ---
const TOLERANCE = 10;
const MIN_OVERLAP = 5;

// --- Helper Functions ---
function getOverlap(a1: number, a2: number, b1: number, b2: number) {
  const start = Math.max(a1, b1);
  const end = Math.min(a2, b2);
  if (end - start < MIN_OVERLAP) return null;
  return { start, end, length: end - start };
}

/**
 * Find shared edge between two vectors
 */
export function findSharedEdge(v1: Vector, v2: Vector): FoldEdge | null {
  // Horizontal: v1 bottom ≈ v2 top
  if (Math.abs((v1.y + v1.height) - v2.y) < TOLERANCE) {
    const overlap = getOverlap(v1.x, v1.x + v1.width, v2.x, v2.x + v2.width);
    if (overlap) {
      return {
        id: `edge-${v1.id}-${v2.id}-h`,
        type: 'horizontal',
        panel1Id: v1.id,
        panel2Id: v2.id,
        x: overlap.start,
        y: v1.y + v1.height,
        width: overlap.length,
        height: 2,
        foldAngle: 90
      };
    }
  }

  // Horizontal: v2 bottom ≈ v1 top
  if (Math.abs((v2.y + v2.height) - v1.y) < TOLERANCE) {
    const overlap = getOverlap(v1.x, v1.x + v1.width, v2.x, v2.x + v2.width);
    if (overlap) {
      return {
        id: `edge-${v2.id}-${v1.id}-h`,
        type: 'horizontal',
        panel1Id: v2.id,
        panel2Id: v1.id,
        x: overlap.start,
        y: v2.y + v2.height,
        width: overlap.length,
        height: 2,
        foldAngle: 90
      };
    }
  }

  // Vertical: v1 right ≈ v2 left
  if (Math.abs((v1.x + v1.width) - v2.x) < TOLERANCE) {
    const overlap = getOverlap(v1.y, v1.y + v1.height, v2.y, v2.y + v2.height);
    if (overlap) {
      return {
        id: `edge-${v1.id}-${v2.id}-v`,
        type: 'vertical',
        panel1Id: v1.id,
        panel2Id: v2.id,
        x: v1.x + v1.width,
        y: overlap.start,
        width: 2,
        height: overlap.length,
        foldAngle: 90
      };
    }
  }

  // Vertical: v2 right ≈ v1 left
  if (Math.abs((v2.x + v2.width) - v1.x) < TOLERANCE) {
    const overlap = getOverlap(v1.y, v1.y + v1.height, v2.y, v2.y + v2.height);
    if (overlap) {
      return {
        id: `edge-${v2.id}-${v1.id}-v`,
        type: 'vertical',
        panel1Id: v2.id,
        panel2Id: v1.id,
        x: v2.x + v2.width,
        y: overlap.start,
        width: 2,
        height: overlap.length,
        foldAngle: 90
      };
    }
  }

  return null;
}

/**
 * Detect all fold edges in a set of vectors
 */
export function detectFoldEdges(vectors: Vector[]): FoldEdge[] {
  const edges: FoldEdge[] = [];
  const seenIds = new Set<string>();

  for (let i = 0; i < vectors.length; i++) {
    for (let j = i + 1; j < vectors.length; j++) {
      const edge = findSharedEdge(vectors[i], vectors[j]);
      if (edge && !seenIds.has(edge.id)) {
        edges.push(edge);
        seenIds.add(edge.id);
      }
    }
  }

  return edges;
}

/**
 * Auto-assign panel codes based on H panel
 */
export function autoAssignPanelCodes(
  vectors: Vector[],
  hPanelId: string
): Record<string, string> {
  const hPanel = vectors.find(v => v.id === hPanelId);
  if (!hPanel) return {};

  const nameMap: Record<string, string> = {};
  nameMap[hPanelId] = 'H';

  const hLeft = hPanel.x;
  const hRight = hPanel.x + hPanel.width;
  const hTop = hPanel.y;
  const hBottom = hPanel.y + hPanel.height;

  // Find horizontal neighbors
  const horizontalNeighbors = vectors.filter(v => {
    if (v.id === hPanelId) return false;
    const vMidY = v.y + v.height / 2;
    return vMidY > hTop && vMidY < hBottom;
  });

  // Left panels
  const leftPanels = horizontalNeighbors
    .filter(v => (v.x + v.width / 2) < hLeft)
    .sort((a, b) => b.x - a.x);

  // Right panels
  const rightPanels = horizontalNeighbors
    .filter(v => v.x >= hRight - 5)
    .sort((a, b) => a.x - b.x);

  // Assign L, F, R codes
  const leftNames = ['L', 'F', 'R'];
  leftPanels.forEach((v, i) => {
    nameMap[v.id] = i < leftNames.length ? leftNames[i] : `R${i - 2}`;
  });

  rightPanels.forEach((v, i) => {
    nameMap[v.id] = i === 0 ? 'HR' : `HR${i + 1}`;
  });

  // Find HT/HB panels
  vectors.forEach(v => {
    if (v.id === hPanelId || nameMap[v.id]) return;
    const vMidX = v.x + v.width / 2;
    const isAligned = vMidX > hLeft && vMidX < hRight;

    if (isAligned) {
      if (v.y + v.height <= hTop + 5) {
        nameMap[v.id] = 'HT';
      } else if (v.y >= hBottom - 5) {
        nameMap[v.id] = 'HB';
      }
    }
  });

  // Assign remaining as P + number
  let pIndex = 1;
  vectors.forEach(v => {
    if (!nameMap[v.id]) {
      nameMap[v.id] = `P${pIndex++}`;
    }
  });

  return nameMap;
}

/**
 * 基于根节点自动计算折叠顺序
 * 规则：
 * 1. H面为1（根节点，不动）
 * 2. X轴向（左）：从H面往左依次为 2, 3, 4...
 * 3. X轴向（右）：从H面往右依次为 -2, -3, -4...
 * 4. Y轴向：与X轴面相连的面用 X-nT（上）和 X-nB（下）
 * 5. 折叠顺序：左X轴 -> 右X轴 -> 左Y-B -> 右Y-B -> 左Y-T -> 右Y-T -> H的Y-B -> H的Y-T
 * 6. 带动关系：X面折叠时带动其Y面
 */
export interface FoldSequenceResult {
  sequence: string[];
  nameMap: Record<string, string>;
  drivenMap: Record<string, string[]>; // 带动关系：X面ID -> [Y面IDs]
}

export function autoFoldSequence(
  vectors: Vector[],
  rootPanelId: string
): FoldSequenceResult {
  const result: FoldSequenceResult = {
    sequence: [],
    nameMap: {},
    drivenMap: {},
  };

  if (vectors.length === 0) return result;

  const rootPanel = vectors.find(v => v.id === rootPanelId);
  if (!rootPanel) {
    result.sequence = vectors.map(v => v.id);
    return result;
  }

  // H面为1
  result.nameMap[rootPanelId] = '1';
  result.sequence.push(rootPanelId);

  const hCenterY = rootPanel.y + rootPanel.height / 2;
  const hLeft = rootPanel.x;
  const hRight = rootPanel.x + rootPanel.width;
  const hTop = rootPanel.y;
  const hBottom = rootPanel.y + rootPanel.height;

  // 找出所有X轴向面板（与H面Y方向重叠）
  // 左侧面板（X负方向）
  const xLeftPanels = vectors
    .filter(v => {
      if (v.id === rootPanelId) return false;
      const vCenterY = v.y + v.height / 2;
      const yOverlap = Math.abs(vCenterY - hCenterY) < Math.max(rootPanel.height, v.height) / 2;
      const isLeft = v.x + v.width <= hLeft + TOLERANCE;
      return yOverlap && isLeft;
    })
    .sort((a, b) => b.x - a.x); // 从右到左排序（离H面近的先）

  // 右侧面板（X正方向）
  const xRightPanels = vectors
    .filter(v => {
      if (v.id === rootPanelId) return false;
      const vCenterY = v.y + v.height / 2;
      const yOverlap = Math.abs(vCenterY - hCenterY) < Math.max(rootPanel.height, v.height) / 2;
      const isRight = v.x >= hRight - TOLERANCE;
      return yOverlap && isRight;
    })
    .sort((a, b) => a.x - b.x); // 从左到右排序（离H面近的先）

  // 为左侧X轴面板编号：2, 3, 4...
  xLeftPanels.forEach((panel, idx) => {
    result.nameMap[panel.id] = String(idx + 2);
  });

  // 为右侧X轴面板编号：-2, -3, -4...
  xRightPanels.forEach((panel, idx) => {
    result.nameMap[panel.id] = String(-(idx + 2));
  });

  // 收集Y轴面板（T和B）- 分为H面的、左侧X面的、右侧X面的
  const yLeftPanelsB: Array<{ panel: Vector; parentIdx: number; subIdx: number }> = [];
  const yLeftPanelsT: Array<{ panel: Vector; parentIdx: number; subIdx: number }> = [];
  const yRightPanelsB: Array<{ panel: Vector; parentIdx: number; subIdx: number }> = [];
  const yRightPanelsT: Array<{ panel: Vector; parentIdx: number; subIdx: number }> = [];
  const hPanelsB: Array<{ panel: Vector; subIdx: number }> = [];
  const hPanelsT: Array<{ panel: Vector; subIdx: number }> = [];

  // 先找H面（1）的Y轴连接面板
  const hConnectedY = vectors.filter(v => {
    if (v.id === rootPanelId) return false;
    const vCenterX = v.x + v.width / 2;
    const xOverlap = vCenterX >= hLeft - TOLERANCE && vCenterX <= hRight + TOLERANCE;
    const isAbove = v.y + v.height <= hTop + TOLERANCE;
    const isBelow = v.y >= hBottom - TOLERANCE;
    return xOverlap && (isAbove || isBelow);
  });

  // H面的T和B面板
  const hTList = hConnectedY
    .filter(v => v.y + v.height <= hTop + TOLERANCE)
    .sort((a, b) => b.y - a.y);
  const hBList = hConnectedY
    .filter(v => v.y >= hBottom - TOLERANCE)
    .sort((a, b) => a.y - b.y);

  // 记录H面的带动关系 - 链式结构
  // H面只带动：第一个左侧X面 + 第一个右侧X面 + H面的T/B面
  // 后续X面由前一个X面带动，形成链式结构
  const hDriven: string[] = [];
  if (xLeftPanels.length > 0) {
    hDriven.push(xLeftPanels[0].id); // 只添加第一个左侧X面
  }
  if (xRightPanels.length > 0) {
    hDriven.push(xRightPanels[0].id); // 只添加第一个右侧X面
  }
  // H面只带动第一个T和第一个B（链式）
  if (hTList.length > 0) {
    hDriven.push(hTList[0].id);
  }
  if (hBList.length > 0) {
    hDriven.push(hBList[0].id);
  }
  result.drivenMap[rootPanelId] = hDriven;

  // 命名H面的Y面板，并建立链式带动关系
  hTList.forEach((p, i) => {
    result.nameMap[p.id] = `1-${i + 1}T`;
    hPanelsT.push({ panel: p, subIdx: i + 1 });
    // 链式：当前T面板带动下一个T面板
    if (i + 1 < hTList.length) {
      result.drivenMap[p.id] = [hTList[i + 1].id];
    }
  });
  hBList.forEach((p, i) => {
    result.nameMap[p.id] = `1-${i + 1}B`;
    hPanelsB.push({ panel: p, subIdx: i + 1 });
    // 链式：当前B面板带动下一个B面板
    if (i + 1 < hBList.length) {
      result.drivenMap[p.id] = [hBList[i + 1].id];
    }
  });

  // 为每个左侧X轴面板找其Y轴连接的面板
  xLeftPanels.forEach((xPanel, xIdx) => {
    const xNum = xIdx + 2;
    const xLeft = xPanel.x;
    const xRight = xPanel.x + xPanel.width;
    const xTop = xPanel.y;
    const xBottom = xPanel.y + xPanel.height;

    const connectedY = vectors.filter(v => {
      if (v.id === rootPanelId || v.id === xPanel.id) return false;
      if (result.nameMap[v.id]) return false;
      const vCenterX = v.x + v.width / 2;
      const xOverlap = vCenterX >= xLeft - TOLERANCE && vCenterX <= xRight + TOLERANCE;
      const isAbove = v.y + v.height <= xTop + TOLERANCE;
      const isBelow = v.y >= xBottom - TOLERANCE;
      return xOverlap && (isAbove || isBelow);
    });

    const tPanels = connectedY
      .filter(v => v.y + v.height <= xTop + TOLERANCE)
      .sort((a, b) => b.y - a.y);
    const bPanels = connectedY
      .filter(v => v.y >= xBottom - TOLERANCE)
      .sort((a, b) => a.y - b.y);

    // 链式结构：当前X面板带动下一个X面板 + 第一个T面板 + 第一个B面板
    const driven: string[] = [];
    if (xIdx + 1 < xLeftPanels.length) {
      driven.push(xLeftPanels[xIdx + 1].id);
    }
    if (tPanels.length > 0) {
      driven.push(tPanels[0].id);
    }
    if (bPanels.length > 0) {
      driven.push(bPanels[0].id);
    }
    result.drivenMap[xPanel.id] = driven;

    // T面板链式带动
    tPanels.forEach((p, i) => {
      result.nameMap[p.id] = `${xNum}-${i + 1}T`;
      yLeftPanelsT.push({ panel: p, parentIdx: xNum, subIdx: i + 1 });
      if (i + 1 < tPanels.length) {
        result.drivenMap[p.id] = [tPanels[i + 1].id];
      }
    });
    // B面板链式带动
    bPanels.forEach((p, i) => {
      result.nameMap[p.id] = `${xNum}-${i + 1}B`;
      yLeftPanelsB.push({ panel: p, parentIdx: xNum, subIdx: i + 1 });
      if (i + 1 < bPanels.length) {
        result.drivenMap[p.id] = [bPanels[i + 1].id];
      }
    });
  });

  // 为每个右侧X轴面板找其Y轴连接的面板
  xRightPanels.forEach((xPanel, xIdx) => {
    const xNum = -(xIdx + 2);
    const xLeft = xPanel.x;
    const xRight = xPanel.x + xPanel.width;
    const xTop = xPanel.y;
    const xBottom = xPanel.y + xPanel.height;

    const connectedY = vectors.filter(v => {
      if (v.id === rootPanelId || v.id === xPanel.id) return false;
      if (result.nameMap[v.id]) return false;
      const vCenterX = v.x + v.width / 2;
      const xOverlap = vCenterX >= xLeft - TOLERANCE && vCenterX <= xRight + TOLERANCE;
      const isAbove = v.y + v.height <= xTop + TOLERANCE;
      const isBelow = v.y >= xBottom - TOLERANCE;
      return xOverlap && (isAbove || isBelow);
    });

    const tPanels = connectedY
      .filter(v => v.y + v.height <= xTop + TOLERANCE)
      .sort((a, b) => b.y - a.y);
    const bPanels = connectedY
      .filter(v => v.y >= xBottom - TOLERANCE)
      .sort((a, b) => a.y - b.y);

    // 链式结构：当前X面板带动下一个X面板 + 第一个T面板 + 第一个B面板
    const drivenRight: string[] = [];
    if (xIdx + 1 < xRightPanels.length) {
      drivenRight.push(xRightPanels[xIdx + 1].id);
    }
    if (tPanels.length > 0) {
      drivenRight.push(tPanels[0].id);
    }
    if (bPanels.length > 0) {
      drivenRight.push(bPanels[0].id);
    }
    result.drivenMap[xPanel.id] = drivenRight;

    // T面板链式带动
    tPanels.forEach((p, i) => {
      result.nameMap[p.id] = `${xNum}-${i + 1}T`;
      yRightPanelsT.push({ panel: p, parentIdx: xNum, subIdx: i + 1 });
      if (i + 1 < tPanels.length) {
        result.drivenMap[p.id] = [tPanels[i + 1].id];
      }
    });
    // B面板链式带动
    bPanels.forEach((p, i) => {
      result.nameMap[p.id] = `${xNum}-${i + 1}B`;
      yRightPanelsB.push({ panel: p, parentIdx: xNum, subIdx: i + 1 });
      if (i + 1 < bPanels.length) {
        result.drivenMap[p.id] = [bPanels[i + 1].id];
      }
    });
  });

  // 构建折叠顺序
  // 1. 先折叠左侧X轴向（2, 3, 4...）
  xLeftPanels.forEach(p => result.sequence.push(p.id));

  // 2. 折叠右侧X轴向（-2, -3, -4...）
  xRightPanels.forEach(p => result.sequence.push(p.id));

  // 3. 折叠左侧X面的Y负向(B)
  yLeftPanelsB
    .sort((a, b) => a.parentIdx - b.parentIdx || a.subIdx - b.subIdx)
    .forEach(item => result.sequence.push(item.panel.id));

  // 4. 折叠右侧X面的Y负向(B)
  yRightPanelsB
    .sort((a, b) => b.parentIdx - a.parentIdx || a.subIdx - b.subIdx)
    .forEach(item => result.sequence.push(item.panel.id));

  // 5. 折叠左侧X面的Y正向(T)
  yLeftPanelsT
    .sort((a, b) => a.parentIdx - b.parentIdx || a.subIdx - b.subIdx)
    .forEach(item => result.sequence.push(item.panel.id));

  // 6. 折叠右侧X面的Y正向(T)
  yRightPanelsT
    .sort((a, b) => b.parentIdx - a.parentIdx || a.subIdx - b.subIdx)
    .forEach(item => result.sequence.push(item.panel.id));

  // 7. 最后折叠H面(1)的Y面：先B后T
  hPanelsB
    .sort((a, b) => a.subIdx - b.subIdx)
    .forEach(item => result.sequence.push(item.panel.id));
  hPanelsT
    .sort((a, b) => a.subIdx - b.subIdx)
    .forEach(item => result.sequence.push(item.panel.id));

  // 8. 添加未分配的面板
  let pIdx = 1;
  vectors.forEach(v => {
    if (!result.nameMap[v.id]) {
      result.nameMap[v.id] = `P${pIdx++}`;
      result.sequence.push(v.id);
    }
  });

  return result;
}

/**
 * 自动检测最佳H面（根节点）
 * 规则：选择直接连接数最多的面板，且每个直接连接的分支的子树面板数也要计入
 * 例如：面板1直接连接2、3，2又连接2-1T、2-1B，则1的总分支数=2(直接)+2(2的子树)+0(3的子树)=4
 */
export function detectBestRootPanel(vectors: Vector[]): string | null {
  if (vectors.length === 0) return null;
  if (vectors.length === 1) return vectors[0].id;

  // 构建邻接表
  const adjacencyMap = new Map<string, Set<string>>();
  vectors.forEach(v => adjacencyMap.set(v.id, new Set()));

  for (let i = 0; i < vectors.length; i++) {
    for (let j = i + 1; j < vectors.length; j++) {
      if (arePanelsConnected(vectors[i], vectors[j])) {
        adjacencyMap.get(vectors[i].id)!.add(vectors[j].id);
        adjacencyMap.get(vectors[j].id)!.add(vectors[i].id);
      }
    }
  }

  // 计算从某个节点出发，排除指定节点后能到达的所有节点数（子树大小）
  const countSubtree = (startId: string, excludeId: string): number => {
    const visited = new Set<string>();
    const queue = [startId];
    visited.add(startId);
    visited.add(excludeId); // 排除根节点，不往回走

    while (queue.length > 0) {
      const current = queue.shift()!;
      const neighbors = adjacencyMap.get(current) || new Set();
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }
    return visited.size - 1; // 减去排除的根节点
  };

  // 计算每个面板作为根节点时的总分支面板数
  let bestId: string | null = null;
  let maxScore = -1;

  vectors.forEach(root => {
    const directNeighbors = adjacencyMap.get(root.id) || new Set();
    let totalBranchPanels = 0;

    // 计算每个直接连接分支的子树大小
    for (const neighbor of directNeighbors) {
      const subtreeSize = countSubtree(neighbor, root.id);
      totalBranchPanels += subtreeSize;
    }

    // 评分 = 总分支面板数（包含直接连接和次级连接）
    if (totalBranchPanels > maxScore) {
      maxScore = totalBranchPanels;
      bestId = root.id;
    }
  });

  return bestId;
}

/**
 * 判断两个面板是否连接（相邻）
 */
function arePanelsConnected(v1: Vector, v2: Vector): boolean {
  // 水平连接：v1 右边 ≈ v2 左边
  if (Math.abs((v1.x + v1.width) - v2.x) < TOLERANCE) {
    const overlap = getOverlap(v1.y, v1.y + v1.height, v2.y, v2.y + v2.height);
    if (overlap) return true;
  }
  // 水平连接：v2 右边 ≈ v1 左边
  if (Math.abs((v2.x + v2.width) - v1.x) < TOLERANCE) {
    const overlap = getOverlap(v1.y, v1.y + v1.height, v2.y, v2.y + v2.height);
    if (overlap) return true;
  }
  // 垂直连接：v1 下边 ≈ v2 上边
  if (Math.abs((v1.y + v1.height) - v2.y) < TOLERANCE) {
    const overlap = getOverlap(v1.x, v1.x + v1.width, v2.x, v2.x + v2.width);
    if (overlap) return true;
  }
  // 垂直连接：v2 下边 ≈ v1 上边
  if (Math.abs((v2.y + v2.height) - v1.y) < TOLERANCE) {
    const overlap = getOverlap(v1.x, v1.x + v1.width, v2.x, v2.x + v2.width);
    if (overlap) return true;
  }
  return false;
}

/**
 * 自动推演完整的折叠信息（包括自动检测H面）
 */
export function autoInferFoldSequence(vectors: Vector[]): FoldSequenceResult & { rootPanelId: string | null } {
  const rootPanelId = detectBestRootPanel(vectors);

  if (!rootPanelId) {
    return {
      sequence: vectors.map(v => v.id),
      nameMap: {},
      drivenMap: {},
      rootPanelId: null,
    };
  }

  const result = autoFoldSequence(vectors, rootPanelId);
  return {
    ...result,
    rootPanelId,
  };
}
