# 🚀 多语言切换 - 5分钟快速入门

## 第一步：在入口文件添加 Provider

```tsx
// src/main.tsx
import { LanguageProvider, baseTranslations } from '@genki/shared-theme';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <LanguageProvider translations={baseTranslations}>
    <App />
  </LanguageProvider>
);
```

## 第二步：添加切换按钮

```tsx
// src/App.tsx
import { LanguageSwitcher } from '@genki/shared-theme';

function App() {
  return (
    <div>
      <LanguageSwitcher mode="text" />
      {/* 你的其他组件 */}
    </div>
  );
}
```

## 第三步：使用翻译

```tsx
import { useLanguage } from '@genki/shared-theme';

function MyComponent() {
  const { t } = useLanguage();

  return (
    <div>
      <button>{t('common.save')}</button>
      <button>{t('common.cancel')}</button>
    </div>
  );
}
```

## 完成！🎉

点击切换按钮，界面文字会立即更新，无需刷新页面。

---

## 添加自定义翻译

```tsx
import { mergeTranslations, baseTranslations } from '@genki/shared-theme';

const myTranslations = mergeTranslations(baseTranslations, {
  'myPlugin.title': { en: 'My Plugin', zh: '我的插件' },
});

<LanguageProvider translations={myTranslations}>
  <App />
</LanguageProvider>
```

查看 [完整文档](./README-i18n.md) 了解更多功能。
