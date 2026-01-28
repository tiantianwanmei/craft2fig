# HDR Dome Shadow / Ground Projection 修复总结（2026-01-28）

## 目标（你想要的最终视觉）

- **外层：银河系 HDR（Galaxy Dome）**
  - 永远包住相机，缩放再大也不露默认纯色背景
  - 只负责“背景”，不承担地面拍平/贴地

- **内层：大气层 HDR（Atmosphere / Ground Projection）**
  - 负责“地面拍平”的 HDR 投影（地平线/贴地氛围）
  - 其可视范围要足够大，不得比模型/面片小

换句话说：**必须是两套渲染实体，两层距离**，不能把银河系和大气层压成同一层。

---

## 成功方案（最终落地结构）

### 1) 双层环境分工明确

- **HDRDome（外层银河系）**：
  - 使用一个跟随相机的反向球体（`mesh scale=[-r,r,r]`）
  - `r ≈ 0.9 * camera.far`

- **GroundProjection（内层大气层）**：
  - 不再使用 `Environment background` 占用 `scene.background`
  - 改用 **GroundProjectedSkybox（真实 3D 物体）**，作为“内层大气层壳”
  - 通过 `height/radius` 控制贴地/地平线

### 2) 相机/控制器尺度必须匹配“太阳系”

- 将 `camera.far` 提升到“大太阳系”量级（例如 `500000`）
- `OrbitControls.maxDistance` 跟随提升（例如 `450000`）
- 开启 `logarithmicDepthBuffer`，降低大 far 引发的深度精度问题

### 3) 渲染顺序固定（避免“大气层被银河系盖住”）

背景类物体通常 `depthWrite=false`，谁后画谁覆盖，因此必须固定三层 `renderOrder`：

- 银河系背景球：`renderOrder = -2000`
- 大气层（GroundProjectedSkybox）：`renderOrder = -1500`
- 模型：默认 `0`

并对背景/大气层材质都设置：

- `depthTest = false`
- `depthWrite = false`

这样保证：**先画银河系，再画大气层，大气层永远可见**。

---

## 关键踩坑点（以及对应的解决方式）

### 坑 1：把 `camera.far/maxDistance` 压小，会导致“大气层投影域比模型小”

- **现象**：开启 groundProjection 后几乎没效果/阴影贴地不明显，像“大气层太小”
- **原因**：groundProjection 的尺度往往依赖相机距离/`far`（动态 scale）；`far` 过小会把投影域整体压缩
- **解决**：恢复“太阳系”尺度（大 `far` + 大 `maxDistance`），并用 `logarithmicDepthBuffer` 兜底

### 坑 2：用 `Environment background` 做地面拍平，会和银河系背景“抢 background 层”

- **现象**：马赛克/穿帮；或者看起来“银河系和大气层压到一层没有距离”
- **原因**：`Environment background` 会直接写 `scene.background`，让内外层都在同一个背景层竞争
- **解决**：让大气层变成“真实物体”（GroundProjectedSkybox），而不是 background

### 坑 3：Vite/Rollup 无法解析 `three/examples` 深导入

- **现象**：`Rollup failed to resolve import three/examples/.../GroundProjectedSkybox`
- **原因**：three 的 exports 限制导致 bundler 不允许直接 deep import examples
- **解决**：将 `GroundProjectedSkybox` 实现 vendor 到 `src/`（本地模块），从源码导入，保证可打包

### 坑 4：开启大气层后只剩银河系，看起来“开关没作用”

- **现象**：只有银河系 HDR，groundProjection 视觉消失
- **原因**：两个都是背景类渲染，渲染顺序不固定时，银河系可能后画把大气层盖掉
- **解决**：强制 `renderOrder` 分层，并关闭背景材质的 `depthTest/depthWrite`

---

## 落地文件清单（本次改动涉及）

- `src/components/canvas/View3D.tsx`
  - 外层 HDRDome 背景球 renderOrder/深度设置
  - 相机 far/maxDistance 大尺度

- `src/components/canvas/CyclesRenderPreview.tsx`
  - 外层 HDR 背景球 renderOrder/深度设置
  - groundProjection 不依赖 showBackground 才渲染

- `src/components/canvas/GroundProjectedEnv.tsx`
  - groundProjection 改为创建/挂载 GroundProjectedSkybox（内层大气层物体）
  - 动态 scale 跟随相机距离，避免投影域过小

- `src/components/canvas/GroundProjectedSkybox.ts`
  - vendor 的 GroundProjectedSkybox 实现（避免 three/examples 打包限制）

---

## 参数建议（经验值）

- `camera.far`: `500000`
- `OrbitControls.maxDistance`: `450000`（略小于 far）
- 银河系 dome 半径：`0.9 * far`
- 大气层：
  - `radius`: >= `500000`（或至少覆盖最大缩放范围）
  - `height`: 根据地平线观感调（越大地平线越低/越“平”）

---

## 验收 Checklist

- [ ] 开启 `groundProjection` 后，大气层地面拍平明显生效
- [ ] 缩放到极限不露默认纯色背景
- [ ] 不出现“银河系覆盖大气层”的情况
- [ ] build 通过
