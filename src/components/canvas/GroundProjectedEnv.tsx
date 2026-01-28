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
  anchorRef?: React.MutableRefObject<THREE.Vector3 | null>;
  exposure?: number;
}

export const GroundProjectedEnv: React.FC<GroundProjectedEnvProps> = ({
  texture,
  height = 1600,
  radius = 10000,
  scale = 1000,
  groundY = 0,
  anchorRef,
  exposure: _exposure = 1.0,
}) => {
  if (!texture) return null;

  const { camera, scene } = useThree();

  const [dynamicScale, setDynamicScale] = useState(scale);
  const baseScale = scale;
  const safeRadius = Math.max(1, radius, height * 1.05);

  const tempAnchorRef = useMemo(() => new THREE.Vector3(), []);
  const tempVirtualCamRef = useMemo(() => new THREE.Vector3(), []);

  // 修复：当外部 scale prop 变化时（例如从 1000 变为 5000），更新 dynamicScale
  useEffect(() => {
    setDynamicScale(scale);
  }, [scale]);

  void _exposure;
  texture.mapping = THREE.EquirectangularReflectionMapping;

  const skybox = useMemo(() => {
    const sky = new GroundProjectedSkybox(texture, { height, radius: safeRadius });
    sky.frustumCulled = false;
    sky.renderOrder = -1500;
    const mat = sky.material as THREE.ShaderMaterial;
    mat.depthTest = false;
    mat.depthWrite = false;
    return sky;
  }, [texture, height, safeRadius]);

  useFrame(() => {
    const camDist = camera.position.length();
    const far = (camera as THREE.PerspectiveCamera).far ?? 50000;
    const desired = Math.max(baseScale, camDist * 4);
    const cappedDesired = Math.min(desired, Math.max(baseScale, far * 0.95));
    if (cappedDesired <= 0) return;

    const rel = Math.abs(cappedDesired - dynamicScale) / Math.max(1, dynamicScale);
    if (rel > 0.15) setDynamicScale(cappedDesired);

    const anchor = anchorRef?.current;
    const ax = anchor ? anchor.x : 0;
    const az = anchor ? anchor.z : 0;
    const anchorY = groundY + height;
    skybox.position.set(ax, anchorY, az);
    tempAnchorRef.set(ax, anchorY, az);
    skybox.center = tempAnchorRef;

    // 关键：XZ 锚定到 orbit pivot，Y 使用真实相机高度。
    // 这样可以避免 orbit 绕圈时投影基准漂移，同时避免把相机“锁死在球心”导致采样退化（黑/纯色地面）。
    tempVirtualCamRef.set(ax, camera.position.y, az);
    skybox.virtualCameraPosition = tempVirtualCamRef;
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
    skybox.radius = safeRadius;
  }, [height, safeRadius, skybox]);

  useEffect(() => {
    skybox.scale.setScalar(dynamicScale);
  }, [dynamicScale, skybox]);

  return null;
};
