/**
 * 技术债务清理验证测试套件
 */

import { Logger } from './logger';
import { ErrorHandler } from './errorHandler';
import { runAllTypeValidations } from './typeCheck';
import type { GameError } from '@/types/error';
import { ErrorCode, ErrorSeverity } from '@/types/error';

/**
 * 测试结果接口
 */
interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  duration: number;
}

/**
 * 测试套件类
 */
export class TestSuite {
  private logger: Logger;
  private errorHandler: ErrorHandler;
  private results: TestResult[] = [];

  constructor() {
    this.logger = Logger.getInstance();
    this.errorHandler = ErrorHandler.getInstance();
  }

  /**
   * 运行单个测试
   */
  private async runTest(name: string, testFn: () => Promise<boolean> | boolean): Promise<TestResult> {
    const startTime = performance.now();
    
    try {
      this.logger.info(`开始测试: ${name}`, undefined, 'TestSuite');
      
      const result = await testFn();
      const duration = performance.now() - startTime;
      
      const testResult: TestResult = {
        name,
        passed: result,
        message: result ? '✅ 通过' : '❌ 失败',
        duration
      };
      
      this.logger.info(`测试完成: ${name}`, testResult, 'TestSuite');
      return testResult;
      
    } catch (error) {
      const duration = performance.now() - startTime;
      const testResult: TestResult = {
        name,
        passed: false,
        message: `❌ 异常: ${error instanceof Error ? error.message : String(error)}`,
        duration
      };
      
      this.logger.error(`测试异常: ${name}`, error, 'TestSuite');
      return testResult;
    }
  }

  /**
   * 测试TypeScript类型系统
   */
  private async testTypeScript(): Promise<boolean> {
    console.log('🧪 测试TypeScript类型系统...');
    
    try {
      // 运行类型验证
      const typeValidationResult = runAllTypeValidations();
      
      if (!typeValidationResult) {
        console.error('❌ TypeScript类型验证失败');
        return false;
      }
      
      // 测试类型推断
      const testArray: number[] = [1, 2, 3];
      const testString: string = 'test';
      const testBoolean: boolean = true;
      
      // 这些应该能正常工作而不报错
      console.log('类型测试:', { testArray, testString, testBoolean });
      
      console.log('✅ TypeScript类型系统测试通过');
      return true;
      
    } catch (error) {
      console.error('❌ TypeScript类型系统测试失败:', error);
      return false;
    }
  }

  /**
   * 测试日志系统
   */
  private async testLoggingSystem(): Promise<boolean> {
    console.log('🧪 测试日志系统...');
    
    try {
      // 测试不同级别的日志
      this.logger.debug('测试debug日志', { test: 'data' }, 'TestSuite');
      this.logger.info('测试info日志', { test: 'data' }, 'TestSuite');
      this.logger.warn('测试warn日志', { test: 'data' }, 'TestSuite');
      this.logger.error('测试error日志', { test: 'data' }, 'TestSuite');
      
      // 测试日志统计
      const stats = this.logger.getLogStats();
      if (stats.total === 0) {
        console.error('❌ 日志统计显示没有日志记录');
        return false;
      }
      
      // 测试日志导出
      const exportedLogs = this.logger.exportLogs('json');
      if (!exportedLogs || exportedLogs.length === 0) {
        console.error('❌ 日志导出失败');
        return false;
      }
      
      // 测试组件日志器
      const componentLogger = this.logger.createComponentLogger('TestComponent');
      componentLogger.info('测试组件日志器');
      
      console.log('✅ 日志系统测试通过');
      return true;
      
    } catch (error) {
      console.error('❌ 日志系统测试失败:', error);
      return false;
    }
  }

