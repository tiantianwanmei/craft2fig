/**
 * 💡 Spotlight - 鼠标跟随聚光灯效果
 * Vercel/AI 风格的交互式光圈
 */

import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { SEMANTIC_TOKENS } from '@genki/shared-theme';

export interface SpotlightCardProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * SpotlightCard - 鼠标跟随的聚光灯卡片
 *
 * @example
 * <SpotlightCard>
 *   <h3>Card Title</h3>
 *   <p>Card content</p>
 * </SpotlightCard>
 */
export const SpotlightCard: React.FC<SpotlightCardProps> = ({
  children,
  className = '',
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <div
      ref={cardRef}
      className={className}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'relative',
        background: SEMANTIC_TOKENS.color.bg.surface,
        border: `${SEMANTIC_TOKENS.border.width.thin} solid ${SEMANTIC_TOKENS.color.border.default}`,
        borderRadius: SEMANTIC_TOKENS.border.radius.lg,
        padding: SEMANTIC_TOKENS.spacing.layout.lg,
        overflow: 'hidden',
      }}
    >
      {/* 聚光灯效果 */}
      <motion.div
        style={{
          position: 'absolute',
          width: '300px',
          height: '300px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(6, 182, 212, 0.15) 0%, transparent 70%)',
          pointerEvents: 'none',
          left: mousePosition.x - 150,
          top: mousePosition.y - 150,
        }}
        animate={{
          opacity: isHovered ? 1 : 0,
        }}
        transition={{
          duration: 0.3,
          ease: 'easeOut',
        }}
      />

      {/* 内容 */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {children}
      </div>
    </div>
  );
};
