/**
 * 🎨 Generate CSS Variables from @genki/shared-theme
 * 将 shared-theme 的 tokens 转换为 CSS 变量文件
 */

import { BASE_TOKENS } from '@genki/shared-theme';
import * as fs from 'fs';
import * as path from 'path';

function generatePrimitiveTokens(): string {
  const lines: string[] = [
    '/**',
    ' * 🎨 Primitive Tokens - Auto-generated from @genki/shared-theme',
    ' * DO NOT EDIT MANUALLY',
    ' */',
    '',
    ':root {',
    '  /* ========== Colors ========== */',
  ];

  // Primary colors
  Object.entries(BASE_TOKENS.colors.primary).forEach(([key, value]) => {
    lines.push(`  --primitive-color-primary-${key}: ${value};`);
  });

  lines.push('');
  lines.push('  /* Accent colors */');
  Object.entries(BASE_TOKENS.colors.accent).forEach(([key, value]) => {
    lines.push(`  --primitive-color-accent-${key}: ${value};`);
  });

  lines.push('');
  lines.push('  /* Neutral colors */');
  Object.entries(BASE_TOKENS.colors.neutral).forEach(([key, value]) => {
    lines.push(`  --primitive-color-neutral-${key}: ${value};`);
  });

  lines.push('');
  lines.push('  /* Success colors */');
  Object.entries(BASE_TOKENS.colors.success).forEach(([key, value]) => {
    lines.push(`  --primitive-color-success-${key}: ${value};`);
  });

  lines.push('');
  lines.push('  /* Danger/Error colors */');
  Object.entries(BASE_TOKENS.colors.danger).forEach(([key, value]) => {
    lines.push(`  --primitive-color-danger-${key}: ${value};`);
  });

  lines.push('');
  lines.push('  /* Warning colors */');
  Object.entries(BASE_TOKENS.colors.warning).forEach(([key, value]) => {
    lines.push(`  --primitive-color-warning-${key}: ${value};`);
  });

  return lines.join('\n');
}
