/**
 * 服务导入策略管理器
 * 统一管理动态导入和静态导入，避免Vite构建警告
 */

import { environmentGuard } from './environmentGuard';
import { Logger } from './logger';

// 导入策略类型
export enum ImportStrategy {
  STATIC = 'static',
  DYNAMIC = 'dynamic',
  HYBRID = 'hybrid'
}

// 服务导入配置
interface ServiceImportConfig {
  strategy: ImportStrategy;
  priority: number;
  dependencies: string[];
  chunkName?: string;
}

export class ServiceImportStrategy {
  private static instance: ServiceImportStrategy;
  private logger: Logger;
  private importConfigs = new Map<string, ServiceImportConfig>();
  private staticImports = new Map<string, any>();
  private dynamicImports = new Map<string, Promise<any>>();

  private constructor() {
    this.logger = Logger.getInstance();
    this.initializeImportConfigs();
    this.preloadStaticImports();

    environmentGuard.runInDevelopment(() => {
      this.logger.debug('服务导入策略管理器已初始化', {
        configCount: this.importConfigs.size
      }, 'ServiceImportStrategy');
    });
  }

  static getInstance(): ServiceImportStrategy {
    if (!ServiceImportStrategy.instance) {
      ServiceImportStrategy.instance = new ServiceImportStrategy();
    }
    return ServiceImportStrategy.instance;
  }

  /**
   * 初始化导入配置
   */
  private initializeImportConfigs(): void {
    // 核心服务 - 静态导入
    this.importConfigs.set('logger', {
      strategy: ImportStrategy.STATIC,
      priority: 10,
      dependencies: []
    });

    this.importConfigs.set('environmentGuard', {
      strategy: ImportStrategy.STATIC,
      priority: 10,
      dependencies: []
    });

    this.importConfigs.set('configManager', {
      strategy: ImportStrategy.STATIC,
      priority: 9,
      dependencies: ['logger']
    });

    // 性能相关服务 - 混合导入
    this.importConfigs.set('performanceMonitor', {
      strategy: ImportStrategy.HYBRID,
      priority: 8,
      dependencies: ['logger'],
      chunkName: 'performance'
    });

    this.importConfigs.set('renderOptimizer', {
      strategy: ImportStrategy.HYBRID,
      priority: 7,
      dependencies: ['performanceMonitor'],
      chunkName: 'performance'
    });

    this.importConfigs.set('animationOptimizer', {
      strategy: ImportStrategy.HYBRID,
      priority: 7,
      dependencies: ['performanceMonitor'],
      chunkName: 'performance'
    });

    // UI相关服务 - 混合导入
    this.importConfigs.set('interactionAnimator', {
      strategy: ImportStrategy.HYBRID,
      priority: 6,
      dependencies: ['performanceMonitor'],
      chunkName: 'ui'
    });

    this.importConfigs.set('responsiveManager', {
      strategy: ImportStrategy.HYBRID,
      priority: 6,
      dependencies: [],
      chunkName: 'ui'
    });

    this.importConfigs.set('accessibilityManager', {
      strategy: ImportStrategy.HYBRID,
      priority: 5,
      dependencies: [],
      chunkName: 'ui'
    });

    // 开发工具 - 动态导入
    this.importConfigs.set('debugHelper', {
      strategy: ImportStrategy.DYNAMIC,
      priority: 3,
      dependencies: ['logger'],
      chunkName: 'dev-tools'
    });

    this.importConfigs.set('testSuite', {
      strategy: ImportStrategy.DYNAMIC,
      priority: 2,
      dependencies: ['debugHelper'],
      chunkName: 'dev-tools'
    });

    this.importConfigs.set('benchmarkSuite', {
      strategy: ImportStrategy.DYNAMIC,
      priority: 2,
      dependencies: ['performanceMonitor'],
      chunkName: 'dev-tools'
    });

    // 其他服务
    this.importConfigs.set('cacheManager', {
      strategy: ImportStrategy.HYBRID,
      priority: 6,
      dependencies: ['logger'],
      chunkName: 'storage'
    });

    this.importConfigs.set('cdnManager', {
      strategy: ImportStrategy.HYBRID,
      priority: 5,
      dependencies: ['cacheManager'],
      chunkName: 'storage'
    });

    this.importConfigs.set('optimizedAudioManager', {
      strategy: ImportStrategy.HYBRID,
      priority: 7,
      dependencies: ['performanceMonitor'],
      chunkName: 'audio'
    });

    // 添加剩余模块配置
    this.importConfigs.set('memoryManager', {
      strategy: ImportStrategy.HYBRID,
      priority: 6,
      dependencies: ['performanceMonitor'],
      chunkName: 'performance'
    });

    this.importConfigs.set('wasmMatchDetector', {
      strategy: ImportStrategy.DYNAMIC,
      priority: 4,
      dependencies: [],
      chunkName: 'performance'
    });

    this.importConfigs.set('networkOptimizer', {
      strategy: ImportStrategy.HYBRID,
      priority: 5,
      dependencies: ['performanceMonitor'],
      chunkName: 'performance'
    });

    this.importConfigs.set('serviceWorkerManager', {
      strategy: ImportStrategy.HYBRID,
      priority: 4,
      dependencies: ['cacheManager'],
      chunkName: 'storage'
    });

    this.importConfigs.set('offlineManager', {
      strategy: ImportStrategy.HYBRID,
      priority: 4,
      dependencies: ['cacheManager'],
      chunkName: 'storage'
    });
  }

