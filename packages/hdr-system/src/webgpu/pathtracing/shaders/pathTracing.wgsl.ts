// ============================================================================
// WebGPU Path Tracing Shader - 路径追踪核心着色器
// ============================================================================
// 支持 GI 全局光照、多次光线反弹、PBR 材质

export const PATH_TRACING_COMMON = /* wgsl */`
// ============================================================================
// 常量定义
// ============================================================================
const PI: f32 = 3.14159265359;
const TWO_PI: f32 = 6.28318530718;
const INV_PI: f32 = 0.31830988618;
const EPSILON: f32 = 0.0001;
const MAX_BOUNCES: u32 = 8u;
const INFINITY: f32 = 1e30;

// ============================================================================
// 数据结构
// ============================================================================
struct Ray {
  origin: vec3<f32>,
  direction: vec3<f32>,
}

struct HitRecord {
  t: f32,
  position: vec3<f32>,
  normal: vec3<f32>,
  uv: vec2<f32>,
  materialId: u32,
  frontFace: bool,
}

struct Material {
  albedo: vec3<f32>,
  metallic: f32,
  roughness: f32,
  emission: vec3<f32>,
  emissionStrength: f32,
  ior: f32,
  transmission: f32,
  clearcoat: f32,
  clearcoatRoughness: f32,
}

struct Triangle {
  v0: vec3<f32>,
  v1: vec3<f32>,
  v2: vec3<f32>,
  n0: vec3<f32>,
  n1: vec3<f32>,
  n2: vec3<f32>,
  uv0: vec2<f32>,
  uv1: vec2<f32>,
  uv2: vec2<f32>,
  materialId: u32,
}

struct BVHNode {
  minBounds: vec3<f32>,
  leftFirst: u32,  // 如果是叶子节点，这是第一个三角形索引
  maxBounds: vec3<f32>,
  triCount: u32,   // 如果 > 0，这是叶子节点
}

struct SceneParams {
  cameraPosition: vec3<f32>,
  frameCount: u32,
  cameraTarget: vec3<f32>,
  maxBounces: u32,
  cameraUp: vec3<f32>,
  fov: f32,
  resolution: vec2<f32>,
  envMapIntensity: f32,
  exposure: f32,
}

// ============================================================================
// Uniform Bindings
// ============================================================================
@group(0) @binding(0) var<uniform> params: SceneParams;
@group(0) @binding(1) var<storage, read> triangles: array<Triangle>;
@group(0) @binding(2) var<storage, read> bvhNodes: array<BVHNode>;
@group(0) @binding(3) var<storage, read> materials: array<Material>;
@group(0) @binding(4) var outputTexture: texture_storage_2d<rgba32float, write>;
@group(0) @binding(5) var accumulationTexture: texture_storage_2d<rgba32float, read_write>;

// 环境贴图
@group(1) @binding(0) var envMap: texture_cube<f32>;
@group(1) @binding(1) var envSampler: sampler;

// ============================================================================
// 随机数生成器 (PCG)
// ============================================================================
var<private> rngState: u32;

fn initRNG(pixel: vec2<u32>, frame: u32) {
  rngState = pixel.x + pixel.y * 1973u + frame * 9277u;
}

fn pcgHash() -> u32 {
  rngState = rngState * 747796405u + 2891336453u;
  let word = ((rngState >> ((rngState >> 28u) + 4u)) ^ rngState) * 277803737u;
  return (word >> 22u) ^ word;
}

fn randomFloat() -> f32 {
  return f32(pcgHash()) / 4294967295.0;
}

fn randomFloat2() -> vec2<f32> {
  return vec2<f32>(randomFloat(), randomFloat());
}

fn randomFloat3() -> vec3<f32> {
  return vec3<f32>(randomFloat(), randomFloat(), randomFloat());
}
`;

