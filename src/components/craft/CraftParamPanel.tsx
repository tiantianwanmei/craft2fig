/**
 * CraftParamPanel - 工艺参数面板
 * 移植自 figma-plugin-modern，包含完整参数系统
 */

import React, { memo } from 'react';
import { Slider, Section } from '@genki/shared-ui';
import { COMPONENT_TOKENS, SEMANTIC_TOKENS, BASE_TOKENS } from '@genki/shared-theme';
import type { CraftParams } from '../../types/core';

type Writable<T> = { -readonly [K in keyof T]: T[K] }

export type CraftSettings = Partial<Writable<CraftParams>>

export interface CraftParamPanelProps {
  craftType: string
  settings: CraftSettings
  onSettingsChange: (settings: CraftSettings) => void
}

export const CraftParamPanel = memo(function CraftParamPanel({
  craftType,
  settings,
  onSettingsChange
}: CraftParamPanelProps) {
  const updateSetting = (key: keyof CraftSettings, value: number | string | boolean) => {
    onSettingsChange({ ...settings, [key]: value })
  }

  const updateSettings = (patch: CraftSettings) => {
    onSettingsChange({ ...settings, ...patch })
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: COMPONENT_TOKENS.layout.craftPanel.container.gap,
        padding: COMPONENT_TOKENS.layout.craftPanel.container.padding,
      }}>
      {craftType === 'hotfoil-gold' && (
        <HotfoilGoldPanel settings={settings} updateSetting={updateSetting} />
      )}
      {craftType === 'hotfoil-silver' && (
        <HotfoilSilverPanel settings={settings} updateSetting={updateSetting} />
      )}
      {craftType === 'uv' && (
        <UVPanel settings={settings} updateSetting={updateSetting} updateSettings={updateSettings} />
      )}
      {craftType === 'emboss' && (
        <EmbossPanel settings={settings} updateSetting={updateSetting} />
      )}
      {craftType === 'normal' && (
        <NormalPanel settings={settings} updateSetting={updateSetting} />
      )}
      {craftType === 'displacement' && (
        <DisplacementPanel settings={settings} updateSetting={updateSetting} />
      )}
    </div>
  )
});

// 参数行组件 - 使用 shared-ui 的 Slider
function ParamRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
  unit = ''
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
  unit?: string
}) {
  return (
    <Slider
      label={label}
      value={value}
      min={min}
      max={max}
      step={step}
      unit={unit}
      onChange={onChange}
      showValue={true}
    />
  )
}

// 选择器组件 - 统一使用 Design Tokens
function ParamSelect({
  label,
  value,
  options,
  onChange
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: '100%',
        padding: `${SEMANTIC_TOKENS.spacing.component.sm} ${SEMANTIC_TOKENS.spacing.component.md}`,
        fontSize: SEMANTIC_TOKENS.typography.fontSize.xs,
        fontWeight: SEMANTIC_TOKENS.typography.fontWeight.regular,
        background: SEMANTIC_TOKENS.color.bg.interactive.default,
        color: SEMANTIC_TOKENS.color.text.primary,
        border: `${SEMANTIC_TOKENS.border.width.thin} solid ${SEMANTIC_TOKENS.color.border.default}`,
        borderRadius: SEMANTIC_TOKENS.border.radius.sm,
        cursor: 'pointer',
        transition: `background ${SEMANTIC_TOKENS.motion.duration.fast} ease`
      }}
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  )
}

type UpdateSetting = (key: keyof CraftSettings, value: number | string | boolean) => void
type UpdateSettings = (patch: CraftSettings) => void

