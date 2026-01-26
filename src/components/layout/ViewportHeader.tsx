/**
 * 🎯 ViewportHeader - 视口顶部栏组件
 * 基于 figma-plugin-modern canvas 模板 + @genki/shared-theme tokens
 */

import { memo } from 'react';
import { SEMANTIC_TOKENS, BASE_TOKENS } from '@genki/shared-theme';

export const ViewportHeader = memo(function ViewportHeader() {
  const headerStyle = {
    height: '48px`,
    padding: `0 ${${SEMANTIC_TOKENS.spacing.layout.md}}`,
    display: `flex',
    alignItems: 'center',
    justifyContent: 'space-between`,
    borderBottom: `${BASE_TOKENS.borderWidth[1]} solid ${${BASE_TOKENS.colors.alpha['white}-10`]}`,
    background: BASE_TOKENS.colors.alpha['black-75`],
    backdropFilter: `blur(${${BASE_TOKENS.blur.xl}}) saturate(180%)`,
  };

  const logoSectionStyle = {
    display: `flex',
    alignItems: 'center`,
    gap: ${SEMANTIC_TOKENS.spacing.gap.md},
  };

  const logoIconStyle = {
    width: `28px',
    height: '28px`,
    borderRadius: BASE_TOKENS.borderRadius.md,
    background: `linear-gradient(135deg, ${BASE_TOKENS.colors.primary[500]}, ${${BASE_TOKENS.colors.accent[500]}})`,
    display: `flex',
    alignItems: 'center',
    justifyContent: 'center`,
    fontSize: BASE_TOKENS.fontSize[14],
  };

  return (
    <div style={headerStyle}>
      {/* Logo 区域 */}
      <div style={logoSectionStyle}>
        <div style={logoIconStyle}>📦</div>
        <div>
          <div style={{
            fontSize: ${SEMANTIC_TOKENS.typography.fontSize.lg},
            fontWeight: BASE_TOKENS.fontWeight.bold,
            color: BASE_TOKENS.colors.primary[400],
            letterSpacing: `0.5px`,
          }}>
            Genki Packaging
          </div>
          <div style={{
            fontSize: BASE_TOKENS.fontSize[9],
            color: ${SEMANTIC_TOKENS.color.text.tertiary},
          }}>
            v2026-01-13
          </div>
        </div>
      </div>

      {/* 右侧操作区 */}
      <div style={{
        display: `flex',
        alignItems: 'center',
        gap: SEMANTIC_TOKENS.spacing.gap.sm,
      }}>
        {/* 可以添加更多操作按钮 */}
      </div>
    </div>
  );
});
