// ============================================================================
// 🖨️ Print Master Pro - Store
// ============================================================================

import { create } from 'zustand';
import { PrintPreset, PrintSettings, ColorProfile } from './types';
import { DEFAULT_PRINT_SETTINGS, ALL_PRESETS } from './presets';

interface PrintMasterState {
  // Settings
  settings: PrintSettings;

  // UI State
  isOpen: boolean;
  activeCategory: string;

  // Custom size inputs
  customWidth: number;
  customHeight: number;
  customUnit: 'mm' | 'in';

  // Actions
  setPreset: (preset: PrintPreset) => void;
  setCustomSize: (width: number, height: number, unit: 'mm' | 'in') => void;
  setDpi: (dpi: number) => void;
  setOrientation: (orientation: 'portrait' | 'landscape') => void;
  setBleed: (bleed: number) => void;
  setSimulateCMYK: (simulate: boolean) => void;
  setColorProfile: (profile: ColorProfile) => void;
  setActiveCategory: (category: string) => void;
  togglePanel: () => void;
  openPanel: () => void;
  closePanel: () => void;
  reset: () => void;
}

export const usePrintMasterStore = create<PrintMasterState>((set) => ({
  // Initial state
  settings: DEFAULT_PRINT_SETTINGS,
  isOpen: false,
  activeCategory: 'ISO',
  customWidth: 210,
  customHeight: 297,
  customUnit: 'mm',

  // Actions
  setPreset: (preset) =>
    set((state) => ({
      settings: { ...state.settings, preset },
    })),

  setCustomSize: (width, height, unit) =>
    set((state) => ({
      customWidth: width,
      customHeight: height,
      customUnit: unit,
      settings: {
        ...state.settings,
        preset: {
          id: 'custom',
          name: 'Custom',
          category: 'Custom',
          width,
          height,
          unit,
        },
      },
    })),

  setDpi: (dpi) =>
    set((state) => ({
      settings: { ...state.settings, dpi },
    })),

  setOrientation: (orientation) =>
    set((state) => ({
      settings: { ...state.settings, orientation },
    })),

  setBleed: (bleed) =>
    set((state) => ({
      settings: { ...state.settings, bleed },
    })),

  setSimulateCMYK: (simulateCMYK) =>
    set((state) => ({
      settings: { ...state.settings, simulateCMYK },
    })),

  setColorProfile: (colorProfile) =>
    set((state) => ({
      settings: { ...state.settings, colorProfile },
    })),

  setActiveCategory: (activeCategory) =>
    set({ activeCategory }),

  togglePanel: () =>
    set((state) => ({ isOpen: !state.isOpen })),

  openPanel: () =>
    set({ isOpen: true }),

  closePanel: () =>
    set({ isOpen: false }),

  reset: () =>
    set({
      settings: DEFAULT_PRINT_SETTINGS,
      activeCategory: 'ISO',
    }),
}))
