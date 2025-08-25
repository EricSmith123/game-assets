/**
 * 实时错误监控系统
 * 
 * 提供全面的错误捕获、分析、报告和自动恢复机制
 */


/**
 * 错误级别枚举
 */
export enum ErrorLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal'
}

/**
 * 错误类型枚举
 */
export enum ErrorType {
  JAVASCRIPT = 'javascript',
  NETWORK = 'network',
  RESOURCE = 'resource',
  PROMISE = 'promise',
  CUSTOM = 'custom',
  PERFORMANCE = 'performance',
  SECURITY = 'security'
}

/**
 * 错误信息接口
 */
export interface ErrorInfo {
  id: string
  timestamp: number
  level: ErrorLevel
  type: ErrorType
  message: string
  stack?: string
  url?: string
  line?: number
  column?: number
  userAgent: string
  userId?: string
  sessionId: string
  context: Record<string, any>
  fingerprint: string
  count: number
  firstSeen: number
  lastSeen: number
}

/**
 * 错误统计接口
 */
export interface ErrorStats {
  totalErrors: number
  errorsByLevel: Record<ErrorLevel, number>
  errorsByType: Record<ErrorType, number>
  errorRate: number
  topErrors: ErrorInfo[]
  recentErrors: ErrorInfo[]
}

/**
 * 监控配置接口
 */
export interface MonitorConfig {
  enabled: boolean
  maxErrors: number
  reportInterval: number
  enableAutoReport: boolean
  enableStackTrace: boolean
  enableUserContext: boolean
  enablePerformanceTracking: boolean
  ignorePatterns: RegExp[]
  reportEndpoint?: string
  apiKey?: string
}

/**
 * 实时错误监控器
 */
export class ErrorMonitor {
  private static instance: ErrorMonitor
  private config: MonitorConfig
  private errors = new Map<string, ErrorInfo>()
  private errorQueue: ErrorInfo[] = []
  private sessionId: string
  private reportTimer?: number
  private isInitialized = false
  private isCapturingError = false // 防止递归调用
  
  private constructor() {
    this.config = this.getDefaultConfig()
    this.sessionId = this.generateSessionId()
  }
  
  static getInstance(): ErrorMonitor {
    if (!ErrorMonitor.instance) {
      ErrorMonitor.instance = new ErrorMonitor()
    }
    return ErrorMonitor.instance
  }
  
  /**
   * 初始化错误监控
   */
  initialize(config?: Partial<MonitorConfig>): void {
    if (this.isInitialized) {
      console.warn('🔍 错误监控器已经初始化')
      return
    }
    
    if (config) {
      this.config = { ...this.config, ...config }
    }
    
    if (!this.config.enabled) {
      console.log('🔍 错误监控已禁用')
      return
    }
    
    this.setupErrorHandlers()
    this.startReporting()
    
    this.isInitialized = true
    console.log('🔍 实时错误监控器已初始化')
  }
  
  /**
   * 设置错误处理器
   */
  private setupErrorHandlers(): void {
    // JavaScript错误
    window.addEventListener('error', (event) => {
      this.captureError({
        type: ErrorType.JAVASCRIPT,
        level: ErrorLevel.ERROR,
        message: event.message,
        stack: event.error?.stack,
        url: event.filename,
        line: event.lineno,
        column: event.colno,
        context: {
          event: 'window.error',
          target: event.target?.tagName
        }
      })
    })
    
    // Promise拒绝错误
    window.addEventListener('unhandledrejection', (event) => {
      this.captureError({
        type: ErrorType.PROMISE,
        level: ErrorLevel.ERROR,
        message: event.reason?.message || String(event.reason),
        stack: event.reason?.stack,
        context: {
          event: 'unhandledrejection',
          reason: event.reason
        }
      })
    })
    
    // 资源加载错误
    window.addEventListener('error', (event) => {
      if (event.target !== window) {
        this.captureError({
          type: ErrorType.RESOURCE,
          level: ErrorLevel.WARN,
          message: `资源加载失败: ${(event.target as any)?.src || (event.target as any)?.href}`,
          url: (event.target as any)?.src || (event.target as any)?.href,
          context: {
            event: 'resource.error',
            tagName: (event.target as any)?.tagName,
            type: (event.target as any)?.type
          }
        })
      }
    }, true)
    
    // 网络错误监控
    this.setupNetworkErrorMonitoring()
    
    // 性能错误监控
    if (this.config.enablePerformanceTracking) {
      this.setupPerformanceErrorMonitoring()
    }
  }
  
