// ============================================================================
// CanvasViewer - 画布查看器主组件
// ============================================================================

import React, { useState, useMemo } from 'react';
import { ViewportControls } from './ViewportControls';
import { BackgroundSettings } from './BackgroundSettings';
import { InfoCard } from './InfoCard';
import { SVGCanvas } from './SVGCanvas';
import { useViewportInteraction } from '../hooks/useViewportInteraction';
import { getBackgroundStyle } from '../utils/backgroundStyles';
import { Part2D, DielineSettings, BackgroundConfig, BackgroundPreset } from '../types';

interface CanvasViewerProps {
  layoutData: Part2D[];
  dielineSettings: DielineSettings;
  params: { l: number; w: number; h: number; t: number };
  totalArea: number;
  resolvedTokens?: Record<string, string>;
  t?: (key: string) => string;
  language?: string;
}

export const CanvasViewer: React.FC<CanvasViewerProps> = ({
  layoutData,
  dielineSettings,
  params,
  totalArea,
  resolvedTokens = {},
  t = (key) => key,
  language = 'en',
}) => {
  const { scale, offset, isDragging, handleWheel, resetView, startDrag } = useViewportInteraction();

  const [bgPreset, setBgPreset] = useState<BackgroundPreset>('dots');
  const [showBgSettings, setShowBgSettings] = useState(false);
  const [bgConfig, setBgConfig] = useState<BackgroundConfig>({
    gridSize: 15,
    gridColor: resolvedTokens['base-colors-primary-300'] || '#bed5fe',
    gridOpacity: 0.15,
    dotSize: 1,
    dotSpacing: 20,
    dotColor: resolvedTokens['base-colors-primary-300'] || '#bed5fe',
    dotOpacity: 0.15
  });

  const bgPresets = useMemo(() => [
    { id: 'gradient', icon: '🌈', name: t('bg.gradient') },
    { id: 'grid', icon: '📐', name: t('bg.grid') },
    { id: 'dots', icon: '⚫', name: t('bg.dots') },
    { id: 'vignette', icon: '🌑', name: t('bg.vignette') }
  ], [t, language]);

  const handleBgPresetChange = (preset: BackgroundPreset) => {
    setBgPreset(preset);
    if (preset === 'grid' || preset === 'dots') {
      setShowBgSettings(!showBgSettings);
    } else {
      setShowBgSettings(false);
    }
  };

  return (
    <div
      className="absolute inset-0 overflow-hidden p-8 custom-scrollbar"
      id="preview-area"
      style={{
        ...getBackgroundStyle(bgPreset, bgConfig),
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
      onWheel={handleWheel}
      onMouseDown={startDrag}
    >
      <ViewportControls
        scale={scale}
        bgPreset={bgPreset}
        bgPresets={bgPresets}
        onReset={resetView}
        onBgPresetChange={handleBgPresetChange}
        resolvedTokens={resolvedTokens}
        t={t}
      />

      {showBgSettings && (
        <BackgroundSettings
          bgPreset={bgPreset}
          bgConfig={bgConfig}
          onConfigChange={setBgConfig}
          t={t}
        />
      )}

      <SVGCanvas
        layoutData={layoutData}
        dielineSettings={dielineSettings}
        params={params}
        scale={scale}
        offset={offset}
        isDragging={isDragging}
        resolvedTokens={resolvedTokens}
      />

      <InfoCard
        partsCount={layoutData.length}
        totalArea={totalArea}
        t={t}
      />
    </div>
  );
};
