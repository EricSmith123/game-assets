/**
 * 错误处理组合式函数
 */

import { ref, reactive, type Ref } from 'vue';
import { ErrorHandler } from '@/utils/errorHandler';
import { Logger } from '@/utils/logger';
import type {
  GameError,
  ErrorStrategy,
  ErrorReport
} from '@/types/error';
import { ErrorCode, ErrorSeverity } from '@/types/error';

/**
 * 错误通知状态接口
 */
interface ErrorNotification {
  id: string;
  error: GameError;
  strategy: ErrorStrategy;
  timestamp: number;
  dismissed: boolean;
}

/**
 * 错误处理返回值接口
 */
interface UseErrorHandlerReturn {
  // 状态
  notifications: ErrorNotification[];
  isReporting: Ref<boolean>;
  
  // 方法
  handleError: (error: GameError) => Promise<void>;
  createError: (code: ErrorCode, message: string, context?: Partial<GameError['context']>) => GameError;
  dismissNotification: (id: string) => void;
  retryFromNotification: (id: string) => Promise<void>;
  reportFromNotification: (id: string) => Promise<void>;
  clearAllNotifications: () => void;
  
  // 工具方法
  wrapAsyncFunction: <T extends any[], R>(fn: (...args: T) => Promise<R>, errorCode: ErrorCode) => (...args: T) => Promise<R | undefined>;
  wrapSyncFunction: <T extends any[], R>(fn: (...args: T) => R, errorCode: ErrorCode) => (...args: T) => R | undefined;
  
  // 统计信息
  getErrorStats: () => ReturnType<ErrorHandler['getErrorStats']>;
}

/**
 * 错误处理组合式函数
 */
