/**
 * 🚀 ViewportArea v2 - 混合架构版本
 * React管理状态 + 原生DOM渲染Canvas
 *
 * 为什么需要这个版本？
 * - 原React版本的虚拟DOM diff导致严重性能问题（60-124ms阻塞）
 * - 原版HTML使用纯DOM操作，性能极佳
 * - 这个版本：React管理状态，Canvas用原生DOM渲染
 */

import { memo, useState, useCallback, useRef, useEffect } from 'react';
import { useAppStore } from '../../store';
import { useShallow } from 'zustand/react/shallow';
import { usePluginMessage } from '../../hooks';
import { NativeCanvas } from './NativeCanvas';
import { SEMANTIC_TOKENS } from '@genki/shared-theme';

export const ViewportArea = memo(function ViewportArea() {
  const {
    clipmaskVectors,
    vectorOrderMap,
    toggleVectorOrder,
    setHPanelId,
    setPanelNameMap,
  } = useAppStore(
    useShallow((s) => ({
      clipmaskVectors: s.clipmaskVectors,
      vectorOrderMap: s.vectorOrderMap,
      toggleVectorOrder: s.toggleVectorOrder,
      setHPanelId: s.setHPanelId,
      setPanelNameMap: s.setPanelNameMap,
    }))
  );

  const { sendMessage } = usePluginMessage();
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const nativeCanvasRef = useRef<NativeCanvas | null>(null);

  const [zoom, setZoom] = useState(100);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);

  // 初始化原生Canvas
  useEffect(() => {
    if (!canvasContainerRef.current) return;

    const canvas = new NativeCanvas(canvasContainerRef.current);
    nativeCanvasRef.current = canvas;

    // 设置回调
    canvas.setCallbacks({
      onVectorClick: (vectorId, isMultiSelect) => {
        if (!isMultiSelect) {
          toggleVectorOrder(vectorId);
        }
        sendMessage({ type: 'selectNode', nodeId: vectorId });
      },
    });

    return () => {
      canvas.destroy();
      nativeCanvasRef.current = null;
    };
  }, []);

  // 同步状态到原生Canvas
  useEffect(() => {
    if (!nativeCanvasRef.current) return;

    nativeCanvasRef.current.updateState({
      vectors: clipmaskVectors,
      selectedVectorIds: Object.keys(vectorOrderMap),
      vectorOrderMap,
      zoom,
      panX,
      panY,
    });
  }, [clipmaskVectors, vectorOrderMap, zoom, panX, panY]);

  // 缩放控制
  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + 25, 400));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev - 25, 25));
  }, []);

  const handleResetView = useCallback(() => {
    setZoom(100);
    setPanX(0);
    setPanY(0);
  }, []);

  return (
    <div style={styles.root}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.logoSection}>
          <div style={styles.logoIcon}>📦</div>
          <div style={styles.logoText}>
            <div style={styles.logoTitle}>Genki Packaging</div>
            <div style={styles.logoSubtitle}>v2.0 - Native Canvas</div>
          </div>
        </div>

        {/* 缩放控制 */}
        <div style={styles.controls}>
          <button onClick={handleZoomOut} style={styles.controlBtn}>-</button>
          <span style={styles.zoomLabel}>{zoom}%</span>
          <button onClick={handleZoomIn} style={styles.controlBtn}>+</button>
          <button onClick={handleResetView} style={styles.controlBtn}>⟲</button>
        </div>
      </div>

      {/* Canvas容器 - 原生DOM渲染 */}
      <div ref={canvasContainerRef} style={styles.canvasContainer} />
    </div>
  );
});

const styles = {
  root: {
    display: 'flex',
    flexDirection: 'column' as const,
    flex: 1,
    minWidth: 0,
    height: '100%',
    overflow: 'hidden',
    background: SEMANTIC_TOKENS.color.surface.canvas,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `${SEMANTIC_TOKENS.spacing.component.md} ${SEMANTIC_TOKENS.spacing.component.lg}`,
    borderBottom: `${SEMANTIC_TOKENS.border.width.thin} solid ${SEMANTIC_TOKENS.color.border.default}`,
    background: SEMANTIC_TOKENS.color.surface.overlay,
    backdropFilter: 'blur(10px)',
  },
  logoSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  logoIcon: {
    width: '24px',
    height: '24px',
    borderRadius: SEMANTIC_TOKENS.border.radius.sm,
    display: 'grid',
    placeItems: 'center',
    background: SEMANTIC_TOKENS.color.bg.interactive.default,
    border: `${SEMANTIC_TOKENS.border.width.thin} solid ${SEMANTIC_TOKENS.color.border.default}`,
  },
  logoText: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px',
  },
  logoTitle: {
    fontSize: SEMANTIC_TOKENS.typography.fontSize.xs,
    fontWeight: SEMANTIC_TOKENS.typography.fontWeight.semibold,
    color: SEMANTIC_TOKENS.color.text.primary,
  },
  logoSubtitle: {
    fontSize: SEMANTIC_TOKENS.typography.fontSize.micro,
    color: SEMANTIC_TOKENS.color.text.tertiary,
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    gap: SEMANTIC_TOKENS.spacing.gap.sm,
  },
  controlBtn: {
    padding: `${SEMANTIC_TOKENS.spacing.component.xs} ${SEMANTIC_TOKENS.spacing.component.sm}`,
    background: SEMANTIC_TOKENS.color.bg.interactive.default,
    border: `${SEMANTIC_TOKENS.border.width.thin} solid ${SEMANTIC_TOKENS.color.border.default}`,
    borderRadius: SEMANTIC_TOKENS.border.radius.sm,
    color: SEMANTIC_TOKENS.color.text.secondary,
    fontSize: SEMANTIC_TOKENS.typography.fontSize.sm,
    cursor: 'pointer',
    transition: `all ${SEMANTIC_TOKENS.motion.duration.fast} ease`,
  },
  zoomLabel: {
    fontSize: SEMANTIC_TOKENS.typography.fontSize.xs,
    color: SEMANTIC_TOKENS.color.text.secondary,
    fontWeight: SEMANTIC_TOKENS.typography.fontWeight.medium,
    minWidth: '45px',
    textAlign: 'center' as const,
  },
  canvasContainer: {
    flex: 1,
    position: 'relative' as const,
    overflow: 'hidden',
  },
};
