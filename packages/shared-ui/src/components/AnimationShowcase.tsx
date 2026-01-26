/**
 * 🎬 AnimationShowcase - Framer Motion 动画展示页面
 * 展示所有动画 token 的实际效果
 */

import React from 'react';
import { SEMANTIC_TOKENS } from '@genki/shared-theme';
import { AnimatedButton } from './AnimatedButton';
import { AnimatedCard } from './AnimatedCard';
import { AnimatedList } from './AnimatedList';

export const AnimationShowcase: React.FC = () => {
  const listItems = ['Item 1', 'Item 2', 'Item 3', 'Item 4', 'Item 5'];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1e3a8a 0%, #7c3aed 100%)',
      padding: SEMANTIC_TOKENS.spacing.layout.xl,
      display: 'flex',
      flexDirection: 'column',
      gap: SEMANTIC_TOKENS.spacing.layout.xl,
    }}>
      <h1 style={{
        fontSize: SEMANTIC_TOKENS.typography.fontSize['3xl'],
        fontWeight: SEMANTIC_TOKENS.typography.fontWeight.bold,
        color: SEMANTIC_TOKENS.color.text.primary,
        textAlign: 'center',
      }}>
        🎬 Framer Motion Animation Showcase
      </h1>

      {/* 按钮动画 */}
      <section>
        <h2 style={{
          fontSize: SEMANTIC_TOKENS.typography.fontSize.xl,
          color: SEMANTIC_TOKENS.color.text.primary,
          marginBottom: SEMANTIC_TOKENS.spacing.layout.md,
        }}>
          Interactive Buttons
        </h2>
        <div style={{
          display: 'flex',
          gap: SEMANTIC_TOKENS.spacing.gap.md,
          flexWrap: 'wrap',
        }}>
          <AnimatedButton variant="primary">Primary Button</AnimatedButton>
          <AnimatedButton variant="secondary">Secondary Button</AnimatedButton>
          <AnimatedButton variant="ghost">Ghost Button</AnimatedButton>
        </div>
      </section>

      {/* 卡片动画 */}
      <section>
        <h2 style={{
          fontSize: SEMANTIC_TOKENS.typography.fontSize.xl,
          color: SEMANTIC_TOKENS.color.text.primary,
          marginBottom: SEMANTIC_TOKENS.spacing.layout.md,
        }}>
          Animated Cards
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: SEMANTIC_TOKENS.spacing.layout.md,
        }}>
          <AnimatedCard animationType="fade" interactive>
            <h3>Fade Animation</h3>
            <p style={{ color: SEMANTIC_TOKENS.color.text.secondary }}>
              Smooth fade in effect
            </p>
          </AnimatedCard>

          <AnimatedCard animationType="scale" interactive>
            <h3>Scale Animation</h3>
            <p style={{ color: SEMANTIC_TOKENS.color.text.secondary }}>
              Pop-in scale effect
            </p>
          </AnimatedCard>

          <AnimatedCard animationType="slide" interactive>
            <h3>Slide Animation</h3>
            <p style={{ color: SEMANTIC_TOKENS.color.text.secondary }}>
              Slide from right
            </p>
          </AnimatedCard>
        </div>
      </section>

      {/* 列表动画 */}
      <section>
        <h2 style={{
          fontSize: SEMANTIC_TOKENS.typography.fontSize.xl,
          color: SEMANTIC_TOKENS.color.text.primary,
          marginBottom: SEMANTIC_TOKENS.spacing.layout.md,
        }}>
          Staggered List Animation
        </h2>
        <AnimatedList staggerDelay={0.1}>
          {listItems.map((item, index) => (
            <div
              key={index}
              style={{
                background: SEMANTIC_TOKENS.color.bg.surface,
                padding: SEMANTIC_TOKENS.spacing.component.lg,
                borderRadius: SEMANTIC_TOKENS.border.radius.md,
                border: `${SEMANTIC_TOKENS.border.width.thin} solid ${SEMANTIC_TOKENS.color.border.default}`,
              }}
            >
              {item}
            </div>
          ))}
        </AnimatedList>
      </section>
    </div>
  );
};
