/**
 * FoldingBox - 主折叠盒组件
 * 基于排序算法自动构建3D折叠结构
 */

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { ExtrudedPanel } from './ExtrudedPanel';
import { DoubleHingeGroup } from './DoubleHingeGroup';
import type { FoldingData, PanelData } from '../types';

// 辅助函数：根据面板名称获取折叠角度
function getAngleForPanel(
  name: string,
  angles: Record<string, number>
): number {
  if (name.includes('T') && !name.includes('-')) return angles.topBody;
  if (name.includes('B') && !name.includes('-')) return -angles.bottomBody;
  if (name.includes('-') && name.includes('T')) return angles.topFlap;
  if (name.includes('-') && name.includes('B')) return -angles.bottomFlap;
  if (parseInt(name) > 0) return angles.wings;
  if (parseInt(name) < 0) return -angles.wings;
  return 0;
}

// 辅助函数：根据面板名称获取位置
function getPositionForPanel(
  name: string,
  params: { l: number; w: number; h: number },
  t: number
): [number, number, number] {
  const { h } = params;
  if (name.includes('T') && !name.includes('-')) return [0, h / 2, 0];
  if (name.includes('B') && !name.includes('-')) return [0, -h / 2, 0];
  return [0, 0, 0];
}

// 辅助函数：根据面板名称获取旋转轴
function getAxisForPanel(name: string): 'x' | 'y' {
  const num = parseInt(name);
  if (!isNaN(num) && num !== 0) return 'y';
  return 'x';
}

interface FoldingBoxProps {
  data: FoldingData;
  foldProgress: number;
  thickness?: number;
  textures?: Map<string, THREE.Texture>;
}

export const FoldingBox: React.FC<FoldingBoxProps> = ({
  data,
  foldProgress,
  thickness: customThickness,
  textures,
}) => {
  const { params, panels, sequence, nameMap } = data;
  const thickness = customThickness ?? params.t ?? 2;

  // 构建面板映射
  const panelMap = useMemo(() => {
    const map = new Map<string, PanelData>();
    panels.forEach((p) => map.set(p.id, p));
    return map;
  }, [panels]);

  // 计算折叠角度
  const angles = useMemo(() => {
    const p = Math.max(0, Math.min(1, foldProgress));
    const clamp = (v: number) => Math.max(0, Math.min(1, v));
    const seg = (start: number, dur: number) => clamp((p - start) / dur);

    return {
      wings: clamp(p / 0.3) * Math.PI / 2,
      topBody: seg(0.3, 0.25) * Math.PI / 2,
      bottomBody: seg(0.3, 0.25) * Math.PI / 2,
      topFlap: seg(0.55, 0.2) * Math.PI / 2,
      tucks: seg(0.75, 0.15) * Math.PI / 2,
      bottomFlap: seg(0.9, 0.1) * Math.PI / 2,
    };
  }, [foldProgress]);

  // 获取面板
  const getPanel = (id: string) => panelMap.get(id);
  const getTexture = (id: string) => textures?.get(id) ?? null;

  // 根节点面板
  const rootPanel = sequence?.[0] ? getPanel(sequence[0]) : panels[0];
  if (!rootPanel) return null;

  const { l, w, h } = params;

  return (
    <group>
      <group rotation={[-Math.PI / 2, 0, 0]}>
        {/* 根面板 */}
        <group position={[-l / 2, -h / 2, 0]}>
          {rootPanel.path && (
            <ExtrudedPanel
              pathStr={rootPanel.path}
              color={rootPanel.color}
              thickness={thickness}
              texture={getTexture(rootPanel.id)}
            />
          )}
        </group>

        {/* 渲染其他面板 - 基于序列 */}
        {sequence?.slice(1).map((panelId, idx) => {
          const panel = getPanel(panelId);
          if (!panel?.path) return null;

          const name = nameMap?.[panelId] || panel.name;
          const angle = getAngleForPanel(name, angles);
          const pos = getPositionForPanel(name, params, thickness);
          const axis = getAxisForPanel(name);

          return (
            <DoubleHingeGroup
              key={panelId}
              position={pos}
              creaseSize={thickness}
              creaseLength={l}
              creaseColor={panel.color || '#cccccc'}
              axis={axis}
              angle={angle}
              thickness={thickness}
            >
              <group position={[-l / 2, 0, 0]}>
                <ExtrudedPanel
                  pathStr={panel.path}
                  color={panel.color}
                  thickness={thickness}
                  depthLevel={idx + 1}
                  texture={getTexture(panelId)}
                />
              </group>
            </DoubleHingeGroup>
          );
        })}
      </group>
    </group>
  );
};
