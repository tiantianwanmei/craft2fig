/**
 * SkeletonBuilder - 骨骼构建器
 *
 * 新坐标系方案：
 * - 所有骨骼位置直接使用 3D 世界坐标
 * - 3D 坐标 = (2D_x * scale, -2D_y * scale, 0)
 * - 根骨骼在面板中心的 3D 位置
 * - 子骨骼在折叠线中心的 3D 位置
 * - boneWorldPositions 存储 2D 像素坐标（用于顶点计算）
 */

import * as THREE from 'three';
import type { PanelNode, SkeletonBuildResult, Point2D } from './types';

export class SkeletonBuilder {
  private bones: THREE.Bone[] = [];
  private boneIndexMap: Map<string, number> = new Map();
  private bonePanelMap: Map<number, string> = new Map();
  private boneWorldPositions: Map<string, Point2D> = new Map();
  private scale: number = 1;

  build(root: PanelNode, scale: number = 1): SkeletonBuildResult {
    this.bones = [];
    this.boneIndexMap.clear();
    this.bonePanelMap.clear();
    this.boneWorldPositions.clear();
    this.scale = scale;

    // 创建根骨骼
    const rootBone = this.createRootBone(root);

    // 递归创建子骨骼
    this.createChildBones(root, rootBone);

    const skeleton = new THREE.Skeleton(this.bones);

    console.log('🦴 SkeletonBuilder:', {
      boneCount: this.bones.length,
      scale: this.scale,
      bones: this.bones.map(b => {
        const worldPos = this.boneWorldPositions.get(
          Array.from(this.boneIndexMap.entries())
            .find(([, idx]) => this.bones[idx] === b)?.[0] || ''
        );
        return `${b.name}: pos(${b.position.x.toFixed(1)}, ${b.position.y.toFixed(1)}) 2D(${worldPos?.x.toFixed(0)}, ${worldPos?.y.toFixed(0)})`;
      }),
    });

    return {
      skeleton,
      rootBone,
      bones: this.bones,
      boneIndexMap: this.boneIndexMap,
      bonePanelMap: this.bonePanelMap,
      boneWorldPositions: this.boneWorldPositions,
    };
  }

  private createRootBone(node: PanelNode): THREE.Bone {
    const bone = new THREE.Bone();
    bone.name = `bone_${node.id}`;

    // 根骨骼在面板中心的 3D 位置
    const pos2D = { x: node.center.x, y: node.center.y };
    bone.position.set(
      pos2D.x * this.scale,
      -pos2D.y * this.scale,
      0
    );

    this.registerBone(bone, node, pos2D);
    return bone;
  }

  private createChildBones(parentNode: PanelNode, parentBone: THREE.Bone): void {
    const parentPos2D = this.boneWorldPositions.get(parentNode.id)!;

    for (const child of parentNode.children) {
      const jointPos2D = this.getJointPosition(child);

      const bone = new THREE.Bone();
      bone.name = `bone_${child.id}`;

      // 子骨骼位置相对于父骨骼（在父骨骼的局部坐标系中）
      bone.position.set(
        (jointPos2D.x - parentPos2D.x) * this.scale,
        -(jointPos2D.y - parentPos2D.y) * this.scale,
        0
      );

      parentBone.add(bone);
      this.registerBone(bone, child, jointPos2D);

      this.createChildBones(child, bone);
    }
  }

  private getJointPosition(node: PanelNode): Point2D {
    if (node.jointInfo) {
      const j = node.jointInfo;
      if (j.type === 'horizontal') {
        return { x: j.position.x + j.length / 2, y: j.position.y };
      } else {
        return { x: j.position.x, y: j.position.y + j.length / 2 };
      }
    }
    return { x: node.center.x, y: node.center.y };
  }

  private registerBone(bone: THREE.Bone, node: PanelNode, pos2D: Point2D): void {
    const idx = this.bones.length;
    this.bones.push(bone);
    this.boneIndexMap.set(node.id, idx);
    this.bonePanelMap.set(idx, node.id);
    this.boneWorldPositions.set(node.id, pos2D);
    node.boneIndex = idx;
  }
}
