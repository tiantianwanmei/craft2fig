/**
 * ParametricControls - 参数化控制面板
 * 用于调整尺寸和 gapSize 参数
 */

import { useState } from 'react';

export interface ParametricControlsProps {
  /** 初始宽度 */
  initialWidth: number;
  /** 初始高度 */
  initialHeight: number;
  /** 初始厚度 */
  initialThickness: number;
  /** 初始 gapSize */
  initialGapSize?: number;
  /** 初始曲率 */
  initialCurvature?: number;
  /** 初始插值 */
  initialInterpolation?: 'linear' | 'smooth' | 'arc';
  /** 初始 X 轴系数 */
  initialXMultiplier?: number;
  /** 初始 Y 轴系数 */
  initialYMultiplier?: number;
  /** 初始嵌套因子 */
  initialNestingFactor?: number;
  /** 参数变化回调 */
  onChange: (params: {
    width: number;
    height: number;
    thickness: number;
    gapSize: number;
    creaseCurvature: number;
    interpolation: 'linear' | 'smooth' | 'arc';
    xAxisMultiplier: number;
    yAxisMultiplier: number;
    nestingFactor: number;
  }) => void;
}

/** 预设配置 */
export const MATERIAL_PRESETS = [
  { id: 'paper', name: '标准纸张', curvature: 1.0, interpolation: 'smooth' as const, xMultiplier: 1.0, yMultiplier: 1.05, nesting: 0.1, baseWidth: 1.5 },
  { id: 'cardboard', name: '瓦楞纸板', curvature: 2.2, interpolation: 'arc' as const, xMultiplier: 1.1, yMultiplier: 1.25, nesting: 0.2, baseWidth: 4.0 },
  { id: 'kraft', name: '牛皮纸', curvature: 1.5, interpolation: 'smooth' as const, xMultiplier: 1.0, yMultiplier: 1.1, nesting: 0.15, baseWidth: 2.0 },
  { id: 'sharp', name: '硬质直折', curvature: 1.0, interpolation: 'linear' as const, xMultiplier: 1.0, yMultiplier: 1.0, nesting: 0.05, baseWidth: 1.2 },
  { id: 'soft', name: '柔性薄膜', curvature: 0.6, interpolation: 'smooth' as const, xMultiplier: 0.9, yMultiplier: 0.9, nesting: 0.05, baseWidth: 1.0 },
];

/**
 * 参数化控制面板组件
 */
