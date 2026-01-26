/**
 * 🎮 Figma Plugin Controller - 类型安全的插件主入口
 *
 * 模块化架构:
 * - constants.ts  - 常量定义
 * - utils.ts      - 工具函数
 * - indicator.ts  - 工艺指示器管理
 * - cache.ts      - 已标记节点缓存
 * - messages.ts   - 消息发送
 * - craft.ts      - 工艺标记操作
 * - code.ts       - 主入口 (本文件)
 */

import {
  UI_SIZE,
  SELECTION_CHANGE_DEBOUNCE,
  DRIVEN_RELATIONS_KEY,
  SELECTED_VECTORS_KEY,
  type CraftTypeZh,
} from './constants';

import {
  isFrameNode,
  isVectorLike,
  isClipmaskCandidate,
  findParentFrame,
  hasChildren,
} from './utils';

// import { initializeCache } from './cache'; // ❌ 不再需要：改用懒加载

import {
  regenerateAllCraftIndicatorsChunked,
  clearAllCraftMarks,
} from './indicator';

import {
  sendFramePreview,
  sendSavedVectors,
  sendMarkedLayersFromCache,
  sendSuccess,
  sendError,
  exportNodeWithPadding,
  sendClearPreviewData,
} from './messages';

import {
  getMarkingStatus,
  markCraft,
  markCraftWithGray,
  markCraftWithGrayById,
  clearMarks,
  removeMarkById,
  removeSingleCraft,
  setNodeGrayValue,
  setGroupGrayValue,
  removeGroupMarks,
  selectByColor,
  selectAndMarkByColor,
  selectNodeById,
} from './craft';

import { clearCraftData, setCraftParams } from './utils';

import { removeFromCache, hasRemainingCrafts } from './cache';
import { removeCraftIndicator } from './indicator';

// ========== 插件初始化 ==========

// 显示 UI（__html__ 会在构建时由 esbuild 注入）
declare const __html__: string;
const rawUiHtml: unknown = __html__ as unknown;
const uiHtml =
  typeof rawUiHtml === 'string' && rawUiHtml.includes('<html')
    ? rawUiHtml
    : '<!doctype html><html><head><meta charset="utf-8" /></head><body style="margin:0;background:#0a0a0b;color:rgba(161,161,170,.95);font:12px ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;display:flex;align-items:center;justify-content:center;height:100vh;">Loading…</body></html>';

// 关键：永远先 showUI 一个极小、稳定的 boot 页面，避免宿主 iframe 初始化期出现短暂的 [object Object] 闪屏。
// boot 页面只负责接收插件侧发来的真实 HTML，并替换自身内容。
const UI_BOOT_HTML = `<!doctype html><html><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<style>
html,body{height:100%;margin:0;background:#0a0a0b;}
.boot{height:100%;display:flex;align-items:center;justify-content:center;color:rgba(161,161,170,.95);font:12px ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;}
</style></head><body><div class="boot">Loading…</div>
<script>
  (function(){
    function writeHtml(html){
      try {
        document.open();
        document.write(html);
        document.close();
      } catch (e) {
        try { document.body.textContent = 'UI boot write error'; } catch (_e) {}
      }
    }
    window.addEventListener('message', function(event){
      var msg = event && event.data && event.data.pluginMessage;
      if (!msg || msg.type !== 'LOAD_REAL_UI_HTML') return;
      if (typeof msg.html !== 'string') return;
      writeHtml(msg.html);
    });
    // 告诉插件侧：boot iframe 已就绪，可以发真实 HTML
    try { parent.postMessage({ pluginMessage: { type: 'BOOTSTRAP_READY' } }, '*'); } catch (_e) {}
  })();
</script></body></html>`;

type UIBootLog = {
  ts: number;
  attempt: number;
  rawType: string;
  usedFallback: boolean;
  rawHead: string;
  htmlType: string;
  htmlLen: number;
  htmlHead: string;
};

const uiBootLogs: UIBootLog[] = [];
let uiBootPersistTimer: ReturnType<typeof setTimeout> | null = null;

function persistUiBootLogs(): void {
  if (uiBootPersistTimer) clearTimeout(uiBootPersistTimer);
  uiBootPersistTimer = setTimeout(() => {
    uiBootPersistTimer = null;
    try {
      void figma.clientStorage.setAsync('uiBootLogs', uiBootLogs.slice(-50));
    } catch (_e) {
      // ignore
    }
  }, 50);
}

let uiMountedAcked = false;
let uiBootRetryCount = 0;
let uiBootRetryTimer: ReturnType<typeof setTimeout> | null = null;
let uiBootstrapReady = false;
let uiHtmlRetryTimers: Array<ReturnType<typeof setTimeout>> = [];

function clearUiHtmlRetries(): void {
  for (const t of uiHtmlRetryTimers) clearTimeout(t);
  uiHtmlRetryTimers = [];
}

function sendRealUiHtmlOnce(): void {
  if (uiMountedAcked) return;
  if (!uiBootstrapReady) return;
  try {
    figma.ui.postMessage({ type: 'LOAD_REAL_UI_HTML', html: uiHtml });
  } catch (_e) {
    // ignore
  }
}

function scheduleRealUiHtmlRetries(): void {
  // Avoid high-frequency pumping: large HTML postMessage can stall the host message handler.
  // Use a small number of spaced retries to tolerate iframe readiness races.
  clearUiHtmlRetries();
  uiHtmlRetryTimers.push(setTimeout(() => sendRealUiHtmlOnce(), 0));
  uiHtmlRetryTimers.push(setTimeout(() => sendRealUiHtmlOnce(), 200));
  uiHtmlRetryTimers.push(setTimeout(() => sendRealUiHtmlOnce(), 800));
}

let didStartPostUiInit = false;
async function startPostUiInitOnce(): Promise<void> {
  if (didStartPostUiInit) return;
  didStartPostUiInit = true;
  try {
    await regenerateAllCraftIndicatorsChunked({ timeBudgetMs: 8, yieldDelayMs: 0 });
  } catch (e) {
    console.warn('⚠️ Failed to regenerate craft indicators:', e);
  }
  try {
    figma.ui.postMessage({ type: 'PLUGIN_READY' });
  } catch (_e) {
    // ignore
  }
}

function showUiWithSelfHeal(): void {
  const htmlStr = String(uiHtml);
  const rawStr = typeof rawUiHtml === 'string' ? rawUiHtml : String(rawUiHtml);
  const usedFallback = uiHtml !== rawUiHtml;
  uiBootLogs.push({
    ts: Date.now(),
    attempt: uiBootRetryCount,
    rawType: typeof rawUiHtml,
    usedFallback,
    rawHead: rawStr.slice(0, 80),
    htmlType: typeof uiHtml,
    htmlLen: htmlStr.length,
    htmlHead: htmlStr.slice(0, 80),
  });
  persistUiBootLogs();

  uiMountedAcked = false;
  uiBootstrapReady = false;

  // 永远先显示稳定 boot 页
  figma.showUI(UI_BOOT_HTML, UI_SIZE);

  if (uiBootRetryTimer) {
    clearTimeout(uiBootRetryTimer);
  }

  // If UI doesn't ack mount quickly, retry showUI.
  // This self-heals intermittent host iframe init failures that present as random white screens.
  uiBootRetryTimer = setTimeout(() => {
    if (uiMountedAcked) return;
    if (uiBootRetryCount >= 2) return;
    uiBootRetryCount += 1;
    console.warn(`UI mount ack timeout; retrying showUI (${uiBootRetryCount}/2)`);
    showUiWithSelfHeal();
  }, 800);
}

