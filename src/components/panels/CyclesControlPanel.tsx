/**
 * 🎨 CyclesControlPanel - Cycles 渲染专属控制面板
 * 在 Cycles 渲染模式下替换默认的 ControlPanel
 */

import { memo, useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Section } from '@genki/shared-ui';
import { useAppStore } from '../../store';
import { SEMANTIC_TOKENS } from '@genki/shared-theme';

// HDR 预设列表
const HDR_PRESETS = [
  { value: 'city', label: '城市' },
  { value: 'studio', label: '影棚' },
  { value: 'sunset', label: '日落' },
  { value: 'dawn', label: '黎明' },
  { value: 'night', label: '夜晚' },
  { value: 'warehouse', label: '仓库' },
  { value: 'forest', label: '森林' },
  { value: 'apartment', label: '公寓' },
] as const;

// 渲染模式选项
const RENDER_MODES = [
  { value: 'realtime', label: '实时预览' },
  { value: 'pathtracing', label: '路径追踪' },
  { value: 'hybrid', label: '混合模式' },
] as const;

const styles = {
  root: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100%',
    minHeight: 0,
    overflow: 'hidden',
    marginLeft: SEMANTIC_TOKENS.spacing.panel.marginLeft,
    marginRight: SEMANTIC_TOKENS.spacing.panel.marginRight,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `${SEMANTIC_TOKENS.spacing.component.lg} ${SEMANTIC_TOKENS.spacing.component.lg}`,
    borderBottom: `1px solid ${SEMANTIC_TOKENS.color.border.default}`,
  },
  title: {
    fontSize: '14px',
    fontWeight: 600,
    color: SEMANTIC_TOKENS.color.text.primary,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  exitBtn: {
    padding: '6px 12px',
    borderRadius: '6px',
    background: SEMANTIC_TOKENS.color.bg.interactive.default,
    border: `1px solid ${SEMANTIC_TOKENS.color.border.default}`,
    color: SEMANTIC_TOKENS.color.text.primary,
    fontSize: '12px',
    cursor: 'pointer',
  },
  content: {
    flex: 1,
    minHeight: 0,
    overflowY: 'auto' as const,
    padding: `${SEMANTIC_TOKENS.spacing.panel.paddingY} ${SEMANTIC_TOKENS.spacing.panel.paddingX}`,
  },
  controlRow: {
    marginBottom: '16px',
  },
  label: {
    fontSize: '12px',
    color: SEMANTIC_TOKENS.color.text.secondary,
    marginBottom: '6px',
    display: 'block',
  },
  select: {
    width: '100%',
    padding: '8px 12px',
    borderRadius: '6px',
    border: `1px solid ${SEMANTIC_TOKENS.color.border.default}`,
    background: SEMANTIC_TOKENS.color.bg.secondary,
    color: SEMANTIC_TOKENS.color.text.primary,
    fontSize: '12px',
  },
  footer: {
    padding: `${SEMANTIC_TOKENS.spacing.component.md} ${SEMANTIC_TOKENS.spacing.component.lg}`,
    borderTop: `1px solid ${SEMANTIC_TOKENS.color.border.weak}`,
    background: 'transparent',
    color: SEMANTIC_TOKENS.color.text.secondary,
    fontSize: SEMANTIC_TOKENS.typography.fontSize.xs,
    textAlign: 'center' as const,
    flexShrink: 0,
  },
};

