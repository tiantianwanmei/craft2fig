/**
 * 🎨 SVG & Raster Extraction Utilities
 * 用于参数化系统的数据提取
 */

/**
 * 提取节点的 SVG 路径数据
 * @param node - Vector 节点
 * @returns SVG 路径字符串（d 属性值）
 */
export async function extractSVGPath(node: SceneNode): Promise<string | null> {
    try {
        // 方法 1：使用 vectorPaths API（推荐）
        if ('vectorPaths' in node && node.vectorPaths && node.vectorPaths.length > 0) {
            // 合并所有路径（如果有多个）
            const paths = node.vectorPaths.map(vp => vp.data).filter(Boolean);
            if (paths.length > 0) {
                return paths.join(' ');
            }
        }

        // 方法 2：导出为 SVG 并解析（备用方案）
        if ('exportAsync' in node) {
            const svg = await node.exportAsync({ format: 'SVG_STRING' });
            // 提取 <path d="..."> 中的 d 属性
            const match = svg.match(/<path[^>]*\sd="([^"]+)"/);
            if (match && match[1]) {
                return match[1];
            }
        }

        return null;
    } catch (error) {
        console.warn('Failed to extract SVG path:', node.name, error);
        return null;
    }
}

/**
 * 缓存节点的光栅化图像
 * @param node - 要光栅化的节点
 * @param scale - 缩放比例（默认 2x 用于高清显示）
 * @returns Base64 编码的 PNG 数据 URL
 */
export async function cacheRasterImage(
    node: SceneNode,
    scale: number = 2
): Promise<string | null> {
    try {
        if (!('exportAsync' in node)) {
            return null;
        }

        const bytes = await node.exportAsync({
            format: 'PNG',
            constraint: { type: 'SCALE', value: scale },
        });

        return `data:image/png;base64,${figma.base64Encode(bytes)}`;
    } catch (error) {
        console.warn('Failed to cache raster image:', node.name, error);
        return null;
    }
}

/**
 * 提取节点的原始边界信息
 * @param node - 节点
 * @returns 边界对象或 null
 */
export function extractOriginalBounds(node: SceneNode): {
    x: number;
    y: number;
    width: number;
    height: number;
} | null {
    try {
        const bounds = node.absoluteBoundingBox;
        if (!bounds) return null;

        return {
            x: bounds.x,
            y: bounds.y,
            width: bounds.width,
            height: bounds.height,
        };
    } catch (error) {
        console.warn('Failed to extract bounds:', node.name, error);
        return null;
    }
}

/**
 * 批量提取 SVG 路径和光栅缓存
 * @param nodes - 节点数组
 * @returns 提取结果映射
 */
export async function batchExtractVectorData(
    nodes: SceneNode[]
): Promise<Map<string, {
    svgPath: string | null;
    rasterCache: string | null;
    originalBounds: { x: number; y: number; width: number; height: number } | null;
}>> {
    const results = new Map();

    console.log(`🔄 Batch extracting vector data for ${nodes.length} nodes...`);

    for (const node of nodes) {
        try {
            const [svgPath, rasterCache] = await Promise.all([
                extractSVGPath(node),
                cacheRasterImage(node),
            ]);

            const originalBounds = extractOriginalBounds(node);

            results.set(node.id, {
                svgPath,
                rasterCache,
                originalBounds,
            });

            if (svgPath) {
                console.log(`✅ ${node.name}: SVG path extracted (${svgPath.length} chars)`);
            }
            if (rasterCache) {
                console.log(`✅ ${node.name}: Raster cached (${rasterCache.length} chars)`);
            }
        } catch (error) {
            console.warn(`❌ Failed to extract data for ${node.name}:`, error);
            results.set(node.id, {
                svgPath: null,
                rasterCache: null,
                originalBounds: null,
            });
        }
    }

    console.log(`✅ Batch extraction complete: ${results.size} nodes processed`);
    return results;
}
