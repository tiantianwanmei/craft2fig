# 🎨 Craft Panel 间距优化方案

## 📊 问题诊断

### 当前问题
1. **间距过大**：`CraftParamPanel.tsx:38` 使用 `gap: 'var(--p-space-3)'` (12px)
2. **Divider 占用空间**：每个 `ParamSection` 都有 Divider，增加了视觉间距
3. **不统一的间距系统**：混用了 `var(--p-space-3)` 和 `COMPONENT_TOKENS.layout.paramSection`

### 根本原因
- 使用了 `level2.gap: '6px'` 但外层容器又加了 `gap: 'var(--p-space-3)'` (12px)
- Divider 的 margin 也占用了空间
- 没有遵循 Figma 原生的紧凑设计

## 🎯 优化目标

### Figma 原生间距标准
- **参数行之间**：4-6px
- **参数组之间**：8px (使用 Divider 分隔)
- **容器内边距**：8-12px

### 优化方案
1. 移除外层容器的 `gap` 和 `padding`
2. 使用 Divider 作为唯一的视觉分隔
3. 统一使用 `@genki/shared-theme` 的 tokens

## 📝 实施步骤

### Step 1: 优化 componentTokens.ts
```typescript
layout: {
  // Craft Panel - Figma 原生紧凑间距
  craftPanel: {
    container: {
      padding: '0',
      gap: '0',
    },
    section: {
      padding: '8px 12px',
      gap: '6px',
    },
    paramRow: {
      gap: '4px',
      marginBottom: '0',
    },
  },
}
```

### Step 2: 优化 CraftParamPanel.tsx
```typescript
// 外层容器 - 移除 gap 和 padding
<div style={{
  display: 'flex',
  flexDirection: 'column',
  gap: '0',  // 改为 0
  padding: '0',  // 改为 0
  maxHeight: '400px',
  overflowY: 'auto'
}}>

// ParamSection - 使用新的 tokens
<div style={{
  display: 'flex',
  flexDirection: 'column',
  gap: COMPONENT_TOKENS.layout.craftPanel.section.gap,
  padding: COMPONENT_TOKENS.layout.craftPanel.section.padding,
}}>
```

### Step 3: 优化 Divider 样式
```typescript
<Divider style={{
  margin: '0',  // 移除 margin
  opacity: 0.6,
}} />
```

## 📐 预期效果

### 优化前
- 参数组之间：~20px (12px gap + 6px divider margin)
- 参数行之间：6px
- 容器内边距：12px

### 优化后
- 参数组之间：8px (仅 Divider 高度 + section padding)
- 参数行之间：6px
- 容器内边距：0 (由 section padding 控制)

## ✅ 验证清单
- [ ] 间距符合 Figma 原生标准
- [ ] 视觉层次清晰
- [ ] 滚动流畅
- [ ] 响应式布局正常
