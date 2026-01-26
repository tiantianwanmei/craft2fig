/**
 * 批量修复 CSS 变量
 */
const { fixFile } = require('./fixCSSVars.cjs');
const path = require('path');

const filesToFix = [
  // UI 组件
  'src/components/ui/Toggle.tsx',
  'src/components/ui/Tabs.tsx',
  'src/components/ui/Slider.tsx',
  'src/components/ui/Panel.tsx',
  'src/components/ui/LinearTabs.tsx',
  'src/components/ui/Button.tsx',

  // Panel 组件
  'src/components/panels/FoldTab.tsx',
  'src/components/panels/ExportTab.tsx',

  // Layout 组件
  'src/components/layout/StatusBar.tsx',
  'src/components/layout/MainLayout.tsx',
  'src/components/layout/FloatingToolbar.tsx',

  // Canvas 组件
  'src/components/canvas/ViewportArea.tsx',
  'src/components/canvas/SpatialCanvas.tsx',
];

console.log('🔧 开始批量修复 CSS 变量...\n');

let totalFixed = 0;
filesToFix.forEach(file => {
  const fullPath = path.join(__dirname, '..', file);
  const count = fixFile(fullPath);
  totalFixed += count;
});

console.log(`\n✨ 完成！总共修复了 ${totalFixed} 处 CSS 变量`);
