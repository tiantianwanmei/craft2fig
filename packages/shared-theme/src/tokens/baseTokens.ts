// ============================================================================
// 🎨 BASE TOKEN LIBRARY - Complete Primitive Token System
// ============================================================================
// 这是完整的 Base Token 库，所有 Semantic 和 Component Tokens 都应该引用这里的值

// 内联 safeObjectKeys 以支持 Node.js 脚本环境
const safeObjectKeys = <T extends object>(obj: T | null | undefined): string[] => {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return [];
  }
  try {
    return Object.keys(obj);
  } catch (error) {
    return [];
  }
};

export const BASE_TOKENS = {
  // ========== COLORS ==========
  colors: {
    // Primary Colors (系统默认主色)
    primary: {
      50: '#e0f7ff',
      100: '#b3e9ff',
      200: '#80daff',
      300: '#4dcbff',
      400: '#22d3ee',  // Cyan 400 - 常用高亮色
      500: '#06b6d4',  // Primary color
      600: '#0891b2',
      700: '#0e7490',
      800: '#155e75',
      900: '#164e63',
      // Alpha variants for primary-500
      '500-alpha-50': 'rgba(6, 182, 212, 0.5)',
      '500-alpha-40': 'rgba(6, 182, 212, 0.4)',
      '500-alpha-30': 'rgba(6, 182, 212, 0.3)',
      '500-alpha-20': 'rgba(6, 182, 212, 0.2)',
      '500-alpha-15': 'rgba(6, 182, 212, 0.15)',
      '500-alpha-10': 'rgba(6, 182, 212, 0.1)',
      '500-alpha-5': 'rgba(6, 182, 212, 0.06)',
    },
    
    // Accent Colors
    accent: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',  // Primary accent color
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
    },
    
    // Neutral Colors (for UI)
    neutral: {
      50: '#fafafa',
      100: '#f5f5f5',
      200: '#e5e5e5',
      300: '#d4d4d4',
      400: '#a3a3a3',
      500: '#737373',
      600: '#525252',
      700: '#404040',
      800: '#1a1a1e',  // 修改：用于 secondary bg / canvas bg
      900: '#121214',  // 修改：用于 primary bg / surface bg
      950: '#0a0a0a',
    },
    
    // Semantic Colors
    success: {
      50: '#f0fdf4',
      100: '#dcfce7',
      200: '#bbf7d0',
      300: '#86efac',
      400: '#4ade80',
      500: '#22c55e',
      600: '#16a34a',
      700: '#15803d',
      800: '#166534',
      900: '#14532d',
    },
    
    danger: {
      50: '#fef2f2',
      100: '#fee2e2',
      200: '#fecaca',
      300: '#fca5a5',
      400: '#f87171',
      500: '#ef4444',
      600: '#dc2626',
      700: '#b91c1c',
      800: '#991b1b',
      900: '#7f1d1d',
      // Alpha variants for danger-500
      '500-alpha-30': 'rgba(239, 68, 68, 0.3)',
      '500-alpha-20': 'rgba(239, 68, 68, 0.2)',
      '500-alpha-10': 'rgba(239, 68, 68, 0.1)',
    },

    // Error (alias for danger)
    error: {
      50: '#fef2f2',
      100: '#fee2e2',
      200: '#fecaca',
      300: '#fca5a5',
      400: '#f87171',
      500: '#ef4444',
      600: '#dc2626',
      700: '#b91c1c',
      800: '#991b1b',
      900: '#7f1d1d',
      // Alpha variants for error-500
      '500-alpha-30': 'rgba(239, 68, 68, 0.3)',
      '500-alpha-20': 'rgba(239, 68, 68, 0.2)',
      '500-alpha-10': 'rgba(239, 68, 68, 0.1)',
    },
    
    warning: {
      50: '#fffbeb',
      100: '#fef3c7',
      200: '#fde68a',
      300: '#fcd34d',
      400: '#fbbf24',
      500: '#f59e0b',
      600: '#d97706',
      700: '#b45309',
      800: '#92400e',
      900: '#78350f',
    },
    
    purple: {
      50: '#faf5ff',
      100: '#f3e8ff',
      200: '#e9d5ff',
      300: '#d8b4fe',
      400: '#c084fc',
      500: '#a855f7',
      600: '#9333ea',
      700: '#7e22ce',
      800: '#6b21a8',
      900: '#581c87',
    },

    // Violet (紫罗兰 - 用于凹凸效果)
    violet: {
      50: '#f5f3ff',
      100: '#ede9fe',
      200: '#ddd6fe',
      300: '#c4b5fd',
      400: '#a78bfa',  // 常用于 emboss/deboss
      500: '#8b5cf6',
      600: '#7c3aed',
      700: '#6d28d9',
      800: '#5b21b6',
      900: '#4c1d95',
    },

    // Pink (粉色)
    pink: {
      50: '#fdf2f8',
      100: '#fce7f3',
      200: '#fbcfe8',
      300: '#f9a8d4',
      400: '#f472b6',
      500: '#ec4899',  // 常用于高亮
      600: '#db2777',
      700: '#be185d',
      800: '#9f1239',
      900: '#831843',
    },

    // Orange (橙色 - 用于置换/位移效果)
    orange: {
      50: '#fff7ed',
      100: '#ffedd5',
      200: '#fed7aa',
      300: '#fdba74',
      400: '#fb923c',
      500: '#f59e0b',  // 常用于警告和特殊效果
      600: '#ea580c',
      700: '#c2410c',
      800: '#9a3412',
      900: '#7c2d12',
      // Alpha variants for orange-500
      '500-alpha-50': 'rgba(245, 158, 11, 0.5)',
    },

    // Craft Colors (工艺专用色)
    craft: {
      gold: '#d4a853',        // 烫金
      silver: '#c0c0c0',      // 烫银
      uv: '#18A0FB',          // UV/局部UV
      displacement: '#fa8c4a', // 置换/纹理
    },

    // Base Colors
    white: '#ffffff',
    black: '#000000',
    transparent: 'transparent',
    
    // Alpha Colors (for panels, overlays, etc.)
    alpha: {
      // Dark alphas
      'black-98': 'rgba(15, 15, 15, 0.98)',
      'black-95': 'rgba(15, 15, 15, 0.95)',
      'black-90': 'rgba(0, 0, 0, 0.9)',
      'black-80': 'rgba(0, 0, 0, 0.8)',
      'black-75': 'rgba(15, 15, 15, 0.75)',
      'black-70': 'rgba(0, 0, 0, 0.7)',
      'black-60': 'rgba(0, 0, 0, 0.6)',
      'black-50': 'rgba(0, 0, 0, 0.5)',
      'black-40': 'rgba(0, 0, 0, 0.4)',
      'black-30': 'rgba(0, 0, 0, 0.3)',
      'black-20': 'rgba(0, 0, 0, 0.2)',
      'black-15': 'rgba(0, 0, 0, 0.15)',
      'black-10': 'rgba(0, 0, 0, 0.1)',
      'black-5': 'rgba(0, 0, 0, 0.05)',

      // White alphas
      'white-98': 'rgba(255, 255, 255, 0.98)',
      'white-95': 'rgba(255, 255, 255, 0.95)',
      'white-90': 'rgba(255, 255, 255, 0.9)',
      'white-80': 'rgba(255, 255, 255, 0.8)',
      'white-75': 'rgba(255, 255, 255, 0.75)',
      'white-70': 'rgba(255, 255, 255, 0.7)',
      'white-60': 'rgba(255, 255, 255, 0.6)',
      'white-50': 'rgba(255, 255, 255, 0.5)',
      'white-40': 'rgba(255, 255, 255, 0.4)',
      'white-30': 'rgba(255, 255, 255, 0.3)',
      'white-20': 'rgba(255, 255, 255, 0.2)',
      'white-15': 'rgba(255, 255, 255, 0.15)',
      'white-10': 'rgba(255, 255, 255, 0.1)',
      'white-8': 'rgba(255, 255, 255, 0.08)',   // 新增：用于 default border
      'white-6': 'rgba(255, 255, 255, 0.06)',
      'white-5': 'rgba(255, 255, 255, 0.05)',
      'white-4': 'rgba(255, 255, 255, 0.04)',   // 新增：用于 very weak border
      'white-3': 'rgba(255, 255, 255, 0.03)',
      'white-2': 'rgba(255, 255, 255, 0.02)',
      'white-1': 'rgba(255, 255, 255, 0.01)',
    },
  },
  
  // ========== OPACITY ==========
  opacity: {
    0: '0',
    5: '0.05',
    10: '0.1',
    20: '0.2',
    30: '0.3',
    40: '0.4',
    50: '0.5',
    60: '0.6',
    70: '0.7',
    75: '0.75',
    80: '0.8',
    90: '0.9',
    95: '0.95',
    100: '1',
  },
  
  // ========== BLUR ==========
  blur: {
    none: '0px',
    sm: '4px',
    md: '8px',
    lg: '16px',
    xl: '24px',
    '2xl': '40px',
    '3xl': '64px',
  },
  
  // ========== SPACING ==========
  spacing: {
    '0.25': '1px',
    '0.5': '2px',
    '0.75': '3px',
    0: '0px',
    1: '4px',
    '1.25': '5px',
    '1.5': '6px',
    '1.75': '7px',
    2: '8px',
    '2.5': '10px',
    3: '12px',
    '3.5': '14px',
    4: '16px',
    5: '20px',
    '5.5': '22px',
    6: '24px',
    '6.5': '26px',
    7: '28px',
    '7.25': '29px',
    8: '32px',
    9: '36px',
    10: '40px',
    11: '44px',
    12: '48px',
    13: '52px',
    14: '56px',
    15: '60px',
    16: '64px',
    18: '72px',
    20: '80px',
    24: '96px',
    26: '104px',
    30: '120px',
    32: '128px',
  },
  
  // ========== FONT SIZES ==========
  // 匹配原始 HTML 模板的字体大小定义
  fontSize: {
    micro: '9px',   // --font-size-micro
    xs: '10px',     // --font-size-xs
    sm: '11px',     // --font-size-sm
    md: '12px',     // --font-size-md (base)
    lg: '13px',     // --font-size-lg
    xl: '14px',     // --font-size-xl
    '2xl': '16px',  // --font-size-2xl
    '3xl': '18px',  // --font-size-3xl
    // 保留数字索引以兼容旧代码
    8: '8px',
    9: '9px',
    10: '10px',
    11: '11px',
    12: '12px',
    13: '13px',
    14: '14px',
    16: '16px',
    18: '18px',
    20: '20px',
    24: '24px',
    28: '28px',
    30: '30px',
    32: '32px',
    36: '36px',
    48: '48px',
  },
  
  // ========== ICON SIZES ==========
  iconSize: {
    xs: '12px',
    sm: '16px',
    md: '20px',
    lg: '24px',
    xl: '32px',
    '2xl': '48px',
  },

  // ========== FONT FAMILIES ==========
  fontFamily: {
    sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    mono: "'SF Mono', 'Monaco', 'Cascadia Code', 'Roboto Mono', 'Courier New', monospace",
    display: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },

  // ========== FONT WEIGHTS ==========
  fontWeight: {
    thin: '100',
    extralight: '200',
    light: '300',
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900',
  },
  
  // ========== BORDER RADIUS ==========
  borderRadius: {
    none: '0px',
    xs: '3px',   // 修改：从 2px 改为 3px
    sm: '4px',
    md: '6px',   // 修改：从 8px 改为 6px
    lg: '8px',   // 修改：从 12px 改为 8px
    xl: '12px',  // 修改：从 16px 改为 12px
    '2xl': '24px',
    '3xl': '32px',
    full: '9999px',
  },
  
  // ========== BORDER WIDTH ==========
  borderWidth: {
    0: '0px',
    1: '1px',
    2: '2px',
    3: '3px',
    4: '4px',
    8: '8px',
  },
  
  // ========== SHADOWS ==========
  shadow: {
    none: 'none',
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
  },
  
  // ========== LINE HEIGHT ==========
  lineHeight: {
    none: '1',
    tight: '1.25',
    snug: '1.375',
    normal: '1.5',
    relaxed: '1.625',
    loose: '2',
  },
  
  // ========== LETTER SPACING ==========
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0em',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },

  // ========== MOTION DURATION ==========
  duration: {
    instant: '75ms',
    fast: '150ms',
    base: '200ms',      // 修改：从 250ms 改为 200ms
    slow: '300ms',      // 修改：从 400ms 改为 300ms
    deliberate: '600ms',
  },

  // ========== MOTION EASING ==========
  easing: {
    // 标准缓动
    standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
    decel: 'cubic-bezier(0.0, 0, 0.2, 1)',
    accel: 'cubic-bezier(0.4, 0, 1, 1)',
    sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',

    // Apple 风格缓动
    appleEase: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
    appleSpring: 'cubic-bezier(0.5, 1.5, 0.5, 1)',

    // 弹性缓动
    bounceOut: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    bounceIn: 'cubic-bezier(0.6, -0.28, 0.735, 0.045)',

    // 平滑缓动
    smooth: 'cubic-bezier(0.45, 0, 0.15, 1)',
    silky: 'cubic-bezier(0.35, 0, 0.25, 1)',
  },

  // ========== SPRING CONFIGS (Framer Motion) ==========
  spring: {
    // 柔和弹簧 - 适用于大多数 UI 交互
    gentle: { type: 'spring' as const, stiffness: 120, damping: 14, mass: 1 },

    // 标准弹簧 - 平衡的弹性效果
    default: { type: 'spring' as const, stiffness: 170, damping: 26, mass: 1 },

    // 快速弹簧 - 响应迅速
    snappy: { type: 'spring' as const, stiffness: 300, damping: 30, mass: 1 },

    // 弹跳效果 - 明显的回弹
    bouncy: { type: 'spring' as const, stiffness: 400, damping: 20, mass: 1.5 },

    // 慢速弹簧 - 优雅缓慢
    slow: { type: 'spring' as const, stiffness: 80, damping: 20, mass: 1.2 },

    // 僵硬弹簧 - 几乎无弹性
    stiff: { type: 'spring' as const, stiffness: 500, damping: 40, mass: 0.8 },

    // ========== Linear Style (物理微交互) ==========
    linear: {
      smooth: { type: 'spring' as const, stiffness: 260, damping: 30, mass: 0.8 },
      responsive: { type: 'spring' as const, stiffness: 400, damping: 35, mass: 0.6 },
      layout: { type: 'spring' as const, stiffness: 300, damping: 32, mass: 1 },
      subtle: { type: 'spring' as const, stiffness: 350, damping: 40, mass: 0.5 },
    },

    // ========== Vercel/AI Style (流光科技) ==========
    vercel: {
      transition: { type: 'spring' as const, stiffness: 200, damping: 28, mass: 1 },
      glow: { type: 'spring' as const, stiffness: 150, damping: 25, mass: 1.2 },
      reveal: { type: 'spring' as const, stiffness: 180, damping: 22, mass: 0.9 },
    },
  },

  // ========== Z-INDEX ==========
  zIndex: {
    base: '1',
    sticky: '20',
    popover: '40',
    toast: '60',
    overlay: '80',
    modal: '100',
    tooltip: '120',
  },
};

