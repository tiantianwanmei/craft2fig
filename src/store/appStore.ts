/**
 * 🏪 App Store - 全局应用状态管理
 * 基于 Zustand 的单一数据源 (SSOT)
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import { COMPONENT_TOKENS } from '@genki/shared-theme';
import type {
  MarkedLayer,
  FoldEdge,
  DrivenRelation,
  SelectionState,
  CanvasTransform,
  CraftType,
  CraftParams,
} from '../types/core';

// ========== 状态类型定义 ==========

/** 活动标签页 */
export type ActiveTab = 'export' | 'fold' | 'craft';

/** 视图模式 */
export type ViewMode = '2d' | '3d';

/** 应用状态 */
interface AppState {
  // ===== UI 状态 =====
  activeTab: ActiveTab;
  viewMode: ViewMode;
  sidebarWidth: number;
  isLoading: boolean;

  // ===== 选择状态 =====
  selection: SelectionState;

  // ===== 画布状态 =====
  canvasTransform: CanvasTransform;
  showGrid: boolean;
  showGuides: boolean;

  // ===== 项目数据 =====
  sourceFrameId: string | null;  // 当前源 Frame ID
  markedLayers: MarkedLayer[];
  foldEdges: FoldEdge[];
  drivenRelations: DrivenRelation[];

  // ===== 刀版图预览状态 (clipmask vectors) =====
  clipmaskVectors: MarkedLayer[];  // clipmask 矢量数据（刀版图）
  foldSequence: string[];  // 折叠顺序数组（有序的面板 ID 列表）
  replacingIndex: number | null;  // 正在替换的步骤索引，null 表示正常追加模式
  hPanelId: string | null;  // H 面板 ID
  rootPanelId: string | null;  // 根节点面板 ID（用于带动关系）
  panelNameMap: Record<string, string>;  // 面板命名映射
  drivenMap: Record<string, string[]>;  // 带动关系映射 (父面板ID -> 子面板ID数组)
  clipModeEnabled: boolean;  // Clip Mode 开关
  foldEdgeEditMode: boolean;  // 折叠边编辑模式开关
  deletedFoldEdgeIds: string[];  // 已删除的折叠线 ID 列表

  // ===== 工艺编辑状态 =====
  activeCraftType: CraftType;
  activeCraftPanel: string;  // 当前激活的工艺面板 ID
  selectedCraftLayerId: string | null;  // 当前选中的工艺图层 ID
  craftParams: CraftParams;
  previewEnabled: boolean;

  // ===== 预览数据状态 =====
  previewDataMap: Record<string, {  // key: `${layerId}_${craftType}`
    data: Uint8ClampedArray | null;
    width: number;
    height: number;
  }>;
  previewDataVersion: number;  // 版本号，用于强制触发重新渲染
  selectedCraftLayers: MarkedLayer[];
  largePreviewCraft: CraftType | null;  // 大图预览的工艺类型

  // ===== Cycles 渲染预览状态 =====
  cyclesPreviewOpen: boolean;  // Cycles 预览窗口是否打开
  cyclesRenderMode: 'realtime' | 'pathtracing' | 'hybrid';  // 渲染模式
  cyclesHDRPreset: string;  // HDR 预设
  cyclesRenderProgress: number;  // 渲染进度 0-100
  cyclesIsRendering: boolean;  // 是否正在渲染

  // ===== 通知状态 =====
  notifications: Notification[];
}

/** 通知 */
interface Notification {
  id: string;
  message: string;
  variant: 'info' | 'success' | 'warning' | 'error';
  timestamp: number;
}

/** 应用操作 */
interface AppActions {
  // ===== UI 操作 =====
  setActiveTab: (tab: ActiveTab) => void;
  setViewMode: (mode: ViewMode) => void;
  setSidebarWidth: (width: number) => void;
  setLoading: (loading: boolean) => void;

  // ===== 选择操作 =====
  setSelection: (selection: SelectionState) => void;
  clearSelection: () => void;

  // ===== 画布操作 =====
  setCanvasTransform: (transform: Partial<CanvasTransform>) => void;
  resetCanvasTransform: () => void;
  setShowGrid: (show: boolean) => void;
  setShowGuides: (show: boolean) => void;

