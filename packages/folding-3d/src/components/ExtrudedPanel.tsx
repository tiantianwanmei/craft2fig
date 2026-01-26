/**
 * ExtrudedPanel - SVG路径挤压面板
 * 将2D SVG路径转换为3D几何体
 */

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';

interface ExtrudedPanelProps {
  pathStr: string;
  color?: string;
  thickness?: number;
  depthLevel?: number;
  texture?: THREE.Texture | null;
}

export const ExtrudedPanel: React.FC<ExtrudedPanelProps> = ({
  pathStr,
  color = '#ffffff',
  thickness = 2,
  depthLevel = 0,
  texture,
}) => {
  const geometry = useMemo(() => {
    try {
      const loader = new SVGLoader();
      const svgData = `<svg><path d="${pathStr}"/></svg>`;
      const paths = loader.parse(svgData).paths;

      if (paths.length === 0) return null;

      const shapes = SVGLoader.createShapes(paths[0]);
      const geo = new THREE.ExtrudeGeometry(shapes, {
        depth: thickness,
        bevelEnabled: false,
        curveSegments: 12,
      });

      // 中性层对齐：Z轴居中
      geo.translate(0, 0, -thickness / 2);

      return geo;
    } catch (error) {
      console.error('ExtrudedPanel: Failed to create geometry', error);
      return null;
    }
  }, [pathStr, thickness]);

  if (!geometry) return null;

  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial
        color={color}
        map={texture}
        side={THREE.DoubleSide}
        roughness={0.85}
        metalness={0.05}
        polygonOffset
        polygonOffsetFactor={depthLevel}
        polygonOffsetUnits={1}
      />
    </mesh>
  );
};
