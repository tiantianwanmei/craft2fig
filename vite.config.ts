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
    target: 'esnext', // 🚀 使用最新 JS 特性以获得更好的性能
    outDir: 'dist',
    // 使用 esbuild 压缩（比 terser 快 20-40 倍）
    minify: 'esbuild',
    // CSS 代码分割（减少初始加载）
    cssCodeSplit: false,
    modulePreload: false,
    // 🚀 大资源内联优化（减少网络请求）
    assetsInlineLimit: 100000000,
    // 🚀 增加 chunk 大小警告限制（3D 资源通常较大）
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        format: 'iife',
        inlineDynamicImports: true,
        // 🚀 手动分块优化（更好的缓存策略）
        ...(true
          ? {}
          : {
              manualChunks: (id) => {
                // Three.js 核心库单独打包
                if (id.includes('node_modules/three')) {
                  return 'three';
                }
                // React Three Fiber 生态单独打包
                if (id.includes('@react-three/fiber') || id.includes('@react-three/drei')) {
                  return 'r3f';
                }
                // React 核心和状态管理单独打包
                if (id.includes('node_modules/react') ||
                  id.includes('node_modules/react-dom') ||
                  id.includes('node_modules/zustand')) {
                  return 'vendor';
                }
                // Framer Motion 单独打包
                if (id.includes('node_modules/framer-motion')) {
                  return 'framer';
                }
              },
            }),
      },
    },
    // 启用 gzip 压缩提示
    reportCompressedSize: true
  }
})
