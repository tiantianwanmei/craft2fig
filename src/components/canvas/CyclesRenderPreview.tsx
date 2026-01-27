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
import { NestedGroupFold } from './NestedGroupFold';
import { SkinnedMeshBridge } from './SkinnedMeshBridge';
import { usePBRMapsFromCraftLayers, DEFAULT_CRAFT_PBR_CONFIG, type CraftPBRConfig } from '../../hooks/usePBRMapsFromCraftLayers';
import { use3DStore, useWebGPUStore } from '@genki/shared-stores';
import { GroundProjectedEnv } from './GroundProjectedEnv';
import { ContactShadows, Center } from '@react-three/drei';
import { HDRUploaderCompact } from '@genki/hdr-system';

// 贴图缓存 - 全局缓存避免重复加载
const textureCache = new Map<string, THREE.Texture>();

// 生成更可靠的缓存 key（使用长度 + 前后各50字符 + 中间50字符）
function generateCacheKey(base64: string): string {
  const len = base64.length;
  if (len <= 200) return base64;
  const start = base64.substring(0, 50);
  const middle = base64.substring(Math.floor(len / 2) - 25, Math.floor(len / 2) + 25);
  const end = base64.substring(len - 50);
  return `${len}_${start}_${middle}_${end}`;
}

// 从 base64 加载贴图的 Hook
const useTextureFromBase64 = (base64?: string): THREE.Texture | null => {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    if (!base64) {
      setTexture(null);
      return;
    }

    // 检查缓存 - 使用更可靠的 key
    const cacheKey = generateCacheKey(base64);
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

// 几何体模式选项
const GEOMETRY_MODES = [
  { value: 'nested', label: '嵌套Group (当前)' },
  { value: 'skinned', label: 'SkinnedMesh (实验)' },
] as const;

// 工艺类型到 PBR 参数映射（支持中文、英文大写、英文小写）
const CRAFT_PBR_MAPPING: Record<string, { roughness: number; metalness: number; clearcoat: number }> = {
  // 中文
  '烫金': { roughness: 0.2, metalness: 1.0, clearcoat: 0.5 },
  '烫银': { roughness: 0.15, metalness: 1.0, clearcoat: 0.6 },
  'UV': { roughness: 0.1, metalness: 0.0, clearcoat: 1.0 },
  '凹凸': { roughness: 0.8, metalness: 0.0, clearcoat: 0 },
  '法线': { roughness: 0.5, metalness: 0.0, clearcoat: 0 },
  '置换': { roughness: 0.6, metalness: 0.0, clearcoat: 0 },
  '光油': { roughness: 0.1, metalness: 0.0, clearcoat: 1.0 },
  // 英文大写
  'HOTFOIL': { roughness: 0.2, metalness: 1.0, clearcoat: 0.5 },
  'VARNISH': { roughness: 0.15, metalness: 1.0, clearcoat: 0.6 },
  'EMBOSS': { roughness: 0.8, metalness: 0.0, clearcoat: 0 },
  'NORMAL': { roughness: 0.5, metalness: 0.0, clearcoat: 0 },
  'TEXTURE': { roughness: 0.6, metalness: 0.0, clearcoat: 0 },
  'SPOT_UV': { roughness: 0.1, metalness: 0.0, clearcoat: 1.0 },
  'DEBOSS': { roughness: 0.8, metalness: 0.0, clearcoat: 0 },
  'CLIPMASK': { roughness: 0.7, metalness: 0.0, clearcoat: 0 },
  // 英文小写
  'hotfoil': { roughness: 0.2, metalness: 1.0, clearcoat: 0.5 },
  'varnish': { roughness: 0.15, metalness: 1.0, clearcoat: 0.6 },
  'emboss': { roughness: 0.8, metalness: 0.0, clearcoat: 0 },
  'normal': { roughness: 0.5, metalness: 0.0, clearcoat: 0 },
  'uv': { roughness: 0.1, metalness: 0.0, clearcoat: 1.0 },
};

export type HDRPreset = typeof HDR_PRESETS[number]['value'];

const SceneEnvironment: React.FC = () => {
  const { scene, gl, camera } = useThree();
  const hdrTexture = useWebGPUStore((s) => s.hdrTexture);
  const hdrLoaded = useWebGPUStore((s) => s.hdrLoaded);

  const hdr = use3DStore((s) => s.hdr);
  const background = use3DStore((s) => s.background);
  const ground = use3DStore((s) => s.ground);

  const hdrBgRef = useRef<THREE.Mesh | null>(null);

  const backgroundMode = background.mode;
  // 启用 groundProjection 时，<GroundProjectedEnv/> 内部的 <Environment background /> 会负责渲染 HDR 背景
  // 此时再渲染手动背景球会产生叠加（历史上表现为“中间小圆球”）
  // 修复：恢复互斥逻辑，当启用 groundProjection 时，不渲染普通背景球
  const showHDRBackground = backgroundMode === 'hdr' && hdr.showBackground && !hdr.groundProjection && !!hdrTexture;

  useEffect(() => {
    if (showHDRBackground) return;

    if (backgroundMode === 'solid') {
      gl.setClearColor(new THREE.Color(background.solidColor), 1);
      return;
    }

    if (backgroundMode === 'gradient') {
      gl.setClearColor(new THREE.Color(background.gradientBottom), 1);
    }
  }, [backgroundMode, background.gradientBottom, background.solidColor, gl, showHDRBackground]);

  useEffect(() => {
    const previousEnv = scene.environment;

    // 如果未加载 HDR，或不使用 HDR 作为光照，则清空 environment
    if (!hdrLoaded || !hdrTexture || !hdr.useForLighting || !(hdrTexture as any).isTexture) {
      if (scene.environment) scene.environment = null;
      return;
    }

    const pmremGenerator = new THREE.PMREMGenerator(gl);
    pmremGenerator.compileEquirectangularShader();
    const envRT = pmremGenerator.fromEquirectangular(hdrTexture);
    const envMap = envRT.texture;

    scene.environment = envMap;
    if ('environmentIntensity' in scene) {
      (scene as any).environmentIntensity = hdr.intensity;
    }

    return () => {
      scene.environment = previousEnv ?? null;
      envRT.dispose();
      pmremGenerator.dispose();
    };
  }, [gl, hdr.intensity, hdr.useForLighting, hdrLoaded, hdrTexture, scene, hdr.showBackground, hdr.groundProjection, hdr.domeHeight, hdr.domeRadius, backgroundMode]);

  const shouldRenderHDRGround = backgroundMode === 'hdr' && hdr.groundProjection && !!hdrTexture && hdr.showBackground;

  useFrame(() => {
    if (!hdrBgRef.current) return;
    const persp = camera as THREE.PerspectiveCamera;
    hdrBgRef.current.position.copy(camera.position);
    const safeFar = Number.isFinite(persp.far) ? persp.far : 5000;
    const s = Math.max(50000, safeFar * 2);
    // 修复：保持 x 轴翻转 (-s)，否则贴图是反的，且可能导致看到球体外部
    hdrBgRef.current.scale.set(-s, s, s);
  });

  return (
    <>
      {showHDRBackground && hdrTexture && (
        <mesh
          ref={hdrBgRef}
          scale={[-1, 1, 1]}
          key={`hdr-bg-${hdrTexture.uuid || 'none'}-${hdr.showBackground ? 1 : 0}-${ground.offsetY || 0}`}
        >
          <sphereGeometry args={[1, 64, 32]} />
          <meshBasicMaterial map={hdrTexture} side={THREE.BackSide} toneMapped={false} />
        </mesh>
      )}

      {shouldRenderHDRGround && (
        <GroundProjectedEnv
          key={`${hdr.domeHeight}-${hdr.domeRadius}-${hdrTexture?.uuid || 'none'}`}
          texture={hdrTexture}
          height={hdr.domeHeight}
          radius={hdr.domeRadius}
          scale={20000}
          exposure={hdr.intensity}
        />
      )}

      {ground.visible && (
        <>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, ground.offsetY || 0, 0]} receiveShadow>
            <planeGeometry args={[500, 500]} />
            <meshStandardMaterial
              color={ground.color}
              metalness={Math.min(1, Math.max(0, ground.reflectivity))}
              roughness={1 - Math.min(1, Math.max(0, ground.reflectivity))}
              transparent={ground.opacity < 1}
              opacity={ground.opacity}
            />
          </mesh>
          <ContactShadows
            position={[0, (ground.offsetY || 0) + 0.001, 0]}
            scale={300}
            blur={2}
            far={50}
            opacity={0.35 * ground.opacity}
            frames={1}
          />
        </>
      )}
    </>
  );
};

