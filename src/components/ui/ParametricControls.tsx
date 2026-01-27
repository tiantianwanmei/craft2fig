/**
 * ParametricControls - 参数化控制面板
 * 用于调整尺寸和 gapSize 参数
 */

import React, { useState } from 'react';

export interface ParametricControlsProps {
    /** 初始宽度 */
    initialWidth: number;
    /** 初始高度 */
    initialHeight: number;
    /** 初始厚度 */
    initialThickness: number;
    /** 初始 gapSize */
    initialGapSize?: number;
    /** 参数变化回调 */
    onChange: (params: {
        width: number;
        height: number;
        thickness: number;
        gapSize: number;
    }) => void;
}

/**
 * 参数化控制面板组件
 */
export function ParametricControls({
    initialWidth,
    initialHeight,
    initialThickness,
    initialGapSize,
    onChange,
}: ParametricControlsProps) {
    const [width, setWidth] = useState(initialWidth);
    const [height, setHeight] = useState(initialHeight);
    const [thickness, setThickness] = useState(initialThickness);
    const [gapSize, setGapSize] = useState(initialGapSize ?? initialThickness);

    const handleChange = (
        type: 'width' | 'height' | 'thickness' | 'gapSize',
        value: number
    ) => {
        const newParams = { width, height, thickness, gapSize };

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
        }

        onChange(newParams);
    };

    const handleReset = () => {
        setWidth(initialWidth);
        setHeight(initialHeight);
        setThickness(initialThickness);
        setGapSize(initialGapSize ?? initialThickness);

        onChange({
            width: initialWidth,
            height: initialHeight,
            thickness: initialThickness,
            gapSize: initialGapSize ?? initialThickness,
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

            <style jsx>{`
        .parametric-controls {
          position: absolute;
          top: 20px;
          right: 20px;
          background: rgba(10, 10, 11, 0.95);
          border: 1px solid rgba(161, 161, 170, 0.2);
          border-radius: 8px;
          padding: 16px;
          min-width: 280px;
          backdrop-filter: blur(10px);
          z-index: 1000;
        }
        
        .control-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        
        .control-header h3 {
          margin: 0;
          font-size: 14px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.95);
        }
        
        .reset-button {
          background: rgba(161, 161, 170, 0.1);
          border: 1px solid rgba(161, 161, 170, 0.2);
          border-radius: 4px;
          padding: 4px 12px;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.8);
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .reset-button:hover {
          background: rgba(161, 161, 170, 0.2);
          border-color: rgba(161, 161, 170, 0.3);
        }
        
        .control-group {
          margin-bottom: 16px;
        }
        
        .control-group:last-child {
          margin-bottom: 0;
        }
        
        .control-group label {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
          color: rgba(161, 161, 170, 0.95);
          margin-bottom: 8px;
        }
        
        .control-group .value {
          font-weight: 600;
          color: rgba(255, 255, 255, 0.95);
        }
        
        .control-group input[type="range"] {
          width: 100%;
          height: 4px;
          background: rgba(161, 161, 170, 0.2);
          border-radius: 2px;
          outline: none;
          -webkit-appearance: none;
        }
        
        .control-group input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          background: rgba(255, 255, 255, 0.95);
          border-radius: 50%;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .control-group input[type="range"]::-webkit-slider-thumb:hover {
          background: #fff;
          transform: scale(1.1);
        }
        
        .control-group input[type="range"]::-moz-range-thumb {
          width: 16px;
          height: 16px;
          background: rgba(255, 255, 255, 0.95);
          border-radius: 50%;
          cursor: pointer;
          border: none;
          transition: all 0.2s;
        }
        
        .control-group input[type="range"]::-moz-range-thumb:hover {
          background: #fff;
          transform: scale(1.1);
        }
      `}</style>
        </div>
    );
}
