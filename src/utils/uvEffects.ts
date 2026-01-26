// UV Effects Algorithms
// Ported from legacy UI script

import { generateAdvancedTexture } from './textureGenerator';

// 🎯 金属颗粒噪点生成器（烫金烫银效果）
// 使用高频随机噪点，带双线性插值平滑
function metalGrainNoise(x: number, y: number): number {
  // 高频哈希函数，生成随机颗粒
  const hash = (n: number): number => {
    n = Math.sin(n) * 43758.5453123;
    return n - Math.floor(n);
  };

  // 🎯 双线性插值：平滑采样，消除锯齿
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;

  // 四个角的随机值
  const v00 = hash(xi * 12.9898 + yi * 78.233);
  const v10 = hash((xi + 1) * 12.9898 + yi * 78.233);
  const v01 = hash(xi * 12.9898 + (yi + 1) * 78.233);
  const v11 = hash((xi + 1) * 12.9898 + (yi + 1) * 78.233);

  // 双线性插值
  const v0 = v00 * (1 - xf) + v10 * xf;
  const v1 = v01 * (1 - xf) + v11 * xf;
  return v0 * (1 - yf) + v1 * yf;
}

// 🎯 多层金属颗粒噪点（烫金烫银的细腻质感）
function fractalNoise2D(x: number, y: number, octaves: number = 3): number {
  let value = 0.0;
  let amplitude = 1.0;
  let frequency = 1.0;
  let maxValue = 0.0;

  for (let i = 0; i < octaves; i++) {
    value += metalGrainNoise(x * frequency, y * frequency) * amplitude;
    maxValue += amplitude;
    amplitude *= 0.5;
    frequency *= 2.0;
  }

  return value / maxValue;
}

// UV Settings interface - defines all configurable parameters for UV effects
export interface UVSettings {
  // Fragment effect params
  fragmentSize?: number;
  fragmentVariation?: number;
  fragmentRotation?: number;
  fragmentRadial?: number;
  fragmentTwist?: number;

  // Diamond effect params
  sparkleIntensity?: number;
  sparkleFrequency?: number;
  diamondRotation?: number;
  diamondRadial?: number;
  diamondTwist?: number;

  // Mosaic effect params
  mosaicSize?: number;
  mosaicVariation?: number;
  mosaicRotation?: number;
  mosaicRadial?: number;
  mosaicTwist?: number;

  // Frosted effect params
  frostIntensity?: number;
  frostedRotation?: number;
  frostedRadial?: number;
  frostedTwist?: number;
  frostedRadialRotation?: number;
  frostedNoiseScaleX?: number;
  frostedNoiseScaleY?: number;
  frostedNoiseFrequency?: number;
  frostedPixelSwirl?: number; // 🎯 像素旋转成圆圈效果 (0-100)

  // Concentric effect params
  concentricMode?: 'circle' | 'shape';
  concentricStyle?: 'ring' | 'dot';
  ringSpacing?: number;
  ringCount?: number;
  lineWidth?: number;
  gradient?: number;
  dotSpacing?: number;
  concentricRadial?: number;
  concentricTwist?: number;

  // Mask params (common)
  maskMode?: 'alpha' | 'luminance';
  maskInvert?: boolean;

  // Optional center override (pixel coordinates)
  centerX?: number;
  centerY?: number;
}

// Helper: Get pixel intensity (Alpha or Luminance)
function getPixelIntensity(data: Uint8ClampedArray, i: number, mode: 'alpha' | 'luminance', invert: boolean): number {
  const a = data[i + 3];
  let val = a;
  if (mode === 'luminance') {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // Standard luminance
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    val = (lum * a) / 255;
  }
  if (invert) {
    return 255 - val;
  }
  return val;
}

