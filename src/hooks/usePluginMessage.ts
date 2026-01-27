/**
 * 📨 usePluginMessage - 类型安全的消息通信 Hook
 * UI ↔ Plugin Sandbox 双向通信
 */

import { useCallback, useEffect, useRef } from 'react';
import { useAppStore } from '../store';
import type { UIMessage, PluginMessage, PluginMessageType } from '../types/messages';
import { autoInferFoldSequence } from '../utils/foldLogic';
import { occlusionComputeClient } from '../workers/occlusionComputeClient';
import { cropComputeClient } from '../workers/cropComputeClient';
import { foldInferComputeClient } from '../workers/foldInferComputeClient';

type MessageHandler<T extends PluginMessage = PluginMessage> = (message: T) => void;

interface UsePluginMessageOptions {
  onMessage?: MessageHandler;
  handlers?: Partial<Record<PluginMessageType, MessageHandler>>;
}

function toHeightMapRGBA(src: Uint8ClampedArray): Uint8ClampedArray {
  return src;
}

function downloadJsonFile(data: any, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

const processedUnifiedExportIds = new Set<string>();

let cachedUnifiedExportDirHandle: any | null = null;

async function pickUnifiedExportDirectoryOnce(): Promise<boolean> {
  const dirPicker = (window as any).showDirectoryPicker as undefined | (() => Promise<any>);
  if (!dirPicker) return false;
  if (cachedUnifiedExportDirHandle) return true;
  try {
    cachedUnifiedExportDirHandle = await dirPicker();
    return Boolean(cachedUnifiedExportDirHandle);
  } catch (_e) {
    cachedUnifiedExportDirHandle = null;
    return false;
  }
}

async function saveUnifiedExportToDirectory(data: any, baseName: string) {
  const dir = cachedUnifiedExportDirHandle;
  if (!dir) return false;
  const jsonHandle = await dir.getFileHandle(`${baseName}.json`, { create: true });
  const jsonWritable = await jsonHandle.createWritable();
  await jsonWritable.write(JSON.stringify(data, null, 2));
  await jsonWritable.close();

  const masks = Array.isArray(data.masks) ? data.masks : [];
  if (masks.length > 0) {
    const masksDir = await dir.getDirectoryHandle(`${baseName}_masks`, { create: true });
    const seen = new Set<string>();
    for (const m of masks) {
      if (!m || typeof m.texture !== 'string') continue;
      const craft = String(m.craftType || 'mask');
      const id = String(m.id || 'unknown');
      const key = `${craft}|${id}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const fileHandle = await masksDir.getFileHandle(`${craft}_${id}.png`, { create: true });
      const writable = await fileHandle.createWritable();
      const resp = await fetch(m.texture);
      const blob = await resp.blob();
      await writable.write(blob);
      await writable.close();
    }
  }
  return true;
}

// 获取稳定的 store actions（不订阅状态变化）
const getStoreActions = () => useAppStore.getState();

const latestOcclusionRequestIdByLayer = new Map<string, number>();

const processedOcclusionRequestIdByLayer = new Map<string, number>();
const occlusionPreviewBlobUrlByLayer = new Map<string, string>();
const occlusionLockUntilByLayer = new Map<string, number>();

const latestNormalPreviewSeqByLayer = new Map<string, number>();
let nextNormalPreviewSeq = 1;

type LossyPreviewResult = { url: string; width: number; height: number } | null;

async function encodeLossyPreviewFromPng(
  pngBytes: Uint8Array,
  width: number,
  height: number,
  options?: { maxSide?: number }
): Promise<LossyPreviewResult> {
  const maxSide = typeof options?.maxSide === 'number' ? options.maxSide : 1024;

  const bytes = new Uint8Array(pngBytes);
  const blob = new Blob([bytes], { type: 'image/png' });

  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(blob);
  } catch (_e) {
    bitmap = null;
  }

  if (!bitmap) return null;

  const srcW = Math.max(1, bitmap.width || width);
  const srcH = Math.max(1, bitmap.height || height);
  const scale = Math.min(1, maxSide / Math.max(srcW, srcH));
  const dstW = Math.max(1, Math.round(srcW * scale));
  const dstH = Math.max(1, Math.round(srcH * scale));

  let canvas: OffscreenCanvas | HTMLCanvasElement;
  let ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D | null = null;
  if (typeof (globalThis as any).OffscreenCanvas !== 'undefined') {
    canvas = new (globalThis as any).OffscreenCanvas(dstW, dstH) as OffscreenCanvas;
    ctx = canvas.getContext('2d', { alpha: true } as any) as OffscreenCanvasRenderingContext2D | null;
  } else {
    const c = document.createElement('canvas');
    c.width = dstW;
    c.height = dstH;
    canvas = c;
    ctx = c.getContext('2d', { alpha: true } as any) as CanvasRenderingContext2D | null;
  }

  if (!ctx) {
    try {
      bitmap.close();
    } catch (_e) {
      // ignore
    }
    return null;
  }

  ctx.drawImage(bitmap as any, 0, 0, dstW, dstH);
  try {
    bitmap.close();
  } catch (_e) {
    // ignore
  }

  const toBlob = async (type: string, quality?: number): Promise<Blob | null> => {
    try {
      if ('convertToBlob' in canvas) {
        return await (canvas as OffscreenCanvas).convertToBlob({ type, quality } as any);
      }
      return await new Promise<Blob | null>((resolve) => {
        (canvas as HTMLCanvasElement).toBlob((b) => resolve(b), type, quality);
      });
    } catch (_e) {
      return null;
    }
  };

  // Prefer AVIF, then WebP, then JPEG (lossy) as last resort.
  const avif = await toBlob('image/avif');
  const webp = avif ? null : await toBlob('image/webp', 0.72);
  const jpg = avif || webp ? null : await toBlob('image/jpeg', 0.72);
  const out = avif || webp || jpg;
  if (!out) return null;

  const url = URL.createObjectURL(out);
  return { url, width: dstW, height: dstH };
}

async function encodeLossyPreviewFromRgba(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  options?: { maxSide?: number }
): Promise<LossyPreviewResult> {
  const maxSide = typeof options?.maxSide === 'number' ? options.maxSide : 1024;
  const srcW = Math.max(1, width);
  const srcH = Math.max(1, height);
  const scale = Math.min(1, maxSide / Math.max(srcW, srcH));
  const dstW = Math.max(1, Math.round(srcW * scale));
  const dstH = Math.max(1, Math.round(srcH * scale));

  let canvas: OffscreenCanvas | HTMLCanvasElement;
  let ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D | null = null;
  if (typeof (globalThis as any).OffscreenCanvas !== 'undefined') {
    canvas = new (globalThis as any).OffscreenCanvas(dstW, dstH) as OffscreenCanvas;
    ctx = canvas.getContext('2d', { alpha: true } as any) as OffscreenCanvasRenderingContext2D | null;
  } else {
    const c = document.createElement('canvas');
    c.width = dstW;
    c.height = dstH;
    canvas = c;
    ctx = c.getContext('2d', { alpha: true } as any) as CanvasRenderingContext2D | null;
  }
  if (!ctx) return null;

  if (dstW === srcW && dstH === srcH) {
    const img = new ImageData(new Uint8ClampedArray(rgba), srcW, srcH);
    (ctx as any).putImageData(img, 0, 0);
  } else {
    const srcCanvas = document.createElement('canvas');
    srcCanvas.width = srcW;
    srcCanvas.height = srcH;
    const sctx = srcCanvas.getContext('2d');
    if (!sctx) return null;
    sctx.putImageData(new ImageData(new Uint8ClampedArray(rgba), srcW, srcH), 0, 0);
    (ctx as any).imageSmoothingEnabled = true;
    (ctx as any).imageSmoothingQuality = 'high';
    (ctx as any).drawImage(srcCanvas, 0, 0, dstW, dstH);
  }

  const toBlob = async (type: string, quality?: number): Promise<Blob | null> => {
    try {
      if ('convertToBlob' in canvas) {
        return await (canvas as OffscreenCanvas).convertToBlob({ type, quality } as any);
      }
      return await new Promise<Blob | null>((resolve) => {
        (canvas as HTMLCanvasElement).toBlob((b) => resolve(b), type, quality);
      });
    } catch (_e) {
      return null;
    }
  };

  const avif = await toBlob('image/avif');
  const webp = avif ? null : await toBlob('image/webp', 0.72);
  const jpg = avif || webp ? null : await toBlob('image/jpeg', 0.72);
  const out = avif || webp || jpg;
  if (!out) return null;
  const url = URL.createObjectURL(out);
  return { url, width: dstW, height: dstH };
}

function scheduleIdle(task: () => void): void {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    (window as any).requestIdleCallback(task, { timeout: 250 });
    return;
  }
  setTimeout(task, 0);
}

const latestSavedVectorsSeqByFrame = new Map<string, number>();
const loggedSavedVectorsSvgByFrame = new Set<string>();
let nextSavedVectorsSeq = 1;

type CropVectorInput = {
  id: string;
  cropX?: number;
  cropY?: number;
  cropWidth?: number;
  cropHeight?: number;
  width?: number;
  height?: number;
};

type CropJobArgs = {
  frameImage: string;
  frameWidth: number;
  frameHeight: number;
  vectors: CropVectorInput[];
};

type CropJobState = {
  inFlight: Promise<
    | {
        croppedTextures: Record<string, Uint8Array>;
        shapeMasks: Record<string, Uint8Array>;
        edgeMasksMap: Record<string, { top: Uint8Array; bottom: Uint8Array; left: Uint8Array; right: Uint8Array }>;
      }
    | null
  > | null;
  queued: { seq: number; args: CropJobArgs } | null;
};

const cropJobByFrame = new Map<string, CropJobState>();

const hashCropArgs = (args: CropJobArgs): number => {
  let h = 2166136261;
  const mix = (n: number) => {
    h ^= n;
    h = Math.imul(h, 16777619);
  };
  mix(args.frameWidth | 0);
  mix(args.frameHeight | 0);
  mix(args.frameImage.length | 0);
  mix(args.vectors.length | 0);
  for (const v of args.vectors) {
    const id = String(v.id);
    for (let i = 0; i < id.length; i++) mix(id.charCodeAt(i));
    mix((v.cropX ?? 0) | 0);
    mix((v.cropY ?? 0) | 0);
    mix((v.cropWidth ?? v.width ?? 0) | 0);
    mix((v.cropHeight ?? v.height ?? 0) | 0);
  }
  return h >>> 0;
};

const submitCropFromFrameLatest = async (frameKey: string, seq: number, args: CropJobArgs) => {
  const latestSeq = latestSavedVectorsSeqByFrame.get(frameKey);
  if (latestSeq !== seq) return null;

  const state = cropJobByFrame.get(frameKey) ?? { inFlight: null, queued: null };
  cropJobByFrame.set(frameKey, state);

  const start = (startSeq: number, startArgs: CropJobArgs) => {
    const jobKey = `frameCrop:${frameKey}`;
    const expectedHash = hashCropArgs(startArgs);
    state.inFlight = (async () => {
      const latestBefore = latestSavedVectorsSeqByFrame.get(frameKey);
      if (latestBefore !== startSeq) return null;
      const res = await cropComputeClient.cropFromFrame(
        jobKey,
        startArgs.frameImage,
        startArgs.frameWidth,
        startArgs.frameHeight,
        startArgs.vectors
      );
      const latestAfter = latestSavedVectorsSeqByFrame.get(frameKey);
      if (latestAfter !== startSeq) return null;

      const currentHash = hashCropArgs(startArgs);
      if (currentHash !== expectedHash) return null;
      return res;
    })();

    void state.inFlight.finally(() => {
      state.inFlight = null;
      const queued = state.queued;
      state.queued = null;
      if (!queued) return;
      const latestNow = latestSavedVectorsSeqByFrame.get(frameKey);
      if (latestNow !== queued.seq) return;
      start(queued.seq, queued.args);
    });

    return state.inFlight;
  };

  if (state.inFlight) {
    state.queued = { seq, args };
    return state.inFlight;
  }

  return start(seq, args);
};

// 过滤掉被其他图层完全包含的嵌套图层（与 ViewportArea 中的逻辑一致）
function filterNestedLayers(layers: any[]): any[] {
  if (!layers || layers.length <= 1) return layers;

  const getBounds = (v: any) => {
    const x = v.x ?? v.bounds?.x ?? 0;
    const y = v.y ?? v.bounds?.y ?? 0;
    const width = v.width ?? v.bounds?.width ?? 0;
    const height = v.height ?? v.bounds?.height ?? 0;
    return { x, y, width, height, area: width * height };
  };

  const contains = (a: any, b: any, tolerance = 2): boolean => {
    const ax = a.x ?? a.bounds?.x ?? 0;
    const ay = a.y ?? a.bounds?.y ?? 0;
    const aw = a.width ?? a.bounds?.width ?? 0;
    const ah = a.height ?? a.bounds?.height ?? 0;
    const bx = b.x ?? b.bounds?.x ?? 0;
    const by = b.y ?? b.bounds?.y ?? 0;
    const bw = b.width ?? b.bounds?.width ?? 0;
    const bh = b.height ?? b.bounds?.height ?? 0;

    return (
      ax - tolerance <= bx &&
      ay - tolerance <= by &&
      ax + aw + tolerance >= bx + bw &&
      ay + ah + tolerance >= by + bh &&
      aw * ah > bw * bh * 1.1
    );
  };

  const items = layers
    .map((layer) => {
      const b = getBounds(layer);
      return { layer, ...b };
    })
    .sort((a, b) => b.area - a.area);

  const cellSize = 256;
  const grid = new Map<string, any[]>();
  const keyOf = (cx: number, cy: number) => `${cx}|${cy}`;
  const addToGrid = (it: any) => {
    const minX = Math.floor(it.x / cellSize);
    const minY = Math.floor(it.y / cellSize);
    const maxX = Math.floor((it.x + it.width) / cellSize);
    const maxY = Math.floor((it.y + it.height) / cellSize);
    for (let gx = minX; gx <= maxX; gx++) {
      for (let gy = minY; gy <= maxY; gy++) {
        const k = keyOf(gx, gy);
        const arr = grid.get(k);
        if (arr) {
          arr.push(it.layer);
        } else {
          grid.set(k, [it.layer]);
        }
      }
    }
  };

  const queryGrid = (it: any) => {
    const minX = Math.floor(it.x / cellSize);
    const minY = Math.floor(it.y / cellSize);
    const maxX = Math.floor((it.x + it.width) / cellSize);
    const maxY = Math.floor((it.y + it.height) / cellSize);
    const out: any[] = [];
    const seen = new Set<any>();
    for (let gx = minX; gx <= maxX; gx++) {
      for (let gy = minY; gy <= maxY; gy++) {
        const arr = grid.get(keyOf(gx, gy));
        if (!arr) continue;
        for (const v of arr) {
          if (seen.has(v)) continue;
          seen.add(v);
          out.push(v);
        }
      }
    }
    return out;
  };

  const keptIds = new Set<string>();

  for (const it of items) {
    const candidates = queryGrid(it);
    let contained = false;
    for (const other of candidates) {
      if (other.id === it.layer.id) continue;
      if (contains(other, it.layer)) {
        contained = true;
        break;
      }
    }
    if (!contained) {
      if (typeof it.layer?.id === 'string') keptIds.add(it.layer.id);
      addToGrid(it);
    }
  }

  return layers.filter((v) => typeof v?.id === 'string' && keptIds.has(v.id));
}

// PNG 解码函数 - 将 PNG 字节数据解码为 RGBA 像素数据
// ✅ 优化：使用 requestIdleCallback 避免阻塞主线程
async function decodePNGAndSetPreview(
  pngBytes: Uint8Array,
  callback: (data: Uint8ClampedArray, width: number, height: number) => void
) {
  // Ensure backing buffer is ArrayBuffer (BlobPart typing dislikes SharedArrayBuffer)
  const bytes = new Uint8Array(pngBytes);
  const blob = new Blob([bytes], { type: 'image/png' });
  const bitmap = await createImageBitmap(blob);

  const width = bitmap.width;
  const height = bitmap.height;

  let ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D | null = null;
  let canvas: OffscreenCanvas | HTMLCanvasElement | null = null;

  if (typeof (globalThis as any).OffscreenCanvas !== 'undefined') {
    canvas = new (globalThis as any).OffscreenCanvas(width, height) as OffscreenCanvas;
    ctx = canvas.getContext('2d', { willReadFrequently: true } as any) as OffscreenCanvasRenderingContext2D | null;
  } else {
    canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    ctx = canvas.getContext('2d', { willReadFrequently: true } as any) as CanvasRenderingContext2D | null;
  }

  if (!ctx || !canvas) {
    try {
      bitmap.close();
    } catch (_e) {
      // ignore
    }
    return;
  }

  ctx.drawImage(bitmap as any, 0, 0);
  try {
    bitmap.close();
  } catch (_e) {
    // ignore
  }

  const run = () => {
    const imageData = (ctx as any).getImageData(0, 0, width, height) as ImageData;
    callback(imageData.data, width, height);
  };

  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(run, { timeout: 300 });
  } else {
    setTimeout(run, 0);
  }
}

export function usePluginMessage(options: UsePluginMessageOptions = {}) {
  const { onMessage, handlers } = options;
  const handlersRef = useRef(handlers);
  const onMessageRef = useRef(onMessage);
  handlersRef.current = handlers;
  onMessageRef.current = onMessage;

  // 发送消息到 Plugin
  const sendMessage = useCallback((message: UIMessage) => {
    if ((message as any).type === 'getLayerForOcclusionPreview') {
      const m = message as any;
      if (typeof m.layerId === 'string' && typeof m.requestId === 'number') {
        latestOcclusionRequestIdByLayer.set(m.layerId, m.requestId);
        occlusionLockUntilByLayer.set(m.layerId, Date.now() + 30_000);
      }
    }
    parent.postMessage({ pluginMessage: message }, '*');
  }, []);

  const prepareUnifiedExportDirectory = useCallback(async (): Promise<boolean> => {
    return pickUnifiedExportDirectoryOnce();
  }, []);

  // 处理来自 Plugin 的消息
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        const message = event.data.pluginMessage as PluginMessage | undefined;
        if (!message || !message.type) return;

        // 获取最新的 store actions
        const {
          setSelection,
          setMarkedLayers,
          setFoldEdges,
          setDrivenRelations,
          setLoading,
          addNotification,
          setPreviewData,
          setPreviewImageUrl,
          clearPreviewData,
          setSelectedCraftLayers,
          setSelectedCraftLayerId,
          setClipMaskVectors,
          initFoldSequence,
          setSourceFrameId,
          setRootPanelId,
          setPanelNameMap,
          setDrivenMap,
        } = getStoreActions();

        // 调用自定义回调
        if (onMessageRef.current) {
          onMessageRef.current(message);
        }

        // 调用类型特定的处理器
        const handler = handlersRef.current?.[message.type as PluginMessageType];
        if (handler) {
          handler(message);
        }

        // 内置处理逻辑
        const messageType = (message as any).type as string;
        switch (messageType) {
        case 'result': {
          try {
            const data = (message as any).data;
            if (!data) break;
            const exportMode = String(data.exportMode || 'export');
            const baseName = String(data.name || 'export').replace(/[^a-zA-Z0-9]/g, '_');

            if (exportMode === 'unified') {
              const exportId = String((data as any).exportId || '');
              if (exportId && processedUnifiedExportIds.has(exportId)) break;
              if (exportId) processedUnifiedExportIds.add(exportId);

              void (async () => {
                try {
                  const saved = await saveUnifiedExportToDirectory(data, baseName);
                  if (saved) return;
                } catch (_e) {
                  // ignore
                }

                downloadJsonFile(data, `${baseName}.json`);
                const masks = Array.isArray(data.masks) ? data.masks : [];
                let i = 0;
                const seen = new Set<string>();
                const step = () => {
                  if (i >= masks.length) return;
                  const m = masks[i++];
                  if (m && typeof m.texture === 'string') {
                    const craft = String(m.craftType || 'mask');
                    const id = String(m.id || i);
                    const k = `${craft}|${id}`;
                    if (!seen.has(k)) {
                      seen.add(k);
                      downloadDataUrl(m.texture, `${baseName}_${craft}_${id}.png`);
                    }
                  }
                  setTimeout(step, 80);
                };
                setTimeout(step, 0);
              })();
            } else {
              downloadJsonFile(data, `${baseName}.json`);
            }
          } catch (_e) {
            // ignore
          }
          break;
        }

        case 'BOOT_LOGS': {
          const payload = (message as any).payload;
          console.log('UI BOOT LOGS:', payload);
          if (payload && Array.isArray(payload.logs)) {
            console.table(payload.logs);
            for (const row of payload.logs) {
              try {
                console.log(
                  'BOOT_LOG',
                  'attempt=',
                  row?.attempt,
                  'rawType=',
                  row?.rawType,
                  'htmlType=',
                  row?.htmlType,
                  'htmlLen=',
                  row?.htmlLen,
                  'usedFallback=',
                  row?.usedFallback,
                  'htmlHead=',
                  row?.htmlHead
                );
              } catch (_e) {
                // ignore
              }
            }
          }
          break;
        }

        case 'occlusionPreviewData': {
          const msg = message as any;
          const craftType = 'NORMAL';
          const layerId = msg.layerId || 'unknown';
          const requestId = typeof msg.requestId === 'number' ? msg.requestId : -1;
          const latest = latestOcclusionRequestIdByLayer.get(layerId);
          if (typeof latest === 'number' && requestId !== latest) break;

          occlusionLockUntilByLayer.set(layerId, Date.now() + 30_000);

          const lastProcessed = processedOcclusionRequestIdByLayer.get(layerId);
          if (typeof lastProcessed === 'number' && lastProcessed === requestId) break;
          processedOcclusionRequestIdByLayer.set(layerId, requestId);

          try {
            console.log('[UI OcclusionPreview] recv', {
              layerId,
              requestId,
              hasTarget: !!msg.targetImageData,
              hasOccluder: !!msg.occluderImageData,
              isPNG: msg.isPNG,
              debug: msg.debug,
              width: msg.width,
              height: msg.height,
            });
          } catch (_e) {
            // ignore
          }

          if (!msg.targetImageData || !msg.occluderImageData) {
            console.warn('[UI OcclusionPreview] missing image data; drop', { layerId, requestId });
            break;
          }

          // Immediately show a crisp preview (use the original target PNG bytes as-is).
          // This avoids any later lossy/downsized fallback overwriting the large preview.
          try {
            if (msg.isPNG) {
              const prevUrl = occlusionPreviewBlobUrlByLayer.get(layerId);
              if (prevUrl) {
                try {
                  URL.revokeObjectURL(prevUrl);
                } catch (_e) {
                  // ignore
                }
              }

              const bytes = new Uint8Array(msg.targetImageData);
              const blob = new Blob([bytes], { type: 'image/png' });
              const url = URL.createObjectURL(blob);
              occlusionPreviewBlobUrlByLayer.set(layerId, url);

              setPreviewImageUrl(layerId, craftType, url, msg.width ?? 0, msg.height ?? 0);
            }
          } catch (_e) {
            // ignore
          }

          void (async () => {
            try {
              const key = `occlusion:${layerId}`;
              const res = await occlusionComputeClient.compositeAlpha(
                key,
                new Uint8Array(msg.targetImageData),
                new Uint8Array(msg.occluderImageData)
              );
              if (!res) return;

              const latestAfter = latestOcclusionRequestIdByLayer.get(layerId);
              if (typeof latestAfter === 'number' && requestId !== latestAfter) return;

              // First: set the RGBA-derived heightData
              setPreviewData(layerId, craftType, toHeightMapRGBA(res.data), res.width, res.height);
            } catch (_e) {
              const decodePng = (bytes: Uint8Array) => new Promise<{ data: Uint8ClampedArray; width: number; height: number }>((resolve) => {
                decodePNGAndSetPreview(bytes, (data, width, height) => resolve({ data, width, height }));
              });

              const target = await decodePng(new Uint8Array(msg.targetImageData));
              const latestAfterDecode = latestOcclusionRequestIdByLayer.get(layerId);
              if (typeof latestAfterDecode === 'number' && requestId !== latestAfterDecode) return;

              setPreviewData(layerId, craftType, toHeightMapRGBA(target.data), target.width, target.height);
            }
          })();
          break;
        }

        case 'SELECTION_CHANGED':
        case 'SELECTION_RESULT':
          setSelection((message as any).payload);
          break;

        case 'MARKED_LAYERS_CHANGED':
        case 'MARKED_LAYERS_RESULT':
          setMarkedLayers([...(message as any).payload.layers]);
          break;

        // ✅ 新增：处理增量删除消息
        case 'MARKED_LAYER_REMOVED': {
          const layerId = (message as any).layerId as string;
          if (layerId) {
            // 只从列表中移除这一项，避免重新渲染所有组件
            const currentLayers = getStoreActions().markedLayers;
            setMarkedLayers(currentLayers.filter(l => l.id !== layerId));
          }
          break;
        }

        case 'FOLD_EDGES_CHANGED':
        case 'FOLD_EDGES_RESULT':
          setFoldEdges([...(message as any).payload.edges]);
          break;

        case 'DRIVEN_RELATIONS_CHANGED':
        case 'DRIVEN_RELATIONS_RESULT':
          setDrivenRelations([...(message as any).payload.relations]);
          break;

        case 'EXPORT_PROGRESS':
          setLoading((message as any).payload.progress < 100);
          break;

        case 'EXPORT_RESULT':
          setLoading(false);
          if ((message as any).payload.success) {
            addNotification('导出成功!', 'success');
          } else {
            addNotification((message as any).payload.error || '导出失败', 'error');
          }
          break;

        case 'ERROR':
          addNotification((message as any).payload.message, 'error');
          break;

        case 'NOTIFICATION':
          addNotification((message as any).payload.message, (message as any).payload.variant);
          break;

        case 'PLUGIN_READY':
          if (false) {
            sendMessage({ type: 'GET_SELECTION' });

            // 延迟加载数据，避免阻塞
            setTimeout(() => {
              sendMessage({ type: 'GET_MARKED_LAYERS' });
            }, 100);
          }
          break;

        // ===== 预览数据消息 =====
        case 'normalPreviewData': {
          const msg = message as any;
          const craftType = 'NORMAL';
          const layerId = msg.layerId || 'unknown';

          const st = getStoreActions();
          const lockUntil = occlusionLockUntilByLayer.get(layerId);
          if (
            (st.selectedCraftLayerId === layerId && st.largePreviewCraft) ||
            latestOcclusionRequestIdByLayer.has(layerId) ||
            (typeof lockUntil === 'number' && Date.now() < lockUntil)
          ) {
            break;
          }

          const seq = nextNormalPreviewSeq++;
          latestNormalPreviewSeqByLayer.set(layerId, seq);

          if (msg.imageData && msg.isPNG) {
            // Schedule lossy base-image cache for instant display (latest-only)
            scheduleIdle(() => {
              const latestSeq = latestNormalPreviewSeqByLayer.get(layerId);
              if (latestSeq !== seq) return;
              void encodeLossyPreviewFromPng(new Uint8Array(msg.imageData), msg.width ?? 0, msg.height ?? 0).then((r) => {
                const latestSeqAfter = latestNormalPreviewSeqByLayer.get(layerId);
                if (latestSeqAfter !== seq) return;
                if (!r) return;
                setPreviewImageUrl(layerId, craftType, r.url, r.width, r.height);
              });
            });

            void (async () => {
              try {
                const key = `normal:${layerId}`;
                const res = await occlusionComputeClient.decodePng(key, new Uint8Array(msg.imageData));
                if (!res) return;
                setPreviewData(layerId, craftType, toHeightMapRGBA(res.data), res.width, res.height);
              } catch (_e) {
                decodePNGAndSetPreview(
                  new Uint8Array(msg.imageData),
                  (data, width, height) => {
                    setPreviewData(layerId, craftType, toHeightMapRGBA(data), width, height);
                  }
                );
              }
            })();
          } else if (msg.imageData && msg.width && msg.height) {
            const data = new Uint8ClampedArray(msg.imageData);
            setPreviewData(layerId, craftType, toHeightMapRGBA(data), msg.width, msg.height);
          }
          break;
        }

        case 'craftLayerSelected': {
          const { layers } = message as any;
          if (layers) {
            setSelectedCraftLayers(layers);

            // 标注/更新工艺后：仅聚焦到最新标注的图层（用于缩略图组切换）
            // ⚠️ 不要在这里自动切换右侧参数面板；面板切换应该由用户点击缩略图触发
            const first = Array.isArray(layers) && layers.length > 0 ? layers[0] : null;
            if (first && first.id) {
              setSelectedCraftLayerId(first.id);
            }
          }
          break;
        }

        case 'clearPreviewData':
          for (const url of occlusionPreviewBlobUrlByLayer.values()) {
            try {
              URL.revokeObjectURL(url);
            } catch (_e) {
              // ignore
            }
          }
          occlusionPreviewBlobUrlByLayer.clear();
          processedOcclusionRequestIdByLayer.clear();
          occlusionLockUntilByLayer.clear();
          clearPreviewData();
          break;

        // ===== 矢量数据消息 (原版兼容) =====
        case 'vectorsFound': {
          // vectorsFound = clipmask 刀版图数据，来自 handleAddVectors
          const { vectors, frameId } = message as any;
          // 设置 sourceFrameId 用于后续 clearSavedVectors
          if (frameId) {
            setSourceFrameId(frameId);
          }
          if (vectors && Array.isArray(vectors)) {
            // 保留原始 x/y/width/height 字段用于空间布局
            const layers = vectors.map((v: any) => ({
              id: v.id,
              name: v.name || 'Unnamed',
              type: 'VECTOR' as const,
              x: v.x ?? 0,
              y: v.y ?? 0,
              width: v.width ?? 0,
              height: v.height ?? 0,
              bounds: {
                x: v.x ?? 0,
                y: v.y ?? 0,
                width: v.width ?? 0,
                height: v.height ?? 0
              },
              visible: true,
              locked: false,
              opacity: 1,
              svgPath: v.svgPath ?? undefined,
              rasterCache: v.rasterCache ?? undefined,
              originalBounds: v.originalBounds ?? undefined,
              craftType: 'CLIPMASK' as const,
            }));
            // 
            setClipMaskVectors(layers);
          }
          break;
        }

        case 'savedVectors': {
          // savedVectors = clipmask 
          const { vectors, frameId, frameImage, frameWidth, frameHeight } = message as any;

          const frameKey = String(frameId || 'unknown');
          const savedSeq = nextSavedVectorsSeq++;
          latestSavedVectorsSeqByFrame.set(frameKey, savedSeq);

          if (!loggedSavedVectorsSvgByFrame.has(frameKey) && Array.isArray(vectors) && vectors.length > 0) {
            loggedSavedVectorsSvgByFrame.add(frameKey);
            const v0 = vectors[0];
            const svgLen = typeof v0?.svgPath === 'string' ? v0.svgPath.length : 0;
            console.log('[savedVectors svgPath]', { frameId: frameKey, id: v0?.id, name: v0?.name, svgLen });
          }

          // 
          if (frameId) {
            setSourceFrameId(frameId);
          }

          if (vectors && Array.isArray(vectors)) {
            // 
            const cropTexturesFromFrame = async () => {
              const latestSeqAtStart = latestSavedVectorsSeqByFrame.get(frameKey);
              if (latestSeqAtStart !== savedSeq) {
                return { croppedTextures: {}, shapeMasks: {}, edgeMasksMap: {} };
              }

              // 
              const croppedTextures: Record<string, string> = {};
              // 
              const shapeMasks: Record<string, string> = {};
              // 
              const edgeMasksMap: Record<string, { top: string; bottom: string; left: string; right: string }> = {};

              const pngBytesToDataUrl = (bytes: Uint8Array) =>
                new Promise<string>((resolve) => {
                  const copy = new Uint8Array(bytes.byteLength);
                  copy.set(bytes);
                  const b = new Blob([copy], { type: 'image/png' });
                  const r = new FileReader();
                  r.onload = () => resolve(String(r.result || ''));
                  r.onerror = () => resolve('');
                  r.readAsDataURL(b);
                });

              const runWithIdle = (fn: () => void) => {
                if ('requestIdleCallback' in window) {
                  (window as any).requestIdleCallback(fn, { timeout: 300 });
                } else {
                  setTimeout(fn, 0);
                }
              };

              const convertPngMapsToDataUrls = async (
                maps: {
                  croppedTextures: Record<string, Uint8Array>;
                  shapeMasks: Record<string, Uint8Array>;
                  edgeMasksMap: Record<string, { top: Uint8Array; bottom: Uint8Array; left: Uint8Array; right: Uint8Array }>;
                }
              ) => {
                const ids = Object.keys(maps.croppedTextures);
                let idx = 0;
                return new Promise<void>((resolve) => {
                  const step = async () => {
                    const budgetMs = 8;
                    const t0 = performance.now();
                    while (idx < ids.length && performance.now() - t0 < budgetMs) {
                      const id = ids[idx++];
                      const tex = maps.croppedTextures[id];
                      const sm = maps.shapeMasks[id];
                      const em = maps.edgeMasksMap[id];
                      if (tex) croppedTextures[id] = await pngBytesToDataUrl(tex);
                      if (sm) shapeMasks[id] = await pngBytesToDataUrl(sm);
                      if (em) {
                        edgeMasksMap[id] = {
                          top: await pngBytesToDataUrl(em.top),
                          bottom: await pngBytesToDataUrl(em.bottom),
                          left: await pngBytesToDataUrl(em.left),
                          right: await pngBytesToDataUrl(em.right),
                        };
                      }
                    }
                    if (idx >= ids.length) {
                      resolve();
                      return;
                    }
                    runWithIdle(() => {
                      void step();
                    });
                  };
                  runWithIdle(() => {
                    void step();
                  });
                });
              };

              if (frameImage && frameWidth && frameHeight) {
                const latestSeqBeforeWorker = latestSavedVectorsSeqByFrame.get(frameKey);
                if (latestSeqBeforeWorker !== savedSeq) {
                  return { croppedTextures: {}, shapeMasks: {}, edgeMasksMap: {} };
                }
                console.log(` 开始裁剪贴图: ${vectors.length} 个面片, Frame: ${frameWidth}x${frameHeight}`);

                try {
                  const workerRes = await submitCropFromFrameLatest(String(frameId || 'unknown'), savedSeq, {
                    frameImage,
                    frameWidth,
                    frameHeight,
                    vectors,
                  });
                  if (workerRes) {
                    await convertPngMapsToDataUrls(workerRes);
                    console.log(` 贴图裁剪完成: ${Object.keys(croppedTextures).length} 个, shapeMask: ${Object.keys(shapeMasks).length} 个`);
                    return { croppedTextures, shapeMasks, edgeMasksMap };
                  }

                  // 
                  const img = new Image();
                  await new Promise<void>((resolve, reject) => {
                    img.onload = () => resolve();
                    img.onerror = reject;
                    img.src = frameImage;
                  });

                  // 
                  for (const v of vectors) {
                    const latestSeqInFallback = latestSavedVectorsSeqByFrame.get(frameKey);
                    if (latestSeqInFallback !== savedSeq) {
                      return { croppedTextures: {}, shapeMasks: {}, edgeMasksMap: {} };
                    }
                    const cropX = v.cropX ?? 0;
                    const cropY = v.cropY ?? 0;
                    const cropW = v.cropWidth ?? v.width ?? 100;
                    const cropH = v.cropHeight ?? v.height ?? 100;

                    if (cropW <= 0 || cropH <= 0) continue;

                    // 
                    const canvas = document.createElement('canvas');
                    canvas.width = cropW;
                    canvas.height = cropH;
                    const ctx = canvas.getContext('2d', { willReadFrequently: true } as any) as CanvasRenderingContext2D | null;
                    if (!ctx) continue;

                    // 裁剪指定区域
                    ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

                    // 转为 base64 贴图
                    const dataUrl = canvas.toDataURL('image/png');
                    croppedTextures[v.id] = dataUrl;

                    // 生成形状遮罩：将所有非透明像素变为白色
                    const imageData = ctx.getImageData(0, 0, cropW, cropH);
                    const data = imageData.data;
                    for (let i = 0; i < data.length; i += 4) {
                      const alpha = data[i + 3];
                      if (alpha > 0) {
                        // 非透明像素 -> 白色不透明
                        data[i] = 255;     // R
                        data[i + 1] = 255; // G
                        data[i + 2] = 255; // B
                        data[i + 3] = 255; // A = 完全不透明
                      }
                      // 透明像素保持透明（alpha = 0）
                    }
                    ctx.putImageData(imageData, 0, 0);
                    const shapeMaskUrl = canvas.toDataURL('image/png');
                    shapeMasks[v.id] = shapeMaskUrl;

                    // 生成4个边缘遮罩（用于侧边透明裁剪）
                    // 侧边面的尺寸是 (边长 x 厚度)，厚度方向应该是均匀的
                    // 所以边缘遮罩的尺寸应该是 (边长 x 2)，2像素高度足够表示厚度方向的均匀性
                    const edgeMasks: { top: string; bottom: string; left: string; right: string } = {
                      top: '', bottom: '', left: '', right: ''
                    };

                    // 重新获取原始图像数据
                    ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
                    const origData = ctx.getImageData(0, 0, cropW, cropH);

                    // 侧边遮罩的厚度方向像素数（2像素足够，会被拉伸到实际厚度）
                    const EDGE_THICKNESS = 2;

                    // 上边缘遮罩 (宽度=cropW, 高度=EDGE_THICKNESS)
                    // 对应后侧边 (Z-)，planeGeometry args=[width, thickness]
                    const topCanvas = document.createElement('canvas');
                    topCanvas.width = cropW;
                    topCanvas.height = EDGE_THICKNESS;
                    const topCtx = topCanvas.getContext('2d');
                    if (topCtx) {
                      const topData = topCtx.createImageData(cropW, EDGE_THICKNESS);
                      for (let x = 0; x < cropW; x++) {
                        const srcIdx = x * 4; // 第一行
                        const alpha = origData.data[srcIdx + 3];
                        const alphaVal = alpha > 0 ? 255 : 0;
                        // 填充所有厚度行（均匀）
                        for (let t = 0; t < EDGE_THICKNESS; t++) {
                          const dstIdx = (t * cropW + x) * 4;
                          topData.data[dstIdx] = 255;
                          topData.data[dstIdx + 1] = 255;
                          topData.data[dstIdx + 2] = 255;
                          topData.data[dstIdx + 3] = alphaVal;
                        }
                      }
                      topCtx.putImageData(topData, 0, 0);
                      edgeMasks.top = topCanvas.toDataURL('image/png');
                    }

                    // 下边缘遮罩 (宽度=cropW, 高度=EDGE_THICKNESS)
                    // 对应前侧边 (Z+)，planeGeometry args=[width, thickness]
                    const bottomCanvas = document.createElement('canvas');
                    bottomCanvas.width = cropW;
                    bottomCanvas.height = EDGE_THICKNESS;
                    const bottomCtx = bottomCanvas.getContext('2d');
                    if (bottomCtx) {
                      const bottomData = bottomCtx.createImageData(cropW, EDGE_THICKNESS);
                      for (let x = 0; x < cropW; x++) {
                        const srcIdx = ((cropH - 1) * cropW + x) * 4; // 最后一行
                        const alpha = origData.data[srcIdx + 3];
                        const alphaVal = alpha > 0 ? 255 : 0;
                        for (let t = 0; t < EDGE_THICKNESS; t++) {
                          const dstIdx = (t * cropW + x) * 4;
                          bottomData.data[dstIdx] = 255;
                          bottomData.data[dstIdx + 1] = 255;
                          bottomData.data[dstIdx + 2] = 255;
                          bottomData.data[dstIdx + 3] = alphaVal;
                        }
                      }
                      bottomCtx.putImageData(bottomData, 0, 0);
                      edgeMasks.bottom = bottomCanvas.toDataURL('image/png');
                    }

                    // 左边缘遮罩 (宽度=EDGE_THICKNESS, 高度=cropH)
                    // 对应左侧边 (X-)，planeGeometry args=[height, thickness]
                    const leftCanvas = document.createElement('canvas');
                    leftCanvas.width = EDGE_THICKNESS;
                    leftCanvas.height = cropH;
                    const leftCtx = leftCanvas.getContext('2d');
                    if (leftCtx) {
                      const leftData = leftCtx.createImageData(EDGE_THICKNESS, cropH);
                      for (let y = 0; y < cropH; y++) {
                        const srcIdx = (y * cropW) * 4; // 第一列
                        const alpha = origData.data[srcIdx + 3];
                        const alphaVal = alpha > 0 ? 255 : 0;
                        for (let t = 0; t < EDGE_THICKNESS; t++) {
                          const dstIdx = (y * EDGE_THICKNESS + t) * 4;
                          leftData.data[dstIdx] = 255;
                          leftData.data[dstIdx + 1] = 255;
                          leftData.data[dstIdx + 2] = 255;
                          leftData.data[dstIdx + 3] = alphaVal;
                        }
                      }
                      leftCtx.putImageData(leftData, 0, 0);
                      edgeMasks.left = leftCanvas.toDataURL('image/png');
                    }

                    // 右边缘遮罩 (宽度=EDGE_THICKNESS, 高度=cropH)
                    // 对应右侧边 (X+)，planeGeometry args=[height, thickness]
                    const rightCanvas = document.createElement('canvas');
                    rightCanvas.width = EDGE_THICKNESS;
                    rightCanvas.height = cropH;
                    const rightCtx = rightCanvas.getContext('2d');
                    if (rightCtx) {
                      const rightData = rightCtx.createImageData(EDGE_THICKNESS, cropH);
                      for (let y = 0; y < cropH; y++) {
                        const srcIdx = (y * cropW + cropW - 1) * 4; // 最后一列
                        const alpha = origData.data[srcIdx + 3];
                        const alphaVal = alpha > 0 ? 255 : 0;
                        for (let t = 0; t < EDGE_THICKNESS; t++) {
                          const dstIdx = (y * EDGE_THICKNESS + t) * 4;
                          rightData.data[dstIdx] = 255;
                          rightData.data[dstIdx + 1] = 255;
                          rightData.data[dstIdx + 2] = 255;
                          rightData.data[dstIdx + 3] = alphaVal;
                        }
                      }
                      rightCtx.putImageData(rightData, 0, 0);
                      edgeMasks.right = rightCanvas.toDataURL('image/png');
                    }

                    // 存储边缘遮罩
                    edgeMasksMap[v.id] = edgeMasks;

                    console.log(`✂️ 裁剪 ${v.name}: (${cropX}, ${cropY}, ${cropW}, ${cropH}) + shapeMask + edgeMasks`);
                  }
                  console.log(`✅ 贴图裁剪完成: ${Object.keys(croppedTextures).length} 个, shapeMask: ${Object.keys(shapeMasks).length} 个`);
                } catch (e) {
                  console.warn('❌ 裁剪贴图失败:', e);
                }
              }

              return { croppedTextures, shapeMasks, edgeMasksMap };
            };

            // 先创建基础 layers（不含贴图）
            const baseLayers = vectors.map((v: any) => ({
              id: v.id,
              name: v.name || 'Unnamed',
              type: 'VECTOR' as const,
              bounds: { x: v.x ?? 0, y: v.y ?? 0, width: v.width ?? 0, height: v.height ?? 0 },
              visible: true,
              locked: false,
              opacity: 1,
              pngPreview: undefined,
              svgPath: v.svgPath ?? undefined,
              rasterCache: v.rasterCache ?? undefined,
              originalBounds: v.originalBounds ?? undefined,
              craftType: 'CLIPMASK' as const,
            }));

            // 先设置基础数据，让 UI 可以立即显示
            setClipMaskVectors(baseLayers);

            // 异步裁剪贴图并更新（只有当 plugin 提供 frameImage 时才进行）
            if (frameImage && frameWidth && frameHeight) {
              cropTexturesFromFrame().then(({ croppedTextures, shapeMasks, edgeMasksMap }) => {
                const latestSeq = latestSavedVectorsSeqByFrame.get(frameKey);
                if (latestSeq !== savedSeq) return;

                if (Object.keys(croppedTextures).length > 0) {
                  const layersWithTextures = baseLayers.map((layer: any) => ({
                    ...layer,
                    pngPreview: croppedTextures[layer.id],
                    shapeMask: shapeMasks[layer.id],
                    edgeMasks: edgeMasksMap[layer.id],
                  }));
                  setClipMaskVectors(layersWithTextures);
                  console.log('🎨 贴图、shapeMask、edgeMasks 已更新到 clipMaskVectors');
                }
              });
            }

            const vectorsForSort = baseLayers.map((l: any) => ({
              id: l.id,
              name: l.name || 'Unnamed',
              x: l.x ?? l.bounds?.x ?? 0,
              y: l.y ?? l.bounds?.y ?? 0,
              width: l.width ?? l.bounds?.width ?? 100,
              height: l.height ?? l.bounds?.height ?? 50,
            }));

            const vectorsForSortFiltered = filterNestedLayers(vectorsForSort);

            if (vectorsForSortFiltered.length === 0) {
              break;
            }

            void (async () => {
              try {
                const workerRes = await foldInferComputeClient.infer(`foldInfer:${frameKey}`, vectorsForSortFiltered);
                const latestSeq = latestSavedVectorsSeqByFrame.get(frameKey);
                if (latestSeq !== savedSeq) return;
                const latestFoldSeq = useAppStore.getState().foldSequence;
                if (latestFoldSeq.length !== 0) return;

                const result = workerRes ?? autoInferFoldSequence(vectorsForSortFiltered);
                initFoldSequence(result.sequence);
                if (result.rootPanelId) {
                  setRootPanelId(result.rootPanelId);
                }
                setPanelNameMap(result.nameMap);
                setDrivenMap(result.drivenMap);
                console.log('✅ 自动排序完成:', result);
              } catch (_e) {
                const latestSeq = latestSavedVectorsSeqByFrame.get(frameKey);
                if (latestSeq !== savedSeq) return;
                const latestFoldSeq = useAppStore.getState().foldSequence;
                if (latestFoldSeq.length !== 0) return;

                const result = autoInferFoldSequence(vectorsForSortFiltered);
                initFoldSequence(result.sequence);
                if (result.rootPanelId) {
                  setRootPanelId(result.rootPanelId);
                }
                setPanelNameMap(result.nameMap);
                setDrivenMap(result.drivenMap);
                console.log('✅ 自动排序完成:', result);
              }
            })();
          }
          break;
        }

        // ===== 折叠数据更新消息 =====
        case 'foldDataUpdated': {
          const { data } = message as any;
          if (data) {
            console.log('📐 折叠数据已更新:', data);
            // 可以在这里更新 store 中的折叠数据
          }
          break;
        }

          default:
            // 未处理的消息类型
            break;
        }
      } catch (e) {
        console.error('Failed to handle pluginMessage:', e)
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [sendMessage]);

  return { sendMessage, prepareUnifiedExportDirectory };
}
