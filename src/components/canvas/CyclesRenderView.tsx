/**
 * 🎨 CyclesRenderView - Cycles 路径追踪渲染视图
 * 只渲染刀版图面板 (clipmaskVectors) → 3D 面片
 * 纯 @react-three/fiber 实现，不使用 drei 避免 URL 问题
 */

import React, { useMemo, useState, useEffect, useRef, lazy, Suspense } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../../store';
import { SEMANTIC_TOKENS } from '@genki/shared-theme';
import type { MarkedLayer } from '../../types/core';
import { StudioHDREnvironment } from './StudioHDREnvironment';

// 延迟加载 Canvas 以避免初始化时的 URL 问题
const LazyCanvas = lazy(() =>
  import('@react-three/fiber').then(mod => ({
    default: mod.Canvas
  }))
);

// 简单的错误边界组件
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; onError: () => void },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; onError: () => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('CyclesRenderView Error:', error);
    this.props.onError();
  }

  render() {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}

// HDR 预设
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

type HDRPreset = typeof HDR_PRESETS[number]['value'];

// 默认纸板材质
const DEFAULT_CARDBOARD = {
  roughness: 0.85,
  metalness: 0.02,
  clearcoat: 0,
  color: '#e8e0d5',
};

// HDR 灯光配置
const HDR_LIGHT_CONFIGS: Record<HDRPreset, {
  skyColor: string;
  groundColor: string;
  mainLight: { color: string; intensity: number };
  bgColor: string;
}> = {
  city: { skyColor: '#87ceeb', groundColor: '#4a4a4a', mainLight: { color: '#fff5e6', intensity: 1.2 }, bgColor: '#1a1a2e' },
  studio: { skyColor: '#f5f5f5', groundColor: '#808080', mainLight: { color: '#ffffff', intensity: 1.5 }, bgColor: '#2a2a2a' },
  sunset: { skyColor: '#ff7f50', groundColor: '#4a3728', mainLight: { color: '#ffa500', intensity: 1.0 }, bgColor: '#1a0a0a' },
  dawn: { skyColor: '#ffb6c1', groundColor: '#4a4a5a', mainLight: { color: '#ffd700', intensity: 0.8 }, bgColor: '#1a1a2e' },
  night: { skyColor: '#191970', groundColor: '#0a0a1a', mainLight: { color: '#4169e1', intensity: 0.4 }, bgColor: '#050510' },
  warehouse: { skyColor: '#d3d3d3', groundColor: '#696969', mainLight: { color: '#f0e68c', intensity: 1.0 }, bgColor: '#1a1a1a' },
  forest: { skyColor: '#90ee90', groundColor: '#228b22', mainLight: { color: '#f5f5dc', intensity: 0.9 }, bgColor: '#0a1a0a' },
  apartment: { skyColor: '#fffaf0', groundColor: '#8b7355', mainLight: { color: '#ffefd5', intensity: 1.1 }, bgColor: '#1a1510' },
};


// 环境灯光组件
const EnvironmentLights: React.FC<{ preset: HDRPreset }> = ({ preset }) => {
  const config = HDR_LIGHT_CONFIGS[preset] || HDR_LIGHT_CONFIGS.studio;
  return (
    <>
      <hemisphereLight args={[config.skyColor, config.groundColor, 0.6]} />
      <directionalLight position={[5, 10, 5]} intensity={config.mainLight.intensity} color={config.mainLight.color} castShadow />
      <directionalLight position={[-5, 5, -5]} intensity={0.3} color="#b0c4de" />
      <ambientLight intensity={0.3} />
      <color attach="background" args={[config.bgColor]} />
    </>
  );
};

// 单个面板 3D 组件
interface Panel3DProps {
  layer: MarkedLayer;
  thickness: number;
  scale: number;
  offsetX: number;
  offsetY: number;
  foldAngle?: number;
  foldAxis?: 'x' | 'z';
  pivotEdge?: 'left' | 'right' | 'top' | 'bottom';
}

