/**
 * 🎮 ViewportArea - 视口区域组件
 * 使用 monorepo token system 确保设计一致性
 */

import { memo, useState, useCallback, useMemo, useRef, useEffect, Suspense, lazy } from 'react';
import { useAppStore } from '../../store';
import { useShallow } from 'zustand/react/shallow';
import { usePluginMessage } from '../../hooks';
import { CraftThumbnails } from '../craft/CraftThumbnails';
import { CraftLargePreview } from '../craft/CraftLargePreview';
import { detectFoldEdges, autoFoldSequence } from '../../utils/foldLogic';
import { SEMANTIC_TOKENS, COMPONENT_TOKENS } from '@genki/shared-theme';
import { VectorCard } from './VectorCard';

// 懒加载 3D 视图
const View3D = lazy(() => import('./View3D').then(m => ({ default: m.View3D })));

// 计算所有矢量的边界框 (原版 ui.html 逻辑)
function calculateBounds(vectors: any[]) {
  if (!vectors || vectors.length === 0) {
    return { minX: 0, minY: 0, maxX: 100, maxY: 100, width: 100, height: 100 };
  }

  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;

  vectors.forEach(v => {
    const x = v.x ?? v.bounds?.x ?? 0;
    const y = v.y ?? v.bounds?.y ?? 0;
    const width = v.width ?? v.bounds?.width ?? 100;
    const height = v.height ?? v.bounds?.height ?? 50;

    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + width);
    maxY = Math.max(maxY, y + height);
  });

  return {
    minX, minY, maxX, maxY,
    width: Math.max(maxX - minX, 1),
    height: Math.max(maxY - minY, 1)
  };
}

// 过滤掉被其他图层完全包含的嵌套图层
function filterNestedVectors(vectors: any[]): any[] {
  if (!vectors || vectors.length <= 1) return vectors;

  // 检查 A 是否完全包含 B（带容差）
  const contains = (a: any, b: any, tolerance = 2): boolean => {
    const ax = a.x ?? a.bounds?.x ?? 0;
    const ay = a.y ?? a.bounds?.y ?? 0;
    const aw = a.width ?? a.bounds?.width ?? 0;
    const ah = a.height ?? a.bounds?.height ?? 0;
    const bx = b.x ?? b.bounds?.x ?? 0;
    const by = b.y ?? b.bounds?.y ?? 0;
    const bw = b.width ?? b.bounds?.width ?? 0;
    const bh = b.height ?? b.bounds?.height ?? 0;

    // A 完全包含 B：B 的边界在 A 内部
    return (
      ax - tolerance <= bx &&
      ay - tolerance <= by &&
      ax + aw + tolerance >= bx + bw &&
      ay + ah + tolerance >= by + bh &&
      // 确保 A 比 B 大（避免相同大小的误判）
      aw * ah > bw * bh * 1.1
    );
  };

  // 过滤掉被其他图层包含的图层
  return vectors.filter((v, _i, arr) => {
    // 检查是否有其他图层包含当前图层
    const isContained = arr.some(other => other.id !== v.id && contains(other, v));
    return !isContained;
  });
}