// Helper: Calculate content-based center from heightData
// NOTE: This is ONLY called once per effect, caching the result
function calculateContentCenter(
  heightData: Uint8ClampedArray,
  width: number,
  height: number,
  maskMode: 'alpha' | 'luminance',
  maskInvert: boolean,
  settingsCx?: number,
  settingsCy?: number
): { cx: number; cy: number } {
  // If both center coordinates are explicitly provided, return immediately
  if (settingsCx !== undefined && settingsCy !== undefined) {
    return { cx: settingsCx, cy: settingsCy };
  }

  // Default to image center
  let cx = settingsCx !== undefined ? settingsCx : (width / 2);
  let cy = settingsCy !== undefined ? settingsCy : (height / 2);

  // Only calculate content bounds if at least one center coordinate is not set
  if (settingsCx === undefined || settingsCy === undefined) {
    let minX = width, maxX = -1, minY = height, maxY = -1;

    // Sample every 4th pixel for performance (still accurate enough for center calculation)
    for (let i = 0; i < heightData.length; i += 16) { // Skip 4 pixels (16 bytes)
      if (getPixelIntensity(heightData, i, maskMode, maskInvert) > 0) {
        const px = (i / 4) % width;
        const py = Math.floor((i / 4) / width);
        if (px < minX) minX = px;
        if (px > maxX) maxX = px;
        if (py < minY) minY = py;
        if (py > maxY) maxY = py;
      }
    }

    // Override with content-based center if valid bounds found
    if (settingsCx === undefined && maxX >= 0) cx = (minX + maxX) / 2;
    if (settingsCy === undefined && maxY >= 0) cy = (minY + maxY) / 2;
  }

  return { cx, cy };
}

// 💎 Fragment UV (Car Paint Effect) - Using Voronoi-like noise
export function applyFragmentUV(imgData: ImageData, heightData: Uint8ClampedArray, width: number, height: number, intensity: number, settings: UVSettings): void {
  const fragmentSize = settings.fragmentSize || 8;
  const variation = settings.fragmentVariation || 60;
  // 🔥 Advanced params
  const rotation = (settings.fragmentRotation || 0) * Math.PI / 180;
  const radial = (settings.fragmentRadial || 0) / 10;
  const twist = (settings.fragmentTwist || 0) * Math.PI / 180;

  const maskMode = settings.maskMode || 'alpha';
  const maskInvert = settings.maskInvert || false;

  const { cx, cy } = calculateContentCenter(heightData, width, height, maskMode, maskInvert, settings.centerX, settings.centerY);
  const maxDist = Math.max(cx, cy);

  for (let i = 0; i < heightData.length; i += 4) {
    const alpha = getPixelIntensity(heightData, i, maskMode, maskInvert);
    if (alpha > 0) {
      let x = (i / 4) % width;
      let y = Math.floor((i / 4) / width);

      // Apply Rotation
      if (rotation !== 0) {
        const dx = x - cx;
        const dy = y - cy;
        x = cx + dx * Math.cos(rotation) - dy * Math.sin(rotation);
        y = cy + dx * Math.sin(rotation) + dy * Math.cos(rotation);
      }

      // Apply Radial Distortion (Exponential Scaling)
      if (radial !== 0) {
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);

        const normDist = dist / maxDist;
        const exponent = Math.pow(2, -radial);

        const safeNormDist = Math.min(1, Math.max(0.0001, normDist));
        const newDist = Math.pow(safeNormDist, exponent) * maxDist;

        const angle = Math.atan2(dy, dx);
        x = cx + newDist * Math.cos(angle);
        y = cy + newDist * Math.sin(angle);
      }

      // Apply Twist Distortion
      if (twist !== 0) {
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);

        const angle = Math.atan2(dy, dx);
        const distortion = Math.sin(angle * 3 + dist * 0.02) * twist * 20;

        const newDist = dist + distortion;
        x = cx + newDist * Math.cos(angle);
        y = cy + newDist * Math.sin(angle);
      }

      const fx = Math.floor(x / fragmentSize);
      const fy = Math.floor(y / fragmentSize);
      const hash = (fx * 73856093) ^ (fy * 19349663);
      const noise = ((hash % 256) / 255.0 - 0.5) * variation;
      const fragment = Math.max(0, Math.min(255, intensity + noise));
      imgData.data[i] = fragment;
      imgData.data[i + 1] = fragment;
      imgData.data[i + 2] = fragment;
      imgData.data[i + 3] = alpha;
    }
  }
}

