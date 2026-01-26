// ============================================================================
// TOKEN STATE MACHINE - Zustand Store
// ============================================================================

import { create } from 'zustand';
import { THEME_TOKENS } from '../tokens/tokens';
import { flattenBaseTokens } from '../tokens/baseTokens';
import { Logger, safeObjectKeys } from '../utils/Logger';
import { themes, type ThemeName } from '../themes/definitions';

// ============================================================================
// 🎨 主题颜色映射 - 将 Shadcn 主题转换为 base-colors 格式
// ============================================================================
/**
 * 将 HSL 格式转换为 RGB hex 颜色
 * @param hsl - HSL 字符串，格式：'222.2 84% 4.9%'
 */
const hslToHex = (hsl: string): string => {
  const [h, s, l] = hsl.split(' ').map(v => parseFloat(v));
  const sNorm = s / 100;
  const lNorm = l / 100;

  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lNorm - c / 2;

  let r = 0, g = 0, b = 0;
  if (h >= 0 && h < 60) { r = c; g = x; b = 0; }
  else if (h >= 60 && h < 120) { r = x; g = c; b = 0; }
  else if (h >= 120 && h < 180) { r = 0; g = c; b = x; }
  else if (h >= 180 && h < 240) { r = 0; g = x; b = c; }
  else if (h >= 240 && h < 300) { r = x; g = 0; b = c; }
  else if (h >= 300 && h < 360) { r = c; g = 0; b = x; }

  const toHex = (n: number) => {
    const hex = Math.round((n + m) * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

/**
 * 从 Shadcn 主题生成 base-colors token 映射
 */
const generateThemeColors = (themeName: ThemeName): Record<string, string> => {
  const theme = themes[themeName];
  const isLight = themeName === 'light';

  return {
    // 基础颜色 - 根据主题反转
    'base-colors-white': hslToHex(theme['--foreground']),  // 文字颜色
    'base-colors-black': hslToHex(theme['--background']),  // 背景颜色

    // Neutral 颜色梯度 - 根据主题生成
    'base-colors-neutral-50': isLight ? '#171717' : '#fafafa',
    'base-colors-neutral-100': isLight ? '#262626' : '#f5f5f5',
    'base-colors-neutral-200': isLight ? '#404040' : '#e5e5e5',
    'base-colors-neutral-300': isLight ? '#525252' : '#d4d4d4',
    'base-colors-neutral-400': isLight ? '#737373' : '#a3a3a3',
    'base-colors-neutral-500': isLight ? '#a3a3a3' : '#737373',
    'base-colors-neutral-600': isLight ? '#d4d4d4' : '#525252',
    'base-colors-neutral-700': isLight ? '#e5e5e5' : '#404040',
    'base-colors-neutral-800': isLight ? '#f5f5f5' : '#262626',
    'base-colors-neutral-900': isLight ? '#fafafa' : '#171717',

    // Alpha 颜色 - 根据主题使用不同的半透明色
    'base-colors-alpha-white-5': isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.05)',
    'base-colors-alpha-white-10': isLight ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)',
    'base-colors-alpha-white-15': isLight ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.15)',
    'base-colors-alpha-white-20': isLight ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.2)',
    'base-colors-alpha-white-30': isLight ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.3)',
    'base-colors-alpha-white-40': isLight ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.4)',
    'base-colors-alpha-white-60': isLight ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.6)',
    'base-colors-alpha-white-75': isLight ? 'rgba(0, 0, 0, 0.75)' : 'rgba(255, 255, 255, 0.75)',
    'base-colors-alpha-black-30': isLight ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)',
    'base-colors-alpha-black-75': isLight ? 'rgba(255, 255, 255, 0.75)' : 'rgba(0, 0, 0, 0.75)',
    'base-colors-alpha-black-98': isLight ? 'rgba(255, 255, 255, 0.98)' : 'rgba(0, 0, 0, 0.98)',
  };
};

// 辅助函数：将嵌套对象扁平化为 CSS 变量名
// 例如: { palette: { brand: { 500: '#...' } } } -> "palette-brand-500"
const flattenTokens = (obj: any, prefix = ''): Record<string, string> => {
  // 🛡️ 防御性编程：防止 Object.keys 崩溃
  if (!obj || typeof obj !== 'object') {
    Logger.error('❌ flattenTokens: 无效的对象', obj);
    return {};
  }
  
  return safeObjectKeys(obj).reduce((acc, k) => {
    const pre = prefix.length ? prefix + '-' : '';
    if (typeof obj[k] === 'object' && obj[k] !== null) {
      Object.assign(acc, flattenTokens(obj[k], pre + k));
    } else {
      acc[pre + k] = obj[k];
    }
    return acc;
  }, {} as Record<string, string>);
};

// 辅助函数：将 hex 颜色转换为 RGB
const hexToRgb = (hex: string): string | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : null;
};

// 🔇 已警告的 Token 集合（防止重复警告刷屏）
const warnedTokens = new Set<string>();