// 自定义 OrbitControls - 避免 drei 的 URL 问题
const CustomOrbitControls: React.FC = () => {
  const { camera, gl } = useThree();
  const controlsRef = useRef<ThreeOrbitControls | null>(null);
  const groundOffsetY = use3DStore((s) => s.ground.offsetY || 0);

  useEffect(() => {
    controlsRef.current = new ThreeOrbitControls(camera, gl.domElement);
    controlsRef.current.enableDamping = true;
    controlsRef.current.dampingFactor = 0.1;
    controlsRef.current.minDistance = 1;
    controlsRef.current.maxDistance = 50000;
    controlsRef.current.enableRotate = true;
    controlsRef.current.enableZoom = true;
    controlsRef.current.enablePan = true;
    controlsRef.current.target.set(0, groundOffsetY, 0);
    camera.lookAt(0, groundOffsetY, 0);
    return () => { controlsRef.current?.dispose(); };
  }, [camera, gl]);

  useEffect(() => {
    if (!controlsRef.current) return;
    controlsRef.current.target.set(0, groundOffsetY, 0);
    controlsRef.current.update();
  }, [groundOffsetY]);

  useFrame(() => {
    if (!controlsRef.current) return;
    controlsRef.current.update();
  });
  return null;
};

// 自定义相机设置 - 只在首次挂载时设置，避免视角重置
const CameraSetup: React.FC = () => {
  const { camera } = useThree();
  const groundOffsetY = use3DStore((s) => s.ground.offsetY || 0);
  const { position, target, fov } = use3DStore((s) => s.camera);
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      camera.position.set(...position);
      camera.lookAt(target[0], (target[1] || 0) + groundOffsetY, target[2]);
      const persp = camera as THREE.PerspectiveCamera;
      persp.fov = fov;
      persp.near = 0.1;
      persp.far = 100000;
      persp.updateProjectionMatrix();
      initialized.current = true;
    }
  }, [camera, position, target, fov, groundOffsetY]);
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
            side={THREE.DoubleSide}
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
          side={THREE.DoubleSide}
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
  renderConfig: RenderConfig;
}

