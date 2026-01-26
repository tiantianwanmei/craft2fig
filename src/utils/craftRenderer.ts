// Canvas 渲染引擎 - 工艺预览渲染
// 基于原版 beta 的渲染逻辑
import { generateAdvancedTexture } from './textureGenerator'
import { craftComputeClient } from '../workers/craftComputeClient'
import {
  applyFragmentUV,
  applyDiamondUV,
  applyMosaicUV,
  applyFrostedUV,
  applyConcentricUV
} from './uvEffects'

export interface RenderCache {
  thumbnails: Map<string, { canvas: HTMLCanvasElement; width: number; height: number }>
  largePreview: Map<string, { canvas: HTMLCanvasElement; width: number; height: number }>
}

export class CraftRenderer {
  private static nextInstanceId = 1
  private readonly instanceId: number

  private cache: RenderCache = {
    thumbnails: new Map(),
    largePreview: new Map()
  }

  private readonly scratchByCanvas = new WeakMap<
    HTMLCanvasElement,
    {
      canvas: HTMLCanvasElement
      ctx: CanvasRenderingContext2D
      imgData: ImageData
      width: number
      height: number
    }
  >()

  private nextRenderKeyId = 1
  private readonly renderKeyByCanvas = new WeakMap<HTMLCanvasElement, string>()
  private readonly renderSeqByCanvas = new WeakMap<HTMLCanvasElement, number>()

  private previewWidth = 0
  private previewHeight = 0
  private previewHeightData: Uint8ClampedArray | null = null

  private contentBounds: { x: number; y: number; width: number; height: number } | null = null

  constructor() {
    this.instanceId = CraftRenderer.nextInstanceId++
  }

  // 清除所有缓存
  clearCache() {
    this.cache.thumbnails.clear()
    this.cache.largePreview.clear()
  }

  // 设置高度图数据
  setHeightData(data: Uint8ClampedArray, width: number, height: number) {
    this.previewWidth = width
    this.previewHeight = height
    this.previewHeightData = data
    this.contentBounds = this.computeContentBounds(data, width, height)
    this.clearCache()
  }

  private computeContentBounds(data: Uint8ClampedArray, width: number, height: number) {
    let minX = width
    let minY = height
    let maxX = -1
    let maxY = -1

    // Prefer alpha bounds first:
    // - Vectors exported with transparent padding rely on alpha for correct content bounds.
    // - Height-based bounds can fail if the shape's luma is close to background, causing offset crops
    //   (seen as UV concentric center drifting and vertical seam-like artifacts).
    const alphaThreshold = 16
    for (let y = 0; y < height; y++) {
      let idx = (y * width) << 2
      for (let x = 0; x < width; x++) {
        const a = data[idx + 3]
        if (a >= alphaThreshold) {
          if (x < minX) minX = x
          if (y < minY) minY = y
          if (x > maxX) maxX = x
          if (y > maxY) maxY = y
        }
        idx += 4
      }
    }

    // Fallback: If alpha provides no signal (e.g. fully opaque images), use height channel (R)
    if (maxX < 0 || maxY < 0) {
      minX = width
      minY = height
      maxX = -1
      maxY = -1

      const heightThreshold = 10
      const sampleH = (x: number, y: number) => data[((y * width + x) << 2)]
      const bgH = Math.round(
        (sampleH(0, 0) + sampleH(width - 1, 0) + sampleH(0, height - 1) + sampleH(width - 1, height - 1)) / 4
      )

      for (let y = 0; y < height; y++) {
        let idx = (y * width) << 2
        for (let x = 0; x < width; x++) {
          const hVal = data[idx] // grayscale height
          if (Math.abs(hVal - bgH) >= heightThreshold) {
            if (x < minX) minX = x
            if (y < minY) minY = y
            if (x > maxX) maxX = x
            if (y > maxY) maxY = y
          }
          idx += 4
        }
      }
    }

    // If fully transparent, fall back to full frame
    if (maxX < 0 || maxY < 0) {
      return { x: 0, y: 0, width, height }
    }

    // Add a small padding to avoid overly tight crops
    const pad = 2
    const x0 = Math.max(0, minX - pad)
    const y0 = Math.max(0, minY - pad)
    const x1 = Math.min(width - 1, maxX + pad)
    const y1 = Math.min(height - 1, maxY + pad)

    return {
      x: x0,
      y: y0,
      width: Math.max(1, x1 - x0 + 1),
      height: Math.max(1, y1 - y0 + 1),
    }
  }

  // 保持宽高比居中绘制图像（类似 object-fit: contain）
  // 使用原版的 9 参数 drawImage 方法，支持垂直翻转
  private drawImageContain(
    ctx: CanvasRenderingContext2D,
    image: HTMLCanvasElement,
    targetWidth: number,
    targetHeight: number,
    flipY: boolean = false
  ) {
    const sourceWidth = image.width
    const sourceHeight = image.height

    // 计算缩放比例，保持宽高比
    const scale = Math.min(targetWidth / sourceWidth, targetHeight / sourceHeight)

    // 计算绘制尺寸
    const dw = sourceWidth * scale
    const dh = sourceHeight * scale

    // 计算居中位置
    const dx = (targetWidth - dw) / 2
    const dy = (targetHeight - dh) / 2

    if (flipY) {
      // 使用原版的翻转绘制方法
      ctx.save()
      ctx.translate(0, targetHeight)
      ctx.scale(1, -1)
      // 9 参数 drawImage: 从源图像 (0,0) 开始，裁剪整个图像，绘制到 (dx, h-dy-dh) 位置
      ctx.drawImage(image, 0, 0, sourceWidth, sourceHeight, dx, targetHeight - dy - dh, dw, dh)
      ctx.restore()
    } else {
      // 不翻转时使用简单的 5 参数方法
      ctx.drawImage(image, dx, dy, dw, dh)
    }
  }

