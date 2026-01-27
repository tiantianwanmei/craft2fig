/**
 * GeometryStitcher - 几何体缝合器
 * 将分散的面片缝合为单一 BufferGeometry，支持骨骼蒙皮
 */

import * as THREE from 'three';
import type {
  PanelNode,
  StitchConfig,
  StitchedGeometryResult,
  AtlasRegion,
} from './types';
import { createSVGPanelGeometry } from './SVGShapeGeometry';

/** 默认配置 */
const DEFAULT_STITCH_CONFIG: StitchConfig = {
  jointSegments: 8,
  cornerRadius: 2,
  thickness: 1,
  doubleSided: true,
};

/** 顶点缓冲数据 */
interface VertexBuffers {
  positions: number[];
  uvs: number[];
  normals: number[];
  skinIndices: number[];
  skinWeights: number[];
  indices: number[];
}

/**
 * 几何体缝合器
 */
export class GeometryStitcher {
  private config: StitchConfig;
  private buffers: VertexBuffers;
  private vertexCount: number = 0;
  private panelVertexRanges: Map<string, { start: number; count: number }> = new Map();

  constructor(config: Partial<StitchConfig> = {}) {
    this.config = { ...DEFAULT_STITCH_CONFIG, ...config };
    this.buffers = this.createEmptyBuffers();
  }

  private createEmptyBuffers(): VertexBuffers {
    return {
      positions: [],
      uvs: [],
      normals: [],
      skinIndices: [],
      skinWeights: [],
      indices: [],
    };
  }

  /**
   * 从面片树构建缝合几何体
   */
  build(
    root: PanelNode,
    regions: Map<string, AtlasRegion>,
    boneIndexMap: Map<string, number>
  ): StitchedGeometryResult {
    // 重置缓冲区
    this.buffers = this.createEmptyBuffers();
    this.vertexCount = 0;
    this.panelVertexRanges.clear();

    // 递归处理面片树
    this.processNode(root, regions, boneIndexMap, null);

    // 创建 BufferGeometry
    const geometry = this.createBufferGeometry();

    return {
      geometry,
      vertexCount: this.vertexCount,
      triangleCount: this.buffers.indices.length / 3,
      panelVertexRanges: this.panelVertexRanges,
    };
  }

  /**
   * 递归处理节点
   */
  private processNode(
    node: PanelNode,
    regions: Map<string, AtlasRegion>,
    boneIndexMap: Map<string, number>,
    parentNode: PanelNode | null
  ): void {
    const region = regions.get(node.id);
    const boneIndex = boneIndexMap.get(node.id) ?? 0;

    // 记录顶点范围起始
    const startVertex = this.vertexCount;

    // 1. 生成面片几何体
    if (region) {
      this.generatePanelGeometry(node, region, boneIndex);
    }

    // 2. 如果有父节点，生成关节带
    if (parentNode && node.jointInfo) {
      const parentBoneIndex = boneIndexMap.get(parentNode.id) ?? 0;
      const parentRegion = regions.get(parentNode.id);

      if (parentRegion) {
        this.generateJointGeometry(
          node,
          parentNode,
          region,
          parentRegion,
          boneIndex,
          parentBoneIndex
        );
      }
    }

    // 记录顶点范围
    this.panelVertexRanges.set(node.id, {
      start: startVertex,
      count: this.vertexCount - startVertex,
    });

    // 递归处理子节点
    for (const child of node.children) {
      this.processNode(child, regions, boneIndexMap, node);
    }
  }

  /**
   * 生成面片几何体 (支持 SVG 形状)
   */
  private generatePanelGeometry(
    node: PanelNode,
    region: AtlasRegion,
    boneIndex: number
  ): void {
    // 🆕 优先使用 SVG 路径（如果存在）
    if (node.svgPath) {
      this.generateSVGPanelGeometry(node, region, boneIndex);
      return;
    }

    // 回退到矩形几何体
    this.generateRectPanelGeometry(node, region, boneIndex);
  }

  /**
   * 生成 SVG 形状面片几何体
   */
  private generateSVGPanelGeometry(
    node: PanelNode,
    region: AtlasRegion,
    boneIndex: number
  ): void {
    const { bounds, svgPath } = node;
    const { thickness } = this.config;

    if (!svgPath) return;

    // 使用 SVG 工具创建几何体
    const { frontGeometry, backGeometry } = createSVGPanelGeometry(
      svgPath,
      bounds,
      region.uv,
      thickness
    );

    if (!frontGeometry) {
      console.warn(`Failed to create SVG geometry for panel ${node.id}, falling back to rect`);
      this.generateRectPanelGeometry(node, region, boneIndex);
      return;
    }

    // 添加正面几何体
    this.addGeometryToBuffers(frontGeometry, boneIndex);

    // 添加背面几何体（如果需要双面）
    if (this.config.doubleSided && backGeometry) {
      this.addGeometryToBuffers(backGeometry, boneIndex);
    }
  }

