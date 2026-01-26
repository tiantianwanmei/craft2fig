// ============================================================================
// BVH Builder - 边界体积层次结构构建器
// ============================================================================

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Triangle {
  v0: Vec3;
  v1: Vec3;
  v2: Vec3;
  n0: Vec3;
  n1: Vec3;
  n2: Vec3;
  uv0: [number, number];
  uv1: [number, number];
  uv2: [number, number];
  materialId: number;
  centroid?: Vec3;
}

export interface BVHNode {
  minBounds: Vec3;
  maxBounds: Vec3;
  leftFirst: number;
  triCount: number;
}

export interface BVHBuildResult {
  nodes: BVHNode[];
  triangles: Triangle[];
}

// AABB 边界盒
class AABB {
  min: Vec3;
  max: Vec3;

  constructor() {
    this.min = { x: Infinity, y: Infinity, z: Infinity };
    this.max = { x: -Infinity, y: -Infinity, z: -Infinity };
  }

  expand(point: Vec3): void {
    this.min.x = Math.min(this.min.x, point.x);
    this.min.y = Math.min(this.min.y, point.y);
    this.min.z = Math.min(this.min.z, point.z);
    this.max.x = Math.max(this.max.x, point.x);
    this.max.y = Math.max(this.max.y, point.y);
    this.max.z = Math.max(this.max.z, point.z);
  }

  expandAABB(other: AABB): void {
    this.min.x = Math.min(this.min.x, other.min.x);
    this.min.y = Math.min(this.min.y, other.min.y);
    this.min.z = Math.min(this.min.z, other.min.z);
    this.max.x = Math.max(this.max.x, other.max.x);
    this.max.y = Math.max(this.max.y, other.max.y);
    this.max.z = Math.max(this.max.z, other.max.z);
  }

  surfaceArea(): number {
    const dx = this.max.x - this.min.x;
    const dy = this.max.y - this.min.y;
    const dz = this.max.z - this.min.z;
    return 2 * (dx * dy + dy * dz + dz * dx);
  }

  longestAxis(): number {
    const dx = this.max.x - this.min.x;
    const dy = this.max.y - this.min.y;
    const dz = this.max.z - this.min.z;
    if (dx > dy && dx > dz) return 0;
    if (dy > dz) return 1;
    return 2;
  }
}

export class BVHBuilder {
  private nodes: BVHNode[] = [];
  private triangles: Triangle[] = [];
  private triIndices: number[] = [];
  private maxLeafSize: number;

  constructor(maxLeafSize: number = 4) {
    this.maxLeafSize = maxLeafSize;
  }

  build(triangles: Triangle[]): BVHBuildResult {
    this.triangles = triangles;
    this.nodes = [];
    this.triIndices = triangles.map((_, i) => i);

    // 计算质心
    for (const tri of this.triangles) {
      tri.centroid = {
        x: (tri.v0.x + tri.v1.x + tri.v2.x) / 3,
        y: (tri.v0.y + tri.v1.y + tri.v2.y) / 3,
        z: (tri.v0.z + tri.v1.z + tri.v2.z) / 3,
      };
    }

    // 创建根节点
    const rootNode: BVHNode = {
      minBounds: { x: 0, y: 0, z: 0 },
      maxBounds: { x: 0, y: 0, z: 0 },
      leftFirst: 0,
      triCount: triangles.length,
    };
    this.nodes.push(rootNode);

    // 更新根节点边界
    this.updateNodeBounds(0);

    // 递归细分
    this.subdivide(0);

    // 重排三角形
    const reorderedTriangles = this.triIndices.map(i => this.triangles[i]);

    return {
      nodes: this.nodes,
      triangles: reorderedTriangles,
    };
  }

  private updateNodeBounds(nodeIdx: number): void {
    const node = this.nodes[nodeIdx];
    const bounds = new AABB();

    for (let i = 0; i < node.triCount; i++) {
      const triIdx = this.triIndices[node.leftFirst + i];
      const tri = this.triangles[triIdx];
      bounds.expand(tri.v0);
      bounds.expand(tri.v1);
      bounds.expand(tri.v2);
    }

    node.minBounds = bounds.min;
    node.maxBounds = bounds.max;
  }

