// ============================================================================
// PathTracingRenderer - WebGPU 路径追踪渲染器
// ============================================================================

import { FULL_PATH_TRACING_SHADER } from '../shaders';
import { BVHBuilder, Triangle, BVHNode } from './BVHBuilder';

export interface PathTracingConfig {
  width: number;
  height: number;
  maxBounces: number;
  samplesPerFrame: number;
  envMapIntensity: number;
  exposure: number;
}

export interface CameraParams {
  position: [number, number, number];
  target: [number, number, number];
  up: [number, number, number];
  fov: number;
}

export interface Material {
  albedo: [number, number, number];
  metallic: number;
  roughness: number;
  emission: [number, number, number];
  emissionStrength: number;
  ior: number;
  transmission: number;
  clearcoat: number;
  clearcoatRoughness: number;
}

export class PathTracingRenderer {
  private device: GPUDevice | null = null;
  private context: GPUCanvasContext | null = null;
  private config: PathTracingConfig;

  // GPU 资源
  private pipeline: GPUComputePipeline | null = null;
  private bindGroup0: GPUBindGroup | null = null;
  private bindGroup1: GPUBindGroup | null = null;

  private blitPipeline: GPURenderPipeline | null = null;
  private blitBindGroup: GPUBindGroup | null = null;

  // Buffers
  private paramsBuffer: GPUBuffer | null = null;
  private triangleBuffer: GPUBuffer | null = null;
  private bvhBuffer: GPUBuffer | null = null;
  private materialBuffer: GPUBuffer | null = null;

  // Textures
  private outputTexture: GPUTexture | null = null;
  private accumulationTexture: GPUTexture | null = null;
  private envMapTexture: GPUTexture | null = null;
  private envSampler: GPUSampler | null = null;

  // 状态
  private frameCount = 0;
  private isInitialized = false;
  private camera: CameraParams;

  constructor(config: Partial<PathTracingConfig> = {}) {
    this.config = {
      width: 1920,
      height: 1080,
      maxBounces: 8,
      samplesPerFrame: 1,
      envMapIntensity: 1.0,
      exposure: 1.0,
      ...config,
    };

    this.camera = {
      position: [0, 2, 5],
      target: [0, 0, 0],
      up: [0, 1, 0],
      fov: Math.PI / 4,
    };
  }

  async initialize(canvas: HTMLCanvasElement): Promise<boolean> {
    // 检查 WebGPU 支持
    if (!navigator.gpu) {
      console.error('WebGPU not supported');
      return false;
    }

    const adapter = await navigator.gpu.requestAdapter({
      powerPreference: 'high-performance',
    });

    if (!adapter) {
      console.error('No GPU adapter found');
      return false;
    }

    this.device = await adapter.requestDevice({
      requiredFeatures: [],
      requiredLimits: {
        maxStorageBufferBindingSize: 1024 * 1024 * 256, // 256MB
        maxBufferSize: 1024 * 1024 * 256,
      },
    });

    this.context = canvas.getContext('webgpu');
    if (!this.context) {
      console.error('Failed to get WebGPU context');
      return false;
    }

    this.context.configure({
      device: this.device,
      format: navigator.gpu.getPreferredCanvasFormat(),
      alphaMode: 'premultiplied',
    });

    await this.createPipeline();
    this.createTextures();
    this.createBuffers();
    this.createEnvironment();
    await this.createBlitPipeline();

    this.isInitialized = true;
    return true;
  }

  private async createPipeline(): Promise<void> {
    if (!this.device) return;

    const shaderModule = this.device.createShaderModule({
      code: FULL_PATH_TRACING_SHADER,
    });

    this.pipeline = this.device.createComputePipeline({
      layout: 'auto',
      compute: {
        module: shaderModule,
        entryPoint: 'main',
      },
    });
  }

  private createTextures(): void {
    if (!this.device) return;

    const { width, height } = this.config;

    // 输出纹理
    this.outputTexture = this.device.createTexture({
      size: { width, height },
      format: 'rgba32float',
      usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC,
    });

    // 累积纹理
    this.accumulationTexture = this.device.createTexture({
      size: { width, height },
      format: 'rgba32float',
      usage: GPUTextureUsage.STORAGE_BINDING,
    });
  }

  private createEnvironment(): void {
    if (!this.device) return;

    this.envSampler = this.device.createSampler({
      magFilter: 'nearest',
      minFilter: 'nearest',
      mipmapFilter: 'nearest',
      addressModeU: 'repeat',
      addressModeV: 'repeat',
    });

    this.envMapTexture = this.device.createTexture({
      size: { width: 1, height: 1, depthOrArrayLayers: 6 },
      dimension: '2d',
      format: 'rgba16float',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    });

    const face = new Uint16Array([0, 0, 0, 0]);
    for (let layer = 0; layer < 6; layer++) {
      this.device.queue.writeTexture(
        { texture: this.envMapTexture, origin: { x: 0, y: 0, z: layer } },
        face,
        { bytesPerRow: 8, rowsPerImage: 1 },
        { width: 1, height: 1, depthOrArrayLayers: 1 }
      );
    }
  }

