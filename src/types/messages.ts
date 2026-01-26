/**
 * 📨 Message Types - 类型安全的消息通信
 * UI ↔ Plugin Sandbox 通信协议
 */

import type {
  MarkedLayer,
  FoldEdge,
  DrivenRelation,
  CraftType,
  CraftParams,
  ExportOptions,
  ExportResult,
  SelectionState,
} from './core';

// ========== 消息类型枚举 ==========

/** UI → Plugin 消息类型 */
export type UIMessageType =
  // 系统初始化
  | 'INIT_APP'
  | 'UI_MOUNTED'
  | 'GET_SELECTION'
  | 'SET_SELECTION'
  | 'CLEAR_SELECTION'
  | 'SELECT_ALL'
  // 标记操作
  | 'MARK_LAYERS'
  | 'UNMARK_LAYERS'
  | 'GET_MARKED_LAYERS'
  | 'UPDATE_LAYER_CRAFT'
  // 折边操作
  | 'CREATE_FOLD_EDGE'
  | 'UPDATE_FOLD_EDGE'
  | 'DELETE_FOLD_EDGE'
  | 'GET_FOLD_EDGES'
  | 'AUTO_NAME_FOLDS'
  // 驱动关系
  | 'CREATE_DRIVEN_RELATION'
  | 'UPDATE_DRIVEN_RELATION'
  | 'DELETE_DRIVEN_RELATION'
  | 'GET_DRIVEN_RELATIONS'
  // 导出操作
  | 'EXPORT_PROJECT'
  | 'EXPORT_PREVIEW'
  // 存储操作
  | 'SAVE_TO_STORAGE'
  | 'LOAD_FROM_STORAGE'
  | 'CLEAR_STORAGE'
  // 画布操作
  | 'ZOOM_TO_FIT'
  | 'ZOOM_TO_SELECTION'
  | 'PAN_TO_CENTER'
  // 系统操作
  | 'NOTIFY'
  | 'CLOSE_PLUGIN'
  // 原版兼容消息类型 (小写)
  | 'clearAllMarks'
  | 'startWebGPURender'
  | 'addVectors'
  | 'clearSavedVectors'
  | 'selectByColor'
  | 'selectAndMarkByColor'
  | 'markCraftWithGray'
  | 'removeMarkById'
  | 'selectNode'
  | 'refreshMarkedLayers'
  | 'getSavedVectors'
  | 'saveDrivenRelations'
  | 'UPDATE_PANEL_NAMES';

/** Plugin → UI 消息类型 */
export type PluginMessageType =
  // 启动诊断
  | 'BOOT_LOGS'
  // 选择更新
  | 'SELECTION_CHANGED'
  | 'SELECTION_RESULT'
  // 标记更新
  | 'MARKED_LAYERS_CHANGED'
  | 'MARKED_LAYERS_RESULT'
  | 'MARKED_LAYER_REMOVED'  // ✅ 新增：增量删除消息
  // 折边更新
  | 'FOLD_EDGES_CHANGED'
  | 'FOLD_EDGES_RESULT'
  // 驱动关系更新
  | 'DRIVEN_RELATIONS_CHANGED'
  | 'DRIVEN_RELATIONS_RESULT'
  // 导出结果
  | 'EXPORT_RESULT'
  | 'EXPORT_PROGRESS'
  // 存储结果
  | 'STORAGE_RESULT'
  // 错误和通知
  | 'ERROR'
  | 'NOTIFICATION'
  // 系统状态
  | 'PLUGIN_READY'
  | 'DOCUMENT_CHANGED'
  // 预览数据 (原版兼容)
  | 'normalPreviewData'
  | 'craftLayerSelected'
  | 'clearPreviewData'
  // 矢量数据 (原版兼容)
  | 'vectorsFound'
  | 'savedVectors'
  | 'markedLayers';

// ========== UI → Plugin 消息定义 ==========

/** 获取选择 */
export interface GetSelectionMessage {
  readonly type: 'GET_SELECTION';
}

/** 初始化请求（合并请求，减少 postMessage 次数） */
export interface InitAppMessage {
  readonly type: 'INIT_APP';
}

/** UI 已完成挂载（用于 UI 启动握手/自愈） */
export interface UiMountedMessage {
  readonly type: 'UI_MOUNTED';
}

/** 设置选择 */
export interface SetSelectionMessage {
  readonly type: 'SET_SELECTION';
  readonly payload: {
    readonly ids: readonly string[];
  };
}