// 烫金面板
function HotfoilGoldPanel({ settings, updateSetting }: { settings: CraftSettings; updateSetting: UpdateSetting }) {
  return (
    <>
      <Section title="Material Properties">
        <ParamRow label="金属度" value={(settings.metallic as number | undefined) ?? 1.0}
          min={0.8} max={1} step={0.01} onChange={(v) => updateSetting('metallic', v)} />
        <ParamRow label="粗糙度" value={(settings.roughness as number | undefined) ?? 0.2}
          min={0} max={0.5} step={0.01} onChange={(v) => updateSetting('roughness', v)} />
        <ParamRow label="折射率" value={(settings.ior as number | undefined) ?? 1.5}
          min={1.0} max={3.0} step={0.1} onChange={(v) => updateSetting('ior', v)} />
        <ParamRow label="各向异性" value={(settings.anisotropic as number | undefined) ?? 0.0}
          min={0} max={1} step={0.01} onChange={(v) => updateSetting('anisotropic', v)} />
        <ParamRow label="高度" value={(settings.heightScale as number | undefined) ?? 0.5}
          min={0} max={2} step={0.1} onChange={(v) => updateSetting('heightScale', v)} />
      </Section>

      <Section title="Color Adjustment">
        <ParamRow label="色调" value={(settings.hue as number | undefined) ?? 45}
          min={0} max={60} step={1} onChange={(v) => updateSetting('hue', v)} unit="°" />
        <ParamRow label="饱和度" value={(settings.saturation as number | undefined) ?? 0.8}
          min={0} max={1} step={0.01} onChange={(v) => updateSetting('saturation', v)} />
        <ParamRow label="亮度" value={(settings.brightness as number | undefined) ?? 0.9}
          min={0.5} max={1.5} step={0.01} onChange={(v) => updateSetting('brightness', v)} />
      </Section>

      <Section title="Surface Texture">
        <ParamRow label="噪波" value={(settings.noise as number | undefined) ?? 0.35}
          min={0} max={1} step={0.01} onChange={(v) => updateSetting('noise', v)} />
        <ParamRow label="噪波缩放X" value={(settings.noiseScaleX as number | undefined) ?? 1}
          min={0.1} max={10} step={0.1} onChange={(v) => updateSetting('noiseScaleX', v)} />
        <ParamRow label="噪波缩放Y" value={(settings.noiseScaleY as number | undefined) ?? 1}
          min={0.1} max={10} step={0.1} onChange={(v) => updateSetting('noiseScaleY', v)} />
        <ParamRow label="噪波旋转" value={(settings.noiseRotation as number | undefined) ?? 0}
          min={0} max={360} step={5} onChange={(v) => updateSetting('noiseRotation', v)} unit="°" />
        <ParamRow label="噪波频率" value={(settings.noiseFrequency as number | undefined) ?? 1}
          min={0.1} max={5} step={0.1} onChange={(v) => updateSetting('noiseFrequency', v)} />
        <ParamRow label="条纹数量" value={(settings.stripeCount as number | undefined) ?? 8}
          min={0} max={32} step={1} onChange={(v) => updateSetting('stripeCount', v)} />
        <ParamRow label="扭曲" value={(settings.distortion as number | undefined) ?? 0.2}
          min={0} max={1} step={0.01} onChange={(v) => updateSetting('distortion', v)} />
      </Section>
    </>
  )
}

// 烫银面板
function HotfoilSilverPanel({ settings, updateSetting }: { settings: CraftSettings; updateSetting: UpdateSetting }) {
  return (
    <>
      <Section title="Material Properties">
        <ParamRow label="金属度 (Metallic)" value={(settings.metallic as number | undefined) ?? 1.0}
          min={0.8} max={1} step={0.01} onChange={(v) => updateSetting('metallic', v)} />
        <ParamRow label="粗糙度 (Roughness)" value={(settings.roughness as number | undefined) ?? 0.15}
          min={0} max={0.5} step={0.01} onChange={(v) => updateSetting('roughness', v)} />
        <ParamRow label="折射率" value={(settings.ior as number | undefined) ?? 1.5}
          min={1.0} max={3.0} step={0.1} onChange={(v) => updateSetting('ior', v)} />
      </Section>

      <Section title="Color Adjustment">
        <ParamRow label="色调 (Hue)" value={(settings.hue as number | undefined) ?? 0}
          min={0} max={30} step={1} onChange={(v) => updateSetting('hue', v)} unit="°" />
        <ParamRow label="饱和度" value={(settings.saturation as number | undefined) ?? 0.1}
          min={0} max={0.5} step={0.01} onChange={(v) => updateSetting('saturation', v)} />
        <ParamRow label="亮度" value={(settings.brightness as number | undefined) ?? 0.95}
          min={0.5} max={1.5} step={0.01} onChange={(v) => updateSetting('brightness', v)} />
      </Section>

      <Section title="Surface Texture">
        <ParamRow label="Noise" value={(settings.noise as number | undefined) ?? 0.25}
          min={0} max={1} step={0.01} onChange={(v) => updateSetting('noise', v)} />
        <ParamRow label="噪波缩放X" value={(settings.noiseScaleX as number | undefined) ?? 1}
          min={0.1} max={10} step={0.1} onChange={(v) => updateSetting('noiseScaleX', v)} />
        <ParamRow label="噪波缩放Y" value={(settings.noiseScaleY as number | undefined) ?? 1}
          min={0.1} max={10} step={0.1} onChange={(v) => updateSetting('noiseScaleY', v)} />
        <ParamRow label="噪波旋转" value={(settings.noiseRotation as number | undefined) ?? 0}
          min={0} max={360} step={5} onChange={(v) => updateSetting('noiseRotation', v)} unit="°" />
        <ParamRow label="噪波频率" value={(settings.noiseFrequency as number | undefined) ?? 1}
          min={0.1} max={5} step={0.1} onChange={(v) => updateSetting('noiseFrequency', v)} />
        <ParamRow label="Stripe Count" value={(settings.stripeCount as number | undefined) ?? 10}
          min={0} max={32} step={1} onChange={(v) => updateSetting('stripeCount', v)} />
        <ParamRow label="Distortion" value={(settings.distortion as number | undefined) ?? 0.15}
          min={0} max={1} step={0.01} onChange={(v) => updateSetting('distortion', v)} />
      </Section>
    </>
  )
}

