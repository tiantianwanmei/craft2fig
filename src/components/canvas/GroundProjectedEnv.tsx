import React, { useState, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { GroundProjectedSkybox } from './GroundProjectedSkybox';

interface GroundProjectedEnvProps {
  texture: THREE.Texture | null;
  height?: number;
  radius?: number;
  scale?: number;
  groundY?: number;
  exposure?: number;
}

export const GroundProjectedEnv: React.FC<GroundProjectedEnvProps> = ({
  texture,
  height = 1600,
  radius = 10000,
  scale = 1000,
  groundY = 0,
  exposure: _exposure = 1.0,
}) => {
  if (!texture) return null;

  const { camera, scene } = useThree();

  const [dynamicScale, setDynamicScale] = useState(scale);
  const baseScale = scale;

  // 修复：当外部 scale prop 变化时（例如从 1000 变为 5000），更新 dynamicScale
  useEffect(() => {
    setDynamicScale(scale);
  }, [scale]);

  void _exposure;
  texture.mapping = THREE.EquirectangularReflectionMapping;

  const skybox = useMemo(() => {
    const sky = new GroundProjectedSkybox(texture, { height, radius });
    sky.frustumCulled = false;
    sky.renderOrder = -1500;
    const mat = sky.material as THREE.ShaderMaterial;
    mat.depthTest = false;
    mat.depthWrite = false;
    return sky;
  }, [texture, height, radius]);

  useFrame(() => {
    const camDist = camera.position.length();
    const desired = Math.max(baseScale, camDist * 4);
    if (desired <= 0) return;

    const rel = Math.abs(desired - dynamicScale) / Math.max(1, dynamicScale);
    if (rel > 0.15) setDynamicScale(desired);

    skybox.position.x = camera.position.x;
    skybox.position.y = groundY;
    skybox.position.z = camera.position.z;
  });

  useEffect(() => {
    scene.add(skybox);
    return () => {
      scene.remove(skybox);
      if ('geometry' in skybox && (skybox as any).geometry?.dispose) (skybox as any).geometry.dispose();
      if ('material' in skybox) {
        const m = (skybox as any).material;
        if (Array.isArray(m)) m.forEach((mm) => mm?.dispose?.());
        else m?.dispose?.();
      }
    };
  }, [scene, skybox]);

  useEffect(() => {
    skybox.height = height;
    skybox.radius = radius;
  }, [height, radius, skybox]);

  useEffect(() => {
    skybox.scale.setScalar(dynamicScale);
  }, [dynamicScale, skybox]);

  return null;
};
