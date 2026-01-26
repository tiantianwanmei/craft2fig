// ============================================================================
// 路径追踪计算着色器入口
// ============================================================================

export const PATH_TRACING_COMPUTE = /* wgsl */`
// ============================================================================
// 相机光线生成
// ============================================================================
fn generateCameraRay(pixel: vec2<f32>) -> Ray {
  var ray: Ray;

  // 计算相机坐标系
  let forward = normalize(params.cameraTarget - params.cameraPosition);
  let right = normalize(cross(forward, params.cameraUp));
  let up = cross(right, forward);

  // 计算视口
  let aspectRatio = params.resolution.x / params.resolution.y;
  let fovScale = tan(params.fov * 0.5);

  // 抖动采样 (抗锯齿)
  let jitter = randomFloat2() - 0.5;
  let pixelCenter = pixel + jitter;

  // 归一化设备坐标
  let ndc = (pixelCenter / params.resolution) * 2.0 - 1.0;

  // 光线方向
  let rayDir = normalize(
    forward +
    right * ndc.x * fovScale * aspectRatio +
    up * ndc.y * fovScale
  );

  ray.origin = params.cameraPosition;
  ray.direction = rayDir;

  return ray;
}

// ============================================================================
// 主计算着色器
// ============================================================================
@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) globalId: vec3<u32>) {
  let pixel = vec2<u32>(globalId.x, globalId.y);
  let resolution = vec2<u32>(u32(params.resolution.x), u32(params.resolution.y));

  // 边界检查
  if (pixel.x >= resolution.x || pixel.y >= resolution.y) {
    return;
  }

  // 初始化随机数生成器
  initRNG(pixel, params.frameCount);

  // 生成相机光线
  let ray = generateCameraRay(vec2<f32>(pixel));

  // 路径追踪
  let color = tracePath(ray);

  // 累积采样
  let prevColor = textureLoad(accumulationTexture, vec2<i32>(pixel));
  let frameWeight = 1.0 / f32(params.frameCount + 1u);
  let newColor = mix(prevColor.rgb, color, frameWeight);

  // 写入累积缓冲
  textureStore(accumulationTexture, vec2<i32>(pixel), vec4<f32>(newColor, 1.0));

  // 色调映射和输出
  let mapped = ACESFilmicToneMapping(newColor * params.exposure);
  let gammaCorrected = pow(mapped, vec3<f32>(1.0 / 2.2));

  textureStore(outputTexture, vec2<i32>(pixel), vec4<f32>(gammaCorrected, 1.0));
}

// ACES 色调映射
fn ACESFilmicToneMapping(x: vec3<f32>) -> vec3<f32> {
  let a = 2.51;
  let b = 0.03;
  let c = 2.43;
  let d = 0.59;
  let e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), vec3<f32>(0.0), vec3<f32>(1.0));
}
`;

export default PATH_TRACING_COMPUTE;