const OrphanPanelMesh: React.FC<OrphanPanelMeshProps> = ({
  panel, craftLayers, thickness, scale, offsetX, offsetY, renderConfig
}) => {
  const x = ((panel as any).x ?? panel.bounds?.x ?? 0) - offsetX;
  const y = ((panel as any).y ?? panel.bounds?.y ?? 0) - offsetY;
  const w = (panel as any).width ?? panel.bounds?.width ?? 100;
  const h = (panel as any).height ?? panel.bounds?.height ?? 50;

  const posX = x * scale;
  const posZ = y * scale;
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
        side={THREE.DoubleSide}
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
        side={THREE.DoubleSide}
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
    clipmaskVectors,
    markedLayers,
    setCyclesPreviewOpen,
    setCyclesRenderMode,
    foldSequence,
    rootPanelId,
    drivenMap,
  } = useAppStore(
    useShallow((s) => ({
      cyclesPreviewOpen: s.cyclesPreviewOpen,
      cyclesRenderMode: s.cyclesRenderMode,
      clipmaskVectors: s.clipmaskVectors,
      markedLayers: s.markedLayers,
      setCyclesPreviewOpen: s.setCyclesPreviewOpen,
      setCyclesRenderMode: s.setCyclesRenderMode,
      foldSequence: s.foldSequence,
      rootPanelId: s.rootPanelId,
      drivenMap: s.drivenMap,
    }))
  );

  const [foldProgress, setFoldProgress] = React.useState(0);
  const [geometryMode, setGeometryMode] = React.useState<'nested' | 'skinned'>('skinned');
  const [showSkeleton, setShowSkeleton] = React.useState(false);
  const [showWireframe, setShowWireframe] = React.useState(false);
  const [foldEdgeWidth, setFoldEdgeWidth] = React.useState(2);
  const groundOffsetY = use3DStore((s) => s.ground.offsetY || 0);

  // PBR 参数（此视图不提供调参面板，避免污染主 3D 视图）
  const pbrConfig: CraftPBRConfig = DEFAULT_CRAFT_PBR_CONFIG;

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
            <Suspense fallback={<div style={{ color: 'white' }}>加载 3D 场景中...</div>}>
              <CameraSetup />
              <Suspense fallback={null}>
                <group position={[0, groundOffsetY, 0]}>
                  <CraftScene3D
                    panels={clipmaskVectors}
                    craftLayers={markedLayers}
                    foldProgress={foldProgress}
                    foldSequence={foldSequence}
                    rootPanelId={rootPanelId}
                    drivenMap={drivenMap}
                    renderMode={cyclesRenderMode as 'realtime' | 'pathtracing' | 'hybrid'}
                    geometryMode={geometryMode}
                    showSkeleton={showSkeleton}
                    showWireframe={showWireframe}
                    foldEdgeWidth={foldEdgeWidth}
                    pbrConfig={pbrConfig}
                  />
                </group>
              </Suspense>
            </Suspense>
            <CustomOrbitControls />
          </Canvas>
        </div>

        {/* 控制面板 */}
        <div style={styles.sidebar}>
          <SidebarControlPanel
            renderMode={cyclesRenderMode}
            onRenderModeChange={setCyclesRenderMode}
            panels={clipmaskVectors}
            foldProgress={foldProgress}
            onFoldProgressChange={setFoldProgress}

            geometryMode={geometryMode}
            onGeometryModeChange={setGeometryMode}
            showSkeleton={showSkeleton}
            onShowSkeletonChange={setShowSkeleton}
            showWireframe={showWireframe}
            onShowWireframeChange={setShowWireframe}
            foldEdgeWidth={foldEdgeWidth}
            onFoldEdgeWidthChange={setFoldEdgeWidth}
          />
        </div>
      </div>
    </div>
  );
};
interface CraftScene3DProps {
  panels: MarkedLayer[];
  craftLayers: MarkedLayer[];
  foldProgress: number;
  foldSequence: string[];
  rootPanelId: string | null;
  drivenMap: Record<string, string[]>;
  renderMode: 'realtime' | 'pathtracing' | 'hybrid';
  geometryMode: 'nested' | 'skinned';
  showSkeleton: boolean;
  showWireframe: boolean;
  foldEdgeWidth: number;
  pbrConfig: CraftPBRConfig;
}

