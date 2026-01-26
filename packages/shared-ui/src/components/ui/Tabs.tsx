// ============================================================================
// TABS COMPONENT - Figma 风格的极简 Tabs
// ============================================================================
// 设计原则：
// 1. 去边框化 - 使用下划线而非边框
// 2. 层级分离 - RootTabs 和 NestedTabs 使用不同视觉语言
// 3. 微交互 - 平滑过渡动画

import React from 'react';
import { clsx } from 'clsx';

// ============================================================================
// 一级 Tabs - 顶层导航（Figma 风格）
// ============================================================================

interface RootTab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

interface RootTabsProps {
  tabs: RootTab[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
}

export const RootTabs: React.FC<RootTabsProps> = ({
  tabs,
  activeTab,
  onChange,
  className,
}) => {
  return (
    <div
      className={clsx(
        'flex items-center gap-6 border-b border-slate-100',
        className
      )}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => !tab.disabled && onChange(tab.id)}
          disabled={tab.disabled}
          className={clsx(
            'relative flex items-center gap-2 pb-3 text-sm font-medium transition-colors duration-200',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2',
            activeTab === tab.id
              ? 'text-slate-900'
              : 'text-slate-500 hover:text-slate-700',
            tab.disabled && 'opacity-40 cursor-not-allowed'
          )}
        >
          {tab.icon && (
            <span className="h-4 w-4 flex items-center justify-center">
              {tab.icon}
            </span>
          )}
          {tab.label}

          {/* 激活指示器 - 极简下划线 */}
          {activeTab === tab.id && (
            <span
              className="absolute bottom-0 left-0 h-[2px] w-full bg-slate-900"
              style={{
                animation: 'slideIn 0.2s ease-out',
              }}
            />
          )}
        </button>
      ))}
    </div>
  );
};

// ============================================================================
// 二级 Tabs - 嵌套导航（iOS Segmented Control 风格）
// ============================================================================

interface NestedOption {
  id: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

interface NestedTabsProps {
  options: NestedOption[];
  activeOption: string;
  onChange: (optionId: string) => void;
  className?: string;
  size?: 'sm' | 'md';
}

export const NestedTabs: React.FC<NestedTabsProps> = ({
  options,
  activeOption,
  onChange,
  className,
  size = 'md',
}) => {
  const sizeStyles = {
    sm: 'h-8 text-xs',
    md: 'h-9 text-xs',
  };

  return (
    <div
      className={clsx(
        'inline-flex items-center justify-center rounded-lg bg-slate-100 p-1 text-slate-500',
        sizeStyles[size],
        className
      )}
    >
      {options.map((opt) => (
        <button
          key={opt.id}
          onClick={() => !opt.disabled && onChange(opt.id)}
          disabled={opt.disabled}
          className={clsx(
            'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1 font-medium',
            'ring-offset-white transition-all duration-150',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2',
            'disabled:pointer-events-none disabled:opacity-50',
            activeOption === opt.id
              ? 'bg-white text-slate-950 shadow-sm'
              : 'hover:bg-slate-200/50 hover:text-slate-900'
          )}
        >
          {opt.icon && (
            <span className="h-3.5 w-3.5 flex items-center justify-center">
              {opt.icon}
            </span>
          )}
          {opt.label}
        </button>
      ))}
    </div>
  );
};

// ============================================================================
// 样式注入（用于动画）
// ============================================================================

if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: scaleX(0);
        opacity: 0;
      }
      to {
        transform: scaleX(1);
        opacity: 1;
      }
    }
  `;
  document.head.appendChild(style);
}
