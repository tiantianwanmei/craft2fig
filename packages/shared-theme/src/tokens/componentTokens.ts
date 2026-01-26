// ============================================================================
// 🎯 组件级 Token 系统 - 极细颗粒度
// ============================================================================
// 每个组件都有独立的 Token，互不影响
// 所有值必须引用 SEMANTIC_TOKENS，严禁硬编码

import { SEMANTIC_TOKENS } from './semanticTokens';
import { BASE_TOKENS } from './baseTokens';

export const COMPONENT_TOKENS = {
  // ==================== 标题组件 ====================
  appTitle: {
    fontSize: SEMANTIC_TOKENS.typography.fontSize['2xl'],
    fontWeight: SEMANTIC_TOKENS.typography.fontWeight.bold,
    color: '#22d3ee',
    lineHeight: SEMANTIC_TOKENS.typography.lineHeight.tight,
    background: 'linear-gradient(to right, #22d3ee, #60a5fa, #818cf8)',
  },

  appSubtitle: {
    fontSize: SEMANTIC_TOKENS.typography.fontSize.xs,
    fontWeight: SEMANTIC_TOKENS.typography.fontWeight.regular,
    color: SEMANTIC_TOKENS.color.text.secondary,
    lineHeight: SEMANTIC_TOKENS.typography.lineHeight.snug,
  },

  // ==================== 信息卡片组件 ====================
  infoCard: {
    container: {
      backgroundColor: SEMANTIC_TOKENS.color.bg.surface,
      borderColor: SEMANTIC_TOKENS.color.border.default,
      borderWidth: SEMANTIC_TOKENS.border.width.thin,
      borderRadius: SEMANTIC_TOKENS.border.radius.xl,
      padding: SEMANTIC_TOKENS.spacing.component.xl,
      width: '200px',
    },
    label: {
      fontSize: SEMANTIC_TOKENS.typography.fontSize.base,
      fontWeight: SEMANTIC_TOKENS.typography.fontWeight.regular,
      color: SEMANTIC_TOKENS.color.text.secondary,
      marginBottom: SEMANTIC_TOKENS.spacing.component.xs,
    },
    value: {
      fontSize: SEMANTIC_TOKENS.typography.fontSize['3xl'],
      fontWeight: SEMANTIC_TOKENS.typography.fontWeight.bold,
      color: SEMANTIC_TOKENS.color.text.brand,
      background: `linear-gradient(to right, ${BASE_TOKENS.colors.primary[500]}, ${BASE_TOKENS.colors.accent[500]})`,
      lineHeight: SEMANTIC_TOKENS.typography.lineHeight.tight,
    },
    unit: {
      fontSize: SEMANTIC_TOKENS.typography.fontSize.base,
      fontWeight: SEMANTIC_TOKENS.typography.fontWeight.regular,
      color: SEMANTIC_TOKENS.color.text.tertiary,
    },
  },

  // ==================== 按钮组件 ====================
  exportButton: {
    fontSize: SEMANTIC_TOKENS.typography.fontSize.xl,
    fontWeight: SEMANTIC_TOKENS.typography.fontWeight.bold,
    color: SEMANTIC_TOKENS.color.text.primary,
    background: `linear-gradient(to right, ${BASE_TOKENS.colors.primary[500]}, ${BASE_TOKENS.colors.accent[500]}, #6366f1)`,
    padding: SEMANTIC_TOKENS.spacing.component.xl,
    borderRadius: SEMANTIC_TOKENS.border.radius.xl,
    width: '100%',
  },

  headerButton: {
    fontSize: SEMANTIC_TOKENS.typography.fontSize.base,
    fontWeight: SEMANTIC_TOKENS.typography.fontWeight.medium,
    color: SEMANTIC_TOKENS.color.text.primary,
    background: SEMANTIC_TOKENS.color.bg.interactive.hover,
    padding: `${SEMANTIC_TOKENS.spacing.component.xs} ${SEMANTIC_TOKENS.spacing.component.md}`,
    borderRadius: SEMANTIC_TOKENS.border.radius.sm,
  },

  presetButton: {
    fontSize: SEMANTIC_TOKENS.typography.fontSize.lg,
    fontWeight: SEMANTIC_TOKENS.typography.fontWeight.medium,
    color: SEMANTIC_TOKENS.color.text.primary,
    background: SEMANTIC_TOKENS.color.bg.interactive.default,
    borderColor: SEMANTIC_TOKENS.color.border.default,
    borderWidth: SEMANTIC_TOKENS.border.width.thin,
    padding: `${SEMANTIC_TOKENS.spacing.component.lg} ${SEMANTIC_TOKENS.spacing.component.xl}`,
    borderRadius: SEMANTIC_TOKENS.border.radius.lg,
  },

  // ==================== 输入框组件 ====================
  parameterInput: {
    label: {
      fontSize: SEMANTIC_TOKENS.typography.fontSize.base,
      fontWeight: SEMANTIC_TOKENS.typography.fontWeight.semibold,
      color: SEMANTIC_TOKENS.color.text.secondary,
      textTransform: 'uppercase',
      letterSpacing: BASE_TOKENS.letterSpacing.wider,
    },
    input: {
      fontSize: SEMANTIC_TOKENS.typography.fontSize.lg,
      fontWeight: SEMANTIC_TOKENS.typography.fontWeight.medium,
      color: SEMANTIC_TOKENS.color.text.primary,
      background: SEMANTIC_TOKENS.color.bg.interactive.default,
      borderColor: SEMANTIC_TOKENS.color.border.default,
      borderWidth: SEMANTIC_TOKENS.border.width.thin,
      padding: `${SEMANTIC_TOKENS.spacing.component.md} ${SEMANTIC_TOKENS.spacing.component.lg}`,
      borderRadius: SEMANTIC_TOKENS.border.radius.md,
    },
    unit: {
      fontSize: SEMANTIC_TOKENS.typography.fontSize.md,
      fontWeight: SEMANTIC_TOKENS.typography.fontWeight.regular,
      color: SEMANTIC_TOKENS.color.text.tertiary,
    },
  },

  // ==================== 选择框组件 ====================
  // ❌ 已删除 layerSelect, paramSelect, craftButton
  // 这些只是 SEMANTIC_TOKENS 的简单映射，应该直接在组件中使用 SEMANTIC_TOKENS
  // 保持 COMPONENT_TOKENS 只包含真正需要组件级定制的配置

  // ==================== 滑块组件 ====================
  slider: {
    track: {
      height: SEMANTIC_TOKENS.spacing.component.xs,
      background: SEMANTIC_TOKENS.color.border.default,
      borderRadius: SEMANTIC_TOKENS.border.radius.xs,
    },
    thumb: {
      width: SEMANTIC_TOKENS.spacing.component.xl,
      height: SEMANTIC_TOKENS.spacing.component.xl,
      background: `linear-gradient(to right, ${BASE_TOKENS.colors.primary[500]}, ${BASE_TOKENS.colors.accent[500]})`,
      borderRadius: SEMANTIC_TOKENS.border.radius.full,
      border: `${SEMANTIC_TOKENS.border.width.normal} solid ${SEMANTIC_TOKENS.color.text.primary}`,
    },
    fill: {
      background: `linear-gradient(to right, ${BASE_TOKENS.colors.primary[500]}, ${BASE_TOKENS.colors.accent[500]})`,
    },
  },

  // ==================== 面板组件 ====================
  controlPanel: {
    background: SEMANTIC_TOKENS.color.bg.surface,
    borderColor: SEMANTIC_TOKENS.color.border.default,
    borderWidth: SEMANTIC_TOKENS.border.width.thin,
    padding: SEMANTIC_TOKENS.spacing.layout.lg,
  },

  designPanel: {
    background: SEMANTIC_TOKENS.color.bg.surface,
    borderColor: SEMANTIC_TOKENS.color.border.default,
    borderWidth: SEMANTIC_TOKENS.border.width.thin,
    width: '280px',
  },

  tokenPanel: {
    background: SEMANTIC_TOKENS.color.bg.surface,
    borderColor: SEMANTIC_TOKENS.color.border.default,
    borderWidth: SEMANTIC_TOKENS.border.width.thin,
    width: '280px',
  },

  // ==================== 预览区域 ====================
  previewArea: {
    background: `linear-gradient(135deg, ${BASE_TOKENS.colors.neutral[900]}, ${BASE_TOKENS.colors.neutral[800]}, ${BASE_TOKENS.colors.neutral[900]})`,
  },

  // ==================== SVG 元素 ====================
  svgPart: {
    stroke: 'url(#grad1)',
    strokeWidth: SEMANTIC_TOKENS.border.width.normal,
    opacity: BASE_TOKENS.opacity[90],
  },

  svgText: {
    primary: {
      fontSize: SEMANTIC_TOKENS.typography.fontSize.xs,
      fontWeight: SEMANTIC_TOKENS.typography.fontWeight.semibold,
      fill: SEMANTIC_TOKENS.color.text.primary,
      opacity: BASE_TOKENS.opacity[80],
    },
    secondary: {
      fontSize: BASE_TOKENS.fontSize[9],
      fontWeight: SEMANTIC_TOKENS.typography.fontWeight.regular,
      fill: SEMANTIC_TOKENS.color.text.brand,
      opacity: BASE_TOKENS.opacity[60],
    },
  },

  // ==================== 布局组件 ====================
  layout: {
    sidebarWidth: '260px',

    // 分隔线 - Figma 原生风格
    divider: {
      height: SEMANTIC_TOKENS.border.width.thin,
      background: SEMANTIC_TOKENS.color.border.weak,
      margin: SEMANTIC_TOKENS.spacing.component.xs,
    },

    // Craft Panel - Figma 原生紧凑间距
    craftPanel: {
      container: {
        padding: SEMANTIC_TOKENS.spacing.component.xs,
        gap: SEMANTIC_TOKENS.spacing.gap.xs,
      },
      section: {
        padding: `${SEMANTIC_TOKENS.spacing.component.md} ${SEMANTIC_TOKENS.spacing.component.lg}`,
        gap: SEMANTIC_TOKENS.spacing.gap.sm,
      },
      paramRow: {
        gap: SEMANTIC_TOKENS.spacing.gap.xs,
      },
    },

    // UV 预设按钮
    uvButton: {
      padding: `${SEMANTIC_TOKENS.spacing.component.sm} ${SEMANTIC_TOKENS.spacing.component.md}`,
      borderRadius: SEMANTIC_TOKENS.border.radius.sm,
      fontSize: SEMANTIC_TOKENS.typography.fontSize.xs,
    },

    // UV 预设网格
    uvPresetGrid: {
      container: {
        background: SEMANTIC_TOKENS.color.bg.interactive.default,
        padding: SEMANTIC_TOKENS.spacing.component.sm,
        borderRadius: SEMANTIC_TOKENS.border.radius.md,
        border: `${SEMANTIC_TOKENS.border.width.thin} solid ${SEMANTIC_TOKENS.color.border.weak}`,
      },
      item: {
        padding: SEMANTIC_TOKENS.spacing.component.sm,
        fontSize: SEMANTIC_TOKENS.typography.fontSize.xs,
        fontWeight: SEMANTIC_TOKENS.typography.fontWeight.medium,
        borderRadius: SEMANTIC_TOKENS.border.radius.sm,
        // 不同深度的背景色
        bg: {
          variant1: SEMANTIC_TOKENS.color.bg.interactive.default,
          variant2: SEMANTIC_TOKENS.color.bg.interactive.hover,
          variant3: SEMANTIC_TOKENS.color.bg.interactive.active,
        },
        border: {
          default: `${SEMANTIC_TOKENS.border.width.thin} solid ${SEMANTIC_TOKENS.color.border.weak}`,
          selected: `${SEMANTIC_TOKENS.border.width.normal} solid ${SEMANTIC_TOKENS.color.border.focus}`,
        },
        color: {
          default: SEMANTIC_TOKENS.color.text.secondary,
          selected: SEMANTIC_TOKENS.color.text.brand,
        },
        selectedBg: `linear-gradient(135deg, ${SEMANTIC_TOKENS.color.bg.interactive.active}, ${SEMANTIC_TOKENS.color.bg.interactive.hover})`,
      },
    },
  },

  // ==================== Canvas 画布组件 ====================
  canvas: {
    // 画布背景 - 引用 semantic tokens
    bg: {
      area: SEMANTIC_TOKENS.color.bg.tertiary,
      surface: SEMANTIC_TOKENS.color.bg.secondary,
    },
    // 画布边框 - 使用 semantic 的 focus 边框（青蓝色）
    border: {
      surface: SEMANTIC_TOKENS.color.border.focus,
    },
  },

  // ==================== VectorCard 矢量卡片组件 ====================
  vectorCard: {
    // 边框颜色 - 引用 semantic tokens
    border: {
      default: SEMANTIC_TOKENS.color.border.info,
      hover: SEMANTIC_TOKENS.color.border.focus,
      selected: SEMANTIC_TOKENS.color.text.brand,
      hPanel: SEMANTIC_TOKENS.color.fold.left,
    },
    // 背景颜色 - 引用 semantic interactive bg
    bg: {
      default: SEMANTIC_TOKENS.color.surface.info,
      hover: SEMANTIC_TOKENS.color.bg.interactive.hover,
      selected: SEMANTIC_TOKENS.color.bg.interactive.selected,
      hPanel: SEMANTIC_TOKENS.color.bg.interactive.active,
    },
    // 文字颜色
    text: {
      default: SEMANTIC_TOKENS.color.text.tertiary,
      hover: SEMANTIC_TOKENS.color.text.secondary,
      selected: SEMANTIC_TOKENS.color.text.brand,
      hPanel: SEMANTIC_TOKENS.color.text.inverse,
    },
    // 序号徽章
    badge: {
      border: SEMANTIC_TOKENS.color.text.brand,
      text: SEMANTIC_TOKENS.color.text.brand,
      ghostBorder: SEMANTIC_TOKENS.color.text.disabled,
      ghostText: SEMANTIC_TOKENS.color.text.tertiary,
    },
    // 阴影效果
    shadow: {
      hPanel: SEMANTIC_TOKENS.shadow.md,
      selected: SEMANTIC_TOKENS.shadow.sm,
    },
  },
};

