/**
 * 🖼️ CraftLargePreview - 工艺大图预览组件
 * 点击缩略图后显示的全屏预览
 */

import { memo, useRef, useEffect, useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import type { CraftType } from '../../types/core';
import { usePreviewData, useAppStore } from '../../store';
import { CraftRenderer } from '../../utils/craftRenderer';
import { globalCraftParams, onParamsChange, resetGlobalCraftParams } from '../../utils/globalCraftParams';

interface Props {
  craftType: CraftType | null;
  onClose: () => void;
}

const craftLabels: Record<string, string> = {
  'HOTFOIL': '烫金',
  'VARNISH': '烫银',
  'UV': 'UV光油',
  'EMBOSS': '凹凸',
  'NORMAL': '法线',
  'TEXTURE': '置换',
};

const craftTypeMap: Record<string, string> = {
  'HOTFOIL': 'hot-stamping-gold',
  'VARNISH': 'hot-stamping-silver',
  'UV': 'uv',
  'EMBOSS': 'emboss',
  'NORMAL': 'normal',
  'TEXTURE': 'displacement',
};

const styles = {
  overlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0, // 覆盖整个视口
    background: 'rgba(0, 0, 0, 0.95)',
    zIndex: 100, // 缩略图 zIndex 需要更高
    display: 'flex',
    flexDirection: 'column' as const,
    padding: '20px',
    pointerEvents: 'auto' as const,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  title: {
    fontSize: '16px',
    fontWeight: 600,
    color: 'rgba(244, 244, 245, 0.95)',
  },
  closeBtn: {
    background: 'rgba(239, 68, 68, 0.2)',
    border: '1px solid rgba(239, 68, 68, 0.4)',
    color: 'rgba(248, 113, 113, 0.95)',
    borderRadius: '8px',
    padding: '8px 16px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 500,
  },
  canvasContainer: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    minHeight: 0, // 关键：防止 flex 子元素撑开容器
    minWidth: 0,
  },
  canvas: {
    display: 'block',
    background: 'rgba(0, 0, 0, 0.3)',
    borderRadius: '8px',
    imageRendering: 'auto' as const,
    maxWidth: 'none',
    maxHeight: 'none',
  },
};

