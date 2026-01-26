// ============================================================================
// Canvas Viewer Types
// ============================================================================

export interface Part2D {
  id: string;
  name: string;
  path: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  role: string;
  type?: 'panel' | 'crease';
}

export interface DielineSettings {
  bleed: number;
  cutLineColor: string;
  cutLineWidth: number;
  cutLineStyle: 'solid' | 'dashed';
  foldLineColor: string;
  foldLineWidth: number;
  foldLineStyle: 'solid' | 'dashed';
}

export interface BackgroundConfig {
  gridSize: number;
  gridColor: string;
  gridOpacity: number;
  dotSize: number;
  dotSpacing: number;
  dotColor: string;
  dotOpacity: number;
}

export type BackgroundPreset = 'gradient' | 'grid' | 'dots' | 'vignette';

export interface ViewportState {
  scale: number;
  offset: { x: number; y: number };
  isDragging: boolean;
}