  /**
   * 设置网络错误监控
   */
  private setupNetworkErrorMonitoring(): void {
    // 拦截fetch请求
    const originalFetch = window.fetch
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args)
        
        if (!response.ok) {
          this.captureError({
            type: ErrorType.NETWORK,
            level: response.status >= 500 ? ErrorLevel.ERROR : ErrorLevel.WARN,
            message: `网络请求失败: ${response.status} ${response.statusText}`,
            context: {
              url: args[0],
              status: response.status,
              statusText: response.statusText,
              method: (args[1] as any)?.method || 'GET'
            }
          })
        }
        
        return response
      } catch (error) {
        this.captureError({
          type: ErrorType.NETWORK,
          level: ErrorLevel.ERROR,
          message: `网络请求异常: ${error.message}`,
          stack: error.stack,
          context: {
            url: args[0],
            method: (args[1] as any)?.method || 'GET',
            error: error.name
          }
        })
        throw error
      }
    }
    
    // 拦截XMLHttpRequest
    const originalXHROpen = XMLHttpRequest.prototype.open
    const originalXHRSend = XMLHttpRequest.prototype.send
    
    XMLHttpRequest.prototype.open = function(method, url, ...args) {
      this._errorMonitorData = { method, url }
      return originalXHROpen.call(this, method, url, ...args)
    }
    
    XMLHttpRequest.prototype.send = function(...args) {
      this.addEventListener('error', () => {
        ErrorMonitor.getInstance().captureError({
          type: ErrorType.NETWORK,
          level: ErrorLevel.ERROR,
          message: `XMLHttpRequest错误: ${this._errorMonitorData?.url}`,
          context: {
            method: this._errorMonitorData?.method,
            url: this._errorMonitorData?.url,
            status: this.status,
            statusText: this.statusText
          }
        })
      })
      
      this.addEventListener('load', () => {
        if (this.status >= 400) {
          ErrorMonitor.getInstance().captureError({
            type: ErrorType.NETWORK,
            level: this.status >= 500 ? ErrorLevel.ERROR : ErrorLevel.WARN,
            message: `XMLHttpRequest失败: ${this.status} ${this.statusText}`,
            context: {
              method: this._errorMonitorData?.method,
              url: this._errorMonitorData?.url,
              status: this.status,
              statusText: this.statusText
            }
          })
        }
      })
      
      return originalXHRSend.call(this, ...args)
    }
  }
  
  /**
   * 设置性能错误监控
   */
  private setupPerformanceErrorMonitoring(): void {
    // 监控长任务
    if ('PerformanceObserver' in window && typeof PerformanceObserver === 'function') {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > 50) { // 超过50ms的长任务
              this.captureError({
                type: ErrorType.PERFORMANCE,
                level: ErrorLevel.WARN,
                message: `检测到长任务: ${entry.duration.toFixed(2)}ms`,
                context: {
                  duration: entry.duration,
                  startTime: entry.startTime,
                  name: entry.name,
                  entryType: entry.entryType
                }
              })
            }
          }
        })

        // 检查observer是否有observe方法
        if (typeof observer.observe === 'function') {
          observer.observe({ entryTypes: ['longtask'] })
        } else {
          console.warn('长任务监控不支持: observer.observe is not a function')
        }
      } catch (error) {
        console.warn('长任务监控不支持:', error)
      }
    }
    
    // 监控内存使用
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory
        const usedMB = memory.usedJSHeapSize / 1024 / 1024
        const limitMB = memory.jsHeapSizeLimit / 1024 / 1024
        const usagePercent = (usedMB / limitMB) * 100
        
        if (usagePercent > 80) {
          this.captureError({
            type: ErrorType.PERFORMANCE,
            level: usagePercent > 90 ? ErrorLevel.ERROR : ErrorLevel.WARN,
            message: `内存使用率过高: ${usagePercent.toFixed(1)}%`,
            context: {
              usedMB: usedMB.toFixed(2),
              limitMB: limitMB.toFixed(2),
              usagePercent: usagePercent.toFixed(1)
            }
          })
        }
      }, 30000) // 每30秒检查一次
    }
  }
  
  /**
   * 捕获错误
   */
  captureError(errorData: Partial<ErrorInfo>): void {
    if (!this.config.enabled) return

    // 防止递归调用
    if (this.isCapturingError) {
      console.warn('递归错误捕获被阻止:', errorData.message)
      return
    }

    this.isCapturingError = true

    try {
      const error: ErrorInfo = {
      id: this.generateErrorId(),
      timestamp: Date.now(),
      level: errorData.level || ErrorLevel.ERROR,
      type: errorData.type || ErrorType.CUSTOM,
      message: errorData.message || 'Unknown error',
      stack: errorData.stack,
      url: errorData.url || (typeof window !== 'undefined' && window.location ? window.location.href : 'unknown'),
      line: errorData.line,
      column: errorData.column,
      userAgent: navigator.userAgent,
      userId: this.getUserId(),
      sessionId: this.sessionId,
      context: {
        ...this.getGlobalContext(),
        ...errorData.context
      },
      fingerprint: this.generateFingerprint(errorData),
      count: 1,
      firstSeen: Date.now(),
      lastSeen: Date.now()
    }
    
    // 检查是否应该忽略此错误
    if (this.shouldIgnoreError(error)) {
      return
    }
    
    // 检查是否是重复错误
    const existingError = this.errors.get(error.fingerprint)
    if (existingError) {
      existingError.count++
      existingError.lastSeen = error.timestamp
      existingError.context = { ...existingError.context, ...error.context }
    } else {
      this.errors.set(error.fingerprint, error)
      this.errorQueue.push(error)
    }
    
    // 限制错误数量
    if (this.errors.size > this.config.maxErrors) {
      this.cleanupOldErrors()
    }
    
      // 立即报告严重错误
      if (error.level === ErrorLevel.FATAL || error.level === ErrorLevel.ERROR) {
        this.reportError(error)
      }

      console.error('🔍 错误已捕获:', error)
    } catch (captureError) {
      console.error('捕获错误时发生异常:', captureError)
    } finally {
      this.isCapturingError = false
    }
  }
  
  /**
   * 手动报告错误
   */
  reportError(error: Error | string, context?: Record<string, any>): void {
    const errorInfo = typeof error === 'string' 
      ? { message: error, context }
      : { 
          message: error.message, 
          stack: error.stack, 
          context: { ...context, name: error.name }
        }
    
    this.captureError({
      ...errorInfo,
      type: ErrorType.CUSTOM,
      level: ErrorLevel.ERROR
    })
  }
  
  /**
   * 获取错误统计
   */
  getErrorStats(): ErrorStats {
    const errors = Array.from(this.errors.values())
    
    const errorsByLevel = errors.reduce((acc, error) => {
      acc[error.level] = (acc[error.level] || 0) + error.count
      return acc
    }, {} as Record<ErrorLevel, number>)
    
    const errorsByType = errors.reduce((acc, error) => {
      acc[error.type] = (acc[error.type] || 0) + error.count
      return acc
    }, {} as Record<ErrorType, number>)
    
    const totalErrors = errors.reduce((sum, error) => sum + error.count, 0)
    const timeWindow = 3600000 // 1小时
    const recentErrors = errors.filter(error => 
      Date.now() - error.lastSeen < timeWindow
    )
    const errorRate = recentErrors.length / (timeWindow / 60000) // 每分钟错误数
    
    return {
      totalErrors,
      errorsByLevel,
      errorsByType,
      errorRate,
      topErrors: errors
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      recentErrors: errors
        .filter(error => Date.now() - error.lastSeen < 300000) // 最近5分钟
        .sort((a, b) => b.lastSeen - a.lastSeen)
        .slice(0, 20)
    }
  }
  
  /**
   * 清除错误记录
   */
  clearErrors(): void {
    this.errors.clear()
    this.errorQueue.length = 0
    console.log('🔍 错误记录已清除')
  }
  
  // 私有方法
  private getDefaultConfig(): MonitorConfig {
    return {
      enabled: true,
      maxErrors: 1000,
      reportInterval: 60000, // 1分钟
      enableAutoReport: true,
      enableStackTrace: true,
      enableUserContext: true,
      enablePerformanceTracking: true,
      ignorePatterns: [
        /Script error/,
        /Non-Error promise rejection captured/,
        /ResizeObserver loop limit exceeded/
      ]
    }
  }
  
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  
  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  
  private generateFingerprint(errorData: Partial<ErrorInfo>): string {
    const key = `${errorData.type}_${errorData.message}_${errorData.url}_${errorData.line}`
    try {
      // 使用encodeURIComponent处理特殊字符，然后进行base64编码
      const encodedKey = encodeURIComponent(key)
      return btoa(encodedKey).replace(/[^a-zA-Z0-9]/g, '').substr(0, 16)
    } catch (error) {
      // 如果btoa仍然失败，使用简单的哈希算法
      let hash = 0
      for (let i = 0; i < key.length; i++) {
        const char = key.charCodeAt(i)
        hash = ((hash << 5) - hash) + char
        hash = hash & hash // 转换为32位整数
      }
      return Math.abs(hash).toString(36).substr(0, 16)
    }
  }
  
  private getUserId(): string | undefined {
    // 从localStorage或其他地方获取用户ID
    return localStorage.getItem('userId') || undefined
  }
  
  private getGlobalContext(): Record<string, any> {
    return {
      url: typeof window !== 'undefined' && window.location ? window.location.href : 'unknown',
      referrer: typeof document !== 'undefined' ? document.referrer : 'unknown',
      timestamp: new Date().toISOString(),
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      screen: {
        width: typeof screen !== 'undefined' ? screen.width : 0,
        height: typeof screen !== 'undefined' ? screen.height : 0
      },
      connection: (navigator as any).connection ? {
        effectiveType: (navigator as any).connection.effectiveType,
        downlink: (navigator as any).connection.downlink
      } : undefined
    }
  }
  
  private shouldIgnoreError(error: ErrorInfo): boolean {
    return this.config.ignorePatterns.some(pattern => 
      pattern.test(error.message)
    )
  }
  
  private cleanupOldErrors(): void {
    const errors = Array.from(this.errors.entries())
    const sortedErrors = errors.sort((a, b) => a[1].lastSeen - b[1].lastSeen)
    const toRemove = sortedErrors.slice(0, Math.floor(this.config.maxErrors * 0.1))
    
    toRemove.forEach(([fingerprint]) => {
      this.errors.delete(fingerprint)
    })
  }
  
  private startReporting(): void {
    if (!this.config.enableAutoReport) return
    
    this.reportTimer = window.setInterval(() => {
      this.sendErrorReport()
    }, this.config.reportInterval)
  }
  
  private async sendErrorReport(): Promise<void> {
    if (this.errorQueue.length === 0) return
    
    const errors = [...this.errorQueue]
    this.errorQueue.length = 0
    
    try {
      if (this.config.reportEndpoint) {
        await fetch(this.config.reportEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
          },
          body: JSON.stringify({
            errors,
            stats: this.getErrorStats(),
            sessionId: this.sessionId,
            timestamp: Date.now()
          })
        })
      } else {
        // 本地存储或控制台输出
        console.group('🔍 错误报告')
        console.table(errors.map(e => ({
          时间: new Date(e.timestamp).toLocaleString(),
          级别: e.level,
          类型: e.type,
          消息: e.message,
          次数: e.count
        })))
        console.groupEnd()
      }
    } catch (error) {
      console.error('🔍 错误报告发送失败:', error)
    }
  }
  
  /**
   * 销毁监控器
   */
  destroy(): void {
    if (this.reportTimer) {
      clearInterval(this.reportTimer)
    }
    this.clearErrors()
    this.isInitialized = false
    console.log('🔍 错误监控器已销毁')
  }
}

// 导出单例实例
export const errorMonitor = ErrorMonitor.getInstance()

// 在开发环境中挂载到全局
if (import.meta.env.DEV) {
  (window as any).errorMonitor = errorMonitor
  console.log('🔍 错误监控器已挂载到 window.errorMonitor')
}
