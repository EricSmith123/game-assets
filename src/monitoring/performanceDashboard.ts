/**
 * 性能监控仪表板
 * 
 * 提供实时性能指标监控、可视化展示和性能分析功能
 */

import { performanceMonitor } from '../utils/performanceMonitor'

/**
 * 轻量级FPS计算器 - 降低监控开销
 */
class LightweightFPSCalculator {
  private frameCount = 0
  private lastTime = performance.now()
  private fps = 60
  private frameTime = 16.67
  private isActive = false

  constructor() {
    this.startCalculation()
  }

  private startCalculation(): void {
    if (this.isActive) return
    this.isActive = true

    // 使用更低频率的采样
    const sampleFrame = () => {
      if (!this.isActive) return

      this.frameCount++
      const currentTime = performance.now()
      const deltaTime = currentTime - this.lastTime

      // 每2秒更新一次FPS，降低计算频率
      if (deltaTime >= 2000) {
        this.fps = Math.round((this.frameCount * 1000) / deltaTime)
        this.frameTime = deltaTime / this.frameCount
        this.frameCount = 0
        this.lastTime = currentTime
      }

      // 使用setTimeout代替requestAnimationFrame，降低开销
      setTimeout(sampleFrame, 100) // 每100ms采样一次
    }

    sampleFrame()
  }

  getCurrentFPS(): { fps: number; frameTime: number } | null {
    return {
      fps: this.fps,
      frameTime: this.frameTime
    }
  }

  stop(): void {
    this.isActive = false
  }
}

/**
 * 性能指标接口
 */
export interface PerformanceMetrics {
  // 基础性能指标
  fps: number
  frameTime: number
  memoryUsage: {
    used: number
    total: number
    percentage: number
  }
  
  // 网络性能
  networkLatency: number
  downloadSpeed: number
  
  // 渲染性能
  renderTime: number
  paintTime: number
  layoutTime: number
  
  // 用户体验指标
  firstContentfulPaint: number
  largestContentfulPaint: number
  firstInputDelay: number
  cumulativeLayoutShift: number
  
  // 自定义指标
  gameLoadTime: number
  averageMatchTime: number
  animationFrameRate: number

  // 任务1优化成果指标
  task1Metrics: {
    // 游戏板渲染优化指标
    renderOptimization: {
      averageRenderTime: number
      renderCacheHitRate: number
      virtualizedTileCount: number
    }

    // 音频系统修复指标
    audioSystemHealth: {
      audioInitTime: number
      audioPlaybackLatency: number
      audioErrorRate: number
    }

    // 状态管理优化指标
    stateManagement: {
      stateUpdateLatency: number
      reactiveUpdateCount: number
      stateConsistencyScore: number
    }
  }

  // 移动端专用指标
  mobileMetrics: {
    // 触摸交互指标
    touchInteraction: {
      averageTouchLatency: number
      touchEventCount: number
      gestureRecognitionTime: number
      touchTargetHitRate: number
    }

    // 移动端渲染指标
    mobileRendering: {
      viewportAdaptationTime: number
      orientationChangeTime: number
      dpiScalingPerformance: number
    }

    // 移动端网络指标
    mobileNetwork: {
      connectionType: string
      effectiveType: string
      downlink: number
      rtt: number
      saveData: boolean
    }

    // 移动端用户体验指标
    mobileUX: {
      scrollPerformance: number
      pinchZoomLatency: number
      hapticFeedbackLatency: number
      batteryLevel: number
    }
  }
}

/**
 * 性能阈值配置
 */
export interface PerformanceThresholds {
  fps: { good: number; poor: number }
  memoryUsage: { good: number; poor: number }
  renderTime: { good: number; poor: number }
  networkLatency: { good: number; poor: number }
  firstContentfulPaint: { good: number; poor: number }
  largestContentfulPaint: { good: number; poor: number }
  firstInputDelay: { good: number; poor: number }
  cumulativeLayoutShift: { good: number; poor: number }
}

/**
 * 性能状态枚举
 */
export enum PerformanceStatus {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  FAIR = 'fair',
  POOR = 'poor'
}

/**
 * 性能监控仪表板
 */
