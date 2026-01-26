/** @type {import('tailwindcss').Config} */
/**
 * 🎯 Monorepo Semantic Tokens - 直接引用 TypeScript 对象
 *
 * ✅ 优势：
 * - 类型安全：TypeScript 编译时检查
 * - 自动补全：IDE 智能提示
 * - 单一数据源：所有 tokens 在 monorepo 中统一管理
 * - 无需 CSS 变量：直接使用具体值
 *
 * 🏗️ 架构：
 * Layer 1 (Base):      450+ tokens - 原始设计值 (BASE_TOKENS)
 * Layer 2 (Semantic):  133 tokens  - 语义化命名 (SEMANTIC_TOKENS) ← 我们使用这层
 * Layer 3 (Component): 238 tokens  - 组件专用 (COMPONENT_TOKENS)
 */

import { SEMANTIC_TOKENS } from '../packages/shared-theme/src/tokens/semanticTokens';

export default {
  darkMode: ["class"],
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./src/app/index.html"
  ],
  theme: {
    // ============================================================================
    // 🚫 禁用默认 Tailwind 颜色 - 强制使用 Semantic Tokens
    // ============================================================================
    colors: {
      'transparent': 'transparent',
      'current': 'currentColor',
    },

    container: {
      center: true,
      padding: "2rem"
    },
    extend: {
      // ============================================================================
      // 🎨 SEMANTIC TOKENS - 直接映射到 TypeScript 对象
      // ============================================================================

      colors: {
        // ========== Shadcn 标准颜色映射 ==========
        // 将 Shadcn 的抽象名称映射到 Semantic Tokens

        border: SEMANTIC_TOKENS.color.border.subtle,
        input: SEMANTIC_TOKENS.color.border.default,
        ring: SEMANTIC_TOKENS.color.border.focus,
        background: SEMANTIC_TOKENS.color.bg.primary,
        foreground: SEMANTIC_TOKENS.color.text.primary,

        primary: {
          DEFAULT: SEMANTIC_TOKENS.color.button.primary.bg,
          foreground: SEMANTIC_TOKENS.color.button.primary.text,
        },
        secondary: {
          DEFAULT: SEMANTIC_TOKENS.color.bg.secondary,
          foreground: SEMANTIC_TOKENS.color.text.primary,
        },
        destructive: {
          DEFAULT: SEMANTIC_TOKENS.color.text.error,
          foreground: SEMANTIC_TOKENS.color.text.inverse,
        },
        muted: {
          DEFAULT: SEMANTIC_TOKENS.color.bg.surface,
          foreground: SEMANTIC_TOKENS.color.text.tertiary,
        },
        accent: {
          DEFAULT: SEMANTIC_TOKENS.color.bg.interactive.hover,
          foreground: SEMANTIC_TOKENS.color.text.primary,
        },
        popover: {
          DEFAULT: SEMANTIC_TOKENS.color.bg.primary,
          foreground: SEMANTIC_TOKENS.color.text.primary,
        },
        card: {
          DEFAULT: SEMANTIC_TOKENS.color.bg.surface,
          foreground: SEMANTIC_TOKENS.color.text.primary,
        },

        // ========== Genki 语义化颜色系统 ==========
        // 背景色 (bg-*)
        bg: {
          canvas: SEMANTIC_TOKENS.color.surface.canvas,
          surface: SEMANTIC_TOKENS.color.bg.surface,
          primary: SEMANTIC_TOKENS.color.bg.primary,
          secondary: SEMANTIC_TOKENS.color.bg.secondary,
          tertiary: SEMANTIC_TOKENS.color.bg.tertiary,
          overlay: SEMANTIC_TOKENS.color.bg.overlay,

          // Interactive states
          interactive: {
            default: SEMANTIC_TOKENS.color.bg.interactive.default,
            hover: SEMANTIC_TOKENS.color.bg.interactive.hover,
            active: SEMANTIC_TOKENS.color.bg.interactive.active,
            selected: SEMANTIC_TOKENS.color.bg.interactive.selected,
          },

          // Brand colors
          brand: SEMANTIC_TOKENS.color.bg.brand,
          accent: SEMANTIC_TOKENS.color.bg.accent,
        },

        // 前景色 (fg-*)
        fg: {
          text: {
            primary: SEMANTIC_TOKENS.color.text.primary,
            secondary: SEMANTIC_TOKENS.color.text.secondary,
            tertiary: SEMANTIC_TOKENS.color.text.tertiary,
            disabled: SEMANTIC_TOKENS.color.text.disabled,
            inverse: SEMANTIC_TOKENS.color.text.inverse,
            brand: SEMANTIC_TOKENS.color.text.brand,
          },
        },
      },

      // ========== SPACING - 间距 ==========
      spacing: {
        // Component spacing
        'component-xs': SEMANTIC_TOKENS.spacing.component.xs,
        'component-sm': SEMANTIC_TOKENS.spacing.component.sm,
        'component-md': SEMANTIC_TOKENS.spacing.component.md,
        'component-lg': SEMANTIC_TOKENS.spacing.component.lg,
        'component-xl': SEMANTIC_TOKENS.spacing.component.xl,

        // Layout spacing
        'layout-xs': SEMANTIC_TOKENS.spacing.layout.xs,
        'layout-sm': SEMANTIC_TOKENS.spacing.layout.sm,
        'layout-md': SEMANTIC_TOKENS.spacing.layout.md,
        'layout-lg': SEMANTIC_TOKENS.spacing.layout.lg,
        'layout-xl': SEMANTIC_TOKENS.spacing.layout.xl,

        // Gap spacing
        'gap-xs': SEMANTIC_TOKENS.spacing.gap.xs,
        'gap-sm': SEMANTIC_TOKENS.spacing.gap.sm,
        'gap-md': SEMANTIC_TOKENS.spacing.gap.md,
        'gap-lg': SEMANTIC_TOKENS.spacing.gap.lg,
        'gap-xl': SEMANTIC_TOKENS.spacing.gap.xl,
      },

      // ========== BORDER RADIUS - 圆角 ==========
      borderRadius: {
        xs: SEMANTIC_TOKENS.border.radius.xs,
        sm: SEMANTIC_TOKENS.border.radius.sm,
        md: SEMANTIC_TOKENS.border.radius.md,
        lg: SEMANTIC_TOKENS.border.radius.lg,
        xl: SEMANTIC_TOKENS.border.radius.xl,
        '2xl': SEMANTIC_TOKENS.border.radius['2xl'],
        full: SEMANTIC_TOKENS.border.radius.full,
      },

      // ========== TYPOGRAPHY - 字体 ==========
      fontSize: {
        micro: SEMANTIC_TOKENS.typography.fontSize.micro,
        xs: SEMANTIC_TOKENS.typography.fontSize.xs,
        sm: SEMANTIC_TOKENS.typography.fontSize.sm,
        base: SEMANTIC_TOKENS.typography.fontSize.base,
        md: SEMANTIC_TOKENS.typography.fontSize.md,
        lg: SEMANTIC_TOKENS.typography.fontSize.lg,
        xl: SEMANTIC_TOKENS.typography.fontSize.xl,
        '2xl': SEMANTIC_TOKENS.typography.fontSize['2xl'],
        '3xl': SEMANTIC_TOKENS.typography.fontSize['3xl'],
      },

      fontWeight: {
        regular: SEMANTIC_TOKENS.typography.fontWeight.regular,
        medium: SEMANTIC_TOKENS.typography.fontWeight.medium,
        semibold: SEMANTIC_TOKENS.typography.fontWeight.semibold,
        bold: SEMANTIC_TOKENS.typography.fontWeight.bold,
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

