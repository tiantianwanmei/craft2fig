/**
 * 📐 FoldOrderPanel - 折叠顺序面板
 * 悬浮在视口上的折叠顺序编辑器，连接到 store
 */

import { memo, useState, useCallback, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../../store';

export const FoldOrderPanel = memo(function FoldOrderPanel() {
  const [minimized, setMinimized] = useState(false);

  // 从 store 获取数据
  const {
    foldSequence,
    replacingIndex,
    clipmaskVectors,
    hPanelId,
    panelNameMap,
    clearFoldSequence,
    drivenRelations,
  } = useAppStore(
    useShallow((s) => ({
      foldSequence: s.foldSequence,
      replacingIndex: s.replacingIndex,
      clipmaskVectors: s.clipmaskVectors,
      hPanelId: s.hPanelId,
      panelNameMap: s.panelNameMap,
      clearFoldSequence: s.clearFoldSequence,
      drivenRelations: s.drivenRelations,
    }))
  );

  // 构建排序后的项目列表
  const orderedItems = useMemo(() => {
    if (foldSequence.length === 0) return [];

    return foldSequence.map((id, index) => {
      const layer = clipmaskVectors.find(v => v.id === id);
      const displayName = panelNameMap[id] || layer?.name || id;
      const isReplacing = replacingIndex === index;
      return { id, name: displayName, order: index + 1, isReplacing };
    });
  }, [foldSequence, clipmaskVectors, panelNameMap, replacingIndex]);

  const handleClear = useCallback(() => {
    clearFoldSequence();
  }, [clearFoldSequence]);

  // 获取 H 面板名称
  const hPanelName = useMemo(() => {
    if (!hPanelId) return null;
    return panelNameMap[hPanelId] || clipmaskVectors.find(v => v.id === hPanelId)?.name || 'H';
  }, [hPanelId, panelNameMap, clipmaskVectors]);

  if (minimized) {
    return (
      <button
        type="button"
        onClick={() => setMinimized(false)}
        style={{
          position: 'fixed',
          bottom: '80px',
          left: '20px',
          padding: '4px 10px',
          background: 'rgba(10, 15, 20, 0.82)',
          border: '1px solid rgba(6, 182, 212, 0.34)',
          borderRadius: '6px',
          color: 'rgba(255, 255, 255, 0.6)',
          fontSize: '10px',
          fontWeight: 600,
          cursor: 'pointer',
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}
      >
        📋 折叠顺序
      </button>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '80px',
      left: '20px',
      minWidth: '200px',
      maxWidth: '320px',
      background: 'rgba(10, 15, 20, 0.92)',
      backdropFilter: 'blur(18px)',
      border: '1px solid rgba(6, 182, 212, 0.28)',
      borderRadius: '10px',
      zIndex: 2000,
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 12px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        background: 'rgba(6, 182, 212, 0.08)'
      }}>
        <span style={{
          fontSize: '11px',
          fontWeight: 600,
          color: 'rgba(6, 182, 212, 0.9)'
        }}>
          📐 折叠顺序
        </span>
        <div style={{ display: 'flex', gap: '4px' }}>
          {orderedItems.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              style={{
                padding: '2px 6px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '4px',
                color: '#ef4444',
                fontSize: '9px',
                cursor: 'pointer'
              }}
            >
              清空
            </button>
          )}
          <button
            type="button"
            onClick={() => setMinimized(true)}
            style={{
              width: '20px',
              height: '20px',
              background: 'transparent',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.4)',
              cursor: 'pointer',
              fontSize: '11px'
            }}
          >
            ▼
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{
        padding: '10px 12px',
        maxHeight: '200px',
        overflowY: 'auto'
      }}>
        {/* H 面板显示 */}
        {hPanelId && (
          <div style={{
            marginBottom: '8px',
            padding: '6px 10px',
            background: 'rgba(245, 158, 11, 0.15)',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            borderRadius: '6px'
          }}>
            <span style={{
              fontSize: '9px',
              color: 'rgba(245, 158, 11, 0.8)',
              fontWeight: 600
            }}>
              ◆ 根面板 (H): {hPanelName}
            </span>
          </div>
        )}

        {/* 折叠顺序列表 */}
        {orderedItems.length === 0 ? (
          <div style={{
            fontSize: '10px',
            color: 'rgba(255, 255, 255, 0.3)',
            textAlign: 'center',
            padding: '12px'
          }}>
            点击刀版图面板添加折叠顺序<br/>
            双击设置为根面板 (H)
          </div>
        ) : (
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '6px'
          }}>
            {orderedItems.map((item, index) => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {index > 0 && (
                  <span style={{ color: 'rgba(255, 255, 255, 0.3)', fontSize: '10px' }}>→</span>
                )}
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 8px',
                  background: item.isReplacing
                    ? 'rgba(255, 153, 0, 0.15)'
                    : 'linear-gradient(135deg, rgba(6, 182, 212, 0.08), rgba(14, 165, 233, 0.08))',
                  border: item.isReplacing
                    ? '2px solid #ff9900'
                    : '1px solid rgba(6, 182, 212, 0.25)',
                  borderRadius: '6px',
                  fontSize: '10px',
                  fontWeight: 500,
                  color: item.isReplacing ? '#ff9900' : 'rgba(6, 182, 212, 0.8)',
                  transform: item.isReplacing ? 'scale(1.05)' : 'none',
                  transition: 'all 0.15s ease',
                }}>
                  <span style={{ fontWeight: 700, fontSize: '9px' }}>{item.order}</span>
                  <span>{item.name}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 带动关系显示 */}
        {drivenRelations.length > 0 && (
          <div style={{
            marginTop: '10px',
            paddingTop: '10px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)'
          }}>
            <div style={{
              fontSize: '9px',
              color: 'rgba(255, 255, 255, 0.5)',
              marginBottom: '6px',
              textTransform: 'uppercase'
            }}>
              带动关系
            </div>
            {drivenRelations.map((rel) => (
              <div key={rel.driverId} style={{
                fontSize: '10px',
                color: 'rgba(255, 255, 255, 0.6)',
                fontFamily: 'monospace',
                lineHeight: 1.6
              }}>
                {panelNameMap[rel.driverId] || rel.driverId} → [{rel.drivenIds.map(id => panelNameMap[id] || id).join(', ')}]
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});
