// ============================================================================
// HDR WORKER MANAGER - 管理 HDR 后台解析
// ============================================================================

import * as THREE from 'three';

export interface HDRLoadOptions {
  maxResolution?: number;
  onProgress?: (progress: number) => void;
}

export interface HDRLoadResult {
  texture: THREE.DataTexture;
  width: number;
  height: number;
}

// Worker 实例（懒加载）
let workerInstance: Worker | null = null;
let requestId = 0;
const pendingRequests = new Map<string, {
  resolve: (result: HDRLoadResult) => void;
  reject: (error: Error) => void;
  onProgress?: (progress: number) => void;
}>();

import HDRWorker from './hdr.worker?worker&inline';

/**
 * 获取或创建 Worker 实例
 */
function getWorker(): Worker {
  if (!workerInstance) {
    try {
      workerInstance = new HDRWorker();
    } catch (e) {
      console.error('❌ Failed to initialize HDR Worker:', e);
      // Fallback or rethrow
      throw e;
    }


    workerInstance.onmessage = handleWorkerMessage;
    workerInstance.onerror = handleWorkerError;
  }
  return workerInstance;
}

/**
 * 处理 Worker 消息
 */
function handleWorkerMessage(e: MessageEvent) {
  const { type, id, data, width, height, error, progress } = e.data;

  const request = pendingRequests.get(id);
  if (!request) return;

  switch (type) {
    case 'HDR_PROGRESS':
      request.onProgress?.(progress);
      break;

    case 'HDR_PARSED':
      // 创建 Three.js 纹理
      const texture = new THREE.DataTexture(
        data,
        width,
        height,
        THREE.RGBAFormat,
        THREE.FloatType
      );
      texture.mapping = THREE.EquirectangularReflectionMapping;
      texture.needsUpdate = true;

      pendingRequests.delete(id);
      request.resolve({ texture, width, height });
      break;

    case 'HDR_ERROR':
      pendingRequests.delete(id);
      request.reject(new Error(error));
      break;
  }
}

/**
 * 处理 Worker 错误
 */
function handleWorkerError(e: ErrorEvent) {
  console.error('HDR Worker 错误:', e);
  // 拒绝所有待处理请求
  pendingRequests.forEach((request, id) => {
    request.reject(new Error('Worker 崩溃'));
    pendingRequests.delete(id);
  });
}

/**
 * 🚀 异步加载 HDR（不阻塞主线程）
 */
export async function loadHDRInWorker(
  file: File,
  options: HDRLoadOptions = {}
): Promise<HDRLoadResult> {
  const { maxResolution = 2048, onProgress } = options;

  // 读取文件为 ArrayBuffer
  const buffer = await file.arrayBuffer();

  return new Promise((resolve, reject) => {
    const id = `hdr-${++requestId}`;

    pendingRequests.set(id, { resolve, reject, onProgress });

    const worker = getWorker();
    worker.postMessage(
      {
        type: 'PARSE_HDR',
        id,
        buffer,
        fileName: file.name,
        maxResolution,
      },
      [buffer] // Transferable - 零拷贝传输
    );
  });
}

/**
 * 销毁 Worker
 */
export function terminateHDRWorker(): void {
  if (workerInstance) {
    workerInstance.terminate();
    workerInstance = null;
  }
  pendingRequests.clear();
}
