// ============================================================================
// SIMPLE HDR UPLOADER - 简化版 HDR 上传（带压缩）
// ============================================================================

import React, { useState, useCallback, useEffect } from 'react';
import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import {
  compressHDR,
  decompressHDR,
  saveCompressedHDR,
  loadCompressedHDR,
  saveToFigma,
  CompressedHDR,
} from '../../webgpu/compression/HDRCompressor';

interface SimpleHDRUploaderProps {
  onEnvMapReady: (texture: THREE.Texture) => void;
}

export const SimpleHDRUploaderV2: React.FC<SimpleHDRUploaderProps> = ({
  onEnvMapReady,
}) => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [cachedName, setCachedName] = useState<string | null>(null);

  // 启动时检查缓存
  useEffect(() => {
    const cached = loadCompressedHDR();
    if (cached) {
      setCachedName('已缓存');
      loadFromCache(cached);
    }
  }, []);

  // 从缓存加载
  const loadFromCache = async (cached: CompressedHDR) => {
    setStatus('loading');
    try {
      const hdrData = await decompressHDR(cached);
      const texture = createTextureFromHDR(hdrData, cached.width, cached.height);
      onEnvMapReady(texture);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  };

  // 处理文件上传
  const handleFile = useCallback(async (file: File) => {
    setStatus('loading');
    setProgress(0);

    try {
      // 1. 创建 Blob URL
      const objectUrl = URL.createObjectURL(file);
      setProgress(10);

      // 2. 使用官方 RGBELoader 加载
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
              setProgress(10 + Math.floor((event.loaded / event.total) * 40));
            }
          },
          (err) => {
            URL.revokeObjectURL(objectUrl);
            reject(err);
          }
        );
      });
      setProgress(50);

      // 3. 设置纹理属性
      texture.mapping = THREE.EquirectangularReflectionMapping;
      texture.needsUpdate = true;

      // 4. 获取像素数据用于压缩
      const width = texture.image.width;
      const height = texture.image.height;
      const data = texture.image.data as Float32Array;

      // 5. 压缩存储
      const compressed = await compressHDR(data, width, height);
      setProgress(80);

      // 6. 保存缓存
      saveCompressedHDR(compressed);
      saveToFigma(compressed);
      setProgress(90);

      // 7. 回调
      onEnvMapReady(texture);

      setStatus('ready');
      setProgress(100);
      setCachedName(file.name);
    } catch (err) {
      console.error('HDR 加载失败:', err);
      setStatus('error');
    }
  }, [onEnvMapReady]);

  // 从 HDR 数据创建纹理
  const createTextureFromHDR = (
    data: Float32Array,
    width: number,
    height: number
  ): THREE.DataTexture => {
    const texture = new THREE.DataTexture(
      data, width, height,
      THREE.RGBAFormat, THREE.FloatType
    );
    texture.mapping = THREE.EquirectangularReflectionMapping;
    texture.needsUpdate = true;
    return texture;
  };

  return (
    <div style={{ padding: '8px' }}>
      <input
        type="file"
        accept=".hdr,.exr"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        style={{ display: 'none' }}
        id="hdr-upload-v2"
      />
      <label
        htmlFor="hdr-upload-v2"
        style={{
          display: 'block',
          padding: '12px',
          background: status === 'ready' ? '#1a3a1a' : '#1a1a1a',
          border: '1px dashed #444',
          borderRadius: '8px',
          textAlign: 'center',
          cursor: 'pointer',
          color: '#888',
          fontSize: '12px',
        }}
      >
        {status === 'loading' ? (
          <span>加载中... {progress}%</span>
        ) : status === 'ready' ? (
          <span>✅ {cachedName || 'HDR 已加载'}</span>
        ) : status === 'error' ? (
          <span>❌ 加载失败，点击重试</span>
        ) : (
          <span>📤 上传 HDR/EXR</span>
        )}
      </label>
    </div>
  );
};
