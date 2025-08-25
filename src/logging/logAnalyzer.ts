/**
 * 日志分析平台
 * 
 * 提供日志聚合、分析、可视化和智能告警功能
 */

import { LogEntry, LogLevel, LogType } from './structuredLogger'

/**
 * 日志分析配置
 */
export interface LogAnalysisConfig {
  aggregationInterval: number // 聚合间隔（毫秒）
  retentionPeriod: number     // 数据保留期（毫秒）
  alertThresholds: {
    errorRate: number         // 错误率阈值
    warningRate: number       // 警告率阈值
    responseTime: number      // 响应时间阈值
  }
  enableRealTimeAnalysis: boolean
  enablePatternDetection: boolean
  enableAnomalyDetection: boolean
}

/**
 * 日志聚合数据
 */
export interface LogAggregation {
  timestamp: number
  interval: number
  counts: {
    total: number
    byLevel: Record<LogLevel, number>
    byType: Record<LogType, number>
  }
  metrics: {
    errorRate: number
    warningRate: number
    averageResponseTime: number
    uniqueUsers: number
    uniqueSessions: number
  }
  topErrors: Array<{
    message: string
    count: number
    lastSeen: number
  }>
  patterns: Array<{
    pattern: string
    count: number
    confidence: number
  }>
}

/**
 * 日志模式
 */
export interface LogPattern {
  id: string
  pattern: RegExp
  name: string
  description: string
  severity: LogLevel
  count: number
  lastMatch: number
  examples: LogEntry[]
}

/**
 * 异常检测结果
 */
export interface AnomalyDetection {
  timestamp: number
  type: 'spike' | 'drop' | 'pattern' | 'threshold'
  metric: string
  value: number
  expected: number
  deviation: number
  confidence: number
  description: string
}

/**
 * 日志分析器
 */
export class LogAnalyzer {
  private static instance: LogAnalyzer
  private config: LogAnalysisConfig
  private logBuffer: LogEntry[] = []
  private aggregations: LogAggregation[] = []
  private patterns: Map<string, LogPattern> = new Map()
  private anomalies: AnomalyDetection[] = []
  private analysisTimer?: number
  private isAnalyzing = false
  
  private constructor() {
    this.config = this.getDefaultConfig()
    this.initializePatterns()
    this.startAnalysis()
  }
  
  static getInstance(): LogAnalyzer {
    if (!LogAnalyzer.instance) {
      LogAnalyzer.instance = new LogAnalyzer()
    }
    return LogAnalyzer.instance
  }
  
  /**
   * 配置分析器
   */
  configure(config: Partial<LogAnalysisConfig>): void {
    this.config = { ...this.config, ...config }
    this.restartAnalysis()
  }
  
  /**
   * 添加日志条目进行分析
   */
  addLogEntry(entry: LogEntry): void {
    this.logBuffer.push(entry)

    // 实时分析
    if (this.config.enableRealTimeAnalysis) {
      this.performRealTimeAnalysis(entry)
    }

    // 限制缓冲区大小
    if (this.logBuffer.length > 10000) {
      this.logBuffer.shift()
    }
  }

  /**
   * 清理所有数据（用于测试）
   */
  clearAllData(): void {
    this.logBuffer = []
    this.aggregations = []
    this.patterns.clear()
    this.anomalies = []
    this.initializePatterns()
  }
  
  /**
   * 批量添加日志条目
   */
  addLogEntries(entries: LogEntry[]): void {
    entries.forEach(entry => this.addLogEntry(entry))
  }
  
  /**
   * 获取日志聚合数据
   */
  getAggregations(startTime?: number, endTime?: number): LogAggregation[] {
    let filtered = this.aggregations
    
    if (startTime) {
      filtered = filtered.filter(agg => agg.timestamp >= startTime)
    }
    
    if (endTime) {
      filtered = filtered.filter(agg => agg.timestamp <= endTime)
    }
    
    return filtered.sort((a, b) => b.timestamp - a.timestamp)
  }
  
  /**
   * 获取最新聚合数据
   */
  getLatestAggregation(): LogAggregation | null {
    return this.aggregations.length > 0 ? this.aggregations[this.aggregations.length - 1] : null
  }
  
