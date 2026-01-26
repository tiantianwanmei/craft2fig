// ============================================================================
// Language Store - 全局语言状态管理（不依赖 React）
// ============================================================================
// 使用发布-订阅模式，避免 React Context 的重新挂载问题

import type { Language, TranslationMap } from './LanguageProvider';

type Listener = (language: Language) => void;

class LanguageStore {
  private language: Language = 'en';
  private listeners: Set<Listener> = new Set();
  private translations: TranslationMap = {};

  constructor() {
    // 尝试从内存或 localStorage 恢复语言设置
    try {
      const stored = localStorage.getItem('genki-ui-lang') as Language;
      if (stored === 'en' || stored === 'zh') {
        this.language = stored;
      }
    } catch {
      // localStorage 不可用，使用默认值
    }
  }

  getLanguage(): Language {
    return this.language;
  }

  setLanguage(newLanguage: Language): void {
    if (this.language === newLanguage) return;

    console.log('[LanguageStore] Changing language from', this.language, 'to', newLanguage);
    this.language = newLanguage;

    // 持久化
    try {
      localStorage.setItem('genki-ui-lang', newLanguage);
    } catch {
      // 忽略错误
    }

    // 更新 HTML lang 属性
    try {
      document.documentElement.lang = newLanguage;
    } catch {
      // 忽略错误
    }

    // 通知所有监听器
    this.listeners.forEach(listener => listener(newLanguage));
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  setTranslations(translations: TranslationMap): void {
    this.translations = translations;
  }

  translate(key: string): string {
    const entry = this.translations[key];
    if (!entry) {
      console.warn(`[i18n] Missing translation for: ${key}`);
      return key;
    }
    return entry[this.language] || key;
  }
}

// 全局单例
export const languageStore = new LanguageStore();
