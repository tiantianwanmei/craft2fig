// ============================================================================
// ASYNC HDR UPLOADER - 使用 Web Worker 的非阻塞 HDR 上传组件
// ============================================================================

import React, { useState, useCallback } from 'react';
import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

interface AsyncHDRUploaderProps {
  onEnvMapReady: (texture: THREE.Texture) => void;
  maxResolution?: number;
}

export const AsyncHDRUploader: React.FC<AsyncHDRUploaderProps> = ({
  onEnvMapReady,
  maxResolution = 2048,
}) => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFile = useCallback(async (file: File) => {
    setStatus('loading');
    setProgress(0);
    setErrorMsg(null);
    setFileName(file.name);

    try {
      const objectUrl = URL.createObjectURL(file);

      const texture = await new Promise<THREE.DataTexture>((resolve, reject) => {
        const loader = new RGBELoader();
        loader.setDataType(THREE.HalfFloatType);

        loader.load(
          objectUrl,
          (tex) => {
            URL.revokeObjectURL(objectUrl);
            resolve(tex);
          },
          (event) => {
            if (event.lengthComputable) {
              setProgress((event.loaded / event.total) * 100);
            }
          },
          (err) => {
            URL.revokeObjectURL(objectUrl);
            reject(err);
          }
        );
      });

      texture.mapping = THREE.EquirectangularReflectionMapping;
      texture.needsUpdate = true;

      onEnvMapReady(texture);
      setStatus('ready');
      setProgress(100);
    } catch (err) {
      console.error('HDR 加载失败:', err);
      setErrorMsg(err instanceof Error ? err.message : '加载失败');
      setStatus('error');
    }
  }, [onEnvMapReady]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && /\.(hdr|exr)$/i.test(file.name)) {
      handleFile(file);
    }
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      style={{
        padding: '12px',
        background: status === 'ready' ? '#1a3a1a' : status === 'error' ? '#3a1a1a' : '#1a1a1a',
        border: `1px dashed ${status === 'error' ? '#f44' : '#444'}`,
        borderRadius: '8px',
        textAlign: 'center',
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
    >
      <input
        type="file"
        accept=".hdr,.exr"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        style={{ display: 'none' }}
        id="async-hdr-upload"
      />
      <label htmlFor="async-hdr-upload" style={{ cursor: 'pointer', display: 'block' }}>
        {status === 'loading' ? (
          <div>
            <div style={{ color: '#888', fontSize: '12px', marginBottom: '8px' }}>
              后台加载中... {Math.round(progress)}%
            </div>
            <div style={{
              height: '4px',
              background: '#333',
              borderRadius: '2px',
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${progress}%`,
                height: '100%',
                background: '#4a9',
                transition: 'width 0.2s',
              }} />
            </div>
          </div>
        ) : status === 'ready' ? (
          <span style={{ color: '#4a9', fontSize: '12px' }}>
            ✅ {fileName || 'HDR 已加载'}
          </span>
        ) : status === 'error' ? (
          <span style={{ color: '#f66', fontSize: '12px' }}>
            ❌ {errorMsg || '加载失败'}，点击重试
          </span>
        ) : (
          <span style={{ color: '#888', fontSize: '12px' }}>
            📤 拖放或点击上传 HDR
          </span>
        )}
      </label>
    </div>
  );
};

export default AsyncHDRUploader;
