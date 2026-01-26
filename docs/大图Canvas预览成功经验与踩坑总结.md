# 大图 Canvas 预览 - 成功经验与踩坑总结

> **关键词**: 大图预览, CraftLargePreview, craftRenderer, Canvas渲染, 异步竞争, 闪黑, 白屏

## 一、核心组件

### 1. CraftLargePreview.tsx
位置: `src/components/craft/CraftLargePreview.tsx`

点击缩略图后显示的全屏工艺预览组件。

### 2. CraftRenderer (craftRenderer.ts)
位置: `src/utils/craftRenderer.ts`

Canvas 渲染引擎，负责各种工艺效果的渲染。

---

## 二、成功经验

### 1. 异步竞争处理 - "最新帧覆盖旧帧"机制

**问题**: 拖动参数时，多个异步渲染任务同时进行，旧任务晚于新任务完成会导致画面回滚/闪烁。

**解决方案**: 使用 `renderSeq` 序列号机制

```typescript
// 每次渲染递增序列号
const seq = ++renderSeqRef.current;

// 异步完成后检查是否过期
if (renderSeqRef.current !== seq) return; // 丢弃过期结果
```

### 2. 复用临时画布与 ImageData

**问题**: 每次渲染都创建新的 Canvas 和 ImageData 会触发大量 GC，导致 `requestAnimationFrame` handler 超时。

**解决方案**: 使用 WeakMap 缓存 scratch canvas

```typescript
private readonly scratchByCanvas = new WeakMap<
  HTMLCanvasElement,
  {
    canvas: HTMLCanvasElement
    ctx: CanvasRenderingContext2D
    imgData: ImageData
    width: number
    height: number
  }
>();
```

### 3. 降采样提升性能

**问题**: 大尺寸图像渲染卡顿，尤其是 UV 效果参数拖动时。

**解决方案**: 限制工作分辨率

```typescript
// UV 大图参数拖动需要更即时：限制工作分辨率
const maxDim = renderType === 'uv' ? 512 : 1024;
const scale = Math.min(1, maxDim / Math.max(width, height));
```

### 4. Content Bounds 居中

**问题**: 导出的 PNG 可能有透明 padding，导致预览偏移。

**解决方案**: 计算实际内容边界并居中

```typescript
private computeContentBounds(data: Uint8ClampedArray, width: number, height: number) {
  // 优先使用 alpha 通道检测边界
  const alphaThreshold = 16;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const a = data[idx + 3];
      if (a >= alphaThreshold) {
        // 更新 minX, minY, maxX, maxY
      }
    }
  }
  // 回退：如果 alpha 无信号，使用高度通道 (R)
}
```

### 5. 参数变化时重置全局状态

**问题**: 切换工艺类型时，上一个工艺的参数污染新工艺。

**解决方案**: 切换时重置全局参数

```typescript
useEffect(() => {
  if (craftType) {
    resetGlobalCraftParams(); // 重置到默认值
  }
  // 清理缓存...
}, [craftType]);
```

---

## 三、踩坑记录

### 坑1: 闪黑/黑屏

**原因**: 在异步渲染完成前就清屏 (`ctx.clearRect`)

**错误写法**:
```typescript
ctx.clearRect(0, 0, w, h); // 先清屏
await renderAsync();        // 再渲染 - 期间画面是黑的！
ctx.drawImage(tempCanvas, 0, 0);
```

**正确写法**:
```typescript
await renderAsync();        // 先渲染到临时画布
if (renderSeqRef.current !== seq) return; // 检查是否过期
ctx.clearRect(0, 0, w, h); // 渲染就绪后再清屏
ctx.drawImage(tempCanvas, 0, 0);
```

### 坑2: Canvas 尺寸为 0

**原因**: 组件挂载时容器尺寸还未确定，测量到 0。

**解决方案**: 使用 ResizeObserver 监听容器尺寸变化

```typescript
useEffect(() => {
  const ro = new ResizeObserver(() => {
    requestAnimationFrame(() => renderPreview());
  });
  ro.observe(containerRef.current);
  return () => ro.disconnect();
}, [craftType, renderPreview]);
```

