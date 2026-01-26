// ============================================================================
// SVGCanvas - SVG 画布组件
// ============================================================================

import React from 'react';
import { Part2D, DielineSettings } from '../types';

interface SVGCanvasProps {
  layoutData: Part2D[];
  dielineSettings: DielineSettings;
  params: { l: number; w: number; h: number; t: number };
  scale: number;
  offset: { x: number; y: number };
  isDragging: boolean;
  resolvedTokens?: Record<string, string>;
}

export const SVGCanvas: React.FC<SVGCanvasProps> = ({
  layoutData,
  dielineSettings,
  params,
  scale,
  offset,
  isDragging,
  resolvedTokens = {},
}) => {
  const viewBox = `${-params.w - dielineSettings.bleed} ${-20 - dielineSettings.bleed} ${params.l + params.w * 2 + dielineSettings.bleed * 2} ${(params.h + params.t) * 2 + params.w * 2 + params.h + 40 + dielineSettings.bleed * 2}`;

  return (
    <svg
      viewBox={viewBox}
      className="w-full h-full"
      style={{
        minHeight: '600px',
        transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
        transformOrigin: 'center center',
        transition: 'none',
        willChange: isDragging ? 'transform' : 'auto',
        overflow: 'visible'
      }}
    >
      <defs>
        <filter
          id="bleedFilter"
          x="-200%"
          y="-200%"
          width="500%"
          height="500%"
          filterUnits="objectBoundingBox"
        >
          <feMorphology operator="dilate" radius={dielineSettings.bleed} />
        </filter>
      </defs>

      {/* 出血层 */}
      {dielineSettings.bleed > 0 && (
        <g opacity="0.25">
          {layoutData.map((part) => (
            <g key={`bleed-${part.id}`} transform={`translate(${part.x}, ${part.y})`}>
              <path
                d={part.path}
                fill="hsl(var(--destructive))"
                stroke="hsl(var(--destructive))"
                strokeWidth={dielineSettings.bleed * 2}
                strokeLinejoin="miter"
                strokeMiterlimit={10}
              />
            </g>
          ))}
        </g>
      )}

      {/* 正常填充层 */}
      {layoutData.map((part) => (
        <g key={part.id} transform={`translate(${part.x}, ${part.y})`}>
          <path d={part.path} fill={part.color} opacity="0.9" />
          <text
            x={part.width / 2}
            y={part.height / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="hsl(var(--foreground))"
            fontSize="10"
            fontWeight="600"
            opacity="0.8"
          >
            {part.name}
          </text>
          <text
            x={part.width / 2}
            y={part.height / 2 + 12}
            textAnchor="middle"
            fill={resolvedTokens['primary-400'] || 'hsl(var(--primary))'}
            fontSize="7"
            opacity="0.6"
          >
            {part.width.toFixed(0)} × {part.height.toFixed(0)}
          </text>
        </g>
      ))}

      {/* 折叠线 */}
      {layoutData.map((part, i) => {
        const foldLines: JSX.Element[] = [];
        layoutData.forEach((otherPart, j) => {
          if (i >= j) return;

          // 右边共用
          if (
            Math.abs(part.x + part.width - otherPart.x) < 1 &&
            Math.abs(part.y - otherPart.y) < 1 &&
            Math.abs(part.height - otherPart.height) < 1
          ) {
            foldLines.push(
              <line
                key={`fold-${i}-${j}-r`}
                x1={part.x + part.width}
                y1={part.y}
                x2={part.x + part.width}
                y2={part.y + part.height}
                stroke={dielineSettings.foldLineColor}
                strokeWidth={dielineSettings.foldLineWidth}
                strokeDasharray={dielineSettings.foldLineStyle === 'dashed' ? '5,3' : 'none'}
              />
            );
          }

          // 底边共用
          if (
            Math.abs(part.y + part.height - otherPart.y) < 1 &&
            Math.abs(part.x - otherPart.x) < 1 &&
            Math.abs(part.width - otherPart.width) < 1
          ) {
            foldLines.push(
              <line
                key={`fold-${i}-${j}-b`}
                x1={part.x}
                y1={part.y + part.height}
                x2={part.x + part.width}
                y2={part.y + part.height}
                stroke={dielineSettings.foldLineColor}
                strokeWidth={dielineSettings.foldLineWidth}
                strokeDasharray={dielineSettings.foldLineStyle === 'dashed' ? '5,3' : 'none'}
              />
            );
          }
        });
        return foldLines;
      })}

      {/* 裁切线 */}
      {layoutData.map((part) => (
        <path
          key={`cut-${part.id}`}
          d={part.path}
          fill="none"
          stroke={dielineSettings.cutLineColor}
          strokeWidth={dielineSettings.cutLineWidth}
          strokeDasharray={dielineSettings.cutLineStyle === 'dashed' ? '5,3' : 'none'}
          transform={`translate(${part.x}, ${part.y})`}
        />
      ))}
    </svg>
  );
};
