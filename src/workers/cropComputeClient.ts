import CropComputeWorker from './cropCompute.worker?worker&inline';

type CropVector = {
  id: string;
  name?: string;
  cropX?: number;
  cropY?: number;
  cropWidth?: number;
  cropHeight?: number;
  width?: number;
  height?: number;
};

type CropFromFrameJob = {
  type: 'cropFromFrame';
  id: number;
  frameImage: string;
  frameWidth: number;
  frameHeight: number;
  vectors: CropVector[];
};

type EdgeMaskBytes = { top: Uint8Array; bottom: Uint8Array; left: Uint8Array; right: Uint8Array };

type Job = CropFromFrameJob;

type JobResult =
  | {
      id: number;
      ok: true;
      type: Job['type'];
      croppedTextures: Record<string, Uint8Array>;
      shapeMasks: Record<string, Uint8Array>;
      edgeMasksMap: Record<string, EdgeMaskBytes>;
    }
  | { id: number; ok: false; type: Job['type']; error: string };

type Pending = {
  resolve: (value: Omit<Extract<JobResult, { ok: true }>, 'id' | 'ok' | 'type'> | null) => void;
  reject: (reason: unknown) => void;
  key: string;
  jobId: number;
};

class CropComputeClient {
  private readonly worker: Worker;
  private nextJobId = 1;
  private readonly pendingById = new Map<number, Pending>();
  private readonly latestSeqByKey = new Map<string, number>();

  constructor() {
    this.worker = new CropComputeWorker();
    this.worker.onmessage = (ev: MessageEvent<JobResult>) => this.onMessage(ev);
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

    pending.resolve({
      croppedTextures: msg.croppedTextures,
      shapeMasks: msg.shapeMasks,
      edgeMasksMap: msg.edgeMasksMap,
    });
  }

  cropFromFrame(key: string, frameImage: string, frameWidth: number, frameHeight: number, vectors: CropVector[]) {
    const jobId = this.nextJobId++;
    this.latestSeqByKey.set(key, jobId);

    return new Promise<Omit<Extract<JobResult, { ok: true }>, 'id' | 'ok' | 'type'> | null>((resolve, reject) => {
      const pending: Pending = { resolve, reject, key, jobId };
      const job: CropFromFrameJob = { type: 'cropFromFrame', id: jobId, frameImage, frameWidth, frameHeight, vectors };
      this.pendingById.set(jobId, pending);
      this.worker.postMessage(job);
    });
  }
}

export const cropComputeClient = new CropComputeClient();
