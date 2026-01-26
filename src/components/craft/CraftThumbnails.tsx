/**
 * 🎨 CraftThumbnails - 工艺缩略图组件
 * 按选中图层分组显示工艺，与 CraftTab 联动
 */

import { memo, useCallback, useRef, useEffect, useMemo } from 'react';
import type { CraftType, MarkedLayer } from '../../types/core';
import { useAppStore, usePreviewData } from '../../store';
import { useShallow } from 'zustand/react/shallow';
import { craftRenderer } from '../../utils/craftRenderer';
import { craftTypeZhToEn } from '../../utils/craftTypeMapping';
import { usePluginMessage } from '../../hooks/usePluginMessage';

interface CraftThumbnail {
  id: string;
  craftType: CraftType;
  label: string;
  color: string;
  layerId: string;
  layerName: string;
}

// 工艺类型到面板 ID 的映射
const craftTypeToPanelId: Record<CraftType, string> = {
  'NORMAL': 'normal',
  'EMBOSS': 'emboss',
  'DEBOSS': 'emboss',
  'UV': 'uv',
  'HOTFOIL': 'hotfoil-gold',
  'VARNISH': 'hotfoil-silver',
  'SPOT_UV': 'uv',
  'TEXTURE': 'displacement',
  'CLIPMASK': 'normal',
};

// 工艺类型配置
const craftTypeConfig: Record<CraftType, { label: string; color: string }> = {
  'HOTFOIL': { label: '烫金', color: '#d4a853' },
  'VARNISH': { label: '烫银', color: '#c0c0c0' },
  'UV': { label: 'UV', color: '#18A0FB' },
  'SPOT_UV': { label: '局部UV', color: '#18A0FB' },
  'EMBOSS': { label: '凹凸', color: '#a78bfa' },
  'DEBOSS': { label: '凹印', color: '#a78bfa' },
  'NORMAL': { label: '法线', color: '#4ade80' },
  'TEXTURE': { label: '置换', color: '#fa8c4a' },
  'CLIPMASK': { label: '蒙版', color: '#3b82f6' },
};

interface Props {
  collapsed?: boolean;
  onToggle?: () => void;
}

