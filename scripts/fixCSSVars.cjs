/**
 * 自动修复 CSS 变量 -> SEMANTIC_TOKENS
 * 分批处理，避免一次性修改过多
 */
const fs = require('fs');
const path = require('path');

// CSS 变量到 SEMANTIC_TOKENS 的映射
const varToTokenMap = {
  // 语义化背景色
  '--semantic-bg-action-primary-default': 'SEMANTIC_TOKENS.color.button.primary.bg',
  '--semantic-bg-action-primary-hover': 'SEMANTIC_TOKENS.color.button.primary.hover',
  '--semantic-bg-action-primary-active': 'SEMANTIC_TOKENS.color.button.primary.bg',
  '--semantic-bg-surface-primary': 'SEMANTIC_TOKENS.color.surface.canvas',
  '--semantic-bg-canvas-default': 'SEMANTIC_TOKENS.color.surface.canvas',

  // 文本颜色
  '--fg-text-primary': 'SEMANTIC_TOKENS.color.text.primary',
  '--fg-text-secondary': 'SEMANTIC_TOKENS.color.text.secondary',
  '--fg-text-tertiary': 'SEMANTIC_TOKENS.color.text.tertiary',
  '--fg-text-muted': 'SEMANTIC_TOKENS.color.text.disabled',
  '--semantic-text-brand': 'SEMANTIC_TOKENS.color.text.brand',

  // 边框
  '--border-divider-default': 'SEMANTIC_TOKENS.color.border.default',
  '--border-divider-weak': 'SEMANTIC_TOKENS.color.border.weak',

  // 圆角
  '--radius-xs': 'SEMANTIC_TOKENS.border.radius.xs',
  '--radius-sm': 'SEMANTIC_TOKENS.border.radius.sm',
  '--radius-md': 'SEMANTIC_TOKENS.border.radius.md',
  '--radius-lg': 'SEMANTIC_TOKENS.border.radius.lg',
  '--p-radius-xs': 'SEMANTIC_TOKENS.border.radius.xs',
  '--p-radius-sm': 'SEMANTIC_TOKENS.border.radius.sm',
  '--p-radius-md': 'SEMANTIC_TOKENS.border.radius.md',

  // 字体大小
  '--p-text-xs': 'SEMANTIC_TOKENS.typography.fontSize.xs',
  '--p-text-sm': 'SEMANTIC_TOKENS.typography.fontSize.sm',
  '--p-text-base': 'SEMANTIC_TOKENS.typography.fontSize.base',

  // 动画时长
  '--p-duration-fast': 'SEMANTIC_TOKENS.motion.duration.fast',
  '--p-duration-base': 'SEMANTIC_TOKENS.motion.duration.normal',

  // 间距
  '--space-sm': 'SEMANTIC_TOKENS.spacing.gap.sm',
  '--space-md': 'SEMANTIC_TOKENS.spacing.gap.md',

  // Header 布局
  '--header-padding-y': 'SEMANTIC_TOKENS.spacing.component.sm',
  '--header-padding-x': 'SEMANTIC_TOKENS.spacing.component.md',
  '--header-icon-size': 'SEMANTIC_TOKENS.spacing[7]',

  // 覆盖层
  '--overlay-white-10': 'SEMANTIC_TOKENS.color.bg.interactive.hover',
};

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let modified = false;
  let count = 0;

  // 替换 var(--xxx) 为 SEMANTIC_TOKENS.xxx
  Object.entries(varToTokenMap).forEach(([cssVar, token]) => {
    const pattern = new RegExp(`var\\(${cssVar.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)`, 'g');
    const matches = content.match(pattern);
    if (matches) {
      content = content.replace(pattern, token);
      count += matches.length;
      modified = true;
    }
  });

  // 确保有 SEMANTIC_TOKENS 导入
  if (modified && !content.includes("from '@genki/shared-theme'")) {
    // 在第一个 import 后添加
    const importMatch = content.match(/^import .+;$/m);
    if (importMatch) {
      const insertPos = content.indexOf(importMatch[0]) + importMatch[0].length;
      content = content.slice(0, insertPos) +
                "\nimport { SEMANTIC_TOKENS } from '@genki/shared-theme';" +
                content.slice(insertPos);
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`✅ ${path.basename(filePath)}: ${count} 处修复`);
  }

  return count;
}

module.exports = { fixFile, varToTokenMap };
