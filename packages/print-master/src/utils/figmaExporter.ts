// ============================================================================
// 🚀 Figma Export Service - 导出到 Figma
// ============================================================================

/**
 * 导出配置接口
 */
export interface ExportConfig {
  format: 'PDF' | 'PNG' | 'SVG' | 'JPG';
  scale: number;
  dpi: number;
  includeBleed: boolean;
  colorMode: 'RGB' | 'CMYK';
}

/**
 * 导出到 Figma
 */
export async function exportToFigma(config: ExportConfig): Promise<void> {
  try {
    console.log('🚀 Starting export to Figma...', config);

    // 发送消息到插件
    parent.postMessage({
      pluginMessage: {
        type: 'EXPORT_PRINT',
        payload: config
      }
    }, '*');
  } catch (error) {
    console.error('❌ Export failed:', error);
  }
}

/**
 * 应用印刷设置到选中节点
 */
export function applyPrintSettings(
  width: number,
  height: number,
  unit: 'mm' | 'in',
  bleed: number,
  dpi: number = 300
): void {
  try {
    console.log('📐 Applying print size...', { width, height, unit, bleed, dpi });

    // 发送消息到插件
    parent.postMessage({
      pluginMessage: {
        type: 'APPLY_PRINT_SIZE',
        payload: {
          width,
          height,
          unit,
          bleed,
          dpi
        }
      }
    }, '*');
  } catch (error) {
    console.error('❌ Apply size failed:', error);
  }
}
