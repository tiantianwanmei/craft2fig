/**
 * 🎨 Plugin Constants - 插件常量定义
 */

// ========== 数据存储键 ==========

/** 工艺类型数据键 */
export const CRAFT_DATA_KEY = 'craftTypes';

/** 灰度值数据键 */
export const GRAY_VALUE_KEY = 'grayValue';

/** 工艺参数数据键 */
export const CRAFT_PARAMS_KEY = 'craftParams';

/** 已选择向量数据键 */
export const SELECTED_VECTORS_KEY = 'selectedVectors';

/** 驱动关系数据键 */
export const DRIVEN_RELATIONS_KEY = 'drivenRelations';

/** 生成的工艺向量数据键 */
export const GENERATED_CRAFT_VECTOR_KEY = 'generatedCraftVector';

/** 工艺指示器前缀 */
export const CRAFT_INDICATOR_PREFIX = '__craft_indicator_';

/** 工艺组前缀 */
export const CRAFT_GROUP_PREFIX = '__craft_group_';

// ========== 工艺类型 ==========

/** 工艺类型列表 */
export const CRAFT_TYPES = ['烫金', '烫银', 'UV', '凹凸', '法线', '置换'] as const;

/** 工艺类型 */
export type CraftTypeZh = (typeof CRAFT_TYPES)[number];

// ========== 颜色常量 ==========

/** 纯白色 */
export const PURE_WHITE: RGB = { r: 1, g: 1, b: 1 };

/** 纯黑色 */
export const PURE_BLACK: RGB = { r: 0, g: 0, b: 0 };

/** 工艺颜色映射 */
export const CRAFT_COLORS: Record<CraftTypeZh, RGB> = {
  '烫金': { r: 0.83, g: 0.68, b: 0.21 },
  '烫银': { r: 0.75, g: 0.75, b: 0.78 },
  'UV': { r: 0.09, g: 0.63, b: 0.98 },
  '凹凸': { r: 0.65, g: 0.55, b: 0.98 },
  '法线': { r: 0.29, g: 0.87, b: 0.50 },
  '置换': { r: 0.98, g: 0.55, b: 0.29 },
};

// ========== 面片名称 ==========

/** 标准面片名称列表 */
export const FACE_NAMES = [
  'H', 'F', 'L', 'R',
  'HT', 'HB', 'FT', 'FB',
  'FLT', 'FLB', 'FRT', 'FRB',
  'HT1', 'FB1',
] as const;

// ========== UI 配置 ==========

/** 插件窗口尺寸 */
export const UI_SIZE = {
  width: 880,
  height: 680,
} as const;

/** 选择变化防抖延迟 (ms) */
export const SELECTION_CHANGE_DEBOUNCE = 150;

/** 标记操作完成延迟 (ms) */
export const MARKING_COMPLETE_DELAY = 200;

/** 工艺指示器样式 */
export const INDICATOR_STYLE = {
  padding: 3,
  strokeWeight: 2,
  dashPattern: [6, 4] as readonly number[],
  cornerRadius: 4,
  fillOpacity: 0.1,
  strokeOpacity: 0.8,
} as const;
