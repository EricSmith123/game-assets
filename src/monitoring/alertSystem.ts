/**
 * 告警通知系统
 * 
 * 提供智能告警、多渠道通知和告警管理功能
 */

import { errorMonitor } from './errorMonitor'
import { performanceDashboard } from './performanceDashboard'

/**
 * 告警级别枚举
 */
export enum AlertLevel {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

/**
 * 告警类型枚举
 */
export enum AlertType {
  ERROR_RATE = 'error_rate',
  PERFORMANCE = 'performance',
  MEMORY = 'memory',
  NETWORK = 'network',
  USER_BEHAVIOR = 'user_behavior',
  SECURITY = 'security',
  CUSTOM = 'custom'
}

/**
 * 通知渠道枚举
 */
export enum NotificationChannel {
  CONSOLE = 'console',
  BROWSER = 'browser',
  EMAIL = 'email',
  WEBHOOK = 'webhook',
  SLACK = 'slack'
}

/**
 * 告警规则接口
 */
export interface AlertRule {
  id: string
  name: string
  type: AlertType
  level: AlertLevel
  condition: {
    metric: string
    operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte'
    threshold: number
    duration?: number // 持续时间（毫秒）
  }
  channels: NotificationChannel[]
  enabled: boolean
  cooldown: number // 冷却时间（毫秒）
  lastTriggered?: number
}

/**
 * 告警事件接口
 */
export interface AlertEvent {
  id: string
  ruleId: string
  level: AlertLevel
  type: AlertType
  title: string
  message: string
  timestamp: number
  data: Record<string, any>
  resolved: boolean
  resolvedAt?: number
  acknowledgedBy?: string
  acknowledgedAt?: number
}

/**
 * 通知配置接口
 */
export interface NotificationConfig {
  console: {
    enabled: boolean
    logLevel: AlertLevel
  }
  browser: {
    enabled: boolean
    permission: boolean
  }
  email: {
    enabled: boolean
    endpoint?: string
    recipients: string[]
  }
  webhook: {
    enabled: boolean
    url?: string
    headers?: Record<string, string>
  }
  slack: {
    enabled: boolean
    webhookUrl?: string
    channel?: string
  }
}

/**
 * 告警系统
 */
export class AlertSystem {
  private static instance: AlertSystem
  private rules = new Map<string, AlertRule>()
  private alerts = new Map<string, AlertEvent>()
  private config: NotificationConfig
  private isMonitoring = false
  private monitoringInterval?: number
  private metricHistory = new Map<string, Array<{ value: number; timestamp: number }>>()
  
  private constructor() {
    this.config = this.getDefaultConfig()
    this.setupDefaultRules()
  }
  
  static getInstance(): AlertSystem {
    if (!AlertSystem.instance) {
      AlertSystem.instance = new AlertSystem()
    }
    return AlertSystem.instance
  }
  
  /**
   * 启动告警监控
   */
  startMonitoring(): void {
    if (this.isMonitoring) {
      console.warn('🚨 告警系统已在运行')
      return
    }
    
    this.isMonitoring = true
    this.requestBrowserNotificationPermission()
    this.startRuleEvaluation()
    
    console.log('🚨 告警系统已启动')
  }
  
  /**
   * 停止告警监控
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) return
    
    this.isMonitoring = false
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
    }
    
    console.log('🚨 告警监控已停止')
  }
  
  /**
   * 添加告警规则
   */
  addRule(rule: Omit<AlertRule, 'id'>): string {
    const id = this.generateRuleId()
    const fullRule: AlertRule = {
      id,
      ...rule
    }
    
    this.rules.set(id, fullRule)
    console.log(`🚨 添加告警规则: ${rule.name}`)
    
    return id
  }
  
  /**
   * 更新告警规则
   */
  updateRule(id: string, updates: Partial<AlertRule>): boolean {
    const rule = this.rules.get(id)
    if (!rule) return false
    
    this.rules.set(id, { ...rule, ...updates })
    console.log(`🚨 更新告警规则: ${rule.name}`)
    
    return true
  }
  
  /**
   * 删除告警规则
   */
  removeRule(id: string): boolean {
    const rule = this.rules.get(id)
    if (!rule) return false
    
    this.rules.delete(id)
    console.log(`🚨 删除告警规则: ${rule.name}`)
    
    return true
  }
  
  /**
   * 手动触发告警
   */
  triggerAlert(
    type: AlertType,
    level: AlertLevel,
    title: string,
    message: string,
    data: Record<string, any> = {}
  ): void {
    const alert: AlertEvent = {
      id: this.generateAlertId(),
      ruleId: 'manual',
      level,
      type,
      title,
      message,
      timestamp: Date.now(),
      data,
      resolved: false
    }
    
    this.alerts.set(alert.id, alert)
    this.sendNotifications(alert)
  }
  
