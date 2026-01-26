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

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.drawImage(bitmap, 0, 0);

  const run = () => {
    const imageData = ctx.getImageData(0, 0, width, height);
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
        switch (message.type) {
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

        case 'SELECTION_CHANGED':
        case 'SELECTION_RESULT':
          setSelection(message.payload);
          break;

        case 'MARKED_LAYERS_CHANGED':
        case 'MARKED_LAYERS_RESULT':
          setMarkedLayers([...message.payload.layers]);
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
          setFoldEdges([...message.payload.edges]);
          break;

        case 'DRIVEN_RELATIONS_CHANGED':
        case 'DRIVEN_RELATIONS_RESULT':
          setDrivenRelations([...message.payload.relations]);
          break;

        case 'EXPORT_PROGRESS':
          setLoading(message.payload.progress < 100);
          break;

        case 'EXPORT_RESULT':
          setLoading(false);
          if (message.payload.success) {
            addNotification('导出成功!', 'success');
          } else {
            addNotification(message.payload.error || '导出失败', 'error');
          }
          break;

        case 'ERROR':
          addNotification(message.payload.message, 'error');
          break;

        case 'NOTIFICATION':
          addNotification(message.payload.message, message.payload.variant);
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
          const { vectors, frameId } = message as any;

          // 设置 sourceFrameId
          if (frameId) {
            setSourceFrameId(frameId);
          }
          if (vectors && Array.isArray(vectors)) {
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
              svgPreview: v.svgPreview,
              pngPreview: v.pngPreview,
              craftType: 'CLIPMASK' as const,
            }));
            // 设置 clipmask vectors（刀版图）
            setClipMaskVectors(layers);
            // 只在 foldSequence 为空时才初始化（保留用户手动排序）
            // 使用过滤后的图层，排除被其他图层包含的嵌套图层
            const currentFoldSequence = useAppStore.getState().foldSequence;
            if (currentFoldSequence.length === 0) {
              const filteredLayers = filterNestedLayers(layers);
              // 转换为 Vector 格式用于自动排序算法
              const vectors: Vector[] = filteredLayers.map((l: any) => ({
                id: l.id,
                name: l.name || 'Unnamed',
                x: l.x ?? l.bounds?.x ?? 0,
                y: l.y ?? l.bounds?.y ?? 0,
                width: l.width ?? l.bounds?.width ?? 100,
                height: l.height ?? l.bounds?.height ?? 50,
              }));
              // 使用自动排序算法计算折叠顺序
              const result = autoInferFoldSequence(vectors);
              // 设置折叠顺序、根节点、命名映射和带动关系
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
