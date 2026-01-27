/**
 * SVGShapeGeometry - SVG 形状几何体生成器
 * 使用 Three.js SVGLoader 将 SVG 路径转换为 ShapeGeometry
 */

import * as THREE from 'three';
// @ts-ignore
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader';

/**
 * 从 SVG 路径字符串创建 Shape
 * @param svgPath - SVG 路径数据（d 属性值）
 * @returns THREE.Shape 或 null
 */
export function createShapeFromSVGPath(svgPath: string): THREE.Shape | null {
    try {
        // 创建临时 SVG 元素
        const svgString = `<svg><path d="${svgPath}"/></svg>`;

        // 使用 SVGLoader 解析
        const loader = new SVGLoader();
        const svgData = loader.parse(svgString);

        if (!svgData.paths || svgData.paths.length === 0) {
            console.warn('No paths found in SVG');
            return null;
        }

        // 获取第一个路径的形状
        const path = svgData.paths[0];
        if (!path.toShapes) {
            console.warn('Path does not support toShapes');
            return null;
        }

        const shapes = path.toShapes(true);
        if (shapes.length === 0) {
            console.warn('No shapes generated from path');
            return null;
        }

        // 返回第一个形状（通常只有一个）
        return shapes[0];
    } catch (error) {
        console.error('Failed to create shape from SVG path:', error);
        return null;
    }
}

/**
 * 从 Shape 创建带 UV 的平面几何体
 * @param shape - THREE.Shape
 * @param bounds - 边界框（用于 UV 映射）
 * @param uvRegion - UV 区域
 * @returns BufferGeometry 或 null
 */
export function createGeometryFromShape(
    shape: THREE.Shape,
    bounds: { x: number; y: number; width: number; height: number },
    uvRegion: { u0: number; v0: number; u1: number; v1: number }
): THREE.BufferGeometry | null {
    try {
        // 创建 ShapeGeometry
        const geometry = new THREE.ShapeGeometry(shape);

        // 获取位置属性
        const positions = geometry.getAttribute('position');
        if (!positions) {
            console.warn('Geometry has no position attribute');
            return null;
        }

        // 计算边界
        geometry.computeBoundingBox();
        const bbox = geometry.boundingBox;
        if (!bbox) {
            console.warn('Failed to compute bounding box');
            return null;
        }

        // 生成 UV 坐标
        const uvs: number[] = [];
        const posArray = positions.array as Float32Array;

        for (let i = 0; i < posArray.length; i += 3) {
            const x = posArray[i];
            const y = posArray[i + 1];

            // 归一化到 [0, 1]
            const u = (x - bbox.min.x) / (bbox.max.x - bbox.min.x);
            const v = (y - bbox.min.y) / (bbox.max.y - bbox.min.y);

            // 映射到 UV 区域
            const finalU = uvRegion.u0 + u * (uvRegion.u1 - uvRegion.u0);
            const finalV = uvRegion.v0 + v * (uvRegion.v1 - uvRegion.v0);

            uvs.push(finalU, finalV);
        }

        // 设置 UV 属性
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));

        // 平移和缩放到目标边界
        const scaleX = bounds.width / (bbox.max.x - bbox.min.x);
        const scaleY = bounds.height / (bbox.max.y - bbox.min.y);

        geometry.scale(scaleX, scaleY, 1);
        geometry.translate(
            bounds.x - bbox.min.x * scaleX,
            bounds.y - bbox.min.y * scaleY,
            0
        );

        return geometry;
    } catch (error) {
        console.error('Failed to create geometry from shape:', error);
        return null;
    }
}

/**
 * 从 SVG 路径直接创建几何体（便捷方法）
 * @param svgPath - SVG 路径数据
 * @param bounds - 边界框
 * @param uvRegion - UV 区域
 * @param thickness - 厚度（用于挤出）
 * @returns BufferGeometry 或 null
 */
export function createSVGPanelGeometry(
    svgPath: string,
    bounds: { x: number; y: number; width: number; height: number },
    uvRegion: { u0: number; v0: number; u1: number; v1: number },
    thickness: number = 1
): {
    frontGeometry: THREE.BufferGeometry | null;
    backGeometry: THREE.BufferGeometry | null;
} {
    const shape = createShapeFromSVGPath(svgPath);
    if (!shape) {
        return { frontGeometry: null, backGeometry: null };
    }

    // 创建正面几何体
    const frontGeometry = createGeometryFromShape(shape, bounds, uvRegion);
    if (!frontGeometry) {
        return { frontGeometry: null, backGeometry: null };
    }

    // 平移到正面位置
    frontGeometry.translate(0, 0, thickness / 2);

    // 创建背面几何体（克隆并翻转法线）
    const backGeometry = frontGeometry.clone();
    backGeometry.translate(0, 0, -thickness);

    // 翻转背面法线和绕序
    const backNormals = backGeometry.getAttribute('normal');
    if (backNormals) {
        const normalsArray = backNormals.array as Float32Array;
        for (let i = 0; i < normalsArray.length; i++) {
            normalsArray[i] *= -1;
        }
        backNormals.needsUpdate = true;
    }

    // 翻转索引绕序
    const backIndex = backGeometry.getIndex();
    if (backIndex) {
        const indexArray = backIndex.array;
        for (let i = 0; i < indexArray.length; i += 3) {
            const temp = indexArray[i];
            indexArray[i] = indexArray[i + 2];
            indexArray[i + 2] = temp;
        }
        backIndex.needsUpdate = true;
    }

    return { frontGeometry, backGeometry };
}

/**
 * 合并多个几何体为单一 BufferGeometry
 * @param geometries - 几何体数组
 * @returns 合并后的 BufferGeometry
 */
export function mergeGeometries(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
    const validGeometries = geometries.filter(g => g !== null);
    if (validGeometries.length === 0) {
        return new THREE.BufferGeometry();
    }

    // 使用 Three.js 的 BufferGeometryUtils
    // 注意：需要手动实现或导入 BufferGeometryUtils
    // 这里简化实现
    const merged = new THREE.BufferGeometry();

    let totalVertices = 0;
    let totalIndices = 0;

    // 计算总数
    for (const geom of validGeometries) {
        const positions = geom.getAttribute('position');
        if (positions) {
            totalVertices += positions.count;
        }
        const index = geom.getIndex();
        if (index) {
            totalIndices += index.count;
        }
    }

    // 分配缓冲区
    const positions: number[] = [];
    const uvs: number[] = [];
    const normals: number[] = [];
    const indices: number[] = [];

    let vertexOffset = 0;

    for (const geom of validGeometries) {
        const pos = geom.getAttribute('position');
        const uv = geom.getAttribute('uv');
        const norm = geom.getAttribute('normal');
        const idx = geom.getIndex();

        if (pos) {
            positions.push(...Array.from(pos.array));
        }
        if (uv) {
            uvs.push(...Array.from(uv.array));
        }
        if (norm) {
            normals.push(...Array.from(norm.array));
        }
        if (idx) {
            const indexArray = Array.from(idx.array);
            indices.push(...indexArray.map(i => i + vertexOffset));
        }

        vertexOffset += pos ? pos.count : 0;
    }

    merged.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    merged.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    merged.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    merged.setIndex(indices);

    return merged;
}