showUiWithSelfHeal();

// ========== 选择变化监听 ==========

let selectionChangeTimer: ReturnType<typeof setTimeout> | null = null;

figma.on('selectionchange', () => {

  if (selectionChangeTimer) {
    clearTimeout(selectionChangeTimer);
  }

  selectionChangeTimer = setTimeout(() => {

    // 如果正在标记工艺，跳过选择变化处理
    if (getMarkingStatus()) {
      return;
    }

    sendFramePreview();
    sendSavedVectors();
    // 🔧 修复：selection change 时跳过刷新，避免意外清除缓存
    sendMarkedLayersFromCache({ skipRefresh: true });
  }, SELECTION_CHANGE_DEBOUNCE);
});

// ========== 消息类型定义 ==========

interface PluginMessage {
  type: string;
  [key: string]: unknown;
}

// ========== 消息处理 ==========

figma.ui.onmessage = async (msg: PluginMessage) => {
  try {
    switch (msg.type) {
      case 'BOOTSTRAP_READY':
        uiBootstrapReady = true;
        scheduleRealUiHtmlRetries();
        break;

      case 'UI_MOUNTED':
        uiMountedAcked = true;
        if (uiBootRetryTimer) {
          clearTimeout(uiBootRetryTimer);
          uiBootRetryTimer = null;
        }
        clearUiHtmlRetries();
        await startPostUiInitOnce();
        try {
          figma.ui.postMessage({ type: 'BOOT_LOGS', payload: { logs: uiBootLogs.slice(-50) } });
        } catch (_e) {
          // ignore
        }
        break;

      // ========== 导出操作 ==========
      case 'export':
        await handleNormalExport();
        break;

      case 'exportClipped':
        await handleClippedExport(msg.payload as {
          frameId: string;
          vectorIds: string[];
          scale?: number;
          format?: 'PNG' | 'JPG';
        });
        break;

      case 'exportCraftMasks':
        // TODO: 实现工艺遮罩导出
        break;

      case 'exportUnified':
        // TODO: 实现统一导出
        break;

      // ========== Vector 操作 ==========
      case 'getVectors':
        await sendSavedVectors();
        break;

      case 'addVectors':
        await handleAddVectors();
        break;

      case 'saveSelectedVectors':
        saveSelectedVectors(
          msg.frameId as string,
          msg.vectorIds as string[]
        );
        break;

      case 'getSavedVectors':
        await sendSavedVectors();
        break;

      case 'clearSavedVectors':
        clearSavedVectors(msg.frameId as string | undefined);
        break;

      case 'renameVectors':
        renameVectors(msg.renames as Array<{ id: string; name: string }>);
        break;

      // ========== 工艺标记操作 ==========
      case 'markCraft':
        await markCraft(msg.craftType as CraftTypeZh);
        break;

      case 'markCraftWithGray':
        await markCraftWithGray(
          msg.craftType as CraftTypeZh,
          msg.grayValue as number
        );
        break;

      case 'markCraftWithGrayById':
        await markCraftWithGrayById(
          msg.nodeId as string,
          msg.craftType as CraftTypeZh,
          msg.grayValue as number
        );
        break;

      case 'clearMarks':
        await clearMarks();
        break;

      case 'removeMarkById':
        removeMarkById(msg.nodeId as string);
        break;

      case 'removeSingleCraft':
        removeSingleCraft(
          msg.nodeId as string,
          msg.craftType as CraftTypeZh
        );
        break;

      case 'clearAllMarks':
        clearAllCraftMarks();
        // ✅ 直接发送空列表，避免调用 sendMarkedLayersFromCache 遍历节点
        figma.ui.postMessage({
          type: 'markedLayers',
          layers: []
        });
        break;

      case 'regenerateAllIndicators':
        // 分片重建：避免一次性遍历导致卡顿
        void regenerateAllCraftIndicatorsChunked({ timeBudgetMs: 8, yieldDelayMs: 0 });
        break;

      // ========== 图层查询 ==========
      case 'getMarkedLayers':
      case 'refreshMarkedLayers':
        if (getMarkingStatus()) {
          return;
        }
        sendMarkedLayersFromCache();
        break;

      // ========== 灰度值操作 ==========
      case 'setNodeGray':
        setNodeGrayValue(
          msg.nodeId as string,
          msg.grayValue as number
        );
        break;

      case 'setGroupGray':
        setGroupGrayValue(
          msg.craftType as CraftTypeZh,
          msg.grayValue as number
        );
        break;

      case 'removeGroup':
        removeGroupMarks(msg.craftType as CraftTypeZh);
        break;

      // ========== 颜色选择 ==========
      case 'selectByColor':
        selectByColor(msg.inClipMask as boolean);
        break;

      case 'selectAndMarkByColor':
        selectAndMarkByColor(
          msg.craftType as CraftTypeZh,
          msg.grayValue as number,
          msg.inClipMask as boolean
        );
        break;

      case 'selectNode':
        selectNodeById(msg.nodeId as string);
        break;

      // ========== 驱动关系 ==========
      case 'saveDrivenRelations':
        saveDrivenRelations(
          msg.frameId as string,
          msg.relations as Record<string, unknown>
        );
        break;

      // ========== 预览操作 ==========
      case 'getSelectionForNormalPreview':
        await handleGetSelectionForNormalPreview();
        break;

      case 'getLayerForNormalPreview':
        await handleGetLayerForNormalPreview(msg.layerId as string);
        break;

      // ========== 存储操作 ==========
      case 'request-settings':
        await handleRequestSettings(msg.key as string);
        break;

      case 'save-settings':
        await handleSaveSettings(msg.key as string, msg.data);
        break;

      // ========== 新 UI 消息类型 (大写) ==========
      // 🚀 性能优化：合并初始化请求（移除 sendSavedVectors 避免启动慢）
      case 'INIT_APP':
        await handleInitApp();
        break;

      case 'GET_SELECTION':
        handleGetSelection();
        break;

      case 'SET_SELECTION':
        handleSetSelection((msg.payload as { ids: string[] }).ids);
        break;

      case 'CLEAR_SELECTION':
        figma.currentPage.selection = [];
        break;

      case 'SELECT_ALL':
        handleSelectAll();
        break;

      case 'GET_MARKED_LAYERS':
        handleGetMarkedLayers();
        break;

      case 'MARK_LAYERS':
        await handleMarkLayers(msg.payload as { ids: string[]; craftType: string });
        break;

      case 'UNMARK_LAYERS':
        handleUnmarkLayers((msg.payload as { ids: string[] }).ids);
        break;

      case 'UPDATE_LAYER_CRAFT': {
        const payload = msg.payload as { id: string; craftType: string; params: Record<string, unknown> };
        const node = figma.getNodeById(payload.id) as SceneNode | null;
        if (!node) {
          sendError('图层不存在或已被删除');
          break;
        }

        // Persist parameters
        setCraftParams(node, payload.params || {});

        // Ensure craft label exists on node, so it shows in marked list.
        // Minimal mapping (enums from UI) -> legacy zh labels.
        const craftTypeZh: CraftTypeZh =
          payload.craftType === 'UV' ? 'UV'
          : payload.craftType === 'EMBOSS' ? '凹凸'
          : payload.craftType === 'NORMAL' ? '法线'
          : payload.craftType === 'TEXTURE' ? '置换'
          : payload.craftType === 'VARNISH' ? '烫银'
          : '烫金';

        // Use gray=255 as a safe default if user only adjusts params.
        await markCraftWithGrayById(node.id, craftTypeZh, 255);

        sendMarkedLayersFromCache();
        break;
      }

      case 'GET_FOLD_EDGES':
        handleGetFoldEdges();
        break;

      case 'autoDetectFolds':
        await handleAutoDetectFolds(msg.frameId as string);
        break;

      case 'AUTO_NAME_FOLDS':
        await handleAutoNameFolds();
        break;

      case 'CREATE_FOLD_EDGE':
      case 'UPDATE_FOLD_EDGE':
        break;

      case 'DELETE_FOLD_EDGE':
        handleDeleteFoldEdge((msg.payload as { edgeId: string }).edgeId);
        break;

      case 'SET_ROOT_PANEL':
        handleSetRootPanel(msg.payload as { panelId: string; panelName: string });
        break;

      case 'GET_DRIVEN_RELATIONS':
        handleGetDrivenRelations();
        break;

      case 'CREATE_DRIVEN_RELATION':
      case 'UPDATE_DRIVEN_RELATION':
      case 'DELETE_DRIVEN_RELATION':
        // TODO: 实现驱动关系操作
        break;

      case 'EXPORT_PROJECT':
        await handleExportProject(msg.payload as { format: string; scale: number });
        break;

      case 'NOTIFY':
        figma.notify((msg.payload as { message: string }).message);
        break;

      case 'CLOSE_PLUGIN':
        figma.closePlugin();
        break;

      case 'UPDATE_PANEL_NAMES':
        handleUpdatePanelNames(msg.payload as { nameMap: Record<string, string> });
        break;

      default:
        console.warn('Unknown message type:', msg.type);
    }
  } catch (e) {
    const error = e as Error;
    figma.ui.postMessage({ type: 'error', data: error.message });
  }
};

