/**
 * 🖼️ SpatialCanvas - 2D 空间画布组件
 * 显示标记图层的矢量卡片视图 + 折叠边可视化
 */

import { memo, useMemo } from 'react';
import { useAppStore } from '../../store';
import { useShallow } from 'zustand/react/shallow';
import { useCanvasInteraction } from '../../hooks';
import type { MarkedLayer, FoldEdge } from '../../types/core';
import { SEMANTIC_TOKENS } from '@genki/shared-theme';

export const SpatialCanvas = memo(function SpatialCanvas() {
  const { markedLayers, selection, showGrid, foldEdges } = useAppStore(
    useShallow((s) => ({
      markedLayers: s.markedLayers,
      selection: s.selection,
      showGrid: s.showGrid,
      foldEdges: s.foldEdges,
    }))
  );

  const { containerRef, setCanvasElement, transform, isPanning } = useCanvasInteraction();

  const transformStyle = useMemo(() => ({
    transform: `translate(${transform.pan.x}px, ${transform.pan.y}px) scale(${transform.zoom})`,
    transformOrigin: '0 0',
  }), [transform]);

  return (
    <div
      id="spatialCanvas"
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: SEMANTIC_TOKENS.color.surface.canvas,
        overflow: 'hidden',
        cursor: isPanning ? 'grabbing' : 'default',
      }}
    >
      {/* 网格背景 */}
      {showGrid && (
        <div
          style={{
            position: 'absolute',
            inset: '0',
            pointerEvents: 'none',
            opacity: 0.2,
            backgroundImage: `
              linear-gradient(${SEMANTIC_TOKENS.color.bg.interactive.default} 1px, transparent 1px),
              linear-gradient(90deg, ${SEMANTIC_TOKENS.color.bg.interactive.default} 1px, transparent 1px)
            `,
            backgroundSize: `${20 * transform.zoom}px ${20 * transform.zoom}px`,
            backgroundPosition: `${transform.pan.x}px ${transform.pan.y}px`,
          }}
        />
      )}

      {/* 画布内容 */}
      <div
        ref={setCanvasElement}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          ...transformStyle,
        }}
      >
        {/* 折叠边线 */}
        {foldEdges.map((edge) => (
          <FoldEdgeLine key={edge.id} edge={edge} />
        ))}

        {/* 图层卡片 */}
        {markedLayers.map((layer) => (
          <LayerCard
            key={layer.id}
            layer={layer}
            isSelected={selection.selectedIds.includes(layer.id)}
            isHovered={selection.hoveredId === layer.id}
          />
        ))}
      </div>

      {/* 空状态 */}
      {markedLayers.length === 0 && (
        <div style={{
          position: 'absolute',
          inset: '0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '64px',
              height: '64px',
              margin: '0 auto 16px',
              borderRadius: '50%',
              background: SEMANTIC_TOKENS.color.bg.interactive.default,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                style={{ color: SEMANTIC_TOKENS.color.text.disabled }}
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 9h18M9 21V9" />
              </svg>
            </div>
            <p style={{
              fontSize: SEMANTIC_TOKENS.typography.fontSize.sm,
              color: SEMANTIC_TOKENS.color.text.secondary,
            }}>
              暂无标记图层
            </p>
            <p style={{
              fontSize: SEMANTIC_TOKENS.typography.fontSize.xs,
              color: SEMANTIC_TOKENS.color.text.disabled,
              marginTop: '4px',
            }}>
              在 Figma 中选择图层并标记
            </p>
          </div>
        </div>
      )}
    </div>
  );
});

// 图层卡片组件
interface LayerCardProps {
  layer: MarkedLayer;
  isSelected: boolean;
  isHovered: boolean;
}

