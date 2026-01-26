// ============================================================================
// 路径追踪着色器索引
// ============================================================================

import { PATH_TRACING_COMMON, PATH_TRACING_SAMPLING, PATH_TRACING_INTERSECTION } from './pathTracing.wgsl';
import { BRDF_FUNCTIONS, BRDF_EVALUATION, BRDF_TRANSMISSION } from './brdf.wgsl';
import PATH_TRACING_MAIN from './pathTracingMain.wgsl';
import PATH_TRACING_COMPUTE from './pathTracingCompute.wgsl';

// 组合完整的路径追踪着色器
export const FULL_PATH_TRACING_SHADER = [
  PATH_TRACING_COMMON,
  PATH_TRACING_SAMPLING,
  BRDF_FUNCTIONS,
  BRDF_EVALUATION,
  BRDF_TRANSMISSION,
  PATH_TRACING_INTERSECTION,
  PATH_TRACING_MAIN,
  PATH_TRACING_COMPUTE,
].join('\n');

export {
  PATH_TRACING_COMMON,
  PATH_TRACING_SAMPLING,
  PATH_TRACING_INTERSECTION,
  BRDF_FUNCTIONS,
  BRDF_EVALUATION,
  BRDF_TRANSMISSION,
  PATH_TRACING_MAIN,
  PATH_TRACING_COMPUTE,
};
