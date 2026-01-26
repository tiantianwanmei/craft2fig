// Texture Generators
// Ported from figma-plugin-modern
import { perlin } from './perlinNoise';

export interface AdvancedTextureSettings {
  type: string;
  intensity: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  frequency: number;
  stripeCount: number;
  distortion: number;
  centerX?: number;
  centerY?: number;
}

export interface MetalTextureSettings {
  texture: string;
  intensity: number;
}

// Generate Advanced Texture (Noise, Brushed, etc.)
export function generateAdvancedTexture(
  width: number,
  height: number,
  settings: AdvancedTextureSettings
): Uint8ClampedArray {
  const output = new Uint8ClampedArray(width * height * 4);
  const {
    type = 'none',
    intensity = 0.5,
    scaleX = 1.0,
    scaleY = 1.0,
    rotation = 0,
    frequency = 1.0,
    stripeCount = 10,
    distortion = 0.0,
    centerX = 0.5,
    centerY = 0.5
  } = settings;

  const cx = width * centerX;
  const cy = height * centerY;
  const rad = (rotation * Math.PI) / 180;
  const cosR = Math.cos(rad);
  const sinR = Math.sin(rad);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;

      // Apply rotation and independent scaling
      const dx = x - cx;
      const dy = y - cy;
      const rx = (dx * cosR - dy * sinR) * scaleX + cx;
      const ry = (dx * sinR + dy * cosR) * scaleY + cy;

      let value = 128;

      if (type === 'none' || intensity === 0) {
        value = 128;
      } else if (type === 'matte') {
        const noise = perlin.octaveNoise(rx * frequency * 0.05, ry * frequency * 0.05, 4, 0.5);
        value = 128 + noise * intensity * 127;
      } else if (type === 'brushed-h') {
        const distortNoise = perlin.octaveNoise(rx * 0.01, ry * 0.01, 2, 0.5) * distortion;
        const noise = perlin.octaveNoise(rx * frequency * 0.02, (ry + distortNoise * 50) * frequency * 0.5, 3, 0.5);
        const stripe = Math.sin((ry + distortNoise * 50) * stripeCount * 0.1) * 0.2;
        value = 128 + (noise * 0.8 + stripe * 0.2) * intensity * 127;
      } else if (type === 'brushed-v') {
        const distortNoise = perlin.octaveNoise(rx * 0.01, ry * 0.01, 2, 0.5) * distortion;
        const noise = perlin.octaveNoise((rx + distortNoise * 50) * frequency * 0.5, ry * frequency * 0.02, 3, 0.5);
        const stripe = Math.sin((rx + distortNoise * 50) * stripeCount * 0.1) * 0.2;
        value = 128 + (noise * 0.8 + stripe * 0.2) * intensity * 127;
      } else if (type === 'brushed-radial') {
        const rdx = rx - cx;
        const rdy = ry - cy;
        const angle = Math.atan2(rdy, rdx);
        const dist = Math.sqrt(rdx * rdx + rdy * rdy);
        const radialNoise = perlin.octaveNoise(
          Math.cos(angle) * dist * frequency * 0.02,
          Math.sin(angle) * dist * frequency * 0.02,
          3, 0.5
        );
        const angularNoise = perlin.octaveNoise(angle * 5 * frequency, dist * 0.01, 2, 0.5);
        value = 128 + (radialNoise * 0.7 + angularNoise * 0.3) * intensity * 127;
      } else if (type === 'circular') {
        const rdx = rx - cx;
        const rdy = ry - cy;
        const dist = Math.sqrt(rdx * rdx + rdy * rdy);
        const angle = Math.atan2(rdy, rdx);
        const circularNoise = perlin.octaveNoise(angle * 10 * frequency, dist * frequency * 0.05, 3, 0.5);
        const radialStripe = Math.sin(dist * stripeCount * 0.05) * 0.15;
        value = 128 + (circularNoise * 0.85 + radialStripe * 0.15) * intensity * 127;
      } else if (type === 'noise') {
        const noise = perlin.octaveNoise(rx * frequency * 0.1, ry * frequency * 0.1, 5, 0.6);
        value = 128 + noise * intensity * 127;
      }

      value = Math.max(0, Math.min(255, value));
      output[idx] = value;
      output[idx + 1] = value;
      output[idx + 2] = value;
      output[idx + 3] = 255;
    }
  }

  return output;
}

// Generate Metal Texture (Mirror, Matte, Brushed, Satin)
export function generateMetalTexture(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  settings: MetalTextureSettings
): void {
  const texture = settings.texture;
  const intensity = settings.intensity;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      let value = 128; // Base roughness

      if (texture === 'mirror') {
        value = 30; // Low roughness = high gloss
      } else if (texture === 'matte') {
        // Matte: use Perlin noise for fine grain
        const noise = perlin.octaveNoise(x * 0.1, y * 0.1, 3, 0.5);
        value = 150 + noise * intensity * 100;
      } else if (texture === 'brushed') {
        // Brushed: use Perlin noise + anisotropic filtering
        const scale = 0.05;
        const anisotropy = 20;
        const noise = perlin.octaveNoise(x * scale, y * scale * anisotropy, 4, 0.5);
        const stripe = Math.sin(y * 0.1) * 0.1;
        const combined = (noise * 0.7 + stripe * 0.3) * intensity;
        value = 100 + combined * 100;
      } else if (texture === 'satin') {
        // Satin: use multi-layer Perlin noise
        const noise = perlin.octaveNoise(x * 0.15, y * 0.15, 5, 0.6);
        value = 120 + noise * intensity * 80;
      }

      value = Math.max(0, Math.min(255, value));
      data[idx] = data[idx + 1] = data[idx + 2] = value;
      data[idx + 3] = 255;
    }
  }
}
