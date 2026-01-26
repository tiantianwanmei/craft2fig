// SDF (Signed Distance Field) 生成算法
// 从原版 beta 迁移，用于凹凸效果

export interface SDFConfig {
  spread?: number
  threshold?: number
  mode?: 'shrink' | 'expand'
  profile?: 'smoothstep' | 'linear' | 'pillow'
  softness?: number
  rippleCount?: number
  rippleWidth?: number
  rippleDash?: number
}

// 高斯模糊辅助函数
function gaussianBlur(grid: Float32Array, width: number, height: number, radius: number): Float32Array {
  const output = new Float32Array(width * height)
  const kernel: number[] = []
  let sum = 0

  // 生成高斯核
  for (let i = -radius; i <= radius; i++) {
    const val = Math.exp(-(i * i) / (2 * radius * radius))
    kernel.push(val)
    sum += val
  }

  // 归一化
  for (let i = 0; i < kernel.length; i++) {
    kernel[i] /= sum
  }

  // 水平模糊
  const temp = new Float32Array(width * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let val = 0
      for (let i = -radius; i <= radius; i++) {
        const xx = Math.max(0, Math.min(width - 1, x + i))
        val += grid[y * width + xx] * kernel[i + radius]
      }
      temp[y * width + x] = val
    }
  }

  // 垂直模糊
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let val = 0
      for (let i = -radius; i <= radius; i++) {
        const yy = Math.max(0, Math.min(height - 1, y + i))
        val += temp[yy * width + x] * kernel[i + radius]
      }
      output[y * width + x] = val
    }
  }

  return output
}

export function generateSDF(
  imageData: Uint8ClampedArray,
  width: number,
  height: number,
  config: SDFConfig
): Uint8ClampedArray {
  const spread = config.spread || 10.0
  const threshold = config.threshold || 128
  const mode = config.mode || 'shrink'
  const profile = config.profile || 'smoothstep'
  const softness = config.softness || 1.0
  const rippleCount = config.rippleCount || 3
  const rippleWidth = config.rippleWidth || 0.5
  const rippleDash = config.rippleDash || 0

  // 1. 提取 Alpha 通道并计算距离场
  const grid = new Float32Array(width * height)
  const INF = 1e9

  // 初始化：根据模式设置起点
  for (let i = 0; i < width * height; i++) {
    const alpha = imageData[i * 4 + 3]
    const isObject = alpha > threshold

    if (mode === 'expand') {
      grid[i] = isObject ? 0 : INF
    } else {
      grid[i] = isObject ? INF : 0
    }
  }

  // 前向扫描
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x
      if (grid[idx] === 0) continue
      let minDist = grid[idx]
      if (x > 0) minDist = Math.min(minDist, grid[idx - 1] + 1)
      if (y > 0) minDist = Math.min(minDist, grid[idx - width] + 1)
      if (x > 0 && y > 0) minDist = Math.min(minDist, grid[idx - width - 1] + 1.414)
      if (x < width - 1 && y > 0) minDist = Math.min(minDist, grid[idx - width + 1] + 1.414)
      grid[idx] = minDist
    }
  }

  // 后向扫描
  for (let y = height - 1; y >= 0; y--) {
    for (let x = width - 1; x >= 0; x--) {
      const idx = y * width + x
      let minDist = grid[idx]
      if (x < width - 1) minDist = Math.min(minDist, grid[idx + 1] + 1)
      if (y < height - 1) minDist = Math.min(minDist, grid[idx + width] + 1)
      if (x < width - 1 && y < height - 1) minDist = Math.min(minDist, grid[idx + width + 1] + 1.414)
      if (x > 0 && y < height - 1) minDist = Math.min(minDist, grid[idx + width - 1] + 1.414)
      grid[idx] = minDist
    }
  }

  // 2. 对距离场应用多次模糊
  const blurRadius = Math.max(2, Math.floor(softness * 5))
  let blurred = gaussianBlur(grid, width, height, blurRadius)
  blurred = gaussianBlur(blurred, width, height, Math.floor(blurRadius * 0.5))

  // 3. 生成高度图
  const output = new Uint8ClampedArray(width * height * 4)

  for (let i = 0; i < width * height; i++) {
    const alpha = imageData[i * 4 + 3]
    const isObject = alpha > threshold
    const dist = blurred[i]

    // 根据模式决定是否渲染
    let shouldRender = false
    if (mode === 'expand') {
      shouldRender = isObject || (dist < spread)
    } else {
      shouldRender = isObject
    }

    if (!shouldRender) {
      output[i * 4] = 0
      output[i * 4 + 1] = 0
      output[i * 4 + 2] = 0
      output[i * 4 + 3] = 0
      continue
    }

    // 计算高度
    let t: number
    if (mode === 'expand') {
      if (dist >= spread) {
        t = 0.0
      } else {
        t = 1.0 - (dist / spread)
      }
    } else {
      if (dist >= spread) {
        t = 1.0
      } else {
        t = dist / spread
      }
    }

    // 应用 Profile 曲线
    let z = t
    if (profile === 'smoothstep') {
      z = t * t * (3 - 2 * t)
    } else if (profile === 'linear') {
      z = t
    } else if (profile === 'pillow') {
      const baseHeight = t * t * (3 - 2 * t)
      const phase = t * rippleCount * Math.PI * 2
      let wave = (Math.sin(phase) + 1) / 2
      const exponent = 1.0 / Math.max(0.1, rippleWidth)
      wave = Math.pow(wave, exponent)

      if (rippleDash > 0) {
        const x = i % width
        const y = Math.floor(i / width)
        const dashSize = 5 + rippleDash * 20
        const dashMask = (Math.sin(x / dashSize) * Math.sin(y / dashSize) + 1) / 2
        if (dashMask < 0.5) wave = 0
      }

      z = baseHeight * (0.2 + 0.8 * wave)
    }

    const value = Math.floor(z * 255)
    output[i * 4] = value
    output[i * 4 + 1] = value
    output[i * 4 + 2] = value
    output[i * 4 + 3] = value > 0 ? 255 : 0
  }

  return output
}
