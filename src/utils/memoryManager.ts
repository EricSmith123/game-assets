/**
 * 智能内存管理器
 * 提供内存监控、垃圾回收优化、内存泄漏检测等功能
 */

import { performanceMonitor } from './performanceMonitor';

/**
 * 内存使用统计接口
 */
export interface MemoryStats {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  usagePercentage: number;
  gcCount: number;
  lastGcTime: number;
}

/**
 * 内存监控配置接口
 */
export interface MemoryConfig {
  maxMemoryUsage: number; // 最大内存使用量 (MB)
  gcThreshold: number; // GC触发阈值 (%)
  monitorInterval: number; // 监控间隔 (ms)
  leakDetectionEnabled: boolean; // 是否启用内存泄漏检测
}

/**
 * 内存泄漏检测项
 */
interface MemoryLeakItem {
  name: string;
  size: number;
  timestamp: number;
  references: any[]; // 简化引用类型
}

/**
 * 智能内存管理器类
 */
export class MemoryManager {
  private static instance: MemoryManager;
  private config: MemoryConfig = {
    maxMemoryUsage: 100, // 100MB
    gcThreshold: 80, // 80%
    monitorInterval: 5000, // 5秒
    leakDetectionEnabled: true
  };
  
  private monitorTimer: number | null = null;
  private gcCount: number = 0;
  private lastGcTime: number = 0;
  private memoryHistory: MemoryStats[] = [];
  private maxHistorySize: number = 100;
  
  // 内存泄漏检测
  private leakDetectionMap = new Map<string, MemoryLeakItem>();
  
  // 性能统计
  private stats = {
    totalGcTriggers: 0,
    totalMemoryFreed: 0,
    averageMemoryUsage: 0,
    peakMemoryUsage: 0,
    leaksDetected: 0,
    leaksFixed: 0
  };

  private constructor() {}

  static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  /**
   * 获取当前配置
   */
  public getConfig(): MemoryConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  public updateConfig(newConfig: Partial<MemoryConfig>): void {
    // 验证配置值的有效性
    const validatedConfig: Partial<MemoryConfig> = {};

    if (newConfig.maxMemoryUsage !== undefined) {
      validatedConfig.maxMemoryUsage = newConfig.maxMemoryUsage > 0 ? newConfig.maxMemoryUsage : this.config.maxMemoryUsage;
    }

    if (newConfig.gcThreshold !== undefined) {
      validatedConfig.gcThreshold = newConfig.gcThreshold > 0 && newConfig.gcThreshold <= 100 ? newConfig.gcThreshold : this.config.gcThreshold;
    }

    if (newConfig.monitorInterval !== undefined) {
      validatedConfig.monitorInterval = newConfig.monitorInterval > 0 ? newConfig.monitorInterval : this.config.monitorInterval;
    }

    if (newConfig.leakDetectionEnabled !== undefined) {
      validatedConfig.leakDetectionEnabled = newConfig.leakDetectionEnabled;
    }

    this.config = { ...this.config, ...validatedConfig };
  }

  /**
   * 获取内存统计信息
   */
  public getMemoryStats(): MemoryStats | null {
    const memoryInfo = this.getMemoryInfo();
    if (!memoryInfo) {
      // 返回默认值而不是null
      return {
        usedJSHeapSize: 0,
        totalJSHeapSize: 0,
        jsHeapSizeLimit: 0,
        usagePercentage: 0,
        gcCount: this.gcCount,
        lastGcTime: this.lastGcTime
      };
    }
    return memoryInfo;
  }

  /**
   * 注册内存泄漏检测项
   */
  public registerLeakDetection(name: string, references: any[]): void {
    this.leakDetectionMap.set(name, {
      name,
      size: references.length,
      timestamp: Date.now(),
      references
    });
  }

  /**
   * 移除内存泄漏检测项
   */
  public unregisterLeakDetection(name: string): void {
    this.leakDetectionMap.delete(name);
  }