// 💠 Diamond UV Effect - Multi-layer sparkle
export function applyDiamondUV(imgData: ImageData, heightData: Uint8ClampedArray, width: number, height: number, intensity: number, settings: UVSettings): void {
  const sparkleIntensity = settings.sparkleIntensity || 40;
  const sparkleFrequency = settings.sparkleFrequency || 0.5;
  // 🔥 Advanced params
  const rotation = (settings.diamondRotation || 0) * Math.PI / 180;
  const radial = (settings.diamondRadial || 0) / 10;
  const twist = (settings.diamondTwist || 0) * Math.PI / 180;

  const maskMode = settings.maskMode || 'alpha';
  const maskInvert = settings.maskInvert || false;

  const { cx, cy } = calculateContentCenter(heightData, width, height, maskMode, maskInvert, settings.centerX, settings.centerY);
  const maxDist = Math.max(cx, cy);

  for (let i = 0; i < heightData.length; i += 4) {
    const alpha = getPixelIntensity(heightData, i, maskMode, maskInvert);
    if (alpha > 0) {
      let x = (i / 4) % width;
      let y = Math.floor((i / 4) / width);

      // Apply Rotation
      if (rotation !== 0) {
        const dx = x - cx;
        const dy = y - cy;
        x = cx + dx * Math.cos(rotation) - dy * Math.sin(rotation);
        y = cy + dx * Math.sin(rotation) + dy * Math.cos(rotation);
      }

      // Apply Radial Distortion
      if (radial !== 0) {
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        const normDist = dist / maxDist;
        const exponent = Math.pow(2, -radial);
        
        const safeNormDist = Math.min(1, Math.max(0.0001, normDist));
        const newDist = Math.pow(safeNormDist, exponent) * maxDist;

        const angle = Math.atan2(dy, dx);
        x = cx + newDist * Math.cos(angle);
        y = cy + newDist * Math.sin(angle);
      }

      // Apply Twist Distortion
      if (twist !== 0) {
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        const angle = Math.atan2(dy, dx);
        const distortion = Math.sin(angle * 3 + dist * 0.02) * twist * 20;
        
        const newDist = dist + distortion;
        x = cx + newDist * Math.cos(angle);
        y = cy + newDist * Math.sin(angle);
      }

      const sparkle1 = Math.sin(x * sparkleFrequency * 0.6) * Math.cos(y * sparkleFrequency * 0.6);
      const sparkle2 = Math.sin(x * sparkleFrequency * 1.4 + 1.5) * Math.cos(y * sparkleFrequency * 1.4 + 1.5);
      const sparkle = (sparkle1 + sparkle2) * sparkleIntensity;
      const diamond = Math.max(0, Math.min(255, intensity + sparkle));
      imgData.data[i] = diamond;
      imgData.data[i + 1] = diamond;
      imgData.data[i + 2] = diamond;
      imgData.data[i + 3] = alpha;
    }
  }
}

// 🔷 Mosaic UV Effect - Fractal mosaic
export function applyMosaicUV(imgData: ImageData, heightData: Uint8ClampedArray, width: number, height: number, intensity: number, settings: UVSettings): void {
  const mosaicSize = settings.mosaicSize || 6;
  const variation = settings.mosaicVariation || 80;
  // 🔥 Advanced params
  const rotation = (settings.mosaicRotation || 0) * Math.PI / 180;
  const radial = (settings.mosaicRadial || 0) / 10;
  const twist = (settings.mosaicTwist || 0) * Math.PI / 180;

  const maskMode = settings.maskMode || 'alpha';
  const maskInvert = settings.maskInvert || false;

  const { cx, cy } = calculateContentCenter(heightData, width, height, maskMode, maskInvert, settings.centerX, settings.centerY);
  const maxDist = Math.max(cx, cy);

  for (let i = 0; i < heightData.length; i += 4) {
    const alpha = getPixelIntensity(heightData, i, maskMode, maskInvert);
    if (alpha > 0) {
      let x = (i / 4) % width;
      let y = Math.floor((i / 4) / width);

      // Apply Rotation
      if (rotation !== 0) {
        const dx = x - cx;
        const dy = y - cy;
        x = cx + dx * Math.cos(rotation) - dy * Math.sin(rotation);
        y = cy + dx * Math.sin(rotation) + dy * Math.cos(rotation);
      }

      // Apply Radial Distortion
      if (radial !== 0) {
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        const normDist = dist / maxDist;
        const exponent = Math.pow(2, -radial);
        
        const safeNormDist = Math.min(1, Math.max(0.0001, normDist));
        const newDist = Math.pow(safeNormDist, exponent) * maxDist;

        const angle = Math.atan2(dy, dx);
        x = cx + newDist * Math.cos(angle);
        y = cy + newDist * Math.sin(angle);
      }

      // Apply Twist Distortion
      if (twist !== 0) {
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        const angle = Math.atan2(dy, dx);
        const distortion = Math.sin(angle * 3 + dist * 0.02) * twist * 20;
        
        const newDist = dist + distortion;
        x = cx + newDist * Math.cos(angle);
        y = cy + newDist * Math.sin(angle);
      }

      const mx = Math.floor(x / mosaicSize);
      const my = Math.floor(y / mosaicSize);
      const hash = (mx * 2654435761) ^ (my * 2246822519);
      const noise = ((hash % 256) / 255.0 - 0.5) * variation;
      const mosaic = Math.max(0, Math.min(255, intensity + noise));
      imgData.data[i] = mosaic;
      imgData.data[i + 1] = mosaic;
      imgData.data[i + 2] = mosaic;
      imgData.data[i + 3] = alpha;
    }
  }
}