  // ===== 项目数据操作 =====
  setSourceFrameId: (frameId: string | null) => void;
  setMarkedLayers: (layers: MarkedLayer[]) => void;
  addMarkedLayer: (layer: MarkedLayer) => void;
  updateMarkedLayer: (id: string, updates: Partial<MarkedLayer>) => void;
  removeMarkedLayer: (id: string) => void;
  clearMarkedLayers: () => void;

  setFoldEdges: (edges: FoldEdge[]) => void;
  addFoldEdge: (edge: FoldEdge) => void;
  updateFoldEdge: (id: string, updates: Partial<FoldEdge>) => void;
  removeFoldEdge: (id: string) => void;

  setDrivenRelations: (relations: DrivenRelation[]) => void;
  addDrivenRelation: (relation: DrivenRelation) => void;
  updateDrivenRelation: (driverId: string, updates: Partial<DrivenRelation>) => void;
  removeDrivenRelation: (driverId: string) => void;

  // ===== 刀版图预览操作 =====
  setClipMaskVectors: (vectors: MarkedLayer[]) => void;
  initFoldSequence: (ids: string[]) => void;  // 初始化折叠顺序
  handlePanelClick: (id: string) => void;  // 处理面板点击（支持追加和替换模式）
  setReplacingIndex: (index: number | null) => void;
  clearFoldSequence: () => void;
  setHPanelId: (id: string | null) => void;
  setRootPanelId: (id: string | null) => void;  // 设置根节点面板 ID
  setPanelNameMap: (map: Record<string, string>) => void;
  setDrivenMap: (map: Record<string, string[]>) => void;  // 设置带动关系映射
  setClipModeEnabled: (enabled: boolean) => void;
  setFoldEdgeEditMode: (enabled: boolean) => void;
  deleteFoldEdge: (edgeId: string) => void;  // 删除折叠线
  clearDeletedFoldEdges: () => void;  // 清空已删除列表

  // ===== 工艺编辑操作 =====
  setActiveCraftType: (type: CraftType) => void;
  setActiveCraftPanel: (panelId: string) => void;
  setSelectedCraftLayerId: (layerId: string | null) => void;
  setCraftParams: (params: Partial<CraftParams>) => void;
  resetCraftParams: () => void;
  setPreviewEnabled: (enabled: boolean) => void;

  // ===== 预览数据操作 =====
  setPreviewData: (layerId: string, craftType: CraftType, data: Uint8ClampedArray | null, width: number, height: number) => void;
  clearPreviewData: (layerId?: string, craftType?: CraftType) => void;
  setSelectedCraftLayers: (layers: MarkedLayer[]) => void;
  setLargePreviewCraft: (craft: CraftType | null) => void;

  // ===== Cycles 渲染预览操作 =====
  setCyclesPreviewOpen: (open: boolean) => void;
  setCyclesRenderMode: (mode: 'realtime' | 'pathtracing' | 'hybrid') => void;
  setCyclesHDRPreset: (preset: string) => void;
  setCyclesRenderProgress: (progress: number) => void;
  setCyclesIsRendering: (rendering: boolean) => void;

  // ===== 通知操作 =====
  addNotification: (message: string, variant?: Notification['variant']) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;

  // ===== 重置 =====
  reset: () => void;
}

// ========== 初始状态 ==========

const defaultCraftParams: CraftParams = {
  // 基础参数
  intensity: 50,
  blur: 10,
  height: 50,
  invert: false,

  // Normal Map 参数
  edgeSoftness: 0,
  blurRadius: 10,
  sharpness: 1.0,
  contrast: 1.0,
  algorithm: 'sobel',
  invertY: false,
  useGrayscale: true,

  // UV 基础参数（参考原版 uvSettings）
  type: 'gloss',
  gloss: 0.95,
  thickness: 0.5,
  roughness: 0.1,
  sharpen: 0,
  blurStrength: 0,

  // 碎片UV参数
  fragmentSize: 8,
  fragmentVariation: 60,
  fragmentRotation: 0,
  fragmentRadial: 0,
  fragmentTwist: 0,

  // 钻石UV参数
  sparkleIntensity: 40,
  sparkleFrequency: 0.5,
  diamondRotation: 0,
  diamondRadial: 0,
  diamondTwist: 0,

  // 马赛克UV参数
  mosaicSize: 6,
  mosaicVariation: 80,
  mosaicRotation: 0,
  mosaicRadial: 0,
  mosaicTwist: 0,

  // 磨砂UV参数
  frostIntensity: 30,

  // 同心圆UV参数
  concentricMode: 'circle',
  concentricStyle: 'ring',
  ringCount: 10,
  ringSpacing: 20,
  lineWidth: 2.0,
  gradient: 0,
  dotSpacing: 10,
  concentricRadial: 0,
  concentricTwist: 0,
};

