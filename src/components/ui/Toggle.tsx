/**
 * 🔀 Toggle - 开关组件
 * 使用 monorepo SEMANTIC_TOKENS 确保设计一致性
 */

import { memo } from 'react';
import { SEMANTIC_TOKENS } from '@genki/shared-theme';
import type { ToggleProps } from '../../types/ui';

export const Toggle = memo(function Toggle({
  checked,
  label,
  labelPosition = 'right',
  disabled = false,
  className = '',
  onChange,
}: ToggleProps) {
  const handleClick = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div
      className={`
        inline-flex items-center gap-2
        ${labelPosition === 'left' ? 'flex-row-reverse' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="switch"
      aria-checked={checked}
      tabIndex={disabled ? -1 : 0}
    >
      <div
        className={`
          relative w-9 h-5 rounded-full
          transition-colors duration-200 ease-out
          ${checked
            ? 'bg-[var(--semantic-bg-action-primary-default)]'
            : 'bg-[var(--overlay-white-10)]'
          }
        `}
      >
        <div
          className={`
            absolute top-0.5 w-4 h-4 rounded-full
            bg-white shadow-md
            transition-transform duration-200 ease-out
            ${checked ? 'translate-x-[18px]' : 'translate-x-0.5'}
          `}
        />
      </div>
      {label && (
        <span
          className={`
            text-xs font-medium
            ${checked ? 'text-[var(--fg-text-primary)]' : 'text-[var(--fg-text-secondary)]'}
            transition-colors duration-150
          `}
        >
          {label}
        </span>
      )}
    </div>
  );
});