const CraftScene3D: React.FC<CraftScene3DProps> = ({ panels, craftLayers, foldProgress, foldSequence, rootPanelId, drivenMap, renderMode, geometryMode, showSkeleton, showWireframe, foldEdgeWidth, pbrConfig }) => {
  // 🔥 提升模型缩放，避免相对 HDR 过小导致视角难调
  const scale = 1.0;
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
      return { minX: 0, minY: 0, maxX: 0, maxY: 0, centerX: 0, centerY: 0, width: 0, height: 0 };
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
      maxX: isFinite(maxX) ? maxX : 0,
      maxY: isFinite(maxY) ? maxY : 0,
      centerX: isFinite(minX) ? (minX + maxX) / 2 : 0,
      centerY: isFinite(minY) ? (minY + maxY) / 2 : 0,
      width: isFinite(maxX) ? maxX - minX : 0,
      height: isFinite(maxY) ? maxY - minY : 0,
    };
  }, [panels]);

  // 生成 PBR 贴图（从工艺层）
  const pbrMaps = usePBRMapsFromCraftLayers({
    craftLayers,
    width: bounds.width,
    height: bounds.height,
    enabled: renderMode === 'pathtracing' || renderMode === 'hybrid',
    pbrConfig,
  });

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
    <group position={[0, 0, 0]}>
      <SceneEnvironment />

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
      <Center>
        {hasHierarchy ? (
          <>
            {geometryMode === 'skinned' ? (
              <group position={[0, 0, 0]} frustumCulled={false}>
                <SkinnedMeshBridge
                  panels={panels}
                  drivenMap={drivenMap}
                  rootPanelId={rootPanelId}
                  foldProgress={foldProgress}
                  foldSequence={foldSequence}
                  jointWidth={foldEdgeWidth}
                  scale={scale}
                  thickness={thickness}
                  offsetX={0}
                  offsetY={0}
                  centerX={0}
                  centerY={0}
                  craftLayers={craftLayers}
                  renderConfig={renderConfig}
                  showSkeleton={showSkeleton}
                  showWireframe={showWireframe}
                  pbrConfig={pbrConfig}
                />
              </group>
            ) : (
              <group position={[0, 0, 0]} frustumCulled={false}>
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
                  centerX={bounds.minX}
                  centerY={bounds.minY}
                  craftLayers={craftLayers}
                  renderConfig={renderConfig}
                  pbrMaps={pbrMaps}
                />
              </group>
            )}
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
                renderConfig={renderConfig}
              />
            ))}
          </>
        ) : (
          panels.map((panel, index) => (
            <CraftAnnotationMesh key={panel.id} layer={panel} index={index} />
          ))
        )}
      </Center>
    </group>
  );
};

