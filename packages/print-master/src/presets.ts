// ============================================================================
// 🖨️ Print Master Pro - Presets Database
// ============================================================================

import { PrintPreset } from './types';

// ISO A Series (International Standard)
export const ISO_PRESETS: PrintPreset[] = [
  { id: 'a0', name: 'A0', category: 'ISO', width: 841, height: 1189, unit: 'mm', description: 'Poster, technical drawings' },
  { id: 'a1', name: 'A1', category: 'ISO', width: 594, height: 841, unit: 'mm', description: 'Poster, flip charts' },
  { id: 'a2', name: 'A2', category: 'ISO', width: 420, height: 594, unit: 'mm', description: 'Poster, diagrams' },
  { id: 'a3', name: 'A3', category: 'ISO', width: 297, height: 420, unit: 'mm', description: 'Tabloid, diagrams' },
  { id: 'a4', name: 'A4', category: 'ISO', width: 210, height: 297, unit: 'mm', description: 'Letter, documents' },
  { id: 'a5', name: 'A5', category: 'ISO', width: 148, height: 210, unit: 'mm', description: 'Booklet, flyer' },
  { id: 'a6', name: 'A6', category: 'ISO', width: 105, height: 148, unit: 'mm', description: 'Postcard' },
  { id: 'a7', name: 'A7', category: 'ISO', width: 74, height: 105, unit: 'mm', description: 'Pocket card' },
];

// US Standard Sizes
export const US_PRESETS: PrintPreset[] = [
  { id: 'letter', name: 'US Letter', category: 'US', width: 8.5, height: 11, unit: 'in', description: 'Standard US document' },
  { id: 'legal', name: 'US Legal', category: 'US', width: 8.5, height: 14, unit: 'in', description: 'Legal documents' },
  { id: 'tabloid', name: 'Tabloid', category: 'US', width: 11, height: 17, unit: 'in', description: 'Newspaper, poster' },
  { id: 'ledger', name: 'Ledger', category: 'US', width: 17, height: 11, unit: 'in', description: 'Spreadsheets' },
  { id: 'executive', name: 'Executive', category: 'US', width: 7.25, height: 10.5, unit: 'in', description: 'Memo, executive' },
  { id: 'half-letter', name: 'Half Letter', category: 'US', width: 5.5, height: 8.5, unit: 'in', description: 'Statement' },
];

// Photo Sizes
export const PHOTO_PRESETS: PrintPreset[] = [
  { id: 'photo-4x6', name: '4×6"', category: 'Photo', width: 4, height: 6, unit: 'in', description: 'Standard photo' },
  { id: 'photo-5x7', name: '5×7"', category: 'Photo', width: 5, height: 7, unit: 'in', description: 'Portrait photo' },
  { id: 'photo-8x10', name: '8×10"', category: 'Photo', width: 8, height: 10, unit: 'in', description: 'Large photo' },
  { id: 'photo-11x14', name: '11×14"', category: 'Photo', width: 11, height: 14, unit: 'in', description: 'Gallery print' },
  { id: 'photo-16x20', name: '16×20"', category: 'Photo', width: 16, height: 20, unit: 'in', description: 'Poster print' },
  { id: 'square-12', name: '12×12"', category: 'Photo', width: 12, height: 12, unit: 'in', description: 'Square album' },
];

// Business Card Sizes
export const BUSINESS_PRESETS: PrintPreset[] = [
  { id: 'bc-us', name: 'Business Card (US)', category: 'Business', width: 3.5, height: 2, unit: 'in', description: 'Standard US' },
  { id: 'bc-eu', name: 'Business Card (EU)', category: 'Business', width: 85, height: 55, unit: 'mm', description: 'Standard EU' },
  { id: 'bc-jp', name: 'Business Card (JP)', category: 'Business', width: 91, height: 55, unit: 'mm', description: 'Standard Japan' },
  { id: 'postcard-us', name: 'Postcard (US)', category: 'Business', width: 6, height: 4, unit: 'in', description: 'USPS standard' },
  { id: 'postcard-a6', name: 'Postcard (A6)', category: 'Business', width: 148, height: 105, unit: 'mm', description: 'ISO A6' },
  { id: 'dl-envelope', name: 'DL Envelope', category: 'Business', width: 220, height: 110, unit: 'mm', description: 'Standard envelope' },
];

// All presets combined
export const ALL_PRESETS: PrintPreset[] = [
  ...ISO_PRESETS,
  ...US_PRESETS,
  ...PHOTO_PRESETS,
  ...BUSINESS_PRESETS,
];

// Preset categories for UI grouping
export const PRESET_CATEGORIES = [
  { id: 'ISO', name: 'ISO Standard', icon: '🌍' },
  { id: 'US', name: 'US Standard', icon: '🇺🇸' },
  { id: 'Photo', name: 'Photo Sizes', icon: '📷' },
  { id: 'Business', name: 'Business', icon: '💼' },
  { id: 'Custom', name: 'Custom Size', icon: '✏️' },
] as const;

// Common DPI presets
export const DPI_PRESETS = [
  { value: 72, label: 'Screen', description: 'Web/Screen display' },
  { value: 150, label: 'Draft', description: 'Draft printing' },
  { value: 300, label: 'Print', description: 'Standard print quality' },
  { value: 600, label: 'High', description: 'High quality print' },
] as const;

// Default settings
export const DEFAULT_PRINT_SETTINGS = {
  preset: ISO_PRESETS.find(p => p.id === 'a4')!,
  dpi: 300,
  orientation: 'portrait' as const,
  bleed: 3, // mm
  simulateCMYK: false,
  colorProfile: 'sRGB' as const,
};
