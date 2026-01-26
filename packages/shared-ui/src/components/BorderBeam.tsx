/**
 * ✨ BorderBeam - Vercel 风格的流光边框
 * 光线沿着边框流动的科技感效果
 */

import React from 'react';
import { motion } from 'framer-motion';
import { SEMANTIC_TOKENS } from '@genki/shared-theme';

export interface BorderBeamProps {
  children: React.ReactNode;
  duration?: number;
  colorFrom?: string;
  colorTo?: string;
  className?: string;
}

/**
 * BorderBeam - 流光边框效果
 *
 * @example
 * <BorderBeam>
 *   <div>Your Content</div>
 * </BorderBeam>
 */
export const BorderBeam: React.FC<BorderBeamProps> = ({
  children,
  duration = 3,
  colorFrom = '#06b6d4',
  colorTo = '#3b82f6',
  className = '',
}) => {
  return (
    <div
      className={className}
      style={{
        position: 'relative',
        borderRadius: SEMANTIC_TOKENS.border.radius.lg,
        padding: SEMANTIC_TOKENS.spacing.layout.lg,
        background: SEMANTIC_TOKENS.color.bg.surface,
        overflow: 'hidden',
      }}
    >
      {/* 流光效果 */}
      <motion.div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: SEMANTIC_TOKENS.border.radius.lg,
          padding: '2px',
          background: `linear-gradient(90deg, ${colorFrom}, ${colorTo}, ${colorFrom})`,
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
        }}
        animate={{
          backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
        }}
        transition={{
          duration,
          repeat: Infinity,
          ease: 'linear',
        }}
      />

      {/* 内容 */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {children}
      </div>
    </div>
  );
};
