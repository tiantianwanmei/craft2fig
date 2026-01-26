/**
 * 🌟 GlassCard - 毛玻璃卡片组件
 * 世界级毛玻璃效果实现
 */

import React, { CSSProperties, ReactNode } from 'react';
import { SEMANTIC_TOKENS } from '@genki/shared-theme';

export type GlassVariant = 'base' | 'light' | 'strong' | 'dark';
export type GlassColorVariant = 'primary' | 'accent';

export interface GlassCardProps {
  children: ReactNode;
  variant?: GlassVariant;
  colorVariant?: GlassColorVariant;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
  interactive?: boolean;
}

/**
 * GlassCard 组件
 *
 * @example
 * // 基础用法
 * <GlassCard>内容</GlassCard>
 *
 * @example
 * // 强烈毛玻璃效果
 * <GlassCard variant="strong">重要内容</GlassCard>
 *
 * @example
 * // 彩色毛玻璃
 * <GlassCard colorVariant="primary">品牌色卡片</GlassCard>
 *
 * @example
 * // 交互式毛玻璃
 * <GlassCard interactive onClick={() => console.log('clicked')}>
 *   可点击的卡片
 * </GlassCard>
 */
export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  variant = 'base',
  colorVariant,
  className = '',
  style = {},
  onClick,
  interactive = false,
}) => {
  const [isHovered, setIsHovered] = React.useState(false);
  const [isActive, setIsActive] = React.useState(false);

  // 获取毛玻璃样式
  const getGlassStyle = (): CSSProperties => {
    // 彩色毛玻璃优先
    if (colorVariant) {
      const coloredGlass = SEMANTIC_TOKENS.glass.colored[colorVariant];
      return {
        background: coloredGlass.background,
        backdropFilter: coloredGlass.backdropFilter,
        WebkitBackdropFilter: coloredGlass.backdropFilter, // Safari support
        border: coloredGlass.border,
        boxShadow: coloredGlass.boxShadow,
      };
    }

    // 交互式毛玻璃
    if (interactive) {
      const interactiveState = isActive
        ? SEMANTIC_TOKENS.glass.interactive.active
        : isHovered
          ? SEMANTIC_TOKENS.glass.interactive.hover
          : SEMANTIC_TOKENS.glass.interactive.default;

      return {
        background: interactiveState.background,
        backdropFilter: interactiveState.backdropFilter,
        WebkitBackdropFilter: interactiveState.backdropFilter,
        border: interactiveState.border,
        cursor: 'pointer',
      };
    }

    // 标准毛玻璃变体
    const glassVariant = SEMANTIC_TOKENS.glass[variant];
    return {
      background: glassVariant.background,
      backdropFilter: glassVariant.backdropFilter,
      WebkitBackdropFilter: glassVariant.backdropFilter,
      border: glassVariant.border,
      boxShadow: glassVariant.boxShadow,
    };
  };

  const baseStyle: CSSProperties = {
    borderRadius: SEMANTIC_TOKENS.border.radius.lg,
    padding: SEMANTIC_TOKENS.spacing.layout.lg,
    transition: `all ${SEMANTIC_TOKENS.motion.duration.fast} ${SEMANTIC_TOKENS.motion.easing.standard}`,
    ...getGlassStyle(),
    ...style,
  };

  return (
    <div
      className={className}
      style={baseStyle}
      onClick={onClick}
      onMouseEnter={() => interactive && setIsHovered(true)}
      onMouseLeave={() => {
        if (interactive) {
          setIsHovered(false);
          setIsActive(false);
        }
      }}
      onMouseDown={() => interactive && setIsActive(true)}
      onMouseUp={() => interactive && setIsActive(false)}
    >
      {children}
    </div>
  );
};
