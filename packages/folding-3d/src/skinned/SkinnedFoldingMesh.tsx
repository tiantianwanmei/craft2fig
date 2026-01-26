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
// @ts-ignore
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader';

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
 * 计算骨骼的世界位置
 * 根骨骼在原点，子骨骼在折叠边中心
 * 必须与 SkeletonBuilder 完全一致！
 */
function calculateBoneWorldPosition(
  node: PanelNode,
  root: PanelNode
): { x: number; y: number } {
  // 根节点骨骼在原点
  if (node.id === root.id) {
    return { x: 0, y: 0 };
  }

  // 子节点骨骼在折叠边中心
  if (node.jointInfo) {
    const joint = node.jointInfo;
    if (joint.type === 'horizontal') {
      return {
        x: joint.position.x + joint.length / 2,
        y: joint.position.y,
      };
    } else {
      return {
        x: joint.position.x,
        y: joint.position.y + joint.length / 2,
      };
    }
  }

  // 没有 jointInfo，使用面板中心
  return { x: node.center.x, y: node.center.y };
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
  config: { thickness: number; jointSegments: number; cornerRadius: number; scale: number },
  regions?: Map<string, any> // AtlasRegion type
): THREE.BufferGeometry {
  const { scale } = config;

  const buffers: Buffers = {
    positions: [], uvs: [], normals: [],
    skinIndices: [], skinWeights: [], indices: [],
  };
  let vertexCount = 0;

  // 计算对齐偏移
  const rootBonePos = boneWorldPositions.get(root.id) || { x: 0, y: 0 };
  const rootCenter = {
    x: root.bounds.x + root.bounds.width / 2,
    y: root.bounds.y + root.bounds.height / 2
  };
  const alignOffset = {
    x: rootCenter.x - rootBonePos.x,
    y: rootCenter.y - rootBonePos.y
  };

  // 分离索引数组
  const frontIndices: number[] = [];
  const backIndices: number[] = [];

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

  const generatePanel = (node: PanelNode, isFirst: boolean = false) => {
    const { x, y, width, height } = node.bounds;
    const boneIdx = boneIndexMap.get(node.id) ?? 0;

    const rawBonePos = boneWorldPositions.get(node.id) || { x: 0, y: 0 };
    const bonePos2D = {
      x: rawBonePos.x + alignOffset.x,
      y: rawBonePos.y + alignOffset.y
    };

    const gapFix = 1.5;

    const lx0 = (x - gapFix - bonePos2D.x) * scale;
    const lx1 = (x + width + gapFix - bonePos2D.x) * scale;
    const ly0 = -(y - gapFix - bonePos2D.y) * scale;
    const ly1 = -(y + height + gapFix - bonePos2D.y) * scale;

    // UV 坐标 logic
    let u0, v0, u1, v1;

    // 优先使用 Atlas Region UV
    const region = regions?.get(node.id);
    if (region) {
      // TextureAtlasBuilder 已经处理好了 UV 映射
      u0 = region.uv.u0;
      u1 = region.uv.u1;
      v0 = region.uv.v0;
      v1 = region.uv.v1;
    } else {
      // 降级处理：使用 bound 计算
      u0 = (x - bounds.minX) / bounds.width;
      u1 = (x + width - bounds.minX) / bounds.width;
      v0 = (y - bounds.minY) / bounds.height;
      v1 = (y + height - bounds.minY) / bounds.height;
    }

    if (isFirst) {
      console.log(`🔍 generatePanel [${node.name}]:`, {
        bounds: { x, y, width, height },
        bonePos2D,
        scale,
        uvMode: region ? 'Atlas' : 'Fallback',
        uvs: { u0, v0, u1, v1 },
        hasSvgPath: !!node.svgPath,
      });
    }

    // --- Generate Geometry (Rect vs Shape) ---

    // 尝试使用 SVG 路径生成形状
    let shapeVertices: { pos: [number, number, number], uv: [number, number], normal: [number, number, number] }[] = [];
    let shapeIndices: number[] = [];
    let isShape = false;

    if (node.svgPath) {
      try {
        console.log(`📐 Parsing SVG Path for [${node.name}]:`, node.svgPath.slice(0, 50) + '...');
        // 创建一个简单的 SVG 字符串供解析
        // SVGLoader.parse 接受 SVG 字符串并返回 { paths }
        const svgContent = `<svg><path d="${node.svgPath}"></path></svg>`;
        const loader = new SVGLoader(); // 依赖 external SVGLoader import
        const svgData = loader.parse(svgContent);

        if (svgData.paths.length > 0) {
          // Flatten paths to shapes
          const shapes = svgData.paths[0].toShapes(true); // isCCW = true

          if (shapes.length > 0) {
            console.log(`  ✅ Shapes created: ${shapes.length}`);
            const shape = shapes[0];
            const shapeGeo = new THREE.ShapeGeometry(shape);
            const posAttr = shapeGeo.attributes.position;
            const indexAttr = shapeGeo.index;

            isShape = true;

            // ... (rest of the logic)
            for (let i = 0; i < posAttr.count; i++) {
              const px = posAttr.getX(i);
              const py = posAttr.getY(i); // SVG y 向下, ShapeGeometry 默认可能也是 y 向下(因为 SVG origin top-left)

              // 3D 局部坐标
              // 这里我们需要注意：node.svgPath 坐标是相对于 刀版图原点的绝对坐标吗？
              // 面板转换器是直接提取 layer.svgPreview / d.
              // 通常 Figma 输出的 SVG path d 坐标是相对于该 Layer 的 Bounding Box 还是 Frame Origin?
              // layer.svgPreview 通常是 exportLayerAsync 的结果，坐标可能是相对于 Layer 自身的 viewport (0,0)
              // 如果是相对于 Layer 自身 (0,0 -> width,height)，我们需要加上 bounds.x, bounds.y
              //
              // 假设：SVG path 坐标是相对于 Layer 自身左上角的。
              const absX = node.bounds.x + px;
              const absY = node.bounds.y + py;

              const lx = (absX - bonePos2D.x) * scale;
              const ly = -(absY - bonePos2D.y) * scale;

              // UV
              // 手动计算 UV (Flip X)
              const u_flipped = 1 - (absX - bounds.minX) / bounds.width;
              // V is standard
              const v_standard = (absY - bounds.minY) / bounds.height;

              let finalU = u_flipped;
              let finalV = v_standard;

              if (region) {
                finalU = region.uv.u0 + u_flipped * (region.uv.u1 - region.uv.u0);
                finalV = region.uv.v0 + v_standard * (region.uv.v1 - region.uv.v0);
              }

              shapeVertices.push({
                pos: [lx, ly, 0.005], // Z slightly forward
                uv: [finalU, finalV],
                normal: [0, 0, 1]
              });
            }

            // Indices
            if (indexAttr) {
              for (let i = 0; i < indexAttr.count; i++) {
                shapeIndices.push(indexAttr.getX(i));
              }
            } else {
              for (let i = 0; i < posAttr.count; i++) shapeIndices.push(i);
            }
          }
        }
      } catch (e) {
        console.warn('SVG Path parsing failed, falling back to rect:', e);
        isShape = false;
      }
    }

    if (isShape && shapeVertices.length > 0) {
      const startIdx = vertexCount;
      // Add Vertices (Front Z=0.005)
      shapeVertices.forEach(v => {
        addVertex(v.pos, v.uv, v.normal, boneIdx);
      });
      // Add Front Indices
      shapeIndices.forEach(idx => {
        frontIndices.push(startIdx + idx);
      });

      // Back Face Vertices (Z=-0.005)
      const backStartIdx = vertexCount;
      shapeVertices.forEach(v => {
        addVertex([v.pos[0], v.pos[1], -0.005], [0, 0], [0, 0, -1], boneIdx);
      });
      // Back Indices (Reverse winding)
      for (let i = 0; i < shapeIndices.length; i += 3) {
        backIndices.push(backStartIdx + shapeIndices[i]);
        backIndices.push(backStartIdx + shapeIndices[i + 2]);
        backIndices.push(backStartIdx + shapeIndices[i + 1]);
      }

    } else {
      // --- Rect Fallback (Existing Logic) ---
      // Front Face (Material 0)
      const frontStartIdx = vertexCount;
      addVertex([lx0, ly0, 0.005], [u1, v0], [0, 0, 1], boneIdx); // 左上 (u1, v0)
      addVertex([lx1, ly0, 0.005], [u0, v0], [0, 0, 1], boneIdx); // 右上 (u0, v0)
      addVertex([lx1, ly1, 0.005], [u0, v1], [0, 0, 1], boneIdx); // 右下 (u0, v1)
      addVertex([lx0, ly1, 0.005], [u1, v1], [0, 0, 1], boneIdx); // 左下 (u1, v1)

      // Add to front indices
      frontIndices.push(frontStartIdx, frontStartIdx + 1, frontStartIdx + 2);
      frontIndices.push(frontStartIdx, frontStartIdx + 2, frontStartIdx + 3);

      // Back Face (Material 1)
      const backStartIdx = vertexCount;
      addVertex([lx0, ly0, -0.005], [0, 0], [0, 0, -1], boneIdx);
      addVertex([lx1, ly0, -0.005], [0, 0], [0, 0, -1], boneIdx);
      addVertex([lx1, ly1, -0.005], [0, 0], [0, 0, -1], boneIdx);
      addVertex([lx0, ly1, -0.005], [0, 0], [0, 0, -1], boneIdx);

      // Add to back indices (reverse winding)
      backIndices.push(backStartIdx, backStartIdx + 2, backStartIdx + 1);
      backIndices.push(backStartIdx, backStartIdx + 3, backStartIdx + 2);
    }
  };

  // 递归处理节点
  let isFirstPanel = true;
  const processNode = (node: PanelNode) => {
    generatePanel(node, isFirstPanel);
    isFirstPanel = false;
    for (const child of node.children) {
      processNode(child);
    }
  };

  processNode(root);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(buffers.positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(buffers.uvs, 2));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(buffers.normals, 3));
  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(buffers.skinIndices, 4));
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(buffers.skinWeights, 4));

  // 合并索引：先 Front 后 Back
  const allIndices = [...frontIndices, ...backIndices];
  geometry.setIndex(allIndices);

  // 设置 Geometry Groups
  geometry.clearGroups();
  geometry.addGroup(0, frontIndices.length, 0); // Material 0: Front
  geometry.addGroup(frontIndices.length, backIndices.length, 1); // Material 1: Back

  geometry.computeVertexNormals();

  console.log(`🔧 几何体构建完成: ${vertexCount} 顶点, FrontTri: ${frontIndices.length / 3}, BackTri: ${backIndices.length / 3}`);

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
  scale = 1,
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

    // 2. 构建骨骼（传入 scale）
    const skeletonBuilder = new SkeletonBuilder();
    const skeletonResult = skeletonBuilder.build(panelTree, scale);

    // 3. 构建统一几何体 - 传入骨骼世界位置和 scale
    const geometry = buildStitchedGeometry(
      panelTree,
      skeletonResult.boneIndexMap,
      skeletonResult.boneWorldPositions,
      bounds,
      { thickness, jointSegments, cornerRadius, scale },
      externalAtlas?.regions // 传入区域映射
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
  }, [panelTree, externalAtlas, thickness, cornerRadius, jointSegments, customTimings, scale]);

  // 绑定骨骼
  useEffect(() => {
    if (meshRef.current && meshData.skeleton) {
      meshRef.current.add(meshData.rootBone);
      // 使用单位矩阵作为 bindMatrix，这样顶点的世界坐标就是初始位置
      const bindMatrix = new THREE.Matrix4();
      meshRef.current.bind(meshData.skeleton, bindMatrix);

      // 强制更新骨骼矩阵
      meshData.skeleton.calculateInverses();
      console.log('🔗 骨骼绑定完成，使用单位 bindMatrix');
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

  // 检查是否有 PBR 贴图
  const hasPBRMaps = !!(metalnessMap || roughnessMap || clearcoatMap);

  // 🔍 调试：打印 PBR 贴图接收情况
  useEffect(() => {
    console.log('🎨 SkinnedFoldingMesh - materialProps 更新:', {
      roughness,
      metalness,
      clearcoat,
      clearcoatRoughness,
      hasPBRMaps,
      hasMetalnessMap: !!metalnessMap,
      hasRoughnessMap: !!roughnessMap,
      hasClearcoatMap: !!clearcoatMap,
    });
  }, [roughness, metalness, clearcoat, clearcoatRoughness, hasPBRMaps, metalnessMap, roughnessMap, clearcoatMap]);

  // 创建多材质（正面贴图，背面白色）
  const materials = useMemo(() => {
    // Material 0: Front (Textured, PBR)
    const frontMat = new THREE.MeshPhysicalMaterial({
      map: meshData.texture,
      color: color,
      roughness: roughness,
      metalness: metalness,
      metalnessMap: metalnessMap ?? undefined,
      roughnessMap: roughnessMap ?? undefined,
      clearcoatMap: clearcoatMap ?? undefined,
      clearcoat: clearcoat,
      clearcoatRoughness: clearcoatRoughness,
      side: THREE.FrontSide, // 只渲染正面
      transparent: true,
      alphaTest: 0.01,
      wireframe: showWireframe,
      // 启用 polygonOffset 防止 Z-fighting (如果 back face 和 front face 距离太近)
      polygonOffset: true,
      polygonOffsetFactor: -1,
    });

    // Material 1: Back (White, Clean)
    const backMat = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.8,
      metalness: 0.0,
      side: THREE.FrontSide, // 因为是独立几何体，使用 FrontSide
      polygonOffset: true,
      polygonOffsetFactor: 1, // 推后一点
    });

    return [frontMat, backMat];
  }, [meshData.texture, color, roughness, metalness, clearcoat, metalnessMap, showWireframe]);

  // 更新材质属性
  useEffect(() => {
    const [frontMat] = materials;
    if (frontMat) {
      frontMat.roughness = roughness;
      frontMat.metalness = metalness;
      frontMat.clearcoat = clearcoat;
      frontMat.clearcoatRoughness = clearcoatRoughness;
      frontMat.color.set(color);
      frontMat.needsUpdate = true;
    }
  }, [materials, roughness, metalness, clearcoat, clearcoatRoughness, color]);

  return (
    <group>
      <skinnedMesh
        ref={meshRef}
        geometry={meshData.geometry}
        material={materials}
        castShadow
        receiveShadow
      />

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

/**
 * 更新骨骼旋转
 *
 * 坐标系: X=宽度(2D x), Y=高度(2D y), Z=厚度
 * - 水平折叠线(沿X轴): 绕 X 轴旋转
 * - 垂直折叠线(沿Y轴): 绕 Y 轴旋转
 */
function updateBoneRotations(
  root: PanelNode,
  bones: THREE.Bone[],
  boneIndexMap: Map<string, number>,
  timings: FoldTimingConfig[],
  progress: number
): void {
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
        // 水平折叠线：3D中 Y 向上
        // 2D中子面板在下方(y更大) -> 3D中子面板在下方(Y更小)，向后折(-1)
        // 2D中子面板在上方(y更小) -> 3D中子面板在上方(Y更大)，向前折(+1)
        foldDirection = node.bounds.y > parentNode.bounds.y ? -1 : 1;
      } else {
        // 垂直折叠线：子面板在右边(x更大)向后折，在左边向前折
        foldDirection = node.bounds.x > parentNode.bounds.x ? -1 : 1;
      }

      const maxAngle = (Math.PI / 2) * foldDirection;
      const angle = calculateFoldAngle(progress, timing, maxAngle);

      if (joint.type === 'horizontal') {
        // 水平折叠线：绕 X 轴旋转
        bone.rotation.x = angle;
      } else {
        // 垂直折叠线：绕 Y 轴旋转
        bone.rotation.y = angle;
      }
    }

    // 递归处理子节点
    node.children.forEach(child => updateNode(child, node));
  };

  updateNode(root, null);
}
