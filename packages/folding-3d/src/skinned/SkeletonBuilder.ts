/**
 * SkeletonBuilder - 骨骼构建器
 * 从面片树自动生成骨骼层级结构
 */

import * as THREE from 'three';
import type { PanelNode, SkeletonBuildResult } from './types';

/**
 * 骨骼构建器
 */
export class SkeletonBuilder {
  private bones: THREE.Bone[] = [];
  private boneIndexMap: Map<string, number> = new Map();
  private bonePanelMap: Map<number, string> = new Map();

  /**
   * 从面片树构建骨骼
   */
  build(root: PanelNode): SkeletonBuildResult {
    this.bones = [];
    this.boneIndexMap.clear();
    this.bonePanelMap.clear();

    // 创建根骨骼
    const rootBone = this.createBone(root, null);

    // 递归创建子骨骼
    this.createChildBones(root, rootBone);

    // 创建 Skeleton
    const skeleton = new THREE.Skeleton(this.bones);

    return {
      skeleton,
      rootBone,
      bones: this.bones,
      boneIndexMap: this.boneIndexMap,
      bonePanelMap: this.bonePanelMap,
    };
  }

  /**
   * 创建单个骨骼
   */
  private createBone(node: PanelNode, parent: THREE.Bone | null): THREE.Bone {
    const bone = new THREE.Bone();
    bone.name = `bone_${node.id}`;

    // 计算骨骼位置 (折痕中心点)
    if (node.jointInfo) {
      const joint = node.jointInfo;
      bone.position.set(
        joint.position.x + (joint.type === 'vertical' ? joint.width / 2 : 0),
        joint.position.y + (joint.type === 'horizontal' ? joint.width / 2 : 0),
        0
      );
    } else {
      // 根骨骼放在面片中心
      bone.position.set(node.center.x, node.center.y, 0);
    }

    // 添加到父骨骼
    if (parent) {
      parent.add(bone);
    }

    // 记录映射
    const boneIndex = this.bones.length;
    this.bones.push(bone);
    this.boneIndexMap.set(node.id, boneIndex);
    this.bonePanelMap.set(boneIndex, node.id);

    // 更新节点的骨骼索引
    node.boneIndex = boneIndex;

    return bone;
  }

  /**
   * 递归创建子骨骼
   */
  private createChildBones(node: PanelNode, parentBone: THREE.Bone): void {
    for (const child of node.children) {
      const childBone = this.createBone(child, parentBone);
      this.createChildBones(child, childBone);
    }
  }

  /**
   * 获取骨骼索引映射
   */
  getBoneIndexMap(): Map<string, number> {
    return this.boneIndexMap;
  }

  /**
   * 获取骨骼数组
   */
  getBones(): THREE.Bone[] {
    return this.bones;
  }
}