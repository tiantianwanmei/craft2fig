// ============================================================================
// 🎨 Craft Control Panel - 工艺渲染集成控制面板
// ============================================================================

import React from 'react';
import { useCraftRendererStore } from '../store';
import { HDR_PRESETS } from './HDRDomeGround';
import type { RenderMode, RenderQuality } from '../types';

// 样式常量
const styles = {
  panel: {
    padding: '16px',
    backgroundColor: 'var(--color-bg-surface)',
    borderRadius: '8px',
    border: '1px solid var(--color-border-default)',
    maxHeight: '80vh',
    overflowY: 'auto' as const,
  },
} as const;

const sectionStyle = {
  marginBottom: '16px',
  paddingBottom: '16px',
  borderBottom: '1px solid var(--color-border-weak)',
};

const titleStyle = {
  fontSize: '14px',
  fontWeight: 600,
  color: 'var(--color-text-primary)',
  marginBottom: '12px',
};

const labelStyle = {
  fontSize: '12px',
  color: 'var(--color-text-secondary)',
  marginBottom: '6px',
  display: 'block' as const,
};

const selectStyle = {
  width: '100%',
  padding: '8px',
  borderRadius: '6px',
  border: '1px solid var(--color-border-default)',
  backgroundColor: 'var(--color-bg-secondary)',
  color: 'var(--color-text-primary)',
  fontSize: '12px',
};

const sliderStyle = {
  width: '100%',
  accentColor: 'var(--color-text-brand)',
};

const checkboxRowStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  marginBottom: '8px',
  fontSize: '12px',
  color: 'var(--color-text-secondary)',
};

// Props
interface CraftControlPanelProps {
  className?: string;
}

// 渲染模式选项
const RENDER_MODES: { value: RenderMode; label: string }[] = [
  { value: 'realtime', label: '实时预览' },
  { value: 'pathtracing', label: '路径追踪' },
  { value: 'hybrid', label: '混合模式' },
];

// 质量选项
const QUALITY_OPTIONS: { value: RenderQuality; label: string }[] = [
  { value: 'draft', label: '草稿' },
  { value: 'preview', label: '预览' },
  { value: 'production', label: '生产' },
];

// 主组件
export function CraftControlPanel({ className }: CraftControlPanelProps) {
  const {
    config,
    renderState,
    material,
    hdrPreset,
    hdrIntensity,
    hdrDome,
    setRenderMode,
    setRenderQuality,
    setMaterial,
    setHDRPreset,
    setHDRIntensity,
    setHDRDome,
  } = useCraftRendererStore();

  return (
    <div style={styles.panel} className={className}>
      <h3 style={titleStyle}>工艺渲染控制</h3>

      {/* 渲染设置 */}
      <div style={sectionStyle}>
        <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}>渲染设置</div>
        <label style={labelStyle}>渲染模式</label>
        <select
          style={selectStyle}
          value={config.mode}
          onChange={(e) => setRenderMode(e.target.value as RenderMode)}
        >
          {RENDER_MODES.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>

      {/* HDR 环境设置 */}
      <div style={sectionStyle}>
        <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}>HDR 环境</div>
        <label style={labelStyle}>预设环境</label>
        <select
          style={selectStyle}
          value={hdrPreset}
          onChange={(e) => setHDRPreset(e.target.value)}
        >
          {HDR_PRESETS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </div>

      {/* 穹顶设置 */}
      <div style={sectionStyle}>
        <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}>穹顶投影</div>
        <label style={checkboxRowStyle}>
          <input
            type="checkbox"
            checked={hdrDome.groundProjection}
            onChange={(e) => setHDRDome({ groundProjection: e.target.checked })}
          />
          启用穹顶投影
        </label>
        <label style={checkboxRowStyle}>
          <input
            type="checkbox"
            checked={hdrDome.showBackground}
            onChange={(e) => setHDRDome({ showBackground: e.target.checked })}
          />
          显示 HDR 背景
        </label>
      </div>

      {/* 材质设置 */}
      <div style={sectionStyle}>
        <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}>PBR 材质</div>
        <label style={labelStyle}>
          粗糙度: {material.roughness.toFixed(2)}
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={material.roughness}
          onChange={(e) => setMaterial({ roughness: parseFloat(e.target.value) })}
          style={sliderStyle}
        />
        <label style={{ ...labelStyle, marginTop: '12px' }}>
          金属度: {material.metalness.toFixed(2)}
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={material.metalness}
          onChange={(e) => setMaterial({ metalness: parseFloat(e.target.value) })}
          style={sliderStyle}
        />
      </div>

      {/* 状态显示 */}
      <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>
        <div>模式: {renderState.currentMode}</div>
        <div>FPS: {renderState.fps}</div>
      </div>
    </div>
  );
}