  /**
   * 确认告警
   */
  acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean {
    const alert = this.alerts.get(alertId)
    if (!alert) return false
    
    alert.acknowledgedBy = acknowledgedBy
    alert.acknowledgedAt = Date.now()
    
    console.log(`🚨 告警已确认: ${alert.title} (by ${acknowledgedBy})`)
    return true
  }
  
  /**
   * 解决告警
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId)
    if (!alert) return false
    
    alert.resolved = true
    alert.resolvedAt = Date.now()
    
    console.log(`🚨 告警已解决: ${alert.title}`)
    return true
  }
  
  /**
   * 获取活跃告警
   */
  getActiveAlerts(): AlertEvent[] {
    return Array.from(this.alerts.values())
      .filter(alert => !alert.resolved)
      .sort((a, b) => b.timestamp - a.timestamp)
  }
  
  /**
   * 获取告警历史
   */
  getAlertHistory(limit = 100): AlertEvent[] {
    return Array.from(this.alerts.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit)
  }
  
  /**
   * 获取告警统计
   */
  getAlertStats(): {
    total: number
    active: number
    resolved: number
    byLevel: Record<AlertLevel, number>
    byType: Record<AlertType, number>
  } {
    const alerts = Array.from(this.alerts.values())

    const byLevel = alerts.reduce((acc, alert) => {
      acc[alert.level] = (acc[alert.level] || 0) + 1
      return acc
    }, {} as Record<AlertLevel, number>)

    const byType = alerts.reduce((acc, alert) => {
      acc[alert.type] = (acc[alert.type] || 0) + 1
      return acc
    }, {} as Record<AlertType, number>)

    return {
      total: alerts.length,
      active: alerts.filter(a => !a.resolved).length,
      resolved: alerts.filter(a => a.resolved).length,
      byLevel,
      byType
    }
  }

  /**
   * 清理所有告警（用于测试）
   */
  clearAllAlerts(): void {
    this.alerts.clear()
    console.log('🚨 所有告警已清理')
  }
  
  /**
   * 配置通知渠道
   */
  configureNotifications(config: Partial<NotificationConfig>): void {
    this.config = { ...this.config, ...config }
    console.log('🚨 通知配置已更新')
  }
  
  // 私有方法
  private setupDefaultRules(): void {
    // 错误率告警
    this.addRule({
      name: '错误率过高',
      type: AlertType.ERROR_RATE,
      level: AlertLevel.ERROR,
      condition: {
        metric: 'error_rate',
        operator: 'gt',
        threshold: 10, // 每分钟超过10个错误
        duration: 60000 // 持续1分钟
      },
      channels: [NotificationChannel.CONSOLE, NotificationChannel.BROWSER],
      enabled: true,
      cooldown: 300000 // 5分钟冷却
    })
    
    // 内存使用告警
    this.addRule({
      name: '内存使用率过高',
      type: AlertType.MEMORY,
      level: AlertLevel.WARNING,
      condition: {
        metric: 'memory_usage',
        operator: 'gt',
        threshold: 80, // 超过80%
        duration: 30000 // 持续30秒
      },
      channels: [NotificationChannel.CONSOLE],
      enabled: true,
      cooldown: 180000 // 3分钟冷却
    })
    
    // FPS告警
    this.addRule({
      name: 'FPS过低',
      type: AlertType.PERFORMANCE,
      level: AlertLevel.WARNING,
      condition: {
        metric: 'fps',
        operator: 'lt',
        threshold: 30, // 低于30 FPS
        duration: 10000 // 持续10秒
      },
      channels: [NotificationChannel.CONSOLE],
      enabled: true,
      cooldown: 120000 // 2分钟冷却
    })
    
    // 网络延迟告警
    this.addRule({
      name: '网络延迟过高',
      type: AlertType.NETWORK,
      level: AlertLevel.WARNING,
      condition: {
        metric: 'network_latency',
        operator: 'gt',
        threshold: 1000, // 超过1秒
        duration: 15000 // 持续15秒
      },
      channels: [NotificationChannel.CONSOLE],
      enabled: true,
      cooldown: 300000 // 5分钟冷却
    })
  }
  
  private startRuleEvaluation(): void {
    this.monitoringInterval = window.setInterval(() => {
      this.evaluateRules()
    }, 5000) // 每5秒评估一次
  }
  
