// ============================================================================
// 🔪 Dieline Exporter - 刀版图导出器（符合印刷规范）
// ============================================================================

import { Part2D } from '../types';
import {
  generateBleedLines,
  extractOuterContour,
  BleedJoinType,
  Contour
} from './bleedLineGenerator';

export interface DielineExportOptions {
  dpi: number; // 分辨率，默认 300
  bleed: number; // 出血（mm），默认 3
  includeBleed: boolean; // 是否包含出血
  bleedJoinType?: BleedJoinType; // 出血线连接类型（miter/round/square），默认 round
  format: 'svg' | 'pdf' | 'json';
  colorMode: 'RGB' | 'CMYK';
}

export interface DielineBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

/**
 * 计算刀版图的外轮廓边界
 */
export function calculateDielineBounds(parts: Part2D[]): DielineBounds {
  if (parts.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  parts.forEach(part => {
    const x1 = part.x;
    const y1 = part.y;
    const x2 = part.x + part.width;
    const y2 = part.y + part.height;

    minX = Math.min(minX, x1);
    minY = Math.min(minY, y1);
    maxX = Math.max(maxX, x2);
    maxY = Math.max(maxY, y2);
  });

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * 应用出血到刀版图边界（旧方法 - 简单矩形扩展）
 * @deprecated 使用 generateDielineBleedContours 获得真正的轮廓出血线
 */
export function applyBleedToBounds(
  bounds: DielineBounds,
  bleed: number
): DielineBounds {
  return {
    minX: bounds.minX - bleed,
    minY: bounds.minY - bleed,
    maxX: bounds.maxX + bleed,
    maxY: bounds.maxY + bleed,
    width: bounds.width + bleed * 2,
    height: bounds.height + bleed * 2,
  };
}

/**
 * 生成刀版图的出血线轮廓（基于 Clipper2 全球标准算法）
 *
 * 这是真正的轮廓偏移出血线，沿着刀版图外轮廓的每条边向外偏移，
 * 保持圆角和曲线的形状，符合全球印刷行业标准。
 */
export function generateDielineBleedContours(
  parts: Part2D[],
  options: DielineExportOptions
): Contour[] {
  if (!options.includeBleed || options.bleed <= 0) {
    return [];
  }

  // 提取刀版图外轮廓
  const outerContour = extractOuterContour(parts);

  // 生成出血线轮廓
  const bleedContours = generateBleedLines(
    [outerContour],
    {
      bleedDistance: options.bleed,
      joinType: options.bleedJoinType || 'round',
      miterLimit: 2.0,
      arcTolerance: 0.25
    }
  );

  return bleedContours;
}

/**
 * 导出刀版图为 JSON（包含印刷规范）
 */
export function exportDielineJSON(
  parts: Part2D[],
  options: DielineExportOptions
): string {
  const bounds = calculateDielineBounds(parts);
  const finalBounds = options.includeBleed
    ? applyBleedToBounds(bounds, options.bleed)
    : bounds;

  // 生成真正的出血线轮廓（基于 Clipper2）
  const bleedContours = generateDielineBleedContours(parts, options);

  const exportData = {
    version: '2.0', // 升级版本号，支持真正的轮廓出血线
    metadata: {
      exportDate: new Date().toISOString(),
      dpi: options.dpi,
      bleed: options.bleed,
      includeBleed: options.includeBleed,
      bleedJoinType: options.bleedJoinType || 'round',
      colorMode: options.colorMode,
      unit: 'mm',
      algorithm: 'Clipper2 Polygon Offsetting', // 标注使用的算法
    },
    bounds: finalBounds,
    dimensions: {
      width: finalBounds.width,
      height: finalBounds.height,
      widthPx: Math.round((finalBounds.width / 25.4) * options.dpi),
      heightPx: Math.round((finalBounds.height / 25.4) * options.dpi),
    },
    parts: parts.map(part => ({
      ...part,
      // 如果包含出血，调整坐标
      x: options.includeBleed ? part.x - bounds.minX + options.bleed : part.x - bounds.minX,
      y: options.includeBleed ? part.y - bounds.minY + options.bleed : part.y - bounds.minY,
    })),
    bleedContours: bleedContours, // 新增：真正的出血线轮廓
    printSpecs: {
      cutLineColor: '#00FFFF', // 青色 - 裁切线
      foldLineColor: '#FF00FF', // 洋红 - 折叠线
      bleedLineColor: '#FF0000', // 红色 - 出血线
      safeArea: 3, // 安全区域（mm）
      bleedArea: options.bleed,
    },
  };

  return JSON.stringify(exportData, null, 2);
}
