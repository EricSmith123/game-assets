/**
 * 结构化日志记录系统
 * 
 * 提供统一的日志格式、多级别日志、日志聚合和分析功能
 */

/**
 * 日志级别枚举
 */
export enum LogLevel {
  TRACE = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
  FATAL = 5
}

/**
 * 日志类型枚举
 */
export enum LogType {
  APPLICATION = 'application',
  SECURITY = 'security',
  PERFORMANCE = 'performance',
  USER_ACTION = 'user_action',
  SYSTEM = 'system',
  BUSINESS = 'business',
  AUDIT = 'audit'
}

/**
 * 日志条目接口
 */
export interface LogEntry {
  id: string
  timestamp: number
  level: LogLevel
  type: LogType
  message: string
  context: Record<string, any>
  metadata: {
    source: string
    userId?: string
    sessionId?: string
    requestId?: string
    userAgent?: string
    ip?: string
    environment: string
    version: string
  }
  tags: string[]
  stack?: string
  duration?: number
}

/**
 * 日志配置接口
 */
export interface LoggerConfig {
  level: LogLevel
  enableConsole: boolean
  enableFile: boolean
  enableRemote: boolean
  maxFileSize: number
  maxFiles: number
  remoteEndpoint?: string
  apiKey?: string
  bufferSize: number
  flushInterval: number
  enableStructuredOutput: boolean
  enableColorOutput: boolean
}

/**
 * 日志输出器接口
 */
export interface LogOutput {
  write(entry: LogEntry): Promise<void>
  flush(): Promise<void>
  close(): Promise<void>
}

/**
 * 控制台输出器
 */
export class ConsoleOutput implements LogOutput {
  private enableColors: boolean
  
  constructor(enableColors = true) {
    this.enableColors = enableColors
  }
  
  async write(entry: LogEntry): Promise<void> {
    const formatted = this.formatEntry(entry)
    
    switch (entry.level) {
      case LogLevel.TRACE:
      case LogLevel.DEBUG:
        console.debug(formatted)
        break
      case LogLevel.INFO:
        console.info(formatted)
        break
      case LogLevel.WARN:
        console.warn(formatted)
        break
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(formatted)
        break
    }
  }
  
  async flush(): Promise<void> {
    // Console output is immediate
  }
  
  async close(): Promise<void> {
    // Nothing to close for console
  }
  
  private formatEntry(entry: LogEntry): string {
    const timestamp = new Date(entry.timestamp).toISOString()
    const level = LogLevel[entry.level].padEnd(5)
    const type = entry.type.padEnd(12)
    
    let formatted = `[${timestamp}] ${level} [${type}] ${entry.message}`
    
    if (Object.keys(entry.context).length > 0) {
      formatted += ` | ${JSON.stringify(entry.context)}`
    }
    
    if (entry.tags.length > 0) {
      formatted += ` | tags: ${entry.tags.join(', ')}`
    }
    
    if (entry.stack) {
      formatted += `\n${entry.stack}`
    }
    
    return this.enableColors ? this.colorize(formatted, entry.level) : formatted
  }
  
  private colorize(text: string, level: LogLevel): string {
    const colors = {
      [LogLevel.TRACE]: '\x1b[90m',    // Gray
      [LogLevel.DEBUG]: '\x1b[36m',    // Cyan
      [LogLevel.INFO]: '\x1b[32m',     // Green
      [LogLevel.WARN]: '\x1b[33m',     // Yellow
      [LogLevel.ERROR]: '\x1b[31m',    // Red
      [LogLevel.FATAL]: '\x1b[35m'     // Magenta
    }
    
    const reset = '\x1b[0m'
    return `${colors[level]}${text}${reset}`
  }
}

/**
 * 文件输出器
 */
export class FileOutput implements LogOutput {
  private filePath: string
  private maxFileSize: number
  private maxFiles: number
  private currentSize = 0
  