  private evaluateRules(): void {
    const currentMetrics = this.getCurrentMetrics()
    
    for (const rule of this.rules.values()) {
      if (!rule.enabled) continue
      
      // 检查冷却时间
      if (rule.lastTriggered && Date.now() - rule.lastTriggered < rule.cooldown) {
        continue
      }
      
      const metricValue = currentMetrics[rule.condition.metric]
      if (metricValue === undefined) continue
      
      // 记录指标历史
      this.recordMetric(rule.condition.metric, metricValue)
      
      // 评估条件
      if (this.evaluateCondition(rule, metricValue)) {
        this.triggerRuleAlert(rule, metricValue)
      }
    }
  }
  
  private getCurrentMetrics(): Record<string, number> {
    const errorStats = errorMonitor.getErrorStats()
    const performanceMetrics = performanceDashboard.getCurrentMetrics()
    
    return {
      error_rate: errorStats.errorRate,
      total_errors: errorStats.totalErrors,
      memory_usage: performanceMetrics.memoryUsage.percentage,
      fps: performanceMetrics.fps,
      render_time: performanceMetrics.renderTime,
      network_latency: performanceMetrics.networkLatency,
      first_contentful_paint: performanceMetrics.firstContentfulPaint,
      largest_contentful_paint: performanceMetrics.largestContentfulPaint
    }
  }
  
  private recordMetric(metric: string, value: number): void {
    if (!this.metricHistory.has(metric)) {
      this.metricHistory.set(metric, [])
    }
    
    const history = this.metricHistory.get(metric)!
    history.push({ value, timestamp: Date.now() })
    
    // 只保留最近10分钟的数据
    const cutoff = Date.now() - 600000
    const filtered = history.filter(entry => entry.timestamp > cutoff)
    this.metricHistory.set(metric, filtered)
  }
  
  private evaluateCondition(rule: AlertRule, currentValue: number): boolean {
    const { condition } = rule
    
    // 基本条件检查
    let conditionMet = false
    switch (condition.operator) {
      case 'gt':
        conditionMet = currentValue > condition.threshold
        break
      case 'lt':
        conditionMet = currentValue < condition.threshold
        break
      case 'eq':
        conditionMet = currentValue === condition.threshold
        break
      case 'gte':
        conditionMet = currentValue >= condition.threshold
        break
      case 'lte':
        conditionMet = currentValue <= condition.threshold
        break
    }
    
    if (!conditionMet || !condition.duration) {
      return conditionMet
    }
    
    // 持续时间检查
    const history = this.metricHistory.get(condition.metric) || []
    const cutoff = Date.now() - condition.duration
    const recentHistory = history.filter(entry => entry.timestamp > cutoff)
    
    return recentHistory.every(entry => {
      switch (condition.operator) {
        case 'gt': return entry.value > condition.threshold
        case 'lt': return entry.value < condition.threshold
        case 'eq': return entry.value === condition.threshold
        case 'gte': return entry.value >= condition.threshold
        case 'lte': return entry.value <= condition.threshold
        default: return false
      }
    })
  }
  
  private triggerRuleAlert(rule: AlertRule, metricValue: number): void {
    const alert: AlertEvent = {
      id: this.generateAlertId(),
      ruleId: rule.id,
      level: rule.level,
      type: rule.type,
      title: rule.name,
      message: `${rule.condition.metric} = ${metricValue} (阈值: ${rule.condition.threshold})`,
      timestamp: Date.now(),
      data: {
        metric: rule.condition.metric,
        value: metricValue,
        threshold: rule.condition.threshold,
        operator: rule.condition.operator
      },
      resolved: false
    }
    
    this.alerts.set(alert.id, alert)
    rule.lastTriggered = Date.now()
    
    this.sendNotifications(alert, rule.channels)
  }
  
  private async sendNotifications(alert: AlertEvent, channels?: NotificationChannel[]): Promise<void> {
    const targetChannels = channels || [NotificationChannel.CONSOLE]
    
    for (const channel of targetChannels) {
      try {
        await this.sendNotification(channel, alert)
      } catch (error) {
        console.error(`🚨 发送通知失败 (${channel}):`, error)
      }
    }
  }
  
  private async sendNotification(channel: NotificationChannel, alert: AlertEvent): Promise<void> {
    switch (channel) {
      case NotificationChannel.CONSOLE:
        this.sendConsoleNotification(alert)
        break
      case NotificationChannel.BROWSER:
        await this.sendBrowserNotification(alert)
        break
      case NotificationChannel.EMAIL:
        await this.sendEmailNotification(alert)
        break
      case NotificationChannel.WEBHOOK:
        await this.sendWebhookNotification(alert)
        break
      case NotificationChannel.SLACK:
        await this.sendSlackNotification(alert)
        break
    }
  }
  