  private drawImageContainCropped(
    ctx: CanvasRenderingContext2D,
    image: HTMLCanvasElement,
    targetWidth: number,
    targetHeight: number,
    crop: { x: number; y: number; width: number; height: number },
    flipY: boolean = false
  ) {
    const sourceWidth = crop.width
    const sourceHeight = crop.height

    const scale = Math.min(targetWidth / sourceWidth, targetHeight / sourceHeight)
    const dw = sourceWidth * scale
    const dh = sourceHeight * scale
    const dx = (targetWidth - dw) / 2
    const dy = (targetHeight - dh) / 2

    if (flipY) {
      ctx.save()
      ctx.translate(0, targetHeight)
      ctx.scale(1, -1)
      ctx.drawImage(
        image,
        crop.x,
        crop.y,
        crop.width,
        crop.height,
        dx,
        targetHeight - dy - dh,
        dw,
        dh
      )
      ctx.restore()
    } else {
      ctx.drawImage(image, crop.x, crop.y, crop.width, crop.height, dx, dy, dw, dh)
    }
  }

  // HSL 转 RGB
  private hslToRgb(h: number, s: number, l: number): [number, number, number] {
    const c = (1 - Math.abs(2 * l - 1)) * s
    const x = c * (1 - Math.abs((h / 60) % 2 - 1))
    const m = l - c / 2
    let r: number, g: number, b: number

    if (h < 60) { r = c; g = x; b = 0 }
    else if (h < 120) { r = x; g = c; b = 0 }
    else if (h < 180) { r = 0; g = c; b = x }
    else if (h < 240) { r = 0; g = x; b = c }
    else if (h < 300) { r = x; g = 0; b = c }
    else { r = c; g = 0; b = x }

    return [
      Math.round((r + m) * 255),
      Math.round((g + m) * 255),
      Math.round((b + m) * 255)
    ]
  }

  // 渲染工艺缩略图
  async renderThumbnail(
    canvas: HTMLCanvasElement,
    craftType: string,
    settings: any
  ): Promise<void> {
    if (!this.previewHeightData) return

    const canUseCache = !settings || Object.keys(settings).length === 0

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const w = canvas.width
    const h = canvas.height

    // renderKey + seq 用于“最新帧覆盖旧帧”，避免异步 worker 回调晚到导致画面回滚/闪黑
    let renderKey = this.renderKeyByCanvas.get(canvas)
    if (!renderKey) {
      renderKey = `r${this.instanceId}_cv_${this.nextRenderKeyId++}`
      this.renderKeyByCanvas.set(canvas, renderKey)
    }
    const seq = (this.renderSeqByCanvas.get(canvas) ?? 0) + 1
    this.renderSeqByCanvas.set(canvas, seq)

    // 检查缓存（⚠️ 旧实现只按 craftType 缓存，会导致参数变化后预览不更新）
    if (canUseCache) {
      const cached = this.cache.thumbnails.get(craftType)
      if (cached && cached.width === this.previewWidth && cached.height === this.previewHeight) {
        ctx.clearRect(0, 0, w, h)
        this.drawImageContain(ctx, cached.canvas, w, h, false)
        return
      }
    }

    // 复用临时画布与 ImageData，避免每次渲染都触发大量分配/GC（会导致 rAF handler 超时刷屏）
    let scratch = this.scratchByCanvas.get(canvas)
    if (!scratch || scratch.width !== this.previewWidth || scratch.height !== this.previewHeight) {
      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = this.previewWidth
      tempCanvas.height = this.previewHeight
      const tempCtx = tempCanvas.getContext('2d')
      if (!tempCtx) return
      const imgData = tempCtx.createImageData(this.previewWidth, this.previewHeight)
      scratch = {
        canvas: tempCanvas,
        ctx: tempCtx,
        imgData,
        width: this.previewWidth,
        height: this.previewHeight,
      }
      this.scratchByCanvas.set(canvas, scratch)
    }

    const tempCanvas = scratch.canvas
    const tempCtx = scratch.ctx
    const imgData = scratch.imgData

    // 根据工艺类型渲染
    // computeKey 必须稳定（不要包含 seq），否则 worker 客户端的 per-key latest-only 去重失效，会导致任务排队 -> 拖动参数严重滞后
    // 异步竞争由 renderSeq/seq 的 latest-frame-wins 机制负责丢弃过期结果
    const ok = await this.renderCraftType(imgData, craftType, settings, `${renderKey}:${craftType}`, seq)
    // 如果该渲染已经过期（被新的 render 覆盖），直接丢弃，避免清屏造成黑闪
    if (!ok) return

    // 直接放置到临时画布（与原版一致，不做居中处理）
    tempCtx.putImageData(imgData, 0, 0)

    // 渲染就绪后再清屏，避免异步期间出现闪黑
    if (this.renderSeqByCanvas.get(canvas) !== seq) return
    ctx.clearRect(0, 0, w, h)

    // 使用裁切 + contain 居中绘制到目标画布（保证无论导出如何偏移，预览都始终居中）
    if (this.contentBounds) {
      this.drawImageContainCropped(ctx, tempCanvas, w, h, this.contentBounds, false)
    } else {
      this.drawImageContain(ctx, tempCanvas, w, h, false)
    }

    // 保存到缓存（仅当 settings 为空时）
    if (canUseCache) {
      this.cache.thumbnails.set(craftType, {
        canvas: tempCanvas,
        width: this.previewWidth,
        height: this.previewHeight
      })
    }
  }