  constructor(filePath: string, maxFileSize = 10 * 1024 * 1024, maxFiles = 5) {
    this.filePath = filePath
    this.maxFileSize = maxFileSize
    this.maxFiles = maxFiles
    this.ensureDirectory()
  }
  
  async write(entry: LogEntry): Promise<void> {
    const formatted = JSON.stringify(entry) + '\n'
    
    // Check if rotation is needed
    if (this.currentSize + formatted.length > this.maxFileSize) {
      await this.rotateFile()
    }
    
    // Write to file (simplified - in real implementation use fs.promises)
    this.currentSize += formatted.length
  }
  
  async flush(): Promise<void> {
    // Flush file buffer
  }
  
  async close(): Promise<void> {
    // Close file handle
  }
  
  private ensureDirectory(): void {
    // Ensure log directory exists
  }
  
  private async rotateFile(): Promise<void> {
    // Implement file rotation logic
    this.currentSize = 0
  }
}

/**
 * 远程输出器
 */
export class RemoteOutput implements LogOutput {
  private endpoint: string
  private apiKey?: string
  private buffer: LogEntry[] = []
  private bufferSize: number
  
  constructor(endpoint: string, apiKey?: string, bufferSize = 100) {
    this.endpoint = endpoint
    this.apiKey = apiKey
    this.bufferSize = bufferSize
  }
  
  async write(entry: LogEntry): Promise<void> {
    this.buffer.push(entry)
    
    if (this.buffer.length >= this.bufferSize) {
      await this.flush()
    }
  }
  
