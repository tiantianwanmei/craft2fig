// ============================================================================
// PathTracingView - WebGPU 路径追踪 React 组件
// ============================================================================

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { PathTracingRenderer, CameraParams, Material, Triangle } from '../core';
import { getWebGPUHelpMessage } from '../../../utils/checkWebGPU';

export interface PathTracingViewProps {
  width?: number;
  height?: number;
  maxBounces?: number;
  exposure?: number;
  envMapIntensity?: number;
  onFrameUpdate?: (frameCount: number) => void;
  onError?: (error: Error) => void;
}

export const PathTracingView: React.FC<PathTracingViewProps> = ({
  width = 1280,
  height = 720,
  maxBounces = 8,
  exposure = 1.0,
  envMapIntensity = 1.0,
  onFrameUpdate,
  onError,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<PathTracingRenderer | null>(null);
  const animationRef = useRef<number>(0);

  const [isInitialized, setIsInitialized] = useState(false);
  const [frameCount, setFrameCount] = useState(0);
  const [isRendering, setIsRendering] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const buildDefaultScene = useCallback((): { triangles: Triangle[]; materials: Material[] } => {
    const materials: Material[] = [
      {
        albedo: [0.8, 0.2, 0.2],
        metallic: 0.0,
        roughness: 0.35,
        emission: [0, 0, 0],
        emissionStrength: 0.0,
        ior: 1.5,
        transmission: 0.0,
        clearcoat: 0.0,
        clearcoatRoughness: 0.0,
      },
      {
        albedo: [0.8, 0.8, 0.8],
        metallic: 0.0,
        roughness: 0.9,
        emission: [0, 0, 0],
        emissionStrength: 0.0,
        ior: 1.5,
        transmission: 0.0,
        clearcoat: 0.0,
        clearcoatRoughness: 0.0,
      },
    ];

    const triangles: Triangle[] = [];
    const addTri = (
      v0: [number, number, number],
      v1: [number, number, number],
      v2: [number, number, number],
      n: [number, number, number],
      materialId: number
    ): void => {
      triangles.push({
        v0: { x: v0[0], y: v0[1], z: v0[2] },
        v1: { x: v1[0], y: v1[1], z: v1[2] },
        v2: { x: v2[0], y: v2[1], z: v2[2] },
        n0: { x: n[0], y: n[1], z: n[2] },
        n1: { x: n[0], y: n[1], z: n[2] },
        n2: { x: n[0], y: n[1], z: n[2] },
        uv0: [0, 0],
        uv1: [1, 0],
        uv2: [1, 1],
        materialId,
      });
    };

    const s = 0.5;
    // cube faces
    addTri([-s, -s, s], [s, -s, s], [s, s, s], [0, 0, 1], 0);
    addTri([-s, -s, s], [s, s, s], [-s, s, s], [0, 0, 1], 0);
    addTri([s, -s, -s], [-s, -s, -s], [-s, s, -s], [0, 0, -1], 0);
    addTri([s, -s, -s], [-s, s, -s], [s, s, -s], [0, 0, -1], 0);
    addTri([-s, -s, -s], [-s, -s, s], [-s, s, s], [-1, 0, 0], 0);
    addTri([-s, -s, -s], [-s, s, s], [-s, s, -s], [-1, 0, 0], 0);
    addTri([s, -s, s], [s, -s, -s], [s, s, -s], [1, 0, 0], 0);
    addTri([s, -s, s], [s, s, -s], [s, s, s], [1, 0, 0], 0);
    addTri([-s, s, s], [s, s, s], [s, s, -s], [0, 1, 0], 0);
    addTri([-s, s, s], [s, s, -s], [-s, s, -s], [0, 1, 0], 0);
    addTri([-s, -s, -s], [s, -s, -s], [s, -s, s], [0, -1, 0], 0);
    addTri([-s, -s, -s], [s, -s, s], [-s, -s, s], [0, -1, 0], 0);

    // ground plane
    const g = 8;
    const y = -1.0;
    addTri([-g, y, -g], [g, y, -g], [g, y, g], [0, 1, 0], 1);
    addTri([-g, y, -g], [g, y, g], [-g, y, g], [0, 1, 0], 1);

    return { triangles, materials };
  }, []);

  // 初始化渲染器
  useEffect(() => {
    const initRenderer = async () => {
      if (!canvasRef.current) return;

      try {
        const renderer = new PathTracingRenderer({
          width,
          height,
          maxBounces,
          exposure,
          envMapIntensity,
        });

        const success = await renderer.initialize(canvasRef.current);
        if (success) {
          rendererRef.current = renderer;
          setIsInitialized(true);
          setErrorText(null);

          const sceneData = buildDefaultScene();
          renderer.setScene(sceneData.triangles, sceneData.materials);
          renderer.setCamera({
            position: [0, 1.5, 4],
            target: [0, 0, 0],
            up: [0, 1, 0],
            fov: Math.PI / 4,
          });
          setIsRendering(true);
        } else {
          const err = new Error('Failed to initialize WebGPU (adapter/device/context unavailable)');
          setErrorText(err.message);
          onError?.(err);
        }
      } catch (err) {
        const e = err as Error;
        setErrorText(e?.message || 'Unknown WebGPU error');
        onError?.(e);
      }
    };

    initRenderer();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [width, height, maxBounces, exposure, envMapIntensity, onError, buildDefaultScene]);

  // 渲染循环
  const renderLoop = useCallback(() => {
    if (!rendererRef.current || !isRendering) return;

    rendererRef.current.render();
    setFrameCount(prev => {
      const next = prev + 1;
      onFrameUpdate?.(next);
      return next;
    });

    animationRef.current = requestAnimationFrame(renderLoop);
  }, [isRendering, onFrameUpdate]);

  // 启动/停止渲染
  useEffect(() => {
    if (isRendering && isInitialized) {
      renderLoop();
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRendering, isInitialized, renderLoop]);

  // 公开方法
  const startRendering = useCallback(() => setIsRendering(true), []);
  const stopRendering = useCallback(() => setIsRendering(false), []);

  const setCamera = useCallback((camera: Partial<CameraParams>) => {
    rendererRef.current?.setCamera(camera);
    setFrameCount(0);
  }, []);

  const setScene = useCallback((triangles: Triangle[], materials: Material[]) => {
    rendererRef.current?.setScene(triangles, materials);
    setFrameCount(0);
  }, []);

  return (
    <div style={{ position: 'relative' }}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{ display: 'block' }}
      />
      {/* 状态显示 */}
      <div style={{
        position: 'absolute',
        top: 8,
        left: 8,
        color: 'white',
        fontSize: 12,
        background: 'rgba(0,0,0,0.5)',
        padding: '4px 8px',
        borderRadius: 4,
      }}>
        {errorText ? `WebGPU Error: ${errorText}` : isInitialized ? `Samples: ${frameCount}` : 'Initializing...'}
      </div>

      {errorText && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.55)',
            color: 'white',
            padding: 16,
            textAlign: 'center',
            fontSize: 12,
          }}
        >
          <div>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>WebGPU 初始化失败</div>
            <div style={{ opacity: 0.8, lineHeight: 1.4 }}>{errorText}</div>
            <div style={{ opacity: 0.65, marginTop: 10 }}>
              如果你在 Figma Desktop/iframe 环境，可能未启用 WebGPU。
            </div>
            <div style={{ opacity: 0.65, marginTop: 10, whiteSpace: 'pre-wrap', textAlign: 'left', fontFamily: 'monospace', fontSize: 11, background: 'rgba(0,0,0,0.3)', padding: 8, borderRadius: 4 }}>
              {getWebGPUHelpMessage()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PathTracingView;
