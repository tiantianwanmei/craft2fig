# 📚 Examples - 使用示例

本目录包含了 `@genki/shared-theme` 的完整使用示例。

## 📁 文件说明

### 1. [basic-usage.tsx](./basic-usage.tsx)
**基础使用示例** - 展示如何在普通 React 应用中使用主题系统

包含内容：
- ✅ 应用入口配置
- ✅ Header 组件（带主题切换器）
- ✅ 使用 useTheme Hook
- ✅ 主题感知组件
- ✅ 颜色演示面板

适用场景：
- Web 应用
- 管理后台
- 仪表盘

### 2. [figma-plugin.tsx](./figma-plugin.tsx)
**Figma 插件集成示例** - 展示如何在 Figma 插件中使用主题系统

包含内容：
- ✅ Figma 插件入口配置
- ✅ 插件 UI 布局
- ✅ 与 Figma 插件通信
- ✅ 主题切换器集成
- ✅ 状态栏显示

适用场景：
- Figma 插件
- Figma Widget
- 设计工具插件

## 🚀 如何运行示例

### 方式 1: 复制到你的项目

直接复制示例代码到你的项目中，然后根据需要修改。

### 方式 2: 在示例中测试

```bash
# 1. 安装依赖
cd packages/shared-theme
pnpm install

# 2. 构建包
pnpm build

# 3. 在你的项目中引用
pnpm add @genki/shared-theme
```

## 📖 学习路径

### 初学者
1. 阅读 [QUICKSTART.md](../QUICKSTART.md)
2. 查看 [basic-usage.tsx](./basic-usage.tsx)
3. 在你的项目中实践

### 进阶用户
1. 阅读 [INTEGRATION.md](../INTEGRATION.md)
2. 查看 [figma-plugin.tsx](./figma-plugin.tsx)
3. 自定义主题和组件

## 💡 提示

- 所有示例都是完整可运行的代码
- 可以直接复制粘贴到你的项目中
- 根据需要修改样式和功能
- 查看注释了解每个部分的作用

## 🤝 贡献

欢迎提交更多示例！如果你有好的使用案例，请提交 PR。
