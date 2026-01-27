import React from 'react';
import { MeshReflectorMaterial } from '@react-three/drei';

interface InfiniteGroundProps {
  y?: number;
  size?: number;
  reflectivity?: number;
  color?: string;
  showGrid?: boolean;
  blur?: [number, number];
  mixBlur?: number;
  mirror?: number;
}

export const InfiniteGround: React.FC<InfiniteGroundProps> = ({
  y = 0,
  size = 1000,
  reflectivity = 0.3,
  color = '#111111',
  showGrid = false,
  blur = [512, 512],
  mixBlur = 1,
  mirror = 0.5,
}) => {
  return (
    <group position={[0, y, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[size, size]} />
        <MeshReflectorMaterial
          blur={blur}
          resolution={1024}
          mixBlur={mixBlur}
          mixStrength={reflectivity}
          roughness={0.7}
          depthScale={1.5}
          minDepthThreshold={0.2}
          maxDepthThreshold={1.5}
          color={color}
          metalness={0.2}
          mirror={mirror}
          mixContrast={1.2}
          depthToBlurRatioBias={0.25}
          reflectorOffset={0}
        />
      </mesh>

      {showGrid && (
        <gridHelper args={[size, 50, '#333333', '#222222']} position={[0, 0.01, 0]} />
      )}
    </group>
  );
};

export const ShadowGround: React.FC<{
  y?: number;
  size?: number;
  opacity?: number;
}> = ({ y = 0, size = 500, opacity = 0.4 }) => {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]} receiveShadow>
      <planeGeometry args={[size, size]} />
      <shadowMaterial opacity={opacity} />
    </mesh>
  );
};
