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
      if (interpolation === 'linear') {
        weightChild = t;
      } else if (interpolation === 'smooth') {
        // SmoothStep: 两端平缓，中间陡峭
        weightChild = t * t * (3 - 2 * t);
      } else if (interpolation === 'arc') {
        // 正弦插值: 模拟圆弧
        weightChild = Math.sin(t * Math.PI / 2);
      }
      weightParent = 1 - weightChild;
      break;
  }

  return {
    skinIndices: [parentBoneIndex, childBoneIndex, 0, 0],
    skinWeights: [weightParent, weightChild, 0, 0],
  };
}
