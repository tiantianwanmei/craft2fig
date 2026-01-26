# Figma 插件白屏修复与性能优化复盘（Genki Packaging Exporter）

> 目标：解释“为什么白屏/闪屏”、最终是怎么修复的、如何加快启动速度、如何加快删除工艺、以及如何防止 Craft 大图预览参数交叉污染。

---

## 1. 现象与症状（Symptoms）

### 1.1 主要现象
- **随机白屏**：打开/切换插件 UI 时偶发纯白。
- **白屏只显示 `[object Object]`**：UI 区域出现两个 `object` 单词或类似文本。
- **控制台大量 Violation**：
  - `requestAnimationFrame handler took XXms`
  - `setTimeout handler took XXXms`
  - `Added non-passive event listener ...`

### 1.2 关键结论
- 上述 Violation **大量来自 Figma 宿主 (vendor-core / figma_app__react_profile)**，并不等价于“我们代码有 bug”。
- 但 **UI 的确存在启动链路不稳定**（ESM/modulepreload/注入 HTML、以及 iframe 初始化 race），导致 UI 偶发无法完成首帧渲染。

---

## 2. 根因分析（Root Cause）

### 2.1 `[object Object]` 为什么会出现
Figma 的 `figma.showUI(html)` 期望 `html` 是**字符串**。
- 当传入的内容不是字符串（例如被注入成对象、或宿主内部初始化阶段占位内容异常），iframe 可能会把对象渲染成字符串表现：`[object Object]`。

### 2.2 为什么会“有时正常，有时白屏”
这是典型的**宿主 iframe 初始化竞态（race condition）**：
- iframe 创建完成、message 通道 ready、脚本执行、React mount，这些阶段在宿主里并非 100% 可预测。
- 若我们把“真实 UI HTML（巨大字符串）”一次性塞入，并且 UI 尚未 ready 或消息丢失，就会出现“白屏/卡住”。

### 2.3 构建注入导致的“脚本丢失”风险
曾经在 `build-plugin.cjs` 中尝试移动 `<script>` 标签时，正则替换使用了**不存在的捕获组**（`$2`），可能导致 script 被移除但没有正确插回，从而出现“纯白/无 JS”。

---

## 3. 最终稳定方案（Final Architecture）

### 3.1 Boot Iframe（先稳定显示，再注入真实 UI）
**核心策略：永远先 showUI 一个极小、稳定的 Boot HTML**，从 0ms 起 UI 就显示黑底 `Loading…`，避免宿主初始化阶段出现白屏/`object` 闪烁。

实现要点：
- 插件侧：
  - `figma.showUI(UI_BOOT_HTML, UI_SIZE)`
  - Boot 页面 ready 后回传 `BOOTSTRAP_READY`
  - 插件侧再通过 `figma.ui.postMessage({ type: 'LOAD_REAL_UI_HTML', html })` 把真实 HTML 传进去。
- Boot 页面：
  - 监听 `message`，收到 `LOAD_REAL_UI_HTML` 后 `document.open/write/close` 替换自身为真实 UI。

### 3.2 UI 挂载握手（Handshake）+ 自愈重试（Self-Heal）
- UI 在 React 首帧稳定后发送 `UI_MOUNTED`。
- 插件侧若在时间窗口内未收到 `UI_MOUNTED`，触发 `showUI` 重试。

这让“宿主偶发初始化失败”从“卡死白屏”变成“可自愈恢复”。

### 3.3 降低启动期 message 压力
早期做过“高频泵送真实 HTML”（50ms 一次），但真实 HTML 很大，会导致宿主 `message handler took 700-800ms`，反而让启动更卡。

最终方案改为：
- **稀疏重试**（例如 0ms / 200ms / 800ms 三次）
- 避免高频发送大 payload。

---

## 4. 如何加快启动速度（Startup Performance）

### 4.1 UI 两阶段渲染（Two-Stage Mount）
目标：避免首帧把所有重组件一起挂载导致卡顿。
- 第一阶段：渲染轻量壳（Loading…）
- 第二阶段：`requestAnimationFrame` 后再挂载重组件（Viewport/ControlPanel）

好处：
- 首帧更稳，减少“打开时白屏/卡住”的概率。

### 4.2 插件侧重任务延后到 `UI_MOUNTED` 后执行
插件侧有一些“启动重任务”，例如：
- 恢复/重建工艺指示器（regenerate indicators）
- 启动时批量 postMessage

最终策略：
- **只有在 UI 真正挂载完成（`UI_MOUNTED`）之后**，才启动重任务。
- 这样 UI 启动阶段不被主线程/消息洪峰抢占。

---

## 5. 删除工艺如何加快（Delete Craft Performance）

目标：删除时不要全量刷新。

采用策略：
- **增量更新**：删除某个 layer/craft 时，只移除对应 item，而不是重新拉全量列表。
- UI store 更新使用“单项过滤”而非重建全部结构。

典型实现：
- plugin → UI 增加 `MARKED_LAYER_REMOVED`（或同类增量事件）
- UI 收到后：
  - `setMarkedLayers(current.filter(l => l.id !== removedId))`

好处：
- 大数据量时删除不触发全量重渲染。
- 交互更“即时”。

---

## 6. 防止 Craft 大图预览参数交叉污染（Param Isolation）

### 6.1 问题本质
多工艺场景下：
- UI 若只维护一份全局 craft 参数对象
- 在切换缩略图/工艺面板时会复用同一份状态

就会出现：
- A 工艺调了参数，切换到 B 工艺时参数被“带过去”

### 6.2 解决方案
- 以“当前激活的 craft panel”为 key，维护 **settings map**：
  - `Record<activeCraftPanel, CraftSettings>`
- 切换 panel 时：
  - 从 map 读取并恢复
- 更新参数时：
  - 只更新当前 panel 的条目

好处：
- 工艺参数天然隔离，不会互相污染。

---

## 7. 踩坑经验（Pitfalls）

### 7.1 不要用 fragile 的 regex 乱改产物 HTML
- 一个捕获组写错（如 `$2`）就可能让脚本丢失
- 直接导致 UI “纯白没 JS”

### 7.2 不要在启动期高频 postMessage 大 payload
- 真实 HTML 大、宿主 message handler 可能很重
- 造成启动更慢/更卡

### 7.3 不要把宿主 Violation 全当成自己代码的问题
- 需要区分：
  - 宿主日志噪声
  - 我们真实的 UI 崩溃/未挂载

---

## 8. 推荐的验收清单（Checklist）

- [ ] 反复打开/关闭插件 UI（20 次）不再出现卡死白屏
- [ ] 启动时只显示 `Loading…`（可接受），不出现 `[object Object]`
- [ ] UI 挂载后再执行重任务（indicator 恢复）
- [ ] 删除工艺时 UI 无明显卡顿（增量更新）
- [ ] Craft 大图预览切换不串参数（按 panel key 隔离）

---

## 9. 关联文件（便于未来快速定位）

- UI 启动与两阶段挂载：
  - `src/App.tsx`
- UI message 防护/日志：
  - `src/hooks/usePluginMessage.ts`
- 插件主线程启动、自愈、boot iframe：
  - `src/plugin/code.ts`
- 构建注入：
  - `build-plugin.cjs`
- 删除/增量更新相关：
  - `src/plugin/indicator.ts`
  - `src/plugin/cache.ts`
  - `src/types/messages.ts`

