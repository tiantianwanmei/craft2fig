import { generateNormalMap } from '../utils/normalMapGenerator';
import { generateSDF } from '../utils/sdfGenerator';

type SetInput = {
  type: 'setInput';
  key: string;
  width: number;
  height: number;
  data: Uint8Array;
};

type NormalJob = {
  type: 'normal';
  id: number;
  key: string;
  width: number;
  height: number;
  options: {
    strength?: number;
    algorithm?: 'sobel' | 'scharr';
    invertY?: boolean;
    blurRadius?: number;
    edgeSoftness?: number;
    sharpness?: number;
    useGrayscale?: boolean;
    contrast?: number;
    brightness?: number;
    curvature?: 'linear' | 'parabolic' | 'smooth' | 'sharp' | 'round';
  };
};

type SdfJob = {
  type: 'sdf';
  id: number;
  key: string;
  width: number;
  height: number;
  options: {
    spread?: number;
    threshold?: number;
    mode?: 'shrink' | 'expand';
    profile?: 'smoothstep' | 'linear' | 'pillow';
    softness?: number;
    rippleCount?: number;
    rippleWidth?: number;
    rippleDash?: number;
    heightScale?: number;
    curvature?: 'linear' | 'parabolic' | 'smooth' | 'sharp' | 'round';
    maskMode?: 'alpha' | 'luminance';
    maskInvert?: boolean;
  };
};

type Job = SetInput | NormalJob | SdfJob;

type JobResult =
  | { id: number; ok: true; type: Job['type']; width: number; height: number; data: Uint8Array }
  | { id: number; ok: false; type: Job['type']; error: string };

type CachedInput = { width: number; height: number; data: Uint8ClampedArray };
const inputByKey = new Map<string, CachedInput>();

self.onmessage = (ev: MessageEvent<Job>) => {
  const job = ev.data;
  try {
    if (job.type === 'setInput') {
      inputByKey.set(job.key, {
        width: job.width,
        height: job.height,
        data: new Uint8ClampedArray(job.data.buffer),
      });
      return;
    }

    const cached = inputByKey.get(job.key);
    if (!cached) {
      throw new Error(`Missing cached input for key: ${job.key}`);
    }
    if (cached.width !== job.width || cached.height !== job.height) {
      throw new Error(
        `Cached input size mismatch for key: ${job.key} (cached ${cached.width}x${cached.height}, job ${job.width}x${job.height})`
      );
    }

    if (job.type === 'normal') {
      const out = generateNormalMap(
        cached.data,
        job.width,
        job.height,
        job.options
      );
      const res: JobResult = {
        id: job.id,
        ok: true,
        type: job.type,
        width: job.width,
        height: job.height,
        data: new Uint8Array(out.buffer),
      };
      (self as unknown as Worker).postMessage(res, [res.data.buffer]);
      return;
    }

    if (job.type === 'sdf') {
      const sdf = generateSDF(
        cached.data,
        job.width,
        job.height,
        job.options
      );

      const heightScale = job.options.heightScale ?? 1.5;
      if (heightScale !== 1) {
        for (let i = 0; i < sdf.length; i += 4) {
          const v = Math.min(255, sdf[i] * heightScale);
          sdf[i] = v;
          sdf[i + 1] = v;
          sdf[i + 2] = v;
        }
      }

      const res: JobResult = {
        id: job.id,
        ok: true,
        type: job.type,
        width: job.width,
        height: job.height,
        data: new Uint8Array(sdf.buffer),
      };
      (self as unknown as Worker).postMessage(res, [res.data.buffer]);
      return;
    }

    const neverType: never = job;
    throw new Error(`Unknown job type: ${(neverType as any)?.type}`);
  } catch (e) {
    const res: JobResult = {
      id: (job as NormalJob | SdfJob).id,
      ok: false,
      type: job.type,
      error: e instanceof Error ? e.message : String(e),
    };
    (self as unknown as Worker).postMessage(res);
  }
};
