// ============================================================================
// 💉 TOKEN INJECTOR - 实时 CSS 变量注入器
// ============================================================================

import { useEffect } from 'react';
import { useTokenStore } from '@genki/shared-theme';

export const TokenInjector = () => {
  const resolvedTokens = useTokenStore((state) => state.resolvedTokens);

  useEffect(() => {
    const root = document.documentElement;
    
    // 遍历所有 token 并写入 root 样式
    Object.entries(resolvedTokens).forEach(([key, value]) => {
      root.style.setProperty(`--${key}`, value);
    });
  }, [resolvedTokens]);

  return null; // 这个组件不可见，只负责注入
};
