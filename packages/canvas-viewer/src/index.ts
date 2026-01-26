// ============================================================================
// @genki/canvas-viewer - Main Entry Point
// ============================================================================

export { CanvasViewer } from './components/CanvasViewer';
export { ViewportControls } from './components/ViewportControls';
export { BackgroundSettings } from './components/BackgroundSettings';
export { InfoCard } from './components/InfoCard';
export { SVGCanvas } from './components/SVGCanvas';

export { useViewportInteraction } from './hooks/useViewportInteraction';

export { getBackgroundStyle } from './utils/backgroundStyles';

export type {
  Part2D,
  DielineSettings,
  BackgroundConfig,
  BackgroundPreset,
  ViewportState
} from './types';
