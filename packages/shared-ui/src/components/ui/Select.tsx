// ============================================================================
// SELECT COMPONENT - 精致的下拉选择器
// ============================================================================
// 设计原则：
// 1. 微交互 - 箭头旋转、hover 状态
// 2. 极简边框 - 使用 slate-200 而非黑色
// 3. 精致图标 - 使用细线条图标

import React, { useState, useRef, useEffect } from 'react';
import { clsx } from 'clsx';

interface SelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

interface SelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Select: React.FC<SelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  disabled = false,
  className,
  size = 'md',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  const sizeStyles = {
    sm: 'px-2.5 py-1.5 text-xs',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-2.5 text-sm',
  };

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className={clsx('relative inline-block', className)}>
      {/* 触发器 */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={clsx(
          'group flex items-center justify-between gap-2 rounded-md border bg-white font-medium transition-all',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2',
          'active:scale-[0.98]',
          sizeStyles[size],
          disabled
            ? 'cursor-not-allowed opacity-50 border-slate-200'
            : 'cursor-pointer border-slate-200 hover:border-slate-300 hover:bg-slate-50',
          isOpen && 'border-slate-300 bg-slate-50'
        )}
      >
        <span className="flex items-center gap-2 text-slate-700">
          {selectedOption?.icon && (
            <span className="h-4 w-4 flex items-center justify-center text-slate-400">
              {selectedOption.icon}
            </span>
          )}
          {selectedOption?.label || placeholder}
        </span>

        {/* 箭头图标 - 精致的 SVG */}
        <svg
          className={clsx(
            'h-3.5 w-3.5 text-slate-400 transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* 下拉菜单 */}
      {isOpen && (
        <div
          className={clsx(
            'absolute z-50 mt-1 w-full min-w-[200px] rounded-lg border border-slate-200 bg-white shadow-lg',
            'animate-in fade-in-0 zoom-in-95 duration-100'
          )}
        >
          <div className="p-1">
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  if (!option.disabled) {
                    onChange(option.value);
                    setIsOpen(false);
                  }
                }}
                disabled={option.disabled}
                className={clsx(
                  'flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900',
                  option.disabled
                    ? 'cursor-not-allowed opacity-50'
                    : 'cursor-pointer hover:bg-slate-100',
                  option.value === value && 'bg-slate-100 font-medium text-slate-900'
                )}
              >
                {option.icon && (
                  <span className="h-4 w-4 flex items-center justify-center text-slate-400">
                    {option.icon}
                  </span>
                )}
                <span className={option.value === value ? 'text-slate-900' : 'text-slate-700'}>
                  {option.label}
                </span>
                {option.value === value && (
                  <svg
                    className="ml-auto h-4 w-4 text-slate-900"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