  /**
   * 搜索日志
   */
  searchLogs(query: {
    level?: LogLevel
    type?: LogType
    message?: string
    userId?: string
    sessionId?: string
    tags?: string[]
    startTime?: number
    endTime?: number
    limit?: number
  }): LogEntry[] {
    let results = this.logBuffer.filter(entry => {
      if (query.level !== undefined && entry.level !== query.level) return false
      if (query.type && entry.type !== query.type) return false
      if (query.message && !entry.message.toLowerCase().includes(query.message.toLowerCase())) return false
      if (query.userId && entry.metadata.userId !== query.userId) return false
      if (query.sessionId && entry.metadata.sessionId !== query.sessionId) return false
      if (query.tags && !query.tags.every(tag => entry.tags.includes(tag))) return false
      if (query.startTime && entry.timestamp < query.startTime) return false
      if (query.endTime && entry.timestamp > query.endTime) return false
      return true
    })
    
    // 按时间倒序排列
    results.sort((a, b) => b.timestamp - a.timestamp)
    
    // 限制结果数量
    if (query.limit) {
      results = results.slice(0, query.limit)
    }
    
    return results
  }
  
  /**
   * 获取错误趋势
   */
  getErrorTrend(timeWindow = 3600000): Array<{ timestamp: number; count: number }> {
    const now = Date.now()
    const startTime = now - timeWindow
    
    const errorLogs = this.logBuffer.filter(entry => 
      entry.level >= LogLevel.ERROR && entry.timestamp >= startTime
    )
    
    // 按小时分组
    const hourlyGroups = new Map<number, number>()
    
    errorLogs.forEach(entry => {
      const hour = Math.floor(entry.timestamp / 3600000) * 3600000
      hourlyGroups.set(hour, (hourlyGroups.get(hour) || 0) + 1)
    })
    
    return Array.from(hourlyGroups.entries())
      .map(([timestamp, count]) => ({ timestamp, count }))
      .sort((a, b) => a.timestamp - b.timestamp)
  }
  
  /**
   * 获取用户活动分析
   */
  getUserActivityAnalysis(): {
    activeUsers: number
    activeSessions: number
    topUsers: Array<{ userId: string; logCount: number }>
    userDistribution: Record<string, number>
  } {
    const userLogs = new Map<string, number>()
    const sessions = new Set<string>()

    this.logBuffer.forEach(entry => {
      // 检查多个可能的用户ID来源
      let userId = entry.metadata.userId
      if (!userId && entry.context && entry.context.userId) {
        userId = entry.context.userId as string
      }

      if (userId) {
        userLogs.set(userId, (userLogs.get(userId) || 0) + 1)
      }

      if (entry.metadata.sessionId) {
        sessions.add(entry.metadata.sessionId)
      }
    })

    const topUsers = Array.from(userLogs.entries())
      .map(([userId, logCount]) => ({ userId, logCount }))
      .sort((a, b) => b.logCount - a.logCount)
      .slice(0, 10)

    const userDistribution: Record<string, number> = {}
    userLogs.forEach((count, userId) => {
      const range = count < 10 ? '1-10' : count < 50 ? '11-50' : count < 100 ? '51-100' : '100+'
      userDistribution[range] = (userDistribution[range] || 0) + 1
    })

    return {
      activeUsers: userLogs.size,
      activeSessions: sessions.size,
      topUsers,
      userDistribution
    }
  }
  
