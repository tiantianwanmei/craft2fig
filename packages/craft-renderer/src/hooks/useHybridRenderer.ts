// ============================================================================
// 🎨 useHybridRenderer Hook - 混合渲染器 Hook
// ============================================================================

import { useRef, useEffect, useCallback } from 'react';
import { HybridRenderer } from '../core';
import { useCraftRendererStore } from '../store';

export function useHybridRenderer() {
  const rendererRef = useRef<HybridRenderer | null>(null);
  const { config, updateRenderState } = useCraftRendererStore();

  // 初始化渲染器
  useEffect(() => {
    rendererRef.current = new HybridRenderer(config);

    rendererRef.current.setOnModeChange((mode) => {
      updateRenderState({ currentMode: mode });
    });

    return () => {
      rendererRef.current?.dispose();
    };
  }, []);

  // 交互处理
  const onInteraction = useCallback(() => {
    rendererRef.current?.onInteraction();
  }, []);

  // 获取状态
  const getStatus = useCallback(() => {
    return rendererRef.current?.getStatus() ?? null;
  }, []);

  // 获取进度
  const getProgress = useCallback(() => {
    return rendererRef.current?.getProgress() ?? 0;
  }, []);

  return {
    onInteraction,
    getStatus,
    getProgress,
  };
}
