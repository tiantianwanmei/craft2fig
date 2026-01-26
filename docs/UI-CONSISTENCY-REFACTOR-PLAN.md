# 🎨 UI 一致性重构计划

## 📊 当前问题分析

### 1. 间距混乱
- ❌ 硬编码值：`8px`, `12px`, `16px` 混用
- ❌ 不符合 8px 网格：`10px`, `6px`, `14px`
- ❌ 组件间距不统一：有的紧贴，有的过大

### 2. 组件尺寸不一致
- ❌ 按钮高度：`30px`, `32px`, `40px` 混用
- ❌ 输入框高度：随意设置
- ❌ 圆角大小：`4px`, `6px`, `8px`, `10px`, `12px`, `14px` 混用

### 3. 视觉层级不清晰
- ❌ Section 之间缺少明显分隔
- ❌ 内容区域过于拥挤
- ❌ 缺少视觉呼吸感

---

## 🎯 重构目标

### 1. 建立科学的间距体系
基于现有 Token 系统，强制使用 8px 网格：

| Token | 值 | 用途 |
|-------|-----|------|
| `--p-space-1` | 4px | 极小间距（图标与文字） |
| `--p-space-2` | 8px | 小间距（组件内部） |
| `--p-space-3` | 12px | 标准间距（组件之间） |
| `--p-space-4` | 16px | 中等间距（区块内部） |
| `--p-space-6` | 24px | 大间距（Section 之间） |
| `--p-space-8` | 32px | 超大间距（页面级留白） |

### 2. 统一组件尺寸规格

**按钮高度标准**:
- Small: `var(--p-space-6)` (24px)
- Medium: `var(--p-space-8)` (32px) ✅ 默认
- Large: `var(--p-space-10)` (40px)

**圆角标准**:
- Small: `var(--p-radius-sm)` (4px)
- Medium: `var(--p-radius-md)` (8px) ✅ 默认
- Large: `var(--p-radius-lg)` (12px)

### 3. 建立视觉层级

**间距层级**:
```
内部间距 (Padding) < 兄弟间距 (Gap) < 组间间距 (Section)
    8-12px          <     12-16px      <      24-32px
```

---

## 🔧 实施方案

### Phase 1: 创建布局组件 (Layout Components)

创建 `Stack` 和 `Box` 组件，实现"内容与布局分离"：

```typescript
// components/layout/Stack.tsx
interface StackProps {
  spacing?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  direction?: 'row' | 'column';
  align?: 'start' | 'center' | 'end';
  children: React.ReactNode;
}

// components/layout/Box.tsx
interface BoxProps {
  p?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';  // padding
  m?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';  // margin
  children: React.ReactNode;
}
```

### Phase 2: 优化现有组件

**优先级排序**:
1. ✅ ControlPanel - 已完成基础优化
2. ✅ ExportTab - 已完成基础优化
3. ✅ CraftTab - 已完成基础优化
4. 🔄 FoldTab - 待优化
5. 🔄 ViewportArea - 待优化（68 处硬编码）
6. 🔄 CraftParamPanel - 待优化（37 处硬编码）

### Phase 3: 建立 CSS 工具类

在 `globals.css` 中添加通用间距类：

```css
/* Spacing Utilities */
.p-xs { padding: var(--p-space-1); }
.p-sm { padding: var(--p-space-2); }
.p-md { padding: var(--p-space-3); }
.p-lg { padding: var(--p-space-4); }

.m-xs { margin: var(--p-space-1); }
.m-sm { margin: var(--p-space-2); }
.m-md { margin: var(--p-space-3); }
.m-lg { margin: var(--p-space-4); }

.gap-xs { gap: var(--p-space-1); }
.gap-sm { gap: var(--p-space-2); }
.gap-md { gap: var(--p-space-3); }
.gap-lg { gap: var(--p-space-4); }
```

---

## 📋 具体改造清单

### 1. Section 间距统一
- [x] 定义 `--section-margin-bottom: var(--p-space-6)` (24px)
- [x] 定义 `--section-title-margin-bottom: var(--p-space-3)` (12px)
- [ ] 应用到所有 `.section` 类

### 2. 按钮组间距统一
- [x] ExportTab 按钮组 gap: `var(--p-space-2)` (8px)
- [x] ExportTab 按钮组 marginBottom: `var(--p-space-3)` (12px)
- [ ] FoldTab 按钮组优化
- [ ] CraftTab 按钮组优化

### 3. Toggle 组件优化
- [x] padding: `var(--p-space-2) var(--p-space-3)` (8px 12px)
- [x] marginBottom: `var(--p-space-2)` (8px)
- [ ] 增加 hover 状态视觉反馈

### 4. 内容区域优化
- [x] ControlPanel content padding: `var(--p-space-4)` (16px)
- [x] ControlPanel contentInner padding: `var(--p-space-4)` (16px)
- [ ] 所有 Tab 内容区统一 padding

---

## 🎨 视觉改进目标

### Before (当前问题)
```
[Section 1]
[紧贴]
[Section 2]
[紧贴]
[Section 3]
```

### After (优化后)
```
[Section 1]

  (24px 呼吸空间)

[Section 2]

  (24px 呼吸空间)

[Section 3]
```

---

## 📊 成功指标

- ✅ 100% 使用 Token 变量，0 硬编码间距
- ✅ 所有间距符合 8px 网格系统
- ✅ Section 之间有明显视觉分隔
- ✅ 组件尺寸统一（按钮、输入框、圆角）
- ✅ 视觉层级清晰，有呼吸感

---

## 🚀 下一步行动

### 立即执行
1. 创建 Stack 和 Box 布局组件
2. 优化 FoldTab 间距
3. 创建 CSS 工具类

### 短期目标（本周）
1. 完成所有 Tab 组件的间距优化
2. 统一所有按钮高度为 32px
3. 统一所有圆角为 8px

### 中期目标（本月）
1. 重构 ViewportArea 和 CraftParamPanel
2. 建立组件库文档
3. 添加视觉回归测试
