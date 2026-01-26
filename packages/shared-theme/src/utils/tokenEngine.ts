// ============================================================================
// 🔧 TOKEN ENGINE - CSS Variables 生成引擎
// ============================================================================
// 将嵌套的 Token 对象扁平化为 CSS Variables
// 性能最优：CSS Variables 渲染开销极低

import { safeObjectKeys } from './Logger';

/**
 * 扁平化对象工具
 * 
 * @example
 * Input:  { bg: { canvas: { default: '#fff' } } }
 * Output: { '--bg-canvas-default': '#fff' }
 */
export const flattenTokensToCSS = (
  tokens: Record<string, any>,
  prefix = ''
): Record<string, string> => {
  const cssVars: Record<string, string> = {};

  const traverse = (obj: any, path: string[]) => {
    if (!obj || typeof obj !== 'object') return;
    
    const keys = safeObjectKeys(obj);
    keys.forEach(key => {
      const value = obj[key];
      const newPath = [...path, key];
      
      // 如果是对象，继续递归
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        traverse(value, newPath);
      } else {
        // 生成 CSS 变量名：--bg-canvas-default
        const varName = `--${newPath.join('-')}`;
        cssVars[varName] = String(value);
      }
    });
  };

  traverse(tokens, prefix ? [prefix] : []);
  return cssVars;
};

/**
 * 合并多个 Token 对象
 * 
 * @example
 * mergeTokens(colorTokens, layoutTokens, typographyTokens)
 */
export const mergeTokens = (...tokenSets: Record<string, any>[]): Record<string, string> => {
  return tokenSets.reduce((acc, tokens) => {
    return { ...acc, ...flattenTokensToCSS(tokens) };
  }, {});
};

/**
 * 生成 CSS 字符串（用于导出）
 * 
 * @example
 * Output:
 * :root {
 *   --bg-canvas-default: #ffffff;
 *   --fg-text-primary: #171717;
 * }
 */
export const generateCSSString = (cssVars: Record<string, string>): string => {
  const entries = safeObjectKeys(cssVars).map(key => {
    return `  ${key}: ${cssVars[key]};`;
  });
  
  return `:root {\n${entries.join('\n')}\n}`;
};

/**
 * 生成带 Media Queries 的 CSS 字符串
 * 
 * @example
 * generateCSSWithModes({
 *   default: { '--bg': '#fff' },
 *   dark: { '--bg': '#000' },
 *   desktop: { '--gutter': '64px' }
 * })
 */
export const generateCSSWithModes = (modes: {
  default: Record<string, string>;
  dark?: Record<string, string>;
  desktop?: Record<string, string>;
}): string => {
  let css = '';
  
  // Default (Light + Mobile)
  css += generateCSSString(modes.default);
  css += '\n\n';
  
  // Dark Mode
  if (modes.dark) {
    css += '@media (prefers-color-scheme: dark) {\n';
    css += '  :root {\n';
    const darkEntries = safeObjectKeys(modes.dark).map(key => {
      return `    ${key}: ${modes.dark![key]};`;
    });
    css += darkEntries.join('\n');
    css += '\n  }\n';
    css += '}\n\n';
  }
  
  // Desktop Mode
  if (modes.desktop) {
    css += '@media (min-width: 1024px) {\n';
    css += '  :root {\n';
    const desktopEntries = safeObjectKeys(modes.desktop).map(key => {
      return `    ${key}: ${modes.desktop![key]};`;
    });
    css += desktopEntries.join('\n');
    css += '\n  }\n';
    css += '}\n';
  }
  
  return css;
};

/**
 * 从 CSS Variables 中提取值
 * 
 * @example
 * getCSSVariable('--bg-canvas-default') // → '#ffffff'
 */
export const getCSSVariable = (varName: string): string => {
  if (typeof window === 'undefined') return '';
  
  const root = document.documentElement;
  return getComputedStyle(root).getPropertyValue(varName).trim();
};

/**
 * 设置 CSS Variable
 * 
 * @example
 * setCSSVariable('--bg-canvas-default', '#000000')
 */
export const setCSSVariable = (varName: string, value: string): void => {
  if (typeof window === 'undefined') return;
  
  const root = document.documentElement;
  root.style.setProperty(varName, value);
};

/**
 * 批量设置 CSS Variables
 * 
 * @example
 * setCSSVariables({ '--bg': '#fff', '--fg': '#000' })
 */
export const setCSSVariables = (vars: Record<string, string>): void => {
  if (typeof window === 'undefined') return;
  
  const root = document.documentElement;
  const keys = safeObjectKeys(vars);
  
  keys.forEach(key => {
    root.style.setProperty(key, vars[key]);
  });
};
