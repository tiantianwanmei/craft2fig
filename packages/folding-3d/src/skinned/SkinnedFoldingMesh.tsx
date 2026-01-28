/**
 * SkinnedFoldingMesh - 骨骼蒙皮折叠网格组件
 *
 * 核心原理：
 * 1. 整个刀版图生成一个统一的 BufferGeometry
 * 2. UV 直接映射到刀版图的世界坐标（归一化）
 * 3. 关节条带使用双骨骼权重实现平滑过渡
 */

import React, { useMemo, useRef, useEffect, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
// @ts-ignore
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader';


import { SkeletonBuilder } from './SkeletonBuilder';
import { calculateSkinData } from './weights';
import { calculateDynamicGapSize, type AllowanceConfig } from './FoldingAllowance';
import type { PanelNode, FoldTimingConfig, SkinnedFoldingMeshProps } from './types';

/** 计算整个刀版图的边界 (考虑动态让位产生的偏移) */
function calculateBounds(root: PanelNode, offsets?: Map<string, { x: number, y: number }>) {
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;

  const traverse = (node: PanelNode) => {
    const offset = offsets?.get(node.id) || { x: 0, y: 0 };
    const x = node.bounds.x + offset.x;
    const y = node.bounds.y + offset.y;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + node.bounds.width);
    maxY = Math.max(maxY, y + node.bounds.height);
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
  return easingFunctions[easing](localProgress) * maxAngle;
}

/**
 * 计算树结构的空间偏移（用于留出折叠缝隙）
 * 支持动态让位算法
 */
function calculateTreeOffsets(
  root: PanelNode,
  config: AllowanceConfig
): {
  offsets: Map<string, { x: number, y: number }>,
  gapSizes: Map<string, number>
} {
  const offsets = new Map<string, { x: number, y: number }>();
  const gapSizes = new Map<string, number>();

  const traverse = (node: PanelNode, currentOffset: { x: number, y: number }, depth: number) => {
    offsets.set(node.id, currentOffset);

    node.children.forEach(child => {
      const childShift = { ...currentOffset };
      if (child.jointInfo) {
        const j = child.jointInfo;

        // 🧪 核心算法：计算该关节的科学让位宽度
        const gapSize = calculateDynamicGapSize(j.type, depth, config);
        gapSizes.set(child.id, gapSize);

        // Joint Strip Width = gapSize * 2
        const stripWidth = gapSize * 2;

        if (j.type === 'horizontal') {
          if (child.bounds.y > node.bounds.y) {
            childShift.y += stripWidth;
          } else {
            childShift.y -= stripWidth;
          }
        } else {
          if (child.bounds.x > node.bounds.x) {
            childShift.x += stripWidth;
          } else {
            childShift.x -= stripWidth;
          }
        }
      }
      traverse(child, childShift, depth + 1);
    });
  };

  traverse(root, { x: 0, y: 0 }, 0);
  return { offsets, gapSizes };
}

/**
 * 构建统一的几何体（无厚度版本）
 *
 * 坐标系统：
 * - 骨骼 3D 位置 = (2D_x * scale, -2D_y * scale, 0)
 * - 顶点局部坐标 = 顶点3D位置 - 骨骼3D位置
 * - boneWorldPositions 存储 2D 像素坐标
 */
function buildStitchedGeometry(
  root: PanelNode,
  boneIndexMap: Map<string, number>,
  boneWorldPositions: Map<string, { x: number; y: number }>,
  bounds: ReturnType<typeof calculateBounds>,
  config: {
    thickness: number;
    jointSegments: number;
    cornerRadius: number;
    scale: number;
    jointInterpolation?: 'linear' | 'smooth' | 'arc';
    gapSizes?: Map<string, number>; // 🆕 动态连接器宽度映射
    offsets?: Map<string, { x: number; y: number }>;
    creaseCurvature?: number; // 🆕 折痕曲率
    alignOffset?: { x: number; y: number }; // 🆕 归一化对齐偏移
  },
  regions?: Map<string, any> // AtlasRegion type
): THREE.BufferGeometry {
  const { scale } = config;

  const buffers: Buffers = {
    positions: [], uvs: [], normals: [],
    skinIndices: [], skinWeights: [], indices: [],
  };
  let vertexCount = 0;

  // 不应用居中偏移，使用原始坐标
  const alignOffset = { x: 0, y: 0 };

  // 分离索引数组
  const frontIndices: number[] = [];
  const backIndices: number[] = [];

  const parentNormal = 1; // 

  const addVertex = (
    pos: [number, number, number],
    uv: [number, number],
    normal: [number, number, number],
    boneIdx: number
  ) => {
    buffers.positions.push(...pos);
    buffers.uvs.push(...uv);
    buffers.normals.push(...normal);
    buffers.skinIndices.push(boneIdx, 0, 0, 0);
    buffers.skinWeights.push(1, 0, 0, 0);
    return vertexCount++;
  };

  const addTri = (a: number, b: number, c: number) => {
    buffers.indices.push(a, b, c);
  };

  // 
  const generateJoint = (
    node: PanelNode,
    childBoneIdx: number,
    parentBoneIdx: number,
    parentBounds: { x: number, y: number, width: number, height: number }
  ) => {
    const joint = node.jointInfo!;

    // 🧪 使用动态计算的 GapSize
    const gapSize = config.gapSizes?.get(node.id) ?? config.thickness * 1.5;
    const jointW = gapSize * 2 * scale;
    const segments = config.jointSegments || 16; // 🔧 Fixed segments to prevent skin weight corruption
    const halfW = jointW / 2;

    const isHorizontal = joint.type === 'horizontal';
    const length = joint.length * scale;
    const alignX = config.alignOffset?.x ?? 0;
    const alignY = config.alignOffset?.y ?? 0;

    // Determine Orientation (Parent -> Child)
    let startOffset = -halfW;
    let endOffset = halfW;

    if (isHorizontal) {
      const parentY = -(parentBounds.y - alignY) * scale;
      const jY = -(joint.position.y - alignY) * scale;
      const isTop = jY > parentY;
      const isTopDir = joint.direction < 0; // Simple heuristic for now
      if (node.bounds.y > parentBounds.y) { // Child is Below (Normal)
        startOffset = halfW;
        endOffset = -halfW;
      } else { // Child is Above (Inverted)
        startOffset = -halfW;
        endOffset = halfW;
      }
    } else { // Vertical
      if (node.bounds.x > parentBounds.x) { // Child is Right (Normal)
        startOffset = -halfW;
        endOffset = halfW;
      } else { // Child is Left (Inverted)
        startOffset = halfW;
        endOffset = -halfW;
      }
    }

    // Atlas mapping strategy for joint strip:
    // Prefer sampling from the PARENT panel region (more visually stable),
    // falling back to global layout UVs when atlas is not present.
    const parentRegion = node.parentId ? regions?.get(node.parentId) : undefined;
    const childRegion = regions?.get(node.id);

    // UVs: Use center of joint in world space
    const rawBonePos = boneWorldPositions.get(node.id) || { x: 0, y: 0 };
    const centerX_2D = rawBonePos.x - alignX;
    const centerY_2D = rawBonePos.y - alignY;

    // Model Space Center (3D)
    const centerX_3D = centerX_2D * scale;
    const centerY_3D = -centerY_2D * scale;

    // Generate Strip
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;

      // Interpolate Offset
      const currentOffset = startOffset + t * (endOffset - startOffset);

      let dx0: number, dy0: number, dx1: number, dy1: number;

      if (isHorizontal) {
        const halfL = length / 2;
        dx0 = -halfL; dx1 = halfL;
        dy0 = dy1 = currentOffset;
      } else {
        const halfL = length / 2;
        dy0 = -halfL; dy1 = halfL;
        dx0 = dx1 = currentOffset;
      }

      // Calculate Weights
      const weights = calculateSkinData('crease', t, {
        parentBoneIndex: parentBoneIdx,
        childBoneIndex: childBoneIdx,
        interpolation: config.jointInterpolation || 'smooth',
        creaseCurvature: config.creaseCurvature || 1.0,
      });

      const zOffset = (config.thickness || 1) / 2;

      // --- Front Vertices ---
      const posX0 = centerX_3D + dx0;
      const posY0 = centerY_3D + dy0;
      const layoutX0 = posX0 / scale + alignX;
      const layoutY0 = -posY0 / scale + alignY;

      let u0 = (layoutX0 - bounds.minX) / bounds.width;
      let v0 = 1 - (layoutY0 - bounds.minY) / bounds.height;
      if (parentRegion && parentRegion.uv) {
        const uLocal = parentBounds.width > 0 ? ((layoutX0 - parentBounds.x) / parentBounds.width) : 0;
        const vLocal = parentBounds.height > 0 ? (1 - (layoutY0 - parentBounds.y) / parentBounds.height) : 0;
        u0 = parentRegion.uv.u0 + Math.max(0, Math.min(1, uLocal)) * (parentRegion.uv.u1 - parentRegion.uv.u0);
        v0 = parentRegion.uv.v0 + Math.max(0, Math.min(1, vLocal)) * (parentRegion.uv.v1 - parentRegion.uv.v0);
      }

      const vIdx0 = vertexCount++;
      buffers.positions.push(posX0, posY0, zOffset);
      buffers.uvs.push(u0, v0);
      buffers.normals.push(0, 0, 1);
      buffers.skinIndices.push(...weights.skinIndices);
      buffers.skinWeights.push(...weights.skinWeights);

      const posX1 = centerX_3D + dx1;
      const posY1 = centerY_3D + dy1;
      const layoutX1 = posX1 / scale + alignX;
      const layoutY1 = -posY1 / scale + alignY;

      let u1 = (layoutX1 - bounds.minX) / bounds.width;
      let v1 = 1 - (layoutY1 - bounds.minY) / bounds.height;
      if (childRegion && childRegion.uv) {
        const cBounds = node.bounds;
        const uLocal = cBounds.width > 0 ? ((layoutX1 - cBounds.x) / cBounds.width) : 0;
        const vLocal = cBounds.height > 0 ? (1 - (layoutY1 - cBounds.y) / cBounds.height) : 0;
        u1 = childRegion.uv.u0 + Math.max(0, Math.min(1, uLocal)) * (childRegion.uv.u1 - childRegion.uv.u0);
        v1 = childRegion.uv.v0 + Math.max(0, Math.min(1, vLocal)) * (childRegion.uv.v1 - childRegion.uv.v0);
      }

      const vIdx1 = vertexCount++;
      buffers.positions.push(posX1, posY1, zOffset);
      buffers.uvs.push(u1, v1);
      buffers.normals.push(0, 0, 1);
      buffers.skinIndices.push(...weights.skinIndices);
      buffers.skinWeights.push(...weights.skinWeights);

      // --- Back Vertices ---
      const vIdx0_back = vertexCount++;
      buffers.positions.push(posX0, posY0, -zOffset);
      buffers.uvs.push(0, 0); // Back side is usually blank
      buffers.normals.push(0, 0, -1);
      buffers.skinIndices.push(...weights.skinIndices);
      buffers.skinWeights.push(...weights.skinWeights);

      const vIdx1_back = vertexCount++;
      buffers.positions.push(posX1, posY1, -zOffset);
      buffers.uvs.push(0, 0);
      buffers.normals.push(0, 0, -1);
      buffers.skinIndices.push(...weights.skinIndices);
      buffers.skinWeights.push(...weights.skinWeights);

      if (i > 0) {
        // --- 🧪 Deterministic CCW Winding Strategy ---
        // Goal: Ensure front faces are always CCW facing +Z.
        // We use the 2D cross product of the width vector and the sweep vector.

        // Indices already calculated above: pL, pR, cL, cR are relative to current vertexCount
        // Front Facets
        const pL = vIdx0 - 4;
        const pR = vIdx1 - 4;
        const cL = vIdx0;
        const cR = vIdx1;

        const pL_b = vIdx0_back - 4;
        const pR_b = vIdx1_back - 4;
        const cL_b = vIdx0_back;
        const cR_b = vIdx1_back;

        // Cross product of (pR - pL) and (cL - pL) to check orientation
        // Local space: pL = (dx0_prev, dy0_prev), pR = (dx1_prev, dy1_prev), cL = (dx0, dy0)
        const halfL = length / 2;
        const prevDx0 = isHorizontal ? -halfL : (startOffset + (i - 1) / segments * (endOffset - startOffset));
        const prevDy0 = isHorizontal ? (startOffset + (i - 1) / segments * (endOffset - startOffset)) : -halfL;
        const prevDx1 = isHorizontal ? halfL : (startOffset + (i - 1) / segments * (endOffset - startOffset));
        const prevDy1 = isHorizontal ? (startOffset + (i - 1) / segments * (endOffset - startOffset)) : halfL;

        const vWidthX = prevDx1 - prevDx0;
        const vWidthY = prevDy1 - prevDy0;
        const vSweepX = dx0 - prevDx0;
        const vSweepY = dy0 - prevDy0;

        // Determinant (Z-component of cross product)
        const det = vWidthX * vSweepY - vWidthY * vSweepX;

        if (det > 0) {
          // Standard order is CCW
          frontIndices.push(pL, pR, cL);
          frontIndices.push(pR, cR, cL);
          // Back face (CW from world POV, CCW from behind)
          backIndices.push(pL_b, cL_b, pR_b);
          backIndices.push(pR_b, cL_b, cR_b);
        } else {
          // Flipped order is CCW
          frontIndices.push(pL, cL, pR);
          frontIndices.push(pR, cL, cR);
          // Back face (CW from world POV, CCW from behind)
          backIndices.push(pL_b, pR_b, cL_b);
          backIndices.push(pR_b, cR_b, cL_b);
        }
      }
    }

  };

  const generatePanel = (node: PanelNode, isFirst: boolean = false) => {
    const { x, y, width, height } = node.bounds;
    const boneIdx = boneIndexMap.get(node.id) ?? 0;

    // IMPORTANT:
    // gapSize is used for joint strip width only.
    // Do NOT shrink panel surface bounds, otherwise UVs will shift and textures will look wrong.
    // 📌 Offset Logic (Expansion)
    // Shift the panel geometry to make room for joint strips.
    // Do NOT shrink/inset (which crops content).
    // Instead, move the vertices.
    const offset = config.offsets?.get(node.id) || { x: 0, y: 0 };

    const rectX = x;
    const rectY = y;
    const rectW = width;
    const rectH = height;

    // Model Space Coordinates (Global + Offset)
    const alignOffset = config.alignOffset || { x: 0, y: 0 };

    // Model Space Coordinates (Global + Offset)
    const lx0 = (rectX + offset.x - alignOffset.x) * scale;
    const lx1 = (rectX + rectW + offset.x - alignOffset.x) * scale;
    const ly0 = -(rectY + offset.y - alignOffset.y) * scale;
    const ly1 = -(rectY + rectH + offset.y - alignOffset.y) * scale;

    // UVs - Standardized (u=x, v=y)
    // Matches Texture Origin = Top Left
    // ⚠️ Use ORIGINAL Bounds for UVs to map texture correctly (Texture is flat layout)
    const u0 = (rectX - bounds.minX) / bounds.width;
    const u1 = (rectX + rectW - bounds.minX) / bounds.width;
    const v0 = 1 - (rectY - bounds.minY) / bounds.height;
    const v1 = 1 - (rectY + rectH - bounds.minY) / bounds.height;

    // If Atlas Region
    const region = regions?.get(node.id);
    const finalU0 = region?.uv?.u0 ?? u0;
    const finalU1 = region?.uv?.u1 ?? u1;
    const finalV0 = region?.uv?.v0 ?? v0;
    const finalV1 = region?.uv?.v1 ?? v1;

    let isShape = false;
    if (node.svgPath) {
      try {
        const svgContent = `<svg><path d="${node.svgPath}"></path></svg>`;
        const loader = new SVGLoader();
        const svgData = loader.parse(svgContent);

        if (svgData.paths.length > 0) {
          const shapes = svgData.paths[0].toShapes(true);
          if (shapes.length > 0) {
            const shape = shapes[0];
            const shapeGeo = new THREE.ShapeGeometry(shape);
            shapeGeo.computeBoundingBox();
            const bbox = shapeGeo.boundingBox;
            const posAttr = shapeGeo.attributes.position;
            const indexAttr = shapeGeo.index;

            isShape = true;

            const shapeIndices: number[] = [];

            console.log(`[FOLD-3D-V7-XY-FLIP] Panel: ${node.id}`, { bounds: node.bounds, bbox });
            for (let i = 0; i < posAttr.count; i++) {
              const px = posAttr.getX(i);
              const py = posAttr.getY(i);

              // Map ShapeGeometry local space into node.bounds using its bounding box.
              // This keeps non-rectangular tabs (e.g. trapezoids) proportional.
              const bx0 = bbox?.min.x ?? 0;
              const by0 = bbox?.min.y ?? 0;
              const bw = Math.max(1e-6, (bbox?.max.x ?? 1) - bx0);
              const bh = Math.max(1e-6, (bbox?.max.y ?? 1) - by0);

              const nx = 1 - (px - bx0) / bw;
              const ny = 1 - (py - by0) / bh;

              const localX = nx * node.bounds.width;
              const localY = ny * node.bounds.height;
              const absX = node.bounds.x + localX;
              const absY = node.bounds.y + localY;

              const modelX = (absX + offset.x - alignOffset.x) * scale;
              const modelY = -(absY + offset.y - alignOffset.y) * scale;

              // Use Original Layout for UVs
              const uLayout = (absX - bounds.minX) / bounds.width;
              const vLayout = 1 - (absY - bounds.minY) / bounds.height;
              let finalU = uLayout;
              let finalV = vLayout;
              if (region) {
                const uLocal = node.bounds.width > 0 ? (localX / node.bounds.width) : 0;
                const vLocal = node.bounds.height > 0 ? (localY / node.bounds.height) : 0;
                finalU = region.uv.u0 + uLocal * (region.uv.u1 - region.uv.u0);
                finalV = region.uv.v0 + (1 - vLocal) * (region.uv.v1 - region.uv.v0);
              }

              const zOffset = (config.thickness || 1) / 2;
              addVertex([modelX, modelY, zOffset], [finalU, finalV], [0, 0, 1], boneIdx);
            }

            // Build Indices
            const startIdx = vertexCount - posAttr.count;
            if (indexAttr) {
              for (let i = 0; i < indexAttr.count; i++) frontIndices.push(startIdx + indexAttr.getX(i));
            } else {
              for (let i = 0; i < posAttr.count; i++) shapeIndices.push(i);
              for (let i = 0; i < shapeIndices.length; i += 3) {
                frontIndices.push(startIdx + shapeIndices[i]);
                frontIndices.push(startIdx + shapeIndices[i + 1]);
                frontIndices.push(startIdx + shapeIndices[i + 2]);
              }
            }

            // Back Geometry...
            const backStartIdxVertex = vertexCount;
            // Iterate again for Back Vertices
            for (let i = 0; i < posAttr.count; i++) {
              const px = posAttr.getX(i);
              const py = posAttr.getY(i);
              const bx0 = bbox?.min.x ?? 0;
              const by0 = bbox?.min.y ?? 0;
              const bw = Math.max(1e-6, (bbox?.max.x ?? 1) - bx0);
              const bh = Math.max(1e-6, (bbox?.max.y ?? 1) - by0);

              const nx = 1 - (px - bx0) / bw;
              const ny = 1 - (py - by0) / bh;

              const localX = nx * node.bounds.width;
              const localY = ny * node.bounds.height;
              const absX = node.bounds.x + localX;
              const absY = node.bounds.y + localY;
              const zOffset = (config.thickness || 1) / 2;
              // Back Vertices
              const modelX = (absX + offset.x - alignOffset.x) * scale;
              const modelY = -(absY + offset.y - alignOffset.y) * scale;
              addVertex([modelX, modelY, -zOffset], [0, 0], [0, 0, -1], boneIdx);
            }

            // Back Indices
            // Note: indices must be relative to the vertexCount at time of pushing?
            // Buffers are flat.
            // If I reuse `shapeIndices`, I must offset effectively.
            // `backStartIdxVertex` is the index of first Back Vertex.
            // shapeIndices are 0-based.
            // But shape indices describe topology.
            // Topology is same. Winding is CW.
            if (indexAttr) {
              for (let i = 0; i < indexAttr.count; i += 3) {
                const a = indexAttr.getX(i);
                const b = indexAttr.getX(i + 1);
                const c = indexAttr.getX(i + 2);
                // CW: a, c, b
                backIndices.push(backStartIdxVertex + a, backStartIdxVertex + c, backStartIdxVertex + b);
              }
            } else {
              for (let i = 0; i < shapeIndices.length; i += 3) {
                const a = shapeIndices[i];
                const b = shapeIndices[i + 1];
                const c = shapeIndices[i + 2];
                backIndices.push(backStartIdxVertex + a, backStartIdxVertex + c, backStartIdxVertex + b);
              }
            }
          }
        }
      } catch (e) {
        console.warn('SVG Path parsing failed, falling back to rect:', e);
        isShape = false;
      }
    }

    if (!isShape) {
      // --- Rect Fallback (Model Space) ---
      const frontStartIdx = vertexCount;
      const zOffset = (config.thickness || 1) / 2;
      // Front (Anti-Clockwise)
      addVertex([lx0, ly0, zOffset], [finalU0, finalV0], [0, 0, 1], boneIdx); // 0: TL
      addVertex([lx1, ly0, zOffset], [finalU1, finalV0], [0, 0, 1], boneIdx); // 1: TR
      addVertex([lx1, ly1, zOffset], [finalU1, finalV1], [0, 0, 1], boneIdx); // 2: BR
      addVertex([lx0, ly1, zOffset], [finalU0, finalV1], [0, 0, 1], boneIdx); // 3: BL

      frontIndices.push(frontStartIdx, frontStartIdx + 2, frontStartIdx + 1); // 0, 2, 1
      frontIndices.push(frontStartIdx, frontStartIdx + 3, frontStartIdx + 2); // 0, 3, 2

      const backStartIdx = vertexCount;
      addVertex([lx0, ly0, -zOffset], [0, 0], [0, 0, -1], boneIdx);
      addVertex([lx1, ly0, -zOffset], [0, 0], [0, 0, -1], boneIdx);
      addVertex([lx1, ly1, -zOffset], [0, 0], [0, 0, -1], boneIdx);
      addVertex([lx0, ly1, -zOffset], [0, 0], [0, 0, -1], boneIdx);

      // CW
      backIndices.push(backStartIdx, backStartIdx + 1, backStartIdx + 2);
      backIndices.push(backStartIdx, backStartIdx + 2, backStartIdx + 3);
    }
  };

  // 递归处理节点
  let isFirstPanel = true;
  const processNode = (node: PanelNode, parentNode: PanelNode | null) => {
    generatePanel(node, isFirstPanel);

    // 生成连接关节
    if (node.jointInfo && node.parentId && parentNode) {
      const parentBoneIdx = boneIndexMap.get(node.parentId) ?? 0;
      const myBoneIdx = boneIndexMap.get(node.id) ?? 0;
      generateJoint(node, myBoneIdx, parentBoneIdx, parentNode.bounds);
    }

    isFirstPanel = false;
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

  const allIndices = [...frontIndices, ...backIndices];
  geometry.setIndex(allIndices);

  geometry.clearGroups();
  geometry.addGroup(0, frontIndices.length, 0);
  geometry.addGroup(frontIndices.length, backIndices.length, 1);

  // 🔧 修复：不再使用自动计算法线，使用我们手动设置的精确法线（[0,0,1] 和 [0,0,-1]）
  // geometry.computeVertexNormals();

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
  jointSegments = 16,
  scale = 1,
  materialProps = {},
  showSkeleton = false,
  showWireframe = false,
  foldTimings: customTimings,
  jointInterpolation = 'arc',
  gapSizeMultiplier = 1.0,
  baseWidth = 2.0,
  originX = 0, // 🆕 通过 Props 接收归一化原点
  originY = 0,
  creaseCurvature = 1.0,
  xAxisMultiplier = 1.0,
  yAxisMultiplier = 1.15,
  nestingFactor = 0.15,
}) => {
  const meshRef = useRef<THREE.SkinnedMesh>(null);

  // 构建所有数据
  const meshData = useMemo(() => {
    // 🆕 组装动态让位算法配置
    const allowanceConfig: AllowanceConfig = {
      thickness,
      baseWidth,
      xAxisMultiplier,
      yAxisMultiplier,
      nestingFactor: nestingFactor * (gapSizeMultiplier || 1.0)
    };

    // 🆕 Calculate Dynamic Tree Offsets & GapSizes FIRST
    const { offsets, gapSizes } = calculateTreeOffsets(panelTree, allowanceConfig);

    // 🆕 Calculate Expanded Bounds (Used for UV and Origin Normalization)
    const bounds = calculateBounds(panelTree, offsets);

    const skeletonBuilder = new SkeletonBuilder();
    // Pass offsets and alignOffset to skeleton builder
    const skeletonResult = skeletonBuilder.build(panelTree, scale, offsets, { x: originX, y: originY });

    const geometry = buildStitchedGeometry(
      panelTree,
      skeletonResult.boneIndexMap,
      skeletonResult.boneWorldPositions,
      bounds,
      { thickness, jointSegments, cornerRadius, scale, jointInterpolation, gapSizes, offsets, creaseCurvature, alignOffset: { x: originX, y: originY } },
      externalAtlas?.regions
    );

    const texture = externalAtlas?.texture || createPlaceholderTexture(panelTree, bounds);
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
  }, [panelTree, externalAtlas, thickness, cornerRadius, jointSegments, customTimings, scale, jointInterpolation, gapSizeMultiplier, baseWidth, originX, originY, creaseCurvature, xAxisMultiplier, yAxisMultiplier, nestingFactor]);

  // 绑定骨骼 - 确保骨骼矩阵最新
  useLayoutEffect(() => {
    if (!meshRef.current || !meshData.skeleton) return;

    // 计算并更新逆变换矩阵
    meshData.skeleton.calculateInverses();
    meshRef.current.updateMatrixWorld(true);
    console.log('🦴 骨骼系统同步完成');
  }, [meshData]);

  // 更新骨骼旋转 (Explicit State Loop)
  useFrame(() => {
    if (!meshData.bones || !meshData.timings) return;

    // PERFORMANCE: Read directly from Ref if available to avoid React Render Cycle
    const progressValue = typeof foldProgress === 'number' ? foldProgress : foldProgress.current;

    updateBoneRotations(
      panelTree,
      meshData.bones,
      meshData.boneIndexMap,
      meshData.timings,
      progressValue
    );
  });

  const {
    roughness = 0.85,
    metalness = 0.05,
    color = '#ffffff',
    metalnessMap,
    roughnessMap,
    clearcoatMap,
    clearcoat = 0,
    clearcoatRoughness = 0.1,
  } = materialProps;

  // 创建多材质（正面贴图，背面白色）
  const materials = useMemo(() => {
    // Material 0: Front (Textured, PBR)
    const frontMat = new THREE.MeshPhysicalMaterial({
      map: meshData.texture,
      color: color,
      roughness: roughness,
      metalness: metalness,
      ...(metalnessMap ? { metalnessMap } : {}),
      ...(roughnessMap ? { roughnessMap } : {}),
      ...(clearcoatMap ? { clearcoatMap } : {}),
      clearcoat: clearcoat,
      clearcoatRoughness: clearcoatRoughness,
      side: THREE.FrontSide,  // 🔧 修复：不再使用 DoubleSide，解决正反面 Z-fighting
      shadowSide: THREE.DoubleSide,
      transparent: true,
      alphaTest: 0.01,
      wireframe: showWireframe,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    });

    // Material 1: Back (White, Clean)
    const backMat = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.8,
      metalness: 0.0,
      side: THREE.FrontSide,  // 🔧 修复：由背面顶点绕向决定显示，防正面可见导致的闪烁
      shadowSide: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: 1,
    });

    return [frontMat, backMat];
  }, [meshData.texture, color, roughness, metalness, clearcoat, clearcoatRoughness, metalnessMap, roughnessMap, clearcoatMap, showWireframe]);

  // 更新材质属性
  useEffect(() => {
    const [frontMat] = materials;
    if (frontMat) {
      const pbr = frontMat as THREE.MeshPhysicalMaterial;
      pbr.roughness = roughness;
      pbr.metalness = metalness;
      pbr.clearcoat = clearcoat;
      pbr.clearcoatRoughness = clearcoatRoughness;
      pbr.color.set(color);
      pbr.needsUpdate = true;
    }
  }, [materials, roughness, metalness, clearcoat, clearcoatRoughness, color]);

  return (
    <group>
      {meshData.geometry && meshData.skeleton && (
        <skinnedMesh
          ref={meshRef}
          frustumCulled={false}
          geometry={meshData.geometry}
          skeleton={meshData.skeleton} // 🔧 关键修复：显式传递 skeleton，防 Center 测量时崩溃
          material={materials}
          castShadow
          receiveShadow
        >
          {meshData.rootBone && <primitive object={meshData.rootBone} />}
        </skinnedMesh>
      )}

      {showSkeleton && meshData.rootBone && (
        <primitive object={new THREE.SkeletonHelper(meshData.rootBone)} />
      )}
    </group>
  );
};

