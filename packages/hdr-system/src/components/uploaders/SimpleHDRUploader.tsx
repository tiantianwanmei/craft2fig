// ============================================================================
// SIMPLE HDR UPLOADER - 简化版 HDR 上传器
// ============================================================================
// 上传 HDR → 压缩 → 存储到 Figma pluginData → 在 3D 中使用

import React, { useState, useCallback } from 'react';

interface SimpleHDRUploaderProps {
  onHDRUploaded: (dataUrl: string) => void;
}

export const SimpleHDRUploader: React.FC<SimpleHDRUploaderProps> = ({ onHDRUploaded }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  /**
   * 压缩图片到适合插件使用的大小
   */
  const compressImage = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            reject(new Error('无法创建 canvas context'));
            return;
          }

          // 压缩到 1024x512，保持宽高比
          const maxWidth = 1024;
          const maxHeight = 512;
          let width = img.width;
          let height = img.height;

          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = width * ratio;
            height = height * ratio;
          }

          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);
          
          // 转换为 JPEG，质量 0.9
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.9);
          resolve(compressedDataUrl);
        };

        img.onerror = () => reject(new Error('图片加载失败'));
        img.src = e.target?.result as string;
      };

      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsDataURL(file);
    });
  };

  /**
   * 保存到 Figma pluginData
   */
  const saveToFigma = async (dataUrl: string) => {
    try {
      // 发送到 Figma 插件后端
      parent.postMessage({
        pluginMessage: {
          type: 'SAVE_HDR',
          data: dataUrl,
        },
      }, '*');
    } catch (error) {
      console.error('保存到 Figma 失败:', error);
      throw error;
    }
  };

  /**
   * 处理文件上传
   */
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 检查文件类型
    const validTypes = ['image/jpeg', 'image/png', 'image/hdr', 'image/exr'];
    const validExtensions = /\.(hdr|exr|jpg|jpeg|png)$/i;
    
    if (!validTypes.some(type => file.type.includes(type)) && !file.name.match(validExtensions)) {
      setErrorMessage('请选择有效的图片文件 (.hdr, .exr, .jpg, .png)');
      setStatus('error');
      return;
    }

    setIsUploading(true);
    setStatus('idle');
    setErrorMessage('');

    try {
      // 压缩图片
      const compressedDataUrl = await compressImage(file);
      
      // 保存到 Figma
      await saveToFigma(compressedDataUrl);
      
      // 通知父组件
      onHDRUploaded(compressedDataUrl);
      
      setStatus('success');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (error) {
      console.error('HDR 上传失败:', error);
      setErrorMessage(error instanceof Error ? error.message : '上传失败');
      setStatus('error');
    } finally {
      setIsUploading(false);
    }
  }, [onHDRUploaded]);

  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-white/60 uppercase tracking-wide">
        自定义 HDR 环境
      </label>
      
      <div className="relative">
        <input
          type="file"
          accept=".hdr,.exr,.jpg,.jpeg,.png"
          onChange={handleFileUpload}
          disabled={isUploading}
          className="hidden"
          id="hdr-upload-input"
        />
        
        <label
          htmlFor="hdr-upload-input"
          className={`
            flex items-center justify-center gap-2 w-full px-4 py-2 
            bg-white/10 border border-white/20 rounded-lg
            text-sm text-white/80 cursor-pointer
            hover:bg-white/15 hover:border-white/30
            transition-all
            ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          {isUploading ? (
            <>
              <div className="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
              <span>压缩中...</span>
            </>
          ) : status === 'success' ? (
            <>
              <span className="text-green-500">✓</span>
              <span>上传成功</span>
            </>
          ) : status === 'error' ? (
            <>
              <span className="text-red-500">⚠</span>
              <span>上传失败</span>
            </>
          ) : (
            <>
              <span>📤</span>
              <span>上传 HDR</span>
            </>
          )}
        </label>
      </div>

      {errorMessage && (
        <p className="text-xs text-red-400">{errorMessage}</p>
      )}

      <p className="text-xs text-white/40">
        支持 .hdr, .exr, .jpg, .png，自动压缩到最优质量
      </p>
    </div>
  );
};

/**
 * 从 Figma 加载 HDR
 */
export const loadHDRFromFigma = (): Promise<string | null> => {
  return new Promise((resolve) => {
    // 监听来自插件后端的消息
    const handleMessage = (event: MessageEvent) => {
      if (event.data.pluginMessage?.type === 'HDR_LOADED') {
        window.removeEventListener('message', handleMessage);
        resolve(event.data.pluginMessage.data);
      }
    };

    window.addEventListener('message', handleMessage);

    // 请求加载 HDR
    parent.postMessage({
      pluginMessage: {
        type: 'LOAD_HDR',
      },
    }, '*');

    // 5秒超时
    setTimeout(() => {
      window.removeEventListener('message', handleMessage);
      resolve(null);
    }, 5000);
  });
};
