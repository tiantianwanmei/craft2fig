/**
 * 🎯 LinearTabs - Linear 级别的流动 Tab 组件
 * 使用 layoutId 实现平滑的胶囊流动效果
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BASE_TOKENS, SEMANTIC_TOKENS } from '@genki/shared-theme';

export interface LinearTab {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

export interface LinearTabsProps {
  tabs: LinearTab[];
  defaultTab?: string;
  onChange?: (tabId: string) => void;
  className?: string;
}

/**
 * LinearTabs - Linear.app 风格的流动 Tab
 *
 * @example
 * <LinearTabs
 *   tabs={[
 *     { id: 'design', label: 'Design' },
 *     { id: 'prototype', label: 'Prototype' },
 *     { id: 'inspect', label: 'Inspect' },
 *   ]}
 *   onChange={(id) => console.log(id)}
 * />
 */
export const LinearTabs: React.FC<LinearTabsProps> = ({
  tabs,
  defaultTab,
  onChange,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    onChange?.(tabId);
  };

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: SEMANTIC_TOKENS.spacing.gap.xs,
        background: SEMANTIC_TOKENS.color.bg.interactive.default,
        padding: SEMANTIC_TOKENS.spacing.component.xs,
        borderRadius: SEMANTIC_TOKENS.border.radius.lg,
        border: `${SEMANTIC_TOKENS.border.width.thin} solid ${SEMANTIC_TOKENS.color.border.weak}`,
        backdropFilter: 'blur(8px)',
        width: 'fit-content',
      }}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => handleTabClick(tab.id)}
          style={{
            position: 'relative',
            padding: `${SEMANTIC_TOKENS.spacing.component.sm} ${SEMANTIC_TOKENS.spacing.component.md}`,
            fontSize: SEMANTIC_TOKENS.typography.fontSize.sm,
            fontWeight: SEMANTIC_TOKENS.typography.fontWeight.medium,
            color: activeTab === tab.id
              ? SEMANTIC_TOKENS.color.text.primary
              : SEMANTIC_TOKENS.color.text.secondary,
            background: 'transparent',
            border: 'none',
            borderRadius: SEMANTIC_TOKENS.border.radius.md,
            cursor: 'pointer',
            outline: 'none',
            transition: `color ${SEMANTIC_TOKENS.motion.duration.fast} ease`,
            WebkitTapHighlightColor: 'transparent',
            display: 'flex',
            alignItems: 'center',
            gap: SEMANTIC_TOKENS.spacing.gap.xs,
          }}
        >
          {/* 核心魔法：layoutId - 让背景"流"过去 */}
          {activeTab === tab.id && (
            <motion.div
              layoutId="active-tab-pill"
              style={{
                position: 'absolute',
                inset: 0,
                background: SEMANTIC_TOKENS.color.bg.surface,
                borderRadius: SEMANTIC_TOKENS.border.radius.md,
                border: `${SEMANTIC_TOKENS.border.width.thin} solid ${SEMANTIC_TOKENS.color.border.default}`,
                boxShadow: `0 1px 3px ${SEMANTIC_TOKENS.color.bg.primary}40`,
                zIndex: -1,
              }}
              transition={BASE_TOKENS.spring.linear.smooth}
            />
          )}
          {tab.icon && <span style={{ position: 'relative', zIndex: 1 }}>{tab.icon}</span>}
          <span style={{ position: 'relative', zIndex: 1 }}>{tab.label}</span>
        </button>
      ))}
    </div>
  );
};
