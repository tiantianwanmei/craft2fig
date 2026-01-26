// ============================================================================
// PathTracingControls - 路径追踪控制面板
// ============================================================================

import React from 'react';

export interface PathTracingControlsProps {
  maxBounces: number;
  exposure: number;
  envMapIntensity: number;
  frameCount: number;
  isRendering: boolean;
  onMaxBouncesChange: (value: number) => void;
  onExposureChange: (value: number) => void;
  onEnvMapIntensityChange: (value: number) => void;
  onStartRendering: () => void;
  onStopRendering: () => void;
  onResetAccumulation: () => void;
}

export const PathTracingControls: React.FC<PathTracingControlsProps> = ({
  maxBounces,
  exposure,
  envMapIntensity,
  frameCount,
  isRendering,
  onMaxBouncesChange,
  onExposureChange,
  onEnvMapIntensityChange,
  onStartRendering,
  onStopRendering,
  onResetAccumulation,
}) => {
  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Path Tracing Controls</h3>

      {/* 状态显示 */}
      <div style={styles.status}>
        <span>Samples: {frameCount}</span>
        <span style={{
          color: isRendering ? '#4ade80' : '#f87171'
        }}>
          {isRendering ? 'Rendering' : 'Paused'}
        </span>
      </div>

      {/* 控制按钮 */}
      <div style={styles.buttons}>
        <button
          onClick={isRendering ? onStopRendering : onStartRendering}
          style={styles.button}
        >
          {isRendering ? 'Pause' : 'Start'}
        </button>
        <button onClick={onResetAccumulation} style={styles.button}>
          Reset
        </button>
      </div>

      {/* 滑块控制 */}
      <div style={styles.sliderGroup}>
        <label style={styles.label}>
          Max Bounces: {maxBounces}
        </label>
        <input
          type="range"
          min={1}
          max={16}
          value={maxBounces}
          onChange={e => onMaxBouncesChange(Number(e.target.value))}
          style={styles.slider}
        />
      </div>

      <div style={styles.sliderGroup}>
        <label style={styles.label}>
          Exposure: {exposure.toFixed(2)}
        </label>
        <input
          type="range"
          min={0.1}
          max={5}
          step={0.1}
          value={exposure}
          onChange={e => onExposureChange(Number(e.target.value))}
          style={styles.slider}
        />
      </div>

      <div style={styles.sliderGroup}>
        <label style={styles.label}>
          Env Intensity: {envMapIntensity.toFixed(2)}
        </label>
        <input
          type="range"
          min={0}
          max={5}
          step={0.1}
          value={envMapIntensity}
          onChange={e => onEnvMapIntensityChange(Number(e.target.value))}
          style={styles.slider}
        />
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: 16,
    background: 'hsl(var(--background) / 0.8)',
    borderRadius: 8,
    color: 'white',
    minWidth: 240,
  },
  title: {
    margin: '0 0 12px 0',
    fontSize: 14,
    fontWeight: 600,
  },
  status: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: 12,
    fontSize: 12,
  },
  buttons: {
    display: 'flex',
    gap: 8,
    marginBottom: 16,
  },
  button: {
    flex: 1,
    padding: '8px 12px',
    border: 'none',
    borderRadius: 4,
    background: '#3b82f6',
    color: 'white',
    cursor: 'pointer',
    fontSize: 12,
  },
  sliderGroup: {
    marginBottom: 12,
  },
  label: {
    display: 'block',
    marginBottom: 4,
    fontSize: 12,
  },
  slider: {
    width: '100%',
  },
};

export default PathTracingControls;