export class PerformanceDashboard {
  private static instance: PerformanceDashboard
  private metrics: PerformanceMetrics
  private metricsHistory: PerformanceMetrics[] = []
  private thresholds: PerformanceThresholds
  private isMonitoring = false
  private monitoringInterval?: number
  private observers: PerformanceObserver[] = []
  
  private constructor() {
    this.metrics = this.getInitialMetrics()
    this.thresholds = this.getDefaultThresholds()
  }
  
  static getInstance(): PerformanceDashboard {
    if (!PerformanceDashboard.instance) {
      PerformanceDashboard.instance = new PerformanceDashboard()
    }
    return PerformanceDashboard.instance
  }
  
  /**
   * 开始性能监控
   */
  startMonitoring(): void {
    if (this.isMonitoring) {
      console.warn('📊 性能监控已在运行')
      return
    }
    
    this.isMonitoring = true
    this.setupPerformanceObservers()
    this.startMetricsCollection()
    
    console.log('📊 性能监控仪表板已启动')
  }
  
  /**
   * 停止性能监控
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) return

    this.isMonitoring = false

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
    }

    this.observers.forEach(observer => observer.disconnect())
    this.observers = []

    // 清理FPS计算器
    if (this.fpsCalculator) {
      this.fpsCalculator.stop()
      this.fpsCalculator = undefined
    }

    console.log('📊 性能监控已停止')
  }
  
  /**
   * 设置性能观察器
   */
  private setupPerformanceObservers(): void {
    if (!('PerformanceObserver' in window)) {
      console.warn('📊 PerformanceObserver不支持')
      return
    }
    
    try {
      // FCP和LCP观察器
      const paintObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            this.metrics.firstContentfulPaint = entry.startTime
          }
        }
      })
      paintObserver.observe({ entryTypes: ['paint'] })
      this.observers.push(paintObserver)
      
      // LCP观察器
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const lastEntry = entries[entries.length - 1]
        this.metrics.largestContentfulPaint = lastEntry.startTime
      })
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })
      this.observers.push(lcpObserver)
      
      // FID观察器
      const fidObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.metrics.firstInputDelay = entry.processingStart - entry.startTime
        }
      })
      fidObserver.observe({ entryTypes: ['first-input'] })
      this.observers.push(fidObserver)
      
      // CLS观察器
      const clsObserver = new PerformanceObserver((list) => {
        let clsValue = 0
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value
          }
        }
        this.metrics.cumulativeLayoutShift = clsValue
      })
      clsObserver.observe({ entryTypes: ['layout-shift'] })
      this.observers.push(clsObserver)
      
      // 导航时间观察器
      const navigationObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const navEntry = entry as PerformanceNavigationTiming
          this.metrics.networkLatency = navEntry.responseStart - navEntry.requestStart
          this.metrics.gameLoadTime = navEntry.loadEventEnd - navEntry.navigationStart
        }
      })
      navigationObserver.observe({ entryTypes: ['navigation'] })
      this.observers.push(navigationObserver)
      
    } catch (error) {
      console.warn('📊 设置性能观察器失败:', error)
    }
  }
  
  /**
   * 开始指标收集 - 优化版本，降低收集频率
   */
  private startMetricsCollection(): void {
    // 使用分层收集策略，降低整体开销

    // 高频指标：每2秒收集一次（FPS、内存）
    this.monitoringInterval = window.setInterval(() => {
      this.collectHighFrequencyMetrics()
      this.updateHistory()
    }, 2000)

    // 低频指标：每5秒收集一次（网络、游戏指标）
    window.setInterval(() => {
      this.collectLowFrequencyMetrics()
    }, 5000)
  }

  /**
   * 收集高频指标
   */
  private collectHighFrequencyMetrics(): void {
    // FPS计算
    this.calculateFPS()

    // 内存使用情况
    this.collectMemoryMetrics()

    // 渲染性能
    this.collectRenderMetrics()
  }

  /**
   * 收集低频指标
   */
  private collectLowFrequencyMetrics(): void {
    // 网络性能
    this.collectNetworkMetrics()

    // 自定义游戏指标
    this.collectGameMetrics()
  }
  
  /**
   * 收集性能指标 - 保留用于兼容性
   */
  private collectMetrics(): void {
    // 现在使用分层收集策略
    this.collectHighFrequencyMetrics()
    this.collectLowFrequencyMetrics()
  }
  
  /**
   * 计算FPS - 优化版本，降低监控开销
   */
  private calculateFPS(): void {
    // 使用更轻量级的FPS计算方法
    if (!this.fpsCalculator) {
      this.fpsCalculator = new LightweightFPSCalculator()
    }

    // 只在需要时更新FPS
    const fpsData = this.fpsCalculator.getCurrentFPS()
    if (fpsData) {
      this.metrics.fps = fpsData.fps
      this.metrics.frameTime = fpsData.frameTime
    }
  }

  /**
   * 轻量级FPS计算器
   */
  private fpsCalculator?: LightweightFPSCalculator
  
  /**
   * 收集内存指标
   */
  private collectMemoryMetrics(): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory
      this.metrics.memoryUsage = {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        percentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
      }
    }
  }
  
  /**
   * 收集渲染指标
   */
  private collectRenderMetrics(): void {
    // 从性能监控器获取渲染时间
    const renderStats = performanceMonitor.getStats()
    
    if (renderStats.render) {
      this.metrics.renderTime = renderStats.render.averageTime
    }
    
    // 获取绘制时间
    const paintEntries = performance.getEntriesByType('paint')
    if (paintEntries.length > 0) {
      this.metrics.paintTime = paintEntries[paintEntries.length - 1].startTime
    }
    
    // 获取布局时间
    const measureEntries = performance.getEntriesByType('measure')
    const layoutEntries = measureEntries.filter(entry => entry.name.includes('layout'))
    if (layoutEntries.length > 0) {
      this.metrics.layoutTime = layoutEntries.reduce((sum, entry) => sum + entry.duration, 0) / layoutEntries.length
    }
  }
  
  /**
   * 收集网络指标
   */
  private collectNetworkMetrics(): void {
    const navigationEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[]
    if (navigationEntries.length > 0) {
      const nav = navigationEntries[0]
      this.metrics.networkLatency = nav.responseStart - nav.requestStart
      
      // 计算下载速度（简化版本）
      const transferSize = nav.transferSize || 0
      const downloadTime = nav.responseEnd - nav.responseStart
      this.metrics.downloadSpeed = downloadTime > 0 ? transferSize / downloadTime : 0
    }
  }
  
  /**
   * 收集游戏指标
   */
  private collectGameMetrics(): void {
    // 从游戏状态获取指标
    const gameStats = this.getGameStats()

    this.metrics.averageMatchTime = gameStats.averageMatchTime || 0
    this.metrics.animationFrameRate = gameStats.animationFrameRate || 60

    // 收集任务1优化成果指标
    this.collectTask1Metrics()

    // 收集移动端专用指标
    this.collectMobileMetrics()
  }

  /**
   * 收集任务1优化成果指标
   */
  private collectTask1Metrics(): void {
    // 游戏板渲染优化指标
    const renderStats = performanceMonitor.getStats()
    this.metrics.task1Metrics = {
      renderOptimization: {
        averageRenderTime: renderStats.render?.averageTime || 0,
        renderCacheHitRate: this.calculateRenderCacheHitRate(),
        virtualizedTileCount: this.getVirtualizedTileCount()
      },

      // 音频系统健康指标
      audioSystemHealth: {
        audioInitTime: renderStats.audioInit?.averageTime || 0,
        audioPlaybackLatency: this.calculateAudioLatency(),
        audioErrorRate: this.calculateAudioErrorRate()
      },

      // 状态管理优化指标
      stateManagement: {
        stateUpdateLatency: renderStats.stateUpdate?.averageTime || 0,
        reactiveUpdateCount: renderStats.reactiveUpdates?.gameboardUpdates || 0,
        stateConsistencyScore: this.calculateStateConsistencyScore()
      }
    }
  }

  /**
   * 计算渲染缓存命中率
   */
  private calculateRenderCacheHitRate(): number {
    // 从性能监控器获取缓存统计
    const stats = performanceMonitor.getStats()
    const cacheHits = stats.cacheHits || 0
    const totalRequests = stats.totalRequests || 1
    return (cacheHits / totalRequests) * 100
  }

  /**
   * 获取虚拟化方块数量
   */
  private getVirtualizedTileCount(): number {
    // 从DOM或游戏状态获取虚拟化渲染的方块数量
    const virtualGameBoard = document.querySelector('.virtual-game-board-container')
    if (virtualGameBoard) {
      const tiles = virtualGameBoard.querySelectorAll('.tile')
      return tiles.length
    }
    return 0
  }

  /**
   * 计算音频播放延迟
   */
  private calculateAudioLatency(): number {
    // 从音频管理器获取延迟统计
    const audioStats = (window as any).optimizedAudioManager?.getStats?.() || {}
    return audioStats.averageLatency || 0
  }

  /**
   * 计算音频错误率
   */
  private calculateAudioErrorRate(): number {
    const audioStats = (window as any).optimizedAudioManager?.getStats?.() || {}
    const errors = audioStats.errorCount || 0
    const total = audioStats.totalAttempts || 1
    return (errors / total) * 100
  }

  /**
   * 计算状态一致性得分
   */
  private calculateStateConsistencyScore(): number {
    // 基于状态更新成功率和响应时间计算得分
    const stats = performanceMonitor.getStats()
    const updateLatency = stats.stateUpdate?.averageTime || 0
    const errorRate = stats.stateErrors || 0

    // 得分计算：延迟越低、错误率越低，得分越高
    const latencyScore = Math.max(0, 100 - updateLatency / 10)
    const errorScore = Math.max(0, 100 - errorRate * 10)

    return (latencyScore + errorScore) / 2
  }

  /**
   * 收集移动端专用指标
   */
  private collectMobileMetrics(): void {
    // 检测是否为移动设备
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

    if (!isMobile) {
      // 非移动设备，设置默认值
      return
    }

    // 收集触摸交互指标
    this.collectTouchInteractionMetrics()

    // 收集移动端渲染指标
    this.collectMobileRenderingMetrics()

    // 收集移动端网络指标
    this.collectMobileNetworkMetrics()

    // 收集移动端用户体验指标
    this.collectMobileUXMetrics()
  }

  /**
   * 收集触摸交互指标
   */
  private collectTouchInteractionMetrics(): void {
    // 从触摸手势管理器获取统计
    const touchStats = (window as any).touchGestureManager?.getStats?.() || {}

    this.metrics.mobileMetrics.touchInteraction = {
      averageTouchLatency: touchStats.averageLatency || 0,
      touchEventCount: touchStats.eventCount || 0,
      gestureRecognitionTime: touchStats.recognitionTime || 0,
      touchTargetHitRate: touchStats.hitRate || 100
    }
  }

  /**
   * 收集移动端渲染指标
   */
  private collectMobileRenderingMetrics(): void {
    // 从响应式管理器获取统计
    const responsiveStats = (window as any).responsiveManager?.getStats?.() || {}

    this.metrics.mobileMetrics.mobileRendering = {
      viewportAdaptationTime: responsiveStats.adaptationTime || 0,
      orientationChangeTime: responsiveStats.orientationChangeTime || 0,
      dpiScalingPerformance: this.calculateDPIScalingPerformance()
    }
  }

  /**
   * 收集移动端网络指标
   */
  private collectMobileNetworkMetrics(): void {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection

    if (connection) {
      this.metrics.mobileMetrics.mobileNetwork = {
        connectionType: connection.type || 'unknown',
        effectiveType: connection.effectiveType || 'unknown',
        downlink: connection.downlink || 0,
        rtt: connection.rtt || 0,
        saveData: connection.saveData || false
      }
    }
  }

  /**
   * 收集移动端用户体验指标
   */
  private collectMobileUXMetrics(): void {
    // 电池状态
    const battery = (navigator as any).battery || (navigator as any).getBattery?.()
    const batteryLevel = battery?.level ? battery.level * 100 : 100

    this.metrics.mobileMetrics.mobileUX = {
      scrollPerformance: this.calculateScrollPerformance(),
      pinchZoomLatency: this.calculatePinchZoomLatency(),
      hapticFeedbackLatency: this.calculateHapticFeedbackLatency(),
      batteryLevel
    }
  }

  /**
   * 计算DPI缩放性能
   */
  private calculateDPIScalingPerformance(): number {
    const devicePixelRatio = window.devicePixelRatio || 1
    // 基于设备像素比计算缩放性能得分
    if (devicePixelRatio <= 1) return 100
    if (devicePixelRatio <= 2) return 90
    if (devicePixelRatio <= 3) return 80
    return 70
  }

  /**
   * 计算滚动性能
   */
  private calculateScrollPerformance(): number {
    // 基于帧率计算滚动性能
    const fps = this.metrics.fps
    if (fps >= 55) return 100
    if (fps >= 45) return 80
    if (fps >= 30) return 60
    return 40
  }

  /**
   * 计算捏合缩放延迟
   */
  private calculatePinchZoomLatency(): number {
    // 从触摸手势管理器获取缩放延迟
    const touchStats = (window as any).touchGestureManager?.getStats?.() || {}
    return touchStats.pinchLatency || 0
  }

  /**
   * 计算触觉反馈延迟
   */
  private calculateHapticFeedbackLatency(): number {
    // 从移动端优化器获取触觉反馈延迟
    const mobileStats = (window as any).mobileOptimizer?.getStats?.() || {}
    return mobileStats.hapticLatency || 0
  }
  
  /**
   * 更新历史记录
   */
  private updateHistory(): void {
    this.metricsHistory.push({ ...this.metrics })
    
    // 保持最近100个记录
    if (this.metricsHistory.length > 100) {
      this.metricsHistory.shift()
    }
  }
  
  /**
   * 获取当前性能指标
   */
  getCurrentMetrics(): PerformanceMetrics {
    return { ...this.metrics }
  }
  
  /**
   * 获取性能历史
   */
  getMetricsHistory(): PerformanceMetrics[] {
    return [...this.metricsHistory]
  }
  
  /**
   * 获取性能状态
   */
  getPerformanceStatus(): Record<keyof PerformanceMetrics, PerformanceStatus> {
    const status: any = {}
    
    // FPS状态
    status.fps = this.getMetricStatus(this.metrics.fps, this.thresholds.fps)
    
    // 内存状态
    status.memoryUsage = this.getMetricStatus(
      this.metrics.memoryUsage.percentage, 
      this.thresholds.memoryUsage,
      true // 反向：越低越好
    )
    
    // 渲染时间状态
    status.renderTime = this.getMetricStatus(
      this.metrics.renderTime, 
      this.thresholds.renderTime,
      true
    )
    
    // 网络延迟状态
    status.networkLatency = this.getMetricStatus(
      this.metrics.networkLatency, 
      this.thresholds.networkLatency,
      true
    )
    
    // Web Vitals状态
    status.firstContentfulPaint = this.getMetricStatus(
      this.metrics.firstContentfulPaint, 
      this.thresholds.firstContentfulPaint,
      true
    )
    
    status.largestContentfulPaint = this.getMetricStatus(
      this.metrics.largestContentfulPaint, 
      this.thresholds.largestContentfulPaint,
      true
    )
    
    status.firstInputDelay = this.getMetricStatus(
      this.metrics.firstInputDelay, 
      this.thresholds.firstInputDelay,
      true
    )
    
    status.cumulativeLayoutShift = this.getMetricStatus(
      this.metrics.cumulativeLayoutShift, 
      this.thresholds.cumulativeLayoutShift,
      true
    )
    
    return status
  }
  
  /**
   * 获取性能评分
   */
  getPerformanceScore(): number {
    const statuses = this.getPerformanceStatus()
    const scores = Object.values(statuses).map(status => {
      switch (status) {
        case PerformanceStatus.EXCELLENT: return 100
        case PerformanceStatus.GOOD: return 80
        case PerformanceStatus.FAIR: return 60
        case PerformanceStatus.POOR: return 40
        default: return 0
      }
    })
    
    return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
  }
  
  /**
   * 生成性能报告 - 包含回归检测
   */
  generatePerformanceReport(): string {
    const metrics = this.getCurrentMetrics()
    const status = this.getPerformanceStatus()
    const score = this.getPerformanceScore()
    const regressionAlerts = this.checkPerformanceRegression()

    const report = [
      '# 性能监控报告',
      '',
      `**生成时间**: ${new Date().toLocaleString()}`,
      `**性能评分**: ${score}/100`,
      '',
      '## 核心指标',
      '',
      `| 指标 | 当前值 | 状态 | 阈值 |`,
      `|------|--------|------|------|`,
      `| FPS | ${metrics.fps} | ${this.getStatusIcon(status.fps)} | >${this.thresholds.fps.good} |`,
      `| 内存使用 | ${metrics.memoryUsage.percentage.toFixed(1)}% | ${this.getStatusIcon(status.memoryUsage)} | <${this.thresholds.memoryUsage.good}% |`,
      `| 渲染时间 | ${metrics.renderTime.toFixed(2)}ms | ${this.getStatusIcon(status.renderTime)} | <${this.thresholds.renderTime.good}ms |`,
      `| 网络延迟 | ${metrics.networkLatency.toFixed(2)}ms | ${this.getStatusIcon(status.networkLatency)} | <${this.thresholds.networkLatency.good}ms |`,
      '',
      '## Web Vitals',
      '',
      `| 指标 | 当前值 | 状态 |`,
      `|------|--------|------|`,
      `| FCP | ${metrics.firstContentfulPaint.toFixed(2)}ms | ${this.getStatusIcon(status.firstContentfulPaint)} |`,
      `| LCP | ${metrics.largestContentfulPaint.toFixed(2)}ms | ${this.getStatusIcon(status.largestContentfulPaint)} |`,
      `| FID | ${metrics.firstInputDelay.toFixed(2)}ms | ${this.getStatusIcon(status.firstInputDelay)} |`,
      `| CLS | ${metrics.cumulativeLayoutShift.toFixed(3)} | ${this.getStatusIcon(status.cumulativeLayoutShift)} |`,
      '',
      '## 游戏性能',
      '',
      `- 游戏加载时间: ${metrics.gameLoadTime.toFixed(2)}ms`,
      `- 平均匹配时间: ${metrics.averageMatchTime.toFixed(2)}ms`,
      `- 动画帧率: ${metrics.animationFrameRate} FPS`,
      ''
    ]

    // 添加回归检测结果
    if (regressionAlerts.length > 0) {
      report.push('## ⚠️ 性能回归警告')
      report.push('')
      regressionAlerts.forEach(alert => {
        report.push(`- **${alert.metric}**: 当前 ${alert.current.toFixed(2)}, 基准 ${alert.baseline}, 回归 ${alert.regression.toFixed(1)}%`)
      })
      report.push('')
    } else {
      report.push('## ✅ 性能状态良好')
      report.push('')
      report.push('- 所有指标均在预期范围内')
      report.push('')
    }

    return report.join('\n')
  }
  
  // 私有辅助方法
  private getInitialMetrics(): PerformanceMetrics {
    return {
      fps: 0,
      frameTime: 0,
      memoryUsage: { used: 0, total: 0, percentage: 0 },
      networkLatency: 0,
      downloadSpeed: 0,
      renderTime: 0,
      paintTime: 0,
      layoutTime: 0,
      firstContentfulPaint: 0,
      largestContentfulPaint: 0,
      firstInputDelay: 0,
      cumulativeLayoutShift: 0,
      gameLoadTime: 0,
      averageMatchTime: 0,
      animationFrameRate: 60,

      // 任务1优化成果指标
      task1Metrics: {
        renderOptimization: {
          averageRenderTime: 0,
          renderCacheHitRate: 0,
          virtualizedTileCount: 0
        },
        audioSystemHealth: {
          audioInitTime: 0,
          audioPlaybackLatency: 0,
          audioErrorRate: 0
        },
        stateManagement: {
          stateUpdateLatency: 0,
          reactiveUpdateCount: 0,
          stateConsistencyScore: 100
        }
      },

      // 移动端专用指标
      mobileMetrics: {
        touchInteraction: {
          averageTouchLatency: 0,
          touchEventCount: 0,
          gestureRecognitionTime: 0,
          touchTargetHitRate: 100
        },
        mobileRendering: {
          viewportAdaptationTime: 0,
          orientationChangeTime: 0,
          dpiScalingPerformance: 100
        },
        mobileNetwork: {
          connectionType: 'unknown',
          effectiveType: 'unknown',
          downlink: 0,
          rtt: 0,
          saveData: false
        },
        mobileUX: {
          scrollPerformance: 100,
          pinchZoomLatency: 0,
          hapticFeedbackLatency: 0,
          batteryLevel: 100
        }
      }
    }
  }
  
  private getDefaultThresholds(): PerformanceThresholds {
    return {
      fps: { good: 55, poor: 30 },
      memoryUsage: { good: 70, poor: 90 },
      renderTime: { good: 16, poor: 33 },
      networkLatency: { good: 100, poor: 300 },
      firstContentfulPaint: { good: 1800, poor: 3000 },
      largestContentfulPaint: { good: 2500, poor: 4000 },
      firstInputDelay: { good: 100, poor: 300 },
      cumulativeLayoutShift: { good: 0.1, poor: 0.25 }
    }
  }
  
  private getMetricStatus(
    value: number, 
    threshold: { good: number; poor: number }, 
    reverse = false
  ): PerformanceStatus {
    if (reverse) {
      if (value <= threshold.good) return PerformanceStatus.EXCELLENT
      if (value <= threshold.poor) return PerformanceStatus.GOOD
      return PerformanceStatus.POOR
    } else {
      if (value >= threshold.good) return PerformanceStatus.EXCELLENT
      if (value >= threshold.poor) return PerformanceStatus.GOOD
      return PerformanceStatus.POOR
    }
  }
  
  private getStatusIcon(status: PerformanceStatus): string {
    switch (status) {
      case PerformanceStatus.EXCELLENT: return '🟢'
      case PerformanceStatus.GOOD: return '🟡'
      case PerformanceStatus.FAIR: return '🟠'
      case PerformanceStatus.POOR: return '🔴'
      default: return '⚪'
    }
  }
  
  private getGameStats(): any {
    // 这里应该从游戏状态管理器获取实际数据
    return {
      averageMatchTime: 2500,
      animationFrameRate: 60
    }
  }

  /**
   * 检查性能回归 - 基于任务1-3的优化成果建立基准
   */
  private checkPerformanceRegression(): Array<{metric: string, current: number, baseline: number, regression: number}> {
    const alerts: Array<{metric: string, current: number, baseline: number, regression: number}> = [];

    // 定义性能基准（基于任务1-3的优化成果）
    const performanceBaselines = {
      fps: 55, // 最低可接受FPS
      memoryUsage: 100, // 最大内存使用(MB)
      renderTime: 20, // 最大渲染时间(ms)
      responseTime: 10, // 最大响应时间(ms)
      audioLatency: 50 // 最大音频延迟(ms)
    };

    // 检查FPS回归
    if (this.metrics.fps < performanceBaselines.fps) {
      alerts.push({
        metric: 'FPS',
        current: this.metrics.fps,
        baseline: performanceBaselines.fps,
        regression: ((performanceBaselines.fps - this.metrics.fps) / performanceBaselines.fps) * 100
      });
    }

    // 检查内存使用回归
    if (this.metrics.memoryUsage > performanceBaselines.memoryUsage) {
      alerts.push({
        metric: 'Memory Usage',
        current: this.metrics.memoryUsage,
        baseline: performanceBaselines.memoryUsage,
        regression: ((this.metrics.memoryUsage - performanceBaselines.memoryUsage) / performanceBaselines.memoryUsage) * 100
      });
    }

    // 检查任务1优化成果的回归
    const task1Metrics = this.metrics.task1Metrics;
    if (task1Metrics && task1Metrics.renderOptimization.averageRenderTime > performanceBaselines.renderTime) {
      alerts.push({
        metric: 'Render Time',
        current: task1Metrics.renderOptimization.averageRenderTime,
        baseline: performanceBaselines.renderTime,
        regression: ((task1Metrics.renderOptimization.averageRenderTime - performanceBaselines.renderTime) / performanceBaselines.renderTime) * 100
      });
    }

    if (task1Metrics && task1Metrics.audioSystemHealth.audioPlaybackLatency > performanceBaselines.audioLatency) {
      alerts.push({
        metric: 'Audio Latency',
        current: task1Metrics.audioSystemHealth.audioPlaybackLatency,
        baseline: performanceBaselines.audioLatency,
        regression: ((task1Metrics.audioSystemHealth.audioPlaybackLatency - performanceBaselines.audioLatency) / performanceBaselines.audioLatency) * 100
      });
    }

    return alerts;
  }
}

// 导出单例实例
export const performanceDashboard = PerformanceDashboard.getInstance()

// 在开发环境中挂载到全局
if (import.meta.env.DEV) {
  (window as any).performanceDashboard = performanceDashboard
  console.log('📊 性能监控仪表板已挂载到 window.performanceDashboard')
}