// ... keep existing helpers ...
function createPlaceholderTexture(root: PanelNode, bounds: ReturnType<typeof calculateBounds>): THREE.Texture {
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

function updateBoneRotations(root: PanelNode, bones: THREE.Bone[], boneIndexMap: Map<string, number>, timings: FoldTimingConfig[], progress: number): void {
  const timingMap = new Map(timings.map(t => [t.panelId, t]));

  const updateNode = (node: PanelNode, parentNode: PanelNode | null) => {
    const boneIndex = boneIndexMap.get(node.id);
    if (boneIndex === undefined) return;

    const bone = bones[boneIndex];
    if (!bone) return;

    bone.rotation.set(0, 0, 0);

    const timing = timingMap.get(node.id);
    const joint = node.jointInfo;

    if (joint && parentNode && timing) {
      let foldDirection: number;
      if (joint.type === 'horizontal') {
        // Correct Logic: Bottom (y > parent) -> -1 (Rotate -90 X to bring -Y to +Z)
        // Top (y < parent) -> 1 (Rotate +90 X to bring +Y to +Z)
        foldDirection = node.bounds.y > parentNode.bounds.y ? -1 : 1;
      } else {
        // Vertical
        foldDirection = node.bounds.x > parentNode.bounds.x ? -1 : 1;
      }

      const maxAngle = (Math.PI / 2) * foldDirection;
      const angle = calculateFoldAngle(progress, timing, maxAngle);

      if (joint.type === 'horizontal') {
        bone.rotation.x = angle;
      } else {
        bone.rotation.y = angle;
      }
    }
    node.children.forEach(child => updateNode(child, node));
  };
  updateNode(root, null);
}
