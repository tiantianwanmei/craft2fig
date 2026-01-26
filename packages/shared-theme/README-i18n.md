# 🌐 多语言切换系统 (i18n)

轻量级的运行时多语言切换方案，零编译，点击即切换。

## ✨ 特性

- **零编译切换** - 运行时切换，无需重新构建
- **LocalStorage 持久化** - 用户选择会被记住
- **极简实现** - 无需 i18next 等重型库
- **TypeScript 支持** - 完整的类型定义
- **Monorepo 友好** - 基础词条统一管理，插件可扩展

## 📦 安装

```bash
# 已包含在 @genki/shared-theme 中
npm install @genki/shared-theme
```

## 🚀 快速开始

### 1. 在入口文件包裹 Provider

```tsx
// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { LanguageProvider, baseTranslations, mergeTranslations } from '@genki/shared-theme';
import App from './App';

// 定义插件特有的翻译
const pluginTranslations = mergeTranslations(baseTranslations, {
  'plugin.title': { en: 'My Awesome Plugin', zh: '我的超强插件' },
  'plugin.export': { en: 'Export to PNG', zh: '导出为 PNG' },
  'plugin.settings': { en: 'Settings', zh: '设置' },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LanguageProvider translations={pluginTranslations} defaultLanguage="en">
      <App />
    </LanguageProvider>
  </React.StrictMode>
);
```

### 2. 添加语言切换按钮

```tsx
// src/components/Header.tsx
import { LanguageSwitcher } from '@genki/shared-theme';

export function Header() {
  return (
    <header>
      <h1>My Plugin</h1>
      {/* 开箱即用的切换按钮 */}
      <LanguageSwitcher mode="text" />
    </header>
  );
}
```

### 3. 在组件中使用翻译

```tsx
// src/components/ExportPanel.tsx
import { useLanguage } from '@genki/shared-theme';

export function ExportPanel() {
  const { t } = useLanguage();

  return (
    <div>
      <h2>{t('plugin.title')}</h2>
      <button>{t('common.save')}</button>
      <button>{t('plugin.export')}</button>
    </div>
  );
}
```

## 📚 API 文档

### LanguageProvider

多语言管理组件，需要包裹在应用最外层。

**Props:**

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `children` | `ReactNode` | - | 子组件 |
| `defaultLanguage` | `'en' \| 'zh'` | `'en'` | 默认语言 |
| `translations` | `TranslationMap` | `{}` | 翻译字典 |
| `storageKey` | `string` | `'genki-ui-lang'` | LocalStorage 键名 |

### useLanguage Hook

访问语言状态和翻译函数。

**返回值:**

```tsx
{
  language: 'en' | 'zh';           // 当前语言
  setLanguage: (lang) => void;     // 切换语言
  t: (key: string) => string;      // 翻译函数
}
```

**示例:**

```tsx
function MyComponent() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div>
      <p>{t('common.hello')}</p>
      <button onClick={() => setLanguage('zh')}>
        切换到中文
      </button>
    </div>
  );
}
```

### LanguageSwitcher

开箱即用的语言切换按钮组件。

**Props:**

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `mode` | `'icon' \| 'text' \| 'both'` | `'text'` | 显示模式 |
| `className` | `string` | `''` | 自定义类名 |
| `style` | `CSSProperties` | - | 自定义样式 |

**示例:**

```tsx
// 只显示文字
<LanguageSwitcher mode="text" />

// 只显示图标
<LanguageSwitcher mode="icon" />

// 图标 + 文字
<LanguageSwitcher mode="both" />

// 自定义样式
<LanguageSwitcher
  mode="text"
  style={{ fontSize: '12px', padding: '8px 16px' }}
/>
```

## 🎯 基础翻译词条

`baseTranslations` 包含所有插件通用的基础词汇：

### 通用操作
- `common.confirm` - 确认
- `common.cancel` - 取消
- `common.save` - 保存
- `common.delete` - 删除
- `common.edit` - 编辑
- `common.close` - 关闭
- `common.reset` - 重置
- `common.apply` - 应用
- `common.export` - 导出
- `common.import` - 导入
- `common.undo` - 撤销
- `common.redo` - 重做

### 主题切换
- `theme.toggle` - 切换主题
- `theme.light` - 浅色
- `theme.dark` - 深色

### 语言切换
- `lang.switch` - 切换语言
- `lang.en` - English
- `lang.zh` - 中文

### 状态
- `status.active` - 激活
- `status.inactive` - 未激活
- `status.enabled` - 已启用
- `status.disabled` - 已禁用

[查看完整词条列表](./src/i18n/translations.ts)

## 💡 高级用法

### 自定义翻译字典

```tsx
import { mergeTranslations, baseTranslations } from '@genki/shared-theme';

const myTranslations = mergeTranslations(baseTranslations, {
  // 插件特有词条
  'myPlugin.feature1': { en: 'Feature 1', zh: '功能 1' },
  'myPlugin.feature2': { en: 'Feature 2', zh: '功能 2' },

  // 覆盖基础词条（如果需要）
  'common.save': { en: 'Save Changes', zh: '保存更改' },
});
```

### 自定义切换按钮

```tsx
import { useLanguage } from '@genki/shared-theme';

function CustomLanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <select
      value={language}
      onChange={(e) => setLanguage(e.target.value as 'en' | 'zh')}
    >
      <option value="en">English</option>
      <option value="zh">中文</option>
    </select>
  );
}
```

### 动态翻译（带变量）

```tsx
// 定义翻译
const translations = {
  'user.greeting': {
    en: 'Hello, {name}!',
    zh: '你好，{name}！'
  },
};

// 使用时手动替换
function Greeting({ name }: { name: string }) {
  const { t } = useLanguage();
  const greeting = t('user.greeting').replace('{name}', name);

  return <h1>{greeting}</h1>;
}
```

## 🔧 与 ThemeProvider 配合使用

```tsx
import { ThemeProvider, LanguageProvider } from '@genki/shared-theme';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <LanguageProvider translations={myTranslations}>
        <App />
      </LanguageProvider>
    </ThemeProvider>
  </React.StrictMode>
);
```

## 📝 最佳实践

1. **统一管理词条** - 在单独的文件中定义所有翻译
2. **使用命名空间** - 用点号分隔，如 `plugin.feature.action`
3. **保持简洁** - 翻译文本应简短明了
4. **测试覆盖** - 确保所有 key 都有对应的翻译
5. **开发提示** - 开发环境会自动警告缺失的翻译

## 🎨 样式定制

LanguageSwitcher 使用内联样式，可以通过 `style` prop 覆盖：

```tsx
<LanguageSwitcher
  style={{
    background: 'linear-gradient(to right, #06b6d4, #8b5cf6)',
    border: 'none',
    borderRadius: '8px',
    padding: '8px 16px',
    fontSize: '12px',
    fontWeight: 600,
  }}
/>
```

## 🚀 性能优化

- **零重渲染** - 只有使用了 `t()` 的组件会重新渲染
- **LocalStorage 缓存** - 避免每次都读取
- **轻量实现** - 核心代码不到 100 行

## 📦 文件结构

```
packages/shared-theme/src/i18n/
├── LanguageProvider.tsx    # 核心 Provider 和 Hook
├── translations.ts          # 基础翻译词条
├── LanguageSwitcher.tsx     # 切换按钮组件
└── index.ts                 # 统一导出
```

## 🤝 贡献

欢迎添加更多基础词条到 `baseTranslations`！

---

**Made with ❤️ by Genki Team**
