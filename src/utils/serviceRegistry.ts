/**
 * 服务注册中心
 * 统一管理所有服务的注册和初始化顺序
 */

import { configManager } from './configManager';
import { diContainer } from './diContainer';
import { environmentGuard } from './environmentGuard';
import { ErrorHandler } from './errorHandler';
import { DebugToolType, lazyDebugLoader } from './lazyDebugLoader';
import { Logger } from './logger';
import { serviceImportStrategy } from './serviceImportStrategy';
import { userPreferencesManager } from './userPreferencesManager';

export class ServiceRegistry {
  private static instance: ServiceRegistry;
  private logger: Logger;
  private isInitialized = false;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  static getInstance(): ServiceRegistry {
    if (!ServiceRegistry.instance) {
      ServiceRegistry.instance = new ServiceRegistry();
    }
    return ServiceRegistry.instance;
  }

  /**
   * 注册所有服务
   */
  async registerAllServices(): Promise<void> {
    if (this.isInitialized) {
      this.logger.warn('服务已经注册过，跳过重复注册', undefined, 'ServiceRegistry');
      return;
    }

    this.logger.info('开始注册所有服务...', undefined, 'ServiceRegistry');

    try {
      // 第一层：核心基础服务（无依赖）
      await this.registerCoreServices();

      // 第二层：配置和日志服务
      await this.registerConfigServices();

      // 第三层：性能和监控服务
      await this.registerPerformanceServices();

      // 第四层：音频和资源服务
      await this.registerAudioAndResourceServices();

      // 第五层：游戏逻辑服务
      await this.registerGameServices();

      // 第六层：UI和交互服务
      await this.registerUIServices();

      // 第七层：开发工具服务（仅开发环境）
      if (environmentGuard.isDevelopment()) {
        await this.registerDevServices();
      } else {
        // 生产环境注册空的开发工具服务以保持兼容性
        this.registerProductionDevServices();
      }

      this.isInitialized = true;
      this.logger.info('所有服务注册完成', diContainer.getStats(), 'ServiceRegistry');

    } catch (error) {
      this.logger.error('服务注册失败', error, 'ServiceRegistry');
      throw error;
    }
  }

  /**
   * 注册核心基础服务
   */
  private async registerCoreServices(): Promise<void> {
    this.logger.debug('注册核心基础服务...', undefined, 'ServiceRegistry');

    // 配置管理器（无依赖）
    diContainer.registerSingleton('configManager', () => configManager);

    // 环境检测器（无依赖）
    diContainer.registerSingleton('environmentGuard', () => environmentGuard);

    // 日志系统（无依赖）
    diContainer.registerSingleton('logger', () => this.logger);
  }

  /**
   * 注册配置和日志服务
   */
  private async registerConfigServices(): Promise<void> {
    this.logger.debug('注册配置和日志服务...', undefined, 'ServiceRegistry');

    // 日志控制器
    diContainer.registerSingleton('logController', async () => {
      const { logController } = await import('./logController');
      return logController;
    }, ['logger', 'configManager']);

    // 错误处理器 - 改为静态导入，因为在多处被静态引用
    diContainer.registerSingleton('errorHandler', () => {
      return ErrorHandler.getInstance();
    }, ['logger']);
  }

  /**
   * 注册性能和监控服务
   */
  private async registerPerformanceServices(): Promise<void> {
    this.logger.debug('注册性能和监控服务...', undefined, 'ServiceRegistry');

    // 性能监控器 - 使用统一导入策略
    diContainer.registerSingleton('performanceMonitor', async () => {
      return await serviceImportStrategy.getService('performanceMonitor');
    }, ['logger', 'configManager']);

    // 渲染优化器 - 使用统一导入策略
    diContainer.registerSingleton('renderOptimizer', async () => {
      return await serviceImportStrategy.getService('renderOptimizer');
    }, ['performanceMonitor', 'configManager']);

    // 内存管理器
    diContainer.registerSingleton('memoryManager', async () => {
      const { memoryManager } = await import('./memoryManager');
      return memoryManager;
    }, ['performanceMonitor', 'logger']);

    // 动画优化器 - 使用统一导入策略
    diContainer.registerSingleton('animationOptimizer', async () => {
      return await serviceImportStrategy.getService('animationOptimizer');
    }, ['performanceMonitor', 'configManager']);
  }