const Panel3D: React.FC<Panel3DProps> = ({ layer, thickness, scale, offsetX, offsetY }) => {
  const x = ((layer as any).x ?? layer.bounds?.x ?? 0) - offsetX;
  const y = ((layer as any).y ?? layer.bounds?.y ?? 0) - offsetY;
  const w = (layer as any).width ?? layer.bounds?.width ?? 100;
  const h = (layer as any).height ?? layer.bounds?.height ?? 50;

  const posX = x * scale;
  const posZ = y * scale;
  const width = w * scale;
  const height = h * scale;

  return (
    <mesh position={[posX + width / 2, thickness / 2, posZ + height / 2]}>
      <boxGeometry args={[width, thickness, height]} />
      <meshStandardMaterial color={DEFAULT_CARDBOARD.color} roughness={0.85} metalness={0.02} />
    </mesh>
  );
};

// 递归折叠面板组件
interface FoldingPanelGroupProps {
  panelId: string;
  panels: MarkedLayer[];
  panelMap: Map<string, MarkedLayer>;
  drivenMap: Record<string, string[]>;
  thickness: number;
  scale: number;
  offsetX: number;
  offsetY: number;
  foldAngle: number;
  depth: number;
}

const FoldingPanelGroup: React.FC<FoldingPanelGroupProps> = ({
  panelId, panels, panelMap, drivenMap, thickness, scale, offsetX, offsetY, foldAngle, depth
}) => {
  const panel = panelMap.get(panelId);
  if (!panel) return null;

  const children = drivenMap[panelId] || [];
  const x = ((panel as any).x ?? panel.bounds?.x ?? 0) - offsetX;
  const y = ((panel as any).y ?? panel.bounds?.y ?? 0) - offsetY;
  const w = (panel as any).width ?? panel.bounds?.width ?? 100;
  const h = (panel as any).height ?? panel.bounds?.height ?? 50;

  const posX = x * scale;
  const posZ = y * scale;
  const width = w * scale;
  const height = h * scale;

  // 根面板不折叠
  if (depth === 0) {
    return (
      <group>
        <mesh position={[posX + width / 2, thickness / 2, posZ + height / 2]}>
          <boxGeometry args={[width, thickness, height]} />
          <meshStandardMaterial color="#4a90d9" roughness={0.85} metalness={0.02} />
        </mesh>
        {children.map(childId => (
          <FoldingPanelGroup
            key={childId}
            panelId={childId}
            panels={panels}
            panelMap={panelMap}
            drivenMap={drivenMap}
            thickness={thickness}
            scale={scale}
            offsetX={offsetX}
            offsetY={offsetY}
            foldAngle={foldAngle}
            depth={depth + 1}
          />
        ))}
      </group>
    );
  }

  // 子面板需要折叠 - 根据相对位置确定折叠轴和方向
  const parentId = Object.keys(drivenMap).find(pid => drivenMap[pid]?.includes(panelId));
  const parent = parentId ? panelMap.get(parentId) : null;

  let pivotX = posX;
  let pivotZ = posZ;
  let rotationAxis: [number, number, number] = [0, 0, 1];
  let angle = foldAngle;

  if (parent) {
    const px = ((parent as any).x ?? parent.bounds?.x ?? 0) - offsetX;
    const py = ((parent as any).y ?? parent.bounds?.y ?? 0) - offsetY;
    const pw = (parent as any).width ?? parent.bounds?.width ?? 100;
    const ph = (parent as any).height ?? parent.bounds?.height ?? 50;

    const parentCenterX = px * scale + pw * scale / 2;
    const parentCenterZ = py * scale + ph * scale / 2;
    const childCenterX = posX + width / 2;
    const childCenterZ = posZ + height / 2;

    // 判断子面板相对于父面板的位置
    const dx = childCenterX - parentCenterX;
    const dz = childCenterZ - parentCenterZ;

    if (Math.abs(dx) > Math.abs(dz)) {
      // 左右关系 - 绕Z轴折叠
      rotationAxis = [0, 0, 1];
      if (dx > 0) {
        pivotX = px * scale + pw * scale; // 右边缘
        angle = -foldAngle;
      } else {
        pivotX = px * scale; // 左边缘
        angle = foldAngle;
      }
      pivotZ = posZ + height / 2;
    } else {
      // 上下关系 - 绕X轴折叠
      rotationAxis = [1, 0, 0];
      if (dz > 0) {
        pivotZ = py * scale + ph * scale; // 下边缘
        angle = foldAngle;
      } else {
        pivotZ = py * scale; // 上边缘
        angle = -foldAngle;
      }
      pivotX = posX + width / 2;
    }
  }

  const colors = ['#5ba55b', '#d95b5b', '#d9a55b', '#9b5bd9', '#5bd9d9'];
  const color = colors[depth % colors.length];

  return (
    <group position={[pivotX, 0, pivotZ]} rotation={[rotationAxis[0] * angle, rotationAxis[1] * angle, rotationAxis[2] * angle]}>
      <mesh position={[posX + width / 2 - pivotX, thickness / 2, posZ + height / 2 - pivotZ]}>
        <boxGeometry args={[width, thickness, height]} />
        <meshStandardMaterial color={color} roughness={0.85} metalness={0.02} />
      </mesh>
      {children.map(childId => (
        <FoldingPanelGroup
          key={childId}
          panelId={childId}
          panels={panels}
          panelMap={panelMap}
          drivenMap={drivenMap}
          thickness={thickness}
          scale={scale}
          offsetX={offsetX}
          offsetY={offsetY}
          foldAngle={foldAngle}
          depth={depth + 1}
        />
      ))}
    </group>
  );
};

