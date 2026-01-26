/**
 * 一键替换所有 CSS 变量为 SEMANTIC_TOKENS/BASE_TOKENS
 * 使用正则表达式批量处理
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// CSS 变量到 Token 的映射规则
const replacementRules = [
  // ========== Spacing ==========
  { pattern: /var\(--p-space-0\.25\)/g, replacement: "SEMANTIC_TOKENS.spacing['0.25']" },
  { pattern: /var\(--p-space-0\.5\)/g, replacement: "SEMANTIC_TOKENS.spacing['0.5']" },
  { pattern: /var\(--p-space-0\.75\)/g, replacement: "SEMANTIC_TOKENS.spacing['0.75']" },
  { pattern: /var\(--p-space-1\.5\)/g, replacement: "SEMANTIC_TOKENS.spacing['1.5']" },
  { pattern: /var\(--p-space-1\.75\)/g, replacement: "SEMANTIC_TOKENS.spacing['1.75']" },
  { pattern: /var\(--p-space-2\.5\)/g, replacement: "SEMANTIC_TOKENS.spacing['2.5']" },
  { pattern: /var\(--p-space-3\.5\)/g, replacement: "SEMANTIC_TOKENS.spacing['3.5']" },
  { pattern: /var\(--p-space-(\d+)\)/g, replacement: "SEMANTIC_TOKENS.spacing['$1']" },

  // ========== Typography ==========
  { pattern: /var\(--p-text-(\d+)\)/g, replacement: "BASE_TOKENS.fontSize[$1]" },
  { pattern: /var\(--p-font-mono\)/g, replacement: "BASE_TOKENS.fontFamily.mono" },
  { pattern: /var\(--p-font-sans\)/g, replacement: "BASE_TOKENS.fontFamily.sans" },

  // ========== Border Radius ==========
  { pattern: /var\(--p-radius-xs\)/g, replacement: "SEMANTIC_TOKENS.border.radius.xs" },
  { pattern: /var\(--p-radius-sm\)/g, replacement: "SEMANTIC_TOKENS.border.radius.sm" },
  { pattern: /var\(--p-radius-md\)/g, replacement: "SEMANTIC_TOKENS.border.radius.md" },
  { pattern: /var\(--p-radius-lg\)/g, replacement: "SEMANTIC_TOKENS.border.radius.lg" },
  { pattern: /var\(--p-radius-xl\)/g, replacement: "SEMANTIC_TOKENS.border.radius.xl" },
  { pattern: /var\(--p-radius-full\)/g, replacement: "SEMANTIC_TOKENS.border.radius.full" },

  // ========== Colors - Alpha White ==========
  { pattern: /var\(--p-alpha-white-95\)/g, replacement: "SEMANTIC_TOKENS.color.text.primary" },
  { pattern: /var\(--p-alpha-white-90\)/g, replacement: "'rgba(255, 255, 255, 0.9)'" },
  { pattern: /var\(--p-alpha-white-80\)/g, replacement: "'rgba(255, 255, 255, 0.8)'" },
  { pattern: /var\(--p-alpha-white-60\)/g, replacement: "SEMANTIC_TOKENS.color.text.secondary" },
  { pattern: /var\(--p-alpha-white-40\)/g, replacement: "SEMANTIC_TOKENS.color.text.tertiary" },
  { pattern: /var\(--p-alpha-white-30\)/g, replacement: "SEMANTIC_TOKENS.color.text.disabled" },
  { pattern: /var\(--p-alpha-white-20\)/g, replacement: "'rgba(255, 255, 255, 0.2)'" },
  { pattern: /var\(--p-alpha-white-15\)/g, replacement: "'rgba(255, 255, 255, 0.15)'" },
  { pattern: /var\(--p-alpha-white-10\)/g, replacement: "SEMANTIC_TOKENS.color.border.default" },
  { pattern: /var\(--p-alpha-white-6\)/g, replacement: "SEMANTIC_TOKENS.color.border.weak" },
  { pattern: /var\(--p-alpha-white-5\)/g, replacement: "SEMANTIC_TOKENS.color.bg.interactive.default" },
  { pattern: /var\(--p-alpha-white-3\)/g, replacement: "'rgba(255, 255, 255, 0.03)'" },

  // ========== Colors - Alpha Black ==========
  { pattern: /var\(--p-alpha-black-98\)/g, replacement: "'rgba(0, 0, 0, 0.98)'" },
  { pattern: /var\(--p-alpha-black-95\)/g, replacement: "'rgba(0, 0, 0, 0.95)'" },
  { pattern: /var\(--p-alpha-black-90\)/g, replacement: "SEMANTIC_TOKENS.color.surface.overlay" },
  { pattern: /var\(--p-alpha-black-75\)/g, replacement: "SEMANTIC_TOKENS.color.bg.surface" },
  { pattern: /var\(--p-alpha-black-60\)/g, replacement: "'rgba(0, 0, 0, 0.6)'" },
  { pattern: /var\(--p-alpha-black-40\)/g, replacement: "'rgba(0, 0, 0, 0.4)'" },
  { pattern: /var\(--p-alpha-black-30\)/g, replacement: "SEMANTIC_TOKENS.color.shadow.medium" },
  { pattern: /var\(--p-alpha-black-20\)/g, replacement: "SEMANTIC_TOKENS.color.shadow.small" },

  // ========== Colors - Cyan ==========
  { pattern: /var\(--p-cyan-500-alpha-50\)/g, replacement: "'rgba(6, 182, 212, 0.5)'" },
  { pattern: /var\(--p-cyan-500-alpha-40\)/g, replacement: "'rgba(6, 182, 212, 0.4)'" },
  { pattern: /var\(--p-cyan-500-alpha-30\)/g, replacement: "'rgba(6, 182, 212, 0.3)'" },
  { pattern: /var\(--p-cyan-500-alpha-20\)/g, replacement: "'rgba(6, 182, 212, 0.2)'" },
  { pattern: /var\(--p-cyan-500-alpha-15\)/g, replacement: "'rgba(6, 182, 212, 0.15)'" },
  { pattern: /var\(--p-cyan-500-alpha-10\)/g, replacement: "'rgba(6, 182, 212, 0.1)'" },
  { pattern: /var\(--p-cyan-400\)/g, replacement: "'rgba(34, 211, 238, 0.9)'" },
  { pattern: /var\(--p-cyan-500\)/g, replacement: "SEMANTIC_TOKENS.color.brand" },
  { pattern: /var\(--p-cyan-600\)/g, replacement: "'#0891b2'" },

  // ========== Colors - Other ==========
  { pattern: /var\(--p-red-500-alpha-30\)/g, replacement: "'rgba(239, 68, 68, 0.3)'" },
  { pattern: /var\(--p-red-500-alpha-10\)/g, replacement: "'rgba(239, 68, 68, 0.1)'" },
  { pattern: /var\(--p-orange-500-alpha-50\)/g, replacement: "'rgba(245, 158, 11, 0.5)'" },
  { pattern: /var\(--p-green-500\)/g, replacement: "SEMANTIC_TOKENS.color.success" },
  { pattern: /var\(--p-white\)/g, replacement: "'#ffffff'" },
  { pattern: /var\(--p-black\)/g, replacement: "'#000000'" },

  // ========== Semantic Colors ==========
  { pattern: /var\(--fg-text-primary\)/g, replacement: "SEMANTIC_TOKENS.color.text.primary" },
  { pattern: /var\(--fg-text-secondary\)/g, replacement: "SEMANTIC_TOKENS.color.text.secondary" },
  { pattern: /var\(--fg-text-tertiary\)/g, replacement: "SEMANTIC_TOKENS.color.text.tertiary" },
  { pattern: /var\(--fg-text-muted\)/g, replacement: "SEMANTIC_TOKENS.color.text.disabled" },
  { pattern: /var\(--bg-interactive-default\)/g, replacement: "SEMANTIC_TOKENS.color.bg.interactive.default" },
  { pattern: /var\(--bg-interactive-hover\)/g, replacement: "SEMANTIC_TOKENS.color.bg.interactive.hover" },
  { pattern: /var\(--bg-interactive-selected\)/g, replacement: "SEMANTIC_TOKENS.color.bg.interactive.selected" },
  { pattern: /var\(--semantic-bg-action-primary-default\)/g, replacement: "SEMANTIC_TOKENS.color.button.primary.bg" },
  { pattern: /var\(--semantic-bg-action-primary-hover\)/g, replacement: "SEMANTIC_TOKENS.color.button.primary.hover" },

  // ========== Motion ==========
  { pattern: /var\(--p-duration-fast\)/g, replacement: "SEMANTIC_TOKENS.motion.duration.fast" },
  { pattern: /var\(--p-duration-base\)/g, replacement: "SEMANTIC_TOKENS.motion.duration.normal" },
];

// 检查文件是否需要添加 import
function needsImport(content) {
  return !content.includes("from '@genki/shared-theme'");
}

// 添加 import 语句
function addImport(content) {
  // 检查是否已有 React import
  const hasReactImport = content.match(/^import.*from ['"]react['"]/m);

  if (hasReactImport) {
    // 在 React import 后添加
    return content.replace(
      /^(import.*from ['"]react['"];?\n)/m,
      "$1import { SEMANTIC_TOKENS, BASE_TOKENS } from '@genki/shared-theme';\n"
    );
  } else {
    // 在文件开头添加
    return "import { SEMANTIC_TOKENS, BASE_TOKENS } from '@genki/shared-theme';\n\n" + content;
  }
}

// 处理单个文件
function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let modified = false;
  let replacementCount = 0;

  // 应用所有替换规则
  replacementRules.forEach(rule => {
    const matches = content.match(rule.pattern);
    if (matches) {
      content = content.replace(rule.pattern, rule.replacement);
      replacementCount += matches.length;
      modified = true;
    }
  });

  // 如果有修改且需要 import，添加 import
  if (modified && needsImport(content)) {
    content = addImport(content);
  }

  // 写回文件
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`✅ ${path.basename(filePath)}: ${replacementCount} 个替换`);
  }

  return replacementCount;
}

// 主函数
function main() {
  const srcDir = path.join(__dirname, '../src');
  const files = glob.sync(`${srcDir}/**/*.{ts,tsx}`, {
    ignore: ['**/node_modules/**', '**/*.test.{ts,tsx}', '**/*.old.{ts,tsx}']
  });

  console.log(`🔍 找到 ${files.length} 个文件\n`);

  let totalReplacements = 0;
  let filesModified = 0;

  files.forEach(file => {
    const count = processFile(file);
    if (count > 0) {
      totalReplacements += count;
      filesModified++;
    }
  });

  console.log(`\n✨ 完成！`);
  console.log(`📝 修改了 ${filesModified} 个文件`);
  console.log(`🔄 总共替换了 ${totalReplacements} 个 CSS 变量`);
}

main();
