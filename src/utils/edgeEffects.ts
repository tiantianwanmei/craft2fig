// Edge Effects - 边缘效果处理
// Ported from legacy UI script

// 高斯模糊辅助函数
function gaussianBlur1D(data: Float32Array, width: number, height: number, radius: number): Float32Array {
  const kernelSize = radius * 2 + 1;
  const kernel = new Float32Array(kernelSize);
  const sigma = radius / 3.0;
  let sum = 0;

  for (let i = 0; i < kernelSize; i++) {
    const x = i - radius;
    kernel[i] = Math.exp(-(x * x) / (2 * sigma * sigma));
    sum += kernel[i];
  }

  for (let i = 0; i < kernelSize; i++) {
    kernel[i] /= sum;
  }

  // 水平模糊
  const temp = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let value = 0;
      for (let k = 0; k < kernelSize; k++) {
        const sx = x + k - radius;
        if (sx >= 0 && sx < width) {
          value += data[y * width + sx] * kernel[k];
        }
      }
      temp[y * width + x] = value;
    }
  }

  // 垂直模糊
  const result = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let value = 0;
      for (let k = 0; k < kernelSize; k++) {
        const sy = y + k - radius;
        if (sy >= 0 && sy < height) {
          value += temp[sy * width + x] * kernel[k];
        }
      }
      result[y * width + x] = value;
    }
  }

  return result;
}

// 应用边缘柔和度
export function applyEdgeSoftness(
  imageData: Uint8ClampedArray,
  width: number,
  height: number,
  softness: number
): Uint8ClampedArray {
  const output = new Uint8ClampedArray(imageData);

  if (softness === 0) {
    return output;
  }

  // 将红色通道复制到 Alpha 通道
  for (let i = 0; i < width * height; i++) {
    output[i * 4 + 3] = output[i * 4];
  }

  return applyEdgeEffects(output, width, height, softness, 0);
}

// 应用边缘效果（高斯模糊alpha通道）
export function applyEdgeEffects(
  imageData: Uint8ClampedArray,
  width: number,
  height: number,
  edgeSoftness: number,
  edgeFade: number
): Uint8ClampedArray {
  if (edgeSoftness === 0 && edgeFade === 0) return imageData;

  const output = new Uint8ClampedArray(imageData);

  if (edgeSoftness > 0) {
    const radius = Math.floor(edgeSoftness);
    const alphaChannel = new Float32Array(width * height);

    // 提取alpha通道
    for (let i = 0; i < width * height; i++) {
      alphaChannel[i] = imageData[i * 4 + 3];
    }

    // 模糊alpha通道
    const blurred = gaussianBlur1D(alphaChannel, width, height, radius);

    // 写回alpha通道
    for (let i = 0; i < width * height; i++) {
      output[i * 4 + 3] = Math.min(255, Math.max(0, blurred[i]));
    }
  }

  return output;
}

// 应用高斯模糊到 ImageData
export function applyGaussianBlurToImageData(
  imgData: ImageData,
  width: number,
  height: number,
  radius: number
): void {
  if (radius <= 0) return;

  const r = Math.floor(radius);

  // 对 RGB 三个通道分别应用模糊
  for (let channel = 0; channel < 3; channel++) {
    const channelData = new Float32Array(width * height);

    for (let i = 0; i < width * height; i++) {
      channelData[i] = imgData.data[i * 4 + channel];
    }

    const blurred = gaussianBlur1D(channelData, width, height, r);

    for (let i = 0; i < width * height; i++) {
      imgData.data[i * 4 + channel] = Math.min(255, Math.max(0, blurred[i]));
    }
  }
}

// 应用锐化滤镜
export function applySharpenFilter(
  imgData: ImageData,
  width: number,
  height: number,
  strength: number
): void {
  if (strength <= 0) return;

  const kernel = [
    0, -1, 0,
    -1, 5, -1,
    0, -1, 0
  ];

  const factor = strength;
  const tempData = new Uint8ClampedArray(imgData.data);

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4 + c;
            sum += tempData[idx] * kernel[(ky + 1) * 3 + (kx + 1)];
          }
        }
        const idx = (y * width + x) * 4 + c;
        const original = tempData[idx];
        const sharpened = original + (sum - original) * factor;
        imgData.data[idx] = Math.max(0, Math.min(255, sharpened));
      }
    }
  }
}
