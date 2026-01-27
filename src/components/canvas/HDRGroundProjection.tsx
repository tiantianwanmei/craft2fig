import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { GroundProjectedEnv } from 'three-stdlib';
import { useFrame, useThree } from '@react-three/fiber';

interface HDRGroundProjectionProps {
  texture: THREE.Texture | null;
  height: number;
  radius: number;
  scale?: number;
}

/**
 * 直接使用 three-stdlib 的 GroundProjectedEnv，彻底绕开 drei Environment
 * 对默认立方体贴图 (/px.png 等) 的请求，避免报错。
 */
export const HDRGroundProjection: React.FC<HDRGroundProjectionProps> = ({
  texture,
  height,
  radius,
  scale = 5000,
}) => {
  const { camera } = useThree();

  const ground = useMemo(() => {
    if (!texture) return null;
    texture.mapping = THREE.EquirectangularReflectionMapping;
    const env = new GroundProjectedEnv(texture);
    env.frustumCulled = false;
    return env;
  }, [texture]);

  const paramsRef = useRef({ height, radius, scale });
  useEffect(() => {
    paramsRef.current = { height, radius, scale };
  }, [height, radius, scale]);

  useEffect(() => {
    return () => {
      if (ground) {
        (ground as any).geometry?.dispose?.();
        (ground as any).material?.dispose?.();
      }
    };
  }, [ground]);

  useFrame(() => {
    if (!ground) return;
    const { height: h, radius: r, scale: s } = paramsRef.current;
    if (Math.abs(ground.height - h) > 0.5) ground.height = Math.max(1, h);
    if (Math.abs(ground.radius - r) > 0.5) ground.radius = Math.max(10, r);
    const safeScale = Math.max(1000, s);
    if (Math.abs(ground.scale.x - safeScale) > 1) {
      ground.scale.setScalar(safeScale);
    }

    (ground as any).update?.(camera);
  });

  if (!ground) return null;
  return <primitive object={ground} />;
};