const styles = {
  root: {
    position: 'relative' as const,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    background: 'transparent',
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
    minWidth: 0,
  },
  logoIcon: {
    width: '24px',
    height: '24px',
    borderRadius: SEMANTIC_TOKENS.border.radius.sm,
    display: 'grid',
    placeItems: 'center',
    background: SEMANTIC_TOKENS.color.bg.interactive.default,
    border: `${SEMANTIC_TOKENS.border.width.thin} solid ${SEMANTIC_TOKENS.color.border.default}`,
    boxShadow: SEMANTIC_TOKENS.shadow.md,
    flexShrink: 0,
  },
  logoText: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px',
    minWidth: 0,
  },
  logoTitle: {
    fontSize: SEMANTIC_TOKENS.typography.fontSize.xs,
    lineHeight: 1.1,
    fontWeight: SEMANTIC_TOKENS.typography.fontWeight.semibold,
    letterSpacing: '0.2px',
    color: SEMANTIC_TOKENS.color.text.primary,
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  logoSubtitle: {
    fontSize: SEMANTIC_TOKENS.typography.fontSize.micro,
    lineHeight: 1.2,
    color: SEMANTIC_TOKENS.color.text.tertiary,
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  content: {
    position: 'absolute' as const,
    inset: 0,
    overflow: 'hidden',
  },
  placeholder: {
    position: 'absolute' as const,
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SEMANTIC_TOKENS.spacing.component.xl,
    color: SEMANTIC_TOKENS.color.text.tertiary,
  },
  placeholderCard: {
    width: 'min(520px, 92%)',
    borderRadius: SEMANTIC_TOKENS.border.radius.lg,
    border: `${SEMANTIC_TOKENS.border.width.thin} dashed ${SEMANTIC_TOKENS.color.border.weak}`,
    background: SEMANTIC_TOKENS.color.bg.interactive.default,
    boxShadow: SEMANTIC_TOKENS.shadow.lg,
    padding: '22px 18px',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: SEMANTIC_TOKENS.spacing.component.md,
    textAlign: 'center' as const,
  },
  placeholderIcon: {
    fontSize: '28px',
    lineHeight: 1,
    filter: SEMANTIC_TOKENS.shadow.md,
  },
  placeholderText: {
    fontSize: SEMANTIC_TOKENS.typography.fontSize.xs,
    lineHeight: 1.5,
    color: SEMANTIC_TOKENS.color.text.secondary,
  },
  vectorContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
    padding: '8px',
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  },
  vectorCard: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    minHeight: 0,
    borderRadius: SEMANTIC_TOKENS.border.radius.lg,
    border: `${SEMANTIC_TOKENS.border.width.thin} solid ${SEMANTIC_TOKENS.color.border.default}`,
    background: SEMANTIC_TOKENS.color.surface.overlay,
    backdropFilter: 'blur(10px)',
    boxShadow: SEMANTIC_TOKENS.shadow.lg,
    overflow: 'hidden',
  },
  vectorHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: SEMANTIC_TOKENS.spacing.component.md,
    padding: `${SEMANTIC_TOKENS.spacing.component.sm} ${SEMANTIC_TOKENS.spacing.component.lg}`,
    borderBottom: `${SEMANTIC_TOKENS.border.width.thin} solid ${SEMANTIC_TOKENS.color.border.default}`,
  },
  vectorTitle: {
    fontSize: SEMANTIC_TOKENS.typography.fontSize.xs,
    fontWeight: SEMANTIC_TOKENS.typography.fontWeight.semibold,
    color: SEMANTIC_TOKENS.color.text.primary,
    letterSpacing: '0.2px',
  },
  vectorHint: {
    marginLeft: 'auto',
    fontSize: SEMANTIC_TOKENS.typography.fontSize.micro,
    color: SEMANTIC_TOKENS.color.text.tertiary,
    whiteSpace: 'nowrap' as const,
  },
  buttonGhost: {
    appearance: 'none' as const,
    background: SEMANTIC_TOKENS.color.bg.interactive.default,
    border: `${SEMANTIC_TOKENS.border.width.thin} solid ${SEMANTIC_TOKENS.color.border.default}`,
    color: SEMANTIC_TOKENS.color.text.primary,
    borderRadius: SEMANTIC_TOKENS.border.radius.md,
    padding: `${SEMANTIC_TOKENS.spacing.component.sm} ${SEMANTIC_TOKENS.spacing.component.md}`,
    cursor: 'pointer',
    fontSize: SEMANTIC_TOKENS.typography.fontSize.xs,
    lineHeight: 1,
    display: 'inline-flex',
    alignItems: 'center',
    gap: SEMANTIC_TOKENS.spacing.component.sm,
    flexShrink: 0,
  },
  canvasArea: {
    position: 'absolute' as const,
    inset: 0,
    overflow: 'hidden',
    background: COMPONENT_TOKENS.canvas.bg.area,
  },
  canvasSurface: {
    position: 'relative' as const,
    width: '100%',
    height: '100%',
    borderRadius: SEMANTIC_TOKENS.border.radius.lg,
    border: `1px solid ${COMPONENT_TOKENS.canvas.border.surface}`,
    background: COMPONENT_TOKENS.canvas.bg.surface,
    overflow: 'hidden',
  },
  canvasControls: {
    position: 'absolute' as const,
    top: '8px',
    left: '8px',
    zIndex: 5,
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 6px',
    borderRadius: '8px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    background: 'rgba(18, 18, 22, 0.85)',
    backdropFilter: 'blur(12px)',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
  },
  canvasBtn: {
    width: '20px',
    height: '20px',
    borderRadius: '4px',
    border: 'none',
    background: 'transparent',
    color: SEMANTIC_TOKENS.color.text.secondary,
    cursor: 'pointer',
    fontSize: '11px',
    lineHeight: 1,
    display: 'grid',
    placeItems: 'center',
  },
  canvasZoom: {
    minWidth: '32px',
    textAlign: 'center' as const,
    fontSize: '10px',
    color: SEMANTIC_TOKENS.color.text.secondary,
    fontVariantNumeric: 'tabular-nums' as const,
    fontFamily: 'monospace',
  },
  spatialViewport: {
    position: 'absolute' as const,
    inset: 0,
    transformOrigin: '0 0',
  },
  // Vector 卡片 - 原版轻量级样式（性能优化）
  vectorItem: {
    position: 'absolute' as const,
    borderRadius: '4px',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    background: 'rgba(255, 255, 255, 0.03)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  vectorItemHover: {
    borderColor: 'rgba(6, 182, 212, 0.4)',
    background: 'rgba(6, 182, 212, 0.06)',
    zIndex: 10,
  },
  vectorItemSelected: {
    borderColor: '#06b6d4',
    background: 'rgba(6, 182, 212, 0.1)',
    zIndex: 20,
  },
  vectorItemName: {
    fontSize: '9px',
    fontWeight: 400,
    color: '#a1a1aa',
    textAlign: 'center' as const,
    padding: '2px 4px',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '100%',
    zIndex: 2,
  },
  vectorItemNameSelected: {
    color: '#67e8f9',
  },
  // SVG 预览背景 - 原版样式
  vectorSvgPreview: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundSize: 'contain',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    opacity: 0.3,
    pointerEvents: 'none' as const,
    zIndex: 1,
  },
  vectorSvgPreviewHover: {
    opacity: 0.5,
  },
  vectorSvgPreviewSelected: {
    opacity: 0.6,
  },
  // 序号徽章 - 原版轻量级样式
  vectorOrderBadge: {
    position: 'absolute' as const,
    top: '2px',
    right: '2px',
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    background: 'transparent',
    border: '1px solid #06b6d4',
    color: '#06b6d4',
    fontSize: '8px',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.9,
    zIndex: 3,
  },
  // 幽灵序号（hover时显示）- 原版轻量级样式
  vectorGhostBadge: {
    position: 'absolute' as const,
    top: '2px',
    right: '2px',
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    background: 'transparent',
    border: '1px dashed #71717a',
    color: '#71717a',
    fontSize: '8px',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0,
    transition: 'opacity 0.2s',
    zIndex: 3,
  },
  vectorGhostBadgeVisible: {
    opacity: 1,
  },
  orderBar: {
    display: 'flex',
    alignItems: 'center',
    gap: SEMANTIC_TOKENS.spacing['2'],
    padding: `${SEMANTIC_TOKENS.spacing['2.5']} ${SEMANTIC_TOKENS.spacing['3']}`,
    borderTop: `${SEMANTIC_TOKENS.border.width.thin} solid ${SEMANTIC_TOKENS.color.border.weak}`,
    background: SEMANTIC_TOKENS.color.bg.interactive.hover,
    color: SEMANTIC_TOKENS.color.text.secondary,
    fontSize: SEMANTIC_TOKENS.typography.fontSize.xs,
  },
  dangerBtn: {
    borderColor: SEMANTIC_TOKENS.color.border.danger,
    color: SEMANTIC_TOKENS.color.text.danger,
    background: SEMANTIC_TOKENS.color.bg.accent.red,
  },
  thumbnails: {
    borderTop: `${SEMANTIC_TOKENS.border.width.thin} solid ${SEMANTIC_TOKENS.color.border.weak}`,
    background: SEMANTIC_TOKENS.color.surface.overlay,
    backdropFilter: 'blur(10px)',
  },
  thumbnailsHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 12px',
  },
  thumbnailsTitle: {
    fontSize: '11px',
    fontWeight: 600,
    color: 'rgba(244, 244, 245, 0.95)',
  },
  thumbnailsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
    gap: '8px',
    padding: '0 12px 12px 12px',
    overflowX: 'auto' as const,
  },
  thumb: {
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.10)',
    background: 'rgba(255, 255, 255, 0.04)',
    padding: '8px',
    cursor: 'pointer',
    minWidth: '92px',
  },
  thumbPreview: {
    height: '44px',
    borderRadius: '10px',
    display: 'grid',
    placeItems: 'center',
    background: 'rgba(0, 0, 0, 0.25)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    marginBottom: '6px',
  },
  thumbName: {
    fontSize: '10px',
    color: 'rgba(228, 228, 231, 0.92)',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 12px',
    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
    background: 'rgba(15, 15, 18, 0.72)',
    backdropFilter: 'blur(10px)',
  },
  status: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: 'rgba(228, 228, 231, 0.92)',
    fontSize: '11px',
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '999px',
  },
  info: {
    color: 'rgba(161, 161, 170, 0.95)',
    fontSize: '11px',
    fontVariantNumeric: 'tabular-nums' as const,
  },
  // 折叠线样式
  foldEdge: {
    position: 'absolute' as const,
    pointerEvents: 'none' as const,
    zIndex: 50,
  },
  foldEdgeHorizontal: {
    height: '2px',
    background: '#ec4899',
    boxShadow: '0 0 4px rgba(236, 72, 153, 0.5)',
  },
  foldEdgeVertical: {
    width: '2px',
    background: '#10b981',
    boxShadow: '0 0 4px rgba(16, 185, 129, 0.5)',
  },
  // SVG 预览样式
  svgPreview: {
    position: 'absolute' as const,
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  svgPreviewImg: {
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain' as const,
  },
  // Clipmask 蓝色边框
  clipmaskBorder: {
    border: '2px solid #3b82f6',
    boxShadow: '0 0 8px rgba(59, 130, 246, 0.4)',
  },
};

