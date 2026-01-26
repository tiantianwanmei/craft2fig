import React from 'react';

interface PBRPanelProps {
  roughness?: number;
  metalness?: number;
  onRoughnessChange?: (value: number) => void;
  onMetalnessChange?: (value: number) => void;
}

export const PBRPanel: React.FC<PBRPanelProps> = ({
  roughness = 0.5,
  metalness = 0.0,
  onRoughnessChange,
  onMetalnessChange,
}) => {
  return (
    <div style={{ padding: '16px' }}>
      <h3>PBR Settings</h3>
      <div style={{ marginBottom: '12px' }}>
        <label>Roughness: {roughness.toFixed(2)}</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={roughness}
          onChange={(e) => onRoughnessChange?.(parseFloat(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>
      <div>
        <label>Metalness: {metalness.toFixed(2)}</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={metalness}
          onChange={(e) => onMetalnessChange?.(parseFloat(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>
    </div>
  );
};
