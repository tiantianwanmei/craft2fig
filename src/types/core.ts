/**
 * 🔢 Core Types - 核心数据类型定义
 * 与 Figma 插件数据结构 1:1 对应
 */

// ========== 基础几何类型 ==========

/** 2D 向量 */
export interface Vector2D {
  readonly x: number;
  readonly y: number;
}

/** 3D 向量 */
export interface Vector3D {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** 边界框 */
export interface BoundingBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** 变换矩阵 (2D 仿射变换) */
export interface Transform2D {
  readonly a: number;  // scale x
  readonly b: number;  // skew y
  readonly c: number;  // skew x
  readonly d: number;  // scale y
  readonly tx: number; // translate x
  readonly ty: number; // translate y
}

// ========== 颜色类型 ==========

/** RGBA 颜色 */
export interface RGBAColor {
  readonly r: number; // 0-1
  readonly g: number; // 0-1
  readonly b: number; // 0-1
  readonly a: number; // 0-1
}

/** 十六进制颜色 */
export type HexColor = `#${string}`;

// ========== 图层类型 ==========

/** 图层类型枚举 */
export type LayerType =
  | 'FRAME'
  | 'GROUP'
  | 'RECTANGLE'
  | 'ELLIPSE'
  | 'POLYGON'
  | 'STAR'
  | 'LINE'
  | 'VECTOR'
  | 'TEXT'
  | 'COMPONENT'
  | 'INSTANCE'
  | 'BOOLEAN_OPERATION';

/** 标记图层 */
export interface MarkedLayer {
  readonly id: string;
  readonly name: string;
  readonly type: LayerType;
  readonly bounds: BoundingBox;
  readonly visible: boolean;
  readonly locked: boolean;
  readonly opacity: number;
  readonly craftType?: CraftType;
  readonly crafts?: string[];  // 工艺类型数组（支持多工艺）
  readonly grayValue?: number;  // 灰度值 (0-1)
  readonly craftParams?: CraftParams;
  readonly svgPreview?: string;  // SVG 预览字符串
  readonly pngPreview?: string;  // PNG 预览 base64
}

// ========== 折边类型 ==========

/** 折边方向 */
export type FoldDirection = 'L' | 'R' | 'F' | 'HT' | 'HB' | 'CUSTOM' | 'HORIZONTAL' | 'VERTICAL';

/** 折边关系 */
export interface FoldEdge {
  readonly id: string;
  readonly name: string;
  readonly startPoint: Vector2D;
  readonly endPoint: Vector2D;
  readonly direction: FoldDirection;
  readonly angle: number; // 折叠角度 (度)
  readonly linkedPanels: readonly string[]; // 关联面板 ID
}

/** 驱动关系 */
export interface DrivenRelation {
  readonly driverId: string;
  readonly drivenIds: readonly string[];
  readonly type: 'FOLD' | 'ROTATION' | 'TRANSLATION';
  readonly ratio: number; // 驱动比例
}

// ========== 工艺类型 ==========

/** 工艺类型 */
export type CraftType =
  | 'NORMAL'    // 法线贴图
  | 'EMBOSS'    // 凸凹压印
  | 'UV'        // UV 涂层
  | 'HOTFOIL'   // 烫金
  | 'VARNISH'   // 光油
  | 'SPOT_UV'   // 局部 UV
  | 'DEBOSS'    // 凹印
  | 'TEXTURE'   // 纹理
  | 'CLIPMASK'; // 剪切蒙版

/** 工艺参数 */
export interface CraftParams {
  readonly intensity: number;      // 强度 0-100
  readonly blur: number;           // 模糊 0-100
  readonly height: number;         // 高度 0-100
  readonly invert: boolean;        // 反转
  readonly bevelType?: BevelType;  // 斜角类型
  readonly textureType?: TextureType;

  // ===== Renderer-specific optional params (used by CraftRenderer) =====
  readonly strength?: number;

  // Normal Map
  readonly blurRadius?: number;
  readonly sharpness?: number;
  readonly contrast?: number;
  readonly edgeSoftness?: number;
  readonly algorithm?: 'sobel' | 'scharr';
  readonly invertY?: boolean;
  readonly useGrayscale?: boolean;

  // Emboss (SDF)
  readonly sdfSpread?: number;
  readonly sdfMode?: 'shrink' | 'grow';
  readonly sdfProfile?: 'smoothstep' | 'linear' | 'cosine';
  readonly sdfSoftness?: number;
  readonly rippleCount?: number;
  readonly rippleWidth?: number;
  readonly rippleDash?: number;
  readonly heightScale?: number;