// UV 面板
function UVPanel({
  settings,
  updateSetting,
  updateSettings
}: {
  settings: CraftSettings;
  updateSetting: UpdateSetting;
  updateSettings: UpdateSettings;
}) {
  const [currentPage, setCurrentPage] = React.useState(0);
  const currentType = (settings.type as string | undefined) ?? 'gloss'

  const PRESETS_PER_PAGE = 9; // 3x3 正方形网格
  const allPresets = [
    { id: 'gloss', label: '高光', color: COMPONENT_TOKENS.layout.uvPresetGrid.item.bg.variant1 },
    { id: 'semi', label: '半光', color: COMPONENT_TOKENS.layout.uvPresetGrid.item.bg.variant2 },
    { id: 'satin', label: '缎面', color: COMPONENT_TOKENS.layout.uvPresetGrid.item.bg.variant3 },
    { id: 'matte', label: '哑光', color: COMPONENT_TOKENS.layout.uvPresetGrid.item.bg.variant1 },
    { id: 'concentric', label: '同心圆', color: COMPONENT_TOKENS.layout.uvPresetGrid.item.bg.variant2 },
    { id: 'frosted', label: '磨砂', color: COMPONENT_TOKENS.layout.uvPresetGrid.item.bg.variant3 },
    { id: 'fragment', label: '碎片', color: COMPONENT_TOKENS.layout.uvPresetGrid.item.bg.variant2 },
    { id: 'diamond', label: '钻石', color: COMPONENT_TOKENS.layout.uvPresetGrid.item.bg.variant3 },
    { id: 'mosaic', label: '马赛克', color: COMPONENT_TOKENS.layout.uvPresetGrid.item.bg.variant1 },
  ];

  const totalPages = Math.ceil(allPresets.length / PRESETS_PER_PAGE);
  const startIndex = currentPage * PRESETS_PER_PAGE;
  const currentPresets = allPresets.slice(startIndex, startIndex + PRESETS_PER_PAGE);

  // 填充空白占位符，确保始终显示 9 个方块
  const gridItems = [...currentPresets];
  while (gridItems.length < PRESETS_PER_PAGE) {
    gridItems.push({ id: `placeholder-${gridItems.length}`, label: '—', color: '', isPlaceholder: true });
  }

  const applyUVPreset = (uvType: string) => {
    const patch: CraftSettings = { type: uvType as CraftParams['type'] };
    if (uvType === 'gloss') {
      patch.gloss = 0.95;
      patch.roughness = 0.05;
    } else if (uvType === 'semi') {
      patch.gloss = 0.75;
      patch.roughness = 0.25;
    } else if (uvType === 'satin') {
      patch.gloss = 0.6;
      patch.roughness = 0.4;
    } else if (uvType === 'matte') {
      patch.gloss = 0.1;
      patch.roughness = 0.9;
    } else if (uvType === 'frosted') {
      patch.gloss = 0.5;
      patch.roughness = 0.5;
      patch.frostIntensity = 30;
      patch.frostedRotation = 0;
      patch.frostedRadial = 50;
      patch.frostedTwist = 50;
      patch.frostedNoiseScaleX = 50;
      patch.frostedNoiseScaleY = 50;
      patch.frostedNoiseFrequency = 50;
      patch.frostedStripeCount = 50;
      patch.frostedDistortion = 50;
      patch.frostedRadialRotation = 70; // 默认启用镜像拉伸效果（CD表面同心圆拉丝）
    } else if (uvType === 'fragment') {
      patch.gloss = 0.9;
      patch.fragmentSize = 8;
      patch.fragmentVariation = 60;
      patch.fragmentRotation = 0;
      patch.fragmentRadial = 0;
      patch.fragmentTwist = 0;
    } else if (uvType === 'diamond') {
      patch.gloss = 0.95;
      patch.sparkleIntensity = 40;
      patch.sparkleFrequency = 0.5;
      patch.diamondRotation = 0;
      patch.diamondRadial = 0;
      patch.diamondTwist = 0;
    } else if (uvType === 'mosaic') {
      patch.gloss = 0.9;
      patch.mosaicSize = 6;
      patch.mosaicVariation = 80;
      patch.mosaicRotation = 0;
      patch.mosaicRadial = 0;
      patch.mosaicTwist = 0;
    } else if (uvType === 'concentric') {
      patch.gloss = 0.95;
      patch.ringCount = 15;
      patch.ringSpacing = 50;
      patch.lineWidth = 50;
      patch.gradient = 50;
      patch.dotSpacing = 30;
      patch.concentricMode = 'circle';
      patch.concentricStyle = 'ring';
      patch.concentricRadial = 50;
      patch.concentricTwist = 50;
    }
    updateSettings(patch);
  }

  return (
    <>
      <Section title="UV Presets">
        <div style={{
          background: COMPONENT_TOKENS.layout.uvPresetGrid.container.background,
          padding: SEMANTIC_TOKENS.spacing.component.xs,
          borderRadius: COMPONENT_TOKENS.layout.uvPresetGrid.container.borderRadius,
          border: COMPONENT_TOKENS.layout.uvPresetGrid.container.border
        }}>
          {/* 3x3 正方形网格 */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: SEMANTIC_TOKENS.spacing.gap.xs,
            aspectRatio: '1 / 1',
          }}>
            {gridItems.map((p) => {
              const isPlaceholder = 'isPlaceholder' in p && p.isPlaceholder;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={isPlaceholder ? undefined : () => applyUVPreset(p.id)}
                  onMouseDown={isPlaceholder ? undefined : (e) => {
                    e.currentTarget.style.transform = 'scale(0.95)';
                    e.currentTarget.style.opacity = '0.8';
                  }}
                  onMouseUp={isPlaceholder ? undefined : (e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.opacity = '1';
                  }}
                  onMouseLeave={isPlaceholder ? undefined : (e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.opacity = '1';
                  }}
                  disabled={isPlaceholder}
                  style={{
                    padding: COMPONENT_TOKENS.layout.uvPresetGrid.item.padding,
                    fontSize: COMPONENT_TOKENS.layout.uvPresetGrid.item.fontSize,
                    fontWeight: COMPONENT_TOKENS.layout.uvPresetGrid.item.fontWeight,
                    borderRadius: COMPONENT_TOKENS.layout.uvPresetGrid.item.borderRadius,
                    border: isPlaceholder
                      ? COMPONENT_TOKENS.layout.uvPresetGrid.item.border.default
                      : currentType === p.id
                        ? `2px solid ${SEMANTIC_TOKENS.color.text.brand}`
                        : COMPONENT_TOKENS.layout.uvPresetGrid.item.border.default,
                    background: isPlaceholder
                      ? SEMANTIC_TOKENS.color.bg.interactive.default
                      : currentType === p.id
                        ? SEMANTIC_TOKENS.color.bg.interactive.selected
                        : SEMANTIC_TOKENS.color.bg.interactive.default,
                    color: isPlaceholder
                      ? SEMANTIC_TOKENS.color.text.disabled
                      : currentType === p.id
                        ? SEMANTIC_TOKENS.color.text.brand
                        : SEMANTIC_TOKENS.color.text.primary,
                    cursor: isPlaceholder ? 'not-allowed' : 'pointer',
                    transition: `all ${SEMANTIC_TOKENS.motion.duration.fast} ease`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: isPlaceholder ? 0.4 : 1,
                  }}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* 翻页控制 */}
          {totalPages > 1 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: SEMANTIC_TOKENS.spacing.gap.sm,
              marginTop: SEMANTIC_TOKENS.spacing.component.sm,
            }}>
              <button
                type="button"
                onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                disabled={currentPage === 0}
                style={{
                  padding: `${SEMANTIC_TOKENS.spacing.component.xs} ${SEMANTIC_TOKENS.spacing.component.sm}`,
                  fontSize: SEMANTIC_TOKENS.typography.fontSize.xs,
                  background: currentPage === 0 ? SEMANTIC_TOKENS.color.bg.interactive.default : SEMANTIC_TOKENS.color.bg.interactive.hover,
                  border: `${SEMANTIC_TOKENS.border.width.thin} solid ${SEMANTIC_TOKENS.color.border.weak}`,
                  borderRadius: SEMANTIC_TOKENS.border.radius.sm,
                  color: currentPage === 0 ? SEMANTIC_TOKENS.color.text.disabled : SEMANTIC_TOKENS.color.text.secondary,
                  cursor: currentPage === 0 ? 'not-allowed' : 'pointer',
                }}
              >
                ←
              </button>
              <span style={{
                fontSize: SEMANTIC_TOKENS.typography.fontSize.xs,
                color: SEMANTIC_TOKENS.color.text.tertiary,
              }}>
                {currentPage + 1} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                disabled={currentPage === totalPages - 1}
                style={{
                  padding: `${SEMANTIC_TOKENS.spacing.component.xs} ${SEMANTIC_TOKENS.spacing.component.sm}`,
                  fontSize: SEMANTIC_TOKENS.typography.fontSize.xs,
                  background: currentPage === totalPages - 1 ? SEMANTIC_TOKENS.color.bg.interactive.default : SEMANTIC_TOKENS.color.bg.interactive.hover,
                  border: `${SEMANTIC_TOKENS.border.width.thin} solid ${SEMANTIC_TOKENS.color.border.weak}`,
                  borderRadius: SEMANTIC_TOKENS.border.radius.sm,
                  color: currentPage === totalPages - 1 ? SEMANTIC_TOKENS.color.text.disabled : SEMANTIC_TOKENS.color.text.secondary,
                  cursor: currentPage === totalPages - 1 ? 'not-allowed' : 'pointer',
                }}
              >
                →
              </button>
            </div>
          )}
        </div>
      </Section>

      <Section title="Basic Adjustments">
        <ParamRow label="亮度" value={settings.intensity ?? 100}
          min={0} max={100} step={1} onChange={(v) => updateSetting('intensity', v)} />
        <ParamRow label="对比度" value={settings.uvContrast ?? 50}
          min={0} max={100} step={1} onChange={(v) => updateSetting('uvContrast', v)} />
        <ParamRow label="边缘柔和度" value={settings.edgeSoftness ?? 0}
          min={0} max={100} step={1} onChange={(v) => updateSetting('edgeSoftness', v)} />
        <ParamRow label="锐化强度" value={settings.sharpen ?? 0}
          min={0} max={100} step={1} onChange={(v) => updateSetting('sharpen', v)} />
        <ParamRow label="模糊强度" value={settings.blurStrength ?? 0}
          min={0} max={100} step={1} onChange={(v) => updateSetting('blurStrength', v)} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '10px', color: 'rgba(255,255,255,0.7)' }}>
            <span>Use Luminance for Mask</span>
            <input
              type="checkbox"
              checked={(settings.maskMode as string | undefined) === 'luminance'}
              onChange={(e) => updateSetting('maskMode', e.target.checked ? 'luminance' : 'alpha')}
            />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '10px', color: 'rgba(255,255,255,0.7)' }}>
            <span>Invert Mask</span>
            <input type="checkbox" checked={!!settings.maskInvert} onChange={(e) => updateSetting('maskInvert', e.target.checked)} />
          </label>
        </div>
      </Section>

      <Section title="Advanced Effects">
        {currentType === 'fragment' && (
          <>
            <ParamRow label="碎片大小" value={settings.fragmentSize ?? 50}
              min={1} max={100} step={1} onChange={(v) => updateSetting('fragmentSize', v)} />
            <ParamRow label="碎片变化" value={settings.fragmentVariation ?? 60}
              min={1} max={100} step={1} onChange={(v) => updateSetting('fragmentVariation', v)} />
            <ParamRow label="碎片旋转" value={settings.fragmentRotation ?? 1}
              min={1} max={100} step={1} onChange={(v) => updateSetting('fragmentRotation', v)} />
            <ParamRow label="碎片径向" value={settings.fragmentRadial ?? 50}
              min={1} max={100} step={1} onChange={(v) => updateSetting('fragmentRadial', v)} />
            <ParamRow label="碎片扭曲" value={settings.fragmentTwist ?? 50}
              min={1} max={100} step={1} onChange={(v) => updateSetting('fragmentTwist', v)} />
          </>
        )}

        {currentType === 'diamond' && (
          <>
            <ParamRow label="闪光强度" value={settings.sparkleIntensity ?? 40}
              min={1} max={100} step={1} onChange={(v) => updateSetting('sparkleIntensity', v)} />
            <ParamRow label="闪光频率" value={settings.sparkleFrequency ?? 50}
              min={1} max={100} step={1} onChange={(v) => updateSetting('sparkleFrequency', v)} />
            <ParamRow label="钻石旋转" value={settings.diamondRotation ?? 1}
              min={1} max={100} step={1} onChange={(v) => updateSetting('diamondRotation', v)} />
            <ParamRow label="钻石径向" value={settings.diamondRadial ?? 50}
              min={1} max={100} step={1} onChange={(v) => updateSetting('diamondRadial', v)} />
            <ParamRow label="钻石扭曲" value={settings.diamondTwist ?? 50}
              min={1} max={100} step={1} onChange={(v) => updateSetting('diamondTwist', v)} />
          </>
        )}

        {currentType === 'mosaic' && (
          <>
            <ParamRow label="马赛克大小" value={settings.mosaicSize ?? 30}
              min={1} max={100} step={1} onChange={(v) => updateSetting('mosaicSize', v)} />
            <ParamRow label="马赛克变化" value={settings.mosaicVariation ?? 80}
              min={1} max={100} step={1} onChange={(v) => updateSetting('mosaicVariation', v)} />
            <ParamRow label="马赛克旋转" value={settings.mosaicRotation ?? 1}
              min={1} max={100} step={1} onChange={(v) => updateSetting('mosaicRotation', v)} />
            <ParamRow label="马赛克径向" value={settings.mosaicRadial ?? 50}
              min={1} max={100} step={1} onChange={(v) => updateSetting('mosaicRadial', v)} />
            <ParamRow label="马赛克扭曲" value={settings.mosaicTwist ?? 50}
              min={1} max={100} step={1} onChange={(v) => updateSetting('mosaicTwist', v)} />
          </>
        )}

        {currentType === 'frosted' && (
          <>
            <ParamRow label="Frost Intensity" value={settings.frostIntensity ?? 30}
              min={1} max={100} step={1} onChange={(v) => updateSetting('frostIntensity', v)} />
            <ParamRow label="Noise Scale X" value={settings.frostedNoiseScaleX ?? 50}
              min={1} max={100} step={1} onChange={(v) => updateSetting('frostedNoiseScaleX', v)} />
            <ParamRow label="Noise Scale Y" value={settings.frostedNoiseScaleY ?? 50}
              min={1} max={100} step={1} onChange={(v) => updateSetting('frostedNoiseScaleY', v)} />
            <ParamRow label="Frosted Rotation" value={settings.frostedRotation ?? 1}
              min={1} max={100} step={1} onChange={(v) => updateSetting('frostedRotation', v)} />
            <ParamRow label="Noise Frequency" value={settings.frostedNoiseFrequency ?? 50}
              min={1} max={100} step={1} onChange={(v) => updateSetting('frostedNoiseFrequency', v)} />
            <ParamRow label="Stripe Count" value={settings.frostedStripeCount ?? 50}
              min={1} max={100} step={1} onChange={(v) => updateSetting('frostedStripeCount', v)} />
            <ParamRow label="Distortion" value={settings.frostedDistortion ?? 50}
              min={1} max={100} step={1} onChange={(v) => updateSetting('frostedDistortion', v)} />
            <ParamRow label="Frosted Radial" value={settings.frostedRadial ?? 50}
              min={1} max={100} step={1} onChange={(v) => updateSetting('frostedRadial', v)} />
            <ParamRow label="Frosted Twist" value={settings.frostedTwist ?? 50}
              min={1} max={100} step={1} onChange={(v) => updateSetting('frostedTwist', v)} />
            <ParamRow label="Radial Rotation" value={settings.frostedRadialRotation ?? 50}
              min={1} max={100} step={1} onChange={(v) => updateSetting('frostedRadialRotation', v)} />
            <ParamRow label="Pixel Swirl" value={settings.frostedPixelSwirl ?? 0}
              min={0} max={100} step={1} onChange={(v) => updateSetting('frostedPixelSwirl', v)} />
          </>
        )}

        {currentType === 'concentric' && (
          <>
            <div style={{ display: 'flex', gap: '6px' }}>
              <select
                value={(settings.concentricMode as string | undefined) ?? 'circle'}
                onChange={(e) => updateSetting('concentricMode', e.target.value)}
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '4px',
                  color: 'rgba(255, 255, 255, 0.85)',
                  fontSize: '10px',
                }}
              >
                <option value="circle">Circle</option>
                <option value="shape">Shape</option>
              </select>
              <select
                value={(settings.concentricStyle as string | undefined) ?? 'ring'}
                onChange={(e) => updateSetting('concentricStyle', e.target.value)}
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '4px',
                  color: 'rgba(255, 255, 255, 0.85)',
                  fontSize: '10px',
                }}
              >
                <option value="ring">Ring</option>
                <option value="dot">Dot</option>
              </select>
            </div>
            <ParamRow label="Ring Count" value={settings.ringCount ?? 15}
              min={1} max={100} step={1} onChange={(v) => updateSetting('ringCount', v)} />
            <ParamRow label="Ring Spacing" value={settings.ringSpacing ?? 50}
              min={1} max={100} step={1} onChange={(v) => updateSetting('ringSpacing', v)} />
            <ParamRow label="Line Width" value={settings.lineWidth ?? 50}
              min={1} max={100} step={1} onChange={(v) => updateSetting('lineWidth', v)} />
            <ParamRow label="Gradient" value={settings.gradient ?? 50}
              min={1} max={100} step={1} onChange={(v) => updateSetting('gradient', v)} />
            <ParamRow label="Dot Spacing" value={settings.dotSpacing ?? 30}
              min={1} max={100} step={1} onChange={(v) => updateSetting('dotSpacing', v)} />
            <ParamRow label="同心圆径向" value={settings.concentricRadial ?? 50}
              min={1} max={100} step={1} onChange={(v) => updateSetting('concentricRadial', v)} />
            <ParamRow label="同心圆扭曲" value={settings.concentricTwist ?? 50}
              min={1} max={100} step={1} onChange={(v) => updateSetting('concentricTwist', v)} />
          </>
        )}
      </Section>
    </>
  )
}

