/**
 * 🚀 NativeCanvas - 原生DOM实现的Canvas渲染器
 *
 * 为什么需要这个？
 * - React的虚拟DOM diff和重渲染机制在高频更新场景下会阻塞主线程
 * - 原版使用纯HTML+原生JS，性能极佳
 * - 这个类使用原生DOM操作，绕过React的渲染管道
 */

export interface Vector {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  bounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface CanvasState {
  vectors: Vector[];
  selectedVectorIds: string[];
  vectorOrderMap: Record<string, number>;
  zoom: number;
  panX: number;
  panY: number;
}

export class NativeCanvas {
  private container: HTMLElement;
  private canvasEl: HTMLElement;
  private state: CanvasState;
  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private dragStartPanX = 0;
  private dragStartPanY = 0;

  // 回调函数
  private onVectorClick?: (vectorId: string, isMultiSelect: boolean) => void;
  private onVectorOrderChange?: (vectorId: string, order: number) => void;

  constructor(container: HTMLElement) {
    this.container = container;
    this.state = {
      vectors: [],
      selectedVectorIds: [],
      vectorOrderMap: {},
      zoom: 100,
      panX: 0,
      panY: 0,
    };

    // 创建canvas容器
    this.canvasEl = document.createElement('div');
    this.canvasEl.className = 'native-canvas';
    this.canvasEl.style.cssText = `
      position: relative;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #0a0a0b;
      cursor: grab;
    `;

    this.container.appendChild(this.canvasEl);
    this.setupEventListeners();
  }

  private setupEventListeners() {
    // 鼠标拖拽平移
    this.canvasEl.addEventListener('mousedown', this.handleMouseDown);
    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('mouseup', this.handleMouseUp);

    // 滚轮缩放 - 非passive，允许preventDefault
    this.canvasEl.addEventListener('wheel', this.handleWheel, { passive: false });
  }

  private handleMouseDown = (e: MouseEvent) => {
    if (e.button !== 0) return; // 只响应左键

    // 检查是否点击在vector卡片上
    const target = e.target as HTMLElement;
    if (target.closest('.vector-card')) return;

    this.isDragging = true;
    this.dragStartX = e.clientX;
    this.dragStartY = e.clientY;
    this.dragStartPanX = this.state.panX;
    this.dragStartPanY = this.state.panY;
    this.canvasEl.style.cursor = 'grabbing';
  };

  private handleMouseMove = (e: MouseEvent) => {
    if (!this.isDragging) return;

    const dx = e.clientX - this.dragStartX;
    const dy = e.clientY - this.dragStartY;

    this.state.panX = this.dragStartPanX + dx;
    this.state.panY = this.dragStartPanY + dy;

    this.updateTransform();
  };

  private handleMouseUp = () => {
    if (this.isDragging) {
      this.isDragging = false;
      this.canvasEl.style.cursor = 'grab';
    }
  };

  private handleWheel = (e: WheelEvent) => {
    e.preventDefault(); // 阻止页面滚动

    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(25, Math.min(400, Math.round(this.state.zoom * delta)));

    if (newZoom !== this.state.zoom) {
      this.state.zoom = newZoom;
      this.updateTransform();
    }
  };

  private updateTransform() {
    // 直接操作DOM，无React开销
    const contentEl = this.canvasEl.querySelector('.canvas-content') as HTMLElement;
    if (contentEl) {
      const scale = this.state.zoom / 100;
      contentEl.style.transform = `translate(${this.state.panX}px, ${this.state.panY}px) scale(${scale})`;
    }
  }

  // 公共API：更新状态
  public updateState(newState: Partial<CanvasState>) {
    const needsRender =
      newState.vectors !== undefined ||
      newState.selectedVectorIds !== undefined ||
      newState.vectorOrderMap !== undefined;

    Object.assign(this.state, newState);

    if (needsRender) {
      this.render();
    } else {
      this.updateTransform();
    }
  }

  // 公共API：设置回调
  public setCallbacks(callbacks: {
    onVectorClick?: (vectorId: string, isMultiSelect: boolean) => void;
    onVectorOrderChange?: (vectorId: string, order: number) => void;
  }) {
    this.onVectorClick = callbacks.onVectorClick;
    this.onVectorOrderChange = callbacks.onVectorOrderChange;
  }