export const CraftLargePreview = memo(function CraftLargePreview({
  craftType,
  onClose,
}: Props) {
  const rendererRef = useRef<CraftRenderer | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafIdRef = useRef<number | null>(null);
  const renderSeqRef = useRef(0);
  const lastCanvasPixelSizeRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 });

  // 获取 sidebarWidth 和 selectedCraftLayerId
  const { sidebarWidth, selectedCraftLayerId } = useAppStore(
    useShallow((s) => ({
      sidebarWidth: s.sidebarWidth,
      selectedCraftLayerId: s.selectedCraftLayerId,
    }))
  );

  // 🚀 性能优化：使用 ref 存储 heightData，不触发重渲染
  const heightDataRef = useRef<{ data: Uint8ClampedArray; width: number; height: number } | null>(null);
  const lastSetHeightDataRef = useRef<{ data: Uint8ClampedArray; width: number; height: number } | null>(null);
  const lastPadRef = useRef(0);

  const downsampleRef = useRef<{
    src: Uint8ClampedArray;
    srcW: number;
    srcH: number;
    data: Uint8ClampedArray;
    width: number;
    height: number;
  } | null>(null);

  const contentBoundsRef = useRef<{
    src: Uint8ClampedArray;
    w: number;
    h: number;
    bounds: { x: number; y: number; width: number; height: number };
  } | null>(null);

  const downsampleCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const paddedRef = useRef<{
    src: Uint8ClampedArray;
    srcW: number;
    srcH: number;
    pad: number;
    data: Uint8ClampedArray;
    width: number;
    height: number;
  } | null>(null);

  // ⚠️ 预览数据目前只稳定缓存 NORMAL 的 heightData；大图也应复用 NORMAL 底图
  const { heightData, width, height } = usePreviewData(selectedCraftLayerId || undefined, 'NORMAL');

  // 关闭/切换时重置内部缓存：组件在 craftType=null 时并不会卸载，ref 会跨次打开复用
  useEffect(() => {
    // 🚀 修复参数污染：切换工艺类型时重置全局参数到默认值
    // 这样每个工艺类型都会使用渲染器的默认参数和缓存，而不是上一个工艺类型的参数
    if (craftType) {
      resetGlobalCraftParams();
    }

    // invalidate in-flight async completions
    renderSeqRef.current++;

    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    // reset sizing so next open re-measures and sets correct pixel size
    lastCanvasPixelSizeRef.current = { w: 0, h: 0 };

    // reset downsample cache and renderer state to avoid cross-open stale bounds/canvases
    downsampleRef.current = null;
    downsampleCanvasRef.current = null;
    renderCanvasRef.current = null;
    lastSetHeightDataRef.current = null;

    // recreate renderer on next open to avoid cache pollution
    rendererRef.current = null;
  }, [craftType]);

  // 🚀 命令式渲染函数（参考原版 renderCraftLargePreview）
  const renderPreview = useCallback(() => {
    if (!rendererRef.current) rendererRef.current = new CraftRenderer();
    const renderer = rendererRef.current;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !craftType || !heightDataRef.current) {
      return;
    }

    const seq = ++renderSeqRef.current;

    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;
      const containerRect = container.getBoundingClientRect();
      const containerWidth = containerRect.width;
      const containerHeight = containerRect.height;

      if (!(containerWidth > 0 && containerHeight > 0)) return;

      const { data: heightData, width, height } = heightDataRef.current!;

      const renderType = craftTypeMap[craftType] || craftType.toLowerCase();

      canvas.style.width = '100%';
      canvas.style.height = '100%';

      const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      const nextPixelW = Math.max(1, Math.round(containerWidth * dpr));
      const nextPixelH = Math.max(1, Math.round(containerHeight * dpr));
      if (lastCanvasPixelSizeRef.current.w !== nextPixelW || lastCanvasPixelSizeRef.current.h !== nextPixelH) {
        lastCanvasPixelSizeRef.current = { w: nextPixelW, h: nextPixelH };
        canvas.width = nextPixelW;
        canvas.height = nextPixelH;
      }

      // Downsample for preview quality/perf
      // UV 大图参数拖动需要更即时：限制工作分辨率，避免卡顿。
      const maxDim = renderType === 'uv' ? 512 : 1024;
      const scale = Math.min(1, maxDim / Math.max(width, height));

      let dsData = heightData;
      let dsWidth = width;
      let dsHeight = height;

      if (scale < 1) {
        const cached = downsampleRef.current;
        if (cached && cached.src === heightData && cached.srcW === width && cached.srcH === height) {
          dsData = cached.data;
          dsWidth = cached.width;
          dsHeight = cached.height;
        } else {
          dsWidth = Math.max(1, Math.round(width * scale));
          dsHeight = Math.max(1, Math.round(height * scale));

          const srcCanvas = downsampleCanvasRef.current ?? document.createElement('canvas');
          downsampleCanvasRef.current = srcCanvas;
          srcCanvas.width = width;
          srcCanvas.height = height;
          const sctx = srcCanvas.getContext('2d');
          if (sctx) {
            const srcImg = new ImageData(new Uint8ClampedArray(heightData), width, height);
            sctx.putImageData(srcImg, 0, 0);

            const dstCanvas = renderCanvasRef.current ?? document.createElement('canvas');
            renderCanvasRef.current = dstCanvas;
            dstCanvas.width = dsWidth;
            dstCanvas.height = dsHeight;
            const dctx = dstCanvas.getContext('2d');
            if (dctx) {
              dctx.imageSmoothingEnabled = true;
              dctx.imageSmoothingQuality = 'high';
              dctx.clearRect(0, 0, dsWidth, dsHeight);
              dctx.drawImage(srcCanvas, 0, 0, dsWidth, dsHeight);
              const out = dctx.getImageData(0, 0, dsWidth, dsHeight);
              dsData = out.data;
              downsampleRef.current = {
                src: heightData,
                srcW: width,
                srcH: height,
                data: dsData,
                width: dsWidth,
                height: dsHeight,
              };
            }
          }
        }
      }

      // Compute content bounds from the ORIGINAL (unpadded) downsampled data.
      // This ensures centering is based on the actual vector, not on transparent padding.
      let contentBounds = contentBoundsRef.current;
      if (!contentBounds || contentBounds.src !== dsData || contentBounds.w !== dsWidth || contentBounds.h !== dsHeight) {
        let minX = dsWidth;
        let minY = dsHeight;
        let maxX = -1;
        let maxY = -1;
        const step = 4; // sample every 4 pixels for speed
        for (let y = 0; y < dsHeight; y += step) {
          let idx = (y * dsWidth) << 2;
          for (let x = 0; x < dsWidth; x += step) {
            const a = dsData[idx + 3];
            if (a >= 16) {
              if (x < minX) minX = x;
              if (y < minY) minY = y;
              if (x > maxX) maxX = x;
              if (y > maxY) maxY = y;
            }
            idx += step * 4;
          }
        }
        const bounds = (maxX >= 0 && maxY >= 0)
          ? { x: minX, y: minY, width: Math.max(1, maxX - minX + 1), height: Math.max(1, maxY - minY + 1) }
          : { x: 0, y: 0, width: dsWidth, height: dsHeight };
        contentBounds = { src: dsData, w: dsWidth, h: dsHeight, bounds };
        contentBoundsRef.current = contentBounds;
      }

      // 🚀 只在 heightData 真正变化时调用 setHeightData
      const needsSetHeight = !lastSetHeightDataRef.current ||
        lastSetHeightDataRef.current.data !== dsData ||
        lastSetHeightDataRef.current.width !== dsWidth ||
        lastSetHeightDataRef.current.height !== dsHeight;

      const edge = typeof (globalCraftParams as any).edgeSoftness === 'number' ? (globalCraftParams as any).edgeSoftness : 0;
      const blur = typeof (globalCraftParams as any).blurStrength === 'number'
        ? (globalCraftParams as any).blurStrength
        : (typeof (globalCraftParams as any).blur === 'number' ? (globalCraftParams as any).blur : 0);
      const pad = Math.max(0, Math.min(128, Math.ceil(Math.max(edge, blur) * 4 + 16)));

      if (needsSetHeight || lastPadRef.current !== pad) {
        lastPadRef.current = pad;

        let paddedData = dsData;
        let paddedW = dsWidth;
        let paddedH = dsHeight;
        if (pad > 0) {
          const cachedPad = paddedRef.current;
          if (cachedPad && cachedPad.src === dsData && cachedPad.srcW === dsWidth && cachedPad.srcH === dsHeight && cachedPad.pad === pad) {
            paddedData = cachedPad.data;
            paddedW = cachedPad.width;
            paddedH = cachedPad.height;
          } else {
            paddedW = dsWidth + pad * 2;
            paddedH = dsHeight + pad * 2;
            const out = new Uint8ClampedArray(paddedW * paddedH * 4);
            for (let y = 0; y < dsHeight; y++) {
              const srcRow = y * dsWidth * 4;
              const dstRow = (y + pad) * paddedW * 4 + pad * 4;
              out.set(dsData.subarray(srcRow, srcRow + dsWidth * 4), dstRow);
            }
            paddedData = out;
            paddedRef.current = {
              src: dsData,
              srcW: dsWidth,
              srcH: dsHeight,
              pad,
              data: out,
              width: paddedW,
              height: paddedH,
            };
          }
        }

        renderer.setHeightData(paddedData, paddedW, paddedH);
        lastSetHeightDataRef.current = { data: paddedData, width: paddedW, height: paddedH };
      }

      // Render to downsampled working resolution, then scale up once
      const tempCanvas = renderCanvasRef.current ?? document.createElement('canvas');
      renderCanvasRef.current = tempCanvas;
      const active = lastSetHeightDataRef.current;
      const workW = active?.width ?? dsWidth;
      const workH = active?.height ?? dsHeight;
      if (tempCanvas.width !== workW) tempCanvas.width = workW;
      if (tempCanvas.height !== workH) tempCanvas.height = workH;

      // 传空对象，让渲染器使用默认参数和缓存（避免异步竞争导致黑屏）
      // 参数变化通过 onParamsChange 回调触发重新渲染整个函数
      void (async () => {
        try {
          await renderer.renderLargePreviewRaw(tempCanvas, renderType, globalCraftParams);
          // latest-frame-wins: drop stale async completions to prevent flicker/back-in-time swaps
          if (renderSeqRef.current !== seq) return;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            // 把背景“烘焙”进 tempCanvas 自身：所有紫色/黑色都属于贴图像素，而不是外层 fillRect。
            // 使用 destination-over，不做逐像素 get/put（避免 UV 参数拖动严重滞后）。
            const tctx = tempCanvas.getContext('2d');
            if (tctx) {
              tctx.save();
              tctx.globalCompositeOperation = 'destination-over';
              if (renderType === 'normal') {
                tctx.fillStyle = 'rgb(128, 128, 255)';
              } else {
                tctx.fillStyle = 'rgb(0, 0, 0)';
              }
              tctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
              tctx.restore();
            }

            // 先完整显示（contain），再缩小 15% 作为外扩预览余量（避免放大导致原 vector 被切掉）。
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const sw = tempCanvas.width;
            const sh = tempCanvas.height;

            // Center the ACTUAL vector content (alpha bounds), not the image frame.
            // Also ensure a constant 15% margin for expansion.
            const insetScale = 0.85;
            // 🛡️ 安全检查：contentBounds 可能为 null
            const b = contentBounds?.bounds ?? { x: 0, y: 0, width: sw, height: sh };
            const scaleToFitContent = Math.min(canvas.width / b.width, canvas.height / b.height) * insetScale;

            const dw = sw * scaleToFitContent;
            const dh = sh * scaleToFitContent;

            const cx = b.x + b.width * 0.5;
            const cy = b.y + b.height * 0.5;
            const dx = canvas.width * 0.5 - (cx + pad) * scaleToFitContent;
            const dy = canvas.height * 0.5 - (cy + pad) * scaleToFitContent;

            ctx.drawImage(tempCanvas, 0, 0, sw, sh, dx, dy, dw, dh);
          }
        } catch (e) {
          console.error('[CraftLargePreview] renderThumbnail error:', e);
        }
      })();
    });
  }, [craftType]);

  // 监听容器尺寸变化：避免打开预览时测量到 0/小尺寸导致 canvas 永久很小
  useEffect(() => {
    if (!craftType) return;
    const el = containerRef.current;
    if (!el) return;

    let rid: number | null = null;
    const ro = new ResizeObserver(() => {
      if (rid !== null) cancelAnimationFrame(rid);
      rid = requestAnimationFrame(() => {
        rid = null;
        renderPreview();
      });
    });
    ro.observe(el);

    return () => {
      if (rid !== null) cancelAnimationFrame(rid);
      ro.disconnect();
    };
  }, [craftType, renderPreview]);

  // 🚀 更新 heightData ref，并在 heightData 加载完成时触发首次渲染
  useEffect(() => {
    if (heightData && width > 0 && height > 0) {
      const wasNull = heightDataRef.current === null;
      heightDataRef.current = { data: heightData, width, height };
      // ✅ 修复：如果 heightData 刚加载完成，立即触发渲染
      if (wasNull && craftType) {
        renderPreview();
      }
    }
  }, [heightData, width, height, craftType, renderPreview]);

  // 🚀 订阅全局参数变化（参考原版 updateUVSettings）- 使用 debounce 减少闪烁
  useEffect(() => {
    if (!craftType) return;

    let rafId: number | null = null;
    const unsubscribe = onParamsChange(() => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        rafId = null;
        renderPreview();
      });
    });

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      unsubscribe();
    };
  }, [craftType, renderPreview]);

  // 🚀 初始渲染和 craftType/heightData 变化时渲染
  // ✅ 修复：即使 heightData 相同（NORMAL底图），切换烫金/烫银也要触发重新渲染
  useEffect(() => {
    if (craftType && heightDataRef.current) {
      renderPreview();
    }
  }, [craftType, renderPreview]);

  // 清理
  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      // ⚠️ 不清除尺寸缓存！让ResizeObserver在组件重新挂载时重新测量
      // lastCanvasPixelSizeRef.current = { w: 0, h: 0 };
    };
  }, []);

  // 🛡️ 安全检查：没有工艺类型时不渲染
  if (!craftType) return null;

  // 🛡️ 安全检查：没有选中图层时不渲染（避免首次启动崩溃）
  if (!selectedCraftLayerId) return null;

  // 动态计算 overlay 样式，排除右侧面板宽度
  const overlayStyle = {
    ...styles.overlay,
    right: sidebarWidth, // 不覆盖右侧面板区域
  };

  // 🛡️ 显示加载状态：heightData 未加载时显示加载提示
  const isLoading = !heightData || width === 0 || height === 0;

  return (
    <div style={overlayStyle}>
      <div style={styles.header}>
        <span style={styles.title}>
          {craftLabels[craftType] || craftType} - 工艺预览
          {isLoading && ' (加载中...)'}
        </span>
        <button
          type="button"
          style={styles.closeBtn}
          onClick={onClose}
        >
          ✕ 关闭
        </button>
      </div>
      <div ref={containerRef} style={styles.canvasContainer}>
        <canvas ref={canvasRef} style={styles.canvas} />
      </div>
    </div>
  );
});
