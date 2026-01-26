// ============================================================================
// 🎨 WebGPU Path Tracing Integration - WebGPU 路径追踪集成
// ============================================================================

import type { RenderQuality } from '../types';

// 路径追踪配置
export interface PathTracingConfig {
  maxBounces: number;
  samplesPerFrame: number;
  exposure: number;
  envMapIntensity: number;
}

// 质量预设映射
const QUALITY_CONFIG: Record<RenderQuality, PathTracingConfig> = {
  draft: {
    maxBounces: 2,
    samplesPerFrame: 1,
    exposure: 1.0,
    envMapIntensity: 1.0,
  },
  preview: {
    maxBounces: 4,
    samplesPerFrame: 1,
    exposure: 1.0,
    envMapIntensity: 1.0,
  },
  production: {
    maxBounces: 8,
    samplesPerFrame: 2,
    exposure: 1.0,
    envMapIntensity: 1.0,
  },
};

// WebGPU 支持检测
export async function checkWebGPUSupport(): Promise<boolean> {
  if (!navigator.gpu) return false;
  try {
    const adapter = await navigator.gpu.requestAdapter();
    return adapter !== null;
  } catch {
    return false;
  }
}

// 路径追踪引擎类
export class PathTracingEngine {
  private device: GPUDevice | null = null;
  private config: PathTracingConfig;
  private frameCount = 0;
  private isInitialized = false;

  constructor(quality: RenderQuality = 'preview') {
    this.config = { ...QUALITY_CONFIG[quality] };
  }

  // 初始化 WebGPU
  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      if (!navigator.gpu) {
        console.warn('WebGPU not supported');
        return false;
      }

      const adapter = await navigator.gpu.requestAdapter({
        powerPreference: 'high-performance',
      });

      if (!adapter) {
        console.warn('No GPU adapter found');
        return false;
      }

      this.device = await adapter.requestDevice({
        requiredLimits: {
          maxStorageBufferBindingSize: 256 * 1024 * 1024,
        },
      });

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('WebGPU init failed:', error);
      return false;
    }
  }

  // 更新质量配置
  setQuality(quality: RenderQuality) {
    this.config = { ...QUALITY_CONFIG[quality] };
    this.resetAccumulation();
  }

  // 重置累积
  resetAccumulation() {
    this.frameCount = 0;
  }

  // 获取配置
  getConfig(): PathTracingConfig {
    return { ...this.config };
  }

  // 获取帧数
  getFrameCount(): number {
    return this.frameCount;
  }

  // 增加帧数
  incrementFrame() {
    this.frameCount++;
  }

  // 是否已初始化
  isReady(): boolean {
    return this.isInitialized;
  }

  // 销毁
  dispose() {
    this.device = null;
    this.isInitialized = false;
  }
}

// 导出质量配置
export { QUALITY_CONFIG };