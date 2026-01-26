/**
 * 🎨 自动生成 Primitive Tokens CSS
 * 从 @genki/shared-theme 的 BASE_TOKENS 生成 CSS 变量
 *
 * 运行方式：
 * npx tsx scripts/generatePrimitiveTokens.ts
 */

import { BASE_TOKENS } from '@genki/shared-theme';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 生成 CSS 变量
function generatePrimitiveTokensCSS(): string {
  const lines: string[] = [];

  lines.push('/**');
  lines.push(' * 🎨 Primitive Tokens - 原子层');
  lines.push(' * ⚠️ 此文件由 scripts/generatePrimitiveTokens.ts 自动生成');
  lines.push(' * ⚠️ 请勿手动编辑！所有值来自 @genki/shared-theme/BASE_TOKENS');
  lines.push(' */');
  lines.push('');
  lines.push(':root {');

  // 颜色 - Primary (Cyan)
  lines.push('  /* ========== Primary Colors (Cyan) ========== */');
  Object.entries(BASE_TOKENS.colors.primary).forEach(([key, value]) => {
    lines.push(`  --p-cyan-${key}: ${value};`);
  });
  lines.push('');

  // 颜色 - Accent (Blue)
  lines.push('  /* ========== Accent Colors (Blue) ========== */');
  Object.entries(BASE_TOKENS.colors.accent).forEach(([key, value]) => {
    lines.push(`  --p-blue-${key}: ${value};`);
  });
  lines.push('');

  // 颜色 - Success (Green)
  lines.push('  /* ========== Success Colors (Green) ========== */');
  Object.entries(BASE_TOKENS.colors.success).forEach(([key, value]) => {
    lines.push(`  --p-green-${key}: ${value};`);
  });
  lines.push('');

  // 颜色 - Danger/Error (Red)
  lines.push('  /* ========== Error Colors (Red) ========== */');
  Object.entries(BASE_TOKENS.colors.error).forEach(([key, value]) => {
    lines.push(`  --p-red-${key}: ${value};`);
  });
  lines.push('');

  // 颜色 - Warning (Orange)
  lines.push('  /* ========== Warning Colors (Orange) ========== */');
  Object.entries(BASE_TOKENS.colors.orange).forEach(([key, value]) => {
    lines.push(`  --p-orange-${key}: ${value};`);
  });
  lines.push('');

  // 颜色 - Purple
  lines.push('  /* ========== Purple Colors ========== */');
  Object.entries(BASE_TOKENS.colors.purple).forEach(([key, value]) => {
    lines.push(`  --p-purple-${key}: ${value};`);
  });
  lines.push('');

  // 颜色 - Pink
  lines.push('  /* ========== Pink Colors ========== */');
  Object.entries(BASE_TOKENS.colors.pink).forEach(([key, value]) => {
    lines.push(`  --p-pink-${key}: ${value};`);
  });
  lines.push('');

  // 颜色 - Neutral (Gray)
  lines.push('  /* ========== Neutral Colors (Gray) ========== */');
  Object.entries(BASE_TOKENS.colors.neutral).forEach(([key, value]) => {
    lines.push(`  --p-gray-${key}: ${value};`);
  });
  lines.push('');

  // Alpha 颜色
  lines.push('  /* ========== Alpha Colors ========== */');
  Object.entries(BASE_TOKENS.colors.alpha).forEach(([key, value]) => {
    lines.push(`  --p-alpha-${key}: ${value};`);
  });
  lines.push('');

  // 间距
  lines.push('  /* ========== Spacing ========== */');
  Object.entries(BASE_TOKENS.spacing).forEach(([key, value]) => {
    lines.push(`  --p-space-${key}: ${value};`);
  });
  lines.push('');

  // 字体大小
  lines.push('  /* ========== Font Sizes ========== */');
  Object.entries(BASE_TOKENS.fontSize).forEach(([key, value]) => {
    lines.push(`  --p-text-${key}: ${value};`);
  });
  lines.push('');

  // 圆角
  lines.push('  /* ========== Border Radius ========== */');
  Object.entries(BASE_TOKENS.borderRadius).forEach(([key, value]) => {
    lines.push(`  --p-radius-${key}: ${value};`);
  });
  lines.push('');

  // 基础颜色
  lines.push('  /* ========== Base Colors ========== */');
  lines.push(`  --p-white: ${BASE_TOKENS.colors.white};`);
  lines.push(`  --p-black: ${BASE_TOKENS.colors.black};`);

  lines.push('}');
  lines.push('');

  return lines.join('\n');
}

// 主函数
function main() {
  console.log('🎨 生成 Primitive Tokens CSS...');

  const css = generatePrimitiveTokensCSS();
  const outputPath = path.join(__dirname, '../src/styles/tokens-primitive.css');

  fs.writeFileSync(outputPath, css, 'utf-8');

  console.log('✅ 生成成功:', outputPath);
  console.log(`📊 生成了 ${css.split('\n').length} 行 CSS`);
}

main();
