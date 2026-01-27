/**
 * 🚀 Performance Monitor - 性能监控工具
 * 用于开发和测试期间跟踪关键性能指标
 */

interface PerformanceMetric {
    name: string;
    startTime: number;
    endTime?: number;
    duration?: number;
}

class PerformanceMonitor {
    private metrics: Map<string, PerformanceMetric> = new Map();
    private enabled: boolean = process.env.NODE_ENV === 'development';

    /**
     * 开始测量性能
     */
    start(metricName: string) {
        if (!this.enabled) return;

        this.metrics.set(metricName, {
            name: metricName,
            startTime: performance.now(),
        });
    }

    /**
     * 结束测量并记录结果
     */
    end(metricName: string) {
        if (!this.enabled) return;

        const metric = this.metrics.get(metricName);
        if (!metric) {
            console.warn(`⚠️ Performance metric "${metricName}" not found`);
            return;
        }

        const endTime = performance.now();
        const duration = endTime - metric.startTime;

        metric.endTime = endTime;
        metric.duration = duration;

        console.log(`⏱️ ${metricName}: ${duration.toFixed(2)}ms`);

        return duration;
    }

    /**
     * 测量异步函数的性能
     */
    async measure<T>(metricName: string, fn: () => Promise<T>): Promise<T> {
        if (!this.enabled) return fn();

        this.start(metricName);
        try {
            const result = await fn();
            this.end(metricName);
            return result;
        } catch (error) {
            this.end(metricName);
            throw error;
        }
    }

    /**
     * 测量同步函数的性能
     */
    measureSync<T>(metricName: string, fn: () => T): T {
        if (!this.enabled) return fn();

        this.start(metricName);
        try {
            const result = fn();
            this.end(metricName);
            return result;
        } catch (error) {
            this.end(metricName);
            throw error;
        }
    }

    /**
     * 获取所有指标
     */
    getMetrics(): PerformanceMetric[] {
        return Array.from(this.metrics.values());
    }

    /**
     * 清除所有指标
     */
    clear() {
        this.metrics.clear();
    }

    /**
     * 打印性能摘要
     */
    printSummary() {
        if (!this.enabled) return;

        const metrics = this.getMetrics().filter(m => m.duration !== undefined);
        if (metrics.length === 0) {
            console.log('📊 No performance metrics recorded');
            return;
        }

        console.group('📊 Performance Summary');
        metrics.forEach(metric => {
            console.log(`  ${metric.name}: ${metric.duration!.toFixed(2)}ms`);
        });
        console.groupEnd();
    }

    /**
     * 监控组件渲染性能
     */
    monitorRender(componentName: string) {
        if (!this.enabled) return () => { };

        const metricName = `Render: ${componentName}`;
        this.start(metricName);

        return () => {
            this.end(metricName);
        };
    }

    /**
     * 监控内存使用
     */
    logMemoryUsage(label: string = 'Memory') {
        if (!this.enabled) return;

        if ('memory' in performance) {
            const memory = (performance as any).memory;
            console.log(`💾 ${label}:`, {
                usedJSHeapSize: `${(memory.usedJSHeapSize / 1048576).toFixed(2)} MB`,
                totalJSHeapSize: `${(memory.totalJSHeapSize / 1048576).toFixed(2)} MB`,
                jsHeapSizeLimit: `${(memory.jsHeapSizeLimit / 1048576).toFixed(2)} MB`,
            });
        }
    }

    /**
     * 启用/禁用监控
     */
    setEnabled(enabled: boolean) {
        this.enabled = enabled;
    }
}

// 单例实例
export const performanceMonitor = new PerformanceMonitor();

// 导出类型
export type { PerformanceMetric };