  /**
   * 注册音频和资源服务
   */
  private async registerAudioAndResourceServices(): Promise<void> {
    this.logger.debug('注册音频和资源服务...', undefined, 'ServiceRegistry');

    // 缓存管理器
    diContainer.registerSingleton('cacheManager', async () => {
      const { cacheManager } = await import('./cacheManager');
      return cacheManager;
    }, ['logger', 'configManager']);

    // CDN管理器
    diContainer.registerSingleton('cdnManager', async () => {
      const { cdnManager } = await import('./cdnManager');
      return cdnManager;
    }, ['logger', 'configManager']);

    // 资源预加载器
    diContainer.registerSingleton('resourcePreloader', async () => {
      const { resourcePreloader } = await import('./resourcePreloader');
      return resourcePreloader;
    }, ['cacheManager', 'cdnManager', 'performanceMonitor']);

    // 音频管理器
    diContainer.registerSingleton('audioManager', async () => {
      const { optimizedAudioManager } = await import('./optimizedAudioManager');
      return optimizedAudioManager;
    }, ['configManager', 'resourcePreloader', 'performanceMonitor']);

    // 网络优化器
    diContainer.registerSingleton('networkOptimizer', async () => {
      const { networkOptimizer } = await import('./networkOptimizer');
      return networkOptimizer;
    }, ['logger', 'configManager']);

    // 离线管理器
    diContainer.registerSingleton('offlineManager', async () => {
      const { offlineManager } = await import('./offlineManager');
      return offlineManager;
    }, ['cacheManager', 'logger']);

    // Service Worker管理器
    diContainer.registerSingleton('serviceWorkerManager', async () => {
      const { serviceWorkerManager } = await import('./serviceWorkerManager');
      return serviceWorkerManager;
    }, ['logger', 'configManager']);
  }

  /**
   * 注册游戏逻辑服务
   */
  private async registerGameServices(): Promise<void> {
    this.logger.debug('注册游戏逻辑服务...', undefined, 'ServiceRegistry');

    // 对象池
    diContainer.registerSingleton('tileObjectPool', async () => {
      const { tileObjectPool } = await import('./tileObjectPool');
      return tileObjectPool;
    }, ['performanceMonitor', 'logController']);

    // WASM匹配检测器
    diContainer.registerSingleton('wasmMatchDetector', async () => {
      const { wasmMatchDetector } = await import('./wasmMatchDetector');
      return wasmMatchDetector;
    }, ['logger', 'performanceMonitor']);

    // 游戏逻辑（将在可配置游戏板实现时重构）
    diContainer.registerTransient('gameLogic', async () => {
      // 这里将在Day 5-7实现可配置游戏板时重构
      return null;
    }, ['configManager', 'tileObjectPool', 'wasmMatchDetector']);
  }

  /**
   * 注册UI和交互服务
   */
  private async registerUIServices(): Promise<void> {
    this.logger.debug('注册UI和交互服务...', undefined, 'ServiceRegistry');

    // 用户偏好管理器 - 改为静态导入，因为在difficultyBalanceManager中被静态引用
    diContainer.registerSingleton('userPreferencesManager', () => {
      return userPreferencesManager;
    }, ['configManager', 'performanceMonitor']);

    // 响应式管理器
    diContainer.registerSingleton('responsiveManager', async () => {
      const { responsiveManager } = await import('./responsiveManager');
      return responsiveManager;
    }, ['configManager', 'logger']);

    // 可访问性管理器
    diContainer.registerSingleton('accessibilityManager', async () => {
      const { accessibilityManager } = await import('./accessibilityManager');
      return accessibilityManager;
    }, ['configManager', 'logger']);

    // 交互动画器
    diContainer.registerSingleton('interactionAnimator', async () => {
      const { interactionAnimator } = await import('./interactionAnimator');
      return interactionAnimator;
    }, ['animationOptimizer', 'configManager']);

    // 加载体验管理器
    diContainer.registerSingleton('loadingExperienceManager', async () => {
      const { loadingExperienceManager } = await import('./loadingExperienceManager');
      return loadingExperienceManager;
    }, ['configManager', 'logger']);

    // 元素清理器
    diContainer.registerSingleton('elementCleaner', async () => {
      const { performCompleteCleanup, startElementMonitoring, cleanupGreenSquares } = await import('./elementCleaner');
      return {
        performCompleteCleanup,
        startElementMonitoring,
        cleanupGreenSquares
      };
    }, ['logger']);
  }

  /**
   * 注册生产环境的空开发工具服务
   */
  private registerProductionDevServices(): void {
    this.logger.debug('注册生产环境空开发工具服务...', undefined, 'ServiceRegistry');

    // 注册空的开发工具服务以保持API兼容性
    diContainer.registerSingleton('debugHelper', () => ({
      runDiagnostics: () => {},
      collectSystemInfo: () => ({}),
      testErrorHandling: () => {},
      generateReport: () => ''
    }));

    diContainer.registerSingleton('testSuite', () => ({
      runAllTests: () => {},
      runSpecificTest: () => {},
      getTestResults: () => []
    }));

    diContainer.registerSingleton('benchmarkSuite', () => ({
      runAllBenchmarks: () => {},
      runSpecificBenchmark: () => {},
      getBenchmarkResults: () => []
    }));

    diContainer.registerSingleton('performanceComparison', () => ({
      runAllComparisons: () => {},
      getComparisonResults: () => []
    }));

    diContainer.registerSingleton('devToolsController', () => ({
      notifyGameLoaded: () => {},
      runAutoTests: () => {},
      createDevPanel: () => {},
      destroy: () => {}
    }));
  }

