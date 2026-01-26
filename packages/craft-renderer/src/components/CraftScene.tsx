// ============================================================================
// 🎨 Craft Scene - 统一工艺渲染场景组件
// ============================================================================

import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Mesh } from 'three';
import { useCraftRendererStore } from '../store';
import { HDRDomeGround } from './HDRDomeGround';

// Props 接口
interface CraftSceneProps {
  children?: React.ReactNode;
}

// 主组件
export function CraftScene({ children }: CraftSceneProps) {
  const {
    material,
    hdrPreset,
    hdrIntensity,
    hdrDome,
    updateRenderState,
  } = useCraftRendererStore();

  // FPS 计算
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());

  // 每帧更新 FPS
  useFrame(() => {
    frameCount.current++;
    const now = performance.now();
    const delta = now - lastTime.current;

    if (delta >= 1000) {
      const fps = Math.round((frameCount.current * 1000) / delta);
      updateRenderState({ fps });
      frameCount.current = 0;
      lastTime.current = now;
    }
  });

  return (
    <group>
      {/* HDR 环境和穹顶地面 */}
      <HDRDomeGround
        preset={hdrPreset as any}
        intensity={hdrIntensity}
        showBackground={hdrDome.showBackground}
        groundProjection={hdrDome.groundProjection}
        domeHeight={hdrDome.domeHeight}
        domeRadius={hdrDome.domeRadius}
      />

      {/* 示例工艺预览网格 */}
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[2, 2, 0.1]} />
        <meshPhysicalMaterial
          roughness={material.roughness}
          metalness={material.metalness}
          clearcoat={material.clearcoat ?? 0}
          clearcoatRoughness={material.clearcoatRoughness ?? 0}
          transmission={material.transmission ?? 0}
          ior={material.ior ?? 1.5}
        />
      </mesh>

      {/* 用户自定义内容 */}
      {children}
    </group>
  );
}
