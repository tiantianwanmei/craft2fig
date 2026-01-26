/**
 * 🎨 GlassShowcase - 毛玻璃效果展示页面
 * 展示所有毛玻璃 token 的实际效果
 */

import React from 'react';
import { SEMANTIC_TOKENS } from '@genki/shared-theme';
import { GlassCard } from './GlassCard';

export const GlassShowcase: React.FC = () => {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
        marginBottom: SEMANTIC_TOKENS.spacing.layout.lg,
      }}>
        🌟 Glassmorphism Showcase
      </h1>

      {/* 基础变体 */}
      <section>
        <h2 style={{
          fontSize: SEMANTIC_TOKENS.typography.fontSize.xl,
          fontWeight: SEMANTIC_TOKENS.typography.fontWeight.semibold,
          color: SEMANTIC_TOKENS.color.text.primary,
          marginBottom: SEMANTIC_TOKENS.spacing.layout.md,
        }}>
          基础变体
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: SEMANTIC_TOKENS.spacing.layout.md,
        }}>
          <GlassCard variant="light">
            <h3 style={{ fontSize: SEMANTIC_TOKENS.typography.fontSize.lg }}>Light</h3>
            <p style={{ color: SEMANTIC_TOKENS.color.text.secondary }}>
              轻量毛玻璃 - 适用于悬浮提示
            </p>
          </GlassCard>

          <GlassCard variant="base">
            <h3 style={{ fontSize: SEMANTIC_TOKENS.typography.fontSize.lg }}>Base</h3>
            <p style={{ color: SEMANTIC_TOKENS.color.text.secondary }}>
              基础毛玻璃 - 适用于卡片面板
            </p>
          </GlassCard>

          <GlassCard variant="strong">
            <h3 style={{ fontSize: SEMANTIC_TOKENS.typography.fontSize.lg }}>Strong</h3>
            <p style={{ color: SEMANTIC_TOKENS.color.text.secondary }}>
              强烈毛玻璃 - 适用于模态框
            </p>
          </GlassCard>

          <GlassCard variant="dark">
            <h3 style={{ fontSize: SEMANTIC_TOKENS.typography.fontSize.lg }}>Dark</h3>
            <p style={{ color: SEMANTIC_TOKENS.color.text.secondary }}>
              深色毛玻璃 - 适用于深色主题
            </p>
          </GlassCard>
        </div>
      </section>

      {/* 彩色变体 */}
      <section>
        <h2 style={{
          fontSize: SEMANTIC_TOKENS.typography.fontSize.xl,
          fontWeight: SEMANTIC_TOKENS.typography.fontWeight.semibold,
          color: SEMANTIC_TOKENS.color.text.primary,
          marginBottom: SEMANTIC_TOKENS.spacing.layout.md,
        }}>
          彩色变体
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: SEMANTIC_TOKENS.spacing.layout.md,
        }}>
          <GlassCard colorVariant="primary">
            <h3 style={{ fontSize: SEMANTIC_TOKENS.typography.fontSize.lg }}>Primary</h3>
            <p style={{ color: SEMANTIC_TOKENS.color.text.secondary }}>
              主品牌色毛玻璃
            </p>
          </GlassCard>

          <GlassCard colorVariant="accent">
            <h3 style={{ fontSize: SEMANTIC_TOKENS.typography.fontSize.lg }}>Accent</h3>
            <p style={{ color: SEMANTIC_TOKENS.color.text.secondary }}>
              强调色毛玻璃
            </p>
          </GlassCard>
        </div>
      </section>

      {/* 交互式 */}
      <section>
        <h2 style={{
          fontSize: SEMANTIC_TOKENS.typography.fontSize.xl,
          fontWeight: SEMANTIC_TOKENS.typography.fontWeight.semibold,
          color: SEMANTIC_TOKENS.color.text.primary,
          marginBottom: SEMANTIC_TOKENS.spacing.layout.md,
        }}>
          交互式毛玻璃
        </h2>
        <GlassCard
          interactive
          onClick={() => alert('Clicked!')}
          style={{ maxWidth: '400px' }}
        >
          <h3 style={{ fontSize: SEMANTIC_TOKENS.typography.fontSize.lg }}>
            Interactive Card
          </h3>
          <p style={{ color: SEMANTIC_TOKENS.color.text.secondary }}>
            悬停和点击查看效果变化
          </p>
        </GlassCard>
      </section>
    </div>
  );
};
