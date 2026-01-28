/**
 * @genki/folding-3d - 权重计算工具
 * 用于计算折痕区域的骨骼蒙皮权重
 */

/**
 * 权重分配配置
 */
export interface WeightConfig {
  /** 父面板的骨骼索引 (Bone A) */
  parentBoneIndex: number;
  /** 子面板的骨骼索引 (Bone B) */
  childBoneIndex: number;
  /**
   * 插值类型
   * - 'linear': 线性过渡 (折痕较硬)
   * - 'smooth': 平滑过渡 (S型曲线，适合纸张)
   * - 'arc': 圆弧模拟 (正弦过渡，适合较宽的圆角)
   */
  interpolation?: 'linear' | 'smooth' | 'arc';
  /**
   * 折痕曲率 (0.1 - 5.0)
   * - 1.0: 标准
   * - > 1.0: 更尖锐 (折叠更集中在中心线)
   * - < 1.0: 更圆润 (折叠更分散)
   */
  creaseCurvature?: number;
}

/**
 * 蒙皮数据结果
 */
export interface SkinData {
  skinIndices: [number, number, number, number];
  skinWeights: [number, number, number, number];
}

/**
 * 计算单个顶点的蒙皮数据
 *
 * @param type - 顶点所属区域类型
 * @param t - 折痕区域的归一化位置 (0.0 = 紧邻父面板, 1.0 = 紧邻子面板)
 * @param config - 骨骼索引配置
 */
export function calculateSkinData(
  type: 'parent' | 'child' | 'crease',
  t: number,
  config: WeightConfig
): SkinData {
  const { parentBoneIndex, childBoneIndex, interpolation = 'smooth' } = config;

  let weightChild = 0;
  let weightParent = 1;

  switch (type) {
    case 'parent':
      weightChild = 0;
      weightParent = 1;
      break;

    case 'child':
      weightChild = 1;
      weightParent = 0;
      break;

    case 'crease':
      // 应用曲率调整 (Symmetric Power Curve)
      // curvature > 1.0: 挤压中间，折痕变尖锐
      // curvature < 1.0: 拉伸两端，折痕变圆滑
      let adjustedT = t;
      const curvature = config.creaseCurvature ?? 1.0;
      if (curvature !== 1.0) {
        const p = 1 / curvature;
        adjustedT = 0.5 + Math.sign(t - 0.5) * Math.pow(Math.abs(t - 0.5) * 2, p) / 2;
      }

      if (interpolation === 'linear') {
        weightChild = adjustedT;
      } else if (interpolation === 'smooth') {
        // SmoothStep
        weightChild = adjustedT * adjustedT * (3 - 2 * adjustedT);
      } else if (interpolation === 'arc') {
        // 正弦插值
        weightChild = Math.sin(adjustedT * Math.PI / 2);
      }
      weightParent = 1 - weightChild;
      break;
  }

  return {
    skinIndices: [parentBoneIndex, childBoneIndex, 0, 0],
    skinWeights: [weightParent, weightChild, 0, 0],
  };
}