export function useErrorHandler(): UseErrorHandlerReturn {
  const errorHandler = ErrorHandler.getInstance();
  const logger = Logger.getInstance();
  
  // 状态管理
  const notifications = reactive<ErrorNotification[]>([]);
  const isReporting = ref(false);
  
  // 生成通知ID
  const generateNotificationId = (): string => {
    return `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };
  
  // 设置错误处理器回调
  errorHandler.setUserNotificationCallback((error: GameError, strategy: ErrorStrategy) => {
    const notification: ErrorNotification = {
      id: generateNotificationId(),
      error,
      strategy,
      timestamp: Date.now(),
      dismissed: false
    };
    
    notifications.push(notification);
    
    // 自动清理旧通知
    if (notifications.length > 5) {
      notifications.splice(0, notifications.length - 5);
    }
    
    logger.info('创建错误通知', { 
      notificationId: notification.id,
      errorCode: error.code,
      severity: error.severity 
    }, 'ErrorHandler');
  });
  
  errorHandler.setErrorReportingCallback(async (report: ErrorReport) => {
    isReporting.value = true;
    
    try {
      // 这里可以集成实际的错误上报服务
      // 例如：Sentry, LogRocket, 自定义API等
      
      logger.info('错误报告已生成', {
        errorCode: report.errorCode,
        timestamp: report.timestamp,
        environment: report.environment
      }, 'ErrorHandler');
      
      // 模拟上报过程
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 在开发环境中，将报告输出到控制台
      if (import.meta.env.DEV) {
        console.group('🚨 错误报告');
        console.log('错误代码:', report.errorCode);
        console.log('错误消息:', report.message);
        console.log('发生时间:', new Date(report.timestamp).toLocaleString());
        console.log('环境:', report.environment);
        console.log('用户代理:', report.userAgent);
        if (report.stack) {
          console.log('堆栈信息:', report.stack);
        }
        console.log('上下文:', report.context);
        console.log('最近日志:', report.logs.slice(-10));
        console.groupEnd();
      }
      
    } catch (reportingError) {
      logger.error('错误上报失败', reportingError, 'ErrorHandler');
    } finally {
      isReporting.value = false;
    }
  });
  
  /**
   * 处理错误的主要方法
   */
  const handleError = async (error: GameError): Promise<void> => {
    await errorHandler.handleError(error);
  };
  
  /**
   * 创建标准化的错误对象
   */
  const createError = (
    code: ErrorCode, 
    message: string, 
    context: Partial<GameError['context']> = {}
  ): GameError => {
    const baseContext = {
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      ...context
    };
    
    // 根据错误代码确定严重程度
    let severity: ErrorSeverity = ErrorSeverity.MEDIUM;
    if (code.includes('CRITICAL') || code.includes('CORRUPTED')) {
      severity = ErrorSeverity.CRITICAL;
    } else if (code.includes('FAILED') || code.includes('ERROR')) {
      severity = ErrorSeverity.HIGH;
    } else if (code.includes('WARNING') || code.includes('SFX')) {
      severity = ErrorSeverity.LOW;
    }
    
    return {
      code,
      message,
      severity,
      context: baseContext,
      recoverable: severity !== ErrorSeverity.CRITICAL
    };
  };
  
  /**
   * 关闭通知
   */
  const dismissNotification = (id: string): void => {
    const index = notifications.findIndex(n => n.id === id);
    if (index !== -1) {
      notifications[index].dismissed = true;
      setTimeout(() => {
        const currentIndex = notifications.findIndex(n => n.id === id);
        if (currentIndex !== -1) {
          notifications.splice(currentIndex, 1);
        }
      }, 300); // 等待动画完成
    }
  };
  
  /**
   * 从通知重试
   */
  const retryFromNotification = async (id: string): Promise<void> => {
    const notification = notifications.find(n => n.id === id);
    if (!notification) return;
    
    logger.info('从通知重试错误', { 
      notificationId: id,
      errorCode: notification.error.code 
    }, 'ErrorHandler');
    
    // 清除重试计数，允许重新尝试
    errorHandler.clearRetryCount(notification.error.code);
    
    // 重新处理错误
    await handleError(notification.error);
    
    // 关闭当前通知
    dismissNotification(id);
  };
  
  /**
   * 从通知报告错误
   */
  const reportFromNotification = async (id: string): Promise<void> => {
    const notification = notifications.find(n => n.id === id);
    if (!notification) return;
    
    logger.info('从通知报告错误', { 
      notificationId: id,
      errorCode: notification.error.code 
    }, 'ErrorHandler');
    
    // 强制上报错误
    if (errorHandler['errorReportingCallback']) {
      const report = errorHandler['createErrorReport'](notification.error);
      await errorHandler['errorReportingCallback'](report);
    }
  };
  
  /**
   * 清除所有通知
   */
  const clearAllNotifications = (): void => {
    notifications.forEach(notification => {
      notification.dismissed = true;
    });
    
    setTimeout(() => {
      notifications.splice(0);
    }, 300);
  };
  
  /**
   * 包装异步函数以自动处理错误
   */
  const wrapAsyncFunction = <T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    errorCode: ErrorCode
  ) => {
    return async (...args: T): Promise<R | undefined> => {
      try {
        return await fn(...args);
      } catch (error) {
        const gameError = createError(
          errorCode,
          error instanceof Error ? error.message : String(error),
          {
            component: 'WrappedAsyncFunction',
            action: fn.name || 'anonymous',
            additionalData: { args }
          }
        );
        
        if (error instanceof Error) {
          gameError.originalError = error;
          gameError.stack = error.stack;
        }
        
        await handleError(gameError);
        return undefined;
      }
    };
  };
  
  /**
   * 包装同步函数以自动处理错误
   */
  const wrapSyncFunction = <T extends any[], R>(
    fn: (...args: T) => R,
    errorCode: ErrorCode
  ) => {
    return (...args: T): R | undefined => {
      try {
        return fn(...args);
      } catch (error) {
        const gameError = createError(
          errorCode,
          error instanceof Error ? error.message : String(error),
          {
            component: 'WrappedSyncFunction',
            action: fn.name || 'anonymous',
            additionalData: { args }
          }
        );
        
        if (error instanceof Error) {
          gameError.originalError = error;
          gameError.stack = error.stack;
        }
        
        // 同步处理错误（不等待）
        handleError(gameError);
        return undefined;
      }
    };
  };
  
  /**
   * 获取错误统计
   */
  const getErrorStats = () => {
    return errorHandler.getErrorStats();
  };
  
  return {
    // 状态
    notifications,
    isReporting,
    
    // 方法
    handleError,
    createError,
    dismissNotification,
    retryFromNotification,
    reportFromNotification,
    clearAllNotifications,
    
    // 工具方法
    wrapAsyncFunction,
    wrapSyncFunction,
    
    // 统计信息
    getErrorStats
  };
}
