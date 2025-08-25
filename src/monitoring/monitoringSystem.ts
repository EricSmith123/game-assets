/**
 * 监控系统集成管理器
 * 
 * 统一管理所有监控组件，提供一站式监控服务
 */

import { errorMonitor } from './errorMonitor'
import { performanceDashboard } from './performanceDashboard'
import { userAnalytics } from './userAnalytics'
import { alertSystem } from './alertSystem'

/**
 * 监控系统配置
 */
export interface MonitoringConfig {
  errorMonitoring: {
    enabled: boolean
    reportInterval: number
    maxErrors: number
  }
  performanceMonitoring: {
    enabled: boolean
    trackWebVitals: boolean
    trackCustomMetrics: boolean
  }
  userAnalytics: {
    enabled: boolean
    trackPageViews: boolean
    trackUserInteractions: boolean
    trackGameEvents: boolean
  }
  alerting: {
    enabled: boolean
    channels: string[]
    defaultRules: boolean
  }
}

/**
 * 监控系统状态
 */
export interface MonitoringStatus {
  errorMonitor: boolean
  performanceDashboard: boolean
  userAnalytics: boolean
  alertSystem: boolean
  overallHealth: 'healthy' | 'warning' | 'critical'
}

/**
 * 监控系统管理器
 */
export class MonitoringSystem {
  private static instance: MonitoringSystem
  private config: MonitoringConfig
  private isInitialized = false
  private healthCheckInterval?: number
  
  private constructor() {
    this.config = this.getDefaultConfig()
  }
  
  static getInstance(): MonitoringSystem {
    if (!MonitoringSystem.instance) {
      MonitoringSystem.instance = new MonitoringSystem()
    }
    return MonitoringSystem.instance
  }
  
  /**
   * 初始化监控系统
   */
  async initialize(config?: Partial<MonitoringConfig>): Promise<void> {
    if (this.isInitialized) {
      console.warn('📊 监控系统已经初始化')
      return
    }
    
    console.log('📊 初始化监控系统...')
    
    // 合并配置
    if (config) {
      this.config = this.mergeConfig(this.config, config)
    }
    
    try {
      // 初始化各个监控组件
      await this.initializeComponents()
      
      // 设置健康检查
      this.startHealthCheck()
      
      // 设置全局错误处理
      this.setupGlobalErrorHandling()
      
      this.isInitialized = true
      console.log('✅ 监控系统初始化完成')
      
      // 发送初始化成功事件
      this.trackSystemEvent('monitoring_system_initialized', {
        config: this.config,
        timestamp: Date.now()
      })
      
    } catch (error) {
      console.error('❌ 监控系统初始化失败:', error)
      throw error
    }
  }
  
  /**
   * 初始化监控组件
   */
  private async initializeComponents(): Promise<void> {
    const initPromises: Promise<void>[] = []
    
    // 错误监控
    if (this.config.errorMonitoring.enabled) {
      initPromises.push(this.initializeErrorMonitoring())
    }
    
    // 性能监控
    if (this.config.performanceMonitoring.enabled) {
      initPromises.push(this.initializePerformanceMonitoring())
    }
    
    // 用户分析
    if (this.config.userAnalytics.enabled) {
      initPromises.push(this.initializeUserAnalytics())
    }
    
    // 告警系统
    if (this.config.alerting.enabled) {
      initPromises.push(this.initializeAlertSystem())
    }
    
    await Promise.all(initPromises)
  }
  
  /**
   * 初始化错误监控
   */
  private async initializeErrorMonitoring(): Promise<void> {
    errorMonitor.initialize({
      enabled: true,
      maxErrors: this.config.errorMonitoring.maxErrors,
      reportInterval: this.config.errorMonitoring.reportInterval,
      enableAutoReport: true,
      enableStackTrace: true,
      enableUserContext: true,
      enablePerformanceTracking: true
    })
    
    console.log('✅ 错误监控已启动')
  }
  
  /**
   * 初始化性能监控
   */
  private async initializePerformanceMonitoring(): Promise<void> {
    performanceDashboard.startMonitoring()
    
    console.log('✅ 性能监控已启动')
  }
  
  /**
   * 初始化用户分析
   */
  private async initializeUserAnalytics(): Promise<void> {
    // 获取用户ID（如果有的话）
    const userId = this.getUserId()
    
    userAnalytics.startTracking(userId)
    
    // 设置自动页面跟踪
    if (this.config.userAnalytics.trackPageViews) {
      this.setupAutoPageTracking()
    }
    
    // 设置自动交互跟踪
    if (this.config.userAnalytics.trackUserInteractions) {
      this.setupAutoInteractionTracking()
    }
    
    console.log('✅ 用户分析已启动')
  }
  
