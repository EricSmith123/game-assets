/**
 * 结构化日志系统
 * 支持分级日志、批量处理和生产环境优化
 */

import { LogLevel, type LogEntry } from '@/types/error';
import { environmentGuard } from './environmentGuard';
import { configManager } from './configManager';

/**
 * 日志配置接口
 */
interface LoggerConfig {
  enableConsoleOutput: boolean;
  enableDetailedLogs: boolean;
  maxLogEntries: number;
  logLevel: LogLevel;
  enableTimestamp: boolean;
  enableStackTrace: boolean;
}

/**
 * 日志格式化器
 */
class LogFormatter {
  static formatMessage(entry: LogEntry): string {
    const timestamp = new Date(entry.timestamp).toISOString();
    const level = Object.keys(LogLevel).find(key => LogLevel[key as keyof typeof LogLevel] === entry.level) || 'UNKNOWN';
    const component = entry.component ? `[${entry.component}]` : '';

    return `${timestamp} ${level.padEnd(5)} ${component} ${entry.message}`;
  }

  static formatConsoleMessage(entry: LogEntry): string {
    const time = new Date(entry.timestamp).toLocaleTimeString();
    const level = Object.keys(LogLevel).find(key => LogLevel[key as keyof typeof LogLevel] === entry.level) || 'UNKNOWN';
    const component = entry.component ? `[${entry.component}]` : '';

    return `${time} ${level} ${component} ${entry.message}`;
  }

  static getConsoleMethod(level: LogLevel): 'log' | 'info' | 'warn' | 'error' {
    switch (level) {
      case LogLevel.DEBUG:
        return 'log';
      case LogLevel.INFO:
        return 'info';
      case LogLevel.WARN:
        return 'warn';
      case LogLevel.ERROR:
        return 'error';
      default:
        return 'log';
    }
  }

  static getConsoleStyle(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG:
        return 'color: #888; font-size: 11px;';
      case LogLevel.INFO:
        return 'color: #2196F3; font-weight: bold;';
      case LogLevel.WARN:
        return 'color: #FF9800; font-weight: bold;';
      case LogLevel.ERROR:
        return 'color: #F44336; font-weight: bold; background: #ffebee; padding: 2px 4px;';
      default:
        return '';
    }
  }
}

/**
 * 日志系统单例类
 */
export class Logger {
  private static instance: Logger;
  private logs: LogEntry[] = [];
  private config: LoggerConfig;
  private correlationId: string;
  private logBuffer: LogEntry[] = [];
  private batchTimer: number | null = null;
  private readonly BATCH_SIZE = 10;
  private readonly BATCH_TIMEOUT = 1000;

  private constructor() {
    this.loadConfigFromManager();
    this.correlationId = this.generateCorrelationId();
    this.initializeLogger();
    this.subscribeToConfigChanges();
  }

  /**
   * 从配置管理器加载日志配置
   */
  private loadConfigFromManager(): void {
    const debugConfig = configManager.get('debug');
    const isProduction = environmentGuard.isProduction();

    this.config = {
      enableConsoleOutput: debugConfig.enableLogs,
      enableDetailedLogs: !isProduction,
      maxLogEntries: isProduction ? 500 : 1000,
      logLevel: this.parseLogLevel(debugConfig.logLevel),
      enableTimestamp: true,
      enableStackTrace: !isProduction
    };
  }

  /**
   * 解析日志级别
   */
  private parseLogLevel(level: string): LogLevel {
    switch (level.toLowerCase()) {
      case 'error': return LogLevel.ERROR;
      case 'warn': return LogLevel.WARN;
      case 'info': return LogLevel.INFO;
      case 'debug': return LogLevel.DEBUG;
      case 'verbose': return LogLevel.DEBUG; // 映射到DEBUG
      default: return LogLevel.INFO;
    }
  }

  /**
   * 订阅配置变更
   */
  private subscribeToConfigChanges(): void {
    configManager.subscribe('debug', (newConfig) => {
      this.updateLoggerConfig(newConfig);
    });
  }

