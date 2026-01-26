// ============================================================================
// 🎨 Craft Material System - 工艺材质系统
// ============================================================================

import type { CraftType, CraftParams } from '../types';

// 工艺材质映射到 PBR 参数
export interface CraftPBRMapping {
  roughness: number;
  metalness: number;
  clearcoat: number;
  clearcoatRoughness: number;
  transmission: number;
  ior: number;
}

// 工艺类型的默认 PBR 预设
const CRAFT_PRESETS: Record<CraftType, CraftPBRMapping> = {
  // 压凹 - 哑光纸张效果
  emboss: {
    roughness: 0.8,
    metalness: 0.0,
    clearcoat: 0,
    clearcoatRoughness: 0,
    transmission: 0,
    ior: 1.5,
  },
  // 压凸 - 哑光纸张效果
  deboss: {
    roughness: 0.8,
    metalness: 0.0,
    clearcoat: 0,
    clearcoatRoughness: 0,
    transmission: 0,
    ior: 1.5,
  },
  // UV上光 - 高光泽透明涂层
  uv: {
    roughness: 0.1,
    metalness: 0.0,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    transmission: 0,
    ior: 1.5,
  },
  // 烫金 - 金属反射效果
  hotfoil: {
    roughness: 0.2,
    metalness: 1.0,
    clearcoat: 0.5,
    clearcoatRoughness: 0.1,
    transmission: 0,
    ior: 1.5,
  },
  // 上光 - 半光泽涂层
  varnish: {
    roughness: 0.3,
    metalness: 0.0,
    clearcoat: 0.7,
    clearcoatRoughness: 0.2,
    transmission: 0,
    ior: 1.45,
  },
  // 局部UV - 高光泽透明涂层
  spotUv: {
    roughness: 0.05,
    metalness: 0.0,
    clearcoat: 1.0,
    clearcoatRoughness: 0.02,
    transmission: 0,
    ior: 1.52,
  },
  // 纹理 - 带凹凸的纸张
  texture: {
    roughness: 0.7,
    metalness: 0.0,
    clearcoat: 0,
    clearcoatRoughness: 0,
    transmission: 0,
    ior: 1.5,
  },
};

// 获取工艺的 PBR 预设
export function getCraftPreset(type: CraftType): CraftPBRMapping {
  return { ...CRAFT_PRESETS[type] };
}

// 根据工艺参数调整 PBR 映射
export function adjustCraftPBR(
  type: CraftType,
  params: CraftParams
): CraftPBRMapping {
  const base = getCraftPreset(type);
  const intensity = params.intensity;

  // 根据强度调整参数
  return {
    ...base,
    clearcoat: base.clearcoat * intensity,
    metalness: base.metalness * intensity,
  };
}

// 烫金颜色预设
export const HOTFOIL_COLORS = {
  gold: '#D4AF37',
  silver: '#C0C0C0',
  copper: '#B87333',
  rosegold: '#B76E79',
  holographic: '#E6E6FA',
} as const;
