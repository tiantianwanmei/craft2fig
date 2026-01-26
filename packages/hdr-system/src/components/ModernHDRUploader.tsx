// ============================================================================
// MODERN HDR UPLOADER - 使用 Three.js 官方加载器
// ============================================================================

import React, { useState, useCallback, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { useModernHDR } from './ModernHDRLoader';

interface ModernHDRUploaderProps {
  onEnvironmentLoaded?: (envMap: THREE.Texture, texture: THREE.Texture) => void;
  onError?: (error: string) => void;
}

export const ModernHDRUploader: React.FC<ModernHDRUploaderProps> = ({
  onEnvironmentLoaded,
  onError,
}) => {
  const { gl } = useThree();
  const { loadHDR, isLoading, progress, error } = useModernHDR();
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      setFileName(file.name);

      try {
        const result = await loadHDR(file, gl);
        onEnvironmentLoaded?.(result.envMap, result.texture);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'HDR 加载失败';
        onError?.(msg);
      }

      // 重置 input 以允许重复选择同一文件
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    },
    [gl, loadHDR, onEnvironmentLoaded, onError]
  );

  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-white/60 uppercase tracking-wide">
        HDR 环境贴图
      </label>

      <input
        ref={inputRef}
        type="file"
        accept=".hdr,.exr,.jpg,.jpeg,.png,.webp"
        onChange={handleFileChange}
        disabled={isLoading}
        className="hidden"
        id="modern-hdr-input"
      />

      <label
        htmlFor="modern-hdr-input"
        className={`
          flex items-center justify-center gap-2 w-full px-4 py-2.5
          bg-white/5 border border-white/10 rounded-lg
          text-sm cursor-pointer transition-all
          ${isLoading ? 'opacity-50 cursor-wait' : 'hover:bg-white/10 hover:border-white/20'}
        `}
      >
        {isLoading ? (
          <>
            <LoadingSpinner />
            <span className="text-white/70">加载中 {Math.round(progress * 100)}%</span>
          </>
        ) : (
          <>
            <UploadIcon />
            <span className="text-white/70">
              {fileName ? `已加载: ${fileName}` : '选择 HDR/EXR 文件'}
            </span>
          </>
        )}
      </label>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <p className="text-xs text-white/40">
        支持 .hdr .exr .jpg .png（推荐使用 Poly Haven HDR）
      </p>
    </div>
  );
};

// 简单的 SVG 图标
const LoadingSpinner = () => (
  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.25" />
    <path
      d="M12 2a10 10 0 0 1 10 10"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

const UploadIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

export default ModernHDRUploader;
