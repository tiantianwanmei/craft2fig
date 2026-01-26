/**
 * 🎬 AnimatedButton - 世界级动画按钮组件
 * 使用 Framer Motion + Design Tokens
 */

import React from 'react';
import { motion } from 'framer-motion';
import { SEMANTIC_TOKENS } from '@genki/shared-theme';

export interface AnimatedButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  className?: string;
}

/**
 * AnimatedButton - 带有流畅动画的按钮组件
 *
 * @example
 * <AnimatedButton onClick={() => console.log('clicked')}>
 *   Click Me
 * </AnimatedButton>
 */
export const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  disabled = false,
  className = '',
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          background: SEMANTIC_TOKENS.color.bg.brand,
          color: SEMANTIC_TOKENS.color.text.primary,
        };
      case 'secondary':
        return {
          background: SEMANTIC_TOKENS.color.bg.interactive.default,
          color: SEMANTIC_TOKENS.color.text.primary,
        };
      case 'ghost':
        return {
          background: 'transparent',
          color: SEMANTIC_TOKENS.color.text.secondary,
        };
      default:
        return {};
    }
  };

  return (
    <motion.button
      className={className}
      onClick={onClick}
      disabled={disabled}
      // 初始状态
      initial={{ opacity: 0, scale: 0.95 }}
      // 进入动画
      animate={{ opacity: 1, scale: 1 }}
      // 悬停效果
      whileHover={!disabled ? SEMANTIC_TOKENS.animation.interactive.hover : undefined}
      // 按下效果
      whileTap={!disabled ? SEMANTIC_TOKENS.animation.interactive.tap : undefined}
      // 聚焦效果
      whileFocus={!disabled ? SEMANTIC_TOKENS.animation.interactive.focus : undefined}
      style={{
        ...getVariantStyles(),
        padding: `${SEMANTIC_TOKENS.spacing.component.md} ${SEMANTIC_TOKENS.spacing.component.lg}`,
        fontSize: SEMANTIC_TOKENS.typography.fontSize.base,
        fontWeight: SEMANTIC_TOKENS.typography.fontWeight.medium,
        borderRadius: SEMANTIC_TOKENS.border.radius.md,
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        outline: 'none',
      }}
    >
      {children}
    </motion.button>
  );
};