  async renderLargePreviewRaw(
    canvas: HTMLCanvasElement,
    craftType: string,
    settings: any
  ): Promise<void> {
    if (!this.previewHeightData) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const w = canvas.width
    const h = canvas.height

    let renderKey = this.renderKeyByCanvas.get(canvas)
    if (!renderKey) {
      renderKey = `r${this.instanceId}_cv_${this.nextRenderKeyId++}`
      this.renderKeyByCanvas.set(canvas, renderKey)
    }
    const seq = (this.renderSeqByCanvas.get(canvas) ?? 0) + 1
    this.renderSeqByCanvas.set(canvas, seq)

    let scratch = this.scratchByCanvas.get(canvas)
    if (!scratch || scratch.width !== w || scratch.height !== h) {
      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = w
      tempCanvas.height = h
      const tempCtx = tempCanvas.getContext('2d')
      if (!tempCtx) return
      const imgData = tempCtx.createImageData(w, h)
      scratch = {
        canvas: tempCanvas,
        ctx: tempCtx,
        imgData,
        width: w,
        height: h,
      }
      this.scratchByCanvas.set(canvas, scratch)
    }

    const tempCanvas = scratch.canvas
    const tempCtx = scratch.ctx
    const imgData = scratch.imgData

    const ok = await this.renderCraftType(imgData, craftType, settings, `${renderKey}:${craftType}`, seq)
    if (!ok) return
    if (this.renderSeqByCanvas.get(canvas) !== seq) return

    tempCtx.putImageData(imgData, 0, 0)
    ctx.clearRect(0, 0, w, h)
    ctx.drawImage(tempCanvas, 0, 0)
  }

  // 渲染工艺类型
  private async renderCraftType(
    imgData: ImageData,
    craftType: string,
    settings: any,
    computeKey: string,
    renderSeq: number
  ): Promise<boolean> {
    if (!this.previewHeightData) return false

    // Normalize to lowercase for consistent matching
    const type = craftType.toLowerCase()

    switch (type) {
      case 'hot-stamping-gold':
      case 'hotfoil':
        this.renderHotfoilGold(imgData, settings)
        return true
      case 'hot-stamping-silver':
        this.renderHotfoilSilver(imgData, settings)
        return true
      case 'uv':
        this.renderUV(imgData, settings)
        return true
      case 'varnish':
        // 光油 - 使用 UV 渲染，但带有特定设置
        // 光油预览：必须是"平面灰度强度图"，用于检查不同灰度代表的反射度/强度分布
        // 默认使用 luminance 作为 mask（而不是仅 alpha），避免整块变成均匀灰
        this.renderUV(imgData, { ...settings, type: 'gloss', maskMode: 'luminance' })
        return true
      case 'emboss':
      case 'deboss':
        return this.renderEmboss(imgData, settings, computeKey, renderSeq)
      case 'normal':
        return this.renderNormal(imgData, settings, computeKey, renderSeq)
      case 'displacement':
      case 'texture':
        this.renderDisplacement(imgData, settings)
        return true
      case 'clipmask':
      case 'clip-mask':
        // 🔥 CLIPMASK 荧光效果渲染
        this.renderClipmask(imgData, settings)
        return true
      default:
        // Default to normal map for unknown types
        return this.renderNormal(imgData, settings, computeKey, renderSeq)
    }
  }

  // 渲染烫金
  private renderHotfoilGold(imgData: ImageData, settings: any): void {
    if (!this.previewHeightData) return

    const [r, g, b] = this.hslToRgb(
      settings.hue || 45,
      settings.saturation || 0.8,
      settings.brightness || 0.9
    )

    // Generate texture if enabled - 只在content bounds内生成
    let textureData: Uint8ClampedArray | null = null;
    if (settings.noise > 0 && this.contentBounds) {
      const { width, height } = this.contentBounds;
      textureData = generateAdvancedTexture(width, height, {
        type: settings.noiseType || 'matte',
        intensity: settings.noise,
        scaleX: settings.noiseScaleX || 1.0,
        scaleY: settings.noiseScaleY || 1.0,
        rotation: settings.noiseRotation || 0,
        frequency: settings.noiseFrequency || 1.0,
        stripeCount: settings.stripeCount || 10,
        distortion: settings.distortion || 0.0,
        centerX: 0.5,
        centerY: 0.5
      });
    }

    // 只在vector的实际边界内渲染（使用alpha通道判断）
    for (let i = 0; i < this.previewHeightData.length; i += 4) {
      const alpha = this.previewHeightData[i + 3]
      if (alpha > 0) {
        let finalR = r;
        let finalG = g;
        let finalB = b;

        if (textureData && this.contentBounds) {
          // 计算当前像素在content bounds内的相对位置
          const pixelIdx = i / 4;
          const pixelY = Math.floor(pixelIdx / this.previewWidth);
          const pixelX = pixelIdx % this.previewWidth;

          const relX = pixelX - this.contentBounds.x;
          const relY = pixelY - this.contentBounds.y;

          if (relX >= 0 && relX < this.contentBounds.width && relY >= 0 && relY < this.contentBounds.height) {
            const texIdx = (relY * this.contentBounds.width + relX) * 4;
            const texValue = textureData[texIdx] / 255;
            finalR = Math.round(r * texValue);
            finalG = Math.round(g * texValue);
            finalB = Math.round(b * texValue);
          }
        }

        imgData.data[i] = finalR
        imgData.data[i + 1] = finalG
        imgData.data[i + 2] = finalB
        imgData.data[i + 3] = alpha
      }
    }
  }

