/**
 * 🎨 PBR Compute Client - PBR Worker 的客户端封装
 * 提供请求队列、缓存和生命周期管理
 */

import type {
    PBRComputeRequest,
    PBRComputeResponse,
    PBRComputeError,
    CraftLayerData,
    DieBounds,
    CraftPBRConfig,
} from './pbrCompute.worker';

export interface PBRMapsResult {
    metalnessImageData: ImageData;
    roughnessImageData: ImageData;
    clearcoatImageData: ImageData;
}

type PendingRequest = {
    resolve: (result: PBRMapsResult) => void;
    reject: (error: Error) => void;
};

import PBRComputeWorker from './pbrCompute.worker?worker&inline';

class PBRComputeClient {
    private worker: Worker | null = null;
    private pendingRequests = new Map<string, PendingRequest>();
    private requestIdCounter = 0;
    private cache = new Map<string, PBRMapsResult>();
    private maxCacheSize = 10; // LRU cache size

    private initWorker() {
        if (this.worker) return;

        try {
            this.worker = new PBRComputeWorker();
        } catch (e) {
            console.error('❌ Failed to initialize PBR Worker:', e);
            // Fallback strategy if needed, but inlining usually works
        }


        if (!this.worker) return;

        this.worker.onmessage = (e: MessageEvent<PBRComputeResponse | PBRComputeError>) => {
            const { type, id } = e.data;

            const pending = this.pendingRequests.get(id);
            if (!pending) return;

            this.pendingRequests.delete(id);

            if (type === 'PBR_MAPS_RESULT') {
                const result = e.data as PBRComputeResponse;
                pending.resolve({
                    metalnessImageData: result.metalnessImageData,
                    roughnessImageData: result.roughnessImageData,
                    clearcoatImageData: result.clearcoatImageData,
                });
            } else if (type === 'PBR_MAPS_ERROR') {
                const error = e.data as PBRComputeError;
                pending.reject(new Error(error.error));
            }
        };

        this.worker.onerror = (error) => {
            console.error('❌ PBR Worker error:', error);
            // Reject all pending requests
            for (const [id, pending] of this.pendingRequests.entries()) {
                pending.reject(new Error('Worker error'));
                this.pendingRequests.delete(id);
            }
        };
    }

    private getCacheKey(
        craftLayers: CraftLayerData[],
        width: number,
        height: number,
        _pbrConfig: CraftPBRConfig,
        dieBounds?: DieBounds
    ): string {
        // 创建简单的缓存键
        const layerKey = craftLayers.map(l => `${l.name}-${l.craftType}`).join(',');
        const boundsKey = dieBounds ? `${dieBounds.minX},${dieBounds.minY},${dieBounds.width},${dieBounds.height}` : '';
        return `${layerKey}-${width}x${height}-${boundsKey}`;
    }

    private evictOldestCache() {
        if (this.cache.size >= this.maxCacheSize) {
            const firstKey = this.cache.keys().next().value;
            if (firstKey) {
                this.cache.delete(firstKey);
            }
        }
    }

    async generatePBRMaps(
        craftLayers: CraftLayerData[],
        width: number,
        height: number,
        pbrConfig: CraftPBRConfig,
        dieBounds?: DieBounds
    ): Promise<PBRMapsResult> {
        // 检查缓存
        const cacheKey = this.getCacheKey(craftLayers, width, height, pbrConfig, dieBounds);
        const cached = this.cache.get(cacheKey);
        if (cached) {
            console.log('🎨 PBR maps cache hit');
            return cached;
        }

        // 初始化 worker
        this.initWorker();

        // 创建请求
        const id = `pbr-${++this.requestIdCounter}`;
        const request: PBRComputeRequest = {
            type: 'GENERATE_PBR_MAPS',
            id,
            craftLayers,
            width,
            height,
            pbrConfig,
            dieBounds,
        };

        // 创建 Promise
        const promise = new Promise<PBRMapsResult>((resolve, reject) => {
            this.pendingRequests.set(id, { resolve, reject });
        });

        // 发送请求
        this.worker!.postMessage(request);

        // 等待结果
        const result = await promise;

        // 缓存结果
        this.evictOldestCache();
        this.cache.set(cacheKey, result);

        return result;
    }

    clearCache() {
        this.cache.clear();
    }

    terminate() {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
        this.pendingRequests.clear();
        this.cache.clear();
    }
}

// 单例实例
let pbrComputeClient: PBRComputeClient | null = null;

export function getPBRComputeClient(): PBRComputeClient {
    if (!pbrComputeClient) {
        pbrComputeClient = new PBRComputeClient();
    }
    return pbrComputeClient;
}

export function terminatePBRComputeClient() {
    if (pbrComputeClient) {
        pbrComputeClient.terminate();
        pbrComputeClient = null;
    }
}
