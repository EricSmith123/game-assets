/**
 * 生产环境安全的日志工具
 * 在开发环境提供完整日志功能，生产环境自动禁用
 */

interface LogLevel {
  DEBUG: 0;
  INFO: 1;
  WARN: 2;
  ERROR: 3;
}

const LOG_LEVELS: LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
} as const;

type LogLevelType = LogLevel[keyof LogLevel];

class ProductionLogger {
  private static instance: ProductionLogger;
  private isDevelopment: boolean;
  private minLogLevel: LogLevelType;

  private constructor() {
    this.isDevelopment = import.meta.env.DEV;
    this.minLogLevel = this.isDevelopment ? LOG_LEVELS.DEBUG : LOG_LEVELS.ERROR;
  }

  static getInstance(): ProductionLogger {
    if (!ProductionLogger.instance) {
      ProductionLogger.instance = new ProductionLogger();
    }
    return ProductionLogger.instance;
  }

  /**
   * 调试日志 - 仅开发环境
   */
  debug(message: string, ...args: any[]): void {
    if (this.shouldLog(LOG_LEVELS.DEBUG)) {
      console.log(`🐛 [DEBUG] ${message}`, ...args);
    }
  }

  /**
   * 信息日志 - 仅开发环境
   */
  info(message: string, ...args: any[]): void {
    if (this.shouldLog(LOG_LEVELS.INFO)) {
      console.log(`ℹ️ [INFO] ${message}`, ...args);
    }
  }

  /**
   * 警告日志 - 开发和生产环境
   */
  warn(message: string, ...args: any[]): void {
    if (this.shouldLog(LOG_LEVELS.WARN)) {
      console.warn(`⚠️ [WARN] ${message}`, ...args);
    }
  }

  /**
   * 错误日志 - 开发和生产环境
   */
  error(message: string, ...args: any[]): void {
    if (this.shouldLog(LOG_LEVELS.ERROR)) {
      console.error(`❌ [ERROR] ${message}`, ...args);
    }
  }

  /**
   * 游戏事件日志 - 仅开发环境，带特殊标识
   */
  game(message: string, ...args: any[]): void {
    if (this.shouldLog(LOG_LEVELS.DEBUG)) {
      console.log(`🎮 [GAME] ${message}`, ...args);
    }
  }

  /**
   * 性能日志 - 仅开发环境
   */
  perf(message: string, duration?: number, ...args: any[]): void {
    if (this.shouldLog(LOG_LEVELS.DEBUG)) {
      const perfMsg = duration !== undefined ? `${message} (${duration.toFixed(2)}ms)` : message;
      console.log(`⚡ [PERF] ${perfMsg}`, ...args);
    }
  }

  /**
   * 音频日志 - 仅开发环境
   */
  audio(message: string, ...args: any[]): void {
    if (this.shouldLog(LOG_LEVELS.DEBUG)) {
      console.log(`🎵 [AUDIO] ${message}`, ...args);
    }
  }

  private shouldLog(level: LogLevelType): boolean {
    return level >= this.minLogLevel;
  }

  /**
   * 设置日志级别（主要用于测试）
   */
  setLogLevel(level: LogLevelType): void {
    this.minLogLevel = level;
  }

  /**
   * 检查是否为开发环境
   */
  isDev(): boolean {
    return this.isDevelopment;
  }
}

// 导出单例实例
export const logger = ProductionLogger.getInstance();

// 导出日志级别常量
export { LOG_LEVELS };
export type { LogLevelType };

// 在开发环境挂载到全局，方便调试
if (import.meta.env.DEV) {
  (window as any).logger = logger;
  logger.info('生产环境安全日志工具已初始化');
}