  // UV
  readonly type?: 'gloss' | 'semi' | 'satin' | 'matte' | 'reverse' | 'frosted' | 'fragment' | 'diamond' | 'mosaic' | 'concentric';
  readonly gloss?: number;
  readonly thickness?: number;
  readonly roughness?: number;
  readonly sharpen?: number;
  readonly blurStrength?: number;
  readonly uvContrast?: number;
  readonly maskMode?: 'alpha' | 'luminance';
  readonly maskInvert?: boolean;
  readonly fragmentSize?: number;
  readonly fragmentVariation?: number;
  readonly fragmentRotation?: number;
  readonly fragmentRadial?: number;
  readonly fragmentTwist?: number;
  readonly sparkleIntensity?: number;
  readonly sparkleFrequency?: number;
  readonly diamondRotation?: number;
  readonly diamondRadial?: number;
  readonly diamondTwist?: number;
  readonly mosaicSize?: number;
  readonly mosaicVariation?: number;
  readonly mosaicRotation?: number;
  readonly mosaicRadial?: number;
  readonly mosaicTwist?: number;
  readonly frostIntensity?: number;
  readonly frostedRotation?: number;
  readonly frostedRadial?: number;
  readonly frostedTwist?: number;
  readonly frostedNoiseScaleX?: number;
  readonly frostedNoiseScaleY?: number;
  readonly frostedNoiseFrequency?: number;
  readonly frostedStripeCount?: number;
  readonly frostedDistortion?: number;
  readonly frostedRadialRotation?: number;
  readonly frostedPixelSwirl?: number;
  readonly ringCount?: number;
  readonly ringSpacing?: number;
  readonly concentricMode?: 'circle' | 'shape';
  readonly concentricStyle?: 'ring' | 'dot';
  readonly lineWidth?: number;
  readonly gradient?: number;
  readonly dotSpacing?: number;
  readonly concentricRadial?: number;
  readonly concentricTwist?: number;

  // Hotfoil
  readonly metallic?: number;
  readonly hue?: number;
  readonly saturation?: number;
  readonly brightness?: number;
  readonly ior?: number;
  readonly anisotropic?: number;
  readonly noise?: number;
  readonly noiseType?: 'matte' | 'brushed' | 'leather' | 'fabric' | 'wood';
  readonly noiseScaleX?: number;
  readonly noiseScaleY?: number;
  readonly noiseRotation?: number;
  readonly noiseFrequency?: number;
  readonly stripeCount?: number;
  readonly distortion?: number;

  // Displacement
  readonly midlevel?: number;
  readonly gradient?: number;
}

/** 斜角类型 */
export type BevelType = 'SMOOTH' | 'CHISEL' | 'MESA' | 'ROUND';

/** 纹理类型 */
export type TextureType =
  | 'BRUSHED'    // 拉丝
  | 'NOISE'      // 噪点
  | 'PERLIN'     // 柏林噪声
  | 'LEATHER'    // 皮革
  | 'FABRIC'     // 织物
  | 'WOOD';      // 木纹

// ========== 画布状态 ==========

/** 画布变换状态 */
export interface CanvasTransform {
  readonly pan: Vector2D;
  readonly zoom: number;
  readonly rotation: number;
}

/** 视口状态 */
export interface ViewportState {
  readonly width: number;
  readonly height: number;
  readonly transform: CanvasTransform;
  readonly showGrid: boolean;
  readonly showGuides: boolean;
}

// ========== 选择状态 ==========

/** 选择模式 */
export type SelectionMode = 'SINGLE' | 'MULTIPLE' | 'NONE';

/** 选择状态 */
export interface SelectionState {
  readonly mode: SelectionMode;
  readonly selectedIds: readonly string[];
  readonly hoveredId: string | null;
  readonly focusedId: string | null;
}

// ========== 导出类型 ==========

/** 导出格式 */
export type ExportFormat = 'JSON' | 'PNG' | 'SVG' | 'PDF' | 'GLTF' | 'BLEND';

/** 导出选项 */
export interface ExportOptions {
  readonly format: ExportFormat;
  readonly scale: number;
  readonly includeHidden?: boolean;
  readonly flattenGroups?: boolean;
  readonly embedImages?: boolean;
}

/** 导出结果 */
export interface ExportResult {
  readonly success: boolean;
  readonly format: ExportFormat;
  readonly data?: Uint8Array | string;
  readonly error?: string;
  readonly timestamp: number;
}

// ========== 项目数据 ==========

/** 项目元数据 */
export interface ProjectMeta {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly author?: string;
}

/** 项目数据 */
export interface ProjectData {
  readonly meta: ProjectMeta;
  readonly layers: readonly MarkedLayer[];
  readonly foldEdges: readonly FoldEdge[];
  readonly drivenRelations: readonly DrivenRelation[];
  readonly viewportState: ViewportState;
  readonly selectionState: SelectionState;
}

// ========== 工具类型 ==========

/** 深度只读类型 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

/** 可选字段类型 */
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/** 必填字段类型 */
export type Required<T, K extends keyof T> = T & { [P in K]-?: T[P] };