// ========== 导出处理 ==========

async function handleNormalExport(): Promise<void> {
  const selection = figma.currentPage.selection;
  const nodes = selection.length > 0 ? selection : figma.currentPage.children;

  if (nodes.length === 0) {
    sendError('No nodes to export');
    return;
  }

  const allNodes: Array<{
    id: string;
    name: string;
    type: string;
    parentId: string | null;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    opacity: number;
    color?: { r: number; g: number; b: number; a: number };
    strokeColor?: { r: number; g: number; b: number; a: number };
    strokeWeight?: number;
    cornerRadius?: number;
  }> = [];

  for (const node of nodes) {
    collectNodeData(node as SceneNode, allNodes, null);
  }

  figma.ui.postMessage({
    type: 'result',
    data: {
      name: figma.root.name,
      exportMode: 'normal',
      nodes: allNodes,
    },
  });
}

function collectNodeData(
  node: SceneNode,
  result: Array<{
    id: string;
    name: string;
    type: string;
    parentId: string | null;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    opacity: number;
    color?: { r: number; g: number; b: number; a: number };
    strokeColor?: { r: number; g: number; b: number; a: number };
    strokeWeight?: number;
    cornerRadius?: number;
  }>,
  parentId: string | null
): void {
  if (!node.visible) return;

  const data: typeof result[number] = {
    id: node.id,
    name: node.name,
    type: node.type,
    parentId,
    x: 'x' in node ? node.x : 0,
    y: 'y' in node ? node.y : 0,
    width: 'width' in node ? node.width : 0,
    height: 'height' in node ? node.height : 0,
    rotation: 'rotation' in node ? node.rotation : 0,
    opacity: 'opacity' in node ? node.opacity : 1,
  };

  // 提取填充颜色
  if ('fills' in node && node.fills && node.fills !== figma.mixed) {
    const fill = (node.fills as Paint[]).find(
      (f) => f.visible !== false && f.type === 'SOLID'
    ) as SolidPaint | undefined;

    if (fill && fill.color) {
      data.color = {
        r: fill.color.r,
        g: fill.color.g,
        b: fill.color.b,
        a: (fill.opacity !== undefined ? fill.opacity : 1) * (data.opacity !== undefined ? data.opacity : 1),
      };
    }
  }

  // 提取描边
  if ('strokes' in node && node.strokes && node.strokes.length > 0) {
    const stroke = node.strokes.find((s) => s.visible !== false) as SolidPaint | undefined;
    if (stroke && stroke.color) {
      data.strokeColor = {
        r: stroke.color.r,
        g: stroke.color.g,
        b: stroke.color.b,
        a: stroke.opacity !== undefined ? stroke.opacity : 1,
      };
      data.strokeWeight = 'strokeWeight' in node ? (node.strokeWeight as number) : 1;
    }
  }

  // 圆角
  if ('cornerRadius' in node && typeof node.cornerRadius === 'number') {
    data.cornerRadius = node.cornerRadius;
  }

  result.push(data);

  // 递归子节点
  if (hasChildren(node)) {
    for (const child of node.children) {
      collectNodeData(child as SceneNode, result, node.id);
    }
  }
}

