import CraftComputeWorker from './craftCompute.worker?worker&inline';

type NormalJob = {
  type: 'normal';
  id: number;
  key: string;
  width: number;
  height: number;
  options: NormalOptions;
};

type NormalOptions = {
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
  };
};

type SetInputJob = {
  type: 'setInput';
  key: string;
  width: number;
  height: number;
  data: Uint8Array;
};

type ComputeJob = NormalJob | SdfJob;
type Job = SetInputJob | ComputeJob;

type JobResult =
  | { id: number; ok: true; type: Job['type']; width: number; height: number; data: Uint8Array }
  | { id: number; ok: false; type: Job['type']; error: string };

type Pending = {
  resolve: (value: Uint8ClampedArray | null) => void;
  reject: (reason: unknown) => void;
  key: string;
  jobId: number;
  type: ComputeJob['type'];
};

type WorkerSlot = {
  worker: Worker;
  busy: boolean;
  inputVersionByKey: Map<string, number>;
};

export type CraftComputeConcurrencyOptions = {
  poolSize?: number;
};

class CraftComputeClient {
  private readonly slots: WorkerSlot[];
  // Queue is de-duped by key so slider dragging doesn't build up a long backlog.
  // Only the latest job per key will be kept waiting; older queued jobs are replaced.
  private readonly queueByKey = new Map<
    string,
    {
      jobBuilder: () => { job: ComputeJob; transfer: Transferable[] };
      pending: Pending;
    }
  >();
  private readonly queueOrder: string[] = [];

  private nextJobId = 1;
  private readonly pendingById = new Map<number, Pending>();
  private readonly latestSeqByKey = new Map<string, number>();

  private readonly latestInputByKey = new Map<string, { width: number; height: number; data: Uint8ClampedArray; version: number }>();
  private nextInputVersion = 1;

  constructor(opts: CraftComputeConcurrencyOptions = {}) {
    const poolSize = Math.max(1, Math.min(4, opts.poolSize ?? 2));
    this.slots = Array.from({ length: poolSize }, () => {
      const w = new CraftComputeWorker();
      return { worker: w, busy: false, inputVersionByKey: new Map() };
    });

    for (const slot of this.slots) {
      slot.worker.onmessage = (ev: MessageEvent<JobResult>) => this.onMessage(slot, ev);
    }
  }

  private onMessage(slot: WorkerSlot, ev: MessageEvent<JobResult>) {
    slot.busy = false;
    const msg = ev.data;
    const pending = this.pendingById.get(msg.id);
    if (!pending) {
      this.kick();
      return;
    }
    this.pendingById.delete(msg.id);

    const latestSeq = this.latestSeqByKey.get(pending.key);
    if (latestSeq !== pending.jobId) {
      pending.resolve(null);
      this.kick();
      return;
    }

    if (!msg.ok) {
      pending.reject(new Error(msg.error));
      this.kick();
      return;
    }

    pending.resolve(new Uint8ClampedArray(msg.data.buffer));
    this.kick();
  }

  private getFreeSlot(): WorkerSlot | null {
    for (const s of this.slots) {
      if (!s.busy) return s;
    }
    return null;
  }

  private ensureInputCached(key: string, data: Uint8ClampedArray, width: number, height: number) {
    const current = this.latestInputByKey.get(key);
    const sameRef = current?.data === data;
    const sameSize = current?.width === width && current?.height === height;

    let version: number;
    if (current && sameRef && sameSize) {
      version = current.version;
    } else {
      version = this.nextInputVersion++;
      this.latestInputByKey.set(key, { width, height, data, version });
    }

    for (const slot of this.slots) {
      if (slot.inputVersionByKey.get(key) === version) continue;
      const copy = new Uint8Array(data.buffer.slice(0));
      const setJob: SetInputJob = { type: 'setInput', key, width, height, data: copy };
      slot.worker.postMessage(setJob, [copy.buffer]);
      slot.inputVersionByKey.set(key, version);
    }
  }

  private kick() {
    while (this.queueOrder.length > 0) {
      const slot = this.getFreeSlot();
      if (!slot) return;

      const key = this.queueOrder.shift()!;
      const item = this.queueByKey.get(key);
      if (!item) continue;
      this.queueByKey.delete(key);
      const built = item.jobBuilder();
      slot.busy = true;
      this.pendingById.set(built.job.id, item.pending);
      slot.worker.postMessage(built.job, built.transfer);
    }
  }

  private submit(
    type: ComputeJob['type'],
    key: string,
    jobBuilder: (jobId: number) => { job: ComputeJob; transfer: Transferable[] }
  ): Promise<Uint8ClampedArray | null> {
    const jobId = this.nextJobId++;
    this.latestSeqByKey.set(key, jobId);

    return new Promise((resolve, reject) => {
      const pending: Pending = { resolve, reject, key, jobId, type };

      const slot = this.getFreeSlot();
      if (!slot) {
        // Replace any existing queued job for the same key (latest-only),
        // but keep a stable FIFO order across different keys.
        const existed = this.queueByKey.has(key);
        this.queueByKey.set(key, { jobBuilder: () => jobBuilder(jobId), pending });
        if (!existed) this.queueOrder.push(key);
        return;
      }

      const built = jobBuilder(jobId);

      slot.busy = true;
      this.pendingById.set(built.job.id, pending);
      slot.worker.postMessage(built.job, built.transfer);
    });
  }

  computeNormal(
    key: string,
    data: Uint8ClampedArray,
    width: number,
    height: number,
    options: NormalOptions
  ): Promise<Uint8ClampedArray | null> {
    this.ensureInputCached(key, data, width, height);
    return this.submit('normal', key, (jobId) => {
      const job: NormalJob = {
        type: 'normal',
        id: jobId,
        key,
        width,
        height,
        options,
      };
      return { job, transfer: [] };
    });
  }

  computeSdf(
    key: string,
    data: Uint8ClampedArray,
    width: number,
    height: number,
    options: SdfJob['options']
  ): Promise<Uint8ClampedArray | null> {
    this.ensureInputCached(key, data, width, height);
    return this.submit('sdf', key, (jobId) => {
      const job: SdfJob = {
        type: 'sdf',
        id: jobId,
        key,
        width,
        height,
        options,
      };
      return { job, transfer: [] };
    });
  }
}

export const craftComputeClient = new CraftComputeClient({
  poolSize: 2,
});
