/**
 * @genki/folding-engine - 核心折叠算法
 * 基于根节点自动计算折叠顺序
 *
 * 规则：
 * 1. H面为1（根节点，不动）
 * 2. X轴向（左）：从H面往左依次为 2, 3, 4...
 * 3. X轴向（右）：从H面往右依次为 -2, -3, -4...
 * 4. Y轴向：与X轴面相连的面用 X-nT（上）和 X-nB（下）
 * 5. 折叠顺序：左X轴 -> 右X轴 -> 左Y-B -> 右Y-B -> 左Y-T -> 右Y-T -> H的Y-B -> H的Y-T
 * 6. 带动关系：X面折叠时带动其Y面
 */

import type {
  PanelInput,
  FoldStep,
  FoldSequenceResult,
  FoldingConfig,
} from './types';
import { GeometryUtils } from './geometry';

/** Y轴面板收集结构 */
interface YPanelItem {
  panel: PanelInput;
  parentIdx: number;
  subIdx: number;
}

/** H面Y轴面板收集结构 */
interface HPanelItem {
  panel: PanelInput;
  subIdx: number;
}

export class RobustFolder {
  private panels: PanelInput[];
  private config: Required<FoldingConfig>;

  constructor(panels: PanelInput[], config: FoldingConfig) {
    this.panels = panels;
    this.config = {
      rootId: config.rootId,
      verticalSortStrategy: config.verticalSortStrategy ?? 'BottomFirst',
      tolerance: config.tolerance ?? 10,
      minOverlap: config.minOverlap ?? 5,
    };
  }

  /**
   * 生成折叠顺序
   */
  public generateSequence(): FoldSequenceResult {
    const result: FoldSequenceResult = {
      sequence: [],
      nameMap: {},
      drivenMap: {},
      steps: [],
    };

    if (this.panels.length === 0) return result;

    const { rootId, tolerance } = this.config;
    const rootPanel = this.panels.find((p) => p.id === rootId);

    if (!rootPanel) {
      // 找不到根节点，返回原始顺序
      result.sequence = this.panels.map((p) => p.id);
      return result;
    }

    // H面为1
    result.nameMap[rootId] = '1';
    result.sequence.push(rootId);

    const hCenterY = rootPanel.center.y;
    const hLeft = rootPanel.bounds.x;
    const hRight = rootPanel.bounds.x + rootPanel.bounds.width;
    const hTop = rootPanel.bounds.y;
    const hBottom = rootPanel.bounds.y + rootPanel.bounds.height;

    // 找出所有X轴向面板
    const xLeftPanels = this.findXLeftPanels(rootPanel, hCenterY, hLeft);
    const xRightPanels = this.findXRightPanels(rootPanel, hCenterY, hRight);

    // 为X轴面板编号
    this.assignXPanelNames(result, xLeftPanels, xRightPanels);

    // 收集Y轴面板
    const yLeftPanelsB: YPanelItem[] = [];
    const yLeftPanelsT: YPanelItem[] = [];
    const yRightPanelsB: YPanelItem[] = [];
    const yRightPanelsT: YPanelItem[] = [];
    const hPanelsB: HPanelItem[] = [];
    const hPanelsT: HPanelItem[] = [];

    // 找H面的Y轴连接面板
    this.findHPanelYConnections(
      result, rootPanel, hLeft, hRight, hTop, hBottom, hPanelsT, hPanelsB
    );

    // 找左侧X面板的Y轴连接
    this.findXPanelYConnections(
      result, xLeftPanels, rootId, true, yLeftPanelsT, yLeftPanelsB
    );

    // 找右侧X面板的Y轴连接
    this.findXPanelYConnections(
      result, xRightPanels, rootId, false, yRightPanelsT, yRightPanelsB
    );

    // 构建折叠顺序
    this.buildFoldSequence(
      result,
      xLeftPanels,
      xRightPanels,
      yLeftPanelsB,
      yLeftPanelsT,
      yRightPanelsB,
      yRightPanelsT,
      hPanelsB,
      hPanelsT
    );

    // 添加未分配的面板
    this.assignRemainingPanels(result);

    // 生成详细步骤
    this.generateSteps(result);

    return result;
  }

