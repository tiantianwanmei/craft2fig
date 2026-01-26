// ============================================================================
// BRDF 函数 - 基于物理的双向反射分布函数
// ============================================================================

export const BRDF_FUNCTIONS = /* wgsl */`
// ============================================================================
// Fresnel 函数
// ============================================================================

// Schlick 近似
fn fresnelSchlick(cosTheta: f32, F0: vec3<f32>) -> vec3<f32> {
  return F0 + (1.0 - F0) * pow(clamp(1.0 - cosTheta, 0.0, 1.0), 5.0);
}

// 带粗糙度的 Fresnel
fn fresnelSchlickRoughness(cosTheta: f32, F0: vec3<f32>, roughness: f32) -> vec3<f32> {
  return F0 + (max(vec3<f32>(1.0 - roughness), F0) - F0) * pow(clamp(1.0 - cosTheta, 0.0, 1.0), 5.0);
}

// 精确 Fresnel (用于透射)
fn fresnelDielectric(cosI: f32, eta: f32) -> f32 {
  let sinT2 = eta * eta * (1.0 - cosI * cosI);
  if (sinT2 > 1.0) {
    return 1.0; // 全内反射
  }
  let cosT = sqrt(1.0 - sinT2);
  let rs = (eta * cosI - cosT) / (eta * cosI + cosT);
  let rp = (cosI - eta * cosT) / (cosI + eta * cosT);
  return (rs * rs + rp * rp) * 0.5;
}

// ============================================================================
// 法线分布函数 (NDF)
// ============================================================================

// GGX/Trowbridge-Reitz
fn distributionGGX(NdotH: f32, roughness: f32) -> f32 {
  let a = roughness * roughness;
  let a2 = a * a;
  let NdotH2 = NdotH * NdotH;

  let num = a2;
  var denom = NdotH2 * (a2 - 1.0) + 1.0;
  denom = PI * denom * denom;

  return num / max(denom, EPSILON);
}

// 各向异性 GGX
fn distributionGGXAniso(NdotH: f32, TdotH: f32, BdotH: f32, ax: f32, ay: f32) -> f32 {
  let d = TdotH * TdotH / (ax * ax) + BdotH * BdotH / (ay * ay) + NdotH * NdotH;
  return 1.0 / (PI * ax * ay * d * d);
}

// ============================================================================
// 几何遮蔽函数
// ============================================================================

// Smith GGX
fn geometrySchlickGGX(NdotV: f32, roughness: f32) -> f32 {
  let r = roughness + 1.0;
  let k = (r * r) / 8.0;
  return NdotV / (NdotV * (1.0 - k) + k);
}

fn geometrySmith(NdotV: f32, NdotL: f32, roughness: f32) -> f32 {
  let ggx2 = geometrySchlickGGX(NdotV, roughness);
  let ggx1 = geometrySchlickGGX(NdotL, roughness);
  return ggx1 * ggx2;
}

// Smith GGX (用于 IBL)
fn geometrySmithIBL(NdotV: f32, NdotL: f32, roughness: f32) -> f32 {
  let a = roughness * roughness;
  let a2 = a * a;

  let GGXV = NdotL * sqrt(NdotV * NdotV * (1.0 - a2) + a2);
  let GGXL = NdotV * sqrt(NdotL * NdotL * (1.0 - a2) + a2);

  return 0.5 / max(GGXV + GGXL, EPSILON);
}
`;

