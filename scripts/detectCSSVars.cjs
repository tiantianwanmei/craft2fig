/**
 * 检测项目中 CSS 变量使用情况
 */
const fs = require('fs');
const path = require('path');
const glob = require('glob');

const srcDir = path.join(__dirname, '../src');
const files = glob.sync(`${srcDir}/**/*.{ts,tsx}`, {
  ignore: ['**/node_modules/**', '**/*.test.{ts,tsx}', '**/*.old.{ts,tsx}']
});

console.log('🔍 检测 CSS 变量使用情况...\n');

const results = {
  cssVars: [],
  missingImports: [],
  total: 0
};

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf-8');
  const relativePath = path.relative(srcDir, file);

  // 检测 CSS 变量
  const cssVarMatches = content.match(/var\(--[a-z-]+\)/g);
  if (cssVarMatches) {
    results.cssVars.push({
      file: relativePath,
      count: cssVarMatches.length,
      vars: [...new Set(cssVarMatches)]
    });
    results.total += cssVarMatches.length;
  }

  // 检测是否缺少 SEMANTIC_TOKENS 导入
  const hasSemanticTokensUsage = /SEMANTIC_TOKENS\./g.test(content);
  const hasSemanticTokensImport = /from ['"]@genki\/shared-theme['"]/g.test(content);

  if (hasSemanticTokensUsage && !hasSemanticTokensImport) {
    results.missingImports.push(relativePath);
  }
});

console.log('📊 检测结果：\n');
console.log(`总共发现 ${results.total} 处 CSS 变量使用\n`);

if (results.cssVars.length > 0) {
  console.log('📝 使用 CSS 变量的文件：\n');
  results.cssVars.forEach(({ file, count, vars }) => {
    console.log(`  ${file} (${count} 处)`);
    console.log(`    变量: ${vars.slice(0, 3).join(', ')}${vars.length > 3 ? '...' : ''}\n`);
  });
}

if (results.missingImports.length > 0) {
  console.log('\n⚠️  缺少 @genki/shared-theme 导入的文件：\n');
  results.missingImports.forEach(file => {
    console.log(`  ${file}`);
  });
}

console.log('\n✨ 检测完成！');
