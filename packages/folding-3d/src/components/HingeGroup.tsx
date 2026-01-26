/**
 * HingeGroup - 铰链组件
 * 实现面板之间的折叠连接
 */

import React from 'react';

interface HingeGroupProps {
  position: [number, number, number];
  axis: 'x' | 'y';
  angle: number;
  children: React.ReactNode;
}

export const HingeGroup: React.FC<HingeGroupProps> = ({
  position,
  axis,
  angle,
  children,
}) => {
  const rotation: [number, number, number] =
    axis === 'x' ? [angle, 0, 0] : [0, angle, 0];

  return (
    <group position={position} rotation={rotation}>
      {children}
    </group>
  );
};
