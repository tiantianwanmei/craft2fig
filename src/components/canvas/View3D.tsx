/**
 * View3D - 3D视图组件
 * 支持递归折叠和 SkinnedMesh 两种渲染模式
 */

import React, { Suspense, useMemo, useRef, useEffect, useState } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../../store';
import { COMPONENT_TOKENS, SEMANTIC_TOKENS } from '@genki/shared-theme';
import * as THREE from 'three';
import { RecursiveFoldingBox } from './RecursiveFoldingBox';
import { SkinnedMeshView } from './SkinnedMeshView';

// 简化版 OrbitControls - 内联实现避免 URL 问题
const SimpleOrbitControls: React.FC = () => {
  const { camera, gl } = useThree();
  const stateRef = useRef({
    isDragging: false,
    prevX: 0,
    prevY: 0,
    spherical: new THREE.Spherical(),
    target: new THREE.Vector3(0, 0, 0),
  });

  useEffect(() => {
    const state = stateRef.current;
    const domElement = gl.domElement;

    // 初始化球坐标
    const offset = new THREE.Vector3().subVectors(camera.position, state.target);
    state.spherical.setFromVector3(offset);

    const onMouseDown = (e: MouseEvent) => {
      state.isDragging = true;
      state.prevX = e.clientX;
      state.prevY = e.clientY;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!state.isDragging) return;
      const deltaX = e.clientX - state.prevX;
      const deltaY = e.clientY - state.prevY;
      state.prevX = e.clientX;
      state.prevY = e.clientY;

      // 旋转
      state.spherical.theta -= deltaX * 0.01;
      state.spherical.phi -= deltaY * 0.01;
      state.spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, state.spherical.phi));
    };

    const onMouseUp = () => { state.isDragging = false; };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      state.spherical.radius *= e.deltaY > 0 ? 1.1 : 0.9;
      state.spherical.radius = Math.max(10, Math.min(500, state.spherical.radius));
    };

    domElement.addEventListener('mousedown', onMouseDown);
    domElement.addEventListener('mousemove', onMouseMove);
    domElement.addEventListener('mouseup', onMouseUp);
    domElement.addEventListener('mouseleave', onMouseUp);
    domElement.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      domElement.removeEventListener('mousedown', onMouseDown);
      domElement.removeEventListener('mousemove', onMouseMove);
      domElement.removeEventListener('mouseup', onMouseUp);
      domElement.removeEventListener('mouseleave', onMouseUp);
      domElement.removeEventListener('wheel', onWheel);
    };
  }, [camera, gl]);

  useFrame(() => {
    const state = stateRef.current;
    const offset = new THREE.Vector3().setFromSpherical(state.spherical);
    camera.position.copy(state.target).add(offset);
    camera.lookAt(state.target);
  });

  return null;
};

// 自定义相机设置
const CameraSetup: React.FC<{ position: [number, number, number]; fov: number }> = ({ position, fov }) => {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(...position);
    (camera as THREE.PerspectiveCamera).fov = fov;
    (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
  }, [camera, position, fov]);
  return null;
};


interface View3DProps {
  height?: string;
}

