const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

// 读取打包好的 HTML 文件
const htmlPath = path.join(__dirname, 'dist', 'index.html');
let html = fs.readFileSync(htmlPath, 'utf-8');

// Figma UI 沙盒对 ESM/modulepreload 支持不稳定：强制降级为 classic script
html = html
  .replaceAll(' type="module"', '')
  .replaceAll('type="module"', '')
  .replace(/<link\s+[^>]*rel="modulepreload"[^>]*>/g, '');

// 构建插件代码,使用 esbuild 直接编译 TypeScript 并注入 HTML
esbuild.build({
  entryPoints: ['src/plugin/code.ts'],
  bundle: true,
  outfile: 'dist/code.js',
  format: 'iife',
  target: 'es2017',
  loader: { '.ts': 'ts' },
  define: {
    '__html__': JSON.stringify(html),
  },
}).then(() => {
  console.log('✅ Plugin built successfully with injected HTML');
}).catch((err) => {
  console.error('❌ Plugin build failed:', err);
  process.exit(1);
});
