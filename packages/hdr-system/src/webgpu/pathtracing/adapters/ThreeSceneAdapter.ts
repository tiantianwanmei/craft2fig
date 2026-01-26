// ============================================================================
// ThreeSceneAdapter - Three.js 场景到路径追踪的适配器
// ============================================================================

import * as THREE from 'three';
import { Triangle, Material, Vec3 } from '../core';

export interface AdaptedScene {
  triangles: Triangle[];
  materials: Material[];
}

export class ThreeSceneAdapter {
  private materialMap = new Map<THREE.Material, number>();
  private materials: Material[] = [];
  private triangles: Triangle[] = [];

  /**
   * 将 Three.js 场景转换为路径追踪格式
   */
  adapt(scene: THREE.Scene): AdaptedScene {
    this.reset();
    this.traverseScene(scene);

    return {
      triangles: this.triangles,
      materials: this.materials,
    };
  }

  private reset(): void {
    this.materialMap.clear();
    this.materials = [];
    this.triangles = [];
  }

  private traverseScene(object: THREE.Object3D): void {
    if (object instanceof THREE.Mesh) {
      this.processMesh(object);
    }

    for (const child of object.children) {
      this.traverseScene(child);
    }
  }

  private processMesh(mesh: THREE.Mesh): void {
    const geometry = mesh.geometry;
    if (!geometry) return;

    // 获取或创建材质 ID
    const materialId = this.getOrCreateMaterial(mesh.material as THREE.Material);

    // 获取几何数据
    const positions = geometry.getAttribute('position');
    const normals = geometry.getAttribute('normal');
    const uvs = geometry.getAttribute('uv');
    const indices = geometry.index;

    if (!positions) return;

    // 世界变换矩阵
    mesh.updateMatrixWorld();
    const matrix = mesh.matrixWorld;
    const normalMatrix = new THREE.Matrix3().getNormalMatrix(matrix);

    // 处理三角形
    if (indices) {
      this.processIndexedGeometry(
        positions, normals, uvs, indices,
        matrix, normalMatrix, materialId
      );
    } else {
      this.processNonIndexedGeometry(
        positions, normals, uvs,
        matrix, normalMatrix, materialId
      );
    }
  }

  private processIndexedGeometry(
    positions: THREE.BufferAttribute,
    normals: THREE.BufferAttribute | null,
    uvs: THREE.BufferAttribute | null,
    indices: THREE.BufferAttribute,
    matrix: THREE.Matrix4,
    normalMatrix: THREE.Matrix3,
    materialId: number
  ): void {
    for (let i = 0; i < indices.count; i += 3) {
      const i0 = indices.getX(i);
      const i1 = indices.getX(i + 1);
      const i2 = indices.getX(i + 2);

      const tri = this.createTriangle(
        positions, normals, uvs,
        i0, i1, i2,
        matrix, normalMatrix, materialId
      );
      this.triangles.push(tri);
    }
  }

  private processNonIndexedGeometry(
    positions: THREE.BufferAttribute,
    normals: THREE.BufferAttribute | null,
    uvs: THREE.BufferAttribute | null,
    matrix: THREE.Matrix4,
    normalMatrix: THREE.Matrix3,
    materialId: number
  ): void {
    for (let i = 0; i < positions.count; i += 3) {
      const tri = this.createTriangle(
        positions, normals, uvs,
        i, i + 1, i + 2,
        matrix, normalMatrix, materialId
      );
      this.triangles.push(tri);
    }
  }

  private createTriangle(
    positions: THREE.BufferAttribute,
    normals: THREE.BufferAttribute | null,
    uvs: THREE.BufferAttribute | null,
    i0: number, i1: number, i2: number,
    matrix: THREE.Matrix4,
    normalMatrix: THREE.Matrix3,
    materialId: number
  ): Triangle {
    // 顶点位置
    const v0 = this.transformPoint(positions, i0, matrix);
    const v1 = this.transformPoint(positions, i1, matrix);
    const v2 = this.transformPoint(positions, i2, matrix);

    // 法线
    let n0: Vec3, n1: Vec3, n2: Vec3;
    if (normals) {
      n0 = this.transformNormal(normals, i0, normalMatrix);
      n1 = this.transformNormal(normals, i1, normalMatrix);
      n2 = this.transformNormal(normals, i2, normalMatrix);
    } else {
      const faceNormal = this.computeFaceNormal(v0, v1, v2);
      n0 = n1 = n2 = faceNormal;
    }

    // UV
    const uv0: [number, number] = uvs ? [uvs.getX(i0), uvs.getY(i0)] : [0, 0];
    const uv1: [number, number] = uvs ? [uvs.getX(i1), uvs.getY(i1)] : [0, 0];
    const uv2: [number, number] = uvs ? [uvs.getX(i2), uvs.getY(i2)] : [0, 0];

    return { v0, v1, v2, n0, n1, n2, uv0, uv1, uv2, materialId };
  }