  // 核心渲染函数 - 使用原生DOM操作
  private render() {
    const { vectors, selectedVectorIds, vectorOrderMap, zoom, panX, panY } = this.state;

    // 计算边界
    const bounds = this.calculateBounds(vectors);
    const scale = zoom / 100;

    // 清空并重建DOM
    this.canvasEl.innerHTML = '';

    // 创建内容容器
    const contentEl = document.createElement('div');
    contentEl.className = 'canvas-content';
    contentEl.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform-origin: center center;
      transform: translate(${panX}px, ${panY}px) scale(${scale});
      transition: none;
    `;

    // 渲染每个vector卡片
    vectors.forEach(vector => {
      const card = this.createVectorCard(vector, selectedVectorIds, vectorOrderMap, bounds);
      contentEl.appendChild(card);
    });

    this.canvasEl.appendChild(contentEl);
  }

  private createVectorCard(
    vector: Vector,
    selectedVectorIds: string[],
    vectorOrderMap: Record<string, number>,
    bounds: ReturnType<typeof this.calculateBounds>
  ): HTMLElement {
    const isSelected = selectedVectorIds.includes(vector.id);
    const order = vectorOrderMap[vector.id];
    const hasOrder = order !== undefined;

    const card = document.createElement('div');
    card.className = `vector-card ${isSelected ? 'selected' : ''}`;
    card.dataset.vectorId = vector.id;

    const x = vector.x - bounds.minX;
    const y = vector.y - bounds.minY;

    card.style.cssText = `
      position: absolute;
      left: ${x}px;
      top: ${y}px;
      width: ${vector.width}px;
      height: ${vector.height}px;
      border: ${isSelected ? '3px' : '1px'} solid ${isSelected ? '#06b6d4' : 'rgba(113, 113, 122, 0.5)'};
      border-radius: 4px;
      background: ${isSelected ? 'rgba(6, 182, 212, 0.05)' : 'transparent'};
      cursor: pointer;
      transition: all 0.15s ease;
      box-sizing: border-box;
    `;

    // 添加点击事件
    card.addEventListener('click', (e) => {
      e.stopPropagation();
      const isMulti = e.ctrlKey || e.metaKey || e.shiftKey;
      this.onVectorClick?.(vector.id, isMulti);
    });

    // 添加hover效果
    card.addEventListener('mouseenter', () => {
      if (!isSelected) {
        card.style.borderColor = 'rgba(113, 113, 122, 0.8)';
        card.style.background = 'rgba(113, 113, 122, 0.05)';
      }
    });
    card.addEventListener('mouseleave', () => {
      if (!isSelected) {
        card.style.borderColor = 'rgba(113, 113, 122, 0.5)';
        card.style.background = 'transparent';
      }
    });

    // 名称标签
    const label = document.createElement('div');
    label.className = 'vector-label';
    label.textContent = vector.name;
    label.style.cssText = `
      position: absolute;
      bottom: 2px;
      left: 2px;
      right: 2px;
      padding: 2px 4px;
      background: rgba(10, 10, 11, 0.8);
      color: ${isSelected ? '#06b6d4' : '#a1a1aa'};
      font-size: 9px;
      font-weight: 500;
      border-radius: 2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      pointer-events: none;
    `;
    card.appendChild(label);

    // 序号徽章（如果已分配）
    if (hasOrder) {
      const badge = document.createElement('div');
      badge.className = 'vector-order-badge';
      badge.textContent = String(order);
      badge.style.cssText = `
        position: absolute;
        top: 2px;
        right: 2px;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: transparent;
        border: 1px solid #06b6d4;
        color: #06b6d4;
        font-size: 8px;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0.9;
        z-index: 3;
      `;
      card.appendChild(badge);
    } else {
      // 幽灵徽章（hover时显示下一个可用序号）
      const ghostBadge = document.createElement('div');
      ghostBadge.className = 'vector-ghost-badge';
      ghostBadge.textContent = String(this.getNextAvailableNumber());
      ghostBadge.style.cssText = `
        position: absolute;
        top: 2px;
        right: 2px;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: transparent;
        border: 1px dashed #71717a;
        color: #71717a;
        font-size: 8px;
        font-weight: 600;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.2s;
        z-index: 3;
      `;

      card.addEventListener('mouseenter', () => {
        ghostBadge.style.opacity = '1';
      });
      card.addEventListener('mouseleave', () => {
        ghostBadge.style.opacity = '0';
      });

      card.appendChild(ghostBadge);
    }

    return card;
  }

  private getNextAvailableNumber(): number {
    const usedNumbers = Object.values(this.state.vectorOrderMap);
    let next = 1;
    while (usedNumbers.includes(next)) next++;
    return next;
  }

  private calculateBounds(vectors: Vector[]) {
    if (!vectors || vectors.length === 0) {
      return { minX: 0, minY: 0, maxX: 100, maxY: 100, width: 100, height: 100 };
    }

    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    vectors.forEach(v => {
      const x = v.x ?? v.bounds?.x ?? 0;
      const y = v.y ?? v.bounds?.y ?? 0;
      const width = v.width ?? v.bounds?.width ?? 100;
      const height = v.height ?? v.bounds?.height ?? 50;

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + width);
      maxY = Math.max(maxY, y + height);
    });

    return {
      minX, minY, maxX, maxY,
      width: Math.max(maxX - minX, 1),
      height: Math.max(maxY - minY, 1)
    };
  }

  // 清理资源
  public destroy() {
    this.canvasEl.removeEventListener('mousedown', this.handleMouseDown);
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup', this.handleMouseUp);
    this.canvasEl.removeEventListener('wheel', this.handleWheel);
    this.container.removeChild(this.canvasEl);
  }
}