export const PATH_TRACING_SAMPLING = /* wgsl */`
// ============================================================================
// 采样函数
// ============================================================================

// 余弦加权半球采样
fn cosineSampleHemisphere(normal: vec3<f32>) -> vec3<f32> {
  let r1 = randomFloat();
  let r2 = randomFloat();

  let phi = TWO_PI * r1;
  let cosTheta = sqrt(r2);
  let sinTheta = sqrt(1.0 - r2);

  let x = cos(phi) * sinTheta;
  let y = sin(phi) * sinTheta;
  let z = cosTheta;

  // 构建切线空间
  let up = select(vec3<f32>(1.0, 0.0, 0.0), vec3<f32>(0.0, 1.0, 0.0), abs(normal.y) < 0.999);
  let tangent = normalize(cross(up, normal));
  let bitangent = cross(normal, tangent);

  return normalize(tangent * x + bitangent * y + normal * z);
}

// GGX 重要性采样
fn sampleGGX(normal: vec3<f32>, roughness: f32) -> vec3<f32> {
  let r1 = randomFloat();
  let r2 = randomFloat();

  let a = roughness * roughness;
  let a2 = a * a;

  let phi = TWO_PI * r1;
  let cosTheta = sqrt((1.0 - r2) / (1.0 + (a2 - 1.0) * r2));
  let sinTheta = sqrt(1.0 - cosTheta * cosTheta);

  let x = cos(phi) * sinTheta;
  let y = sin(phi) * sinTheta;
  let z = cosTheta;

  // 构建切线空间
  let up = select(vec3<f32>(1.0, 0.0, 0.0), vec3<f32>(0.0, 1.0, 0.0), abs(normal.y) < 0.999);
  let tangent = normalize(cross(up, normal));
  let bitangent = cross(normal, tangent);

  return normalize(tangent * x + bitangent * y + normal * z);
}

// 均匀球面采样
fn uniformSampleSphere() -> vec3<f32> {
  let r1 = randomFloat();
  let r2 = randomFloat();

  let z = 1.0 - 2.0 * r1;
  let r = sqrt(max(0.0, 1.0 - z * z));
  let phi = TWO_PI * r2;

  return vec3<f32>(r * cos(phi), r * sin(phi), z);
}

// 圆盘采样 (用于景深)
fn sampleDisk() -> vec2<f32> {
  let r1 = randomFloat();
  let r2 = randomFloat();

  let r = sqrt(r1);
  let theta = TWO_PI * r2;

  return vec2<f32>(r * cos(theta), r * sin(theta));
}
`;

export const PATH_TRACING_INTERSECTION = /* wgsl */`
// ============================================================================
// 光线-几何体相交测试
// ============================================================================

// Möller–Trumbore 三角形相交算法
fn intersectTriangle(ray: Ray, tri: Triangle, tMin: f32, tMax: f32) -> HitRecord {
  var hit: HitRecord;
  hit.t = INFINITY;

  let edge1 = tri.v1 - tri.v0;
  let edge2 = tri.v2 - tri.v0;
  let h = cross(ray.direction, edge2);
  let a = dot(edge1, h);

  if (abs(a) < EPSILON) {
    return hit;
  }

  let f = 1.0 / a;
  let s = ray.origin - tri.v0;
  let u = f * dot(s, h);

  if (u < 0.0 || u > 1.0) {
    return hit;
  }

  let q = cross(s, edge1);
  let v = f * dot(ray.direction, q);

  if (v < 0.0 || u + v > 1.0) {
    return hit;
  }

  let t = f * dot(edge2, q);

  if (t > tMin && t < tMax) {
    hit.t = t;
    hit.position = ray.origin + ray.direction * t;

    // 重心坐标插值法线
    let w = 1.0 - u - v;
    hit.normal = normalize(tri.n0 * w + tri.n1 * u + tri.n2 * v);

    // UV 插值
    hit.uv = tri.uv0 * w + tri.uv1 * u + tri.uv2 * v;
    hit.materialId = tri.materialId;

    // 确定正面/背面
    hit.frontFace = dot(ray.direction, hit.normal) < 0.0;
    if (!hit.frontFace) {
      hit.normal = -hit.normal;
    }
  }

  return hit;
}

// AABB 相交测试
fn intersectAABB(ray: Ray, minBounds: vec3<f32>, maxBounds: vec3<f32>) -> f32 {
  let invDir = 1.0 / ray.direction;

  let t1 = (minBounds - ray.origin) * invDir;
  let t2 = (maxBounds - ray.origin) * invDir;

  let tMin = min(t1, t2);
  let tMax = max(t1, t2);

  let tNear = max(max(tMin.x, tMin.y), tMin.z);
  let tFar = min(min(tMax.x, tMax.y), tMax.z);

  if (tNear > tFar || tFar < 0.0) {
    return INFINITY;
  }

  return tNear;
}

// BVH 遍历
fn traverseBVH(ray: Ray) -> HitRecord {
  var closestHit: HitRecord;
  closestHit.t = INFINITY;

  var stack: array<u32, 64>;
  var stackPtr: i32 = 0;
  stack[0] = 0u;
  stackPtr = 1;

  while (stackPtr > 0) {
    stackPtr = stackPtr - 1;
    let nodeIdx = stack[stackPtr];
    let node = bvhNodes[nodeIdx];

    // AABB 测试
    let tAABB = intersectAABB(ray, node.minBounds, node.maxBounds);
    if (tAABB >= closestHit.t) {
      continue;
    }

    if (node.triCount > 0u) {
      // 叶子节点 - 测试三角形
      for (var i: u32 = 0u; i < node.triCount; i = i + 1u) {
        let triIdx = node.leftFirst + i;
        let hit = intersectTriangle(ray, triangles[triIdx], EPSILON, closestHit.t);
        if (hit.t < closestHit.t) {
          closestHit = hit;
        }
      }
    } else {
      // 内部节点 - 压入子节点
      stack[stackPtr] = node.leftFirst;
      stackPtr = stackPtr + 1;
      stack[stackPtr] = node.leftFirst + 1u;
      stackPtr = stackPtr + 1;
    }
  }

  return closestHit;
}
`;

export default {
  PATH_TRACING_COMMON,
  PATH_TRACING_SAMPLING,
  PATH_TRACING_INTERSECTION,
};
