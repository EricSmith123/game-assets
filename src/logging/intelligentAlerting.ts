/**
 * 智能告警系统
 * 
 * 基于日志分析结果提供智能告警、自动分类和优先级排序
 */

import { AlertLevel, AlertType } from '../monitoring/alertSystem'
import { AnomalyDetection, LogAggregation, logAnalyzer } from './logAnalyzer'
import { LogEntry, LogLevel } from './structuredLogger'

/**
 * 智能告警配置
 */
export interface IntelligentAlertConfig {
  enabled: boolean
  minSeverity: LogLevel
  aggregationWindow: number
  cooldownPeriod: number
  enableMachineLearning: boolean
  enableContextualAnalysis: boolean
  enablePredictiveAlerting: boolean
  thresholds: {
    errorBurst: number
    performanceDegradation: number
    userActivityDrop: number
    securityThreat: number
  }
}

/**
 * 告警上下文
 */
export interface AlertContext {
  relatedLogs: LogEntry[]
  affectedUsers: string[]
  affectedSessions: string[]
  systemMetrics: Record<string, number>
  businessImpact: 'low' | 'medium' | 'high' | 'critical'
  rootCauseAnalysis: {
    possibleCauses: string[]
    confidence: number
    recommendations: string[]
  }
}

/**
 * 智能告警事件
 */
export interface IntelligentAlert {
  id: string
  timestamp: number
  type: AlertType
  level: AlertLevel
  title: string
  description: string
  context: AlertContext
  priority: number
  category: string
  tags: string[]
  acknowledged: boolean
  resolved: boolean
  autoResolved: boolean
  escalationLevel: number
}

/**
 * 告警规则
 */
export interface AlertRule {
  id: string
  name: string
  description: string
  condition: (logs: LogEntry[], aggregation: LogAggregation) => boolean
  severity: AlertLevel
  category: string
  cooldown: number
  enabled: boolean
  autoResolve: boolean
  escalationRules: Array<{
    timeThreshold: number
    action: 'escalate' | 'notify' | 'auto-resolve'
    target?: string
  }>
}

/**
 * 智能告警系统
 */
export class IntelligentAlerting {
  private static instance: IntelligentAlerting
  private config: IntelligentAlertConfig
  private alerts = new Map<string, IntelligentAlert>()
  private rules = new Map<string, AlertRule>()
  private lastAlertTime = new Map<string, number>()
  private isMonitoring = false
  private monitoringInterval?: number
  
  private constructor() {
    this.config = this.getDefaultConfig()
    this.initializeDefaultRules()
  }
  
  static getInstance(): IntelligentAlerting {
    if (!IntelligentAlerting.instance) {
      IntelligentAlerting.instance = new IntelligentAlerting()
    }
    return IntelligentAlerting.instance
  }
  
  /**
   * 启动智能告警监控
   */
  startMonitoring(): void {
    if (this.isMonitoring) {
      console.warn('🤖 智能告警系统已在运行')
      return
    }
    
    this.isMonitoring = true
    this.monitoringInterval = window.setInterval(() => {
      this.performIntelligentAnalysis()
    }, this.config.aggregationWindow)
    
    console.log('🤖 智能告警系统已启动')
  }
  
  /**
   * 停止智能告警监控
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) return
    
    this.isMonitoring = false
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
    }
    
    console.log('🤖 智能告警监控已停止')
  }
  
  /**
   * 配置智能告警系统
   */
  configure(config: Partial<IntelligentAlertConfig>): void {
    this.config = { ...this.config, ...config }
    console.log('🤖 智能告警配置已更新')
  }
  
  /**
   * 添加自定义告警规则
   */
  addRule(rule: Omit<AlertRule, 'id'>): string {
    const id = this.generateRuleId()
    const fullRule: AlertRule = { id, ...rule }
    
    this.rules.set(id, fullRule)
    console.log(`🤖 添加告警规则: ${rule.name}`)
    
    return id
  }
  
  /**
   * 更新告警规则
   */
  updateRule(id: string, updates: Partial<AlertRule>): boolean {
    const rule = this.rules.get(id)
    if (!rule) return false
    
    this.rules.set(id, { ...rule, ...updates })
    console.log(`🤖 更新告警规则: ${rule.name}`)
    
    return true
  }
  
