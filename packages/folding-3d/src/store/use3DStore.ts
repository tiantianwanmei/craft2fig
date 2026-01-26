/**
 * @genki/folding-3d 状态管理
 * 基于 Zustand 的 3D 折叠状态
 */

import { create } from 'zustand';
import type { Folding3DState, CameraState, EnvironmentState } from '../types';

interface Store3DState {
  folding: Folding3DState;
  camera: CameraState;
  environment: EnvironmentState;
}

interface Store3DActions {
  setFoldProgress: (progress: number) => void;
  setThickness: (thickness: number) => void;
  setAnimating: (isAnimating: boolean) => void;
  toggleWireframe: () => void;
  toggleLabels: () => void;
  setCameraPosition: (position: [number, number, number]) => void;
  setEnvironmentPreset: (preset: string) => void;
  reset: () => void;
}

const initialState: Store3DState = {
  folding: {
    foldProgress: 0,
    animationDuration: 2000,
    isAnimating: false,
    thickness: 2,
    showWireframe: false,
    showLabels: true,
  },
  camera: {
    position: [200, 150, 200],
    target: [0, 0, 0],
    fov: 45,
  },
  environment: {
    preset: 'studio',
    backgroundColor: '#0a0a0a',
    intensity: 1.5,
  },
};

export const use3DStore = create<Store3DState & Store3DActions>((set) => ({
  ...initialState,

  setFoldProgress: (progress) =>
    set((s) => ({ folding: { ...s.folding, foldProgress: progress } })),

  setThickness: (thickness) =>
    set((s) => ({ folding: { ...s.folding, thickness } })),

  setAnimating: (isAnimating) =>
    set((s) => ({ folding: { ...s.folding, isAnimating } })),

  toggleWireframe: () =>
    set((s) => ({ folding: { ...s.folding, showWireframe: !s.folding.showWireframe } })),

  toggleLabels: () =>
    set((s) => ({ folding: { ...s.folding, showLabels: !s.folding.showLabels } })),

  setCameraPosition: (position) =>
    set((s) => ({ camera: { ...s.camera, position } })),

  setEnvironmentPreset: (preset) =>
    set((s) => ({ environment: { ...s.environment, preset } })),

  reset: () => set(initialState),
}));
