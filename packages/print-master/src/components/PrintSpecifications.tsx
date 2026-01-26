// ============================================================================
// 🖨️ Print Specifications - 印刷规格说明
// ============================================================================

import React from 'react';
import { SEMANTIC_TOKENS, BASE_TOKENS } from '@genki/shared-theme';
import { usePrintMasterStore } from '../store';

interface PrintSpecificationsProps {
  className?: string;
}

export const PrintSpecifications: React.FC<PrintSpecificationsProps> = ({ className = '' }) => {
  const settings = usePrintMasterStore((s) => s.settings);
  const { preset, dpi, orientation, bleed, colorProfile } = settings;

  // 计算像素尺寸
  const widthMM = preset.unit === 'mm' ? preset.width : preset.width * 25.4;
  const heightMM = preset.unit === 'mm' ? preset.height : preset.height * 25.4;
  const widthPx = Math.round((widthMM / 25.4) * dpi);
  const heightPx = Math.round((heightMM / 25.4) * dpi);

  // 计算带出血的尺寸
  const widthWithBleed = widthMM + (bleed * 2);
  const heightWithBleed = heightMM + (bleed * 2);
  const widthPxWithBleed = Math.round((widthWithBleed / 25.4) * dpi);
  const heightPxWithBleed = Math.round((heightWithBleed / 25.4) * dpi);

  // 计算文件大小估算 (RGB: 3 bytes/pixel, CMYK: 4 bytes/pixel)
  const bytesPerPixel = colorProfile === 'sRGB' ? 3 : 4;
  const fileSizeBytes = widthPxWithBleed * heightPxWithBleed * bytesPerPixel;
  const fileSizeMB = (fileSizeBytes / (1024 * 1024)).toFixed(2);

  const specs = [
    {
      category: '📐 尺寸规格',
      items: [
        { label: '预设名称', value: preset.name },
        { label: '成品尺寸', value: `${preset.width} × ${preset.height} ${preset.unit}` },
        { label: '成品尺寸 (mm)', value: `${widthMM.toFixed(1)} × ${heightMM.toFixed(1)} mm` },
        { label: '方向', value: orientation === 'portrait' ? '竖向 (Portrait)' : '横向 (Landscape)' },
      ],
    },
    {
      category: '🎨 印刷参数',
      items: [
        { label: '分辨率', value: `${dpi} DPI` },
        { label: '出血', value: `${bleed} mm` },
        { label: '色彩模式', value: colorProfile === 'sRGB' ? 'RGB' : 'CMYK' },
        { label: '色彩配置文件', value: colorProfile },
      ],
    },
    {
      category: '📊 输出规格',
      items: [
        { label: '成品像素', value: `${widthPx} × ${heightPx} px` },
        { label: '含出血像素', value: `${widthPxWithBleed} × ${heightPxWithBleed} px` },
        { label: '含出血尺寸', value: `${widthWithBleed.toFixed(1)} × ${heightWithBleed.toFixed(1)} mm` },
        { label: '预估文件大小', value: `${fileSizeMB} MB (未压缩)` },
      ],
    },
  ];

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
        <span style={{ fontSize: BASE_TOKENS.fontSize.lg }}>📋</span>
        <h3 style={{
          fontSize: BASE_TOKENS.fontSize.sm,
          fontWeight: BASE_TOKENS.fontWeight.semibold,
          color: SEMANTIC_TOKENS.color.text.primary,
        }}>
          印刷规格说明
        </h3>
      </div>

      {/* Specs Sections */}
      {specs.map((section, idx) => (
        <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: BASE_TOKENS.spacing[2] }}>
          <h4 style={{
            fontSize: BASE_TOKENS.fontSize.xs,
            fontWeight: BASE_TOKENS.fontWeight.medium,
            color: SEMANTIC_TOKENS.color.text.tertiary,
          }}>
            {section.category}
          </h4>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: BASE_TOKENS.spacing['1.5'],
            paddingLeft: BASE_TOKENS.spacing[2],
          }}>
            {section.items.map((item, itemIdx) => (
              <div
                key={itemIdx}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: BASE_TOKENS.fontSize.xs,
                }}
              >
                <span style={{ color: SEMANTIC_TOKENS.color.text.secondary }}>
                  {item.label}:
                </span>
                <span style={{
                  fontFamily: 'monospace',
                  color: SEMANTIC_TOKENS.color.text.primary,
                  fontWeight: BASE_TOKENS.fontWeight.medium,
                }}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Warning Box */}
      <div style={{
        marginTop: BASE_TOKENS.spacing[4],
        padding: BASE_TOKENS.spacing[3],
        backgroundColor: SEMANTIC_TOKENS.color.surface.info,
        border: `${BASE_TOKENS.borderWidth[1]} solid ${SEMANTIC_TOKENS.color.border.info}`,
        borderRadius: BASE_TOKENS.borderRadius.lg,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: BASE_TOKENS.spacing[2] }}>
          <span style={{ color: SEMANTIC_TOKENS.color.text.warning, fontSize: BASE_TOKENS.fontSize.sm }}>⚠️</span>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: BASE_TOKENS.spacing[1] }}>
            <p style={{
              fontSize: BASE_TOKENS.fontSize.xs,
              fontWeight: BASE_TOKENS.fontWeight.medium,
              color: SEMANTIC_TOKENS.color.text.brand,
            }}>
              印刷注意事项
            </p>
            <ul style={{
              fontSize: BASE_TOKENS.fontSize.xs,
              color: SEMANTIC_TOKENS.color.text.secondary,
              display: 'flex',
              flexDirection: 'column',
              gap: BASE_TOKENS.spacing['0.5'],
              listStyleType: 'disc',
              listStylePosition: 'inside',
            }}>
              <li>请确保重要内容距离裁切线至少 3mm</li>
              <li>背景和图片需延伸至出血线外</li>
              <li>使用 CMYK 色彩模式以获得准确的印刷颜色</li>
              <li>文字建议使用黑色 (K100) 以获得最佳效果</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
