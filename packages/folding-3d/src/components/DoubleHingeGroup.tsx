/**
 * DoubleHingeGroup - 双铰链组件
 * 将90度折叠分解为两个45度关节，模拟纸张柔韧性
 */

import React from 'react';
import * as THREE from 'three';

interface DoubleHingeGroupProps {
  position: [number, number, number];
  creaseSize: number;
  creaseLength: number;
  creaseColor: string;
  axis: 'x' | 'y';
  angle: number;
  thickness: number;
  gapDir?: 1 | -1;
  children: React.ReactNode;
}

export const DoubleHingeGroup: React.FC<DoubleHingeGroupProps> = ({
  position,
  creaseSize,
  creaseLength,
  creaseColor,
  axis,
  angle,
  thickness,
  gapDir = 1,
  children,
}) => {
  const halfAngle = angle * 0.5;

  const rotationA: [number, number, number] =
    axis === 'x' ? [halfAngle, 0, 0] : [0, halfAngle, 0];
  const rotationB: [number, number, number] =
    axis === 'x' ? [halfAngle, 0, 0] : [0, halfAngle, 0];

  const dir = gapDir;
  const creasePosition: [number, number, number] =
    axis === 'x'
      ? [0, (creaseSize / 2) * dir, 0]
      : [(creaseSize / 2) * dir, 0, 0];
  const childPosition: [number, number, number] =
    axis === 'x'
      ? [0, creaseSize * dir, 0]
      : [creaseSize * dir, 0, 0];

  return (
    <group position={position} rotation={rotationA}>
      {/* 压痕韧带 */}
      {creaseSize > 0 && (
        <group position={creasePosition}>
          <mesh castShadow receiveShadow>
            <boxGeometry
              args={[
                axis === 'x' ? creaseLength : creaseSize,
                axis === 'x' ? creaseSize : creaseLength,
                thickness,
              ]}
            />
            <meshStandardMaterial
              color={creaseColor}
              roughness={0.85}
              metalness={0.05}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      )}

      {/* 子节点 */}
      <group position={childPosition} rotation={rotationB}>
        {children}
      </group>
    </group>
  );
};