async function handleClippedExport(payload: {
  frameId: string;
  vectorIds: string[];
  scale?: number;
  format?: 'PNG' | 'JPG';
}): Promise<void> {
  const { frameId, vectorIds, scale = 2, format = 'PNG' } = payload;

  const frame = figma.getNodeById(frameId);
  if (!frame || !isFrameNode(frame)) {
    sendError('Source frame not found');
    return;
  }

  const frameBounds = (frame as FrameNode).absoluteBoundingBox;
  if (!frameBounds) {
    sendError('Cannot get frame bounds');
    return;
  }

  figma.notify(`Clipping ${vectorIds.length} regions...`, { timeout: 2000 });

  const clips: Array<{
    vectorId: string;
    vectorName: string;
    x: number;
    y: number;
    width: number;
    height: number;
    texture: string;
  }> = [];

  for (const vectorId of vectorIds) {
    const vector = figma.getNodeById(vectorId);
    if (!vector || !isVectorLike(vector)) continue;

    const vectorBounds = (vector as VectorNode | BooleanOperationNode).absoluteBoundingBox;
    if (!vectorBounds) continue;

    try {
      const result = await exportClippedRegion(
        frame as FrameNode,
        vector as VectorNode | BooleanOperationNode,
        frameBounds,
        vectorBounds,
        scale,
        format
      );

      if (result) {
        clips.push(result);
      }
    } catch (e) {
      console.error(`Clip ${vector.name} failed:`, e);
    }
  }

  figma.ui.postMessage({
    type: 'result',
    data: {
      name: frame.name + '_clipped',
      exportMode: 'clipped',
      sourceFrame: {
        id: frame.id,
        name: frame.name,
        width: (frame as FrameNode).width,
        height: (frame as FrameNode).height,
      },
      clips,
      scale,
    },
  });

  figma.notify(`Exported ${clips.length} clipped regions`);
}

async function exportClippedRegion(
  frame: FrameNode,
  vector: VectorNode | BooleanOperationNode,
  frameBounds: { x: number; y: number; width: number; height: number },
  vectorBounds: { x: number; y: number; width: number; height: number },
  scale: number,
  format: 'PNG' | 'JPG'
): Promise<{
  vectorId: string;
  vectorName: string;
  x: number;
  y: number;
  width: number;
  height: number;
  texture: string;
} | null> {
  const tempFrame = figma.createFrame();
  tempFrame.name = `_temp_clip_${vector.name}`;
  tempFrame.x = -99999;
  tempFrame.y = -99999;
  tempFrame.resize(vectorBounds.width, vectorBounds.height);
  tempFrame.clipsContent = true;
  tempFrame.fills = [];

  try {
    // 克隆 Vector 作为 mask
    const clonedMask = vector.clone();
    tempFrame.appendChild(clonedMask);

    // 处理 BOOLEAN_OPERATION
    if (clonedMask.type === 'BOOLEAN_OPERATION') {
      const flattenedNode = figma.flatten([clonedMask], tempFrame);
      flattenedNode.x = 0;
      flattenedNode.y = 0;
      if (!flattenedNode.fills || (flattenedNode.fills as Paint[]).length === 0) {
        flattenedNode.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }];
      }
      if ('isMask' in flattenedNode) {
        flattenedNode.isMask = true;
      }
    } else {
      clonedMask.x = 0;
      clonedMask.y = 0;
      if (!clonedMask.fills || (clonedMask.fills as Paint[]).length === 0) {
        clonedMask.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }];
      }
      if ('isMask' in clonedMask) {
        clonedMask.isMask = true;
      }
    }

    // 克隆源 Frame
    const clonedSource = frame.clone();
    tempFrame.appendChild(clonedSource);

    const isUnion = vector.type === 'BOOLEAN_OPERATION';
    if (isUnion) {
      clonedSource.x = (tempFrame.width - clonedSource.width) / 2;
      clonedSource.y = (tempFrame.height - clonedSource.height) / 2;
    } else {
      clonedSource.x = frameBounds.x - vectorBounds.x;
      clonedSource.y = frameBounds.y - vectorBounds.y;
    }

    // 导出
    const bytes = await tempFrame.exportAsync({
      format,
      constraint: { type: 'SCALE', value: scale },
    });

    const base64 = figma.base64Encode(bytes);
    const mimeType = format === 'PNG' ? 'image/png' : 'image/jpeg';

    return {
      vectorId: vector.id,
      vectorName: vector.name,
      x: vectorBounds.x - frameBounds.x,
      y: vectorBounds.y - frameBounds.y,
      width: vectorBounds.width,
      height: vectorBounds.height,
      texture: `data:${mimeType};base64,${base64}`,
    };
  } finally {
    tempFrame.remove();
  }
}

// ========== Vector 处理 ==========

async function handleAddVectors(): Promise<void> {
  const selection = figma.currentPage.selection;

  if (selection.length === 0) {
    sendError('请先选择要添加的 Vector');
    return;
  }

  const newVectors: Array<{
    id: string;
    name: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }> = [];
  const parentFrames: Array<FrameNode | ComponentNode | InstanceNode> = [];

  for (const node of selection) {
    if (isClipmaskCandidate(node)) {
      const bounds = 'absoluteBoundingBox' in node ? node.absoluteBoundingBox : null;
      if (bounds) {
        newVectors.push({
          id: node.id,
          name: node.name,
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height,
        });
        const pf = findParentFrame(node);
        if (pf) parentFrames.push(pf);
      }
    }
  }

  if (newVectors.length === 0) {
    sendError('未找到可用节点（请选中 Vector 或 Frame）');
    return;
  }

  // 找到共同的祖先 Frame
  let sourceFrame = parentFrames[0];

  // 获取已保存的 Vector
  let existingIds: string[] = [];
  if (sourceFrame) {
    try {
      const savedJson = sourceFrame.getPluginData(SELECTED_VECTORS_KEY);
      if (savedJson) {
        existingIds = JSON.parse(savedJson);
      }
    } catch (_e) {
      // 解析失败
    }
  }

  // 合并新旧 Vector（去重）
  const newIds = newVectors.map((v) => v.id);
  const mergedIds = [...new Set([...existingIds, ...newIds])];

  // 保存合并后的列表
  if (sourceFrame) {
    sourceFrame.setPluginData(SELECTED_VECTORS_KEY, JSON.stringify(mergedIds));
  }

  // 获取所有 Vector 的详细信息
  const allVectors: Array<{
    id: string;
    name: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }> = [];

  for (const id of mergedIds) {
    const node = figma.getNodeById(id);
    if (node && isClipmaskCandidate(node)) {
      const bounds = 'absoluteBoundingBox' in node ? (node as SceneNode).absoluteBoundingBox : null;
      if (bounds) {
        allVectors.push({
          id: node.id,
          name: node.name,
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height,
        });
      }
    }
  }

  figma.ui.postMessage({
    type: 'vectorsFound',
    vectors: allVectors,
    frameId: sourceFrame ? sourceFrame.id : null,
  });

  figma.notify(`已添加 ${newVectors.length} 个 Vector，共 ${allVectors.length} 个`);
}

function saveSelectedVectors(frameId: string, vectorIds: string[]): void {
  if (!frameId) return;
  const frame = figma.getNodeById(frameId);
  if (!frame || !isFrameNode(frame)) return;

  (frame as FrameNode).setPluginData(SELECTED_VECTORS_KEY, JSON.stringify(vectorIds));
}

