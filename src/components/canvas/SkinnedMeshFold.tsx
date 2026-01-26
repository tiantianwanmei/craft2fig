/**
 * 🦴 SkinnedMeshFold - 蒙皮骨骼折叠组件
 *
 * 优化方案：
 * - 每个面板 = 2个三角面（1个矩形）
 * - 折叠边 = 多个小矩形组成弧形过渡
 * - 单个 SkinnedMesh + Skeleton 驱动整张刀版图
 * - 骨骼位置在折叠边上，实现正确的链式折叠
 */

import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { MarkedLayer } from '../../types/core';

// 折叠边弧形细分段数
const FOLD_SEGMENTS = 6;

// 面板数据接口
interface PanelData {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

// 折叠边数据接口
interface FoldEdge {
  type: 'horizontal' | 'vertical';
  position: number;
  start: number;
  end: number;
  parentId: string;
  childId: string;
}

// 组件属性
interface SkinnedMeshFoldProps {
  panels: MarkedLayer[];
  drivenMap: Record<string, string[]>;
  rootPanelId: string | null;
  foldProgress: number;
  scale?: number;
  thickness?: number;
  offsetX: number;
  offsetY: number;
}

/**
 * 检测两个面板之间的共享边
 */
function detectSharedEdge(
  panel1: PanelData,
  panel2: PanelData,
  tolerance: number = 2
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

export const SkinnedMeshFold: React.FC<SkinnedMeshFoldProps> = ({
  panels,
  drivenMap,
  rootPanelId,
  foldProgress,
  scale = 0.1,
  thickness = 0.5,
  offsetX,
  offsetY,
}) => {
  const meshRef = useRef<THREE.SkinnedMesh>(null);
  const skeletonRef = useRef<THREE.Skeleton | null>(null);

  // 转换面板数据
  const panelDataMap = useMemo(() => {
    const map = new Map<string, PanelData>();
    panels.forEach(p => {
      if (!p || !p.id) return;
      map.set(p.id, {
        id: p.id,
        name: p.name,
        x: ((p as any).x ?? p.bounds?.x ?? 0) - offsetX,
        y: ((p as any).y ?? p.bounds?.y ?? 0) - offsetY,
        width: (p as any).width ?? p.bounds?.width ?? 100,
        height: (p as any).height ?? p.bounds?.height ?? 50,
      });
    });
    return map;
  }, [panels, offsetX, offsetY]);

  // 检测所有折叠边并建立映射
  const { foldEdges, edgeByChild } = useMemo(() => {
    const edges: FoldEdge[] = [];
    const edgeMap = new Map<string, FoldEdge>();
    const processed = new Set<string>();

    Object.entries(drivenMap).forEach(([parentId, childIds]) => {
      const parent = panelDataMap.get(parentId);
      if (!parent) return;

      childIds.forEach(childId => {
        const key = [parentId, childId].sort().join('-');
        if (processed.has(key)) return;
        processed.add(key);

        const child = panelDataMap.get(childId);
        if (!child) return;

        const edge = detectSharedEdge(parent, child);
        if (edge) {
          edges.push(edge);
          edgeMap.set(childId, edge);
        }
      });
    });

    return { foldEdges: edges, edgeByChild: edgeMap };
  }, [panelDataMap, drivenMap]);

  // 生成几何体和骨骼
  const { geometry, skeleton, boneMap } = useMemo(() => {
    const positions: number[] = [];
    const indices: number[] = [];
    const uvs: number[] = [];
    const skinIndices: number[] = [];
    const skinWeights: number[] = [];

    const bones: THREE.Bone[] = [];
    const boneIndexMap = new Map<string, number>();
    // 存储每个骨骼的全局位置（用于顶点归一化）
    const boneGlobalPos = new Map<string, { x: number; z: number }>();

    // 创建根骨骼
    const rootBone = new THREE.Bone();
    rootBone.name = 'root';
    bones.push(rootBone);
    boneIndexMap.set('root', 0);
    boneGlobalPos.set('root', { x: 0, z: 0 });

    // 为根面板创建骨骼（位置在原点）
    if (rootPanelId) {
      const rootPanelBone = new THREE.Bone();
      rootPanelBone.name = rootPanelId;
      rootPanelBone.position.set(0, 0, 0);
      rootBone.add(rootPanelBone);
      bones.push(rootPanelBone);
      boneIndexMap.set(rootPanelId, bones.length - 1);
      boneGlobalPos.set(rootPanelId, { x: 0, z: 0 });
    }

    // 递归创建子骨骼 - 骨骼位置在折叠边上，同时记录全局位置
    const createChildBones = (parentId: string, parentBone: THREE.Bone, parentGlobalX: number, parentGlobalZ: number) => {
      const childIds = drivenMap[parentId] || [];

      childIds.forEach(childId => {
        const childPanel = panelDataMap.get(childId);
        if (!childPanel) return;

        const edge = edgeByChild.get(childId);
        if (!edge) return;

        const childBone = new THREE.Bone();
        childBone.name = childId;

        // 计算折叠边位置（相对于父骨骼的局部坐标）
        let localX = 0, localZ = 0;
        if (edge.type === 'horizontal') {
          const edgeMidX = (edge.start + edge.end) / 2;
          localX = edgeMidX * scale - parentGlobalX;
          localZ = edge.position * scale - parentGlobalZ;
        } else {
          const edgeMidY = (edge.start + edge.end) / 2;
          localX = edge.position * scale - parentGlobalX;
          localZ = edgeMidY * scale - parentGlobalZ;
        }

        childBone.position.set(localX, 0, localZ);
        parentBone.add(childBone);
        bones.push(childBone);
        boneIndexMap.set(childId, bones.length - 1);

        // 计算并存储全局位置
        const globalX = parentGlobalX + localX;
        const globalZ = parentGlobalZ + localZ;
        boneGlobalPos.set(childId, { x: globalX, z: globalZ });

        // 递归处理子面板
        createChildBones(childId, childBone, globalX, globalZ);
      });
    };

    // 从根面板开始构建骨骼层级
    if (rootPanelId && boneIndexMap.has(rootPanelId)) {
      const rootPanelBone = bones[boneIndexMap.get(rootPanelId)!];
      createChildBones(rootPanelId, rootPanelBone, 0, 0);
    }

    let vertexIndex = 0;

    // 为每个面板生成网格 - 顶点位置相对于骨骼的局部坐标
    panelDataMap.forEach((panel, panelId) => {
      const boneIdx = boneIndexMap.get(panelId) || 0;
      const bonePos = boneGlobalPos.get(panelId) || { x: 0, z: 0 };

      // 全局坐标
      const gx = panel.x * scale;
      const gz = panel.y * scale;
      const w = panel.width * scale;
      const h = panel.height * scale;
      const y = thickness / 2;

      // 转换为相对于骨骼的局部坐标
      const lx = gx - bonePos.x;
      const lz = gz - bonePos.z;

      const v0 = vertexIndex++;
      const v1 = vertexIndex++;
      const v2 = vertexIndex++;
      const v3 = vertexIndex++;

      positions.push(
        lx, y, lz,
        lx + w, y, lz,
        lx, y, lz + h,
        lx + w, y, lz + h
      );

      uvs.push(0, 1, 1, 1, 0, 0, 1, 0);
      indices.push(v0, v2, v1, v1, v2, v3);

      for (let i = 0; i < 4; i++) {
        skinIndices.push(boneIdx, 0, 0, 0);
        skinWeights.push(1, 0, 0, 0);
      }
    });

    // 为折叠边生成弧形过渡网格 - 使用父骨骼的局部坐标
    foldEdges.forEach(edge => {
      const parentBoneIdx = boneIndexMap.get(edge.parentId) || 0;
      const childBoneIdx = boneIndexMap.get(edge.childId) || 0;
      const parentBonePos = boneGlobalPos.get(edge.parentId) || { x: 0, z: 0 };
      const arcWidth = 2 * scale;

      if (edge.type === 'horizontal') {
        const edgeZ = edge.position * scale;
        const startX = edge.start * scale;
        const endX = edge.end * scale;
        const y = thickness / 2;

        // 转换为相对于父骨骼的局部坐标
        const lStartX = startX - parentBonePos.x;
        const lEndX = endX - parentBonePos.x;
        const lEdgeZ = edgeZ - parentBonePos.z;

        for (let i = 0; i < FOLD_SEGMENTS; i++) {
          const t0 = i / FOLD_SEGMENTS;
          const t1 = (i + 1) / FOLD_SEGMENTS;
          const lz0 = lEdgeZ - arcWidth / 2 + t0 * arcWidth;
          const lz1 = lEdgeZ - arcWidth / 2 + t1 * arcWidth;

          const v0 = vertexIndex++;
          const v1 = vertexIndex++;
          const v2 = vertexIndex++;
          const v3 = vertexIndex++;

          positions.push(lStartX, y, lz0, lEndX, y, lz0, lStartX, y, lz1, lEndX, y, lz1);
          uvs.push(0, t0, 1, t0, 0, t1, 1, t1);
          indices.push(v0, v2, v1, v1, v2, v3);

          const w0 = 1 - t0;
          const w1 = 1 - t1;
          skinIndices.push(
            parentBoneIdx, childBoneIdx, 0, 0,
            parentBoneIdx, childBoneIdx, 0, 0,
            parentBoneIdx, childBoneIdx, 0, 0,
            parentBoneIdx, childBoneIdx, 0, 0
          );
          skinWeights.push(w0, t0, 0, 0, w0, t0, 0, 0, w1, t1, 0, 0, w1, t1, 0, 0);
        }
      } else {
        const edgeX = edge.position * scale;
        const startZ = edge.start * scale;
        const endZ = edge.end * scale;
        const y = thickness / 2;

        // 转换为相对于父骨骼的局部坐标
        const lEdgeX = edgeX - parentBonePos.x;
        const lStartZ = startZ - parentBonePos.z;
        const lEndZ = endZ - parentBonePos.z;

        for (let i = 0; i < FOLD_SEGMENTS; i++) {
          const t0 = i / FOLD_SEGMENTS;
          const t1 = (i + 1) / FOLD_SEGMENTS;
          const lx0 = lEdgeX - arcWidth / 2 + t0 * arcWidth;
          const lx1 = lEdgeX - arcWidth / 2 + t1 * arcWidth;

          const v0 = vertexIndex++;
          const v1 = vertexIndex++;
          const v2 = vertexIndex++;
          const v3 = vertexIndex++;

          positions.push(lx0, y, lStartZ, lx0, y, lEndZ, lx1, y, lStartZ, lx1, y, lEndZ);
          uvs.push(t0, 0, t0, 1, t1, 0, t1, 1);
          indices.push(v0, v2, v1, v1, v2, v3);

          const w0 = 1 - t0;
          const w1 = 1 - t1;
          skinIndices.push(
            parentBoneIdx, childBoneIdx, 0, 0,
            parentBoneIdx, childBoneIdx, 0, 0,
            parentBoneIdx, childBoneIdx, 0, 0,
            parentBoneIdx, childBoneIdx, 0, 0
          );
          skinWeights.push(w0, t0, 0, 0, w0, t0, 0, 0, w1, t1, 0, 0, w1, t1, 0, 0);
        }
      }
    });

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
    geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    const skel = new THREE.Skeleton(bones);

    return { geometry: geo, skeleton: skel, boneMap: boneIndexMap };
  }, [panelDataMap, foldEdges, edgeByChild, drivenMap, rootPanelId, scale, thickness]);

  useEffect(() => {
    skeletonRef.current = skeleton;
  }, [skeleton]);

  // 动画更新
  useFrame(() => {
    if (!skeletonRef.current || !rootPanelId) return;

    const foldAngle = foldProgress * Math.PI / 2;

    foldEdges.forEach(edge => {
      const childBoneIdx = boneMap.get(edge.childId);
      if (childBoneIdx === undefined) return;

      const bone = skeletonRef.current!.bones[childBoneIdx];
      if (!bone) return;

      const parent = panelDataMap.get(edge.parentId);
      const child = panelDataMap.get(edge.childId);
      if (!parent || !child) return;

      if (edge.type === 'horizontal') {
        const isBelow = child.y > parent.y;
        bone.rotation.x = isBelow ? foldAngle : -foldAngle;
      } else {
        const isRight = child.x > parent.x;
        bone.rotation.z = isRight ? -foldAngle : foldAngle;
      }
    });
  });

  useEffect(() => {
    if (meshRef.current && skeleton) {
      meshRef.current.bind(skeleton);
    }
  }, [skeleton]);

  if (panels.length === 0) return null;

  return (
    <skinnedMesh ref={meshRef} geometry={geometry} castShadow receiveShadow>
      <meshPhysicalMaterial
        color="#888888"
        roughness={0.7}
        metalness={0.1}
        side={THREE.DoubleSide}
      />
      <primitive object={skeleton.bones[0]} />
    </skinnedMesh>
  );
};

export default SkinnedMeshFold;
