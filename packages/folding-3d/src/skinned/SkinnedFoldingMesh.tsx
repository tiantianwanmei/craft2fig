/**
 * SkinnedFoldingMesh - 骨骼蒙皮折叠网格组件
 *
 * 核心原理：
 * 1. 整个刀版图生成一个统一的 BufferGeometry
 * 2. UV 直接映射到刀版图的世界坐标（归一化）
 * 3. 关节条带使用双骨骼权重实现平滑过渡
 */

import React, { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

import type { PanelNode, SkinnedFoldingMeshProps, FoldTimingConfig } from './types';
import { SkeletonBuilder } from './SkeletonBuilder';

/** 计算整个刀版图的边界 */
function calculateBounds(root: PanelNode) {
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;

  const traverse = (node: PanelNode) => {
    minX = Math.min(minX, node.bounds.x);
    minY = Math.min(minY, node.bounds.y);
    maxX = Math.max(maxX, node.bounds.x + node.bounds.width);
    maxY = Math.max(maxY, node.bounds.y + node.bounds.height);
    node.children.forEach(traverse);
  };
  traverse(root);

  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

/** 顶点缓冲 */
interface Buffers {
  positions: number[];
  uvs: number[];
  normals: number[];
  skinIndices: number[];
  skinWeights: number[];
  indices: number[];
}

/** 默认折叠时序生成器 */
function generateDefaultTimings(root: PanelNode): FoldTimingConfig[] {
  const timings: FoldTimingConfig[] = [];
  const panels: PanelNode[] = [];

  // 收集所有面片
  const collect = (node: PanelNode) => {
    panels.push(node);
    node.children.forEach(collect);
  };
  collect(root);

  // 为每个面片分配时序
  const count = panels.length;
  panels.forEach((panel, index) => {
    if (index === 0) {
      // 根面片不折叠
      timings.push({
        panelId: panel.id,
        startTime: 0,
        duration: 0,
        easing: 'linear',
      });
    } else {
      const startTime = (index - 1) / Math.max(count - 1, 1) * 0.7;
      timings.push({
        panelId: panel.id,
        startTime,
        duration: 0.3,
        easing: 'easeInOut',
      });
    }
  });

  return timings;
}

/** 缓动函数 */
const easingFunctions = {
  linear: (t: number) => t,
  easeIn: (t: number) => t * t,
  easeOut: (t: number) => t * (2 - t),
  easeInOut: (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
};

/** 计算面片的折叠角度 */
function calculateFoldAngle(
  progress: number,
  timing: FoldTimingConfig,
  maxAngle: number
): number {
  const { startTime, duration, easing = 'easeInOut' } = timing;
  if (progress <= startTime) return 0;
  if (progress >= startTime + duration) return maxAngle;
  const localProgress = (progress - startTime) / duration;
  return easingFunctions[easing](localProgress) * maxAngle;
}

/**
 * 构建统一的缝合几何体
 * - 所有面板 + 关节条带合并为一个 BufferGeometry
 * - UV 直接映射到刀版图的归一化坐标
 */
function buildStitchedGeometry(
  root: PanelNode,
  boneIndexMap: Map<string, number>,
  bounds: ReturnType<typeof calculateBounds>,
  config: { thickness: number; jointSegments: number; cornerRadius: number }
): THREE.BufferGeometry {
  const { thickness, jointSegments, cornerRadius } = config;
  const halfZ = thickness / 2;

  const buffers: Buffers = {
    positions: [], uvs: [], normals: [],
    skinIndices: [], skinWeights: [], indices: [],
  };
  let vertexCount = 0;

  // 世界坐标 → UV (归一化到 0-1)
  const toUV = (x: number, y: number): [number, number] => [
    (x - bounds.minX) / bounds.width,
    (y - bounds.minY) / bounds.height,
  ];

  // 添加顶点
  const addVertex = (
    pos: [number, number, number],
    uv: [number, number],
    normal: [number, number, number],
    bone1: number, bone2: number,
    w1: number, w2: number
  ) => {
    buffers.positions.push(...pos);
    buffers.uvs.push(...uv);
    buffers.normals.push(...normal);
    buffers.skinIndices.push(bone1, bone2, 0, 0);
    buffers.skinWeights.push(w1, w2, 0, 0);
    return vertexCount++;
  };

  const addTri = (a: number, b: number, c: number) => {
    buffers.indices.push(a, b, c);
  };

  // 生成面板几何体
  const generatePanel = (node: PanelNode, boneIdx: number) => {
    const { x, y, width, height } = node.bounds;
    const x0 = x, y0 = y, x1 = x + width, y1 = y + height;

    const startIdx = vertexCount;
    addVertex([x0, y0, halfZ], toUV(x0, y0), [0, 0, 1], boneIdx, 0, 1, 0);
    addVertex([x1, y0, halfZ], toUV(x1, y0), [0, 0, 1], boneIdx, 0, 1, 0);
    addVertex([x1, y1, halfZ], toUV(x1, y1), [0, 0, 1], boneIdx, 0, 1, 0);
    addVertex([x0, y1, halfZ], toUV(x0, y1), [0, 0, 1], boneIdx, 0, 1, 0);

    addTri(startIdx, startIdx + 1, startIdx + 2);
    addTri(startIdx, startIdx + 2, startIdx + 3);

    // 背面
    const backIdx = vertexCount;
    addVertex([x0, y0, -halfZ], toUV(x0, y0), [0, 0, -1], boneIdx, 0, 1, 0);
    addVertex([x1, y0, -halfZ], toUV(x1, y0), [0, 0, -1], boneIdx, 0, 1, 0);
    addVertex([x1, y1, -halfZ], toUV(x1, y1), [0, 0, -1], boneIdx, 0, 1, 0);
    addVertex([x0, y1, -halfZ], toUV(x0, y1), [0, 0, -1], boneIdx, 0, 1, 0);

    addTri(backIdx, backIdx + 2, backIdx + 1);
    addTri(backIdx, backIdx + 3, backIdx + 2);
  };

  // 生成关节条带
  const generateJoint = (child: PanelNode, parentBoneIdx: number, childBoneIdx: number) => {
    const joint = child.jointInfo;
    if (!joint) return;

    const jw = joint.width || cornerRadius;
    const jl = joint.length;
    const jx = joint.position.x;
    const jy = joint.position.y;
    const isH = joint.type === 'horizontal';

    const startIdx = vertexCount;

    for (let i = 0; i <= jointSegments; i++) {
      const t = i / jointSegments;
      const pw = 1 - t, cw = t;
      const offset = t * jw;

      if (isH) {
        const py = jy + offset;
        addVertex([jx, py, halfZ], toUV(jx, py), [0, 0, 1], parentBoneIdx, childBoneIdx, pw, cw);
        addVertex([jx + jl, py, halfZ], toUV(jx + jl, py), [0, 0, 1], parentBoneIdx, childBoneIdx, pw, cw);
      } else {
        const px = jx + offset;
        addVertex([px, jy, halfZ], toUV(px, jy), [0, 0, 1], parentBoneIdx, childBoneIdx, pw, cw);
        addVertex([px, jy + jl, halfZ], toUV(px, jy + jl), [0, 0, 1], parentBoneIdx, childBoneIdx, pw, cw);
      }
    }

    for (let i = 0; i < jointSegments; i++) {
      const idx = startIdx + i * 2;
      addTri(idx, idx + 2, idx + 1);
      addTri(idx + 1, idx + 2, idx + 3);
    }
  };

  // 递归处理节点
  const processNode = (node: PanelNode, parent: PanelNode | null) => {
    const boneIdx = boneIndexMap.get(node.id) ?? 0;
    generatePanel(node, boneIdx);

    if (parent && node.jointInfo) {
      const parentBoneIdx = boneIndexMap.get(parent.id) ?? 0;
      generateJoint(node, parentBoneIdx, boneIdx);
    }

    for (const child of node.children) {
      processNode(child, node);
    }
  };

  processNode(root, null);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(buffers.positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(buffers.uvs, 2));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(buffers.normals, 3));
  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(buffers.skinIndices, 4));
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(buffers.skinWeights, 4));
  geometry.setIndex(buffers.indices);
  geometry.computeVertexNormals();

  return geometry;
}

