# 🎬 Framer Motion Animation System - 动画使用指南

## 概述

世界级 Framer Motion 动画系统，灵感来自 Apple、Stripe、Linear。提供完整的动画 token 体系和开箱即用的动画组件。

## 设计原则

1. **流畅性** - 使用物理弹簧动画，模拟真实世界的运动
2. **性能** - 优化的动画配置，60fps 流畅运行
3. **一致性** - 统一的动画语言，提升用户体验
4. **可访问性** - 尊重用户的动画偏好设置

## Token 结构

```typescript
SEMANTIC_TOKENS.animation = {
  fade,        // 淡入淡出动画
  scale,       // 缩放动画
  slide,       // 滑动动画
  interactive, // 交互状态动画
  list,        // 列表交错动画
}

BASE_TOKENS.spring = {
  gentle,   // 柔和弹簧
  default,  // 标准弹簧
  snappy,   // 快速弹簧
  bouncy,   // 弹跳效果
  slow,     // 慢速弹簧
  stiff,    // 僵硬弹簧
}
```

## 快速开始

### 1. 安装依赖

```bash
npm install framer-motion
```

### 2. 使用预制组件

```tsx
import { AnimatedButton, AnimatedCard } from '@genki/shared-ui';

function App() {
  return (
    <>
      <AnimatedButton onClick={() => console.log('clicked')}>
        Click Me
      </AnimatedButton>

      <AnimatedCard animationType="scale" interactive>
        Card Content
      </AnimatedCard>
    </>
  );
}
```

## 使用示例

### 淡入淡出动画

```tsx
import { motion } from 'framer-motion';
import { SEMANTIC_TOKENS } from '@genki/shared-theme';

<motion.div
  initial={SEMANTIC_TOKENS.animation.fade.in.initial}
  animate={SEMANTIC_TOKENS.animation.fade.in.animate}
  exit={SEMANTIC_TOKENS.animation.fade.in.exit}
  transition={SEMANTIC_TOKENS.animation.fade.in.transition}
>
  Fade In Content
</motion.div>
```

### 淡入向上动画

```tsx
<motion.div
  initial={SEMANTIC_TOKENS.animation.fade.inUp.initial}
  animate={SEMANTIC_TOKENS.animation.fade.inUp.animate}
  exit={SEMANTIC_TOKENS.animation.fade.inUp.exit}
  transition={SEMANTIC_TOKENS.animation.fade.inUp.transition}
>
  Fade In Up Content
</motion.div>
```

### 缩放动画

```tsx
// 标准缩放
<motion.div {...SEMANTIC_TOKENS.animation.scale.in}>
  Scale In Content
</motion.div>

// 弹跳缩放
<motion.div {...SEMANTIC_TOKENS.animation.scale.bounce}>
  Bounce In Content
</motion.div>

// 弹出效果
<motion.div {...SEMANTIC_TOKENS.animation.scale.pop}>
  Pop In Content
</motion.div>
```

### 滑动动画

```tsx
// 从左滑入
<motion.div {...SEMANTIC_TOKENS.animation.slide.left}>
  Slide From Left
</motion.div>

// 从右滑入
<motion.div {...SEMANTIC_TOKENS.animation.slide.right}>
  Slide From Right
</motion.div>
```

## 交互动画

### 按钮交互

```tsx
import { motion } from 'framer-motion';
import { SEMANTIC_TOKENS } from '@genki/shared-theme';

<motion.button
  whileHover={SEMANTIC_TOKENS.animation.interactive.hover}
  whileTap={SEMANTIC_TOKENS.animation.interactive.tap}
  whileFocus={SEMANTIC_TOKENS.animation.interactive.focus}
  style={{
    padding: SEMANTIC_TOKENS.spacing.component.md,
    background: SEMANTIC_TOKENS.color.bg.brand,
    borderRadius: SEMANTIC_TOKENS.border.radius.md,
  }}
>
  Interactive Button
</motion.button>
```

### 卡片交互

```tsx
<motion.div
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.98 }}
  transition={SEMANTIC_TOKENS.animation.interactive.hover.transition}
  style={{
    background: SEMANTIC_TOKENS.color.bg.surface,
    padding: SEMANTIC_TOKENS.spacing.layout.lg,
    borderRadius: SEMANTIC_TOKENS.border.radius.lg,
    cursor: 'pointer',
  }}
>
  Interactive Card
</motion.div>
```

## 列表交错动画