export const BRDF_EVALUATION = /* wgsl */`
// ============================================================================
// BRDF 评估
// ============================================================================

struct BRDFSample {
  direction: vec3<f32>,
  pdf: f32,
  brdf: vec3<f32>,
}

// 评估 Cook-Torrance BRDF
fn evaluateBRDF(
  V: vec3<f32>,
  L: vec3<f32>,
  N: vec3<f32>,
  material: Material
) -> vec3<f32> {
  let H = normalize(V + L);

  let NdotV = max(dot(N, V), EPSILON);
  let NdotL = max(dot(N, L), EPSILON);
  let NdotH = max(dot(N, H), 0.0);
  let VdotH = max(dot(V, H), 0.0);

  // F0 计算
  var F0 = vec3<f32>(0.04);
  F0 = mix(F0, material.albedo, material.metallic);

  // Cook-Torrance BRDF
  let D = distributionGGX(NdotH, material.roughness);
  let G = geometrySmith(NdotV, NdotL, material.roughness);
  let F = fresnelSchlick(VdotH, F0);

  let specular = (D * G * F) / max(4.0 * NdotV * NdotL, EPSILON);

  // 漫反射
  let kD = (1.0 - F) * (1.0 - material.metallic);
  let diffuse = kD * material.albedo * INV_PI;

  return diffuse + specular;
}

// 采样 BRDF
fn sampleBRDF(
  V: vec3<f32>,
  N: vec3<f32>,
  material: Material
) -> BRDFSample {
  var sample: BRDFSample;

  let r = randomFloat();

  // 根据材质属性选择采样策略
  let specularWeight = 0.5 * (1.0 + material.metallic);

  if (r < specularWeight) {
    // 镜面反射采样 (GGX)
    let H = sampleGGX(N, material.roughness);
    sample.direction = reflect(-V, H);

    if (dot(sample.direction, N) <= 0.0) {
      sample.pdf = 0.0;
      sample.brdf = vec3<f32>(0.0);
      return sample;
    }

    let NdotH = max(dot(N, H), 0.0);
    let VdotH = max(dot(V, H), 0.0);

    // GGX PDF
    let D = distributionGGX(NdotH, material.roughness);
    sample.pdf = D * NdotH / (4.0 * VdotH) * specularWeight;
  } else {
    // 漫反射采样 (余弦加权)
    sample.direction = cosineSampleHemisphere(N);

    let NdotL = max(dot(N, sample.direction), 0.0);
    sample.pdf = NdotL * INV_PI * (1.0 - specularWeight);
  }

  // 评估 BRDF
  sample.brdf = evaluateBRDF(V, sample.direction, N, material);

  return sample;
}
`;

export const BRDF_TRANSMISSION = /* wgsl */`
// ============================================================================
// 透射 BRDF
// ============================================================================

// 折射方向计算
fn refract2(I: vec3<f32>, N: vec3<f32>, eta: f32) -> vec3<f32> {
  let cosI = dot(-I, N);
  let sin2T = eta * eta * (1.0 - cosI * cosI);

  if (sin2T > 1.0) {
    return vec3<f32>(0.0); // 全内反射
  }

  let cosT = sqrt(1.0 - sin2T);
  return eta * I + (eta * cosI - cosT) * N;
}

// 采样透射
fn sampleTransmission(
  V: vec3<f32>,
  N: vec3<f32>,
  material: Material,
  frontFace: bool
) -> BRDFSample {
  var sample: BRDFSample;

  let eta = select(material.ior, 1.0 / material.ior, frontFace);
  let cosI = abs(dot(V, N));

  // Fresnel 决定反射/折射
  let F = fresnelDielectric(cosI, eta);

  if (randomFloat() < F) {
    // 反射
    sample.direction = reflect(-V, N);
    sample.pdf = F;
    sample.brdf = vec3<f32>(1.0) * F;
  } else {
    // 折射
    sample.direction = refract2(-V, N, eta);
    if (length(sample.direction) < 0.5) {
      // 全内反射
      sample.direction = reflect(-V, N);
      sample.pdf = 1.0;
      sample.brdf = vec3<f32>(1.0);
    } else {
      sample.pdf = 1.0 - F;
      sample.brdf = material.albedo * (1.0 - F);
    }
  }

  return sample;
}
`;

export default {
  BRDF_FUNCTIONS,
  BRDF_EVALUATION,
  BRDF_TRANSMISSION,
};
