# Vector 节点导出修复总结

## 📋 问题描述

### 现象
在 Figma 插件中，当选中 Vector 节点时，预览缩略图出现以下问题：
- **压缩**：Vector 节点被压扁，高度为 0
- **偏移**：Vector 节点只显示底部一点点，严重偏移

### 关键发现
- ✅ **Group 节点**：直接选中 → 预览正确
- ❌ **Vector 节点**：直接选中 → 预览错误（压缩/偏移）
- ✅ **Vector 节点（在 Group 内）**：先 Group 再选中 Group → 预览正确
- ❌ **Vector 节点（在 Group 内）**：直接选中 Group 内的 Vector → 预览错误

---

## 🚫 失败的尝试

### 尝试 1：等待 renderBounds 更新
```typescript
// ❌ 失败：添加延迟等待
await new Promise(resolve => setTimeout(resolve, 10));
const renderBounds = (clone as any).absoluteRenderBounds;
```

**问题**：
- Vector 节点的 `renderBounds.height` 始终为 0
- 延迟无法解决根本问题

**控制台输出**：
```
renderBounds.height: 0  ⚠️ Vector 节点
renderBounds.height: 221.15  ✅ Group 节点
```

---

### 尝试 2：使用 renderBounds 计算偏移量
```typescript
// ❌ 失败：复杂的偏移量计算
const offsetX = renderBounds.x - frameBounds.x;
const offsetY = renderBounds.y - frameBounds.y;

if (renderBounds.height === 0 || renderBounds.width === 0) {
  clone.x = padding;
  clone.y = padding;
} else {
  clone.x = padding - offsetX;
  clone.y = padding - offsetY;
}
```

**问题**：
- Vector 节点的 `renderBounds.height === 0` 导致回退到简单 padding
- Group 节点使用偏移量计算，导致两者居中方式不一致
- 即使很小的偏移量（0.0078125）也会导致视觉不一致

---

### 尝试 3：直接导出原始节点（不克隆）
```typescript
// ❌ 失败：直接导出节点
const bytes = await node.exportAsync({
  format: 'PNG',
  constraint: { type: 'SCALE', value: 2 },
});
```

**问题**：
- 无法添加 padding
- 直接导出 Vector 节点仍然有问题

---

### 尝试 4：简单的 padding 居中
```typescript
// ❌ 失败：简单定位
tempFrame.x = -99999;
tempFrame.y = -99999;
clone.x = padding;
clone.y = padding;
```

**问题**：
- **忽略了节点的绝对坐标系统**
- 当 Vector 节点是 Group 的子节点时，坐标系统是相对于父节点的
- 克隆后，如果不使用绝对坐标重新定位，就会出现偏移

---

## ✅ 成功的解决方案

### 核心原理：使用绝对坐标定位

参考 `figma-plugin-modern` 的 `exportNodeWithPadding` 函数（第 3145-3157 行）：

```typescript
// ✅ 成功：使用绝对坐标定位
const padding = Math.max(node.width, node.height) * paddingRatio;
const bbox = node.absoluteBoundingBox;

// 创建临时 Frame，位置在节点的绝对位置减去 padding
const tempFrame = figma.createFrame();
tempFrame.x = bbox.x - padding;  // 关键：使用绝对坐标
tempFrame.y = bbox.y - padding;
tempFrame.resize(node.width + padding * 2, node.height + padding * 2);
tempFrame.fills = [];

// 克隆节点并放入 Frame
const clone = node.clone();
tempFrame.appendChild(clone);

// 使用绝对坐标定位（相对于 tempFrame 的原点）
clone.x = bbox.x - tempFrame.x;  // 关键：相对定位
clone.y = bbox.y - tempFrame.y;
```

### 为什么这样有效？

1. **绝对坐标系统**：
   - `bbox.x` 和 `bbox.y` 是节点在画布上的绝对位置
   - 无论节点是否在 Group 内，绝对坐标都是正确的

2. **相对定位**：
   - `clone.x = bbox.x - tempFrame.x` 计算克隆节点相对于 Frame 的位置
   - 由于 `tempFrame.x = bbox.x - padding`，所以 `clone.x = padding` ✅

3. **统一处理**：
   - Vector 和 Group 节点使用完全相同的逻辑
   - 不需要特殊判断或回退逻辑

---

## 📊 验证结果

### 控制台输出（成功）

**Vector 节点**：
```javascript
🔧 使用绝对坐标定位策略: {
  nodeType: 'VECTOR',
  nodeName: 'Vector',
  nodeWidth: 251.61053466796875,
  nodeHeight: 221.15203857421875,
  bbox.x: 1548,
  bbox.y: 14540,
  padding: 37.74158020019531
}

✅ 使用绝对坐标定位完成: {
  tempFrame.x: 1510.2584228515625,
  tempFrame.y: 14502.2587890625,
  clone.x: 37.7415771484375,      // ≈ padding ✅
  clone.y: 37.74151611328125,     // ≈ padding ✅
  预期 clone.x: 37.74158020019531,
  预期 clone.y: 37.74158020019531
}
```

