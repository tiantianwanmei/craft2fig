/**
 * @genki/folding-engine - 几何计算工具
 * 封装几何判断逻辑，方便后续升级
 */

import type { PanelInput, Rect, Point } from './types';

/** 默认容差值 */
const DEFAULT_TOLERANCE = 10;
const DEFAULT_MIN_OVERLAP = 5;

export const GeometryUtils = {
  /**
   * 计算两个范围的重叠部分
   */
  getOverlap(
    a1: number,
    a2: number,
    b1: number,
    b2: number,
    minOverlap = DEFAULT_MIN_OVERLAP
  ): { start: number; end: number; length: number } | null {
    const start = Math.max(a1, b1);
    const end = Math.min(a2, b2);
    if (end - start < minOverlap) return null;
    return { start, end, length: end - start };
  },

  /**
   * 判断两个矩形是否接触（允许容差）
   */
  isTouching(r1: Rect, r2: Rect, tolerance = DEFAULT_TOLERANCE): boolean {
    // 水平方向：r1 右边 ≈ r2 左边
    if (Math.abs((r1.x + r1.width) - r2.x) < tolerance) {
      const overlap = this.getOverlap(r1.y, r1.y + r1.height, r2.y, r2.y + r2.height);
      if (overlap) return true;
    }
    // 水平方向：r2 右边 ≈ r1 左边
    if (Math.abs((r2.x + r2.width) - r1.x) < tolerance) {
      const overlap = this.getOverlap(r1.y, r1.y + r1.height, r2.y, r2.y + r2.height);
      if (overlap) return true;
    }
    // 垂直方向：r1 下边 ≈ r2 上边
    if (Math.abs((r1.y + r1.height) - r2.y) < tolerance) {
      const overlap = this.getOverlap(r1.x, r1.x + r1.width, r2.x, r2.x + r2.width);
      if (overlap) return true;
    }
    // 垂直方向：r2 下边 ≈ r1 上边
    if (Math.abs((r2.y + r2.height) - r1.y) < tolerance) {
      const overlap = this.getOverlap(r1.x, r1.x + r1.width, r2.x, r2.x + r2.width);
      if (overlap) return true;
    }
    return false;
  },

  /**
   * 计算折叠轴向：Vertical (左右排列) 或 Horizontal (上下排列)
   */
  getFoldAxis(parent: PanelInput, child: PanelInput): 'Vertical' | 'Horizontal' {
    const dx = Math.abs(parent.center.x - child.center.x);
    const dy = Math.abs(parent.center.y - child.center.y);
    return dx > dy ? 'Vertical' : 'Horizontal';
  },

  /**
   * 判断相对方位：Child 在 Parent 的哪一边
   */
  getRelativePosition(
    parent: PanelInput,
    child: PanelInput
  ): 'Top' | 'Bottom' | 'Left' | 'Right' {
    const dx = child.center.x - parent.center.x;
    const dy = child.center.y - parent.center.y;

    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? 'Right' : 'Left';
    } else {
      return dy > 0 ? 'Bottom' : 'Top';
    }
  },

  /**
   * 判断面板是否在参考面板的左侧（X负方向）
   */
  isLeftOf(panel: PanelInput, reference: PanelInput, tolerance = DEFAULT_TOLERANCE): boolean {
    return panel.bounds.x + panel.bounds.width <= reference.bounds.x + tolerance;
  },

  /**
   * 判断面板是否在参考面板的右侧（X正方向）
   */
  isRightOf(panel: PanelInput, reference: PanelInput, tolerance = DEFAULT_TOLERANCE): boolean {
    return panel.bounds.x >= reference.bounds.x + reference.bounds.width - tolerance;
  },

  /**
   * 判断面板是否在参考面板的上方（Y负方向）
   */
  isAbove(panel: PanelInput, reference: PanelInput, tolerance = DEFAULT_TOLERANCE): boolean {
    return panel.bounds.y + panel.bounds.height <= reference.bounds.y + tolerance;
  },

  /**
   * 判断面板是否在参考面板的下方（Y正方向）
   */
  isBelow(panel: PanelInput, reference: PanelInput, tolerance = DEFAULT_TOLERANCE): boolean {
    return panel.bounds.y >= reference.bounds.y + reference.bounds.height - tolerance;
  },

  /**
   * 判断两个面板在Y方向是否有重叠（用于判断X轴向连接）
   */
  hasYOverlap(p1: PanelInput, p2: PanelInput): boolean {
    const p1CenterY = p1.center.y;
    const p2CenterY = p2.center.y;
    const maxHeight = Math.max(p1.bounds.height, p2.bounds.height) / 2;
    return Math.abs(p1CenterY - p2CenterY) < maxHeight;
  },

  /**
   * 判断两个面板在X方向是否有重叠（用于判断Y轴向连接）
   */
  hasXOverlap(p1: PanelInput, p2: PanelInput, tolerance = DEFAULT_TOLERANCE): boolean {
    const p1Left = p1.bounds.x;
    const p1Right = p1.bounds.x + p1.bounds.width;
    const p2CenterX = p2.center.x;
    return p2CenterX >= p1Left - tolerance && p2CenterX <= p1Right + tolerance;
  },
};
