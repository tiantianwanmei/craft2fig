/**
 * 🎨 Token Generator - 从 @genki/shared-theme 生成 CSS 变量
 * 这个文件将 shared-theme 的 tokens 转换为 CSS 变量
 */

import { BASE_TOKENS } from '@genki/shared-theme';

/**
 * 生成 CSS 变量字符串
 */
export function generateCSSVariables(): string {
  const cssVars: string[] = [
    '/**',
    ' * 🎨 Auto-generated from @genki/shared-theme',
    ' * DO NOT EDIT MANUALLY - Run build script to regenerate',
    ' */',
    '',
    ':root {',
  ];

  // ========== COLORS ==========
  cssVars.push('  /* ========== Colors ========== */');

  // Primary colors
  Object.entries(BASE_TOKENS.colors.primary).forEach(([key, value]) => {
    cssVars.push(`  --color-primary-${key}: ${value};`);
  });

  // Accent colors
  Object.entries(BASE_TOKENS.colors.accent).forEach(([key, value]) => {
    cssVars.push(`  --color-accent-${key}: ${value};`);
  });

  // Neutral colors
  Object.entries(BASE_TOKENS.colors.neutral).forEach(([key, value]) => {
    cssVars.push(`  --color-neutral-${key}: ${value};`);
  });

  cssVars.push('');
  cssVars.push('}');

  return cssVars.join('\n');
}

// 如果直接运行此文件，输出 CSS
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(generateCSSVariables());
}
