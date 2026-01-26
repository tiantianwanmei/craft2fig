# Changelog

All notable changes to `@genki/shared-theme` will be documented in this file.

## [1.0.0] - 2026-01-22

### 🎉 Initial Release

#### ✨ Features

- **Runtime Theme Switching** - 零编译主题切换系统
  - 支持 5 个内置主题：Light, Dark, Genki Purple, Ocean Blue, Forest Green
  - 运行时注入 CSS 变量，毫秒级切换
  - 完整的 Shadcn/UI 变量支持

- **ThemeProvider Component** - React Context 主题提供者
  - 支持默认主题配置
  - LocalStorage 持久化
  - 跨标签页同步
  - 可选的切换动画

- **Theme Switcher Components** - 主题切换器组件
  - `ThemeSwitcher` - 完整的主题选择器（按钮组/下拉菜单）
  - `SimpleThemeToggle` - 简单的亮/暗切换按钮
  - 支持自定义样式和尺寸

- **useTheme Hook** - 主题管理 Hook
  - 获取当前主题
  - 切换主题
  - 获取所有可用主题

#### 📚 Documentation

- 完整的 README.md
- 集成指南 (INTEGRATION.md)
- 使用示例 (examples/)
  - 基础使用示例
  - Figma 插件集成示例

#### 🔧 Technical

- TypeScript 完整支持
- ESM + CJS 双格式输出
- Tree-shakable
- 零依赖（除了 React peer dependency）

#### 🎨 Themes

- **Light** - 默认浅色主题
- **Dark** - 默认深色主题
- **Genki** - 品牌紫色主题
- **Ocean** - 海洋蓝主题
- **Forest** - 森林绿主题

#### 🚀 Performance

- 运行时切换 < 10ms
- 包体积 < 60KB (未压缩)
- 支持 Code Splitting

#### 🔒 Compatibility

- React 18+
- 所有现代浏览器
- Figma 插件环境
- SSR 兼容

---

## Future Plans

### [1.1.0] - Planned

- [ ] 主题预览功能
- [ ] 自定义主题生成器
- [ ] 主题导入/导出
- [ ] 更多内置主题

### [1.2.0] - Planned

- [ ] 动画效果配置
- [ ] 主题调度（按时间自动切换）
- [ ] 系统主题跟随
- [ ] 主题分析工具
