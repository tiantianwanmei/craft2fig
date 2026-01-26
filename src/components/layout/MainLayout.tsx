/**
 * 📐 MainLayout - 主布局组件
 * 可调整大小的分栏布局 (视口 | 控制面板)
 */

import { memo, useCallback, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../../store';
import type { BaseComponentProps } from '../../types/ui';
import { SEMANTIC_TOKENS } from '@genki/shared-theme';

interface MainLayoutProps extends BaseComponentProps {
  viewport: React.ReactNode;
  controlPanel: React.ReactNode;
  toolbar?: React.ReactNode;
  statusBar?: React.ReactNode;
}

const MIN_SIDEBAR_WIDTH = 280;
const MAX_SIDEBAR_WIDTH = 480;

export const MainLayout = memo(function MainLayout({
  viewport,
  controlPanel,
  toolbar,
  statusBar,
  className = '',
}: MainLayoutProps) {
  const {
    sidebarWidth,
    setSidebarWidth,
  } = useAppStore(
    useShallow((s) => ({
      sidebarWidth: s.sidebarWidth,
      setSidebarWidth: s.setSidebarWidth,
    }))
  );

  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const newWidth = containerRect.right - moveEvent.clientX;
      setSidebarWidth(Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, newWidth)));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [setSidebarWidth]);

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw',
        background: SEMANTIC_TOKENS.color.surface.canvas,
        overflow: 'hidden',
      }}
      className={className}
    >
      {/* 主内容区 - 叠加布局实现毛玻璃效果 */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {/* 渐变背景层 - 延伸到整个宽度，用于毛玻璃效果 */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: SEMANTIC_TOKENS.color.surface.canvasGradient,
          pointerEvents: 'none',
        }} />

        {/* 视口区域 - 延伸到整个宽度，让侧边栏覆盖在上面 */}
        <div style={{
          position: 'absolute',
          inset: 0,
        }}>
          {/* 浮动工具栏 */}
          {toolbar && (
            <div style={{ position: 'absolute', top: '12px', left: '12px', zIndex: 10 }}>
              {toolbar}
            </div>
          )}

          {/* 视口内容 */}
          <div style={{ width: '100%', height: '100%' }}>
            {viewport}
          </div>
        </div>

        {/* 控制面板 - 浮动在右侧 (毛玻璃效果) */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            width: sidebarWidth,
            zIndex: 20,
            background: SEMANTIC_TOKENS.glass.dark.background,
            backdropFilter: SEMANTIC_TOKENS.glass.dark.backdropFilter,
            WebkitBackdropFilter: SEMANTIC_TOKENS.glass.dark.backdropFilter,
            borderLeft: SEMANTIC_TOKENS.glass.dark.border,
            overflow: 'hidden',
            transition: `box-shadow ${SEMANTIC_TOKENS.motion.duration.base}`,
            boxShadow: SEMANTIC_TOKENS.glass.dark.boxShadow,
          }}
        >
          {/* 可调整大小的分隔线 */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: '4px',
              cursor: 'col-resize',
              background: isResizing ? SEMANTIC_TOKENS.color.button.primary.bg : 'transparent',
              transition: `background-color ${SEMANTIC_TOKENS.motion.duration.fast}`,
              zIndex: 30,
            }}
            onMouseDown={handleMouseDown}
            onMouseEnter={(e) => {
              if (!isResizing) {
                e.currentTarget.style.background = SEMANTIC_TOKENS.color.button.primary.bg;
              }
            }}
            onMouseLeave={(e) => {
              if (!isResizing) {
                e.currentTarget.style.background = 'transparent';
              }
            }}
          />
          {controlPanel}
        </div>
      </div>

      {/* 状态栏 */}
      {statusBar && (
        <div
          style={{
            height: '24px',
            padding: '0 12px',
            display: 'flex',
            alignItems: 'center',
            background: SEMANTIC_TOKENS.color.bg.secondary,
            borderTop: `1px solid ${SEMANTIC_TOKENS.color.border.weak}`,
          }}
        >
          {statusBar}
        </div>
      )}
    </div>
  );
});