// 扁平化 Base Tokens 为 key-value 格式
export function flattenBaseTokens(): Record<string, string> {
  const result: Record<string, string> = {};
  
  function flatten(obj: any, prefix = 'base') {
    // 🛡️ 防御性编程：防止 null/undefined 崩溃
    if (!obj || typeof obj !== 'object') {
      // 静默返回，避免在 Node.js 脚本环境中报错
      return;
    }
    
    const keys = safeObjectKeys(obj);
    for (const key of keys) {
      const value = obj[key];
      const newKey = `${prefix}-${key}`;
      
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        flatten(value, newKey);
      } else {
        result[newKey] = String(value);
      }
    }
  }
  
  flatten(BASE_TOKENS);
  return result;
}

// 获取所有 Base Token 的分类列表（用于选择器）
export function getBaseTokenCategories() {
  const result: Array<{ id: string; name: string; tokens: Record<string, string> }> = [];
  
  function flattenCategory(obj: any, categoryId: string, categoryName: string, prefix = '') {
    const tokens: Record<string, string> = {};
    
    function flatten(o: any, p: string) {
      // 🛡️ 防御性编程
      if (!o || typeof o !== 'object') {
        return;
      }
      
      const keys = safeObjectKeys(o);
      for (const key of keys) {
        const value = o[key];
        const newKey = p ? `${p}-${key}` : key;
        
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          flatten(value, newKey);
        } else {
          tokens[newKey] = String(value);
        }
      }
    }
    
    flatten(obj, prefix);
    
    if (safeObjectKeys(tokens).length > 0) {
      result.push({ id: categoryId, name: categoryName, tokens });
    }
  }
  
  const categories = safeObjectKeys(BASE_TOKENS);
  for (const category of categories) {
    flattenCategory(
      BASE_TOKENS[category as keyof typeof BASE_TOKENS],
      category,
      category.charAt(0).toUpperCase() + category.slice(1)
    );
  }
  
  return result;
}
