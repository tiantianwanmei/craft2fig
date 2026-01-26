/**
 * 📦 Panel - 可折叠面板组件
 */

import { memo, useState, CSSProperties } from 'react';
import type { PanelProps } from '../../types/ui';
import { SEMANTIC_TOKENS } from '@genki/shared-theme';

export const Panel = memo(function Panel({
  title,
  collapsible = false,
  collapsed: controlledCollapsed,
  onToggle,
  headerActions,
  className = '',
  children,
}: PanelProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const isCollapsed = controlledCollapsed ?? internalCollapsed;

  const handleToggle = () => {
    if (onToggle) {
      onToggle();
    } else {
      setInternalCollapsed(!internalCollapsed);
    }
  };

  const containerStyle: CSSProperties = {
    background: 'transparent', // 透明背景，让毛玻璃效果透过来
    border: `1px solid ${SEMANTIC_TOKENS.color.border.default}`,
    borderRadius: SEMANTIC_TOKENS.border.radius.md,
    overflow: 'hidden',
  };

  return (
    <div style={containerStyle} className={className}>
      {title && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            borderBottom: `1px solid ${SEMANTIC_TOKENS.color.border.weak}`,
            cursor: collapsible ? 'pointer' : 'default',
            transition: `background-color ${SEMANTIC_TOKENS.motion.duration.fast}`,
          }}
          onClick={collapsible ? handleToggle : undefined}
          onMouseEnter={(e) => {
            if (collapsible) {
              e.currentTarget.style.background = SEMANTIC_TOKENS.color.bg.interactive.default;
            }
          }}
          onMouseLeave={(e) => {
            if (collapsible) {
              e.currentTarget.style.background = 'transparent';
            }
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {collapsible && (
              <svg
                style={{
                  width: '12px',
                  height: '12px',
                  color: SEMANTIC_TOKENS.color.text.tertiary,
                  transition: `transform ${SEMANTIC_TOKENS.motion.duration.base}`,
                  transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                }}
                viewBox="0 0 12 12"
                fill="none"
              >
                <path
                  d="M3 4.5L6 7.5L9 4.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
            <h3 style={{
              fontSize: SEMANTIC_TOKENS.typography.fontSize.xs,
              fontWeight: SEMANTIC_TOKENS.typography.fontWeight.semibold,
              color: SEMANTIC_TOKENS.color.text.primary,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              {title}
            </h3>
          </div>
          {headerActions && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }} onClick={(e) => e.stopPropagation()}>
              {headerActions}
            </div>
          )}
        </div>
      )}
      <div
        style={{
          transition: `all ${SEMANTIC_TOKENS.motion.duration.base} ease-out`,
          maxHeight: isCollapsed ? '0' : '2000px',
          opacity: isCollapsed ? 0 : 1,
          overflow: isCollapsed ? 'hidden' : 'visible',
        }}
      >
        <div style={{ padding: '12px' }}>{children}</div>
      </div>
    </div>
  );
});
