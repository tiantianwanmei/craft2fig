/**
 * 🎨 CraftTab - 工艺标签页
 * 完全还原原版：图层选择器、工艺参数面板
 */

import { memo, useCallback, useState, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../../store';
import { usePluginMessage } from '../../hooks/usePluginMessage';

// 工艺面板配置
const craftPanels = [
  { id: 'normal', label: '法线', icon: '📐' },
  { id: 'emboss', label: '凹凸', icon: '🔲' },
  { id: 'hotfoil-gold', label: '烫金', icon: '🥇' },
  { id: 'hotfoil-silver', label: '烫银', icon: '🥈' },
  { id: 'uv', label: 'UV', icon: '💎' },
  { id: 'displacement', label: '置换', icon: '🌊' },
] as const;

type CraftPanelId = typeof craftPanels[number]['id'];

export const CraftTab = memo(function CraftTab() {
  const {
    markedLayers,
    activeCraftPanel,
    selectedCraftLayerId,
    setCraftParams,
    setActiveCraftPanel,
    setSelectedCraftLayerId,
  } = useAppStore(
    useShallow((s) => ({
      markedLayers: s.markedLayers,
      activeCraftPanel: s.activeCraftPanel,
      selectedCraftLayerId: s.selectedCraftLayerId,
      setCraftParams: s.setCraftParams,
      setActiveCraftPanel: s.setActiveCraftPanel,
      setSelectedCraftLayerId: s.setSelectedCraftLayerId,
    }))
  );
  const { sendMessage } = usePluginMessage();

  // 本地状态 - 同步 store 的选中图层
  const [selectedLayer, setSelectedLayer] = useState<string>('');

  // 同步 store 的选中图层到本地状态
  useEffect(() => {
    if (selectedCraftLayerId) {
      setSelectedLayer(selectedCraftLayerId);
    }
  }, [selectedCraftLayerId]);

  // 当前激活的面板 - 从 store 获取
  const activePanel = activeCraftPanel as CraftPanelId;

  // 法线参数
  const [normalStrength, setNormalStrength] = useState(2.0);
  const [normalBlur, setNormalBlur] = useState(0);
  const [normalSharpness, setNormalSharpness] = useState(1.0);
  const [normalContrast, setNormalContrast] = useState(1.0);
  const [normalEdgeSoftness, setNormalEdgeSoftness] = useState(0.0);

  // 凹凸参数
  const [embossSdfSpread, setEmbossSdfSpread] = useState(10.0);
  const [embossHeightScale, setEmbossHeightScale] = useState(1.5);
  const [embossSoftness, setEmbossSoftness] = useState(1.0);
  const [embossRippleCount, setEmbossRippleCount] = useState(3);
  const [embossRippleWidth, setEmbossRippleWidth] = useState(0.5);

  // 烫金参数
  const [goldMetallic, setGoldMetallic] = useState(1.0);
  const [goldRoughness, setGoldRoughness] = useState(0.2);
  const [goldHeight, setGoldHeight] = useState(0.5);
  const [goldHue, setGoldHue] = useState(45);
  const [goldSaturation, setGoldSaturation] = useState(0.8);

  // 烫银参数
  const [silverMetallic, setSilverMetallic] = useState(1.0);
  const [silverRoughness, setSilverRoughness] = useState(0.15);
  const [silverHeight, setSilverHeight] = useState(0.5);

  // UV参数
  const [uvType, setUvType] = useState<string>('gloss');
  const [uvGloss, setUvGloss] = useState(0.95);
  const [uvThickness, setUvThickness] = useState(0.5);
  const [uvRoughness, setUvRoughness] = useState(0.1);
  // Fragment UV 参数
  const [fragmentSize, setFragmentSize] = useState(8);
  const [fragmentVariation, setFragmentVariation] = useState(60);
  // Diamond UV 参数
  const [sparkleIntensity, setSparkleIntensity] = useState(40);
  const [sparkleFrequency, setSparkleFrequency] = useState(0.5);
  // Mosaic UV 参数
  const [mosaicSize, setMosaicSize] = useState(6);
  const [mosaicVariation, setMosaicVariation] = useState(80);
  // Frosted UV 参数
  const [frostIntensity, setFrostIntensity] = useState(30);
  // Concentric UV 参数
  const [ringCount, setRingCount] = useState(10);
  const [ringSpacing, setRingSpacing] = useState(20);

  // 置换参数
  const [dispStrength, setDispStrength] = useState(1.0);
  const [dispMidlevel, setDispMidlevel] = useState(0.5);

  // 🔧 实时更新参数到 store（用于预览）
  useEffect(() => {
    if (activePanel === 'normal') {
      setCraftParams({
        strength: normalStrength,
        blurRadius: normalBlur,
        sharpness: normalSharpness,
        contrast: normalContrast,
        edgeSoftness: normalEdgeSoftness,
      });
    } else if (activePanel === 'emboss') {
      setCraftParams({
        sdfSpread: embossSdfSpread,
        heightScale: embossHeightScale,
        sdfSoftness: embossSoftness,
        rippleCount: embossRippleCount,
        rippleWidth: embossRippleWidth,
      });
    } else if (activePanel === 'hotfoil-gold') {
      setCraftParams({
        hue: goldHue,
        saturation: goldSaturation,
        brightness: 0.9,
      });
    } else if (activePanel === 'hotfoil-silver') {
      setCraftParams({
        hue: 0,
        saturation: 0.1,
        brightness: 0.95,
      });
    } else if (activePanel === 'uv') {
      setCraftParams({
        type: uvType as any,
        gloss: uvGloss,
        thickness: uvThickness,
        roughness: uvRoughness,
        fragmentSize,
        fragmentVariation,
        sparkleIntensity,
        sparkleFrequency,
        mosaicSize,
        mosaicVariation,
        frostIntensity,
        ringCount,
        ringSpacing,
      });
    } else if (activePanel === 'displacement') {
      setCraftParams({
        strength: dispStrength,
        midlevel: dispMidlevel,
      });
    }
  }, [
    activePanel,
    normalStrength, normalBlur, normalSharpness, normalContrast, normalEdgeSoftness,
    embossSdfSpread, embossHeightScale, embossSoftness, embossRippleCount, embossRippleWidth,
    goldHue, goldSaturation,
    uvType, uvGloss, uvThickness, uvRoughness, fragmentSize, fragmentVariation,
    sparkleIntensity, sparkleFrequency, mosaicSize, mosaicVariation, frostIntensity,
    ringCount, ringSpacing,
    dispStrength, dispMidlevel,
    setCraftParams
  ]);

  const handleRefreshLayers = useCallback(() => {
    sendMessage({ type: 'refreshMarkedLayers' });
  }, [sendMessage]);

  // 选择图层时同步到 store
  const handleLayerSelect = useCallback((layerId: string) => {
    setSelectedLayer(layerId);
    setSelectedCraftLayerId(layerId || null);
  }, [setSelectedCraftLayerId]);

  // 切换面板时同步到 store
  const handlePanelChange = useCallback((panelId: CraftPanelId) => {
    setActiveCraftPanel(panelId);
  }, [setActiveCraftPanel]);

  const handleApplyParams = useCallback(() => {
    if (!selectedLayer) return;

    // 1) Update UI-side renderer params (preview uses these)
    switch (activePanel) {
      case 'normal':
        setCraftParams({
          strength: normalStrength,
        });
        break;
      case 'emboss':
        setCraftParams({
          sdfSpread: embossSdfSpread,
          heightScale: embossHeightScale,
          sdfSoftness: embossSoftness,
          rippleCount: embossRippleCount,
          rippleWidth: embossRippleWidth,
        });
        break;
      case 'hotfoil-gold':
        setCraftParams({
          hue: goldHue,
          saturation: goldSaturation,
          brightness: 0.9,
        });
        break;
      case 'hotfoil-silver':
        setCraftParams({
          hue: 0,
          saturation: 0.1,
          brightness: 0.95,
        });
        break;
      case 'uv':
        setCraftParams({
          type: uvType as any,
          gloss: uvGloss,
          thickness: uvThickness,
          roughness: uvRoughness,
          fragmentSize,
          fragmentVariation,
          sparkleIntensity,
          sparkleFrequency,
          mosaicSize,
          mosaicVariation,
          frostIntensity,
          ringCount,
          ringSpacing,
        });
        break;
      case 'displacement':
        setCraftParams({
          strength: dispStrength,
          midlevel: dispMidlevel,
        });
        break;
      default:
        break;
    }

    // 应用参数到选中的图层
    sendMessage({
      type: 'UPDATE_LAYER_CRAFT',
      payload: {
        id: selectedLayer,
        craftType: activePanel.toUpperCase() as any,
        params: {
          intensity: normalStrength * 50,
          blur: normalBlur,
          height: embossHeightScale * 100,
          invert: false
        }
      }
    });
  }, [
    sendMessage,
    selectedLayer,
    activePanel,
    setCraftParams,
    normalStrength,
    embossSdfSpread,
    embossHeightScale,
    embossSoftness,
    embossRippleCount,
    embossRippleWidth,
    goldHue,
    goldSaturation,
    uvType,
    uvGloss,
    uvThickness,
    uvRoughness,
    fragmentSize,
    fragmentVariation,
    sparkleIntensity,
    sparkleFrequency,
    mosaicSize,
    mosaicVariation,
    frostIntensity,
    ringCount,
    ringSpacing,
    dispStrength,
    dispMidlevel,
    normalBlur,
  ]);

  return (
    <div className="panel-tab-content active">
      {/* 图层选择器 */}
      <div className="section" style={{ paddingBottom: '8px' }}>
        <div className="section-title">图层选择</div>
        <div className="normal-layer-selector" style={{ display: 'flex', gap: '4px' }}>
          <select
            className="layer-select"
            value={selectedLayer}
            onChange={(e) => handleLayerSelect(e.target.value)}
            style={{
              flex: 1,
              padding: '8px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '4px',
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '11px'
            }}
          >
            <option value="">选择图层...</option>
            {markedLayers.map((layer) => (
              <option key={layer.id} value={layer.id}>
                {layer.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="refresh-btn"
            onClick={handleRefreshLayers}
            title="刷新图层列表"
          >
            🔄
          </button>
        </div>
      </div>

      {/* 工艺面板切换 */}
      <div className="section">
        <div className="craft-panel-tabs" style={{
          display: 'flex',
          gap: '4px',
          marginBottom: '12px'
        }}>
          {craftPanels.map(({ id, label, icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => handlePanelChange(id)}
              style={{
                flex: 1,
                padding: '8px 4px',
                background: activePanel === id ? 'rgba(6, 182, 212, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                border: `1px solid ${activePanel === id ? 'rgba(6, 182, 212, 0.5)' : 'rgba(255, 255, 255, 0.08)'}`,
                borderRadius: '4px',
                color: activePanel === id ? '#22d3ee' : 'rgba(255, 255, 255, 0.6)',
                fontSize: '10px',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              {icon} {label}
            </button>
          ))}
        </div>

        {/* 工艺参数面板容器 */}
        <div className="craft-params-container">
          {/* 法线面板 */}
          {activePanel === 'normal' && (
            <div className="craft-param-panel">
              <div className="param-section">
                <div className="section-title">Basic Parameters</div>
                <div className="param-row">
                  <div className="param-header">
                    <span className="param-label">Strength</span>
                    <span className="param-value">{normalStrength.toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    className="param-slider"
                    min={0}
                    max={5}
                    step={0.1}
                    value={normalStrength}
                    onChange={(e) => setNormalStrength(Number(e.target.value))}
                  />
                </div>
                <div className="param-row">
                  <div className="param-header">
                    <span className="param-label">Blur</span>
                    <span className="param-value">{normalBlur}</span>
                  </div>
                  <input
                    type="range"
                    className="param-slider"
                    min={0}
                    max={10}
                    step={1}
                    value={normalBlur}
                    onChange={(e) => setNormalBlur(Number(e.target.value))}
                  />
                </div>
                <div className="param-row">
                  <div className="param-header">
                    <span className="param-label">Sharpness</span>
                    <span className="param-value">{normalSharpness.toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    className="param-slider"
                    min={0}
                    max={3}
                    step={0.1}
                    value={normalSharpness}
                    onChange={(e) => setNormalSharpness(Number(e.target.value))}
                  />
                </div>
                <div className="param-row">
                  <div className="param-header">
                    <span className="param-label">Contrast</span>
                    <span className="param-value">{normalContrast.toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    className="param-slider"
                    min={0}
                    max={3}
                    step={0.1}
                    value={normalContrast}
                    onChange={(e) => setNormalContrast(Number(e.target.value))}
                  />
                </div>
                <div className="param-row">
                  <div className="param-header">
                    <span className="param-label">Edge Softness</span>
                    <span className="param-value">{normalEdgeSoftness.toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    className="param-slider"
                    min={0}
                    max={2}
                    step={0.1}
                    value={normalEdgeSoftness}
                    onChange={(e) => setNormalEdgeSoftness(Number(e.target.value))}
                  />
                </div>
              </div>
            </div>
          )}

          {/* 凹凸面板 */}
          {activePanel === 'emboss' && (
            <div className="craft-param-panel">
              <div className="param-section">
                <div className="section-title">SDF Parameters</div>
                <div className="param-row">
                  <div className="param-header">
                    <span className="param-label">SDF 扩散距离</span>
                    <span className="param-value">{embossSdfSpread.toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    className="param-slider"
                    min={0.5}
                    max={100}
                    step={0.5}
                    value={embossSdfSpread}
                    onChange={(e) => setEmbossSdfSpread(Number(e.target.value))}
                  />
                </div>
                <div className="param-row">
                  <div className="param-header">
                    <span className="param-label">高度缩放</span>
                    <span className="param-value">{embossHeightScale.toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    className="param-slider"
                    min={0.1}
                    max={5}
                    step={0.1}
                    value={embossHeightScale}
                    onChange={(e) => setEmbossHeightScale(Number(e.target.value))}
                  />
                </div>
                <div className="param-row">
                  <div className="param-header">
                    <span className="param-label">边缘柔和度</span>
                    <span className="param-value">{embossSoftness.toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    className="param-slider"
                    min={0.1}
                    max={3}
                    step={0.1}
                    value={embossSoftness}
                    onChange={(e) => setEmbossSoftness(Number(e.target.value))}
                  />
                </div>
                <div className="param-row">
                  <div className="param-header">
                    <span className="param-label">波纹数量</span>
                    <span className="param-value">{embossRippleCount}</span>
                  </div>
                  <input
                    type="range"
                    className="param-slider"
                    min={1}
                    max={10}
                    step={1}
                    value={embossRippleCount}
                    onChange={(e) => setEmbossRippleCount(Number(e.target.value))}
                  />
                </div>
                <div className="param-row">
                  <div className="param-header">
                    <span className="param-label">波纹宽度</span>
                    <span className="param-value">{embossRippleWidth.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    className="param-slider"
                    min={0.1}
                    max={2}
                    step={0.1}
                    value={embossRippleWidth}
                    onChange={(e) => setEmbossRippleWidth(Number(e.target.value))}
                  />
                </div>
              </div>
            </div>
          )}

          {/* 烫金面板 */}
          {activePanel === 'hotfoil-gold' && (
            <div className="craft-param-panel">
              <div className="param-section">
                <div className="section-title">烫金参数</div>
                <div className="param-row">
                  <div className="param-header">
                    <span className="param-label">金属度 (Metallic)</span>
                    <span className="param-value">{goldMetallic.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    className="param-slider"
                    min={0.8}
                    max={1}
                    step={0.01}
                    value={goldMetallic}
                    onChange={(e) => setGoldMetallic(Number(e.target.value))}
                  />
                </div>
                <div className="param-row">
                  <div className="param-header">
                    <span className="param-label">粗糙度 (Roughness)</span>
                    <span className="param-value">{goldRoughness.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    className="param-slider"
                    min={0}
                    max={0.5}
                    step={0.01}
                    value={goldRoughness}
                    onChange={(e) => setGoldRoughness(Number(e.target.value))}
                  />
                </div>
                <div className="param-row">
                  <div className="param-header">
                    <span className="param-label">高度 (Height)</span>
                    <span className="param-value">{goldHeight.toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    className="param-slider"
                    min={0}
                    max={2}
                    step={0.1}
                    value={goldHeight}
                    onChange={(e) => setGoldHeight(Number(e.target.value))}
                  />
                </div>
              </div>
              <div className="param-section">
                <div className="section-title">颜色调整</div>
                <div className="param-row">
                  <div className="param-header">
                    <span className="param-label">色调 (Hue)</span>
                    <span className="param-value">{goldHue}°</span>
                  </div>
                  <input
                    type="range"
                    className="param-slider"
                    min={0}
                    max={60}
                    step={1}
                    value={goldHue}
                    onChange={(e) => setGoldHue(Number(e.target.value))}
                  />
                </div>
                <div className="param-row">
                  <div className="param-header">
                    <span className="param-label">饱和度</span>
                    <span className="param-value">{goldSaturation.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    className="param-slider"
                    min={0}
                    max={1}
                    step={0.01}
                    value={goldSaturation}
                    onChange={(e) => setGoldSaturation(Number(e.target.value))}
                  />
                </div>
              </div>
            </div>
          )}

          {/* 烫银面板 */}
          {activePanel === 'hotfoil-silver' && (
            <div className="craft-param-panel">
              <div className="param-section">
                <div className="section-title">烫银参数</div>
                <div className="param-row">
                  <div className="param-header">
                    <span className="param-label">金属度 (Metallic)</span>
                    <span className="param-value">{silverMetallic.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    className="param-slider"
                    min={0.8}
                    max={1}
                    step={0.01}
                    value={silverMetallic}
                    onChange={(e) => setSilverMetallic(Number(e.target.value))}
                  />
                </div>
                <div className="param-row">
                  <div className="param-header">
                    <span className="param-label">粗糙度 (Roughness)</span>
                    <span className="param-value">{silverRoughness.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    className="param-slider"
                    min={0}
                    max={0.5}
                    step={0.01}
                    value={silverRoughness}
                    onChange={(e) => setSilverRoughness(Number(e.target.value))}
                  />
                </div>
                <div className="param-row">
                  <div className="param-header">
                    <span className="param-label">高度 (Height)</span>
                    <span className="param-value">{silverHeight.toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    className="param-slider"
                    min={0}
                    max={2}
                    step={0.1}
                    value={silverHeight}
                    onChange={(e) => setSilverHeight(Number(e.target.value))}
                  />
                </div>
              </div>
            </div>
          )}

          {/* UV光油面板 */}
          {activePanel === 'uv' && (
            <div className="craft-param-panel">
              {/* UV 类型选择 */}
              <div className="param-section">
                <div className="section-title">UV 效果类型</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '12px' }}>
                  {[
                    { id: 'gloss', label: '高光', icon: '✨' },
                    { id: 'fragment', label: '碎片', icon: '💎' },
                    { id: 'diamond', label: '钻石', icon: '💠' },
                    { id: 'mosaic', label: '马赛克', icon: '🔷' },
                    { id: 'frosted', label: '磨砂', icon: '❄️' },
                    { id: 'concentric', label: '同心圆', icon: '⭕' },
                  ].map(({ id, label, icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setUvType(id)}
                      style={{
                        padding: '6px 8px',
                        background: uvType === id ? 'rgba(6, 182, 212, 0.3)' : 'rgba(255, 255, 255, 0.05)',
                        border: `1px solid ${uvType === id ? 'rgba(6, 182, 212, 0.6)' : 'rgba(255, 255, 255, 0.1)'}`,
                        borderRadius: '4px',
                        color: uvType === id ? '#22d3ee' : 'rgba(255, 255, 255, 0.7)',
                        fontSize: '10px',
                        cursor: 'pointer',
                      }}
                    >
                      {icon} {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 基础参数 */}
              <div className="param-section">
                <div className="section-title">基础参数</div>
                <div className="param-row">
                  <div className="param-header">
                    <span className="param-label">光泽度</span>
                    <span className="param-value">{uvGloss.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    className="param-slider"
                    min={0}
                    max={1}
                    step={0.01}
                    value={uvGloss}
                    onChange={(e) => setUvGloss(Number(e.target.value))}
                  />
                </div>
                <div className="param-row">
                  <div className="param-header">
                    <span className="param-label">厚度</span>
                    <span className="param-value">{uvThickness.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    className="param-slider"
                    min={0.05}
                    max={3}
                    step={0.05}
                    value={uvThickness}
                    onChange={(e) => setUvThickness(Number(e.target.value))}
                  />
                </div>
                <div className="param-row">
                  <div className="param-header">
                    <span className="param-label">粗糙度</span>
                    <span className="param-value">{uvRoughness.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    className="param-slider"
                    min={0}
                    max={1}
                    step={0.01}
                    value={uvRoughness}
                    onChange={(e) => setUvRoughness(Number(e.target.value))}
                  />
                </div>
              </div>

              {/* Fragment 参数 */}
              {uvType === 'fragment' && (
                <div className="param-section">
                  <div className="section-title">碎片参数</div>
                  <div className="param-row">
                    <div className="param-header">
                      <span className="param-label">碎片大小</span>
                      <span className="param-value">{fragmentSize}</span>
                    </div>
                    <input
                      type="range"
                      className="param-slider"
                      min={2}
                      max={30}
                      step={1}
                      value={fragmentSize}
                      onChange={(e) => setFragmentSize(Number(e.target.value))}
                    />
                  </div>
                  <div className="param-row">
                    <div className="param-header">
                      <span className="param-label">变化度</span>
                      <span className="param-value">{fragmentVariation}</span>
                    </div>
                    <input
                      type="range"
                      className="param-slider"
                      min={0}
                      max={100}
                      step={1}
                      value={fragmentVariation}
                      onChange={(e) => setFragmentVariation(Number(e.target.value))}
                    />
                  </div>
                </div>
              )}

              {/* Diamond 参数 */}
              {uvType === 'diamond' && (
                <div className="param-section">
                  <div className="section-title">钻石参数</div>
                  <div className="param-row">
                    <div className="param-header">
                      <span className="param-label">闪烁强度</span>
                      <span className="param-value">{sparkleIntensity}</span>
                    </div>
                    <input
                      type="range"
                      className="param-slider"
                      min={0}
                      max={100}
                      step={1}
                      value={sparkleIntensity}
                      onChange={(e) => setSparkleIntensity(Number(e.target.value))}
                    />
                  </div>
                  <div className="param-row">
                    <div className="param-header">
                      <span className="param-label">闪烁频率</span>
                      <span className="param-value">{sparkleFrequency.toFixed(1)}</span>
                    </div>
                    <input
                      type="range"
                      className="param-slider"
                      min={0.1}
                      max={2}
                      step={0.1}
                      value={sparkleFrequency}
                      onChange={(e) => setSparkleFrequency(Number(e.target.value))}
                    />
                  </div>
                </div>
              )}

              {/* Mosaic 参数 */}
              {uvType === 'mosaic' && (
                <div className="param-section">
                  <div className="section-title">马赛克参数</div>
                  <div className="param-row">
                    <div className="param-header">
                      <span className="param-label">马赛克大小</span>
                      <span className="param-value">{mosaicSize}</span>
                    </div>
                    <input
                      type="range"
                      className="param-slider"
                      min={2}
                      max={20}
                      step={1}
                      value={mosaicSize}
                      onChange={(e) => setMosaicSize(Number(e.target.value))}
                    />
                  </div>
                  <div className="param-row">
                    <div className="param-header">
                      <span className="param-label">变化度</span>
                      <span className="param-value">{mosaicVariation}</span>
                    </div>
                    <input
                      type="range"
                      className="param-slider"
                      min={0}
                      max={100}
                      step={1}
                      value={mosaicVariation}
                      onChange={(e) => setMosaicVariation(Number(e.target.value))}
                    />
                  </div>
                </div>
              )}

              {/* Frosted 参数 */}
              {uvType === 'frosted' && (
                <div className="param-section">
                  <div className="section-title">磨砂参数</div>
                  <div className="param-row">
                    <div className="param-header">
                      <span className="param-label">磨砂强度</span>
                      <span className="param-value">{frostIntensity}</span>
                    </div>
                    <input
                      type="range"
                      className="param-slider"
                      min={0}
                      max={100}
                      step={1}
                      value={frostIntensity}
                      onChange={(e) => setFrostIntensity(Number(e.target.value))}
                    />
                  </div>
                </div>
              )}

              {/* Concentric 参数 */}
              {uvType === 'concentric' && (
                <div className="param-section">
                  <div className="section-title">同心圆参数</div>
                  <div className="param-row">
                    <div className="param-header">
                      <span className="param-label">圆环数量</span>
                      <span className="param-value">{ringCount}</span>
                    </div>
                    <input
                      type="range"
                      className="param-slider"
                      min={1}
                      max={30}
                      step={1}
                      value={ringCount}
                      onChange={(e) => setRingCount(Number(e.target.value))}
                    />
                  </div>
                  <div className="param-row">
                    <div className="param-header">
                      <span className="param-label">圆环间距</span>
                      <span className="param-value">{ringSpacing}</span>
                    </div>
                    <input
                      type="range"
                      className="param-slider"
                      min={5}
                      max={50}
                      step={1}
                      value={ringSpacing}
                      onChange={(e) => setRingSpacing(Number(e.target.value))}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 置换面板 */}
          {activePanel === 'displacement' && (
            <div className="craft-param-panel">
              <div className="param-section">
                <div className="section-title">置换参数</div>
                <div className="param-row">
                  <div className="param-header">
                    <span className="param-label">强度 (Strength)</span>
                    <span className="param-value">{dispStrength.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    className="param-slider"
                    min={0}
                    max={5}
                    step={0.1}
                    value={dispStrength}
                    onChange={(e) => setDispStrength(Number(e.target.value))}
                  />
                </div>
                <div className="param-row">
                  <div className="param-header">
                    <span className="param-label">中间值 (Midlevel)</span>
                    <span className="param-value">{dispMidlevel.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    className="param-slider"
                    min={0}
                    max={1}
                    step={0.01}
                    value={dispMidlevel}
                    onChange={(e) => setDispMidlevel(Number(e.target.value))}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 应用按钮 */}
      <button
        type="button"
        className="export-btn"
        onClick={handleApplyParams}
        disabled={!selectedLayer}
        style={{
          marginTop: '12px',
          opacity: selectedLayer ? 1 : 0.5,
          cursor: selectedLayer ? 'pointer' : 'not-allowed'
        }}
      >
        ✅ 应用参数到选中图层
      </button>
    </div>
  );
});