```tsx
import { motion } from 'framer-motion';
import { SEMANTIC_TOKENS } from '@genki/shared-theme';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: SEMANTIC_TOKENS.animation.list.item.initial,
  visible: {
    ...SEMANTIC_TOKENS.animation.list.item.animate,
    transition: SEMANTIC_TOKENS.animation.list.item.transition,
  },
};

<motion.ul
  variants={containerVariants}
  initial="hidden"
  animate="visible"
>
  {items.map((item) => (
    <motion.li key={item.id} variants={itemVariants}>
      {item.name}
    </motion.li>
  ))}
</motion.ul>
```

## 自定义弹簧动画

```tsx
import { motion } from 'framer-motion';
import { BASE_TOKENS } from '@genki/shared-theme';

// 柔和弹簧
<motion.div
  animate={{ x: 100 }}
  transition={BASE_TOKENS.spring.gentle}
>
  Gentle Spring
</motion.div>

// 快速弹簧
<motion.div
  animate={{ x: 100 }}
  transition={BASE_TOKENS.spring.snappy}
>
  Snappy Spring
</motion.div>

// 弹跳效果
<motion.div
  animate={{ x: 100 }}
  transition={BASE_TOKENS.spring.bouncy}
>
  Bouncy Spring
</motion.div>
```

## 预制组件使用

### AnimatedButton

```tsx
import { AnimatedButton } from '@genki/shared-ui';

// 基础用法
<AnimatedButton onClick={() => alert('Clicked!')}>
  Click Me
</AnimatedButton>

// 不同变体
<AnimatedButton variant="primary">Primary</AnimatedButton>
<AnimatedButton variant="secondary">Secondary</AnimatedButton>
<AnimatedButton variant="ghost">Ghost</AnimatedButton>

// 禁用状态
<AnimatedButton disabled>Disabled</AnimatedButton>
```

### AnimatedCard

```tsx
import { AnimatedCard } from '@genki/shared-ui';

// 淡入动画
<AnimatedCard animationType="fade">
  Fade In Card
</AnimatedCard>

// 缩放动画
<AnimatedCard animationType="scale">
  Scale In Card
</AnimatedCard>

// 滑动动画
<AnimatedCard animationType="slide">
  Slide In Card
</AnimatedCard>

// 交互式卡片
<AnimatedCard interactive onClick={() => console.log('clicked')}>
  Interactive Card
</AnimatedCard>
```

### AnimatedList

```tsx
import { AnimatedList } from '@genki/shared-ui';

const items = ['Item 1', 'Item 2', 'Item 3'];

<AnimatedList staggerDelay={0.1}>
  {items.map((item, index) => (
    <div key={index}>{item}</div>
  ))}
</AnimatedList>
```

## 最佳实践

### ✅ 推荐做法

1. **使用预设动画** - 优先使用 SEMANTIC_TOKENS.animation
2. **保持一致性** - 同类交互使用相同动画
3. **性能优化** - 使用 transform 和 opacity 属性
4. **尊重用户偏好** - 检测 prefers-reduced-motion

```tsx
// ✅ 好的做法 - 使用 transform
<motion.div animate={{ x: 100, scale: 1.2 }}>
  Content
</motion.div>

// ❌ 不好的做法 - 使用 left/top
<motion.div animate={{ left: 100, top: 50 }}>
  Content
</motion.div>
```

### 尊重用户动画偏好

```tsx
import { useReducedMotion } from 'framer-motion';

function Component() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      animate={{ x: 100 }}
      transition={
        shouldReduceMotion
          ? { duration: 0 }
          : BASE_TOKENS.spring.default
      }
    >
      Content
    </motion.div>
  );
}
```

## 性能优化

### 1. 使用 layout 动画

```tsx
<motion.div layout>
  Content that changes size
</motion.div>
```

### 2. 使用 layoutId 共享布局

```tsx
<motion.div layoutId="shared-element">
  Shared Element
</motion.div>
```

### 3. 优化大列表

```tsx
// 使用 viewport 检测，只动画可见元素
<motion.div
  initial="hidden"
  whileInView="visible"
  viewport={{ once: true, amount: 0.3 }}
>
  Content
</motion.div>
```

## 相关资源

- [Framer Motion 官方文档](https://www.framer.com/motion/)
- [Apple Human Interface Guidelines - Motion](https://developer.apple.com/design/human-interface-guidelines/motion)
- [Material Design - Motion](https://m3.material.io/styles/motion/overview)