export function ParametricControls({
  initialWidth,
  initialHeight,
  initialThickness,
  initialGapSize,
  initialCurvature = 1.0,
  initialInterpolation = 'smooth',
  initialXMultiplier = 1.0,
  initialYMultiplier = 1.15,
  initialNestingFactor = 0.15,
  onChange,
}: ParametricControlsProps) {
  const [width, setWidth] = useState(initialWidth);
  const [height, setHeight] = useState(initialHeight);
  const [thickness, setThickness] = useState(initialThickness);
  const [gapSize, setGapSize] = useState(initialGapSize ?? initialThickness);
  const [creaseCurvature, setCreaseCurvature] = useState(initialCurvature);
  const [interpolation, setInterpolation] = useState(initialInterpolation);
  const [xAxisMultiplier, setXAxisMultiplier] = useState(initialXMultiplier);
  const [yAxisMultiplier, setYAxisMultiplier] = useState(initialYMultiplier);
  const [nestingFactor, setNestingFactor] = useState(initialNestingFactor);

  const handleChange = (
    type: 'width' | 'height' | 'thickness' | 'gapSize' | 'creaseCurvature' | 'interpolation' | 'xAxisMultiplier' | 'yAxisMultiplier' | 'nestingFactor',
    value: any
  ) => {
    const newParams = {
      width, height, thickness, gapSize, creaseCurvature, interpolation,
      xAxisMultiplier, yAxisMultiplier, nestingFactor
    };

    switch (type) {
      case 'width':
        setWidth(value);
        newParams.width = value;
        break;
      case 'height':
        setHeight(value);
        newParams.height = value;
        break;
      case 'thickness':
        setThickness(value);
        newParams.thickness = value;
        break;
      case 'gapSize':
        setGapSize(value);
        newParams.gapSize = value;
        break;
      case 'creaseCurvature':
        setCreaseCurvature(value);
        newParams.creaseCurvature = value;
        break;
      case 'interpolation':
        setInterpolation(value);
        newParams.interpolation = value;
        break;
      case 'xAxisMultiplier':
        setXAxisMultiplier(value);
        newParams.xAxisMultiplier = value;
        break;
      case 'yAxisMultiplier':
        setYAxisMultiplier(value);
        newParams.yAxisMultiplier = value;
        break;
      case 'nestingFactor':
        setNestingFactor(value);
        newParams.nestingFactor = value;
        break;
    }

    onChange(newParams);
  };

  const applyPreset = (preset: typeof MATERIAL_PRESETS[0]) => {
    setCreaseCurvature(preset.curvature);
    setInterpolation(preset.interpolation);
    onChange({
      width, height, thickness, gapSize,
      creaseCurvature: preset.curvature,
      interpolation: preset.interpolation,
      xAxisMultiplier,
      yAxisMultiplier,
      nestingFactor
    });
  };

  const handleReset = () => {
    setWidth(initialWidth);
    setHeight(initialHeight);
    setThickness(initialThickness);
    setGapSize(initialGapSize ?? initialThickness);
    setCreaseCurvature(initialCurvature);
    setInterpolation(initialInterpolation);
    setXAxisMultiplier(initialXMultiplier);
    setYAxisMultiplier(initialYMultiplier);
    setNestingFactor(initialNestingFactor);

    onChange({
      width: initialWidth,
      height: initialHeight,
      thickness: initialThickness,
      gapSize: initialGapSize ?? initialThickness,
      creaseCurvature: initialCurvature,
      interpolation: initialInterpolation,
      xAxisMultiplier: initialXMultiplier,
      yAxisMultiplier: initialYMultiplier,
      nestingFactor: initialNestingFactor,
    });
  };

  return (
    <div className="parametric-controls">
      <div className="control-header">
        <h3>参数化调整</h3>
        <button onClick={handleReset} className="reset-button">
          重置
        </button>
      </div>

      <div className="control-group">
        <label>
          材质预设 (Material)
        </label>
        <div className="preset-grid">
          {MATERIAL_PRESETS.map(p => (
            <button
              key={p.id}
              onClick={() => applyPreset(p)}
              className={`preset-button ${creaseCurvature === p.curvature && interpolation === p.interpolation ? 'active' : ''}`}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <div className="control-group">
        <label>
          纵向余量 (X Axis Coeff)
          <span className="value">{xAxisMultiplier.toFixed(2)}</span>
        </label>
        <input
          type="range"
          min={0.5}
          max={2.0}
          step={0.01}
          value={xAxisMultiplier}
          onChange={(e) => handleChange('xAxisMultiplier', parseFloat(e.target.value))}
        />
      </div>

      <div className="control-group">
        <label>
          横向余量 (Y Axis Coeff)
          <span className="value">{yAxisMultiplier.toFixed(2)}</span>
        </label>
        <input
          type="range"
          min={0.5}
          max={2.0}
          step={0.01}
          value={yAxisMultiplier}
          onChange={(e) => handleChange('yAxisMultiplier', parseFloat(e.target.value))}
        />
      </div>

      <div className="control-group">
        <label>
          层级让位 (Nesting Factor)
          <span className="value">{nestingFactor.toFixed(2)}</span>
        </label>
        <input
          type="range"
          min={0}
          max={0.5}
          step={0.01}
          value={nestingFactor}
          onChange={(e) => handleChange('nestingFactor', parseFloat(e.target.value))}
        />
      </div>

      <div className="control-group">
        <label>
          折痕曲率 (Curvature)
          <span className="value">{creaseCurvature.toFixed(2)}</span>
        </label>
        <input
          type="range"
          min={0.1}
          max={3.0}
          step={0.05}
          value={creaseCurvature}
          onChange={(e) => handleChange('creaseCurvature', parseFloat(e.target.value))}
        />
      </div>

      <div className="control-group">
        <label>
          插值方式 (Interpolation)
        </label>
        <div className="toggle-group">
          {(['linear', 'smooth', 'arc'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => handleChange('interpolation', mode)}
              className={`toggle-button ${interpolation === mode ? 'active' : ''}`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      <div className="divider" />

      <div className="control-group">
        <label>
          宽度 (Width)
          <span className="value">{width.toFixed(1)}mm</span>
        </label>
        <input
          type="range"
          min={initialWidth * 0.5}
          max={initialWidth * 2}
          step={0.1}
          value={width}
          onChange={(e) => handleChange('width', parseFloat(e.target.value))}
        />
      </div>

      <div className="control-group">
        <label>
          高度 (Height)
          <span className="value">{height.toFixed(1)}mm</span>
        </label>
        <input
          type="range"
          min={initialHeight * 0.5}
          max={initialHeight * 2}
          step={0.1}
          value={height}
          onChange={(e) => handleChange('height', parseFloat(e.target.value))}
        />
      </div>

      <div className="control-group">
        <label>
          厚度 (Thickness)
          <span className="value">{thickness.toFixed(2)}mm</span>
        </label>
        <input
          type="range"
          min={0.1}
          max={5}
          step={0.1}
          value={thickness}
          onChange={(e) => handleChange('thickness', parseFloat(e.target.value))}
        />
      </div>

      <div className="control-group">
        <label>
          连接器宽度 (Gap Size)
          <span className="value">{gapSize.toFixed(2)}mm</span>
        </label>
        <input
          type="range"
          min={0.1}
          max={10}
          step={0.1}
          value={gapSize}
          onChange={(e) => handleChange('gapSize', parseFloat(e.target.value))}
        />
      </div>
      {/* @ts-ignore */}
      <style jsx>{`
        .parametric-controls {
          position: absolute;
          top: 20px;
          right: 20px;
          background: rgba(10, 10, 11, 0.9);
          border: 1px solid rgba(161, 161, 170, 0.2);
          border-radius: 12px;
          padding: 16px;
          min-width: 260px;
          backdrop-filter: blur(20px);
          z-index: 1000;
          color: #fff;
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        }
        
        .control-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        
        .control-header h3 {
          margin: 0;
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.05em;
          color: rgba(255, 255, 255, 0.9);
        }
        
        .reset-button {
          background: rgba(161, 161, 170, 0.1);
          border: 1px solid rgba(161, 161, 170, 0.2);
          border-radius: 6px;
          padding: 4px 10px;
          font-size: 10px;
          color: rgba(255, 255, 255, 0.7);
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .reset-button:hover {
          background: rgba(161, 161, 170, 0.2);
          color: #fff;
        }
        
        .control-group {
          margin-bottom: 20px;
        }

        .divider {
          height: 1px;
          background: rgba(255, 255, 255, 0.1);
          margin: 20px 0;
        }
        
        .control-group label {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 11px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.5);
          margin-bottom: 10px;
          text-transform: uppercase;
        }
        
        .control-group .value {
          font-family: 'JetBrains Mono', monospace;
          color: #06b6d4;
        }

        .preset-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 6px;
        }

        .preset-button {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 6px;
            padding: 6px;
            font-size: 11px;
            color: rgba(255, 255, 255, 0.8);
            cursor: pointer;
            transition: all 0.2s;
        }

        .preset-button:hover {
            background: rgba(255, 255, 255, 0.1);
        }

        .preset-button.active {
            background: rgba(6, 182, 212, 0.2);
            border-color: #06b6d4;
            color: #06b6d4;
        }

        .toggle-group {
            display: flex;
            gap: 4px;
            background: rgba(255, 255, 255, 0.05);
            padding: 3px;
            border-radius: 8px;
        }

        .toggle-button {
            flex: 1;
            background: transparent;
            border: none;
            border-radius: 6px;
            padding: 6px;
            font-size: 10px;
            color: rgba(255, 255, 255, 0.5);
            cursor: pointer;
            transition: all 0.2s;
        }

        .toggle-button.active {
            background: rgba(255, 255, 255, 0.1);
            color: #fff;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        
        .control-group input[type="range"] {
          width: 100%;
          height: 3px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 2px;
          outline: none;
          -webkit-appearance: none;
        }
        
        .control-group input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 14px;
          height: 14px;
          background: #fff;
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 0 10px rgba(0,0,0,0.5);
          transition: all 0.2s;
        }
        
        .control-group input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.2);
          background: #06b6d4;
        }
      `}</style>
    </div>
  );
}
