/**
 * 🎨 CyclesRenderPreview - Cycles 路径追踪渲染预览组件
 * 集成 @genki/craft-renderer 的 HDR 环境和 PBR 材质系统
 */

import React, { Suspense, useCallback, useMemo, useRef, useEffect, useState } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../../store';
import { SEMANTIC_TOKENS } from '@genki/shared-theme';
import type { MarkedLayer } from '../../types/core';
import * as THREE from 'three';
import { OrbitControls as ThreeOrbitControls } from 'three/addons/controls/OrbitControls.js';
import { HDRDomeGround } from '@genki/craft-renderer';
import { NestedGroupFold } from './NestedGroupFold';

// 贴图缓存 - 全局缓存避免重复加载
const textureCache = new Map<string, THREE.Texture>();

// 从 base64 加载贴图的 Hook
const useTextureFromBase64 = (base64?: string): THREE.Texture | null => {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    if (!base64) {
      setTexture(null);
      return;
    }

    // 检查缓存
    const cacheKey = base64.substring(0, 100); // 用前100字符作为key
    if (textureCache.has(cacheKey)) {
      setTexture(textureCache.get(cacheKey)!);
      return;
    }

    const loader = new THREE.TextureLoader();
    const dataUrl = base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`;

    loader.load(
      dataUrl,
      (loadedTexture) => {
        loadedTexture.colorSpace = THREE.SRGBColorSpace;
        loadedTexture.wrapS = THREE.RepeatWrapping;
        loadedTexture.wrapT = THREE.RepeatWrapping;
        textureCache.set(cacheKey, loadedTexture);
        setTexture(loadedTexture);
      },
      undefined,
      (error) => {
        console.warn('Failed to load texture:', error);
        setTexture(null);
      }
    );
  }, [base64]);

  return texture;
};

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

// 工艺类型到 PBR 参数映射
const CRAFT_PBR_MAPPING: Record<string, { roughness: number; metalness: number; clearcoat: number }> = {
  '烫金': { roughness: 0.2, metalness: 1.0, clearcoat: 0.5 },
  '烫银': { roughness: 0.15, metalness: 1.0, clearcoat: 0.6 },
  'UV': { roughness: 0.1, metalness: 0.0, clearcoat: 1.0 },
  '凹凸': { roughness: 0.8, metalness: 0.0, clearcoat: 0 },
  '法线': { roughness: 0.5, metalness: 0.0, clearcoat: 0 },
  '置换': { roughness: 0.6, metalness: 0.0, clearcoat: 0 },
};

export type HDRPreset = typeof HDR_PRESETS[number]['value'];

// HDR Dome 配置 - 使用 drei Environment ground 属性
// height: 环境贴图相机高度, radius: 虚拟世界半径, scale: 投影球体大小
const DEFAULT_HDR_DOME = {
  showBackground: true,
  groundProjection: true,
  domeHeight: 15,       // 相机高度（drei 默认 15）
  domeRadius: 120,      // 虚拟世界半径（drei 默认 60，增大避免边界）
  domeScale: 10000,     // 投影球体大小（增大到 10000 避免穿帮）
};

// 自定义 OrbitControls - 避免 drei 的 URL 问题
const CustomOrbitControls: React.FC = () => {
  const { camera, gl } = useThree();
  const controlsRef = useRef<ThreeOrbitControls | null>(null);

  useEffect(() => {
    controlsRef.current = new ThreeOrbitControls(camera, gl.domElement);
    controlsRef.current.enableDamping = true;
    controlsRef.current.dampingFactor = 0.05;
    return () => { controlsRef.current?.dispose(); };
  }, [camera, gl]);

  useFrame(() => { controlsRef.current?.update(); });
  return null;
};

// 自定义相机设置 - 只在首次挂载时设置，避免视角重置
const CameraSetup: React.FC<{ position: [number, number, number]; fov: number }> = ({ position, fov }) => {
  const { camera } = useThree();
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      camera.position.set(...position);
      (camera as THREE.PerspectiveCamera).fov = fov;
      (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
      initialized.current = true;
    }
  }, [camera, position, fov]);
  return null;
};

// 样式常量 - 全屏 overlay 窗口
const styles = {
  overlay: {
    position: 'fixed' as const,
    inset: 0,
    zIndex: 1000,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    borderBottom: `1px solid ${SEMANTIC_TOKENS.color.border.default}`,
    backgroundColor: SEMANTIC_TOKENS.color.bg.surface,
  },
  title: {
    fontSize: '14px',
    fontWeight: 600,
    color: SEMANTIC_TOKENS.color.text.primary,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: SEMANTIC_TOKENS.color.text.secondary,
    fontSize: '20px',
    cursor: 'pointer',
    padding: '4px 8px',
  },
  content: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
  },
  canvasArea: {
    flex: 1,
    position: 'relative' as const,
  },
  sidebar: {
    width: '280px',
    backgroundColor: SEMANTIC_TOKENS.color.bg.surface,
    borderLeft: `1px solid ${SEMANTIC_TOKENS.color.border.default}`,
    overflowY: 'auto' as const,
    padding: '16px',
  },
};

const controlStyles = {
  section: {
    marginBottom: '16px',
    paddingBottom: '16px',
    borderBottom: `1px solid ${SEMANTIC_TOKENS.color.border.weak}`,
  },
  label: {
    fontSize: '12px',
    color: SEMANTIC_TOKENS.color.text.secondary,
    marginBottom: '6px',
    display: 'block' as const,
  },
  select: {
    width: '100%',
    padding: '8px',
    borderRadius: '6px',
    border: `1px solid ${SEMANTIC_TOKENS.color.border.default}`,
    backgroundColor: SEMANTIC_TOKENS.color.bg.secondary,
    color: SEMANTIC_TOKENS.color.text.primary,
    fontSize: '12px',
  },
};

// 查找两个面板之间的共享边
const findSharedEdgeBetweenPanels = (
  panel1: MarkedLayer,
  panel2: MarkedLayer,
  offsetX: number,
  offsetY: number,
  scale: number
): { type: 'horizontal' | 'vertical'; edgePos: number; overlapStart: number; overlapEnd: number } | null => {
  const TOLERANCE = 10;
  const MIN_OVERLAP = 5;

  const x1 = ((panel1 as any).x ?? panel1.bounds?.x ?? 0) - offsetX;
  const y1 = ((panel1 as any).y ?? panel1.bounds?.y ?? 0) - offsetY;
  const w1 = (panel1 as any).width ?? panel1.bounds?.width ?? 100;
  const h1 = (panel1 as any).height ?? panel1.bounds?.height ?? 50;

  const x2 = ((panel2 as any).x ?? panel2.bounds?.x ?? 0) - offsetX;
  const y2 = ((panel2 as any).y ?? panel2.bounds?.y ?? 0) - offsetY;
  const w2 = (panel2 as any).width ?? panel2.bounds?.width ?? 100;
  const h2 = (panel2 as any).height ?? panel2.bounds?.height ?? 50;

  const getOverlap = (a1: number, a2: number, b1: number, b2: number) => {
    const start = Math.max(a1, b1);
    const end = Math.min(a2, b2);
    if (end - start < MIN_OVERLAP) return null;
    return { start, end };
  };

  // 检查水平共享边 (panel1 下边 ≈ panel2 上边)
  if (Math.abs((y1 + h1) - y2) < TOLERANCE) {
    const overlap = getOverlap(x1, x1 + w1, x2, x2 + w2);
    if (overlap) {
      return {
        type: 'horizontal',
        edgePos: (y1 + h1) * scale,
        overlapStart: overlap.start * scale,
        overlapEnd: overlap.end * scale
      };
    }
  }

  // 检查水平共享边 (panel2 下边 ≈ panel1 上边)
  if (Math.abs((y2 + h2) - y1) < TOLERANCE) {
    const overlap = getOverlap(x1, x1 + w1, x2, x2 + w2);
    if (overlap) {
      return {
        type: 'horizontal',
        edgePos: y1 * scale,
        overlapStart: overlap.start * scale,
        overlapEnd: overlap.end * scale
      };
    }
  }

  // 检查垂直共享边 (panel1 右边 ≈ panel2 左边)
  if (Math.abs((x1 + w1) - x2) < TOLERANCE) {
    const overlap = getOverlap(y1, y1 + h1, y2, y2 + h2);
    if (overlap) {
      return {
        type: 'vertical',
        edgePos: (x1 + w1) * scale,
        overlapStart: overlap.start * scale,
        overlapEnd: overlap.end * scale
      };
    }
  }

  // 检查垂直共享边 (panel2 右边 ≈ panel1 左边)
  if (Math.abs((x2 + w2) - x1) < TOLERANCE) {
    const overlap = getOverlap(y1, y1 + h1, y2, y2 + h2);
    if (overlap) {
      return {
        type: 'vertical',
        edgePos: x1 * scale,
        overlapStart: overlap.start * scale,
        overlapEnd: overlap.end * scale
      };
    }
  }

  return null;
};

// 渲染配置类型
interface RenderConfig {
  intensity: number;
  envMapIntensity: number;
  roughnessMultiplier: number;
  metalnessBoost: number;
  clearcoatBoost: number;
  ambientIntensity: number;
  shadowQuality: 'low' | 'medium' | 'high';
}

// 递归折叠面板组件
interface FoldingPanelGroupProps {
  panelId: string;
  panelMap: Map<string, MarkedLayer>;
  drivenMap: Record<string, string[]>;
  craftLayerMap: Map<string, MarkedLayer[]>;
  thickness: number;
  scale: number;
  offsetX: number;
  offsetY: number;
  foldAngle: number;
  depth: number;
  parentPanel?: MarkedLayer;
  renderConfig: RenderConfig;
  // 新增：父面板的轴心位置（用于链式折叠）
  parentPivot?: [number, number, number];
}

const FoldingPanelGroup: React.FC<FoldingPanelGroupProps> = ({
  panelId, panelMap, drivenMap, craftLayerMap, thickness, scale, offsetX, offsetY, foldAngle, depth, parentPanel, renderConfig, parentPivot
}) => {
  const panel = panelMap.get(panelId);
  if (!panel) return null;

  const children = drivenMap[panelId] || [];
  const craftLayers = craftLayerMap.get(panelId) || [];

  // 原始坐标（未缩放）
  const rawX = ((panel as any).x ?? panel.bounds?.x ?? 0) - offsetX;
  const rawY = ((panel as any).y ?? panel.bounds?.y ?? 0) - offsetY;
  const rawW = (panel as any).width ?? panel.bounds?.width ?? 100;
  const rawH = (panel as any).height ?? panel.bounds?.height ?? 50;

  // 缩放后的坐标
  const posX = rawX * scale;
  const posZ = rawY * scale;
  const width = rawW * scale;
  const height = rawH * scale;

  // 加载面板贴图
  const panelTexture = useTextureFromBase64(panel.pngPreview);

  // 查找工艺贴图
  const normalLayer = craftLayers.find(l =>
    l.craftType === 'NORMAL' || l.crafts?.includes('法线') || l.name.includes('法线')
  );
  const bumpLayer = craftLayers.find(l =>
    l.craftType === 'EMBOSS' || l.crafts?.includes('凹凸') || l.name.includes('凹凸')
  );
  const normalTexture = useTextureFromBase64(normalLayer?.pngPreview);
  const bumpTexture = useTextureFromBase64(bumpLayer?.pngPreview);

  // 颜色和PBR参数
  const colors = ['#4a90d9', '#5ba55b', '#d95b5b', '#d9a55b', '#9b5bd9', '#5bd9d9'];
  const color = colors[depth % colors.length];
  const craftType = panel.crafts?.[0] || panel.craftType;
  const pbrParams = CRAFT_PBR_MAPPING[craftType as string] || { roughness: 0.7, metalness: 0.0, clearcoat: 0 };

  // 面板中心位置
  const centerX = posX + width / 2;
  const centerZ = posZ + height / 2;

  // 根面板不折叠
  if (depth === 0) {
    return (
      <group>
        <mesh position={[centerX, thickness / 2, centerZ]} castShadow receiveShadow>
          <boxGeometry args={[width, thickness, height]} />
          <meshPhysicalMaterial
            map={panelTexture}
            normalMap={normalTexture}
            bumpMap={bumpTexture}
            bumpScale={0.05}
            color={panelTexture ? '#ffffff' : color}
            roughness={pbrParams.roughness * renderConfig.roughnessMultiplier}
            metalness={Math.min(1, pbrParams.metalness + renderConfig.metalnessBoost)}
            clearcoat={Math.min(1, pbrParams.clearcoat + renderConfig.clearcoatBoost)}
            clearcoatRoughness={0.1}
            envMapIntensity={renderConfig.envMapIntensity}
          />
        </mesh>
        {children.map(childId => (
          <FoldingPanelGroup
            key={childId}
            panelId={childId}
            panelMap={panelMap}
            drivenMap={drivenMap}
            craftLayerMap={craftLayerMap}
            thickness={thickness}
            scale={scale}
            offsetX={offsetX}
            offsetY={offsetY}
            foldAngle={foldAngle}
            depth={depth + 1}
            parentPanel={panel}
            renderConfig={renderConfig}
            parentPivot={[0, 0, 0]}
          />
        ))}
      </group>
    );
  }

  // 子面板折叠逻辑
  if (!parentPanel) {
    // 没有父面板，直接渲染
    return (
      <group>
        <mesh position={[centerX, thickness / 2, centerZ]} castShadow receiveShadow>
          <boxGeometry args={[width, thickness, height]} />
          <meshPhysicalMaterial
            map={panelTexture}
            normalMap={normalTexture}
            bumpMap={bumpTexture}
            bumpScale={0.05}
            color={panelTexture ? '#ffffff' : color}
            roughness={pbrParams.roughness * renderConfig.roughnessMultiplier}
            metalness={Math.min(1, pbrParams.metalness + renderConfig.metalnessBoost)}
            clearcoat={Math.min(1, pbrParams.clearcoat + renderConfig.clearcoatBoost)}
            clearcoatRoughness={0.1}
            envMapIntensity={renderConfig.envMapIntensity}
          />
        </mesh>
        {children.map(childId => (
          <FoldingPanelGroup
            key={childId}
            panelId={childId}
            panelMap={panelMap}
            drivenMap={drivenMap}
            craftLayerMap={craftLayerMap}
            thickness={thickness}
            scale={scale}
            offsetX={offsetX}
            offsetY={offsetY}
            foldAngle={foldAngle}
            depth={depth + 1}
            parentPanel={panel}
            renderConfig={renderConfig}
            parentPivot={[0, 0, 0]}
          />
        ))}
      </group>
    );
  }

  // 查找与父面板的共享边
  const sharedEdge = findSharedEdgeBetweenPanels(parentPanel, panel, offsetX, offsetY, scale);

  // 计算折叠变换
  let pivotPosition: [number, number, number] = [0, 0, 0];
  let rotation: [number, number, number] = [0, 0, 0];
  let localMeshPos: [number, number, number] = [centerX, thickness / 2, centerZ];

  // 累积的全局轴心（用于传递给子面板）
  let accumulatedPivot: [number, number, number] = parentPivot || [0, 0, 0];

  if (sharedEdge && foldAngle > 0) {
    const edgeMidpoint = (sharedEdge.overlapStart + sharedEdge.overlapEnd) / 2;

    if (sharedEdge.type === 'vertical') {
      // 垂直共享边 - 绕 Z 轴折叠
      const pivotX = sharedEdge.edgePos;
      const pivotZ = edgeMidpoint;

      // 判断子面板在父面板的左边还是右边
      const parentCenterX = (((parentPanel as any).x ?? parentPanel.bounds?.x ?? 0) - offsetX) * scale +
        ((parentPanel as any).width ?? parentPanel.bounds?.width ?? 100) * scale / 2;
      const isRight = centerX > parentCenterX;

      // 相对于父轴心的局部位置
      const relPivotX = pivotX - accumulatedPivot[0];
      const relPivotZ = pivotZ - accumulatedPivot[2];

      pivotPosition = [relPivotX, 0, relPivotZ];
      rotation = [0, 0, isRight ? -foldAngle : foldAngle];

      // mesh 位置相对于当前 group 的轴心
      localMeshPos = [centerX - pivotX, thickness / 2, centerZ - pivotZ];

      // 更新累积轴心为当前的全局轴心位置
      accumulatedPivot = [pivotX, 0, pivotZ];
    } else {
      // 水平共享边 - 绕 X 轴折叠
      const pivotX = edgeMidpoint;
      const pivotZ = sharedEdge.edgePos;

      // 判断子面板在父面板的上边还是下边
      const parentCenterZ = (((parentPanel as any).y ?? parentPanel.bounds?.y ?? 0) - offsetY) * scale +
        ((parentPanel as any).height ?? parentPanel.bounds?.height ?? 50) * scale / 2;
      const isBelow = centerZ > parentCenterZ;

      // 相对于父轴心的局部位置
      const relPivotX = pivotX - accumulatedPivot[0];
      const relPivotZ = pivotZ - accumulatedPivot[2];

      pivotPosition = [relPivotX, 0, relPivotZ];
      rotation = [isBelow ? foldAngle : -foldAngle, 0, 0];

      // mesh 位置相对于当前 group 的轴心
      localMeshPos = [centerX - pivotX, thickness / 2, centerZ - pivotZ];

      // 更新累积轴心为当前的全局轴心位置
      accumulatedPivot = [pivotX, 0, pivotZ];
    }
  } else {
    // 没有共享边或角度为0，保持平铺
    const relCenterX = centerX - accumulatedPivot[0];
    const relCenterZ = centerZ - accumulatedPivot[2];
    localMeshPos = [relCenterX, thickness / 2, relCenterZ];
  }

  return (
    <group position={pivotPosition} rotation={rotation}>
      <mesh position={localMeshPos} castShadow receiveShadow>
        <boxGeometry args={[width, thickness, height]} />
        <meshPhysicalMaterial
          map={panelTexture}
          normalMap={normalTexture}
          bumpMap={bumpTexture}
          bumpScale={0.05}
          color={panelTexture ? '#ffffff' : color}
          roughness={pbrParams.roughness * renderConfig.roughnessMultiplier}
          metalness={Math.min(1, pbrParams.metalness + renderConfig.metalnessBoost)}
          clearcoat={Math.min(1, pbrParams.clearcoat + renderConfig.clearcoatBoost)}
          clearcoatRoughness={0.1}
          envMapIntensity={renderConfig.envMapIntensity}
        />
      </mesh>
      {children.map(childId => (
        <FoldingPanelGroup
          key={childId}
          panelId={childId}
          panelMap={panelMap}
          drivenMap={drivenMap}
          craftLayerMap={craftLayerMap}
          thickness={thickness}
          scale={scale}
          offsetX={offsetX}
          offsetY={offsetY}
          foldAngle={foldAngle}
          depth={depth + 1}
          parentPanel={panel}
          renderConfig={renderConfig}
          parentPivot={accumulatedPivot}
        />
      ))}
    </group>
  );
};

// 孤立面板网格组件（带贴图支持）
interface OrphanPanelMeshProps {
  panel: MarkedLayer;
  craftLayers: MarkedLayer[];
  thickness: number;
  scale: number;
  offsetX: number;
  offsetY: number;
  centerX: number;
  centerY: number;
  renderConfig: RenderConfig;
}

const OrphanPanelMesh: React.FC<OrphanPanelMeshProps> = ({
  panel, craftLayers, thickness, scale, offsetX, offsetY, centerX, centerY, renderConfig
}) => {
  const x = ((panel as any).x ?? panel.bounds?.x ?? 0) - offsetX;
  const y = ((panel as any).y ?? panel.bounds?.y ?? 0) - offsetY;
  const w = (panel as any).width ?? panel.bounds?.width ?? 100;
  const h = (panel as any).height ?? panel.bounds?.height ?? 50;

  // 计算居中偏移
  const centerOffsetX = (centerX - offsetX) * scale;
  const centerOffsetZ = (centerY - offsetY) * scale;

  const posX = x * scale - centerOffsetX;
  const posZ = y * scale - centerOffsetZ;
  const width = w * scale;
  const height = h * scale;

  // 加载贴图
  const panelTexture = useTextureFromBase64(panel.pngPreview);
  const normalLayer = craftLayers.find(l =>
    l.craftType === 'NORMAL' || l.crafts?.includes('法线') || l.name.includes('法线')
  );
  const bumpLayer = craftLayers.find(l =>
    l.craftType === 'EMBOSS' || l.crafts?.includes('凹凸') || l.name.includes('凹凸')
  );
  const normalTexture = useTextureFromBase64(normalLayer?.pngPreview);
  const bumpTexture = useTextureFromBase64(bumpLayer?.pngPreview);

  const craftType = panel.crafts?.[0] || panel.craftType;
  const pbrParams = CRAFT_PBR_MAPPING[craftType as string] || { roughness: 0.7, metalness: 0.0, clearcoat: 0 };

  return (
    <mesh
      position={[posX + width / 2, thickness / 2, posZ + height / 2]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[width, thickness, height]} />
      <meshPhysicalMaterial
        map={panelTexture}
        normalMap={normalTexture}
        bumpMap={bumpTexture}
        bumpScale={0.05}
        color={panelTexture ? '#ffffff' : '#888888'}
        roughness={pbrParams.roughness * renderConfig.roughnessMultiplier}
        metalness={Math.min(1, pbrParams.metalness + renderConfig.metalnessBoost)}
        clearcoat={Math.min(1, pbrParams.clearcoat + renderConfig.clearcoatBoost)}
        clearcoatRoughness={0.1}
        envMapIntensity={renderConfig.envMapIntensity}
      />
    </mesh>
  );
};

// 工艺标注 3D 网格组件
interface CraftAnnotationMeshProps {
  layer: MarkedLayer;
  index: number;
}

const CraftAnnotationMesh: React.FC<CraftAnnotationMeshProps> = ({ layer, index }) => {
  const craftType = layer.crafts?.[0] || layer.craftType || '凹凸';
  const pbrParams = CRAFT_PBR_MAPPING[craftType] || CRAFT_PBR_MAPPING['凹凸'];

  const position: [number, number, number] = [
    (index % 3 - 1) * 3,
    0.5,
    Math.floor(index / 3) * 3 - 1.5,
  ];

  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={[2, 0.1, 2]} />
      <meshPhysicalMaterial
        roughness={pbrParams.roughness}
        metalness={pbrParams.metalness}
        clearcoat={pbrParams.clearcoat}
        clearcoatRoughness={0.1}
        color={craftType === '烫金' ? '#d4af37' : craftType === '烫银' ? '#c0c0c0' : '#ffffff'}
      />
    </mesh>
  );
};

// 主组件 - 全屏 overlay 窗口
export const CyclesRenderPreview: React.FC = () => {
  const {
    cyclesPreviewOpen,
    cyclesRenderMode,
    cyclesHDRPreset,
    clipmaskVectors,
    markedLayers,
    setCyclesPreviewOpen,
    setCyclesRenderMode,
    setCyclesHDRPreset,
    foldSequence,
    rootPanelId,
    drivenMap,
  } = useAppStore(
    useShallow((s) => ({
      cyclesPreviewOpen: s.cyclesPreviewOpen,
      cyclesRenderMode: s.cyclesRenderMode,
      cyclesHDRPreset: s.cyclesHDRPreset,
      clipmaskVectors: s.clipmaskVectors,
      markedLayers: s.markedLayers,
      setCyclesPreviewOpen: s.setCyclesPreviewOpen,
      setCyclesRenderMode: s.setCyclesRenderMode,
      setCyclesHDRPreset: s.setCyclesHDRPreset,
      foldSequence: s.foldSequence,
      rootPanelId: s.rootPanelId,
      drivenMap: s.drivenMap,
    }))
  );

  const [foldProgress, setFoldProgress] = React.useState(0);
  const [domeHeight, setDomeHeight] = React.useState(DEFAULT_HDR_DOME.domeHeight);
  const [domeRadius, setDomeRadius] = React.useState(DEFAULT_HDR_DOME.domeRadius);
  const [domeScale, setDomeScale] = React.useState(DEFAULT_HDR_DOME.domeScale);

  const handleClose = useCallback(() => {
    setCyclesPreviewOpen(false);
  }, [setCyclesPreviewOpen]);

  if (!cyclesPreviewOpen) return null;

  return (
    <div style={styles.overlay}>
      {/* 头部 */}
      <div style={styles.header}>
        <span style={styles.title}>Cycles Render Preview</span>
        <button style={styles.closeBtn} onClick={handleClose}>×</button>
      </div>

      {/* 内容区 */}
      <div style={styles.content}>
        {/* 3D 画布 */}
        <div style={styles.canvasArea}>
          <Canvas shadows dpr={[1, 2]} gl={{ antialias: true }}>
            <CameraSetup position={[25, 20, 25]} fov={45} />
            <Suspense fallback={null}>
              <CraftScene3D
                panels={clipmaskVectors}
                craftLayers={markedLayers}
                hdrPreset={cyclesHDRPreset as HDRPreset}
                foldProgress={foldProgress}
                foldSequence={foldSequence}
                rootPanelId={rootPanelId}
                drivenMap={drivenMap}
                domeHeight={domeHeight}
                domeRadius={domeRadius}
                domeScale={domeScale}
                renderMode={cyclesRenderMode as 'realtime' | 'pathtracing' | 'hybrid'}
              />
            </Suspense>
            <CustomOrbitControls />
          </Canvas>
        </div>

        {/* 控制面板 */}
        <div style={styles.sidebar}>
          <SidebarControlPanel
            renderMode={cyclesRenderMode}
            hdrPreset={cyclesHDRPreset}
            onRenderModeChange={setCyclesRenderMode}
            onHDRPresetChange={setCyclesHDRPreset}
            panels={clipmaskVectors}
            foldProgress={foldProgress}
            onFoldProgressChange={setFoldProgress}
            domeHeight={domeHeight}
            domeRadius={domeRadius}
            domeScale={domeScale}
            onDomeHeightChange={setDomeHeight}
            onDomeRadiusChange={setDomeRadius}
            onDomeScaleChange={setDomeScale}
          />
        </div>
      </div>
    </div>
  );
};
interface CraftScene3DProps {
  panels: MarkedLayer[];
  craftLayers: MarkedLayer[];
  hdrPreset: HDRPreset;
  foldProgress: number;
  foldSequence: string[];
  rootPanelId: string | null;
  drivenMap: Record<string, string[]>;
  domeHeight: number;
  domeRadius: number;
  domeScale: number;
  renderMode: 'realtime' | 'pathtracing' | 'hybrid';
}

const CraftScene3D: React.FC<CraftScene3DProps> = ({ panels, craftLayers, hdrPreset, foldProgress, foldSequence, rootPanelId, drivenMap, domeHeight, domeRadius, domeScale, renderMode }) => {
  // 🔥 增大缩放比例，让模型在 3D 空间中更大，匹配 HDR 环境球
  // 原来 0.02 太小，Figma 中 1000px 只变成 20 单位，现在变成 100 单位
  const scale = 0.1;
  const thickness = 0.8;

  // 渲染模式配置 - 不同模式有不同的渲染质量参数
  const renderConfig = useMemo(() => {
    switch (renderMode) {
      case 'pathtracing':
        // 路径追踪模式：高质量，增强反射和光照
        return {
          intensity: 1.5,
          envMapIntensity: 1.2,
          roughnessMultiplier: 0.8,  // 降低粗糙度，增加反射
          metalnessBoost: 0.1,
          clearcoatBoost: 0.2,
          ambientIntensity: 0.2,
          shadowQuality: 'high' as const,
        };
      case 'hybrid':
        // 混合模式：中等质量
        return {
          intensity: 1.2,
          envMapIntensity: 1.0,
          roughnessMultiplier: 0.9,
          metalnessBoost: 0.05,
          clearcoatBoost: 0.1,
          ambientIntensity: 0.3,
          shadowQuality: 'medium' as const,
        };
      case 'realtime':
      default:
        // 实时模式：标准质量，优先性能
        return {
          intensity: 1.0,
          envMapIntensity: 0.8,
          roughnessMultiplier: 1.0,
          metalnessBoost: 0,
          clearcoatBoost: 0,
          ambientIntensity: 0.4,
          shadowQuality: 'low' as const,
        };
    }
  }, [renderMode]);

  // 调试日志 - 检查贴图数据
  useEffect(() => {
    console.log('🎨 CraftScene3D - panels:', panels.length);
    console.log('🎨 CraftScene3D - craftLayers:', craftLayers.length);
    console.log('🎨 CraftScene3D - rootPanelId:', rootPanelId);
    console.log('🎨 CraftScene3D - drivenMap:', drivenMap);
    panels.forEach((p, i) => {
      const hasPng = !!p.pngPreview;
      console.log(`  Panel ${i}: ${p.name} - pngPreview: ${hasPng ? 'YES (' + p.pngPreview?.substring(0, 50) + '...)' : 'NO'}`);
    });
  }, [panels, craftLayers, rootPanelId, drivenMap]);

  // 创建面板ID到面板的映射
  const panelMap = useMemo(() => {
    const map = new Map<string, MarkedLayer>();
    panels.forEach(p => { if (p && p.id) map.set(p.id, p); });
    return map;
  }, [panels]);

  // 创建面板ID到工艺图层的映射（基于边界重叠）
  const craftLayerMap = useMemo(() => {
    const map = new Map<string, MarkedLayer[]>();
    panels.forEach(panel => {
      if (!panel || !panel.id) return;
      const pb = panel.bounds || { x: (panel as any).x || 0, y: (panel as any).y || 0, width: (panel as any).width || 100, height: (panel as any).height || 50 };

      // 查找与此面板重叠的工艺图层
      const overlapping = craftLayers.filter(craft => {
        if (!craft || !craft.bounds) return false;
        const cb = craft.bounds;
        // 检查边界重叠
        return !(cb.x + cb.width < pb.x || cb.x > pb.x + pb.width ||
                 cb.y + cb.height < pb.y || cb.y > pb.y + pb.height);
      });
      map.set(panel.id, overlapping);
    });
    return map;
  }, [panels, craftLayers]);

  // 计算边界和整体中心（用于居中到原点）
  const bounds = useMemo(() => {
    if (!panels || panels.length === 0) {
      return { minX: 0, minY: 0, centerX: 0, centerY: 0 };
    }
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
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
    return {
      minX: isFinite(minX) ? minX : 0,
      minY: isFinite(minY) ? minY : 0,
      centerX: isFinite(minX) ? (minX + maxX) / 2 : 0,
      centerY: isFinite(minY) ? (minY + maxY) / 2 : 0,
    };
  }, [panels]);

  // 计算折叠角度 (0-90度)
  const foldAngle = foldProgress * Math.PI / 2;

  // 是否有层级结构
  const hasHierarchy = rootPanelId && Object.keys(drivenMap).length > 0;

  // 收集所有在 drivenMap 中的面板 ID
  const panelsInHierarchy = useMemo(() => {
    const ids = new Set<string>();
    if (rootPanelId) ids.add(rootPanelId);
    Object.keys(drivenMap).forEach(parentId => {
      ids.add(parentId);
      drivenMap[parentId]?.forEach(childId => ids.add(childId));
    });
    return ids;
  }, [rootPanelId, drivenMap]);

  // 不在层级中的面板（独立面板）
  const orphanPanels = useMemo(() => {
    return panels.filter(p => p && p.id && !panelsInHierarchy.has(p.id));
  }, [panels, panelsInHierarchy]);

  return (
    <group>
      {/* HDR 环境和穹顶地面 - 使用 craft-renderer 组件 */}
      <HDRDomeGround
        preset={hdrPreset}
        intensity={renderConfig.intensity}
        showBackground={DEFAULT_HDR_DOME.showBackground}
        groundProjection={DEFAULT_HDR_DOME.groundProjection}
        domeHeight={domeHeight}
        domeRadius={domeRadius}
        domeScale={domeScale}
      />

      {/* 渲染模式特定的补光 */}
      <ambientLight intensity={renderConfig.ambientIntensity} />
      {renderMode === 'pathtracing' && (
        <>
          <directionalLight position={[10, 15, 10]} intensity={0.8} castShadow />
          <directionalLight position={[-10, 10, -10]} intensity={0.4} />
        </>
      )}
      {renderMode === 'hybrid' && (
        <directionalLight position={[5, 10, 5]} intensity={0.5} castShadow />
      )}

      {/* 使用嵌套 Group 方案实现折叠 */}
      {hasHierarchy ? (
        <>
          <NestedGroupFold
            panels={panels}
            drivenMap={drivenMap}
            rootPanelId={rootPanelId}
            foldProgress={foldProgress}
            sequence={foldSequence}
            scale={scale}
            thickness={thickness}
            offsetX={bounds.minX}
            offsetY={bounds.minY}
            centerX={bounds.centerX}
            centerY={bounds.centerY}
            craftLayers={craftLayers}
            renderConfig={renderConfig}
          />
          {/* 渲染不在层级中的独立面板 */}
          {orphanPanels.map((panel) => (
            <OrphanPanelMesh
              key={panel.id}
              panel={panel}
              craftLayers={craftLayerMap.get(panel.id) || []}
              thickness={thickness}
              scale={scale}
              offsetX={bounds.minX}
              offsetY={bounds.minY}
              centerX={bounds.centerX}
              centerY={bounds.centerY}
              renderConfig={renderConfig}
            />
          ))}
        </>
      ) : (
        panels.map((panel, index) => (
          <CraftAnnotationMesh key={panel.id} layer={panel} index={index} />
        ))
      )}
    </group>
  );
};

// 控制面板组件
interface ControlPanelProps {
  renderMode: string;
  hdrPreset: string;
  onRenderModeChange: (mode: 'realtime' | 'pathtracing' | 'hybrid') => void;
  onHDRPresetChange: (preset: string) => void;
  panels: MarkedLayer[];
  foldProgress: number;
  onFoldProgressChange: (progress: number) => void;
  domeHeight: number;
  domeRadius: number;
  domeScale: number;
  onDomeHeightChange: (height: number) => void;
  onDomeRadiusChange: (radius: number) => void;
  onDomeScaleChange: (scale: number) => void;
}

const SidebarControlPanel: React.FC<ControlPanelProps> = ({
  renderMode,
  hdrPreset,
  onRenderModeChange,
  onHDRPresetChange,
  panels,
  foldProgress,
  onFoldProgressChange,
  domeHeight,
  domeRadius,
  domeScale,
  onDomeHeightChange,
  onDomeRadiusChange,
  onDomeScaleChange,
}) => {
  return (
    <div>
      <h4 style={{
        fontSize: '13px',
        fontWeight: 600,
        color: SEMANTIC_TOKENS.color.text.primary,
        marginBottom: '16px'
      }}>
        渲染控制
      </h4>

      {/* 渲染模式 */}
      <div style={controlStyles.section}>
        <label style={controlStyles.label}>渲染模式</label>
        <select
          style={controlStyles.select}
          value={renderMode}
          onChange={(e) => onRenderModeChange(e.target.value as any)}
        >
          {RENDER_MODES.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>

      {/* HDR 环境 */}
      <div style={controlStyles.section}>
        <label style={controlStyles.label}>HDR 环境</label>
        <select
          style={controlStyles.select}
          value={hdrPreset}
          onChange={(e) => onHDRPresetChange(e.target.value)}
        >
          {HDR_PRESETS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </div>

      {/* 相机高度 (height) */}
      <div style={controlStyles.section}>
        <label style={controlStyles.label}>相机高度</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="range"
            min="5"
            max="500"
            step="5"
            value={domeHeight}
            onChange={(e) => onDomeHeightChange(Number(e.target.value))}
            style={{ flex: 1, cursor: 'pointer' }}
          />
          <span style={{ fontSize: '12px', color: SEMANTIC_TOKENS.color.text.primary, minWidth: '40px' }}>
            {domeHeight}
          </span>
        </div>
      </div>

      {/* 世界半径 (radius) */}
      <div style={controlStyles.section}>
        <label style={controlStyles.label}>世界半径</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="range"
            min="60"
            max="5000"
            step="50"
            value={domeRadius}
            onChange={(e) => onDomeRadiusChange(Number(e.target.value))}
            style={{ flex: 1, cursor: 'pointer' }}
          />
          <span style={{ fontSize: '12px', color: SEMANTIC_TOKENS.color.text.primary, minWidth: '40px' }}>
            {domeRadius}
          </span>
        </div>
      </div>

      {/* 球体大小 (scale) */}
      <div style={controlStyles.section}>
        <label style={controlStyles.label}>球体大小</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="range"
            min="1000"
            max="50000"
            step="1000"
            value={domeScale}
            onChange={(e) => onDomeScaleChange(Number(e.target.value))}
            style={{ flex: 1, cursor: 'pointer' }}
          />
          <span style={{ fontSize: '12px', color: SEMANTIC_TOKENS.color.text.primary, minWidth: '40px' }}>
            {domeScale}
          </span>
        </div>
      </div>

      {/* 折叠进度 */}
      <div style={controlStyles.section}>
        <label style={controlStyles.label}>折叠进度</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="range"
            min="0"
            max="100"
            value={foldProgress * 100}
            onChange={(e) => onFoldProgressChange(Number(e.target.value) / 100)}
            style={{ flex: 1, cursor: 'pointer' }}
          />
          <span style={{ fontSize: '12px', color: SEMANTIC_TOKENS.color.text.primary, minWidth: '40px' }}>
            {Math.round(foldProgress * 100)}%
          </span>
        </div>
      </div>

      {/* 刀版图面板列表 */}
      <div style={controlStyles.section}>
        <label style={controlStyles.label}>
          刀版图面板 ({panels.length})
        </label>
        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
          {panels.map((layer) => (
            <CraftLayerItem key={layer.id} layer={layer} />
          ))}
          {panels.length === 0 && (
            <div style={{
              fontSize: '11px',
              color: SEMANTIC_TOKENS.color.text.tertiary,
              padding: '8px 0'
            }}>
              暂无刀版图面板
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// 工艺图层项组件
const CraftLayerItem: React.FC<{ layer: MarkedLayer }> = ({ layer }) => {
  const craftType = layer.crafts?.[0] || layer.craftType || '未知';

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '6px 8px',
      borderRadius: '4px',
      backgroundColor: SEMANTIC_TOKENS.color.bg.secondary,
      marginBottom: '4px',
      fontSize: '11px',
    }}>
      <span style={{
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        backgroundColor: craftType === '烫金' ? '#d4af37' :
                        craftType === '烫银' ? '#c0c0c0' :
                        craftType === 'UV' ? '#00ff88' : '#888',
      }} />
      <span style={{
        flex: 1,
        color: SEMANTIC_TOKENS.color.text.primary,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap' as const,
      }}>
        {layer.name}
      </span>
      <span style={{ color: SEMANTIC_TOKENS.color.text.tertiary }}>
        {craftType}
      </span>
    </div>
  );
};
