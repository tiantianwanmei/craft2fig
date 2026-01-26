// ============================================================================
// 🎨 Hybrid Renderer Core - 混合渲染引擎核心
// ============================================================================

import type { RenderMode, RenderQuality, HybridRendererConfig } from '../types';

// 渲染器状态
export interface RendererStatus {
  mode: RenderMode;
  isIdle: boolean;
  lastInteraction: number;
  samples: number;
  targetSamples: number;
}

// 质量预设
const QUALITY_PRESETS: Record<RenderQuality, { samples: number; bounces: number }> = {
  draft: { samples: 32, bounces: 2 },
  preview: { samples: 128, bounces: 4 },
  production: { samples: 512, bounces: 8 },
};

// 混合渲染器类
export class HybridRenderer {
  private config: HybridRendererConfig;
  private status: RendererStatus;
  private idleTimer: number | null = null;
  private onModeChange?: (mode: RenderMode) => void;

  constructor(config: HybridRendererConfig) {
    this.config = config;
    this.status = {
      mode: 'realtime',
      isIdle: false,
      lastInteraction: Date.now(),
      samples: 0,
      targetSamples: QUALITY_PRESETS[config.quality].samples,
    };
  }

  // 设置模式变化回调
  setOnModeChange(callback: (mode: RenderMode) => void) {
    this.onModeChange = callback;
  }

  // 记录用户交互
  onInteraction() {
    this.status.lastInteraction = Date.now();
    this.status.isIdle = false;

    // 切换到实时模式
    if (this.status.mode === 'pathtracing') {
      this.switchMode('realtime');
    }

    // 重置空闲计时器
    this.resetIdleTimer();
  }

  // 重置空闲计时器
  private resetIdleTimer() {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
    }

    if (this.config.autoSwitch.enabled) {
      this.idleTimer = window.setTimeout(() => {
        this.onIdle();
      }, this.config.autoSwitch.idleThreshold);
    }
  }

  // 空闲时切换到路径追踪
  private onIdle() {
    this.status.isIdle = true;
    if (this.config.pathTracing.enabled) {
      this.switchMode('pathtracing');
    }
  }

  // 切换渲染模式
  private switchMode(mode: RenderMode) {
    if (this.status.mode !== mode) {
      this.status.mode = mode;
      this.status.samples = 0;
      this.onModeChange?.(mode);
    }
  }

  // 更新配置
  updateConfig(config: Partial<HybridRendererConfig>) {
    this.config = { ...this.config, ...config };
    if (config.quality) {
      this.status.targetSamples = QUALITY_PRESETS[config.quality].samples;
    }
  }

  // 获取当前状态
  getStatus(): RendererStatus {
    return { ...this.status };
  }

  // 获取渲染进度
  getProgress(): number {
    if (this.status.targetSamples === 0) return 0;
    return this.status.samples / this.status.targetSamples;
  }

  // 增加采样数
  addSample() {
    this.status.samples++;
  }

  // 销毁
  dispose() {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
    }
  }
}