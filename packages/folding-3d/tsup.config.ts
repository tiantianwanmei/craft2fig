import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: false, // 暂时跳过类型生成
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ['react', 'react-dom', 'three', '@react-three/fiber', '@react-three/drei'],
  treeshake: true,
});