// 控制面板组件
interface ControlPanelProps {
  renderMode: string;
  onRenderModeChange: (mode: 'realtime' | 'pathtracing' | 'hybrid') => void;
  panels: MarkedLayer[];
  foldProgress: number;
  onFoldProgressChange: (progress: number) => void;
  geometryMode: 'nested' | 'skinned';
  onGeometryModeChange: (mode: 'nested' | 'skinned') => void;
  showSkeleton: boolean;
  onShowSkeletonChange: (show: boolean) => void;
  showWireframe: boolean;
  onShowWireframeChange: (show: boolean) => void;
  foldEdgeWidth: number;
  onFoldEdgeWidthChange: (width: number) => void;
}

const SidebarControlPanel: React.FC<ControlPanelProps> = ({
  renderMode,
  onRenderModeChange,
  panels,
  foldProgress,
  onFoldProgressChange,
  geometryMode,
  onGeometryModeChange,
  showSkeleton,
  onShowSkeletonChange,
  showWireframe,
  onShowWireframeChange,
  foldEdgeWidth,
  onFoldEdgeWidthChange,
}) => {
  const [tab, setTab] = React.useState<'settings' | 'hdr' | 'layers'>('settings');

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

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {(['settings', 'hdr', 'layers'] as const).map((key) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              flex: 1,
              padding: '8px 10px',
              borderRadius: 8,
              border: `1px solid ${tab === key ? SEMANTIC_TOKENS.color.border.default : SEMANTIC_TOKENS.color.border.weak}`,
              background: tab === key ? SEMANTIC_TOKENS.color.bg.interactive.default : SEMANTIC_TOKENS.color.bg.secondary,
              color: SEMANTIC_TOKENS.color.text.primary,
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            {key === 'settings' ? '设置' : key === 'hdr' ? 'HDR' : '图层'}
          </button>
        ))}
      </div>

      {tab === 'settings' && (
        <>
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

          {/* 几何体模式 */}
          <div style={controlStyles.section}>
            <label style={controlStyles.label}>几何体模式</label>
            <select
              style={controlStyles.select}
              value={geometryMode}
              onChange={(e) => onGeometryModeChange(e.target.value as 'nested' | 'skinned')}
            >
              {GEOMETRY_MODES.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          {/* SkinnedMesh 调试选项 */}
          {geometryMode === 'skinned' && (
            <div style={controlStyles.section}>
              <label style={controlStyles.label}>调试选项</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: SEMANTIC_TOKENS.color.text.primary }}>
                  <input
                    type="checkbox"
                    checked={showSkeleton}
                    onChange={(e) => onShowSkeletonChange(e.target.checked)}
                  />
                  显示骨骼
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: SEMANTIC_TOKENS.color.text.primary }}>
                  <input
                    type="checkbox"
                    checked={showWireframe}
                    onChange={(e) => onShowWireframeChange(e.target.checked)}
                  />
                  显示线框
                </label>
              </div>
            </div>
          )}

          {/* 折叠边宽度 */}
          <div style={controlStyles.section}>
            <label style={controlStyles.label}>折叠边宽度</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="range"
                min="0"
                max="20"
                step="1"
                value={foldEdgeWidth}
                onChange={(e) => onFoldEdgeWidthChange(Number(e.target.value))}
                style={{ flex: 1, cursor: 'pointer' }}
              />
              <span style={{ fontSize: '12px', color: SEMANTIC_TOKENS.color.text.primary, minWidth: '40px' }}>
                {foldEdgeWidth}
              </span>
            </div>
            {geometryMode !== 'skinned' && (
              <div style={{ fontSize: '11px', color: SEMANTIC_TOKENS.color.text.tertiary, marginTop: '6px' }}>
                仅 SkinnedMesh 模式生效
              </div>
            )}
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
        </>
      )}

      {tab === 'hdr' && (
        <HDRSettingsInline />
      )}

      {tab === 'layers' && (
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
      )}
    </div>
  );
};

