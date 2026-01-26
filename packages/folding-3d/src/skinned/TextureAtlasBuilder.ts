/**
 * TextureAtlasBuilder - 纹理图集构建器
 * 将多个面片的光栅化图像合并为单一纹理
 */

import * as THREE from 'three';
import type {
  PanelNode,
  TextureAtlasConfig,
  TextureAtlasResult,
  AtlasRegion,
} from './types';

/** 默认配置 */
const DEFAULT_CONFIG: TextureAtlasConfig = {
  width: 2048,
  height: 2048,
  padding: 2,
  backgroundColor: 'transparent',
};

/**
 * 纹理图集构建器
 */
export class TextureAtlasBuilder {
  private config: TextureAtlasConfig;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private regions: Map<string, AtlasRegion> = new Map();

  constructor(config: Partial<TextureAtlasConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.config.width;
    this.canvas.height = this.config.height;

    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context');
    }
    this.ctx = ctx;
  }

  /**
   * 从面片树构建纹理图集
   */
  async buildFromPanelTree(root: PanelNode): Promise<TextureAtlasResult> {
    // 清空画布
    this.clearCanvas();
    this.regions.clear();

    // 收集所有面片
    const panels = this.collectPanels(root);

    // 计算布局 (使用刀版图原始坐标)
    const layout = this.calculateLayout(panels);

    // 绘制各面片
    await this.drawPanels(panels, layout);

    // 创建纹理
    const texture = new THREE.CanvasTexture(this.canvas);
    texture.flipY = false;
    texture.needsUpdate = true;

    return {
      texture,
      canvas: this.canvas,
      regions: this.regions,
      width: this.config.width,
      height: this.config.height,
    };
  }

  /**
   * 清空画布
   */
  private clearCanvas(): void {
    if (this.config.backgroundColor === 'transparent') {
      this.ctx.clearRect(0, 0, this.config.width, this.config.height);
    } else {
      this.ctx.fillStyle = this.config.backgroundColor!;
      this.ctx.fillRect(0, 0, this.config.width, this.config.height);
    }
  }

  /**
   * 递归收集所有面片
   */
  private collectPanels(node: PanelNode, result: PanelNode[] = []): PanelNode[] {
    result.push(node);
    for (const child of node.children) {
      this.collectPanels(child, result);
    }
    return result;
  }

  /**
   * 计算布局 - 基于刀版图坐标
   */
  private calculateLayout(panels: PanelNode[]): Map<string, AtlasRegion> {
    const layout = new Map<string, AtlasRegion>();

    if (panels.length === 0) return layout;

    // 计算刀版图的边界框
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    for (const panel of panels) {
      minX = Math.min(minX, panel.bounds.x);
      minY = Math.min(minY, panel.bounds.y);
      maxX = Math.max(maxX, panel.bounds.x + panel.bounds.width);
      maxY = Math.max(maxY, panel.bounds.y + panel.bounds.height);
    }

    const dieWidth = maxX - minX;
    const dieHeight = maxY - minY;

    // 计算缩放比例以适应图集
    const availableWidth = this.config.width - this.config.padding * 2;
    const availableHeight = this.config.height - this.config.padding * 2;
    const scale = Math.min(
      availableWidth / dieWidth,
      availableHeight / dieHeight
    );

    // 为每个面片计算在图集中的位置
    for (const panel of panels) {
      const x = this.config.padding + (panel.bounds.x - minX) * scale;
      const y = this.config.padding + (panel.bounds.y - minY) * scale;
      const width = panel.bounds.width * scale;
      const height = panel.bounds.height * scale;

      const region: AtlasRegion = {
        panelId: panel.id,
        x,
        y,
        width,
        height,
        uv: {
          u0: x / this.config.width,
          v0: y / this.config.height,
          u1: (x + width) / this.config.width,
          v1: (y + height) / this.config.height,
        },
      };

      layout.set(panel.id, region);
      this.regions.set(panel.id, region);
    }

    return layout;
  }

  /**
   * 绘制面片到画布
   */
  private async drawPanels(
    panels: PanelNode[],
    layout: Map<string, AtlasRegion>
  ): Promise<void> {
    for (const panel of panels) {
      const region = layout.get(panel.id);
      if (!region) continue;

      await this.drawPanel(panel, region);
    }
  }

  /**
   * 绘制单个面片
   */
  private async drawPanel(panel: PanelNode, region: AtlasRegion): Promise<void> {
    if (panel.rasterImage) {
      await this.drawRasterImage(panel.rasterImage, region);
    } else if (panel.svgPath) {
      this.drawSvgPath(panel.svgPath, region);
    } else {
      // 绘制占位符
      this.drawPlaceholder(panel, region);
    }
  }

  /**
   * 绘制光栅化图像
   */
  private async drawRasterImage(
    image: string | ImageBitmap,
    region: AtlasRegion
  ): Promise<void> {
    if (typeof image === 'string') {
      // Base64 字符串
      const img = await this.loadImage(image);
      this.ctx.drawImage(img, region.x, region.y, region.width, region.height);
    } else {
      // ImageBitmap
      this.ctx.drawImage(image, region.x, region.y, region.width, region.height);
    }
  }

  /**
   * 加载图像
   */
  private loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  /**
   * 绘制 SVG 路径
   */
  private drawSvgPath(pathStr: string, region: AtlasRegion): void {
    const path = new Path2D(pathStr);

    this.ctx.save();
    this.ctx.translate(region.x, region.y);
    this.ctx.scale(
      region.width / 100, // 假设 SVG 坐标系为 100x100
      region.height / 100
    );
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fill(path);
    this.ctx.restore();
  }

  /**
   * 绘制占位符
   */
  private drawPlaceholder(panel: PanelNode, region: AtlasRegion): void {
    // 绘制白色背景
    this.ctx.fillStyle = '#f0f0f0';
    this.ctx.fillRect(region.x, region.y, region.width, region.height);

    // 绘制边框
    this.ctx.strokeStyle = '#cccccc';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(region.x, region.y, region.width, region.height);

    // 绘制面片名称
    this.ctx.fillStyle = '#666666';
    this.ctx.font = '12px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(
      panel.name,
      region.x + region.width / 2,
      region.y + region.height / 2
    );
  }

  /**
   * 获取图集 Canvas
   */
  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  /**
   * 获取区域映射
   */
  getRegions(): Map<string, AtlasRegion> {
    return this.regions;
  }

  /**
   * 导出为 Data URL
   */
  toDataURL(type = 'image/png', quality = 0.92): string {
    return this.canvas.toDataURL(type, quality);
  }

  /**
   * 导出为 Blob
   */
  toBlob(type = 'image/png', quality = 0.92): Promise<Blob | null> {
    return new Promise((resolve) => {
      this.canvas.toBlob(resolve, type, quality);
    });
  }
}