  /**
   * 预加载静态导入
   */
  private async preloadStaticImports(): Promise<void> {
    // 预加载核心静态服务
    const staticServices = Array.from(this.importConfigs.entries())
      .filter(([_, config]) => config.strategy === ImportStrategy.STATIC)
      .sort(([_, a], [__, b]) => b.priority - a.priority);

    for (const [serviceName] of staticServices) {
      try {
        const service = await this.loadService(serviceName);
        this.staticImports.set(serviceName, service);
      } catch (error) {
        this.logger.warn(`静态服务预加载失败: ${serviceName}`, error, 'ServiceImportStrategy');
      }
    }
  }

  /**
   * 获取服务
   */
  async getService(serviceName: string): Promise<any> {
    // 检查静态导入缓存
    if (this.staticImports.has(serviceName)) {
      return this.staticImports.get(serviceName);
    }

    // 检查动态导入缓存
    if (this.dynamicImports.has(serviceName)) {
      return await this.dynamicImports.get(serviceName);
    }

    // 加载服务
    const config = this.importConfigs.get(serviceName);
    if (!config) {
      throw new Error(`未知服务: ${serviceName}`);
    }

    const loadPromise = this.loadService(serviceName);
    
    if (config.strategy === ImportStrategy.DYNAMIC) {
      this.dynamicImports.set(serviceName, loadPromise);
    }

    return await loadPromise;
  }

