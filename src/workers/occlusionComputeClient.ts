import OcclusionComputeWorker from './occlusionCompute.worker?worker&inline';

type DecodePngJob = {
  type: 'decodePng';
  id: number;
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

type Pending = {
  resolve: (value: { data: Uint8ClampedArray; width: number; height: number } | null) => void;
  reject: (reason: unknown) => void;
  key: string;
  jobId: number;
};

const toTransferableBytes = (bytes: Uint8Array): { bytes: Uint8Array; transfer: Transferable[] } => {
  const buf = bytes.buffer;
  if (buf instanceof ArrayBuffer) return { bytes, transfer: [buf] };
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return { bytes: copy, transfer: [copy.buffer] };
};

class OcclusionComputeClient {
  private readonly worker: Worker;
  private nextJobId = 1;
  private readonly pendingById = new Map<number, Pending>();
  private readonly latestSeqByKey = new Map<string, number>();
  private wasmInitPromise: Promise<boolean> | null = null;

  constructor() {
    this.worker = new OcclusionComputeWorker();
    this.worker.onmessage = (ev: MessageEvent<JobResult>) => this.onMessage(ev);
  }

  private async initWasmOnce(): Promise<boolean> {
    if (this.wasmInitPromise) return this.wasmInitPromise;
    this.wasmInitPromise = (async () => {
      try {
        const wasmUrl = new URL('wasm/wasm_occlusion.wasm', window.location.href).toString();
        if (import.meta.env.DEV) {
          console.log('[wasm-occlusion] fetching:', wasmUrl);
        }
        const resp = await fetch(wasmUrl);
        if (!resp.ok) {
          if (import.meta.env.DEV) {
            console.warn('[wasm-occlusion] fetch failed:', resp.status, resp.statusText);
          }
          return false;
        }
        const buf = await resp.arrayBuffer();

        const jobId = this.nextJobId++;
        const job: InitWasmJob = { type: 'initWasm', id: jobId, wasm: buf };

        await new Promise<void>((resolve, reject) => {
          const pending: Pending = {
            resolve: (_v) => resolve(),
            reject,
            key: `initWasm`,
            jobId,
          };
          this.latestSeqByKey.set(pending.key, jobId);
          this.pendingById.set(jobId, pending);
          this.worker.postMessage(job, [buf]);
        });
        if (import.meta.env.DEV) {
          console.log('[wasm-occlusion] initWasm ok');
        }
        return true;
      } catch (_e) {
        if (import.meta.env.DEV) {
          console.warn('[wasm-occlusion] initWasm error');
        }
        return false;
      }
    })();
    return this.wasmInitPromise;
  }

  private onMessage(ev: MessageEvent<JobResult>) {
    const msg = ev.data;
    const pending = this.pendingById.get(msg.id);
    if (!pending) return;
    this.pendingById.delete(msg.id);

    const latestSeq = this.latestSeqByKey.get(pending.key);
    if (latestSeq !== pending.jobId) {
      pending.resolve(null);
      return;
    }

    if (!msg.ok) {
      pending.reject(new Error(msg.error));
      return;
    }

    pending.resolve({ data: new Uint8ClampedArray(msg.data.buffer), width: msg.width, height: msg.height });
  }

  private submit(
    key: string,
    jobBuilder: (jobId: number) => { job: Job; transfer: Transferable[] }
  ): Promise<{ data: Uint8ClampedArray; width: number; height: number } | null> {
    const jobId = this.nextJobId++;
    this.latestSeqByKey.set(key, jobId);

    return new Promise((resolve, reject) => {
      const pending: Pending = { resolve, reject, key, jobId };
      const built = jobBuilder(jobId);
      this.pendingById.set(built.job.id, pending);
      this.worker.postMessage(built.job, built.transfer);
    });
  }

  decodePng(key: string, png: Uint8Array) {
    return this.submit(key, (jobId) => {
      const prepared = toTransferableBytes(png);
      const job: DecodePngJob = { type: 'decodePng', id: jobId, png: prepared.bytes };
      return { job, transfer: prepared.transfer };
    });
  }

  compositeAlpha(key: string, targetPng: Uint8Array, occluderPng: Uint8Array) {
    void this.initWasmOnce();
    return this.submit(key, (jobId) => {
      const t = toTransferableBytes(targetPng);
      const o = toTransferableBytes(occluderPng);
      const job: CompositeAlphaJob = { type: 'compositeAlpha', id: jobId, targetPng: t.bytes, occluderPng: o.bytes };
      return { job, transfer: [...t.transfer, ...o.transfer] };
    });
  }
}

export const occlusionComputeClient = new OcclusionComputeClient();