  private transformPoint(
    attr: THREE.BufferAttribute,
    index: number,
    matrix: THREE.Matrix4
  ): Vec3 {
    const v = new THREE.Vector3(
      attr.getX(index),
      attr.getY(index),
      attr.getZ(index)
    );
    v.applyMatrix4(matrix);
    return { x: v.x, y: v.y, z: v.z };
  }

  private transformNormal(
    attr: THREE.BufferAttribute,
    index: number,
    normalMatrix: THREE.Matrix3
  ): Vec3 {
    const n = new THREE.Vector3(
      attr.getX(index),
      attr.getY(index),
      attr.getZ(index)
    );
    n.applyMatrix3(normalMatrix).normalize();
    return { x: n.x, y: n.y, z: n.z };
  }

  private computeFaceNormal(v0: Vec3, v1: Vec3, v2: Vec3): Vec3 {
    const e1 = { x: v1.x - v0.x, y: v1.y - v0.y, z: v1.z - v0.z };
    const e2 = { x: v2.x - v0.x, y: v2.y - v0.y, z: v2.z - v0.z };

    const n = {
      x: e1.y * e2.z - e1.z * e2.y,
      y: e1.z * e2.x - e1.x * e2.z,
      z: e1.x * e2.y - e1.y * e2.x,
    };

    const len = Math.sqrt(n.x * n.x + n.y * n.y + n.z * n.z);
    if (len > 0) {
      n.x /= len; n.y /= len; n.z /= len;
    }
    return n;
  }

  private getOrCreateMaterial(mat: THREE.Material): number {
    if (this.materialMap.has(mat)) {
      return this.materialMap.get(mat)!;
    }

    const id = this.materials.length;
    this.materialMap.set(mat, id);
    this.materials.push(this.convertMaterial(mat));
    return id;
  }

  private convertMaterial(mat: THREE.Material): Material {
    const defaultMat: Material = {
      albedo: [0.8, 0.8, 0.8],
      metallic: 0,
      roughness: 0.5,
      emission: [0, 0, 0],
      emissionStrength: 0,
      ior: 1.5,
      transmission: 0,
      clearcoat: 0,
      clearcoatRoughness: 0,
    };

    if (mat instanceof THREE.MeshStandardMaterial) {
      return this.convertStandardMaterial(mat);
    }
    if (mat instanceof THREE.MeshPhysicalMaterial) {
      return this.convertPhysicalMaterial(mat);
    }
    if (mat instanceof THREE.MeshBasicMaterial) {
      const c = mat.color;
      defaultMat.albedo = [c.r, c.g, c.b];
    }

    return defaultMat;
  }

  private convertStandardMaterial(mat: THREE.MeshStandardMaterial): Material {
    const c = mat.color;
    const e = mat.emissive;
    return {
      albedo: [c.r, c.g, c.b],
      metallic: mat.metalness,
      roughness: mat.roughness,
      emission: [e.r, e.g, e.b],
      emissionStrength: mat.emissiveIntensity,
      ior: 1.5,
      transmission: 0,
      clearcoat: 0,
      clearcoatRoughness: 0,
    };
  }

  private convertPhysicalMaterial(mat: THREE.MeshPhysicalMaterial): Material {
    const c = mat.color;
    const e = mat.emissive;
    return {
      albedo: [c.r, c.g, c.b],
      metallic: mat.metalness,
      roughness: mat.roughness,
      emission: [e.r, e.g, e.b],
      emissionStrength: mat.emissiveIntensity,
      ior: mat.ior,
      transmission: mat.transmission,
      clearcoat: mat.clearcoat,
      clearcoatRoughness: mat.clearcoatRoughness,
    };
  }
}

export default ThreeSceneAdapter;