export const View3D: React.FC<View3DProps> = ({ height = '100%' }) => {
  const { clipmaskVectors, foldSequence, hPanelId, drivenMap, panelNameMap } = useAppStore(
    useShallow((s) => ({
      clipmaskVectors: s.clipmaskVectors,
      foldSequence: s.foldSequence,
      hPanelId: s.hPanelId,
      drivenMap: s.drivenMap,
      panelNameMap: s.panelNameMap,
    }))
  );

  const [foldProgress, setFoldProgress] = useState(0);
  const [useSkinnedMesh, setUseSkinnedMesh] = useState(true);
  const [showWireframe, setShowWireframe] = useState(false);

  // 转换 vectors 格式
  const vectors = useMemo(() => {
    return clipmaskVectors.map(layer => ({
      id: layer.id,
      name: layer.name,
      x: (layer as any).x ?? layer.bounds?.x ?? 0,
      y: (layer as any).y ?? layer.bounds?.y ?? 0,
      width: (layer as any).width ?? layer.bounds?.width ?? 100,
      height: (layer as any).height ?? layer.bounds?.height ?? 50,
    }));
  }, [clipmaskVectors]);

  // 确定根节点
  const rootId = hPanelId || (foldSequence.length > 0 ? foldSequence[0] : vectors[0]?.id);

  return (
    <div style={{
      width: '100%',
      height,
      position: 'relative',
      background: COMPONENT_TOKENS.canvas.bg.area,
    }}>
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: false }}
      >
        <color attach="background" args={['#0a0a0f']} />
        <CameraSetup position={[150, 120, 150]} fov={45} />
        <ambientLight intensity={0.4} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <hemisphereLight args={['#ffffff', '#444444', 0.6]} />

        <Suspense fallback={null}>
          {rootId && vectors.length > 0 && (
            useSkinnedMesh ? (
              <SkinnedMeshView
                vectors={vectors}
                rootId={rootId}
                drivenMap={drivenMap || {}}
                nameMap={panelNameMap || {}}
                foldProgress={foldProgress}
                thickness={2}
                cornerRadius={2}
                showWireframe={showWireframe}
              />
            ) : (
              <RecursiveFoldingBox
                vectors={vectors}
                rootId={rootId}
                drivenMap={drivenMap || {}}
                nameMap={panelNameMap || {}}
                foldProgress={foldProgress}
                thickness={2}
              />
            )
          )}
        </Suspense>

        <gridHelper args={[200, 20, '#333', '#222']} />
        <SimpleOrbitControls />
      </Canvas>

      {/* 控制面板 */}
      <div style={{
        position: 'absolute',
        bottom: 16,
        left: 16,
        right: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '8px 12px',
        background: SEMANTIC_TOKENS.glass.dark.background,
        backdropFilter: SEMANTIC_TOKENS.glass.dark.backdropFilter,
        borderRadius: SEMANTIC_TOKENS.border.radius.md,
      }}>
        {/* 渲染模式切换 */}
        <button
          onClick={() => setUseSkinnedMesh(!useSkinnedMesh)}
          style={{
            padding: '4px 8px',
            fontSize: 11,
            background: useSkinnedMesh ? '#06b6d4' : 'transparent',
            color: useSkinnedMesh ? '#fff' : SEMANTIC_TOKENS.color.text.secondary,
            border: `1px solid ${SEMANTIC_TOKENS.color.border.default}`,
            borderRadius: SEMANTIC_TOKENS.border.radius.sm,
            cursor: 'pointer',
          }}
        >
          {useSkinnedMesh ? 'Skinned' : 'Recursive'}
        </button>

        {/* 线框模式 */}
        {useSkinnedMesh && (
          <button
            onClick={() => setShowWireframe(!showWireframe)}
            style={{
              padding: '4px 8px',
              fontSize: 11,
              background: showWireframe ? '#06b6d4' : 'transparent',
              color: showWireframe ? '#fff' : SEMANTIC_TOKENS.color.text.secondary,
              border: `1px solid ${SEMANTIC_TOKENS.color.border.default}`,
              borderRadius: SEMANTIC_TOKENS.border.radius.sm,
              cursor: 'pointer',
            }}
          >
            Wire
          </button>
        )}

        <span style={{ color: SEMANTIC_TOKENS.color.text.secondary, fontSize: 12 }}>折叠</span>
        <input
          type="range"
          min={0}
          max={100}
          value={foldProgress * 100}
          onChange={(e) => setFoldProgress(Number(e.target.value) / 100)}
          style={{ flex: 1 }}
        />
        <span style={{ color: SEMANTIC_TOKENS.color.text.primary, fontSize: 12, width: 40 }}>
          {Math.round(foldProgress * 100)}%
        </span>
      </div>
    </div>
  );
};