/** 创建空的预览数据映射 */
const createEmptyPreviewDataMap = (): Record<string, { data: Uint8ClampedArray | null; width: number; height: number }> => ({});

const defaultCanvasTransform: CanvasTransform = {
  pan: { x: 0, y: 0 },
  zoom: 1,
  rotation: 0,
};

const defaultSelection: SelectionState = {
  mode: 'NONE',
  selectedIds: [],
  hoveredId: null,
  focusedId: null,
};

const initialState: AppState = {
  // UI
  activeTab: 'export',
  viewMode: '2d',
  sidebarWidth: parseInt(COMPONENT_TOKENS.layout.sidebarWidth),
  isLoading: false,

  // Selection
  selection: defaultSelection,

  // Canvas
  canvasTransform: defaultCanvasTransform,
  showGrid: true,
  showGuides: true,

  // Project Data
  sourceFrameId: null,
  markedLayers: [],
  foldEdges: [],
  drivenRelations: [],

  // Die-cut Preview (clipmask vectors)
  clipmaskVectors: [],
  foldSequence: [],
  replacingIndex: null,
  hPanelId: null,
  rootPanelId: null,
  panelNameMap: {},
  drivenMap: {},
  clipModeEnabled: true,
  foldEdgeEditMode: false,
  deletedFoldEdgeIds: [],

  // Craft
  activeCraftType: 'NORMAL',
  activeCraftPanel: 'normal',
  selectedCraftLayerId: null,
  craftParams: defaultCraftParams,
  previewEnabled: true,

  // Preview Data
  previewDataMap: createEmptyPreviewDataMap(),
  previewDataVersion: 0,
  selectedCraftLayers: [],
  largePreviewCraft: null,

  // Cycles Render Preview
  cyclesPreviewOpen: false,
  cyclesRenderMode: 'hybrid',
  cyclesHDRPreset: 'studio',
  cyclesRenderProgress: 0,
  cyclesIsRendering: false,

  // Notifications
  notifications: [],
};

// ========== Store 创建 ==========

