// ============================================================================
// HDR ENVIRONMENT - HDR 环境贴图管理
// ============================================================================
// 支持多个 HDR 预设，可以放置在 public 文件夹中

import React from 'react';
import { Environment } from '@react-three/drei';

interface HDREnvironmentProps {
  preset?: string;
  intensity?: number;
}

/**
 * HDR 环境贴图组件
 * 
 * 支持的预设：
 * - city: 城市环境
 * - sunset: 日落
 * - dawn: 黎明
 * - night: 夜晚
 * - studio: 工作室
 * - warehouse: 仓库
 * - forest: 森林
 * - apartment: 公寓
 */
export const HDREnvironment: React.FC<HDREnvironmentProps> = ({
  preset = 'city',
  intensity = 1,
}) => {
  // 修复：优先使用本地文件避免 Fetch 错误 (针对 studio 预设)
  const isStudio = preset === 'studio';
  const envProps = isStudio
    ? { files: 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_03_1k.hdr', preset: undefined }
    : { preset: preset as any };

  return (
    <Environment
      {...envProps}
      background={false}
      blur={0.5}
    />
  );
};

/**
 * 可用的 HDR 预设列表
 */
export const HDR_PRESETS = [
  { value: 'city', label: '🏙️ 城市' },
  { value: 'sunset', label: '🌅 日落' },
  { value: 'dawn', label: '🌄 黎明' },
  { value: 'night', label: '🌃 夜晚' },
  { value: 'studio', label: '🎬 工作室' },
  { value: 'warehouse', label: '🏭 仓库' },
  { value: 'forest', label: '🌲 森林' },
  { value: 'apartment', label: '🏠 公寓' },
];
