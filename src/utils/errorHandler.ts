/**
 * 统一错误处理系统
 */

import type {
    ErrorReport,
    ErrorStrategy,
    GameError
} from '@/types/error';
import { ErrorCode, ErrorSeverity } from '@/types/error';
import { Logger } from './logger';

/**
 * 错误处理策略配置
 */
const ERROR_STRATEGIES: Record<ErrorCode, ErrorStrategy> = {
  // 音频相关错误
  [ErrorCode.AUDIO_INIT_FAILED]: {
    severity: ErrorSeverity.MEDIUM,
    userMessage: '音频系统初始化失败，将使用静音模式',
    shouldReport: true,
    shouldNotifyUser: true,
    retryable: true,
    maxRetries: 3,
    recovery: async () => {
      console.log('🔧 尝试重新初始化音频系统...');
      // 这里可以添加音频系统重置逻辑
    }
  },

  [ErrorCode.AUDIO_SFX_FAILED]: {
    severity: ErrorSeverity.LOW,
    userMessage: '音效播放失败',
    shouldReport: false,
    shouldNotifyUser: false,
    retryable: false
  },

  [ErrorCode.AUDIO_BGM_FAILED]: {
    severity: ErrorSeverity.LOW,
    userMessage: '背景音乐播放失败',
    shouldReport: true,
    shouldNotifyUser: true,
    retryable: true,
    maxRetries: 2
  },

  // 游戏逻辑相关错误
  [ErrorCode.GAME_BOARD_INVALID]: {
    severity: ErrorSeverity.HIGH,
    userMessage: '游戏棋盘出现异常，正在重新初始化',
    shouldReport: true,
    shouldNotifyUser: true,
    retryable: true,
    maxRetries: 1,
    recovery: async () => {
      console.log('🔧 重新初始化游戏棋盘...');
      // 这里可以添加游戏重置逻辑
    }
  },

  [ErrorCode.GAME_STATE_CORRUPTED]: {
    severity: ErrorSeverity.CRITICAL,
    userMessage: '游戏状态损坏，建议刷新页面',
    shouldReport: true,
    shouldNotifyUser: true,
    retryable: false,
    recovery: async () => {
      if (confirm('游戏状态异常，是否重新加载页面？')) {
        window.location.reload();
      }
    }
  },

  // 网络相关错误
  [ErrorCode.RESOURCE_LOAD_FAILED]: {
    severity: ErrorSeverity.MEDIUM,
    userMessage: '资源加载失败，正在重试',
    shouldReport: true,
    shouldNotifyUser: true,
    retryable: true,
    maxRetries: 3
  },

  [ErrorCode.CDN_UNAVAILABLE]: {
    severity: ErrorSeverity.MEDIUM,
    userMessage: 'CDN服务不可用，切换到备用资源',
    shouldReport: true,
    shouldNotifyUser: true,
    retryable: true,
    maxRetries: 2
  },
  
  // 组件相关错误
  [ErrorCode.COMPONENT_ERROR]: {
    severity: ErrorSeverity.HIGH,
    userMessage: '组件出现错误，正在尝试恢复',
    shouldReport: true,
    shouldNotifyUser: true,
    retryable: true,
    maxRetries: 1
  },

  // 存储相关错误
  [ErrorCode.LOCAL_STORAGE_ERROR]: {
    severity: ErrorSeverity.MEDIUM,
    userMessage: '本地存储访问失败，设置可能无法保存',
    shouldReport: true,
    shouldNotifyUser: true,
    retryable: false
  },

  // 默认错误处理
  [ErrorCode.UNKNOWN_ERROR]: {
    severity: ErrorSeverity.MEDIUM,
    userMessage: '发生未知错误，请稍后重试',
    shouldReport: true,
    shouldNotifyUser: true,
    retryable: false
  },
  
  // 其他错误的默认策略
  [ErrorCode.AUDIO_CONTEXT_SUSPENDED]: {
    severity: ErrorSeverity.LOW,
    userMessage: '音频上下文被暂停',
    shouldReport: false,
    shouldNotifyUser: false,
    retryable: true
  },

  [ErrorCode.TILE_COORDINATES_INVALID]: {
    severity: ErrorSeverity.MEDIUM,
    userMessage: '方块坐标无效',
    shouldReport: true,
    shouldNotifyUser: false,
    retryable: false
  },

  [ErrorCode.MATCH_DETECTION_FAILED]: {
    severity: ErrorSeverity.HIGH,
    userMessage: '匹配检测失败',
    shouldReport: true,
    shouldNotifyUser: true,
    retryable: true
  },

  [ErrorCode.NETWORK_ERROR]: {
    severity: ErrorSeverity.MEDIUM,
    userMessage: '网络连接异常',
    shouldReport: true,
    shouldNotifyUser: true,
    retryable: true
  },

  [ErrorCode.RENDER_ERROR]: {
    severity: ErrorSeverity.HIGH,
    userMessage: '渲染错误',
    shouldReport: true,
    shouldNotifyUser: true,
    retryable: true
  },

  [ErrorCode.PROPS_VALIDATION_ERROR]: {
    severity: ErrorSeverity.MEDIUM,
    userMessage: '组件属性验证失败',
    shouldReport: true,
    shouldNotifyUser: false,
    retryable: false
  },

  [ErrorCode.DATA_CORRUPTION]: {
    severity: ErrorSeverity.CRITICAL,
    userMessage: '数据损坏',
    shouldReport: true,
    shouldNotifyUser: true,
    retryable: false
  },

  [ErrorCode.INITIALIZATION_ERROR]: {
    severity: ErrorSeverity.CRITICAL,
    userMessage: '初始化失败',
    shouldReport: true,
    shouldNotifyUser: true,
    retryable: true
  }
};