  /**
   * 加载服务
   */
  private async loadService(serviceName: string): Promise<any> {
    const startTime = performance.now();

    try {
      let service: any;

      switch (serviceName) {
        case 'logger':
          const { Logger } = await import('./logger');
          service = Logger.getInstance();
          break;

        case 'environmentGuard':
          const { environmentGuard } = await import('./environmentGuard');
          service = environmentGuard;
          break;

        case 'configManager':
          const { configManager } = await import('./configManager');
          service = configManager;
          break;

        case 'performanceMonitor':
          const { performanceMonitor } = await import('./performanceMonitor');
          service = performanceMonitor;
          break;

        case 'renderOptimizer':
          const { renderOptimizer } = await import('./renderOptimizer');
          service = renderOptimizer;
          break;

        case 'animationOptimizer':
          const { animationOptimizer } = await import('./animationOptimizer');
          service = animationOptimizer;
          break;

        case 'interactionAnimator':
          const { interactionAnimator } = await import('./interactionAnimator');
          service = interactionAnimator;
          break;

        case 'responsiveManager':
          const { responsiveManager } = await import('./responsiveManager');
          service = responsiveManager;
          break;

        case 'accessibilityManager':
          const { accessibilityManager } = await import('./accessibilityManager');
          service = accessibilityManager;
          break;

        case 'cacheManager':
          const { cacheManager } = await import('./cacheManager');
          service = cacheManager;
          break;

        case 'cdnManager':
          const { cdnManager } = await import('./cdnManager');
          service = cdnManager;
          break;

        case 'optimizedAudioManager':
          const { optimizedAudioManager } = await import('./optimizedAudioManager');
          service = optimizedAudioManager;
          break;

        case 'debugHelper':
          const { debugHelper } = await import('./debugHelper');
          service = debugHelper;
          break;

        case 'testSuite':
          const { testSuite } = await import('./testSuite');
          service = testSuite;
          break;

        case 'benchmarkSuite':
          const { benchmarkSuite } = await import('./benchmarkSuite');
          service = benchmarkSuite;
          break;

        case 'memoryManager':
          const { memoryManager } = await import('./memoryManager');
          service = memoryManager;
          break;

        case 'wasmMatchDetector':
          const { wasmMatchDetector } = await import('./wasmMatchDetector');
          service = wasmMatchDetector;
          break;

        case 'networkOptimizer':
          const { networkOptimizer } = await import('./networkOptimizer');
          service = networkOptimizer;
          break;

        case 'serviceWorkerManager':
          const { serviceWorkerManager } = await import('./serviceWorkerManager');
          service = serviceWorkerManager;
          break;

        case 'offlineManager':
          const { offlineManager } = await import('./offlineManager');
          service = offlineManager;
          break;

        default:
          throw new Error(`不支持的服务: ${serviceName}`);
      }

      const loadTime = performance.now() - startTime;
      this.logger.debug(`服务加载完成: ${serviceName}`, {
        loadTime: `${loadTime.toFixed(2)}ms`,
        strategy: this.importConfigs.get(serviceName)?.strategy
      }, 'ServiceImportStrategy');

      return service;
    } catch (error) {
      this.logger.error(`服务加载失败: ${serviceName}`, error, 'ServiceImportStrategy');
      throw error;
    }
  }

  /**
   * 预加载混合导入服务
   */
  async preloadHybridServices(): Promise<void> {
    const hybridServices = Array.from(this.importConfigs.entries())
      .filter(([_, config]) => config.strategy === ImportStrategy.HYBRID)
      .sort(([_, a], [__, b]) => b.priority - a.priority);

    const loadPromises = hybridServices.map(async ([serviceName]) => {
      try {
        await this.getService(serviceName);
      } catch (error) {
        this.logger.warn(`混合服务预加载失败: ${serviceName}`, error, 'ServiceImportStrategy');
      }
    });

    await Promise.allSettled(loadPromises);
  }

  /**
   * 获取导入统计
   */
  getImportStats(): {
    static: number;
    dynamic: number;
    hybrid: number;
    loaded: number;
  } {
    const configs = Array.from(this.importConfigs.values());
    
    return {
      static: configs.filter(c => c.strategy === ImportStrategy.STATIC).length,
      dynamic: configs.filter(c => c.strategy === ImportStrategy.DYNAMIC).length,
      hybrid: configs.filter(c => c.strategy === ImportStrategy.HYBRID).length,
      loaded: this.staticImports.size + this.dynamicImports.size
    };
  }

  /**
   * 清理缓存
   */
  clearCache(): void {
    this.dynamicImports.clear();
    this.logger.info('服务导入缓存已清理', undefined, 'ServiceImportStrategy');
  }
}

// 创建全局实例
export const serviceImportStrategy = ServiceImportStrategy.getInstance();

// 在开发环境中挂载到全局
environmentGuard.runInDevelopment(() => {
  (window as any).serviceImportStrategy = serviceImportStrategy;
  console.log('📦 服务导入策略管理器已挂载到 window.serviceImportStrategy');
});
