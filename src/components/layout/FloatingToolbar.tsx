/**
 * 🔧 FloatingToolbar - 浮动工具栏组件
 * 画布控制工具 (缩放、平移、重置)
 */

import { memo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../../store';
import { SEMANTIC_TOKENS } from '@genki/shared-theme';

export const FloatingToolbar = memo(function FloatingToolbar() {
  const {
    zoom,
    setCanvasTransform,
    resetCanvasTransform,
    viewMode,
    setViewMode,
  } = useAppStore(
    useShallow((s) => ({
      zoom: s.canvasTransform.zoom,
      setCanvasTransform: s.setCanvasTransform,
      resetCanvasTransform: s.resetCanvasTransform,
      viewMode: s.viewMode,
      setViewMode: s.setViewMode,
    }))
  );

  const zoomIn = () => {
    setCanvasTransform({ zoom: Math.min(zoom * 1.25, 10) });
  };

  const zoomOut = () => {
    setCanvasTransform({ zoom: Math.max(zoom / 1.25, 0.1) });
  };

  const zoomPercentage = Math.round(zoom * 100);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: SEMANTIC_TOKENS.size.floatingToolbar.gap,
        padding: SEMANTIC_TOKENS.size.floatingToolbar.padding,
        background: SEMANTIC_TOKENS.glass.dark.background,
        backdropFilter: SEMANTIC_TOKENS.glass.dark.backdropFilter,
        border: SEMANTIC_TOKENS.glass.dark.border,
        borderRadius: SEMANTIC_TOKENS.border.radius.lg,
        boxShadow: SEMANTIC_TOKENS.glass.dark.boxShadow,
      }}
    >
      {/* 缩放控制 */}
      <button
        type="button"
        onClick={zoomOut}
        style={{
          width: SEMANTIC_TOKENS.size.floatingToolbar.button,
          height: SEMANTIC_TOKENS.size.floatingToolbar.button,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: SEMANTIC_TOKENS.border.radius.sm,
          color: SEMANTIC_TOKENS.color.text.secondary,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          transition: `all ${SEMANTIC_TOKENS.motion.duration.fast} ease`,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = SEMANTIC_TOKENS.color.bg.interactive.default;
          e.currentTarget.style.color = SEMANTIC_TOKENS.color.text.primary;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = SEMANTIC_TOKENS.color.text.secondary;
        }}
        title="缩小 (Ctrl+-)"
      >
        <svg width={SEMANTIC_TOKENS.size.floatingToolbar.icon} height={SEMANTIC_TOKENS.size.floatingToolbar.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      <div
        style={{
          minWidth: SEMANTIC_TOKENS.size.floatingToolbar.zoomDisplay,
          padding: `${SEMANTIC_TOKENS.size.floatingToolbar.gap} ${SEMANTIC_TOKENS.spacing.component.xs}`,
          fontSize: SEMANTIC_TOKENS.typography.fontSize.micro,
          fontFamily: 'monospace',
          fontVariantNumeric: 'tabular-nums',
          textAlign: 'center',
          color: SEMANTIC_TOKENS.color.text.secondary,
          cursor: 'pointer',
          transition: `color ${SEMANTIC_TOKENS.motion.duration.fast} ease`,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = SEMANTIC_TOKENS.color.text.primary;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = SEMANTIC_TOKENS.color.text.secondary;
        }}
        onClick={resetCanvasTransform}
        title="重置视图"
      >
        {zoomPercentage}%
      </div>

      <button
        type="button"
        onClick={zoomIn}
        style={{
          width: SEMANTIC_TOKENS.size.floatingToolbar.button,
          height: SEMANTIC_TOKENS.size.floatingToolbar.button,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: SEMANTIC_TOKENS.border.radius.sm,
          color: SEMANTIC_TOKENS.color.text.secondary,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          transition: `all ${SEMANTIC_TOKENS.motion.duration.fast} ease`,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = SEMANTIC_TOKENS.color.bg.interactive.default;
          e.currentTarget.style.color = SEMANTIC_TOKENS.color.text.primary;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = SEMANTIC_TOKENS.color.text.secondary;
        }}
        title="放大 (Ctrl++)"
      >
        <svg width={SEMANTIC_TOKENS.size.floatingToolbar.icon} height={SEMANTIC_TOKENS.size.floatingToolbar.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      {/* 分隔线 */}
      <div style={{
        width: SEMANTIC_TOKENS.border.width.thin,
        height: SEMANTIC_TOKENS.size.floatingToolbar.dividerHeight,
        background: SEMANTIC_TOKENS.color.border.weak,
        margin: `0 ${SEMANTIC_TOKENS.size.floatingToolbar.dividerMargin}`,
      }} />

      {/* 视图切换 */}
      <button
        type="button"
        onClick={() => setViewMode(viewMode === '2d' ? '3d' : '2d')}
        style={{
          padding: `${SEMANTIC_TOKENS.size.floatingToolbar.gap} ${SEMANTIC_TOKENS.spacing.component.sm}`,
          fontSize: SEMANTIC_TOKENS.typography.fontSize.micro,
          fontWeight: SEMANTIC_TOKENS.typography.fontWeight.medium,
          borderRadius: SEMANTIC_TOKENS.border.radius.sm,
          background: viewMode === '3d' ? SEMANTIC_TOKENS.color.button.primary.bg : 'transparent',
          color: viewMode === '3d' ? SEMANTIC_TOKENS.color.text.primary : SEMANTIC_TOKENS.color.text.secondary,
          border: 'none',
          cursor: 'pointer',
          transition: `all ${SEMANTIC_TOKENS.motion.duration.fast} ease`,
        }}
        onMouseEnter={(e) => {
          if (viewMode !== '3d') {
            e.currentTarget.style.background = SEMANTIC_TOKENS.color.bg.interactive.default;
            e.currentTarget.style.color = SEMANTIC_TOKENS.color.text.primary;
          }
        }}
        onMouseLeave={(e) => {
          if (viewMode !== '3d') {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = SEMANTIC_TOKENS.color.text.secondary;
          }
        }}
        title="切换 2D/3D 视图"
      >
        {viewMode.toUpperCase()}
      </button>

      {/* 分隔线 */}
      <div style={{
        width: SEMANTIC_TOKENS.border.width.thin,
        height: SEMANTIC_TOKENS.size.floatingToolbar.dividerHeight,
        background: SEMANTIC_TOKENS.color.border.weak,
        margin: `0 ${SEMANTIC_TOKENS.size.floatingToolbar.dividerMargin}`,
      }} />

      {/* 适应视图 */}
      <button
        type="button"
        onClick={resetCanvasTransform}
        style={{
          width: SEMANTIC_TOKENS.size.floatingToolbar.button,
          height: SEMANTIC_TOKENS.size.floatingToolbar.button,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: SEMANTIC_TOKENS.border.radius.sm,
          color: SEMANTIC_TOKENS.color.text.secondary,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          transition: `all ${SEMANTIC_TOKENS.motion.duration.fast} ease`,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = SEMANTIC_TOKENS.color.bg.interactive.default;
          e.currentTarget.style.color = SEMANTIC_TOKENS.color.text.primary;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = SEMANTIC_TOKENS.color.text.secondary;
        }}
        title="适应视图 (Ctrl+0)"
      >
        <svg width={SEMANTIC_TOKENS.size.floatingToolbar.icon} height={SEMANTIC_TOKENS.size.floatingToolbar.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M9 3v18M15 3v18M3 9h18M3 15h18" />
        </svg>
      </button>
    </div>
  );
});
