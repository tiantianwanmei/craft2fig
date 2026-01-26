// ============================================================================
// Language Provider - 轻量级多语言切换系统
// ============================================================================
// 使用全局 Store + React Hook，避免 Context 重新挂载问题

import React, { useEffect, useState } from 'react';
import { languageStore } from './LanguageStore';

export type Language = 'en' | 'zh';

// 翻译字典结构：{ key: { en: string, zh: string } }
export type TranslationMap = Record<string, { en: string; zh: string }>;

export interface LanguageProviderProps {
  children: React.ReactNode;
  defaultLanguage?: Language;
  translations?: TranslationMap;
  storageKey?: string;
}

/**
 * LanguageProvider - 多语言管理组件（使用全局 Store）
 */
export function LanguageProvider({
  children,
  defaultLanguage = 'en',
  translations = {},
}: LanguageProviderProps) {
  console.log('[LanguageProvider] Initializing with defaultLanguage:', defaultLanguage);
  console.log('[LanguageProvider] Translations count:', Object.keys(translations).length);

  // 初始化全局 store
  useEffect(() => {
    languageStore.setTranslations(translations);

    // 如果 store 中没有语言设置，使用默认语言
    const currentLang = languageStore.getLanguage();
    if (!currentLang) {
      languageStore.setLanguage(defaultLanguage);
    }
  }, [defaultLanguage, translations]);

  return <>{children}</>;
}

/**
 * useLanguage Hook - 访问语言状态和翻译函数（使用全局 Store）
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { language, setLanguage, t } = useLanguage();
 *
 *   return (
 *     <div>
 *       <h1>{t('common.title')}</h1>
 *       <button onClick={() => setLanguage(language === 'en' ? 'zh' : 'en')}>
 *         {language === 'en' ? '中文' : 'English'}
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 */
export const useLanguage = () => {
  // 订阅全局 store 的变化
  const [language, setLanguageState] = useState<Language>(() => languageStore.getLanguage());

  useEffect(() => {
    // 订阅语言变化
    const unsubscribe = languageStore.subscribe((newLanguage) => {
      console.log('[useLanguage] Language changed to:', newLanguage);
      setLanguageState(newLanguage);
    });

    return unsubscribe;
  }, []);

  const setLanguage = (newLanguage: Language) => {
    languageStore.setLanguage(newLanguage);
  };

  const t = (key: string): string => {
    return languageStore.translate(key);
  };

  return { language, setLanguage, t };
};
