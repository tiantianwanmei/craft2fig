/**
 * 🎯 NestedGroupFold - 嵌套 Group 折叠组件
 *
 * 基于 2026-01-23 项目的成功方案：
 * - 使用嵌套 <group> 结构实现正确的链式折叠
 * - 外层 group: position = 折叠边位置
 * - 内层 group: pivotOffset = 面板中心到折叠边的偏移
 * - 使用 Quaternion 实现旋转
 */

import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { MarkedLayer } from '../../types/core';

// 面板数据接口
interface PanelData {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

// 折叠边数据
interface FoldEdge {
  type: 'horizontal' | 'vertical';
  position: number;
  start: number;
  end: number;
  parentId: string;
  childId: string;
}

// 3D节点数据
interface Node3D {
  id: string;
  panel: PanelData;
  // 折叠边位置（group position）
  foldEdgePos: THREE.Vector3;
  // 枢轴偏移（面板中心相对于折叠边）
  pivotOffset: THREE.Vector3;
  // 旋转轴
  rotationAxis: THREE.Vector3;
  // 折叠方向（1 或 -1）
  foldDirection: number;
  // 子节点
  children: Node3D[];
}

interface NestedGroupFoldProps {
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
 * 增加容差值以处理浮点精度问题
 */
function detectSharedEdge(
  panel1: PanelData,
  panel2: PanelData,
  tolerance: number = 10  // 增加容差值从 2 到 10
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

/**
 * 单个面板的3D渲染组件
 */
const Panel3D: React.FC<{
  node: Node3D;
  foldProgress: number;
  scale: number;
  thickness: number;
}> = ({ node, foldProgress, scale, thickness }) => {
  const groupRef = useRef<THREE.Group>(null);

  // 计算当前折叠角度
  const foldAngle = foldProgress * (Math.PI / 2) * node.foldDirection;

  // 使用 useFrame 更新旋转
  useFrame(() => {
    if (groupRef.current) {
      const quaternion = new THREE.Quaternion();
      quaternion.setFromAxisAngle(node.rotationAxis, foldAngle);
      groupRef.current.quaternion.copy(quaternion);
    }
  });

  const width = node.panel.width * scale;
  const height = node.panel.height * scale;

  return (
    <group ref={groupRef} position={node.foldEdgePos}>
      {/* 枢轴偏移 - 让面板绕折叠边旋转 */}
      <group position={node.pivotOffset}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[width, thickness, height]} />
          <meshPhysicalMaterial
            color="#888888"
            roughness={0.7}
            metalness={0.1}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* 递归渲染子节点 */}
        {node.children.map(child => (
          <Panel3D
            key={child.id}
            node={child}
            foldProgress={foldProgress}
            scale={scale}
            thickness={thickness}
          />
        ))}
      </group>
    </group>
  );
};

/**
 * 主组件
 */
export const NestedGroupFold: React.FC<NestedGroupFoldProps> = ({
  panels,
  drivenMap,
  rootPanelId,
  foldProgress,
  scale = 0.1,
  thickness = 0.5,
  offsetX,
  offsetY,
}) => {
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

  // 构建节点树
  const rootNode = useMemo(() => {
    if (!rootPanelId) return null;
    const rootPanel = panelDataMap.get(rootPanelId);
    if (!rootPanel) return null;

    // 调试：打印完整的 drivenMap 和 panelDataMap
    console.log('🌳 NestedGroupFold 初始化:');
    console.log('  rootPanelId:', rootPanelId);
    console.log('  drivenMap:', JSON.stringify(drivenMap, null, 2));
    console.log('  panelDataMap keys:', Array.from(panelDataMap.keys()));
    console.log('  panels count:', panels.length);

    // 递归构建子节点
    const buildChildren = (parentId: string, parentPanel: PanelData): Node3D[] => {
      const childIds = drivenMap[parentId] || [];
      const children: Node3D[] = [];

      // 调试日志
      console.log(`📦 buildChildren: parentId=${parentId}, childIds=`, childIds);
      console.log(`📦 parentPanel:`, parentPanel);

      // 父面板中心（全局坐标）
      const parentCenterX = (parentPanel.x + parentPanel.width / 2) * scale;
      const parentCenterZ = (parentPanel.y + parentPanel.height / 2) * scale;

      childIds.forEach(childId => {
        const childPanel = panelDataMap.get(childId);
        if (!childPanel) {
          console.warn(`⚠️ NestedGroupFold: 找不到面板 ${childId}`);
          return;
        }

        const edge = detectSharedEdge(parentPanel, childPanel);
        console.log(`🔗 检测共享边: ${parentId} -> ${childId}`, edge ? `${edge.type} @ ${edge.position}` : '未检测到');

        // 子面板中心（全局坐标）
        const childCenterX = (childPanel.x + childPanel.width / 2) * scale;
        const childCenterZ = (childPanel.y + childPanel.height / 2) * scale;

        // 计算折叠边位置和枢轴偏移
        // foldEdgePos: 相对于父面板中心
        // pivotOffset: 子面板中心相对于折叠边
        let foldEdgePos: THREE.Vector3;
        let pivotOffset: THREE.Vector3;
        let rotationAxis: THREE.Vector3;
        let foldDirection: number;

        if (!edge) {
          // 没有检测到共享边 - 基于相对位置推断
          console.warn(`⚠️ 未检测到共享边: ${parentId} -> ${childId}，使用默认位置`);
          const dx = childPanel.x - parentPanel.x;
          const dy = childPanel.y - parentPanel.y;

          if (Math.abs(dx) > Math.abs(dy)) {
            // 垂直边折叠
            const isRight = dx > 0;
            // 折叠边在父面板的右边或左边
            const edgeLocalX = isRight ? parentPanel.width * scale / 2 : -parentPanel.width * scale / 2;
            foldEdgePos = new THREE.Vector3(edgeLocalX, 0, 0);
            // 子面板中心相对于折叠边
            pivotOffset = new THREE.Vector3(childPanel.width * scale / 2 * (isRight ? 1 : -1), 0, childCenterZ - parentCenterZ);
            rotationAxis = new THREE.Vector3(0, 0, 1);
            foldDirection = isRight ? -1 : 1;
          } else {
            // 水平边折叠
            const isBelow = dy > 0;
            const edgeLocalZ = isBelow ? parentPanel.height * scale / 2 : -parentPanel.height * scale / 2;
            foldEdgePos = new THREE.Vector3(0, 0, edgeLocalZ);
            pivotOffset = new THREE.Vector3(childCenterX - parentCenterX, 0, childPanel.height * scale / 2 * (isBelow ? 1 : -1));
            rotationAxis = new THREE.Vector3(1, 0, 0);
            foldDirection = isBelow ? 1 : -1;
          }
        } else if (edge.type === 'horizontal') {
          // 水平边 - 绕 X 轴旋转
          const edgeX = ((edge.start + edge.end) / 2) * scale;
          const edgeZ = edge.position * scale;
          foldEdgePos = new THREE.Vector3(edgeX - parentCenterX, 0, edgeZ - parentCenterZ);
          pivotOffset = new THREE.Vector3(childCenterX - edgeX, 0, childCenterZ - edgeZ);
          rotationAxis = new THREE.Vector3(1, 0, 0);
          foldDirection = childPanel.y > parentPanel.y ? 1 : -1;
        } else {
          // 垂直边 - 绕 Z 轴旋转
          const edgeX = edge.position * scale;
          const edgeZ = ((edge.start + edge.end) / 2) * scale;
          foldEdgePos = new THREE.Vector3(edgeX - parentCenterX, 0, edgeZ - parentCenterZ);
          pivotOffset = new THREE.Vector3(childCenterX - edgeX, 0, childCenterZ - edgeZ);
          rotationAxis = new THREE.Vector3(0, 0, 1);
          foldDirection = childPanel.x > parentPanel.x ? -1 : 1;
        }

        const childNode: Node3D = {
          id: childId,
          panel: childPanel,
          foldEdgePos,
          pivotOffset,
          rotationAxis,
          foldDirection,
          children: buildChildren(childId, childPanel),
        };

        children.push(childNode);
      });

      return children;
    };

    // 根节点（不旋转）
    const root: Node3D = {
      id: rootPanelId,
      panel: rootPanel,
      foldEdgePos: new THREE.Vector3(0, 0, 0),
      pivotOffset: new THREE.Vector3(0, 0, 0),
      rotationAxis: new THREE.Vector3(0, 1, 0),
      foldDirection: 0,
      children: buildChildren(rootPanelId, rootPanel),
    };

    return root;
  }, [panelDataMap, drivenMap, rootPanelId, scale]);

  if (!rootNode || panels.length === 0) return null;

  // 根面板的位置
  const rootCenterX = (rootNode.panel.x + rootNode.panel.width / 2) * scale;
  const rootCenterZ = (rootNode.panel.y + rootNode.panel.height / 2) * scale;
  const rootWidth = rootNode.panel.width * scale;
  const rootHeight = rootNode.panel.height * scale;

  return (
    <group position={[rootCenterX, thickness / 2, rootCenterZ]}>
      {/* 根面板 */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[rootWidth, thickness, rootHeight]} />
        <meshPhysicalMaterial
          color="#888888"
          roughness={0.7}
          metalness={0.1}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 子节点 */}
      {rootNode.children.map(child => (
        <Panel3D
          key={child.id}
          node={child}
          foldProgress={foldProgress}
          scale={scale}
          thickness={thickness}
        />
      ))}
    </group>
  );
};

export default NestedGroupFold;