  /**
   * 获取性能分析
   */
  getPerformanceAnalysis(): {
    averageResponseTime: number
    slowestOperations: Array<{ operation: string; duration: number; timestamp: number }>
    performanceTrend: Array<{ timestamp: number; averageTime: number }>
  } {
    const performanceLogs = this.logBuffer.filter(entry => 
      entry.type === LogType.PERFORMANCE && entry.duration !== undefined
    )
    
    const totalDuration = performanceLogs.reduce((sum, entry) => sum + (entry.duration || 0), 0)
    const averageResponseTime = performanceLogs.length > 0 ? totalDuration / performanceLogs.length : 0
    
    const slowestOperations = performanceLogs
      .sort((a, b) => (b.duration || 0) - (a.duration || 0))
      .slice(0, 10)
      .map(entry => ({
        operation: entry.message,
        duration: entry.duration || 0,
        timestamp: entry.timestamp
      }))
    
    // 按小时计算性能趋势
    const hourlyPerformance = new Map<number, { total: number; count: number }>()
    
    performanceLogs.forEach(entry => {
      const hour = Math.floor(entry.timestamp / 3600000) * 3600000
      const current = hourlyPerformance.get(hour) || { total: 0, count: 0 }
      current.total += entry.duration || 0
      current.count += 1
      hourlyPerformance.set(hour, current)
    })
    
    const performanceTrend = Array.from(hourlyPerformance.entries())
      .map(([timestamp, data]) => ({
        timestamp,
        averageTime: data.count > 0 ? data.total / data.count : 0
      }))
      .sort((a, b) => a.timestamp - b.timestamp)
    
    return {
      averageResponseTime,
      slowestOperations,
      performanceTrend
    }
  }
  
  /**
   * 获取检测到的模式
   */
  getDetectedPatterns(): LogPattern[] {
    return Array.from(this.patterns.values())
      .sort((a, b) => b.count - a.count)
  }
  
