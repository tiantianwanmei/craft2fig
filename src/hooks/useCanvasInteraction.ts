/**
 * 🎨 useCanvasInteraction - 画布交互 Hook
 * 🚀 性能优化：使用 useRef 直接操作 DOM，避免高频重渲染
 */

import { useCallback, useEffect, useRef } from 'react';
import { useAppStore } from '../store';
import type { Vector2D } from '../types/core';

interface UseCanvasInteractionOptions {
  minZoom?: number;
  maxZoom?: number;
  zoomSensitivity?: number;
}

export function useCanvasInteraction(options: UseCanvasInteractionOptions = {}) {
  console.log('🎬 useCanvasInteraction hook initialized');
  const { minZoom = 0.1, maxZoom = 10, zoomSensitivity = 0.002 } = options;

  const setCanvasTransform = useAppStore((s) => s.setCanvasTransform);

  // 🚀 性能优化：使用 ref 存储变换状态，避免触发重渲染
  const transformRef = useRef({ zoom: 1, pan: { x: 0, y: 0 }, rotation: 0 });
  const isPanningRef = useRef(false);
  const lastPointerRef = useRef<Vector2D>({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasElementRef = useRef<HTMLElement | null>(null);

  // 🚀 直接更新 DOM transform，不触发 React 重渲染
  const applyTransformToDOM = useCallback(() => {
    if (!canvasElementRef.current) return;
    const { zoom, pan } = transformRef.current;
    canvasElementRef.current.style.transform =
      `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`;
  }, []);

  // 处理滚轮缩放
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      console.log('🎯 Wheel event triggered:', e.deltaY); // 调试日志
      e.preventDefault(); // 阻止默认滚动行为
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const { zoom, pan } = transformRef.current;

      // 计算缩放中心点
      const centerX = mouseX - pan.x;
      const centerY = mouseY - pan.y;

      // 🎯 简化缩放计算：deltaY > 0 = 缩小，< 0 = 放大
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(minZoom, Math.min(maxZoom, zoom * delta));
      const zoomRatio = newZoom / zoom;

      // 🚀 直接更新 ref，不触发重渲染
      transformRef.current = {
        ...transformRef.current,
        zoom: newZoom,
        pan: {
          x: mouseX - centerX * zoomRatio,
          y: mouseY - centerY * zoomRatio,
        },
      };

      // 🚀 直接操作 DOM
      applyTransformToDOM();
    },
    [minZoom, maxZoom, applyTransformToDOM]
  );

  // 处理鼠标按下 (开始平移)
  const handleMouseDown = useCallback((e: MouseEvent) => {
    // 中键或 Shift+左键开始平移
    if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
      e.preventDefault();
      isPanningRef.current = true;
      lastPointerRef.current = { x: e.clientX, y: e.clientY };
    }
  }, []);

  // 处理鼠标移动 (平移中)
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isPanningRef.current) return;

      const dx = e.clientX - lastPointerRef.current.x;
      const dy = e.clientY - lastPointerRef.current.y;

      // 🚀 直接更新 ref，不触发重渲染
      transformRef.current = {
        ...transformRef.current,
        pan: {
          x: transformRef.current.pan.x + dx,
          y: transformRef.current.pan.y + dy,
        },
      };

      // 🚀 直接操作 DOM
      applyTransformToDOM();

      lastPointerRef.current = { x: e.clientX, y: e.clientY };
    },
    [applyTransformToDOM]
  );

  // 处理鼠标释放 (结束平移)
  const handleMouseUp = useCallback(() => {
    if (isPanningRef.current) {
      isPanningRef.current = false;
      // 平移结束后，同步状态到 Zustand（用于其他组件读取）
      setCanvasTransform(transformRef.current);
    }
  }, [setCanvasTransform]);

  // 绑定事件
  useEffect(() => {
    // 🎯 优先使用 ID 选择器（与 figma-plugin-modern 保持一致）
    const container = document.getElementById('spatialCanvas') || containerRef.current;

    if (!container) {
      console.log('❌ Container not found (neither by ID nor ref)');
      return;
    }

    console.log('✅ Binding wheel event to:', container.tagName, container.id, container.className);

    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleWheel, handleMouseDown, handleMouseMove, handleMouseUp]);

  // 缩放到适合
  const zoomToFit = useCallback(
    (bounds: { x: number; y: number; width: number; height: number }) => {
      const container = containerRef.current;
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const padding = 40;

      const scaleX = (containerRect.width - padding * 2) / bounds.width;
      const scaleY = (containerRect.height - padding * 2) / bounds.height;
      const zoom = Math.min(scaleX, scaleY, 1);

      const panX = (containerRect.width - bounds.width * zoom) / 2 - bounds.x * zoom;
      const panY = (containerRect.height - bounds.height * zoom) / 2 - bounds.y * zoom;

      transformRef.current = {
        ...transformRef.current,
        zoom,
        pan: { x: panX, y: panY },
      };

      applyTransformToDOM();
      setCanvasTransform(transformRef.current);
    },
    [applyTransformToDOM, setCanvasTransform]
  );

  // 重置视图
  const resetView = useCallback(() => {
    transformRef.current = {
      zoom: 1,
      pan: { x: 0, y: 0 },
      rotation: 0,
    };
    applyTransformToDOM();
    setCanvasTransform(transformRef.current);
  }, [applyTransformToDOM, setCanvasTransform]);

  // 设置 canvas 元素引用
  const setCanvasElement = useCallback((element: HTMLElement | null) => {
    canvasElementRef.current = element;
    if (element) {
      applyTransformToDOM();
    }
  }, [applyTransformToDOM]);

  return {
    containerRef,
    setCanvasElement,
    transform: transformRef.current,
    isPanning: isPanningRef.current,
    zoomToFit,
    resetView,
  };
}
