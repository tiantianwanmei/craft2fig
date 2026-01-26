/**
 * 📊 StatusBar - 状态栏组件
 */

import { memo, CSSProperties } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../../store';
import { SEMANTIC_TOKENS } from '@genki/shared-theme';

export const StatusBar = memo(function StatusBar() {
  const {
    selection,
    markedLayers,
    isLoading,
  } = useAppStore(
    useShallow((s) => ({
      selection: s.selection,
      markedLayers: s.markedLayers,
      isLoading: s.isLoading,
    }))
  );

  const selectedCount = selection.selectedIds.length;
  const markedCount = markedLayers.length;

  const containerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    fontSize: '10px',
    color: SEMANTIC_TOKENS.color.text.tertiary,
  };

  const loadingDotStyle: CSSProperties = {
    width: '8px',
    height: '8px',
    borderRadius: SEMANTIC_TOKENS.border.radius.full,
    background: SEMANTIC_TOKENS.color.button.primary.bg,
    animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
  };

  const strongStyle: CSSProperties = {
    color: SEMANTIC_TOKENS.color.text.secondary,
  };

  const mutedStyle: CSSProperties = {
    color: SEMANTIC_TOKENS.color.text.disabled,
  };

  return (
    <div style={containerStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {isLoading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={loadingDotStyle} />
            <span>处理中...</span>
          </div>
        )}

        {!isLoading && (
          <>
            <span>
              已选择: <strong style={strongStyle}>{selectedCount}</strong>
            </span>
            <span>
              已标记: <strong style={strongStyle}>{markedCount}</strong>
            </span>
          </>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span>Genki Packaging Exporter</span>
        <span style={mutedStyle}>v2.0.0</span>
      </div>
    </div>
  );
});
