// ============================================================================
// 📤 Export Panel - 真正的导出功能面板
// ============================================================================

import React, { useState } from 'react';
import { usePrintMasterStore } from '../store';
import { useTokenStore } from '../../../app/store/useTokenStore';
import { exportToFigma, applyPrintSettings } from '../utils/figmaExporter';

export const ExportPanel: React.FC = () => {
  const tokens = useTokenStore(s => s.resolvedTokens);
  const settings = usePrintMasterStore(s => s.settings);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format: 'PDF' | 'PNG' | 'SVG' | 'JPG') => {
    setIsExporting(true);
    try {
      await exportToFigma({
        format,
        scale: settings.dpi / 72,
        dpi: settings.dpi,
        includeBleed: true,
        colorMode: settings.simulateCMYK ? 'CMYK' : 'RGB',
      });
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleApplySize = () => {
    const { preset, orientation } = settings;
    const w = orientation === 'landscape' ? preset.height : preset.width;
    const h = orientation === 'landscape' ? preset.width : preset.height;
    applyPrintSettings(w, h, preset.unit, settings.bleed);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* 应用尺寸按钮 */}
      <button
        onClick={handleApplySize}
        style={{
          padding: '12px',
          backgroundColor: tokens['semantic-bg-action-primary-default'] || 'var(--semantic-text-brand)',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '13px',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        📐 应用尺寸到选中图层
      </button>

      {/* 导出格式标题 */}
      <div style={{
        fontSize: '11px',
        fontWeight: 600,
        color: tokens['semantic-fg-text-tertiary'] || 'var(--semantic-text-tertiary)',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
      }}>
        导出格式
      </div>