  private findXLeftPanels(
    rootPanel: PanelInput,
    hCenterY: number,
    hLeft: number
  ): PanelInput[] {
    const { rootId, tolerance } = this.config;

    return this.panels
      .filter((v) => {
        if (v.id === rootId) return false;
        const vCenterY = v.center.y;
        const yOverlap =
          Math.abs(vCenterY - hCenterY) <
          Math.max(rootPanel.bounds.height, v.bounds.height) / 2;
        const isLeft = v.bounds.x + v.bounds.width <= hLeft + tolerance;
        return yOverlap && isLeft;
      })
      .sort((a, b) => b.bounds.x - a.bounds.x); // 从右到左排序
  }

  private findXRightPanels(
    rootPanel: PanelInput,
    hCenterY: number,
    hRight: number
  ): PanelInput[] {
    const { rootId, tolerance } = this.config;

    return this.panels
      .filter((v) => {
        if (v.id === rootId) return false;
        const vCenterY = v.center.y;
        const yOverlap =
          Math.abs(vCenterY - hCenterY) <
          Math.max(rootPanel.bounds.height, v.bounds.height) / 2;
        const isRight = v.bounds.x >= hRight - tolerance;
        return yOverlap && isRight;
      })
      .sort((a, b) => a.bounds.x - b.bounds.x); // 从左到右排序
  }

  private assignXPanelNames(
    result: FoldSequenceResult,
    xLeftPanels: PanelInput[],
    xRightPanels: PanelInput[]
  ): void {
    // 左侧：2, 3, 4...
    xLeftPanels.forEach((panel, idx) => {
      result.nameMap[panel.id] = String(idx + 2);
    });

    // 右侧：-2, -3, -4...
    xRightPanels.forEach((panel, idx) => {
      result.nameMap[panel.id] = String(-(idx + 2));
    });
  }

  private findHPanelYConnections(
    result: FoldSequenceResult,
    rootPanel: PanelInput,
    hLeft: number,
    hRight: number,
    hTop: number,
    hBottom: number,
    hPanelsT: HPanelItem[],
    hPanelsB: HPanelItem[]
  ): void {
    const { rootId, tolerance } = this.config;

    const hConnectedY = this.panels.filter((v) => {
      if (v.id === rootId) return false;
      const vCenterX = v.center.x;
      const xOverlap = vCenterX >= hLeft - tolerance && vCenterX <= hRight + tolerance;
      const isAbove = v.bounds.y + v.bounds.height <= hTop + tolerance;
      const isBelow = v.bounds.y >= hBottom - tolerance;
      return xOverlap && (isAbove || isBelow);
    });

    const hTList = hConnectedY
      .filter((v) => v.bounds.y + v.bounds.height <= hTop + tolerance)
      .sort((a, b) => b.bounds.y - a.bounds.y);

    const hBList = hConnectedY
      .filter((v) => v.bounds.y >= hBottom - tolerance)
      .sort((a, b) => a.bounds.y - b.bounds.y);

    // 记录H面的带动关系
    result.drivenMap[rootId] = [
      ...hTList.map((p) => p.id),
      ...hBList.map((p) => p.id),
    ];

    // 命名H面的Y面板
    hTList.forEach((p, i) => {
      result.nameMap[p.id] = `1-${i + 1}T`;
      hPanelsT.push({ panel: p, subIdx: i + 1 });
    });

    hBList.forEach((p, i) => {
      result.nameMap[p.id] = `1-${i + 1}B`;
      hPanelsB.push({ panel: p, subIdx: i + 1 });
    });
  }

  private findXPanelYConnections(
    result: FoldSequenceResult,
    xPanels: PanelInput[],
    rootId: string,
    isLeft: boolean,
    yPanelsT: YPanelItem[],
    yPanelsB: YPanelItem[]
  ): void {
    const { tolerance } = this.config;

    xPanels.forEach((xPanel, xIdx) => {
      const xNum = isLeft ? xIdx + 2 : -(xIdx + 2);
      const xLeft = xPanel.bounds.x;
      const xRight = xPanel.bounds.x + xPanel.bounds.width;
      const xTop = xPanel.bounds.y;
      const xBottom = xPanel.bounds.y + xPanel.bounds.height;

      const connectedY = this.panels.filter((v) => {
        if (v.id === rootId || v.id === xPanel.id) return false;
        if (result.nameMap[v.id]) return false;
        const vCenterX = v.center.x;
        const xOverlap = vCenterX >= xLeft - tolerance && vCenterX <= xRight + tolerance;
        const isAbove = v.bounds.y + v.bounds.height <= xTop + tolerance;
        const isBelow = v.bounds.y >= xBottom - tolerance;
        return xOverlap && (isAbove || isBelow);
      });

      const tPanels = connectedY
        .filter((v) => v.bounds.y + v.bounds.height <= xTop + tolerance)
        .sort((a, b) => b.bounds.y - a.bounds.y);

      const bPanels = connectedY
        .filter((v) => v.bounds.y >= xBottom - tolerance)
        .sort((a, b) => a.bounds.y - b.bounds.y);

      result.drivenMap[xPanel.id] = [
        ...tPanels.map((p) => p.id),
        ...bPanels.map((p) => p.id),
      ];

      tPanels.forEach((p, i) => {
        result.nameMap[p.id] = `${xNum}-${i + 1}T`;
        yPanelsT.push({ panel: p, parentIdx: xNum, subIdx: i + 1 });
      });

      bPanels.forEach((p, i) => {
        result.nameMap[p.id] = `${xNum}-${i + 1}B`;
        yPanelsB.push({ panel: p, parentIdx: xNum, subIdx: i + 1 });
      });
    });
  }