  /**
   * 注册开发工具服务（仅开发环境）
   */
  private async registerDevServices(): Promise<void> {
    this.logger.debug('注册开发工具服务（懒加载模式）...', undefined, 'ServiceRegistry');

    // 懒加载调试工具加载器
    diContainer.registerSingleton('lazyDebugLoader', () => lazyDebugLoader);

    // 简化调试助手（立即加载）
    diContainer.registerSingleton('simplifiedDebugHelper', async () => {
      return await lazyDebugLoader.loadTool(DebugToolType.SIMPLIFIED_DEBUG_HELPER);
    }, ['lazyDebugLoader']);

    // 开发效率工具（立即加载）
    diContainer.registerSingleton('devEfficiencyTools', async () => {
      return await lazyDebugLoader.loadTool(DebugToolType.DEV_EFFICIENCY_TOOLS);
    }, ['lazyDebugLoader', 'simplifiedDebugHelper']);

    // 调试助手（懒加载）
    diContainer.registerSingleton('debugHelper', async () => {
      return await lazyDebugLoader.loadTool(DebugToolType.DEBUG_HELPER);
    }, ['lazyDebugLoader']);

    // 测试套件（懒加载）
    diContainer.registerSingleton('testSuite', async () => {
      return await lazyDebugLoader.loadTool(DebugToolType.TEST_SUITE);
    }, ['lazyDebugLoader']);

    // 基准测试套件（懒加载）
    diContainer.registerSingleton('benchmarkSuite', async () => {
      return await lazyDebugLoader.loadTool(DebugToolType.BENCHMARK_SUITE);
    }, ['lazyDebugLoader']);

    // 性能对比工具（懒加载）
    diContainer.registerSingleton('performanceComparison', async () => {
      return await lazyDebugLoader.loadTool(DebugToolType.PERFORMANCE_COMPARISON);
    }, ['lazyDebugLoader']);

    // 开发工具控制器（使用简化版本）
    diContainer.registerSingleton('devToolsController', async () => {
      const devEfficiencyTools = await lazyDebugLoader.loadTool(DebugToolType.DEV_EFFICIENCY_TOOLS);

      // 返回兼容的控制器接口
      return {
        notifyGameLoaded: () => {
          // 预加载高优先级工具
          lazyDebugLoader.preloadHighPriorityTools();
        },
        runAutoTests: () => {
          // 按需加载测试套件
          lazyDebugLoader.loadTool(DebugToolType.TEST_SUITE).then(testSuite => {
            if (testSuite && typeof testSuite.runAllTests === 'function') {
              testSuite.runAllTests();
            }
          });
        },
        createDevPanel: () => {
          // 初始化开发效率工具
          if (devEfficiencyTools && typeof devEfficiencyTools.initialize === 'function') {
            devEfficiencyTools.initialize();
          }
        },
        destroy: () => {
          lazyDebugLoader.cleanup();
        }
      };
    }, ['lazyDebugLoader']);
  }

  /**
   * 初始化所有服务
   */
  async initializeAllServices(): Promise<void> {
    if (!this.isInitialized) {
      await this.registerAllServices();
    }

    this.logger.info('开始初始化所有服务...', undefined, 'ServiceRegistry');

    try {
      await diContainer.initializeAllSingletons();
      this.logger.info('所有服务初始化完成', diContainer.getStats(), 'ServiceRegistry');
    } catch (error) {
      this.logger.error('服务初始化失败', error, 'ServiceRegistry');
      throw error;
    }
  }

  /**
   * 获取服务（类型安全的包装器）
   */
  async getService<T>(serviceName: string): Promise<T> {
    return await diContainer.get<T>(serviceName);
  }

  /**
   * 同步获取服务（仅适用于已初始化的单例）
   */
  getServiceSync<T>(serviceName: string): T {
    return diContainer.getSync<T>(serviceName);
  }

  /**
   * 检查服务是否可用
   */
  isServiceAvailable(serviceName: string): boolean {
    return diContainer.isRegistered(serviceName);
  }

  /**
   * 获取服务统计信息
   */
  getServiceStats() {
    return diContainer.getStats();
  }

  /**
   * 重置注册状态（仅用于测试）
   */
  reset(): void {
    if (environmentGuard.isDevelopment()) {
      this.isInitialized = false;
      diContainer.dispose();
      this.logger.warn('服务注册中心已重置（仅开发环境）', undefined, 'ServiceRegistry');
    }
  }
}

// 创建全局实例
export const serviceRegistry = ServiceRegistry.getInstance();

// 在开发环境中挂载到全局
environmentGuard.runInDevelopment(() => {
  (window as any).serviceRegistry = serviceRegistry;
  console.log('🔧 服务注册中心已挂载到 window.serviceRegistry');
});
