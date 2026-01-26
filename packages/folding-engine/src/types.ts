/**
 * @genki/folding-engine - 类型定义
 * 定义通用的数据接口，确保输入输出标准化
 */

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** 输入：面片几何信息 */
export interface PanelInput {
  id: string;
  name?: string;
  bounds: Rect;
  center: Point;
  /** 可以携带额外元数据，算法透传 */
  meta?: Record<string, unknown>;
}

/** 输出：折叠步骤 */
export interface FoldStep {
  order: number;
  panelId: string;
  panelName: string;
  /** 调试用，例如 "Spine (Depth 1)" */
  reason: string;
  /** 用于批量动画的分组 */
  groupId: string;
  /** 带动关系：该面板折叠时会带动哪些面板 */
  drivenPanelIds: string[];
}

/** 折叠顺序结果 */
export interface FoldSequenceResult {
  /** 按顺序排列的面板ID */
  sequence: string[];
  /** 面板ID -> 显示名称的映射 */
  nameMap: Record<string, string>;
  /** 带动关系：X面ID -> [Y面IDs] */
  drivenMap: Record<string, string[]>;
  /** 详细的折叠步骤 */
  steps: FoldStep[];
}

/** 配置项：让算法更通用 */
export interface FoldingConfig {
  /** 根节点（H面）ID */
  rootId: string;
  /** 定义 Y 轴折叠顺序：'BottomFirst' (默认) 或 'TopFirst' */
  verticalSortStrategy?: 'BottomFirst' | 'TopFirst';
  /** 边缘检测容差（像素） */
  tolerance?: number;
  /** 最小重叠长度（像素） */
  minOverlap?: number;
}

/** 折叠边信息 */
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

/** 内部节点结构 */
export interface DieNode {
  id: string;
  depth: number;
  parentId: string | null;
  children: DieNode[];
  role: 'Root' | 'SpineLeft' | 'SpineRight' | 'FlapTop' | 'FlapBottom';
  foldAxis: 'Vertical' | 'Horizontal';
  data: PanelInput;
}