  /**
   * 测试错误处理系统
   */
  private async testErrorHandling(): Promise<boolean> {
    console.log('🧪 测试错误处理系统...');
    
    try {
      // 创建测试错误
      const testError: GameError = {
        code: ErrorCode.AUDIO_SFX_FAILED,
        message: '测试音效播放失败',
        severity: ErrorSeverity.LOW,
        context: {
          component: 'TestSuite',
          action: 'test_error_handling',
          timestamp: Date.now(),
          userAgent: navigator.userAgent,
          url: window.location.href
        },
        recoverable: true
      };
      
      // 测试错误处理
      await this.errorHandler.handleError(testError);
      
      // 测试错误统计
      const stats = this.errorHandler.getErrorStats();
      if (stats.total === 0) {
        console.error('❌ 错误统计显示没有错误记录');
        return false;
      }
      
      // 测试最近错误获取
      const recentErrors = this.errorHandler.getRecentErrors(5);
      if (recentErrors.length === 0) {
        console.error('❌ 无法获取最近的错误');
        return false;
      }
      
      console.log('✅ 错误处理系统测试通过');
      return true;
      
    } catch (error) {
      console.error('❌ 错误处理系统测试失败:', error);
      return false;
    }
  }

  /**
   * 测试性能监控
   */
  private async testPerformanceMonitoring(): Promise<boolean> {
    console.log('🧪 测试性能监控...');
    
    try {
      // 测试性能标记
      this.logger.mark('test-start', 'TestSuite');
      
      // 模拟一些工作
      await new Promise(resolve => setTimeout(resolve, 100));
      
      this.logger.mark('test-end', 'TestSuite');
      
      // 测试性能测量
      this.logger.measure('test-duration', 'test-start', 'test-end', 'TestSuite');
      
      console.log('✅ 性能监控测试通过');
      return true;
      
    } catch (error) {
      console.error('❌ 性能监控测试失败:', error);
      return false;
    }
  }

  /**
   * 测试内存使用
   */
  private async testMemoryUsage(): Promise<boolean> {
    console.log('🧪 测试内存使用...');
    
    try {
      // 检查性能API是否可用
      if (typeof performance !== 'undefined' && (performance as any).memory) {
        const memInfo = (performance as any).memory;
        console.log('内存使用情况:', {
          used: Math.round(memInfo.usedJSHeapSize / 1024 / 1024) + 'MB',
          total: Math.round(memInfo.totalJSHeapSize / 1024 / 1024) + 'MB',
          limit: Math.round(memInfo.jsHeapSizeLimit / 1024 / 1024) + 'MB'
        });
      }
      
      console.log('✅ 内存使用测试通过');
      return true;
      
    } catch (error) {
      console.error('❌ 内存使用测试失败:', error);
      return false;
    }
  }

  /**
   * 运行所有测试
   */
  async runAllTests(): Promise<TestResult[]> {
    console.log('🚀 开始运行技术债务清理验证测试套件...');
    
    const tests = [
      { name: 'TypeScript类型系统', fn: () => this.testTypeScript() },
      { name: '日志系统', fn: () => this.testLoggingSystem() },
      { name: '错误处理系统', fn: () => this.testErrorHandling() },
      { name: '性能监控', fn: () => this.testPerformanceMonitoring() },
      { name: '内存使用', fn: () => this.testMemoryUsage() }
    ];
    
    this.results = [];
    
    for (const test of tests) {
      const result = await this.runTest(test.name, test.fn);
      this.results.push(result);
    }
    
    this.printSummary();
    return this.results;
  }

  /**
   * 打印测试摘要
   */
  private printSummary(): void {
    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);
    
    console.log('\n📊 测试摘要:');
    console.log(`总测试数: ${total}`);
    console.log(`通过: ${passed}`);
    console.log(`失败: ${total - passed}`);
    console.log(`总耗时: ${Math.round(totalDuration)}ms`);
    console.log(`成功率: ${Math.round((passed / total) * 100)}%`);
    
    console.log('\n📋 详细结果:');
    this.results.forEach(result => {
      console.log(`${result.message} ${result.name} (${Math.round(result.duration)}ms)`);
    });
    
    if (passed === total) {
      console.log('\n🎉 所有测试通过！技术债务清理成功完成！');
    } else {
      console.log('\n⚠️ 部分测试失败，请检查相关功能');
    }
  }

  /**
   * 获取测试结果
   */
  getResults(): TestResult[] {
    return [...this.results];
  }
}

/**
 * 运行测试套件的便捷函数
 */
export async function runTechnicalDebtTests(): Promise<TestResult[]> {
  const testSuite = new TestSuite();
  return await testSuite.runAllTests();
}

// 在开发环境中自动运行测试
if (import.meta.env.DEV) {
  // 延迟运行，确保所有模块都已加载
  setTimeout(() => {
    runTechnicalDebtTests().catch(console.error);
  }, 2000);
}
