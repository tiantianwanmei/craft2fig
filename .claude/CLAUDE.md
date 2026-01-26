# Claude Code 项目规则

## 🎨 Design Token 规范 (重要!)

本项目使用 **monorepo 架构**，所有样式必须引用 `@genki/shared-theme` 的 token：

### 必须遵守的规则

1. **禁止硬编码样式值** - 不要使用 `'22px'`、`'#ffffff'`、`'rgba(0,0,0,0.5)'` 等硬编码值
2. **必须引用 SEMANTIC_TOKENS** - 所有样式值必须来自 `@genki/shared-theme`

### 导入方式

```typescript
import { SEMANTIC_TOKENS, COMPONENT_TOKENS, BASE_TOKENS } from '@genki/shared-theme';
```

### Token 层级 (优先级从高到低)

1. **COMPONENT_TOKENS** - 组件级别 token（如果存在对应组件）
2. **SEMANTIC_TOKENS** - 语义化 token（首选）
3. **BASE_TOKENS** - 仅在 semantic 层没有对应值时使用

### 常用 Token 路径

```typescript
// 颜色
SEMANTIC_TOKENS.color.text.primary      // 文字颜色
SEMANTIC_TOKENS.color.bg.primary        // 背景颜色
SEMANTIC_TOKENS.color.border.default    // 边框颜色

// 间距
SEMANTIC_TOKENS.spacing.component.xs    // 4px
SEMANTIC_TOKENS.spacing.component.sm    // 6px
SEMANTIC_TOKENS.spacing.component.md    // 8px
SEMANTIC_TOKENS.spacing.gap.xs          // 间隙

// 字体
SEMANTIC_TOKENS.typography.fontSize.micro  // 9px
SEMANTIC_TOKENS.typography.fontSize.xs     // 10px

// 边框
SEMANTIC_TOKENS.border.radius.sm        // 圆角
SEMANTIC_TOKENS.border.width.thin       // 边框宽度

// 毛玻璃效果
SEMANTIC_TOKENS.glass.dark.background
SEMANTIC_TOKENS.glass.dark.backdropFilter
SEMANTIC_TOKENS.glass.dark.border
SEMANTIC_TOKENS.glass.dark.boxShadow

// 组件尺寸
SEMANTIC_TOKENS.size.floatingToolbar.button   // 22px
SEMANTIC_TOKENS.size.floatingToolbar.icon     // 12px
SEMANTIC_TOKENS.size.craftThumbnail.card      // 29px
```

### 如果需要新的 Token

1. 先在 `../packages/shared-theme/src/tokens/baseTokens.ts` 添加基础值
2. 在 `../packages/shared-theme/src/tokens/semanticTokens.ts` 添加语义化引用
3. 运行 `cd ../packages/shared-theme && npm run build` 重新构建
4. 然后在组件中引用新的 semantic token
5. 最后运行 npm run build 构建当前项目，并启动环境验证实际渲染效果

## 🔧 构建命令

```bash
# 构建 shared-theme
cd ../packages/shared-theme && npm run build

# 构建插件
npm run build
```
