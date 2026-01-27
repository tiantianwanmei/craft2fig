// ============================================================================
// HDR ENVIRONMENT - HDR 环境贴图管理
// ============================================================================
// 支持多个 HDR 预设，可以放置在 public 文件夹中

import React, { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface HDREnvironmentProps {
  preset?: string;
  intensity?: number;
}

/**
 * HDR 环境贴图组件
 * 
 * 支持的预设：
 * - city: 城市环境
 * - sunset: 日落
 * - dawn: 黎明
 * - night: 夜晚
 * - studio: 工作室
 * - warehouse: 仓库
 * - forest: 森林
 * - apartment: 公寓
 */
export const HDREnvironment: React.FC<HDREnvironmentProps> = ({
  preset = 'city',
  intensity = 1,
}) => {
  const { scene, gl } = useThree();

  const sourceTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const presets: Record<string, { top: string; bottom: string; ground: string }> = {
        city: { top: '#87ceeb', bottom: '#dfe9f3', ground: '#4a4a4a' },
        studio: { top: '#f8f8ff', bottom: '#e0e0e0', ground: '#404040' },
        sunset: { top: '#1a1a2e', bottom: '#ff7f50', ground: '#2d1f1f' },
        dawn: { top: '#ffb6c1', bottom: '#fff1e6', ground: '#4a4a5a' },
        night: { top: '#050510', bottom: '#191970', ground: '#0a0a1a' },
        warehouse: { top: '#d3d3d3', bottom: '#bdbdbd', ground: '#696969' },
        forest: { top: '#90ee90', bottom: '#dff7df', ground: '#228b22' },
        apartment: { top: '#fffaf0', bottom: '#f0e6d6', ground: '#8b7355' },
      };
      const p = presets[preset] ?? presets.city;
      const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height * 0.6);
      skyGradient.addColorStop(0, p.top);
      skyGradient.addColorStop(1, p.bottom);
      ctx.fillStyle = skyGradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height * 0.6);

      const groundGradient = ctx.createLinearGradient(0, canvas.height * 0.6, 0, canvas.height);
      groundGradient.addColorStop(0, p.bottom);
      groundGradient.addColorStop(0.1, p.ground);
      groundGradient.addColorStop(1, p.ground);
      ctx.fillStyle = groundGradient;
      ctx.fillRect(0, canvas.height * 0.6, canvas.width, canvas.height * 0.4);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [preset]);

  useEffect(() => {
    const pmremGenerator = new THREE.PMREMGenerator(gl);
    pmremGenerator.compileEquirectangularShader();
    const envRT = pmremGenerator.fromEquirectangular(sourceTexture);
    const envMap = envRT.texture;

    const previousEnv = scene.environment;
    scene.environment = envMap;
    if ('environmentIntensity' in scene) {
      (scene as any).environmentIntensity = intensity;
    }

    return () => {
      scene.environment = previousEnv ?? null;
      envRT.dispose();
      pmremGenerator.dispose();
      sourceTexture.dispose();
    };
  }, [gl, intensity, scene, sourceTexture]);

  return null;
};

/**
 * 可用的 HDR 预设列表
 */
export const HDR_PRESETS = [
  { value: 'city', label: '🏙️ 城市' },
  { value: 'sunset', label: '🌅 日落' },
  { value: 'dawn', label: '🌄 黎明' },
  { value: 'night', label: '🌃 夜晚' },
  { value: 'studio', label: '🎬 工作室' },
  { value: 'warehouse', label: '🏭 仓库' },
  { value: 'forest', label: '🌲 森林' },
  { value: 'apartment', label: '🏠 公寓' },
];
