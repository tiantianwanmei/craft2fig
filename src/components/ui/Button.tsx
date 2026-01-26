/**
 * 🔘 Button - 按钮组件
 * 支持多种变体和尺寸
 */

import { memo, CSSProperties } from 'react';
import type { ButtonProps } from '../../types/ui';
import { SEMANTIC_TOKENS } from '@genki/shared-theme';

const sizeStyles: Record<string, CSSProperties> = {
  xs: {
    padding: `${SEMANTIC_TOKENS.spacing.component.xs} ${SEMANTIC_TOKENS.spacing.component.md}`,
    fontSize: SEMANTIC_TOKENS.typography.fontSize.xs,
    gap: SEMANTIC_TOKENS.spacing.component.xs,
  },
  sm: {
    padding: `${SEMANTIC_TOKENS.spacing.component.sm} ${SEMANTIC_TOKENS.spacing.component.md}`,
    fontSize: SEMANTIC_TOKENS.typography.fontSize.xs,
    gap: SEMANTIC_TOKENS.spacing.component.sm,
  },
  md: {
    padding: `${SEMANTIC_TOKENS.spacing.component.md} ${SEMANTIC_TOKENS.spacing.component.lg}`,
    fontSize: SEMANTIC_TOKENS.typography.fontSize.sm,
    gap: SEMANTIC_TOKENS.spacing.component.md,
  },
  lg: {
    padding: `${SEMANTIC_TOKENS.spacing.component.md} ${SEMANTIC_TOKENS.spacing.component.xl}`,
    fontSize: SEMANTIC_TOKENS.typography.fontSize.sm,
    gap: SEMANTIC_TOKENS.spacing.component.md,
  },
  xl: {
    padding: `${SEMANTIC_TOKENS.spacing.component.lg} ${SEMANTIC_TOKENS.spacing.component.xl}`,
    fontSize: SEMANTIC_TOKENS.typography.fontSize.base,
    gap: SEMANTIC_TOKENS.spacing.component.md,
  },
};

const variantStyles: Record<string, CSSProperties> = {
  primary: {
    background: SEMANTIC_TOKENS.color.button.primary.bg,
    color: SEMANTIC_TOKENS.color.button.primary.text,
    fontWeight: SEMANTIC_TOKENS.typography.fontWeight.medium,
    boxShadow: SEMANTIC_TOKENS.shadow.sm,
  },
  secondary: {
    background: SEMANTIC_TOKENS.color.bg.interactive.default,
    color: SEMANTIC_TOKENS.color.text.primary,
    border: `${SEMANTIC_TOKENS.border.width.thin} solid ${SEMANTIC_TOKENS.color.border.default}`,
  },
  ghost: {
    background: 'transparent',
    color: SEMANTIC_TOKENS.color.text.secondary,
  },
  danger: {
    background: SEMANTIC_TOKENS.color.text.error,
    color: SEMANTIC_TOKENS.color.button.primary.text,
    fontWeight: SEMANTIC_TOKENS.typography.fontWeight.medium,
  },
  success: {
    background: SEMANTIC_TOKENS.color.text.success,
    color: SEMANTIC_TOKENS.color.button.primary.text,
    fontWeight: SEMANTIC_TOKENS.typography.fontWeight.medium,
  },
};

export const Button = memo(function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  iconPosition = 'left',
  fullWidth = false,
  disabled = false,
  loading = false,
  className = '',
  children,
  onClick,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const baseStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: SEMANTIC_TOKENS.border.radius.sm,
    transition: `all ${SEMANTIC_TOKENS.motion.duration.fast} ease-out`,
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    userSelect: 'none',
    outline: 'none',
    opacity: isDisabled ? 0.5 : 1,
    pointerEvents: isDisabled ? 'none' : 'auto',
    width: fullWidth ? '100%' : 'auto',
    border: 'none',
    ...sizeStyles[size],
    ...variantStyles[variant],
  };

  const getHoverStyle = (variant: string): CSSProperties => {
    switch (variant) {
      case 'primary':
        return { background: SEMANTIC_TOKENS.color.button.primary.hover };
      case 'secondary':
        return {
          background: SEMANTIC_TOKENS.color.bg.interactive.hover,
          borderColor: SEMANTIC_TOKENS.color.border.strong,
        };
      case 'ghost':
        return {
          background: SEMANTIC_TOKENS.color.bg.interactive.default,
          color: SEMANTIC_TOKENS.color.text.primary,
        };
      case 'danger':
        return { background: SEMANTIC_TOKENS.color.button.danger.hover };
      case 'success':
        return { background: SEMANTIC_TOKENS.color.button.success.hover };
      default:
        return {};
    }
  };

  return (
    <button
      type="button"
      style={baseStyle}
      className={className}
      disabled={isDisabled}
      onClick={onClick}
      onMouseEnter={(e) => {
        if (!isDisabled) {
          Object.assign(e.currentTarget.style, getHoverStyle(variant));
        }
      }}
      onMouseLeave={(e) => {
        if (!isDisabled) {
          Object.assign(e.currentTarget.style, variantStyles[variant]);
        }
      }}
    >
      {loading && (
        <svg
          style={{
            animation: 'spin 1s linear infinite',
            height: '16px',
            width: '16px',
          }}
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle
            style={{ opacity: 0.25 }}
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            style={{ opacity: 0.75 }}
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      {!loading && icon && iconPosition === 'left' && icon}
      {children}
      {!loading && icon && iconPosition === 'right' && icon}
    </button>
  );
});
