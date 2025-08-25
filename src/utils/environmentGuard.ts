/**
 * 环境检测和保护工具
 * 防止开发工具和调试代码进入生产环境
 */

interface EnvironmentInfo {
  isDevelopment: boolean;
  isProduction: boolean;
  isLocal: boolean;
  hostname: string;
  nodeEnv: string;
  buildMode: string;
}

export class EnvironmentGuard {
  private static instance: EnvironmentGuard;
  private environmentInfo: EnvironmentInfo;

  private constructor() {
    this.environmentInfo = this.detectEnvironment();
    this.logEnvironmentInfo();
  }

  static getInstance(): EnvironmentGuard {
    if (!EnvironmentGuard.instance) {
      EnvironmentGuard.instance = new EnvironmentGuard();
    }
    return EnvironmentGuard.instance;
  }

  /**
   * 检测当前运行环境
   */
  private detectEnvironment(): EnvironmentInfo {
    const hostname = window.location.hostname;
    const nodeEnv = import.meta.env.MODE;
    const isDev = import.meta.env.DEV;
<<<<<<< HEAD
    const isLocal = hostname.includes('localhost') || hostname.includes('127.0.0.1');

    // 修复：本地测试时应该被识别为开发环境
    // 即使是生产构建，如果在本地运行，也应该使用本地资源
    const isProduction = !isDev && nodeEnv === 'production' && !isLocal;
    const isDevelopment = isDev || isLocal; // 本地环境总是被视为开发环境

    return {
      isDevelopment,
=======

    // 优先使用Vite的环境检测
    const isProduction = !isDev && nodeEnv === 'production';
    const isLocal = hostname.includes('localhost') || hostname.includes('127.0.0.1');

    return {
      isDevelopment: isDev,
>>>>>>> 9fddd3036fe0c9b5a6941f9fb1031aa12c6e3389
      isProduction,
      isLocal,
      hostname,
      nodeEnv,
<<<<<<< HEAD
      buildMode: isDevelopment ? 'development' : 'production'
=======
      buildMode: isDev ? 'development' : 'production'
>>>>>>> 9fddd3036fe0c9b5a6941f9fb1031aa12c6e3389
    };
  }

  /**
   * 记录环境信息
   */
  private logEnvironmentInfo(): void {
    const info = this.environmentInfo;
    console.log(`🌍 Environment Detection:`, {
      mode: info.buildMode,
      hostname: info.hostname,
      isProduction: info.isProduction,
      isDevelopment: info.isDevelopment
    });
  }

  /**
   * 检查是否为生产环境
   */
  isProduction(): boolean {
    return this.environmentInfo.isProduction;
  }

  /**
   * 检查是否为开发环境
   */
  isDevelopment(): boolean {
    return this.environmentInfo.isDevelopment;
  }

  /**
   * 检查是否为本地环境
   */
  isLocal(): boolean {
    return this.environmentInfo.isLocal;
  }

  /**
   * 获取环境信息
   */
  getEnvironmentInfo(): EnvironmentInfo {
    return { ...this.environmentInfo };
  }

  /**
   * 防止开发工具在生产环境运行
   */
  preventDevToolsInProduction(): void {
    if (this.isProduction()) {
      console.log('🔒 Production environment detected - removing dev tools');
      this.removeDevElements();
      this.disableDevGlobals();
      this.cleanupDevListeners();
    }
  }

  /**
   * 移除开发工具DOM元素
   */
  private removeDevElements(): void {
    const devSelectors = [
      '#dev-tools-panel',
      '[data-dev-tool]',
      '.dev-only',
      '.debug-panel'
    ];

    devSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        if (element.parentNode) {
          element.parentNode.removeChild(element);
        }
      });
    });
  }

  /**
   * 禁用开发工具全局变量
   */
  private disableDevGlobals(): void {
    const devGlobals = [
      'debugHelper',
      'testSuite',
      'benchmarkSuite',
      'performanceComparison',
      'devToolsController',
      'elementCleaner'
    ];

    devGlobals.forEach(globalName => {
      if ((window as any)[globalName]) {
        try {
          delete (window as any)[globalName];
        } catch (error) {
          (window as any)[globalName] = undefined;
        }
      }
    });
  }

  /**
   * 清理开发工具事件监听器
   */
  private cleanupDevListeners(): void {
    // 移除开发工具相关的事件监听器
    const devEvents = ['keydown', 'keyup', 'click'];
    devEvents.forEach(eventType => {
      // 这里可以根据实际情况添加特定的事件清理逻辑
    });
  }

  /**
   * 条件执行开发代码
   */
  runInDevelopment(callback: () => void): void {
    if (this.isDevelopment()) {
      callback();
    }
  }

  /**
   * 条件执行生产代码
   */
  runInProduction(callback: () => void): void {
    if (this.isProduction()) {
      callback();
    }
  }

  /**
   * 安全的控制台输出（生产环境自动禁用）
   */
  safeConsoleLog(message: string, data?: any): void {
    if (this.isDevelopment()) {
      console.log(message, data);
    }
  }

  /**
   * 安全的控制台警告（生产环境保留）
   */
  safeConsoleWarn(message: string, data?: any): void {
    console.warn(message, data);
  }

  /**
   * 安全的控制台错误（生产环境保留）
   */
  safeConsoleError(message: string, data?: any): void {
    console.error(message, data);
  }
}

// 创建全局实例
export const environmentGuard = EnvironmentGuard.getInstance();

// 立即执行生产环境保护
environmentGuard.preventDevToolsInProduction();
