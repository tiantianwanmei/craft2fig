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

type PngMap = Record<string, Uint8Array>;

type EdgeMaskBytes = { top: Uint8Array; bottom: Uint8Array; left: Uint8Array; right: Uint8Array };

type EdgeMaskMap = Record<string, EdgeMaskBytes>;

type Job = CropFromFrameJob;

type JobResult =
  | {
      id: number;
      ok: true;
      type: Job['type'];
      croppedTextures: PngMap;
      shapeMasks: PngMap;
      edgeMasksMap: EdgeMaskMap;
    }
  | { id: number; ok: false; type: Job['type']; error: string };

async function canvasToPngBytes(canvas: OffscreenCanvas): Promise<Uint8Array> {
  const blob = await canvas.convertToBlob({ type: 'image/png' });
  const ab = await blob.arrayBuffer();
  return new Uint8Array(ab);
}

async function loadFrameBitmap(frameImage: string): Promise<ImageBitmap> {
  const res = await fetch(frameImage);
  const blob = await res.blob();
  return createImageBitmap(blob);
}

(self as unknown as Worker).onmessage = (ev: MessageEvent<Job>) => {
  const job = ev.data;
  void (async () => {
    try {
      const bitmap = await loadFrameBitmap(job.frameImage);

      const croppedTextures: PngMap = {};
      const shapeMasks: PngMap = {};
      const edgeMasksMap: EdgeMaskMap = {};

      for (const v of job.vectors) {
        const cropX = v.cropX ?? 0;
        const cropY = v.cropY ?? 0;
        const cropW = v.cropWidth ?? v.width ?? 100;
        const cropH = v.cropHeight ?? v.height ?? 100;
        if (cropW <= 0 || cropH <= 0) continue;

        const canvas = new OffscreenCanvas(cropW, cropH);
        const ctx = canvas.getContext('2d', { willReadFrequently: true } as any);
        if (!ctx) continue;
        ctx.drawImage(bitmap as any, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

        const orig = ctx.getImageData(0, 0, cropW, cropH);

        croppedTextures[v.id] = await canvasToPngBytes(canvas);

        const maskData = orig.data;
        for (let i = 0; i < maskData.length; i += 4) {
          const a = maskData[i + 3];
          if (a > 0) {
            maskData[i] = 255;
            maskData[i + 1] = 255;
            maskData[i + 2] = 255;
            maskData[i + 3] = 255;
          }
        }
        ctx.putImageData(orig, 0, 0);
        shapeMasks[v.id] = await canvasToPngBytes(canvas);

        ctx.drawImage(bitmap as any, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
        const orig2 = ctx.getImageData(0, 0, cropW, cropH);

        const EDGE_THICKNESS = 2;

        const topCanvas = new OffscreenCanvas(cropW, EDGE_THICKNESS);
        const topCtx = topCanvas.getContext('2d', { willReadFrequently: true } as any);
        const bottomCanvas = new OffscreenCanvas(cropW, EDGE_THICKNESS);
        const bottomCtx = bottomCanvas.getContext('2d', { willReadFrequently: true } as any);
        const leftCanvas = new OffscreenCanvas(EDGE_THICKNESS, cropH);
        const leftCtx = leftCanvas.getContext('2d', { willReadFrequently: true } as any);
        const rightCanvas = new OffscreenCanvas(EDGE_THICKNESS, cropH);
        const rightCtx = rightCanvas.getContext('2d', { willReadFrequently: true } as any);

        if (!topCtx || !bottomCtx || !leftCtx || !rightCtx) continue;

        const topData = topCtx.createImageData(cropW, EDGE_THICKNESS);
        for (let x = 0; x < cropW; x++) {
          const alpha = orig2.data[x * 4 + 3];
          const alphaVal = alpha > 0 ? 255 : 0;
          for (let t = 0; t < EDGE_THICKNESS; t++) {
            const dst = (t * cropW + x) * 4;
            topData.data[dst] = 255;
            topData.data[dst + 1] = 255;
            topData.data[dst + 2] = 255;
            topData.data[dst + 3] = alphaVal;
          }
        }
        topCtx.putImageData(topData, 0, 0);

        const bottomData = bottomCtx.createImageData(cropW, EDGE_THICKNESS);
        for (let x = 0; x < cropW; x++) {
          const src = ((cropH - 1) * cropW + x) * 4;
          const alpha = orig2.data[src + 3];
          const alphaVal = alpha > 0 ? 255 : 0;
          for (let t = 0; t < EDGE_THICKNESS; t++) {
            const dst = (t * cropW + x) * 4;
            bottomData.data[dst] = 255;
            bottomData.data[dst + 1] = 255;
            bottomData.data[dst + 2] = 255;
            bottomData.data[dst + 3] = alphaVal;
          }
        }
        bottomCtx.putImageData(bottomData, 0, 0);

        const leftData = leftCtx.createImageData(EDGE_THICKNESS, cropH);
        for (let y = 0; y < cropH; y++) {
          const src = y * cropW * 4;
          const alpha = orig2.data[src + 3];
          const alphaVal = alpha > 0 ? 255 : 0;
          for (let t = 0; t < EDGE_THICKNESS; t++) {
            const dst = (y * EDGE_THICKNESS + t) * 4;
            leftData.data[dst] = 255;
            leftData.data[dst + 1] = 255;
            leftData.data[dst + 2] = 255;
            leftData.data[dst + 3] = alphaVal;
          }
        }
        leftCtx.putImageData(leftData, 0, 0);

        const rightData = rightCtx.createImageData(EDGE_THICKNESS, cropH);
        for (let y = 0; y < cropH; y++) {
          const src = (y * cropW + cropW - 1) * 4;
          const alpha = orig2.data[src + 3];
          const alphaVal = alpha > 0 ? 255 : 0;
          for (let t = 0; t < EDGE_THICKNESS; t++) {
            const dst = (y * EDGE_THICKNESS + t) * 4;
            rightData.data[dst] = 255;
            rightData.data[dst + 1] = 255;
            rightData.data[dst + 2] = 255;
            rightData.data[dst + 3] = alphaVal;
          }
        }
        rightCtx.putImageData(rightData, 0, 0);

        edgeMasksMap[v.id] = {
          top: await canvasToPngBytes(topCanvas),
          bottom: await canvasToPngBytes(bottomCanvas),
          left: await canvasToPngBytes(leftCanvas),
          right: await canvasToPngBytes(rightCanvas),
        };
      }

      try {
        bitmap.close();
      } catch (_e) {
      }

      const transfer: Transferable[] = [];
      for (const k in croppedTextures) transfer.push(croppedTextures[k].buffer);
      for (const k in shapeMasks) transfer.push(shapeMasks[k].buffer);
      for (const k in edgeMasksMap) {
        transfer.push(edgeMasksMap[k].top.buffer);
        transfer.push(edgeMasksMap[k].bottom.buffer);
        transfer.push(edgeMasksMap[k].left.buffer);
        transfer.push(edgeMasksMap[k].right.buffer);
      }

      const res: JobResult = {
        id: job.id,
        ok: true,
        type: job.type,
        croppedTextures,
        shapeMasks,
        edgeMasksMap,
      };
      (self as unknown as Worker).postMessage(res, transfer);
    } catch (e) {
      const res: JobResult = {
        id: (job as CropFromFrameJob).id,
        ok: false,
        type: job.type,
        error: e instanceof Error ? e.message : String(e),
      };
      (self as unknown as Worker).postMessage(res);
    }
  })();
};