  private buildFoldSequence(
    result: FoldSequenceResult,
    xLeftPanels: PanelInput[],
    xRightPanels: PanelInput[],
    yLeftPanelsB: YPanelItem[],
    yLeftPanelsT: YPanelItem[],
    yRightPanelsB: YPanelItem[],
    yRightPanelsT: YPanelItem[],
    hPanelsB: HPanelItem[],
    hPanelsT: HPanelItem[]
  ): void {
    // 1. 左侧X轴向（2, 3, 4...）
    xLeftPanels.forEach((p) => result.sequence.push(p.id));

    // 2. 右侧X轴向（-2, -3, -4...）
    xRightPanels.forEach((p) => result.sequence.push(p.id));

    // 3. 左侧X面的Y负向(B)
    yLeftPanelsB
      .sort((a, b) => a.parentIdx - b.parentIdx || a.subIdx - b.subIdx)
      .forEach((item) => result.sequence.push(item.panel.id));

    // 4. 右侧X面的Y负向(B)
    yRightPanelsB
      .sort((a, b) => b.parentIdx - a.parentIdx || a.subIdx - b.subIdx)
      .forEach((item) => result.sequence.push(item.panel.id));

    // 5. 左侧X面的Y正向(T)
    yLeftPanelsT
      .sort((a, b) => a.parentIdx - b.parentIdx || a.subIdx - b.subIdx)
      .forEach((item) => result.sequence.push(item.panel.id));

    // 6. 右侧X面的Y正向(T)
    yRightPanelsT
      .sort((a, b) => b.parentIdx - a.parentIdx || a.subIdx - b.subIdx)
      .forEach((item) => result.sequence.push(item.panel.id));

    // 7. H面(1)的Y面：先B后T
    hPanelsB
      .sort((a, b) => a.subIdx - b.subIdx)
      .forEach((item) => result.sequence.push(item.panel.id));

    hPanelsT
      .sort((a, b) => a.subIdx - b.subIdx)
      .forEach((item) => result.sequence.push(item.panel.id));
  }

  private assignRemainingPanels(result: FoldSequenceResult): void {
    let pIdx = 1;
    this.panels.forEach((v) => {
      if (!result.nameMap[v.id]) {
        result.nameMap[v.id] = `P${pIdx++}`;
        result.sequence.push(v.id);
      }
    });
  }

  private generateSteps(result: FoldSequenceResult): void {
    result.sequence.forEach((panelId, index) => {
      const panel = this.panels.find((p) => p.id === panelId);
      const name = result.nameMap[panelId] || panelId;
      const drivenIds = result.drivenMap[panelId] || [];

      result.steps.push({
        order: index + 1,
        panelId,
        panelName: name,
        reason: this.getStepReason(name),
        groupId: this.getGroupId(name),
        drivenPanelIds: drivenIds,
      });
    });
  }

  private getStepReason(name: string): string {
    if (name === '1') return 'Root (H面)';
    if (/^-?\d+$/.test(name)) {
      const num = parseInt(name, 10);
      return num > 0 ? `Spine-Left-${num}` : `Spine-Right-${Math.abs(num)}`;
    }
    if (name.endsWith('T')) return `Flap-Top`;
    if (name.endsWith('B')) return `Flap-Bottom`;
    return 'Unassigned';
  }

  private getGroupId(name: string): string {
    if (name === '1') return 'root';
    const match = name.match(/^(-?\d+)/);
    return match ? `spine-${match[1]}` : 'misc';
  }
}
