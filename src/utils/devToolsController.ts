/**
 * 开发工具控制器
 * 管理测试套件、基准测试、性能对比的执行时机
 * 生产环境自动禁用
 */

import { environmentGuard } from './environmentGuard';

interface DevToolsConfig {
  enableAutoTests: boolean;
  enableAutoDebug: boolean;
  enableAutoBenchmark: boolean;
  enableAutoPerformanceComparison: boolean;
  delayAfterGameLoad: number; // 游戏加载完成后延迟时间（毫秒）
}

class DevToolsController {
  private config: DevToolsConfig = {
    enableAutoTests: false, // 默认关闭自动测试
    enableAutoDebug: false,
    enableAutoBenchmark: false,
    enableAutoPerformanceComparison: false,
    delayAfterGameLoad: 5000 // 5秒延迟
  };

  private gameLoadCompleted = false;
  private isEnabled = false;

  constructor() {
    // 生产环境直接返回，不初始化任何功能
    if (environmentGuard.isProduction()) {
      console.log('🔒 DevToolsController disabled in production environment');
      return;
    }

    this.isEnabled = true;
    this.loadConfigFromUrl();
    this.createDevPanel();
  }

  /**
   * 检查是否启用
   */
  private checkEnabled(): boolean {
    if (!this.isEnabled) {
      console.warn('🔒 DevToolsController is disabled');
      return false;
    }
    return true;
  }

  /**
   * 从URL参数加载配置
   */
  private loadConfigFromUrl(): void {
    const urlParams = new URLSearchParams(window.location.search);
    
    if (urlParams.get('devTests') === '1') {
      this.config.enableAutoTests = true;
    }
    if (urlParams.get('devDebug') === '1') {
      this.config.enableAutoDebug = true;
    }
    if (urlParams.get('devBenchmark') === '1') {
      this.config.enableAutoBenchmark = true;
    }
    if (urlParams.get('devPerf') === '1') {
      this.config.enableAutoPerformanceComparison = true;
    }

    const delay = urlParams.get('devDelay');
    if (delay) {
      this.config.delayAfterGameLoad = parseInt(delay, 10) || 5000;
    }
  }