  /**
   * 更新日志配置
   */
  private updateLoggerConfig(debugConfig: any): void {
    const oldLevel = this.config.logLevel;
    this.config.enableConsoleOutput = debugConfig.enableLogs;
    this.config.logLevel = this.parseLogLevel(debugConfig.logLevel);

    if (oldLevel !== this.config.logLevel) {
      this.info(`日志级别已更新: ${LogLevel[oldLevel]} -> ${LogLevel[this.config.logLevel]}`);
    }
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * 初始化日志系统
   */
  private initializeLogger(): void {
    if (this.config.enableConsoleOutput) {
      console.log(
        '%c🚀 Logger initialized',
        'color: #4CAF50; font-weight: bold; font-size: 12px;',
        {
          correlationId: this.correlationId,
          config: this.config
        }
      );
    }

    // 捕获未处理的错误
    window.addEventListener('error', (event) => {
      this.error('Uncaught Error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack
      }, 'Global');
    });

    // 捕获未处理的Promise拒绝
    window.addEventListener('unhandledrejection', (event) => {
      this.error('Unhandled Promise Rejection', {
        reason: event.reason,
        stack: event.reason?.stack
      }, 'Global');
    });
  }

  /**
   * 生成关联ID
   */
  private generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 记录日志的核心方法
   */
  private log(level: LogLevel, message: string, data?: any, component?: string): void {
    // 检查日志级别
    if (level < this.config.logLevel) {
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: Date.now(),
      component,
      data: this.config.enableDetailedLogs ? data : undefined,
      correlationId: this.correlationId
    };

    // 添加到日志队列
    this.logs.push(entry);

    // 保持日志数量限制
    if (this.logs.length > this.config.maxLogEntries) {
      this.logs.shift();
    }

    // 输出到控制台
    if (this.config.enableConsoleOutput) {
      this.outputToConsole(entry);
    }
  }

  /**
   * 输出到控制台
   */
  private outputToConsole(entry: LogEntry): void {
    const method = LogFormatter.getConsoleMethod(entry.level);
    const style = LogFormatter.getConsoleStyle(entry.level);
    const message = LogFormatter.formatConsoleMessage(entry);

    if (entry.data) {
      console[method](`%c${message}`, style, entry.data);
    } else {
      console[method](`%c${message}`, style);
    }
  }

  /**
   * Debug级别日志
   */
  debug(message: string, data?: any, component?: string): void {
    this.log(LogLevel.DEBUG, message, data, component);
  }

  /**
   * Info级别日志
   */
  info(message: string, data?: any, component?: string): void {
    this.log(LogLevel.INFO, message, data, component);
  }

  /**
   * Warning级别日志
   */
  warn(message: string, data?: any, component?: string): void {
    this.log(LogLevel.WARN, message, data, component);
  }

  /**
   * Error级别日志
   */
  error(message: string, data?: any, component?: string): void {
    this.log(LogLevel.ERROR, message, data, component);
  }

  /**
   * Verbose级别日志（映射到DEBUG）
   */
  verbose(message: string, data?: any, component?: string): void {
    this.log(LogLevel.DEBUG, message, data, component);
  }

  /**
   * 批量日志处理
   */
  group(name: string, callback: () => void): void {
    if (this.config.logLevel >= LogLevel.DEBUG && this.config.enableConsoleOutput) {
      console.group(name);
      callback();
      console.groupEnd();
    } else {
      callback();
    }
  }

  /**
   * 条件日志（仅在开发环境输出）
   */
  devLog(message: string, data?: any, component?: string): void {
    if (environmentGuard.isDevelopment()) {
      this.debug(message, data, component);
    }
  }

  /**
   * 性能日志（减少频率）
   */
  private performanceLogCount = 0;
  performanceLog(message: string, data?: any, component?: string): void {
    this.performanceLogCount++;
    // 每10次性能日志只输出1次
    if (this.performanceLogCount % 10 === 0) {
      this.verbose(`[Performance] ${message} (${this.performanceLogCount} calls)`, data, component);
    }
  }

