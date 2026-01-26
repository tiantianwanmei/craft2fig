/**
 * 📨 usePluginMessage - 类型安全的消息通信 Hook
 * UI ↔ Plugin Sandbox 双向通信
 */

import { useCallback, useEffect, useRef } from 'react';
import { useAppStore } from '../store';
import type { UIMessage, PluginMessage, PluginMessageType } from '../types/messages';
import { autoInferFoldSequence, type Vector } from '../utils/foldLogic';

type MessageHandler<T extends PluginMessage = PluginMessage> = (message: T) => void;

interface UsePluginMessageOptions {
  onMessage?: MessageHandler;
  handlers?: Partial<Record<PluginMessageType, MessageHandler>>;
}

function toHeightMapRGBA(src: Uint8ClampedArray): Uint8ClampedArray {
  return src;
}

// 获取稳定的 store actions（不订阅状态变化）
const getStoreActions = () => useAppStore.getState();

const latestOcclusionRequestIdByLayer = new Map<string, number>();

// 过滤掉被其他图层完全包含的嵌套图层（与 ViewportArea 中的逻辑一致）
function filterNestedLayers(layers: any[]): any[] {
  if (!layers || layers.length <= 1) return layers;

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

  return layers.filter((v, _i, arr) => {
    const isContained = arr.some(other => other.id !== v.id && contains(other, v));
    return !isContained;
  });
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
    ctx = canvas.getContext('2d');
  } else {
    canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    ctx = canvas.getContext('2d');
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
      }
    }
    parent.postMessage({ pluginMessage: message }, '*');
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

          const decodePng = (bytes: Uint8Array) => new Promise<{ data: Uint8ClampedArray; width: number; height: number }>((resolve) => {
            decodePNGAndSetPreview(bytes, (data, width, height) => resolve({ data, width, height }));
          });

          void (async () => {
            const target = await decodePng(new Uint8Array(msg.targetImageData));
            const occ = await decodePng(new Uint8Array(msg.occluderImageData));

            if (target.width !== occ.width || target.height !== occ.height) {
              console.warn('[UI OcclusionPreview] size mismatch; fallback to target only', {
                layerId,
                requestId,
                target: { w: target.width, h: target.height },
                occ: { w: occ.width, h: occ.height },
                debug: msg.debug,
              });
              setPreviewData(layerId, craftType, toHeightMapRGBA(target.data), target.width, target.height);
              return;
            }

            const latestAfterDecode = latestOcclusionRequestIdByLayer.get(layerId);
            if (typeof latestAfterDecode === 'number' && requestId !== latestAfterDecode) return;

            const out = new Uint8ClampedArray(target.data);

            // Time-slice alpha compositing to avoid long main-thread stalls.
            const total = out.length;
            let i = 0;
            const step = () => {
              const budgetMs = 8;
              const t0 = performance.now();
              for (; i < total; i += 4) {
                const ta = out[i + 3];
                const oa = occ.data[i + 3];
                out[i + 3] = Math.round((ta * (255 - oa)) / 255);
                if (performance.now() - t0 > budgetMs) break;
              }

              const latestAfterDecode2 = latestOcclusionRequestIdByLayer.get(layerId);
              if (typeof latestAfterDecode2 === 'number' && requestId !== latestAfterDecode2) return;

              if (i >= total) {
                setPreviewData(layerId, craftType, toHeightMapRGBA(out), target.width, target.height);
                return;
              }
              requestAnimationFrame(step);
            };

            requestAnimationFrame(step);
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

          if (msg.imageData && msg.isPNG) {
            decodePNGAndSetPreview(
              new Uint8Array(msg.imageData),
              (data, width, height) => {
                setPreviewData(layerId, craftType, toHeightMapRGBA(data), width, height);
              }
            );
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
            }));
            // 设置到 clipmaskVectors，不是 markedLayers
            setClipMaskVectors(layers);
          }
          break;
        }

        case 'savedVectors': {
          // savedVectors = clipmask 刀版图数据，用于视口预览折叠关系
          const { vectors, frameId, frameImage, frameWidth, frameHeight } = message as any;

          // 设置 sourceFrameId
          if (frameId) {
            setSourceFrameId(frameId);
          }
          if (vectors && Array.isArray(vectors)) {
            // 异步裁剪贴图并生成形状遮罩
            const cropTexturesFromFrame = async () => {
              // 如果有 frameImage，从中裁剪每个面片的贴图
              const croppedTextures: Record<string, string> = {};
              // 新增：面板外轮廓遮罩（用于外表面透明裁剪）
              const shapeMasks: Record<string, string> = {};
              // 新增：边缘遮罩（用于侧边透明裁剪）
              const edgeMasksMap: Record<string, { top: string; bottom: string; left: string; right: string }> = {};

              if (frameImage && frameWidth && frameHeight) {
                console.log(`🖼️ 开始裁剪贴图: ${vectors.length} 个面片, Frame: ${frameWidth}x${frameHeight}`);

                try {
                  // 加载 Frame 图片
                  const img = new Image();
                  await new Promise<void>((resolve, reject) => {
                    img.onload = () => resolve();
                    img.onerror = reject;
                    img.src = frameImage;
                  });

                  // 为每个 vector 裁剪贴图
                  for (const v of vectors) {
                    const cropX = v.cropX ?? 0;
                    const cropY = v.cropY ?? 0;
                    const cropW = v.cropWidth ?? v.width ?? 100;
                    const cropH = v.cropHeight ?? v.height ?? 100;

                    if (cropW <= 0 || cropH <= 0) continue;

                    // 创建 canvas 裁剪贴图
                    const canvas = document.createElement('canvas');
                    canvas.width = cropW;
                    canvas.height = cropH;
                    const ctx = canvas.getContext('2d');
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
              svgPreview: v.svgPreview,
              pngPreview: v.pngPreview,
              craftType: 'CLIPMASK' as const,
            }));

            // 先设置基础数据，让 UI 可以立即显示
            setClipMaskVectors(baseLayers);

            // 异步裁剪贴图并更新
            cropTexturesFromFrame().then(({ croppedTextures, shapeMasks, edgeMasksMap }) => {
              if (Object.keys(croppedTextures).length > 0) {
                // 更新 layers 添加裁剪后的贴图和形状遮罩
                const layersWithTextures = baseLayers.map((layer: any) => ({
                  ...layer,
                  pngPreview: croppedTextures[layer.id] || layer.pngPreview,
                  shapeMask: shapeMasks[layer.id],  // 面板外轮廓遮罩
                  edgeMasks: edgeMasksMap[layer.id],  // 边缘遮罩（用于侧边透明裁剪）
                }));
                setClipMaskVectors(layersWithTextures);
                console.log('🎨 贴图、shapeMask、edgeMasks 已更新到 clipMaskVectors');
              }
            });

            // 只在 foldSequence 为空时才初始化
            const currentFoldSequence = useAppStore.getState().foldSequence;
            if (currentFoldSequence.length === 0) {
              const filteredLayers = filterNestedLayers(baseLayers);
              const vectorsForSort: Vector[] = filteredLayers.map((l: any) => ({
                id: l.id,
                name: l.name || 'Unnamed',
                x: l.x ?? l.bounds?.x ?? 0,
                y: l.y ?? l.bounds?.y ?? 0,
                width: l.width ?? l.bounds?.width ?? 100,
                height: l.height ?? l.bounds?.height ?? 50,
              }));
              const result = autoInferFoldSequence(vectorsForSort);
              initFoldSequence(result.sequence);
              if (result.rootPanelId) {
                setRootPanelId(result.rootPanelId);
              }
              setPanelNameMap(result.nameMap);
              setDrivenMap(result.drivenMap);
              console.log('✅ 自动排序完成:', result);
            }
          }
          break;
        }

        case 'markedLayers': {
          const { layers } = message as any;
          if (layers && Array.isArray(layers)) {
            // 转换为 MarkedLayer 格式，添加缺失字段
            const normalizedLayers = layers.map((layer: any, index: number) => ({
              id: layer.id,
              name: layer.name || 'Unnamed',
              type: layer.type || 'VECTOR',
              bounds: layer.bounds || {
                x: (index % 4) * 120,
                y: Math.floor(index / 4) * 80,
                width: 100,
                height: 60
              },
              visible: true,
              locked: false,
              opacity: 1,
              craftType: layer.craftType,
              crafts: layer.crafts,  // 添加 crafts 字段
              grayValue: layer.grayValue,  // 添加 grayValue 字段
              craftParams: layer.craftParams,
              svgPreview: layer.svgPreview,
              pngPreview: layer.pngPreview,
            }));
            setMarkedLayers(normalizedLayers);
          }
          break;
        }

        // ===== 根节点设置消息 =====
        case 'ROOT_PANEL_SET': {
          const { panelId, panelName } = (message as any).payload || {};
          if (panelId) {
            const { setRootPanelId } = getStoreActions();
            setRootPanelId(panelId);
            console.log(`✅ 根节点已设置: ${panelName} (${panelId})`);
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

  return { sendMessage };
}
