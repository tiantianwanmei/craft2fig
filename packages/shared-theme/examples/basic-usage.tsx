// ============================================================================
// 🎨 BASIC USAGE EXAMPLE - 基础使用示例
// ============================================================================
// 这个文件展示了如何在你的应用中使用主题系统

import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider, useTheme, ThemeSwitcher, SimpleThemeToggle } from '@genki/shared-theme';

// ============================================================================
// 示例 1: 基础应用入口
// ============================================================================

function App() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="container mx-auto p-8">
        <Hero />
        <Features />
        <ThemeDemo />
      </main>
    </div>
  );
}

// ============================================================================
// 示例 2: 带主题切换器的 Header
// ============================================================================

function Header() {
  return (
    <header className="border-b border-border bg-card">
      <div className="container mx-auto flex items-center justify-between p-4">
        <h1 className="text-2xl font-bold">My App</h1>

        {/* 方式 1: 完整的主题选择器 */}
        <ThemeSwitcher variant="buttons" size="md" />

        {/* 方式 2: 简单的亮/暗切换 */}
        {/* <SimpleThemeToggle /> */}
      </div>
    </header>
  );
}

// ============================================================================
// 示例 3: 使用 useTheme Hook
// ============================================================================

function Hero() {
  const { theme, setTheme } = useTheme();

  return (
    <section className="py-12 text-center">
      <h2 className="text-4xl font-bold mb-4">
        Welcome to Theme System
      </h2>
      <p className="text-muted-foreground mb-8">
        当前主题: <span className="font-semibold text-primary">{theme}</span>
      </p>

      <div className="flex gap-4 justify-center">
        <button
          onClick={() => setTheme('light')}
          className="px-6 py-3 rounded-lg bg-primary text-primary-foreground hover:opacity-90"
        >
          Light Mode
        </button>
        <button
          onClick={() => setTheme('dark')}
          className="px-6 py-3 rounded-lg bg-secondary text-secondary-foreground hover:opacity-90"
        >
          Dark Mode
        </button>
        <button
          onClick={() => setTheme('genki')}
          className="px-6 py-3 rounded-lg bg-accent text-accent-foreground hover:opacity-90"
        >
          Genki Mode
        </button>
      </div>
    </section>
  );
}

// ============================================================================
// 示例 4: 主题感知组件
// ============================================================================

function Features() {
  const { theme } = useTheme();

  const features = [
    {
      title: '零编译切换',
      description: '运行时注入 CSS 变量，毫秒级切换',
      icon: '⚡',
    },
    {
      title: '跨标签页同步',
      description: '所有标签页自动同步主题状态',
      icon: '🔄',
    },
    {
      title: 'TypeScript 支持',
      description: '完整的类型定义和智能提示',
      icon: '📘',
    },
  ];

  return (
    <section className="py-12">
      <h3 className="text-3xl font-bold text-center mb-8">核心特性</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {features.map((feature, index) => (
          <div
            key={index}
            className="p-6 rounded-lg border border-border bg-card hover:shadow-lg transition-shadow"
          >
            <div className="text-4xl mb-4">{feature.icon}</div>
            <h4 className="text-xl font-semibold mb-2">{feature.title}</h4>
            <p className="text-muted-foreground">{feature.description}</p>
          </div>
        ))}
      </div>

      {theme === 'dark' && (
        <p className="text-center mt-8 text-muted-foreground">
          🌙 夜间模式已启用
        </p>
      )}
    </section>
  );
}

// ============================================================================
// 示例 5: 主题演示面板
// ============================================================================

function ThemeDemo() {
  const { theme, availableThemes } = useTheme();

  return (
    <section className="py-12">
      <h3 className="text-3xl font-bold text-center mb-8">颜色演示</h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <ColorCard title="Background" className="bg-background border border-border" />
        <ColorCard title="Primary" className="bg-primary text-primary-foreground" />
        <ColorCard title="Secondary" className="bg-secondary text-secondary-foreground" />
        <ColorCard title="Accent" className="bg-accent text-accent-foreground" />
        <ColorCard title="Muted" className="bg-muted text-muted-foreground" />
        <ColorCard title="Card" className="bg-card text-card-foreground border border-border" />
        <ColorCard title="Destructive" className="bg-destructive text-destructive-foreground" />
        <ColorCard title="Popover" className="bg-popover text-popover-foreground border border-border" />
      </div>

      <div className="mt-8 p-6 rounded-lg bg-muted">
        <h4 className="font-semibold mb-2">可用主题:</h4>
        <p className="text-muted-foreground">
          {availableThemes.join(', ')}
        </p>
      </div>
    </section>
  );
}

function ColorCard({ title, className }: { title: string; className: string }) {
  return (
    <div className={`p-6 rounded-lg ${className}`}>
      <p className="font-semibold">{title}</p>
    </div>
  );
}

// ============================================================================
// 应用入口
// ============================================================================

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider
      defaultTheme="light"
      storageKey="example-app-theme"
      enableSync={true}
      enableTransition={true}
    >
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
