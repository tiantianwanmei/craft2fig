// ============================================================================
// 🎨 Craft Preview Scene - 工艺预览3D场景
// ============================================================================

import React, { useRef, useEffect, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Mesh } from 'three';
import { useCraftRendererStore } from '../store';

// Props 接口
interface CraftPreviewSceneProps {
  children?: React.ReactNode;
}

// 主组件
export function CraftPreviewScene({ children }: CraftPreviewSceneProps) {
  const meshRef = useRef<Mesh>(null);
  const { material, renderState, updateRenderState } = useCraftRendererStore();

  // FPS 计算
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());

  // 每帧更新
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
      {/* 示例网格 - 使用 PBR 材质 */}
      <mesh ref={meshRef}>
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
      {children}
    </group>
  );
}
