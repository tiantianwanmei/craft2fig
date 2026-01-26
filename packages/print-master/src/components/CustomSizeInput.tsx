// ============================================================================
// ✏️ Custom Size Input - 自定义尺寸输入
// ============================================================================

import React, { useState, useEffect } from 'react';
import { SEMANTIC_TOKENS, BASE_TOKENS } from '@genki/shared-theme';
import { usePrintMasterStore } from '../store';

interface CustomSizeInputProps {
  className?: string;
}

export const CustomSizeInput: React.FC<CustomSizeInputProps> = ({ className = '' }) => {
  const { customWidth, customHeight, customUnit, setCustomSize } = usePrintMasterStore();

  const [width, setWidth] = useState(customWidth.toString());
  const [height, setHeight] = useState(customHeight.toString());
  const [unit, setUnit] = useState<'mm' | 'in'>(customUnit);

  // 常用预设尺寸
  const commonSizes = [
    { name: '名片', width: 90, height: 54, unit: 'mm' as const },
    { name: '明信片', width: 148, height: 105, unit: 'mm' as const },
    { name: '海报', width: 420, height: 594, unit: 'mm' as const },
    { name: '传单', width: 210, height: 297, unit: 'mm' as const },
  ];

  const handleApply = () => {
    const w = parseFloat(width);
    const h = parseFloat(height);

    if (isNaN(w) || isNaN(h) || w <= 0 || h <= 0) {
      alert('请输入有效的尺寸数值');
      return;
    }

    setCustomSize(w, h, unit);
  };

  const handlePresetClick = (preset: typeof commonSizes[0]) => {
    setWidth(preset.width.toString());
    setHeight(preset.height.toString());
    setUnit(preset.unit);
    setCustomSize(preset.width, preset.height, preset.unit);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: BASE_TOKENS.spacing[4] }}>
      {/* 标题 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: BASE_TOKENS.spacing[2],
        paddingBottom: BASE_TOKENS.spacing[2],
        borderBottom: `${BASE_TOKENS.borderWidth[1]} solid ${SEMANTIC_TOKENS.color.border.subtle}`,
      }}>
        <span style={{ fontSize: BASE_TOKENS.fontSize.lg }}>✏️</span>
        <h3 style={{
          fontSize: BASE_TOKENS.fontSize.sm,
          fontWeight: BASE_TOKENS.fontWeight.semibold,
          color: SEMANTIC_TOKENS.color.text.primary,
        }}>
          自定义尺寸
        </h3>
      </div>

      {/* 尺寸输入 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: BASE_TOKENS.spacing[3] }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: BASE_TOKENS.spacing[3] }}>
          {/* 宽度 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: BASE_TOKENS.spacing['1.5'] }}>
            <label style={{
              fontSize: BASE_TOKENS.fontSize.xs,
              fontWeight: BASE_TOKENS.fontWeight.medium,
              color: SEMANTIC_TOKENS.color.text.tertiary,
            }}>
              宽度
            </label>
            <input
              type="number"
              value={width}
              onChange={(e) => setWidth(e.target.value)}
              style={{
                width: '100%',
                padding: `${BASE_TOKENS.spacing[2]} ${BASE_TOKENS.spacing[3]}`,
                fontSize: BASE_TOKENS.fontSize.sm,
                border: `${BASE_TOKENS.borderWidth[1]} solid ${SEMANTIC_TOKENS.color.border.default}`,
                borderRadius: BASE_TOKENS.borderRadius.lg,
                backgroundColor: SEMANTIC_TOKENS.color.bg.secondary,
                color: SEMANTIC_TOKENS.color.text.primary,
              }}
              placeholder="宽度"
              min="1"
              step="0.1"
            />
          </div>

          {/* 高度 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: BASE_TOKENS.spacing['1.5'] }}>
            <label style={{
              fontSize: BASE_TOKENS.fontSize.xs,
              fontWeight: BASE_TOKENS.fontWeight.medium,
              color: SEMANTIC_TOKENS.color.text.tertiary,
            }}>
              高度
            </label>
            <input
              type="number"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              style={{
                width: '100%',
                padding: `${BASE_TOKENS.spacing[2]} ${BASE_TOKENS.spacing[3]}`,
                fontSize: BASE_TOKENS.fontSize.sm,
                border: `${BASE_TOKENS.borderWidth[1]} solid ${SEMANTIC_TOKENS.color.border.default}`,
                borderRadius: BASE_TOKENS.borderRadius.lg,
                backgroundColor: SEMANTIC_TOKENS.color.bg.secondary,
                color: SEMANTIC_TOKENS.color.text.primary,
              }}
              placeholder="高度"
              min="1"
              step="0.1"
            />
          </div>
        </div>

        {/* 单位选择 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: BASE_TOKENS.spacing['1.5'] }}>
          <label style={{
            fontSize: BASE_TOKENS.fontSize.xs,
            fontWeight: BASE_TOKENS.fontWeight.medium,
            color: SEMANTIC_TOKENS.color.text.tertiary,
          }}>
            单位
          </label>
          <div style={{ display: 'flex', gap: BASE_TOKENS.spacing[2] }}>
            <button
              onClick={() => setUnit('mm')}
              style={{
                flex: 1,
                padding: `${BASE_TOKENS.spacing[2]} ${BASE_TOKENS.spacing[3]}`,
                borderRadius: BASE_TOKENS.borderRadius.lg,
                fontSize: BASE_TOKENS.fontSize.xs,
                fontWeight: BASE_TOKENS.fontWeight.medium,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: unit === 'mm'
                  ? SEMANTIC_TOKENS.color.bg.interactive.selected
                  : SEMANTIC_TOKENS.color.bg.tertiary,
                color: unit === 'mm'
                  ? SEMANTIC_TOKENS.color.text.brand
                  : SEMANTIC_TOKENS.color.text.secondary,
                transition: `all ${BASE_TOKENS.duration.fast} ${BASE_TOKENS.easing.standard}`,
              }}
            >
              毫米 (mm)
            </button>
            <button
              onClick={() => setUnit('in')}
              style={{
                flex: 1,
                padding: `${BASE_TOKENS.spacing[2]} ${BASE_TOKENS.spacing[3]}`,
                borderRadius: BASE_TOKENS.borderRadius.lg,
                fontSize: BASE_TOKENS.fontSize.xs,
                fontWeight: BASE_TOKENS.fontWeight.medium,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: unit === 'in'
                  ? SEMANTIC_TOKENS.color.bg.interactive.selected
                  : SEMANTIC_TOKENS.color.bg.tertiary,
                color: unit === 'in'
                  ? SEMANTIC_TOKENS.color.text.brand
                  : SEMANTIC_TOKENS.color.text.secondary,
                transition: `all ${BASE_TOKENS.duration.fast} ${BASE_TOKENS.easing.standard}`,
              }}
            >
              英寸 (in)
            </button>
          </div>
        </div>

        {/* 应用按钮 */}
        <button
          onClick={handleApply}
          style={{
            width: '100%',
            padding: `${BASE_TOKENS.spacing['2.5']} ${BASE_TOKENS.spacing[4]}`,
            backgroundColor: SEMANTIC_TOKENS.color.bg.interactive.selected,
            color: SEMANTIC_TOKENS.color.text.brand,
            fontSize: BASE_TOKENS.fontSize.sm,
            fontWeight: BASE_TOKENS.fontWeight.medium,
            borderRadius: BASE_TOKENS.borderRadius.lg,
            border: 'none',
            cursor: 'pointer',
            transition: `all ${BASE_TOKENS.duration.fast} ${BASE_TOKENS.easing.standard}`,
            boxShadow: `0 ${BASE_TOKENS.spacing[1]} ${BASE_TOKENS.spacing[2]} ${SEMANTIC_TOKENS.color.shadow.small}`,
          }}
        >
          应用自定义尺寸
        </button>
      </div>

      {/* 常用预设 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: BASE_TOKENS.spacing[2] }}>
        <h4 style={{
          fontSize: BASE_TOKENS.fontSize.xs,
          fontWeight: BASE_TOKENS.fontWeight.medium,
          color: SEMANTIC_TOKENS.color.text.tertiary,
        }}>
          💡 常用尺寸
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: BASE_TOKENS.spacing[2] }}>
          {commonSizes.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => handlePresetClick(preset)}
              style={{
                padding: `${BASE_TOKENS.spacing[2]} ${BASE_TOKENS.spacing[3]}`,
                backgroundColor: SEMANTIC_TOKENS.color.bg.tertiary,
                borderRadius: BASE_TOKENS.borderRadius.lg,
                fontSize: BASE_TOKENS.fontSize.xs,
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                transition: `all ${BASE_TOKENS.duration.fast} ${BASE_TOKENS.easing.standard}`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = SEMANTIC_TOKENS.color.bg.interactive.hover;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = SEMANTIC_TOKENS.color.bg.tertiary;
              }}
            >
              <div style={{
                fontWeight: BASE_TOKENS.fontWeight.medium,
                color: SEMANTIC_TOKENS.color.text.primary,
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
    </div>
  );
};
