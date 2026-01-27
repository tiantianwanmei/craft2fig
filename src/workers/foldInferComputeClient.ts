import FoldInferWorker from './foldInferCompute.worker?worker&inline';
import type { Vector } from '../utils/foldLogic';

type InferJob = {
  type: 'infer';
  id: number;
  vectors: Vector[];
};

type InferOk = {
  id: number;
  ok: true;
  type: InferJob['type'];
  result: {
    sequence: string[];
    nameMap: Record<string, string>;
    drivenMap: Record<string, string[]>;
    rootPanelId: string | null;
  };
};

type InferErr = { id: number; ok: false; type: InferJob['type']; error: string };

type JobResult = InferOk | InferErr;

type Pending = {
  resolve: (value: InferOk['result'] | null) => void;
  reject: (reason: unknown) => void;
  key: string;
  jobId: number;
};

class FoldInferComputeClient {
  private readonly worker: Worker;
  private nextJobId = 1;
  private readonly pendingById = new Map<number, Pending>();
  private readonly latestSeqByKey = new Map<string, number>();

  constructor() {
    this.worker = new FoldInferWorker();
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

    pending.resolve(msg.result);
  }

  infer(key: string, vectors: Vector[]) {
    const jobId = this.nextJobId++;
    this.latestSeqByKey.set(key, jobId);

    return new Promise<InferOk['result'] | null>((resolve, reject) => {
      const pending: Pending = { resolve, reject, key, jobId };
      const job: InferJob = { type: 'infer', id: jobId, vectors };
      this.pendingById.set(jobId, pending);
      this.worker.postMessage(job);
    });
  }
}

export const foldInferComputeClient = new FoldInferComputeClient();
