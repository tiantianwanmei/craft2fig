// ============================================================================
// 🎨 FIGMA PLUGIN EXAMPLE - Figma 插件集成示例
// ============================================================================
// 这个文件展示了如何在 Figma 插件中使用主题系统

import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider, useTheme, SimpleThemeToggle } from '@genki/shared-theme';

// ============================================================================
// Figma 插件主应用
// ============================================================================

function FigmaPluginApp() {
  const { theme } = useTheme();

  return (
    <div className="w-full h-screen bg-background text-foreground">
      {/* 插件头部 */}
      <PluginHeader />

      {/* 主内容区 */}
      <main className="p-4 space-y-4">
        <PackageGenerator />
        <PreviewPanel />
      </main>

      {/* 底部状态栏 */}
      <StatusBar />
    </div>
  );
}

// ============================================================================
// 插件头部（带主题切换）
// ============================================================================

function PluginHeader() {
  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <span className="text-primary-foreground font-bold">G</span>
        </div>
        <h1 className="font-semibold">Genki Packaging</h1>
      </div>

      {/* 主题切换按钮 */}
      <SimpleThemeToggle />
    </header>
  );
}

// ============================================================================
// 包装生成器
// ============================================================================

function PackageGenerator() {
  const [selectedNode, setSelectedNode] = React.useState<string | null>(null);

  // 与 Figma 插件通信
  const handleGenerate = () => {
    parent.postMessage(
      {
        pluginMessage: {
          type: 'generate-package',
          nodeId: selectedNode,
        },
      },
      '*'
    );
  };

  return (
    <section className="p-4 rounded-lg border border-border bg-card">
      <h2 className="text-lg font-semibold mb-3">生成包装</h2>

      <div className="space-y-3">
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">
            选择的节点
          </label>
          <input
            type="text"
            value={selectedNode || '未选择'}
            readOnly
            className="w-full px-3 py-2 rounded-md border border-input bg-background"
          />
        </div>

        <button
          onClick={handleGenerate}
          disabled={!selectedNode}
          className="w-full px-4 py-2 rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          生成 3D 包装
        </button>
      </div>
    </section>
  );
}

// ============================================================================
// 预览面板
// ============================================================================

function PreviewPanel() {
  const { theme } = useTheme();

  return (
    <section className="p-4 rounded-lg border border-border bg-card">
      <h2 className="text-lg font-semibold mb-3">预览</h2>

      <div className="aspect-video rounded-lg bg-muted flex items-center justify-center">
        <p className="text-muted-foreground">
          {theme === 'dark' ? '🌙 夜间预览模式' : '☀️ 日间预览模式'}
        </p>
      </div>

      <div className="mt-3 flex gap-2">
        <button className="flex-1 px-3 py-2 rounded-md bg-secondary text-secondary-foreground text-sm">
          旋转
        </button>
        <button className="flex-1 px-3 py-2 rounded-md bg-secondary text-secondary-foreground text-sm">
          缩放
        </button>
        <button className="flex-1 px-3 py-2 rounded-md bg-secondary text-secondary-foreground text-sm">
          导出
        </button>
      </div>
    </section>
  );
}

// ============================================================================
// 状态栏
// ============================================================================

function StatusBar() {
  const { theme } = useTheme();

  return (
    <footer className="fixed bottom-0 left-0 right-0 px-4 py-2 border-t border-border bg-card">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>就绪</span>
        <span>主题: {theme}</span>
      </div>
    </footer>
  );
}

// ============================================================================
// 监听 Figma 插件消息
// ============================================================================

function useFigmaMessages() {
  React.useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const { type, data } = event.data.pluginMessage || {};

      switch (type) {
        case 'selection-changed':
          console.log('选择已更改:', data);
          break;
        case 'generation-complete':
          console.log('生成完成:', data);
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);
}

// ============================================================================
// 应用入口（Figma 插件专用）
// ============================================================================

function FigmaPluginRoot() {
  useFigmaMessages();

  return (
    <ThemeProvider
      defaultTheme="light"
      storageKey="genki-figma-plugin-theme"
      enableSync={true}
      enableTransition={true}
    >
      <FigmaPluginApp />
    </ThemeProvider>
  );
}

// 渲染到 Figma 插件 UI
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <FigmaPluginRoot />
  </React.StrictMode>
);

// ============================================================================
// 导出供其他文件使用
// ============================================================================

export { FigmaPluginRoot, FigmaPluginApp };
