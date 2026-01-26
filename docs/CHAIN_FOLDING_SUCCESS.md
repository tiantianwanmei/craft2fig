# 3D 链式折叠成功经验总结

> 项目：Genki Packaging Engine - 3D 链式折叠系统
> 日期：2026-01-26
> 状态：✅ 成功实现

---

## 📋 目录

1. [问题背景](#问题背景)
2. [核心问题分析](#核心问题分析)
3. [解决方案](#解决方案)
4. [踩坑经验](#踩坑经验)
5. [成功经验](#成功经验)
6. [关键代码](#关键代码)
7. [技术要点](#技术要点)

---

## 问题背景

### 初始问题
在 3D 折叠预览中，面板折叠存在以下问题：
1. 面板 2 带动面板 3 折叠了，但面板 3 本身没有折叠
2. 面板 3 带动面板 4 折叠了，但面板 4 本身没有折叠
3. 结果是面板 3、4 平行相接于面板 2，而不是链式折叠
4. T/B 系列面板（如 1-1T、1-1B、2-1T、2-1B）没有正确折叠

### 目标
实现正确的链式折叠：
- 根面板(1) → 面板2 → 面板3 → 面板4（X轴链式）
- 每个面板的 T 系列链式：2-1T → 2-2T → 2-3T
- 每个面板的 B 系列链式：2-1B → 2-2B → 2-3B

---

## 核心问题分析

### 问题根源：drivenMap 结构错误

**错误的扁平结构：**
```javascript
{
  "1": ["2", "3", "4", "1-1T", "1-1B"],  // 根面板直接带动所有面板
  "2": ["2-1T", "2-1B"],                  // 面板2只带动自己的Y面
  "3": ["3-1T", "3-1B"],
  "4": ["4-1T", "4-1B"]
}
```

**问题：** 根面板直接带动所有 X 轴面板，导致它们都相对于根面板折叠，而不是链式折叠。

**正确的链式结构：**
```javascript
{
  "1": ["2", "1-1T", "1-1B"],             // 根面板只带动第一个X面板
  "2": ["3", "2-1T", "2-1B"],             // 面板2带动面板3
  "3": ["4", "3-1T", "3-1B"],             // 面板3带动面板4
  "4": ["4-1T", "4-1B"],                  // 最后一个X面板只带动Y面
  "1-1T": ["1-2T"],                       // T系列链式
  "1-1B": ["1-2B"],                       // B系列链式
  "2-1T": ["2-2T"],
  "2-1B": ["2-2B"]
}
```

---

## 解决方案

### 1. 修改 `foldLogic.ts` 中的 `autoFoldSequence` 函数

#### H面（根面板）的带动关系
```typescript
// 之前（错误）
result.drivenMap[rootPanelId] = [
  ...xLeftPanels.map(p => p.id),    // 所有左侧X面板
  ...xRightPanels.map(p => p.id),   // 所有右侧X面板
  ...hTList.map(p => p.id),
  ...hBList.map(p => p.id)
];

// 之后（正确）
const hDriven: string[] = [];
if (xLeftPanels.length > 0) {
  hDriven.push(xLeftPanels[0].id);  // 只添加第一个左侧X面
}
if (xRightPanels.length > 0) {
  hDriven.push(xRightPanels[0].id); // 只添加第一个右侧X面
}
if (hTList.length > 0) {
  hDriven.push(hTList[0].id);       // 只添加第一个T面板
}
if (hBList.length > 0) {
  hDriven.push(hBList[0].id);       // 只添加第一个B面板
}
result.drivenMap[rootPanelId] = hDriven;
```

#### X面板的链式带动
```typescript
// 链式结构：当前X面板带动下一个X面板 + 第一个T面板 + 第一个B面板
const driven: string[] = [];
if (xIdx + 1 < xLeftPanels.length) {
  driven.push(xLeftPanels[xIdx + 1].id);  // 带动下一个X面板
}
if (tPanels.length > 0) {
  driven.push(tPanels[0].id);             // 只带动第一个T面板
}
if (bPanels.length > 0) {
  driven.push(bPanels[0].id);             // 只带动第一个B面板
}
result.drivenMap[xPanel.id] = driven;
```

#### T/B面板的链式带动
```typescript
// T面板链式带动
tPanels.forEach((p, i) => {
  result.nameMap[p.id] = `${xNum}-${i + 1}T`;
  if (i + 1 < tPanels.length) {
    result.drivenMap[p.id] = [tPanels[i + 1].id];  // 带动下一个T面板
  }
});

// B面板链式带动
bPanels.forEach((p, i) => {
  result.nameMap[p.id] = `${xNum}-${i + 1}B`;
  if (i + 1 < bPanels.length) {
    result.drivenMap[p.id] = [bPanels[i + 1].id];  // 带动下一个B面板
  }
});
```

### 2. 修改 `FoldTab.tsx` 中的手动重建链式关系按钮

```typescript
const handleRebuildChainRelations = useCallback(() => {
  setManualRelations(prev => {
    const newRelations: Record<string, string[]> = {};
    const processed = new Set<string>();

    const processNode = (nodeId: string) => {
      if (processed.has(nodeId)) return;
      processed.add(nodeId);

      const children = prev[nodeId];
      if (!children || children.length === 0) return;

      // 分类子节点：X轴面板、T面板、B面板
      const xPanels: string[] = [];
      const tPanels: string[] = [];
      const bPanels: string[] = [];

      children.forEach(childId => {
        const name = panelNameMap[childId] || childId;
        if (name.includes('T')) {
          tPanels.push(childId);
        } else if (name.includes('B')) {
          bPanels.push(childId);
        } else {
          xPanels.push(childId);
        }
      });

      // 构建当前节点的直接子节点（每类只保留第一个）
      const directChildren: string[] = [];
      if (xPanels.length > 0) directChildren.push(xPanels[0]);
      if (tPanels.length > 0) directChildren.push(tPanels[0]);
      if (bPanels.length > 0) directChildren.push(bPanels[0]);
      newRelations[nodeId] = directChildren;

      // X面板链式
      for (let i = 0; i < xPanels.length - 1; i++) {
        if (!newRelations[xPanels[i]]) newRelations[xPanels[i]] = [];
        newRelations[xPanels[i]].unshift(xPanels[i + 1]);
      }

      // T面板链式
      for (let i = 0; i < tPanels.length - 1; i++) {
        if (!newRelations[tPanels[i]]) newRelations[tPanels[i]] = [];
        newRelations[tPanels[i]].push(tPanels[i + 1]);
      }

      // B面板链式
      for (let i = 0; i < bPanels.length - 1; i++) {
        if (!newRelations[bPanels[i]]) newRelations[bPanels[i]] = [];
        newRelations[bPanels[i]].push(bPanels[i + 1]);
      }

      // 递归处理所有子节点
      children.forEach(childId => processNode(childId));
    };

    // 找出根节点并开始处理
    const allChildren = new Set<string>();
    Object.values(prev).forEach(children => {
      children.forEach(child => allChildren.add(child));
    });
    const rootNodes = Object.keys(prev).filter(p => !allChildren.has(p));
    rootNodes.forEach(rootId => processNode(rootId));

    return newRelations;
  });
}, [panelNameMap]);
```

---

## 踩坑经验

### 🔴 坑 1：扁平 vs 链式结构混淆

**问题：** 最初的 `drivenMap` 是扁平结构，根面板直接带动所有子面板。

**教训：**
- 扁平结构：所有子面板相对于同一个父面板折叠
- 链式结构：每个面板相对于前一个面板折叠，形成级联效果

**解决方法：** 每个父面板只带动"第一个"子面板，后续子面板由前一个子面板带动。

### 🔴 坑 2：只修改了 X 轴链式，忘记 T/B 系列

**问题：** 最初只修改了 X 轴面板的链式关系（2→3→4），忘记了 T/B 系列也需要链式。

**教训：** 链式结构需要应用到所有层级：
- X 轴：2 → 3 → 4
- T 系列：2-1T → 2-2T → 2-3T
- B 系列：2-1B → 2-2B → 2-3B

### 🔴 坑 3：手动重建按钮逻辑不一致

**问题：** 自动生成的 `drivenMap` 是链式的，但手动"重建链式关系"按钮的逻辑还是旧的。

**教训：** 确保所有生成 `drivenMap` 的地方使用相同的逻辑。

---

## 成功经验

### ✅ 经验 1：理解数据结构是关键

**做法：** 先打印 `drivenMap` 的实际内容，理解当前结构。

```typescript
console.log('drivenMap:', JSON.stringify(drivenMap, null, 2));
```

**收益：** 快速定位问题根源是数据结构而不是渲染逻辑。

### ✅ 经验 2：分类处理不同类型的面板

**做法：** 将子面板按类型分类（X轴、T系列、B系列），分别处理链式关系。

```typescript
const xPanels: string[] = [];
const tPanels: string[] = [];
const bPanels: string[] = [];

children.forEach(childId => {
  const name = panelNameMap[childId] || childId;
  if (name.includes('T')) tPanels.push(childId);
  else if (name.includes('B')) bPanels.push(childId);
  else xPanels.push(childId);
});
```

**收益：** 每类面板独立形成链式，逻辑清晰。

### ✅ 经验 3：递归处理所有层级

**做法：** 使用递归函数处理所有层级的面板。

```typescript
const processNode = (nodeId: string) => {
  // 处理当前节点
  // ...
  // 递归处理子节点
  children.forEach(childId => processNode(childId));
};
```

**收益：** 确保所有层级都应用链式逻辑。

---

## 关键代码

### 文件：`src/utils/foldLogic.ts`

**函数：** `autoFoldSequence`

**核心修改：**
1. H面只带动第一个左X、第一个右X、第一个T、第一个B
2. 每个X面板带动下一个X面板 + 第一个T + 第一个B
3. 每个T面板带动下一个T面板
4. 每个B面板带动下一个B面板

### 文件：`src/components/panels/FoldTab.tsx`

**函数：** `handleRebuildChainRelations`

**核心修改：**
1. 递归处理所有层级
2. 按类型分类（X、T、B）
3. 每类独立形成链式

### 文件：`src/components/canvas/NestedGroupFold.tsx`

**核心逻辑：**
- 使用嵌套 `<group>` 结构实现链式折叠
- 外层 group: `position = foldEdgePos`（折叠边位置）
- 内层 group: `position = pivotOffset`（面板中心偏移）
- 使用 `Quaternion.setFromAxisAngle` 实现旋转

---

## 技术要点

### 1. 链式折叠的数据结构

```
drivenMap = {
  "1": ["2", "1-1T", "1-1B"],      // 根面板
  "2": ["3", "2-1T", "2-1B"],      // 第一个X面板
  "3": ["4", "3-1T", "3-1B"],      // 第二个X面板
  "4": ["4-1T", "4-1B"],           // 最后一个X面板
  "1-1T": ["1-2T"],                // T系列链式
  "1-1B": ["1-2B"],                // B系列链式
  ...
}
```

### 2. 嵌套 Group 结构

```jsx
<group position={foldEdgePos}>           {/* 折叠边位置 */}
  <group position={pivotOffset}>         {/* 面板中心偏移 */}
    <mesh>...</mesh>                     {/* 面板几何体 */}
    {children.map(child => (             {/* 递归渲染子面板 */}
      <Panel3D node={child} ... />
    ))}
  </group>
</group>
```

### 3. 旋转计算

```typescript
const foldAngle = foldProgress * (Math.PI / 2) * foldDirection;
const quaternion = new THREE.Quaternion();
quaternion.setFromAxisAngle(rotationAxis, foldAngle);
groupRef.current.quaternion.copy(quaternion);
```

---

## 总结

### 核心教训

1. **数据结构决定行为** - `drivenMap` 的结构直接决定折叠行为
2. **链式 vs 扁平** - 链式结构是级联折叠的关键
3. **分类处理** - X轴、T系列、B系列需要分别处理
4. **递归应用** - 链式逻辑需要递归应用到所有层级
5. **一致性** - 自动生成和手动重建需要使用相同逻辑

### 最终成果

- ✅ X轴面板链式折叠：1 → 2 → 3 → 4
- ✅ T系列链式折叠：n-1T → n-2T → n-3T
- ✅ B系列链式折叠：n-1B → n-2B → n-3B
- ✅ 自动识别正确生成链式 drivenMap
- ✅ 手动重建按钮正确转换为链式结构

---

**文档版本**：v1.0
**最后更新**：2026-01-26
**维护者**：开发团队