// 3D 场景
interface Scene3DProps {
  panels: MarkedLayer[];
  hdrPreset: HDRPreset;
  thickness: number;
  foldProgress: number;
  foldSequence: string[];
  rootPanelId: string | null;
  drivenMap: Record<string, string[]>;
}

const Scene3D: React.FC<Scene3DProps> = ({ panels, hdrPreset, thickness, foldProgress, foldSequence, rootPanelId, drivenMap }) => {
  // 计算折叠角度
  const angles = useMemo(() => {
    const p = Math.max(0, Math.min(1, foldProgress));
    const clamp = (v: number) => Math.max(0, Math.min(1, v));
    const seg = (start: number, dur: number) => clamp((p - start) / dur);
    return {
      wings: clamp(p / 0.3) * Math.PI / 2,
      body: seg(0.3, 0.25) * Math.PI / 2,
      flaps: seg(0.55, 0.2) * Math.PI / 2,
      tucks: seg(0.75, 0.25) * Math.PI / 2,
    };
  }, [foldProgress]);

  const bounds = useMemo(() => {
    if (!panels || panels.length === 0) {
      return { minX: 0, minY: 0, width: 100, height: 100 };
    }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    panels.forEach(v => {
      if (!v) return;
      const x = (v as any).x ?? v.bounds?.x ?? 0;
      const y = (v as any).y ?? v.bounds?.y ?? 0;
      const w = (v as any).width ?? v.bounds?.width ?? 100;
      const h = (v as any).height ?? v.bounds?.height ?? 50;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + w);
      maxY = Math.max(maxY, y + h);
    });
    if (!isFinite(minX)) minX = 0;
    if (!isFinite(minY)) minY = 0;
    if (!isFinite(maxX)) maxX = 100;
    if (!isFinite(maxY)) maxY = 100;
    return { minX, minY, width: maxX - minX, height: maxY - minY };
  }, [panels]);

  const scale = 0.1;

  // 创建面板ID到面板的映射
  const panelMap = useMemo(() => {
    const map = new Map<string, MarkedLayer>();
    panels.forEach(p => { if (p && p.id) map.set(p.id, p); });
    return map;
  }, [panels]);

  // 计算折叠角度 (0-90度)
  const foldAngle = foldProgress * Math.PI / 2;

  // 如果有根面板和drivenMap，使用层级折叠
  const hasHierarchy = rootPanelId && Object.keys(drivenMap).length > 0;

  return (
    <group>
      <StudioHDREnvironment preset="studio" intensity={1.5} />
      <EnvironmentLights preset={hdrPreset} />
      {hasHierarchy ? (
        <FoldingPanelGroup
          panelId={rootPanelId}
          panels={panels}
          panelMap={panelMap}
          drivenMap={drivenMap}
          thickness={thickness}
          scale={scale}
          offsetX={bounds.minX}
          offsetY={bounds.minY}
          foldAngle={foldAngle}
          depth={0}
        />
      ) : (
        panels.filter(p => p && p.id).map((panel) => (
          <Panel3D
            key={panel.id}
            layer={panel}
            thickness={thickness}
            scale={scale}
            offsetX={bounds.minX}
            offsetY={bounds.minY}
          />
        ))
      )}
    </group>
  );
};

