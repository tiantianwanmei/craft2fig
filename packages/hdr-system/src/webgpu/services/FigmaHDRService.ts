// ============================================================================
// Figma HDR Service - Figma 画布 HDR 导入服务
// ============================================================================

import { UnifiedHDRLoader, HDRData } from '../loaders';

export interface FigmaHDRConfig {
  maxSize: number;
  compressionQuality: number;
  storageKey: string;
}

const DEFAULT_CONFIG: FigmaHDRConfig = {
  maxSize: 2048,
  compressionQuality: 0.9,
  storageKey: 'webgpu_hdr_environment',
};

export class FigmaHDRService {
  private config: FigmaHDRConfig;

  constructor(config: Partial<FigmaHDRConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 从 Figma 画布节点导入 HDR
   */
  async importFromFigmaNode(nodeId: string): Promise<HDRData | null> {
    return new Promise((resolve) => {
      // 发送消息给 Figma 插件
      parent.postMessage({
        pluginMessage: {
          type: 'EXPORT_HDR_FROM_NODE',
          nodeId,
          config: this.config,
        },
      }, '*');

      // 监听响应
      const handler = (event: MessageEvent) => {
        const msg = event.data?.pluginMessage;
        if (msg?.type === 'HDR_EXPORT_RESULT') {
          window.removeEventListener('message', handler);
          if (msg.success && msg.data) {
            const hdrData = UnifiedHDRLoader.loadFromBase64(
              msg.data,
              msg.format || 'hdr'
            );
            resolve(hdrData);
          } else {
            resolve(null);
          }
        }
      };

      window.addEventListener('message', handler);
    });
  }

  /**
   * 从文件上传 HDR
   */
  async importFromFile(file: File): Promise<HDRData> {
    return UnifiedHDRLoader.loadFromFile(file);
  }

  /**
   * 保存 HDR 到 Figma pluginData
   */
  async saveToFigma(hdrData: HDRData): Promise<boolean> {
    return new Promise((resolve) => {
      const base64 = this.hdrToBase64(hdrData);

      parent.postMessage({
        pluginMessage: {
          type: 'SAVE_HDR_DATA',
          key: this.config.storageKey,
          data: base64,
          metadata: {
            width: hdrData.width,
            height: hdrData.height,
            format: hdrData.format,
          },
        },
      }, '*');

      const handler = (event: MessageEvent) => {
        const msg = event.data?.pluginMessage;
        if (msg?.type === 'HDR_SAVE_RESULT') {
          window.removeEventListener('message', handler);
          resolve(msg.success);
        }
      };

      window.addEventListener('message', handler);
    });
  }

  /**
   * 从 Figma 加载已保存的 HDR
   */
  async loadFromFigma(): Promise<HDRData | null> {
    return new Promise((resolve) => {
      parent.postMessage({
        pluginMessage: {
          type: 'LOAD_HDR_DATA',
          key: this.config.storageKey,
        },
      }, '*');

      const handler = (event: MessageEvent) => {
        const msg = event.data?.pluginMessage;
        if (msg?.type === 'HDR_LOAD_RESULT') {
          window.removeEventListener('message', handler);
          if (msg.success && msg.data) {
            const hdrData = UnifiedHDRLoader.loadFromBase64(
              msg.data,
              msg.metadata?.format || 'hdr'
            );
            resolve(hdrData);
          } else {
            resolve(null);
          }
        }
      };

      window.addEventListener('message', handler);
    });
  }

  private hdrToBase64(hdrData: HDRData): string {
    const bytes = new Uint8Array(hdrData.data.buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}