const LayerCard = memo(function LayerCard({ layer, isSelected, isHovered }: LayerCardProps) {
  const { bounds, name, craftType } = layer;

  const craftColors: Record<string, string> = {
    NORMAL: SEMANTIC_TOKENS.color.button.primary.bg,
    EMBOSS: SEMANTIC_TOKENS.color.craft.emboss,
    DEBOSS: SEMANTIC_TOKENS.color.craft.deboss,
    UV: SEMANTIC_TOKENS.color.craft.uv,
    HOTFOIL: SEMANTIC_TOKENS.color.craft.hotfoil,
    VARNISH: SEMANTIC_TOKENS.color.craft.varnish,
    SPOT_UV: SEMANTIC_TOKENS.color.craft.spotUv,
    TEXTURE: SEMANTIC_TOKENS.color.craft.texture,
  };

  const color = craftColors[craftType || 'NORMAL'] || craftColors.NORMAL;

  return (
    <div
      style={{
        position: 'absolute',
        left: bounds.x,
        top: bounds.y,
        width: bounds.width,
        height: bounds.height,
        border: `2px solid ${
          isSelected
            ? color
            : isHovered
            ? SEMANTIC_TOKENS.color.border.strong
            : SEMANTIC_TOKENS.color.border.weak
        }`,
        borderRadius: SEMANTIC_TOKENS.border.radius.sm,
        backgroundColor: `color-mix(in srgb, ${color} 10%, transparent)`,
        transition: `all ${SEMANTIC_TOKENS.motion.duration.fast} ease`,
        boxShadow: isSelected ? SEMANTIC_TOKENS.shadow.md : 'none',
        zIndex: isSelected ? 10 : 0,
      }}
    >
      {/* 图层名称标签 */}
      <div
        style={{
          position: 'absolute',
          top: '-20px',
          left: 0,
          padding: `${SEMANTIC_TOKENS.spacing.component.xs} ${SEMANTIC_TOKENS.spacing.component.sm}`,
          fontSize: SEMANTIC_TOKENS.typography.fontSize.micro,
          fontWeight: SEMANTIC_TOKENS.typography.fontWeight.medium,
          borderRadius: SEMANTIC_TOKENS.border.radius.xs,
          whiteSpace: 'nowrap' as const,
          background: isSelected ? SEMANTIC_TOKENS.color.button.primary.bg : SEMANTIC_TOKENS.color.bg.secondary,
          color: isSelected ? SEMANTIC_TOKENS.color.button.primary.text : SEMANTIC_TOKENS.color.text.secondary,
        }}
      >
        {name}
      </div>

      {/* 工艺类型标签 */}
      {craftType && (
        <div
          style={{
            position: 'absolute',
            bottom: '-20px',
            right: 0,
            padding: `${SEMANTIC_TOKENS.spacing.component.xs} ${SEMANTIC_TOKENS.spacing.component.sm}`,
            fontSize: SEMANTIC_TOKENS.typography.fontSize.micro,
            fontWeight: SEMANTIC_TOKENS.typography.fontWeight.bold,
            textTransform: 'uppercase' as const,
            borderRadius: SEMANTIC_TOKENS.border.radius.xs,
            color: SEMANTIC_TOKENS.color.button.primary.text,
            backgroundColor: color,
          }}
        >
          {craftType}
        </div>
      )}
    </div>
  );
});

// 折叠边线组件
interface FoldEdgeLineProps {
  edge: FoldEdge;
}

const FoldEdgeLine = memo(function FoldEdgeLine({ edge }: FoldEdgeLineProps) {
  const { startPoint, endPoint, direction, angle } = edge;

  // 根据方向设置颜色
  const directionColors: Record<string, string> = {
    L: SEMANTIC_TOKENS.color.fold.left,
    R: SEMANTIC_TOKENS.color.fold.right,
    F: SEMANTIC_TOKENS.color.fold.front,
    HT: SEMANTIC_TOKENS.color.fold.topFlap,
    HB: SEMANTIC_TOKENS.color.fold.bottomFlap,
    CUSTOM: SEMANTIC_TOKENS.color.fold.custom,
  };

  const color = directionColors[direction] || directionColors.CUSTOM;

  // 计算线段长度和角度
  const dx = endPoint.x - startPoint.x;
  const dy = endPoint.y - startPoint.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  const rotation = Math.atan2(dy, dx) * (180 / Math.PI);

  // 中点位置（用于标签）
  const midX = (startPoint.x + endPoint.x) / 2;
  const midY = (startPoint.y + endPoint.y) / 2;

  return (
    <>
      {/* 折叠边线 */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: startPoint.x,
          top: startPoint.y,
          width: length,
          height: 2,
          background: `linear-gradient(90deg, ${color}, ${color}80)`,
          transformOrigin: '0 50%',
          transform: `rotate(${rotation}deg)`,
          boxShadow: `0 0 4px ${color}60`,
        }}
      />

      {/* 折叠方向标签 */}
      <div
        className="absolute px-1 py-0.5 text-[8px] font-bold rounded whitespace-nowrap pointer-events-none"
        style={{
          left: midX - 12,
          top: midY - 10,
          background: color,
          color: 'white',
          boxShadow: `0 2px 4px ${color}40`,
        }}
      >
        {direction} {angle}°
      </div>

      {/* 起点标记 */}
      <div
        className="absolute w-2 h-2 rounded-full pointer-events-none"
        style={{
          left: startPoint.x - 4,
          top: startPoint.y - 4,
          background: color,
          boxShadow: `0 0 6px ${color}`,
        }}
      />

      {/* 终点标记 */}
      <div
        className="absolute w-2 h-2 rounded-full pointer-events-none"
        style={{
          left: endPoint.x - 4,
          top: endPoint.y - 4,
          background: color,
          boxShadow: `0 0 6px ${color}`,
        }}
      />
    </>
  );
});