// 辅助函数：解析 Token 引用 (例如 "{palette.brand.500}")
// 支持递归解析嵌套引用
const resolveTokenValue = (value: string, allTokens: Record<string, string>, depth = 0): string => {
  if (typeof value !== 'string') return value;
  
  // 防止无限递归
  if (depth > 10) {
    Logger.warn('Token reference depth exceeded:', value);
    return value;
  }
  
  // 特殊处理：检测 rgba 格式中的 hex 颜色 + opacity 组合
  // 例如：rgba({base-colors-primary-500}, {base-opacity-40})
  const rgbaPattern = /^rgba\(\s*\{([^}]+)\}\s*,\s*\{([^}]+)\}\s*\)$/;
  const rgbaMatch = value.match(rgbaPattern);
  
  if (rgbaMatch) {
    const colorRef = rgbaMatch[1];
    const opacityRef = rgbaMatch[2];
    
    // 解析颜色 token
    const colorValue = resolveTokenValue(`{${colorRef}}`, allTokens, depth + 1);
    // 解析透明度 token
    const opacityValue = resolveTokenValue(`{${opacityRef}}`, allTokens, depth + 1);
    
    // 如果颜色是 hex 格式，转换为 RGB
    if (colorValue.startsWith('#')) {
      const rgb = hexToRgb(colorValue);
      if (rgb) {
        return `rgba(${rgb}, ${opacityValue})`;
      }
    } else if (colorValue.includes(',') && !colorValue.includes('rgba')) {
      // 已经是 RGB 格式
      return `rgba(${colorValue}, ${opacityValue})`;
    }
  }
  
  // 如果包含引用
  if (value.includes('{')) {
    const resolved = value.replace(/\{([^}]+)\}/g, (match, ref) => {
      // 尝试多种格式：原始、点转横杠、斜杠转横杠
      const normalizedRef1 = ref.replace(/\./g, '-');
      const normalizedRef2 = ref.replace(/\//g, '-');
      const normalizedRef3 = ref.replace(/[./]/g, '-');
      
      let refKey = ref;
      if (allTokens.hasOwnProperty(ref)) {
        refKey = ref;
      } else if (allTokens.hasOwnProperty(normalizedRef1)) {
        refKey = normalizedRef1;
      } else if (allTokens.hasOwnProperty(normalizedRef2)) {
        refKey = normalizedRef2;
      } else if (allTokens.hasOwnProperty(normalizedRef3)) {
        refKey = normalizedRef3;
      }
      
      const refValue = allTokens[refKey];
      
      if (!refValue) {
        // 🔇 只在第一次遇到缺失的 Token 时警告（防止刷屏）
        if (!warnedTokens.has(refKey)) {
          const availableTokens = safeObjectKeys(allTokens);
          const matchingTokens = availableTokens.filter(k => k.includes(refKey));
          Logger.error('❌ Token reference not found:', ref, '(后续警告已抑制)');
          Logger.log('🔑 Looking for key:', refKey);
          Logger.log('📦 Total tokens available:', availableTokens.length);
          Logger.log('🔍 Matching tokens:', matchingTokens.slice(0, 10));
          Logger.log('💡 First 20 tokens:', availableTokens.slice(0, 20));
          warnedTokens.add(refKey);
        }
        return match; // 返回原始引用，不是整个 value
      }
      
      // 递归解析引用的值
      return resolveTokenValue(refValue, allTokens, depth + 1);
    });
    
    return resolved;
  }
  
  return value;
};

export interface TokenState {
  tokens: Record<string, string>; // 扁平化后的 { "primary-500": "#06b6d4" }
  rawTokens: typeof THEME_TOKENS;
  resolvedTokens: Record<string, string>; // 解析引用后的值
  currentTheme: ThemeName; // 当前主题（支持所有 Monorepo 主题）
  setToken: (path: string, value: string) => void;
  loadTheme: (theme: ThemeName) => void; // 加载主题（支持所有 Monorepo 主题）
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  reset: () => void;
  exportConfig: () => string;
}

// 使用内存存储代替 localStorage（Figma 插件不支持 localStorage）
let memoryStorage: Record<string, string> | null = null;

// Undo/Redo 历史记录
let history: Record<string, string>[] = [];
let historyIndex = -1;
const MAX_HISTORY = 50;

