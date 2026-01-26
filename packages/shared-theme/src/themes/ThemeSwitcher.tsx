// ============================================================================
// 🎨 THEME SWITCHER - Theme Switching Component
// ============================================================================
// 主题切换器组件，提供美观的主题选择界面

import React from 'react';
import { useTheme } from './ThemeProvider';
import { themeDisplayNames, type ThemeName } from './definitions';

/**
 * ThemeSwitcher 配置选项
 */
export interface ThemeSwitcherProps {
  /** 显示模式：按钮组 | 下拉菜单 */
  variant?: 'buttons' | 'dropdown';
  /** 自定义类名 */
  className?: string;
  /** 按钮大小 */
  size?: 'sm' | 'md' | 'lg';
}

/**
 * ThemeSwitcher 组件 - 按钮组模式
 *
 * @example
 * ```tsx
 * import { ThemeSwitcher } from '@genki/shared-theme';
 *
 * function Header() {
 *   return <ThemeSwitcher variant="buttons" />;
 * }
 * ```
 */
export function ThemeSwitcher({
  variant = 'buttons',
  className = '',
  size = 'md',
}: ThemeSwitcherProps) {
  const { theme, setTheme, availableThemes } = useTheme();

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-3 text-base',
  };

  if (variant === 'dropdown') {
    return (
      <select
        value={theme}
        onChange={(e) => setTheme(e.target.value as ThemeName)}
        className={`
          rounded-md border border-input bg-background
          ${sizeClasses[size]}
          focus:outline-none focus:ring-2 focus:ring-ring
          ${className}
        `}
      >
        {availableThemes.map((themeName) => (
          <option key={themeName} value={themeName}>
            {themeDisplayNames[themeName]}
          </option>
        ))}
      </select>
    );
  }

  return (
    <div className={`inline-flex gap-2 rounded-lg bg-muted p-1 ${className}`}>
      {availableThemes.map((themeName) => (
        <button
          key={themeName}
          onClick={() => setTheme(themeName)}
          className={`
            ${sizeClasses[size]}
            rounded-md font-medium transition-all
            ${
              theme === themeName
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }
          `}
        >
          {themeDisplayNames[themeName]}
        </button>
      ))}
    </div>
  );
}

/**
 * SimpleThemeToggle - 简单的亮/暗主题切换按钮
 *
 * @example
 * ```tsx
 * import { SimpleThemeToggle } from '@genki/shared-theme';
 *
 * function Header() {
 *   return <SimpleThemeToggle />;
 * }
 * ```
 */
export function SimpleThemeToggle({ className = '' }: { className?: string }) {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <button
      onClick={toggleTheme}
      className={`
        rounded-md p-2 transition-colors
        hover:bg-accent hover:text-accent-foreground
        ${className}
      `}
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}
