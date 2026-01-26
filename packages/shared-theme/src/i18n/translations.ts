// ============================================================================
// Base Translations - 基础通用翻译词条
// ============================================================================
// 所有插件共用的基础词汇，插件可以扩展自己的翻译

import type { TranslationMap } from './LanguageProvider';

/**
 * 基础通用翻译 - 所有 Genki 插件共用
 */
export const baseTranslations: TranslationMap = {
  // ========== 通用操作 ==========
  'common.confirm': { en: 'Confirm', zh: '确认' },
  'common.cancel': { en: 'Cancel', zh: '取消' },
  'common.save': { en: 'Save', zh: '保存' },
  'common.delete': { en: 'Delete', zh: '删除' },
  'common.edit': { en: 'Edit', zh: '编辑' },
  'common.close': { en: 'Close', zh: '关闭' },
  'common.reset': { en: 'Reset', zh: '重置' },
  'common.apply': { en: 'Apply', zh: '应用' },
  'common.export': { en: 'Export', zh: '导出' },
  'common.import': { en: 'Import', zh: '导入' },
  'common.copy': { en: 'Copy', zh: '复制' },
  'common.paste': { en: 'Paste', zh: '粘贴' },
  'common.undo': { en: 'Undo', zh: '撤销' },
  'common.redo': { en: 'Redo', zh: '重做' },
  'common.search': { en: 'Search', zh: '搜索' },
  'common.filter': { en: 'Filter', zh: '筛选' },
  'common.sort': { en: 'Sort', zh: '排序' },
  'common.loading': { en: 'Loading...', zh: '加载中...' },
  'common.success': { en: 'Success', zh: '成功' },
  'common.error': { en: 'Error', zh: '错误' },
  'common.warning': { en: 'Warning', zh: '警告' },
  'common.info': { en: 'Info', zh: '信息' },

  // ========== 主题切换 ==========
  'theme.toggle': { en: 'Toggle Theme', zh: '切换主题' },
  'theme.toggleTo': { en: 'Switch to {mode} mode', zh: '切换到 {mode} 模式' },
  'theme.light': { en: 'Light', zh: '浅色' },
  'theme.dark': { en: 'Dark', zh: '深色' },
  'theme.auto': { en: 'Auto', zh: '自动' },

  // ========== 语言切换 ==========
  'lang.switch': { en: 'Switch Language', zh: '切换语言' },
  'lang.en': { en: 'English', zh: '英文' },
  'lang.zh': { en: '中文', zh: '中文' },
  'lang.current': { en: 'Current Language', zh: '当前语言' },

  // ========== 文件操作 ==========
  'file.upload': { en: 'Upload', zh: '上传' },
  'file.download': { en: 'Download', zh: '下载' },
  'file.select': { en: 'Select File', zh: '选择文件' },
  'file.drop': { en: 'Drop file here', zh: '拖放文件到此处' },

  // ========== 表单 ==========
  'form.required': { en: 'Required', zh: '必填' },
  'form.optional': { en: 'Optional', zh: '可选' },
  'form.placeholder': { en: 'Enter value...', zh: '请输入...' },
  'form.invalid': { en: 'Invalid value', zh: '无效值' },

  // ========== 状态 ==========
  'status.active': { en: 'Active', zh: '激活' },
  'status.inactive': { en: 'Inactive', zh: '未激活' },
  'status.enabled': { en: 'Enabled', zh: '已启用' },
  'status.disabled': { en: 'Disabled', zh: '已禁用' },
  'status.online': { en: 'Online', zh: '在线' },
  'status.offline': { en: 'Offline', zh: '离线' },

  // ========== 时间 ==========
  'time.now': { en: 'Now', zh: '现在' },
  'time.today': { en: 'Today', zh: '今天' },
  'time.yesterday': { en: 'Yesterday', zh: '昨天' },
  'time.tomorrow': { en: 'Tomorrow', zh: '明天' },
  'time.week': { en: 'Week', zh: '周' },
  'time.month': { en: 'Month', zh: '月' },
  'time.year': { en: 'Year', zh: '年' },

  // ========== 单位 ==========
  'unit.px': { en: 'px', zh: '像素' },
  'unit.percent': { en: '%', zh: '%' },
  'unit.deg': { en: 'deg', zh: '度' },
  'unit.ms': { en: 'ms', zh: '毫秒' },
  'unit.s': { en: 's', zh: '秒' },
  'unit.mm': { en: 'mm', zh: '毫米' },
  'unit.cm': { en: 'cm', zh: '厘米' },

  // ========== 视图模式 ==========
  'mode.flat': { en: 'Flat', zh: '展开' },
  'mode.folded': { en: 'Folded', zh: '折叠' },
  'mode.3d': { en: '3D View', zh: '3D 视图' },
  'mode.2d': { en: '2D View', zh: '2D 视图' },

  // ========== 工具栏 ==========
  'toolbar.design': { en: 'Design', zh: '设计' },
  'toolbar.preview': { en: 'Preview', zh: '预览' },
  'toolbar.export': { en: 'Export', zh: '导出' },
  'toolbar.settings': { en: 'Settings', zh: '设置' },
  'toolbar.components': { en: 'Components', zh: '组件' },
  'toolbar.tune': { en: 'Tune', zh: '调音台' },

  // ========== 尺寸设置 ==========
  'dimensions.title': { en: 'Dimensions', zh: '尺寸' },
  'dimensions.length': { en: 'Length', zh: '长度' },
  'dimensions.width': { en: 'Width', zh: '宽度' },
  'dimensions.height': { en: 'Height', zh: '高度' },
  'dimensions.thickness': { en: 'Thickness', zh: '厚度' },
  'dimensions.depth': { en: 'Depth', zh: '深度' },

  // ========== 预设 ==========
  'presets.title': { en: 'Presets', zh: '预设' },
  'presets.small': { en: 'Small', zh: '小号' },
  'presets.medium': { en: 'Medium', zh: '中号' },
  'presets.large': { en: 'Large', zh: '大号' },
  'presets.cube': { en: 'Cube', zh: '立方体' },
  'presets.custom': { en: 'Custom', zh: '自定义' },

  // ========== 刀版图设置 ==========
  'dieline.title': { en: 'Dieline', zh: '刀版图' },
  'dieline.bleed': { en: 'Bleed', zh: '出血' },
  'dieline.cutLine': { en: 'Cut Line', zh: '裁切线' },
  'dieline.foldLine': { en: 'Fold Line', zh: '折叠线' },
  'dieline.width': { en: 'Width', zh: '宽度' },
  'dieline.color': { en: 'Color', zh: '颜色' },
  'dieline.solid': { en: 'Solid', zh: '实线' },
  'dieline.dashed': { en: 'Dashed', zh: '虚线' },

  // ========== 3D 视图 ==========
  '3d.title': { en: '3D Preview', zh: '3D 预览' },
  '3d.subtitle': { en: 'Real-time Parametric PBR Rendering', zh: '实时参数化 PBR 渲染' },
  '3d.loading': { en: 'Loading 3D scene...', zh: '加载 3D 场景中...' },
  '3d.close': { en: 'Close 3D View (ESC)', zh: '关闭 3D 视图 (ESC)' },
  '3d.tip': { en: 'Tip: Drag to rotate, scroll to zoom, right-click to pan', zh: '提示：使用鼠标拖拽旋转，滚轮缩放，右键平移' },
  '3d.powered': { en: 'React Three Fiber + Lamina + WASM', zh: 'React Three Fiber + Lamina + WASM' },

  // ========== 按钮 ==========
  'button.reset': { en: 'Reset View', zh: '重置视图' },
  'button.import': { en: 'Import JSON', zh: '导入JSON' },
  'button.3d': { en: '3D', zh: '3D' },
  'button.printMaster': { en: 'PrintMaster', zh: '印刷导出' },

  // ========== 背景预设 ==========
  'bg.gradient': { en: 'Gradient', zh: '渐变' },
  'bg.grid': { en: 'Grid', zh: '网格' },
  'bg.dots': { en: 'Dots', zh: '波点' },
  'bg.vignette': { en: 'Vignette', zh: '暗角' },
  'bg.size': { en: 'Size', zh: '大小' },
  'bg.opacity': { en: 'Opacity', zh: '透明度' },
  'bg.spacing': { en: 'Spacing', zh: '间距' },
  'bg.color': { en: 'Color', zh: '颜色' },

  // ========== 信息卡片 ==========
  'info.parts': { en: 'Parts', zh: '部件数量' },
  'info.area': { en: 'Total Area', zh: '总面积' },
  'info.unit.parts': { en: 'pcs', zh: '个' },

  // ========== 导出 ==========
  'export.toFigma': { en: 'Export to Figma', zh: '导出到 Figma' },
  'export.powered': { en: 'Powered by WASM + React', zh: 'Powered by WASM + React' },

  // ========== 错误消息 ==========
  'error.jsonParseFailed': { en: 'JSON parsing failed! Please check the file format.', zh: 'JSON 解析失败！请检查文件格式。' },

  // ========== 许可证 ==========
  'license.pro': { en: 'PRO', zh: 'PRO' },
  'license.trial': { en: 'TRIAL', zh: 'TRIAL' },
};

/**
 * 合并翻译字典
 * @param base 基础翻译
 * @param custom 自定义翻译（会覆盖基础翻译）
 */
export function mergeTranslations(
  base: TranslationMap,
  custom: TranslationMap
): TranslationMap {
  return { ...base, ...custom };
}