  /**
   * 创建开发面板
   */
  private createDevPanel(): void {
    if (!this.checkEnabled()) return;

    const panel = document.createElement('div');
    panel.id = 'dev-tools-panel';
    panel.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 15px;
      border-radius: 8px;
      font-family: monospace;
      font-size: 12px;
      z-index: 10000;
      min-width: 200px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      backdrop-filter: blur(10px);
      display: none;
    `;

    panel.innerHTML = `
      <div style="margin-bottom: 10px; font-weight: bold; color: #4CAF50;">🔧 开发工具</div>
      <button id="dev-run-tests" style="margin: 2px; padding: 5px 8px; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer;">运行测试套件</button><br>
      <button id="dev-run-debug" style="margin: 2px; padding: 5px 8px; background: #FF9800; color: white; border: none; border-radius: 4px; cursor: pointer;">运行调试测试</button><br>
      <button id="dev-run-benchmark" style="margin: 2px; padding: 5px 8px; background: #9C27B0; color: white; border: none; border-radius: 4px; cursor: pointer;">运行基准测试</button><br>
      <button id="dev-run-perf" style="margin: 2px; padding: 5px 8px; background: #F44336; color: white; border: none; border-radius: 4px; cursor: pointer;">运行性能对比</button><br>
      <button id="dev-run-all" style="margin: 2px; padding: 5px 8px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">运行全部测试</button><br>
      <div style="margin-top: 10px; font-size: 10px; opacity: 0.7;">
        <div>自动测试: ${this.config.enableAutoTests ? '✅' : '❌'}</div>
        <div>延迟: ${this.config.delayAfterGameLoad}ms</div>
      </div>
    `;

    document.body.appendChild(panel);

    // 绑定事件
    this.bindPanelEvents(panel);

    // 添加快捷键显示/隐藏面板
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
      }
    });

    console.log('🔧 开发工具面板已创建 (Ctrl+Shift+D 显示/隐藏)');
  }

  /**
   * 绑定面板事件
   */
  private bindPanelEvents(panel: HTMLElement): void {
    panel.querySelector('#dev-run-tests')?.addEventListener('click', () => {
      this.runTestsManually();
    });

    panel.querySelector('#dev-run-debug')?.addEventListener('click', () => {
      this.runDebugTestsManually();
    });

    panel.querySelector('#dev-run-benchmark')?.addEventListener('click', () => {
      this.runBenchmarkManually();
    });

    panel.querySelector('#dev-run-perf')?.addEventListener('click', () => {
      this.runPerformanceComparisonManually();
    });

    panel.querySelector('#dev-run-all')?.addEventListener('click', () => {
      this.runAllTestsManually();
    });
  }

  /**
   * 通知游戏加载完成
   */
  notifyGameLoadCompleted(): void {
    this.gameLoadCompleted = true;
    console.log('🎮 游戏加载完成，开发工具控制器已就绪');

    // 如果启用了自动测试，延迟执行
    if (this.shouldRunAutoTests()) {
      console.log(`⏰ 将在 ${this.config.delayAfterGameLoad}ms 后自动运行测试`);
      setTimeout(() => {
        this.runAutoTests();
      }, this.config.delayAfterGameLoad);
    }
  }

  /**
   * 是否应该运行自动测试
   */
  private shouldRunAutoTests(): boolean {
    return import.meta.env.DEV && this.gameLoadCompleted && (
      this.config.enableAutoTests ||
      this.config.enableAutoDebug ||
      this.config.enableAutoBenchmark ||
      this.config.enableAutoPerformanceComparison
    );
  }

  /**
   * 运行自动测试
   */
  private async runAutoTests(): Promise<void> {
    console.log('🚀 开始自动运行开发测试...');

    if (this.config.enableAutoTests) {
      await this.runTestsInWorker();
    }

    if (this.config.enableAutoDebug) {
      await this.runDebugTestsInWorker();
    }

    if (this.config.enableAutoBenchmark) {
      await this.runBenchmarkInWorker();
    }

    if (this.config.enableAutoPerformanceComparison) {
      await this.runPerformanceComparisonInWorker();
    }

    console.log('✅ 自动测试完成');
  }

  /**
   * 手动运行测试套件
   */
  async runTestsManually(): Promise<void> {
    console.log('🧪 手动运行测试套件...');
    await this.runTestsInWorker();
  }

  /**
   * 手动运行调试测试
   */
  async runDebugTestsManually(): Promise<void> {
    console.log('🔍 手动运行调试测试...');
    await this.runDebugTestsInWorker();
  }

  /**
   * 手动运行基准测试
   */
  async runBenchmarkManually(): Promise<void> {
    console.log('📊 手动运行基准测试...');
    await this.runBenchmarkInWorker();
  }

  /**
   * 手动运行性能对比
   */
  async runPerformanceComparisonManually(): Promise<void> {
    console.log('⚡ 手动运行性能对比...');
    await this.runPerformanceComparisonInWorker();
  }

  /**
   * 手动运行全部测试
   */
  async runAllTestsManually(): Promise<void> {
    console.log('🚀 手动运行全部测试...');
    await this.runTestsInWorker();
    await this.runDebugTestsInWorker();
    await this.runBenchmarkInWorker();
    await this.runPerformanceComparisonInWorker();
    console.log('✅ 全部测试完成');
  }

  /**
   * 在Worker中运行测试套件
   */
  private async runTestsInWorker(): Promise<void> {
    return new Promise((resolve) => {
      requestIdleCallback(async () => {
        try {
          // 动态导入测试套件
          const { runTechnicalDebtTests } = await import('./testSuite');
          await runTechnicalDebtTests();
        } catch (error) {
          console.error('测试套件运行失败:', error);
        }
        resolve();
      });
    });
  }

  /**
   * 在Worker中运行调试测试
   */
  private async runDebugTestsInWorker(): Promise<void> {
    return new Promise((resolve) => {
      requestIdleCallback(async () => {
        try {
          const { debugHelper } = await import('./debugHelper');
          await debugHelper.testErrorHandling();
        } catch (error) {
          console.error('调试测试运行失败:', error);
        }
        resolve();
      });
    });
  }

  /**
   * 在Worker中运行基准测试
   */
  private async runBenchmarkInWorker(): Promise<void> {
    return new Promise((resolve) => {
      requestIdleCallback(async () => {
        try {
          const { benchmarkSuite } = await import('./benchmarkSuite');
          await benchmarkSuite.runFullSuite();
        } catch (error) {
          console.error('基准测试运行失败:', error);
        }
        resolve();
      });
    });
  }

  /**
   * 在Worker中运行性能对比
   */
  private async runPerformanceComparisonInWorker(): Promise<void> {
    return new Promise((resolve) => {
      requestIdleCallback(async () => {
        try {
          const { performanceComparison } = await import('./performanceComparison');
          await performanceComparison.runFullComparison();
        } catch (error) {
          console.error('性能对比运行失败:', error);
        }
        resolve();
      });
    });
  }

  /**
   * 通知游戏加载完成
   */
  notifyGameLoaded(): void {
    if (!this.checkEnabled()) return;

    this.gameLoadCompleted = true;
    console.log('🎮 游戏加载完成，开发工具可用');

    // 如果启用了自动测试，延迟执行
    if (this.shouldRunAutoTests()) {
      setTimeout(() => {
        this.runAutoTests();
      }, this.config.delayAfterGameLoad);
    }
  }
}

// 创建全局实例
export const devToolsController = new DevToolsController();

// 在开发环境中挂载到全局
environmentGuard.runInDevelopment(() => {
  (window as any).devToolsController = devToolsController;
  console.log('🔧 开发工具控制器已挂载到 window.devToolsController');
});
