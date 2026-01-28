import React, { useState, useEffect } from 'react';
import * as THREE from 'three';
import { Environment } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';

interface GroundProjectedEnvProps {
  texture: THREE.Texture | null;
  height?: number;
  radius?: number;
  scale?: number;
  exposure?: number;
}

export const GroundProjectedEnv: React.FC<GroundProjectedEnvProps> = ({
  texture,
  height = 1600,
  radius = 10000,
  scale = 1000,
  exposure: _exposure = 1.0,
}) => {
  if (!texture) return null;

  const { camera } = useThree();

  const [dynamicScale, setDynamicScale] = useState(scale);
  const baseScale = scale;

  // 修复：当外部 scale prop 变化时（例如从 1000 变为 5000），更新 dynamicScale
  useEffect(() => {
    setDynamicScale(scale);
  }, [scale]);

  useFrame(() => {
    const far = (camera as THREE.PerspectiveCamera).far ?? 50000;
    const camDist = camera.position.length();
    const desired = Math.max(baseScale, camDist * 4, far * 0.9);
    if (desired <= 0) return;

    const rel = Math.abs(desired - dynamicScale) / Math.max(1, dynamicScale);
    if (rel > 0.15) setDynamicScale(desired);
  });

  void _exposure;
  texture.mapping = THREE.EquirectangularReflectionMapping;

  return (
    <Environment
      map={texture}
      background
      ground={{
        height,
        radius,
        scale: dynamicScale,
      }}
    />
  );
};