  // 渲染烫银
  private renderHotfoilSilver(imgData: ImageData, settings: any): void {
    if (!this.previewHeightData) return

    const [r, g, b] = this.hslToRgb(
      settings.hue || 0,
      settings.saturation || 0.1,
      settings.brightness || 0.95
    )

    // Generate texture if enabled - 只在content bounds内生成
    let textureData: Uint8ClampedArray | null = null;
    if (settings.noise > 0 && this.contentBounds) {
      const { width, height } = this.contentBounds;
      textureData = generateAdvancedTexture(width, height, {
        type: settings.noiseType || 'matte',
        intensity: settings.noise,
        scaleX: settings.noiseScaleX || 1.0,
        scaleY: settings.noiseScaleY || 1.0,
        rotation: settings.noiseRotation || 0,
        frequency: settings.noiseFrequency || 1.0,
        stripeCount: settings.stripeCount || 10,
        distortion: settings.distortion || 0.0,
        centerX: 0.5,
        centerY: 0.5
      });
    }

    // 只在vector的实际边界内渲染（使用alpha通道判断）
    for (let i = 0; i < this.previewHeightData.length; i += 4) {
      const alpha = this.previewHeightData[i + 3]
      if (alpha > 0) {
        let finalR = r;
        let finalG = g;
        let finalB = b;

        if (textureData && this.contentBounds) {
          const pixelIdx = i / 4;
          const pixelY = Math.floor(pixelIdx / this.previewWidth);
          const pixelX = pixelIdx % this.previewWidth;

          const relX = pixelX - this.contentBounds.x;
          const relY = pixelY - this.contentBounds.y;

          if (relX >= 0 && relX < this.contentBounds.width && relY >= 0 && relY < this.contentBounds.height) {
            const texIdx = (relY * this.contentBounds.width + relX) * 4;
            const texValue = textureData[texIdx] / 255;
            finalR = Math.round(r * texValue);
            finalG = Math.round(g * texValue);
            finalB = Math.round(b * texValue);
          }
        }

        imgData.data[i] = finalR
        imgData.data[i + 1] = finalG
        imgData.data[i + 2] = finalB
        imgData.data[i + 3] = alpha
      }
    }
  }

  // 渲染 UV
  // 🎯 UV贴图输出：纯净灰度值，用于驱动Blender的roughness贴图
  // 灰度值 = 反射强度（白色=高光滑/低roughness，黑色=粗糙/高roughness）
  private renderUV(imgData: ImageData, settings: any): void {
    if (!this.previewHeightData) return

    const uvType = settings.type || 'gloss';

    // 🎯 亮度参数：100 = 纯白色255，0 = 纯黑色0
    const uiIntensity = settings.intensity !== undefined ? settings.intensity : 100;
    const intensity = Math.round((uiIntensity / 100) * 255);

    // 🎯 对比度参数：50 = 无对比度调整，0-50 = 降低对比度，50-100 = 增强对比度
    const uiContrast = settings.uvContrast !== undefined ? settings.uvContrast : 50;
    const contrastFactor = ((uiContrast - 50) / 50) * 2; // -2 to +2 (50=0)

    // Apply Edge Softness + mask mode/invert.
    // 🎯 UI参数映射：0-100 → 实际算法范围
    const edgeSoftnessUI = settings.edgeSoftness || 0;
    const edgeSoftness = (edgeSoftnessUI / 100) * 100; // 0-100 → 0-100 (保持线性)
    const maskInvert = settings.maskInvert || false;
    const processedHeightData = this.applyEdgeSoftnessMask(
      this.previewHeightData,
      this.previewWidth,
      this.previewHeight,
      edgeSoftness,
      maskInvert
    );

    // Critical: for UV rendering, treat the input as a pure mask.
    // Do NOT depend on RGB height/luma, because exported PNGs can contain subtle RGB seams
    // (premultiply/antialias/resample) that show up as a bright vertical stripe after processing.
    const maskOnly = new Uint8ClampedArray(processedHeightData.length);
    for (let i = 0; i < processedHeightData.length; i += 4) {
      const a = processedHeightData[i + 3];
      maskOnly[i] = 0;
      maskOnly[i + 1] = 0;
      maskOnly[i + 2] = 0;
      maskOnly[i + 3] = a;
    }
    // Force uvEffects to use precomputed alpha mask, and provide a stable center based on content bounds.
    // This prevents concentric(circle) center drifting due to edgeSoftness/blur/thickness.
    const bounds = this.contentBounds;
    const centerX = bounds ? (bounds.x + bounds.width * 0.5) : (this.previewWidth * 0.5);
    const centerY = bounds ? (bounds.y + bounds.height * 0.5) : (this.previewHeight * 0.5);
    const settingsForEffects = { ...settings, maskMode: 'alpha', maskInvert: false, centerX, centerY };

    if (uvType === 'reverse') {
      for (let i = 0; i < processedHeightData.length; i += 4) {
        const a = processedHeightData[i + 3];
        if (a > 0) {
          const local = Math.round((a / 255) * intensity);
          const reversed = 255 - local;
          imgData.data[i] = reversed;
          imgData.data[i + 1] = reversed;
          imgData.data[i + 2] = reversed;
          imgData.data[i + 3] = a;
        }
      }
    } else if (uvType === 'frosted') {
      applyFrostedUV(imgData, maskOnly, this.previewWidth, this.previewHeight, intensity, settingsForEffects);
    } else if (uvType === 'fragment') {
      applyFragmentUV(imgData, maskOnly, this.previewWidth, this.previewHeight, intensity, settingsForEffects);
    } else if (uvType === 'diamond') {
      applyDiamondUV(imgData, maskOnly, this.previewWidth, this.previewHeight, intensity, settingsForEffects);
    } else if (uvType === 'mosaic') {
      applyMosaicUV(imgData, maskOnly, this.previewWidth, this.previewHeight, intensity, settingsForEffects);
    } else if (uvType === 'concentric') {
      applyConcentricUV(imgData, maskOnly, this.previewWidth, this.previewHeight, intensity, settingsForEffects);
    } else {
      // Standard UV (gloss, semi, satin, matte)
      // 🎯 输出纯净的均匀灰度值，不受alpha影响
      for (let i = 0; i < processedHeightData.length; i += 4) {
        const a = processedHeightData[i + 3];
        if (a > 0) {
          // 直接输出固定灰度值，不要用alpha调制
          imgData.data[i] = intensity;
          imgData.data[i + 1] = intensity;
          imgData.data[i + 2] = intensity;
          imgData.data[i + 3] = a;
        }
      }
    }

    // Post filters (ported behavior): sharpen + blur + contrast
    // 🎯 UI参数映射：0-100 → 实际算法范围
    const sharpenUI = settings.sharpen || 0;
    const sharpenStrength = (sharpenUI / 100) * 5; // 0-100 → 0-5
    if (sharpenStrength > 0) {
      this.applySharpen(imgData, this.previewWidth, this.previewHeight, sharpenStrength);
    }
    const blurUI = settings.blurStrength || settings.blur || 0;
    const blurStrength = (blurUI / 100) * 10; // 0-100 → 0-10
    if (blurStrength > 0) {
      this.applyGaussianBlurImage(imgData, this.previewWidth, this.previewHeight, blurStrength);
    }

    // Apply contrast adjustment
    if (contrastFactor !== 0) {
      this.applyContrast(imgData, contrastFactor);
    }
  }