/** 清除选择 */
export interface ClearSelectionMessage {
  readonly type: 'CLEAR_SELECTION';
}

/** 全选 */
export interface SelectAllMessage {
  readonly type: 'SELECT_ALL';
}

/** 标记图层 */
export interface MarkLayersMessage {
  readonly type: 'MARK_LAYERS';
  readonly payload: {
    readonly ids: readonly string[];
    readonly craftType: CraftType;
  };
}

/** 取消标记 */
export interface UnmarkLayersMessage {
  readonly type: 'UNMARK_LAYERS';
  readonly payload: {
    readonly ids: readonly string[];
  };
}

/** 获取已标记图层 */
export interface GetMarkedLayersMessage {
  readonly type: 'GET_MARKED_LAYERS';
}

/** 更新图层工艺 */
export interface UpdateLayerCraftMessage {
  readonly type: 'UPDATE_LAYER_CRAFT';
  readonly payload: {
    readonly id: string;
    readonly craftType: CraftType;
    readonly params: CraftParams;
  };
}

/** 创建折边 */
export interface CreateFoldEdgeMessage {
  readonly type: 'CREATE_FOLD_EDGE';
  readonly payload: Omit<FoldEdge, 'id'>;
}

/** 更新折边 */
export interface UpdateFoldEdgeMessage {
  readonly type: 'UPDATE_FOLD_EDGE';
  readonly payload: FoldEdge;
}

/** 删除折边 */
export interface DeleteFoldEdgeMessage {
  readonly type: 'DELETE_FOLD_EDGE';
  readonly payload: {
    readonly id: string;
  };
}

/** 获取折边 */
export interface GetFoldEdgesMessage {
  readonly type: 'GET_FOLD_EDGES';
}

/** 自动命名折边 */
export interface AutoNameFoldsMessage {
  readonly type: 'AUTO_NAME_FOLDS';
}

/** 创建驱动关系 */
export interface CreateDrivenRelationMessage {
  readonly type: 'CREATE_DRIVEN_RELATION';
  readonly payload: DrivenRelation;
}

/** 更新驱动关系 */
export interface UpdateDrivenRelationMessage {
  readonly type: 'UPDATE_DRIVEN_RELATION';
  readonly payload: DrivenRelation;
}

/** 删除驱动关系 */
export interface DeleteDrivenRelationMessage {
  readonly type: 'DELETE_DRIVEN_RELATION';
  readonly payload: {
    readonly driverId: string;
  };
}

/** 获取驱动关系 */
export interface GetDrivenRelationsMessage {
  readonly type: 'GET_DRIVEN_RELATIONS';
}

/** 导出项目 */
export interface ExportProjectMessage {
  readonly type: 'EXPORT_PROJECT';
  readonly payload: ExportOptions;
}

/** 导出预览 */
export interface ExportPreviewMessage {
  readonly type: 'EXPORT_PREVIEW';
  readonly payload: {
    readonly layerId: string;
    readonly craftType: CraftType;
    readonly params: CraftParams;
  };
}

/** 保存到存储 */
export interface SaveToStorageMessage {
  readonly type: 'SAVE_TO_STORAGE';
  readonly payload: {
    readonly key: string;
    readonly value: unknown;
  };
}

/** 从存储加载 */
export interface LoadFromStorageMessage {
  readonly type: 'LOAD_FROM_STORAGE';
  readonly payload: {
    readonly key: string;
  };
}

/** 清除存储 */
export interface ClearStorageMessage {
  readonly type: 'CLEAR_STORAGE';
}

/** 缩放到适合 */
export interface ZoomToFitMessage {
  readonly type: 'ZOOM_TO_FIT';
}

/** 缩放到选择 */
export interface ZoomToSelectionMessage {
  readonly type: 'ZOOM_TO_SELECTION';
}

/** 平移到中心 */
export interface PanToCenterMessage {
  readonly type: 'PAN_TO_CENTER';
}

/** 通知 */
export interface NotifyMessage {
  readonly type: 'NOTIFY';
  readonly payload: {
    readonly message: string;
    readonly variant?: 'info' | 'success' | 'warning' | 'error';
    readonly timeout?: number;
  };
}

/** 关闭插件 */
export interface ClosePluginMessage {
  readonly type: 'CLOSE_PLUGIN';
}

// ========== 原版兼容消息定义 ==========

/** 清除所有标记 */
export interface ClearAllMarksMessage {
  readonly type: 'clearAllMarks';
}