function clearSavedVectors(frameId?: string): void {
  let frame: FrameNode | null = null;

  // 优先使用传入的 frameId
  if (frameId) {
    const node = figma.getNodeById(frameId);
    if (node && isFrameNode(node)) {
      frame = node as FrameNode;
    }
  }

  // 如果没有 frameId，尝试从选择中获取
  if (!frame) {
    const selection = figma.currentPage.selection;
    if (selection.length > 0) {
      let current: BaseNode | null = selection[0];
      while (current) {
        if (isFrameNode(current) && current.type !== 'GROUP') {
          frame = current as FrameNode;
          break;
        }
        current = current.parent;
      }
    }
  }

  if (frame) {
    frame.setPluginData(SELECTED_VECTORS_KEY, '');
    sendSuccess('已清除保存的 Vectors');
    sendSavedVectors();
  } else {
    sendError('请先选择一个 Frame');
  }
}

function renameVectors(renames: Array<{ id: string; name: string }>): void {
  for (const { id, name } of renames) {
    const node = figma.getNodeById(id);
    if (node) {
      node.name = name;
    }
  }
  sendSuccess(`已重命名 ${renames.length} 个 Vector`);
  sendSavedVectors();
}

// ========== 驱动关系 ==========

function saveDrivenRelations(frameId: string, relations: Record<string, unknown>): void {
  if (!frameId) return;
  const frame = figma.getNodeById(frameId);
  if (!frame) return;

  try {
    (frame as FrameNode).setPluginData(DRIVEN_RELATIONS_KEY, JSON.stringify(relations || {}));
  } catch (_e) {
    (frame as FrameNode).setPluginData(DRIVEN_RELATIONS_KEY, JSON.stringify({}));
  }
}

// ========== 预览处理 ==========

async function handleGetSelectionForNormalPreview(): Promise<void> {
  const selection = figma.currentPage.selection;

  if (selection.length === 0) {
    figma.ui.postMessage({ type: 'normalPreviewData', imageData: null });
    return;
  }

  const node = selection[0];
  if (!('exportAsync' in node)) {
    figma.ui.postMessage({ type: 'normalPreviewData', imageData: null });
    return;
  }

  try {
    const result = await exportNodeWithPadding(node, 0.15);

    figma.ui.postMessage({
      type: 'normalPreviewData',
      layerId: node.id,
      craftType: 'NORMAL',
      imageData: result.bytes, // ✅ 直接传输 Uint8Array，避免 JSON 序列化
      width: result.width,
      height: result.height,
      isPNG: true,
    });
  } catch (e) {
    console.warn('Failed to export selection for preview:', e);
    figma.ui.postMessage({ type: 'normalPreviewData', imageData: null });
  }
}

async function handleGetLayerForNormalPreview(layerId: string): Promise<void> {
  const node = figma.getNodeById(layerId) as SceneNode | null;

  if (!node || !('exportAsync' in node)) {
    figma.ui.postMessage({ type: 'normalPreviewData', imageData: null });
    return;
  }

  try {
    const result = await exportNodeWithPadding(node, 0.15);

    figma.ui.postMessage({
      type: 'normalPreviewData',
      layerId: node.id,
      craftType: 'NORMAL',
      imageData: result.bytes, // ✅ 直接传输 Uint8Array，避免 JSON 序列化
      width: result.width,
      height: result.height,
      isPNG: true,
    });
  } catch (e) {
    console.warn('Failed to export layer for preview:', e);
    figma.ui.postMessage({ type: 'normalPreviewData', imageData: null });
  }
}

// ========== 存储处理 ==========

async function handleRequestSettings(key: string): Promise<void> {
  try {
    const data = await figma.clientStorage.getAsync(key);
    figma.ui.postMessage({
      type: 'settings-loaded',
      key,
      data,
    });
  } catch (e) {
    console.warn('Failed to load settings:', e);
    figma.ui.postMessage({
      type: 'settings-loaded',
      key,
      data: null,
    });
  }
}

async function handleSaveSettings(key: string, data: unknown): Promise<void> {
  try {
    await figma.clientStorage.setAsync(key, data);
    figma.ui.postMessage({
      type: 'settings-saved',
      key,
      success: true,
    });
  } catch (e) {
    console.warn('Failed to save settings:', e);
    figma.ui.postMessage({
      type: 'settings-saved',
      key,
      success: false,
    });
  }
}

// ========== 新 UI 消息处理函数 ==========

/** 初始化应用 - 发送所有必要的初始数据 */
async function handleInitApp(): Promise<void> {
  // 1. 发送选择状态
  handleGetSelection();

  // 2. 🔥 关键修复：发送 Frame 预览（刀版图预览）
  await sendFramePreview();

  // 3. 🔥 关键修复：发送已保存的 Vectors（刀版图轮廓）
  await sendSavedVectors();

  // 4. 发送已标记图层
  handleGetMarkedLayers();
  sendMarkedLayersFromCache();

  // 5. 发送折叠边数据
  handleGetFoldEdges();

  // 6. 发送驱动关系
  handleGetDrivenRelations();

  // 7. 自动发送第一个已标记图层的预览数据
  await sendInitialPreviewData();
}

/** 发送初始预览数据 - 自动选择第一个已标记图层 */
async function sendInitialPreviewData(): Promise<void> {
  // 收集所有已标记的图层
  const markedLayers: Array<{ id: string; name: string }> = [];

  function collectMarked(node: BaseNode): void {
    if (node.name && node.name.startsWith('__craft_')) return;

    if ('getPluginData' in node) {
      const sceneNode = node as SceneNode;
      const craftData = sceneNode.getPluginData('craftTypes');

      if (craftData) {
        try {
          const crafts = JSON.parse(craftData) as string[];
          if (crafts.length > 0) {
            markedLayers.push({ id: sceneNode.id, name: sceneNode.name });
          }
        } catch (_e) {
          // 忽略解析错误
        }
      }
    }

    if (hasChildren(node)) {
      for (const child of node.children) {
        collectMarked(child);
      }
    }
  }

  collectMarked(figma.currentPage);

  // 如果有已标记的图层，发送第一个图层的预览数据
  if (markedLayers.length > 0) {
    const firstLayerId = markedLayers[0].id;
    await handleGetLayerForNormalPreview(firstLayerId);
  }
}

/** 获取当前选择 */
function handleGetSelection(): void {
  const selection = figma.currentPage.selection;
  const selectedIds = selection.map((n) => n.id);

  figma.ui.postMessage({
    type: 'SELECTION_RESULT',
    payload: {
      mode: selectedIds.length === 0 ? 'NONE' : selectedIds.length === 1 ? 'SINGLE' : 'MULTIPLE',
      selectedIds,
      hoveredId: null,
      focusedId: null,
    },
  });
}

/** 设置选择 */
function handleSetSelection(ids: string[]): void {
  const nodes: SceneNode[] = [];
  for (const id of ids) {
    const node = figma.getNodeById(id) as SceneNode | null;
    if (node) {
      nodes.push(node);
    }
  }
  figma.currentPage.selection = nodes;
  handleGetSelection();
}