export const ViewportArea = memo(function ViewportArea() {
  // 使用 useShallow 优化状态订阅，避免不必要的重渲染
  const {
    viewMode,
    setViewMode,
    markedLayers,
    clipmaskVectors,
    foldSequence,
    replacingIndex,
    hPanelId,
    panelNameMap,
    handlePanelClick,
    clearFoldSequence,
    initFoldSequence,
    setHPanelId,
    setPanelNameMap,
    largePreviewCraft,
    setLargePreviewCraft,
    sidebarWidth,
    foldEdgeEditMode,
    deletedFoldEdgeIds,
    deleteFoldEdge,
    setDrivenMap,
  } = useAppStore(
    useShallow((s) => ({
      viewMode: s.viewMode,
      setViewMode: s.setViewMode,
      markedLayers: s.markedLayers,
      clipmaskVectors: s.clipmaskVectors,
      foldSequence: s.foldSequence,
      replacingIndex: s.replacingIndex,
      hPanelId: s.hPanelId,
      panelNameMap: s.panelNameMap,
      handlePanelClick: s.handlePanelClick,
      clearFoldSequence: s.clearFoldSequence,
      initFoldSequence: s.initFoldSequence,
      setHPanelId: s.setHPanelId,
      setPanelNameMap: s.setPanelNameMap,
      largePreviewCraft: s.largePreviewCraft,
      setLargePreviewCraft: s.setLargePreviewCraft,
      sidebarWidth: s.sidebarWidth,
      foldEdgeEditMode: s.foldEdgeEditMode,
      deletedFoldEdgeIds: s.deletedFoldEdgeIds,
      deleteFoldEdge: s.deleteFoldEdge,
      setDrivenMap: s.setDrivenMap,
    }))
  );

  const { sendMessage } = usePluginMessage();

  // 画布状态
  const [zoom, setZoom] = useState(100);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const [showThumbnails, setShowThumbnails] = useState(true);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 500 });
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const hasInitializedRef = useRef(false);
  const lastVectorCountRef = useRef(0);

  // 过滤掉嵌套的图层（大的套小的问题）
  const filteredVectors = useMemo(() => {
    return filterNestedVectors(clipmaskVectors);
  }, [clipmaskVectors]);

  // 自动检测折叠线 - 基于过滤后的 vectors 的空间位置，排除已删除的
  const detectedFoldEdges = useMemo(() => {
    if (filteredVectors.length < 2) return [];

    // 转换为 foldLogic 需要的格式
    const vectors = filteredVectors.map(layer => ({
      id: layer.id,
      name: layer.name,
      x: (layer as any).x ?? layer.bounds?.x ?? 0,
      y: (layer as any).y ?? layer.bounds?.y ?? 0,
      width: (layer as any).width ?? layer.bounds?.width ?? 100,
      height: (layer as any).height ?? layer.bounds?.height ?? 50,
    }));

    // 检测折叠线并过滤掉已删除的
    const allEdges = detectFoldEdges(vectors);
    return allEdges.filter(edge => !deletedFoldEdgeIds.includes(edge.id));
  }, [filteredVectors, deletedFoldEdgeIds]);

  // 监听画布尺寸变化
  useEffect(() => {
    const updateSize = () => {
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        setCanvasSize({ width: rect.width, height: rect.height });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // 计算边界和 fit 比例
  const layoutInfo = useMemo(() => {
    const bounds = calculateBounds(filteredVectors);
    const padding = 40;
    return { bounds, padding };
  }, [filteredVectors]);

  // 计算 fit 比例 - 100% = 完全适应视口（考虑侧边栏宽度）
  const fitScale = useMemo(() => {
    if (canvasSize.width <= 0 || canvasSize.height <= 0) return 1;
    const { bounds, padding } = layoutInfo;
    // 可视区域宽度需要减去侧边栏宽度
    const visibleWidth = canvasSize.width - sidebarWidth;
    const availW = Math.max(1, visibleWidth - padding * 2);
    const availH = Math.max(1, canvasSize.height - padding * 2);
    return Math.min(availW / bounds.width, availH / bounds.height);
  }, [canvasSize.width, canvasSize.height, layoutInfo, sidebarWidth]);

  // Removed console.debug for performance - was causing severe lag on slider changes
  // useEffect(() => {
  //   if (clipmaskVectors.length <= 2) {
  //     const first = clipmaskVectors[0] as any;
  //     console.debug('[ViewportArea] vectors=', clipmaskVectors.length, {
  //       canvasSize,
  //       bounds: layoutInfo.bounds,
  //       scale: layoutInfo.scale,
  //       first: first
  //         ? {
  //             id: first.id,
  //             name: first.name,
  //             x: first.x,
  //             y: first.y,
  //             width: first.width,
  //             height: first.height,
  //             bounds: first.bounds,
  //           }
  //         : null,
  //     });
  //   }
  // }, [clipmaskVectors, canvasSize, layoutInfo.bounds, layoutInfo.scale]);

  // 自动居中 vectors - 只在首次加载或 vectors 数量变化时触发
  useEffect(() => {
    const vectorCount = filteredVectors.length;

    // 只在以下情况触发自动 fit：
    // 1. 首次有 vectors 数据
    // 2. vectors 数量从 0 变为有数据
    const shouldAutoFit = vectorCount > 0 && canvasSize.width > 0 && (
      !hasInitializedRef.current ||
      (lastVectorCountRef.current === 0 && vectorCount > 0)
    );

    if (shouldAutoFit) {
      const { bounds, padding } = layoutInfo;

      // 100% = 完全适应视口，初始设为 100%
      const z = fitScale;

      // 可视区域宽度（减去侧边栏）
      const visibleWidth = canvasSize.width - sidebarWidth;

      const contentScreenW = bounds.width * z;
      const contentScreenH = bounds.height * z;
      const nextPanX = (visibleWidth - contentScreenW) / 2 - padding * z;
      const nextPanY = (canvasSize.height - contentScreenH) / 2 - padding * z;

      setZoom(100); // 100% = fit to viewport
      setPanX(nextPanX);
      setPanY(nextPanY);
      hasInitializedRef.current = true;
    }

    lastVectorCountRef.current = vectorCount;
  }, [filteredVectors.length, canvasSize.width, canvasSize.height, layoutInfo, fitScale, sidebarWidth]);

  // 缩放控制
  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + 25, 400));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev - 25, 25));
  }, []);

  const handleResetView = useCallback(() => {
    // 重置视图：100% 缩放 + 在左侧可视区域居中显示（不被侧边栏遮挡）
    const { bounds } = layoutInfo;
    const z = fitScale; // 100% zoom 时的实际缩放比例

    // 内容在屏幕上的实际尺寸
    const contentScreenW = bounds.width * z;
    const contentScreenH = bounds.height * z;

    // 可视区域宽度（减去侧边栏）
    const visibleWidth = canvasSize.width - sidebarWidth;

    // 居中：(可视区域尺寸 - 内容尺寸) / 2
    const nextPanX = (visibleWidth - contentScreenW) / 2;
    const nextPanY = (canvasSize.height - contentScreenH) / 2;

    setZoom(100);
    setPanX(nextPanX);
    setPanY(nextPanY);
  }, [layoutInfo, fitScale, canvasSize.width, canvasSize.height, sidebarWidth]);

  // 恢复自动排序 - 按 filteredVectors 的原始顺序
  const handleRestoreAutoSort = useCallback(() => {
    if (filteredVectors.length > 0) {
      initFoldSequence(filteredVectors.map(v => v.id));
    }
  }, [filteredVectors, initFoldSequence]);

  const handleAutoName = useCallback(() => {
    // 基于 H 面自动命名所有面板
    if (!hPanelId) {
      sendMessage({ type: 'AUTO_NAME_FOLDS' });
      return;
    }

    const hPanel = clipmaskVectors.find(l => l.id === hPanelId);
    if (!hPanel) return;

    const newNameMap: Record<string, string> = { [hPanelId]: 'H' };
    const selectedIds = foldSequence;
    const selectedLayers = clipmaskVectors.filter(l => selectedIds.includes(l.id));

    const hLeft = (hPanel as any).x ?? hPanel.bounds?.x ?? 0;
    const hRight = hLeft + ((hPanel as any).width ?? hPanel.bounds?.width ?? 100);
    const hTop = (hPanel as any).y ?? hPanel.bounds?.y ?? 0;
    const hBottom = hTop + ((hPanel as any).height ?? hPanel.bounds?.height ?? 50);

    // 左边面板: L, F, R
    const leftPanels = selectedLayers
      .filter(v => {
        if (v.id === hPanelId) return false;
        const vx = (v as any).x ?? v.bounds?.x ?? 0;
        const vy = (v as any).y ?? v.bounds?.y ?? 0;
        const vh = (v as any).height ?? v.bounds?.height ?? 50;
        const vw = (v as any).width ?? v.bounds?.width ?? 100;
        const vCenterX = vx + vw / 2;
        const hasYOverlap = (vy + vh) > hTop && vy < hBottom;
        return hasYOverlap && vCenterX < hLeft;
      })
      .sort((a, b) => ((b as any).x ?? b.bounds?.x ?? 0) - ((a as any).x ?? a.bounds?.x ?? 0));

    const leftNames = ['L', 'F', 'R'];
    leftPanels.forEach((v, i) => {
      newNameMap[v.id] = i < leftNames.length ? leftNames[i] : `R${i - 2}`;
    });

    // 右边面板: HR
    selectedLayers.forEach(v => {
      if (v.id === hPanelId || newNameMap[v.id]) return;
      const vx = (v as any).x ?? v.bounds?.x ?? 0;
      const vy = (v as any).y ?? v.bounds?.y ?? 0;
      const vh = (v as any).height ?? v.bounds?.height ?? 50;
      const hasYOverlap = (vy + vh) > hTop && vy < hBottom;
      if (hasYOverlap && vx >= hRight - 5) {
        let code = 'HR';
        let suffix = 1;
        while (Object.values(newNameMap).includes(code)) {
          code = `HR${suffix++}`;
        }
        newNameMap[v.id] = code;
      }
    });

    // 上下面板: HT, HB
    selectedLayers.forEach(v => {
      if (v.id === hPanelId || newNameMap[v.id]) return;
      const vx = (v as any).x ?? v.bounds?.x ?? 0;
      const vy = (v as any).y ?? v.bounds?.y ?? 0;
      const vh = (v as any).height ?? v.bounds?.height ?? 50;
      const vw = (v as any).width ?? v.bounds?.width ?? 100;
      const vCenterX = vx + vw / 2;
      const isAligned = vCenterX > hLeft && vCenterX < hRight;
      if (isAligned) {
        if (vy + vh <= hTop + 5) {
          newNameMap[v.id] = 'HT';
        } else if (vy >= hBottom - 5) {
          newNameMap[v.id] = 'HB';
        }
      }
    });

    // 剩余面板: P1, P2...
    let pIndex = 1;
    selectedLayers.forEach(v => {
      if (!newNameMap[v.id]) {
        newNameMap[v.id] = `P${pIndex++}`;
      }
    });

    setPanelNameMap(newNameMap);

    // 发送消息更新 Figma 图层名称
    sendMessage({
      type: 'UPDATE_PANEL_NAMES',
      payload: { nameMap: newNameMap }
    });
  }, [hPanelId, clipmaskVectors, foldSequence, setPanelNameMap, sendMessage]);

  // 获取下一个显示的序号（替换模式显示替换位置的编号，正常模式显示下一个编号）
  const nextDisplayNumber = useMemo(() => {
    if (replacingIndex !== null) {
      return replacingIndex + 1;  // 替换模式：显示被替换的步骤编号
    }
    return foldSequence.length + 1;  // 正常模式：显示下一个编号
  }, [foldSequence.length, replacingIndex]);

  // 单击处理面板点击（支持追加和替换模式）
  const onVectorClick = useCallback((id: string) => {
    handlePanelClick(id);
    sendMessage({ type: 'selectNode', nodeId: id });
  }, [handlePanelClick, sendMessage]);

  // 双击设置 H 面板并自动计算折叠顺序
  const handleVectorDoubleClick = useCallback((id: string) => {
    setHPanelId(id);

    // 自动计算折叠顺序和命名
    if (filteredVectors.length > 0) {
      const vectors = filteredVectors.map(layer => ({
        id: layer.id,
        name: layer.name,
        x: (layer as any).x ?? layer.bounds?.x ?? 0,
        y: (layer as any).y ?? layer.bounds?.y ?? 0,
        width: (layer as any).width ?? layer.bounds?.width ?? 100,
        height: (layer as any).height ?? layer.bounds?.height ?? 50,
      }));
      const result = autoFoldSequence(vectors, id);
      initFoldSequence(result.sequence);
      setPanelNameMap(result.nameMap);
      // 存储带动关系到 store
      if (result.drivenMap) {
        setDrivenMap(result.drivenMap);
      }
    }
  }, [setHPanelId, setPanelNameMap, setDrivenMap, filteredVectors, initFoldSequence]);

  // 右键删除折叠线（从本地状态中移除）
  const handleFoldEdgeRightClick = useCallback((edgeId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    deleteFoldEdge(edgeId);
  }, [deleteFoldEdge]);

  // 画布拖动事件处理
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    // 右键、中键、Alt+左键 或 左键点击空白区域 开始拖动
    // 但右键点击折叠线时不触发拖动（用于删除折叠线）
    const target = e.target as HTMLElement;
    const isCanvasArea = target.closest('[data-canvas-area]') && !target.closest('[data-vector-card]');
    const isOnFoldEdge = target.closest('[data-fold-edge]');

    // 右键点击折叠线时，不触发拖动
    if (e.button === 2 && isOnFoldEdge) {
      return;
    }

    if (e.button === 2 || e.button === 1 || (e.button === 0 && e.altKey) || (e.button === 0 && isCanvasArea)) {
      e.preventDefault();
      setIsPanning(true);
      panStartRef.current = { x: e.clientX - panX, y: e.clientY - panY };
    }
  }, [panX, panY]);

  // 禁用右键菜单
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setPanX(e.clientX - panStartRef.current.x);
      setPanY(e.clientY - panStartRef.current.y);
    }
  }, [isPanning]);

  const handleCanvasMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // 滚轮缩放 - 使用 RAF + 节流避免卡顿
  const wheelThrottleRef = useRef<number>(0);
  const rafIdRef = useRef<number | null>(null);
  const pendingZoomRef = useRef<number | null>(null);

  const handleWheelNative = useCallback((e: WheelEvent) => {
    // 3D 模式下不处理滚轮事件，交给 OrbitControls
    if (viewMode === '3d') return;

    e.preventDefault();
    const now = Date.now();
    // 节流：每 32ms 最多处理一次（约 30fps）
    if (now - wheelThrottleRef.current < 32) return;

    wheelThrottleRef.current = now;

    const delta = e.deltaY > 0 ? 0.92 : 1.08;

    // 使用 RAF 批量更新，避免阻塞主线程
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
    }

    setZoom((prev) => {
      const newZoom = Math.max(10, Math.min(400, Math.round(prev * delta)));
      pendingZoomRef.current = newZoom;
      return newZoom;
    });
  }, []);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheelNative, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleWheelNative);
    };
  }, [handleWheelNative]);

  const hasContent = filteredVectors.length > 0;

  return (
    <div style={styles.root}>
      {/* Viewport Content */}
      <div style={styles.content} ref={canvasRef}>
        {/* 3D 模式 */}
        {viewMode === '3d' ? (
          <>
            <Suspense fallback={
              <div style={styles.placeholder}>
                <div style={styles.placeholderCard}>
                  <div style={styles.placeholderIcon}>⏳</div>
                  <div style={styles.placeholderText}>加载 3D 视图...</div>
                </div>
              </div>
            }>
              <View3D height="100%" />
            </Suspense>
            {/* 3D 模式下的控制面板 */}
            <div style={{
              ...styles.canvasControls,
              position: 'absolute',
              top: '8px',
              left: '8px',
            }}>
              <button
                style={{
                  ...styles.canvasBtn,
                  background: '#06b6d4',
                  color: '#fff',
                  fontWeight: 500,
                  padding: '2px 6px',
                }}
                onClick={() => setViewMode('2d')}
                title="切换到 2D 视图"
                type="button"
              >
                3D
              </button>
            </div>
          </>
        ) : !hasContent ? (
          /* 空状态 - 在左侧可视区域居中（考虑侧边栏宽度） */
          <>
            <div style={{
              ...styles.placeholder,
              paddingRight: sidebarWidth,
            }} id="emptyState">
              <div style={styles.placeholderCard}>
                <div style={styles.placeholderIcon}>📦</div>
                <div style={styles.placeholderText}>
                  Select a Frame in Figma to preview export regions
                </div>
              </div>
            </div>
            {/* 空状态下的 2D/3D 切换按钮 */}
            <div style={{
              ...styles.canvasControls,
              position: 'absolute',
              top: '8px',
              left: '8px',
            }}>
              <button
                style={{
                  ...styles.canvasBtn,
                  background: 'transparent',
                  color: SEMANTIC_TOKENS.color.text.secondary,
                  fontWeight: 500,
                  padding: '2px 6px',
                }}
                onClick={() => setViewMode('3d')}
                title="切换到 3D 视图"
                type="button"
              >
                2D
              </button>
            </div>
          </>
        ) : (
          /* 刀版图预览 - 全屏 canvas */
          <div
            style={styles.canvasArea}
            data-canvas-area
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
            onContextMenu={handleContextMenu}
          >
            {/* 左上角：缩放控制 */}
            <div style={{
              ...styles.canvasControls,
              position: 'absolute',
              top: '8px',
              left: '8px',
            }}>
              <button style={styles.canvasBtn} onClick={handleZoomOut} title="缩小" type="button">−</button>
              <span style={styles.canvasZoom}>{zoom}%</span>
              <button style={styles.canvasBtn} onClick={handleZoomIn} title="放大" type="button">+</button>
              <button style={styles.canvasBtn} onClick={handleResetView} title="重置" type="button">⟲</button>
              <span style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.2)', margin: '0 4px' }} />
              <button
                style={{
                  ...styles.canvasBtn,
                  background: viewMode === '3d' ? '#06b6d4' : 'transparent',
                  color: viewMode === '3d' ? '#fff' : SEMANTIC_TOKENS.color.text.secondary,
                  fontWeight: 500,
                  padding: '2px 6px',
                }}
                onClick={() => setViewMode(viewMode === '2d' ? '3d' : '2d')}
                title="切换 2D/3D 视图"
                type="button"
              >
                {viewMode.toUpperCase()}
              </button>
            </div>

            {/* 右上角：排序控制 - 吸附在侧边栏左侧 */}
            <div style={{
              position: 'absolute',
              top: '8px',
              right: `${sidebarWidth + 8}px`,
              zIndex: 5,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 6px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              background: 'rgba(18, 18, 22, 0.85)',
              backdropFilter: 'blur(12px)',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
              transition: 'right 0.15s ease-out',
            }}>
              <button
                style={styles.canvasBtn}
                onClick={handleRestoreAutoSort}
                title="恢复自动排序"
                type="button"
              >
                ↻
              </button>
              {foldSequence.length > 0 && (
                <button
                  style={{
                    ...styles.canvasBtn,
                    color: '#ef4444',
                  }}
                  onClick={clearFoldSequence}
                  title="清空排序"
                  type="button"
                >
                  ✕
                </button>
              )}
            </div>

            {/* 空间视口 */}
            <div
              style={{
                ...styles.spatialViewport,
                transform: `translate(${panX}px, ${panY}px)`,
                cursor: isPanning ? 'grabbing' : 'grab',
                willChange: isPanning ? 'transform' : 'auto',
                transition: 'none',
              }}
            >
              {/* 渲染矢量图层 - 使用优化的 VectorCard 组件 */}
              {filteredVectors.map((layer) => {
                // 计算缩放后的位置 - 原版逻辑
                const scale = fitScale * zoom / 100;
                const lx = (layer as any).x ?? layer.bounds?.x ?? 0;
                const ly = (layer as any).y ?? layer.bounds?.y ?? 0;
                const lw = (layer as any).width ?? layer.bounds?.width ?? 100;
                const lh = (layer as any).height ?? layer.bounds?.height ?? 50;
                const { bounds } = layoutInfo;

                const scaledPosition = {
                  left: (lx - bounds.minX) * scale,
                  top: (ly - bounds.minY) * scale,
                  width: Math.max(lw * scale, 20),
                  height: Math.max(lh * scale, 20),
                };

                const sequenceIndex = foldSequence.indexOf(layer.id);
                const isOrdered = sequenceIndex !== -1;
                const isReplacing = isOrdered && replacingIndex === sequenceIndex;
                const isSwapMode = replacingIndex !== null;
                const swapNum = isSwapMode ? replacingIndex + 1 : undefined;

                return (
                  <VectorCard
                    key={layer.id}
                    layer={layer}
                    isHovered={hoveredId === layer.id}
                    isOrdered={isOrdered}
                    isReplacing={isReplacing}
                    orderNum={isOrdered ? sequenceIndex + 1 : undefined}
                    nextNum={nextDisplayNumber}
                    swapNum={swapNum}
                    isSwapMode={isSwapMode}
                    isClipMask={layer.name?.toLowerCase().includes('clipmask') || layer.craftType === 'CLIPMASK'}
                    isHPanel={hPanelId === layer.id}
                    displayName={panelNameMap[layer.id] || layer.name}
                    scaledPosition={scaledPosition}
                    onVectorClick={onVectorClick}
                    onVectorDoubleClick={handleVectorDoubleClick}
                    onMouseEnter={setHoveredId}
                    onMouseLeave={() => setHoveredId(null)}
                  />
                );
              })}

              {/* 渲染折叠线 - 使用自动检测的折叠线 */}
              {detectedFoldEdges.map((edge) => {
                const isHorizontal = edge.type === 'horizontal';
                // 只有在编辑模式下才显示 hover 效果
                const isEdgeHovered = foldEdgeEditMode && hoveredEdgeId === edge.id;

                // 计算缩放后的位置 - 与 VectorCard 一致
                const scale = fitScale * zoom / 100;
                const { bounds } = layoutInfo;
                const left = (edge.x - bounds.minX) * scale;
                const top = (edge.y - bounds.minY) * scale;
                const width = isHorizontal ? edge.width * scale : 4;
                const height = isHorizontal ? 4 : edge.height * scale;

                // hover 时增加线宽和亮度（仅编辑模式）
                const hoverWidth = isHorizontal ? width : (isEdgeHovered ? 6 : 4);
                const hoverHeight = isHorizontal ? (isEdgeHovered ? 6 : 4) : height;

                return (
                  <div
                    key={edge.id}
                    data-fold-edge
                    style={{
                      ...styles.foldEdge,
                      ...(isHorizontal ? styles.foldEdgeHorizontal : styles.foldEdgeVertical),
                      left: isHorizontal ? left : (left - (isEdgeHovered ? 1 : 0)),
                      top: isHorizontal ? (top - (isEdgeHovered ? 1 : 0)) : top,
                      width: hoverWidth,
                      height: hoverHeight,
                      cursor: foldEdgeEditMode ? 'pointer' : 'default',
                      pointerEvents: foldEdgeEditMode ? 'auto' : 'none',
                      opacity: isEdgeHovered ? 1 : 0.8,
                      boxShadow: isEdgeHovered
                        ? (isHorizontal ? '0 0 12px rgba(236, 72, 153, 0.8)' : '0 0 12px rgba(16, 185, 129, 0.8)')
                        : (isHorizontal ? '0 0 4px rgba(236, 72, 153, 0.5)' : '0 0 4px rgba(16, 185, 129, 0.5)'),
                      zIndex: isEdgeHovered ? 60 : 50,
                    }}
                    title={foldEdgeEditMode ? `${edge.id} (${edge.foldAngle}°) - 右键删除` : `${edge.id} (${edge.foldAngle}°)`}
                    onMouseEnter={() => foldEdgeEditMode && setHoveredEdgeId(edge.id)}
                    onMouseLeave={() => foldEdgeEditMode && setHoveredEdgeId(null)}
                    onContextMenu={(e) => foldEdgeEditMode && handleFoldEdgeRightClick(edge.id, e)}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* 工艺大图预览 - 在 content 容器内，只覆盖视口区域 */}
        <CraftLargePreview
          craftType={largePreviewCraft}
          onClose={() => setLargePreviewCraft(null)}
        />
      </div>

      {/* 工艺预览缩略图 - 浮层固定在左下角，z-index 高于大图预览 */}
      <div style={{
        position: 'absolute',
        left: '12px',
        bottom: '12px',
        zIndex: 200, // 高于大图预览的 zIndex: 100
        maxWidth: '400px',
      }}>
        <CraftThumbnails
          collapsed={!showThumbnails}
          onToggle={() => setShowThumbnails(!showThumbnails)}
        />
      </div>
    </div>
  );
});