  private subdivide(nodeIdx: number): void {
    const node = this.nodes[nodeIdx];

    // 叶子节点条件
    if (node.triCount <= this.maxLeafSize) {
      return;
    }

    // 找最佳分割
    const split = this.findBestSplit(nodeIdx);
    if (split.cost >= node.triCount) {
      return; // 不值得分割
    }

    // 分区三角形
    const pivot = this.partition(nodeIdx, split.axis, split.pos);

    // 创建子节点
    const leftCount = pivot - node.leftFirst;
    const rightCount = node.triCount - leftCount;

    if (leftCount === 0 || rightCount === 0) {
      return;
    }

    const leftChildIdx = this.nodes.length;
    const rightChildIdx = leftChildIdx + 1;

    this.nodes.push({
      minBounds: { x: 0, y: 0, z: 0 },
      maxBounds: { x: 0, y: 0, z: 0 },
      leftFirst: node.leftFirst,
      triCount: leftCount,
    });

    this.nodes.push({
      minBounds: { x: 0, y: 0, z: 0 },
      maxBounds: { x: 0, y: 0, z: 0 },
      leftFirst: pivot,
      triCount: rightCount,
    });

    // 更新当前节点为内部节点
    node.leftFirst = leftChildIdx;
    node.triCount = 0;

    // 更新子节点边界并递归
    this.updateNodeBounds(leftChildIdx);
    this.updateNodeBounds(rightChildIdx);
    this.subdivide(leftChildIdx);
    this.subdivide(rightChildIdx);
  }

  private findBestSplit(nodeIdx: number): { axis: number; pos: number; cost: number } {
    const node = this.nodes[nodeIdx];
    let bestCost = Infinity;
    let bestAxis = 0;
    let bestPos = 0;

    const BINS = 8;

    for (let axis = 0; axis < 3; axis++) {
      // 计算质心边界
      let minC = Infinity;
      let maxC = -Infinity;

      for (let i = 0; i < node.triCount; i++) {
        const triIdx = this.triIndices[node.leftFirst + i];
        const c = this.getCentroidComponent(triIdx, axis);
        minC = Math.min(minC, c);
        maxC = Math.max(maxC, c);
      }

      if (minC === maxC) continue;

      // 分箱
      const scale = BINS / (maxC - minC);
      const bins: { bounds: AABB; count: number }[] = [];
      for (let i = 0; i < BINS; i++) {
        bins.push({ bounds: new AABB(), count: 0 });
      }

      for (let i = 0; i < node.triCount; i++) {
        const triIdx = this.triIndices[node.leftFirst + i];
        const tri = this.triangles[triIdx];
        const c = this.getCentroidComponent(triIdx, axis);
        const binIdx = Math.min(BINS - 1, Math.floor((c - minC) * scale));
        bins[binIdx].count++;
        bins[binIdx].bounds.expand(tri.v0);
        bins[binIdx].bounds.expand(tri.v1);
        bins[binIdx].bounds.expand(tri.v2);
      }

      // 评估分割
      for (let i = 0; i < BINS - 1; i++) {
        const leftBounds = new AABB();
        const rightBounds = new AABB();
        let leftCount = 0;
        let rightCount = 0;

        for (let j = 0; j <= i; j++) {
          leftBounds.expandAABB(bins[j].bounds);
          leftCount += bins[j].count;
        }
        for (let j = i + 1; j < BINS; j++) {
          rightBounds.expandAABB(bins[j].bounds);
          rightCount += bins[j].count;
        }

        const cost = leftCount * leftBounds.surfaceArea() +
                     rightCount * rightBounds.surfaceArea();

        if (cost < bestCost) {
          bestCost = cost;
          bestAxis = axis;
          bestPos = minC + (i + 1) * (maxC - minC) / BINS;
        }
      }
    }

    return { axis: bestAxis, pos: bestPos, cost: bestCost };
  }

  private getCentroidComponent(triIdx: number, axis: number): number {
    const tri = this.triangles[triIdx];
    if (!tri.centroid) return 0;
    if (axis === 0) return tri.centroid.x;
    if (axis === 1) return tri.centroid.y;
    return tri.centroid.z;
  }

  private partition(nodeIdx: number, axis: number, pos: number): number {
    const node = this.nodes[nodeIdx];
    let i = node.leftFirst;
    let j = node.leftFirst + node.triCount - 1;

    while (i <= j) {
      const c = this.getCentroidComponent(this.triIndices[i], axis);
      if (c < pos) {
        i++;
      } else {
        [this.triIndices[i], this.triIndices[j]] =
          [this.triIndices[j], this.triIndices[i]];
        j--;
      }
    }

    return i;
  }
}

export default BVHBuilder;
