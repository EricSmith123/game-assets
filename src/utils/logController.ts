/**
 * 日志控制器
 * 管理日志输出频率，减少控制台噪音
 * 集成新的Logger系统
 */

import { Logger } from './logger';
import { configManager } from './configManager';

interface LogControlConfig {
  enableVerboseLogging: boolean;
  maxLogsPerSecond: number;
  batchSize: number;
  summaryOnly: boolean;
}

class LogController {
  private config: LogControlConfig = {
    enableVerboseLogging: false,
    maxLogsPerSecond: 10,
    batchSize: 100,
    summaryOnly: true
  };

  private logCounts = new Map<string, number>();
  private lastLogTime = new Map<string, number>();
  private batchedLogs = new Map<string, any[]>();
  private summaryTimers = new Map<string, number>();
  private logger: Logger;

  constructor() {
    this.logger = Logger.getInstance();
    this.loadConfigFromUrl();
    this.loadConfigFromManager();
  }

  /**
   * 从配置管理器加载配置
   */
  private loadConfigFromManager(): void {
    const debugConfig = configManager.get('debug');
    this.config.enableVerboseLogging = debugConfig.logLevel === 'verbose' || debugConfig.logLevel === 'debug';

    // 订阅配置变更
    configManager.subscribe('debug', (newConfig) => {
      this.config.enableVerboseLogging = newConfig.logLevel === 'verbose' || newConfig.logLevel === 'debug';
    });
  }

  /**
   * 从URL参数加载配置
   */
  private loadConfigFromUrl(): void {
    const urlParams = new URLSearchParams(window.location.search);
    
    if (urlParams.get('verboseLogs') === '1') {
      this.config.enableVerboseLogging = true;
    }
    
    if (urlParams.get('summaryOnly') === '0') {
      this.config.summaryOnly = false;
    }

    const maxLogs = urlParams.get('maxLogsPerSecond');
    if (maxLogs) {
      this.config.maxLogsPerSecond = parseInt(maxLogs, 10) || 10;
    }
  }

  /**
   * 检查是否应该输出日志
   */
  shouldLog(category: string): boolean {
    if (!import.meta.env.DEV) return false;
    if (this.config.enableVerboseLogging) return true;

    const now = Date.now();
    const lastTime = this.lastLogTime.get(category) || 0;
    const timeDiff = now - lastTime;

    // 限制每秒日志数量
    if (timeDiff < 1000 / this.config.maxLogsPerSecond) {
      return false;
    }

    this.lastLogTime.set(category, now);
    return true;
  }

  /**
   * 批量日志处理
   */
  batchLog(category: string, message: string, data?: any): void {
    if (!this.batchedLogs.has(category)) {
      this.batchedLogs.set(category, []);
    }

    const logs = this.batchedLogs.get(category)!;
    logs.push({ message, data, timestamp: Date.now() });

    // 达到批量大小时输出摘要
    if (logs.length >= this.config.batchSize) {
      this.flushBatchedLogs(category);
    }

    // 设置定时器，确保日志最终会被输出
    if (!this.summaryTimers.has(category)) {
      const timer = window.setTimeout(() => {
        this.flushBatchedLogs(category);
        this.summaryTimers.delete(category);
      }, 2000);
      this.summaryTimers.set(category, timer);
    }
  }

  /**
   * 输出批量日志摘要
   */
  private flushBatchedLogs(category: string): void {
    const logs = this.batchedLogs.get(category);
    if (!logs || logs.length === 0) return;

    if (this.config.summaryOnly) {
      // 只输出摘要
      this.logger.info(`📊 ${category} 批量操作摘要`, {
        总数: logs.length,
        时间范围: `${new Date(logs[0].timestamp).toLocaleTimeString()} - ${new Date(logs[logs.length - 1].timestamp).toLocaleTimeString()}`,
        首个操作: logs[0].message,
        最后操作: logs[logs.length - 1].message
      }, 'LogController');
    } else {
      // 输出所有日志
      this.logger.group(`📊 ${category} 批量操作详情 (${logs.length}条)`, () => {
        logs.forEach((log, index) => {
          if (index < 5 || index >= logs.length - 5) {
            this.logger.verbose(`[${index + 1}] ${log.message}`, log.data, 'LogController');
          } else if (index === 5) {
            this.logger.verbose(`... 省略 ${logs.length - 10} 条日志 ...`, undefined, 'LogController');
          }
        });
      });
    }

    // 清理
    this.batchedLogs.set(category, []);
  }

  /**
   * 计数日志
   */
  countLog(category: string, increment: number = 1): void {
    const current = this.logCounts.get(category) || 0;
    this.logCounts.set(category, current + increment);
  }

  /**
   * 输出计数摘要
   */
  printCountSummary(): void {
    if (this.logCounts.size === 0) return;

    this.logger.group('📊 日志计数摘要', () => {
      for (const [category, count] of this.logCounts.entries()) {
        this.logger.info(`${category}: ${count} 次`, undefined, 'LogController');
      }
    });

    // 清理计数
    this.logCounts.clear();
  }

  /**
   * 清理所有批量日志
   */
  flushAll(): void {
    for (const category of this.batchedLogs.keys()) {
      this.flushBatchedLogs(category);
    }

    // 清理定时器
    for (const timer of this.summaryTimers.values()) {
      clearTimeout(timer);
    }
    this.summaryTimers.clear();

    // 输出计数摘要
    this.printCountSummary();
  }

  /**
   * 重置控制器
   */
  reset(): void {
    this.logCounts.clear();
    this.lastLogTime.clear();
    this.batchedLogs.clear();
    
    for (const timer of this.summaryTimers.values()) {
      clearTimeout(timer);
    }
    this.summaryTimers.clear();
  }

  /**
   * 获取配置
   */
  getConfig(): LogControlConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<LogControlConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

// 创建全局实例
export const logController = new LogController();

// 在开发环境中挂载到全局
if (import.meta.env.DEV) {
  (window as any).logController = logController;
  console.log('📊 日志控制器已挂载到 window.logController');
}

// 页面卸载时清理
window.addEventListener('beforeunload', () => {
  logController.flushAll();
});

// 定期清理（每30秒）
setInterval(() => {
  logController.flushAll();
}, 30000);
