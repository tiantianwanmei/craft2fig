import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';

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

  const { camera } = useThree();

  const planeRef = useRef<THREE.Mesh | null>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);

  const safeRadius = Math.max(1, radius, height * 1.05);
  const sizeRef = useRef(scale);

  const tempOriginRef = useMemo(() => new THREE.Vector3(), []);

  void _exposure;
  texture.mapping = THREE.EquirectangularReflectionMapping;

  const shaderMaterial = useMemo(() => {
    const isCubeMap = (texture as any).isCubeTexture;
    const defines: string[] = [isCubeMap ? '#define ENVMAP_TYPE_CUBE' : ''];

    const vertexShader = `
      varying vec3 vWorldPosition;

      void main() {
        vec4 worldPosition = modelMatrix * vec4( position, 1.0 );
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
      }
    `;

    const fragmentShader = `${defines.join('\n')}
      varying vec3 vWorldPosition;
      uniform float radius;
      uniform float height;
      uniform vec3 center;

      #ifdef ENVMAP_TYPE_CUBE
        uniform samplerCube map;
      #else
        uniform sampler2D map;
      #endif

      #include <common>

      void main() {
        vec3 local = vWorldPosition - center;
        local.y = -height;
        float r = length( local.xz );
        vec3 direction = normalize( local );
        float edge = smoothstep( radius * 0.98, radius, r );
        direction = normalize( mix( direction, vec3( 0.0, 1.0, 0.0 ), edge ) );

        #ifdef ENVMAP_TYPE_CUBE
          vec3 outcolor = textureCube( map, direction ).rgb;
        #else
          vec2 uv = equirectUv( direction );
          vec3 outcolor = texture2D( map, uv ).rgb;
        #endif

        gl_FragColor = vec4( outcolor, 1.0 );
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `;

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        map: { value: texture },
        radius: { value: safeRadius },
        height: { value: height },
        center: { value: new THREE.Vector3(0, 0, 0) },
      },
      vertexShader,
      fragmentShader,
      side: THREE.DoubleSide,
    });

    mat.depthWrite = false;
    mat.depthTest = true;
    return mat;
  }, [texture, safeRadius]);

  useEffect(() => {
    materialRef.current = shaderMaterial;
    return () => {
      shaderMaterial.dispose();
    };
  }, [shaderMaterial]);

  useFrame(() => {
    const camDist = camera.position.length();
    const far = (camera as THREE.PerspectiveCamera).far ?? 50000;
    const anchor = anchorRef?.current;
    const ax = anchor ? anchor.x : 0;
    const az = anchor ? anchor.z : 0;
    const centerY = groundY + height;
    tempOriginRef.set(ax, centerY, az);

    const desired = Math.max(scale, camDist * 4);
    const cappedDesired = Math.min(desired, Math.max(scale, far * 0.95));
    if (Number.isFinite(cappedDesired) && cappedDesired > 0) sizeRef.current = cappedDesired;

    const plane = planeRef.current;
    if (plane) {
      plane.position.set(ax, groundY, az);
      plane.scale.set(sizeRef.current, sizeRef.current, 1);
    }

    const m = materialRef.current;
    if (m) {
      (m.uniforms.center.value as THREE.Vector3).copy(tempOriginRef);
      m.uniforms.radius.value = safeRadius;
      m.uniforms.height.value = height;
    }
  });

  return (
    <mesh ref={planeRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, groundY, 0]} frustumCulled={false}>
      <planeGeometry args={[1, 1, 1, 1]} />
      <primitive object={shaderMaterial} attach="material" />
    </mesh>
  );
};
