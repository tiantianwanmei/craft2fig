// ============================================================================
// 🖨️ Print Master Pro - Enhanced Panel with New Features
// ============================================================================

import React, { useState, useMemo } from 'react';
import { SEMANTIC_TOKENS, BASE_TOKENS } from '@genki/shared-theme';
import { usePrintMasterStore } from '../store';
import { ALL_PRESETS, PRESET_CATEGORIES, DPI_PRESETS } from '../presets';
import { calculatePixelDimensions } from '../utils';
import { PrintSpecifications } from './PrintSpecifications';
import { ExportGuide } from './ExportGuide';
import { CustomSizeInput } from './CustomSizeInput';
import { DielineExportPanel } from './DielineExportPanel';
import { exportToFigma, applyPrintSettings } from '../utils/figmaExporter';

type TabType = 'settings' | 'specs' | 'export' | 'dieline';

export const PrintMasterPanelEnhanced: React.FC = () => {
  const {
    settings,
    isOpen,
    activeCategory,
    setPreset,
    setDpi,
    setOrientation,
    setBleed,
    setSimulateCMYK,
    setColorProfile,
    setActiveCategory,
    closePanel,
  } = usePrintMasterStore();

  const [activeTab, setActiveTab] = useState<TabType>('settings');
  const [exportFormat, setExportFormat] = useState<'PDF' | 'PNG' | 'SVG' | 'JPG'>('PNG');
  const [isExporting, setIsExporting] = useState(false);

  // 处理导出
  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportToFigma({
        format: exportFormat,
        scale: settings.dpi / 72, // 转换 DPI 为缩放比例
        dpi: settings.dpi,
        includeBleed: settings.bleed > 0,
        colorMode: settings.colorProfile === 'CMYK' ? 'CMYK' : 'RGB',
      });
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  // 创建印刷画布
  const handleCreateCanvas = () => {
    parent.postMessage({
      pluginMessage: {
        type: 'CREATE_PRINT_FRAME',
        payload: settings
      }
    }, '*');
  };

  // Filter presets by category
  const filteredPresets = useMemo(() => {
    return ALL_PRESETS.filter(p => p.category === activeCategory);
  }, [activeCategory]);

  // Calculate pixel dimensions
  const pixelDims = useMemo(() => {
    const { preset, dpi, orientation } = settings;
    const w = orientation === 'landscape' ? preset.height : preset.width;
    const h = orientation === 'landscape' ? preset.width : preset.height;
    return calculatePixelDimensions(w, h, preset.unit, dpi);
  }, [settings]);

  if (!isOpen) return null;

  const tabs = [
    { id: 'settings' as const, label: '设置', icon: '⚙️' },
    { id: 'specs' as const, label: '规格', icon: '📋' },
    { id: 'export' as const, label: '导出', icon: '📤' },
    { id: 'dieline' as const, label: '刀版图', icon: '🔪' },
  ];

  return (
    <div style={{
      position: 'fixed',
      top: '60px',
      left: '16px',
      width: '360px',
      maxHeight: 'calc(100vh - 80px)',
      backgroundColor: SEMANTIC_TOKENS.color.bg.secondary,
      backdropFilter: `blur(${BASE_TOKENS.blur.lg})`,
      borderRadius: BASE_TOKENS.borderRadius.lg,
      border: `${BASE_TOKENS.borderWidth[1]} solid ${SEMANTIC_TOKENS.color.border.default}`,
      boxShadow: `0 ${BASE_TOKENS.spacing[2]} 32px ${SEMANTIC_TOKENS.color.shadow.large}`,
      zIndex: 1000,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        padding: BASE_TOKENS.spacing[4],
        borderBottom: `${BASE_TOKENS.borderWidth[1]} solid ${SEMANTIC_TOKENS.color.border.default}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{
          fontSize: BASE_TOKENS.fontSize.xl,
          fontWeight: BASE_TOKENS.fontWeight.semibold,
          color: SEMANTIC_TOKENS.color.text.primary,
          display: 'flex',
          alignItems: 'center',
          gap: BASE_TOKENS.spacing[2],
        }}>
          <span>🖨️</span>
          Print Master Pro
        </div>
        <button
          style={{
            width: '24px',
            height: '24px',
            borderRadius: BASE_TOKENS.borderRadius.sm,
            border: 'none',
            backgroundColor: SEMANTIC_TOKENS.color.bg.tertiary,
            color: SEMANTIC_TOKENS.color.text.secondary,
            cursor: 'pointer',
            fontSize: BASE_TOKENS.fontSize.sm,
          }}
          onClick={closePanel}
        >
          ✕
        </button>
      </div>

      {/* Tab Navigation */}
      <div style={{
        padding: `${BASE_TOKENS.spacing[3]} ${BASE_TOKENS.spacing[4]}`,
        borderBottom: `${BASE_TOKENS.borderWidth[1]} solid ${SEMANTIC_TOKENS.color.border.default}`,
        display: 'flex',
        gap: BASE_TOKENS.spacing[1],
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              padding: `${BASE_TOKENS.spacing[2]} ${BASE_TOKENS.spacing[1]}`,
              fontSize: BASE_TOKENS.fontSize.xs,
              borderRadius: BASE_TOKENS.borderRadius.sm,
              border: 'none',
              cursor: 'pointer',
              backgroundColor: activeTab === tab.id
                ? SEMANTIC_TOKENS.color.bg.interactive.selected
                : SEMANTIC_TOKENS.color.bg.tertiary,
              color: activeTab === tab.id
                ? SEMANTIC_TOKENS.color.text.brand
                : SEMANTIC_TOKENS.color.text.secondary,
              transition: `all ${BASE_TOKENS.duration.fast} ${BASE_TOKENS.easing.standard}`,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: BASE_TOKENS.spacing['0.5'] }}>
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{
        padding: BASE_TOKENS.spacing[4],
        overflowY: 'auto',
        flex: 1,
        minHeight: 0,
      }}>
        {activeTab === 'settings' && (
          <>
            {/* Category Selection */}
            <div style={{ marginBottom: BASE_TOKENS.spacing[4] }}>
              <div style={{
                fontSize: BASE_TOKENS.fontSize.sm,
                fontWeight: BASE_TOKENS.fontWeight.semibold,
                color: SEMANTIC_TOKENS.color.text.tertiary,
                textTransform: 'uppercase',
                letterSpacing: BASE_TOKENS.letterSpacing.wide,
                marginBottom: BASE_TOKENS.spacing[2],
              }}>
                类别
              </div>
              <div style={{ display: 'flex', gap: BASE_TOKENS.spacing[1], flexWrap: 'wrap' }}>
                {PRESET_CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    style={{
                      padding: `${BASE_TOKENS.spacing[1.5]} ${BASE_TOKENS.spacing[3]}`,
                      fontSize: BASE_TOKENS.fontSize.sm,
                      borderRadius: BASE_TOKENS.borderRadius.sm,
                      border: 'none',
                      cursor: 'pointer',
                      backgroundColor: activeCategory === cat.id
                        ? SEMANTIC_TOKENS.color.bg.interactive.selected
                        : SEMANTIC_TOKENS.color.bg.tertiary,
                      color: activeCategory === cat.id
                        ? SEMANTIC_TOKENS.color.text.brand
                        : SEMANTIC_TOKENS.color.text.secondary,
                    }}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Preset Selection */}
            {activeCategory !== 'Custom' && (
              <div style={{ marginBottom: BASE_TOKENS.spacing[4] }}>
                <div style={{
                  fontSize: BASE_TOKENS.fontSize.sm,
                  fontWeight: BASE_TOKENS.fontWeight.semibold,
                  color: SEMANTIC_TOKENS.color.text.tertiary,
                  textTransform: 'uppercase',
                  letterSpacing: BASE_TOKENS.letterSpacing.wide,
                  marginBottom: BASE_TOKENS.spacing[2],
                }}>
                  预设尺寸 ({filteredPresets.length})
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: BASE_TOKENS.spacing[2] }}>
                  {filteredPresets.map(preset => (
                  <button
                    key={preset.id}
                    onClick={() => setPreset(preset)}
                    style={{
                      padding: BASE_TOKENS.spacing[3],
                      borderRadius: BASE_TOKENS.borderRadius.md,
                      border: settings.preset.id === preset.id
                        ? `2px solid ${SEMANTIC_TOKENS.color.text.brand}`
                        : `1px solid ${SEMANTIC_TOKENS.color.border.default}`,
                      backgroundColor: settings.preset.id === preset.id
                        ? SEMANTIC_TOKENS.color.bg.interactive.selected
                        : SEMANTIC_TOKENS.color.bg.tertiary,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{
                      fontSize: BASE_TOKENS.fontSize.md,
                      fontWeight: BASE_TOKENS.fontWeight.semibold,
                      color: SEMANTIC_TOKENS.color.text.primary,
                      marginBottom: BASE_TOKENS.spacing[1],
                    }}>
                      {preset.name}
                    </div>
                    <div style={{
                      fontSize: BASE_TOKENS.fontSize.xs,
                      color: SEMANTIC_TOKENS.color.text.secondary,
                    }}>
                      {preset.width} × {preset.height} {preset.unit}
                    </div>
                  </button>
                ))}
              </div>
            </div>
            )}

            {/* Custom Size Input for Custom Category */}
            {activeCategory === 'Custom' && (
              <div style={{ marginBottom: BASE_TOKENS.spacing[4] }}>
                <CustomSizeInput />
              </div>
            )}

            {/* DPI Selection */}
            <div style={{ marginBottom: BASE_TOKENS.spacing[4] }}>
              <div style={{
                fontSize: BASE_TOKENS.fontSize.sm,
                fontWeight: BASE_TOKENS.fontWeight.semibold,
                color: SEMANTIC_TOKENS.color.text.tertiary,
                textTransform: 'uppercase',
                letterSpacing: BASE_TOKENS.letterSpacing.wide,
                marginBottom: BASE_TOKENS.spacing[2],
              }}>
                分辨率 (DPI)
              </div>
              <div style={{ display: 'flex', gap: BASE_TOKENS.spacing[1] }}>
                {DPI_PRESETS.map(dpi => (
                  <button
                    key={dpi.value}
                    onClick={() => setDpi(dpi.value)}
                    style={{
                      flex: 1,
                      padding: BASE_TOKENS.spacing[2],
                      fontSize: BASE_TOKENS.fontSize.sm,
                      borderRadius: BASE_TOKENS.borderRadius.sm,
                      border: 'none',
                      cursor: 'pointer',
                      backgroundColor: settings.dpi === dpi.value
                        ? SEMANTIC_TOKENS.color.bg.interactive.selected
                        : SEMANTIC_TOKENS.color.bg.tertiary,
                      color: settings.dpi === dpi.value
                        ? SEMANTIC_TOKENS.color.text.brand
                        : SEMANTIC_TOKENS.color.text.secondary,
                    }}
                  >
                    <div style={{ fontWeight: BASE_TOKENS.fontWeight.semibold }}>{dpi.value}</div>
                    <div style={{ fontSize: BASE_TOKENS.fontSize.micro, opacity: 0.7 }}>{dpi.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Orientation */}
            <div style={{ marginBottom: BASE_TOKENS.spacing[4] }}>
              <div style={{
                fontSize: BASE_TOKENS.fontSize.sm,
                fontWeight: BASE_TOKENS.fontWeight.semibold,
                color: SEMANTIC_TOKENS.color.text.tertiary,
                textTransform: 'uppercase',
                letterSpacing: BASE_TOKENS.letterSpacing.wide,
                marginBottom: BASE_TOKENS.spacing[2],
              }}>
                方向
              </div>
              <div style={{ display: 'flex', gap: BASE_TOKENS.spacing[2] }}>
                <button
                  onClick={() => setOrientation('portrait')}
                  style={{
                    flex: 1,
                    padding: BASE_TOKENS.spacing[3],
                    borderRadius: BASE_TOKENS.borderRadius.md,
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: settings.orientation === 'portrait'
                      ? SEMANTIC_TOKENS.color.bg.interactive.selected
                      : SEMANTIC_TOKENS.color.bg.tertiary,
                    color: settings.orientation === 'portrait'
                      ? SEMANTIC_TOKENS.color.text.brand
                      : SEMANTIC_TOKENS.color.text.secondary,
                  }}
                >
                  📄 竖向
                </button>
                <button
                  onClick={() => setOrientation('landscape')}
                  style={{
                    flex: 1,
                    padding: BASE_TOKENS.spacing[3],
                    borderRadius: BASE_TOKENS.borderRadius.md,
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: settings.orientation === 'landscape'
                      ? SEMANTIC_TOKENS.color.bg.interactive.selected
                      : SEMANTIC_TOKENS.color.bg.tertiary,
                    color: settings.orientation === 'landscape'
                      ? SEMANTIC_TOKENS.color.text.brand
                      : SEMANTIC_TOKENS.color.text.secondary,
                  }}
                >
                  📃 横向
                </button>
              </div>
            </div>

            {/* Bleed */}
            <div style={{ marginBottom: BASE_TOKENS.spacing[4] }}>
              <div style={{
                fontSize: BASE_TOKENS.fontSize.sm,
                fontWeight: BASE_TOKENS.fontWeight.semibold,
                color: SEMANTIC_TOKENS.color.text.tertiary,
                textTransform: 'uppercase',
                letterSpacing: BASE_TOKENS.letterSpacing.wide,
                marginBottom: BASE_TOKENS.spacing[2],
              }}>
                出血 (Bleed): {settings.bleed}mm
              </div>
              <input
                type="range"
                min="0"
                max="10"
                step="0.5"
                value={settings.bleed}
                onChange={(e) => setBleed(parseFloat(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>

            {/* Color Settings */}
            <div style={{ marginBottom: BASE_TOKENS.spacing[4] }}>
              <div style={{
                fontSize: BASE_TOKENS.fontSize.sm,
                fontWeight: BASE_TOKENS.fontWeight.semibold,
                color: SEMANTIC_TOKENS.color.text.tertiary,
                textTransform: 'uppercase',
                letterSpacing: BASE_TOKENS.letterSpacing.wide,
                marginBottom: BASE_TOKENS.spacing[2],
              }}>
                颜色设置
              </div>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: BASE_TOKENS.spacing[2],
                padding: BASE_TOKENS.spacing[2],
                borderRadius: BASE_TOKENS.borderRadius.sm,
                backgroundColor: SEMANTIC_TOKENS.color.bg.tertiary,
                cursor: 'pointer',
                marginBottom: BASE_TOKENS.spacing[2],
              }}>
                <input
                  type="checkbox"
                  checked={settings.simulateCMYK}
                  onChange={(e) => setSimulateCMYK(e.target.checked)}
                />
                <span style={{ fontSize: BASE_TOKENS.fontSize.md, color: SEMANTIC_TOKENS.color.text.primary }}>
                  模拟 CMYK 颜色
                </span>
              </label>
              <select
                value={settings.colorProfile}
                onChange={(e) => setColorProfile(e.target.value as any)}
                style={{
                  width: '100%',
                  padding: BASE_TOKENS.spacing[2],
                  borderRadius: BASE_TOKENS.borderRadius.sm,
                  border: `1px solid ${SEMANTIC_TOKENS.color.border.default}`,
                  backgroundColor: SEMANTIC_TOKENS.color.bg.secondary,
                  color: SEMANTIC_TOKENS.color.text.primary,
                  fontSize: BASE_TOKENS.fontSize.md,
                }}
              >
                <option value="sRGB">sRGB (Web)</option>
                <option value="Adobe RGB">Adobe RGB</option>
                <option value="CMYK">CMYK</option>
              </select>
            </div>

            {/* Pixel Dimensions Display */}
            <div style={{
              padding: BASE_TOKENS.spacing[3],
              borderRadius: BASE_TOKENS.borderRadius.md,
              backgroundColor: SEMANTIC_TOKENS.color.bg.interactive.selected,
              border: `1px solid ${SEMANTIC_TOKENS.color.text.brand}`,
            }}>
              <div style={{
                fontSize: BASE_TOKENS.fontSize.sm,
                fontWeight: BASE_TOKENS.fontWeight.semibold,
                color: SEMANTIC_TOKENS.color.text.brand,
                marginBottom: BASE_TOKENS.spacing[1],
              }}>
                像素尺寸
              </div>
              <div style={{
                fontSize: BASE_TOKENS.fontSize["2xl"],
                fontWeight: BASE_TOKENS.fontWeight.bold,
                color: SEMANTIC_TOKENS.color.text.primary,
              }}>
                {pixelDims.width} × {pixelDims.height} px
              </div>
            </div>

            {/* Apply Size Button */}
            <button
              onClick={handleCreateCanvas}
              style={{
                width: '100%',
                padding: BASE_TOKENS.spacing[3],
                marginTop: BASE_TOKENS.spacing[4],
                borderRadius: BASE_TOKENS.borderRadius.md,
                border: 'none',
                backgroundColor: SEMANTIC_TOKENS.color.bg.interactive.selected,
                color: SEMANTIC_TOKENS.color.text.brand,
                fontSize: BASE_TOKENS.fontSize.lg,
                fontWeight: BASE_TOKENS.fontWeight.semibold,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: BASE_TOKENS.spacing[2],
                transition: `all ${BASE_TOKENS.duration.fast} ${BASE_TOKENS.easing.standard}`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.8';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
            >
              <span>🎨</span>
              创建印刷画布
            </button>
          </>
        )}

        {activeTab === 'specs' && <PrintSpecifications />}

        {activeTab === 'export' && (
          <>
            {/* Export Format Selection */}
            <div style={{ marginBottom: BASE_TOKENS.spacing[4] }}>
              <div style={{
                fontSize: BASE_TOKENS.fontSize.sm,
                fontWeight: BASE_TOKENS.fontWeight.semibold,
                color: SEMANTIC_TOKENS.color.text.tertiary,
                textTransform: 'uppercase',
                letterSpacing: BASE_TOKENS.letterSpacing.wide,
                marginBottom: BASE_TOKENS.spacing[2],
              }}>
                导出格式
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: BASE_TOKENS.spacing[2] }}>
                {(['PNG', 'JPG', 'PDF', 'SVG'] as const).map(format => (
                  <button
                    key={format}
                    onClick={() => setExportFormat(format)}
                    style={{
                      padding: BASE_TOKENS.spacing[3],
                      borderRadius: BASE_TOKENS.borderRadius.md,
                      border: exportFormat === format
                        ? `2px solid ${SEMANTIC_TOKENS.color.text.brand}`
                        : `1px solid ${SEMANTIC_TOKENS.color.border.default}`,
                      backgroundColor: exportFormat === format
                        ? SEMANTIC_TOKENS.color.bg.interactive.selected
                        : SEMANTIC_TOKENS.color.bg.tertiary,
                      cursor: 'pointer',
                      fontSize: BASE_TOKENS.fontSize.lg,
                      fontWeight: BASE_TOKENS.fontWeight.semibold,
                      color: SEMANTIC_TOKENS.color.text.primary,
                    }}
                  >
                    {format}
                  </button>
                ))}
              </div>
            </div>

            {/* Export Settings Summary */}
            <div style={{
              padding: BASE_TOKENS.spacing[3],
              borderRadius: BASE_TOKENS.borderRadius.md,
              backgroundColor: SEMANTIC_TOKENS.color.bg.tertiary,
              marginBottom: BASE_TOKENS.spacing[4],
            }}>
              <div style={{
                fontSize: BASE_TOKENS.fontSize.sm,
                fontWeight: BASE_TOKENS.fontWeight.semibold,
                color: SEMANTIC_TOKENS.color.text.tertiary,
                marginBottom: BASE_TOKENS.spacing[2],
              }}>
                导出设置
              </div>
              <div style={{ fontSize: BASE_TOKENS.fontSize.md, color: SEMANTIC_TOKENS.color.text.secondary, lineHeight: '1.6' }}>
                <div>📐 尺寸: {pixelDims.width} × {pixelDims.height} px</div>
                <div>🎨 DPI: {settings.dpi}</div>
                <div>🖼️ 出血: {settings.bleed}mm</div>
                <div>🎨 颜色: {settings.colorProfile}</div>
              </div>
            </div>

            {/* Export Button */}
            <button
              onClick={handleExport}
              disabled={isExporting}
              style={{
                width: '100%',
                padding: BASE_TOKENS.spacing[4],
                borderRadius: BASE_TOKENS.borderRadius.md,
                border: 'none',
                backgroundColor: isExporting
                  ? SEMANTIC_TOKENS.color.bg.tertiary
                  : SEMANTIC_TOKENS.color.bg.interactive.selected,
                color: SEMANTIC_TOKENS.color.text.brand,
                fontSize: BASE_TOKENS.fontSize.xl,
                fontWeight: BASE_TOKENS.fontWeight.bold,
                cursor: isExporting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: BASE_TOKENS.spacing[2],
                transition: `all ${BASE_TOKENS.duration.fast} ${BASE_TOKENS.easing.standard}`,
                opacity: isExporting ? 0.6 : 1,
              }}
            >
              <span>📤</span>
              {isExporting ? '导出中...' : `导出为 ${exportFormat}`}
            </button>

            {/* Export Guide */}
            <div style={{
              marginTop: BASE_TOKENS.spacing[4],
              padding: BASE_TOKENS.spacing[3],
              borderRadius: BASE_TOKENS.borderRadius.md,
              backgroundColor: SEMANTIC_TOKENS.color.bg.tertiary,
            }}>
              <div style={{
                fontSize: BASE_TOKENS.fontSize.sm,
                fontWeight: BASE_TOKENS.fontWeight.semibold,
                color: SEMANTIC_TOKENS.color.text.tertiary,
                marginBottom: BASE_TOKENS.spacing[2],
              }}>
                💡 使用提示
              </div>
              <div style={{ fontSize: BASE_TOKENS.fontSize.sm, color: SEMANTIC_TOKENS.color.text.secondary, lineHeight: '1.6' }}>
                <div>• 请先选择要导出的图层</div>
                <div>• PNG/JPG 适合位图导出</div>
                <div>• PDF/SVG 适合矢量导出</div>
                <div>• 导出会自动应用当前设置</div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'dieline' && <DielineExportPanel />}
      </div>
    </div>
  );
};
