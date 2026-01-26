/**
 * 修复 ViewportArea.tsx 中的 SEMANTIC_TOKENS 引用
 * 将 TypeScript 对象引用改为 CSS 变量
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/components/canvas/ViewportArea.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

// 删除 SEMANTIC_TOKENS 和 BASE_TOKENS 的导入
content = content.replace(
  /import { SEMANTIC_TOKENS, BASE_TOKENS } from '@genki\/shared-theme';?\n?/g,
  ''
);

// 替换 SEMANTIC_TOKENS 的引用
const replacements = [
  // spacing
  [/SEMANTIC_TOKENS\.spacing\['0\.5'\]/g, "'2px'"],
  [/SEMANTIC_TOKENS\.spacing\['1'\]/g, "'4px'"],
  [/SEMANTIC_TOKENS\.spacing\['2'\]/g, "'8px'"],
  [/SEMANTIC_TOKENS\.spacing\['3'\]/g, "'12px'"],

  // border radius
  [/SEMANTIC_TOKENS\.border\.radius\.full/g, "'var(--p-radius-full)'"],
  [/SEMANTIC_TOKENS\.border\.radius\.md/g, "'var(--p-radius-md)'"],

  // border width
  [/SEMANTIC_TOKENS\.border\.width\[1\]/g, "'1px'"],

  // colors
  [/SEMANTIC_TOKENS\.color\.border\.brand/g, "'var(--p-cyan-500)'"],
  [/SEMANTIC_TOKENS\.color\.border\.weak/g, "'var(--p-alpha-white-20)'"],
  [/SEMANTIC_TOKENS\.color\.text\.brand/g, "'var(--p-cyan-500)'"],
  [/SEMANTIC_TOKENS\.color\.text\.tertiary/g, "'var(--p-alpha-white-40)'"],
  [/SEMANTIC_TOKENS\.color\.text\.primary/g, "'var(--p-alpha-white-95)'"],

  // typography
  [/SEMANTIC_TOKENS\.typography\.fontSize\.micro/g, "'var(--p-text-8)'"],
  [/SEMANTIC_TOKENS\.typography\.fontSize\.xs/g, "'var(--p-text-10)'"],
  [/SEMANTIC_TOKENS\.typography\.fontSize\.sm/g, "'var(--p-text-11)'"],
  [/SEMANTIC_TOKENS\.typography\.fontWeight\.bold/g, "700"],
  [/SEMANTIC_TOKENS\.typography\.fontWeight\.semibold/g, "600"],
];

replacements.forEach(([pattern, replacement]) => {
  content = content.replace(pattern, replacement);
});

fs.writeFileSync(filePath, content, 'utf-8');
console.log('✅ ViewportArea.tsx 已修复');