// 凹凸面板
function EmbossPanel({ settings, updateSetting }: { settings: CraftSettings; updateSetting: UpdateSetting }) {
  return (
    <>
      <Section title="SDF Settings">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <select
            value={settings.sdfMode || 'shrink'}
            onChange={(e) => updateSetting('sdfMode', e.target.value)}
            style={{
              width: '100%',
              padding: '6px 8px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '4px',
              color: 'rgba(255, 255, 255, 0.85)',
              fontSize: '10px',
            }}
          >
            <option value="shrink">Shrink</option>
            <option value="grow">Grow</option>
          </select>
          <select
            value={settings.sdfProfile || 'smoothstep'}
            onChange={(e) => updateSetting('sdfProfile', e.target.value)}
            style={{
              width: '100%',
              padding: '6px 8px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '4px',
              color: 'rgba(255, 255, 255, 0.85)',
              fontSize: '10px',
            }}
          >
            <option value="smoothstep">Smoothstep</option>
            <option value="linear">Linear</option>
            <option value="cosine">Cosine</option>
          </select>
        </div>
      </Section>

      <Section title="Emboss Parameters">
        <ParamRow label="扩散" value={settings.sdfSpread ?? 10}
          min={0.5} max={100} step={0.5} onChange={(v) => updateSetting('sdfSpread', v)} />
        <ParamRow label="高度缩放" value={settings.heightScale ?? 1.5}
          min={0.1} max={5} step={0.1} onChange={(v) => updateSetting('heightScale', v)} />
        <ParamRow label="柔和度" value={settings.sdfSoftness ?? 1.0}
          min={0.1} max={3} step={0.1} onChange={(v) => updateSetting('sdfSoftness', v)} />
        <ParamRow label="波纹数量" value={settings.rippleCount ?? 3}
          min={1} max={10} step={1} onChange={(v) => updateSetting('rippleCount', v)} />
        <ParamRow label="波纹宽度" value={settings.rippleWidth ?? 0.5}
          min={0.1} max={1.0} step={0.05} onChange={(v) => updateSetting('rippleWidth', v)} />
        <ParamRow label="虚线" value={settings.rippleDash ?? 0.0}
          min={0} max={0.9} step={0.05} onChange={(v) => updateSetting('rippleDash', v)} />
      </Section>
    </>
  )
}