  /**
   * 初始化告警系统
   */
  private async initializeAlertSystem(): Promise<void> {
    alertSystem.startMonitoring()
    
    // 配置通知渠道
    alertSystem.configureNotifications({
      console: { enabled: true, logLevel: 'warning' as any },
      browser: { enabled: true, permission: false }
    })
    
    console.log('✅ 告警系统已启动')
  }
  
  /**
   * 设置自动页面跟踪
   */
  private setupAutoPageTracking(): void {
    // 监听路由变化（适用于SPA）
    let currentPath = window.location.pathname
    
    const checkPathChange = () => {
      const newPath = window.location.pathname
      if (newPath !== currentPath) {
        userAnalytics.trackPageView(newPath, document.title)
        currentPath = newPath
      }
    }
    
    // 监听popstate事件
    window.addEventListener('popstate', checkPathChange)
    
    // 监听pushState和replaceState
    const originalPushState = history.pushState
    const originalReplaceState = history.replaceState
    
    history.pushState = function(...args) {
      originalPushState.apply(history, args)
      setTimeout(checkPathChange, 0)
    }
    
    history.replaceState = function(...args) {
      originalReplaceState.apply(history, args)
      setTimeout(checkPathChange, 0)
    }
  }
  
  /**
   * 设置自动交互跟踪
   */
  private setupAutoInteractionTracking(): void {
    // 点击事件跟踪
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement
      if (target && target.tagName) {
        userAnalytics.trackClick(target, {
          clientX: event.clientX,
          clientY: event.clientY
        })
      }
    })
    
    // 表单提交跟踪
    document.addEventListener('submit', (event) => {
      const form = event.target as HTMLFormElement
      userAnalytics.trackCustomEvent('form_submit', {
        formId: form.id,
        formAction: form.action,
        formMethod: form.method
      })
    })
  }
  
  /**
   * 设置全局错误处理
   */
  private setupGlobalErrorHandling(): void {
    // 监听未处理的Promise拒绝
    window.addEventListener('unhandledrejection', (event) => {
      errorMonitor.captureError({
        type: 'promise' as any,
        level: 'error' as any,
        message: event.reason?.message || String(event.reason),
        stack: event.reason?.stack,
        context: {
          event: 'unhandledrejection',
          reason: event.reason
        }
      })
    })
    
    // 监听资源加载错误
    window.addEventListener('error', (event) => {
      if (event.target !== window) {
        errorMonitor.captureError({
          type: 'resource' as any,
          level: 'warn' as any,
          message: `资源加载失败: ${(event.target as any)?.src || (event.target as any)?.href}`,
          url: (event.target as any)?.src || (event.target as any)?.href,
          context: {
            event: 'resource.error',
            tagName: (event.target as any)?.tagName
          }
        })
      }
    }, true)
  }
  
  /**
   * 开始健康检查
   */
  private startHealthCheck(): void {
    this.healthCheckInterval = window.setInterval(() => {
      this.performHealthCheck()
    }, 60000) // 每分钟检查一次
  }
  
  /**
   * 执行健康检查
   */
  private performHealthCheck(): void {
    const status = this.getSystemStatus()
    
    // 记录健康状态
    this.trackSystemEvent('health_check', {
      status,
      timestamp: Date.now()
    })
    
    // 如果系统不健康，触发告警
    if (status.overallHealth !== 'healthy') {
      alertSystem.triggerAlert(
        'custom' as any,
        status.overallHealth === 'critical' ? 'critical' as any : 'warning' as any,
        '监控系统健康检查',
        `系统健康状态: ${status.overallHealth}`,
        { status }
      )
    }
  }
  
  /**
   * 获取系统状态
   */
  getSystemStatus(): MonitoringStatus {
    const status: MonitoringStatus = {
      errorMonitor: this.config.errorMonitoring.enabled,
      performanceDashboard: this.config.performanceMonitoring.enabled,
      userAnalytics: this.config.userAnalytics.enabled,
      alertSystem: this.config.alerting.enabled,
      overallHealth: 'healthy'
    }
    
    // 检查各组件状态
    const activeComponents = Object.values(status).filter(Boolean).length - 1 // 排除overallHealth
    const totalComponents = 4
    
    if (activeComponents < totalComponents * 0.5) {
      status.overallHealth = 'critical'
    } else if (activeComponents < totalComponents * 0.8) {
      status.overallHealth = 'warning'
    }
    
    return status
  }
  
  /**
   * 获取监控数据摘要
   */
  getMonitoringSummary(): {
    errors: any
    performance: any
    userBehavior: any
    alerts: any
  } {
    return {
      errors: errorMonitor.getErrorStats(),
      performance: {
        metrics: performanceDashboard.getCurrentMetrics(),
        score: performanceDashboard.getPerformanceScore()
      },
      userBehavior: userAnalytics.getBehaviorStats(),
      alerts: alertSystem.getAlertStats()
    }
  }
  
  /**
   * 生成监控报告
   */
  generateMonitoringReport(): string {
    const summary = this.getMonitoringSummary()
    const status = this.getSystemStatus()
    
    const report = [
      '# 监控系统综合报告',
      '',
      `**生成时间**: ${new Date().toLocaleString()}`,
      `**系统健康状态**: ${status.overallHealth}`,
      '',
      '## 系统状态',
      '',
      `- 错误监控: ${status.errorMonitor ? '✅' : '❌'}`,
      `- 性能监控: ${status.performanceDashboard ? '✅' : '❌'}`,
      `- 用户分析: ${status.userAnalytics ? '✅' : '❌'}`,
      `- 告警系统: ${status.alertSystem ? '✅' : '❌'}`,
      '',
      '## 错误统计',
      '',
      `- 总错误数: ${summary.errors.totalErrors}`,
      `- 错误率: ${summary.errors.errorRate.toFixed(2)}/分钟`,
      `- 最近错误: ${summary.errors.recentErrors.length}`,
      '',
      '## 性能指标',
      '',
      `- 性能评分: ${summary.performance.score}/100`,
      `- FPS: ${summary.performance.metrics.fps}`,
      `- 内存使用: ${summary.performance.metrics.memoryUsage.percentage.toFixed(1)}%`,
      '',
      '## 用户行为',
      '',
      `- 活跃用户: ${summary.userBehavior.activeUsers}`,
      `- 平均会话时长: ${(summary.userBehavior.averageSessionDuration / 1000 / 60).toFixed(1)}分钟`,
      `- 跳出率: ${(summary.userBehavior.bounceRate * 100).toFixed(1)}%`,
      '',
      '## 告警统计',
      '',
      `- 活跃告警: ${summary.alerts.active}`,
      `- 总告警数: ${summary.alerts.total}`,
      `- 已解决: ${summary.alerts.resolved}`,
      ''
    ]
    
    return report.join('\n')
  }
  
  /**
   * 跟踪系统事件
   */
  private trackSystemEvent(eventName: string, data: Record<string, any>): void {
    if (this.config.userAnalytics.enabled) {
      userAnalytics.trackCustomEvent(`system_${eventName}`, data)
    }
  }
  
  /**
   * 获取用户ID
   */
  private getUserId(): string | undefined {
    return localStorage.getItem('userId') || undefined
  }
  
  /**
   * 获取默认配置
   */
  private getDefaultConfig(): MonitoringConfig {
    return {
      errorMonitoring: {
        enabled: true,
        reportInterval: 60000,
        maxErrors: 1000
      },
      performanceMonitoring: {
        enabled: true,
        trackWebVitals: true,
        trackCustomMetrics: true
      },
      userAnalytics: {
        enabled: true,
        trackPageViews: true,
        trackUserInteractions: true,
        trackGameEvents: true
      },
      alerting: {
        enabled: true,
        channels: ['console', 'browser'],
        defaultRules: true
      }
    }
  }
  
  /**
   * 合并配置
   */
  private mergeConfig(defaultConfig: MonitoringConfig, customConfig: Partial<MonitoringConfig>): MonitoringConfig {
    return {
      errorMonitoring: { ...defaultConfig.errorMonitoring, ...customConfig.errorMonitoring },
      performanceMonitoring: { ...defaultConfig.performanceMonitoring, ...customConfig.performanceMonitoring },
      userAnalytics: { ...defaultConfig.userAnalytics, ...customConfig.userAnalytics },
      alerting: { ...defaultConfig.alerting, ...customConfig.alerting }
    }
  }
  
  /**
   * 销毁监控系统
   */
  destroy(): void {
    if (!this.isInitialized) return
    
    // 停止各个组件
    errorMonitor.destroy()
    performanceDashboard.stopMonitoring()
    userAnalytics.stopTracking()
    alertSystem.stopMonitoring()
    
    // 清理定时器
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
    }
    
    this.isInitialized = false
    console.log('📊 监控系统已销毁')
  }
}

// 导出单例实例
export const monitoringSystem = MonitoringSystem.getInstance()

// 在开发环境中挂载到全局
if (import.meta.env.DEV) {
  (window as any).monitoringSystem = monitoringSystem
  console.log('📊 监控系统已挂载到 window.monitoringSystem')
}