  private applyEdgeSoftnessMask(
    src: Uint8ClampedArray,
    width: number,
    height: number,
    edgeSoftness: number,
    maskInvert: boolean
  ): Uint8ClampedArray {
    const out = new Uint8ClampedArray(src.length);
    out.set(src);

    // 🎯 边缘柔和度：0 = 硬边缘（二值化），100 = 最大模糊
    if (edgeSoftness <= 0) {
      // 硬边缘：直接二值化
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4;
          const a = src[i + 3];
          let v = a >= 16 ? 255 : 0;
          if (maskInvert) v = 255 - v;
          out[i + 3] = v;
        }
      }
    } else {
      // 柔和边缘：先二值化，然后模糊
      const alpha = new Uint8ClampedArray(width * height);
      for (let i = 0; i < width * height; i++) {
        const a = src[i * 4 + 3];
        alpha[i] = a >= 16 ? 255 : 0;
      }

      // 模糊半径：0-100 → 0-10
      const blurRadius = Math.round((edgeSoftness / 100) * 10);
      const blurred = this.boxBlur1D(alpha, width, height, blurRadius);

      for (let i = 0; i < width * height; i++) {
        let v = blurred[i];
        if (maskInvert) v = 255 - v;
        out[i * 4 + 3] = v;
      }
    }

    return out;
  }

  private boxBlur1D(src: Uint8ClampedArray, width: number, height: number, radius: number): Uint8ClampedArray {
    const tmp = new Uint8ClampedArray(width * height);
    const dst = new Uint8ClampedArray(width * height);

    // horizontal
    for (let y = 0; y < height; y++) {
      let acc = 0;
      const row = y * width;
      for (let x = -radius; x <= radius; x++) {
        const xx = Math.max(0, Math.min(width - 1, x));
        acc += src[row + xx];
      }
      for (let x = 0; x < width; x++) {
        tmp[row + x] = Math.round(acc / (radius * 2 + 1));
        const xOut = x - radius;
        const xIn = x + radius + 1;
        if (xOut >= 0) acc -= src[row + xOut];
        if (xIn < width) acc += src[row + xIn];
      }
    }

    // vertical
    for (let x = 0; x < width; x++) {
      let acc = 0;
      for (let y = -radius; y <= radius; y++) {
        const yy = Math.max(0, Math.min(height - 1, y));
        acc += tmp[yy * width + x];
      }
      for (let y = 0; y < height; y++) {
        dst[y * width + x] = Math.round(acc / (radius * 2 + 1));
        const yOut = y - radius;
        const yIn = y + radius + 1;
        if (yOut >= 0) acc -= tmp[yOut * width + x];
        if (yIn < height) acc += tmp[yIn * width + x];
      }
    }

    return dst;
  }

  private applySharpen(imgData: ImageData, width: number, height: number, strength: number): void {
    const s = Math.max(0, Math.min(5, strength));
    if (s <= 0) return;

    const data = imgData.data;
    const src = new Uint8ClampedArray(data);

    const centerWeight = 1 + s * 2;
    const edgeWeight = -s * 0.5;

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        const a = src[idx + 3];
        if (a === 0) continue;

        const up = ((y - 1) * width + x) * 4;
        const dn = ((y + 1) * width + x) * 4;
        const lf = (y * width + (x - 1)) * 4;
        const rt = (y * width + (x + 1)) * 4;

        const r =
          src[idx] * centerWeight +
          src[up] * edgeWeight +
          src[dn] * edgeWeight +
          src[lf] * edgeWeight +
          src[rt] * edgeWeight;
        const g =
          src[idx + 1] * centerWeight +
          src[up + 1] * edgeWeight +
          src[dn + 1] * edgeWeight +
          src[lf + 1] * edgeWeight +
          src[rt + 1] * edgeWeight;
        const b =
          src[idx + 2] * centerWeight +
          src[up + 2] * edgeWeight +
          src[dn + 2] * edgeWeight +
          src[lf + 2] * edgeWeight +
          src[rt + 2] * edgeWeight;

        data[idx] = Math.max(0, Math.min(255, Math.round(r)));
        data[idx + 1] = Math.max(0, Math.min(255, Math.round(g)));
        data[idx + 2] = Math.max(0, Math.min(255, Math.round(b)));
        data[idx + 3] = a;
      }
    }
  }

  private applyGaussianBlurImage(imgData: ImageData, width: number, height: number, radius: number): void {
    const rr = Math.max(0, Math.min(10, radius));
    if (rr <= 0) return;

    // Fractional radius support for linear-feeling slider:
    // blur(r) ~= lerp( blur(floor(r)), blur(ceil(r)), frac )
    const r0 = Math.floor(rr);
    const r1 = Math.min(10, r0 + 1);
    const t = rr - r0;

    const src = imgData.data;
    const gray = new Uint8ClampedArray(width * height);
    const alpha = new Uint8ClampedArray(width * height);
    for (let i = 0, p = 0; i < src.length; i += 4, p++) {
      gray[p] = src[i];
      alpha[p] = src[i + 3];
    }

    const blur1D = (input: Uint8ClampedArray, r: number): Uint8ClampedArray => {
      if (r <= 0) return new Uint8ClampedArray(input);
      const tmp = new Uint8ClampedArray(width * height);
      const dst = new Uint8ClampedArray(width * height);
      const windowSize = r * 2 + 1;

      // horizontal
      for (let y = 0; y < height; y++) {
        const row = y * width;
        let sum = 0;
        for (let x = -r; x <= r; x++) {
          const xx = Math.max(0, Math.min(width - 1, x));
          sum += input[row + xx];
        }
        for (let x = 0; x < width; x++) {
          tmp[row + x] = Math.round(sum / windowSize);
          const xOut = x - r;
          const xIn = x + r + 1;
          if (xOut >= 0) sum -= input[row + xOut];
          if (xIn < width) sum += input[row + xIn];
        }
      }

      // vertical
      for (let x = 0; x < width; x++) {
        let sum = 0;
        for (let y = -r; y <= r; y++) {
          const yy = Math.max(0, Math.min(height - 1, y));
          sum += tmp[yy * width + x];
        }
        for (let y = 0; y < height; y++) {
          dst[y * width + x] = Math.round(sum / windowSize);
          const yOut = y - r;
          const yIn = y + r + 1;
          if (yOut >= 0) sum -= tmp[yOut * width + x];
          if (yIn < height) sum += tmp[yIn * width + x];
        }
      }
      return dst;
    };

    const out0 = r0 > 0 ? blur1D(gray, r0) : gray;
    if (t <= 0 || r1 === r0) {
      for (let p = 0, i = 0; p < out0.length; p++, i += 4) {
        const a = alpha[p];
        src[i] = out0[p];
        src[i + 1] = out0[p];
        src[i + 2] = out0[p];
        src[i + 3] = a;
      }
      return;
    }

    const out1 = blur1D(gray, r1);
    for (let p = 0, i = 0; p < out0.length; p++, i += 4) {
      const a = alpha[p];
      const v = Math.round(out0[p] * (1 - t) + out1[p] * t);
      src[i] = v;
      src[i + 1] = v;
      src[i + 2] = v;
      src[i + 3] = a;
    }
  }

  private applyContrast(imgData: ImageData, contrastFactor: number): void {
    if (contrastFactor === 0) return;

    const data = imgData.data;

    // Contrast formula: output = ((input/255 - 0.5) * (1 + contrastFactor)) + 0.5) * 255
    // contrastFactor: -2 to +2 (0 = no change)
    const factor = 1 + contrastFactor;

    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      if (a === 0) continue;

      // Apply contrast to RGB channels
      for (let c = 0; c < 3; c++) {
        const normalized = data[i + c] / 255;
        const adjusted = ((normalized - 0.5) * factor) + 0.5;
        data[i + c] = Math.max(0, Math.min(255, Math.round(adjusted * 255)));
      }
    }
  }

  // 渲染凹凸（使用 SDF 算法）
  private async renderEmboss(
    imgData: ImageData,
    settings: any,
    computeKey: string,
    renderSeq: number
  ): Promise<boolean> {
    if (!this.previewHeightData) return false

    const modeRaw = (settings.sdfMode as string | undefined) || 'shrink'
    const mode: 'shrink' | 'expand' = modeRaw === 'grow' ? 'expand' : (modeRaw as 'shrink' | 'expand')

    const out = await craftComputeClient.computeSdf(
      computeKey,
      this.previewHeightData,
      this.previewWidth,
      this.previewHeight,
      {
        spread: settings.sdfSpread || 10,
        mode,
        profile: settings.sdfProfile || 'smoothstep',
        softness: settings.sdfSoftness || 1.0,
        rippleCount: settings.rippleCount || 3,
        rippleWidth: settings.rippleWidth || 0.5,
        rippleDash: settings.rippleDash || 0,
        heightScale: settings.heightScale || 1.5,
        maskMode: settings.maskMode || 'alpha',
        maskInvert: settings.maskInvert || false,
      }
    )

    // 过期结果直接丢弃
    if (out === null) return false
    if (this.previewHeightData && this.previewHeightData.length !== out.length) return false
    if (renderSeq <= 0) return false

    imgData.data.set(out)
    return true
  }

  // 渲染法线（使用法线生成算法）
  private async renderNormal(
    imgData: ImageData,
    settings: any,
    computeKey: string,
    renderSeq: number
  ): Promise<boolean> {
    if (!this.previewHeightData) return false

    const out = await craftComputeClient.computeNormal(
      computeKey,
      this.previewHeightData,
      this.previewWidth,
      this.previewHeight,
      {
        strength: settings.strength || 1.0,
        algorithm: settings.algorithm || 'sobel',
        invertY: settings.invertY !== undefined ? settings.invertY : false,
        // blurRadius: blur the height field (overall smoothing)
        blurRadius: settings.blurRadius || 0,
        // edgeSoftness: feather alpha edges (legacy behavior)
        edgeSoftness: settings.edgeSoftness || 0,
        sharpness: settings.sharpness || 1.0,
        useGrayscale: settings.useGrayscale || false,
        contrast: settings.contrast || 1.0,
        brightness: settings.brightness || 0,
        curvature: settings.curvature || 'smooth', // 🎯 添加曲度参数
      }
    )

    // 过期结果直接丢弃
    if (out === null) return false
    if (this.previewHeightData && this.previewHeightData.length !== out.length) return false
    if (renderSeq <= 0) return false

    imgData.data.set(out)
    return true
  }

  // 🎯 快速Box Blur（比高斯模糊快10倍以上）
  private fastBoxBlur(field: Float32Array, width: number, height: number, radius: number): Float32Array {
    if (radius <= 0) return field

    const r = Math.floor(radius)
    const output = new Float32Array(width * height)
    const temp = new Float32Array(width * height)

    // 水平模糊
    for (let y = 0; y < height; y++) {
      let sum = 0
      const row = y * width

      // 初始化窗口
      for (let x = -r; x <= r; x++) {
        const xx = Math.max(0, Math.min(width - 1, x))
        sum += field[row + xx]
      }

      // 滑动窗口
      for (let x = 0; x < width; x++) {
        temp[row + x] = sum / (r * 2 + 1)
        const xOut = x - r
        const xIn = x + r + 1
        if (xOut >= 0) sum -= field[row + xOut]
        if (xIn < width) sum += field[row + xIn]
      }
    }

    // 垂直模糊
    for (let x = 0; x < width; x++) {
      let sum = 0

      // 初始化窗口
      for (let y = -r; y <= r; y++) {
        const yy = Math.max(0, Math.min(height - 1, y))
        sum += temp[yy * width + x]
      }

      // 滑动窗口
      for (let y = 0; y < height; y++) {
        output[y * width + x] = sum / (r * 2 + 1)
        const yOut = y - r
        const yIn = y + r + 1
        if (yOut >= 0) sum -= temp[yOut * width + x]
        if (yIn < height) sum += temp[yIn * width + x]
      }
    }

    return output
  }

  // 🎯 SDF距离变换算法 (Two-Pass Distance Transform)
  // 计算每个内部像素到最近边缘的距离，生成完美的金字塔/圆锥体形状
  private computeSDF(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    useGrayscale: boolean = false,
    threshold: number = 128,  // 🎯 修复：提高默认阈值到128（中间灰度）
    smoothness: number = 0   // 平滑度（0-100，UI参数）
  ): Float32Array {
    const INF = 1e9
    const distMap = new Float32Array(width * height)

    if (useGrayscale) {
      // 🎯 双向距离场：黑线（灰度值低）是种子点，往两侧扩散
      // 内部黑线：往两侧混合（黑线最暗，两侧逐渐变亮）
      // 最外圈边缘：也是种子点，往内部混合

      for (let i = 0; i < width * height; i++) {
        const alpha = data[i * 4 + 3]

        if (alpha <= 10) {
          // 透明区域：不参与计算
          distMap[i] = INF
          continue
        }

        // 计算灰度值
        const r = data[i * 4]
        const g = data[i * 4 + 1]
        const b = data[i * 4 + 2]
        const luminance = 0.299 * r + 0.587 * g + 0.114 * b

        // 🎯 黑线（灰度值低）= 种子点（距离0）
        // 非黑线（灰度值高）= 待计算（距离INF）
        // 阈值128：灰度<128的区域是黑线，往两侧扩散
        distMap[i] = luminance < threshold ? 0 : INF
      }
    } else {
      // 原始逻辑：基于alpha边界的距离场
      for (let i = 0; i < width * height; i++) {
        const alpha = data[i * 4 + 3]
        distMap[i] = alpha > 10 ? INF : 0
      }
    }

    // 第一遍：从左上到右下
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x
        if (distMap[idx] === 0) continue

        let d = distMap[idx]
        if (x > 0) d = Math.min(d, distMap[idx - 1] + 1)
        if (y > 0) d = Math.min(d, distMap[idx - width] + 1)
        if (x > 0 && y > 0) d = Math.min(d, distMap[idx - width - 1] + 1.414)
        if (x < width - 1 && y > 0) d = Math.min(d, distMap[idx - width + 1] + 1.414)

        distMap[idx] = d
      }
    }

    // 第二遍：从右下到左上
    let maxDist = 0
    for (let y = height - 1; y >= 0; y--) {
      for (let x = width - 1; x >= 0; x--) {
        const idx = y * width + x
        if (distMap[idx] === 0) continue

        let d = distMap[idx]
        if (x < width - 1) d = Math.min(d, distMap[idx + 1] + 1)
        if (y < height - 1) d = Math.min(d, distMap[idx + width] + 1)
        if (x < width - 1 && y < height - 1) d = Math.min(d, distMap[idx + width + 1] + 1.414)
        if (x > 0 && y < height - 1) d = Math.min(d, distMap[idx + width - 1] + 1.414)

        distMap[idx] = d
        if (d < INF && d > maxDist) maxDist = d
      }
    }

    // 🎯 精细映射：UI参数0-100 → 实际模糊半径0-5
    // 0-20: 0-1 (精细控制，步长0.05)
    // 20-60: 1-3 (中等控制，步长0.05)
    // 60-100: 3-5 (粗略控制，步长0.05)
    const blurRadius = Math.max(0, Math.min(5, smoothness * 0.05))
    const blurred = blurRadius > 0
      ? this.fastBoxBlur(distMap, width, height, blurRadius)
      : distMap

    // 归一化到 0-1 范围
    if (maxDist > 0) {
      for (let i = 0; i < blurred.length; i++) {
        if (blurred[i] < INF) {
          blurred[i] = blurred[i] / maxDist
        } else {
          blurred[i] = 0
        }
      }
    }

    return blurred
  }

  // 渲染置换
  // 🎯 置换贴图：将RGB色相转换为灰度值，保留过渡灰度
  // 🎯 渐变参数：使用SDF距离变换，根据面片结构中间亮四周暗，打造圆滑雕刻效果
  private renderDisplacement(imgData: ImageData, settings: any): void {
    if (!this.previewHeightData) return

    const strength = settings.strength || 1.0
    const midlevel = settings.midlevel || 0.5
    const gradientAmount = (settings.gradient || 0) / 100 // 0-100 → 0-1
    const curvature = settings.curvature || 'smooth' // 曲度类型：linear, smooth, sharp, round
    const threshold = settings.threshold || 128 // 🎯 修复：默认阈值128
    const smoothness = settings.smoothness || 0 // 平滑度（0-10）

    // 第一步：计算SDF距离场（如果启用渐变）
    // 🎯 使用基于灰度值的距离场：黑线区域往外扩散，两条黑线中间最亮
    let sdfField: Float32Array | null = null
    if (gradientAmount > 0) {
      sdfField = this.computeSDF(
        this.previewHeightData,
        this.previewWidth,
        this.previewHeight,
        true,
        threshold,
        smoothness
      )
    }

    // 第二步：渲染每个像素
    for (let i = 0; i < this.previewHeightData.length; i += 4) {
      const r = this.previewHeightData[i]
      const g = this.previewHeightData[i + 1]
      const b = this.previewHeightData[i + 2]
      const alpha = this.previewHeightData[i + 3]

      if (alpha > 0) {
        // 🎯 使用标准亮度公式将RGB转换为灰度
        const luminance = 0.299 * r + 0.587 * g + 0.114 * b
        let normalized = luminance / 255.0

        // 🎯 应用SDF渐变：直接使用SDF距离作为高度（离边缘越远越亮）
        if (gradientAmount > 0 && sdfField) {
          const pixelIdx = i / 4
          const t = sdfField[pixelIdx] // 0-1，0=黑线边缘，1=中心

          // 🎯 根据曲度类型应用不同的映射函数
          let shapedDist = t
          switch (curvature) {
            case 'linear':
              // 线性：直接使用距离值（尖角高峰）
              shapedDist = t
              break
            case 'smooth':
              // 平滑：Smoothstep函数（圆弧高峰）
              // smoothstep(t) = 3t² - 2t³
              shapedDist = t * t * (3 - 2 * t)
              break
            case 'sharp':
              // 尖锐：幂函数（更尖的高峰）
              // t^3 产生更陡峭的边缘
              shapedDist = t * t * t
              break
            case 'round':
              // 圆润：平方根函数（更圆润的高峰）
              // sqrt(t) 产生更平缓的曲线
              shapedDist = Math.sqrt(t)
              break
            case 'parabolic':
              // 抛物线：二次函数（抛物线高峰）
              shapedDist = t * t
              break
            default:
              shapedDist = t * t * (3 - 2 * t)
          }

          // 🎯 混合原始灰度和SDF高度
          // gradientAmount=0: 纯原始灰度
          // gradientAmount=1: 纯SDF高度（离黑线越远越亮）
          normalized = normalized * (1 - gradientAmount) + shapedDist * gradientAmount
        }

        const adjusted = (normalized - midlevel) * strength + midlevel
        const clamped = Math.max(0, Math.min(1, adjusted))
        const gray = Math.round(clamped * 255)

        imgData.data[i] = gray
        imgData.data[i + 1] = gray
        imgData.data[i + 2] = gray
        imgData.data[i + 3] = alpha
      }
    }
  }

  // 渲染 Clipmask 荧光效果
  private renderClipmask(imgData: ImageData, settings: any): void {
    if (!this.previewHeightData) return

    // 荧光颜色配置（默认青色荧光）
    const hue = settings.hue !== undefined ? settings.hue : 180 // 青色
    const saturation = settings.saturation !== undefined ? settings.saturation : 1.0 // 高饱和度
    const brightness = settings.brightness !== undefined ? settings.brightness : 0.8 // 明亮
    const glowIntensity = settings.glowIntensity !== undefined ? settings.glowIntensity : 1.0

    const [r, g, b] = this.hslToRgb(hue, saturation, brightness)

    // 渲染荧光效果
    for (let i = 0; i < this.previewHeightData.length; i += 4) {
      const alpha = this.previewHeightData[i + 3]

      if (alpha > 0) {
        // 使用 alpha 通道作为荧光强度
        const intensity = (alpha / 255) * glowIntensity

        imgData.data[i] = Math.round(r * intensity)
        imgData.data[i + 1] = Math.round(g * intensity)
        imgData.data[i + 2] = Math.round(b * intensity)
        imgData.data[i + 3] = alpha
      } else {
        imgData.data[i] = 0
        imgData.data[i + 1] = 0
        imgData.data[i + 2] = 0
        imgData.data[i + 3] = 0
      }
    }
  }
}

// 全局渲染器实例
export const craftRenderer = new CraftRenderer()
