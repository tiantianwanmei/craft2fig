# ⚡ Quick Start - 5 分钟上手指南

## 🎯 目标

在 5 分钟内为你的应用添加完整的主题切换功能。

## 📦 Step 1: 安装 (30 秒)

```bash
pnpm add @genki/shared-theme
```

## 🎨 Step 2: 包裹应用 (1 分钟)

在 `src/main.tsx` 或 `src/index.tsx` 中：

```tsx
import { ThemeProvider } from '@genki/shared-theme';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ThemeProvider>
    <App />
  </ThemeProvider>
);
```

## 🎛️ Step 3: 添加切换器 (1 分钟)

在任意组件中：

```tsx
import { ThemeSwitcher } from '@genki/shared-theme';

export function Header() {
  return (
    <header>
      <h1>My App</h1>
      <ThemeSwitcher />
    </header>
  );
}
```

## ✅ 完成！

现在你的应用已经支持 5 个主题的零编译切换了！

## 🚀 下一步

- 查看 [README.md](./README.md) 了解完整功能
- 查看 [INTEGRATION.md](./INTEGRATION.md) 了解详细集成步骤
- 查看 [examples/](./examples/) 获取更多示例
