/**
 * 🎨 CraftPreviewCanvas - 工艺预览画布组件
 * 显示实时工艺效果预览
 */

import { memo, useRef, useEffect } from 'react';
import { usePreviewData, usePreviewImageUrl, useCraftParams, useAppStore } from '../../store';
import { craftRenderer } from '../../utils/craftRenderer';

interface Props {
  craftType?: string;
  width?: number;
  height?: number;
  className?: string;
}

export const CraftPreviewCanvas = memo(function CraftPreviewCanvas({
  craftType,
  width = 200,
  height = 200,
  className = '',
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastHeightDataRef = useRef<Uint8ClampedArray | null>(null);
  const lastSizeRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 });
  const lastCanvasSizeRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 });
  const rafRef = useRef<number | null>(null);
  const renderEpochRef = useRef(0);
  const selectedCraftLayerId = useAppStore((state) => state.selectedCraftLayerId);
  const { type: activeCraftType, params } = useCraftParams();
  // ⚠️ 预览数据目前只稳定缓存 NORMAL 的 heightData；面板预览也应复用 NORMAL 底图
  const { heightData, width: dataWidth, height: dataHeight } = usePreviewData(
    selectedCraftLayerId || undefined,
    'NORMAL'
  );

  const { url: previewUrl } = usePreviewImageUrl(selectedCraftLayerId || undefined, 'NORMAL');

  const currentCraftType = craftType || activeCraftType;

  // 仅当底图数据变化时更新渲染器（避免滑条拖动时反复 O(w*h) 扫描 + 清缓存）
  useEffect(() => {
    if (!heightData || dataWidth <= 0 || dataHeight <= 0) return;
    const sizeChanged = lastSizeRef.current.w !== dataWidth || lastSizeRef.current.h !== dataHeight;
    const dataChanged = lastHeightDataRef.current !== heightData;
    if (!sizeChanged && !dataChanged) return;
    lastHeightDataRef.current = heightData;
    lastSizeRef.current = { w: dataWidth, h: dataHeight };
    craftRenderer.setHeightData(heightData, dataWidth, dataHeight);
  }, [heightData, dataWidth, dataHeight]);

  // 当参数变化时渲染（合并到下一帧，避免 requestAnimationFrame handler 超时刷屏）
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Any scheduled render should invalidate pending base-image onload draws.
    renderEpochRef.current++;

    // 设置画布尺寸（仅在变化时设置，避免每次参数变化清空导致闪烁）
    if (lastCanvasSizeRef.current.w !== width || lastCanvasSizeRef.current.h !== height) {
      lastCanvasSizeRef.current = { w: width, h: height };
      canvas.width = width;
      canvas.height = height;
    }

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      void craftRenderer
        .renderThumbnail(canvas, currentCraftType.toLowerCase(), params)
        .catch((e) => {
          console.error('❌ [CraftPreviewCanvas] renderThumbnail error:', e);
        });
    });

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [heightData, dataWidth, dataHeight, currentCraftType, params, width, height]);

  // 快速底图：有损压缩的 objectURL 可在 heightData 尚未解码时先显示
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!previewUrl) return;
    // 如果已经有 heightData，说明“可计算底图”已就绪，交给 renderer 覆盖即可
    if (heightData && dataWidth > 0 && dataHeight > 0) return;

    const epochAtStart = renderEpochRef.current;

    let canceled = false;
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      if (canceled) return;
      // If a renderer pass has been scheduled since we started, don't overwrite it.
      if (renderEpochRef.current !== epochAtStart) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // contain
      const cw = canvas.width || width;
      const ch = canvas.height || height;
      const iw = img.naturalWidth || 1;
      const ih = img.naturalHeight || 1;
      const s = Math.min(cw / iw, ch / ih);
      const dw = Math.max(1, Math.round(iw * s));
      const dh = Math.max(1, Math.round(ih * s));
      const dx = Math.round((cw - dw) * 0.5);
      const dy = Math.round((ch - dh) * 0.5);

      ctx.clearRect(0, 0, cw, ch);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, iw, ih, dx, dy, dw, dh);
    };
    img.src = previewUrl;

    return () => {
      canceled = true;
    };
  }, [previewUrl, heightData, dataWidth, dataHeight, width, height]);

  return (
    <canvas
      ref={canvasRef}
      className={`craft-preview-canvas ${className}`}
      style={{
        display: 'block',
        width: `${width}px`,
        height: `${height}px`,
        borderRadius: '4px',
        background: 'rgba(0, 0, 0, 0.3)',
      }}
    />
  );
});
