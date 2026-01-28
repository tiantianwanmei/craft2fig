/**
 * View3D - 3D视图组件
 * 支持递归折叠和 SkinnedMesh 两种渲染模式
 */

import React, { Suspense, useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, OrbitControls, PerspectiveCamera, Center } from '@react-three/drei';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../../store';
import { COMPONENT_TOKENS, SEMANTIC_TOKENS } from '@genki/shared-theme';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { RecursiveFoldingBox } from './RecursiveFoldingBox';
import { SkinnedMeshView } from './SkinnedMeshView';
import { ParametricControls } from '../ui/ParametricControls';
import { use3DStore, useWebGPUStore } from '@genki/shared-stores';
import { GroundProjectedEnv } from './GroundProjectedEnv';
import { InfiniteGround } from './InfiniteGround';
import { generateStudioHDRTexture } from './StudioHDREnvironment';

const EMPTY_RECORD: Record<string, string[]> = Object.freeze({});
const EMPTY_STRING_RECORD: Record<string, string> = Object.freeze({});

const SCENE_GROUND_Y = 0;

const GradientBackground: React.FC<{ top: string; bottom: string }> = ({ top, bottom }) => {
  const geometry = useMemo(() => {
    const g = new THREE.SphereGeometry(500000, 32, 16);
    const pos = g.getAttribute('position');
    const colors = new Float32Array(pos.count * 3);
    const topC = new THREE.Color(top);
    const bottomC = new THREE.Color(bottom);

    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const t = THREE.MathUtils.clamp((y + 400) / 800, 0, 1);
      const c = bottomC.clone().lerp(topC, t);
      colors[i * 3 + 0] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return g;
  }, [bottom, top]);

  return (
    <mesh geometry={geometry} scale={[-1, 1, 1]}>
      <meshBasicMaterial vertexColors side={THREE.BackSide} depthWrite={false} />
    </mesh>
  );
};

const CameraSetup: React.FC = () => {
  const { camera } = useThree();
  useEffect(() => {
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.near = 0.1;
      camera.far = 500000;
      camera.updateProjectionMatrix();
    }
  }, [camera]);
  return null;
};

const OrbitTargetTracker: React.FC<{
  controlsRef: React.MutableRefObject<OrbitControlsImpl | null>;
  targetRef: React.MutableRefObject<THREE.Vector3 | null>;
}> = ({ controlsRef, targetRef }) => {
  useFrame(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    const t = controls.target;
    if (!targetRef.current) targetRef.current = new THREE.Vector3(t.x, t.y, t.z);
    else targetRef.current.set(t.x, t.y, t.z);
  });
  return null;
};

const AutoGroundRig: React.FC<{
  enabled: boolean;
  groundY: number;
  foldProgressRef: React.MutableRefObject<number>;
  skinnedMeshRef: React.MutableRefObject<THREE.SkinnedMesh | null>;
  rigRef: React.MutableRefObject<THREE.Group | null>;
}> = ({ enabled, groundY, foldProgressRef, skinnedMeshRef, rigRef }) => {
  const frameRef = useRef(0);
  const lastProgressRef = useRef<number>(Number.NaN);
  const tempWorldBoxRef = useRef(new THREE.Box3());

  useFrame(() => {
    if (!enabled) return;
    const mesh = skinnedMeshRef.current;
    const rig = rigRef.current;
    if (!mesh || !rig) return;

    frameRef.current = (frameRef.current + 1) | 0;
    if ((frameRef.current % 4) !== 0) return;

    const progress = foldProgressRef.current;
    const last = lastProgressRef.current;
    if (Number.isFinite(last) && Math.abs(progress - last) < 0.001) return;
    lastProgressRef.current = progress;

    mesh.updateMatrixWorld(true);
    mesh.skeleton?.update();
    mesh.computeBoundingBox();
    const bb = mesh.boundingBox;
    if (!bb) return;

    const worldBox = tempWorldBoxRef.current;
    worldBox.copy(bb).applyMatrix4(mesh.matrixWorld);
    const delta = groundY - worldBox.min.y;
    if (!Number.isFinite(delta)) return;
    if (Math.abs(delta) < 1e-4) return;
    rig.position.y = rig.position.y + delta;
  });

  return null;
};

