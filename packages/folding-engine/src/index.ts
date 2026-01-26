/**
 * @genki/folding-engine
 * 核心折叠算法引擎 - 用于包装刀版图的折叠顺序计算
 */

// 导出类型
export * from './types';

// 导出几何工具
export { GeometryUtils } from './geometry';

// 导出核心类
export { RobustFolder } from './RobustFolder';

// 导出便捷函数
import type { PanelInput, FoldingConfig, FoldSequenceResult } from './types';
import { RobustFolder } from './RobustFolder';

/**
 * 计算折叠顺序的便捷函数
 */
export function calculateSequence(
  panels: PanelInput[],
  config: FoldingConfig
): FoldSequenceResult {
  const folder = new RobustFolder(panels, config);
  return folder.generateSequence();
}

/**
 * 从简单的矩形数据创建 PanelInput
 */
export function createPanelInput(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  name?: string
): PanelInput {
  return {
    id,
    name: name ?? id,
    bounds: { x, y, width, height },
    center: { x: x + width / 2, y: y + height / 2 },
  };
}
