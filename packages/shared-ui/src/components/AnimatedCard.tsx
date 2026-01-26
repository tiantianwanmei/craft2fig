/**
 * 🎬 AnimatedCard - 世界级动画卡片组件
 * 使用 Framer Motion + Design Tokens
 */

import React from 'react';
import { motion, type Transition } from 'framer-motion';
import { SEMANTIC_TOKENS } from '@genki/shared-theme';

export interface AnimatedCardProps {
  children: React.ReactNode;
  onClick?: () => void;
  animationType?: 'fade' | 'scale' | 'slide';
  interactive?: boolean;
  className?: string;
}

/**
 * AnimatedCard - 带有流畅动画的卡片组件
 *
 * @example
 * <AnimatedCard animationType="scale" interactive>
 *   Card Content
 * </AnimatedCard>
 */
export const AnimatedCard: React.FC<AnimatedCardProps> = ({
  children,
  onClick,
  animationType = 'fade',
  interactive = false,
  className = '',
}) => {
  const getAnimation = () => {
    switch (animationType) {
      case 'fade':
        return SEMANTIC_TOKENS.animation.fade.inUp;
      case 'scale':
        return SEMANTIC_TOKENS.animation.scale.in;
      case 'slide':
        return SEMANTIC_TOKENS.animation.slide.right;
      default:
        return SEMANTIC_TOKENS.animation.fade.in;
    }
  };

  const animation = getAnimation();

  return (
    <motion.div
      className={className}
      onClick={onClick}
      initial={animation.initial}
      animate={animation.animate}
      exit={animation.exit}
      transition={animation.transition as Transition}
      whileHover={interactive ? SEMANTIC_TOKENS.animation.interactive.hover : undefined}
      whileTap={interactive ? SEMANTIC_TOKENS.animation.interactive.tap : undefined}
      style={{
        background: SEMANTIC_TOKENS.color.bg.surface,
        border: `${SEMANTIC_TOKENS.border.width.thin} solid ${SEMANTIC_TOKENS.color.border.default}`,
        borderRadius: SEMANTIC_TOKENS.border.radius.lg,
        padding: SEMANTIC_TOKENS.spacing.layout.lg,
        cursor: interactive ? 'pointer' : 'default',
      }}
    >
      {children}
    </motion.div>
  );
};