  /**
   * 删除告警规则
   */
  removeRule(id: string): boolean {
    const rule = this.rules.get(id)
    if (!rule) return false
    
    this.rules.delete(id)
    console.log(`🤖 删除告警规则: ${rule.name}`)
    
    return true
  }
  
  /**
   * 手动触发智能分析
   */
  async triggerAnalysis(): Promise<IntelligentAlert[]> {
    return this.performIntelligentAnalysis()
  }
  
  /**
   * 获取活跃告警
   */
  getActiveAlerts(): IntelligentAlert[] {
    return Array.from(this.alerts.values())
      .filter(alert => !alert.resolved)
      .sort((a, b) => b.priority - a.priority || b.timestamp - a.timestamp)
  }
  
  /**
   * 获取告警历史
   */
  getAlertHistory(limit = 100): IntelligentAlert[] {
    return Array.from(this.alerts.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit)
  }
  
  /**
   * 确认告警
   */
  acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean {
    const alert = this.alerts.get(alertId)
    if (!alert) return false
    
    alert.acknowledged = true
    console.log(`🤖 告警已确认: ${alert.title} (by ${acknowledgedBy})`)
    
    return true
  }
  
  /**
   * 解决告警
   */
  resolveAlert(alertId: string, resolvedBy?: string): boolean {
    const alert = this.alerts.get(alertId)
    if (!alert) return false
    
    alert.resolved = true
    alert.autoResolved = !resolvedBy
    
    console.log(`🤖 告警已解决: ${alert.title} ${resolvedBy ? `(by ${resolvedBy})` : '(自动解决)'}`)
    
    return true
  }
  
  /**
   * 获取告警统计
   */
  getAlertStatistics(): {
    total: number
    active: number
    resolved: number
    acknowledged: number
    byCategory: Record<string, number>
    byPriority: Record<number, number>
    averageResolutionTime: number
  } {
    const alerts = Array.from(this.alerts.values())

    const byCategory: Record<string, number> = {}
    const byPriority: Record<number, number> = {}
    let totalResolutionTime = 0
    let resolvedCount = 0

    alerts.forEach(alert => {
      byCategory[alert.category] = (byCategory[alert.category] || 0) + 1
      byPriority[alert.priority] = (byPriority[alert.priority] || 0) + 1

      if (alert.resolved) {
        // 简化的解决时间计算
        totalResolutionTime += 3600000 // 假设平均1小时解决
        resolvedCount++
      }
    })

    return {
      total: alerts.length,
      active: alerts.filter(a => !a.resolved).length,
      resolved: alerts.filter(a => a.resolved).length,
      acknowledged: alerts.filter(a => a.acknowledged).length,
      byCategory,
      byPriority,
      averageResolutionTime: resolvedCount > 0 ? totalResolutionTime / resolvedCount : 0
    }
  }

  /**
   * 清理所有数据（用于测试）
   */
  clearAllData(): void {
    this.alerts.clear()
    this.rules.clear()
    this.lastAlertTime.clear()
    this.initializeDefaultRules()
  }
  
  // 私有方法
  private async performIntelligentAnalysis(): Promise<IntelligentAlert[]> {
    const newAlerts: IntelligentAlert[] = []

    try {
      // 获取相关日志
      const recentLogs = logAnalyzer.searchLogs({
        startTime: Date.now() - this.config.aggregationWindow,
        limit: 1000
      })

      if (recentLogs.length === 0) {
        return newAlerts
      }

      // 创建简化的聚合数据
      const aggregation = this.createSimpleAggregation(recentLogs)

      // 评估所有规则
      for (const rule of this.rules.values()) {
        if (!rule.enabled) continue

        // 检查冷却期
        const lastAlert = this.lastAlertTime.get(rule.id)
        if (lastAlert && Date.now() - lastAlert < rule.cooldown) {
          continue
        }

        // 评估规则条件
        try {
          if (rule.condition(recentLogs, aggregation)) {
            const alert = await this.createIntelligentAlert(rule, recentLogs, aggregation)
            newAlerts.push(alert)

            this.alerts.set(alert.id, alert)
            this.lastAlertTime.set(rule.id, Date.now())

            console.log(`🤖 触发告警: ${alert.title}`)
          }
        } catch (error) {
          console.error(`🤖 规则评估失败 ${rule.name}:`, error)
        }
      }

      // 自动解决过期告警
      this.autoResolveExpiredAlerts()

    } catch (error) {
      console.error('🤖 智能分析失败:', error)
    }

    return newAlerts
  }

