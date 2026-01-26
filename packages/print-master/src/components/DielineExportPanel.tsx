// ============================================================================
// 🔪 Dieline Export Panel - 刀版图导出面板（符合 Token 规范）
// ============================================================================

import React, { useState } from 'react';
import { SEMANTIC_TOKENS, BASE_TOKENS } from '@genki/shared-theme';
import { usePrintMasterStore } from '../store';
import { exportDielineJSON } from '../utils/dielineExporter';
import { exportDielineSVG } from '../utils/dielineSVGExporter';

interface DielineExportPanelProps {
  parts?: any[]; // 刀版图部件数据
  className?: string;
}

export const DielineExportPanel: React.FC<DielineExportPanelProps> = ({
  parts = [],
  className = ''
}) => {
  const settings = usePrintMasterStore((s) => s.settings);
  const [exportDpi, setExportDpi] = useState(300);
  const [includeBleed, setIncludeBleed] = useState(true);
  const [exportFormat, setExportFormat] = useState<'json' | 'svg' | 'pdf'>('json');

  const handleExport = () => {
    const options = {
      dpi: exportDpi,
      bleed: settings.bleed,
      includeBleed,
      format: exportFormat,
      colorMode: settings.colorProfile === 'sRGB' ? 'RGB' as const : 'CMYK' as const,
    };

    let content = '';
    let filename = '';
    let mimeType = '';

    switch (exportFormat) {
      case 'json':
        content = exportDielineJSON(parts, options);
        filename = `dieline_${Date.now()}.json`;
        mimeType = 'application/json';
        break;
      case 'svg':
        content = exportDielineSVG(parts, options);
        filename = `dieline_${Date.now()}.svg`;
        mimeType = 'image/svg+xml';
        break;
      default:
        alert('PDF 导出功能开发中');
        return;
    }

    // 下载文件
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: BASE_TOKENS.spacing[4] }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: BASE_TOKENS.spacing[2],
        paddingBottom: BASE_TOKENS.spacing[2],
        borderBottom: `${BASE_TOKENS.borderWidth[1]} solid ${SEMANTIC_TOKENS.color.border.subtle}`,
      }}>
        <span style={{ fontSize: BASE_TOKENS.fontSize.lg }}>🔪</span>
        <h3 style={{
          fontSize: BASE_TOKENS.fontSize.sm,
          fontWeight: BASE_TOKENS.fontWeight.semibold,
          color: SEMANTIC_TOKENS.color.text.primary,
        }}>
          刀版图导出
        </h3>
      </div>

      {/* DPI Selection */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: BASE_TOKENS.spacing[2] }}>
        <label style={{
          fontSize: BASE_TOKENS.fontSize.xs,
          fontWeight: BASE_TOKENS.fontWeight.medium,
          color: SEMANTIC_TOKENS.color.text.tertiary,
        }}>
          导出分辨率 (DPI)
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: BASE_TOKENS.spacing[2] }}>
          {[150, 300, 600, 1200].map(dpi => (
            <button
              key={dpi}
              onClick={() => setExportDpi(dpi)}
              style={{
                padding: `${BASE_TOKENS.spacing[2]} ${BASE_TOKENS.spacing[3]}`,
                borderRadius: BASE_TOKENS.borderRadius.lg,
                fontSize: BASE_TOKENS.fontSize.xs,
                fontWeight: BASE_TOKENS.fontWeight.medium,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: exportDpi === dpi
                  ? SEMANTIC_TOKENS.color.bg.interactive.selected
                  : SEMANTIC_TOKENS.color.bg.tertiary,
                color: exportDpi === dpi
                  ? SEMANTIC_TOKENS.color.text.brand
                  : SEMANTIC_TOKENS.color.text.primary,
                transition: `all ${BASE_TOKENS.duration.fast} ${BASE_TOKENS.easing.standard}`,
              }}
            >
              {dpi}
            </button>
          ))}
        </div>
      </div>

      {/* Format Selection */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: BASE_TOKENS.spacing[2] }}>
        <label style={{
          fontSize: BASE_TOKENS.fontSize.xs,
          fontWeight: BASE_TOKENS.fontWeight.medium,
          color: SEMANTIC_TOKENS.color.text.tertiary,
        }}>
          导出格式
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: BASE_TOKENS.spacing[2] }}>
          {[
            { value: 'json', label: 'JSON', icon: '📄' },
            { value: 'svg', label: 'SVG', icon: '🎨' },
            { value: 'pdf', label: 'PDF', icon: '📋' },
          ].map(format => (
            <button
              key={format.value}
              onClick={() => setExportFormat(format.value as any)}
              style={{
                padding: `${BASE_TOKENS.spacing[2]} ${BASE_TOKENS.spacing[3]}`,
                borderRadius: BASE_TOKENS.borderRadius.lg,
                fontSize: BASE_TOKENS.fontSize.xs,
                fontWeight: BASE_TOKENS.fontWeight.medium,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: exportFormat === format.value
                  ? SEMANTIC_TOKENS.color.bg.interactive.selected
                  : SEMANTIC_TOKENS.color.bg.tertiary,
                color: exportFormat === format.value
                  ? SEMANTIC_TOKENS.color.text.brand
                  : SEMANTIC_TOKENS.color.text.primary,
                transition: `all ${BASE_TOKENS.duration.fast} ${BASE_TOKENS.easing.standard}`,
              }}
            >
              <div>{format.icon}</div>
              <div style={{ marginTop: BASE_TOKENS.spacing[1] }}>{format.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Bleed Option */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: BASE_TOKENS.spacing[2] }}>
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: BASE_TOKENS.spacing[2],
          cursor: 'pointer',
        }}>
          <input
            type="checkbox"
            checked={includeBleed}
            onChange={(e) => setIncludeBleed(e.target.checked)}
            style={{ width: '16px', height: '16px' }}
          />
          <span style={{
            fontSize: BASE_TOKENS.fontSize.xs,
            color: SEMANTIC_TOKENS.color.text.primary,
          }}>
            包含出血区域 ({settings.bleed}mm)
          </span>
        </label>
        <p style={{
          fontSize: BASE_TOKENS.fontSize.xs,
          color: SEMANTIC_TOKENS.color.text.secondary,
          paddingLeft: `calc(16px + ${BASE_TOKENS.spacing[2]})`,
        }}>
          出血将基于刀版图外轮廓自动计算
        </p>
      </div>

      {/* Export Button */}
      <button
        onClick={handleExport}
        disabled={parts.length === 0}
        style={{
          width: '100%',
          padding: `${BASE_TOKENS.spacing[3]} ${BASE_TOKENS.spacing[4]}`,
          backgroundColor: parts.length === 0
            ? SEMANTIC_TOKENS.color.bg.tertiary
            : SEMANTIC_TOKENS.color.bg.interactive.selected,
          color: SEMANTIC_TOKENS.color.text.brand,
          fontSize: BASE_TOKENS.fontSize.sm,
          fontWeight: BASE_TOKENS.fontWeight.medium,
          borderRadius: BASE_TOKENS.borderRadius.lg,
          border: 'none',
          cursor: parts.length === 0 ? 'not-allowed' : 'pointer',
          opacity: parts.length === 0 ? 0.5 : 1,
          transition: `all ${BASE_TOKENS.duration.fast} ${BASE_TOKENS.easing.standard}`,
        }}
      >
        {parts.length === 0 ? '无刀版图数据' : '导出刀版图'}
      </button>

      {/* Export Info */}
      {parts.length > 0 && (
        <div style={{
          padding: BASE_TOKENS.spacing[3],
          backgroundColor: SEMANTIC_TOKENS.color.surface.info,
          border: `${BASE_TOKENS.borderWidth[1]} solid ${SEMANTIC_TOKENS.color.border.info}`,
          borderRadius: BASE_TOKENS.borderRadius.lg,
        }}>
          <div style={{
            fontSize: BASE_TOKENS.fontSize.xs,
            color: SEMANTIC_TOKENS.color.text.secondary,
            display: 'flex',
            flexDirection: 'column',
            gap: BASE_TOKENS.spacing[1],
          }}>
            <div>📊 部件数量: {parts.length}</div>
            <div>📐 分辨率: {exportDpi} DPI</div>
            <div>🎨 色彩模式: {settings.colorProfile === 'sRGB' ? 'RGB' : 'CMYK'}</div>
            <div>✂️ 出血: {includeBleed ? `${settings.bleed}mm` : '无'}</div>
          </div>
        </div>
      )}
    </div>
  );
};
