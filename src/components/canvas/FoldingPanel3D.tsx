/**
 * FoldingPanel3D - 可折叠的3D面板组件
 * 基于排序算法的折叠逻辑
 */

import React, { useMemo } from 'react';
import * as THREE from 'three';
import type { MarkedLayer } from '../../types/core';

interface FoldingPanel3DProps {
  layer: MarkedLayer;
  thickness: number;
  scale: number;
  offsetX: number;
  offsetY: number;
  foldAngle: number;
  foldAxis: 'x' | 'y';
  pivotOffset: [number, number, number];
  color?: string;
  depthLevel?: number;
}

export const FoldingPanel3D: React.FC<FoldingPanel3DProps> = ({
  layer,
  thickness,
  scale,
  offsetX,
  offsetY,
  foldAngle,
  foldAxis,
  pivotOffset,
  color = '#e8e0d5',
  depthLevel = 0,
}) => {
  const x = ((layer as any).x ?? layer.bounds?.x ?? 0) - offsetX;
  const y = ((layer as any).y ?? layer.bounds?.y ?? 0) - offsetY;
  const w = (layer as any).width ?? layer.bounds?.width ?? 100;
  const h = (layer as any).height ?? layer.bounds?.height ?? 50;

  const posX = x * scale;
  const posZ = y * scale;
  const width = w * scale;
  const height = h * scale;

  const rotation: [number, number, number] = foldAxis === 'x'
    ? [foldAngle, 0, 0]
    : [0, 0, foldAngle];

  return (
    <group position={pivotOffset} rotation={rotation}>
      <mesh position={[posX + width / 2 - pivotOffset[0], thickness / 2, posZ + height / 2 - pivotOffset[2]]}>
        <boxGeometry args={[width, thickness, height]} />
        <meshStandardMaterial
          color={color}
          roughness={0.85}
          metalness={0.02}
          polygonOffset
          polygonOffsetFactor={depthLevel}
          polygonOffsetUnits={1}
        />
      </mesh>
    </group>
  );
};