const SceneEnvironmentCore: React.FC<{ anchorRef?: React.MutableRefObject<THREE.Vector3 | null> }> = ({ anchorRef }) => {
  const background = use3DStore((s) => s.background);
  const hdr = use3DStore((s) => s.hdr);
  const ground = use3DStore((s) => s.ground);
  const hdrTexture = useWebGPUStore((s) => s.hdrTexture);

  const gradedSolid = useMemo(() => applyBackgroundGrade(background.solidColor, background), [background]);
  const gradedTop = useMemo(() => applyBackgroundGrade(background.gradientTop, background), [background]);
  const gradedBottom = useMemo(() => applyBackgroundGrade(background.gradientBottom, background), [background]);

  // 🔧 HDR 回退逻辑：当 hdrTexture 为 null 且背景模式为 'hdr' 时，使用程序化生成的 Studio HDR
  const effectiveHDRTexture = useMemo(() => {
    if (hdrTexture) return hdrTexture;
    if (background.mode === 'hdr') {
      console.log('🎨 使用默认 Studio HDR 环境');
      return generateStudioHDRTexture('studio', 1024);
    }
    return null;
  }, [hdrTexture, background.mode]);

  const shouldShowHDRBackground = background.mode === 'hdr' && hdr.showBackground;
  const shouldRenderHDRGround = background.mode === 'hdr' && hdr.groundProjection && effectiveHDRTexture;

  return (
    <>
      {background.mode === 'solid' && <color attach="background" args={[gradedSolid]} />}
      {background.mode === 'gradient' && <GradientBackground top={gradedTop} bottom={gradedBottom} />}

      <PerspectiveCamera makeDefault position={[200, 150, 200]} fov={45} near={0.1} far={500000} />
      <CameraSetup />

      <HDRDome
        texture={effectiveHDRTexture}
        showBackground={shouldShowHDRBackground}
        intensity={hdr.intensity}
        useForLighting={hdr.useForLighting}
      />

      {shouldRenderHDRGround && (
        <GroundProjectedEnv
          texture={effectiveHDRTexture}
          height={hdr.domeHeight}
          radius={hdr.domeRadius || 5000}
          scale={20000}
          groundY={ground.offsetY || 0}
          anchorRef={anchorRef}
          exposure={hdr.intensity}
        />
      )}

      <ambientLight intensity={effectiveHDRTexture && hdr.useForLighting ? 0.1 : 0.3} />
      {(!effectiveHDRTexture || !hdr.useForLighting) && (
        <>
          <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
          <hemisphereLight args={['#ffffff', '#444444', 0.6]} />
        </>
      )}
    </>
  );
};

const HDRDome: React.FC<{
  texture: THREE.Texture | null;
  showBackground?: boolean;
  intensity?: number;
  useForLighting?: boolean;
}> = ({ texture, showBackground = false, intensity = 1, useForLighting = true }) => {
  const { scene, gl, camera } = useThree();
  const meshRef = useRef<THREE.Mesh | null>(null);

  useFrame(() => {
    const m = meshRef.current;
    if (!m) return;
    const far = (camera as THREE.PerspectiveCamera).far ?? 50000;
    m.position.copy(camera.position);
    const radius = Math.max(1000, far * 0.9);
    m.scale.set(-radius, radius, radius);
  });

  useEffect(() => {
    if (!texture || !useForLighting) return;

    const pmremGenerator = new THREE.PMREMGenerator(gl);
    pmremGenerator.compileEquirectangularShader();
    const envRT = pmremGenerator.fromEquirectangular(texture);
    const envMap = envRT.texture;

    const previousEnv = scene.environment;
    scene.environment = envMap;
    if ('environmentIntensity' in scene) {
      (scene as any).environmentIntensity = intensity;
    }

    return () => {
      scene.environment = previousEnv ?? null;
      envRT.dispose();
      pmremGenerator.dispose();
    };
  }, [texture, scene, gl, intensity, useForLighting]);

  if (!texture || !showBackground) return null;

  return (
    <mesh ref={meshRef} scale={[-1, 1, 1]} renderOrder={-2000}>
      <sphereGeometry args={[1, 64, 32]} />
      <meshBasicMaterial map={texture} side={THREE.BackSide} toneMapped={false} depthTest={false} depthWrite={false} />
    </mesh>
  );
};

