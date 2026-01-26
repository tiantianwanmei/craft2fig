// ============================================================================
// 🎨 SEMANTIC TOKEN SYSTEM - 语义化 Token 层
// ============================================================================
// 这一层定义语义化的设计 tokens，所有值必须引用 BASE_TOKENS
// COMPONENT_TOKENS 应该引用这一层，而不是直接引用 BASE_TOKENS

import { BASE_TOKENS } from './baseTokens';

// 预定义 spacing.component，供其他 spacing 属性引用
const SPACING_COMPONENT = {
  xs: BASE_TOKENS.spacing[1],      // 4px
  sm: BASE_TOKENS.spacing['1.5'],  // 6px
  md: BASE_TOKENS.spacing[2],      // 8px
  base: BASE_TOKENS.spacing['2.5'], // 10px
  lg: BASE_TOKENS.spacing[3],      // 12px
  xl: BASE_TOKENS.spacing[4],      // 16px
};

export const SEMANTIC_TOKENS = {
  // ========== COLORS - 颜色语义化 ==========
  color: {
    // 文字颜色
    text: {
      primary: BASE_TOKENS.colors.white,
      secondary: BASE_TOKENS.colors.alpha['white-60'],
      tertiary: BASE_TOKENS.colors.alpha['white-40'],
      disabled: BASE_TOKENS.colors.alpha['white-30'],
      inverse: BASE_TOKENS.colors.black,
      brand: BASE_TOKENS.colors.primary[500],
      accent: BASE_TOKENS.colors.accent[500],
      success: BASE_TOKENS.colors.success[500],
      warning: BASE_TOKENS.colors.warning[500],
      error: BASE_TOKENS.colors.error[500],
    },

    // 背景颜色
    bg: {
      primary: BASE_TOKENS.colors.neutral[900],
      secondary: BASE_TOKENS.colors.neutral[800],
      tertiary: BASE_TOKENS.colors.neutral[700],
      surface: BASE_TOKENS.colors.alpha['black-75'],
      overlay: BASE_TOKENS.colors.alpha['black-90'],
      interactive: {
        default: BASE_TOKENS.colors.alpha['white-5'],
        hover: BASE_TOKENS.colors.alpha['white-10'],
        active: BASE_TOKENS.colors.alpha['white-15'],
        selected: BASE_TOKENS.colors.alpha['white-20'],
      },
      brand: BASE_TOKENS.colors.primary[500],
      accent: BASE_TOKENS.colors.accent[500],
    },

    // 边框颜色
    border: {
      default: BASE_TOKENS.colors.alpha['white-8'],   // 修改：从 white-10 改为 white-8 (0.08)
      strong: BASE_TOKENS.colors.alpha['white-15'],   // 修改：从 white-20 改为 white-15 (0.15)
      weak: BASE_TOKENS.colors.alpha['white-4'],      // 修改：从 white-6 改为 white-4 (0.04)
      subtle: BASE_TOKENS.colors.alpha['white-10'],
      focus: BASE_TOKENS.colors.primary[500],
      error: BASE_TOKENS.colors.error[500],
      info: BASE_TOKENS.colors.primary[400],
    },

    // 表面颜色 - 用于各种表面和覆盖层
    surface: {
      canvas: BASE_TOKENS.colors.neutral[800],       // 修改：从 950 改为 800 (#1a1a1e)
      // 渐变 canvas 背景 - 用于毛玻璃效果
      canvasGradient: `linear-gradient(135deg,
        ${BASE_TOKENS.colors.neutral[900]} 0%,
        ${BASE_TOKENS.colors.neutral[800]} 25%,
        #1e293b 50%,
        ${BASE_TOKENS.colors.neutral[800]} 75%,
        ${BASE_TOKENS.colors.neutral[900]} 100%)`,
      overlay: BASE_TOKENS.colors.alpha['black-90'], // 覆盖层
      error: BASE_TOKENS.colors.neutral[900],        // 错误表面
      info: BASE_TOKENS.colors.primary['500-alpha-10'],  // 信息表面
    },

    // 按钮颜色
    button: {
      primary: {
        bg: BASE_TOKENS.colors.primary[500],
        hover: BASE_TOKENS.colors.primary[600],
        text: BASE_TOKENS.colors.white,
      },
      secondary: {
        bg: BASE_TOKENS.colors.alpha['white-10'],
        hover: BASE_TOKENS.colors.alpha['white-15'],
        text: BASE_TOKENS.colors.white,
      },
    },

    // 工艺颜色 - 用于不同的印刷工艺类型
    craft: {
      emboss: BASE_TOKENS.colors.success[500],    // 压凹 - 绿色
      deboss: BASE_TOKENS.colors.accent[500],     // 压凸 - 紫色
      uv: BASE_TOKENS.colors.primary[500],        // UV - 蓝色
      hotfoil: BASE_TOKENS.colors.warning[500],   // 烫金 - 橙色
      varnish: BASE_TOKENS.colors.accent[600],    // 上光 - 深紫色
      spotUv: BASE_TOKENS.colors.primary[600],    // 局部UV - 深蓝色
      texture: BASE_TOKENS.colors.neutral[400],   // 纹理 - 灰色
    },

    // 折叠边颜色 - 用于不同的折叠边类型
    fold: {
      left: BASE_TOKENS.colors.warning[500],      // 左 - 橙色
      right: BASE_TOKENS.colors.success[500],     // 右 - 绿色
      front: BASE_TOKENS.colors.primary[600],     // 前 - 紫色
      topFlap: BASE_TOKENS.colors.error[400],     // 顶翻盖 - 粉色
      bottomFlap: BASE_TOKENS.colors.accent[400], // 底翻盖 - 青色
      custom: BASE_TOKENS.colors.neutral[500],    // 自定义 - 灰色
    },

    // 滑块颜色
    slider: {
      track: BASE_TOKENS.colors.alpha['white-20'],
      thumb: `linear-gradient(135deg, ${BASE_TOKENS.colors.primary[400]} 0%, ${BASE_TOKENS.colors.primary[600]} 100%)`,
      thumbRing: BASE_TOKENS.colors.primary['500-alpha-30'],
      thumbShadow: BASE_TOKENS.colors.primary['500-alpha-40'],
    },

    // 阴影颜色
    shadow: {
      small: BASE_TOKENS.colors.alpha['black-20'],
      medium: BASE_TOKENS.colors.alpha['black-30'],
      large: BASE_TOKENS.colors.alpha['black-40'],
    },
  },

  // ========== SPACING - 间距语义化 ==========
  spacing: {
    // 组件内部间距
    component: SPACING_COMPONENT,

    // 布局间距
    layout: {
      xs: BASE_TOKENS.spacing[2],      // 8px
      sm: BASE_TOKENS.spacing[3],      // 12px
      md: BASE_TOKENS.spacing[4],      // 16px
      lg: BASE_TOKENS.spacing[6],      // 24px
      xl: BASE_TOKENS.spacing[8],      // 32px
    },

    // 面板间距 - 用于侧边栏等面板
    panel: {
      paddingX: SPACING_COMPONENT.xs,  // 4px - 左右边距 (测试用)
      paddingY: SPACING_COMPONENT.xl,  // 16px - 上下边距
      marginLeft: SPACING_COMPONENT.base, // 10px - 侧边栏左侧间距
      marginRight: SPACING_COMPONENT.base, // 10px - 侧边栏右侧间距
    },

    // 间隙 - 引用 component 层级
    gap: {
      xs: SPACING_COMPONENT.xs,      // 4px
      sm: SPACING_COMPONENT.sm,      // 6px
      md: SPACING_COMPONENT.md,      // 8px
      lg: SPACING_COMPONENT.lg,      // 12px
      xl: SPACING_COMPONENT.xl,      // 16px
    },

    // Section 区块间距 - 用于面板内的区块分隔
    section: {
      marginBottom: BASE_TOKENS.spacing[6],    // 24px - 区块底部间距
      titleMarginBottom: BASE_TOKENS.spacing[3], // 12px - 标题下方间距
    },
  },

  // ========== TYPOGRAPHY - 排版语义化 ==========
  typography: {
    fontSize: {
      micro: BASE_TOKENS.fontSize.micro,  // 9px - 匹配原始 HTML
      xs: BASE_TOKENS.fontSize.xs,        // 10px
      sm: BASE_TOKENS.fontSize.sm,        // 11px
      base: BASE_TOKENS.fontSize.md,      // 12px
      md: BASE_TOKENS.fontSize.md,        // 12px
      lg: BASE_TOKENS.fontSize.lg,        // 13px
      xl: BASE_TOKENS.fontSize.xl,        // 14px
      '2xl': BASE_TOKENS.fontSize['2xl'], // 16px
      '3xl': BASE_TOKENS.fontSize['3xl'], // 18px
    },
    fontWeight: {
      regular: BASE_TOKENS.fontWeight.regular,
      medium: BASE_TOKENS.fontWeight.medium,
      semibold: BASE_TOKENS.fontWeight.semibold,
      bold: BASE_TOKENS.fontWeight.bold,
    },
    lineHeight: {
      tight: BASE_TOKENS.lineHeight.tight,
      snug: BASE_TOKENS.lineHeight.snug,
      normal: BASE_TOKENS.lineHeight.normal,
      relaxed: BASE_TOKENS.lineHeight.relaxed,
    },
  },

  // ========== BORDER - 边框语义化 ==========
  border: {
    width: {
      thin: BASE_TOKENS.borderWidth[1],
      normal: BASE_TOKENS.borderWidth[2],
      thick: BASE_TOKENS.borderWidth[3],
    },
    radius: {
      none: BASE_TOKENS.borderRadius.none,
      xs: BASE_TOKENS.borderRadius.xs,
      sm: BASE_TOKENS.borderRadius.sm,
      md: BASE_TOKENS.borderRadius.md,
      lg: BASE_TOKENS.borderRadius.lg,
      xl: BASE_TOKENS.borderRadius.xl,
      full: BASE_TOKENS.borderRadius.full,
    },
  },

  // ========== MOTION - 动画语义化 ==========
  motion: {
    duration: {
      instant: BASE_TOKENS.duration.instant,
      fast: BASE_TOKENS.duration.fast,
      normal: BASE_TOKENS.duration.base,
      slow: BASE_TOKENS.duration.slow,
    },
    easing: {
      standard: BASE_TOKENS.easing.standard,
      decel: BASE_TOKENS.easing.decel,
      accel: BASE_TOKENS.easing.accel,
    },
  },

  // ========== SHADOW - 阴影语义化 ==========
  shadow: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    lg: '0 8px 24px rgba(0, 0, 0, 0.5)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
  },

  // ========== ANIMATION - 动画交互效果语义化 ==========
  // 世界级 Framer Motion 动画系统 - 灵感来自 Apple、Stripe、Linear
  animation: {
    // 淡入淡出动画
    fade: {
      in: {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.2, ease: BASE_TOKENS.easing.smooth },
      },
      inUp: {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -20 },
        transition: BASE_TOKENS.spring.gentle,
      },
      inDown: {
        initial: { opacity: 0, y: -20 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: 20 },
        transition: BASE_TOKENS.spring.gentle,
      },
    },

    // 缩放动画
    scale: {
      in: {
        initial: { opacity: 0, scale: 0.95 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.95 },
        transition: BASE_TOKENS.spring.snappy,
      },
      bounce: {
        initial: { scale: 0.8, opacity: 0 },
        animate: { scale: 1, opacity: 1 },
        exit: { scale: 0.8, opacity: 0 },
        transition: BASE_TOKENS.spring.bouncy,
      },
      pop: {
        initial: { scale: 0 },
        animate: { scale: 1 },
        exit: { scale: 0 },
        transition: BASE_TOKENS.spring.snappy,
      },
    },

    // 滑动动画
    slide: {
      left: {
        initial: { x: -100, opacity: 0 },
        animate: { x: 0, opacity: 1 },
        exit: { x: -100, opacity: 0 },
        transition: BASE_TOKENS.spring.default,
      },
      right: {
        initial: { x: 100, opacity: 0 },
        animate: { x: 0, opacity: 1 },
        exit: { x: 100, opacity: 0 },
        transition: BASE_TOKENS.spring.default,
      },
    },

    // 交互状态动画 - 按钮、卡片等
    interactive: {
      // 悬停效果
      hover: {
        scale: 1.02,
        transition: BASE_TOKENS.spring.snappy,
      },
      // 按下效果
      tap: {
        scale: 0.98,
        transition: BASE_TOKENS.spring.snappy,
      },
      // 聚焦效果
      focus: {
        scale: 1.01,
        boxShadow: `0 0 0 3px ${BASE_TOKENS.colors.primary[500]}40`,
        transition: BASE_TOKENS.spring.gentle,
      },
    },

    // 列表动画 - stagger children
    list: {
      container: {
        animate: { transition: { staggerChildren: 0.05 } },
      },
      item: {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        transition: BASE_TOKENS.spring.gentle,
      },
    },
  },

  // ========== GLASSMORPHISM - 毛玻璃效果语义化 ==========
  // 世界级毛玻璃设计系统 - 灵感来自 Apple、Microsoft Fluent Design
  // 注意：glass 作为复合样式预设，直接引用 BASE_TOKENS 生成完整 CSS 字符串
  // 这是合理的，因为这些是最终输出值，不需要再被其他 token 引用
  glass: {
    // 基础毛玻璃效果 - 适用于卡片、面板
    base: {
      background: BASE_TOKENS.colors.alpha['white-5'],
      backdropFilter: `blur(${BASE_TOKENS.blur.lg}) saturate(180%)`,
      border: `${BASE_TOKENS.borderWidth[1]} solid ${BASE_TOKENS.colors.alpha['white-10']}`,
      boxShadow: `0 8px 32px 0 ${BASE_TOKENS.colors.alpha['black-30']}`,
    },

    // 轻量毛玻璃 - 适用于悬浮提示、下拉菜单
    light: {
      background: BASE_TOKENS.colors.alpha['white-3'],
      backdropFilter: `blur(${BASE_TOKENS.blur.md}) saturate(150%)`,
      border: `${BASE_TOKENS.borderWidth[1]} solid ${BASE_TOKENS.colors.alpha['white-6']}`,
      boxShadow: `0 4px 16px 0 ${BASE_TOKENS.colors.alpha['black-20']}`,
    },

    // 强烈毛玻璃 - 适用于模态框、重要面板
    strong: {
      background: BASE_TOKENS.colors.alpha['white-10'],
      backdropFilter: `blur(${BASE_TOKENS.blur.xl}) saturate(200%)`,
      border: `${BASE_TOKENS.borderWidth[1]} solid ${BASE_TOKENS.colors.alpha['white-15']}`,
      boxShadow: `0 16px 48px 0 ${BASE_TOKENS.colors.alpha['black-40']}`,
    },

    // 深色毛玻璃 - 适用于深色主题
    dark: {
      background: BASE_TOKENS.colors.alpha['black-40'],
      backdropFilter: `blur(${BASE_TOKENS.blur.lg}) saturate(180%)`,
      border: `${BASE_TOKENS.borderWidth[1]} solid ${BASE_TOKENS.colors.alpha['white-10']}`,
      boxShadow: `0 8px 32px 0 ${BASE_TOKENS.colors.alpha['black-50']}`,
    },

    // 彩色毛玻璃 - 适用于品牌色面板
    colored: {
      primary: {
        background: `${BASE_TOKENS.colors.primary[500]}15`, // 15% opacity
        backdropFilter: `blur(${BASE_TOKENS.blur.lg}) saturate(180%)`,
        border: `${BASE_TOKENS.borderWidth[1]} solid ${BASE_TOKENS.colors.primary[500]}30`,
        boxShadow: `0 8px 32px 0 ${BASE_TOKENS.colors.primary[500]}20`,
      },
      accent: {
        background: `${BASE_TOKENS.colors.accent[500]}15`,
        backdropFilter: `blur(${BASE_TOKENS.blur.lg}) saturate(180%)`,
        border: `${BASE_TOKENS.borderWidth[1]} solid ${BASE_TOKENS.colors.accent[500]}30`,
        boxShadow: `0 8px 32px 0 ${BASE_TOKENS.colors.accent[500]}20`,
      },
    },

    // 交互状态毛玻璃
    interactive: {
      default: {
        background: BASE_TOKENS.colors.alpha['white-5'],
        backdropFilter: `blur(${BASE_TOKENS.blur.md}) saturate(150%)`,
        border: `${BASE_TOKENS.borderWidth[1]} solid ${BASE_TOKENS.colors.alpha['white-10']}`,
      },
      hover: {
        background: BASE_TOKENS.colors.alpha['white-10'],
        backdropFilter: `blur(${BASE_TOKENS.blur.lg}) saturate(170%)`,
        border: `${BASE_TOKENS.borderWidth[1]} solid ${BASE_TOKENS.colors.alpha['white-15']}`,
      },
      active: {
        background: BASE_TOKENS.colors.alpha['white-15'],
        backdropFilter: `blur(${BASE_TOKENS.blur.lg}) saturate(180%)`,
        border: `${BASE_TOKENS.borderWidth[1]} solid ${BASE_TOKENS.colors.alpha['white-20']}`,
      },
    },

    // 模糊强度预设
    blur: {
      subtle: `blur(${BASE_TOKENS.blur.sm})`,      // 4px - 微妙模糊
      light: `blur(${BASE_TOKENS.blur.md})`,       // 8px - 轻度模糊
      medium: `blur(${BASE_TOKENS.blur.lg})`,      // 16px - 中度模糊
      strong: `blur(${BASE_TOKENS.blur.xl})`,      // 24px - 强烈模糊
      extreme: `blur(${BASE_TOKENS.blur['2xl']})`, // 40px - 极致模糊
    },

    // 饱和度预设
    saturation: {
      low: 'saturate(120%)',
      normal: 'saturate(150%)',
      high: 'saturate(180%)',
      vivid: 'saturate(200%)',
    },
  },

  // ========== GLASSMORPHISM FALLBACK - 不支持 backdrop-filter 的环境 ==========
  // 用于 Figma 插件等不支持 backdrop-filter 的环境
  // 使用渐变和多层阴影模拟毛玻璃效果
  // 注意：同 glass，作为复合样式预设，直接引用 BASE_TOKENS
  glassFallback: {
    // 深色面板 - 侧边栏专用
    darkPanel: {
      background: `linear-gradient(
        to right,
        rgba(18, 18, 22, 0.98) 0%,
        rgba(15, 15, 18, 0.95) 100%
      )`,
      border: `${BASE_TOKENS.borderWidth[1]} solid ${BASE_TOKENS.colors.alpha['white-10']}`,
      boxShadow: `
        -8px 0 32px rgba(0, 0, 0, 0.6),
        -2px 0 8px rgba(0, 0, 0, 0.4),
        inset 1px 0 0 rgba(255, 255, 255, 0.08),
        inset -1px 0 0 rgba(0, 0, 0, 0.2)
      `,
    },

    // 交互按钮 - 折叠按钮专用
    interactiveButton: {
      background: `linear-gradient(
        to right,
        rgba(20, 20, 25, 0.95) 0%,
        rgba(25, 25, 30, 0.98) 100%
      )`,
      border: `${BASE_TOKENS.borderWidth[1]} solid ${BASE_TOKENS.colors.alpha['white-10']}`,
      boxShadow: `
        -2px 0 8px rgba(0, 0, 0, 0.4),
        inset 1px 0 0 rgba(255, 255, 255, 0.06)
      `,
    },

    // Modern Dark Panel - 真正的毛玻璃效果
    // 参考: 2026-01-23 项目的成功实现
    modernDarkPanel: {
      background: 'rgba(20, 20, 25, 0.85)',
      backdropFilter: `blur(${BASE_TOKENS.blur.md})`,
      border: `${BASE_TOKENS.borderWidth[1]} solid ${BASE_TOKENS.colors.alpha['white-15']}`,
      boxShadow: `
        -16px 0 48px rgba(0, 0, 0, 0.5),
        inset 1px 0 0 rgba(255, 255, 255, 0.1)
      `,
    },
  },

  // ========== COMPONENT SIZES - 组件尺寸语义化 ==========
  // 注意：特殊尺寸仍需引用 BASE_TOKENS，因为 semantic spacing 没有对应值
  size: {
    // 浮动工具栏 - 缩放控制等
    floatingToolbar: {
      button: BASE_TOKENS.spacing['5.5'],        // 22px - 按钮尺寸 (特殊值)
      icon: BASE_TOKENS.spacing[3],              // 12px - 图标尺寸
      dividerHeight: BASE_TOKENS.spacing['3.5'], // 14px - 分隔线高度 (特殊值)
      zoomDisplay: BASE_TOKENS.spacing[9],       // 36px - 缩放百分比显示宽度 (特殊值)
      gap: BASE_TOKENS.spacing['0.5'],           // 2px - 元素间距 (特殊值)
      padding: BASE_TOKENS.spacing['0.5'],       // 2px - 容器内边距 (特殊值)
      dividerMargin: BASE_TOKENS.spacing['0.5'], // 2px - 分隔线外边距 (特殊值)
    },
    // 工艺缩略图
    craftThumbnail: {
      card: BASE_TOKENS.spacing['7.25'],   // 29px - 卡片尺寸 (特殊值)
      canvas: BASE_TOKENS.spacing['6.5'],  // 26px - 画布尺寸 (特殊值)
    },
  },
};
