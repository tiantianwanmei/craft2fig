// ============================================================================
// BUTTON COMPONENT - 基于 @genki/shared-theme 的科学架构按钮
// ============================================================================

import React from 'react';
import { clsx } from 'clsx';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  loading?: boolean;
  asChild?: boolean;
  children: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    variant = 'primary',
    size = 'md',
    icon,
    iconPosition = 'left',
    fullWidth = false,
    loading = false,
    asChild,
    className = '',
    disabled,
    children,
    ...props
  }, ref) => {
    // 基础样式 - 添加微交互
    const baseStyles = 'inline-flex items-center justify-center rounded-[var(--radius-sm)] font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--semantic-bg-action-primary-default)] disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]';

    // 变体样式 - 使用 semantic tokens
    const variantStyles = {
      primary: 'bg-[var(--semantic-bg-action-primary-default)] hover:bg-[var(--semantic-bg-action-primary-hover)] active:bg-[var(--semantic-bg-action-primary-active)] text-white shadow-sm hover:shadow',
      secondary: 'bg-[var(--bg-interactive-default)] hover:bg-[var(--overlay-white-10)] active:bg-[var(--overlay-white-5)] text-[var(--fg-text-primary)] border border-[var(--border-interactive-default)] hover:border-[var(--border-interactive-hover)]',
      ghost: 'bg-transparent hover:bg-[var(--overlay-white-5)] active:bg-[var(--overlay-white-10)] text-[var(--fg-text-secondary)] hover:text-[var(--fg-text-primary)]',
      danger: 'bg-[var(--semantic-status-error)] hover:bg-[var(--semantic-status-error-dark)] text-white font-medium',
      success: 'bg-[var(--semantic-status-success)] hover:bg-[var(--semantic-color-green-dark)] text-white font-medium',
    };

    // 尺寸样式 - 使用 spacing tokens
    const sizeStyles = {
      xs: 'px-2 py-1 text-[var(--p-text-xs)] gap-1',
      sm: 'px-2.5 py-1.5 text-[var(--p-text-xs)] gap-1.5',
      md: 'px-3 py-2 text-[var(--p-text-sm)] gap-2',
      lg: 'px-4 py-2.5 text-[var(--p-text-sm)] gap-2',
      xl: 'px-5 py-3 text-[var(--p-text-base)] gap-2.5',
    };

    const combinedClassName = clsx(
      baseStyles,
      variantStyles[variant],
      sizeStyles[size],
      fullWidth && 'w-full',
      className
    );

    const isDisabled = disabled || loading;

    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children as React.ReactElement, {
        className: combinedClassName,
        ref,
        ...props,
      });
    }

    return (
      <button ref={ref} className={combinedClassName} disabled={isDisabled} {...props}>
        {loading && (
          <svg
            className="animate-spin h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
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
  }
);

Button.displayName = 'Button';
