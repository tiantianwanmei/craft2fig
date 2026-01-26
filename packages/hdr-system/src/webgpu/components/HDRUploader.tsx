// ============================================================================
// HDR Uploader Component - HDR 上传组件（Worker 版）
// ============================================================================

import React, { useCallback, useState } from 'react';
import { UnifiedHDRLoader, HDRData } from '../loaders';

interface HDRUploaderProps {
  onHDRLoaded: (hdrData: HDRData) => void;
  onError?: (error: string) => void;
}

export const HDRUploader: React.FC<HDRUploaderProps> = ({
  onHDRLoaded,
  onError,
}) => {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFileChange = useCallback(async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setProgress(0);
    setFileName(file.name);

    try {
      const hdrData = await UnifiedHDRLoader.loadFromFile(file, {
        onProgress: setProgress,
        maxResolution: 2048,
      });
      onHDRLoaded(hdrData);
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Load failed');
    } finally {
      setLoading(false);
    }
  }, [onHDRLoaded, onError]);

  return (
    <div className="hdr-uploader" style={{ padding: '8px' }}>
      <label className="hdr-uploader__label" style={{
        display: 'block',
        padding: '12px',
        background: '#1a1a1a',
        border: '1px dashed #444',
        borderRadius: '8px',
        textAlign: 'center',
        cursor: loading ? 'wait' : 'pointer',
      }}>
        <input
          type="file"
          accept=".hdr,.exr"
          onChange={handleFileChange}
          disabled={loading}
          style={{ display: 'none' }}
        />
        {loading ? (
          <div>
            <div style={{ color: '#888', fontSize: '12px', marginBottom: '8px' }}>
              后台加载中... {Math.round(progress * 100)}%
            </div>
            <div style={{
              height: '4px',
              background: '#333',
              borderRadius: '2px',
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${progress * 100}%`,
                height: '100%',
                background: '#4a9',
                transition: 'width 0.2s',
              }} />
            </div>
          </div>
        ) : (
          <span style={{ color: '#888', fontSize: '12px' }}>
            {fileName ? `✅ ${fileName}` : '📤 上传 HDR/EXR'}
          </span>
        )}
      </label>
    </div>
  );
};