// 样式
const styles = {
  container: { position: 'absolute' as const, inset: 0, display: 'flex', flexDirection: 'column' as const },
  canvasWrapper: { flex: 1, position: 'relative' as const },
  controlBar: {
    position: 'absolute' as const, bottom: '12px', left: '12px',
    display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px',
    borderRadius: '8px', background: 'rgba(18, 18, 22, 0.9)', backdropFilter: 'blur(12px)',
    border: `1px solid ${SEMANTIC_TOKENS.color.border.default}`, zIndex: 10,
  },
  controlLabel: { fontSize: '11px', color: SEMANTIC_TOKENS.color.text.secondary, whiteSpace: 'nowrap' as const },
  controlValue: { fontSize: '11px', color: SEMANTIC_TOKENS.color.text.primary, fontWeight: 500, minWidth: '32px' },
  slider: { width: '100px', height: '4px', appearance: 'none' as const, background: SEMANTIC_TOKENS.color.bg.secondary, borderRadius: '2px', cursor: 'pointer' },
  exitBtn: {
    position: 'absolute' as const, top: '12px', left: '12px', padding: '6px 12px',
    borderRadius: '6px', background: 'rgba(18, 18, 22, 0.9)', backdropFilter: 'blur(12px)',
    border: `1px solid ${SEMANTIC_TOKENS.color.border.default}`, color: SEMANTIC_TOKENS.color.text.primary,
    fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', zIndex: 10,
  },
};

// 主组件
export const CyclesRenderView: React.FC = () => {
  const { clipmaskVectors, cyclesHDRPreset, setCyclesPreviewOpen, foldSequence, rootPanelId, drivenMap } = useAppStore(
    useShallow((s) => ({
      clipmaskVectors: s.clipmaskVectors,
      cyclesHDRPreset: s.cyclesHDRPreset,
      setCyclesPreviewOpen: s.setCyclesPreviewOpen,
      foldSequence: s.foldSequence,
      rootPanelId: s.rootPanelId,
      drivenMap: s.drivenMap,
    }))
  );

  const [thickness, setThickness] = useState(5);
  const [foldProgress, setFoldProgress] = useState(0);
  const [hasError, setHasError] = useState(false);

  // 如果 3D 渲染失败，显示 2D 回退视图
  if (hasError) {
    return (
      <div style={styles.container}>
        <div style={{ ...styles.canvasWrapper, background: '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', color: '#888' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
            <div>3D 渲染不可用</div>
            <div style={{ fontSize: 12, marginTop: 8 }}>WebGL 初始化失败</div>
          </div>
        </div>
        <button type="button" style={styles.exitBtn} onClick={() => setCyclesPreviewOpen(false)}>
          <span>←</span><span>退出渲染</span>
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.canvasWrapper}>
        <ErrorBoundary onError={() => setHasError(true)}>
          <Suspense fallback={<div style={{ background: '#1a1a2e', width: '100%', height: '100%' }} />}>
            <LazyCanvas
              dpr={[1, 2]}
              gl={{ antialias: true, alpha: false }}
              camera={{ position: [30, 20, 30], fov: 45 }}
              onCreated={() => console.log('Canvas created successfully')}
            >
              <color attach="background" args={['#1a1a2e']} />
              <Scene3D
                panels={clipmaskVectors}
                hdrPreset={cyclesHDRPreset as HDRPreset}
                thickness={thickness}
                foldProgress={foldProgress}
                foldSequence={foldSequence}
                rootPanelId={rootPanelId}
                drivenMap={drivenMap}
              />
              <gridHelper args={[100, 20, '#333', '#222']} />
            </LazyCanvas>
          </Suspense>
        </ErrorBoundary>

        <button type="button" style={styles.exitBtn} onClick={() => setCyclesPreviewOpen(false)}>
          <span>←</span><span>退出渲染</span>
        </button>

        <div style={styles.controlBar}>
          <span style={styles.controlLabel}>折叠</span>
          <input type="range" min="0" max="100" value={foldProgress * 100} onChange={(e) => setFoldProgress(Number(e.target.value) / 100)} style={styles.slider} />
          <span style={styles.controlValue}>{Math.round(foldProgress * 100)}%</span>
          <div style={{ width: 1, height: 16, background: SEMANTIC_TOKENS.color.border.default }} />
          <span style={styles.controlLabel}>厚度</span>
          <input type="range" min="1" max="20" value={thickness} onChange={(e) => setThickness(Number(e.target.value))} style={styles.slider} />
          <span style={styles.controlValue}>{thickness}mm</span>
        </div>
      </div>
    </div>
  );
};

export { HDR_PRESETS };