// ==================== Token 映射表 ====================
// 用于设计面板识别应该更新哪个组件的 Token
export const TOKEN_MAPPING: Record<string, keyof typeof COMPONENT_TOKENS> = {
  'app-title': 'appTitle',
  'app-subtitle': 'appSubtitle',
  'info-card': 'infoCard',
  'info-label-1': 'infoCard',
  'info-label-2': 'infoCard',
  'info-value-1': 'infoCard',
  'info-value-2': 'infoCard',
  'info-unit-1': 'infoCard',
  'info-unit-2': 'infoCard',
  'export-button': 'exportButton',
};

// ==================== 导出为 CSS 变量 ====================
export const getComponentCSSVariables = () => {
  const vars: Record<string, string> = {};
  
  // 标题
  vars['--app-title-fontSize'] = COMPONENT_TOKENS.appTitle.fontSize;
  vars['--app-title-fontWeight'] = COMPONENT_TOKENS.appTitle.fontWeight;
  vars['--app-title-color'] = COMPONENT_TOKENS.appTitle.color;
  
  // 副标题
  vars['--app-subtitle-fontSize'] = COMPONENT_TOKENS.appSubtitle.fontSize;
  vars['--app-subtitle-color'] = COMPONENT_TOKENS.appSubtitle.color;
  
  // 信息卡片
  vars['--info-card-bg'] = COMPONENT_TOKENS.infoCard.container.backgroundColor;
  vars['--info-card-borderRadius'] = COMPONENT_TOKENS.infoCard.container.borderRadius;
  vars['--info-card-padding'] = COMPONENT_TOKENS.infoCard.container.padding;
  vars['--info-card-label-fontSize'] = COMPONENT_TOKENS.infoCard.label.fontSize;
  vars['--info-card-label-color'] = COMPONENT_TOKENS.infoCard.label.color;
  vars['--info-card-value-fontSize'] = COMPONENT_TOKENS.infoCard.value.fontSize;
  vars['--info-card-value-color'] = COMPONENT_TOKENS.infoCard.value.color;
  vars['--info-card-unit-fontSize'] = COMPONENT_TOKENS.infoCard.unit.fontSize;
  vars['--info-card-unit-color'] = COMPONENT_TOKENS.infoCard.unit.color;
  
  // 按钮
  vars['--export-button-fontSize'] = COMPONENT_TOKENS.exportButton.fontSize;
  vars['--export-button-fontWeight'] = COMPONENT_TOKENS.exportButton.fontWeight;
  vars['--export-button-background'] = COMPONENT_TOKENS.exportButton.background;
  vars['--export-button-borderRadius'] = COMPONENT_TOKENS.exportButton.borderRadius;

  // ❌ 已删除 layerSelect, paramSelect, craftButton 的 CSS 变量
  // 这些组件应该直接使用 SEMANTIC_TOKENS，不需要 CSS 变量

  // 布局
  vars['--layout-sidebarWidth'] = COMPONENT_TOKENS.layout.sidebarWidth;

  // Craft Panel 间距
  vars['--craft-panel-container-gap'] = COMPONENT_TOKENS.layout.craftPanel.container.gap;
  vars['--craft-panel-container-padding'] = COMPONENT_TOKENS.layout.craftPanel.container.padding;
  vars['--craft-panel-section-gap'] = COMPONENT_TOKENS.layout.craftPanel.section.gap;
  vars['--craft-panel-section-padding'] = COMPONENT_TOKENS.layout.craftPanel.section.padding;
  vars['--craft-panel-paramRow-gap'] = COMPONENT_TOKENS.layout.craftPanel.paramRow.gap;

  // UV 按钮
  vars['--uv-button-padding'] = COMPONENT_TOKENS.layout.uvButton.padding;
  vars['--uv-button-borderRadius'] = COMPONENT_TOKENS.layout.uvButton.borderRadius;
  vars['--uv-button-fontSize'] = COMPONENT_TOKENS.layout.uvButton.fontSize;

  return vars;
};
