/**
 * 🎨 CraftTab - 工艺标签页
 * 按 vector 分组显示工艺，一个 vector 可以有多个工艺类型
 * 选中 vector 后显示该 vector 的工艺类型按钮组
 */

import { memo, useCallback, useState, useEffect, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { SEMANTIC_TOKENS } from '@genki/shared-theme';
import { useAppStore } from '../../store';
import { usePluginMessage } from '../../hooks/usePluginMessage';
import { CraftParamPanel, type CraftSettings } from '../craft/CraftParamPanel';
import type { CraftParams, CraftType, MarkedLayer } from '../../types/core';
import { updateGlobalCraftParams } from '../../utils/globalCraftParams';
import { craftTypeZhToEn, craftTypeEnToZh } from '../../utils/craftTypeMapping';

// ========== 图层下拉框组件（提前定义，避免打包问题）==========

interface LayerDropdownProps {
  options: { id: string; label: string }[];
  selectedId: string;
  onSelect: (id: string) => void;
  placeholder?: string;
}

const LayerDropdown = memo(function LayerDropdown({
  options,
  selectedId,
  onSelect,
  placeholder = '选择图层...',
}: LayerDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption = options.find(o => o.id === selectedId);

  const handleToggle = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  const handleSelect = useCallback((id: string) => {
    onSelect(id);
    setIsOpen(false);
  }, [onSelect]);

  return (
    <div style={{ flex: 1, position: 'relative' }}>
      <button
        type="button"
        onClick={handleToggle}
        style={{
          width: '100%',
          padding: '6px 10px',
          background: SEMANTIC_TOKENS.color.bg.interactive.default,
          border: `${SEMANTIC_TOKENS.border.width.thin} solid ${SEMANTIC_TOKENS.color.border.default}`,
          borderRadius: SEMANTIC_TOKENS.border.radius.sm,
          color: selectedOption ? SEMANTIC_TOKENS.color.text.primary : SEMANTIC_TOKENS.color.text.tertiary,
          fontSize: SEMANTIC_TOKENS.typography.fontSize.sm,
          textAlign: 'left',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {selectedOption?.label || placeholder}
        </span>
        <span style={{ marginLeft: '8px', opacity: 0.5 }}>˅</span>
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: '4px',
          background: '#1a1a1e',
          border: `${SEMANTIC_TOKENS.border.width.thin} solid ${SEMANTIC_TOKENS.color.border.default}`,
          borderRadius: SEMANTIC_TOKENS.border.radius.sm,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
          zIndex: 1000,
          maxHeight: '200px',
          overflowY: 'auto',
        }}>
          {options.length === 0 ? (
            <div style={{
              padding: '8px 12px',
              color: SEMANTIC_TOKENS.color.text.tertiary,
              fontSize: SEMANTIC_TOKENS.typography.fontSize.sm,
            }}>
              暂无工艺图层
            </div>
          ) : (
            options.map(option => (
              <DropdownItem
                key={option.id}
                option={option}
                isSelected={option.id === selectedId}
                onSelect={handleSelect}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
});

/** 下拉框选项组件 */
const DropdownItem = memo(function DropdownItem({
  option,
  isSelected,
  onSelect,
}: {
  option: { id: string; label: string };
  isSelected: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <div
      onClick={() => onSelect(option.id)}
      style={{
        padding: '8px 12px',
        cursor: 'pointer',
        color: isSelected ? SEMANTIC_TOKENS.color.text.brand : SEMANTIC_TOKENS.color.text.primary,
        fontSize: SEMANTIC_TOKENS.typography.fontSize.sm,
        background: isSelected ? SEMANTIC_TOKENS.color.bg.interactive.selected : 'transparent',
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.background = SEMANTIC_TOKENS.color.bg.interactive.hover;
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.background = 'transparent';
        }
      }}
    >
      {option.label}
    </div>
  );
});

// ========== 工艺类型配置 ==========

// 工艺类型配置（用于按钮显示）
const craftTypeConfig: Record<string, { panelId: string; label: string; color: string }> = {
  'NORMAL': { panelId: 'normal', label: '法线', color: '#4ade80' },
  'EMBOSS': { panelId: 'emboss', label: '凹凸', color: '#a78bfa' },
  'DEBOSS': { panelId: 'emboss', label: '凹印', color: '#a78bfa' },
  'UV': { panelId: 'uv', label: 'UV', color: '#18A0FB' },
  'SPOT_UV': { panelId: 'uv', label: '局部UV', color: '#18A0FB' },
  'HOTFOIL': { panelId: 'hotfoil-gold', label: '烫金', color: '#d4a853' },
  'VARNISH': { panelId: 'hotfoil-silver', label: '烫银', color: '#c0c0c0' },
  'TEXTURE': { panelId: 'displacement', label: '置换', color: '#fa8c4a' },
  'CLIPMASK': { panelId: 'normal', label: '蒙版', color: '#3b82f6' },
};

type CraftPanelId = 'normal' | 'emboss' | 'hotfoil-gold' | 'hotfoil-silver' | 'uv' | 'displacement';

function panelIdToCraftType(panelId: CraftPanelId): CraftType {
  switch (panelId) {
    case 'normal':
      return 'NORMAL';
    case 'emboss':
      return 'EMBOSS';
    case 'uv':
      return 'UV';
    case 'hotfoil-gold':
      return 'HOTFOIL';
    case 'hotfoil-silver':
      return 'VARNISH';
    case 'displacement':
      return 'TEXTURE';
    default:
      return 'NORMAL';
  }
}

/** 获取图层的所有工艺类型（转换为英文枚举，去重） */
function getLayerCraftTypes(layer: MarkedLayer): CraftType[] {
  const crafts: CraftType[] = [];

  // 从 crafts 数组获取
  if (layer.crafts && layer.crafts.length > 0) {
    for (const craft of layer.crafts) {
      // 统一转换为英文枚举
      const craftType = /^[A-Z_]+$/.test(craft)
        ? (craft as CraftType)
        : craftTypeZhToEn(craft);
      if (!crafts.includes(craftType)) {
        crafts.push(craftType);
      }
    }
  }

  // 从 craftType 获取（兼容旧数据）- 也需要转换为英文
  if (layer.craftType) {
    const normalizedCraftType = /^[A-Z_]+$/.test(layer.craftType)
      ? layer.craftType
      : craftTypeZhToEn(layer.craftType);
    if (!crafts.includes(normalizedCraftType)) {
      crafts.push(normalizedCraftType);
    }
  }

  return crafts;
}

const defaultRequiredParams: Pick<CraftParams, 'intensity' | 'blur' | 'height' | 'invert'> = {
  intensity: 50,
  blur: 10,
  height: 50,
  invert: false,
};

export const CraftTab = memo(function CraftTab() {
  const {
    markedLayers,
    activeCraftPanel,
    activeCraftType,
    selectedCraftLayerId,
    setActiveCraftPanel,
    setActiveCraftType,
    setSelectedCraftLayerId,
    setCraftParams,
  } = useAppStore(
    useShallow((s) => ({
      markedLayers: s.markedLayers,
      activeCraftPanel: s.activeCraftPanel,
      activeCraftType: s.activeCraftType,
      selectedCraftLayerId: s.selectedCraftLayerId,
      setActiveCraftPanel: s.setActiveCraftPanel,
      setActiveCraftType: s.setActiveCraftType,
      setSelectedCraftLayerId: s.setSelectedCraftLayerId,
      setCraftParams: s.setCraftParams,
    }))
  );
  const { sendMessage } = usePluginMessage();

  // 本地状态
  const [selectedLayerId, setSelectedLayerId] = useState<string>(selectedCraftLayerId || '');
  const [activeCraftTypeLocal, setActiveCraftTypeLocal] = useState<CraftType | ''>('');
  const [craftSettingsByPanel, setCraftSettingsByPanel] = useState<Record<string, CraftSettings>>({});

  // 筛选有工艺标记的图层
  const craftLayers = useMemo(() => {
    return markedLayers.filter(layer => {
      const crafts = getLayerCraftTypes(layer);
      return crafts.length > 0;
    });
  }, [markedLayers]);

  // 获取当前选中图层
  const selectedLayer = useMemo(() => {
    return craftLayers.find(l => l.id === selectedLayerId);
  }, [craftLayers, selectedLayerId]);

  // 获取当前选中图层的工艺类型列表
  const currentLayerCrafts = useMemo(() => {
    if (!selectedLayer) return [];
    return getLayerCraftTypes(selectedLayer);
  }, [selectedLayer]);

  // 同步 store 的选中图层到本地状态
  useEffect(() => {
    if (selectedCraftLayerId) {
      setSelectedLayerId(selectedCraftLayerId);
    }
  }, [selectedCraftLayerId]);

  // 🔄 双向同步：监听 store 的 activeCraftType 变化（来自缩略图点击）
  useEffect(() => {
    if (activeCraftType && activeCraftType !== activeCraftTypeLocal) {
      setActiveCraftTypeLocal(activeCraftType);
    }
  }, [activeCraftType]);

  // 当选中图层时，自动选择第一个工艺类型
  useEffect(() => {
    if (currentLayerCrafts.length > 0 && !activeCraftTypeLocal) {
      setActiveCraftTypeLocal(currentLayerCrafts[0]);
    }
  }, [selectedLayerId, currentLayerCrafts, activeCraftTypeLocal]);

  // 当前激活的面板（根据工艺类型确定）
  const activePanel = useMemo((): CraftPanelId => {
    if (activeCraftTypeLocal) {
      const config = craftTypeConfig[activeCraftTypeLocal];
      if (config) return config.panelId as CraftPanelId;
    }
    return activeCraftPanel as CraftPanelId;
  }, [activeCraftTypeLocal, activeCraftPanel]);

  // ✅ 核心绑定：面板切换必须同步更新 activeCraftType，否则预览永远走 NORMAL
  useEffect(() => {
    setActiveCraftType(panelIdToCraftType(activePanel));
  }, [activePanel, setActiveCraftType]);

  // 🚀 实时更新参数到全局变量（用于预览，不触发 React 重渲染）
  useEffect(() => {
    const currentSettings = craftSettingsByPanel[activePanel] || {};
    const params: CraftParams = {
      ...defaultRequiredParams,
      ...currentSettings,
    };
    // 直接更新全局参数并触发渲染回调
    updateGlobalCraftParams(params);
    // 同步到 store：CraftPreviewCanvas / 缩略图预览从 store.craftParams 读取
    setCraftParams(params);
  }, [activePanel, craftSettingsByPanel, setCraftParams]);

  const handleRefreshLayers = useCallback(() => {
    sendMessage({ type: 'refreshMarkedLayers' });
  }, [sendMessage]);

  // 选择图层（通过 ID）
  const handleLayerSelect = useCallback((layerId: string) => {
    if (!layerId) return;

    setSelectedLayerId(layerId);
    setSelectedCraftLayerId(layerId);
    setActiveCraftTypeLocal(''); // 重置工艺类型，让 useEffect 自动选择第一个

    // 请求该图层的预览数据
    sendMessage({ type: 'getLayerForNormalPreview', layerId });
  }, [setSelectedCraftLayerId, sendMessage]);

  // 切换工艺类型
  const handleCraftTypeSwitch = useCallback((craftType: CraftType) => {
    setActiveCraftTypeLocal(craftType);
    const config = craftTypeConfig[craftType];
    if (config) {
      setActiveCraftPanel(config.panelId);
      setActiveCraftType(craftType);
    }
  }, [setActiveCraftPanel, setActiveCraftType]);

  const handleSettingsChange = useCallback((newSettings: CraftSettings) => {
    setCraftSettingsByPanel((prev) => ({
      ...prev,
      [activePanel]: newSettings,
    }));
  }, [activePanel]);

  const handleApplyParams = useCallback(() => {
    if (!selectedLayerId) return;

    const craftType = activeCraftTypeLocal || panelIdToCraftType(activePanel);
    const params: CraftParams = {
      ...defaultRequiredParams,
      ...(craftSettingsByPanel[activePanel] || {}),
    };

    sendMessage({
      type: 'UPDATE_LAYER_CRAFT',
      payload: {
        id: selectedLayerId,
        craftType,
        params,
      }
    });
  }, [sendMessage, selectedLayerId, activePanel, activeCraftTypeLocal, craftSettingsByPanel]);

  // 生成下拉框选项：只显示图层名
  const dropdownOptions = useMemo(() => {
    return craftLayers.map(layer => ({
      id: layer.id,
      label: layer.name,
    }));
  }, [craftLayers]);

  return (
    <div className="panel-tab-content active">
      {/* 图层选择器 - 显示 图层名 [工艺1, 工艺2] */}
      <div className="section" style={{ paddingBottom: '8px' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <LayerDropdown
            options={dropdownOptions}
            selectedId={selectedLayerId}
            onSelect={handleLayerSelect}
            placeholder="选择工艺图层..."
          />
          <button
            type="button"
            onClick={handleRefreshLayers}
            title="刷新列表"
            style={{
              padding: '6px 8px',
              background: SEMANTIC_TOKENS.color.bg.interactive.default,
              border: `${SEMANTIC_TOKENS.border.width.thin} solid ${SEMANTIC_TOKENS.color.border.default}`,
              borderRadius: SEMANTIC_TOKENS.border.radius.sm,
              color: SEMANTIC_TOKENS.color.text.secondary,
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            ↻
          </button>
        </div>

        {/* 工艺类型按钮组 - 使用 grid 布局对齐 */}
        {currentLayerCrafts.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '6px',
            marginTop: '8px',
          }}>
            {currentLayerCrafts.map((craftType) => {
              const config = craftTypeConfig[craftType];
              const isActive = activeCraftTypeLocal === craftType;
              return (
                <button
                  key={craftType}
                  type="button"
                  onClick={() => handleCraftTypeSwitch(craftType)}
                  style={{
                    padding: '6px 8px',
                    background: isActive ? config?.color + '20' : SEMANTIC_TOKENS.color.bg.interactive.default,
                    border: `${SEMANTIC_TOKENS.border.width.thin} solid ${isActive ? config?.color : SEMANTIC_TOKENS.color.border.default}`,
                    borderRadius: SEMANTIC_TOKENS.border.radius.sm,
                    color: isActive ? config?.color : SEMANTIC_TOKENS.color.text.secondary,
                    fontSize: SEMANTIC_TOKENS.typography.fontSize.xs,
                    fontWeight: isActive ? 600 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    textAlign: 'center',
                  }}
                >
                  {config?.label || craftType}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 工艺参数面板 */}
      <CraftParamPanel
        craftType={activePanel}
        settings={craftSettingsByPanel[activePanel] || {}}
        onSettingsChange={handleSettingsChange}
      />

      {/* 应用按钮 */}
      <button
        type="button"
        className="export-btn"
        onClick={handleApplyParams}
        disabled={!selectedLayerId}
        style={{
          marginTop: '12px',
          opacity: selectedLayerId ? 1 : 0.5,
          cursor: selectedLayerId ? 'pointer' : 'not-allowed'
        }}
      >
        应用参数到选中图层
      </button>

      {/* 空状态提示 */}
      {craftLayers.length === 0 && (
        <div style={{
          padding: '16px',
          textAlign: 'center',
          color: SEMANTIC_TOKENS.color.text.tertiary,
          fontSize: SEMANTIC_TOKENS.typography.fontSize.sm,
        }}>
          <div style={{ marginBottom: '4px' }}>暂无工艺图层</div>
          <div style={{ fontSize: SEMANTIC_TOKENS.typography.fontSize.xs }}>
            请先在导出 Tab 中标记工艺图层
          </div>
        </div>
      )}
    </div>
  );
});
