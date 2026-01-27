import { autoInferFoldSequence, type Vector } from '../utils/foldLogic';

type InferJob = {
  type: 'infer';
  id: number;
  vectors: Vector[];
};

type InferResult =
  | { id: number; ok: true; type: InferJob['type']; result: ReturnType<typeof autoInferFoldSequence> }
  | { id: number; ok: false; type: InferJob['type']; error: string };

type Job = InferJob;

type JobResult = InferResult;

(self as unknown as Worker).onmessage = (ev: MessageEvent<Job>) => {
  const job = ev.data;
  void (async () => {
    try {
      const result = autoInferFoldSequence(job.vectors);
      const res: JobResult = { id: job.id, ok: true, type: job.type, result };
      (self as unknown as Worker).postMessage(res);
    } catch (e) {
      const res: JobResult = {
        id: job.id,
        ok: false,
        type: job.type,
        error: e instanceof Error ? e.message : String(e),
      };
      (self as unknown as Worker).postMessage(res);
    }
  })();
};