function applyBackgroundGrade(hex: string, grade: { hue?: number; saturation?: number; lightness?: number; contrast?: number; exposure?: number }): string {
  const color = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  color.getHSL(hsl);

  const hueOffset = ((grade.hue ?? 0) % 360 + 360) % 360;
  color.setHSL(
    ((hsl.h * 360 + hueOffset) % 360) / 360,
    Math.min(1, Math.max(0, hsl.s * (grade.saturation ?? 1))),
    Math.min(1, Math.max(0, hsl.l * (grade.lightness ?? 1))),
  );

  const linear = color.clone().convertSRGBToLinear();
  linear.multiplyScalar(Math.max(0, grade.exposure ?? 1));
  linear.r = (linear.r - 0.5) * (grade.contrast ?? 1) + 0.5;
  linear.g = (linear.g - 0.5) * (grade.contrast ?? 1) + 0.5;
  linear.b = (linear.b - 0.5) * (grade.contrast ?? 1) + 0.5;
  linear.r = Math.min(1, Math.max(0, linear.r));
  linear.g = Math.min(1, Math.max(0, linear.g));
  linear.b = Math.min(1, Math.max(0, linear.b));

  return `#${linear.convertLinearToSRGB().getHexString()}`;
}


interface View3DProps {
  height?: string;
}

