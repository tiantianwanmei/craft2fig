// ============================================================================
// 🎨 UI 主题 Token 系统
// ============================================================================
// 修改这里即可切换整个应用的主题配色

export const THEME_TOKENS = {
  // 主题色 - 科技极客风（青色系）
  primary: {
    50: '#ecfeff',   // cyan-50
    100: '#cffafe',  // cyan-100
    200: '#a5f3fc',  // cyan-200
    300: '#67e8f9',  // cyan-300
    400: '#22d3ee',  // cyan-400
    500: '#06b6d4',  // cyan-500 - 主色
    600: '#0891b2',  // cyan-600
    700: '#0e7490',  // cyan-700
    800: '#155e75',  // cyan-800
    900: '#164e63',  // cyan-900
  },

  // 次要色 - 蓝色
  secondary: {
    400: '#60a5fa',  // blue-400
    500: '#3b82f6',  // blue-500
    600: '#2563eb',  // blue-600
  },

  // 强调色 - 靛蓝
  accent: {
    400: '#818cf8',  // indigo-400
    500: '#6366f1',  // indigo-500
    600: '#4f46e5',  // indigo-600
  },

  // 中性色
  neutral: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
  },

  // 功能色
  success: '#10b981',  // green-500
  warning: '#f59e0b',  // amber-500
  error: '#ef4444',    // red-500
  info: '#3b82f6',     // blue-500

  // 渐变定义
  gradients: {
    primary: 'linear-gradient(to right, #06b6d4, #3b82f6)',      // cyan to blue
    secondary: 'linear-gradient(to right, #3b82f6, #6366f1)',    // blue to indigo
    accent: 'linear-gradient(to right, #22d3ee, #60a5fa)',       // cyan-400 to blue-400
    header: 'linear-gradient(to right, #22d3ee, #60a5fa, #818cf8)', // cyan-blue-indigo
    button: 'linear-gradient(to right, #06b6d4, #3b82f6, #6366f1)', // cyan-blue-indigo
  },

  // 阴影（已禁用发光效果）
  shadows: {
    primary: 'none',
    secondary: 'none',
    glow: 'none',
  },

  // 圆角
  radius: {
    sm: '0.375rem',   // 6px
    md: '0.5rem',     // 8px
    lg: '0.75rem',    // 12px
    xl: '1rem',       // 16px
    '2xl': '1.5rem',  // 24px
    full: '9999px',
  },

  // 边框粗细
  borderWidth: {
    thin: '1px',
    normal: '2px',
    thick: '3px',
  },

  // 间距
  spacing: {
    xs: '0.5rem',   // 8px
    sm: '0.75rem',  // 12px
    md: '1rem',     // 16px
    lg: '1.5rem',   // 24px
    xl: '2rem',     // 32px
  },

  // 字体
  fonts: {
    sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: '"SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace',
    display: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
  },

  // 字号
  fontSize: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem',// 30px
    '4xl': '2.25rem', // 36px
  },

  // 字重
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },

  // 文字颜色
  textColors: {
    primary: '#22d3ee',      // cyan-400
    secondary: '#60a5fa',    // blue-400
    accent: '#818cf8',       // indigo-400
    muted: '#9ca3af',        // gray-400
    subtle: '#6b7280',       // gray-500
    white: '#ffffff',
    black: '#000000',
  },
};

// CSS 变量导出（用于 Tailwind 或直接使用）
export const getCSSVariables = () => ({
  '--color-primary': THEME_TOKENS.primary[500],
  '--color-primary-light': THEME_TOKENS.primary[400],
  '--color-primary-dark': THEME_TOKENS.primary[600],
  '--color-secondary': THEME_TOKENS.secondary[500],
  '--color-accent': THEME_TOKENS.accent[500],
  '--gradient-primary': THEME_TOKENS.gradients.primary,
  '--gradient-button': THEME_TOKENS.gradients.button,
  '--shadow-primary': THEME_TOKENS.shadows.primary,
});

// Tailwind 类名映射（可一键修改所有样式）
export const THEME_CLASSES = {
  // 背景
  bgPrimary: 'bg-cyan-500',
  bgSecondary: 'bg-blue-500',
  bgAccent: 'bg-indigo-500',
  
  // 文字颜色
  textPrimary: 'text-cyan-400',
  textSecondary: 'text-blue-400',
  textAccent: 'text-indigo-400',
  textMuted: 'text-gray-400',
  textSubtle: 'text-gray-500',
  
  // 字体
  fontSans: 'font-sans',
  fontMono: 'font-mono',
  
  // 字号
  textXs: 'text-xs',      // 12px - 用于小标签
  textSm: 'text-sm',      // 14px - 用于按钮、输入框
  textBase: 'text-base',  // 16px - 用于正文
  textLg: 'text-lg',      // 18px - 用于小标题
  textXl: 'text-xl',      // 20px - 用于大标题
  text2xl: 'text-2xl',    // 24px - 用于数字显示
  
  // 字重
  fontNormal: 'font-normal',     // 400
  fontMedium: 'font-medium',     // 500
  fontSemibold: 'font-semibold', // 600
  fontBold: 'font-bold',         // 700
  
  // 边框
  borderPrimary: 'border-cyan-500',
  borderSecondary: 'border-blue-500',
  borderThin: 'border',          // 1px
  borderNormal: 'border-2',      // 2px
  borderThick: 'border-4',       // 4px
  
  // 圆角
  roundedSm: 'rounded',          // 4px
  roundedMd: 'rounded-md',       // 6px
  roundedLg: 'rounded-lg',       // 8px
  roundedXl: 'rounded-xl',       // 12px
  rounded2xl: 'rounded-2xl',     // 16px
  roundedFull: 'rounded-full',   // 完全圆角
  
  // 阴影（已禁用）
  shadowPrimary: '',
  shadowSecondary: '',
  
  // 渐变文字
  gradientText: 'bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent',
  
  // 渐变背景
  gradientBg: 'bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500',
  gradientBgHover: 'hover:from-cyan-600 hover:via-blue-600 hover:to-indigo-600',
  
  // 按钮
  buttonPrimary: 'bg-cyan-500 hover:bg-cyan-600',
  buttonSecondary: 'bg-blue-500 hover:bg-blue-600',
};

// 快速切换主题预设
export const THEME_PRESETS = {
  // 当前：科技极客风（青色）
  geek: {
    name: '科技极客',
    primary: '#06b6d4',
    secondary: '#3b82f6',
    accent: '#6366f1',
  },
  
  // 紫色梦幻风
  dream: {
    name: '紫色梦幻',
    primary: '#a855f7',  // purple-500
    secondary: '#ec4899', // pink-500
    accent: '#f43f5e',   // rose-500
  },
  
  // 绿色自然风
  nature: {
    name: '绿色自然',
    primary: '#10b981',  // emerald-500
    secondary: '#14b8a6', // teal-500
    accent: '#06b6d4',   // cyan-500
  },
  
  // 橙色活力风
  energy: {
    name: '橙色活力',
    primary: '#f97316',  // orange-500
    secondary: '#f59e0b', // amber-500
    accent: '#eab308',   // yellow-500
  },
};