// 法线面板
function NormalPanel({ settings, updateSetting }: { settings: CraftSettings; updateSetting: UpdateSetting }) {
  return (
    <>
      <Section title="Normal Map Settings">
        <ParamRow label="强度" value={settings.strength ?? 2.0}
          min={0.1} max={50} step={0.1} onChange={(v) => updateSetting('strength', v)} />
        <ParamRow label="模糊" value={settings.blurRadius ?? 0}
          min={0} max={100} step={1} onChange={(v) => updateSetting('blurRadius', v)} />
        <ParamRow label="锐化" value={settings.sharpness ?? 1.0}
          min={0.1} max={10} step={0.1} onChange={(v) => updateSetting('sharpness', v)} />
        <ParamRow label="对比度" value={settings.contrast ?? 1.0}
          min={0.1} max={10} step={0.1} onChange={(v) => updateSetting('contrast', v)} />
        <ParamRow label="边缘柔和度" value={settings.edgeSoftness ?? 0}
          min={0} max={100} step={0.5} onChange={(v) => updateSetting('edgeSoftness', v)} />
      </Section>

      <Section title="Curvature Type">
        <ParamSelect
          label="曲度类型"
          value={settings.curvature ?? 'smooth'}
          options={[
            { value: 'linear', label: '线性 (Linear)' },
            { value: 'parabolic', label: '抛物线 (Parabolic)' },
            { value: 'smooth', label: '平滑 (Smooth)' },
            { value: 'sharp', label: '尖锐 (Sharp)' },
            { value: 'round', label: '圆润 (Round)' }
          ]}
          onChange={(v) => updateSetting('curvature', v)}
        />
      </Section>

      <Section title="Algorithm Options">
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            type="button"
            onClick={() => updateSetting('algorithm', 'scharr')}
            style={{
              flex: 1,
              padding: '6px 8px',
              fontSize: '10px',
              borderRadius: '4px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              background: settings.algorithm === 'sobel' ? 'rgba(255,255,255,0.05)' : 'rgba(6, 182, 212, 0.15)',
              color: settings.algorithm === 'sobel' ? 'rgba(255,255,255,0.7)' : '#22d3ee',
              cursor: 'pointer',
            }}
          >
            Scharr
          </button>
          <button
            type="button"
            onClick={() => updateSetting('algorithm', 'sobel')}
            style={{
              flex: 1,
              padding: '6px 8px',
              fontSize: '10px',
              borderRadius: '4px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              background: settings.algorithm === 'sobel' ? 'rgba(6, 182, 212, 0.15)' : 'rgba(255,255,255,0.05)',
              color: settings.algorithm === 'sobel' ? '#22d3ee' : 'rgba(255,255,255,0.7)',
              cursor: 'pointer',
            }}
          >
            Sobel
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '10px', color: 'rgba(255, 255, 255, 0.7)' }}>
            <span>Invert Y (DirectX)</span>
            <input type="checkbox" checked={!!settings.invertY} onChange={(e) => updateSetting('invertY', e.target.checked)} />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '10px', color: 'rgba(255, 255, 255, 0.7)' }}>
            <span>Use Grayscale</span>
            <input type="checkbox" checked={!!settings.useGrayscale} onChange={(e) => updateSetting('useGrayscale', e.target.checked)} />
          </label>
        </div>
      </Section>
    </>
  )
}