// ❄️ Frosted UV Effect - Advanced parameters
export function applyFrostedUV(imgData: ImageData, heightData: Uint8ClampedArray, width: number, height: number, intensity: number, settings: UVSettings): void {
  const frostIntensity = settings.frostIntensity || 30;
  // 🔥 Advanced params
  const rotation = (settings.frostedRotation || 0) * Math.PI / 180;
  const radial = (settings.frostedRadial || 0) / 10;
  const twist = (settings.frostedTwist || 0) * Math.PI / 180;
  // 🎯 Radial Rotation: 50=无旋转，0-50=逆时针，50-100=顺时针（圆环拉丝效果）
  const radialRotation = ((settings.frostedRadialRotation || 50) - 50) / 50; // 0-100 → -1 to 1 (50=0)

  // 🎯 像素旋转成圆圈效果 (0-100)
  const pixelSwirl = (settings.frostedPixelSwirl || 0) / 100; // 0-100 → 0-1

  // 🎯 XY独立调节参数 - 直接控制噪点尺寸（值越大，噪点越密集）
  const noiseScaleX = (settings.frostedNoiseScaleX || 50) / 5; // 0-100 → 0-20
  const noiseScaleY = (settings.frostedNoiseScaleY || 50) / 5; // 0-100 → 0-20
  const noiseFrequency = (settings.frostedNoiseFrequency || 50) / 50; // 0-100 → 0-2

  const maskMode = settings.maskMode || 'alpha';
  const maskInvert = settings.maskInvert || false;

  const { cx, cy } = calculateContentCenter(heightData, width, height, maskMode, maskInvert, settings.centerX, settings.centerY);
  const maxDist = Math.max(cx, cy);

  // 🎯 算法改进：先生成噪点纹理，然后用极坐标UV采样（支持先模糊后拉伸）
  // Step 1: 生成基础噪点纹理
  const noiseTexture = new Float32Array(width * height);
  const grainScale = 10.0 + frostIntensity * 2.0;

  for (let ty = 0; ty < height; ty++) {
    for (let tx = 0; tx < width; tx++) {
      const idx = ty * width + tx;

      // 🎯 计算极坐标
      let sampleDist = Math.sqrt((tx - cx) * (tx - cx) + (ty - cy) * (ty - cy));
      let angle = Math.atan2(ty - cy, tx - cx);

      // 🎯 风车旋转效果：沿切线方向旋转（CD拉丝效果）
      if (radialRotation !== 0 && sampleDist > 0.1) {
        const normalizedDist = sampleDist / maxDist;
        angle += radialRotation * normalizedDist * Math.PI * 4;
      }

      // 🎯 同心圆拉伸效果：直接在噪点采样的半径上做拉伸
      if (pixelSwirl > 0 && sampleDist > 0.1) {
        const normalizedDist = sampleDist / maxDist;
        const stretchFactor = 1.0 + normalizedDist * pixelSwirl * 100.0;
        sampleDist = sampleDist * stretchFactor;
      }

      // 🎯 XY独立控制：X控制角度方向密度，Y控制半径方向密度
      // 角度方向：0-2π映射到噪点空间
      // 半径方向：0-maxDist映射到噪点空间
      const angleCoord = angle * noiseScaleX * noiseFrequency * 0.1;
      const radiusCoord = sampleDist * noiseScaleY * noiseFrequency * 0.1;

      const noiseValue = fractalNoise2D(angleCoord, radiusCoord, 3);
      noiseTexture[idx] = noiseValue;
    }
  }

  for (let i = 0; i < heightData.length; i += 4) {
    const alpha = getPixelIntensity(heightData, i, maskMode, maskInvert);
    if (alpha > 0) {
      let x = (i / 4) % width;
      let y = Math.floor((i / 4) / width);

      // Apply Rotation
      if (rotation !== 0) {
        const dx = x - cx;
        const dy = y - cy;
        x = cx + dx * Math.cos(rotation) - dy * Math.sin(rotation);
        y = cy + dx * Math.sin(rotation) + dy * Math.cos(rotation);
      }

      // Apply Radial Distortion
      if (radial !== 0) {
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        const normDist = dist / maxDist;
        const exponent = Math.pow(2, -radial);
        
        const safeNormDist = Math.min(1, Math.max(0.0001, normDist));
        const newDist = Math.pow(safeNormDist, exponent) * maxDist;

        const angle = Math.atan2(dy, dx);
        x = cx + newDist * Math.cos(angle);
        y = cy + newDist * Math.sin(angle);
      }

      // Apply Twist Distortion
      if (twist !== 0) {
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        const angle = Math.atan2(dy, dx);
        const distortion = Math.sin(angle * 3 + dist * 0.02) * twist * 20;
        
        const newDist = dist + distortion;
        x = cx + newDist * Math.cos(angle);
        y = cy + newDist * Math.sin(angle);
      }

      // 🎯 Apply Radial Rotation Stretch (CD表面同心圆拉丝效果)
      // 核心：用极坐标UV采样预生成的噪点纹理（支持先模糊后拉伸）
      let finalValue = intensity;
      if (radialRotation !== 0) {
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0.1) {
          const angle = Math.atan2(dy, dx); // -π to π
          const normalizedDist = Math.min(1, dist / maxDist); // 0-1

          // 🎯 极坐标UV映射
          const polarU = (angle + Math.PI) / (2 * Math.PI); // 0-1
          const polarV = normalizedDist; // 0-1

          // 🎯 拉伸控制
          const stretchFactor = 100.0 * Math.abs(radialRotation);
          let stretchedU = polarU * stretchFactor;

          // 🎯 旋转偏移
          if (radialRotation > 0) {
            stretchedU += polarV * 2.0;
          } else {
            stretchedU -= polarV * 2.0;
          }

          // 🎯 将拉伸后的UV映射回纹理坐标进行采样
          const wrappedU = stretchedU - Math.floor(stretchedU); // 0-1 循环
          const sampledX = wrappedU * width;
          const sampledY = polarV * height;

          // 🎯 双线性插值采样纹理
          const fx = Math.max(0, Math.min(width - 1.001, sampledX));
          const fy = Math.max(0, Math.min(height - 1.001, sampledY));
          const x0 = Math.floor(fx);
          const y0 = Math.floor(fy);
          const x1 = Math.min(width - 1, x0 + 1);
          const y1 = Math.min(height - 1, y0 + 1);
          const wx = fx - x0;
          const wy = fy - y0;

          const v00 = noiseTexture[y0 * width + x0];
          const v01 = noiseTexture[y0 * width + x1];
          const v10 = noiseTexture[y1 * width + x0];
          const v11 = noiseTexture[y1 * width + x1];

          const v0 = v00 * (1 - wx) + v01 * wx;
          const v1 = v10 * (1 - wx) + v11 * wx;
          const noiseValue = v0 * (1 - wy) + v1 * wy;

          // 🔥 大幅增加对比度
          const variation = (noiseValue - 0.5) * frostIntensity * 4.0;
          finalValue = Math.max(0, Math.min(255, intensity + variation));
        } else {
          // 中心区域直接采样
          const tx = Math.floor(Math.max(0, Math.min(width - 1, x)));
          const ty = Math.floor(Math.max(0, Math.min(height - 1, y)));
          const noiseValue = noiseTexture[ty * width + tx];
          const variation = (noiseValue - 0.5) * frostIntensity * 4.0;
          finalValue = Math.max(0, Math.min(255, intensity + variation));
        }
      } else {
        // 无拉伸时直接采样
        const tx = Math.floor(Math.max(0, Math.min(width - 1, x)));
        const ty = Math.floor(Math.max(0, Math.min(height - 1, y)));
        const noiseValue = noiseTexture[ty * width + tx];
        const variation = (noiseValue - 0.5) * frostIntensity * 4.0;
        finalValue = Math.max(0, Math.min(255, intensity + variation));
      }

      imgData.data[i] = finalValue;
      imgData.data[i + 1] = finalValue;
      imgData.data[i + 2] = finalValue;
      imgData.data[i + 3] = alpha;
    }
  }
}

