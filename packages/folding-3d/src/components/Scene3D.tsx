/**
 * Scene3D - 3D场景组件
 * 配置灯光、环境、相机等
 */

import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { FoldingBox } from './FoldingBox';
import { use3DStore } from '../store/use3DStore';
import type { FoldingData } from '../types';

interface Scene3DProps {
  data: FoldingData;
  height?: string;
  textures?: Map<string, THREE.Texture>;
}

export const Scene3D: React.FC<Scene3DProps> = ({
  data,
  height = '100%',
  textures,
}) => {
  const { folding, camera, environment } = use3DStore();

  return (
    <div style={{ width: '100%', height }}>
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
        }}
      >
        <color attach="background" args={[environment.backgroundColor]} />

        <PerspectiveCamera
          makeDefault
          position={camera.position}
          fov={camera.fov}
        />

        {/* 灯光 */}
        <ambientLight intensity={0.4} />
        <directionalLight
          position={[10, 10, 5]}
          intensity={1}
          castShadow
        />
        <hemisphereLight args={['#ffffff', '#444444', 0.6]} />

        {/* 3D模型 */}
        <Suspense fallback={null}>
          <FoldingBox
            data={data}
            foldProgress={folding.foldProgress}
            thickness={folding.thickness}
            textures={textures}
          />
        </Suspense>

        {/* 地面 */}
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, -50, 0]}
          receiveShadow
        >
          <planeGeometry args={[500, 500]} />
          <shadowMaterial opacity={0.2} />
        </mesh>

        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.1}
        />
      </Canvas>
    </div>
  );
};