  private createSimpleAggregation(logs: LogEntry[]): any {
    const errorLogs = logs.filter(log => log.level >= 4)
    const performanceLogs = logs.filter(log => log.duration && log.duration > 0)

    return {
      counts: {
        total: logs.length,
        byLevel: logs.reduce((acc, log) => {
          acc[log.level] = (acc[log.level] || 0) + 1
          return acc
        }, {} as Record<number, number>)
      },
      metrics: {
        errorRate: logs.length > 0 ? errorLogs.length / logs.length : 0,
        averageResponseTime: performanceLogs.length > 0
          ? performanceLogs.reduce((sum, log) => sum + (log.duration || 0), 0) / performanceLogs.length
          : 0,
        uniqueUsers: new Set(logs.map(log => log.metadata.userId).filter(Boolean)).size,
        uniqueSessions: new Set(logs.map(log => log.metadata.sessionId).filter(Boolean)).size
      }
    }
  }
  
  private async createIntelligentAlert(
    rule: AlertRule,
    logs: LogEntry[],
    aggregation: LogAggregation
  ): Promise<IntelligentAlert> {
    const context = await this.buildAlertContext(logs, rule.category)
    
    return {
      id: this.generateAlertId(),
      timestamp: Date.now(),
      type: this.mapCategoryToAlertType(rule.category),
      level: rule.severity,
      title: rule.name,
      description: rule.description,
      context,
      priority: this.calculatePriority(rule.severity, context.businessImpact),
      category: rule.category,
      tags: this.generateTags(rule, context),
      acknowledged: false,
      resolved: false,
      autoResolved: false,
      escalationLevel: 0
    }
  }
  
  private createAnomalyAlert(anomaly: AnomalyDetection, logs: LogEntry[]): IntelligentAlert {
    const context: AlertContext = {
      relatedLogs: logs.filter(log => 
        Math.abs(log.timestamp - anomaly.timestamp) < 300000 // 5分钟内
      ).slice(0, 10),
      affectedUsers: [],
      affectedSessions: [],
      systemMetrics: { [anomaly.metric]: anomaly.value },
      businessImpact: this.assessBusinessImpact(anomaly),
      rootCauseAnalysis: {
        possibleCauses: this.analyzePossibleCauses(anomaly),
        confidence: anomaly.confidence,
        recommendations: this.generateRecommendations(anomaly)
      }
    }
    
    return {
      id: this.generateAlertId(),
      timestamp: anomaly.timestamp,
      type: 'performance' as AlertType,
      level: this.mapAnomalyToAlertLevel(anomaly),
      title: `异常检测: ${anomaly.type}`,
      description: anomaly.description,
      context,
      priority: this.calculatePriority(this.mapAnomalyToAlertLevel(anomaly), context.businessImpact),
      category: 'anomaly',
      tags: ['anomaly', anomaly.type, anomaly.metric],
      acknowledged: false,
      resolved: false,
      autoResolved: false,
      escalationLevel: 0
    }
  }
  
  private async buildAlertContext(logs: LogEntry[], category: string): Promise<AlertContext> {
    const users = new Set<string>()
    const sessions = new Set<string>()
    
    logs.forEach(log => {
      if (log.metadata.userId) users.add(log.metadata.userId)
      if (log.metadata.sessionId) sessions.add(log.metadata.sessionId)
    })
    
    return {
      relatedLogs: logs.slice(0, 20), // 最多20条相关日志
      affectedUsers: Array.from(users),
      affectedSessions: Array.from(sessions),
      systemMetrics: this.extractSystemMetrics(logs),
      businessImpact: this.assessBusinessImpactFromLogs(logs, category),
      rootCauseAnalysis: {
        possibleCauses: this.analyzePossibleCausesFromLogs(logs, category),
        confidence: 0.7,
        recommendations: this.generateRecommendationsFromLogs(logs, category)
      }
    }
  }
  