  private async createBlitPipeline(): Promise<void> {
    if (!this.device || !this.context) return;
    if (!this.outputTexture) return;

    const format = navigator.gpu.getPreferredCanvasFormat();
    const shaderModule = this.device.createShaderModule({
      code: `
struct VSOut { @builtin(position) pos: vec4<f32>, };

@vertex
fn vs(@builtin(vertex_index) vid: u32) -> VSOut {
  var out: VSOut;
  var p = array<vec2<f32>, 3>(
    vec2<f32>(-1.0, -1.0),
    vec2<f32>(3.0, -1.0),
    vec2<f32>(-1.0, 3.0)
  );
  out.pos = vec4<f32>(p[vid], 0.0, 1.0);
  return out;
}

@group(0) @binding(0) var img: texture_2d<f32>;

@fragment
fn fs(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
  let uv = vec2<i32>(i32(pos.x), i32(pos.y));
  let c = textureLoad(img, uv, 0);
  return c;
}
`,
    });

    this.blitPipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: { module: shaderModule, entryPoint: 'vs' },
      fragment: { module: shaderModule, entryPoint: 'fs', targets: [{ format }] },
      primitive: { topology: 'triangle-list' },
    });

    this.blitBindGroup = this.device.createBindGroup({
      layout: this.blitPipeline.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: this.outputTexture.createView() }],
    });
  }

  private createBuffers(): void {
    if (!this.device) return;

    // 参数 buffer (SceneParams)
    this.paramsBuffer = this.device.createBuffer({
      size: 64, // 对齐到 16 字节
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
  }

  setScene(triangles: Triangle[], materials: Material[]): void {
    if (!this.device) return;

    // 构建 BVH
    const bvhBuilder = new BVHBuilder();
    const { nodes, triangles: sortedTris } = bvhBuilder.build(triangles);

    // 创建三角形 buffer
    const triData = this.packTriangles(sortedTris);
    this.triangleBuffer = this.device.createBuffer({
      size: triData.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(this.triangleBuffer, 0, triData);

    // 创建 BVH buffer
    const bvhData = this.packBVHNodes(nodes);
    this.bvhBuffer = this.device.createBuffer({
      size: bvhData.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(this.bvhBuffer, 0, bvhData);

    // 创建材质 buffer
    const matData = this.packMaterials(materials);
    this.materialBuffer = this.device.createBuffer({
      size: matData.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(this.materialBuffer, 0, matData);

    this.resetAccumulation();
  }

  private packTriangles(triangles: Triangle[]): Float32Array {
    // 每个三角形: 3*vec3 顶点 + 3*vec3 法线 + 3*vec2 UV + 1 materialId
    // = 9 + 9 + 6 + 1 = 25 floats, 对齐到 32
    const data = new Float32Array(triangles.length * 32);

    for (let i = 0; i < triangles.length; i++) {
      const t = triangles[i];
      const offset = i * 32;

      // 顶点
      data[offset + 0] = t.v0.x; data[offset + 1] = t.v0.y; data[offset + 2] = t.v0.z;
      data[offset + 4] = t.v1.x; data[offset + 5] = t.v1.y; data[offset + 6] = t.v1.z;
      data[offset + 8] = t.v2.x; data[offset + 9] = t.v2.y; data[offset + 10] = t.v2.z;

      // 法线
      data[offset + 12] = t.n0.x; data[offset + 13] = t.n0.y; data[offset + 14] = t.n0.z;
      data[offset + 16] = t.n1.x; data[offset + 17] = t.n1.y; data[offset + 18] = t.n1.z;
      data[offset + 20] = t.n2.x; data[offset + 21] = t.n2.y; data[offset + 22] = t.n2.z;

      // UV
      data[offset + 24] = t.uv0[0]; data[offset + 25] = t.uv0[1];
      data[offset + 26] = t.uv1[0]; data[offset + 27] = t.uv1[1];
      data[offset + 28] = t.uv2[0]; data[offset + 29] = t.uv2[1];

      // Material ID
      data[offset + 30] = t.materialId;
    }

    return data;
  }

  private packBVHNodes(nodes: BVHNode[]): Float32Array {
    // 每个节点: vec3 min + u32 leftFirst + vec3 max + u32 triCount = 8 floats
    const data = new Float32Array(nodes.length * 8);

    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      const offset = i * 8;

      data[offset + 0] = n.minBounds.x;
      data[offset + 1] = n.minBounds.y;
      data[offset + 2] = n.minBounds.z;
      data[offset + 3] = n.leftFirst;
      data[offset + 4] = n.maxBounds.x;
      data[offset + 5] = n.maxBounds.y;
      data[offset + 6] = n.maxBounds.z;
      data[offset + 7] = n.triCount;
    }

    return data;
  }

  private packMaterials(materials: Material[]): Float32Array {
    // 每个材质: 16 floats (对齐)
    const data = new Float32Array(materials.length * 16);

    for (let i = 0; i < materials.length; i++) {
      const m = materials[i];
      const offset = i * 16;

      data[offset + 0] = m.albedo[0];
      data[offset + 1] = m.albedo[1];
      data[offset + 2] = m.albedo[2];
      data[offset + 3] = m.metallic;
      data[offset + 4] = m.roughness;
      data[offset + 5] = m.emission[0];
      data[offset + 6] = m.emission[1];
      data[offset + 7] = m.emission[2];
      data[offset + 8] = m.emissionStrength;
      data[offset + 9] = m.ior;
      data[offset + 10] = m.transmission;
      data[offset + 11] = m.clearcoat;
      data[offset + 12] = m.clearcoatRoughness;
    }

    return data;
  }

  resetAccumulation(): void {
    this.frameCount = 0;
  }

  setCamera(camera: Partial<CameraParams>): void {
    this.camera = { ...this.camera, ...camera };
    this.resetAccumulation();
  }

  private updateParams(): void {
    if (!this.device || !this.paramsBuffer) return;

    const data = new Float32Array(16);
    // cameraPosition
    data[0] = this.camera.position[0];
    data[1] = this.camera.position[1];
    data[2] = this.camera.position[2];
    data[3] = this.frameCount;
    // cameraTarget
    data[4] = this.camera.target[0];
    data[5] = this.camera.target[1];
    data[6] = this.camera.target[2];
    data[7] = this.config.maxBounces;
    // cameraUp + fov
    data[8] = this.camera.up[0];
    data[9] = this.camera.up[1];
    data[10] = this.camera.up[2];
    data[11] = this.camera.fov;
    // resolution + envMapIntensity + exposure
    data[12] = this.config.width;
    data[13] = this.config.height;
    data[14] = this.config.envMapIntensity;
    data[15] = this.config.exposure;

    this.device.queue.writeBuffer(this.paramsBuffer, 0, data);
  }

  private createBindGroups(): void {
    if (!this.device || !this.pipeline) return;
    if (!this.paramsBuffer || !this.triangleBuffer) return;
    if (!this.bvhBuffer || !this.materialBuffer) return;
    if (!this.outputTexture || !this.accumulationTexture) return;

    this.bindGroup0 = this.device.createBindGroup({
      layout: this.pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.paramsBuffer } },
        { binding: 1, resource: { buffer: this.triangleBuffer } },
        { binding: 2, resource: { buffer: this.bvhBuffer } },
        { binding: 3, resource: { buffer: this.materialBuffer } },
        { binding: 4, resource: this.outputTexture.createView() },
        { binding: 5, resource: this.accumulationTexture.createView() },
      ],
    });

    if (this.envMapTexture && this.envSampler) {
      this.bindGroup1 = this.device.createBindGroup({
        layout: this.pipeline.getBindGroupLayout(1),
        entries: [
          { binding: 0, resource: this.envMapTexture.createView({ dimension: 'cube' }) },
          { binding: 1, resource: this.envSampler },
        ],
      });
    }
  }

  render(): void {
    if (!this.isInitialized || !this.device || !this.pipeline) return;
    if (!this.context || !this.blitPipeline || !this.blitBindGroup) return;

    this.updateParams();
    this.createBindGroups();

    const currentTexture = this.context.getCurrentTexture();

    const commandEncoder = this.device.createCommandEncoder();
    const pass = commandEncoder.beginComputePass();

    pass.setPipeline(this.pipeline);
    if (this.bindGroup0) pass.setBindGroup(0, this.bindGroup0);
    if (this.bindGroup1) pass.setBindGroup(1, this.bindGroup1);

    const workgroupsX = Math.ceil(this.config.width / 8);
    const workgroupsY = Math.ceil(this.config.height / 8);
    pass.dispatchWorkgroups(workgroupsX, workgroupsY, 1);

    pass.end();

    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: currentTexture.createView(),
          loadOp: 'clear',
          storeOp: 'store',
          clearValue: { r: 0, g: 0, b: 0, a: 1 },
        },
      ],
    });
    renderPass.setPipeline(this.blitPipeline);
    renderPass.setBindGroup(0, this.blitBindGroup);
    renderPass.draw(3, 1, 0, 0);
    renderPass.end();

    this.device.queue.submit([commandEncoder.finish()]);

    this.frameCount++;
  }
}

export default PathTracingRenderer;