export const CraftThumbnails = memo(function CraftThumbnails({
  collapsed = false,
  onToggle
}: Props) {
  // 获取消息发送函数
  const { sendMessage } = usePluginMessage();

  // 使用 useShallow 优化状态订阅
  const {
    markedLayers,
    activeCraftType,
    selection,
    selectedCraftLayerId,
    setActiveCraftPanel,
    setActiveCraftType,
    setSelectedCraftLayerId,
    setActiveTab,
    setLargePreviewCraft,
    clearPreviewData,
  } = useAppStore(
    useShallow((s) => ({
      markedLayers: s.markedLayers,
      activeCraftType: s.activeCraftType,
      selection: s.selection,
      selectedCraftLayerId: s.selectedCraftLayerId,
      setActiveCraftPanel: s.setActiveCraftPanel,
      setActiveCraftType: s.setActiveCraftType,
      setSelectedCraftLayerId: s.setSelectedCraftLayerId,
      setActiveTab: s.setActiveTab,
      setLargePreviewCraft: s.setLargePreviewCraft,
      clearPreviewData: s.clearPreviewData,
    }))
  );

  // 从所有已标记的图层生成缩略图列表（支持多工艺）
  // ✅ 使用 useMemo 避免每次渲染都重新计算
  const thumbnails: CraftThumbnail[] = useMemo(() => markedLayers
    .filter((layer): layer is MarkedLayer & { crafts?: string[] } => {
      // 过滤出有工艺标记的图层
      return !!((layer.crafts && layer.crafts.length > 0) || layer.craftType);
    })
    .flatMap((layer) => {
      // 为每个工艺类型创建一个缩略图
      const crafts = (layer.crafts && layer.crafts.length > 0)
        ? layer.crafts
        : (layer.craftType ? [layer.craftType] : []);
      return crafts.map((craft, index) => {
        // 🔥 关键修复：将中文工艺名称转换为英文 CraftType（仅当形如 HOTFOIL/DEBOSS 才视为英文枚举）
        const craftType = (typeof craft === 'string' && /^[A-Z_]+$/.test(craft))
          ? (craft as CraftType)
          : craftTypeZhToEn(craft);
        const config = craftTypeConfig[craftType] || { label: craft, color: '#888' };
        return {
          id: `${layer.id}-${craft}-${index}`,
          craftType: craftType,  // 现在是英文枚举值，如 'HOTFOIL'
          label: config.label,
          color: config.color,
          layerId: layer.id,
          layerName: layer.name,
        };
      });
    }), [markedLayers]); // ✅ 只在 markedLayers 变化时重新计算

  const grouped = useMemo(() => {
    const map = new Map<string, { layerId: string; layerName: string; thumbs: CraftThumbnail[] }>();
    for (const t of thumbnails) {
      const existing = map.get(t.layerId);
      if (existing) {
        existing.thumbs.push(t);
      } else {
        map.set(t.layerId, { layerId: t.layerId, layerName: t.layerName, thumbs: [t] });
      }
    }
    return Array.from(map.values());
  }, [thumbnails]);

  const visibleGroups = useMemo(() => {
    // 优先使用「当前画布选择」来决定显示哪一组（你在视图里点 B，就只显示 B）
    const selectedIds = selection?.selectedIds || [];
    const focusedLayerId = selectedIds.length === 1 ? selectedIds[0] : null;
    const filterId = focusedLayerId || selectedCraftLayerId;
    if (!filterId) return grouped.slice(0, 1);
    const filtered = grouped.filter((g) => g.layerId === filterId);
    return filtered.length > 0 ? filtered : grouped.slice(0, 1);
  }, [grouped, selectedCraftLayerId, selection]);

  // 点击缩略图：切换到工艺面板，同步选中状态，显示大图预览
  const handleSelect = useCallback((thumb: CraftThumbnail) => {
    // 切换到工艺标签页
    setActiveTab('craft');
    // 设置选中的图层
    setSelectedCraftLayerId(thumb.layerId);
    // 🔄 关键：同步 activeCraftType 到 store，让 CraftTab 能监听到
    setActiveCraftType(thumb.craftType);
    // 切换到对应的工艺面板
    const panelId = craftTypeToPanelId[thumb.craftType] || 'normal';
    setActiveCraftPanel(panelId);
    // 显示大图预览
    setLargePreviewCraft(thumb.craftType);
    // 🔥 请求该图层的预览数据（确保大图预览能显示）
    clearPreviewData(thumb.layerId, 'NORMAL');
    const requestId = Date.now();
    sendMessage({ type: 'getLayerForOcclusionPreview', layerId: thumb.layerId, requestId });
  }, [setActiveTab, setSelectedCraftLayerId, setActiveCraftType, setActiveCraftPanel, setLargePreviewCraft, sendMessage, clearPreviewData]);

  // 判断缩略图是否激活 - 使用 activeCraftType 实现双向同步
  const isActive = (thumb: CraftThumbnail) => {
    return activeCraftType === thumb.craftType && selectedCraftLayerId === thumb.layerId;
  };

  // 如果没有选中的工艺图层，显示提示
  const isEmpty = thumbnails.length === 0;

  return (
    <div
      className="craft-preview-thumbnails"
      style={{
        position: 'relative',
        zIndex: 200,
        padding: '10px 12px',
        background: 'rgba(18, 18, 22, 0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.4)',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: collapsed ? 0 : '4px'
      }}>
        <span style={{
          fontSize: '10px',
          fontWeight: 600,
          color: 'rgba(255, 255, 255, 0.6)'
        }}>
          工艺预览 {!isEmpty && `(${thumbnails.length})`}
        </span>
        <button
          type="button"
          onClick={onToggle}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'rgba(255, 255, 255, 0.35)',
            cursor: 'pointer',
            padding: '2px',
            borderRadius: '3px',
            fontSize: '8px',
            lineHeight: 1,
            transition: 'all 0.15s ease',
            opacity: 0.6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '14px',
            height: '14px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '1';
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '0.6';
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <svg
            width="8"
            height="8"
            viewBox="0 0 8 8"
            fill="none"
            style={{
              transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
              transition: 'transform 0.15s ease',
            }}
          >
            <path
              d="M2 3L4 5L6 3"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {/* Grid */}
      {!collapsed && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          padding: '2px 0',
          minHeight: '50px'
        }}>
          {isEmpty ? (
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(255, 255, 255, 0.3)',
              fontSize: '10px'
            }}>
              选择工艺图层以显示预览
            </div>
          ) : (
            visibleGroups.map((group) => (
              <div key={group.layerId} style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {group.thumbs.map((thumb) => (
                  <ThumbnailCard
                    key={thumb.id}
                    thumb={thumb}
                    active={isActive(thumb)}
                    onClick={() => handleSelect(thumb)}
                  />
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
});

// 缩略图卡片子组件 - ✅ 使用 memo 避免不必要的重渲染
const ThumbnailCard = memo(function ThumbnailCard({
  thumb,
  active,
  onClick,
}: {
  thumb: CraftThumbnail;
  active: boolean;
  onClick: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastHeightDataRef = useRef<Uint8ClampedArray | null>(null);
  const lastSizeRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 });
  const rafRef = useRef<number | null>(null);

  // 获取该图层+工艺类型的预览数据
  // ⚠️ 预览数据目前只稳定缓存 NORMAL 的 heightData；各工艺缩略图都应复用 NORMAL 底图
  const { heightData, width: dataWidth, height: dataHeight } = usePreviewData(thumb.layerId, 'NORMAL');

  // 🚀 性能优化：缩略图只渲染一次，使用缓存，不监听 params
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !heightData || dataWidth === 0 || dataHeight === 0) {
      return;
    }

    const sizeChanged = lastSizeRef.current.w !== dataWidth || lastSizeRef.current.h !== dataHeight;
    const dataChanged = lastHeightDataRef.current !== heightData;
    if (sizeChanged || dataChanged) {
      lastHeightDataRef.current = heightData;
      lastSizeRef.current = { w: dataWidth, h: dataHeight };
      craftRenderer.setHeightData(heightData, dataWidth, dataHeight);
    }

    canvas.width = 26;
    canvas.height = 26;

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      try {
        const craftTypeMap: Record<string, string> = {
          'HOTFOIL': 'hot-stamping-gold',
          'VARNISH': 'hot-stamping-silver',
          'UV': 'uv',
          'SPOT_UV': 'uv',
          'EMBOSS': 'emboss',
          'DEBOSS': 'emboss',
          'NORMAL': 'normal',
          'TEXTURE': 'displacement',
          'CLIPMASK': 'clipmask',
        };
        const renderType = craftTypeMap[thumb.craftType] || thumb.craftType.toLowerCase();

        // 🚀 使用空参数触发缓存机制（原版策略）
        void craftRenderer.renderThumbnail(canvas, renderType, {}).catch((e) => {
          console.error('❌ [ThumbnailCard] Thumbnail render error for', thumb.craftType, ':', e);
        });
      } catch (e) {
        console.error('❌ [ThumbnailCard] Thumbnail render error for', thumb.craftType, ':', e);
      }
    });

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [heightData, dataWidth, dataHeight, thumb.craftType]);

  return (
    <div
      onClick={onClick}
      title={`${thumb.layerName} - ${thumb.label}`}
      style={{
        flexShrink: 0,
        width: '29px',
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
        cursor: 'pointer',
        transition: 'transform 0.2s'
      }}
    >
      <div style={{
        width: '29px',
        height: '29px',
        borderRadius: '4px',
        background: active ? 'rgba(6, 182, 212, 0.1)' : 'rgba(0, 0, 0, 0.4)',
        border: active ? `2px solid ${thumb.color}` : '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s',
        overflow: 'hidden',
      }}>
        <canvas
          ref={canvasRef}
          style={{ width: '26px', height: '26px', borderRadius: '3px' }}
        />
      </div>
      <span style={{
        fontSize: '9px',
        color: active ? thumb.color : 'rgba(255, 255, 255, 0.5)',
        textAlign: 'center',
        fontWeight: active ? 600 : 500,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }}>
        {thumb.label}
      </span>
    </div>
  );
});
