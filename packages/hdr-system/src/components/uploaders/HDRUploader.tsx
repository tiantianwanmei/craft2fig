// ============================================================================
// HDR UPLOADER - HDR 本地上传、压缩、存储到 Figma
// ============================================================================
// 解决 Figma 不支持大图 HDR 导入的问题

import React, { useState, useCallback } from 'react';
import { Button } from '../ui/Button';

// 简单的图标组件
const Upload = () => <span className="text-lg">📤</span>;
const Check = () => <span className="text-green-500 text-lg">✓</span>;
const AlertCircle = () => <span className="text-red-500 text-lg">⚠</span>;

interface HDRUploaderProps {
  onHDRUploaded: (dataUrl: string) => void;
}

/**
 * HDR 上传器
 * 
 * 功能：
 * 1. 选择本地 HDR 文件
 * 2. 压缩到适合插件使用的大小
 * 3. 转换为 base64 存储到 Figma
 * 4. 下次直接从 Figma 读取
 */
export const HDRUploader: React.FC<HDRUploaderProps> = ({ onHDRUploaded }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  /**
   * 压缩图片
   * 将 HDR 压缩到最高质量但适合插件的大小
   */
  const compressImage = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // 创建 canvas 进行压缩
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            reject(new Error('无法创建 canvas context'));
            return;
          }

          // 计算压缩后的尺寸（最大 1024x512，保持宽高比）
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

          // 绘制并压缩
          ctx.drawImage(img, 0, 0, width, height);
          
          // 转换为 base64（JPEG 格式，质量 0.9）
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
   * 保存到 Figma
   */
  const saveToFigma = async (dataUrl: string) => {
    try {
      // 发送到 Figma 插件
      parent.postMessage({
        pluginMessage: {
          type: 'SAVE_HDR',
          data: dataUrl,
        },
      }, '*');

      // 同时保存到 localStorage 作为备份
      localStorage.setItem('genki-hdr-backup', dataUrl);
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
    if (!validTypes.some(type => file.type.includes(type)) && 
        !file.name.match(/\.(hdr|exr|jpg|jpeg|png)$/i)) {
      setErrorMessage('请选择有效的 HDR 图片文件 (.hdr, .exr, .jpg, .png)');
      setUploadStatus('error');
      return;
    }

    setIsUploading(true);
    setUploadStatus('idle');
    setErrorMessage('');

    try {
      // 压缩图片
      const compressedDataUrl = await compressImage(file);
      
      // 保存到 Figma
      await saveToFigma(compressedDataUrl);
      
      // 通知父组件
      onHDRUploaded(compressedDataUrl);
      
      setUploadStatus('success');
      setTimeout(() => setUploadStatus('idle'), 3000);
    } catch (error) {
      console.error('HDR 上传失败:', error);
      setErrorMessage(error instanceof Error ? error.message : '上传失败');
      setUploadStatus('error');
    } finally {
      setIsUploading(false);
    }
  }, [onHDRUploaded]);

  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide">
        自定义 HDR 环境
      </label>
      
      <div className="relative">
        <input
          type="file"
          accept=".hdr,.exr,.jpg,.jpeg,.png"
          onChange={handleFileUpload}
          disabled={isUploading}
          className="hidden"
          id="hdr-upload"
        />
        
        <label htmlFor="hdr-upload">
          <Button
            variant="outline"
            size="sm"
            className="w-full cursor-pointer"
            disabled={isUploading}
            asChild
          >
            <div className="flex items-center justify-center gap-2">
              {isUploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                  <span>压缩中...</span>
                </>
              ) : uploadStatus === 'success' ? (
                <>
                  <Check className="w-4 h-4 text-green-500" />
                  <span>上传成功</span>
                </>
              ) : uploadStatus === 'error' ? (
                <>
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <span>上传失败</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>上传 HDR</span>
                </>
              )}
            </div>
          </Button>
        </label>
      </div>

      {errorMessage && (
        <p className="text-xs text-red-400">{errorMessage}</p>
      )}

      <p className="text-xs text-gray-500">
        支持 .hdr, .exr, .jpg, .png 格式，自动压缩到最优质量
      </p>
    </div>
  );
};

/**
 * 从 Figma 加载 HDR
 */
export const loadHDRFromFigma = (): string | null => {
  try {
    // 优先从 localStorage 读取
    const backup = localStorage.getItem('genki-hdr-backup');
    if (backup) return backup;

    // TODO: 从 Figma pluginData 读取
    return null;
  } catch (error) {
    console.error('加载 HDR 失败:', error);
    return null;
  }
};