  /**
   * 生成矩形面片几何体（原始实现）
   */
  private generateRectPanelGeometry(
    node: PanelNode,
    region: AtlasRegion,
    boneIndex: number
  ): void {
    const { bounds } = node;
    const { thickness } = this.config;
    const halfThickness = thickness / 2;

    // 面片的四个角点 (3D 空间)
    const x0 = bounds.x;
    const y0 = bounds.y;
    const x1 = bounds.x + bounds.width;
    const y1 = bounds.y + bounds.height;

    // UV 坐标
    const { u0, v0, u1, v1 } = region.uv;

    // 正面顶点 (Z = halfThickness)
    const frontVertices = [
      { pos: [x0, y0, halfThickness], uv: [u0, v0] },
      { pos: [x1, y0, halfThickness], uv: [u1, v0] },
      { pos: [x1, y1, halfThickness], uv: [u1, v1] },
      { pos: [x0, y1, halfThickness], uv: [u0, v1] },
    ];

    const startIdx = this.vertexCount;

    // 添加正面顶点
    for (const v of frontVertices) {
      this.addVertex(
        v.pos as [number, number, number],
        v.uv as [number, number],
        [0, 0, 1],
        boneIndex,
        1.0
      );
    }

    // 正面三角形
    this.addTriangle(startIdx, startIdx + 1, startIdx + 2);
    this.addTriangle(startIdx, startIdx + 2, startIdx + 3);

    // 背面 (如果需要双面)
    if (this.config.doubleSided) {
      const backStartIdx = this.vertexCount;

      // 背面顶点 (Z = -halfThickness)
      const backVertices = [
        { pos: [x0, y0, -halfThickness], uv: [u0, v0] },
        { pos: [x1, y0, -halfThickness], uv: [u1, v0] },
        { pos: [x1, y1, -halfThickness], uv: [u1, v1] },
        { pos: [x0, y1, -halfThickness], uv: [u0, v1] },
      ];

      for (const v of backVertices) {
        this.addVertex(
          v.pos as [number, number, number],
          v.uv as [number, number],
          [0, 0, -1],
          boneIndex,
          1.0
        );
      }

      // 背面三角形 (反向绕序)
      this.addTriangle(backStartIdx, backStartIdx + 2, backStartIdx + 1);
      this.addTriangle(backStartIdx, backStartIdx + 3, backStartIdx + 2);
    }
  }

  /**
   * 将 BufferGeometry 添加到缓冲区
   */
  private addGeometryToBuffers(
    geometry: THREE.BufferGeometry,
    boneIndex: number
  ): void {
    const positions = geometry.getAttribute('position');
    const uvs = geometry.getAttribute('uv');
    const normals = geometry.getAttribute('normal');
    const indices = geometry.getIndex();

    if (!positions || !uvs || !normals || !indices) {
      console.warn('Geometry missing required attributes');
      return;
    }

    const vertexOffset = this.vertexCount;

    // 添加顶点数据
    for (let i = 0; i < positions.count; i++) {
      const pos: [number, number, number] = [
        positions.getX(i),
        positions.getY(i),
        positions.getZ(i),
      ];
      const uv: [number, number] = [
        uvs.getX(i),
        uvs.getY(i),
      ];
      const normal: [number, number, number] = [
        normals.getX(i),
        normals.getY(i),
        normals.getZ(i),
      ];

      this.addVertex(pos, uv, normal, boneIndex, 1.0);
    }

    // 添加索引
    const indexArray = indices.array;
    for (let i = 0; i < indexArray.length; i += 3) {
      this.addTriangle(
        vertexOffset + indexArray[i],
        vertexOffset + indexArray[i + 1],
        vertexOffset + indexArray[i + 2]
      );
    }
  }

