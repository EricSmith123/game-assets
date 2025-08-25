/**
 * 懒加载调试工具加载器
 * 按需加载调试工具，减少初始内存占用
 */

import { environmentGuard } from './environmentGuard';
import { Logger } from './logger';

// 调试工具类型
export enum DebugToolType {
  DEBUG_HELPER = 'debugHelper',
  TEST_SUITE = 'testSuite',
  BENCHMARK_SUITE = 'benchmarkSuite',
  PERFORMANCE_COMPARISON = 'performanceComparison',
  DEV_EFFICIENCY_TOOLS = 'devEfficiencyTools',
  SIMPLIFIED_DEBUG_HELPER = 'simplifiedDebugHelper'
}

// 工具加载状态
export enum LoadStatus {
  NOT_LOADED = 'not_loaded',
  LOADING = 'loading',
  LOADED = 'loaded',
  ERROR = 'error'
}

// 工具描述
interface ToolDescriptor {
  name: string;
  description: string;
  memoryEstimate: number; // KB
  loadPriority: number; // 1-5, 5最高
  dependencies: DebugToolType[];
  loader: () => Promise<any>;
}

export class LazyDebugLoader {
  private static instance: LazyDebugLoader;
  private logger: Logger;
  private toolDescriptors = new Map<DebugToolType, ToolDescriptor>();
  private loadedTools = new Map<DebugToolType, any>();
  private loadStatus = new Map<DebugToolType, LoadStatus>();
  private loadPromises = new Map<DebugToolType, Promise<any>>();
  private memoryUsage = 0;
  private maxMemoryLimit = 50 * 1024; // 50MB

  private constructor() {
    this.logger = Logger.getInstance();
    this.initializeToolDescriptors();
    this.setupMemoryMonitoring();

    environmentGuard.runInDevelopment(() => {
      this.logger.debug('懒加载调试工具加载器已初始化', {
        toolCount: this.toolDescriptors.size,
        memoryLimit: `${this.maxMemoryLimit / 1024}MB`
      }, 'LazyDebugLoader');
    });
  }

  static getInstance(): LazyDebugLoader {
    if (!LazyDebugLoader.instance) {
      LazyDebugLoader.instance = new LazyDebugLoader();
    }
    return LazyDebugLoader.instance;
  }

  /**
   * 初始化工具描述符
   */
  private initializeToolDescriptors(): void {
    this.toolDescriptors.set(DebugToolType.SIMPLIFIED_DEBUG_HELPER, {
      name: '简化调试助手',
      description: '轻量级调试工具，提供基础诊断功能',
      memoryEstimate: 500, // 500KB
      loadPriority: 5,
      dependencies: [],
      loader: async () => {
        const module = await import('./simplifiedDebugHelper');
        return module.simplifiedDebugHelper;
      }
    });

    this.toolDescriptors.set(DebugToolType.DEV_EFFICIENCY_TOOLS, {
      name: '开发效率工具',
      description: '开发工具栏和快捷操作',
      memoryEstimate: 800, // 800KB
      loadPriority: 4,
      dependencies: [DebugToolType.SIMPLIFIED_DEBUG_HELPER],
      loader: async () => {
        const module = await import('./devEfficiencyTools');
        return module.devEfficiencyTools;
      }
    });

    this.toolDescriptors.set(DebugToolType.DEBUG_HELPER, {
      name: '完整调试助手',
      description: '完整的调试和诊断工具',
      memoryEstimate: 2000, // 2MB
      loadPriority: 3,
      dependencies: [],
      loader: async () => {
        const module = await import('./debugHelper');
        return module.debugHelper;
      }
    });

    this.toolDescriptors.set(DebugToolType.TEST_SUITE, {
      name: '测试套件',
      description: '自动化测试工具',
      memoryEstimate: 3000, // 3MB
      loadPriority: 2,
      dependencies: [DebugToolType.DEBUG_HELPER],
      loader: async () => {
        const module = await import('./testSuite');
        return module.testSuite;
      }
    });

    this.toolDescriptors.set(DebugToolType.BENCHMARK_SUITE, {
      name: '基准测试套件',
      description: '性能基准测试工具',
      memoryEstimate: 4000, // 4MB
      loadPriority: 2,
      dependencies: [],
      loader: async () => {
        const module = await import('./benchmarkSuite');
        return module.benchmarkSuite;
      }
    });

    this.toolDescriptors.set(DebugToolType.PERFORMANCE_COMPARISON, {
      name: '性能对比工具',
      description: '性能对比和分析工具',
      memoryEstimate: 2500, // 2.5MB
      loadPriority: 1,
      dependencies: [DebugToolType.BENCHMARK_SUITE],
      loader: async () => {
        const module = await import('./performanceComparison');
        return module.performanceComparison;
      }
    });

    // 初始化所有工具状态为未加载
    for (const toolType of this.toolDescriptors.keys()) {
      this.loadStatus.set(toolType, LoadStatus.NOT_LOADED);
    }
  }

