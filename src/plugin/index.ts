/**
 * 🔌 Plugin Module Index
 *
 * 这是 Figma 插件后端模块的统一导出
 * 注意：这个文件仅用于类型共享，实际的插件入口是 code.ts
 */

// 常量
export {
  CRAFT_TYPES,
  CRAFT_COLORS,
  CRAFT_DATA_KEY,
  GRAY_VALUE_KEY,
  SELECTED_VECTORS_KEY,
  DRIVEN_RELATIONS_KEY,
  CRAFT_INDICATOR_PREFIX,
  CRAFT_GROUP_PREFIX,
  FACE_NAMES,
  UI_SIZE,
  type CraftTypeZh,
} from './constants';

// 工具函数
export {
  isFrameNode,
  isVectorLike,
  isClipmaskCandidate,
  hasFills,
  hasChildren,
  isExportable,
  hasImageFill,
  findParentFrame,
  isCraftInfrastructure,
  isInTempExportContainer,
  getNodeColor,
  colorMatches,
  isPointInBounds,
  isInsideBounds,
  getCraftData,
  setCraftData,
  getGrayValue,
  setGrayValue,
  clearCraftData,
  buildMarkedNodeInfo,
  traverseNodes,
  collectNodes,
  findNodesByColor,
  type RGB255,
  type MarkedNodeInfo,
} from './utils';

// 指示器管理
export {
  createCraftIndicator,
  removeCraftIndicator,
  hideAllCraftIndicators,
  showAllCraftIndicators,
  regenerateAllCraftIndicators,
  clearAllCraftMarks,
} from './indicator';

// 缓存管理
export {
  getCache,
  clearCache,
  getCacheSize,
  getFromCache,
  setInCache,
  removeFromCache,
  getAllCachedNodes,
  getCachedNodesByCraft,
  initializeCache,
  refreshNodeCache,
  hasRemainingCrafts,
} from './cache';

// 消息发送
export {
  sendSuccess,
  sendError,
  sendNotify,
  sendFramePreview,
  sendSavedVectors,
  sendMarkedLayersFromCache,
  sendCraftLayerSelected,
  exportNodeWithPadding,
  sendNormalPreviewData,
  sendClearPreviewData,
} from './messages';

// 工艺操作
export {
  getMarkingStatus,
  setMarkingStatus,
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
