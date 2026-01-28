# SkinnedMesh Render 窗口“默认右下偏移”修复复盘（2026-01-28）

## 现象
- 打开 `Cycles Render Preview`（或 render 窗口）后，`SkinnedMesh` 模式的模型会在初始化后“自动往右下角移动一段距离”。
- 折叠动画表现混乱：骨骼辅助线/网格 pivot 看起来不稳定，像是被二次平移/重定位。

## 关键日志/信号
- 控制台出现多次 `SkeletonBuilder` / `SkinnedFoldingMesh` 初始化日志。
- 浏览器性能提示（非根因）：
  - `Added non-passive event listener`（与偏移无直接关系）
  - `requestAnimationFrame handler took XXXms`（可能因初始化/几何构建重）

## 根因（Root Cause）
### 1) 不能用外层的“自动居中”去包裹 SkinnedMesh
- `@react-three/drei` 的 `<Center>` 会：
  - 每次渲染/布局变化时测量 children 的 bounding box
  - 然后对其施加平移，把内容移到世界原点
- 而 `SkinnedFoldingMesh` 的几何与骨骼在初始化阶段会发生多次结构性变化：
  - 动态让位（`calculateTreeOffsets`）会改变面板的最终 offsets
  - expanded bounds 会改变（min/max/width/height）
  - `skeleton.calculateInverses()` 与 `updateMatrixWorld(true)` 后，测量结果可能变化
  - geometry 会被替换/更新（参数变化时）
- 结果：`<Center>` 会在“打开窗口后的几帧内”重复重算并施加不同平移，表现为模型在视觉上突然滑到右下角。

### 2) “外层用原始 bounds 居中”必然不准
- UI 侧 `bounds.width/height` 通常只来自原始 layout（`panels` 的几何边界）。
- SkinnedMesh 内部为了折痕/动态让位，会生成 expanded bounds（含 offsets/gap 的扩张）。
- 用“原始 bounds”去居中 expanded bounds，一定会产生偏移误差。

## 错误路径（踩坑）
- 尝试在 `CyclesRenderPreview` 外层对 skinned mesh 使用 `<Center>`。
- 尝试在 `CyclesRenderPreview` 外层用 `bounds.width/height` 手工平移到中心。
- 这两种方式都会在 SkinnedMesh（动态几何、动态骨骼、动态 bounds）场景里失效。

## 正确修复（Fix）
### 1) 居中逻辑下沉到引擎层（权威来源）
位置：`packages/folding-3d/src/skinned/SkinnedFoldingMesh.tsx`
- 在 `meshData` 构建阶段已经计算出 expanded bounds：
  - `bounds = calculateBounds(panelTree, offsets)`
- 用 expanded bounds 的中心点作为唯一坐标基准：
  - `centerX = (minX + maxX) / 2`
  - `centerY = (minY + maxY) / 2`
- 统一平移到世界原点：
  - `centerPosition = [-centerX * scale, +centerY * scale, 0]`
- 最外层 `<group position={centerPosition}>` 包裹 `skinnedMesh` 与 `SkeletonHelper`。

### 2) 业务层避免使用 `<Center>` 包裹 skinned 分支
位置：`src/components/canvas/CyclesRenderPreview.tsx`
- 对 `hasHierarchy && geometryMode === 'skinned'` 分支：
  - 不再使用 drei `<Center>`
  - 不再做外层手工居中
- 对 non-skinned / nested 逻辑保持原行为（仍可用 `<Center>`）。

## 验收标准（Checklist）
- [ ] 打开 render 窗口后，模型不会再出现“初始化后自动滑动”。
- [ ] 折叠进度拖动时，pivot/骨骼/网格相对关系稳定。
- [ ] 不依赖外层 `<Center>` 的测量与平移。
- [ ] 居中基准来自 expanded bounds（含 dynamic offsets）。

## 性能/工程建议
- SkinnedMesh 初始化较重时，优先避免引入会触发额外测量/重布局的组件（如 `<Center>`）。
- 业务层尽量只做“纯组合”，坐标基准应由引擎层统一定义，否则很容易出现重复 offset / 双重归一化。

## 关联文件
- `packages/folding-3d/src/skinned/SkinnedFoldingMesh.tsx`
- `src/components/canvas/CyclesRenderPreview.tsx`
- `src/components/canvas/SkinnedMeshBridge.tsx`
- `src/utils/panelTreeConverter.ts`
