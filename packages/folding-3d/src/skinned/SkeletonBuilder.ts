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
  private offsets: Map<string, { x: number; y: number }> = new Map();

  build(root: PanelNode, scale: number = 1, offsets?: Map<string, { x: number; y: number }>): SkeletonBuildResult {
    this.bones = [];
    this.boneIndexMap.clear();
    this.bonePanelMap.clear();
    this.boneWorldPositions.clear();
    this.scale = scale;
    if (offsets) {
      this.offsets = offsets;
    } else {
      this.offsets.clear();
    }

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

    // 根骨骼在面板中心的 3D 位置（使用原始坐标 + 偏移）
    const offset = this.offsets.get(node.id) || { x: 0, y: 0 };
    const pos2D = { x: node.center.x + offset.x, y: node.center.y + offset.y };
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
    // 关节位置也需要加上父节点的偏移？！ 
    // 不，关节是连接Child和Parent的，JointPosition在逻辑上属于Parent边缘。
    // 但是我们对Parent进行了偏移，Joint也应该随Parent偏移。
    // 另外，Joint还要根据 "Gap" 进一步偏移？
    // 我们的 offsets Map 应该已经包含了 "所有面板的最终Shift"。
    // 
    // 这里的 getJointPosition 是为了计算 ChildBone 的位置。
    // ChildBone 通常放置在折叠线中心。
    // 在我们的Offset逻辑中，JointCenter 也被 Offset 了。
    // JointCenter' = OriginalJointCenter + ParentOffset + GapOffset.

    // 实际上，SkeletonBuilder 需要知道的是 "Child Bone" 在世界坐标中的位置。
    // 我们之前的逻辑：ChildBone Pos = Joint Pos。
    // 现在，ChildBone 代表 Child Panel 的 Pivot。
    // 我们希望 Pivot 依然位于 Joint 处吗？
    // 对，Child 绕着 Joint 旋转。
    // 这里的 Joint Position 必须是 "Shifted Joint Position"。

    // 我们没有直接传递 Shifted Joint Position，只传了 Panel Offsets。
    // 我们可以根据 Child Panel Offset 推算 Joint Position？
    // Child Panel Offset = Parent Offset + Gap + ...
    // Child Bone 应该位于 LayoutJointPos + ParentOffset + Gap (Half Way to Child).

    // 简化：
    // 我们假定 Child Bone 仍然位于 Child 的 "相对布局的边界"。
    // 但是为了方便，我们在 SkinnedFoldingMesh 里计算 offsets 时，
    // 顺便计算 "BonePositions" map 传进来可能更直接？
    // 这里我们先尝试用 Panel Offsets 推导。

    // 如果我们只偏移 Panel，不偏移 Bone，那么旋转中心就不对了。
    // 所以 Bone 必须偏移。

    // 假设：Joint 依附于 Parent。
    // 所以 JointBase = OriginalJoint + ParentOffset.
    // 然后 JointCenter = JointBase + GapDirection * GapSize.

    const parentId = node.parentId;
    const parentOffset = (parentId ? this.offsets.get(parentId) : undefined) || { x: 0, y: 0 };

    if (node.jointInfo) {
      const j = node.jointInfo;
      let baseX: number, baseY: number;

      if (j.type === 'horizontal') {
        baseX = j.position.x + j.length / 2;
        baseY = j.position.y;
      } else {
        baseX = j.position.x;
        baseY = j.position.y + j.length / 2;
      }

      // 修正：Joint位置的基础偏移跟随 Parent
      let finalX = baseX + parentOffset.x;
      let finalY = baseY + parentOffset.y;

      // 额外：增加 Gap 偏移 (推向 Child)
      // Child Offset = Parent Offset + GapVector * 2.
      // Joint Offset = Parent Offset + GapVector.
      // 我们能不能直接用 (ParentOffset + ChildOffset) / 2 ?
      // 只有当 Parent 和 Child 仅相差 Gap 时才成立。
      // 是的，offsets map 就是这么算的。

      const childOffset = this.offsets.get(node.id) || { x: 0, y: 0 };

      // 既然 offsets 包含了累积偏移，
      // Joint Center 应该位于 Parent Center (shifted) 和 Child Center (shifted) 之间的逻辑位置？
      // 不，Joint 是由 Layout 定义的。

      // 让我们用 (ParentOffset + ChildOffset) / 2 来近似 Joint 的偏移
      // 这是一个非常稳健的方法，因为它不需要知道 Gap 方向，
      // 只要 Child 是相对于 Parent 移动了 Gap * 2，那么中点就是 Gap * 1。
      const midOffsetX = (parentOffset.x + childOffset.x) / 2;
      const midOffsetY = (parentOffset.y + childOffset.y) / 2;

      return { x: baseX + midOffsetX, y: baseY + midOffsetY };
    }
    return { x: node.center.x + parentOffset.x, y: node.center.y + parentOffset.y };
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