  private initializeDefaultRules(): void {
    // 错误激增规则
    this.addRule({
      name: '错误激增告警',
      description: '检测到错误数量异常增加',
      condition: (logs, aggregation) => {
        const errorLogs = logs.filter(log => log.level >= 4) // ERROR and FATAL
        const errorRate = logs.length > 0 ? errorLogs.length / logs.length : 0
        return errorRate > this.config.thresholds.errorBurst || errorLogs.length > 10
      },
      severity: 'error' as AlertLevel,
      category: 'error_burst',
      cooldown: 300000, // 5分钟
      enabled: true,
      autoResolve: true,
      escalationRules: []
    })

    // 性能下降规则
    this.addRule({
      name: '性能下降告警',
      description: '检测到系统性能显著下降',
      condition: (logs, aggregation) => {
        const performanceLogs = logs.filter(log => log.duration && log.duration > 0)
        if (performanceLogs.length === 0) return false
        const avgTime = performanceLogs.reduce((sum, log) => sum + (log.duration || 0), 0) / performanceLogs.length
        return avgTime > this.config.thresholds.performanceDegradation
      },
      severity: 'warning' as AlertLevel,
      category: 'performance',
      cooldown: 600000, // 10分钟
      enabled: true,
      autoResolve: true,
      escalationRules: []
    })

    // 安全威胁规则
    this.addRule({
      name: '安全威胁告警',
      description: '检测到潜在的安全威胁',
      condition: (logs, aggregation) => {
        const securityLogs = logs.filter(log => log.type === 'security')
        return securityLogs.length > this.config.thresholds.securityThreat
      },
      severity: 'critical' as AlertLevel,
      category: 'security',
      cooldown: 60000, // 1分钟
      enabled: true,
      autoResolve: false,
      escalationRules: []
    })
  }
  
  private autoResolveExpiredAlerts(): void {
    const now = Date.now()
    const autoResolveThreshold = 3600000 // 1小时
    
    this.alerts.forEach(alert => {
      if (!alert.resolved && 
          alert.autoResolved !== false && 
          now - alert.timestamp > autoResolveThreshold) {
        this.resolveAlert(alert.id)
      }
    })
  }
  
  private calculatePriority(level: AlertLevel, businessImpact: string): number {
    const levelPriority = {
      'info': 1,
      'warning': 2,
      'error': 3,
      'critical': 4
    }[level] || 1
    
    const impactMultiplier = {
      'low': 1,
      'medium': 1.5,
      'high': 2,
      'critical': 3
    }[businessImpact] || 1
    
    return Math.round(levelPriority * impactMultiplier * 10)
  }
  
  private mapCategoryToAlertType(category: string): AlertType {
    const mapping: Record<string, AlertType> = {
      'error_burst': 'error_rate' as AlertType,
      'performance': 'performance' as AlertType,
      'security': 'security' as AlertType,
      'user_activity': 'user_behavior' as AlertType
    }
    
    return mapping[category] || 'custom' as AlertType
  }
  
  private mapAnomalyToAlertLevel(anomaly: AnomalyDetection): AlertLevel {
    if (anomaly.confidence > 0.9) return 'critical' as AlertLevel
    if (anomaly.confidence > 0.7) return 'error' as AlertLevel
    if (anomaly.confidence > 0.5) return 'warning' as AlertLevel
    return 'info' as AlertLevel
  }
  
  private assessBusinessImpact(anomaly: AnomalyDetection): 'low' | 'medium' | 'high' | 'critical' {
    if (anomaly.metric === 'error_rate' && anomaly.value > 0.1) return 'critical'
    if (anomaly.metric === 'response_time' && anomaly.value > 10000) return 'high'
    if (anomaly.type === 'spike') return 'medium'
    return 'low'
  }
  
