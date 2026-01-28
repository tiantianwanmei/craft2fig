/**
 * @genki/folding-3d - 折叠余量算法 (Creep Compensation)
 * 
 * 在真实包装工程中，纸张厚度会导致折叠后的物理干涉。
 * 本算法根据面板在折叠树中的深度 (Depth) 和旋转轴 (X/Y) 计算动态让位间隙。
 */

export interface AllowanceConfig {
    /** 纸张基础厚度 */
    thickness: number;
    /** 🆕 基础折痕宽度 (由 UI 滑块提供) */
    baseWidth: number;
    /** X轴（纵向折痕）补偿系数 - 默认 1.0 */
    xAxisMultiplier?: number;
    /** Y轴（横向折痕）补偿系数 - 默认 1.1 */
    yAxisMultiplier?: number;
    /** 层级嵌套系数 - 随深度增加的额外间隙 */
    nestingFactor?: number;
}

/**
 * 计算特定关节的动态间隙大小 (GapSize)
 * 
 * @param jointType - 折痕方向
 * @param depth - 在折叠树中的深度 (从 0 开始)
 * @param config - 补偿参数
 * @returns 最终计算出的 GapSize (单位 mm)
 */
export function calculateDynamicGapSize(
    jointType: 'horizontal' | 'vertical',
    depth: number,
    config: AllowanceConfig
): number {
    const {
        thickness,
        baseWidth,
        xAxisMultiplier = 1.0,
        yAxisMultiplier = 1.1,
        nestingFactor = 0.15
    } = config;

    // 1. 根据坐标轴选择基础系数
    // Vertical Joint (纵向折痕) 分割 X 轴
    // Horizontal Joint (横向折痕) 分割 Y 轴
    const axisCoeff = jointType === 'vertical' ? xAxisMultiplier : yAxisMultiplier;

    // 2. 核心公式： (baseWidth / 2) * Axis_Coeff * (1 + Depth * NestingFactor)
    // 我们将 UI 定义的“折痕宽度”的一半作为基础让位间隙，因为 Joint 条带宽度 = GapSize * 2
    const baseGap = (baseWidth || 1.5) / 2;
    const allowance = baseGap * (axisCoeff * (1 + depth * nestingFactor));

    // 确保最小值，防止出现负值或过小值。至少保留 0.5 倍厚度的基础间隙
    return Math.max(thickness * 0.5, allowance);
}