/** 全选 */
function handleSelectAll(): void {
  // 获取当前 Frame 内的所有节点或页面顶层节点
  const selection = figma.currentPage.selection;
  if (selection.length > 0) {
    const parent = selection[0].parent;
    if (parent && hasChildren(parent)) {
      const selectableNodes = parent.children.filter((n) =>
        !n.name.startsWith('__craft_') && n.visible
      );
      figma.currentPage.selection = selectableNodes;
    }
  } else {
    figma.currentPage.selection = figma.currentPage.children.filter((n) =>
      !n.name.startsWith('__craft_') && n.visible
    );
  }
  handleGetSelection();
}

/** 获取已标记图层 (新格式) */
function handleGetMarkedLayers(): void {
  const layers: Array<{
    id: string;
    name: string;
    type: string;
    bounds: { x: number; y: number; width: number; height: number };
    visible: boolean;
    locked: boolean;
    opacity: number;
    craftType?: string;
  }> = [];

  function collectMarkedLayers(node: BaseNode): void {
    if ((node.name && node.name.startsWith('__craft_'))) {
      return;
    }

    if ('getPluginData' in node) {
      const sceneNode = node as SceneNode;
      const craftData = sceneNode.getPluginData('craftTypes');

      if (craftData) {
        try {
          const crafts = JSON.parse(craftData) as string[];
          if (crafts.length > 0) {
            const bounds = 'absoluteBoundingBox' in sceneNode && sceneNode.absoluteBoundingBox
              ? sceneNode.absoluteBoundingBox
              : { x: 0, y: 0, width: 0, height: 0 };

            layers.push({
              id: sceneNode.id,
              name: sceneNode.name,
              type: sceneNode.type,
              bounds,
              visible: sceneNode.visible,
              locked: sceneNode.locked,
              opacity: 'opacity' in sceneNode ? sceneNode.opacity : 1,
              craftType: crafts[0],
            });
          }
        } catch (_e) {
          // 解析失败，忽略
        }
      }
    }

    if (hasChildren(node)) {
      for (const child of node.children) {
        collectMarkedLayers(child);
      }
    }
  }

  collectMarkedLayers(figma.currentPage);

  figma.ui.postMessage({
    type: 'MARKED_LAYERS_RESULT',
    payload: { layers },
  });
}

/** 标记图层 */
async function handleMarkLayers(payload: { ids: string[]; craftType: string }): Promise<void> {
  const { ids, craftType } = payload;

  for (const id of ids) {
    const node = figma.getNodeById(id) as SceneNode | null;
    if (node && 'setPluginData' in node) {
      const existingData = node.getPluginData('craftTypes');
      let crafts: string[] = [];

      try {
        if (existingData) {
          crafts = JSON.parse(existingData);
        }
      } catch (_e) {
        crafts = [];
      }

      if (!crafts.includes(craftType)) {
        crafts.push(craftType);
        node.setPluginData('craftTypes', JSON.stringify(crafts));
      }
    }
  }

  handleGetMarkedLayers();
}

/** 取消标记图层 */
function handleUnmarkLayers(ids: string[]): void {
  for (const id of ids) {
    const node = figma.getNodeById(id) as SceneNode | null;
    if (!node) continue;
    if (!('setPluginData' in node)) continue;

    try {
      clearCraftData(node);
    } catch (_e) {
      // ignore
    }

    try {
      removeCraftIndicator(node);
    } catch (_e) {
      // ignore
    }

    try {
      removeFromCache(node.id);
    } catch (_e) {
      // ignore
    }
  }

  handleGetMarkedLayers();

  // 若已无工艺图层，通知 UI 清空预览
  if (!hasRemainingCrafts()) {
    sendClearPreviewData();
  }
}

/** 获取折边 */
function handleGetFoldEdges(): void {
  const edges: Array<{
    id: string;
    name: string;
    startPoint: { x: number; y: number };
    endPoint: { x: number; y: number };
    direction: string;
    angle: number;
    linkedPanels: string[];
  }> = [];

  // 从当前选择的 Frame 中获取折边数据
  const selection = figma.currentPage.selection;
  if (selection.length > 0) {
    let frame: FrameNode | null = null;
    let current: BaseNode | null = selection[0];

    while (current) {
      if (isFrameNode(current) && current.type !== 'GROUP') {
        frame = current as FrameNode;
        break;
      }
      current = current.parent;
    }

    if (frame) {
      const foldData = frame.getPluginData('foldEdges');
      if (foldData) {
        try {
          const parsed = JSON.parse(foldData);
          if (Array.isArray(parsed)) {
            edges.push(...parsed);
          }
        } catch (_e) {
          // 解析失败
        }
      }
    }
  }

  figma.ui.postMessage({
    type: 'FOLD_EDGES_RESULT',
    payload: { edges },
  });
}

/** 获取驱动关系 */
function handleGetDrivenRelations(): void {
  const relations: Array<{
    driverId: string;
    drivenIds: string[];
    type: string;
    ratio: number;
  }> = [];

  // 从当前选择的 Frame 中获取驱动关系数据
  const selection = figma.currentPage.selection;
  if (selection.length > 0) {
    let frame: FrameNode | null = null;
    let current: BaseNode | null = selection[0];

    while (current) {
      if (isFrameNode(current) && current.type !== 'GROUP') {
        frame = current as FrameNode;
        break;
      }
      current = current.parent;
    }

    if (frame) {
      const relData = frame.getPluginData(DRIVEN_RELATIONS_KEY);
      if (relData) {
        try {
          const parsed = JSON.parse(relData);
          if (Array.isArray(parsed)) {
            relations.push(...parsed);
          }
        } catch (_e) {
          // 解析失败
        }
      }
    }
  }

  figma.ui.postMessage({
    type: 'DRIVEN_RELATIONS_RESULT',
    payload: { relations },
  });
}

/** 导出项目 */
async function handleExportProject(payload: { format: string; scale: number }): Promise<void> {
  const { format, scale } = payload;

  figma.ui.postMessage({
    type: 'EXPORT_PROGRESS',
    payload: { progress: 10, message: '正在准备导出...' },
  });

  try {
    // 收集所有已标记的图层
    const markedLayers: Array<{
      id: string;
      name: string;
      type: string;
      craftType: string;
      grayValue: number;
    }> = [];

    function collectForExport(node: BaseNode): void {
      if ('getPluginData' in node) {
        const sceneNode = node as SceneNode;
        const craftData = sceneNode.getPluginData('craftTypes');

        if (craftData) {
          try {
            const crafts = JSON.parse(craftData) as string[];
            if (crafts.length > 0) {
              const grayData = sceneNode.getPluginData('grayValue');
              markedLayers.push({
                id: sceneNode.id,
                name: sceneNode.name,
                type: sceneNode.type,
                craftType: crafts[0],
                grayValue: grayData ? parseFloat(grayData) : 128,
              });
            }
          } catch (_e) {
            // 解析失败
          }
        }
      }

      if (hasChildren(node)) {
        for (const child of node.children) {
          collectForExport(child);
        }
      }
    }

    collectForExport(figma.currentPage);

    // 读取带动关系数据
    let drivenRelations = {};
    const frames = figma.currentPage.findAll(node => node.type === 'FRAME') as FrameNode[];
    for (const frame of frames) {
      try {
        const relData = frame.getPluginData(DRIVEN_RELATIONS_KEY);
        if (relData) {
          const parsed = JSON.parse(relData);
          if (parsed.relations && Object.keys(parsed.relations).length > 0) {
            drivenRelations = parsed.relations;
            break; // 找到第一个有效的带动关系数据就停止
          }
        }
      } catch (_e) {
        // 解析失败，继续下一个
      }
    }

    figma.ui.postMessage({
      type: 'EXPORT_PROGRESS',
      payload: { progress: 50, message: '正在导出数据...' },
    });

    // 发送导出结果
    figma.ui.postMessage({
      type: 'EXPORT_RESULT',
      payload: {
        success: true,
        format,
        data: JSON.stringify({
          version: '2.0.0',
          scale,
          layers: markedLayers,
          drivenRelations,
          exportedAt: Date.now(),
        }),
        timestamp: Date.now(),
      },
    });

    figma.notify('导出完成!');
  } catch (e) {
    const error = e as Error;
    figma.ui.postMessage({
      type: 'EXPORT_RESULT',
      payload: {
        success: false,
        format,
        error: error.message,
        timestamp: Date.now(),
      },
    });
  }
}

