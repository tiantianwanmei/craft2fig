// ============================================================================
// 🖨️ Print Master Pro - Type Definitions
// ============================================================================

export type Unit = 'mm' | 'in' | 'px';

export type PresetCategory = 'ISO' | 'US' | 'Photo' | 'Business' | 'Custom';

export interface PrintPreset {
  id: string;
  name: string;
  category: PresetCategory;
  width: number;
  height: number;
  unit: Unit;
  description?: string;
}

export interface PrintSettings {
  preset: PrintPreset;
  dpi: number;
  orientation: 'portrait' | 'landscape';
  bleed: number; // mm
  simulateCMYK: boolean;
  colorProfile: ColorProfile;
}

export type ColorProfile =
  | 'sRGB'
  | 'Adobe RGB'
  | 'FOGRA39' // Coated paper (Europe)
  | 'FOGRA51' // Coated paper (Europe, newer)
  | 'SWOP'    // US web offset
  | 'GRACoL'; // US commercial

export interface CMYKColor {
  c: number; // 0-100
  m: number; // 0-100
  y: number; // 0-100
  k: number; // 0-100
}

export interface RGBColor {
  r: number; // 0-255
  g: number; // 0-255
  b: number; // 0-255
}

export interface GamutWarning {
  color: RGBColor;
  deltaE: number;
  isOutOfGamut: boolean;
  suggestedCMYK: CMYKColor;
}

export interface PrintFrameMetadata {
  dpi: number;
  unit: Unit;
  physicalWidth: number;
  physicalHeight: number;
  bleed: number;
  colorProfile: ColorProfile;
  createdAt: string;
}