// ⭕ Concentric UV Effect - Shape mode and Radial distortion
export function applyConcentricUV(imgData: ImageData, heightData: Uint8ClampedArray, width: number, height: number, intensity: number, settings: UVSettings): void {
  const mode = settings.concentricMode || 'circle';
  const style = settings.concentricStyle || 'ring';
  let ringSpacing = settings.ringSpacing || 20;
  const ringCount = settings.ringCount || 10;
  const lineWidth = settings.lineWidth || 3;
  const gradient = settings.gradient || 50;
  const dotSpacing = settings.dotSpacing || 15;

  // Match legacy scaling:
  // radial: UI -100..100 -> /10 gives approx -10..10 (extreme effects allowed)
  const radial = (settings.concentricRadial || 0) / 10;
  const twist = (settings.concentricTwist || 0) * Math.PI / 180;

  let distMap = new Float32Array(width * height);
  let maxDist = 0;
  let cx = settings.centerX !== undefined ? settings.centerX : (width / 2);
  let cy = settings.centerY !== undefined ? settings.centerY : (height / 2);

  // 1. Calculate Distance Field
  if (mode === 'shape') {
    // --- Shape-based (SDF) ---
    const INF = 1e9;
    const maskMode = settings.maskMode || 'alpha';
    const maskInvert = settings.maskInvert || false;
    
    // Init
    for (let i = 0; i < width * height; i++) {
      const alpha = getPixelIntensity(heightData, i * 4, maskMode, maskInvert);
      distMap[i] = alpha > 10 ? INF : 0;
    }

    // 1st Pass (Top-Left to Bottom-Right)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        if (distMap[idx] === 0) continue;
        
        let d = distMap[idx];
        if (x > 0) d = Math.min(d, distMap[idx - 1] + 1);
        if (y > 0) d = Math.min(d, distMap[idx - width] + 1);
        if (x > 0 && y > 0) d = Math.min(d, distMap[idx - width - 1] + 1.414);
        if (x < width - 1 && y > 0) d = Math.min(d, distMap[idx - width + 1] + 1.414);
        
        distMap[idx] = d;
      }
    }

    // 2nd Pass (Bottom-Right to Top-Left)
    for (let y = height - 1; y >= 0; y--) {
      for (let x = width - 1; x >= 0; x--) {
        const idx = y * width + x;
        if (distMap[idx] === 0) continue;

        let d = distMap[idx];
        if (x < width - 1) d = Math.min(d, distMap[idx + 1] + 1);
        if (y < height - 1) d = Math.min(d, distMap[idx + width] + 1);
        if (x < width - 1 && y < height - 1) d = Math.min(d, distMap[idx + width + 1] + 1.414);
        if (x > 0 && y < height - 1) d = Math.min(d, distMap[idx + width - 1] + 1.414);
        
        distMap[idx] = d;
        if (d < INF && d > maxDist) maxDist = d;
      }
    }
  } else {
    // --- Circle-based ---
    let minX = width, maxX = 0, minY = height, maxY = 0;
    let hasContent = false;
    const maskMode = settings.maskMode || 'alpha';
    const maskInvert = settings.maskInvert || false;

    // If center override is provided, we still need bounds for maxDist and circle sizing.
    // We prefer mask bounds but allow fallback to full frame.
    for (let i = 0; i < heightData.length; i += 4) {
      if (getPixelIntensity(heightData, i, maskMode, maskInvert) > 0) {
        const x = (i / 4) % width;
        const y = Math.floor((i / 4) / width);
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
        hasContent = true;
      }
    }
    if (!hasContent) {
      minX = 0;
      minY = 0;
      maxX = width - 1;
      maxY = height - 1;
    }

    if (settings.centerX === undefined) cx = (minX + maxX) / 2;
    if (settings.centerY === undefined) cy = (minY + maxY) / 2;

    maxDist = Math.sqrt(Math.max(
      (cx - minX) ** 2 + (cy - minY) ** 2,
      (cx - maxX) ** 2 + (cy - maxY) ** 2,
      (cx - minX) ** 2 + (cy - maxY) ** 2,
      (cx - maxX) ** 2 + (cy - minY) ** 2
    ));

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dx = x - cx;
        const dy = y - cy;
        distMap[y * width + x] = Math.sqrt(dx * dx + dy * dy);
      }
    }
  }

  // Legacy priority: ringCount overwrites ringSpacing when maxDist is valid
  if (maxDist > 0 && ringCount > 0) {
    ringSpacing = maxDist / ringCount;
  }

  // 2. Render
  const maskMode = settings.maskMode || 'alpha';
  const maskInvert = settings.maskInvert || false;
  
  for (let i = 0; i < heightData.length; i += 4) {
    const alpha = getPixelIntensity(heightData, i, maskMode, maskInvert);
    if (alpha > 0) {
      const idx = i / 4;
      let dist = distMap[idx];

      // Apply Radial Distortion
      if (radial !== 0 && maxDist > 0) {
        let normDist = dist / maxDist;
        let t = normDist;
        let exponent = 1.0;
        
        if (mode === 'shape') {
          // Shape: 0=Edge, 1=Center
          // Positive radial -> center magnify
          exponent = Math.pow(2, -radial);
        } else {
          // Circle: 0=Center, 1=Edge
          exponent = Math.pow(2, radial);
        }

        const safeNormDist = Math.min(1, Math.max(1e-4, normDist));
        t = Math.pow(safeNormDist, exponent);
        dist = t * maxDist;
      }

      // Apply Twist Distortion
      if (twist !== 0) {
        const x = (i / 4) % width;
        const y = Math.floor((i / 4) / width);
        const dx = x - cx;
        const dy = y - cy;
        const angle = Math.atan2(dy, dx);
        
        const distortion = Math.sin(angle * 3 + dist * 0.02) * twist * 20;
        dist += distortion;
      }

      let value = 0;
      
      if (style === 'ring') {
        // --- Ring Style ---
        const ringPos = dist % ringSpacing;
        let distToLine = ringPos;
        if (ringPos > ringSpacing / 2) distToLine = ringSpacing - ringPos;
        
        if (distToLine < lineWidth / 2) {
          const edgeDist = lineWidth / 2 - distToLine;
          const antiAlias = Math.min(1.0, edgeDist);
          
          const centerFactor = 1 - (distToLine / (lineWidth / 2));
          const gradientFactor = gradient / 100;
          const brightness = 1 - (1 - centerFactor) * gradientFactor;
          
          value = Math.max(0, Math.min(255, intensity * brightness * antiAlias));
        }
      } else {
        // --- Dot Style ---
        const ringPos = dist % ringSpacing;
        let distToLine = ringPos;
        if (ringPos > ringSpacing / 2) distToLine = ringSpacing - ringPos;

        if (distToLine < lineWidth / 2) {
          let cut = false;
          if (mode === 'circle') {
            const x = (i / 4) % width;
            const y = Math.floor((i / 4) / width);
            const dx = x - cx;
            const dy = y - cy;
            const angle = Math.atan2(dy, dx);
            const circumference = 2 * Math.PI * dist;
            const dotsCount = Math.floor(circumference / dotSpacing);
            
            if (dotsCount > 0) {
              let angleNorm = (angle + Math.PI) / (2 * Math.PI); // 0-1
              let dotPos = (angleNorm * dotsCount) % 1;
              if (Math.abs(dotPos - 0.5) > 0.25) cut = true;
            }
          } else {
            const x = (i / 4) % width;
            const y = Math.floor((i / 4) / width);
            if (((x + y) % dotSpacing) < dotSpacing / 2) cut = true;
          }
          
          if (!cut) value = intensity;
        }
      }

      imgData.data[i] = value;
      imgData.data[i + 1] = value;
      imgData.data[i + 2] = value;
      imgData.data[i + 3] = alpha;
    }
  }
}