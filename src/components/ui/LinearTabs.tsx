/**
 * 🎯 LinearTabs - 极速 Tab 组件
 * 无动画，瞬时切换（移除 framer-motion 提升性能）
 */

import { SEMANTIC_TOKENS } from '@genki/shared-theme';

export interface LinearTab {
  id: string;
  label: string;
}

export interface LinearTabsProps {
  tabs: LinearTab[];
  activeTab: string;
  onChange: (tabId: string) => void;
}

export const LinearTabs = ({ tabs, activeTab, onChange }: LinearTabsProps) => {
  return (
    <div style={{
      display: 'flex',
      gap: 0,
      padding: 0,
      background: 'transparent',
      borderBottom: `1px solid ${SEMANTIC_TOKENS.color.border.weak}`,
      width: '100%',
    }}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          style={{
            position: 'relative',
            flex: 1,
            padding: `${SEMANTIC_TOKENS.spacing.component.lg} ${SEMANTIC_TOKENS.spacing.component.xl}`,
            background: 'transparent',
            color: activeTab === tab.id ? SEMANTIC_TOKENS.color.text.primary : SEMANTIC_TOKENS.color.text.secondary,
            fontSize: SEMANTIC_TOKENS.typography.fontSize.sm,
            fontWeight: SEMANTIC_TOKENS.typography.fontWeight.semibold,
            cursor: 'pointer',
            transition: 'color 0.1s ease',
            border: 'none',
            textAlign: 'center' as const,
            WebkitTapHighlightColor: 'transparent',
            outline: 'none',
          }}
        >
          {tab.label}

          {/* 瞬时切换指示器 - 纯 CSS，无动画库 */}
          {activeTab === tab.id && (
            <div
              style={{
                position: 'absolute',
                bottom: '-1px',
                left: 0,
                right: 0,
                height: '2px',
                background: SEMANTIC_TOKENS.color.button.primary.bg,
              }}
            />
          )}
        </button>
      ))}
    </div>
  );
};
