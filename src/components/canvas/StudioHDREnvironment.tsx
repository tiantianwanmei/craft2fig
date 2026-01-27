/**
 * 🎨 StudioHDREnvironment - 程序化生成的 Studio HDR 环境
 * 不依赖外部 URL，使用 Canvas 生成高质量反射环境
 */

import React, { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

export interface StudioHDREnvironmentProps {
  /** 环境强度 */
  intensity?: number;
  /** 预设类型 */
  preset?: 'studio' | 'outdoor' | 'sunset' | 'night';
}

/** 预设配置 */
const PRESETS = {
  studio: {
    skyTop: '#f8f8ff',
    skyBottom: '#e0e0e0',
    ground: '#404040',
    lightSpots: [
      { x: 0.3, y: 0.7, radius: 0.15, color: '#ffffff', intensity: 1.0 },
      { x: 0.7, y: 0.7, radius: 0.12, color: '#fff8f0', intensity: 0.8 },
      { x: 0.5, y: 0.85, radius: 0.2, color: '#f0f0ff', intensity: 0.6 },
    ],
  },
  outdoor: {
    skyTop: '#87ceeb',
    skyBottom: '#e0f0ff',
    ground: '#8b7355',
    lightSpots: [
      { x: 0.5, y: 0.9, radius: 0.08, color: '#fffaf0', intensity: 1.5 },
    ],
  },
  sunset: {
    skyTop: '#1a1a2e',
    skyBottom: '#ff7f50',
    ground: '#2d1f1f',
    lightSpots: [
      { x: 0.5, y: 0.3, radius: 0.15, color: '#ff6b35', intensity: 1.2 },
      { x: 0.3, y: 0.5, radius: 0.1, color: '#ffa500', intensity: 0.6 },
    ],
  },
  night: {
    skyTop: '#0a0a1a',
    skyBottom: '#1a1a3a',
    ground: '#0f0f0f',
    lightSpots: [
      { x: 0.5, y: 0.8, radius: 0.05, color: '#e0e0ff', intensity: 0.8 },
      { x: 0.2, y: 0.6, radius: 0.03, color: '#ffffcc', intensity: 0.3 },
      { x: 0.8, y: 0.65, radius: 0.03, color: '#ffffcc', intensity: 0.3 },
    ],
  },
};

/**
 * 生成 Studio HDR 环境贴图
 */
function generateStudioHDR(
  preset: keyof typeof PRESETS,
  size: number = 1024
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size / 2; // 等距柱状投影 2:1
  const ctx = canvas.getContext('2d')!;

  const config = PRESETS[preset];
  const { width, height } = canvas;

  // 1. 绘制天空渐变
  const skyGradient = ctx.createLinearGradient(0, 0, 0, height * 0.6);
  skyGradient.addColorStop(0, config.skyTop);
  skyGradient.addColorStop(1, config.skyBottom);
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, width, height * 0.6);

  // 2. 绘制地面
  const groundGradient = ctx.createLinearGradient(0, height * 0.6, 0, height);
  groundGradient.addColorStop(0, config.skyBottom);
  groundGradient.addColorStop(0.1, config.ground);
  groundGradient.addColorStop(1, config.ground);
  ctx.fillStyle = groundGradient;
  ctx.fillRect(0, height * 0.6, width, height * 0.4);

  // 3. 绘制光源点（关键：产生反射高光）
  for (const spot of config.lightSpots) {
    const cx = spot.x * width;
    const cy = (1 - spot.y) * height;
    const r = spot.radius * Math.min(width, height);

    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    gradient.addColorStop(0, spot.color);
    gradient.addColorStop(0.3, adjustAlpha(spot.color, spot.intensity * 0.8));
    gradient.addColorStop(1, 'transparent');

    ctx.fillStyle = gradient;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  }

  return canvas;
}

/** 调整颜色透明度 */
function adjustAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * 导出：生成 Studio HDR 纹理
 * @param preset - 预设类型
 * @param resolution - 分辨率（默认 1024）
 * @returns THREE.Texture
 */
export function generateStudioHDRTexture(
  preset: keyof typeof PRESETS = 'studio',
  resolution: number = 1024
): THREE.Texture {
  const canvas = generateStudioHDR(preset, resolution);
  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Studio HDR 环境组件
 * 设置 scene.environment 以启用 PBR 材质反射
 */
export const StudioHDREnvironment: React.FC<StudioHDREnvironmentProps> = ({
  intensity = 1,
  preset = 'studio',
}) => {
  const { scene, gl } = useThree();

  // 生成环境贴图
  const envMap = useMemo(() => {
    const canvas = generateStudioHDR(preset, 1024);
    const texture = new THREE.CanvasTexture(canvas);
    texture.mapping = THREE.EquirectangularReflectionMapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }, [preset]);

  // 应用到场景
  useEffect(() => {
    scene.environment = envMap;
    // 设置环境强度（Three.js r155+）
    if ('environmentIntensity' in scene) {
      (scene as any).environmentIntensity = intensity;
    }

    return () => {
      if (scene.environment === envMap) {
        scene.environment = null;
      }
      envMap.dispose();
    };
  }, [scene, envMap, intensity]);

  return null;
};

export default StudioHDREnvironment;
