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
  const groundConfig = groundProjection
    ? {
      height: domeHeight,
      radius: domeRadius,
      scale: domeScale,
    }
    : undefined;

  // 使用 key 强制在参数变化时重新创建 Environment 组件
  const envKey = groundProjection
    ? `env-${preset}-${domeHeight}-${domeRadius}-${domeScale}`
    : `env-${preset}`;

  // 修复：优先使用本地文件避免 Fetch 错误 (针对 studio 预设)
  // 注意：在 Vite 中，public 目录下的文件可以直接通过 /filename 访问
  const isStudio = preset === 'studio';
  const envProps = isStudio
    ? { files: 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_03_1k.hdr', preset: undefined }
    : { preset };

  return (
    <Environment
      key={envKey}
      {...envProps}
      background={showBackground}
      ground={groundConfig}
      environmentIntensity={intensity}
    />
  );
}