**Group 节点**：
```javascript
🔧 使用绝对坐标定位策略: {
  nodeType: 'GROUP',
  nodeName: 'Group 3',
  nodeWidth: 251.61053466796875,
  nodeHeight: 221.15203857421875,
  bbox.x: 1548,
  bbox.y: 14540,
  padding: 37.74158020019531
}

✅ 使用绝对坐标定位完成: {
  tempFrame.x: 1510.2584228515625,
  tempFrame.y: 14502.259765625,
  clone.x: 37.7415771484375,      // ≈ padding ✅
  clone.y: 37.74053955078125,     // ≈ padding ✅
  预期 clone.x: 37.74158020019531,
  预期 clone.y: 37.74158020019531
}
```

### 关键指标
- ✅ `clone.x` ≈ `padding`（误差 < 0.001）
- ✅ `clone.y` ≈ `padding`（误差 < 0.001）
- ✅ Vector 和 Group 使用相同的定位逻辑
- ✅ 预览缩略图正确居中显示

---

## 🎯 关键经验总结

### 1. 理解 Figma 的坐标系统

**绝对坐标 vs 相对坐标**：
- `absoluteBoundingBox`：节点在画布上的绝对位置（全局坐标）
- `x` 和 `y`：节点相对于父节点的位置（局部坐标）

**问题根源**：
- Vector 节点在 Group 内时，`x` 和 `y` 是相对于 Group 的
- 克隆后，如果直接使用 `clone.x = padding`，会忽略原始的相对坐标
- 必须使用绝对坐标重新计算相对位置

### 2. 不要依赖 renderBounds

**问题**：
- Vector 节点的 `absoluteRenderBounds.height` 可能为 0
- 这是 Figma API 的已知问题
- 不要用 `renderBounds` 来计算尺寸或偏移量

**正确做法**：
- 使用 `node.width` 和 `node.height` 获取尺寸
- 使用 `absoluteBoundingBox` 获取位置

### 3. 参考成熟的代码

**参考来源**：
- `figma-plugin-modern/src/plugin/code.ts.modified`（第 3134-3177 行）
- `备份/1-gray2fig/code.js`（第 161-207 行）

**关键代码模式**：
```typescript
// 模式 1：绝对坐标定位
tempFrame.x = bbox.x - padding;
clone.x = bbox.x - tempFrame.x;

// 模式 2：相对坐标计算
const relX = abs.x - base.x;
const relY = abs.y - base.y;
```

### 4. 调试技巧

**添加详细的日志**：
```typescript
console.log('🔧 使用绝对坐标定位策略:', {
  nodeType: node.type,
  nodeName: node.name,
  'bbox.x': bbox.x,
  'bbox.y': bbox.y,
  padding,
});

console.log('✅ 使用绝对坐标定位完成:', {
  'clone.x': clone.x,
  'clone.y': clone.y,
  '预期 clone.x': padding,
  '预期 clone.y': padding,
});
```

**对比不同节点类型**：
- 同时测试 Vector 和 Group 节点
- 对比控制台输出，找出差异
- 确保两者使用相同的逻辑

---

## 🔧 最终代码

### 完整实现

```typescript
export async function exportNodeWithPadding(
  node: SceneNode,
  paddingRatio: number = 0.15
): Promise<{ bytes: Uint8Array; width: number; height: number }> {
  if (!isExportable(node)) {
    throw new Error('Node is not exportable');
  }

  const padding = Math.max(node.width, node.height) * paddingRatio;
  const bbox = (node as any).absoluteBoundingBox;

  if (!bbox) {
    throw new Error('Node has no bounding box');
  }

  // 🎯 核心修复：使用绝对坐标定位（参考 figma-plugin-modern）
  // 原因：Vector 节点可能是 Group 的子节点，坐标系统是相对的
  console.log('🔧 使用绝对坐标定位策略:', {
    nodeType: node.type,
    nodeName: node.name,
    nodeWidth: node.width,
    nodeHeight: node.height,
    'bbox.x': bbox.x,
    'bbox.y': bbox.y,
    padding,
  });

  // 创建临时 Frame，位置在节点的绝对位置减去 padding
  const tempFrame = figma.createFrame();
  tempFrame.name = '__temp_export_wrapper__';
  tempFrame.x = bbox.x - padding;
  tempFrame.y = bbox.y - padding;
  tempFrame.resize(node.width + padding * 2, node.height + padding * 2);
  tempFrame.clipsContent = false;
  tempFrame.fills = [];

  try {
    // 克隆节点并放入 Frame
    const clone = node.clone();
    tempFrame.appendChild(clone);

    // 使用绝对坐标定位（相对于 tempFrame 的原点）
    clone.x = bbox.x - tempFrame.x;
    clone.y = bbox.y - tempFrame.y;

    console.log('✅ 使用绝对坐标定位完成:', {
      'tempFrame.x': tempFrame.x,
      'tempFrame.y': tempFrame.y,
      'clone.x': clone.x,
      'clone.y': clone.y,
      '预期 clone.x': padding,
      '预期 clone.y': padding,
    });

    // 导出 Frame（而不是直接导出 Vector）
    const bytes = await tempFrame.exportAsync({
      format: 'PNG',
      constraint: { type: 'SCALE', value: 2 },
    });

    return {
      bytes,
      width: tempFrame.width,
      height: tempFrame.height,
    };
  } finally {
    tempFrame.remove();
  }
}
```