// ========== 折叠检测功能 ==========

/** 自动检测折叠边 */
async function handleAutoDetectFolds(frameId: string): Promise<void> {
  const frame = figma.getNodeById(frameId);
  if (!frame) {
    sendError('Frame 不存在');
    return;
  }

  // 获取已保存的 Vector ID
  let vectorIds: string[] = [];
  try {
    const savedJson = (frame as FrameNode).getPluginData(SELECTED_VECTORS_KEY);
    if (savedJson) {
      vectorIds = JSON.parse(savedJson);
    }
  } catch (_e) {
    // 解析失败
  }

  if (vectorIds.length === 0) {
    sendError('未找到 Vector，请先添加 Vector');
    return;
  }

  // 收集 Vector 几何信息
  const vectors: Array<{
    id: string;
    name: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }> = [];

  for (const id of vectorIds) {
    const node = figma.getNodeById(id);
    if (node && 'absoluteBoundingBox' in node && node.absoluteBoundingBox) {
      vectors.push({
        id: node.id,
        name: node.name,
        x: node.absoluteBoundingBox.x,
        y: node.absoluteBoundingBox.y,
        width: node.absoluteBoundingBox.width,
        height: node.absoluteBoundingBox.height,
      });
    }
  }

  // 几何邻接检测
  const edges: Array<{
    source: string;
    target: string;
    type: 'horizontal' | 'vertical';
    length: number;
  }> = [];
  const tolerance = 2.0;

  for (let i = 0; i < vectors.length; i++) {
    for (let j = i + 1; j < vectors.length; j++) {
      const v1 = vectors[i];
      const v2 = vectors[j];

      // 检测水平相邻
      const v1Bottom = v1.y + v1.height;
      const v2Bottom = v2.y + v2.height;
      const isHorizontalNeighbor =
        Math.abs(v1Bottom - v2.y) < tolerance ||
        Math.abs(v2Bottom - v1.y) < tolerance;

      if (isHorizontalNeighbor) {
        const start = Math.max(v1.x, v2.x);
        const end = Math.min(v1.x + v1.width, v2.x + v2.width);
        if (end - start > tolerance) {
          edges.push({
            source: v1.id,
            target: v2.id,
            type: 'horizontal',
            length: end - start,
          });
          continue;
        }
      }

      // 检测垂直相邻
      const v1Right = v1.x + v1.width;
      const v2Right = v2.x + v2.width;
      const isVerticalNeighbor =
        Math.abs(v1Right - v2.x) < tolerance ||
        Math.abs(v2Right - v1.x) < tolerance;

      if (isVerticalNeighbor) {
        const start = Math.max(v1.y, v2.y);
        const end = Math.min(v1.y + v1.height, v2.y + v2.height);
        if (end - start > tolerance) {
          edges.push({
            source: v1.id,
            target: v2.id,
            type: 'vertical',
            length: end - start,
          });
        }
      }
    }
  }

  // 构建折叠树 - 面积最大的作为根节点 (H面)
  const sortedVectors = [...vectors].sort(
    (a, b) => b.width * b.height - a.width * a.height
  );
  const rootId = sortedVectors[0].id;

  // 构建邻接表
  const adj: Record<string, string[]> = {};
  vectors.forEach((v) => (adj[v.id] = []));
  edges.forEach((e) => {
    adj[e.source].push(e.target);
    adj[e.target].push(e.source);
  });

  // BFS 构建父子关系树
  const tree: Record<string, string[]> = {};
  const visited = new Set([rootId]);
  const queue = [rootId];

  while (queue.length > 0) {
    const parent = queue.shift()!;
    tree[parent] = [];
    const neighbors = adj[parent] || [];
    for (const child of neighbors) {
      if (!visited.has(child)) {
        visited.add(child);
        tree[parent].push(child);
        queue.push(child);
      }
    }
  }

  const foldData = {
    rootId,
    edges,
    tree,
    vectors,
  };

  // 保存到 Frame
  (frame as FrameNode).setPluginData('foldData', JSON.stringify(foldData));

  figma.ui.postMessage({
    type: 'foldDataDetected',
    data: foldData,
  });

  figma.notify(
    `✅ 检测到 ${edges.length} 条折叠边，根节点: ${sortedVectors[0].name}`
  );
}

