// ============================================================================
// 路径追踪主着色器 - Part 1: 核心追踪逻辑
// ============================================================================

export const PATH_TRACING_MAIN = /* wgsl */`
// ============================================================================
// 环境光采样
// ============================================================================
fn sampleEnvironment(direction: vec3<f32>) -> vec3<f32> {
  let envColor = textureSampleLevel(envMap, envSampler, direction, 0.0).rgb;
  return envColor * params.envMapIntensity;
}

// ============================================================================
// 路径追踪核心
// ============================================================================
fn tracePath(ray: Ray) -> vec3<f32> {
  var currentRay = ray;
  var throughput = vec3<f32>(1.0);
  var radiance = vec3<f32>(0.0);

  for (var bounce: u32 = 0u; bounce < params.maxBounces; bounce = bounce + 1u) {
    let hit = traverseBVH(currentRay);

    // 未命中 - 采样环境光
    if (hit.t >= INFINITY) {
      radiance = radiance + throughput * sampleEnvironment(currentRay.direction);
      break;
    }

    let material = materials[hit.materialId];

    // 自发光
    if (material.emissionStrength > 0.0) {
      radiance = radiance + throughput * material.emission * material.emissionStrength;
    }

    // 计算出射方向
    let V = -currentRay.direction;
    let N = hit.normal;

    var nextDirection: vec3<f32>;
    var pdf: f32;
    var brdfValue: vec3<f32>;

    // 根据材质类型选择采样策略
    if (material.transmission > 0.5) {
      // 透射材质
      let sample = sampleTransmission(V, N, material, hit.frontFace);
      nextDirection = sample.direction;
      pdf = sample.pdf;
      brdfValue = sample.brdf;
    } else {
      // 标准 PBR 材质
      let sample = sampleBRDF(V, N, material);
      nextDirection = sample.direction;
      pdf = sample.pdf;
      brdfValue = sample.brdf;
    }

    // 检查有效性
    if (pdf < EPSILON) {
      break;
    }

    // 更新 throughput
    let NdotL = abs(dot(N, nextDirection));
    throughput = throughput * brdfValue * NdotL / pdf;

    // 俄罗斯轮盘赌终止
    if (bounce > 3u) {
      let p = max(throughput.x, max(throughput.y, throughput.z));
      if (randomFloat() > p) {
        break;
      }
      throughput = throughput / p;
    }

    // 更新光线
    currentRay.origin = hit.position + nextDirection * EPSILON;
    currentRay.direction = nextDirection;
  }

  return radiance;
}
`;

export default PATH_TRACING_MAIN;
