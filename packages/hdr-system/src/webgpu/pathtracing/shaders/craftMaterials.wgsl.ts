// ============================================================================
// Craft Material System - Shader Logic
// ============================================================================

export const CRAFT_MATERIALS = String.raw/* wgsl */`
struct CraftLayer {
  type: u32, // 0: None, 1: Foil, 2: Emboss, 3: SpotUV
  color: vec3f,
  roughness: f32,
  metalness: f32,
  height: f32,
  opacity: f32,
  enabled: u32,
};

// Maximum number of craft layers supported
const MAX_CRAFT_LAYERS = 8u;

@group(0) @binding(2) var<uniform> craftLayers: array<CraftLayer, MAX_CRAFT_LAYERS>;
@group(0) @binding(3) var<uniform> layerCount: u32;

// Helper to blend materials based on opacity and mask
fn blendMaterial(baseMat: Material, layer: CraftLayer, mask: f32) -> Material {
  var result = baseMat;
  let alpha = layer.opacity * mask;
  
  if (alpha <= 0.001) { return baseMat; }

  // Foil (Gold/Silver)
  if (layer.type == 1u) {
    result.albedo = mix(result.albedo, layer.color, alpha);
    result.roughness = mix(result.roughness, layer.roughness, alpha);
    result.metalness = mix(result.metalness, layer.metalness, alpha); // High metalness for foil
  } 
  // Spot UV
  else if (layer.type == 3u) {
    // UV varnish makes surface glossy and slightly darker/richer
    result.roughness = mix(result.roughness, 0.05, alpha); // Very glossy
    result.albedo = mix(result.albedo, result.albedo * 0.9, alpha * 0.2); // Slight darkening
    // Add height bump for UV
    // Note: Actual normal perturbation happens in geometry stage, here we just adjust BRDF
  }

  return result;
}

// Function to perturb normal based on Emboss/Deboss layers
fn applyCraftNormals(baseNormal: vec3f, uv: vec2f) -> vec3f {
  var N = baseNormal;
  
  for (var i = 0u; i < layerCount; i = i + 1u) {
    let layer = craftLayers[i];
    if (layer.enabled == 0u) { continue; }
    
    // Emboss (Type 2) or SpotUV (Type 3) with height
    if (layer.type == 2u || (layer.type == 3u && layer.height > 0.0)) {
      // In a real path tracer, we would sample a height map texture here
      // For procedural demo, we assume a simple mask or procedural shape
      // This part requires texture binding for masks which we will add in Phase 6.1
    }
  }
  
  return N;
}
`;

export default CRAFT_MATERIALS;