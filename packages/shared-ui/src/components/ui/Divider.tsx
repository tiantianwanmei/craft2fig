// ============================================================================
// DIVIDER COMPONENT - 细线分隔组件
// ============================================================================

import { memo } from 'react';
import { COMPONENT_TOKENS } from '@genki/shared-theme';

interface DividerProps {
  className?: string;
  style?: React.CSSProperties;
}

export const Divider = memo(function Divider({ className, style }: DividerProps) {
  return (
    <div
      className={className}
      style={{
        height: COMPONENT_TOKENS.layout.divider.height,
        background: COMPONENT_TOKENS.layout.divider.background,
        margin: COMPONENT_TOKENS.layout.divider.margin,
        ...style,
      }}
    />
  );
});