  /**
   * 设置内存监控
   */
  private setupMemoryMonitoring(): void {
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory;
        const currentUsage = memory.usedJSHeapSize / 1024; // KB
        
        // 如果内存使用超过限制，卸载低优先级工具
        if (currentUsage > this.maxMemoryLimit) {
          this.unloadLowPriorityTools();
        }
      }, 30000); // 每30秒检查一次
    }
  }

  /**
   * 按需加载工具
   */
  async loadTool(toolType: DebugToolType): Promise<any> {
    // 生产环境不加载调试工具
    if (!environmentGuard.isDevelopment()) {
      this.logger.warn('生产环境不允许加载调试工具', { toolType }, 'LazyDebugLoader');
      return null;
    }

    // 如果已经加载，直接返回
    if (this.loadedTools.has(toolType)) {
      return this.loadedTools.get(toolType);
    }

    // 如果正在加载，返回现有的Promise
    if (this.loadPromises.has(toolType)) {
      return this.loadPromises.get(toolType);
    }

    const descriptor = this.toolDescriptors.get(toolType);
    if (!descriptor) {
      this.logger.warn(`未知的调试工具类型: ${toolType}`);
      return null;
    }

    // 检查内存限制
    if (this.memoryUsage + descriptor.memoryEstimate > this.maxMemoryLimit) {
      this.logger.warn('内存使用接近限制，尝试清理低优先级工具', {
        current: this.memoryUsage,
        required: descriptor.memoryEstimate,
        limit: this.maxMemoryLimit
      }, 'LazyDebugLoader');
      
      await this.unloadLowPriorityTools();
      
      // 再次检查
      if (this.memoryUsage + descriptor.memoryEstimate > this.maxMemoryLimit) {
        throw new Error(`内存不足，无法加载 ${descriptor.name}`);
      }
    }

    // 开始加载
    this.loadStatus.set(toolType, LoadStatus.LOADING);
    
    const loadPromise = this.performLoad(toolType, descriptor);
    this.loadPromises.set(toolType, loadPromise);

    try {
      const tool = await loadPromise;
      this.loadedTools.set(toolType, tool);
      this.loadStatus.set(toolType, LoadStatus.LOADED);
      this.memoryUsage += descriptor.memoryEstimate;
      
      this.logger.info(`调试工具已加载: ${descriptor.name}`, {
        memoryUsage: `${this.memoryUsage}KB`,
        memoryLimit: `${this.maxMemoryLimit}KB`
      }, 'LazyDebugLoader');

      return tool;
    } catch (error) {
      this.loadStatus.set(toolType, LoadStatus.ERROR);
      this.loadPromises.delete(toolType);
      
      this.logger.error(`调试工具加载失败: ${descriptor.name}`, error, 'LazyDebugLoader');
      throw error;
    }
  }

  /**
   * 执行加载
   */
  private async performLoad(toolType: DebugToolType, descriptor: ToolDescriptor): Promise<any> {
    // 先加载依赖
    for (const dependency of descriptor.dependencies) {
      await this.loadTool(dependency);
    }

    // 加载工具本身
    const startTime = performance.now();
    const tool = await descriptor.loader();
    const loadTime = performance.now() - startTime;

    this.logger.debug(`工具加载完成: ${descriptor.name}`, {
      loadTime: `${loadTime.toFixed(2)}ms`,
      estimatedMemory: `${descriptor.memoryEstimate}KB`
    }, 'LazyDebugLoader');

    return tool;
  }

  /**
   * 卸载工具
   */
  unloadTool(toolType: DebugToolType): void {
    const tool = this.loadedTools.get(toolType);
    const descriptor = this.toolDescriptors.get(toolType);

    if (tool && descriptor) {
      // 如果工具有销毁方法，调用它
      if (typeof tool.destroy === 'function') {
        try {
          tool.destroy();
        } catch (error) {
          this.logger.warn(`工具销毁失败: ${descriptor.name}`, error, 'LazyDebugLoader');
        }
      }

      this.loadedTools.delete(toolType);
      this.loadStatus.set(toolType, LoadStatus.NOT_LOADED);
      this.loadPromises.delete(toolType);
      this.memoryUsage -= descriptor.memoryEstimate;

      this.logger.info(`调试工具已卸载: ${descriptor.name}`, {
        memoryUsage: `${this.memoryUsage}KB`
      }, 'LazyDebugLoader');
    }
  }

  /**
   * 卸载低优先级工具
   */
  private async unloadLowPriorityTools(): Promise<void> {
    const loadedTools = Array.from(this.loadedTools.keys());
    
    // 按优先级排序，优先卸载低优先级工具
    loadedTools.sort((a, b) => {
      const priorityA = this.toolDescriptors.get(a)?.loadPriority || 0;
      const priorityB = this.toolDescriptors.get(b)?.loadPriority || 0;
      return priorityA - priorityB;
    });

    // 卸载优先级最低的工具
    for (const toolType of loadedTools) {
      const descriptor = this.toolDescriptors.get(toolType);
      if (descriptor && descriptor.loadPriority <= 2) {
        this.unloadTool(toolType);
        break; // 一次只卸载一个
      }
    }
  }

  /**
   * 预加载高优先级工具
   */
  async preloadHighPriorityTools(): Promise<void> {
    if (!environmentGuard.isDevelopment()) {
      return;
    }

    const highPriorityTools = Array.from(this.toolDescriptors.entries())
      .filter(([_, descriptor]) => descriptor.loadPriority >= 4)
      .sort(([_, a], [__, b]) => b.loadPriority - a.loadPriority);

    for (const [toolType, descriptor] of highPriorityTools) {
      try {
        await this.loadTool(toolType);
        
        // 如果是开发效率工具，自动初始化
        if (toolType === DebugToolType.DEV_EFFICIENCY_TOOLS) {
          const tool = this.loadedTools.get(toolType);
          if (tool && typeof tool.initialize === 'function') {
            tool.initialize();
          }
        }
      } catch (error) {
        this.logger.warn(`高优先级工具预加载失败: ${descriptor.name}`, error, 'LazyDebugLoader');
      }
    }
  }

  /**
   * 获取工具状态
   */
  getToolStatus(toolType: DebugToolType): LoadStatus {
    return this.loadStatus.get(toolType) || LoadStatus.NOT_LOADED;
  }

  /**
   * 获取已加载的工具
   */
  getLoadedTool(toolType: DebugToolType): any {
    return this.loadedTools.get(toolType);
  }

  /**
   * 获取所有工具信息
   */
  getAllToolsInfo(): Array<{
    type: DebugToolType;
    name: string;
    description: string;
    status: LoadStatus;
    memoryEstimate: number;
    priority: number;
  }> {
    return Array.from(this.toolDescriptors.entries()).map(([type, descriptor]) => ({
      type,
      name: descriptor.name,
      description: descriptor.description,
      status: this.getToolStatus(type),
      memoryEstimate: descriptor.memoryEstimate,
      priority: descriptor.loadPriority
    }));
  }

  /**
   * 获取内存使用统计
   */
  getMemoryStats(): {
    currentUsage: number;
    maxLimit: number;
    usagePercentage: number;
    loadedToolsCount: number;
  } {
    return {
      currentUsage: this.memoryUsage,
      maxLimit: this.maxMemoryLimit,
      usagePercentage: (this.memoryUsage / this.maxMemoryLimit) * 100,
      loadedToolsCount: this.loadedTools.size
    };
  }

  /**
   * 设置内存限制
   */
  setMemoryLimit(limitKB: number): void {
    this.maxMemoryLimit = limitKB;
    this.logger.info(`内存限制已更新: ${limitKB}KB`, undefined, 'LazyDebugLoader');
  }

  /**
   * 清理所有工具
   */
  cleanup(): void {
    const loadedToolTypes = Array.from(this.loadedTools.keys());
    
    for (const toolType of loadedToolTypes) {
      this.unloadTool(toolType);
    }

    this.logger.info('所有调试工具已清理', {
      unloadedCount: loadedToolTypes.length
    }, 'LazyDebugLoader');
  }

  /**
   * 强制垃圾回收（如果支持）
   */
  forceGarbageCollection(): void {
    if ((window as any).gc) {
      (window as any).gc();
      this.logger.debug('强制垃圾回收已执行', undefined, 'LazyDebugLoader');
    } else {
      this.logger.debug('浏览器不支持强制垃圾回收', undefined, 'LazyDebugLoader');
    }
  }
}

// 创建全局实例
export const lazyDebugLoader = LazyDebugLoader.getInstance();

// 在开发环境中挂载到全局
environmentGuard.runInDevelopment(() => {
  (window as any).lazyDebugLoader = lazyDebugLoader;
  
  // 添加便捷方法
  (window as any).loadDebugTool = (toolType: string) => lazyDebugLoader.loadTool(toolType as DebugToolType);
  (window as any).debugToolsInfo = () => lazyDebugLoader.getAllToolsInfo();
  (window as any).debugMemoryStats = () => lazyDebugLoader.getMemoryStats();
  
  console.log('💾 懒加载调试工具加载器已挂载到 window.lazyDebugLoader');
  console.log('💡 快捷命令: loadDebugTool(type), debugToolsInfo(), debugMemoryStats()');
});
