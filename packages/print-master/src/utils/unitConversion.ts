// ============================================================================
// 🖨️ Print Master Pro - Unit Conversion Utilities
// ============================================================================

import { Unit } from './types';

// Constants
const MM_PER_INCH = 25.4;
const DEFAULT_SCREEN_DPI = 96; // Web standard

/**
 * Convert value from one unit to another
 */
export function convertUnit(
  value: number,
  fromUnit: Unit,
  toUnit: Unit,
  dpi: number = DEFAULT_SCREEN_DPI
): number {
  // First convert to mm (base unit)
  const mm = toMillimeters(value, fromUnit, dpi);
  // Then convert to target unit
  return fromMillimeters(mm, toUnit, dpi);
}

/**
 * Convert any unit to millimeters
 */
export function toMillimeters(
  value: number,
  unit: Unit,
  dpi: number = DEFAULT_SCREEN_DPI
): number {
  switch (unit) {
    case 'mm':
      return value;
    case 'in':
      return value * MM_PER_INCH;
    case 'px':
      return (value / dpi) * MM_PER_INCH;
    default:
      return value;
  }
}

/**
 * Convert millimeters to any unit
 */
export function fromMillimeters(
  mm: number,
  unit: Unit,
  dpi: number = DEFAULT_SCREEN_DPI
): number {
  switch (unit) {
    case 'mm':
      return mm;
    case 'in':
      return mm / MM_PER_INCH;
    case 'px':
      return (mm / MM_PER_INCH) * dpi;
    default:
      return mm;
  }
}

/**
 * Convert inches to pixels at given DPI
 */
export function inchesToPixels(inches: number, dpi: number): number {
  return Math.round(inches * dpi);
}

/**
 * Convert millimeters to pixels at given DPI
 */
export function mmToPixels(mm: number, dpi: number): number {
  const inches = mm / MM_PER_INCH;
  return Math.round(inches * dpi);
}

/**
 * Calculate pixel dimensions for print
 */
export function calculatePixelDimensions(
  width: number,
  height: number,
  unit: Unit,
  dpi: number
): { width: number; height: number } {
  const widthMm = toMillimeters(width, unit);
  const heightMm = toMillimeters(height, unit);

  return {
    width: mmToPixels(widthMm, dpi),
    height: mmToPixels(heightMm, dpi),
  };
}

/**
 * Format dimension with unit
 */
export function formatDimension(
  value: number,
  unit: Unit,
  precision: number = 1
): string {
  return `${value.toFixed(precision)} ${unit}`;
}

/**
 * Get unit display label
 */
export function getUnitLabel(unit: Unit): string {
  switch (unit) {
    case 'mm': return 'mm';
    case 'in': return 'in';
    case 'px': return 'px';
    default: return unit;
  }
}
