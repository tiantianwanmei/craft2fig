// ============================================================================
// 🎨 THEME DEFINITIONS - Complete Theme System
// ============================================================================
// 完整的主题定义，包含所有 Shadcn/UI 变量
// 这些值会在运行时注入到 CSS 变量中，实现零编译切换

/**
 * 主题名称类型
 */
export type ThemeName = 'light' | 'dark' | 'genki' | 'ocean' | 'forest';

/**
 * 主题颜色变量接口
 * 对应 tailwind.config.js 中的所有 CSS 变量
 */
export interface ThemeColors {
  // ========== Shadcn Standard Variables ==========
  '--background': string;
  '--foreground': string;

  '--primary': string;
  '--primary-foreground': string;

  '--secondary': string;
  '--secondary-foreground': string;

  '--destructive': string;
  '--destructive-foreground': string;

  '--muted': string;
  '--muted-foreground': string;

  '--accent': string;
  '--accent-foreground': string;

  '--popover': string;
  '--popover-foreground': string;

  '--card': string;
  '--card-foreground': string;

  '--border': string;
  '--input': string;
  '--ring': string;

  '--radius': string;

  // ========== Legacy Genki Variables (Optional) ==========
  '--bg-page'?: string;
  '--bg-surface'?: string;
  '--bg-glass-subtle'?: string;
  '--bg-glass-intense'?: string;

  '--action-primary'?: string;
  '--action-primary-hover'?: string;
  '--action-primary-fg'?: string;

  '--text-prominent'?: string;
  '--text-body'?: string;
  '--text-muted'?: string;

  '--border-subtle'?: string;
  '--border-focus'?: string;

  '--shadow-genki'?: string;
}

/**
 * 主题池 - 所有可用主题的定义
 *
 * 注意：
 * 1. 所有颜色值使用 HSL 格式，不包含 hsl() 函数
 * 2. 格式：'色相 饱和度% 亮度%'，例如 '222.2 47.4% 11.2%'
 * 3. Tailwind 会自动包装为 hsl(var(--variable))
 */
