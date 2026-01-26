// ============================================================================
// Background Styles Utility
// ============================================================================

import { BackgroundPreset, BackgroundConfig } from '../types';

export const getBackgroundStyle = (
  preset: BackgroundPreset,
  config: BackgroundConfig,
  baseColor: string = 'hsl(var(--background))'
) => {
  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  switch (preset) {
    case 'grid': {
      const gridEnd = config.gridSize - 1;
      return {
        background: baseColor,
        backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent ${gridEnd}px, ${hexToRgba(config.gridColor, config.gridOpacity)} ${gridEnd}px, ${hexToRgba(config.gridColor, config.gridOpacity)} ${config.gridSize}px), repeating-linear-gradient(90deg, transparent, transparent ${gridEnd}px, ${hexToRgba(config.gridColor, config.gridOpacity)} ${gridEnd}px, ${hexToRgba(config.gridColor, config.gridOpacity)} ${config.gridSize}px)`
      };
    }
    case 'dots':
      return {
        background: baseColor,
        backgroundImage: `radial-gradient(circle, ${hexToRgba(config.dotColor, config.dotOpacity)} ${config.dotSize}px, transparent ${config.dotSize}px)`,
        backgroundSize: `${config.dotSpacing}px ${config.dotSpacing}px`
      };
    case 'vignette':
      return {
        background: baseColor,
        backgroundImage: `radial-gradient(circle at center, transparent 0%, hsl(var(--background) / 0.8) 100%)`
      };
    default:
      return { background: baseColor };
  }
};
