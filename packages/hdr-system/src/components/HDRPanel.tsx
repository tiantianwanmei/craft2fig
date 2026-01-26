import React from 'react';
import { createPortal } from 'react-dom';
import { useWebGPUStore, use3DStore } from '@genki/shared-stores';
import { HDRUploaderCompact } from './HDRUploaderCompact';

interface HDRPanelProps {
  onClose?: () => void;
}

export const HDRPanel: React.FC<HDRPanelProps> = ({ onClose }) => {
  const envPreset = useWebGPUStore((s) => s.envPreset);
  const setEnvPreset = useWebGPUStore((s) => s.setEnvPreset);
  const hdrLoaded = useWebGPUStore((s) => s.hdrLoaded);
  const hdrName = useWebGPUStore((s) => s.hdrName);
  const hdr = use3DStore((s) => s.hdr);
  const setHDR = use3DStore((s) => s.setHDR);
  const backgroundMode = use3DStore((s) => s.background.mode);
  const setBackground = use3DStore((s) => s.setBackground);

  const panel = (
    <div
      style={{
        position: 'fixed',
        top: '80px',
        left: '70px',
        width: '300px',
        maxHeight: 'calc(100vh - 160px)',
        background: 'var(--bg-surface-elevated, rgba(0, 0, 0, 0.9))',
        backdropFilter: 'blur(16px)',
        border: '1px solid var(--border-divider-weak, rgba(255, 255, 255, 0.1))',
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        padding: '16px',
        zIndex: 20000,
        overflowY: 'auto',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#fff' }}>🌐 HDR 环境设置</h3>
        <button
          onClick={() => onClose?.()}
          style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '16px' }}
        >
          ✕
        </button>
      </div>

      <div className="flex flex-col gap-4">
      <div className="text-xs font-semibold uppercase text-gray-400 mb-2">Environment</div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>预设环境</span>
          <span className="text-green-400">{hdrLoaded ? (hdrName || 'HDR 已加载') : ''}</span>
        </div>
        <select
          className="w-full text-xs px-2 py-2 rounded border border-gray-700 bg-black/40 text-gray-200"
          value={envPreset}
          onChange={(e) => setEnvPreset(e.target.value)}
        >
          <option value="city">城市</option>
          <option value="studio">影棚</option>
          <option value="sunset">日落</option>
          <option value="warehouse">仓库</option>
          <option value="custom">自定义</option>
        </select>
      </div>

      <div className="mt-2 border-t border-gray-800 pt-4">
        <div className="text-xs font-semibold text-gray-400 mb-2">上传 HDR/EXR</div>
        <HDRUploaderCompact />
        {!hdrLoaded && (
          <div className="mt-2 text-xs text-gray-500">
            未加载 HDR 时，穹顶投影不会显示。
          </div>
        )}
      </div>

      <div className="mt-4 border-t border-gray-800 pt-4">
        <div className="text-xs font-semibold uppercase text-gray-400 mb-2">PolyDome</div>

        <label className="flex items-center gap-2 text-xs text-gray-200">
          <input
            type="checkbox"
            checked={hdr.groundProjection}
            onChange={(e) => {
              const checked = e.target.checked;
              setHDR({ groundProjection: checked });
              if (checked) setBackground({ mode: 'hdr' });
            }}
          />
          启用穹顶投影
        </label>

        <label className="flex items-center gap-2 text-xs text-gray-200">
          <input
            type="checkbox"
            checked={hdr.showBackground}
            onChange={(e) => {
              const checked = e.target.checked;
              setHDR({ showBackground: checked });
              if (checked) setBackground({ mode: 'hdr' });
            }}
          />
          显示 HDR 背景
        </label>

        <label className="flex items-center gap-2 text-xs text-gray-200">
          <input
            type="checkbox"
            checked={hdr.useForLighting}
            onChange={(e) => setHDR({ useForLighting: e.target.checked })}
          />
          使用 HDR 作为光照
        </label>

        <div className="mt-3">
          <div className="flex justify-between text-xs text-gray-400">
            <span>光照强度</span>
            <span className="text-indigo-300 font-mono">{hdr.intensity.toFixed(2)}</span>
          </div>
          <input
            className="w-full"
            type="range"
            min={0}
            max={3}
            step={0.01}
            value={hdr.intensity}
            onChange={(e) => setHDR({ intensity: parseFloat(e.target.value) })}
          />
        </div>

        {hdr.groundProjection && (
          <>
            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-400">
                <span>穹顶高度</span>
                <span className="text-indigo-300 font-mono">{hdr.domeHeight.toFixed(0)}</span>
              </div>
              <input
                className="w-full"
                type="range"
                min={10}
                max={3000}
                step={10}
                value={hdr.domeHeight}
                onChange={(e) => setHDR({ domeHeight: parseFloat(e.target.value) })}
              />
            </div>

            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-400">
                <span>穹顶半径</span>
                <span className="text-indigo-300 font-mono">{hdr.domeRadius.toFixed(0)}</span>
              </div>
              <input
                className="w-full"
                type="range"
                min={1000}
                max={50000}
                step={100}
                value={hdr.domeRadius}
                onChange={(e) => setHDR({ domeRadius: parseFloat(e.target.value) })}
              />
            </div>
          </>
        )}

        <div className="mt-4">
          <div className="text-xs font-semibold text-gray-400 mb-2">背景模式</div>
          <div className="flex gap-2">
            {(['solid', 'gradient', 'hdr'] as const).map((mode) => (
              <button
                key={mode}
                className={`flex-1 text-xs px-2 py-1 rounded border ${backgroundMode === mode ? 'border-indigo-400 text-white bg-indigo-500/20' : 'border-gray-700 text-gray-300 bg-white/5'}`}
                onClick={() => setBackground({ mode })}
              >
                {mode === 'solid' ? '纯色' : mode === 'gradient' ? '渐变' : 'HDR'}
              </button>
            ))}
          </div>
        </div>
      </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(panel, document.body);
};
