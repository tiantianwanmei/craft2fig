/**
 * 🎯 NestedGroupFold - 嵌套 Group 折叠组件
 *
 * 基于 2026-01-23 项目的成功方案：
 * - 使用嵌套 <group> 结构实现正确的链式折叠
 * - 外层 group: position = 折叠边位置
 * - 内层 group: pivotOffset = 面板中心到折叠边的偏移
 * - 使用 Quaternion 实现旋转
 */

import React, { useMemo, useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { MarkedLayer } from '../../types/core';

// 贴图缓存 - 全局缓存避免重复加载
const textureCache = new Map<string, THREE.Texture>();
// shapeMask 专用缓存（不同的翻转设置）
const shapeMaskCache = new Map<string, THREE.Texture>();

// 从 base64 加载贴图的 Hook（用于印刷面贴图，X翻转，Y不翻转）
const useTextureFromBase64 = (base64?: string): THREE.Texture | null => {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    if (!base64) {
      setTexture(null);
      return;
    }

    // 检查缓存
    const cacheKey = base64.substring(0, 100);
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
        loadedTexture.wrapT = THREE.ClampToEdgeWrapping;
        // X 轴翻转（水平镜像）
        loadedTexture.repeat.x = -1;
        loadedTexture.offset.x = 1;
        // Y 轴不翻转
        loadedTexture.flipY = false;
        loadedTexture.needsUpdate = true;
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

// 从 base64 加载 shapeMask 的 Hook（用于外表面遮罩，不翻转X，Y翻转以匹配外表面方向）
const useShapeMaskFromBase64 = (base64?: string): THREE.Texture | null => {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    if (!base64) {
      setTexture(null);
      return;
    }

    // 检查缓存
    const cacheKey = 'mask_' + base64.substring(0, 100);
    if (shapeMaskCache.has(cacheKey)) {
      setTexture(shapeMaskCache.get(cacheKey)!);
      return;
    }

    const loader = new THREE.TextureLoader();
    const dataUrl = base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`;

    loader.load(
      dataUrl,
      (loadedTexture) => {
        loadedTexture.colorSpace = THREE.SRGBColorSpace;
        // shapeMask 不需要 X 翻转，因为外表面不是镜像的
        loadedTexture.wrapS = THREE.ClampToEdgeWrapping;
        loadedTexture.wrapT = THREE.ClampToEdgeWrapping;
        // Y 轴翻转以匹配外表面方向
        loadedTexture.flipY = true;
        loadedTexture.needsUpdate = true;
        shapeMaskCache.set(cacheKey, loadedTexture);
        setTexture(loadedTexture);
      },
      undefined,
      (error) => {
        console.warn('Failed to load shapeMask:', error);
        setTexture(null);
      }
    );
  }, [base64]);

  return texture;
};

// 面板数据接口
interface PanelData {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  pngPreview?: string;  // base64 贴图数据
  normalPreview?: string;  // 法线贴图
  bumpPreview?: string;  // 凹凸贴图
  craftType?: string;  // 工艺类型
  shapeMask?: string;  // 面板外轮廓遮罩（用于外表面透明裁剪）
}

// 折叠边数据
interface FoldEdge {
  type: 'horizontal' | 'vertical';
  position: number;
  start: number;
  end: number;
  parentId: string;
  childId: string;
}

// 3D节点数据
interface Node3D {
  id: string;
  panel: PanelData;
  // 折叠边位置（group position）
  foldEdgePos: THREE.Vector3;
  // 枢轴偏移（面板中心相对于折叠边）
  pivotOffset: THREE.Vector3;
  // 旋转轴
  rotationAxis: THREE.Vector3;
  // 折叠方向（1 或 -1）
  foldDirection: number;
  // 子节点
  children: Node3D[];
  // 分步折叠参数
  foldStartProgress: number;  // 开始折叠的全局进度 (0-1)
  foldEndProgress: number;    // 结束折叠的全局进度 (0-1)
}

// 工艺 PBR 参数映射
const CRAFT_PBR_MAPPING: Record<string, { roughness: number; metalness: number; clearcoat: number }> = {
  '烫金': { roughness: 0.2, metalness: 1.0, clearcoat: 0.5 },
  '烫银': { roughness: 0.15, metalness: 1.0, clearcoat: 0.6 },
  'UV': { roughness: 0.1, metalness: 0.0, clearcoat: 1.0 },
  '压凹': { roughness: 0.8, metalness: 0.0, clearcoat: 0 },
  '压凸': { roughness: 0.8, metalness: 0.0, clearcoat: 0 },
  '法线': { roughness: 0.7, metalness: 0.0, clearcoat: 0 },
  'CLIPMASK': { roughness: 0.7, metalness: 0.0, clearcoat: 0 },
};

// 渲染配置接口
interface RenderConfig {
  roughnessMultiplier: number;
  metalnessBoost: number;
  clearcoatBoost: number;
  envMapIntensity: number;
}

// 默认渲染配置
const DEFAULT_RENDER_CONFIG: RenderConfig = {
  roughnessMultiplier: 1.0,
  metalnessBoost: 0,
  clearcoatBoost: 0,
  envMapIntensity: 1.0,
};

interface NestedGroupFoldProps {
  panels: MarkedLayer[];
  drivenMap: Record<string, string[]>;
  rootPanelId: string | null;
  foldProgress: number;
  sequence?: string[];  // 折叠顺序数组
  scale?: number;
  thickness?: number;
  offsetX: number;
  offsetY: number;
  centerX?: number;  // 整体中心 X（用于居中到原点）
  centerY?: number;  // 整体中心 Y（用于居中到原点）
  craftLayers?: MarkedLayer[];  // 工艺图层
  renderConfig?: RenderConfig;  // 渲染配置
}

/**
 * 检测两个面板之间的共享边
 * 增加容差值以处理浮点精度问题
 */
function detectSharedEdge(
  panel1: PanelData,
  panel2: PanelData,
  tolerance: number = 10  // 增加容差值从 2 到 10
): FoldEdge | null {
  const p1 = { x: panel1.x, y: panel1.y, w: panel1.width, h: panel1.height };
  const p2 = { x: panel2.x, y: panel2.y, w: panel2.width, h: panel2.height };

  // panel1 下边 ≈ panel2 上边
  if (Math.abs((p1.y + p1.h) - p2.y) < tolerance) {
    const overlapStart = Math.max(p1.x, p2.x);
    const overlapEnd = Math.min(p1.x + p1.w, p2.x + p2.w);
    if (overlapEnd - overlapStart > tolerance) {
      return {
        type: 'horizontal',
        position: p1.y + p1.h,
        start: overlapStart,
        end: overlapEnd,
        parentId: panel1.id,
        childId: panel2.id,
      };
    }
  }

  // panel2 下边 ≈ panel1 上边
  if (Math.abs((p2.y + p2.h) - p1.y) < tolerance) {
    const overlapStart = Math.max(p1.x, p2.x);
    const overlapEnd = Math.min(p1.x + p1.w, p2.x + p2.w);
    if (overlapEnd - overlapStart > tolerance) {
      return {
        type: 'horizontal',
        position: p1.y,
        start: overlapStart,
        end: overlapEnd,
        parentId: panel2.id,
        childId: panel1.id,
      };
    }
  }

  // panel1 右边 ≈ panel2 左边
  if (Math.abs((p1.x + p1.w) - p2.x) < tolerance) {
    const overlapStart = Math.max(p1.y, p2.y);
    const overlapEnd = Math.min(p1.y + p1.h, p2.y + p2.h);
    if (overlapEnd - overlapStart > tolerance) {
      return {
        type: 'vertical',
        position: p1.x + p1.w,
        start: overlapStart,
        end: overlapEnd,
        parentId: panel1.id,
        childId: panel2.id,
      };
    }
  }

  // panel2 右边 ≈ panel1 左边
  if (Math.abs((p2.x + p2.w) - p1.x) < tolerance) {
    const overlapStart = Math.max(p1.y, p2.y);
    const overlapEnd = Math.min(p1.y + p1.h, p2.y + p2.h);
    if (overlapEnd - overlapStart > tolerance) {
      return {
        type: 'vertical',
        position: p1.x,
        start: overlapStart,
        end: overlapEnd,
        parentId: panel2.id,
        childId: panel1.id,
      };
    }
  }

  return null;
}

/**
 * 计算面板的局部折叠进度
 * 根据全局进度和面板的折叠时间段计算
 */
function calculateLocalProgress(
  globalProgress: number,
  startProgress: number,
  endProgress: number
): number {
  if (globalProgress <= startProgress) return 0;
  if (globalProgress >= endProgress) return 1;
  return (globalProgress - startProgress) / (endProgress - startProgress);
}

/**
 * 根面板网格组件 - 支持贴图和工艺
 * 贴图在底面（折叠后朝内），顶面为纯色（折叠后朝外）
 */
const RootPanelMesh: React.FC<{
  width: number;
  height: number;
  thickness: number;
  panel: PanelData;
  renderConfig: RenderConfig;
}> = ({ width, height, thickness, panel, renderConfig }) => {
  const texture = useTextureFromBase64(panel.pngPreview);
  const normalTexture = useTextureFromBase64(panel.normalPreview);
  const bumpTexture = useTextureFromBase64(panel.bumpPreview);
  // 加载面板外轮廓遮罩（用于外表面透明裁剪）
  const shapeMaskTexture = useShapeMaskFromBase64(panel.shapeMask);

  // 获取工艺 PBR 参数
  const craftType = panel.craftType || 'CLIPMASK';
  const pbrParams = CRAFT_PBR_MAPPING[craftType] || CRAFT_PBR_MAPPING['CLIPMASK'];

  // 外表面颜色（折叠后朝外的面）
  const outerColor = '#ffffff';
  // 侧边颜色
  const sideColor = '#e0e0e0';

  // 外表面使用 shapeMask（面板外轮廓）而不是 texture（包含内部透明区域）
  const outerAlphaMap = shapeMaskTexture || texture;

  return (
    <group>
      {/* 顶面 - 白色，使用面板外轮廓遮罩（折叠后朝外） */}
      <mesh castShadow receiveShadow position={[0, thickness / 2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial
          color={outerColor}
          roughness={0.7}
          side={THREE.DoubleSide}
          alphaMap={outerAlphaMap}
          transparent={true}
          alphaTest={0.01}
        />
      </mesh>
      {/* 底面 - 带贴图（折叠后朝内，印刷面） */}
      <mesh receiveShadow position={[0, -thickness / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, height]} />
        <meshPhysicalMaterial
          map={texture}
          normalMap={normalTexture}
          bumpMap={bumpTexture}
          bumpScale={0.05}
          color={texture ? '#ffffff' : '#888888'}
          roughness={pbrParams.roughness * renderConfig.roughnessMultiplier}
          metalness={Math.min(1, pbrParams.metalness + renderConfig.metalnessBoost)}
          clearcoat={Math.min(1, pbrParams.clearcoat + renderConfig.clearcoatBoost)}
          clearcoatRoughness={0.1}
          envMapIntensity={renderConfig.envMapIntensity}
          side={THREE.DoubleSide}
          transparent={true}
          alphaTest={0.01}
        />
      </mesh>
      {/* 前侧边 */}
      <mesh castShadow receiveShadow position={[0, 0, height / 2]}>
        <planeGeometry args={[width, thickness]} />
        <meshStandardMaterial color={sideColor} roughness={0.8} />
      </mesh>
      {/* 后侧边 */}
      <mesh castShadow receiveShadow position={[0, 0, -height / 2]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[width, thickness]} />
        <meshStandardMaterial color={sideColor} roughness={0.8} />
      </mesh>
      {/* 左侧边 */}
      <mesh castShadow receiveShadow position={[-width / 2, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[height, thickness]} />
        <meshStandardMaterial color={sideColor} roughness={0.8} />
      </mesh>
      {/* 右侧边 */}
      <mesh castShadow receiveShadow position={[width / 2, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[height, thickness]} />
        <meshStandardMaterial color={sideColor} roughness={0.8} />
      </mesh>
    </group>
  );
};

/**
 * 单个面板的3D渲染组件
 */
const Panel3D: React.FC<{
  node: Node3D;
  foldProgress: number;  // 全局折叠进度
  scale: number;
  thickness: number;
  renderConfig: RenderConfig;
}> = ({ node, foldProgress, scale, thickness, renderConfig }) => {
  const groupRef = useRef<THREE.Group>(null);

  // 加载面板贴图
  const panelTexture = useTextureFromBase64(node.panel.pngPreview);
  const normalTexture = useTextureFromBase64(node.panel.normalPreview);
  const bumpTexture = useTextureFromBase64(node.panel.bumpPreview);
  // 加载面板外轮廓遮罩（用于外表面透明裁剪）
  const shapeMaskTexture = useShapeMaskFromBase64(node.panel.shapeMask);

  // 获取工艺 PBR 参数
  const craftType = node.panel.craftType || 'CLIPMASK';
  const pbrParams = CRAFT_PBR_MAPPING[craftType] || CRAFT_PBR_MAPPING['CLIPMASK'];

  // 计算当前面板的局部折叠进度
  const localProgress = calculateLocalProgress(
    foldProgress,
    node.foldStartProgress,
    node.foldEndProgress
  );

  // 计算当前折叠角度（使用局部进度）
  const foldAngle = localProgress * (Math.PI / 2) * node.foldDirection;

  // 使用 useFrame 更新旋转
  useFrame(() => {
    if (groupRef.current) {
      const quaternion = new THREE.Quaternion();
      quaternion.setFromAxisAngle(node.rotationAxis, foldAngle);
      groupRef.current.quaternion.copy(quaternion);
    }
  });

  const width = node.panel.width * scale;
  const height = node.panel.height * scale;

  // 侧边颜色
  const sideColor = '#e0e0e0';
  // 外表面颜色（折叠后朝外的面）
  const outerColor = '#ffffff';

  // 外表面使用 shapeMask（面板外轮廓）而不是 panelTexture（包含内部透明区域）
  const outerAlphaMap = shapeMaskTexture || panelTexture;

  return (
    <group ref={groupRef} position={node.foldEdgePos}>
      {/* 枢轴偏移 - 让面板绕折叠边旋转 */}
      <group position={node.pivotOffset}>
        {/* 顶面 - 白色，使用面板外轮廓遮罩（折叠后朝外） */}
        <mesh castShadow receiveShadow position={[0, thickness / 2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[width, height]} />
          <meshStandardMaterial
            color={outerColor}
            roughness={0.7}
            side={THREE.DoubleSide}
            alphaMap={outerAlphaMap}
            transparent={true}
            alphaTest={0.01}
          />
        </mesh>
        {/* 底面 - 带贴图（折叠后朝内，印刷面） */}
        <mesh receiveShadow position={[0, -thickness / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[width, height]} />
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
            side={THREE.DoubleSide}
            transparent={true}
            alphaTest={0.01}
          />
        </mesh>
        {/* 前侧边 */}
        <mesh castShadow receiveShadow position={[0, 0, height / 2]}>
          <planeGeometry args={[width, thickness]} />
          <meshStandardMaterial color={sideColor} roughness={0.8} />
        </mesh>
        {/* 后侧边 */}
        <mesh castShadow receiveShadow position={[0, 0, -height / 2]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[width, thickness]} />
          <meshStandardMaterial color={sideColor} roughness={0.8} />
        </mesh>
        {/* 左侧边 */}
        <mesh castShadow receiveShadow position={[-width / 2, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[height, thickness]} />
          <meshStandardMaterial color={sideColor} roughness={0.8} />
        </mesh>
        {/* 右侧边 */}
        <mesh castShadow receiveShadow position={[width / 2, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[height, thickness]} />
          <meshStandardMaterial color={sideColor} roughness={0.8} />
        </mesh>

        {/* 递归渲染子节点 */}
        {node.children.map(child => (
          <Panel3D
            key={child.id}
            node={child}
            foldProgress={foldProgress}
            scale={scale}
            thickness={thickness}
            renderConfig={renderConfig}
          />
        ))}
      </group>
    </group>
  );
};

/**
 * 主组件
 */
export const NestedGroupFold: React.FC<NestedGroupFoldProps> = ({
  panels,
  drivenMap,
  rootPanelId,
  foldProgress,
  sequence = [],  // 折叠顺序
  scale = 0.1,
  thickness = 0.5,
  offsetX,
  offsetY,
  centerX = 0,  // 整体中心 X
  centerY = 0,  // 整体中心 Y
  craftLayers = [],  // 工艺图层
  renderConfig = DEFAULT_RENDER_CONFIG,  // 渲染配置
}) => {
  // 创建工艺图层映射（按面板边界重叠查找）
  const craftLayerMap = useMemo(() => {
    const map = new Map<string, { normal?: MarkedLayer; bump?: MarkedLayer; craft?: string }>();

    panels.forEach(panel => {
      if (!panel || !panel.id) return;
      const pb = panel.bounds || {
        x: (panel as any).x || 0,
        y: (panel as any).y || 0,
        width: (panel as any).width || 100,
        height: (panel as any).height || 50
      };

      // 查找与此面板重叠的工艺图层
      const overlapping = craftLayers.filter(craft => {
        if (!craft || !craft.bounds) return false;
        const cb = craft.bounds;
        return !(cb.x + cb.width < pb.x || cb.x > pb.x + pb.width ||
                 cb.y + cb.height < pb.y || cb.y > pb.y + pb.height);
      });

      // 分类工艺图层
      const normalLayer = overlapping.find(l =>
        l.craftType === 'NORMAL' || l.crafts?.includes('法线') || l.name.includes('法线')
      );
      const bumpLayer = overlapping.find(l =>
        l.craftType === 'EMBOSS' || l.crafts?.includes('凹凸') || l.name.includes('凹凸')
      );
      const craftLayer = overlapping.find(l =>
        l.crafts?.includes('烫金') || l.crafts?.includes('烫银') || l.crafts?.includes('UV')
      );

      map.set(panel.id, {
        normal: normalLayer,
        bump: bumpLayer,
        craft: craftLayer?.crafts?.[0],
      });
    });

    return map;
  }, [panels, craftLayers]);

  // 转换面板数据
  const panelDataMap = useMemo(() => {
    const map = new Map<string, PanelData>();
    panels.forEach(p => {
      if (!p || !p.id) return;
      const hasPng = !!p.pngPreview;
      const craftInfo = craftLayerMap.get(p.id);

      console.log(`🖼️ Panel ${p.name} (${p.id}): pngPreview = ${hasPng ? 'YES' : 'NO'}, shapeMask = ${p.shapeMask ? 'YES' : 'NO'}, craft = ${craftInfo?.craft || 'none'}`);

      map.set(p.id, {
        id: p.id,
        name: p.name,
        x: ((p as any).x ?? p.bounds?.x ?? 0) - offsetX,
        y: ((p as any).y ?? p.bounds?.y ?? 0) - offsetY,
        width: (p as any).width ?? p.bounds?.width ?? 100,
        height: (p as any).height ?? p.bounds?.height ?? 50,
        pngPreview: p.pngPreview,
        normalPreview: craftInfo?.normal?.pngPreview,
        bumpPreview: craftInfo?.bump?.pngPreview,
        craftType: craftInfo?.craft || p.craftType,
        shapeMask: p.shapeMask,  // 面板外轮廓遮罩
      });
    });
    return map;
  }, [panels, offsetX, offsetY, craftLayerMap]);

  // 计算每个面板的折叠时间段
  const foldTimingMap = useMemo(() => {
    const timingMap = new Map<string, { start: number; end: number }>();

    // 如果没有 sequence，所有面板同时折叠
    if (sequence.length === 0) {
      panelDataMap.forEach((_, id) => {
        timingMap.set(id, { start: 0, end: 1 });
      });
      return timingMap;
    }

    // 根据 sequence 计算每个面板的折叠时间段
    // 每个面板占用相等的时间段，但有重叠以实现平滑过渡
    const totalPanels = sequence.length;
    const overlapRatio = 0.3; // 30% 重叠，让动画更流畅
    const segmentDuration = 1 / (totalPanels * (1 - overlapRatio) + overlapRatio);

    sequence.forEach((panelId, index) => {
      const start = index * segmentDuration * (1 - overlapRatio);
      const end = Math.min(1, start + segmentDuration);
      timingMap.set(panelId, { start, end });
    });

    // 根面板不折叠
    if (rootPanelId) {
      timingMap.set(rootPanelId, { start: 0, end: 0 });
    }

    console.log('⏱️ 折叠时间段:', Object.fromEntries(timingMap));
    return timingMap;
  }, [sequence, panelDataMap, rootPanelId]);

  // 构建节点树
  const rootNode = useMemo(() => {
    if (!rootPanelId) return null;
    const rootPanel = panelDataMap.get(rootPanelId);
    if (!rootPanel) return null;

    // 调试：打印完整的 drivenMap 和 panelDataMap
    console.log('🌳 NestedGroupFold 初始化:');
    console.log('  rootPanelId:', rootPanelId);
    console.log('  drivenMap:', JSON.stringify(drivenMap, null, 2));
    console.log('  panelDataMap keys:', Array.from(panelDataMap.keys()));
    console.log('  panels count:', panels.length);

    // 递归构建子节点
    const buildChildren = (parentId: string, parentPanel: PanelData): Node3D[] => {
      const childIds = drivenMap[parentId] || [];
      const children: Node3D[] = [];

      // 调试日志
      console.log(`📦 buildChildren: parentId=${parentId}, childIds=`, childIds);
      console.log(`📦 parentPanel:`, parentPanel);

      // 父面板中心（全局坐标）
      const parentCenterX = (parentPanel.x + parentPanel.width / 2) * scale;
      const parentCenterZ = (parentPanel.y + parentPanel.height / 2) * scale;

      childIds.forEach(childId => {
        const childPanel = panelDataMap.get(childId);
        if (!childPanel) {
          console.warn(`⚠️ NestedGroupFold: 找不到面板 ${childId}`);
          return;
        }

        const edge = detectSharedEdge(parentPanel, childPanel);
        console.log(`🔗 检测共享边: ${parentId} -> ${childId}`, edge ? `${edge.type} @ ${edge.position}` : '未检测到');

        // 子面板中心（全局坐标）
        const childCenterX = (childPanel.x + childPanel.width / 2) * scale;
        const childCenterZ = (childPanel.y + childPanel.height / 2) * scale;

        // 计算折叠边位置和枢轴偏移
        // foldEdgePos: 相对于父面板中心
        // pivotOffset: 子面板中心相对于折叠边
        let foldEdgePos: THREE.Vector3;
        let pivotOffset: THREE.Vector3;
        let rotationAxis: THREE.Vector3;
        let foldDirection: number;

        if (!edge) {
          // 没有检测到共享边 - 基于相对位置推断
          console.warn(`⚠️ 未检测到共享边: ${parentId} -> ${childId}，使用默认位置`);
          const dx = childPanel.x - parentPanel.x;
          const dy = childPanel.y - parentPanel.y;

          if (Math.abs(dx) > Math.abs(dy)) {
            // 垂直边折叠
            const isRight = dx > 0;
            const edgeLocalX = isRight ? parentPanel.width * scale / 2 : -parentPanel.width * scale / 2;
            foldEdgePos = new THREE.Vector3(edgeLocalX, 0, 0);
            pivotOffset = new THREE.Vector3(childPanel.width * scale / 2 * (isRight ? 1 : -1), 0, childCenterZ - parentCenterZ);
            rotationAxis = new THREE.Vector3(0, 0, 1);
            // 反转方向：向下折叠
            foldDirection = isRight ? 1 : -1;
          } else {
            // 水平边折叠
            const isBelow = dy > 0;
            const edgeLocalZ = isBelow ? parentPanel.height * scale / 2 : -parentPanel.height * scale / 2;
            foldEdgePos = new THREE.Vector3(0, 0, edgeLocalZ);
            pivotOffset = new THREE.Vector3(childCenterX - parentCenterX, 0, childPanel.height * scale / 2 * (isBelow ? 1 : -1));
            rotationAxis = new THREE.Vector3(1, 0, 0);
            // 反转方向：向下折叠
            foldDirection = isBelow ? -1 : 1;
          }
        } else if (edge.type === 'horizontal') {
          // 水平边 - 绕 X 轴旋转
          // H面是底面，折叠后面板应该在下方，所以方向取反
          const edgeX = ((edge.start + edge.end) / 2) * scale;
          const edgeZ = edge.position * scale;
          foldEdgePos = new THREE.Vector3(edgeX - parentCenterX, 0, edgeZ - parentCenterZ);
          pivotOffset = new THREE.Vector3(childCenterX - edgeX, 0, childCenterZ - edgeZ);
          rotationAxis = new THREE.Vector3(1, 0, 0);
          // 反转方向：向下折叠而不是向上
          foldDirection = childPanel.y > parentPanel.y ? -1 : 1;
        } else {
          // 垂直边 - 绕 Z 轴旋转
          // H面是底面，折叠后面板应该在下方，所以方向取反
          const edgeX = edge.position * scale;
          const edgeZ = ((edge.start + edge.end) / 2) * scale;
          foldEdgePos = new THREE.Vector3(edgeX - parentCenterX, 0, edgeZ - parentCenterZ);
          pivotOffset = new THREE.Vector3(childCenterX - edgeX, 0, childCenterZ - edgeZ);
          rotationAxis = new THREE.Vector3(0, 0, 1);
          // 反转方向：向下折叠而不是向上
          foldDirection = childPanel.x > parentPanel.x ? 1 : -1;
        }

        const childNode: Node3D = {
          id: childId,
          panel: childPanel,
          foldEdgePos,
          pivotOffset,
          rotationAxis,
          foldDirection,
          children: buildChildren(childId, childPanel),
          // 从 foldTimingMap 获取折叠时间段
          foldStartProgress: foldTimingMap.get(childId)?.start ?? 0,
          foldEndProgress: foldTimingMap.get(childId)?.end ?? 1,
        };

        children.push(childNode);
      });

      return children;
    };

    // 根节点（不旋转）
    const root: Node3D = {
      id: rootPanelId,
      panel: rootPanel,
      foldEdgePos: new THREE.Vector3(0, 0, 0),
      pivotOffset: new THREE.Vector3(0, 0, 0),
      rotationAxis: new THREE.Vector3(0, 1, 0),
      foldDirection: 0,
      children: buildChildren(rootPanelId, rootPanel),
      foldStartProgress: 0,
      foldEndProgress: 0,  // 根节点不折叠
    };

    return root;
  }, [panelDataMap, drivenMap, rootPanelId, scale, foldTimingMap]);

  if (!rootNode || panels.length === 0) return null;

  // 使用传入的 centerX/centerY 计算居中偏移
  const centerOffsetX = (centerX - offsetX) * scale;
  const centerOffsetZ = (centerY - offsetY) * scale;

  // 根面板的位置（相对于整体中心的偏移）
  const rootCenterX = (rootNode.panel.x + rootNode.panel.width / 2) * scale - centerOffsetX;
  const rootCenterZ = (rootNode.panel.y + rootNode.panel.height / 2) * scale - centerOffsetZ;
  const rootWidth = rootNode.panel.width * scale;
  const rootHeight = rootNode.panel.height * scale;

  return (
    <group position={[rootCenterX, thickness / 2, rootCenterZ]}>
      {/* 根面板 - 使用 RootPanelMesh 组件支持贴图和工艺 */}
      <RootPanelMesh
        width={rootWidth}
        height={rootHeight}
        thickness={thickness}
        panel={rootNode.panel}
        renderConfig={renderConfig}
      />

      {/* 子节点 */}
      {rootNode.children.map(child => (
        <Panel3D
          key={child.id}
          node={child}
          foldProgress={foldProgress}
          scale={scale}
          thickness={thickness}
          renderConfig={renderConfig}
        />
      ))}
    </group>
  );
};

export default NestedGroupFold;
