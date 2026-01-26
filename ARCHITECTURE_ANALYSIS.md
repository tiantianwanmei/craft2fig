# 🏗️ 插件架构分析报告

## 📊 当前状态

### ❌ 问题：大量组件仍在使用 CSS 变量而非 SEMANTIC_TOKENS

**检测结果：**
- 总共发现 **129 处 CSS 变量使用**
- 涉及 **14 个组件文件**
- 只有 **8 个文件**正确导入了 `@genki/shared-theme`

---

## 📁 使用 CSS 变量的文件（需要迁移）

### UI 组件 (5 个文件)
1. **components/ui/Toggle.tsx** (3 处)
   - `var(--semantic-bg-action-primary-default)`
   - `var(--fg-text-primary)`
   - `var(--fg-text-secondary)`

2. **components/ui/Tabs.tsx** (9 处)
   - `var(--radius-sm)`, `var(--radius-xs)`
   - `var(--semantic-bg-action-primary-default)`
   - 等...

3. **components/ui/Slider.tsx** (6 处)
   - `var(--fg-text-secondary)`
   - `var(--semantic-text-brand)`
   - `var(--fg-text-tertiary)`

4. **components/ui/Panel.tsx** (6 处)
   - `var(--semantic-bg-surface-primary)`
   - `var(--border-divider-default)`
   - `var(--radius-md)`

5. **components/ui/LinearTabs.tsx** (5 处)
   - `var(--fg-text-primary)`
   - `var(--fg-text-secondary)`
   - `var(--p-text-sm)`

6. **components/ui/Button.tsx** (15 处)
   - `var(--semantic-bg-action-primary-default)`
   - `var(--semantic-bg-action-primary-hover)`
   - `var(--semantic-bg-action-primary-active)`
   - 等...

### Panel 组件 (3 个文件)
7. **components/panels/FoldTab.tsx** (25 处) ⚠️ 最多
   - `var(--p-radius-xs)`
   - `var(--p-duration-fast)`
   - `var(--p-text-xs)`
   - 等...

8. **components/panels/ExportTab.tsx** (2 处)
   - `var(--space-md)`
   - `var(--space-sm)`

9. **components/panels/ControlPanel.tsx** (2 处)
   - `var(--fg-text-secondary)`
   - `var(--p-text-xs)`

### Layout 组件 (3 个文件)
10. **components/layout/StatusBar.tsx** (5 处)
    - `var(--fg-text-tertiary)`
    - `var(--semantic-bg-action-primary-default)`
    - `var(--fg-text-secondary)`

11. **components/layout/MainLayout.tsx** (7 处)
    - `var(--semantic-bg-canvas-default)`
    - `var(--semantic-bg-action-primary-default)`
    - `var(--semantic-bg-surface-primary)`

12. **components/layout/FloatingToolbar.tsx** (20 处) ⚠️ 第二多
    - `var(--semantic-bg-surface-primary)`
    - `var(--border-divider-default)`
    - `var(--radius-md)`
    - 等...

### Canvas 组件 (2 个文件)
13. **components/canvas/ViewportArea.tsx** (4 处)
    - `var(--header-padding-y)`
    - `var(--header-padding-x)`
    - `var(--header-icon-size)`

14. **components/canvas/SpatialCanvas.tsx** (20 处) ⚠️ 第三多
    - `var(--semantic-bg-canvas-default)`
    - `var(--fg-text-muted)`
    - `var(--fg-text-secondary)`
    - 等...

---

## ✅ 已正确使用 SEMANTIC_TOKENS 的文件

1. `components/canvas/ViewportArea.tsx` - 部分使用
2. `components/panels/CraftTab.tsx`
3. `components/craft/CraftParamPanel.tsx`
4. `App.tsx`
5. `components/layout/ViewportHeader.tsx`
6. `store/appStore.ts`
7. `theme/index.ts`
8. `styles/generateTokens.ts`

---

## 🎯 迁移优先级