  /**
   * 创建带组件上下文的日志记录器
   */
  createComponentLogger(componentName: string) {
    return {
      debug: (message: string, data?: any) => this.debug(message, data, componentName),
      info: (message: string, data?: any) => this.info(message, data, componentName),
      warn: (message: string, data?: any) => this.warn(message, data, componentName),
      error: (message: string, data?: any) => this.error(message, data, componentName)
    };
  }

  /**
   * 获取最近的日志
   */
  getRecentLogs(count: number = 50): LogEntry[] {
    return this.logs.slice(-count);
  }

  /**
   * 按级别过滤日志
   */
  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logs.filter(log => log.level === level);
  }

  /**
   * 按组件过滤日志
   */
  getLogsByComponent(component: string): LogEntry[] {
    return this.logs.filter(log => log.component === component);
  }

  /**
   * 按时间范围过滤日志
   */
  getLogsByTimeRange(startTime: number, endTime: number): LogEntry[] {
    return this.logs.filter(log => 
      log.timestamp >= startTime && log.timestamp <= endTime
    );
  }

  /**
   * 导出日志
   */
  exportLogs(format: 'json' | 'text' = 'json'): string {
    if (format === 'json') {
      return JSON.stringify(this.logs, null, 2);
    } else {
      return this.logs
        .map(entry => LogFormatter.formatMessage(entry))
        .join('\n');
    }
  }

  /**
   * 清除日志
   */
  clearLogs(): void {
    this.logs = [];
    this.info('日志已清除', undefined, 'Logger');
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.info('日志配置已更新', this.config, 'Logger');
  }

  /**
   * 获取日志统计
   */
  getLogStats(): {
    total: number;
    byLevel: Record<string, number>;
    byComponent: Record<string, number>;
    timeRange: { start: number; end: number };
  } {
    const stats = {
      total: this.logs.length,
      byLevel: {} as Record<string, number>,
      byComponent: {} as Record<string, number>,
      timeRange: {
        start: this.logs.length > 0 ? this.logs[0].timestamp : 0,
        end: this.logs.length > 0 ? this.logs[this.logs.length - 1].timestamp : 0
      }
    };

    this.logs.forEach(log => {
      // 按级别统计
      const levelName = Object.keys(LogLevel).find(key => LogLevel[key as keyof typeof LogLevel] === log.level) || 'UNKNOWN';
      stats.byLevel[levelName] = (stats.byLevel[levelName] || 0) + 1;

      // 按组件统计
      const component = log.component || 'Unknown';
      stats.byComponent[component] = (stats.byComponent[component] || 0) + 1;
    });

    return stats;
  }



  /**
   * 性能测量
   */
  measure(label: string, startMark: string, endMark: string, component?: string): void {
    try {
      // 检查mark是否存在
      const startMarks = performance.getEntriesByName(startMark, 'mark');
      const endMarks = performance.getEntriesByName(endMark, 'mark');

      if (startMarks.length === 0) {
        this.warn(`Performance measure failed: mark '${startMark}' does not exist`, null, component);
        return;
      }

      if (endMarks.length === 0) {
        this.warn(`Performance measure failed: mark '${endMark}' does not exist`, null, component);
        return;
      }

      performance.measure(label, startMark, endMark);
      const measure = performance.getEntriesByName(label)[0];
      this.info(`Performance Measure: ${label}`, {
        duration: measure.duration,
        startTime: measure.startTime
      }, component);
    } catch (error) {
      this.warn(`Performance measure failed: ${label}`, error, component);
    }
  }

  /**
   * 安全的性能标记
   */
  mark(name: string, component?: string): void {
    try {
      performance.mark(name);
      if (import.meta.env.DEV) {
        this.debug(`Performance mark set: ${name}`, null, component);
      }
    } catch (error) {
      this.warn(`Performance mark failed: ${name}`, error, component);
    }
  }

  /**
   * 清理性能标记
   */
  clearMarks(name?: string): void {
    try {
      if (name) {
        performance.clearMarks(name);
      } else {
        performance.clearMarks();
      }
    } catch (error) {
      this.warn('Performance marks clear failed', error);
    }
  }
}
