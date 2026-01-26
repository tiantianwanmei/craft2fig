/**
 * 📑 Tabs - 标签页组件
 */

import { memo, CSSProperties } from 'react';
import type { TabsProps } from '../../types/ui';
import { SEMANTIC_TOKENS } from '@genki/shared-theme';

export const Tabs = memo(function Tabs({
  items,
  activeId,
  onChange,
  variant: _variant = 'pill',
  className = '',
}: TabsProps) {
  const containerStyle: CSSProperties = {
    display: 'flex',
    gap: SEMANTIC_TOKENS.spacing.component.xs,
    padding: SEMANTIC_TOKENS.spacing.component.xs,
    background: SEMANTIC_TOKENS.color.bg.interactive.default,
    borderRadius: SEMANTIC_TOKENS.border.radius.sm,
  };

  return (
    <div
      style={containerStyle}
      className={className}
      role="tablist"
    >
      {items.map((item) => {
        const isActive = item.id === activeId;
        const isDisabled = item.disabled;

        const buttonStyle: CSSProperties = {
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          padding: `${SEMANTIC_TOKENS.spacing.component.sm} ${SEMANTIC_TOKENS.spacing.component.lg}`,
          fontSize: SEMANTIC_TOKENS.typography.fontSize.xs,
          fontWeight: SEMANTIC_TOKENS.typography.fontWeight.medium,
          borderRadius: SEMANTIC_TOKENS.border.radius.xs,
          transition: `all ${SEMANTIC_TOKENS.motion.duration.fast} ease-out`,
          outline: 'none',
          border: 'none',
          background: isActive ? SEMANTIC_TOKENS.color.bg.primary : 'transparent',
          color: isActive ? SEMANTIC_TOKENS.color.text.primary : SEMANTIC_TOKENS.color.text.secondary,
          boxShadow: isActive ? SEMANTIC_TOKENS.shadow.sm : 'none',
          opacity: isDisabled ? 0.5 : 1,
          cursor: isDisabled ? 'not-allowed' : 'pointer',
        };

        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-disabled={isDisabled}
            tabIndex={isDisabled ? -1 : 0}
            style={buttonStyle}
            onClick={() => !isDisabled && onChange(item.id)}
            onMouseEnter={(e) => {
              if (!isActive && !isDisabled) {
                e.currentTarget.style.color = SEMANTIC_TOKENS.color.text.primary;
                e.currentTarget.style.background = SEMANTIC_TOKENS.color.bg.interactive.default;
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive && !isDisabled) {
                e.currentTarget.style.color = SEMANTIC_TOKENS.color.text.secondary;
                e.currentTarget.style.background = 'transparent';
              }
            }}
          >
            {item.icon && (
              <span style={{ width: '16px', height: '16px' }}>
                {item.icon}
              </span>
            )}
            <span>{item.label}</span>
            {item.badge !== undefined && (
              <span
                style={{
                  minWidth: '18px',
                  height: '18px',
                  padding: `0 ${SEMANTIC_TOKENS.spacing.component.xs}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: SEMANTIC_TOKENS.typography.fontSize.xs,
                  fontWeight: SEMANTIC_TOKENS.typography.fontWeight.semibold,
                  borderRadius: SEMANTIC_TOKENS.border.radius.full,
                  background: isActive ? SEMANTIC_TOKENS.color.button.primary.bg : SEMANTIC_TOKENS.color.bg.interactive.hover,
                  color: isActive ? SEMANTIC_TOKENS.color.button.primary.text : SEMANTIC_TOKENS.color.text.tertiary,
                }}
              >
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
});
