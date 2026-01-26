# 🎨 @genki/shared-theme - 项目结构

## 📂 目录结构

```
packages/shared-theme/
│
├── 📁 src/                          # 源代码
│   ├── 📁 themes/                   # 🆕 主题系统（新增）
│   │   ├── definitions.ts           # 主题定义（5个主题）
│   │   ├── ThemeProvider.tsx        # 主题提供者组件
│   │   ├── ThemeSwitcher.tsx        # 主题切换器组件
│   │   └── index.ts                 # 导出
│   │
│   ├── 📁 tokens/                   # Token 系统（已有）
│   │   ├── baseTokens.ts
│   │   ├── semanticTokens.ts
│   │   ├── componentTokens.ts
│   │   └── index.ts
│   │
│   ├── 📁 store/                    # Zustand Store（已有）
│   │   └── useTokenStore.ts
│   │
│   ├── 📁 utils/                    # 工具函数（已有）
│   │
│   └── index.ts                     # 主入口（已更新）
│
├── 📁 dist/                         # 构建产物
│   ├── index.js                     # CJS 格式
│   ├── index.mjs                    # ESM 格式
│   ├── index.d.ts                   # TypeScript 类型
│   └── *.map                        # Source Maps
│
├── 📁 examples/                     # 🆕 使用示例（新增）
│   ├── basic-usage.tsx              # 基础使用示例
│   ├── figma-plugin.tsx             # Figma 插件示例
│   └── README.md                    # 示例说明
│
├── 📄 README.md                     # 🆕 主文档（新增）
├── 📄 INTEGRATION.md                # 🆕 集成指南（新增）
├── 📄 QUICKSTART.md                 # 🆕 快速开始（新增）
├── 📄 CHANGELOG.md                  # 🆕 更新日志（新增）
├── 📄 DEPLOYMENT-SUMMARY.md         # 🆕 部署总结（新增）
│
├── package.json                     # 包配置
├── tsconfig.json                    # TypeScript 配置
└── tsup.config.ts                   # 构建配置
```

## 🎯 核心文件说明

### 主题系统（新增）

#### 1. `src/themes/definitions.ts`
- 定义了 5 个完整主题
- 包含所有 Shadcn/UI 变量
- 提供主题验证和工具函数

#### 2. `src/themes/ThemeProvider.tsx`
- React Context 实现
- 运行时 CSS 变量注入
- LocalStorage 持久化
- 跨标签页同步

#### 3. `src/themes/ThemeSwitcher.tsx`
- 完整的主题选择器
- 简单的亮/暗切换按钮
- 响应式设计

### 文档（新增）

#### 1. `README.md`
- 完整的功能介绍
- API 文档
- 使用示例

#### 2. `INTEGRATION.md`
- 详细的集成步骤
- 常见问题解答
- 高级用法

#### 3. `QUICKSTART.md`
- 5 分钟快速开始
- 最小化配置

#### 4. `CHANGELOG.md`
- 版本更新记录
- 未来计划

### 示例代码（新增）

#### 1. `examples/basic-usage.tsx`
- 完整的应用示例
- 展示所有功能

#### 2. `examples/figma-plugin.tsx`
- Figma 插件集成
- 插件通信示例

## 📦 导出内容

### 主题系统
```typescript
// 主题定义
export { themes, themeDisplayNames, type ThemeName, type ThemeColors }

// 组件
export { ThemeProvider, ThemeSwitcher, SimpleThemeToggle }

// Hook
export { useTheme }

// 工具函数
export { getAvailableThemes, isValidTheme }
```

### Token 系统（已有）
```typescript
export { useTokenStore, type TokenState }
export * from './tokens'
export * from './utils'
```

## 🔧 构建配置

### tsup.config.ts
- 输出格式：CJS + ESM
- 生成类型定义
- Source Maps
- Tree-shakable

### package.json
- 正确的 exports 配置
- Peer dependencies: React 18+
- 开发依赖：TypeScript, tsup

## 📊 文件统计

- **源代码文件**: 20+ 个
- **文档文件**: 6 个
- **示例文件**: 3 个
- **总代码行数**: ~2000 行
- **构建产物大小**: ~60KB

## 🎉 新增内容总结

### 代码
- ✅ 3 个核心主题文件
- ✅ 5 个完整主题定义
- ✅ 2 个示例文件

### 文档
- ✅ 4 个主要文档
- ✅ 1 个示例说明
- ✅ 1 个部署总结

### 功能
- ✅ 零编译主题切换
- ✅ 跨标签页同步
- ✅ TypeScript 完整支持
- ✅ Figma 插件兼容

## 🚀 使用方式

### 安装
```bash
pnpm add @genki/shared-theme
```

### 导入
```typescript
import { ThemeProvider, useTheme, ThemeSwitcher } from '@genki/shared-theme'
```

### 使用
```tsx
<ThemeProvider>
  <App />
</ThemeProvider>
```

## 📚 相关链接

- [README.md](./README.md) - 完整文档
- [QUICKSTART.md](./QUICKSTART.md) - 快速开始
- [INTEGRATION.md](./INTEGRATION.md) - 集成指南
- [examples/](./examples/) - 使用示例
