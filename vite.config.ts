import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// https://vite.dev/config/
// 注意：Figma 插件必须使用单文件 HTML，因为 Figma 沙盒环境不支持多文件加载
export default defineConfig({
  plugins: [
    react(),
    viteSingleFile()
  ],
  resolve: {
    // 🔥 关键修复：确保 React 只有一个实例，防止 useState 冲突
    dedupe: ['react', 'react-dom']
  },
  build: {
    target: 'es2017',
    outDir: 'dist',
    // 使用 esbuild 压缩（比 terser 快 20-40 倍）
    minify: 'esbuild',
    // CSS 代码分割（减少初始加载）
    cssCodeSplit: false,
    modulePreload: false,
    rollupOptions: {
      output: {
        format: 'iife',
        inlineDynamicImports: true,
      },
    },
    // 启用 gzip 压缩提示
    reportCompressedSize: true
  }
})
