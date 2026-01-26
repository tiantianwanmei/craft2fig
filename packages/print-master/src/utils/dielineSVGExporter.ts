// ============================================================================
// 🔪 Dieline SVG Exporter - 刀版图 SVG 导出（支持真正的轮廓出血线）
// ============================================================================

import { Part2D } from '../types';
import {
  DielineExportOptions,
  calculateDielineBounds,
  applyBleedToBounds,
  generateDielineBleedContours
} from './dielineExporter';
import { Contour } from './bleedLineGenerator';

/**
 * 将轮廓转换为 SVG 路径字符串
 */
function contourToSVGPath(contour: Contour): string {
  if (contour.points.length === 0) return '';

  const firstPoint = contour.points[0];
  let path = `M ${firstPoint.x.toFixed(3)} ${firstPoint.y.toFixed(3)}`;

  for (let i = 1; i < contour.points.length; i++) {
    const point = contour.points[i];
    path += ` L ${point.x.toFixed(3)} ${point.y.toFixed(3)}`;
  }

  path += ' Z'; // 闭合路径
  return path;
}

/**
 * 导出刀版图为 SVG（符合印刷规范）
 */
export function exportDielineSVG(
  parts: Part2D[],
  options: DielineExportOptions
): string {
  const bounds = calculateDielineBounds(parts);
  const finalBounds = options.includeBleed
    ? applyBleedToBounds(bounds, options.bleed)
    : bounds;

  // 生成真正的出血线轮廓
  const bleedContours = generateDielineBleedContours(parts, options);

  const width = finalBounds.width;
  const height = finalBounds.height;
  const widthPx = (width / 25.4) * options.dpi;
  const heightPx = (height / 25.4) * options.dpi;

  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${widthPx}px" height="${heightPx}px" viewBox="0 0 ${width} ${height}"
     xmlns="http://www.w3.org/2000/svg" version="1.1">
  <title>Dieline Export - ${new Date().toISOString()}</title>
  <desc>DPI: ${options.dpi}, Bleed: ${options.bleed}mm (${options.bleedJoinType || 'round'}), Color Mode: ${options.colorMode}, Algorithm: Clipper2</desc>

  <!-- 定义图层 -->
  <defs>
    <style>
      .cut-line { stroke: #00FFFF; stroke-width: 0.5; fill: none; }
      .fold-line { stroke: #FF00FF; stroke-width: 0.3; stroke-dasharray: 2,2; fill: none; }
      .bleed-line { stroke: #FF0000; stroke-width: 0.4; fill: none; stroke-dasharray: 3,3; }
      .panel { fill: var(--icon-white); stroke: var(--icon-black); stroke-width: 0.1; }
    </style>
  </defs>
`;

  // 绘制真正的轮廓出血线（基于 Clipper2 算法）
  if (options.includeBleed && bleedContours.length > 0) {
    svg += `  <!-- 出血线轮廓（Clipper2 Polygon Offsetting） -->
  <g id="bleed-lines">
`;
    bleedContours.forEach((contour, index) => {
      const pathData = contourToSVGPath(contour);
      svg += `    <path class="bleed-line" d="${pathData}" />
`;
    });
    svg += `  </g>
`;
  }

  // 绘制所有部件
  parts.forEach(part => {
    const x = options.includeBleed ? part.x - bounds.minX + options.bleed : part.x - bounds.minX;
    const y = options.includeBleed ? part.y - bounds.minY + options.bleed : part.y - bounds.minY;

    const className = part.type === 'crease' ? 'fold-line' :
                      part.role === 'cut' ? 'cut-line' : 'panel';

    svg += `  <rect class="${className}" x="${x}" y="${y}" width="${part.width}" height="${part.height}" />
`;
  });

  svg += `</svg>`;
  return svg;
}