  /**
   * 获取异常检测结果
   */
  getAnomalies(limit = 50): AnomalyDetection[] {
    return this.anomalies
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit)
  }
  
  /**
   * 生成分析报告
   */
  generateAnalysisReport(): string {
    const latest = this.getLatestAggregation()
    const userActivity = this.getUserActivityAnalysis()
    const performance = this.getPerformanceAnalysis()
    const patterns = this.getDetectedPatterns()
    const anomalies = this.getAnomalies(5)
    
    const report = [
      '# 日志分析报告',
      '',
      `**生成时间**: ${new Date().toLocaleString()}`,
      `**分析时间窗口**: ${this.config.aggregationInterval / 1000}秒`,
      '',
      '## 总体统计',
      '',
      `- 总日志数: ${latest?.counts.total || 0}`,
      `- 错误率: ${((latest?.metrics.errorRate || 0) * 100).toFixed(2)}%`,
      `- 警告率: ${((latest?.metrics.warningRate || 0) * 100).toFixed(2)}%`,
      `- 平均响应时间: ${performance.averageResponseTime.toFixed(2)}ms`,
      '',
      '## 用户活动',
      '',
      `- 活跃用户: ${userActivity.activeUsers}`,
      `- 活跃会话: ${userActivity.activeSessions}`,
      `- 最活跃用户: ${userActivity.topUsers.slice(0, 3).map(u => `${u.userId}(${u.logCount})`).join(', ')}`,
      '',
      '## 检测到的模式',
      '',
      ...patterns.slice(0, 5).map((pattern, index) => 
        `${index + 1}. ${pattern.name}: ${pattern.count}次 (${pattern.description})`
      ),
      '',
      '## 最近异常',
      '',
      ...anomalies.map((anomaly, index) => 
        `${index + 1}. ${anomaly.type}: ${anomaly.description} (置信度: ${(anomaly.confidence * 100).toFixed(1)}%)`
      ),
      '',
      '## 性能分析',
      '',
      `- 平均响应时间: ${performance.averageResponseTime.toFixed(2)}ms`,
      `- 最慢操作: ${performance.slowestOperations.slice(0, 3).map(op => `${op.operation}(${op.duration}ms)`).join(', ')}`,
      ''
    ]
    
    return report.join('\n')
  }
  
  // 私有方法
  private startAnalysis(): void {
    this.isAnalyzing = true
    this.analysisTimer = window.setInterval(() => {
      this.performPeriodicAnalysis()
    }, this.config.aggregationInterval)
  }
  
  private restartAnalysis(): void {
    this.stopAnalysis()
    this.startAnalysis()
  }
  
  private stopAnalysis(): void {
    this.isAnalyzing = false
    if (this.analysisTimer) {
      clearInterval(this.analysisTimer)
    }
  }
  
  private performPeriodicAnalysis(): void {
    const now = Date.now()
    const windowStart = now - this.config.aggregationInterval
    
    // 获取时间窗口内的日志
    const windowLogs = this.logBuffer.filter(entry => 
      entry.timestamp >= windowStart && entry.timestamp <= now
    )
    
    if (windowLogs.length === 0) return
    
    // 创建聚合数据
    const aggregation = this.createAggregation(windowLogs, windowStart, this.config.aggregationInterval)
    this.aggregations.push(aggregation)
    
    // 限制聚合数据数量
    if (this.aggregations.length > 1000) {
      this.aggregations.shift()
    }
    
    // 模式检测
    if (this.config.enablePatternDetection) {
      this.detectPatterns(windowLogs)
    }
    
    // 异常检测
    if (this.config.enableAnomalyDetection) {
      this.detectAnomalies(aggregation)
    }
    
    // 清理过期数据
    this.cleanupExpiredData()
  }
  
  private performRealTimeAnalysis(entry: LogEntry): void {
    // 实时模式匹配
    this.matchPatterns(entry)
    
    // 实时异常检测
    if (entry.level >= LogLevel.ERROR) {
      this.checkErrorSpike()
    }
  }
  
  private createAggregation(logs: LogEntry[], timestamp: number, interval: number): LogAggregation {
    const counts = {
      total: logs.length,
      byLevel: {} as Record<LogLevel, number>,
      byType: {} as Record<LogType, number>
    }
    
    const users = new Set<string>()
    const sessions = new Set<string>()
    const errors = new Map<string, number>()
    let totalResponseTime = 0
    let responseTimeCount = 0
    
    logs.forEach(entry => {
      // 按级别统计
      counts.byLevel[entry.level] = (counts.byLevel[entry.level] || 0) + 1
      
      // 按类型统计
      counts.byType[entry.type] = (counts.byType[entry.type] || 0) + 1
      
      // 用户和会话统计
      if (entry.metadata.userId) users.add(entry.metadata.userId)
      if (entry.metadata.sessionId) sessions.add(entry.metadata.sessionId)
      
      // 错误统计
      if (entry.level >= LogLevel.ERROR) {
        errors.set(entry.message, (errors.get(entry.message) || 0) + 1)
      }
      
      // 响应时间统计
      if (entry.duration) {
        totalResponseTime += entry.duration
        responseTimeCount++
      }
    })
    
    const errorCount = (counts.byLevel[LogLevel.ERROR] || 0) + (counts.byLevel[LogLevel.FATAL] || 0)
    const warningCount = counts.byLevel[LogLevel.WARN] || 0
    
    return {
      timestamp,
      interval,
      counts,
      metrics: {
        errorRate: logs.length > 0 ? errorCount / logs.length : 0,
        warningRate: logs.length > 0 ? warningCount / logs.length : 0,
        averageResponseTime: responseTimeCount > 0 ? totalResponseTime / responseTimeCount : 0,
        uniqueUsers: users.size,
        uniqueSessions: sessions.size
      },
      topErrors: Array.from(errors.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([message, count]) => ({
          message,
          count,
          lastSeen: Math.max(...logs.filter(l => l.message === message).map(l => l.timestamp))
        })),
      patterns: []
    }
  }
  
  private initializePatterns(): void {
    const defaultPatterns = [
      {
        id: 'sql_error',
        pattern: /SQL.*error|database.*error|connection.*failed/i,
        name: 'SQL错误',
        description: '数据库相关错误',
        severity: LogLevel.ERROR
      },
      {
        id: 'auth_failure',
        pattern: /authentication.*failed|unauthorized|access.*denied/i,
        name: '认证失败',
        description: '用户认证或授权失败',
        severity: LogLevel.WARN
      },
      {
        id: 'timeout',
        pattern: /timeout|timed.*out|request.*timeout/i,
        name: '超时错误',
        description: '请求或操作超时',
        severity: LogLevel.ERROR
      },
      {
        id: 'memory_leak',
        pattern: /out.*of.*memory|memory.*leak|heap.*overflow/i,
        name: '内存问题',
        description: '内存不足或泄漏',
        severity: LogLevel.FATAL
      }
    ]
    
    defaultPatterns.forEach(pattern => {
      this.patterns.set(pattern.id, {
        ...pattern,
        count: 0,
        lastMatch: 0,
        examples: []
      })
    })
  }
  
  private detectPatterns(logs: LogEntry[]): void {
    logs.forEach(entry => this.matchPatterns(entry))
  }
  
  private matchPatterns(entry: LogEntry): void {
    this.patterns.forEach(pattern => {
      if (pattern.pattern.test(entry.message)) {
        pattern.count++
        pattern.lastMatch = entry.timestamp
        
        // 保留最近的示例
        pattern.examples.push(entry)
        if (pattern.examples.length > 5) {
          pattern.examples.shift()
        }
      }
    })
  }
  
  private detectAnomalies(aggregation: LogAggregation): void {
    // 检查错误率异常
    if (aggregation.metrics.errorRate > this.config.alertThresholds.errorRate) {
      this.anomalies.push({
        timestamp: aggregation.timestamp,
        type: 'threshold',
        metric: 'error_rate',
        value: aggregation.metrics.errorRate,
        expected: this.config.alertThresholds.errorRate,
        deviation: aggregation.metrics.errorRate - this.config.alertThresholds.errorRate,
        confidence: 0.9,
        description: `错误率 ${(aggregation.metrics.errorRate * 100).toFixed(2)}% 超过阈值 ${(this.config.alertThresholds.errorRate * 100).toFixed(2)}%`
      })
    }
    
    // 检查响应时间异常
    if (aggregation.metrics.averageResponseTime > this.config.alertThresholds.responseTime) {
      this.anomalies.push({
        timestamp: aggregation.timestamp,
        type: 'threshold',
        metric: 'response_time',
        value: aggregation.metrics.averageResponseTime,
        expected: this.config.alertThresholds.responseTime,
        deviation: aggregation.metrics.averageResponseTime - this.config.alertThresholds.responseTime,
        confidence: 0.8,
        description: `平均响应时间 ${aggregation.metrics.averageResponseTime.toFixed(2)}ms 超过阈值 ${this.config.alertThresholds.responseTime}ms`
      })
    }
  }
  
  private checkErrorSpike(): void {
    const now = Date.now()
    const recentErrors = this.logBuffer.filter(entry => 
      entry.level >= LogLevel.ERROR && 
      now - entry.timestamp < 300000 // 最近5分钟
    )
    
    if (recentErrors.length > 10) { // 5分钟内超过10个错误
      this.anomalies.push({
        timestamp: now,
        type: 'spike',
        metric: 'error_count',
        value: recentErrors.length,
        expected: 5,
        deviation: recentErrors.length - 5,
        confidence: 0.85,
        description: `检测到错误激增：5分钟内发生 ${recentErrors.length} 个错误`
      })
    }
  }
  
  private cleanupExpiredData(): void {
    const cutoff = Date.now() - this.config.retentionPeriod
    
    // 清理过期日志
    this.logBuffer = this.logBuffer.filter(entry => entry.timestamp > cutoff)
    
    // 清理过期聚合数据
    this.aggregations = this.aggregations.filter(agg => agg.timestamp > cutoff)
    
    // 清理过期异常
    this.anomalies = this.anomalies.filter(anomaly => anomaly.timestamp > cutoff)
  }
  
  private getDefaultConfig(): LogAnalysisConfig {
    return {
      aggregationInterval: 60000, // 1分钟
      retentionPeriod: 24 * 60 * 60 * 1000, // 24小时
      alertThresholds: {
        errorRate: 0.05, // 5%
        warningRate: 0.1, // 10%
        responseTime: 5000 // 5秒
      },
      enableRealTimeAnalysis: true,
      enablePatternDetection: true,
      enableAnomalyDetection: true
    }
  }
}

// 导出单例实例
export const logAnalyzer = LogAnalyzer.getInstance()

// 在开发环境中挂载到全局
if (import.meta.env.DEV) {
  (window as any).logAnalyzer = logAnalyzer
  console.log('📊 日志分析器已挂载到 window.logAnalyzer')
}