export const useAppStore = create<AppState & AppActions>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    // ===== UI 操作 =====
    setActiveTab: (tab) => set({ activeTab: tab }),
    setViewMode: (mode) => set({ viewMode: mode }),
    setSidebarWidth: (width) => set({ sidebarWidth: Math.max(280, Math.min(480, width)) }),
    setLoading: (loading) => set({ isLoading: loading }),

    // ===== 选择操作 =====
    setSelection: (selection) => set({ selection }),
    clearSelection: () => set({ selection: defaultSelection }),

    // ===== 画布操作 =====
    setCanvasTransform: (transform) => set((state) => ({
      canvasTransform: { ...state.canvasTransform, ...transform },
    })),
    resetCanvasTransform: () => set({ canvasTransform: defaultCanvasTransform }),
    setShowGrid: (show) => set({ showGrid: show }),
    setShowGuides: (show) => set({ showGuides: show }),

    // ===== 项目数据操作 =====
    setSourceFrameId: (frameId) => set({ sourceFrameId: frameId }),
    setMarkedLayers: (layers) => set({ markedLayers: layers }),
    addMarkedLayer: (layer) => set((state) => ({
      markedLayers: [...state.markedLayers, layer],
    })),
    updateMarkedLayer: (id, updates) => set((state) => ({
      markedLayers: state.markedLayers.map((l) =>
        l.id === id ? { ...l, ...updates } : l
      ),
    })),
    removeMarkedLayer: (id) => set((state) => ({
      markedLayers: state.markedLayers.filter((l) => l.id !== id),
    })),
    clearMarkedLayers: () => set({ markedLayers: [] }),

    setFoldEdges: (edges) => set({ foldEdges: edges }),
    addFoldEdge: (edge) => set((state) => ({
      foldEdges: [...state.foldEdges, edge],
    })),
    updateFoldEdge: (id, updates) => set((state) => ({
      foldEdges: state.foldEdges.map((e) =>
        e.id === id ? { ...e, ...updates } : e
      ),
    })),
    removeFoldEdge: (id) => set((state) => ({
      foldEdges: state.foldEdges.filter((e) => e.id !== id),
    })),

    setDrivenRelations: (relations) => set({ drivenRelations: relations }),
    addDrivenRelation: (relation) => set((state) => ({
      drivenRelations: [...state.drivenRelations, relation],
    })),
    updateDrivenRelation: (driverId, updates) => set((state) => ({
      drivenRelations: state.drivenRelations.map((r) =>
        r.driverId === driverId ? { ...r, ...updates } : r
      ),
    })),
    removeDrivenRelation: (driverId) => set((state) => ({
      drivenRelations: state.drivenRelations.filter((r) => r.driverId !== driverId),
    })),

    // ===== 刀版图预览操作 =====
    // 只有当 vectors ID 列表变化时才清空 deletedFoldEdgeIds
    setClipMaskVectors: (vectors) => set((state) => {
      const oldIds = state.clipmaskVectors.map(v => v.id).sort().join(',');
      const newIds = vectors.map(v => v.id).sort().join(',');
      const vectorsChanged = oldIds !== newIds;
      return {
        clipmaskVectors: vectors,
        deletedFoldEdgeIds: vectorsChanged ? [] : state.deletedFoldEdgeIds,
      };
    }),

    // 处理面板点击 - 支持追加、交换两种模式
    handlePanelClick: (id) => set((state) => {
      const { foldSequence, replacingIndex } = state;
      const clickedIndex = foldSequence.indexOf(id);
      const isAlreadySelected = clickedIndex !== -1;

      // Case A: 已经在交换模式中
      if (replacingIndex !== null) {
        if (clickedIndex === replacingIndex) {
          // 点击同一个面板 -> 取消交换模式
          return { replacingIndex: null };
        } else if (isAlreadySelected) {
          // 点击另一个已选面板 -> 交换两个面板的位置
          const newSequence = [...foldSequence];
          const tempId = newSequence[replacingIndex];
          newSequence[replacingIndex] = newSequence[clickedIndex];
          newSequence[clickedIndex] = tempId;
          return { foldSequence: newSequence, replacingIndex: null };
        } else {
          // 点击未选中的面板 -> 替换摄取位置的面板
          const newSequence = [...foldSequence];
          newSequence[replacingIndex] = id;
          return { foldSequence: newSequence, replacingIndex: null };
        }
      }

      // Case B: 正常模式
      if (isAlreadySelected) {
        // 点击已选面板 -> 进入交换模式（摄取编号）
        return { replacingIndex: clickedIndex };
      } else {
        // 点击未选中的面板 -> 追加到序列末尾
        return { foldSequence: [...foldSequence, id] };
      }
    }),

    setReplacingIndex: (index) => set({ replacingIndex: index }),
    clearFoldSequence: () => set({ foldSequence: [], replacingIndex: null, hPanelId: null, panelNameMap: {} }),
    initFoldSequence: (ids) => set({ foldSequence: ids, replacingIndex: null }),
    setHPanelId: (id) => set({ hPanelId: id }),
    setRootPanelId: (id) => set({ rootPanelId: id }),
    setPanelNameMap: (map) => set({ panelNameMap: map }),
    setDrivenMap: (map) => set({ drivenMap: map }),
    setClipModeEnabled: (enabled) => set({ clipModeEnabled: enabled }),
    setFoldEdgeEditMode: (enabled) => set({ foldEdgeEditMode: enabled }),
    deleteFoldEdge: (edgeId) => set((state) => ({
      deletedFoldEdgeIds: [...state.deletedFoldEdgeIds, edgeId],
    })),
    clearDeletedFoldEdges: () => set({ deletedFoldEdgeIds: [] }),

    // ===== 工艺编辑操作 =====
    setActiveCraftType: (type) => set({ activeCraftType: type }),
    setActiveCraftPanel: (panelId) => set({ activeCraftPanel: panelId }),
    setSelectedCraftLayerId: (layerId) => set({ selectedCraftLayerId: layerId }),
    setCraftParams: (params) => set((state) => ({
      craftParams: { ...state.craftParams, ...params },
    })),
    resetCraftParams: () => set({ craftParams: defaultCraftParams }),
    setPreviewEnabled: (enabled) => set({ previewEnabled: enabled }),

    // ===== 预览数据操作 =====
    setPreviewData: (layerId, craftType, data, width, height) => {
      set((state) => {
        const key = `${layerId}_${craftType}`;
        const currentData = state.previewDataMap[key];

        // 只有当数据真正变化时才更新
        if (currentData &&
            currentData.data === data &&
            currentData.width === width &&
            currentData.height === height) {
          return state; // 数据未变化，不触发更新
        }

        return {
          previewDataMap: {
            ...state.previewDataMap,
            [key]: { data, width, height },
          },
          previewDataVersion: state.previewDataVersion + 1,
        };
      });
    },
    clearPreviewData: (layerId, craftType) => set((state) => {
      if (layerId && craftType) {
        // 清除指定图层+工艺的预览数据
        const key = `${layerId}_${craftType}`;
        const { [key]: _, ...rest } = state.previewDataMap;
        return {
          previewDataMap: rest,
          previewDataVersion: state.previewDataVersion + 1,
        };
      } else if (layerId) {
        // 清除指定图层的所有预览数据
        const newMap = Object.fromEntries(
          Object.entries(state.previewDataMap).filter(([k]) => !k.startsWith(`${layerId}_`))
        );
        return {
          previewDataMap: newMap,
          previewDataVersion: state.previewDataVersion + 1,
        };
      } else {
        // 清除所有预览数据
        return {
          previewDataMap: createEmptyPreviewDataMap(),
          previewDataVersion: state.previewDataVersion + 1,
        };
      }
    }),
    setSelectedCraftLayers: (layers) => set({ selectedCraftLayers: layers }),
    setLargePreviewCraft: (craft) => set({ largePreviewCraft: craft }),

    // ===== Cycles 渲染预览操作 =====
    setCyclesPreviewOpen: (open) => set({ cyclesPreviewOpen: open }),
    setCyclesRenderMode: (mode) => set({ cyclesRenderMode: mode }),
    setCyclesHDRPreset: (preset) => set({ cyclesHDRPreset: preset }),
    setCyclesRenderProgress: (progress) => set({ cyclesRenderProgress: progress }),
    setCyclesIsRendering: (rendering) => set({ cyclesIsRendering: rendering }),

    // ===== 通知操作 =====
    addNotification: (message, variant = 'info') => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      set((state) => ({
        notifications: [
          ...state.notifications,
          { id, message, variant, timestamp: Date.now() },
        ],
      }));
      // 自动移除
      setTimeout(() => {
        get().removeNotification(id);
      }, 5000);
    },
    removeNotification: (id) => set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),
    clearNotifications: () => set({ notifications: [] }),

    // ===== 重置 =====
    reset: () => set(initialState),
  }))
);

