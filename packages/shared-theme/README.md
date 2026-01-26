# @genki/shared-theme

🎨 **Genki Design System - Shared Theme & Runtime Theme Switching**

完整的主题系统，支持零编译运行时切换主题，适用于 Monorepo 架构中的所有插件和应用。

## ✨ 核心特性

- ✅ **零编译切换** - 运行时注入 CSS 变量，毫秒级切换
- ✅ **完整 Shadcn 支持** - 包含所有 Shadcn/UI 变量
- ✅ **跨标签页同步** - 使用 localStorage + storage 事件
- ✅ **5 个内置主题** - Light, Dark, Genki Purple, Ocean Blue, Forest Green
- ✅ **TypeScript 完整支持** - 类型安全的主题系统
- ✅ **React Context API** - 简单易用的 Hook
- ✅ **Figma 插件兼容** - 完美适配 Figma iframe 环境

## 📦 安装

```bash
# 在你的插件/应用中安装
pnpm add @genki/shared-theme

# 或者在 Monorepo 根目录
pnpm add @genki/shared-theme --filter your-plugin-name
```

## 🚀 快速开始

### 1. 包裹你的应用

在插件入口文件（例如 `src/main.tsx`）中：

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider } from '@genki/shared-theme';
import App from './App';
import './index.css'; // 包含 Tailwind 指令

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider
      defaultTheme="light"
      storageKey="my-plugin-theme"
      enableSync={true}
      enableTransition={true}
    >
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
```

### 2. 使用主题切换器

在任意组件中添加主题切换器：

```tsx
import { ThemeSwitcher, SimpleThemeToggle } from '@genki/shared-theme';

export function Header() {
  return (
    <header>
      {/* 方式 1: 完整的主题选择器 */}
      <ThemeSwitcher variant="buttons" size="md" />

      {/* 方式 2: 简单的亮/暗切换 */}
      <SimpleThemeToggle />
    </header>
  );
}
```

### 3. 在组件中使用主题

```tsx
import { useTheme } from '@genki/shared-theme';

export function MyComponent() {
  const { theme, setTheme, availableThemes } = useTheme();

  return (
    <div>
      <p>当前主题: {theme}</p>
      <button onClick={() => setTheme('dark')}>切换到暗色</button>
    </div>
  );
}
```

## 🎨 可用主题

| 主题名称 | 描述 | 适用场景 |
|---------|------|---------|
| `light` | 默认浅色主题 | 日间使用 |
| `dark` | 默认深色主题 | 夜间使用 |
| `genki` | Genki 品牌紫色主题 | 品牌展示 |
| `ocean` | 海洋蓝主题 | 清新风格 |
| `forest` | 森林绿主题 | 自然风格 |

## 📚 API 文档

### ThemeProvider Props

```tsx
interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: ThemeName;        // 默认: 'light'
  storageKey?: string;             // 默认: 'genki-ui-theme'
  enableSync?: boolean;            // 默认: true
  enableTransition?: boolean;      // 默认: true
}
```

### useTheme Hook

```tsx
interface ThemeContextType {
  theme: ThemeName;                // 当前主题
  setTheme: (theme: ThemeName) => void;  // 切换主题
  availableThemes: ThemeName[];    // 所有可用主题
}
```

### ThemeSwitcher Props

```tsx
interface ThemeSwitcherProps {
  variant?: 'buttons' | 'dropdown';  // 默认: 'buttons'
  className?: string;
  size?: 'sm' | 'md' | 'lg';        // 默认: 'md'
}
```

## 🔧 高级用法

### 自定义主题

编辑 `packages/shared-theme/src/themes/definitions.ts`：

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

### 监听主题变化

```tsx
useEffect(() => {
  const handleThemeChange = (e: CustomEvent) => {
    console.log('主题已切换:', e.detail.theme);
  };

  window.addEventListener('theme-change', handleThemeChange);
  return () => window.removeEventListener('theme-change', handleThemeChange);
}, []);
```

## 🏗️ 工作原理

1. **CSS 变量注入**: Tailwind 配置使用 `hsl(var(--variable))` 格式
2. **运行时切换**: ThemeProvider 通过 `document.documentElement.style.setProperty()` 注入变量
3. **零编译**: 浏览器自动重绘，无需重新编译 CSS
4. **跨标签页同步**: 使用 `localStorage` + `storage` 事件

## 📝 注意事项

- ✅ 确保你的 `tailwind.config.js` 使用了 CSS 变量格式
- ✅ 在 Figma 插件中完美工作（iframe 环境）
- ✅ 支持 SSR（服务端渲染）
- ✅ 兼容所有现代浏览器

## 🤝 贡献

欢迎提交 Issue 和 PR！

## 📄 License

MIT