  async flush(): Promise<void> {
    if (this.buffer.length === 0) return
    
    const entries = [...this.buffer]
    this.buffer = []
    
    try {
      await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` })
        },
        body: JSON.stringify({ entries })
      })
    } catch (error) {
      console.error('Failed to send logs to remote endpoint:', error)
      // Re-add entries to buffer for retry
      this.buffer.unshift(...entries)
    }
  }
  
  async close(): Promise<void> {
    await this.flush()
  }
}

/**
 * 结构化日志记录器
 */
export class StructuredLogger {
  private static instance: StructuredLogger
  private config: LoggerConfig
  private outputs: LogOutput[] = []
  private buffer: LogEntry[] = []
  private flushTimer?: number
  private sessionId: string
  private requestId?: string
  
  private constructor() {
    this.config = this.getDefaultConfig()
    this.sessionId = this.generateSessionId()
    this.setupOutputs()
    this.startFlushTimer()
  }
  
  static getInstance(): StructuredLogger {
    if (!StructuredLogger.instance) {
      StructuredLogger.instance = new StructuredLogger()
    }
    return StructuredLogger.instance
  }
  
  /**
   * 配置日志记录器
   */
  configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config }
    this.setupOutputs()
  }
  
  /**
   * 设置请求ID
   */
  setRequestId(requestId: string): void {
    this.requestId = requestId
  }
  
  /**
   * 记录日志
   */
  log(
    level: LogLevel,
    type: LogType,
    message: string,
    context: Record<string, any> = {},
    tags: string[] = []
  ): void {
    if (level < this.config.level) {
      return
    }
    
    const entry: LogEntry = {
      id: this.generateLogId(),
      timestamp: Date.now(),
      level,
      type,
      message,
      context,
      metadata: this.getMetadata(),
      tags,
      stack: level >= LogLevel.ERROR ? this.getStackTrace() : undefined
    }
    
    this.writeEntry(entry)
  }
  
  /**
   * 便捷方法
   */
  trace(message: string, context?: Record<string, any>, tags?: string[]): void {
    this.log(LogLevel.TRACE, LogType.APPLICATION, message, context, tags)
  }
  
  debug(message: string, context?: Record<string, any>, tags?: string[]): void {
    this.log(LogLevel.DEBUG, LogType.APPLICATION, message, context, tags)
  }
  
  info(message: string, context?: Record<string, any>, tags?: string[]): void {
    this.log(LogLevel.INFO, LogType.APPLICATION, message, context, tags)
  }
  
  warn(message: string, context?: Record<string, any>, tags?: string[]): void {
    this.log(LogLevel.WARN, LogType.APPLICATION, message, context, tags)
  }
  
  error(message: string, context?: Record<string, any>, tags?: string[]): void {
    this.log(LogLevel.ERROR, LogType.APPLICATION, message, context, tags)
  }
  
  fatal(message: string, context?: Record<string, any>, tags?: string[]): void {
    this.log(LogLevel.FATAL, LogType.APPLICATION, message, context, tags)
  }
  
  /**
   * 特定类型的日志方法
   */
  security(level: LogLevel, message: string, context?: Record<string, any>): void {
    this.log(level, LogType.SECURITY, message, context, ['security'])
  }
  
  performance(message: string, duration: number, context?: Record<string, any>): void {
    const entry: LogEntry = {
      id: this.generateLogId(),
      timestamp: Date.now(),
      level: LogLevel.INFO,
      type: LogType.PERFORMANCE,
      message,
      context: { ...context, duration },
      metadata: this.getMetadata(),
      tags: ['performance'],
      duration
    }
    
    this.writeEntry(entry)
  }
  
  userAction(action: string, userId: string, context?: Record<string, any>): void {
    this.log(LogLevel.INFO, LogType.USER_ACTION, action, {
      ...context,
      userId
    }, ['user-action'])
  }
  
  audit(action: string, userId: string, resource: string, context?: Record<string, any>): void {
    this.log(LogLevel.INFO, LogType.AUDIT, action, {
      ...context,
      userId,
      resource,
      timestamp: new Date().toISOString()
    }, ['audit'])
  }
  
  /**
   * 批量日志记录
   */
  batch(entries: Array<{
    level: LogLevel
    type: LogType
    message: string
    context?: Record<string, any>
    tags?: string[]
  }>): void {
    entries.forEach(entry => {
      this.log(entry.level, entry.type, entry.message, entry.context, entry.tags)
    })
  }
  
  /**
   * 获取日志统计
   */
  getStats(): {
    totalLogs: number
    logsByLevel: Record<LogLevel, number>
    logsByType: Record<LogType, number>
    bufferSize: number
  } {
    const logsByLevel = {} as Record<LogLevel, number>
    const logsByType = {} as Record<LogType, number>
    
    this.buffer.forEach(entry => {
      logsByLevel[entry.level] = (logsByLevel[entry.level] || 0) + 1
      logsByType[entry.type] = (logsByType[entry.type] || 0) + 1
    })
    
    return {
      totalLogs: this.buffer.length,
      logsByLevel,
      logsByType,
      bufferSize: this.buffer.length
    }
  }
  
  /**
   * 搜索日志
   */
  search(query: {
    level?: LogLevel
    type?: LogType
    message?: string
    tags?: string[]
    startTime?: number
    endTime?: number
  }): LogEntry[] {
    return this.buffer.filter(entry => {
      if (query.level !== undefined && entry.level !== query.level) return false
      if (query.type && entry.type !== query.type) return false
      if (query.message && !entry.message.includes(query.message)) return false
      if (query.tags && !query.tags.every(tag => entry.tags.includes(tag))) return false
      if (query.startTime && entry.timestamp < query.startTime) return false
      if (query.endTime && entry.timestamp > query.endTime) return false
      return true
    })
  }
  
  /**
   * 手动刷新日志
   */
  async flush(): Promise<void> {
    const flushPromises = this.outputs.map(output => output.flush())
    await Promise.all(flushPromises)
  }
  
  /**
   * 关闭日志记录器
   */
  async close(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
    }
    
    await this.flush()
    
    const closePromises = this.outputs.map(output => output.close())
    await Promise.all(closePromises)
  }
  
  // 私有方法
  private writeEntry(entry: LogEntry): void {
    this.buffer.push(entry)

    // 通知日志分析器
    if (typeof window !== 'undefined' && (window as any).logAnalyzer) {
      (window as any).logAnalyzer.addLogEntry(entry)
    }

    // Write to all outputs
    this.outputs.forEach(output => {
      output.write(entry).catch(error => {
        console.error('Failed to write log entry:', error)
      })
    })

    // Limit buffer size
    if (this.buffer.length > 1000) {
      this.buffer.shift()
    }
  }

  /**
   * 清理所有数据（用于测试）
   */
  clearAllData(): void {
    this.buffer = []
  }
  
  private setupOutputs(): void {
    this.outputs = []
    
    if (this.config.enableConsole) {
      this.outputs.push(new ConsoleOutput(this.config.enableColorOutput))
    }
    
    if (this.config.enableFile) {
      this.outputs.push(new FileOutput('./logs/app.log', this.config.maxFileSize, this.config.maxFiles))
    }
    
    if (this.config.enableRemote && this.config.remoteEndpoint) {
      this.outputs.push(new RemoteOutput(
        this.config.remoteEndpoint,
        this.config.apiKey,
        this.config.bufferSize
      ))
    }
  }
  
  private startFlushTimer(): void {
    this.flushTimer = window.setInterval(() => {
      this.flush().catch(error => {
        console.error('Failed to flush logs:', error)
      })
    }, this.config.flushInterval)
  }
  
  private getMetadata(): LogEntry['metadata'] {
    return {
      source: 'web-app',
      userId: this.getUserId(),
      sessionId: this.sessionId,
      requestId: this.requestId,
      userAgent: navigator.userAgent,
      ip: this.getClientIP(),
      environment: import.meta.env.MODE || 'development',
      version: import.meta.env.VITE_APP_VERSION || '1.0.0'
    }
  }
  
  private getUserId(): string | undefined {
    return localStorage.getItem('userId') || undefined
  }
  
  private getClientIP(): string | undefined {
    // In a real implementation, this would be set by the server
    return undefined
  }
  
  private getStackTrace(): string {
    const error = new Error()
    return error.stack || ''
  }
  
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  
  private generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  
  private getDefaultConfig(): LoggerConfig {
    return {
      level: LogLevel.INFO,
      enableConsole: true,
      enableFile: false,
      enableRemote: false,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      bufferSize: 100,
      flushInterval: 30000, // 30 seconds
      enableStructuredOutput: true,
      enableColorOutput: true
    }
  }
}

// 导出单例实例和便捷函数
export const logger = StructuredLogger.getInstance()

// 便捷的全局日志函数
export const log = {
  trace: (message: string, context?: Record<string, any>, tags?: string[]) => 
    logger.trace(message, context, tags),
  debug: (message: string, context?: Record<string, any>, tags?: string[]) => 
    logger.debug(message, context, tags),
  info: (message: string, context?: Record<string, any>, tags?: string[]) => 
    logger.info(message, context, tags),
  warn: (message: string, context?: Record<string, any>, tags?: string[]) => 
    logger.warn(message, context, tags),
  error: (message: string, context?: Record<string, any>, tags?: string[]) => 
    logger.error(message, context, tags),
  fatal: (message: string, context?: Record<string, any>, tags?: string[]) => 
    logger.fatal(message, context, tags),
  security: (level: LogLevel, message: string, context?: Record<string, any>) => 
    logger.security(level, message, context),
  performance: (message: string, duration: number, context?: Record<string, any>) => 
    logger.performance(message, duration, context),
  userAction: (action: string, userId: string, context?: Record<string, any>) => 
    logger.userAction(action, userId, context),
  audit: (action: string, userId: string, resource: string, context?: Record<string, any>) => 
    logger.audit(action, userId, resource, context)
}

// 在开发环境中挂载到全局
if (import.meta.env.DEV) {
  (window as any).logger = logger
  console.log('📝 结构化日志记录器已挂载到 window.logger')
}
