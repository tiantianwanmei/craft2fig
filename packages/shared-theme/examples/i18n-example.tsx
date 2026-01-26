// ============================================================================
// i18n 集成示例 - 完整的插件多语言实现
// ============================================================================

import React from 'react';
import ReactDOM from 'react-dom/client';
import {
  LanguageProvider,
  LanguageSwitcher,
  useLanguage,
  baseTranslations,
  mergeTranslations,
  ThemeProvider,
} from '@genki/shared-theme';

// ============================================================================
// 步骤 1: 定义插件特有的翻译词条
// ============================================================================

const pluginTranslations = mergeTranslations(baseTranslations, {
  // 插件标题和描述
  'plugin.title': { en: '3D Box Generator', zh: '3D 盒子生成器' },
  'plugin.subtitle': { en: 'Create packaging designs', zh: '创建包装设计' },

  // 功能按钮
  'plugin.generate': { en: 'Generate Box', zh: '生成盒子' },
  'plugin.export': { en: 'Export to PNG', zh: '导出为 PNG' },
  'plugin.preview': { en: 'Preview 3D', zh: '预览 3D' },

  // 设置面板
  'settings.dimensions': { en: 'Dimensions', zh: '尺寸' },
  'settings.width': { en: 'Width', zh: '宽度' },
  'settings.height': { en: 'Height', zh: '高度' },
  'settings.depth': { en: 'Depth', zh: '深度' },
  'settings.material': { en: 'Material', zh: '材质' },
  'settings.color': { en: 'Color', zh: '颜色' },

  // 状态消息
  'status.generating': { en: 'Generating...', zh: '生成中...' },
  'status.complete': { en: 'Complete!', zh: '完成！' },
  'status.error': { en: 'Error occurred', zh: '发生错误' },

  // 提示信息
  'tip.selectLayer': { en: 'Select a layer to start', zh: '选择一个图层开始' },
  'tip.adjustSize': { en: 'Adjust size as needed', zh: '根据需要调整尺寸' },
});

// ============================================================================
// 步骤 2: 创建使用翻译的组件
// ============================================================================

function Header() {
  const { t } = useLanguage();

  return (
    <header style={styles.header}>
      <div>
        <h1 style={styles.title}>{t('plugin.title')}</h1>
        <p style={styles.subtitle}>{t('plugin.subtitle')}</p>
      </div>

      {/* 语言切换按钮 */}
      <LanguageSwitcher mode="text" />
    </header>
  );
}

function SettingsPanel() {
  const { t } = useLanguage();

  return (
    <div style={styles.panel}>
      <h3 style={styles.panelTitle}>{t('settings.dimensions')}</h3>

      <div style={styles.field}>
        <label style={styles.label}>{t('settings.width')}</label>
        <input type="number" style={styles.input} defaultValue={100} />
      </div>

      <div style={styles.field}>
        <label style={styles.label}>{t('settings.height')}</label>
        <input type="number" style={styles.input} defaultValue={150} />
      </div>

      <div style={styles.field}>
        <label style={styles.label}>{t('settings.depth')}</label>
        <input type="number" style={styles.input} defaultValue={50} />
      </div>

      <div style={styles.field}>
        <label style={styles.label}>{t('settings.color')}</label>
        <input type="color" style={styles.colorInput} defaultValue="#06b6d4" />
      </div>
    </div>
  );
}

function ActionButtons() {
  const { t } = useLanguage();

  return (
    <div style={styles.actions}>
      <button style={styles.primaryButton}>
        {t('plugin.generate')}
      </button>

      <button style={styles.secondaryButton}>
        {t('plugin.preview')}
      </button>

      <button style={styles.secondaryButton}>
        {t('plugin.export')}
      </button>
    </div>
  );
}

function StatusBar() {
  const { t } = useLanguage();

  return (
    <div style={styles.statusBar}>
      <span style={styles.statusText}>
        {t('tip.selectLayer')}
      </span>
    </div>
  );
}

// ============================================================================
// 步骤 3: 主应用组件
// ============================================================================

function App() {
  return (
    <div style={styles.container}>
      <Header />
      <SettingsPanel />
      <ActionButtons />
      <StatusBar />
    </div>
  );
}

// ============================================================================
// 步骤 4: 入口文件 - 包裹 Provider
// ============================================================================

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* 主题 Provider */}
    <ThemeProvider>
      {/* 语言 Provider - 注入翻译字典 */}
      <LanguageProvider
        translations={pluginTranslations}
        defaultLanguage="en"
        storageKey="my-plugin-lang"
      >
        <App />
      </LanguageProvider>
    </ThemeProvider>
  </React.StrictMode>
);

// ============================================================================
// 样式定义
// ============================================================================

const styles = {
  container: {
    padding: '16px',
    fontFamily: 'Inter, system-ui, sans-serif',
    color: '#fff',
    background: 'rgba(20, 20, 20, 0.95)',
    minHeight: '100vh',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    paddingBottom: '16px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
    margin: 0,
    color: '#06b6d4',
  },
  subtitle: {
    fontSize: '11px',
    margin: '4px 0 0 0',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  panel: {
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '16px',
  },
  panelTitle: {
    fontSize: '14px',
    fontWeight: 600,
    margin: '0 0 12px 0',
  },
  field: {
    marginBottom: '12px',
  },
  label: {
    display: 'block',
    fontSize: '11px',
    marginBottom: '6px',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  input: {
    width: '100%',
    padding: '8px',
    fontSize: '11px',
    background: 'rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '4px',
    color: '#fff',
  },
  colorInput: {
    width: '100%',
    height: '32px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  actions: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px',
  },
  primaryButton: {
    flex: 1,
    padding: '10px',
    fontSize: '12px',
    fontWeight: 600,
    color: '#fff',
    background: 'linear-gradient(to right, #06b6d4, #8b5cf6)',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  secondaryButton: {
    flex: 1,
    padding: '10px',
    fontSize: '12px',
    fontWeight: 500,
    color: '#fff',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  statusBar: {
    padding: '12px',
    background: 'rgba(6, 182, 212, 0.1)',
    border: '1px solid rgba(6, 182, 212, 0.3)',
    borderRadius: '6px',
  },
  statusText: {
    fontSize: '11px',
    color: '#06b6d4',
  },
} as const;
