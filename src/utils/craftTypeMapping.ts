/**
 * 🎨 Craft Type Mapping - 工艺类型映射
 *
 * 将中文工艺名称映射到英文工艺类型
 */

import type { CraftType } from '../types/core';

/** 中文工艺名称到英文工艺类型的映射 */
export const CRAFT_TYPE_ZH_TO_EN: Record<string, CraftType> = {
  '烫金': 'HOTFOIL',
  '烫银': 'VARNISH',
  '光油': 'VARNISH',
  'UV': 'UV',
  '局部UV': 'SPOT_UV',
  '凹凸': 'EMBOSS',
  '凹印': 'DEBOSS',
  '法线': 'NORMAL',
  '置换': 'TEXTURE',
  '剪切蒙版': 'CLIPMASK',
};

/** 英文工艺类型到中文名称的映射 */
export const CRAFT_TYPE_EN_TO_ZH: Record<CraftType, string> = {
  'HOTFOIL': '烫金',
  'UV': 'UV',
  'EMBOSS': '凹凸',
  'NORMAL': '法线',
  'TEXTURE': '置换',
  'VARNISH': '光油',
  'SPOT_UV': '局部UV',
  'DEBOSS': '凹印',
  'CLIPMASK': '剪切蒙版',
};

/**
 * 将中文工艺名称转换为英文工艺类型
 */
export function craftTypeZhToEn(zhName: string): CraftType {
  return CRAFT_TYPE_ZH_TO_EN[zhName] || 'NORMAL';
}

/**
 * 将英文工艺类型转换为中文名称
 */
export function craftTypeEnToZh(enType: CraftType): string {
  return CRAFT_TYPE_EN_TO_ZH[enType] || enType;
}
