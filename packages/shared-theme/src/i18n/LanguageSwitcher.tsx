// ============================================================================
// Language Switcher - 语言切换组件
// ============================================================================
// 提供开箱即用的语言切换按钮组件

import React from 'react';
import { useLanguage } from './LanguageProvider';

export interface LanguageSwitcherProps {
  /** 按钮样式类名 */
  className?: string;
  /** 显示模式：'icon' | 'text' | 'both' */
  mode?: 'icon' | 'text' | 'both';
  /** 自定义样式 */
  style?: React.CSSProperties;
}

/**
 * LanguageSwitcher - 语言切换按钮组件
 *
 * @example
 * ```tsx
 * import { LanguageSwitcher } from '@genki/shared-theme';
 *
 * function Header() {
 *   return (
 *     <div>
 *       <LanguageSwitcher mode="text" />
 *     </div>
 *   );
 * }
 * ```
 */
export function LanguageSwitcher({
  className = '',
  mode = 'text',
  style,
}: LanguageSwitcherProps) {
  const { language, setLanguage } = useLanguage();
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  console.log('[LanguageSwitcher] Rendered with language:', language);

  // 直接计算按钮内容
  const icon = '🌐';
  const text = language === 'en' ? '中文' : 'English';

  let buttonContent: string;
  switch (mode) {
    case 'icon':
      buttonContent = icon;
      break;
    case 'text':
      buttonContent = text;
      break;
    case 'both':
      buttonContent = `${icon} ${text}`;
      break;
    default:
      buttonContent = text;
  }

  console.log('[LanguageSwitcher] Button text:', text);
  console.log('[LanguageSwitcher] Final buttonContent:', buttonContent);

  // 强制更新 DOM - 在每次渲染后直接操作 DOM
  React.useEffect(() => {
    if (buttonRef.current) {
      console.log('[LanguageSwitcher] BEFORE DOM update - textContent:', buttonRef.current.textContent);
      console.log('[LanguageSwitcher] BEFORE DOM update - offsetWidth:', buttonRef.current.offsetWidth);
      console.log('[LanguageSwitcher] BEFORE DOM update - computed style:', window.getComputedStyle(buttonRef.current).getPropertyValue('font-family'));

      // 直接设置 textContent，绕过 React
      buttonRef.current.textContent = buttonContent;

      // 强制重绘
      buttonRef.current.style.display = 'none';
      buttonRef.current.offsetHeight; // 触发 reflow
      buttonRef.current.style.display = '';

      console.log('[LanguageSwitcher] AFTER DOM update - textContent:', buttonRef.current.textContent);
      console.log('[LanguageSwitcher] AFTER DOM update - innerHTML:', buttonRef.current.innerHTML);
      console.log('[LanguageSwitcher] AFTER DOM update - offsetWidth:', buttonRef.current.offsetWidth);
      console.log('[LanguageSwitcher] ⚠️ 如果宽度没变，说明文字可能被CSS覆盖了！');
    }
  }, [buttonContent]);

  const toggleLanguage = () => {
    console.log('[LanguageSwitcher] Button clicked! Current language:', language);
    const newLang = language === 'en' ? 'zh' : 'en';
    console.log('[LanguageSwitcher] Switching to:', newLang);
    setLanguage(newLang);
  };

  return (
    <button
      ref={buttonRef}
      onClick={toggleLanguage}
      className={className}
      style={{
        padding: '6px 12px',
        fontSize: '11px',
        fontWeight: 500,
        color: 'rgba(255, 255, 255, 0.9)',
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '6px',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
      }}
      title={language === 'en' ? 'Switch to Chinese' : '切换到英文'}
    >
      {/* 初始内容，会被 useEffect 覆盖 */}
      {buttonContent}
    </button>
  );
}
