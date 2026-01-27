// ============================================================================
// HDR UPLOADER COMPACT - 紧凑版 HDR 上传器
// ============================================================================
// 用于 Controls3D 面板中的 HDR 环境贴图上传

import React, { useRef } from 'react';
import { useWebGPUStore } from '../../store/useWebGPUStore';

interface HDRUploaderCompactProps {
  className?: string;
}

/**
 * 紧凑版 HDR 上传器
 * 支持 .hdr, .exr, .jpg, .png 格式
 */
export const HDRUploaderCompact: React.FC<HDRUploaderCompactProps> = ({ className }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { hdrLoaded, hdrName, processing, progress, loadHDRFromFile } = useWebGPUStore();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await loadHDRFromFile(file);
    }
    // 重置 input 以便可以重新选择同一文件
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={className} style={{ marginTop: '12px' }}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".hdr,.exr,.jpg,.jpeg,.png,.webp"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      <button
        onClick={handleClick}
        disabled={processing}
        style={{
          width: '100%',
          padding: '10px 12px',
          fontSize: '12px',
          fontWeight: 500,
          color: processing ? 'rgba(255, 255, 255, 0.5)' : 'white',
          backgroundColor: hdrLoaded
            ? 'rgba(34, 197, 94, 0.15)'
            : 'rgba(99, 102, 241, 0.15)',
          border: `1px solid ${hdrLoaded
            ? 'rgba(34, 197, 94, 0.3)'
            : 'rgba(99, 102, 241, 0.3)'}`,
          borderRadius: '8px',
          cursor: processing ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
        }}
        onMouseEnter={(e) => {
          if (!processing) {
            e.currentTarget.style.backgroundColor = hdrLoaded
              ? 'rgba(34, 197, 94, 0.25)'
              : 'rgba(99, 102, 241, 0.25)';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = hdrLoaded
            ? 'rgba(34, 197, 94, 0.15)'
            : 'rgba(99, 102, 241, 0.15)';
        }}
      >
        {processing ? (
          <>
            <span style={{
              display: 'inline-block',
              width: '14px',
              height: '14px',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              borderTopColor: '#6366f1',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }} />
            <span>加载中 {progress}%</span>
          </>
        ) : hdrLoaded ? (
          <>
            <span>✓</span>
            <span style={{
              maxWidth: '120px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {hdrName || '已加载'}
            </span>
          </>
        ) : (
          <>
            <span>📤</span>
            <span>上传 HDR 环境贴图</span>
          </>
        )}
      </button>

      <p style={{
        margin: '6px 0 0 0',
        fontSize: '10px',
        color: 'rgba(255, 255, 255, 0.4)',
        textAlign: 'center',
      }}>
        支持 .hdr, .exr, .jpg, .png
      </p>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default HDRUploaderCompact;