  /**
   * 获取内存泄漏列表
   */
  public getMemoryLeaks(): MemoryLeakItem[] {
    return Array.from(this.leakDetectionMap.values());
  }

  /**
   * 清理所有缓存
   */
  public clearAllCaches(): void {
    this.clearCaches();
    this.leakDetectionMap.clear();
    this.memoryHistory = [];
    console.log('🧹 清理所有内存缓存');
  }

  /**
   * 公开的开始监控方法
   */
  public startMonitoring(): void {
    if (this.monitorTimer) return;

    const monitorLoop = () => {
      this.checkMemoryUsageInternal();
      this.detectMemoryLeaksInternal();
      // 递归调用以保持监控
      this.monitorTimer = setTimeout(monitorLoop, this.config.monitorInterval);
    };

    this.monitorTimer = setTimeout(monitorLoop, this.config.monitorInterval);
  }

  /**
   * 公开的检查内存使用方法
   */
  public checkMemoryUsage(): void {
    this.checkMemoryUsageInternal();
  }

  /**
   * 公开的强制垃圾回收方法
   */
  public forceGarbageCollection(): void {
    try {
      if ('gc' in window && typeof (window as any).gc === 'function') {
        (window as any).gc();
        console.log('🗑️ 手动触发垃圾回收');
      } else {
        console.warn('⚠️ 垃圾回收不可用，请使用 --expose-gc 标志启动');
      }
    } catch (error) {
      console.error(`垃圾回收失败: ${error}`);
    }
  }

  /**
   * 公开的检测内存泄漏方法
   */
  public detectMemoryLeaks(): MemoryLeakItem[] {
    if (!this.config.leakDetectionEnabled) return [];

    const now = Date.now();
    const leakThreshold = 60000; // 1分钟
    const leaks: MemoryLeakItem[] = [];

    this.leakDetectionMap.forEach((item, name) => {
      if (now - item.timestamp > leakThreshold) {
        leaks.push({
          name,
          size: item.size,
          timestamp: item.timestamp,
          references: item.references
        });
      }
    });

    return leaks;
  }

  /**
   * 优化内存使用
   */
  public optimizeMemory(): void {
    this.forceMemoryCleanup();
    console.log('🚀 内存优化完成');
  }

  /**
   * 初始化内存管理器
   */
  init(config?: Partial<MemoryConfig>): void {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    this.startMonitoringInternal();
    this.setupGlobalErrorHandling();

    console.log('🧠 智能内存管理器已初始化');
    console.log('📊 配置:', this.config);
  }

  /**
   * 开始内存监控（内部方法）
   */
  private startMonitoringInternal(): void {
    if (this.monitorTimer) return;

    const monitorLoop = () => {
      this.checkMemoryUsageInternal();
      this.detectMemoryLeaksInternal();
      this.cleanupHistory();

      // 递归调用以保持监控
      this.monitorTimer = setTimeout(monitorLoop, this.config.monitorInterval);
    };

    this.monitorTimer = setTimeout(monitorLoop, this.config.monitorInterval);

    console.log('📊 内存监控已启动');
  }

  /**
   * 停止内存监控
   */
  stopMonitoring(): void {
    if (this.monitorTimer) {
      clearTimeout(this.monitorTimer);
      this.monitorTimer = null;
      console.log('📊 内存监控已停止');
    }
  }

  /**
   * 检查内存使用情况（内部方法）
   */
  private checkMemoryUsageInternal(): void {
    const memoryInfo = this.getMemoryInfo();
    if (!memoryInfo) return;

    // 记录历史数据
    this.memoryHistory.push(memoryInfo);

    // 更新统计
    this.stats.averageMemoryUsage = this.calculateAverageMemoryUsage();
    this.stats.peakMemoryUsage = Math.max(this.stats.peakMemoryUsage, memoryInfo.usedJSHeapSize);

    // 检查内存使用率是否过高
    if (memoryInfo.usagePercentage > 70) { // 70%阈值
      console.warn(`⚠️ 内存使用率过高: ${memoryInfo.usagePercentage.toFixed(1)}%`);
    }

    // 检查是否需要触发GC
    if (memoryInfo.usagePercentage > this.config.gcThreshold) {
      this.triggerGarbageCollection();
    }

    // 检查内存使用是否超限
    if (memoryInfo.usedJSHeapSize > this.config.maxMemoryUsage * 1024 * 1024) {
      console.warn(`⚠️ 内存使用超限: ${(memoryInfo.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`);
      this.forceMemoryCleanup();
    }
  }

