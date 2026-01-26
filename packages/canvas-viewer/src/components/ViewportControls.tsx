// ============================================================================
// ViewportControls - 视口控制组件
// ============================================================================

import React from 'react';
import { BackgroundPreset } from '../types';

interface ViewportControlsProps {
  scale: number;
  bgPreset: BackgroundPreset;
  bgPresets: Array<{ id: string; icon: string; name: string }>;
  onReset: () => void;
  onBgPresetChange: (preset: BackgroundPreset) => void;
  resolvedTokens?: Record<string, string>;
  t?: (key: string) => string;
}

export const ViewportControls: React.FC<ViewportControlsProps> = ({
  scale,
  bgPreset,
  bgPresets,
  onReset,
  onBgPresetChange,
  resolvedTokens = {},
  t = (key) => key,
}) => {
  return (
    <div className="absolute top-4 left-4 z-10 flex gap-1.5 items-start">
      {/* Reset Button */}
      <button
        onClick={onReset}
        className="w-7 h-7 rounded flex items-center justify-center text-sm transition-all hover:scale-105"
        style={{
          backgroundColor: resolvedTokens['base-colors-alpha-black-75'] || 'hsl(var(--background) / 0.7)',
          backdropFilter: 'blur(10px)',
          color: 'hsl(var(--foreground))',
          border: `1px solid ${resolvedTokens['base-colors-alpha-white-20'] || 'hsl(var(--muted) / 0.2)'}`
        }}
        title={t('button.reset')}
      >
        🔄
      </button>

      {/* Scale Display */}
      <div
        className="px-2 py-1 rounded text-[10px] font-mono min-w-[42px] text-center"
        style={{
          backgroundColor: resolvedTokens['base-colors-alpha-black-75'] || 'hsl(var(--background) / 0.7)',
          backdropFilter: 'blur(10px)',
          color: 'var(--primary-400)',
          border: `1px solid ${resolvedTokens['base-colors-alpha-white-20'] || 'hsl(var(--muted) / 0.2)'}`
        }}
      >
        {(scale * 100).toFixed(0)}%
      </div>

      {/* Background Presets */}
      <div className="flex gap-1">
        {bgPresets.map(preset => (
          <button
            key={preset.id}
            onClick={() => onBgPresetChange(preset.id as BackgroundPreset)}
            className="w-7 h-7 rounded flex items-center justify-center text-sm transition-all hover:scale-105"
            style={{
              backgroundColor: bgPreset === preset.id ? 'var(--primary-500)' : 'hsl(var(--background) / 0.7)',
              backdropFilter: 'blur(10px)',
              color: 'hsl(var(--foreground))',
              border: `1px solid ${bgPreset === preset.id ? 'var(--primary-500)' : 'hsl(var(--muted) / 0.2)'}`
            }}
            title={preset.name}
          >
            {preset.icon}
          </button>
        ))}
      </div>
    </div>
  );
};
