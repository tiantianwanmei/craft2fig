// ============================================================================
// i18n Module - 多语言国际化模块
// ============================================================================
// 统一导出所有多语言相关功能

export { LanguageProvider, useLanguage } from './LanguageProvider';
export type { Language, TranslationMap, LanguageProviderProps } from './LanguageProvider';

export { languageStore } from './LanguageStore';

export { baseTranslations, mergeTranslations } from './translations';

export { LanguageSwitcher } from './LanguageSwitcher';
export type { LanguageSwitcherProps } from './LanguageSwitcher';
