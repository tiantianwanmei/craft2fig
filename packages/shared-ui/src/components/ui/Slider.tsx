// ============================================================================
// SLIDER COMPONENT - Figma 级属性面板风格（Inspector Row）
// ============================================================================
// 设计参考：Figma/Blender/Lightroom 的参数调整面板
// 两栏布局：左侧标签（灰色） + 右侧滑块+数值（高亮）

import { memo, useCallback, useRef, useState } from 'react';

interface SliderProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  unit?: string;
  disabled?: boolean;
  className?: string;
  onChange: (value: number) => void;
  onChangeEnd?: (value: number) => void;
}

export const Slider = memo(function Slider({
  value,
  min = 0,
  max = 100,
  step = 1,
  label,
  unit = '',
  disabled = false,
  className = '',
  onChange,
  onChangeEnd,
}: SliderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const percentage = ((value - min) / (max - min)) * 100;

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = parseFloat(e.target.value);
      onChange(newValue);
    },
    [onChange]
  );

  const handleMouseDown = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    if (onChangeEnd) {
      onChangeEnd(value);
    }
  }, [onChangeEnd, value]);

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        height: '24px',
        alignItems: 'center',
        gap: '8px',
        width: '100%',
      }}
    >
      {/* 左侧：标签 - 自适应宽度 */}
      {label && (
        <label
          style={{
            fontSize: 'var(--p-text-10)',
            fontWeight: 'var(--p-font-medium)',
            color: 'var(--fg-text-secondary)',
            flexShrink: 0,
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </label>
      )}

      {/* 右侧：进度条样式 */}
      <div
        style={{
          position: 'relative',
          flex: 1,
          height: '6px',
          background: 'var(--overlay-white-10)',
          borderRadius: 'var(--p-radius-full)',
          overflow: 'hidden',
        }}
      >
        {/* 填充进度 */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            height: '100%',
            width: `${percentage}%`,
            background: isDragging
              ? 'var(--semantic-bg-action-primary-hover)'
              : 'var(--semantic-bg-action-primary-default)',
            transition: isDragging ? 'none' : 'width 100ms ease',
          }}
        />

        {/* 原生 input[type="range"] - 透明覆盖层 */}
        <input
          ref={inputRef}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={handleChange}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchEnd={handleMouseUp}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: '100%',
            height: '100%',
            appearance: 'none',
            background: 'transparent',
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: 0,
            margin: 0,
            padding: 0,
          }}
          className="slider-input"
        />
      </div>

      {/* 数值显示 - 固定宽度右对齐 */}
      <div
        style={{
          width: '40px',
          minWidth: '40px',
          textAlign: 'right',
          fontSize: 'var(--p-text-10)',
          fontFamily: 'var(--p-font-mono)',
          fontVariantNumeric: 'tabular-nums',
          color: 'var(--fg-text-primary)',
          flexShrink: 0,
        }}
      >
        {value.toFixed(step < 1 ? 1 : 0)}{unit}
      </div>
    </div>
  );
});