export const useTokenStore = create<TokenState>((set, get) => {
  // 使用内存存储
  let initialFlat = memoryStorage || flattenTokens(THEME_TOKENS);
  
  // ==================== WORLD-CLASS TOKEN SYSTEM (Figma Standard) ====================
  // 3-Layer Architecture: Base → Semantic → Component
  // 使用 {token-name} 语法引用其他 token
  
  // 获取完整的 Base Tokens
  const baseTokens = flattenBaseTokens();
  
  // 创建正确的token映射表
  const tokenMapping: Record<string, string> = {
    // Spacing 映射 - 直接使用baseTokens中的值
    'base-spacing-0': '0px',
    'base-spacing-2': '8px',   // baseTokens.spacing[2]
    'base-spacing-4': '16px',  // baseTokens.spacing[4]
    'base-spacing-6': '24px',  // baseTokens.spacing[6]
    'base-spacing-8': '32px',  // baseTokens.spacing[8]
    'base-spacing-12': '48px', // baseTokens.spacing[12]
    'base-spacing-16': '64px', // baseTokens.spacing[16]
    'base-spacing-20': '80px', // baseTokens.spacing[20]
    'base-spacing-24': '96px', // baseTokens.spacing[24]
    'base-spacing-32': '128px', // baseTokens.spacing[32]
    'base-spacing-40': '160px', // baseTokens.spacing[40]
    'base-spacing-48': '192px', // baseTokens.spacing[48]
    'base-spacing-64': '256px', // baseTokens.spacing[64]
    'base-spacing-80': '320px', // baseTokens.spacing[80]
    'base-spacing-96': '384px', // baseTokens.spacing[96]
    
    // Font Size 映射 - 直接使用baseTokens中的值
    'base-fontSize-9': '9px',
    'base-fontSize-10': '10px',
    'base-fontSize-11': '11px',
    'base-fontSize-12': '12px',
    'base-fontSize-14': '14px',
    'base-fontSize-16': '16px',
    'base-fontSize-18': '18px',
    'base-fontSize-20': '20px',
    'base-fontSize-24': '24px',
    'base-fontSize-28': '28px',
    'base-fontSize-32': '32px',
    'base-fontSize-36': '36px',
    'base-fontSize-40': '40px',
    'base-fontSize-48': '48px',
    
    // Font Weight 映射 - 直接使用baseTokens中的值
    'base-fontWeight-300': '300',
    'base-fontWeight-400': '400', 
    'base-fontWeight-500': '500',
    'base-fontWeight-600': '600',
    'base-fontWeight-700': '700',
    'base-fontWeight-800': '800',
    'base-fontWeight-900': '900',
    
    // Radius 映射 - 直接使用baseTokens中的值
    'base-radius-0': '0px',
    'base-radius-2': '2px',
    'base-radius-4': '4px',
    'base-radius-6': '8px',
    'base-radius-8': '12px',
    'base-radius-12': '16px',
    'base-radius-16': '24px',
    'base-radius-20': '32px',
    'base-radius-24': '32px',
    'base-radius-full': '9999px',
    
    // Border Width 映射
    'base-borderWidth-0': '0px',
    'base-borderWidth-1': '1px',
    'base-borderWidth-2': '2px',
    'base-borderWidth-4': '4px',
    'base-borderWidth-8': '8px',
    
    // Opacity 映射
    'base-opacity-0': '0',
    'base-opacity-10': '0.1',
    'base-opacity-20': '0.2',
    'base-opacity-30': '0.3',
    'base-opacity-40': '0.4',
    'base-opacity-50': '0.5',
    'base-opacity-60': '0.6',
    'base-opacity-70': '0.7',
    'base-opacity-80': '0.8',
    'base-opacity-90': '0.9',
    'base-opacity-100': '1',
    
    // Shadow 映射
    'base-shadow-none': 'none',
    'base-shadow-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    'base-shadow-md': '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    'base-shadow-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    'base-shadow-xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    'base-shadow-2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    
    // Line Height 映射
    'base-lineHeight-tight': '1.25',
    'base-lineHeight-normal': '1.5',
    'base-lineHeight-relaxed': '1.625',
    'base-lineHeight-loose': '2',
  };
  
  // 自动为空的basetoken填充默认值
  Object.entries(tokenMapping).forEach(([key, value]) => {
    if (!initialFlat[key] || initialFlat[key] === '') {
      initialFlat[key] = value;
    }
  });
  
  // 为其他basetoken填充默认值（颜色等）
  Object.entries(baseTokens).forEach(([key, value]) => {
    if (!initialFlat[key] || initialFlat[key] === '') {
      initialFlat[key] = value;
    }
  });
  
  const componentTokenDefaults: Record<string, string> = {
    // ========== LAYER 1.5: Layout / Motion / Icon Primitives ==========
    'space/stack/xxs': '{base-spacing-0.5}',
    'space/stack/xs': '{base-spacing-1}',
    'space/stack/sm': '{base-spacing-1.5}',
    'space/stack/md': '{base-spacing-2}',
    'space/stack/lg': '{base-spacing-3}',
    'space/stack/xl': '{base-spacing-4}',
    'space/inset/xs': '{base-spacing-1}',
    'space/inset/sm': '{base-spacing-2}',
    'space/inset/md': '{base-spacing-3}',
    'space/inset/lg': '{base-spacing-4}',
    'space/inset/xl': '{base-spacing-5}',
    'space/section/md': '{base-spacing-6}',
    'dimension/icon/xs': '{base-iconSize-xs}',
    'dimension/icon/sm': '{base-iconSize-sm}',
    'dimension/icon/md': '{base-iconSize-md}',
    'dimension/icon/lg': '{base-iconSize-lg}',
    'dimension/icon/xl': '{base-iconSize-xl}',
    'motion/duration/instant': '{base-duration-instant}',
    'motion/duration/fast': '{base-duration-fast}',
    'motion/duration/base': '{base-duration-base}',
    'motion/duration/slow': '{base-duration-slow}',
    'motion/duration/deliberate': '{base-duration-deliberate}',
    'motion/easing/standard': '{base-easing-standard}',
    'motion/easing/decel': '{base-easing-decel}',
    'motion/easing/accel': '{base-easing-accel}',
    'motion/easing/sharp': '{base-easing-sharp}',
    'layer/z/panel': '{base-zIndex-overlay}',
    'layer/z/dialog': '{base-zIndex-modal}',
    'layer/z/tooltip': '{base-zIndex-tooltip}',
    
    // ========== UI-SPECIFIC TOKENS (不在 Base Tokens 中的特殊 UI Token) ==========
    'primitive-bg-panel': '{base-colors-alpha-black-75}',
    'primitive-bg-panel-solid': '{base-colors-alpha-black-98}',
    'primitive-bg-input': '{base-colors-alpha-black-30}',
    'primitive-bg-hover': '{base-colors-alpha-white-5}',
    'primitive-bg-hover-strong': '{base-colors-alpha-white-10}',
    'primitive-bg-subtle': '{base-colors-alpha-white-3}',
    'primitive-bg-subtle-2': '{base-colors-alpha-white-2}',
    'primitive-border-default': '{base-colors-alpha-white-10}',
    'primitive-border-subtle': '{base-colors-alpha-white-6}',
    'primitive-border-strong': '{base-colors-alpha-white-15}',
    'primitive-shadow-panel': '-10px 0 40px rgba(0, 0, 0, 0.5)',
    'primitive-shadow-panel-strong': '0 20px 60px rgba(0, 0, 0, 0.5)',
    'primitive-shadow-focus': '0 0 0 3px rgba(6, 182, 212, 0.1)',
    'primitive-gradient-brand': 'linear-gradient(to right, {base-colors-primary-500}, {base-colors-accent-500})',
    
    // ========== LAYER 2: Semantic Tokens（语义层）==========
    // 引用 Base Tokens，定义语义用途
    
    // Text Semantic Tokens
    'text/primary': '{base-colors-white}',
    'text/secondary': '{base-colors-neutral-400}',
    'text/muted': '{base-colors-neutral-300}',
    'text/brand': '{base-colors-primary-400}',
    'text/accent': '{base-colors-accent-500}',
    'state/success/background': '{base-colors-success-500}',
    'state/success/border': '{base-colors-success-600}',
    'state/success/text': '{base-colors-white}',
    'state/warning/background': '{base-colors-warning-500}',
    'state/warning/border': '{base-colors-warning-600}',
    'state/warning/text': '{base-colors-black}',
    'state/danger/background': '{base-colors-danger-500}',
    'state/danger/border': '{base-colors-danger-600}',
    'state/danger/text': '{base-colors-white}',
    'state/info/background': '{base-colors-accent-500}',
    'state/info/border': '{base-colors-accent-600}',
    'state/info/text': '{base-colors-white}',
    
    // Surface Semantic Tokens
    'surface/default': '{base-colors-neutral-900}',
    'surface/brand': '{base-colors-primary-500}',
    'surface/accent': '{base-colors-accent-500}',
    'surface/border': '{base-colors-neutral-800}',
    'surface/border-hover': '{base-colors-neutral-700}',
    'surface/border-focus': '{base-colors-primary-500}',
    
    'type-scale/display-large': '{base-fontSize-24}',
    'type-scale/headline-large': '{base-fontSize-18}',
    'type-scale/headline-medium': '{base-fontSize-16}',
    'type-scale/title-medium': '{base-fontSize-14}',
    'type-scale/body-medium': '{base-fontSize-14}',
    'type-scale/label-small': '{base-fontSize-10}',
    
    'weight/regular': '{base-fontWeight-regular}',
    'weight/medium': '{base-fontWeight-medium}',
    'weight/semibold': '{base-fontWeight-semibold}',
    'weight/bold': '{base-fontWeight-bold}',
    
    'radius/default': '{base-borderRadius-md}',
    'spacing/default': '{base-spacing-4}',
    
    // UI Semantic Tokens
    'ui/text-primary': '{text/primary}',
    'ui/text-secondary': '{text/secondary}',
    'ui/text-muted': '{text/muted}',
    'ui/text-brand': '{text/brand}',
    'ui/bg-panel': '{primitive-bg-panel}',
    'ui/bg-panel-solid': '{primitive-bg-panel-solid}',
    'ui/bg-input': '{primitive-bg-input}',
    'ui/bg-hover': '{primitive-bg-hover}',
    'ui/bg-hover-strong': '{primitive-bg-hover-strong}',
    'ui/bg-subtle': '{primitive-bg-subtle}',
    'ui/bg-brand': '{surface/brand}',
    'ui/bg-accent': '{surface/accent}',
    'ui/border-default': '{primitive-border-default}',
    'ui/border-subtle': '{primitive-border-subtle}',
    'ui/border-strong': '{primitive-border-strong}',
    'ui/border-hover': '{surface/border-hover}',
    'ui/border-focus': '{surface/border-focus}',
    'ui/shadow-panel': '{primitive-shadow-panel}',
    'ui/shadow-panel-strong': '{primitive-shadow-panel-strong}',
    'ui/shadow-focus': '{primitive-shadow-focus}',
    'ui/fontSize-xs': '{base-fontSize-10}',
    'ui/fontSize-sm': '{base-fontSize-11}',
    'ui/fontSize-md': '{base-fontSize-14}',
    'ui/fontSize-lg': '{base-fontSize-16}',
    'ui/spacing-xs': '{base-spacing-1}',
    'ui/spacing-sm': '{base-spacing-3}',
    'ui/spacing-md': '{base-spacing-5}',
    'ui/spacing-lg': '{base-spacing-6}',
    'ui/radius-sm': '{base-borderRadius-sm}',
    'ui/radius-md': '{base-borderRadius-md}',
    'ui/radius-lg': '{base-borderRadius-lg}',
    'ui/opacity-hover': '{base-opacity-5}',
    'ui/blur-panel': '{base-blur-lg}',
    'ui/gradient-brand': '{primitive-gradient-brand}',
    
    // Shared UI Semantic Tokens (共用语义 tokens)
    'shared-color-text-primary': '{base-colors-white}',
    'shared-color-text-secondary': '{base-colors-alpha-white-60}',
    'shared-color-text-muted': '{base-colors-alpha-white-40}',
    'shared-color-text-brand': '{base-colors-primary-400}',
    'shared-color-background': '{base-colors-alpha-black-30}',
    'shared-color-background-hover': '{base-colors-alpha-white-5}',
    'shared-color-background-elevated': 'rgba(30, 30, 30, 0.95)',
    'shared-color-background-panel': 'rgba(20, 20, 20, 0.95)',
    'shared-color-background-card': 'rgba(25, 25, 25, 0.95)',
    'shared-color-border': '{base-colors-alpha-white-10}',
    'shared-color-border-focus': '{base-colors-primary-500}',
    'shared-color-divider': '{base-colors-alpha-white-6}',
    
    // 通用组件元素 (所有插件统一使用)
    'shared-arrow-fontSize': '8px',
    'shared-arrow-color': '{base-colors-alpha-white-40}',
    'shared-arrow-width': '8px',
    'shared-arrow-transition': '0.15s',
    'shared-collapsible-padding': '8px',
    'shared-collapsible-gap': '6px',
    'shared-collapsible-borderRadius': '{base-borderRadius-sm}',
    'shared-collapsible-border': '{base-colors-alpha-white-6}',
    'shared-collapsible-title-fontSize': '{base-fontSize-11}',
    'shared-collapsible-count-fontSize': '9px',
    'shared-collapsible-count-padding': '4px 4px 1px 4px',
    
    'shared-fontSize-xs': '{base-fontSize-10}',
    'shared-fontSize-sm': '{base-fontSize-11}',
    'shared-fontSize-md': '{base-fontSize-14}',
    'shared-fontWeight-regular': '{base-fontWeight-regular}',
    'shared-fontWeight-medium': '{base-fontWeight-medium}',
    'shared-fontWeight-semibold': '{base-fontWeight-semibold}',
    'shared-fontWeight-bold': '{base-fontWeight-bold}',
    'shared-spacing-xs': '{base-spacing-1}',
    'shared-spacing-sm': '{base-spacing-2}',
    'shared-spacing-md': '{base-spacing-3}',
    'shared-spacing-lg': '{base-spacing-4}',
    'shared-radius-sm': '{base-borderRadius-sm}',
    'shared-radius-md': '{base-borderRadius-md}',
    'shared-radius-lg': '{base-borderRadius-lg}',
    'layout/stack/gap-sm': '{space/stack/sm}',
    'layout/stack/gap-md': '{space/stack/md}',
    'layout/inset/panel': '{space/inset/lg}',
    'layout/inset/card': '{space/inset/md}',
    'control/input/background': '{ui/bg-input}',
    'control/input/border': '{ui/border-default}',
    'control/input/borderFocus': '{ui/border-focus}',
    'control/input/text': '{ui/text-primary}',
    
    // ========== LAYER 3: Component Tokens（组件层）==========
    // 引用 Semantic Tokens，定义组件特定样式
    
    // Info Card Component
    'infoCard-container-background-default': '{surface/default}',
    'infoCard-container-borderRadius-default': '{radius/default}',
    'infoCard-container-padding-default': '{spacing/default}',
    'infoCard-container-border-default': '{surface/border}',
    'infoCard-label-fontSize-default': '{type-scale/label-small}',
    'infoCard-label-fontWeight-default': '{weight/regular}',
    'infoCard-label-color-default': '{text/secondary}',
    'infoCard-value-fontSize-default': '{type-scale/display-large}',
    'infoCard-value-fontWeight-default': '{weight/bold}',
    'infoCard-value-color-default': '{text/accent}',
    'infoCard-unit-fontSize-default': '{type-scale/label-small}',
    'infoCard-unit-fontWeight-default': '{weight/regular}',
    'infoCard-unit-color-default': '{text/secondary}',
    
    // Button Primary Component
    'button-primary-background-default': '{ui/gradient-brand}',
    'button-primary-fontSize-default': '{type-scale/headline-medium}',
    'button-primary-fontWeight-default': '{weight/semibold}',
    'button-primary-color-default': '{text/primary}',
    'button-primary-borderRadius-default': '{radius/default}',
    'button-primary-padding-default': '{spacing/default}',
    
    // Title Component
    'title-h1-fontSize-default': '{type-scale/headline-large}',
    'title-h1-fontWeight-default': '{weight/bold}',
    'title-h1-color-default': '{text/brand}',
    'title-caption-fontSize-default': '{type-scale/label-small}',
    'title-caption-fontWeight-default': '{weight/regular}',
    'title-caption-color-default': '{text/secondary}',
    
    // UI Controls
    'ui-button-secondary-fontSize-default': '{base-fontSize-11}',
    'ui-button-secondary-fontWeight-default': '{weight/medium}',
    'ui-button-secondary-color-default': '{text/primary}',
    
    'ui-label-fontSize-default': '{type-scale/title-medium}',
    'ui-label-fontWeight-default': '{weight/regular}',
    'ui-label-color-default': '{text/primary}',
    
    'ui-caption-fontSize-default': '{type-scale/label-small}',
    'ui-caption-fontWeight-default': '{weight/regular}',
    'ui-caption-color-default': '{text/secondary}',
    
    // Panel Component Tokens (面板组件 - 统一三个面板的样式)
    'panel-background': '{base-colors-alpha-black-75}',
    'panel-border': '{base-colors-alpha-white-10}',
    'panel-border-radius': '{base-borderRadius-md}',
    'panel-shadow': '-10px 0 40px rgba(0, 0, 0, 0.5)',
    'panel-blur': '{base-blur-xl}',
    'panel-width': '280px',
    'panel-padding': '{base-spacing-4}',
    'panel-header-padding': '12px 16px',
    'panel-header-border': '{base-colors-alpha-white-10}',
    'panel-title-fontSize': '{base-fontSize-14}',
    'panel-title-fontWeight': '{base-fontWeight-semibold}',
    'panel-title-color': '{base-colors-white}',
    'panel-subtitle-fontSize': '{base-fontSize-10}',
    'panel-subtitle-color': '{base-colors-alpha-white-40}',
    'panel-button-width': '24px',
    'panel-button-height': '24px',
    'panel-button-radius': '{base-borderRadius-sm}',
    'panel-button-background': '{base-colors-alpha-white-5}',
    'panel-button-border': '{base-colors-alpha-white-10}',
    'panel-button-color': '{base-colors-white}',
    'panel-button-fontSize': '12px',
    'panel-button-gap': '6px',
    'panel-section-border': '{base-colors-alpha-white-10}',
    'panel-section-padding': '8px 0',
    'panel-section-fontSize': '{base-fontSize-11}',
    'panel-section-fontWeight': '{base-fontWeight-semibold}',
    
    // 常用的带透明度的颜色 Token（可在组件中引用）
    'color/bg-dark-75': 'rgba({base-colors-neutral-900}, {base-opacity-75})',
    'color/bg-dark-90': 'rgba({base-colors-neutral-900}, {base-opacity-90})',
    'color/bg-dark-50': 'rgba({base-colors-neutral-900}, {base-opacity-50})',
    'color/bg-purple-30': 'rgba({base-colors-purple-500}, {base-opacity-30})',
    'color/bg-purple-20': 'rgba({base-colors-purple-500}, {base-opacity-20})',
    
    // TokenTuner Panel (Token 调节器面板) - 统一设计面板紫色风格
    // 背景使用 token 引用：rgba(颜色RGB, 透明度)
    'tokenTuner-panel-background': '{color/bg-dark-75}',
    'tokenTuner-panel-border': '{color/bg-purple-30}',
    'tokenTuner-panel-shadow': '-10px 0 40px rgba(139, 92, 246, 0.3)',
    'tokenTuner-panel-blur': '{base-blur-2xl}',
    'tokenTuner-panel-width': '320px',
    'tokenTuner-panel-minWidth': '280px',
    'tokenTuner-panel-maxWidth': '600px',
    'tokenTuner-title-fontSize': '{base-fontSize-14}',
    'tokenTuner-title-fontWeight': '{base-fontWeight-600}',
    'tokenTuner-title-color': '#a78bfa',
    'tokenTuner-label-fontSize': '{base-fontSize-10}',
    'tokenTuner-label-color': '#c4b5fd',
    'tokenTuner-input-fontSize': '{base-fontSize-10}',
    'tokenTuner-input-background': 'rgba(255, 255, 255, 0.05)',
    'tokenTuner-input-border': 'rgba(255, 255, 255, 0.1)',
    'tokenTuner-input-borderFocus': '#8b5cf6',
    'tokenTuner-input-text': '{ui/text-primary}',
    'tokenTuner-input-padding': '{base-spacing-8}',
    'tokenTuner-hover-background': 'rgba(255, 255, 255, 0.05)',
    'tokenTuner-selected-background': '#8b5cf6',
    'tokenTuner-selected-border': '#8b5cf6',
    'tokenTuner-selected-text': 'white',
    'tokenTuner-padding-x': '{space/inset/md}',
    'tokenTuner-padding-y': '{space/inset/sm}',
    'tokenTuner-section-gap': '{space/stack/sm}',
    'tokenTuner-input-gap': '{layout/stack/gap-sm}',
    'tokenTuner-preset-margin-top': '{space/stack/sm}',
    'tokenTuner-preset-gap': '{layout/stack/gap-sm}',
    'tokenTuner-preset-item-gap': '{space/stack/xs}',
    'tokenTuner-button-gap': '{layout/stack/gap-sm}',
    'tokenTuner-button-brand-background': '{ui/gradient-brand}',
    'tokenTuner-button-brand-text': '{text/primary}',
    'tokenTuner-reset-color': 'rgba(239, 68, 68, 0.8)',
    'tokenTuner-reset-border': 'rgba(239, 68, 68, 0.3)',
    'tokenTuner-reset-hover-background': 'rgba(239, 68, 68, 0.2)',
    'tokenTuner-preset-text': '{text/primary}',
    'tokenTuner-scale-generator-background': 'rgba(6, 182, 212, 0.05)',
    'tokenTuner-pinned-border': 'rgba(6, 182, 212, 0.5)',
    'tokenTuner-pinned-background': 'rgba(6, 182, 212, 0.1)',
    'tokenTuner-arrow-color': '{ui/text-secondary}',
    'tokenTuner-count-background': '{ui/bg-input}',
    'tokenTuner-count-color': '{ui/text-secondary}',
    'tokenTuner-description-background': '{ui/bg-input}',
    'tokenTuner-description-color': '{ui/text-secondary}',
    'tokenTuner-export-shadow': '0 2px 8px rgba(6, 182, 212, 0.3)',
    'tokenTuner-undo-background-active': 'rgba(255, 255, 255, 0.1)',
    'tokenTuner-undo-background-disabled': 'rgba(255, 255, 255, 0.05)',
    'tokenTuner-undo-border': 'rgba(255, 255, 255, 0.1)',
    
    // TokenBindingSelector Component
    'tokenBindingSelector-background': 'rgba(17, 24, 39, 1)', // bg-gray-900
    'tokenBindingSelector-border': 'rgba(55, 65, 81, 1)', // border-gray-700
    'tokenBindingSelector-item-hover': 'rgba(6, 182, 212, 0.1)', // hover:bg-cyan-500/10
    'tokenBindingSelector-item-selected': 'rgba(6, 182, 212, 0.2)', // bg-cyan-500/20
    'tokenBindingSelector-text-primary': 'rgba(255, 255, 255, 1)', // text-white
    'tokenBindingSelector-text-secondary': 'rgba(156, 163, 175, 1)', // text-gray-400
    'tokenBindingSelector-text-selected': 'rgba(34, 211, 238, 1)', // text-cyan-400
    'tokenBindingSelector-color-preview-border': 'rgba(75, 85, 99, 1)', // border-gray-600
    
    // Scale Generator (梯度生成器) Component
    'scaleGenerator-colorPicker-size': '{base-spacing-8}',
    'scaleGenerator-colorPicker-border': '{base-colors-primary-500}',
    'scaleGenerator-colorPicker-borderWidth': '2px',
    'scaleGenerator-input-background': '{base-colors-black}',
    'scaleGenerator-input-border': '{base-colors-neutral-700}',
    'scaleGenerator-input-text': '{text/primary}',
    'scaleGenerator-input-placeholder': '{base-colors-primary-500}',
    'scaleGenerator-input-fontSize': '{base-fontSize-12}',
    'scaleGenerator-input-padding-x': '{space/inset/sm}',
    'scaleGenerator-input-padding-y': '{space/inset/xs}',
    'scaleGenerator-button-fontSize': '{base-fontSize-12}',
    'scaleGenerator-button-padding-x': '{space/inset/md}',
    'scaleGenerator-button-padding-y': '{space/inset/sm}',
    'scaleGenerator-button-text': '🚀 生成梯度',
    'scaleGenerator-button-background': '{ui/gradient-brand}',
    'scaleGenerator-button-color': '{text/primary}',
    
    // Token Item (单个 Token 项) Component
    'tokenItem-hover-background': 'rgba(255, 255, 255, 0.05)',
    'tokenItem-gap': '{layout/stack/gap-sm}',
    'tokenItem-margin-bottom': '{space/stack/xs}',
    'tokenItem-padding-x': '{space/inset/md}',
    'tokenItem-padding-y': '{space/inset/sm}',
    'tokenItem-label-color': '{base-colors-neutral-400}',
    'tokenItem-label-fontSize': '{base-fontSize-10}',
    'tokenItem-label-minWidth': '{base-spacing-15}',
    'tokenItem-colorPicker-size': '{dimension/icon/lg}',
    'tokenItem-colorPicker-border': '{base-colors-neutral-900}',
    'tokenItem-input-background': '{base-colors-black}',
    'tokenItem-input-border': '{base-colors-neutral-900}',
    'tokenItem-input-text': '{base-colors-white}',
    'tokenItem-input-fontSize': '{base-fontSize-10}',
    'tokenItem-input-padding-x': '{space/inset/sm}',
    'tokenItem-input-padding-y': '{space/inset/xs}',
    'tokenItem-input-borderRadius': '{base-borderRadius-sm}',
    'tokenItem-input-focusShadow': '0 0 0 3px rgba(6, 182, 212, 0.1)',
    
    // Collapsible Group (折叠组) Component
    'collapsibleGroup-margin-bottom': '{space/stack/xs}',
    'collapsibleGroup-margin-left-perLevel': '{space/stack/sm}',
    'collapsibleGroup-padding-x': '{layout/inset/panel}',
    'collapsibleGroup-padding-y': '{space/inset/md}',
    'collapsibleGroup-hover-background': '{ui/bg-hover}',
    'collapsibleGroup-border-radius': '{base-borderRadius-lg}',
    'collapsibleGroup-arrow-fontSize': '{base-fontSize-12}',
    'collapsibleGroup-arrow-color': '{ui/text-secondary}',
    'collapsibleGroup-title-fontSize': '{base-fontSize-14}',
    'collapsibleGroup-title-color-level0': '{text/brand}',
    'collapsibleGroup-title-color': '{ui/text-primary}',
    'collapsibleGroup-description-fontSize': '{base-fontSize-10}',
    'collapsibleGroup-description-padding-x': '{base-spacing-8}',
    'collapsibleGroup-description-padding-y': '{base-spacing-2}',
    'collapsibleGroup-description-background': '{ui/bg-input}',
    'collapsibleGroup-description-color': '{ui/text-secondary}',
    'collapsibleGroup-count-fontSize': '{base-fontSize-10}',
    'collapsibleGroup-count-padding-x': '{base-spacing-8}',
    'collapsibleGroup-count-padding-y': '{base-spacing-4}',
    'collapsibleGroup-count-background': '{ui/bg-input}',
    'collapsibleGroup-count-color': '{ui/text-secondary}',
    'collapsibleGroup-content-margin-top': '{space/stack/xs}',
    'collapsibleGroup-content-padding-left': '{space/inset/md}',
    'collapsibleGroup-gap': '{layout/stack/gap-sm}',
  };
  
  // 合并默认值（只添加不存在的）
  initialFlat = { ...initialFlat, ...componentTokenDefaults };
  
  // 初始化历史记录
  if (history.length === 0) {
    history = [{ ...initialFlat }];
    historyIndex = 0;
  }
  
  return {
    rawTokens: THEME_TOKENS,
    tokens: initialFlat,
    resolvedTokens: Object.fromEntries(
      Object.entries(initialFlat).map(([k, v]) => [k, resolveTokenValue(String(v), initialFlat)])
    ),
    currentTheme: 'dark' as 'light' | 'dark',

    loadTheme: (theme: ThemeName) => {
      set((state) => {
        console.log('[useTokenStore] 🎨 Loading theme from @genki/shared-theme:', theme);

        // 使用 Monorepo 统一的主题系统
        const themeColors = generateThemeColors(theme);
        const newTokens = { ...state.tokens, ...themeColors };
        const resolved = Object.fromEntries(
          Object.entries(newTokens).map(([k, v]) => [k, resolveTokenValue(String(v), newTokens)])
        );

        console.log('[useTokenStore] ✅ Theme loaded, updated tokens:', Object.keys(themeColors).length);
        console.log('[useTokenStore] 📦 Sample colors:', {
          'base-colors-white': themeColors['base-colors-white'],
          'base-colors-black': themeColors['base-colors-black'],
        });

        return {
          tokens: newTokens,
          resolvedTokens: resolved,
          currentTheme: theme,
        };
      });
    },

    setToken: (key, value) => {
      set((state) => {
        const newTokens = { ...state.tokens, [key]: value };
        // 重新解析所有引用
        const resolved = Object.fromEntries(
          Object.entries(newTokens).map(([k, v]) => [k, resolveTokenValue(String(v), newTokens)])
        );
        
        // 保存到内存
        memoryStorage = newTokens;
        
        // 添加到历史记录
        historyIndex++;
        history = history.slice(0, historyIndex);
        history.push({ ...newTokens });
        if (history.length > MAX_HISTORY) {
          history.shift();
          historyIndex--;
        }
        
        return {
          tokens: newTokens,
          resolvedTokens: resolved,
        };
      });
    },
    
    undo: () => {
      if (historyIndex > 0) {
        historyIndex--;
        const tokens = { ...history[historyIndex] };
        const resolved = Object.fromEntries(
          Object.entries(tokens).map(([k, v]) => [k, resolveTokenValue(String(v), tokens)])
        );
        memoryStorage = tokens;
        set({ tokens, resolvedTokens: resolved });
      }
    },
    
    redo: () => {
      if (historyIndex < history.length - 1) {
        historyIndex++;
        const tokens = { ...history[historyIndex] };
        const resolved = Object.fromEntries(
          Object.entries(tokens).map(([k, v]) => [k, resolveTokenValue(String(v), tokens)])
        );
        memoryStorage = tokens;
        set({ tokens, resolvedTokens: resolved });
      }
    },
    
    canUndo: () => historyIndex > 0,
    canRedo: () => historyIndex < history.length - 1,

    reset: () => {
      // 重新构建完整的初始 tokens（包括 componentTokenDefaults）
      let initialFlat = flattenTokens(THEME_TOKENS);
      initialFlat = { ...componentTokenDefaults, ...initialFlat };
      
      // 清除内存存储和历史
      memoryStorage = null;
      history = [{ ...initialFlat }];
      historyIndex = 0;
      
      set({
        tokens: initialFlat,
        resolvedTokens: Object.fromEntries(
          Object.entries(initialFlat).map(([k, v]) => [k, resolveTokenValue(String(v), initialFlat)])
        ),
      });
    },

    exportConfig: () => {
      const state = get();
      return JSON.stringify(state.tokens, null, 2);
    }
  };
});