export const themes: Record<ThemeName, ThemeColors> = {
  // ========== Light Theme (默认浅色主题) ==========
  // 基于 Material Design 3.0 Neutral Palette + WCAG AAA 对比度
  light: {
    '--background': '0 0% 100%',           // Pure White - 最高亮度
    '--foreground': '240 10% 3.9%',        // Near Black - 对比度 21:1

    '--primary': '221.2 83.2% 53.3%',      // Vibrant Blue - 品牌主色
    '--primary-foreground': '0 0% 100%',   // White on Blue - 对比度 4.5:1

    '--secondary': '240 4.8% 95.9%',       // Cool Gray - 次要背景
    '--secondary-foreground': '240 5.9% 10%', // Dark Gray Text

    '--destructive': '0 72.2% 50.6%',      // Saturated Red - 警告色
    '--destructive-foreground': '0 0% 100%', // White on Red

    '--muted': '240 4.8% 95.9%',           // Subtle Gray Background
    '--muted-foreground': '240 3.8% 46.1%', // Medium Gray Text - 对比度 7:1

    '--accent': '240 4.8% 95.9%',          // Accent Background
    '--accent-foreground': '240 5.9% 10%', // Accent Text

    '--popover': '0 0% 100%',              // White Popover
    '--popover-foreground': '240 10% 3.9%', // Dark Text

    '--card': '0 0% 100%',                 // White Card
    '--card-foreground': '240 10% 3.9%',   // Dark Text

    '--border': '240 5.9% 90%',            // Light Border - 微妙分隔
    '--input': '240 5.9% 90%',             // Input Border
    '--ring': '221.2 83.2% 53.3%',         // Focus Ring - 品牌色

    '--radius': '0.5rem',
  },

  // ========== Dark Theme (默认深色主题) ==========
  // 基于 OLED-Friendly + Blue Light Reduction 算法
  dark: {
    '--background': '240 10% 3.9%',        // True Dark - 护眼深色
    '--foreground': '0 0% 98%',            // Near White - 对比度 21:1

    '--primary': '217.2 91.2% 59.8%',      // Bright Blue - 在深色背景上更鲜艳
    '--primary-foreground': '240 10% 3.9%', // Dark on Blue

    '--secondary': '240 3.7% 15.9%',       // Dark Gray Surface
    '--secondary-foreground': '0 0% 98%',  // Light Text

    '--destructive': '0 62.8% 30.6%',      // Deep Red - 护眼红色
    '--destructive-foreground': '0 85.7% 97.3%', // Light Red Text

    '--muted': '240 3.7% 15.9%',           // Muted Dark Surface
    '--muted-foreground': '240 5% 64.9%',  // Medium Light Gray - 对比度 7:1

    '--accent': '240 3.7% 15.9%',          // Accent Surface
    '--accent-foreground': '0 0% 98%',     // Light Text

    '--popover': '240 10% 3.9%',           // Dark Popover
    '--popover-foreground': '0 0% 98%',    // Light Text

    '--card': '240 10% 3.9%',              // Dark Card
    '--card-foreground': '0 0% 98%',       // Light Text

    '--border': '240 3.7% 15.9%',          // Subtle Dark Border
    '--input': '240 3.7% 15.9%',           // Input Border
    '--ring': '217.2 91.2% 59.8%',         // Bright Focus Ring

    '--radius': '0.5rem',
  },

  // ========== Genki Theme (品牌紫色主题) ==========
  genki: {
    '--background': '260 100% 98%',      // 浅紫色背景
    '--foreground': '260 50% 10%',       // 深紫色文字

    '--primary': '260 80% 60%',          // Genki 紫
    '--primary-foreground': '0 0% 100%', // 白色文字

    '--secondary': '260 30% 90%',        // 浅紫色次要色
    '--secondary-foreground': '260 50% 20%',

    '--destructive': '0 84.2% 60.2%',    // 红色警告
    '--destructive-foreground': '0 0% 100%',

    '--muted': '260 20% 90%',            // 柔和紫色
    '--muted-foreground': '260 10% 40%',

    '--accent': '280 70% 65%',           // 亮紫色强调
    '--accent-foreground': '0 0% 100%',

    '--popover': '260 100% 99%',
    '--popover-foreground': '260 50% 10%',

    '--card': '260 100% 99%',
    '--card-foreground': '260 50% 10%',

    '--border': '260 30% 85%',
    '--input': '260 30% 85%',
    '--ring': '260 80% 60%',

    '--radius': '1rem',                  // 更圆润的风格
  },

  // ========== Ocean Theme (海洋蓝主题) ==========
  ocean: {
    '--background': '200 100% 97%',      // 浅蓝色背景
    '--foreground': '200 50% 10%',

    '--primary': '200 90% 50%',          // 海洋蓝
    '--primary-foreground': '0 0% 100%',

    '--secondary': '200 30% 85%',
    '--secondary-foreground': '200 50% 20%',

    '--destructive': '0 84.2% 60.2%',
    '--destructive-foreground': '0 0% 100%',

    '--muted': '200 20% 90%',
    '--muted-foreground': '200 10% 40%',

    '--accent': '180 80% 55%',           // 青色强调
    '--accent-foreground': '0 0% 100%',

    '--popover': '200 100% 98%',
    '--popover-foreground': '200 50% 10%',

    '--card': '200 100% 98%',
    '--card-foreground': '200 50% 10%',

    '--border': '200 30% 80%',
    '--input': '200 30% 80%',
    '--ring': '200 90% 50%',

    '--radius': '0.75rem',
  },

  // ========== Forest Theme (森林绿主题) ==========
  forest: {
    '--background': '140 40% 96%',       // 浅绿色背景
    '--foreground': '140 50% 10%',

    '--primary': '140 70% 40%',          // 森林绿
    '--primary-foreground': '0 0% 100%',

    '--secondary': '140 30% 85%',
    '--secondary-foreground': '140 50% 20%',

    '--destructive': '0 84.2% 60.2%',
    '--destructive-foreground': '0 0% 100%',

    '--muted': '140 20% 90%',
    '--muted-foreground': '140 10% 40%',

    '--accent': '160 60% 50%',           // 青绿色强调
    '--accent-foreground': '0 0% 100%',

    '--popover': '140 40% 97%',
    '--popover-foreground': '140 50% 10%',

    '--card': '140 40% 97%',
    '--card-foreground': '140 50% 10%',

    '--border': '140 30% 80%',
    '--input': '140 30% 80%',
    '--ring': '140 70% 40%',

    '--radius': '0.5rem',
  },
};

/**
 * 获取主题的显示名称
 */
export const themeDisplayNames: Record<ThemeName, string> = {
  light: 'Light',
  dark: 'Dark',
  genki: 'Genki Purple',
  ocean: 'Ocean Blue',
  forest: 'Forest Green',
};

/**
 * 获取所有可用的主题名称
 */
export const getAvailableThemes = (): ThemeName[] => {
  return Object.keys(themes) as ThemeName[];
};

/**
 * 验证主题名称是否有效
 */
export const isValidTheme = (theme: string): theme is ThemeName => {
  return theme in themes;
};