export const CyclesControlPanel = memo(function CyclesControlPanel() {
  const {
    cyclesRenderMode,
    cyclesHDRPreset,
    markedLayers,
    clipmaskVectors,
    setCyclesPreviewOpen,
    setCyclesRenderMode,
    setCyclesHDRPreset,
  } = useAppStore(
    useShallow((s) => ({
      cyclesRenderMode: s.cyclesRenderMode,
      cyclesHDRPreset: s.cyclesHDRPreset,
      markedLayers: s.markedLayers,
      clipmaskVectors: s.clipmaskVectors,
      setCyclesPreviewOpen: s.setCyclesPreviewOpen,
      setCyclesRenderMode: s.setCyclesRenderMode,
      setCyclesHDRPreset: s.setCyclesHDRPreset,
    }))
  );

  const handleExit = useCallback(() => {
    setCyclesPreviewOpen(false);
  }, [setCyclesPreviewOpen]);

  return (
    <div style={styles.root}>
      {/* 头部 */}
      <div style={styles.header}>
        <span style={styles.title}>
          <span>🎨</span>
          <span>Cycles 渲染</span>
        </span>
        <button type="button" style={styles.exitBtn} onClick={handleExit}>
          退出
        </button>
      </div>

      {/* 内容区 */}
      <div style={styles.content}>
        {/* 渲染设置 */}
        <Section title="渲染设置">
          <div style={styles.controlRow}>
            <label style={styles.label}>渲染模式</label>
            <select
              style={styles.select}
              value={cyclesRenderMode}
              onChange={(e) => setCyclesRenderMode(e.target.value as any)}
            >
              {RENDER_MODES.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          <div style={styles.controlRow}>
            <label style={styles.label}>HDR 环境</label>
            <select
              style={styles.select}
              value={cyclesHDRPreset}
              onChange={(e) => setCyclesHDRPreset(e.target.value)}
            >
              {HDR_PRESETS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
        </Section>

        {/* 工艺图层列表 */}
        <Section title={`工艺标注 (${markedLayers.length})`}>
          <CraftLayerList layers={markedLayers} />
        </Section>

        {/* 刀版图面板列表 */}
        <Section title={`刀版图面板 (${clipmaskVectors.length})`}>
          <PanelList panels={clipmaskVectors} />
        </Section>
      </div>

      {/* Footer */}
      <div style={styles.footer}>
        <span style={{ color: '#8b5cf6', marginRight: '6px' }}>●</span>
        Cycles 渲染模式
      </div>
    </div>
  );
});

// 工艺图层列表组件
const CraftLayerList = memo(function CraftLayerList({
  layers
}: {
  layers: any[]
}) {
  if (layers.length === 0) {
    return (
      <div style={{
        fontSize: '11px',
        color: SEMANTIC_TOKENS.color.text.tertiary,
        padding: '8px 0',
      }}>
        暂无工艺标注
      </div>
    );
  }

  return (
    <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
      {layers.map((layer) => {
        const craftType = layer.crafts?.[0] || layer.craftType || '未知';
        return (
          <div
            key={layer.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 8px',
              borderRadius: '4px',
              background: SEMANTIC_TOKENS.color.bg.secondary,
              marginBottom: '4px',
              fontSize: '11px',
            }}
          >
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: craftType === '烫金' ? '#d4af37' :
                         craftType === '烫银' ? '#c0c0c0' :
                         craftType === 'UV' ? '#00ff88' : '#888',
            }} />
            <span style={{
              flex: 1,
              color: SEMANTIC_TOKENS.color.text.primary,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {layer.name}
            </span>
            <span style={{ color: SEMANTIC_TOKENS.color.text.tertiary }}>
              {craftType}
            </span>
          </div>
        );
      })}
    </div>
  );
});

// 面板列表组件
const PanelList = memo(function PanelList({
  panels
}: {
  panels: any[]
}) {
  if (panels.length === 0) {
    return (
      <div style={{
        fontSize: '11px',
        color: SEMANTIC_TOKENS.color.text.tertiary,
        padding: '8px 0',
      }}>
        暂无刀版图面板
      </div>
    );
  }

  return (
    <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
      {panels.map((panel, index) => (
        <div
          key={panel.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 8px',
            borderRadius: '4px',
            background: SEMANTIC_TOKENS.color.bg.secondary,
            marginBottom: '4px',
            fontSize: '11px',
          }}
        >
          <span style={{
            width: '18px',
            height: '18px',
            borderRadius: '4px',
            background: SEMANTIC_TOKENS.color.bg.interactive.default,
            border: `1px solid ${SEMANTIC_TOKENS.color.border.default}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '10px',
            fontWeight: 600,
            color: SEMANTIC_TOKENS.color.text.secondary,
          }}>
            {index + 1}
          </span>
          <span style={{
            flex: 1,
            color: SEMANTIC_TOKENS.color.text.primary,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {panel.name}
          </span>
        </div>
      ))}
    </div>
  );
});
