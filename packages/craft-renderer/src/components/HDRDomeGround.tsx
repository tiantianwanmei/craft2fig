// ============================================================================
// 🌐 HDR Dome Ground - HDR 穹顶地面投影组件
// 使用 drei Environment 的 ground 属性实现 HDR 地面投影
// ============================================================================

import { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

// HDR 预设列表
export const HDR_PRESETS = [
  { value: 'city', label: '城市' },
  { value: 'studio', label: '影棚' },
  { value: 'sunset', label: '日落' },
  { value: 'dawn', label: '黎明' },
  { value: 'night', label: '夜晚' },
  { value: 'warehouse', label: '仓库' },
  { value: 'forest', label: '森林' },
  { value: 'apartment', label: '公寓' },
] as const;

export type HDRPreset = typeof HDR_PRESETS[number]['value'];

// 组件 Props
interface HDRDomeGroundProps {
  preset?: HDRPreset;
  intensity?: number;
  showBackground?: boolean;
  groundProjection?: boolean;
  domeHeight?: number;    // height: 环境贴图相机高度
  domeRadius?: number;    // radius: 虚拟世界半径
  domeScale?: number;     // scale: 投影球体大小（关键参数，要足够大避免穿帮）
}

// HDR 穹顶地面组件
export function HDRDomeGround({
  preset = 'studio',
  intensity = 1,
  showBackground = true,
  groundProjection = true,
  domeHeight = 15,       // 环境贴图相机高度（drei 默认 15）
  domeRadius = 120,      // 虚拟世界半径（drei 默认 60，增大一倍避免边界）
  domeScale = 1000,      // 投影球体大小（drei 默认 1000）
}: HDRDomeGroundProps) {
  const { scene, gl } = useThree();

  // 说明：此包的目标是“稳定、无外部资源请求”。
  // groundProjection 参数在 craft-renderer 内部不做 drei ground 投影（会触发 cubemap faces 请求），因此作为 no-op 保留接口兼容。
  void groundProjection;
  void domeHeight;
  void domeRadius;
  void domeScale;

  const sourceTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

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
    const p = presets[preset] ?? presets.studio;

    if (ctx) {
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

  if (!showBackground) return null;

  return (
    <mesh scale={[-1, 1, 1]}>
      <sphereGeometry args={[500, 64, 32]} />
      <meshBasicMaterial map={sourceTexture} side={THREE.BackSide} toneMapped={false} />
    </mesh>
  );
}