const hdrSectionStyles = {
  section: { marginBottom: '16px' },
  labelRow: { display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#ccc', marginBottom: '6px' },
  select: {
    width: '100%',
    padding: '8px 10px',
    borderRadius: '6px',
    border: '1px solid #444',
    background: '#111',
    color: '#fff',
    fontSize: '12px',
  },
};

const HDRSettingsInline: React.FC = () => {
  const envPreset = useWebGPUStore((s) => s.envPreset);
  const setEnvPreset = useWebGPUStore((s) => s.setEnvPreset);
  const hdrLoaded = useWebGPUStore((s) => s.hdrLoaded);
  const hdrName = useWebGPUStore((s) => s.hdrName);
  const hdr = use3DStore((s) => s.hdr);
  const setHDR = use3DStore((s) => s.setHDR);
  const backgroundMode = use3DStore((s) => s.background.mode);
  const background = use3DStore((s) => s.background);
  const setBackground = use3DStore((s) => s.setBackground);
  const ground = use3DStore((s) => s.ground);
  const setGround = use3DStore((s) => s.setGround);

  return (
    <div>
      <div style={{ ...hdrSectionStyles.section }}>
        <div style={hdrSectionStyles.labelRow}>
          <span>预设环境</span>
          <span style={{ color: '#6ee7b7' }}>{hdrLoaded ? (hdrName || 'HDR 已加载') : ''}</span>
        </div>
        <select
          style={hdrSectionStyles.select}
          value={envPreset}
          onChange={(e) => setEnvPreset(e.target.value)}
        >
          {HDR_PRESETS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </div>

      <div style={{ ...hdrSectionStyles.section, marginTop: 8 }}>
        <div style={{ fontSize: '12px', color: '#bbb', marginBottom: 6 }}>上传 HDR/EXR</div>
        <HDRUploaderCompact />
        {!hdrLoaded && (
          <div style={{ fontSize: '11px', color: '#888', marginTop: 4 }}>
            未加载 HDR 时，穹顶投影不会显示。
          </div>
        )}
      </div>

      <div style={{ ...hdrSectionStyles.section, borderTop: '1px solid #222', paddingTop: 12 }}>
        <div style={{ fontSize: '12px', color: '#bbb', marginBottom: 8 }}>PolyDome</div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '12px', color: '#eee', marginBottom: 6 }}>
          <input
            type="checkbox"
            checked={hdr.groundProjection}
            onChange={(e) => {
              const checked = e.target.checked;
              setHDR({ groundProjection: checked });
              if (checked) setBackground({ mode: 'hdr' });
            }}
          />
          启用穹顶投影
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '12px', color: '#eee', marginBottom: 6 }}>
          <input
            type="checkbox"
            checked={hdr.showBackground}
            onChange={(e) => {
              const checked = e.target.checked;
              setHDR({ showBackground: checked });
              if (checked) setBackground({ mode: 'hdr' });
            }}
          />
          显示 HDR 背景
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '12px', color: '#eee', marginBottom: 6 }}>
          <input
            type="checkbox"
            checked={hdr.useForLighting}
            onChange={(e) => setHDR({ useForLighting: e.target.checked })}
          />
          使用 HDR 作为光照
        </label>

        <div style={{ marginTop: 8 }}>
          <div style={hdrSectionStyles.labelRow}>
            <span>光照强度</span>
            <span style={{ color: '#6ee7b7' }}>{hdr.intensity.toFixed(2)}</span>
          </div>
          <input
            className="w-full"
            type="range"
            min={0}
            max={3}
            step={0.01}
            value={hdr.intensity}
            onChange={(e) => setHDR({ intensity: parseFloat(e.target.value) })}
          />
        </div>

        {hdr.groundProjection && (
          <>
            <div style={{ marginTop: 10 }}>
              <div style={hdrSectionStyles.labelRow}>
                <span>穹顶高度</span>
                <span style={{ color: '#6ee7b7' }}>{hdr.domeHeight.toFixed(0)}</span>
              </div>
              <input
                className="w-full"
                type="range"
                min={10}
                max={3000}
                step={10}
                value={hdr.domeHeight}
                onChange={(e) => setHDR({ domeHeight: parseFloat(e.target.value) })}
              />
            </div>

            <div style={{ marginTop: 10 }}>
              <div style={hdrSectionStyles.labelRow}>
                <span>穹顶半径</span>
                <span style={{ color: '#6ee7b7' }}>{hdr.domeRadius.toFixed(0)}</span>
              </div>
              <input
                className="w-full"
                type="range"
                min={1000}
                max={50000}
                step={100}
                value={hdr.domeRadius}
                onChange={(e) => setHDR({ domeRadius: parseFloat(e.target.value) })}
              />
            </div>
          </>
        )}
      </div>

      <div style={{ ...hdrSectionStyles.section, borderTop: '1px solid #222', paddingTop: 12 }}>
        <div style={{ fontSize: '12px', color: '#bbb', marginBottom: 8 }}>背景模式</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['solid', 'gradient', 'hdr'] as const).map((mode) => (
            <button
              key={mode}
              style={{
                flex: 1,
                padding: '6px 8px',
                borderRadius: 6,
                border: `1px solid ${backgroundMode === mode ? '#6ee7b7' : '#444'}`,
                background: backgroundMode === mode ? '#0f172a' : '#111',
                color: '#fff',
                fontSize: '12px',
                cursor: 'pointer',
              }}
              onClick={() => setBackground({ mode })}
            >
              {mode === 'solid' ? '纯色' : mode === 'gradient' ? '渐变' : 'HDR'}
            </button>
          ))}
        </div>

        {backgroundMode === 'solid' && (
          <div style={{ marginTop: 10 }}>
            <div style={hdrSectionStyles.labelRow}>
              <span>纯色背景</span>
              <span style={{ color: background.solidColor }}>{background.solidColor}</span>
            </div>
            <input
              className="w-full"
              type="color"
              value={background.solidColor}
              onChange={(e) => setBackground({ solidColor: e.target.value })}
            />
          </div>
        )}

        {backgroundMode === 'gradient' && (
          <div style={{ marginTop: 10 }}>
            <div style={hdrSectionStyles.labelRow}>
              <span>顶部</span>
              <span style={{ color: background.gradientTop }}>{background.gradientTop}</span>
            </div>
            <input
              className="w-full"
              type="color"
              value={background.gradientTop}
              onChange={(e) => setBackground({ gradientTop: e.target.value })}
            />
            <div style={{ ...hdrSectionStyles.labelRow, marginTop: 6 }}>
              <span>底部</span>
              <span style={{ color: background.gradientBottom }}>{background.gradientBottom}</span>
            </div>
            <input
              className="w-full"
              type="color"
              value={background.gradientBottom}
              onChange={(e) => setBackground({ gradientBottom: e.target.value })}
            />
          </div>
        )}
      </div>

      <div style={{ ...hdrSectionStyles.section, borderTop: '1px solid #222', paddingTop: 12 }}>
        <div style={{ fontSize: '12px', color: '#bbb', marginBottom: 8 }}>Ground</div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '12px', color: '#eee' }}>
          <input
            type="checkbox"
            checked={ground.visible}
            onChange={(e) => setGround({ visible: e.target.checked })}
          />
          显示地面
        </label>
        <div style={{ marginTop: 8 }}>
          <div style={hdrSectionStyles.labelRow}>
            <span>地面高度 (贴地)</span>
            <span style={{ color: '#6ee7b7' }}>{ground.offsetY?.toFixed(0) ?? 0}</span>
          </div>
          <input
            className="w-full"
            type="range"
            min={-200}
            max={200}
            step={1}
            value={ground.offsetY ?? 0}
            onChange={(e) => setGround({ offsetY: Number(e.target.value) })}
          />
        </div>
        <div style={{ marginTop: 8 }}>
          <div style={hdrSectionStyles.labelRow}>
            <span>地面反射</span>
            <span style={{ color: '#6ee7b7' }}>{ground.reflectivity.toFixed(2)}</span>
          </div>
          <input
            className="w-full"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={ground.reflectivity}
            onChange={(e) => setGround({ reflectivity: Number(e.target.value) })}
          />
        </div>
        <div style={{ marginTop: 8 }}>
          <div style={hdrSectionStyles.labelRow}>
            <span>地面不透明度</span>
            <span style={{ color: '#6ee7b7' }}>{ground.opacity.toFixed(2)}</span>
          </div>
          <input
            className="w-full"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={ground.opacity}
            onChange={(e) => setGround({ opacity: Number(e.target.value) })}
          />
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