  private sendConsoleNotification(alert: AlertEvent): void {
    const icon = this.getAlertIcon(alert.level)
    const style = this.getAlertStyle(alert.level)
    
    console.group(`${icon} ${alert.title}`)
    console.log(`%c${alert.message}`, style)
    console.log('时间:', new Date(alert.timestamp).toLocaleString())
    console.log('数据:', alert.data)
    console.groupEnd()
  }
  
  private async sendBrowserNotification(alert: AlertEvent): Promise<void> {
    if (!this.config.browser.enabled || !this.config.browser.permission) {
      return
    }
    
    const notification = new Notification(alert.title, {
      body: alert.message,
      icon: '/favicon.ico',
      tag: alert.id,
      requireInteraction: alert.level === AlertLevel.CRITICAL
    })
    
    notification.onclick = () => {
      window.focus()
      notification.close()
    }
    
    // 自动关闭（除了严重告警）
    if (alert.level !== AlertLevel.CRITICAL) {
      setTimeout(() => notification.close(), 5000)
    }
  }
  
  private async sendEmailNotification(alert: AlertEvent): Promise<void> {
    if (!this.config.email.enabled || !this.config.email.endpoint) {
      return
    }
    
    await fetch(this.config.email.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: this.config.email.recipients,
        subject: `[${alert.level.toUpperCase()}] ${alert.title}`,
        body: `
          告警详情:
          - 标题: ${alert.title}
          - 级别: ${alert.level}
          - 类型: ${alert.type}
          - 消息: ${alert.message}
          - 时间: ${new Date(alert.timestamp).toLocaleString()}
          - 数据: ${JSON.stringify(alert.data, null, 2)}
        `
      })
    })
  }
  
  private async sendWebhookNotification(alert: AlertEvent): Promise<void> {
    if (!this.config.webhook.enabled || !this.config.webhook.url) {
      return
    }
    
    await fetch(this.config.webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.config.webhook.headers
      },
      body: JSON.stringify(alert)
    })
  }
  
  private async sendSlackNotification(alert: AlertEvent): Promise<void> {
    if (!this.config.slack.enabled || !this.config.slack.webhookUrl) {
      return
    }
    
    const color = this.getSlackColor(alert.level)
    
    await fetch(this.config.slack.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel: this.config.slack.channel,
        attachments: [{
          color,
          title: alert.title,
          text: alert.message,
          fields: [
            { title: '级别', value: alert.level, short: true },
            { title: '类型', value: alert.type, short: true },
            { title: '时间', value: new Date(alert.timestamp).toLocaleString(), short: false }
          ]
        }]
      })
    })
  }
  
  private async requestBrowserNotificationPermission(): Promise<void> {
    if (!this.config.browser.enabled || !('Notification' in window)) {
      return
    }
    
    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission()
      this.config.browser.permission = permission === 'granted'
    } else {
      this.config.browser.permission = Notification.permission === 'granted'
    }
  }
  
  private getDefaultConfig(): NotificationConfig {
    return {
      console: {
        enabled: true,
        logLevel: AlertLevel.INFO
      },
      browser: {
        enabled: true,
        permission: false
      },
      email: {
        enabled: false,
        recipients: []
      },
      webhook: {
        enabled: false
      },
      slack: {
        enabled: false
      }
    }
  }
  
  private generateRuleId(): string {
    return `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  
  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  
  private getAlertIcon(level: AlertLevel): string {
    switch (level) {
      case AlertLevel.INFO: return 'ℹ️'
      case AlertLevel.WARNING: return '⚠️'
      case AlertLevel.ERROR: return '❌'
      case AlertLevel.CRITICAL: return '🚨'
      default: return '📢'
    }
  }
  
  private getAlertStyle(level: AlertLevel): string {
    switch (level) {
      case AlertLevel.INFO: return 'color: #2196F3'
      case AlertLevel.WARNING: return 'color: #FF9800'
      case AlertLevel.ERROR: return 'color: #F44336'
      case AlertLevel.CRITICAL: return 'color: #F44336; font-weight: bold'
      default: return 'color: #666'
    }
  }
  
  private getSlackColor(level: AlertLevel): string {
    switch (level) {
      case AlertLevel.INFO: return 'good'
      case AlertLevel.WARNING: return 'warning'
      case AlertLevel.ERROR: return 'danger'
      case AlertLevel.CRITICAL: return 'danger'
      default: return '#666'
    }
  }
}

// 导出单例实例
export const alertSystem = AlertSystem.getInstance()

// 在开发环境中挂载到全局
if (import.meta.env.DEV) {
  (window as any).alertSystem = alertSystem
  console.log('🚨 告警系统已挂载到 window.alertSystem')
}