/**
 * 错误处理器单例类
 */
export class ErrorHandler {
  private static instance: ErrorHandler;
  private logger: Logger;
  private errorQueue: GameError[] = [];
  private retryCount: Map<string, number> = new Map();
  private userNotificationCallback?: (error: GameError, strategy: ErrorStrategy) => void;
  private errorReportingCallback?: (report: ErrorReport) => Promise<void>;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * 设置用户通知回调
   */
  setUserNotificationCallback(callback: (error: GameError, strategy: ErrorStrategy) => void): void {
    this.userNotificationCallback = callback;
  }

  /**
   * 设置错误上报回调
   */
  setErrorReportingCallback(callback: (report: ErrorReport) => Promise<void>): void {
    this.errorReportingCallback = callback;
  }

  /**
   * 处理错误的主要方法
   */
  async handleError(error: GameError): Promise<void> {
    try {
      // 记录错误
      this.logError(error);
      
      // 获取处理策略
      const strategy = this.getErrorStrategy(error.code);
      
      // 检查是否需要重试
      if (strategy.retryable && this.shouldRetry(error.code, strategy.maxRetries)) {
        await this.attemptRecovery(error, strategy);
        return;
      }
      
      // 通知用户
      if (strategy.shouldNotifyUser && this.userNotificationCallback) {
        this.userNotificationCallback(error, strategy);
      }
      
      // 上报错误
      if (strategy.shouldReport && this.errorReportingCallback) {
        const report = this.createErrorReport(error);
        await this.errorReportingCallback(report);
      }
      
      // 执行恢复策略
      if (strategy.recovery) {
        await strategy.recovery();
      }
      
    } catch (handlingError) {
      this.logger.error('错误处理过程中发生异常', handlingError);
      console.error('Error handling failed:', handlingError);
    }
  }

  /**
   * 记录错误
   */
  private logError(error: GameError): void {
    this.errorQueue.push(error);
    
    // 保持错误队列大小
    if (this.errorQueue.length > 100) {
      this.errorQueue.shift();
    }
    
    this.logger.error(
      `[${error.code}] ${error.message}`,
      {
        severity: error.severity,
        context: error.context,
        stack: error.stack
      },
      error.context.component
    );
  }

  /**
   * 获取错误处理策略
   */
  private getErrorStrategy(code: ErrorCode): ErrorStrategy {
    return ERROR_STRATEGIES[code] || ERROR_STRATEGIES.UNKNOWN_ERROR;
  }

  /**
   * 检查是否应该重试
   */
  private shouldRetry(errorCode: ErrorCode, maxRetries?: number): boolean {
    if (!maxRetries) return false;
    
    const currentRetries = this.retryCount.get(errorCode) || 0;
    return currentRetries < maxRetries;
  }

  /**
   * 尝试错误恢复
   */
  private async attemptRecovery(error: GameError, strategy: ErrorStrategy): Promise<void> {
    const currentRetries = this.retryCount.get(error.code) || 0;
    this.retryCount.set(error.code, currentRetries + 1);
    
    this.logger.info(`尝试恢复错误 ${error.code}，第 ${currentRetries + 1} 次重试`);
    
    if (strategy.recovery) {
      await strategy.recovery();
    }
  }

  /**
   * 创建错误报告
   */
  private createErrorReport(error: GameError): ErrorReport {
    return {
      errorCode: error.code,
      message: error.message,
      stack: error.stack,
      context: error.context,
      logs: this.logger.getRecentLogs(50),
      userAgent: navigator.userAgent,
      timestamp: Date.now(),
      buildVersion: import.meta.env.MODE,
      environment: import.meta.env.PROD ? 'production' : 'development'
    };
  }

  /**
   * 获取错误统计
   */
  getErrorStats(): {
    totalErrors: number;
    errorsByType: Map<ErrorCode, number>;
    total: number;
    bySeverity: Record<ErrorSeverity, number>
  } {
    const errorsByType = new Map<ErrorCode, number>();
    const bySeverity = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    } as Record<ErrorSeverity, number>;

    // 统计错误类型和严重性
    this.errorQueue.forEach(error => {
      // 统计错误类型
      const currentCount = errorsByType.get(error.code) || 0;
      errorsByType.set(error.code, currentCount + 1);

      // 统计严重性
      if (error.severity) {
        bySeverity[error.severity]++;
      }
    });

    return {
      totalErrors: this.errorQueue.length,
      errorsByType,
      total: this.errorQueue.length, // 向后兼容
      bySeverity
    };
  }

  /**
   * 清除重试计数
   */
  clearRetryCount(errorCode?: ErrorCode): void {
    if (errorCode) {
      this.retryCount.delete(errorCode);
    } else {
      this.retryCount.clear();
    }
  }

  /**
   * 获取最近的错误
   */
  getRecentErrors(count: number = 10): GameError[] {
    return this.errorQueue.slice(-count);
  }
}
