// ============================================================================
// 🌐 HDR Dome Ground - HDR 穹顶地面投影组件
// 使用 drei Environment 的 ground 属性实现 HDR 地面投影
// ============================================================================

import React from 'react';
import { Environment } from '@react-three/drei';

// HDR 预设列表
export const HDR_PRESETS = [
  { value: 'city', label: '城市' },
  { value: 'studio', label: '影棚' },
  { value: 'sunset', label: '日落' },
  { value: 'dawn', label: '黎明' },
  { value: 'night', label: '夜晚' },
  { value: 'warehouse', label: '仓库' },
  { value: 'forest', label: '森林' },
  { value: 'apartment', label: '公寓' },
] as const;

export type HDRPreset = typeof HDR_PRESETS[number]['value'];

// 组件 Props
interface HDRDomeGroundProps {
  preset?: HDRPreset;
  intensity?: number;
  showBackground?: boolean;
  groundProjection?: boolean;
  domeHeight?: number;    // height: 环境贴图相机高度
  domeRadius?: number;    // radius: 虚拟世界半径
  domeScale?: number;     // scale: 投影球体大小（关键参数，要足够大避免穿帮）
}

// HDR 穹顶地面组件
export function HDRDomeGround({
  preset = 'studio',
  intensity = 1,
  showBackground = true,
  groundProjection = true,
  domeHeight = 15,       // 环境贴图相机高度（drei 默认 15）
  domeRadius = 120,      // 虚拟世界半径（drei 默认 60，增大一倍避免边界）
  domeScale = 1000,      // 投影球体大小（drei 默认 1000）
}: HDRDomeGroundProps) {
  // ground projection 需要 background=true 才能正确显示
  // ground 属性会自动创建地面投影效果，不会产生额外的球体
  return (
    <Environment
      preset={preset}
      background={showBackground}
      ground={
        groundProjection
          ? {
              height: domeHeight,
              radius: domeRadius,
              scale: domeScale,
            }
          : undefined
      }
      environmentIntensity={intensity}
    />
  );
}
