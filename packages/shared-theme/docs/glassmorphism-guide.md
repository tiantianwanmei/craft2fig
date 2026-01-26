# 🌟 Glassmorphism Token System - 毛玻璃效果使用指南

## 概述

世界级毛玻璃设计系统，灵感来自 Apple 和 Microsoft Fluent Design。提供完整的毛玻璃效果 token 体系。

## 设计原则

1. **层次感** - 通过不同强度的模糊和透明度创建视觉层次
2. **优雅性** - 柔和的边缘和阴影，营造高端感
3. **可读性** - 确保内容在毛玻璃背景上清晰可读
4. **性能** - 优化的 backdrop-filter 使用，避免性能问题

## Token 结构

```typescript
SEMANTIC_TOKENS.glass = {
  base,      // 基础毛玻璃
  light,     // 轻量毛玻璃
  strong,    // 强烈毛玻璃
  dark,      // 深色毛玻璃
  colored,   // 彩色毛玻璃
  interactive, // 交互状态
  blur,      // 模糊强度预设
  saturation // 饱和度预设
}
```

## 使用示例

### 1. 基础毛玻璃卡片

```tsx
import { SEMANTIC_TOKENS } from '@genki/shared-theme';

<div style={{
  background: SEMANTIC_TOKENS.glass.base.background,
  backdropFilter: SEMANTIC_TOKENS.glass.base.backdropFilter,
  border: SEMANTIC_TOKENS.glass.base.border,
  boxShadow: SEMANTIC_TOKENS.glass.base.boxShadow,
  borderRadius: SEMANTIC_TOKENS.border.radius.lg,
  padding: SEMANTIC_TOKENS.spacing.layout.lg,
}}>
  <h2>基础毛玻璃卡片</h2>
  <p>适用于一般卡片、面板</p>
</div>
```

### 2. 轻量毛玻璃提示框

```tsx
<div style={{
  background: SEMANTIC_TOKENS.glass.light.background,
  backdropFilter: SEMANTIC_TOKENS.glass.light.backdropFilter,
  border: SEMANTIC_TOKENS.glass.light.border,
  boxShadow: SEMANTIC_TOKENS.glass.light.boxShadow,
  borderRadius: SEMANTIC_TOKENS.border.radius.md,
  padding: SEMANTIC_TOKENS.spacing.component.md,
}}>
  <span>悬浮提示内容</span>
</div>
```

### 3. 强烈毛玻璃模态框

```tsx
<div style={{
  background: SEMANTIC_TOKENS.glass.strong.background,
  backdropFilter: SEMANTIC_TOKENS.glass.strong.backdropFilter,
  border: SEMANTIC_TOKENS.glass.strong.border,
  boxShadow: SEMANTIC_TOKENS.glass.strong.boxShadow,
  borderRadius: SEMANTIC_TOKENS.border.radius.xl,
  padding: SEMANTIC_TOKENS.spacing.layout.xl,
}}>
  <h1>重要模态框</h1>
  <p>需要用户关注的内容</p>
</div>
```

### 4. 彩色毛玻璃品牌面板

```tsx
// 主品牌色毛玻璃
<div style={{
  background: SEMANTIC_TOKENS.glass.colored.primary.background,
  backdropFilter: SEMANTIC_TOKENS.glass.colored.primary.backdropFilter,
  border: SEMANTIC_TOKENS.glass.colored.primary.border,
  boxShadow: SEMANTIC_TOKENS.glass.colored.primary.boxShadow,
  borderRadius: SEMANTIC_TOKENS.border.radius.lg,
  padding: SEMANTIC_TOKENS.spacing.layout.lg,
}}>
  <h3>品牌色面板</h3>
</div>

// 强调色毛玻璃
<div style={{
  background: SEMANTIC_TOKENS.glass.colored.accent.background,
  backdropFilter: SEMANTIC_TOKENS.glass.colored.accent.backdropFilter,
  border: SEMANTIC_TOKENS.glass.colored.accent.border,
  boxShadow: SEMANTIC_TOKENS.glass.colored.accent.boxShadow,
}}>
  <h3>强调色面板</h3>
</div>
```

### 5. 交互状态毛玻璃按钮