  private assessBusinessImpactFromLogs(logs: LogEntry[], category: string): 'low' | 'medium' | 'high' | 'critical' {
    const errorCount = logs.filter(log => log.level >= LogLevel.ERROR).length
    const userCount = new Set(logs.map(log => log.metadata.userId).filter(Boolean)).size
    
    if (category === 'security') return 'critical'
    if (errorCount > 50 || userCount > 100) return 'high'
    if (errorCount > 10 || userCount > 20) return 'medium'
    return 'low'
  }
  
  private analyzePossibleCauses(anomaly: AnomalyDetection): string[] {
    const causes: Record<string, string[]> = {
      'error_rate': ['代码部署问题', '第三方服务故障', '数据库连接问题', '配置错误'],
      'response_time': ['数据库查询慢', '网络延迟', 'CPU使用率高', '内存不足'],
      'spike': ['流量激增', '恶意攻击', '系统故障', '缓存失效']
    }
    
    return causes[anomaly.metric] || causes[anomaly.type] || ['未知原因']
  }
  
  private analyzePossibleCausesFromLogs(logs: LogEntry[], category: string): string[] {
    // 基于日志内容分析可能原因
    const errorMessages = logs
      .filter(log => log.level >= LogLevel.ERROR)
      .map(log => log.message.toLowerCase())
    
    const causes = []
    
    if (errorMessages.some(msg => msg.includes('database') || msg.includes('sql'))) {
      causes.push('数据库相关问题')
    }
    
    if (errorMessages.some(msg => msg.includes('timeout') || msg.includes('connection'))) {
      causes.push('网络连接问题')
    }
    
    if (errorMessages.some(msg => msg.includes('memory') || msg.includes('heap'))) {
      causes.push('内存相关问题')
    }
    
    return causes.length > 0 ? causes : ['需要进一步分析']
  }
  
  private generateRecommendations(anomaly: AnomalyDetection): string[] {
    const recommendations: Record<string, string[]> = {
      'error_rate': ['检查最近的代码部署', '验证第三方服务状态', '检查数据库连接'],
      'response_time': ['优化数据库查询', '检查系统资源使用', '启用缓存机制'],
      'spike': ['检查流量来源', '启用限流机制', '扩展系统资源']
    }
    
    return recommendations[anomaly.metric] || recommendations[anomaly.type] || ['联系技术支持']
  }
  
  private generateRecommendationsFromLogs(logs: LogEntry[], category: string): string[] {
    // 基于日志内容生成建议
    return ['分析相关日志', '检查系统状态', '联系相关负责人']
  }
  
  private extractSystemMetrics(logs: LogEntry[]): Record<string, number> {
    const metrics: Record<string, number> = {}
    
    logs.forEach(log => {
      if (log.duration) {
        metrics.averageResponseTime = (metrics.averageResponseTime || 0) + log.duration
      }
    })
    
    if (metrics.averageResponseTime) {
      metrics.averageResponseTime /= logs.filter(log => log.duration).length
    }
    
    return metrics
  }
  
  private generateTags(rule: AlertRule, context: AlertContext): string[] {
    const tags = [rule.category]
    
    if (context.affectedUsers.length > 10) tags.push('high-user-impact')
    if (context.businessImpact === 'critical') tags.push('business-critical')
    if (context.rootCauseAnalysis.confidence > 0.8) tags.push('high-confidence')
    
    return tags
  }
  
  private generateRuleId(): string {
    return `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  
  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  
  private getDefaultConfig(): IntelligentAlertConfig {
    return {
      enabled: true,
      minSeverity: LogLevel.WARN,
      aggregationWindow: 300000, // 5分钟
      cooldownPeriod: 600000,    // 10分钟
      enableMachineLearning: false,
      enableContextualAnalysis: true,
      enablePredictiveAlerting: false,
      thresholds: {
        errorBurst: 0.05,      // 5%错误率
        performanceDegradation: 5000, // 5秒响应时间
        userActivityDrop: 0.3,  // 30%用户活动下降
        securityThreat: 5       // 5个安全相关日志
      }
    }
  }
}

// 导出单例实例
export const intelligentAlerting = IntelligentAlerting.getInstance()

// 在开发环境中挂载到全局
if (import.meta.env.DEV) {
  (window as any).intelligentAlerting = intelligentAlerting
  console.log('🤖 智能告警系统已挂载到 window.intelligentAlerting')
}