### 坑3: Flex 子元素撑开容器

**原因**: Canvas 容器没有设置 `minHeight: 0` 和 `minWidth: 0`

**解决方案**:
```typescript
canvasContainer: {
  flex: 1,
  minHeight: 0, // 关键：防止 flex 子元素撑开容器
  minWidth: 0,
}
```

### 坑4: UV 竖条纹/接缝

**原因**: 导出的 PNG 存在 premultiply/antialias 导致的 RGB 接缝

**解决方案**: UV 渲染只使用 alpha 通道作为 mask

```typescript
const maskOnly = new Uint8ClampedArray(processedHeightData.length);
for (let i = 0; i < processedHeightData.length; i += 4) {
  const a = processedHeightData[i + 3];
  maskOnly[i] = 0;     // 忽略 R
  maskOnly[i + 1] = 0; // 忽略 G
  maskOnly[i + 2] = 0; // 忽略 B
  maskOnly[i + 3] = a; // 只用 alpha
}
```

### 坑5: 同心圆中心漂移

**原因**: edgeSoftness/blur/thickness 改变后，content bounds 计算结果变化

**解决方案**: 基于原始 content bounds 计算稳定的中心点

```typescript
const bounds = this.contentBounds;
const centerX = bounds ? (bounds.x + bounds.width * 0.5) : (this.previewWidth * 0.5);
const centerY = bounds ? (bounds.y + bounds.height * 0.5) : (this.previewHeight * 0.5);
```

### 坑6: 参数拖动严重滞后

**原因**: computeKey 包含变化的参数，导致 worker 任务排队

**解决方案**: computeKey 只包含稳定标识，不包含参数

```typescript
// 错误：每次参数变化都是新 key，任务排队
const computeKey = `${renderKey}:${craftType}:${JSON.stringify(settings)}`;

// 正确：key 稳定，新任务覆盖旧任务
const computeKey = `${renderKey}:${craftType}`;
```

---

## 四、性能优化清单

| 优化项 | 效果 |
|--------|------|
| WeakMap 缓存 scratch canvas | 减少 GC，避免 rAF 超时 |
| 降采样 (maxDim 512/1024) | UV 参数拖动流畅 |
| renderSeq 最新帧覆盖 | 避免画面回滚 |
| 渲染完成后再清屏 | 避免闪黑 |
| ResizeObserver | 正确响应容器尺寸变化 |
| destination-over 背景烘焙 | 避免逐像素 get/put |

---

## 五、关键代码片段

### 完整渲染流程

```typescript
const renderPreview = useCallback(() => {
  const seq = ++renderSeqRef.current;

  rafIdRef.current = requestAnimationFrame(() => {
    // 1. 测量容器尺寸
    const containerRect = container.getBoundingClientRect();

    // 2. 设置 canvas 像素尺寸
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = containerWidth * dpr;
    canvas.height = containerHeight * dpr;

    // 3. 降采样
    const maxDim = renderType === 'uv' ? 512 : 1024;
    // ...

    // 4. 异步渲染
    void (async () => {
      await renderer.renderLargePreviewRaw(tempCanvas, renderType, params);

      // 5. 检查是否过期
      if (renderSeqRef.current !== seq) return;

      // 6. 烘焙背景
      tctx.globalCompositeOperation = 'destination-over';
      tctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

      // 7. 绘制到目标 canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(tempCanvas, dx, dy, dw, dh);
    })();
  });
}, [craftType]);
```

---

## 六、调试技巧

1. **检查 renderSeq**: 在控制台打印 seq 值，确认是否有过期帧被丢弃
2. **检查容器尺寸**: `console.log(containerRect)` 确认不是 0
3. **检查 heightData**: 确认 `heightDataRef.current` 不为 null
4. **Performance 面板**: 查看 rAF handler 耗时，应 < 16ms

---

*文档创建时间: 2026-01-21*
*相关文件: CraftLargePreview.tsx, craftRenderer.ts*