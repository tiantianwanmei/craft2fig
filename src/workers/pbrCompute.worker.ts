/**
 * 🎨 PBR Compute Worker - 在后台线程生成 PBR 贴图
 * 将重度的 Canvas 图像处理从主线程移出，保持 UI 流畅
 */

export interface CraftLayerData {
    name: string;
    craftType: string;
    crafts?: string[];
    pngPreview?: string;
    svgPreview?: string;
    bounds?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
}

export interface DieBounds {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    width: number;
    height: number;
}

export interface CraftPBRParams {
    metalness: number;
    roughness: number;
    clearcoat: number;
    clearcoatRoughness: number;
}

export interface CraftPBRConfig {
    hotfoil: CraftPBRParams;
    silver: CraftPBRParams;
    uv: CraftPBRParams;
}

export interface PBRComputeRequest {
    type: 'GENERATE_PBR_MAPS';
    id: string;
    craftLayers: CraftLayerData[];
    width: number;
    height: number;
    pbrConfig: CraftPBRConfig;
    dieBounds?: DieBounds;
}

export interface PBRComputeResponse {
    type: 'PBR_MAPS_RESULT';
    id: string;
    metalnessImageData: ImageData;
    roughnessImageData: ImageData;
    clearcoatImageData: ImageData;
}

export interface PBRComputeError {
    type: 'PBR_MAPS_ERROR';
    id: string;
    error: string;
}

// 工艺类型判断函数
const isHotfoil = (layer: CraftLayerData) =>
    layer.craftType === 'HOTFOIL' ||
    layer.crafts?.some(c => c.includes('烫金') || c.toLowerCase().includes('hotfoil') || c.toLowerCase().includes('gold')) ||
    layer.name.includes('烫金') ||
    layer.name.toLowerCase().includes('hotfoil') ||
    layer.name.toLowerCase().includes('gold foil');

const isSilverFoil = (layer: CraftLayerData) =>
    String(layer.craftType ?? '') === 'SILVER' ||
    String(layer.craftType ?? '') === 'SILVERFOIL' ||
    layer.crafts?.some(c => c.includes('烫银') || c.toLowerCase().includes('silver')) ||
    layer.name.includes('烫银') ||
    layer.name.toLowerCase().includes('silver');

const isUV = (layer: CraftLayerData) =>
    layer.craftType === 'UV' ||
    layer.craftType === 'SPOT_UV' ||
    layer.craftType === 'VARNISH' ||
    layer.crafts?.some(c => c.includes('UV') || c.includes('光油') || c.toLowerCase().includes('varnish')) ||
    layer.name.includes('UV') ||
    layer.name.includes('光油') ||
    layer.name.toLowerCase().includes('varnish');

// 获取工艺类型的 PBR 参数
function getCraftPBRParams(layer: CraftLayerData, config: CraftPBRConfig): CraftPBRParams | null {
    if (isHotfoil(layer)) return config.hotfoil;
    if (isSilverFoil(layer)) return config.silver;
    if (isUV(layer)) return config.uv;
    return null;
}