---

## 📝 避坑指南

### ❌ 不要这样做

1. **不要使用简单的 padding 定位**
   ```typescript
   // ❌ 错误
   tempFrame.x = -99999;
   clone.x = padding;
   ```

2. **不要依赖 renderBounds**
   ```typescript
   // ❌ 错误
   const renderBounds = clone.absoluteRenderBounds;
   if (renderBounds.height === 0) { /* ... */ }
   ```

3. **不要为不同节点类型使用不同逻辑**
   ```typescript
   // ❌ 错误
   if (node.type === 'VECTOR') {
     // Vector 特殊处理
   } else {
     // Group 正常处理
   }
   ```

### ✅ 应该这样做

1. **使用绝对坐标定位**
   ```typescript
   // ✅ 正确
   tempFrame.x = bbox.x - padding;
   clone.x = bbox.x - tempFrame.x;
   ```

2. **使用 absoluteBoundingBox**
   ```typescript
   // ✅ 正确
   const bbox = node.absoluteBoundingBox;
   const width = node.width;
   const height = node.height;
   ```

3. **统一处理所有节点类型**
   ```typescript
   // ✅ 正确
   // 所有节点使用相同的绝对坐标逻辑
   ```

---

## 🎓 技术要点

### Figma API 关键概念

1. **absoluteBoundingBox**
   - 节点在画布上的绝对位置和尺寸
   - 类型：`{ x: number, y: number, width: number, height: number }`
   - 适用于所有可见节点

2. **absoluteRenderBounds**
   - 节点渲染后的实际边界
   - ⚠️ Vector 节点可能返回 `height: 0`
   - 不推荐用于尺寸计算

3. **x, y 属性**
   - 节点相对于父节点的位置
   - 克隆后需要重新计算

4. **clone()**
   - 克隆节点及其所有属性
   - 克隆后的节点需要 `appendChild` 到父节点
   - 坐标系统会重置，需要重新定位

### 坐标转换公式

```typescript
// 绝对坐标 → 相对坐标
relativeX = absoluteX - parentAbsoluteX;
relativeY = absoluteY - parentAbsoluteY;

// 应用到我们的场景
clone.x = bbox.x - tempFrame.x;
clone.y = bbox.y - tempFrame.y;

// 由于 tempFrame.x = bbox.x - padding
// 所以 clone.x = bbox.x - (bbox.x - padding) = padding ✅
```

---

## 📚 参考资料

### 代码参考
- `figma-plugin-modern/src/plugin/code.ts.modified`（第 3134-3177 行）
- `备份/1-gray2fig/code.js`（第 161-207 行）

### 相关文件
- `v2026-01-13/src/plugin/messages.ts`（第 196-260 行）

### Figma API 文档
- [SceneNode.absoluteBoundingBox](https://www.figma.com/plugin-docs/api/properties/nodes-absoluteboundingbox/)
- [SceneNode.clone()](https://www.figma.com/plugin-docs/api/SceneNode/#clone)
- [FrameNode.exportAsync()](https://www.figma.com/plugin-docs/api/FrameNode/#exportasync)

---

## 🎉 总结

### 问题根源
Vector 节点在 Group 内时，坐标系统是相对的。克隆后如果不使用绝对坐标重新定位，就会出现偏移。

### 解决方案
使用绝对坐标定位系统：
1. Frame 放在节点的绝对位置：`tempFrame.x = bbox.x - padding`
2. 克隆节点使用相对定位：`clone.x = bbox.x - tempFrame.x`
3. 结果：`clone.x = padding` ✅

### 关键教训
- ✅ 理解 Figma 的坐标系统（绝对 vs 相对）
- ✅ 不要依赖 `renderBounds`（Vector 节点有 bug）
- ✅ 参考成熟的代码实现
- ✅ 添加详细的调试日志
- ✅ 统一处理所有节点类型

---

**文档版本**：v1.0
**最后更新**：2026-01-20
**作者**：Claude Sonnet 4.5
**状态**：✅ 已验证通过
