/**
 * 🎚️ Slider - 滑块组件
 * 支持实时值显示和高频更新优化
 */

import { memo, useCallback, useRef, useState, CSSProperties } from 'react';
import type { SliderProps } from '../../types/ui';
import { SEMANTIC_TOKENS } from '@genki/shared-theme';

export const Slider = memo(function Slider({
  value,
  min = 0,
  max = 100,
  step = 1,
  label,
  showValue = true,
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

  const containerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  };

  const headerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  };

  const labelStyle: CSSProperties = {
    fontSize: SEMANTIC_TOKENS.typography.fontSize.xs,
    color: SEMANTIC_TOKENS.color.text.secondary,
    fontWeight: SEMANTIC_TOKENS.typography.fontWeight.medium,
  };

  const valueStyle: CSSProperties = {
    fontSize: SEMANTIC_TOKENS.typography.fontSize.xs,
    fontFamily: 'monospace',
    fontVariantNumeric: 'tabular-nums',
    color: isDragging ? SEMANTIC_TOKENS.color.button.primary.bg : SEMANTIC_TOKENS.color.text.tertiary,
    transition: `color ${SEMANTIC_TOKENS.motion.duration.fast}`,
  };

  return (
    <div style={containerStyle} className={className}>
      {(label || showValue) && (
        <div style={headerStyle}>
          {label && (
            <label style={labelStyle}>
              {label}
            </label>
          )}
          {showValue && (
            <span style={valueStyle}>
              {value.toFixed(step < 1 ? 1 : 0)}
            </span>
          )}
        </div>
      )}
      <div style={{ position: 'relative', height: '20px', display: 'flex', alignItems: 'center' }}>
        {/* Track background */}
        <div
          style={{
            position: 'absolute',
            inset: '0',
            height: '2px',
            top: '50%',
            transform: 'translateY(-50%)',
            borderRadius: SEMANTIC_TOKENS.border.radius.full,
            background: SEMANTIC_TOKENS.color.border.default,
          }}
        />
        {/* Track fill */}
        <div
          style={{
            position: 'absolute',
            height: '2px',
            top: '50%',
            transform: 'translateY(-50%)',
            borderRadius: SEMANTIC_TOKENS.border.radius.full,
            background: SEMANTIC_TOKENS.color.button.primary.bg,
            transition: `all 75ms`,
            width: `${percentage}%`,
          }}
        />
        {/* Input */}
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
            inset: '0',
            width: '100%',
            height: '100%',
            appearance: 'none',
            background: 'transparent',
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.5 : 1,
          }}
        />
        <style>{`
          input[type="range"]::-webkit-slider-thumb {
            appearance: none;
            width: 12px;
            height: 12px;
            border-radius: ${SEMANTIC_TOKENS.border.radius.full};
            background: ${SEMANTIC_TOKENS.color.button.primary.bg};
            border: 2px solid ${SEMANTIC_TOKENS.color.surface.primary};
            box-shadow: ${SEMANTIC_TOKENS.shadow.md};
            transition: transform ${SEMANTIC_TOKENS.motion.duration.fast};
          }
          input[type="range"]::-webkit-slider-thumb:hover {
            transform: scale(1.1);
          }
          input[type="range"]::-webkit-slider-thumb:active {
            transform: scale(0.95);
          }
          input[type="range"]::-moz-range-thumb {
            width: 12px;
            height: 12px;
            border-radius: ${SEMANTIC_TOKENS.border.radius.full};
            border: 0;
            background: ${SEMANTIC_TOKENS.color.button.primary.bg};
          }
        `}</style>
      </div>
    </div>
  );
});
