// ============================================================================
// BackgroundSettings - 背景设置组件
// ============================================================================

import React from 'react';
import { BackgroundConfig, BackgroundPreset } from '../types';

interface BackgroundSettingsProps {
  bgPreset: BackgroundPreset;
  bgConfig: BackgroundConfig;
  onConfigChange: (config: BackgroundConfig) => void;
  t?: (key: string) => string;
}

export const BackgroundSettings: React.FC<BackgroundSettingsProps> = ({
  bgPreset,
  bgConfig,
  onConfigChange,
  t = (key) => key,
}) => {
  if (bgPreset !== 'grid' && bgPreset !== 'dots') {
    return null;
  }

  const handleColorKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, colorKey: 'gridColor' | 'dotColor') => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const hex = bgConfig[colorKey];
      const num = parseInt(hex.slice(1), 16);
      const delta = e.key === 'ArrowUp' ? 0x010101 : -0x010101;
      const newNum = Math.max(0, Math.min(0xffffff, num + delta));
      const newHex = '#' + newNum.toString(16).padStart(6, '0');
      onConfigChange({ ...bgConfig, [colorKey]: newHex });
    }
  };

  return (
    <div
      className="absolute top-4 z-10 p-3 rounded-lg"
      style={{
        left: '260px',
        backgroundColor: 'hsl(var(--background) / 0.7)',
        backdropFilter: 'blur(10px)',
        border: '1px solid hsl(var(--border))',
        maxWidth: '240px'
      }}
    >
      {bgPreset === 'grid' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-400 w-12">{t('bg.size')}</span>
            <input
              type="range"
              min="20"
              max="100"
              value={bgConfig.gridSize}
              onChange={(e) => onConfigChange({ ...bgConfig, gridSize: parseInt(e.target.value) })}
              className="flex-1 h-1"
            />
            <span className="text-[10px] text-gray-400 w-8">{bgConfig.gridSize}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-400 w-12">{t('bg.opacity')}</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={bgConfig.gridOpacity}
              onChange={(e) => onConfigChange({ ...bgConfig, gridOpacity: parseFloat(e.target.value) })}
              className="flex-1 h-1"
            />
            <span className="text-[10px] text-gray-400 w-8">{(bgConfig.gridOpacity * 100).toFixed(0)}%</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-400 w-12">{t('bg.color')}</span>
            <input
              type="color"
              value={bgConfig.gridColor}
              onChange={(e) => onConfigChange({ ...bgConfig, gridColor: e.target.value })}
              className="w-8 h-6 rounded cursor-pointer"
            />
            <input
              type="text"
              value={bgConfig.gridColor}
              onChange={(e) => onConfigChange({ ...bgConfig, gridColor: e.target.value })}
              onKeyDown={(e) => handleColorKeyDown(e, 'gridColor')}
              className="flex-1 px-1 py-0.5 rounded text-[10px] font-mono bg-black/30 border border-white/10 text-white"
            />
          </div>
        </div>
      )}

      {bgPreset === 'dots' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-400 w-12">{t('bg.spacing')}</span>
            <input
              type="range"
              min="10"
              max="50"
              value={bgConfig.dotSpacing}
              onChange={(e) => onConfigChange({ ...bgConfig, dotSpacing: parseInt(e.target.value) })}
              className="flex-1 h-1"
            />
            <span className="text-[10px] text-gray-400 w-8">{bgConfig.dotSpacing}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-400 w-12">{t('bg.size')}</span>
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.5"
              value={bgConfig.dotSize}
              onChange={(e) => onConfigChange({ ...bgConfig, dotSize: parseFloat(e.target.value) })}
              className="flex-1 h-1"
            />
            <span className="text-[10px] text-gray-400 w-8">{bgConfig.dotSize}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-400 w-12">{t('bg.opacity')}</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={bgConfig.dotOpacity}
              onChange={(e) => onConfigChange({ ...bgConfig, dotOpacity: parseFloat(e.target.value) })}
              className="flex-1 h-1"
            />
            <span className="text-[10px] text-gray-400 w-8">{(bgConfig.dotOpacity * 100).toFixed(0)}%</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-400 w-12">{t('bg.color')}</span>
            <input
              type="color"
              value={bgConfig.dotColor}
              onChange={(e) => onConfigChange({ ...bgConfig, dotColor: e.target.value })}
              className="w-8 h-6 rounded cursor-pointer"
            />
            <input
              type="text"
              value={bgConfig.dotColor}
              onChange={(e) => onConfigChange({ ...bgConfig, dotColor: e.target.value })}
              onKeyDown={(e) => handleColorKeyDown(e, 'dotColor')}
              className="flex-1 px-1 py-0.5 rounded text-[10px] font-mono bg-black/30 border border-white/10 text-white"
            />
          </div>
        </div>
      )}
    </div>
  );
};
