// ============================================================================
// 🎨 THEME PROVIDER - Runtime Theme Injection System
// ============================================================================
// 运行时主题注入系统，支持零编译切换主题

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { themes, type ThemeName, type ThemeColors } from './definitions';
import { useTokenStore } from '../store/useTokenStore';

/**
 * 主题上下文类型
 */
export interface ThemeContextType {
  /** 当前主题名称 */
  theme: ThemeName;
  /** 切换主题 */
  setTheme: (theme: ThemeName) => void;
  /** 所有可用主题 */
  availableThemes: ThemeName[];
}

/**
 * 主题上下文
 */
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * ThemeProvider 配置选项
 */
export interface ThemeProviderProps {
  /** 子组件 */
  children: React.ReactNode;
  /** 默认主题 */
  defaultTheme?: ThemeName;
  /** LocalStorage 存储键名 */
  storageKey?: string;
  /** 是否启用跨标签页同步 */
  enableSync?: boolean;
  /** 是否在切换时添加过渡动画 */
  enableTransition?: boolean;
}

/**
 * 注入 CSS 变量到 DOM
 */
const injectThemeVariables = (themeVars: ThemeColors, enableTransition: boolean) => {
  const root = window.document.documentElement;

  // 添加过渡动画（可选）
  if (enableTransition) {
    root.style.transition = 'background-color 0.3s ease, color 0.3s ease';
  }

  // 注入所有 CSS 变量
  Object.entries(themeVars).forEach(([key, value]) => {
    if (value !== undefined) {
      root.style.setProperty(key, value);
    }
  });

  // 移除过渡动画（避免影响其他动画）
  if (enableTransition) {
    setTimeout(() => {
      root.style.transition = '';
    }, 300);
  }
};

/**
 * ThemeProvider 组件
 *
 * @example
 * ```tsx
 * import { ThemeProvider } from '@genki/shared-theme';
 *
 * function App() {
 *   return (
 *     <ThemeProvider defaultTheme="light" storageKey="my-app-theme">
 *       <YourApp />
 *     </ThemeProvider>
 *   );
 * }
 * ```
 */
export function ThemeProvider({
  children,
  defaultTheme = 'dark',
  storageKey = 'genki-ui-theme',
  enableSync = true,
  enableTransition = true,
}: ThemeProviderProps) {
  // 🔥 获取 useTokenStore 的 loadTheme 方法
  const loadTheme = useTokenStore((state) => state.loadTheme);

  // 初始化主题状态（优先使用 defaultTheme，忽略 localStorage）
  const [theme, setThemeState] = useState<ThemeName>(() => {
    if (typeof window === 'undefined') return defaultTheme;

    // 🔥 强制使用 defaultTheme，忽略 localStorage
    // 如果需要恢复 localStorage 功能，取消下面的注释
    // try {
    //   const stored = localStorage.getItem(storageKey);
    //   if (stored && stored in themes) {
    //     return stored as ThemeName;
    //   }
    // } catch (error) {
    //   console.warn('[ThemeProvider] Failed to read from localStorage:', error);
    // }

    return defaultTheme;
  });

  /**
   * 切换主题（带持久化）
   */
  const setTheme = useCallback(
    (newTheme: ThemeName) => {
      if (!(newTheme in themes)) {
        console.warn(`[ThemeProvider] Invalid theme: ${newTheme}`);
        return;
      }

      setThemeState(newTheme);

      // 持久化到 localStorage
      try {
        localStorage.setItem(storageKey, newTheme);
      } catch (error) {
        console.warn('[ThemeProvider] Failed to write to localStorage:', error);
      }
    },
    [storageKey]
  );

  /**
   * 注入主题变量到 DOM
   */
  useEffect(() => {
    const root = window.document.documentElement;

    console.log('[ThemeProvider] 🎨 Theme changed to:', theme);

    // 1. 更新 class（用于 Tailwind dark mode）
    root.classList.remove('light', 'dark', 'genki', 'ocean', 'forest');
    root.classList.add(theme);

    // 特殊处理：如果是 dark 主题，添加 dark class（Tailwind 需要）
    if (theme === 'dark') {
      root.classList.add('dark');
    }

    // 2. 注入 Shadcn CSS 变量
    const themeVars = themes[theme];
    injectThemeVariables(themeVars, enableTransition);

    // 🔥 3. 同步更新 useTokenStore（生成 base-colors 变量）
    console.log('[ThemeProvider] 🔄 Syncing with useTokenStore...');
    loadTheme(theme);

    // 4. 触发自定义事件（供其他组件监听）
    window.dispatchEvent(
      new CustomEvent('theme-change', {
        detail: { theme, themeVars },
      })
    );
  }, [theme, enableTransition, loadTheme]);

  /**
   * 跨标签页同步（监听 storage 事件）
   */
  useEffect(() => {
    if (!enableSync) return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === storageKey && e.newValue && e.newValue in themes) {
        setThemeState(e.newValue as ThemeName);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [storageKey, enableSync]);

  const contextValue: ThemeContextType = {
    theme,
    setTheme,
    availableThemes: Object.keys(themes) as ThemeName[],
  };

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
}

/**
 * useTheme Hook
 *
 * @example
 * ```tsx
 * import { useTheme } from '@genki/shared-theme';
 *
 * function MyComponent() {
 *   const { theme, setTheme } = useTheme();
 *
 *   return (
 *     <button onClick={() => setTheme('dark')}>
 *       Current: {theme}
 *     </button>
 *   );
 * }
 * ```
 */
export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);

  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
}
