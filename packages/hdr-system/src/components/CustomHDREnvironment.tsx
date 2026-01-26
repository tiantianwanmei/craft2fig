// ============================================================================
// CUSTOM HDR ENVIRONMENT - 自定义 HDR 环境（使用 base64）
// ============================================================================
// 不依赖外部 URL，使用从 Figma 加载的 base64 数据

import React, { useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface CustomHDREnvironmentProps {
  /** base64 编码的 HDR 图片数据 */
  hdrData?: string | null;
  /** 环境强度 */
  intensity?: number;
}

export const CustomHDREnvironment: React.FC<CustomHDREnvironmentProps> = ({
  hdrData,
  intensity = 1,
}) => {
  const { scene } = useThree();

  // 创建环境贴图
  const envMap = useMemo(() => {
    if (!hdrData) return null;

    try {
      // 创建纹理加载器
      const loader = new THREE.TextureLoader();
      
      // 从 base64 加载纹理
      const texture = loader.load(hdrData);
      texture.mapping = THREE.EquirectangularReflectionMapping;
      texture.colorSpace = THREE.SRGBColorSpace;
      
      return texture;
    } catch (error) {
      console.error('Failed to load HDR texture:', error);
      return null;
    }
  }, [hdrData]);

  // 应用环境贴图到场景
  React.useEffect(() => {
    if (envMap) {
      scene.environment = envMap;
    }

    return () => {
      if (scene.environment === envMap) {
        scene.environment = null;
      }
    };
  }, [scene, envMap, intensity]);

  return null;
};

/**
 * 简单的渐变环境背景（不需要 HDR 文件）
 */
export const GradientEnvironment: React.FC<{ intensity?: number }> = ({ intensity = 1 }) => {
  const { scene } = useThree();

  React.useEffect(() => {
    // 创建渐变背景
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // 创建径向渐变
      const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
      gradient.addColorStop(0, '#1a1a2e');
      gradient.addColorStop(0.5, '#16213e');
      gradient.addColorStop(1, '#0f0f0f');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 512, 512);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.mapping = THREE.EquirectangularReflectionMapping;
    
    scene.environment = texture;

    return () => {
      scene.environment = null;
      texture.dispose();
    };
  }, [scene, intensity]);

  return null;
};