### 高优先级（使用最多的文件）
1. **FoldTab.tsx** - 25 处 CSS 变量
2. **FloatingToolbar.tsx** - 20 处
3. **SpatialCanvas.tsx** - 20 处
4. **Button.tsx** - 15 处

### 中优先级
5. **Tabs.tsx** - 9 处
6. **MainLayout.tsx** - 7 处
7. **Slider.tsx** - 6 处
8. **Panel.tsx** - 6 处

### 低优先级
9. **LinearTabs.tsx** - 5 处
10. **StatusBar.tsx** - 5 处
11. **ViewportArea.tsx** - 4 处
12. **Toggle.tsx** - 3 处
13. **ExportTab.tsx** - 2 处
14. **ControlPanel.tsx** - 2 处

---

## 📋 迁移步骤

### 对于每个文件：

1. **添加导入**
   ```typescript
   import { SEMANTIC_TOKENS } from '@genki/shared-theme';
   ```

2. **替换 CSS 变量**
   ```typescript
   // ❌ 旧方式
   style={{ color: 'var(--fg-text-primary)' }}

   // ✅ 新方式
   style={{ color: SEMANTIC_TOKENS.color.text.primary }}
   ```

3. **映射关系参考**
   - `--fg-text-primary` → `SEMANTIC_TOKENS.color.text.primary`
   - `--semantic-bg-action-primary-default` → `SEMANTIC_TOKENS.color.button.primary.bg`
   - `--radius-md` → `SEMANTIC_TOKENS.border.radius.md`
   - `--p-space-3` → `SEMANTIC_TOKENS.spacing.component.lg`
   - `--p-text-xs` → `SEMANTIC_TOKENS.typography.fontSize.xs`

---

## 🚨 当前临时解决方案

为了快速修复 UI 崩溃，我在 `src/index.css` 中添加了所有缺失的 CSS 变量定义：

```css
/* Primitive Spacing (p-space-*) */
--p-space-1: 4px;
--p-space-2: 8px;
--p-space-3: 12px;
--p-space-4: 16px;

/* Primitive Text (p-text-*) */
--p-text-xs: 10px;
--p-text-sm: 11px;
--p-text-base: 12px;

/* 等等... */
```

**这只是临时方案！** 正确的做法是将所有组件迁移到使用 `SEMANTIC_TOKENS`。

---

## 🎯 建议的迁移计划

### 阶段 1：高优先级组件（预计 2-3 小时）
- [ ] FoldTab.tsx
- [ ] FloatingToolbar.tsx
- [ ] SpatialCanvas.tsx
- [ ] Button.tsx

### 阶段 2：中优先级组件（预计 1-2 小时）
- [ ] Tabs.tsx
- [ ] MainLayout.tsx
- [ ] Slider.tsx
- [ ] Panel.tsx

### 阶段 3：低优先级组件（预计 1 小时）
- [ ] 其余 6 个文件

### 阶段 4：清理（预计 30 分钟）
- [ ] 删除 `src/index.css` 中的临时 CSS 变量定义
- [ ] 验证所有组件正常工作
- [ ] 更新文档

---

## 📈 预期收益

迁移到 SEMANTIC_TOKENS 后：

1. ✅ **类型安全** - TypeScript 会检查 token 是否存在
2. ✅ **自动补全** - IDE 会提示可用的 tokens
3. ✅ **统一管理** - 所有 tokens 在 monorepo 中集中管理
4. ✅ **主题切换** - 更容易实现主题切换功能
5. ✅ **减少错误** - 避免拼写错误和未定义的 CSS 变量
6. ✅ **更好的维护性** - 修改 token 值时只需改一处

---

## 🔗 相关文件

- Monorepo tokens: `packages/shared-theme/src/tokens/semanticTokens.ts`
- 临时 CSS 变量: `v2026-01-13/src/index.css` (第 433-527 行)
- 检测脚本: `v2026-01-13/scripts/detectCSSVars.cjs`
- 修复脚本: `v2026-01-13/scripts/fixCSSVars.cjs`

---

生成时间: 2026-01-23
