/**
 * 📤 ExportTab - 导出标签页
 * 完全还原原版功能：Clip Mode、Craft Vector、工艺标记、已标记列表
 */

import { memo, useCallback, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Section } from '@genki/shared-ui';
import { useAppStore } from '../../store';
import { usePluginMessage } from '../../hooks/usePluginMessage';
import type { MarkedLayer } from '../../types/core';
import { SEMANTIC_TOKENS } from '@genki/shared-theme';
import { CyclesRenderPreview } from '../canvas/CyclesRenderPreview';

// 工艺类型配置
const craftButtons = [
  { type: '烫金', className: 'gold' },
  { type: '烫银', className: 'silver' },
  { type: 'UV', className: 'uv' },
  { type: '凹凸', className: 'emboss' },
  { type: '法线', className: 'normal' },
  { type: '置换', className: 'displacement' },
] as const;

export const ExportTab = memo(function ExportTab() {
  const {
    markedLayers,
    clearMarkedLayers,
    sourceFrameId,
    clipmaskVectors,
    foldSequence,
    drivenMap,
    panelNameMap,
    hPanelId,
    cyclesPreviewOpen,
    setCyclesPreviewOpen,
    addNotification,
  } = useAppStore(
    useShallow((s) => ({
      markedLayers: s.markedLayers,
      clearMarkedLayers: s.clearMarkedLayers,
      sourceFrameId: s.sourceFrameId,
      clipmaskVectors: (s as any).clipmaskVectors,
      foldSequence: (s as any).foldSequence,
      drivenMap: (s as any).drivenMap,
      panelNameMap: (s as any).panelNameMap,
      hPanelId: (s as any).hPanelId,
      cyclesPreviewOpen: s.cyclesPreviewOpen,
      setCyclesPreviewOpen: s.setCyclesPreviewOpen,
      addNotification: s.addNotification,
    }))
  );
  const { sendMessage, prepareUnifiedExportDirectory } = usePluginMessage();

  // 本地状态
  const [clipMode, setClipMode] = useState(false);
  const [craftVector, setCraftVector] = useState(false);
  const [grayValue, _setGrayValue] = useState(255);
  const [markSameColor, setMarkSameColor] = useState(false);
  const [markInClipMask, setMarkInClipMask] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const markedCount = markedLayers.length;

  // 按工艺类型分组
  const groupedLayers = markedLayers.reduce<Record<string, MarkedLayer[]>>((acc, layer) => {
    const crafts = (layer.crafts && layer.crafts.length > 0)
      ? layer.crafts
      : (layer.craftType ? [layer.craftType] : []);

    for (const craftType of crafts) {
      if (!acc[craftType]) acc[craftType] = [];
      acc[craftType].push(layer);
    }
    return acc;
  }, {});

  // 处理函数
  const handleStartWebGPU = useCallback(() => {
    // 先请求刀版图数据，确保 clipmaskVectors 已加载
    sendMessage({ type: 'getSavedVectors' });
    // 然后打开预览窗口
    setCyclesPreviewOpen(true);
    addNotification('Opening Cycles Render Preview…', 'info');
  }, [setCyclesPreviewOpen, sendMessage]);

  const handleAddClipmask = useCallback(() => {
    sendMessage({ type: 'addVectors' });
  }, [sendMessage]);

  const handleClearClipmask = useCallback(() => {
    sendMessage({ type: 'clearSavedVectors', frameId: sourceFrameId || undefined });
  }, [sendMessage, sourceFrameId]);

  const handleSelectByColor = useCallback(() => {
    sendMessage({ type: 'selectByColor', inClipMask: markInClipMask });
  }, [sendMessage, markInClipMask]);

  const handleMarkCraft = useCallback((craftType: string) => {
    if (markSameColor) {
      sendMessage({
        type: 'selectAndMarkByColor',
        craftType,
        grayValue,
        inClipMask: markInClipMask
      });
    } else {
      sendMessage({ type: 'markCraftWithGray', craftType, grayValue });
    }
  }, [sendMessage, markSameColor, grayValue, markInClipMask]);

  const handleClearAllMarks = useCallback(() => {
    clearMarkedLayers();
    sendMessage({ type: 'clearAllMarks' });
  }, [clearMarkedLayers, sendMessage]);

  const handleRemoveLayer = useCallback((nodeId: string) => {
    sendMessage({ type: 'removeMarkById', nodeId });
  }, [sendMessage]);

  const handleSelectLayer = useCallback((nodeId: string) => {
    sendMessage({ type: 'selectNode', nodeId });
  }, [sendMessage]);

  const toggleGroupCollapse = useCallback((craftType: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(craftType)) {
        next.delete(craftType);
      } else {
        next.add(craftType);
      }
      return next;
    });
  }, []);

  const handleUnifiedExport = useCallback(async () => {
    if (!sourceFrameId) {
      sendMessage({ type: 'NOTIFY', payload: { message: 'Please select a Frame first', variant: 'warning' } } as any);
      return;
    }

    try {
      await prepareUnifiedExportDirectory();
    } catch (_e) {
      // ignore
    }

    const vectorIds = Array.isArray(clipmaskVectors) ? clipmaskVectors.map((v: any) => v.id).filter(Boolean) : [];
    sendMessage({
      type: 'exportUnified',
      payload: {
        frameId: sourceFrameId,
        vectorIds,
        scale: 2,
        format: 'PNG',
        exportCraftVector: craftVector,
        foldSequence: Array.isArray(foldSequence) ? foldSequence : [],
        drivenRelations: drivenMap || {},
        panelNameMap: panelNameMap || {},
        rootPanelId: hPanelId || null,
        normalSettings: {},
        craftSettings: {},
      },
    } as any);
  }, [sourceFrameId, clipmaskVectors, craftVector, foldSequence, drivenMap, panelNameMap, hPanelId, sendMessage, prepareUnifiedExportDirectory]);

  return (
    <>
    <div className="panel-tab-content active">
      {/* Export Mode Section */}
      <Section title="Export Mode">

        {/* Cycles 光追预览按钮 */}
        <button
          type="button"
          className="export-btn"
          onClick={handleStartWebGPU}
          style={{ marginBottom: SEMANTIC_TOKENS.spacing.component.lg, background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' }}
        >
          Start Cycles Render Preview
        </button>

        <div style={{
          fontSize: '11px',
          color: SEMANTIC_TOKENS.color.text.tertiary,
          marginTop: '-10px',
          marginBottom: SEMANTIC_TOKENS.spacing.component.lg,
          userSelect: 'text',
        }}>
          cyclesPreviewOpen: {String(cyclesPreviewOpen)}
        </div>

        {/* Clip Mode Toggle */}
        <div
          className={`toggle-row ${clipMode ? 'active' : ''}`}
          onClick={() => setClipMode(!clipMode)}
        >
          <div>
            <div className="toggle-label">Clip Mode</div>
            <div className="toggle-hint">Export masked regions</div>
          </div>
          <div className={`toggle-switch ${clipMode ? 'active' : ''}`} />
        </div>

        {/* Clipmask 按钮 */}
        <div style={{ display: 'flex', gap: SEMANTIC_TOKENS.spacing.component.md, marginBottom: SEMANTIC_TOKENS.spacing.component.lg }}>
          <button
            type="button"
            className="secondary-btn"
            onClick={handleAddClipmask}
            style={{ flex: 1 }}
          >
            Add Clipmask
          </button>
          <button
            type="button"
            className="secondary-btn danger"
            onClick={handleClearClipmask}
            style={{ flex: 1 }}
          >
            Clear All
          </button>
        </div>

        {/* Craft Vector Toggle */}
        <div
          className={`toggle-row ${craftVector ? 'active' : ''}`}
          onClick={() => setCraftVector(!craftVector)}
        >
          <div>
            <div className="toggle-label">Craft Vector</div>
            <div className="toggle-hint">Export B/W vector layers</div>
          </div>
          <div className={`toggle-switch ${craftVector ? 'active' : ''}`} />
        </div>

        <button
          type="button"
          className="export-btn"
          onClick={handleUnifiedExport}
          style={{ marginTop: SEMANTIC_TOKENS.spacing.component.lg }}
        >
          🚀 Export to Blender
        </button>
      </Section>

      {/* Craft Marking Section */}
      <Section title="Craft Marking">

        {/* 批量标记选项 */}
        <div className="batch-mark-options" style={{ marginBottom: SEMANTIC_TOKENS.spacing.component.lg }}>
          <div className="batch-option-row">
            <label className="batch-checkbox">
              <input
                type="checkbox"
                checked={markSameColor}
                onChange={(e) => setMarkSameColor(e.target.checked)}
              />
              <span>Mark Same Color</span>
            </label>
          </div>
          <div className="batch-option-row">
            <label className="batch-checkbox">
              <input
                type="checkbox"
                checked={markInClipMask}
                onChange={(e) => setMarkInClipMask(e.target.checked)}
              />
              <span>Within ClipMask Only</span>
            </label>
          </div>
        </div>

        {/* Select Same Color 按钮 */}
        <button
          type="button"
          className="secondary-btn"
          onClick={handleSelectByColor}
          style={{ marginBottom: SEMANTIC_TOKENS.spacing.component.lg }}
        >
          Select Same Color
        </button>

        {/* 工艺按钮网格 */}
        <div className="craft-grid">
          {craftButtons.map(({ type, className }) => (
            <button
              key={type}
              type="button"
              className={`craft-btn ${className}`}
              onClick={() => handleMarkCraft(type)}
            >
              <span className="craft-dot" />
              {type}
            </button>
          ))}
        </div>
      </Section>

      {/* Marked Layers Section */}
      {markedCount > 0 && (
        <Section title="Marked Layers">
          <div className="marked-list">
            {Object.entries(groupedLayers).map(([craftType, layers]) => {
              const craftConfig = craftButtons.find(c => c.type === craftType) || { className: 'normal' };
              const isCollapsed = collapsedGroups.has(craftType);

              return (
                <div key={craftType} className={`craft-group ${isCollapsed ? 'collapsed' : ''}`}>
                  <div
                    className={`craft-group-header ${craftConfig.className}`}
                    onClick={() => toggleGroupCollapse(craftType)}
                  >
                    <div className="craft-group-header-left">
                      <span className="craft-group-arrow">▼</span>
                      <span className="craft-group-title">{craftType}</span>
                      <span className="craft-group-count">{layers.length}</span>
                    </div>
                  </div>
                  {!isCollapsed && (
                    <div className="craft-group-items">
                      {layers.map((layer) => (
                        <div
                          key={layer.id}
                          className="marked-item"
                          onClick={() => handleSelectLayer(layer.id)}
                        >
                          <span className="marked-item-name">{layer.name}</span>
                          <button
                            type="button"
                            className="delete-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveLayer(layer.id);
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <button
            type="button"
            className="secondary-btn danger"
            onClick={handleClearAllMarks}
            style={{ marginTop: SEMANTIC_TOKENS.spacing.component.md }}
          >
            Clear All Marks
          </button>
        </Section>
      )}
    </div>
    <CyclesRenderPreview />
    </>
  );
});
