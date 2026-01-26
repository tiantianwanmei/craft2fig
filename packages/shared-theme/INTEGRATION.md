# 🚀 集成指南 - 如何在你的插件中使用主题系统

本指南将帮助你在 Monorepo 中的任何插件或应用中集成主题系统。

## 📋 前置条件

确保你的项目已经配置了 Tailwind CSS，并且使用了 CSS 变量格式。

### 检查 tailwind.config.js

你的 `tailwind.config.js` 应该包含类似这样的配置：

```js
export default {
  darkMode: ["class"],
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        // ... 其他颜色
      },
    },
  },
}
```

## 🔧 步骤 1: 安装依赖

在你的插件目录中运行：

```bash
# 如果在 Monorepo 根目录
pnpm add @genki/shared-theme --filter your-plugin-name

# 或者在插件目录中
cd plugins/your-plugin
pnpm add @genki/shared-theme
```

## 🎨 步骤 2: 包裹应用

在你的插件入口文件（通常是 `src/main.tsx` 或 `src/index.tsx`）中：

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider } from '@genki/shared-theme';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider
      defaultTheme="light"
      storageKey="your-plugin-theme"
      enableSync={true}
      enableTransition={true}
    >
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
```

### 配置说明

- `defaultTheme`: 默认主题（'light' | 'dark' | 'genki' | 'ocean' | 'forest'）
- `storageKey`: localStorage 键名（建议使用插件名称）
- `enableSync`: 是否启用跨标签页同步
- `enableTransition`: 是否启用切换动画

## 🎛️ 步骤 3: 添加主题切换器

### 方式 1: 完整的主题选择器

```tsx
import { ThemeSwitcher } from '@genki/shared-theme';

export function Header() {
  return (
    <header className="flex items-center justify-between p-4">
      <h1>My Plugin</h1>
      <ThemeSwitcher variant="buttons" size="md" />
    </header>
  );
}
```

### 方式 2: 简单的亮/暗切换

```tsx
import { SimpleThemeToggle } from '@genki/shared-theme';

export function Toolbar() {
  return (
    <div className="flex gap-2">
      <button>Action 1</button>
      <button>Action 2</button>
      <SimpleThemeToggle />
    </div>
  );
}
```

### 方式 3: 自定义切换器

```tsx
import { useTheme } from '@genki/shared-theme';

export function CustomThemeSwitcher() {
  const { theme, setTheme, availableThemes } = useTheme();

  return (
    <div className="flex gap-2">
      {availableThemes.map((themeName) => (
        <button
          key={themeName}
          onClick={() => setTheme(themeName)}
          className={theme === themeName ? 'active' : ''}
        >
          {themeName}
        </button>
      ))}
    </div>
  );
}
```

## 🎯 步骤 4: 在组件中使用主题

### 获取当前主题

```tsx
import { useTheme } from '@genki/shared-theme';

export function MyComponent() {
  const { theme } = useTheme();

  return (
    <div>
      <p>当前主题: {theme}</p>
      {theme === 'dark' && <p>夜间模式已启用</p>}
    </div>
  );
}
```

### 监听主题变化

```tsx
import { useEffect } from 'react';
import { useTheme } from '@genki/shared-theme';

export function ThemeAwareComponent() {
  const { theme } = useTheme();

  useEffect(() => {
    console.log('主题已切换到:', theme);
    // 执行主题相关的逻辑
  }, [theme]);

  return <div>主题感知组件</div>;
}
```

## 🔥 高级用法

### 1. 监听全局主题变化事件

```tsx
useEffect(() => {
  const handleThemeChange = (e: CustomEvent) => {
    console.log('主题变化:', e.detail.theme);
    console.log('主题变量:', e.detail.themeVars);
  };

  window.addEventListener('theme-change', handleThemeChange as EventListener);
  return () => {
    window.removeEventListener('theme-change', handleThemeChange as EventListener);
  };
}, []);
```

### 2. 条件渲染基于主题

```tsx
import { useTheme } from '@genki/shared-theme';

export function ConditionalComponent() {
  const { theme } = useTheme();

  if (theme === 'dark') {
    return <DarkModeComponent />;
  }

  return <LightModeComponent />;
}
```

### 3. 动态样式基于主题

```tsx
import { useTheme } from '@genki/shared-theme';

export function DynamicStyleComponent() {
  const { theme } = useTheme();

  const styles = {
    light: 'bg-white text-black',
    dark: 'bg-black text-white',
    genki: 'bg-purple-100 text-purple-900',
    ocean: 'bg-blue-100 text-blue-900',
    forest: 'bg-green-100 text-green-900',
  };

  return (
    <div className={styles[theme]}>
      主题特定样式
    </div>
  );
}
```

## 📦 Figma 插件特殊配置

如果你在开发 Figma 插件，确保在 `manifest.json` 中正确配置：

```json
{
  "name": "Your Plugin",
  "ui": "dist/index.html",
  "permissions": ["storage"]
}
```

Figma 插件运行在 iframe 中，主题系统会自动适配。

## 🐛 常见问题

### Q: 主题切换后样式没有变化？

A: 检查以下几点：
1. 确保 Tailwind 配置使用了 `hsl(var(--variable))` 格式
2. 确保 `ThemeProvider` 包裹了整个应用
3. 检查浏览器控制台是否有错误

### Q: 跨标签页同步不工作？

A: 确保：
1. `enableSync={true}` 已设置
2. 使用相同的 `storageKey`
3. 浏览器支持 localStorage 和 storage 事件

### Q: 如何添加自定义主题？

A: 编辑 `packages/shared-theme/src/themes/definitions.ts`：

```tsx
export const themes: Record<ThemeName, ThemeColors> = {
  // ... 现有主题

  custom: {
    '--background': '0 0% 100%',
    '--foreground': '222.2 84% 4.9%',
    // ... 其他变量
  }
};
```

然后重新构建：

```bash
cd packages/shared-theme
pnpm build
```

## ✅ 完整示例

查看 `packages/shared-theme/examples/` 目录获取完整的示例代码。

## 🤝 需要帮助？

如果遇到问题，请查看：
- [README.md](./README.md) - 完整文档
- [GitHub Issues](https://github.com/your-repo/issues) - 提交问题