  /**
   * 生成关节带几何体 (支持 gapSize 参数)
   */
  private generateJointGeometry(
    childNode: PanelNode,
    parentNode: PanelNode,
    childRegion: AtlasRegion | undefined,
    parentRegion: AtlasRegion,
    childBoneIndex: number,
    parentBoneIndex: number
  ): void {
    const joint = childNode.jointInfo;
    if (!joint) return;

    const { jointSegments } = this.config;

    // 🆕 优先使用 gapSize，回退到 joint.width 或 cornerRadius
    const jointWidth = joint.gapSize ?? joint.width ?? this.config.cornerRadius;
    const jointLength = joint.length;
    const jx = joint.position.x;
    const jy = joint.position.y;
    const isHorizontal = joint.type === 'horizontal';

    const startIdx = this.vertexCount;

    // 生成细分顶点
    for (let i = 0; i <= jointSegments; i++) {
      const t = i / jointSegments;
      const parentWeight = 1.0 - t;
      const childWeight = t;
      const offset = t * jointWidth;

      if (isHorizontal) {
        this.addJointVertexPair(
          jx, jy + offset, jointLength, true,
          parentBoneIndex, childBoneIndex,
          parentWeight, childWeight, parentRegion, t
        );
      } else {
        this.addJointVertexPair(
          jx + offset, jy, jointLength, false,
          parentBoneIndex, childBoneIndex,
          parentWeight, childWeight, parentRegion, t
        );
      }
    }

    // 生成三角形
    for (let i = 0; i < jointSegments; i++) {
      const idx0 = startIdx + i * 2;
      this.addTriangle(idx0, idx0 + 2, idx0 + 1);
      this.addTriangle(idx0 + 1, idx0 + 2, idx0 + 3);
    }
  }

  private addJointVertexPair(
    x: number, y: number, length: number, isHorizontal: boolean,
    parentBone: number, childBone: number,
    parentW: number, childW: number,
    region: AtlasRegion, t: number
  ): void {
    const z = this.config.thickness / 2;

    if (isHorizontal) {
      this.addVertexWithDualBones(
        [x, y, z],
        [region.uv.u0, region.uv.v0 + t * (region.uv.v1 - region.uv.v0)],
        [0, 0, 1], parentBone, childBone, parentW, childW
      );
      this.addVertexWithDualBones(
        [x + length, y, z],
        [region.uv.u1, region.uv.v0 + t * (region.uv.v1 - region.uv.v0)],
        [0, 0, 1], parentBone, childBone, parentW, childW
      );
    } else {
      this.addVertexWithDualBones(
        [x, y, z],
        [region.uv.u0 + t * (region.uv.u1 - region.uv.u0), region.uv.v0],
        [0, 0, 1], parentBone, childBone, parentW, childW
      );
      this.addVertexWithDualBones(
        [x, y + length, z],
        [region.uv.u0 + t * (region.uv.u1 - region.uv.u0), region.uv.v1],
        [0, 0, 1], parentBone, childBone, parentW, childW
      );
    }
  }

  /**
   * 添加单骨骼顶点
   */
  private addVertex(
    pos: [number, number, number],
    uv: [number, number],
    normal: [number, number, number],
    boneIndex: number,
    weight: number
  ): void {
    this.buffers.positions.push(...pos);
    this.buffers.uvs.push(...uv);
    this.buffers.normals.push(...normal);
    this.buffers.skinIndices.push(boneIndex, 0, 0, 0);
    this.buffers.skinWeights.push(weight, 0, 0, 0);
    this.vertexCount++;
  }

  /**
   * 添加双骨骼顶点 (用于关节带)
   */
  private addVertexWithDualBones(
    pos: [number, number, number],
    uv: [number, number],
    normal: [number, number, number],
    bone1: number, bone2: number,
    weight1: number, weight2: number
  ): void {
    this.buffers.positions.push(...pos);
    this.buffers.uvs.push(...uv);
    this.buffers.normals.push(...normal);
    this.buffers.skinIndices.push(bone1, bone2, 0, 0);
    this.buffers.skinWeights.push(weight1, weight2, 0, 0);
    this.vertexCount++;
  }

  /**
   * 添加三角形索引
   */
  private addTriangle(a: number, b: number, c: number): void {
    this.buffers.indices.push(a, b, c);
  }

  /**
   * 创建 BufferGeometry
   */
  private createBufferGeometry(): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry();

    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(this.buffers.positions, 3)
    );
    geometry.setAttribute(
      'uv',
      new THREE.Float32BufferAttribute(this.buffers.uvs, 2)
    );
    geometry.setAttribute(
      'normal',
      new THREE.Float32BufferAttribute(this.buffers.normals, 3)
    );
    geometry.setAttribute(
      'skinIndex',
      new THREE.Uint16BufferAttribute(this.buffers.skinIndices, 4)
    );
    geometry.setAttribute(
      'skinWeight',
      new THREE.Float32BufferAttribute(this.buffers.skinWeights, 4)
    );
    geometry.setIndex(this.buffers.indices);

    geometry.computeVertexNormals();

    return geometry;
  }
}