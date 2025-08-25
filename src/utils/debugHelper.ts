/**
 * 调试辅助工具
 * 生产环境自动禁用
 */

import { Logger } from './logger';
import { environmentGuard } from './environmentGuard';
import { ErrorHandler } from './errorHandler';
import { ErrorCode, ErrorSeverity } from '@/types/error';

/**
 * 调试信息收集器
 */
export class DebugHelper {
  private logger: Logger;
  private errorHandler: ErrorHandler;
  private isEnabled: boolean;

  constructor() {
    this.isEnabled = environmentGuard.isDevelopment();

    if (!this.isEnabled) {
      console.log('🔒 DebugHelper disabled in production environment');
      return;
    }

    this.logger = Logger.getInstance();
    this.errorHandler = ErrorHandler.getInstance();
  }

  private checkEnabled(): boolean {
    if (!this.isEnabled) {
      console.warn('🔒 DebugHelper is disabled');
      return false;
    }
    return true;
  }

  /**
   * 收集系统信息
   */
  collectSystemInfo(): Record<string, any> {
    if (!this.checkEnabled()) return {};
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      screen: {
        width: screen.width,
        height: screen.height,
        colorDepth: screen.colorDepth
      },
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      location: {
        href: window.location.href,
        protocol: window.location.protocol,
        host: window.location.host
      },
      performance: this.getPerformanceInfo(),
      memory: this.getMemoryInfo()
    };
  }

  /**
   * 获取性能信息
   */
  private getPerformanceInfo(): Record<string, any> {
    if (!performance.timing) return {};

    const timing = performance.timing;
    return {
      navigationStart: timing.navigationStart,
      loadEventEnd: timing.loadEventEnd,
      domContentLoadedEventEnd: timing.domContentLoadedEventEnd,
      loadTime: timing.loadEventEnd - timing.navigationStart,
      domReadyTime: timing.domContentLoadedEventEnd - timing.navigationStart
    };
  }

  /**
   * 获取内存信息
   */
  private getMemoryInfo(): Record<string, any> {
    if (!(performance as any).memory) return {};

    const memory = (performance as any).memory;
    return {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      usedMB: Math.round(memory.usedJSHeapSize / 1024 / 1024),
      totalMB: Math.round(memory.totalJSHeapSize / 1024 / 1024)
    };
  }

  /**
   * 测试错误处理系统
   */
  async testErrorHandling(): Promise<void> {
    console.log('🧪 测试错误处理系统...');

    // 测试不同级别的错误
    const testErrors = [
      {
        code: ErrorCode.AUDIO_SFX_FAILED,
        message: '测试低级别错误',
        severity: ErrorSeverity.LOW
      },
      {
        code: ErrorCode.RESOURCE_LOAD_FAILED,
        message: '测试中级别错误',
        severity: ErrorSeverity.MEDIUM
      },
      {
        code: ErrorCode.COMPONENT_ERROR,
        message: '测试高级别错误',
        severity: ErrorSeverity.HIGH
      }
    ];

    for (const errorData of testErrors) {
      const gameError = {
        ...errorData,
        context: {
          component: 'DebugHelper',
          action: 'test_error_handling',
          timestamp: Date.now(),
          userAgent: navigator.userAgent,
          url: window.location.href
        },
        recoverable: true
      };

      await this.errorHandler.handleError(gameError);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('✅ 错误处理系统测试完成');
  }

  /**
   * 测试日志系统
   */
  testLogging(): void {
    console.log('🧪 测试日志系统...');

    this.logger.debug('这是一条调试日志', { test: 'debug' }, 'DebugHelper');
    this.logger.info('这是一条信息日志', { test: 'info' }, 'DebugHelper');
    this.logger.warn('这是一条警告日志', { test: 'warn' }, 'DebugHelper');
    this.logger.error('这是一条错误日志', { test: 'error' }, 'DebugHelper');

    const stats = this.logger.getLogStats();
    console.log('📊 日志统计:', stats);

    console.log('✅ 日志系统测试完成');
  }

  /**
   * 生成调试报告
   */
  generateDebugReport(): string {
    const systemInfo = this.collectSystemInfo();
    const logStats = this.logger.getLogStats();
    const errorStats = this.errorHandler.getErrorStats();
    const recentLogs = this.logger.getRecentLogs(20);
    const recentErrors = this.errorHandler.getRecentErrors(10);

    const report = {
      timestamp: new Date().toISOString(),
      systemInfo,
      logStats,
      errorStats,
      recentLogs,
      recentErrors
    };

    return JSON.stringify(report, null, 2);
  }

  /**
   * 打印调试信息到控制台
   */
  printDebugInfo(): void {
    console.group('🔍 调试信息');
    
    console.log('📊 系统信息:', this.collectSystemInfo());
    console.log('📝 日志统计:', this.logger.getLogStats());
    console.log('🚨 错误统计:', this.errorHandler.getErrorStats());
    
    console.groupEnd();
  }

  /**
   * 导出调试报告到剪贴板
   */
  async exportDebugReport(): Promise<void> {
    const report = this.generateDebugReport();
    
    try {
      await navigator.clipboard.writeText(report);
      console.log('✅ 调试报告已复制到剪贴板');
    } catch (error) {
      console.error('❌ 复制到剪贴板失败:', error);
      console.log('📋 调试报告:', report);
    }
  }
}

/**
 * 全局调试辅助实例
 */
export const debugHelper = new DebugHelper();

// 在开发环境中将调试工具挂载到全局
environmentGuard.runInDevelopment(() => {
  (window as any).debugHelper = debugHelper;
  console.log('🔧 调试工具已挂载到 window.debugHelper');
});