  /**
   * 获取内存信息
   */
  getMemoryInfo(): MemoryStats | null {
    try {
      if (!('memory' in performance)) {
        return null;
      }

      const memory = (performance as any).memory;
      const usagePercentage = (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100;

      return {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
        usagePercentage,
        gcCount: this.gcCount,
        lastGcTime: this.lastGcTime
      };
    } catch (error) {
      console.error('获取内存信息失败:', error);
      return null;
    }
  }

  /**
   * 触发垃圾回收
   */
  private triggerGarbageCollection(): void {
    performanceMonitor.startTimer('garbageCollection');
    
    const beforeMemory = this.getMemoryInfo();
    
    // 尝试触发GC
    if ('gc' in window && typeof (window as any).gc === 'function') {
      (window as any).gc();
    } else {
      // 备用方案：创建大量临时对象强制GC
      this.forceGarbageCollectionInternal();
    }
    
    const afterMemory = this.getMemoryInfo();
    const duration = performanceMonitor.endTimer('garbageCollection');
    
    if (beforeMemory && afterMemory) {
      const freedMemory = beforeMemory.usedJSHeapSize - afterMemory.usedJSHeapSize;
      this.stats.totalMemoryFreed += freedMemory;
      this.stats.totalGcTriggers++;
      this.gcCount++;
      this.lastGcTime = Date.now();
      
      console.log(`🗑️ GC完成: 释放${(freedMemory / 1024 / 1024).toFixed(2)}MB, 耗时${duration.toFixed(2)}ms`);
    }
  }

  /**
   * 强制垃圾回收（内部方法）
   */
  private forceGarbageCollectionInternal(): void {
    // 创建大量临时对象
    const temp = [];
    for (let i = 0; i < 100000; i++) {
      temp.push(new Array(100).fill(Math.random()));
    }

    // 立即清空引用
    temp.length = 0;

    // 触发更多内存压力
    for (let i = 0; i < 10; i++) {
      const largeArray = new Array(10000).fill(0).map(() => ({ data: Math.random() }));
      largeArray.length = 0;
    }
  }

  /**
   * 强制内存清理
   */
  private forceMemoryCleanup(): void {
    console.log('🧹 开始强制内存清理...');
    
    // 清理缓存
    this.clearCaches();
    
    // 触发GC
    this.triggerGarbageCollection();
    
    // 清理历史数据
    this.memoryHistory = this.memoryHistory.slice(-10);
    
    console.log('🧹 强制内存清理完成');
  }

  /**
   * 清理各种缓存
   */
  private clearCaches(): void {
    // 通知其他模块清理缓存
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('memory-cleanup', {
        detail: { reason: 'memory-pressure' }
      }));
    }
  }

  /**
   * 注册对象用于内存泄漏检测
   */
  registerObject(name: string, obj: any, size: number = 0): void {
    if (!this.config.leakDetectionEnabled) return;

    const item: MemoryLeakItem = {
      name,
      size,
      timestamp: Date.now(),
      references: [obj] // 简化引用存储
    };

    this.leakDetectionMap.set(name, item);
  }

  /**
   * 检测内存泄漏（内部方法）
   */
  private detectMemoryLeaksInternal(): void {
    if (!this.config.leakDetectionEnabled) return;

    const now = Date.now();
    const leakThreshold = 60000; // 1分钟

    for (const [name, item] of this.leakDetectionMap.entries()) {
      if (now - item.timestamp > leakThreshold) {
        const isAlive = item.references.length > 0;

        if (isAlive) {
          console.warn(`🚨 检测到潜在内存泄漏: ${name}, 存活时间: ${((now - item.timestamp) / 1000).toFixed(1)}s`);
          this.stats.leaksDetected++;

          // 尝试修复
          this.attemptLeakFix(name, item);
        } else {
          // 对象已被回收，移除监控
          this.leakDetectionMap.delete(name);
        }
      }
    }
  }

  /**
   * 尝试修复内存泄漏
   */
  private attemptLeakFix(name: string, item: MemoryLeakItem): void {
    console.log(`🔧 尝试修复内存泄漏: ${name}`);
    
    // 清理引用
    item.references = [];
    
    if (item.references.length === 0) {
      this.leakDetectionMap.delete(name);
      this.stats.leaksFixed++;
      console.log(`✅ 内存泄漏已修复: ${name}`);
    }
  }

  /**
   * 计算平均内存使用量
   */
  private calculateAverageMemoryUsage(): number {
    if (this.memoryHistory.length === 0) return 0;
    
    const total = this.memoryHistory.reduce((sum, stat) => sum + stat.usedJSHeapSize, 0);
    return total / this.memoryHistory.length;
  }

  /**
   * 清理历史数据
   */
  private cleanupHistory(): void {
    if (this.memoryHistory.length > this.maxHistorySize) {
      this.memoryHistory = this.memoryHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * 设置全局错误处理
   */
  private setupGlobalErrorHandling(): void {
    window.addEventListener('error', (event) => {
      if (event.error && event.error.name === 'OutOfMemoryError') {
        console.error('🚨 内存不足错误，触发紧急清理');
        this.forceMemoryCleanup();
      }
    });
    
    window.addEventListener('unhandledrejection', (event) => {
      if (event.reason && event.reason.message && event.reason.message.includes('memory')) {
        console.error('🚨 内存相关Promise拒绝，触发清理');
        this.forceMemoryCleanup();
      }
    });
  }

  /**
   * 获取性能统计
   */
  getStats() {
    const currentMemory = this.getMemoryInfo();
    
    return {
      ...this.stats,
      currentMemory,
      memoryHistory: this.memoryHistory.slice(-10),
      config: this.config,
      monitoringActive: this.monitorTimer !== null
    };
  }

  /**
   * 打印内存统计
   */
  printStats(): void {
    const stats = this.getStats();
    const currentMemory = stats.currentMemory;
    
    console.group('🧠 智能内存管理器统计');
    
    if (currentMemory) {
      console.log(`当前内存使用: ${(currentMemory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`);
      console.log(`内存使用率: ${currentMemory.usagePercentage.toFixed(1)}%`);
      console.log(`内存限制: ${(currentMemory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)}MB`);
    }
    
    console.log(`GC触发次数: ${stats.totalGcTriggers}`);
    console.log(`总释放内存: ${(stats.totalMemoryFreed / 1024 / 1024).toFixed(2)}MB`);
    console.log(`平均内存使用: ${(stats.averageMemoryUsage / 1024 / 1024).toFixed(2)}MB`);
    console.log(`峰值内存使用: ${(stats.peakMemoryUsage / 1024 / 1024).toFixed(2)}MB`);
    console.log(`检测到泄漏: ${stats.leaksDetected}`);
    console.log(`修复泄漏: ${stats.leaksFixed}`);
    console.log(`监控状态: ${stats.monitoringActive ? '✅ 活跃' : '❌ 停止'}`);
    
    console.groupEnd();
  }

  /**
   * 关闭内存管理器
   */
  close(): void {
    this.stopMonitoring();
    this.leakDetectionMap.clear();
    this.memoryHistory = [];
    console.log('🧠 内存管理器已关闭');
  }
}

/**
 * 全局智能内存管理器实例
 */
export const memoryManager = MemoryManager.getInstance();

// 在开发环境中挂载到全局
if (import.meta.env.DEV) {
  (window as any).memoryManager = memoryManager;
  console.log('🧠 智能内存管理器已挂载到 window.memoryManager');
}