// ========== 选择器 ==========

/** 选中的图层 */
export const useSelectedLayers = () =>
  useAppStore(
    useShallow((state) => {
      const { selectedIds } = state.selection;
      return state.markedLayers.filter((l) => selectedIds.includes(l.id));
    })
  );

/** 当前标签页 */
export const useActiveTab = () => useAppStore((state) => state.activeTab);

/** 画布变换 */
export const useCanvasTransform = () => useAppStore((state) => state.canvasTransform);

/** 工艺参数 */
export const useCraftParams = () => useAppStore(
  useShallow((state) => ({
    type: state.activeCraftType,
    params: state.craftParams,
  }))
);

/** 通知列表 */
export const useNotifications = () => useAppStore((state) => state.notifications);

/** 预览数据 - 获取指定图层和工艺类型的预览数据 */
export const usePreviewData = (layerId?: string, craftType?: CraftType) => {
  return useAppStore(
    useShallow((state) => {
      const type = craftType || state.activeCraftType;
      const id = layerId || state.selectedCraftLayerId || '';
      const key = `${id}_${type}`;
      const previewData = state.previewDataMap[key];

      return {
        heightData: previewData?.data || null,
        width: previewData?.width || 0,
        height: previewData?.height || 0,
        craftType: type,
        layerId: id,
      };
    })
  );
};

/** 选中的工艺图层 */
export const useSelectedCraftLayers = () => useAppStore((state) => state.selectedCraftLayers);

/** 当前选中的工艺图层 ID */
export const useSelectedCraftLayerId = () => useAppStore((state) => state.selectedCraftLayerId);

/** 当前激活的工艺面板 */
export const useActiveCraftPanel = () => useAppStore((state) => state.activeCraftPanel);