/** 自动命名折叠面板 */
async function handleAutoNameFolds(): Promise<void> {
  const selection = figma.currentPage.selection;
  if (selection.length === 0) {
    sendError('请先选择一个 Frame');
    return;
  }

  // 找到父 Frame
  let frame: FrameNode | null = null;
  let current: BaseNode | null = selection[0];

  while (current) {
    if (isFrameNode(current) && current.type !== 'GROUP') {
      frame = current as FrameNode;
      break;
    }
    current = current.parent;
  }

  if (!frame) {
    sendError('未找到 Frame');
    return;
  }

  // 获取已保存的折叠数据
  const foldDataJson = frame.getPluginData('foldData');
  if (!foldDataJson) {
    sendError('请先运行折叠检测');
    return;
  }

  let foldData: {
    rootId: string;
    tree: Record<string, string[]>;
    vectors: Array<{ id: string; name: string; x: number; y: number; width: number; height: number }>;
  };

  try {
    foldData = JSON.parse(foldDataJson);
  } catch (_e) {
    sendError('折叠数据解析失败');
    return;
  }

  const { rootId, tree, vectors } = foldData;

  // 命名规则
  const nameMap: Record<string, string> = {};
  const rootNode = figma.getNodeById(rootId);

  if (rootNode) {
    nameMap[rootId] = 'H';  // 根节点命名为 H (主面板)
    rootNode.name = 'H';
  }

  // BFS 遍历树，根据位置关系命名
  const queue: Array<{ id: string; parentName: string }> = [];
  const children = tree[rootId] || [];

  // 根据子节点相对于父节点的位置命名
  const rootVec = vectors.find(v => v.id === rootId);

  if (rootVec) {
    const sortedChildren = children.map(childId => {
      const childVec = vectors.find(v => v.id === childId);
      return { id: childId, vec: childVec };
    }).filter(c => c.vec);

    // 按位置分类命名
    sortedChildren.forEach(({ id, vec }) => {
      if (!vec) return;

      let name = '';
      const rootCenterX = rootVec.x + rootVec.width / 2;
      const rootCenterY = rootVec.y + rootVec.height / 2;
      const childCenterX = vec.x + vec.width / 2;
      const childCenterY = vec.y + vec.height / 2;

      // 判断相对位置
      if (Math.abs(childCenterY - rootCenterY) > Math.abs(childCenterX - rootCenterX)) {
        // 垂直方向
        name = childCenterY < rootCenterY ? 'T_Flap' : 'B_Flap';
      } else {
        // 水平方向
        name = childCenterX < rootCenterX ? 'L' : 'R';
      }

      nameMap[id] = name;
      const node = figma.getNodeById(id);
      if (node) {
        node.name = name;
      }
      queue.push({ id, parentName: name });
    });
  }

  // 继续 BFS 命名子节点
  while (queue.length > 0) {
    const { id, parentName } = queue.shift()!;
    const nodeChildren = tree[id] || [];
    const parentVec = vectors.find(v => v.id === id);

    if (!parentVec) continue;

    nodeChildren.forEach((childId) => {
      const childVec = vectors.find(v => v.id === childId);
      if (!childVec) return;

      // 子节点命名：父名称 + 后缀
      let suffix = '';
      const parentCenterX = parentVec.x + parentVec.width / 2;
      const parentCenterY = parentVec.y + parentVec.height / 2;
      const childCenterX = childVec.x + childVec.width / 2;
      const childCenterY = childVec.y + childVec.height / 2;

      if (Math.abs(childCenterY - parentCenterY) > Math.abs(childCenterX - parentCenterX)) {
        suffix = childCenterY < parentCenterY ? '_T' : '_B';
      } else {
        suffix = childCenterX < parentCenterX ? '_L' : '_R';
      }

      const name = `${parentName}${suffix}`;
      nameMap[childId] = name;

      const node = figma.getNodeById(childId);
      if (node) {
        node.name = name;
      }
      queue.push({ id: childId, parentName: name });
    });
  }

  // 更新折叠数据中的名称
  const updatedVectors = vectors.map(v => {
    return {
      id: v.id,
      name: nameMap[v.id] || v.name,
      x: v.x,
      y: v.y,
      width: v.width,
      height: v.height
    };
  });

  foldData.vectors = updatedVectors;
  frame.setPluginData('foldData', JSON.stringify(foldData));

  figma.ui.postMessage({
    type: 'foldDataUpdated',
    data: foldData,
  });

  figma.notify(`✅ 已自动命名 ${Object.keys(nameMap).length} 个面板`);
}

/** 更新面板名称 - 从 UI 接收名称映射并更新 Figma 图层 */
function handleUpdatePanelNames(payload: { nameMap: Record<string, string> }): void {
  const { nameMap } = payload;

  if (!nameMap || Object.keys(nameMap).length === 0) {
    return;
  }

  let updatedCount = 0;

  for (const [nodeId, newName] of Object.entries(nameMap)) {
    const node = figma.getNodeById(nodeId);
    if (node && 'name' in node) {
      node.name = newName;
      updatedCount++;
    }
  }

  figma.notify(`✅ 已更新 ${updatedCount} 个面板名称`);
}

/** 删除折叠线 */
function handleDeleteFoldEdge(edgeId: string): void {
  if (!edgeId) {
    sendError('折叠线 ID 无效');
    return;
  }

  // 找到当前 Frame
  const selection = figma.currentPage.selection;
  let frame: FrameNode | null = null;

  if (selection.length > 0) {
    let current: BaseNode | null = selection[0];
    while (current) {
      if (isFrameNode(current) && current.type !== 'GROUP') {
        frame = current as FrameNode;
        break;
      }
      current = current.parent;
    }
  }

  if (!frame) {
    sendError('未找到 Frame');
    return;
  }

  // 获取已保存的折叠数据
  const foldDataJson = frame.getPluginData('foldData');
  if (!foldDataJson) {
    sendError('未找到折叠数据');
    return;
  }

  try {
    const foldData = JSON.parse(foldDataJson);

    // 从 edges 数组中删除指定的折叠线
    if (foldData.edges && Array.isArray(foldData.edges)) {
      const originalLength = foldData.edges.length;
      foldData.edges = foldData.edges.filter((edge: { id?: string; source?: string; target?: string }) => {
        // 支持多种 ID 格式
        const id = edge.id || `${edge.source}-${edge.target}`;
        return id !== edgeId;
      });

      if (foldData.edges.length < originalLength) {
        // 保存更新后的数据
        frame.setPluginData('foldData', JSON.stringify(foldData));

        // 通知 UI 更新
        figma.ui.postMessage({
          type: 'foldDataUpdated',
          data: foldData,
        });

        figma.notify(`✅ 已删除折叠线`);
      } else {
        figma.notify(`⚠️ 未找到指定的折叠线`);
      }
    }
  } catch (e) {
    sendError('折叠数据解析失败');
  }
}

/** 设置根节点（用于带动关系） */
function handleSetRootPanel(payload: { panelId: string; panelName: string }): void {
  const { panelId, panelName } = payload;

  if (!panelId) {
    sendError('面板 ID 无效');
    return;
  }

  // 找到当前 Frame
  const selection = figma.currentPage.selection;
  let frame: FrameNode | null = null;

  if (selection.length > 0) {
    let current: BaseNode | null = selection[0];
    while (current) {
      if (isFrameNode(current) && current.type !== 'GROUP') {
        frame = current as FrameNode;
        break;
      }
      current = current.parent;
    }
  }

  if (!frame) {
    sendError('未找到 Frame');
    return;
  }

  // 获取或创建带动关系数据
  let relationsData: { rootPanelId?: string; rootPanelName?: string; relations?: Record<string, unknown> } = {};

  try {
    const existingData = frame.getPluginData(DRIVEN_RELATIONS_KEY);
    if (existingData) {
      relationsData = JSON.parse(existingData);
    }
  } catch (_e) {
    relationsData = {};
  }

  // 更新根节点
  relationsData.rootPanelId = panelId;
  relationsData.rootPanelName = panelName;

  // 保存数据
  frame.setPluginData(DRIVEN_RELATIONS_KEY, JSON.stringify(relationsData));

  // 通知 UI 更新
  figma.ui.postMessage({
    type: 'ROOT_PANEL_SET',
    payload: { panelId, panelName },
  });

  figma.notify(`✅ 已设置 "${panelName}" 为根节点`);
}