// 置换面板
function DisplacementPanel({ settings, updateSetting }: { settings: CraftSettings; updateSetting: UpdateSetting }) {
  return (
    <Section title="Displacement Settings">
      <ParamRow label="强度 (Strength)" value={settings.strength ?? 1.0}
        min={0.1} max={5} step={0.1} onChange={(v) => updateSetting('strength', v)} />
      <ParamRow label="中点" value={settings.midlevel ?? 0.5}
        min={0} max={1} step={0.01} onChange={(v) => updateSetting('midlevel', v)} />
      <ParamRow label="渐变" value={settings.gradient ?? 0}
        min={0} max={100} step={1} onChange={(v) => updateSetting('gradient', v)} unit="%" />
      <ParamRow label="黑线阈值" value={settings.threshold ?? 128}
        min={0} max={255} step={1} onChange={(v) => updateSetting('threshold', v)} />
      <ParamRow label="平滑度" value={settings.smoothness ?? 0}
        min={0} max={100} step={1} onChange={(v) => updateSetting('smoothness', v)} />
      <ParamSelect
        label="曲度类型"
        value={settings.curvature ?? 'smooth'}
        options={[
          { value: 'linear', label: '线性 (Linear)' },
          { value: 'parabolic', label: '抛物线 (Parabolic)' },
          { value: 'smooth', label: '平滑 (Smooth)' },
          { value: 'sharp', label: '尖锐 (Sharp)' },
          { value: 'round', label: '圆润 (Round)' }
        ]}
        onChange={(v) => updateSetting('curvature', v)}
      />
    </Section>
  )
}