/**
 * SkinnedFoldingMesh 组件
 */
export const SkinnedFoldingMesh: React.FC<SkinnedFoldingMeshProps> = ({
  panelTree,
  textureAtlas: externalAtlas,
  foldProgress,
  thickness = 1,
  cornerRadius = 2,
  jointSegments = 8,
  materialProps = {},
  showSkeleton = false,
  showWireframe = false,
  foldTimings: customTimings,
}) => {
  const meshRef = useRef<THREE.SkinnedMesh>(null);

  // 构建所有数据
  const meshData = useMemo(() => {
    // 1. 计算边界
    const bounds = calculateBounds(panelTree);

    // 2. 构建骨骼
    const skeletonBuilder = new SkeletonBuilder();
    const skeletonResult = skeletonBuilder.build(panelTree);

    // 3. 构建统一几何体
    const geometry = buildStitchedGeometry(
      panelTree,
      skeletonResult.boneIndexMap,
      bounds,
      { thickness, jointSegments, cornerRadius }
    );

    // 4. 纹理
    const texture = externalAtlas?.texture || createPlaceholderTexture(panelTree, bounds);

    // 5. 折叠时序 - 优先使用自定义时序
    const timings = customTimings || generateDefaultTimings(panelTree);

    return {
      geometry,
      skeleton: skeletonResult.skeleton,
      rootBone: skeletonResult.rootBone,
      bones: skeletonResult.bones,
      boneIndexMap: skeletonResult.boneIndexMap,
      texture,
      timings,
    };
  }, [panelTree, externalAtlas, thickness, cornerRadius, jointSegments, customTimings]);

  // 绑定骨骼
  useEffect(() => {
    if (meshRef.current && meshData.skeleton) {
      meshRef.current.add(meshData.rootBone);
      meshRef.current.bind(meshData.skeleton);
    }
  }, [meshData]);

  // 更新骨骼旋转
  useFrame(() => {
    if (!meshData.bones || !meshData.timings) return;

    updateBoneRotations(
      panelTree,
      meshData.bones,
      meshData.boneIndexMap,
      meshData.timings,
      foldProgress
    );
  });

  const { roughness = 0.85, metalness = 0.05, color = '#ffffff' } = materialProps;

  return (
    <group>
      <skinnedMesh
        ref={meshRef}
        geometry={meshData.geometry}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          map={meshData.texture}
          color={color}
          roughness={roughness}
          metalness={metalness}
          side={THREE.DoubleSide}
          wireframe={showWireframe}
        />
      </skinnedMesh>

      {showSkeleton && meshData.rootBone && (
        <primitive object={new THREE.SkeletonHelper(meshData.rootBone)} />
      )}
    </group>
  );
};

