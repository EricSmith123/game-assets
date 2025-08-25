/**
 * 游戏性能监控系统
 */

import { Logger } from './logger';

/**
 * 性能指标接口
 */
export interface PerformanceMetrics {
  // 匹配检测性能
  matchDetection: {
    averageTime: number;
    totalCalls: number;
    maxTime: number;
    minTime: number;
  };
  
  // 内存使用
  memory: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
  
  // 对象创建统计
  objectCreation: {
    tilesCreated: number;
    tilesDestroyed: number;
    boardClones: number;
  };
  
  // 响应式更新
  reactiveUpdates: {
    gameboardUpdates: number;
    flatBoardCalculations: number;
    matchedTilesUpdates: number;
  };
  
  // 垃圾回收
  gc: {
    frequency: number;
    totalPauseTime: number;
    averagePauseTime: number;
  };
}

/**
 * 性能基准测试结果
 */
export interface BenchmarkResult {
  testName: string;
  iterations: number;
  totalTime: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  memoryBefore: number;
  memoryAfter: number;
  memoryDelta: number;
}

/**
 * 性能监控器类
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private logger: Logger;
  private metrics: PerformanceMetrics;
  private timers: Map<string, number> = new Map();
  private benchmarkResults: BenchmarkResult[] = [];

  private constructor() {
    this.logger = Logger.getInstance();
    this.metrics = this.initializeMetrics();
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * 初始化性能指标
   */
  private initializeMetrics(): PerformanceMetrics {
    return {
      matchDetection: {
        averageTime: 0,
        totalCalls: 0,
        maxTime: 0,
        minTime: Infinity
      },
      memory: {
        usedJSHeapSize: 0,
        totalJSHeapSize: 0,
        jsHeapSizeLimit: 0
      },
      objectCreation: {
        tilesCreated: 0,
        tilesDestroyed: 0,
        boardClones: 0
      },
      reactiveUpdates: {
        gameboardUpdates: 0,
        flatBoardCalculations: 0,
        matchedTilesUpdates: 0
      },
      gc: {
        frequency: 0,
        totalPauseTime: 0,
        averagePauseTime: 0
      }
    };
  }

  /**
   * 开始计时
   */
  startTimer(name: string): void {
    this.timers.set(name, performance.now());
  }

  /**
   * 结束计时并记录
   */
  endTimer(name: string): number {
    const startTime = this.timers.get(name);
    if (!startTime) {
      console.warn(`Timer ${name} not found`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.timers.delete(name);

    // 记录匹配检测性能
    if (name === 'matchDetection') {
      this.updateMatchDetectionMetrics(duration);
    }

    return duration;
  }

  /**
   * 更新匹配检测性能指标
   */
  private updateMatchDetectionMetrics(duration: number): void {
    const md = this.metrics.matchDetection;
    md.totalCalls++;
    md.maxTime = Math.max(md.maxTime, duration);
    md.minTime = Math.min(md.minTime, duration);
    md.averageTime = (md.averageTime * (md.totalCalls - 1) + duration) / md.totalCalls;
  }

  /**
   * 记录对象创建
   */
  recordObjectCreation(type: 'tile' | 'boardClone', count: number = 1): void {
    switch (type) {
      case 'tile':
        this.metrics.objectCreation.tilesCreated += count;
        break;
      case 'boardClone':
        this.metrics.objectCreation.boardClones += count;
        break;
    }
  }

  /**
   * 记录对象销毁
   */
  recordObjectDestruction(type: 'tile', count: number = 1): void {
    if (type === 'tile') {
      this.metrics.objectCreation.tilesDestroyed += count;
    }
  }

  /**
   * 记录响应式更新
   */
  recordReactiveUpdate(type: 'gameboard' | 'flatBoard' | 'matchedTiles'): void {
    switch (type) {
      case 'gameboard':
        this.metrics.reactiveUpdates.gameboardUpdates++;
        break;
      case 'flatBoard':
        this.metrics.reactiveUpdates.flatBoardCalculations++;
        break;
      case 'matchedTiles':
        this.metrics.reactiveUpdates.matchedTilesUpdates++;
        break;
    }
  }

  /**
   * 更新内存使用情况
   */
  updateMemoryUsage(): void {
    if ((performance as any).memory) {
      const memory = (performance as any).memory;
      this.metrics.memory = {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit
      };
    }
  }

  /**
   * 运行基准测试
   */
  async runBenchmark(
    testName: string,
    testFunction: () => void | Promise<void>,
    iterations: number = 1000
  ): Promise<BenchmarkResult> {
    console.log(`🧪 开始基准测试: ${testName} (${iterations} 次迭代)`);

    // 记录初始内存
    this.updateMemoryUsage();
    const memoryBefore = this.metrics.memory.usedJSHeapSize;

    const times: number[] = [];
    const startTime = performance.now();

    for (let i = 0; i < iterations; i++) {
      const iterationStart = performance.now();
      await testFunction();
      const iterationEnd = performance.now();
      times.push(iterationEnd - iterationStart);
    }

    const totalTime = performance.now() - startTime;

    // 记录结束内存
    this.updateMemoryUsage();
    const memoryAfter = this.metrics.memory.usedJSHeapSize;

    const result: BenchmarkResult = {
      testName,
      iterations,
      totalTime,
      averageTime: totalTime / iterations,
      minTime: Math.min(...times),
      maxTime: Math.max(...times),
      memoryBefore,
      memoryAfter,
      memoryDelta: memoryAfter - memoryBefore
    };

    this.benchmarkResults.push(result);
    this.logger.info(`基准测试完成: ${testName}`, result, 'PerformanceMonitor');

    return result;
  }

  /**
   * 获取当前性能指标
   */
  getMetrics(): PerformanceMetrics {
    this.updateMemoryUsage();
    return { ...this.metrics };
  }

  /**
   * 获取基准测试结果
   */
  getBenchmarkResults(): BenchmarkResult[] {
    return [...this.benchmarkResults];
  }

  /**
   * 生成性能报告
   */
  generateReport(): string {
    const metrics = this.getMetrics();
    const benchmarks = this.getBenchmarkResults();

    const report = {
      timestamp: new Date().toISOString(),
      metrics,
      benchmarks,
      summary: {
        totalObjectsCreated: metrics.objectCreation.tilesCreated,
        totalBoardClones: metrics.objectCreation.boardClones,
        memoryUsageMB: Math.round(metrics.memory.usedJSHeapSize / 1024 / 1024),
        averageMatchDetectionTime: metrics.matchDetection.averageTime,
        totalReactiveUpdates: 
          metrics.reactiveUpdates.gameboardUpdates + 
          metrics.reactiveUpdates.flatBoardCalculations + 
          metrics.reactiveUpdates.matchedTilesUpdates
      }
    };

    return JSON.stringify(report, null, 2);
  }

  /**
   * 重置性能指标
   */
  reset(): void {
    this.metrics = this.initializeMetrics();
    this.benchmarkResults = [];
    this.timers.clear();
    console.log('🔄 性能监控器已重置');
  }

  /**
   * 打印性能摘要
   */
  printSummary(): void {
    const metrics = this.getMetrics();
    
    console.group('📊 性能监控摘要');
    console.log('🔍 匹配检测:', {
      平均耗时: `${metrics.matchDetection.averageTime.toFixed(2)}ms`,
      总调用次数: metrics.matchDetection.totalCalls,
      最大耗时: `${metrics.matchDetection.maxTime.toFixed(2)}ms`
    });
    
    console.log('💾 内存使用:', {
      当前使用: `${Math.round(metrics.memory.usedJSHeapSize / 1024 / 1024)}MB`,
      总分配: `${Math.round(metrics.memory.totalJSHeapSize / 1024 / 1024)}MB`
    });
    
    console.log('🏗️ 对象创建:', {
      方块创建: metrics.objectCreation.tilesCreated,
      棋盘克隆: metrics.objectCreation.boardClones
    });
    
    console.log('🔄 响应式更新:', {
      棋盘更新: metrics.reactiveUpdates.gameboardUpdates,
      平铺计算: metrics.reactiveUpdates.flatBoardCalculations,
      匹配更新: metrics.reactiveUpdates.matchedTilesUpdates
    });
    
    console.groupEnd();
  }
}

/**
 * 全局性能监控实例
 */
export const performanceMonitor = PerformanceMonitor.getInstance();

// 在开发环境中挂载到全局
if (import.meta.env.DEV) {
  (window as any).performanceMonitor = performanceMonitor;
  console.log('📊 性能监控器已挂载到 window.performanceMonitor');
}
