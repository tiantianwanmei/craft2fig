/**
 * 🎬 AnimatedList - 世界级动画列表组件
 * 使用 Framer Motion Stagger + Design Tokens
 */

import React from 'react';
import { motion } from 'framer-motion';
import { SEMANTIC_TOKENS } from '@genki/shared-theme';

export interface AnimatedListProps {
  children: React.ReactNode[];
  staggerDelay?: number;
  className?: string;
}

/**
 * AnimatedList - 带有交错动画的列表组件
 *
 * @example
 * <AnimatedList staggerDelay={0.1}>
 *   {items.map(item => <div key={item.id}>{item.name}</div>)}
 * </AnimatedList>
 */
export const AnimatedList: React.FC<AnimatedListProps> = ({
  children,
  staggerDelay = 0.05,
  className = '',
}) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
      },
    },
  };

  const itemVariants = {
    hidden: SEMANTIC_TOKENS.animation.list.item.initial,
    visible: {
      ...SEMANTIC_TOKENS.animation.list.item.animate,
      transition: SEMANTIC_TOKENS.animation.list.item.transition,
    },
  };

  return (
    <motion.div
      className={className}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: SEMANTIC_TOKENS.spacing.gap.md,
      }}
    >
      {React.Children.map(children, (child, index) => (
        <motion.div key={index} variants={itemVariants}>
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
};