export const View3D: React.FC<View3DProps> = ({ height = '100%' }) => {
  const { clipmaskVectors, foldSequence, hPanelId, drivenMap, panelNameMap, previewImageUrlMap } = useAppStore(
    useShallow((s) => ({
      clipmaskVectors: s.clipmaskVectors,
      foldSequence: s.foldSequence,
      hPanelId: s.hPanelId,
      drivenMap: s.drivenMap,
      panelNameMap: s.panelNameMap,
      previewImageUrlMap: s.previewImageUrlMap,
    }))
  );

  const { hdr, background } = use3DStore(useShallow((s) => ({
    hdr: s.hdr,
    background: s.background,
  })));
  const shouldRenderHDRGround = background.mode === 'hdr' && hdr.groundProjection;

  // 🔍 调试：打印数据状态
  useEffect(() => {
    console.log('🎮 View3D - 数据状态:', {
      vectorsCount: clipmaskVectors.length,
      foldSequenceLength: foldSequence.length,
      hPanelId,
      hasDrivenMap: !!drivenMap && Object.keys(drivenMap).length > 0,
      hasPanelNameMap: !!panelNameMap && Object.keys(panelNameMap).length > 0,
    });
  }, [clipmaskVectors.length, foldSequence.length, hPanelId, drivenMap, panelNameMap]);

  const [foldProgress, setFoldProgress] = useState(0);
  const foldProgressRef = useRef(0);
  const foldProgressRafRef = useRef<number | null>(null);
  const [useSkinnedMesh, setUseSkinnedMesh] = useState(true);
  const [showWireframe, setShowWireframe] = useState(false);
  const [useWebGPU, setUseWebGPU] = useState(false); // 🆕 WebGPU Toggle
  const [WebGPURendererClass, setWebGPURendererClass] = useState<any>(null);

  // 🆕 参数化控制状态
  const [showParametricControls, setShowParametricControls] = useState(false);
  const [parametricParams, setParametricParams] = useState({
    width: 100,
    height: 100,
    thickness: 2,
    gapSize: 2,
    creaseCurvature: 1.0,
    interpolation: 'smooth' as 'linear' | 'smooth' | 'arc',
    xAxisMultiplier: 1.0,
    yAxisMultiplier: 1.15,
    nestingFactor: 0.15,
  });

  const ground = use3DStore((s) => s.ground);
  const effectiveGroundY = SCENE_GROUND_Y;

  const rigRef = useRef<THREE.Group | null>(null);
  const skinnedMeshRef = useRef<THREE.SkinnedMesh | null>(null);
  const handleSkinnedMeshReady = useCallback((m: THREE.SkinnedMesh | null) => {
    skinnedMeshRef.current = m;
  }, []);

  const orbitTargetRef = useRef<THREE.Vector3 | null>(new THREE.Vector3(0, ground.offsetY || 0, 0));

  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    controls.target.set(0, ground.offsetY || 0, 0);
    controls.update();
  }, [ground.offsetY]);

  // 🔍 调试：打印渲染模式切换
  useEffect(() => {
    console.log(`🎨 View3D - 渲染模式: ${useSkinnedMesh ? 'SkinnedMesh' : 'Recursive'} | Backend: ${useWebGPU ? 'WebGPU' : 'WebGL'}`);
  }, [useSkinnedMesh, useWebGPU]);

  useEffect(() => {
    foldProgressRef.current = foldProgress;
  }, [foldProgress]);

  // 🆕 Load WebGPU module dynamically when needed
  useEffect(() => {
    if (useWebGPU && !WebGPURendererClass) {
      // 🚀 Pre-flight: Polyfill WebGPU constants if they are missing
      if (typeof window !== 'undefined') {
        if (!('GPUShaderStage' in window)) (window as any).GPUShaderStage = { VERTEX: 0x0001, FRAGMENT: 0x0002, COMPUTE: 0x0004 };
        if (!('GPUBufferUsage' in window)) (window as any).GPUBufferUsage = { MAP_READ: 0x0001, MAP_WRITE: 0x0002, COPY_SRC: 0x0004, COPY_DST: 0x0008, INDEX: 0x0010, VERTEX: 0x0020, UNIFORM: 0x0040, STORAGE: 0x0080, INDIRECT: 0x0100, QUERY_RESOLVE: 0x0200 };
        if (!('GPUColorWrite' in window)) (window as any).GPUColorWrite = { RED: 0x1, GREEN: 0x2, BLUE: 0x4, ALPHA: 0x8, ALL: 0xF };
        if (!('GPUTextureUsage' in window)) (window as any).GPUTextureUsage = { COPY_SRC: 0x01, COPY_DST: 0x02, TEXTURE_BINDING: 0x04, STORAGE_BINDING: 0x08, RENDER_ATTACHMENT: 0x10 };
        if (!('GPUMapMode' in window)) (window as any).GPUMapMode = { READ: 1, WRITE: 2 };
      }

      console.log('🚀 Attempting to load WebGPU engine for View3D...');
      import('three/webgpu')
        .then((module) => {
          console.log('✅ WebGPU module loaded successfully for View3D');
          setWebGPURendererClass(() => module.WebGPURenderer);
        })
        .catch((err) => {
          console.error('❌ Failed to load three/webgpu in View3D:', err);
          alert('WebGPU backend could not be loaded in this view.');
          setUseWebGPU(false);
        });
    }
  }, [useWebGPU, WebGPURendererClass]);

  // 转换 vectors 格式
  const { vectors, yFlipBaseline } = useMemo(() => {
    const mapped = clipmaskVectors.map(layer => ({
      id: layer.id,
      name: layer.name,
      x: (layer as any).x ?? layer.bounds?.x ?? 0,
      y: (layer as any).y ?? layer.bounds?.y ?? 0,
      width: (layer as any).width ?? layer.bounds?.width ?? 100,
      height: (layer as any).height ?? layer.bounds?.height ?? 50,
    }));

    return {
      vectors: mapped,
      yFlipBaseline:
        mapped.length > 0
          ? (() => {
            let minY = Infinity;
            let maxBottom = -Infinity;
            for (const v of mapped) {
              minY = Math.min(minY, v.y);
              maxBottom = Math.max(maxBottom, v.y + v.height);
            }
            const baseline = minY + maxBottom;
            return Number.isFinite(baseline) ? baseline : null;
          })()
          : null,
    };
  }, [clipmaskVectors]);

  // 确定根节点
  const rootId = hPanelId || (foldSequence.length > 0 ? foldSequence[0] : vectors[0]?.id);

  const drivenMapStable = drivenMap ?? EMPTY_RECORD;
  const panelNameMapStable = panelNameMap ?? EMPTY_STRING_RECORD;

  // 🔍 调试：打印根节点和向量数据
  useEffect(() => {
    console.log('🌳 View3D - 树结构:', {
      rootId,
      vectorsCount: vectors.length,
      firstVector: vectors[0] ? {
        id: vectors[0].id,
        name: vectors[0].name,
        x: vectors[0].x,
        y: vectors[0].y,
        width: vectors[0].width,
        height: vectors[0].height,
      } : null,
    });
  }, [rootId, vectors.length]);

  return (
    <div style={{ width: '100%', height, position: 'relative', background: COMPONENT_TOKENS.canvas.bg.area }}>
      {/* 🚀 性能优化：Canvas 配置 */}
      <Canvas
        key={useWebGPU ? 'webgpu' : 'webgl'}
        shadows
        dpr={[1, 2]}
        gl={(canvasArg) => {
          try {
            const hasNativeWebGPU = typeof navigator !== 'undefined' && (navigator as any).gpu;
            const shouldAttemptWebGPU = useWebGPU && WebGPURendererClass && hasNativeWebGPU;

            if (shouldAttemptWebGPU) {
              // 🛡️ Robust Canvas Recovery
              let canvas: HTMLCanvasElement | null = null;

              const isRealCanvas = (el: any) => el && (el instanceof HTMLCanvasElement || el.nodeName === 'CANVAS');

              if (isRealCanvas(canvasArg)) {
                canvas = (canvasArg as any) as HTMLCanvasElement;
              } else if (canvasArg && isRealCanvas((canvasArg as any).domElement)) {
                canvas = (canvasArg as any).domElement;
              } else {
                canvas = document.querySelector('canvas') as HTMLCanvasElement;
              }

              if (canvas && typeof (canvas as any).getContext === 'function') {
                const Renderer = WebGPURendererClass;
                // @ts-ignore
                const renderer = new Renderer({ canvas, antialias: true, alpha: false });

                let isReady = false;
                const originalRender = renderer.render;
                renderer.render = (...args: any[]) => {
                  if (isReady) return originalRender.apply(renderer, args);
                };

                renderer.init().then(() => {
                  console.log('✅ View3D: WebGPU Initialized');
                  isReady = true;
                }).catch((e: any) => {
                  console.error('❌ View3D: WebGPU Init Error:', e);
                  setUseWebGPU(false);
                });

                return renderer;
              }
            }

            // Fallback to classic WebGL
            console.log('ℹ️ View3D: Using standard WebGLRenderer');
            let fallbackCanvas: any = null;
            const isRealCanvas = (el: any) => el && (el instanceof HTMLCanvasElement || el.nodeName === 'CANVAS');

            if (isRealCanvas(canvasArg)) {
              fallbackCanvas = canvasArg;
            } else {
              fallbackCanvas = document.querySelector('canvas');
            }

            return new THREE.WebGLRenderer({
              canvas: fallbackCanvas || undefined,
              powerPreference: 'high-performance',
              antialias: true,
              alpha: false,
              preserveDrawingBuffer: false,
              depth: true,
              logarithmicDepthBuffer: true,
            });
          } catch (e) {
            console.error('❌ View3D: Renderer Error:', e);
            return new THREE.WebGLRenderer({ antialias: true });
          }
        }}
        style={{ background: 'transparent' }}
      >
        <Suspense fallback={null}>
          <SceneEnvironmentCore anchorRef={orbitTargetRef} />
        </Suspense>

        <OrbitTargetTracker controlsRef={controlsRef} targetRef={orbitTargetRef} />

        <Suspense fallback={null}>
          {rootId && vectors.length > 0 && (
            useSkinnedMesh ? (
              <group ref={rigRef} position={[0, 0, 0]}>
                <SkinnedMeshView
                  vectors={vectors}
                  rootId={rootId}
                  drivenMap={drivenMapStable}
                  nameMap={panelNameMapStable}
                  foldProgress={foldProgressRef}
                  onMeshReady={handleSkinnedMeshReady}
                  thickness={2}
                  cornerRadius={2}
                  showWireframe={showWireframe}
                  yFlipBaseline={null}
                  imageMap={previewImageUrlMap}
                  gapSizeMultiplier={parametricParams.gapSize / parametricParams.thickness}
                  creaseCurvature={parametricParams.creaseCurvature}
                  jointInterpolation={parametricParams.interpolation}
                  xAxisMultiplier={parametricParams.xAxisMultiplier}
                  yAxisMultiplier={parametricParams.yAxisMultiplier}
                  nestingFactor={parametricParams.nestingFactor}
                />
              </group>
            ) : (
              <Center>
                <group ref={rigRef} position={[0, 0, 0]}>
                  <RecursiveFoldingBox
                    vectors={vectors}
                    rootId={rootId}
                    drivenMap={drivenMapStable}
                    nameMap={panelNameMapStable}
                    foldProgress={foldProgress}
                    thickness={2}
                    yFlipBaseline={yFlipBaseline}
                  />
                </group>
              </Center>
            )
          )}
        </Suspense>

        <AutoGroundRig
          enabled={useSkinnedMesh}
          groundY={ground.offsetY || 0}
          foldProgressRef={foldProgressRef}
          skinnedMeshRef={skinnedMeshRef}
          rigRef={rigRef}
        />

        {ground.visible && !shouldRenderHDRGround && (
          <>
            <ContactShadows
              position={[0, effectiveGroundY, 0]}
              scale={300}
              blur={2.5}
              far={50}
              opacity={0.6 * ground.opacity}
              resolution={256}
              frames={1}
            />
            <InfiniteGround
              y={effectiveGroundY}
              size={10000}
              reflectivity={ground.reflectivity}
              color={ground.color}
              mirror={ground.reflectivity * 0.8}
              blur={[400, 200]}
              mixBlur={1.0}
            />
          </>
        )}

        <OrbitControls
          makeDefault
          ref={controlsRef}
          target={[0, ground.offsetY || 0, 0]}
          enablePan={false}
          minPolarAngle={0}
          maxPolarAngle={shouldRenderHDRGround ? Math.PI / 2.05 : Math.PI / 1.8}
          minDistance={5}
          maxDistance={(background.mode === 'hdr' && hdr.groundProjection) ? 450000 : 450000}
          enableDamping
          dampingFactor={0.1}
          rotateSpeed={1.0}
          zoomSpeed={1.2}
        />
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

        {/* WebGPU Toggle */}
        <button
          onClick={() => setUseWebGPU(!useWebGPU)}
          style={{
            padding: '4px 8px',
            fontSize: 11,
            background: useWebGPU ? '#8b5cf6' : 'transparent',
            color: useWebGPU ? '#fff' : SEMANTIC_TOKENS.color.text.secondary,
            border: `1px solid ${useWebGPU ? '#8b5cf6' : SEMANTIC_TOKENS.color.border.default}`,
            borderRadius: SEMANTIC_TOKENS.border.radius.sm,
            cursor: 'pointer',
          }}
          title="Toggle Experimental WebGPU Backend"
        >
          {useWebGPU ? 'WebGPU' : 'WebGL'}
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

        {/* 🆕 参数化控制按钮 */}
        <button
          onClick={() => setShowParametricControls(!showParametricControls)}
          style={{
            padding: '4px 8px',
            fontSize: 11,
            background: showParametricControls ? '#06b6d4' : 'transparent',
            color: showParametricControls ? '#fff' : SEMANTIC_TOKENS.color.text.secondary,
            border: `1px solid ${SEMANTIC_TOKENS.color.border.default}`,
            borderRadius: SEMANTIC_TOKENS.border.radius.sm,
            cursor: 'pointer',
          }}
        >
          参数
        </button>

        <span style={{ color: SEMANTIC_TOKENS.color.text.secondary, fontSize: 12 }}>折叠</span>
        <input
          type="range"
          min={0}
          max={100}
          value={foldProgress * 100}
          onChange={(e) => {
            foldProgressRef.current = Number(e.target.value) / 100;
            if (foldProgressRafRef.current !== null) return;
            foldProgressRafRef.current = window.requestAnimationFrame(() => {
              foldProgressRafRef.current = null;
              setFoldProgress(foldProgressRef.current);
            });
          }}
          style={{ flex: 1 }}
        />
        <span style={{ color: SEMANTIC_TOKENS.color.text.primary, fontSize: 12, width: 40 }}>
          {Math.round(foldProgress * 100)}%
        </span>
      </div>

      {/* 🆕 参数化控制面板 */}
      {showParametricControls && (
        <ParametricControls
          initialWidth={parametricParams.width}
          initialHeight={parametricParams.height}
          initialThickness={parametricParams.thickness}
          initialGapSize={parametricParams.gapSize}
          initialCurvature={parametricParams.creaseCurvature}
          initialInterpolation={parametricParams.interpolation}
          initialXMultiplier={parametricParams.xAxisMultiplier}
          initialYMultiplier={parametricParams.yAxisMultiplier}
          initialNestingFactor={parametricParams.nestingFactor}
          onChange={(newParams) => {
            console.log('🎛️ 参数化调整:', newParams);
            setParametricParams(newParams);
          }}
        />
      )}
    </div>
  );
};
