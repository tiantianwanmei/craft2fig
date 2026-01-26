// ============================================================================
// 🎨 Craft Renderer Panel - 工艺渲染控制面板
// ============================================================================

import React from 'react';
import { useCraftRendererStore } from '../store';
import type { RenderMode, RenderQuality } from '../types';

// 样式常量 - 使用 semantic tokens 风格
const styles = {
  panel: {
    padding: '16px',
    backgroundColor: 'var(--color-bg-surface)',
    borderRadius: '8px',
    border: '1px solid var(--color-border-default)',
  },
  title: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--color-text-primary)',
    marginBottom: '12px',
  },
  section: {
    marginBottom: '16px',
  },
  label: {
    fontSize: '12px',
    color: 'var(--color-text-secondary)',
    marginBottom: '6px',
    display: 'block',
  },
  select: {
    width: '100%',
    padding: '8px',
    borderRadius: '6px',
    border: '1px solid var(--color-border-default)',
    backgroundColor: 'var(--color-bg-secondary)',
    color: 'var(--color-text-primary)',
    fontSize: '12px',
  },
  slider: {
    width: '100%',
    accentColor: 'var(--color-text-brand)',
  },
  progressBar: {
    width: '100%',
    height: '4px',
    borderRadius: '2px',
    backgroundColor: 'var(--color-bg-tertiary)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: 'var(--color-text-brand)',
    transition: 'width 0.2s ease',
  },
  statusRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  statusIndicator: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    marginRight: '6px',
  },
} as const;

// 组件 Props
interface CraftRendererPanelProps {
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
export function CraftRendererPanel({ className }: CraftRendererPanelProps) {
  const {
    config,
    renderState,
    material,
    setRenderMode,
    setRenderQuality,
    setMaterial,
  } = useCraftRendererStore();

  // 获取状态指示器颜色
  const getStatusColor = () => {
    if (renderState.currentMode === 'pathtracing') {
      return 'var(--color-text-success)';
    }
    return 'var(--color-text-brand)';
  };

  return (
    <div style={styles.panel} className={className}>
      <h3 style={styles.title}>渲染设置</h3>

      {/* 状态显示 */}
      <div style={styles.section}>
        <div style={styles.statusRow}>
          <span style={{ display: 'flex', alignItems: 'center' }}>
            <span
              style={{
                ...styles.statusIndicator,
                backgroundColor: getStatusColor(),
              }}
            />
            <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
              {renderState.currentMode === 'pathtracing' ? '路径追踪中' : '实时渲染'}
            </span>
          </span>
          <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>
            {renderState.fps} FPS
          </span>
        </div>
      </div>

      {/* 渲染模式 */}
      <div style={styles.section}>
        <label style={styles.label}>渲染模式</label>
        <select
          style={styles.select}
          value={config.mode}
          onChange={(e) => setRenderMode(e.target.value as RenderMode)}
        >
          {RENDER_MODES.map((mode) => (
            <option key={mode.value} value={mode.value}>
              {mode.label}
            </option>
          ))}
        </select>
      </div>

      {/* 渲染质量 */}
      <div style={styles.section}>
        <label style={styles.label}>渲染质量</label>
        <select
          style={styles.select}
          value={config.quality}
          onChange={(e) => setRenderQuality(e.target.value as RenderQuality)}
        >
          {QUALITY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* 粗糙度 */}
      <div style={styles.section}>
        <label style={styles.label}>
          粗糙度: {material.roughness.toFixed(2)}
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={material.roughness}
          onChange={(e) => setMaterial({ roughness: parseFloat(e.target.value) })}
          style={styles.slider}
        />
      </div>

      {/* 金属度 */}
      <div style={styles.section}>
        <label style={styles.label}>
          金属度: {material.metalness.toFixed(2)}
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={material.metalness}
          onChange={(e) => setMaterial({ metalness: parseFloat(e.target.value) })}
          style={styles.slider}
        />
      </div>

      {/* 渲染进度 */}
      {renderState.currentMode === 'pathtracing' && (
        <div style={styles.section}>
          <label style={styles.label}>
            采样进度: {renderState.samples} / {config.pathTracing.maxSamples}
          </label>
          <div style={styles.progressBar}>
            <div
              style={{
                ...styles.progressFill,
                width: `${renderState.progress * 100}%`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}