```tsx
const [isHovered, setIsHovered] = useState(false);
const [isActive, setIsActive] = useState(false);

const glassState = isActive
  ? SEMANTIC_TOKENS.glass.interactive.active
  : isHovered
    ? SEMANTIC_TOKENS.glass.interactive.hover
    : SEMANTIC_TOKENS.glass.interactive.default;

<button
  onMouseEnter={() => setIsHovered(true)}
  onMouseLeave={() => setIsHovered(false)}
  onMouseDown={() => setIsActive(true)}
  onMouseUp={() => setIsActive(false)}
  style={{
    background: glassState.background,
    backdropFilter: glassState.backdropFilter,
    border: glassState.border,
    borderRadius: SEMANTIC_TOKENS.border.radius.md,
    padding: `${SEMANTIC_TOKENS.spacing.component.md} ${SEMANTIC_TOKENS.spacing.component.lg}`,
    transition: `all ${SEMANTIC_TOKENS.motion.duration.fast} ${SEMANTIC_TOKENS.motion.easing.standard}`,
  }}
>
  交互式毛玻璃按钮
</button>
```

## 自定义组合

### 自定义模糊强度

```tsx
<div style={{
  background: SEMANTIC_TOKENS.glass.base.background,
  backdropFilter: `${SEMANTIC_TOKENS.glass.blur.extreme} ${SEMANTIC_TOKENS.glass.saturation.vivid}`,
  border: SEMANTIC_TOKENS.glass.base.border,
}}>
  极致模糊 + 高饱和度
</div>
```

### 组合不同预设

```tsx
<div style={{
  background: SEMANTIC_TOKENS.glass.dark.background,
  backdropFilter: `${SEMANTIC_TOKENS.glass.blur.strong} ${SEMANTIC_TOKENS.glass.saturation.high}`,
  border: SEMANTIC_TOKENS.glass.strong.border,
  boxShadow: SEMANTIC_TOKENS.glass.strong.boxShadow,
}}>
  深色背景 + 强烈模糊 + 高饱和度
</div>
```

## 最佳实践

### ✅ 推荐做法

1. **背景要求** - 毛玻璃效果需要有背景内容才能显示效果
2. **性能优化** - 避免在大面积区域使用极致模糊
3. **对比度** - 确保文字与背景有足够对比度
4. **层次分明** - 使用不同强度区分不同层级

```tsx
// ✅ 好的做法 - 层次分明
<div style={{ position: 'relative' }}>
  {/* 背景层 */}
  <div style={{ background: 'url(...)' }} />

  {/* 毛玻璃卡片层 */}
  <div style={{
    ...SEMANTIC_TOKENS.glass.base,
    position: 'absolute',
  }}>
    <h2 style={{ color: SEMANTIC_TOKENS.color.text.primary }}>
      清晰可读的标题
    </h2>
  </div>
</div>
```

### ❌ 避免做法

```tsx
// ❌ 不好的做法 - 没有背景内容
<div style={{
  background: 'transparent', // 没有背景
  backdropFilter: SEMANTIC_TOKENS.glass.base.backdropFilter, // 看不到效果
}}>
  内容
</div>

// ❌ 不好的做法 - 过度使用
<div style={{
  backdropFilter: `blur(100px) saturate(300%)`, // 性能问题
}}>
  内容
</div>
```

## 浏览器兼容性

- ✅ Chrome 76+
- ✅ Safari 9+
- ✅ Edge 79+
- ⚠️ Firefox 103+ (需要启用 `layout.css.backdrop-filter.enabled`)

### Fallback 方案

```tsx
<div style={{
  background: SEMANTIC_TOKENS.glass.base.background,
  backdropFilter: SEMANTIC_TOKENS.glass.base.backdropFilter,
  // Fallback for browsers without backdrop-filter support
  '@supports not (backdrop-filter: blur(1px))': {
    background: SEMANTIC_TOKENS.color.bg.surface,
  }
}}>
  内容
</div>
```

## 性能优化建议

1. **限制使用范围** - 只在关键 UI 元素使用
2. **避免嵌套** - 不要嵌套多层毛玻璃效果
3. **使用 will-change** - 对于动画元素添加 `will-change: backdrop-filter`
4. **减少重绘** - 避免频繁改变 backdrop-filter 值

```tsx
// 性能优化示例
<div style={{
  ...SEMANTIC_TOKENS.glass.base,
  willChange: 'backdrop-filter', // 提示浏览器优化
  transform: 'translateZ(0)',    // 启用硬件加速
}}>
  内容
</div>
```

## 设计灵感来源

- **Apple** - macOS Big Sur, iOS 15+ 的毛玻璃设计
- **Microsoft** - Fluent Design System 的 Acrylic Material
- **Google** - Material Design 3 的 Surface Tint

## 相关资源

- [CSS backdrop-filter MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/backdrop-filter)
- [Glassmorphism Design Trend](https://uxdesign.cc/glassmorphism-in-user-interfaces-1f39bb1308c9)
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
