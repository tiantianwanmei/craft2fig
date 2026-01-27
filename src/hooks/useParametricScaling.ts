/**
 * useParametricScaling - 参数化缩放 Hook
 * 集成 PanelScaler 实现动态尺寸调整
 */

import { useMemo } from 'react';
import type { PanelNode } from '@genki/folding-3d';
import { PanelScaler, type ScaleParams } from '../utils/PanelScaler';

export interface UseParametricScalingProps {
    /** 原始面板树 */
    originalTree: PanelNode | null;
    /** 原始参数 */
    originalParams: ScaleParams;
    /** 当前参数 */
    currentParams: ScaleParams;
}

/**
 * 参数化缩放 Hook
 * 
 * 使用 PanelScaler 实现高性能的动态尺寸调整
 * 
 * @example
 * ```tsx
 * const { scaledTree, scaler } = useParametricScaling({
 *   originalTree: panelTree,
 *   originalParams: { width: 100, height: 100, thickness: 2 },
 *   currentParams: { width: 150, height: 120, thickness: 2, gapSize: 3 },
 * });
 * ```
 */
export function useParametricScaling({
    originalTree,
    originalParams,
    currentParams,
}: UseParametricScalingProps) {
    // 创建 PanelScaler 实例（仅在原始数据变化时重建）
    const scaler = useMemo(() => {
        if (!originalTree) return null;

        console.log('🔧 Creating PanelScaler:', {
            originalParams,
            treeId: originalTree.id,
        });

        return new PanelScaler(originalTree, originalParams);
    }, [originalTree, originalParams]);

    // 应用缩放（使用 useMemo 缓存结果）
    const scaledTree = useMemo(() => {
        if (!scaler || !originalTree) {
            return originalTree;
        }

        console.log('🔄 Scaling panel tree:', {
            currentParams,
            kFactor: scaler.getKFactor(),
        });

        const result = scaler.scale(currentParams);

        console.log('✅ Scaling complete:', {
            originalBounds: scaler.getOriginalBounds(),
            sameReference: result === originalTree,
        });

        return result;
    }, [scaler, originalTree, currentParams]);

    return {
        /** 缩放后的面板树 */
        scaledTree,
        /** PanelScaler 实例 */
        scaler,
        /** 是否已初始化 */
        isReady: scaler !== null,
    };
}
