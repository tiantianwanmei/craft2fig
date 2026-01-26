// 法线贴图生成算法
// 从原版 beta 迁移

// Sobel 算子
const SOBEL_X = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]]
const SOBEL_Y = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]]

// Scharr 算子（更精确）
const SCHARR_X = [[-3, 0, 3], [-10, 0, 10], [-3, 0, 3]]
const SCHARR_Y = [[-3, -10, -3], [0, 0, 0], [3, 10, 3]]

export interface NormalMapOptions {
  strength?: number
  algorithm?: 'sobel' | 'scharr'
  invertY?: boolean
  blurRadius?: number
  edgeSoftness?: number
  sharpness?: number
  useGrayscale?: boolean
  contrast?: number
  brightness?: number
  curvature?: 'linear' | 'parabolic' | 'smooth' | 'sharp' | 'round'
}

export function generateNormalMap(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  options: NormalMapOptions = {}
): Uint8ClampedArray {
  const opts = {
    strength: options.strength || 1.0,
    algorithm: options.algorithm || 'sobel',
    invertY: options.invertY !== undefined ? options.invertY : false,
    blurRadius: options.blurRadius || 0,
    edgeSoftness: options.edgeSoftness || 0,
    sharpness: options.sharpness || 1.0,
    useGrayscale: options.useGrayscale || false,
    contrast: options.contrast || 1.0,
    brightness: options.brightness || 0,
    curvature: options.curvature || 'smooth'
  }

  const output = new Uint8ClampedArray(data.length)
  const w = width
  const h = height

  // 预处理高度数据和 alpha 通道
  let heightData = new Float32Array(w * h)
  let alphaData = new Uint8ClampedArray(w * h)  // 🔧 保存原始 alpha

  for (let i = 0; i < w * h; i++) {
    const r = data[i * 4] / 255.0
    const g = data[i * 4 + 1] / 255.0
    const b = data[i * 4 + 2] / 255.0
    const a = data[i * 4 + 3] / 255.0

    // 🔧 保存原始 alpha
    alphaData[i] = data[i * 4 + 3]

    let gray: number
    if (opts.useGrayscale) {
      // Oklab 感知亮度
      const toLinear = (c: number) => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
      const lr = toLinear(r), lg = toLinear(g), lb = toLinear(b)

      const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb)
      const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb)
      const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb)

      gray = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s
    } else {
      gray = 0.299 * r + 0.587 * g + 0.114 * b
    }

    gray = (gray - 0.5) * opts.contrast + 0.5 + (opts.brightness / 255.0)
    gray = Math.max(0, Math.min(1, gray))
    heightData[i] = gray * a
  }

  // 🎯 应用曲度映射到高度数据
  if (opts.curvature !== 'linear') {
    for (let i = 0; i < w * h; i++) {
      const t = heightData[i] // 0-1 范围的高度值
      let shaped = t

      switch (opts.curvature) {
        case 'smooth':
          // 平滑：Smoothstep函数
          shaped = t * t * (3 - 2 * t)
          break
        case 'sharp':
          // 尖锐：三次方
          shaped = t * t * t
          break
        case 'round':
          // 圆润：平方根
          shaped = Math.sqrt(t)
          break
        case 'parabolic':
          // 抛物线：二次方
          shaped = t * t
          break
      }

      heightData[i] = shaped
    }
  }

  // Legacy behavior: edgeSoftness feathers alpha edges
  if (opts.edgeSoftness > 0) {
    const r = Math.max(0, Math.min(100, Math.floor(opts.edgeSoftness)))
    if (r > 0) {
      const alphaF = new Float32Array(w * h)
      for (let i = 0; i < w * h; i++) alphaF[i] = alphaData[i]
      const blurredAlpha = applyGaussianBlur(alphaF, w, h, r)
      for (let i = 0; i < w * h; i++) {
        const a = Math.max(0, Math.min(255, Math.round(blurredAlpha[i])))
        alphaData[i] = a
        heightData[i] *= a / 255.0
      }
    }
  }

  return processNormalMap(heightData, w, h, opts, output, alphaData)
}

function processNormalMap(
  heightData: Float32Array,
  w: number,
  h: number,
  opts: any,
  output: Uint8ClampedArray,
  alphaData: Uint8ClampedArray
): Uint8ClampedArray {
  // 高斯模糊（如果需要）
  if (opts.blurRadius > 0) {
    heightData = applyGaussianBlur(heightData, w, h, opts.blurRadius)
  }

  const getH = (x: number, y: number) =>
    heightData[Math.max(0, Math.min(h-1, y)) * w + Math.max(0, Math.min(w-1, x))]

  const kernelX = opts.algorithm === 'sobel' ? SOBEL_X : SCHARR_X
  const kernelY = opts.algorithm === 'sobel' ? SOBEL_Y : SCHARR_Y
  const divisor = opts.algorithm === 'sobel' ? 8.0 : 32.0

  // 卷积生成法线
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4
      const alpha = alphaData[y * w + x]

      // 🎯 核心修复：透明区域使用中性法线，不透明区域计算法线
      if (alpha === 0) {
        // 透明区域：中性法线 (0, 0, 1) → RGB(128, 128, 255)
        output[idx] = 128
        output[idx+1] = 128
        output[idx+2] = 255
        output[idx+3] = 255  // 🎯 法线贴图始终不透明！
      } else {
        // 不透明区域：计算法线
        let gx = 0, gy = 0
        for (let ky = 0; ky < 3; ky++) {
          for (let kx = 0; kx < 3; kx++) {
            const hVal = getH(x + kx - 1, y + ky - 1)
            gx += hVal * kernelX[ky][kx]
            gy += hVal * kernelY[ky][kx]
          }
        }

        const s = opts.strength * opts.sharpness
        let nx = -gx / divisor * s
        let ny = (opts.invertY ? 1 : -1) * gy / divisor * s
        let nz = 1.0

        const len = Math.sqrt(nx*nx + ny*ny + nz*nz)
        nx /= len
        ny /= len
        nz /= len

        output[idx] = Math.max(0, Math.min(255, Math.round((nx * 0.5 + 0.5) * 255)))
        output[idx+1] = Math.max(0, Math.min(255, Math.round((ny * 0.5 + 0.5) * 255)))
        output[idx+2] = Math.max(0, Math.min(255, Math.round((nz * 0.5 + 0.5) * 255)))
        output[idx+3] = 255  // 🎯 法线贴图始终不透明！
      }
    }
  }

  return output
}

function applyGaussianBlur(
  heightData: Float32Array,
  w: number,
  h: number,
  radius: number
): Float32Array {
  const sigma = radius / 2.0
  const kSize = radius * 2 + 1
  const kernel1D = new Float32Array(kSize)
  let kSum = 0

  for (let i = 0; i < kSize; i++) {
    const x = i - radius
    kernel1D[i] = Math.exp(-(x * x) / (2 * sigma * sigma))
    kSum += kernel1D[i]
  }
  for (let i = 0; i < kSize; i++) kernel1D[i] /= kSum

  // 水平模糊
  const temp = new Float32Array(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0
      for (let k = 0; k < kSize; k++) {
        const sx = Math.max(0, Math.min(w - 1, x + k - radius))
        sum += heightData[y * w + sx] * kernel1D[k]
      }
      temp[y * w + x] = sum
    }
  }

  // 垂直模糊
  const blurred = new Float32Array(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0
      for (let k = 0; k < kSize; k++) {
        const sy = Math.max(0, Math.min(h - 1, y + k - radius))
        sum += temp[sy * w + x] * kernel1D[k]
      }
      blurred[y * w + x] = sum
    }
  }

  return blurred
}