/** 启动WebGPU渲染 */
export interface StartWebGPURenderMessage {
  readonly type: 'startWebGPURender';
}

/** 添加矢量 */
export interface AddVectorsMessage {
  readonly type: 'addVectors';
}

/** 清除保存的矢量 */
export interface ClearSavedVectorsMessage {
  readonly type: 'clearSavedVectors';
  readonly frameId?: string;
}

/** 按颜色选择 */
export interface SelectByColorMessage {
  readonly type: 'selectByColor';
  readonly inClipMask?: boolean;
}

/** 按颜色选择并标记 */
export interface SelectAndMarkByColorMessage {
  readonly type: 'selectAndMarkByColor';
  readonly craftType: string;
  readonly grayValue: number;
  readonly inClipMask?: boolean;
}

/** 带灰度值标记工艺 */
export interface MarkCraftWithGrayMessage {
  readonly type: 'markCraftWithGray';
  readonly craftType: string;
  readonly grayValue: number;
}

/** 按ID移除标记 */
export interface RemoveMarkByIdMessage {
  readonly type: 'removeMarkById';
  readonly nodeId: string;
}

/** 选择节点 */
export interface SelectNodeMessage {
  readonly type: 'selectNode';
  readonly nodeId: string;
}

/** 刷新已标记图层 */
export interface RefreshMarkedLayersMessage {
  readonly type: 'refreshMarkedLayers';
}

/** 获取保存的矢量 */
export interface GetSavedVectorsMessage {
  readonly type: 'getSavedVectors';
}

/** 更新面板名称 */
export interface UpdatePanelNamesMessage {
  readonly type: 'UPDATE_PANEL_NAMES';
  readonly payload: {
    readonly nameMap: Record<string, string>;
  };
}

/** UI → Plugin 消息联合类型 */
export type UIMessage =
  | InitAppMessage
  | UiMountedMessage
  | GetSelectionMessage
  | SetSelectionMessage
  | ClearSelectionMessage
  | SelectAllMessage
  | MarkLayersMessage
  | UnmarkLayersMessage
  | GetMarkedLayersMessage
  | UpdateLayerCraftMessage
  | CreateFoldEdgeMessage
  | UpdateFoldEdgeMessage
  | DeleteFoldEdgeMessage
  | GetFoldEdgesMessage
  | AutoNameFoldsMessage
  | CreateDrivenRelationMessage
  | UpdateDrivenRelationMessage
  | DeleteDrivenRelationMessage
  | GetDrivenRelationsMessage
  | ExportProjectMessage
  | ExportPreviewMessage
  | SaveToStorageMessage
  | LoadFromStorageMessage
  | ClearStorageMessage
  | ZoomToFitMessage
  | ZoomToSelectionMessage
  | PanToCenterMessage
  | NotifyMessage
  | ClosePluginMessage
  // 原版兼容消息
  | ClearAllMarksMessage
  | StartWebGPURenderMessage
  | AddVectorsMessage
  | ClearSavedVectorsMessage
  | SelectByColorMessage
  | SelectAndMarkByColorMessage
  | MarkCraftWithGrayMessage
  | RemoveMarkByIdMessage
  | SelectNodeMessage
  | RefreshMarkedLayersMessage
  | GetSavedVectorsMessage
  | UpdatePanelNamesMessage;

// ========== Plugin → UI 消息定义 ==========

/** 选择变更 */
export interface SelectionChangedMessage {
  readonly type: 'SELECTION_CHANGED';
  readonly payload: SelectionState;
}

/** 选择结果 */
export interface SelectionResultMessage {
  readonly type: 'SELECTION_RESULT';
  readonly payload: SelectionState;
}

/** 已标记图层变更 */
export interface MarkedLayersChangedMessage {
  readonly type: 'MARKED_LAYERS_CHANGED';
  readonly payload: {
    readonly layers: readonly MarkedLayer[];
  };
}

/** 已标记图层结果 */
export interface MarkedLayersResultMessage {
  readonly type: 'MARKED_LAYERS_RESULT';
  readonly payload: {
    readonly layers: readonly MarkedLayer[];
  };
}

/** ✅ 图层删除消息（增量更新）*/
export interface MarkedLayerRemovedMessage {
  readonly type: 'MARKED_LAYER_REMOVED';
  readonly layerId: string;
}

/** 折边变更 */
export interface FoldEdgesChangedMessage {
  readonly type: 'FOLD_EDGES_CHANGED';
  readonly payload: {
    readonly edges: readonly FoldEdge[];
  };
}

