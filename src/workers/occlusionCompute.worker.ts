type DecodePngJob = {
  type: 'decodePng';
  id: number;
  width?: number;
  height?: number;
  png: Uint8Array;
};

type CompositeAlphaJob = {
  type: 'compositeAlpha';
  id: number;
  targetPng: Uint8Array;
  occluderPng: Uint8Array;
};

type InitWasmJob = {
  type: 'initWasm';
  id: number;
  wasm: ArrayBuffer;
};

type Job = DecodePngJob | CompositeAlphaJob | InitWasmJob;

type JobResult =
  | { id: number; ok: true; type: Job['type']; width: number; height: number; data: Uint8Array }
  | { id: number; ok: false; type: Job['type']; error: string };

type WasmExports = {
  memory: WebAssembly.Memory;
  alloc: (size: number) => number;
  alpha_composite_inplace: (ptrTarget: number, ptrOcc: number, len: number) => void;
};

let wasmExports: WasmExports | null = null;
let wasmTargetPtr = 0;
let wasmTargetCap = 0;
let wasmOccPtr = 0;
let wasmOccCap = 0;
let didLogWasmComposite = false;

const ensureWasmBuffer = (kind: 'target' | 'occ', size: number): number => {
  if (!wasmExports) return 0;

  if (kind === 'target') {
    if (wasmTargetCap >= size && wasmTargetPtr !== 0) return wasmTargetPtr;
    wasmTargetPtr = wasmExports.alloc(size);
    wasmTargetCap = size;
    return wasmTargetPtr;
  }

  if (wasmOccCap >= size && wasmOccPtr !== 0) return wasmOccPtr;
  wasmOccPtr = wasmExports.alloc(size);
  wasmOccCap = size;
  return wasmOccPtr;
};

async function decodePngToRgba(png: Uint8Array): Promise<{ data: Uint8ClampedArray; width: number; height: number }> {
  const bytes = new Uint8Array(png.byteLength);
  bytes.set(png);
  const blob = new Blob([bytes], { type: 'image/png' });
  const bitmap = await createImageBitmap(blob);
  const width = bitmap.width;
  const height = bitmap.height;

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d', { willReadFrequently: true } as any);
  if (!ctx) {
    bitmap.close();
    throw new Error('OffscreenCanvas 2d context unavailable');
  }

  ctx.drawImage(bitmap as any, 0, 0);
  bitmap.close();

  const imageData = ctx.getImageData(0, 0, width, height);
  return { data: imageData.data, width, height };
}

(self as unknown as Worker).onmessage = (ev: MessageEvent<Job>) => {
  const job = ev.data;
  void (async () => {
    try {
      if (job.type === 'decodePng') {
        const decoded = await decodePngToRgba(job.png);
        const res: JobResult = {
          id: job.id,
          ok: true,
          type: job.type,
          width: decoded.width,
          height: decoded.height,
          data: new Uint8Array(decoded.data.buffer),
        };
        (self as unknown as Worker).postMessage(res, [res.data.buffer]);
        return;
      }

      if (job.type === 'initWasm') {
        const mod = await WebAssembly.compile(job.wasm);
        const instance = await WebAssembly.instantiate(mod, {});
        const exportsObj = instance.exports as any;
        const memory = exportsObj.memory as WebAssembly.Memory | undefined;
        const alloc = exportsObj.alloc as ((size: number) => number) | undefined;
        const alpha = exportsObj.alpha_composite_inplace as ((a: number, b: number, c: number) => void) | undefined;
        if (!memory || !alloc || !alpha) {
          throw new Error('WASM exports missing: memory/alloc/alpha_composite_inplace');
        }
        wasmExports = { memory, alloc, alpha_composite_inplace: alpha };
        wasmTargetPtr = 0;
        wasmTargetCap = 0;
        wasmOccPtr = 0;
        wasmOccCap = 0;
        didLogWasmComposite = false;

        if ((self as any)?.location && (self as any).location.href && (globalThis as any).importScripts && (globalThis as any).console) {
          // keep log minimal and harmless
          console.log('[wasm-occlusion] worker init ok');
        }

        const res: JobResult = {
          id: job.id,
          ok: true,
          type: job.type,
          width: 0,
          height: 0,
          data: new Uint8Array(0),
        };
        (self as unknown as Worker).postMessage(res);
        return;
      }

      if (job.type === 'compositeAlpha') {
        const target = await decodePngToRgba(job.targetPng);
        const occ = await decodePngToRgba(job.occluderPng);

        const out = new Uint8ClampedArray(target.data);
        if (target.width === occ.width && target.height === occ.height) {
          const total = out.length;
          if (wasmExports) {
            if (!didLogWasmComposite) {
              didLogWasmComposite = true;
              console.log('[wasm-occlusion] compositeAlpha using WASM');
            }
            const tPtr = ensureWasmBuffer('target', total);
            const oPtr = ensureWasmBuffer('occ', total);
            if (tPtr !== 0 && oPtr !== 0) {
              const mem = new Uint8Array(wasmExports.memory.buffer);
              mem.set(out, tPtr);
              mem.set(occ.data, oPtr);
              wasmExports.alpha_composite_inplace(tPtr, oPtr, total);
              out.set(mem.subarray(tPtr, tPtr + total));
            } else {
              for (let i = 0; i < total; i += 4) {
                const ta = out[i + 3];
                const oa = occ.data[i + 3];
                out[i + 3] = Math.round((ta * (255 - oa)) / 255);
              }
            }
          } else {
            for (let i = 0; i < total; i += 4) {
              const ta = out[i + 3];
              const oa = occ.data[i + 3];
              out[i + 3] = Math.round((ta * (255 - oa)) / 255);
            }
          }
        }

        const res: JobResult = {
          id: job.id,
          ok: true,
          type: job.type,
          width: target.width,
          height: target.height,
          data: new Uint8Array(out.buffer),
        };
        (self as unknown as Worker).postMessage(res, [res.data.buffer]);
        return;
      }

      const neverType: never = job;
      throw new Error(`Unknown job type: ${(neverType as any)?.type}`);
    } catch (e) {
      const res: JobResult = {
        id: (job as DecodePngJob | CompositeAlphaJob).id,
        ok: false,
        type: job.type,
        error: e instanceof Error ? e.message : String(e),
      };
      (self as unknown as Worker).postMessage(res);
    }
  })();
};