/** 创建占位纹理（色块） */
function createPlaceholderTexture(
  root: PanelNode,
  bounds: ReturnType<typeof calculateBounds>
): THREE.Texture {
  const canvas = document.createElement('canvas');
  const size = 2048;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // 背景
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, size, size);

  // 颜色表
  const colors = [
    '#4a90d9', '#5ba55b', '#d9a55b', '#9b5bd9',
    '#d95b5b', '#5bd9d9', '#d95ba5', '#a5d95b',
  ];
  let colorIdx = 0;

  const drawPanel = (node: PanelNode) => {
    const x = ((node.bounds.x - bounds.minX) / bounds.width) * size;
    const y = ((node.bounds.y - bounds.minY) / bounds.height) * size;
    const w = (node.bounds.width / bounds.width) * size;
    const h = (node.bounds.height / bounds.height) * size;

    ctx.fillStyle = colors[colorIdx++ % colors.length];
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    // 标签
    ctx.fillStyle = '#fff';
    ctx.font = '24px sans-serif';
    ctx.fillText(node.name || node.id, x + 8, y + 28);

    node.children.forEach(drawPanel);
  };

  drawPanel(root);

  const texture = new THREE.CanvasTexture(canvas);
  texture.flipY = false;
  texture.needsUpdate = true;
  return texture;
}

/** 更新骨骼旋转 */
function updateBoneRotations(
  root: PanelNode,
  bones: THREE.Bone[],
  boneIndexMap: Map<string, number>,
  timings: FoldTimingConfig[],
  progress: number
): void {
  const timingMap = new Map(timings.map(t => [t.panelId, t]));

  const updateNode = (node: PanelNode) => {
    const boneIndex = boneIndexMap.get(node.id);
    if (boneIndex === undefined) return;

    const bone = bones[boneIndex];
    if (!bone) return;

    const timing = timingMap.get(node.id);
    if (!timing) return;

    const joint = node.jointInfo;
    if (joint) {
      const maxAngle = joint.maxAngle * joint.direction;
      const angle = calculateFoldAngle(progress, timing, maxAngle);

      if (joint.type === 'horizontal') {
        bone.rotation.x = angle;
      } else {
        bone.rotation.y = angle;
      }
    }

    node.children.forEach(updateNode);
  };

  updateNode(root);
}