/** 折边结果 */
export interface FoldEdgesResultMessage {
  readonly type: 'FOLD_EDGES_RESULT';
  readonly payload: {
    readonly edges: readonly FoldEdge[];
  };
}

/** 驱动关系变更 */
export interface DrivenRelationsChangedMessage {
  readonly type: 'DRIVEN_RELATIONS_CHANGED';
  readonly payload: {
    readonly relations: readonly DrivenRelation[];
  };
}

/** 驱动关系结果 */
export interface DrivenRelationsResultMessage {
  readonly type: 'DRIVEN_RELATIONS_RESULT';
  readonly payload: {
    readonly relations: readonly DrivenRelation[];
  };
}

/** 导出结果 */
export interface ExportResultMessage {
  readonly type: 'EXPORT_RESULT';
  readonly payload: ExportResult;
}

/** 导出进度 */
export interface ExportProgressMessage {
  readonly type: 'EXPORT_PROGRESS';
  readonly payload: {
    readonly progress: number; // 0-100
    readonly message: string;
  };
}

/** 存储结果 */
export interface StorageResultMessage {
  readonly type: 'STORAGE_RESULT';
  readonly payload: {
    readonly key: string;
    readonly value: unknown;
    readonly success: boolean;
    readonly error?: string;
  };
}

/** 错误消息 */
export interface ErrorMessage {
  readonly type: 'ERROR';
  readonly payload: {
    readonly code: string;
    readonly message: string;
    readonly details?: unknown;
  };
}

/** 通知消息 */
export interface NotificationMessage {
  readonly type: 'NOTIFICATION';
  readonly payload: {
    readonly message: string;
    readonly variant: 'info' | 'success' | 'warning' | 'error';
  };
}

/** 插件就绪 */
export interface PluginReadyMessage {
  readonly type: 'PLUGIN_READY';
  readonly payload: {
    readonly version: string;
    readonly capabilities: readonly string[];
  };
}

/** 文档变更 */
export interface DocumentChangedMessage {
  readonly type: 'DOCUMENT_CHANGED';
  readonly payload: {
    readonly documentId: string;
    readonly name: string;
  };
}

/** 法线预览数据 (原版兼容) */
export interface NormalPreviewDataMessage {
  readonly type: 'normalPreviewData';
  readonly imageData: ArrayBuffer;
  readonly width: number;
  readonly height: number;
}

/** 工艺图层选中 (原版兼容) */
export interface CraftLayerSelectedMessage {
  readonly type: 'craftLayerSelected';
  readonly layers: readonly any[];
}

/** 清除预览数据 (原版兼容) */
export interface ClearPreviewDataMessage {
  readonly type: 'clearPreviewData';
}

/** 矢量数据发现 (原版兼容) */
export interface VectorsFoundMessage {
  readonly type: 'vectorsFound';
  readonly vectors: readonly any[];
}

/** 保存的矢量数据 (原版兼容) */
export interface SavedVectorsMessage {
  readonly type: 'savedVectors';
  readonly vectors: readonly any[];
}

/** 标记图层数据 (原版兼容) */
export interface MarkedLayersMessage {
  readonly type: 'markedLayers';
  readonly layers: readonly any[];
}

/** Plugin → UI 消息联合类型 */
export type PluginMessage =
  | SelectionChangedMessage
  | SelectionResultMessage
  | MarkedLayersChangedMessage
  | MarkedLayersResultMessage
  | MarkedLayerRemovedMessage  // ✅ 添加到联合类型
  | FoldEdgesChangedMessage
  | FoldEdgesResultMessage
  | DrivenRelationsChangedMessage
  | DrivenRelationsResultMessage
  | ExportResultMessage
  | ExportProgressMessage
  | StorageResultMessage
  | ErrorMessage
  | NotificationMessage
  | PluginReadyMessage
  | DocumentChangedMessage
  | NormalPreviewDataMessage
  | CraftLayerSelectedMessage
  | ClearPreviewDataMessage
  | VectorsFoundMessage
  | SavedVectorsMessage
  | MarkedLayersMessage;

// ========== 消息处理器类型 ==========

/** 消息处理器 */
export type MessageHandler<T extends PluginMessage> = (message: T) => void;

/** 消息处理器映射 */
export type MessageHandlerMap = {
  [K in PluginMessageType]?: MessageHandler<Extract<PluginMessage, { type: K }>>;
};