// 从 base64 加载图片到 Canvas
async function loadImageToCanvas(base64: string): Promise<HTMLCanvasElement | null> {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = new OffscreenCanvas(img.width, img.height);
            const ctx = canvas.getContext('2d')!;
            ctx.drawImage(img, 0, 0);
            resolve(canvas as any);
        };
        img.onerror = () => resolve(null);
        img.src = base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`;
    });
}

// 创建全白遮罩 Canvas
function createSolidMaskCanvas(width: number, height: number): OffscreenCanvas {
    const canvas = new OffscreenCanvas(Math.max(1, Math.round(width)), Math.max(1, Math.round(height)));
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return canvas;
}

// 将遮罩的 alpha 通道应用为指定灰度值
function applyMaskWithValue(
    ctx: OffscreenCanvasRenderingContext2D,
    maskData: ImageData,
    grayValue: number
): void {
    const { width, height, data } = maskData;
    const outputData = new ImageData(width, height);
    const out = outputData.data;

    for (let i = 0; i < data.length; i += 4) {
        const alpha = data[i + 3];
        const luminance = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
        const maskStrength = alpha > 0 ? (luminance / 255) * (alpha / 255) : 0;

        out[i] = grayValue;
        out[i + 1] = grayValue;
        out[i + 2] = grayValue;
        out[i + 3] = Math.round(maskStrength * 255);
    }

    ctx.putImageData(outputData, 0, 0);
}

// 生成 PBR 贴图
async function generatePBRMaps(
    craftLayers: CraftLayerData[],
    baseWidth: number,
    baseHeight: number,
    config: CraftPBRConfig,
    dieBounds?: DieBounds
): Promise<{ metalnessImageData: ImageData; roughnessImageData: ImageData; clearcoatImageData: ImageData }> {
    // 创建三个通道的 OffscreenCanvas
    const metalnessCanvas = new OffscreenCanvas(baseWidth, baseHeight);
    const roughnessCanvas = new OffscreenCanvas(baseWidth, baseHeight);
    const clearcoatCanvas = new OffscreenCanvas(baseWidth, baseHeight);

    const metalnessCtx = metalnessCanvas.getContext('2d')!;
    const roughnessCtx = roughnessCanvas.getContext('2d')!;
    const clearcoatCtx = clearcoatCanvas.getContext('2d')!;

    // 初始化
    metalnessCtx.fillStyle = '#000000';
    metalnessCtx.fillRect(0, 0, baseWidth, baseHeight);

    roughnessCtx.fillStyle = '#ffffff';
    roughnessCtx.fillRect(0, 0, baseWidth, baseHeight);

    clearcoatCtx.fillStyle = '#000000';
    clearcoatCtx.fillRect(0, 0, baseWidth, baseHeight);

    // 计算坐标变换参数
    const padding = 16;
    const availableWidth = baseWidth - padding * 2;
    const availableHeight = baseHeight - padding * 2;

    let scale = 1;
    let offsetX = 0;
    let offsetY = 0;

    if (dieBounds) {
        scale = Math.min(
            availableWidth / dieBounds.width,
            availableHeight / dieBounds.height
        );
        offsetX = padding - dieBounds.minX * scale;
        offsetY = padding - dieBounds.minY * scale;
    }

    // 处理每个工艺层
    for (const layer of craftLayers) {
        const params = getCraftPBRParams(layer, config);
        if (!params) continue;

        const maskBase64 = layer.pngPreview || layer.svgPreview;
        let maskCanvas: OffscreenCanvas | HTMLCanvasElement | null = null;

        if (maskBase64) {
            maskCanvas = await loadImageToCanvas(maskBase64);
        } else if (layer.bounds && layer.bounds.width > 0 && layer.bounds.height > 0) {
            maskCanvas = createSolidMaskCanvas(layer.bounds.width, layer.bounds.height);
        }

        if (!maskCanvas) continue;

        const bounds = layer.bounds;
        const srcX = bounds?.x ?? 0;
        const srcY = bounds?.y ?? 0;
        const srcW = bounds?.width ?? maskCanvas.width;
        const srcH = bounds?.height ?? maskCanvas.height;

        const destX = srcX * scale + offsetX;
        const destY = srcY * scale + offsetY;
        const destW = srcW * scale;
        const destH = srcH * scale;

        const maskCtx = maskCanvas.getContext('2d') as OffscreenCanvasRenderingContext2D;
        if (!maskCtx) continue;
        const maskData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);

        const tempCanvas = new OffscreenCanvas(maskCanvas.width, maskCanvas.height);
        const tempCtx = tempCanvas.getContext('2d')!;

        // 绘制 metalness
        if (params.metalness > 0) {
            const metalnessValue = Math.round(params.metalness * 255);
            applyMaskWithValue(tempCtx, maskData, metalnessValue);
            metalnessCtx.drawImage(tempCanvas, 0, 0, maskCanvas.width, maskCanvas.height,
                destX, destY, destW, destH);
        }

        // 绘制 roughness
        const roughnessValue = Math.round(params.roughness * 255);
        applyMaskWithValue(tempCtx, maskData, roughnessValue);
        roughnessCtx.globalCompositeOperation = 'multiply';
        roughnessCtx.drawImage(tempCanvas, 0, 0, maskCanvas.width, maskCanvas.height,
            destX, destY, destW, destH);
        roughnessCtx.globalCompositeOperation = 'source-over';

        // 绘制 clearcoat
        if (params.clearcoat > 0) {
            const clearcoatValue = Math.round(params.clearcoat * 255);
            applyMaskWithValue(tempCtx, maskData, clearcoatValue);
            clearcoatCtx.globalCompositeOperation = 'lighter';
            clearcoatCtx.drawImage(tempCanvas, 0, 0, maskCanvas.width, maskCanvas.height,
                destX, destY, destW, destH);
            clearcoatCtx.globalCompositeOperation = 'source-over';
        }
    }

    // 返回 ImageData（可传输对象）
    return {
        metalnessImageData: metalnessCtx.getImageData(0, 0, baseWidth, baseHeight),
        roughnessImageData: roughnessCtx.getImageData(0, 0, baseWidth, baseHeight),
        clearcoatImageData: clearcoatCtx.getImageData(0, 0, baseWidth, baseHeight),
    };
}

// Worker 消息处理
self.onmessage = async (e: MessageEvent<PBRComputeRequest>) => {
    const { type, id, craftLayers, width, height, pbrConfig, dieBounds } = e.data;

    if (type === 'GENERATE_PBR_MAPS') {
        try {
            const result = await generatePBRMaps(craftLayers, width, height, pbrConfig, dieBounds);

            const response: PBRComputeResponse = {
                type: 'PBR_MAPS_RESULT',
                id,
                ...result,
            };

            // 使用 Transferable Objects 提高性能
            self.postMessage(response, {
                transfer: [
                    result.metalnessImageData.data.buffer,
                    result.roughnessImageData.data.buffer,
                    result.clearcoatImageData.data.buffer,
                ]
            });
        } catch (error) {
            const errorResponse: PBRComputeError = {
                type: 'PBR_MAPS_ERROR',
                id,
                error: error instanceof Error ? error.message : String(error),
            };
            self.postMessage(errorResponse);
        }
    }
};

export { };
