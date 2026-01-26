// ============================================================================
// SECTION COMPONENT - 面板区块组件
// ============================================================================
// 统一控制所有面板中的区块间距和标题样式

import { memo, type ReactNode } from 'react';
import { SEMANTIC_TOKENS } from '@genki/shared-theme';

interface SectionProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export const Section = memo(function Section({
  title,
  children,
  className = '',
}: SectionProps) {
  return (
    <div
      className={className}
      style={{ marginBottom: SEMANTIC_TOKENS.spacing.section.marginBottom }}
    >
      {title && (
        <div
          className="section-title"
          style={{
            fontSize: SEMANTIC_TOKENS.typography.fontSize.xs,
            fontWeight: SEMANTIC_TOKENS.typography.fontWeight.semibold,
            color: SEMANTIC_TOKENS.color.text.tertiary,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: SEMANTIC_TOKENS.spacing.section.titleMarginBottom,
          }}
        >
          {title}
        </div>
      )}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: SEMANTIC_TOKENS.spacing.gap.md,
        }}
      >
        {children}
      </div>
    </div>
  );
});
