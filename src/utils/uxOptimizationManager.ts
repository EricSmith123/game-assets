/**
 * 用户体验优化管理器
 * 
 * 统一管理响应式设计、移动端适配、可访问性等用户体验优化功能
 */

import { responsiveManager } from './responsiveManager'
import { accessibilityManager } from './accessibilityManager'
import { mobileOptimizer } from './mobileOptimizer'
import { touchGestureManager } from './touchGestureManager'
import { performanceMonitor } from './performanceMonitor'
import { difficultyBalanceManager } from './difficultyBalanceManager'

/**
 * 用户体验配置
 */
export interface UXConfig {
  // 响应式设计
  responsive: {
    enabled: boolean
    breakpoints: {
      mobile: number
      tablet: number
      desktop: number
    }
    autoDetect: boolean
  }
  
  // 移动端优化
  mobile: {
    enabled: boolean
    touchOptimization: boolean
    gestureSupport: boolean
    hapticFeedback: boolean
    viewportOptimization: boolean
  }
  
  // 可访问性
  accessibility: {
    enabled: boolean
    keyboardNavigation: boolean
    screenReader: boolean
    highContrast: boolean
    reducedMotion: boolean
    focusManagement: boolean
  }
  
  // 游戏体验
  gameExperience: {
    animationOptimization: boolean
    audioFeedback: boolean
    visualFeedback: boolean
    performanceMonitoring: boolean
    adaptiveDifficulty: boolean
    difficultyBalancing: boolean
  }
}

/**
 * 用户体验统计
 */
export interface UXStats {
  responsive: {
    deviceDetections: number
    layoutAdjustments: number
    orientationChanges: number
  }
  
  mobile: {
    touchEvents: number
    gestureRecognitions: number
    hapticFeedbacks: number
  }
  
  accessibility: {
    keyboardNavigations: number
    screenReaderAnnouncements: number
    focusChanges: number
  }
  
  performance: {
    averageFrameRate: number
    animationOptimizations: number
    memoryUsage: number
  }
}

/**
 * 用户体验优化管理器
 */
export class UXOptimizationManager {
  private static instance: UXOptimizationManager
  private config: UXConfig
  private stats: UXStats
  private isInitialized = false
  
  private constructor() {
    this.config = this.getDefaultConfig()
    this.stats = this.getDefaultStats()
  }
  
  static getInstance(): UXOptimizationManager {
    if (!UXOptimizationManager.instance) {
      UXOptimizationManager.instance = new UXOptimizationManager()
    }
    return UXOptimizationManager.instance
  }
  
  /**
   * 初始化用户体验优化
   */
  async initialize(customConfig?: Partial<UXConfig>): Promise<void> {
    if (this.isInitialized) {
      console.warn('🎨 UX优化管理器已经初始化')
      return
    }
    
    console.log('🎨 初始化用户体验优化管理器...')
    
    // 合并配置
    if (customConfig) {
      this.config = this.mergeConfig(this.config, customConfig)
    }
    
    // 初始化各个模块
    await this.initializeModules()
    
    // 设置事件监听
    this.setupEventListeners()
    
    // 应用初始优化
    this.applyInitialOptimizations()
    
    this.isInitialized = true
    console.log('✅ 用户体验优化管理器初始化完成')
  }
  
  /**
   * 初始化各个模块
   */
  private async initializeModules(): Promise<void> {
    const promises: Promise<void>[] = []
    
    // 初始化响应式管理器
    if (this.config.responsive.enabled) {
      promises.push(this.initializeResponsive())
    }
    
    // 初始化移动端优化
    if (this.config.mobile.enabled) {
      promises.push(this.initializeMobile())
    }
    
    // 初始化可访问性
    if (this.config.accessibility.enabled) {
      promises.push(this.initializeAccessibility())
    }
    
    // 初始化游戏体验优化
    if (this.config.gameExperience.performanceMonitoring) {
      promises.push(this.initializeGameExperience())
    }
    
    await Promise.all(promises)
  }
  
  /**
   * 初始化响应式设计
   */
  private async initializeResponsive(): Promise<void> {
    console.log('📱 初始化响应式设计...')
    
    // 设置断点
    responsiveManager.setBreakpoints(this.config.responsive.breakpoints)
    
    // 监听设备变化
    responsiveManager.on('devicechange', (data) => {
      this.stats.responsive.deviceDetections++
      this.handleDeviceChange(data)
    })
    
    // 监听方向变化
    responsiveManager.on('orientationchange', (data) => {
      this.stats.responsive.orientationChanges++
      this.handleOrientationChange(data)
    })
    
    console.log('✅ 响应式设计初始化完成')
  }
  
  /**
   * 初始化移动端优化
   */
  private async initializeMobile(): Promise<void> {
    console.log('📱 初始化移动端优化...')
    
    // 启用移动端优化
    mobileOptimizer.enable({
      enableTouchOptimization: this.config.mobile.touchOptimization,
      enableVibration: this.config.mobile.hapticFeedback,
      enableReducedMotion: this.config.accessibility.reducedMotion
    })
    
    // 设置触摸手势
    if (this.config.mobile.gestureSupport) {
      this.setupTouchGestures()
    }
    
    // 优化视口
    if (this.config.mobile.viewportOptimization) {
      this.optimizeViewport()
    }
    
    console.log('✅ 移动端优化初始化完成')
  }
  
  /**
   * 初始化可访问性
   */
  private async initializeAccessibility(): Promise<void> {
    console.log('♿ 初始化可访问性...')
    
    // 启用可访问性功能
    accessibilityManager.enable({
      keyboardNavigation: this.config.accessibility.keyboardNavigation,
      screenReader: this.config.accessibility.screenReader,
      highContrast: this.config.accessibility.highContrast,
      reducedMotion: this.config.accessibility.reducedMotion,
      focusManagement: this.config.accessibility.focusManagement
    })
    
    // 设置键盘导航
    if (this.config.accessibility.keyboardNavigation) {
      this.setupKeyboardNavigation()
    }
    
    // 设置屏幕阅读器支持
    if (this.config.accessibility.screenReader) {
      this.setupScreenReaderSupport()
    }
    
    console.log('✅ 可访问性初始化完成')
  }
  
  /**
   * 初始化游戏体验优化
   */
  private async initializeGameExperience(): Promise<void> {
    console.log('🎮 初始化游戏体验优化...')
    
    // 启动性能监控
    if (this.config.gameExperience.performanceMonitoring) {
      performanceMonitor.startMonitoring()
    }

    // 优化动画性能
    if (this.config.gameExperience.animationOptimization) {
      this.optimizeAnimations()
    }

    // 启用难度平衡系统
    if (this.config.gameExperience.difficultyBalancing) {
      this.initializeDifficultyBalancing()
    }

    // 启用自适应难度
    if (this.config.gameExperience.adaptiveDifficulty) {
      difficultyBalanceManager.enableAdaptiveDifficulty()
    }

    console.log('✅ 游戏体验优化初始化完成')
  }
  
  /**
   * 设置事件监听
   */
  private setupEventListeners(): void {
    // 窗口大小变化
    window.addEventListener('resize', this.handleResize.bind(this))
    
    // 方向变化
    window.addEventListener('orientationchange', this.handleOrientationChange.bind(this))
    
    // 可见性变化
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this))
    
    // 用户偏好变化
    this.setupPreferenceListeners()
  }
  
  /**
   * 设置用户偏好监听
   */
  private setupPreferenceListeners(): void {
    // 减少动画偏好
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    reducedMotionQuery.addEventListener('change', (e) => {
      this.handleReducedMotionChange(e.matches)
    })
    
    // 高对比度偏好
    const highContrastQuery = window.matchMedia('(prefers-contrast: high)')
    highContrastQuery.addEventListener('change', (e) => {
      this.handleHighContrastChange(e.matches)
    })
    
    // 颜色方案偏好
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)')
    darkModeQuery.addEventListener('change', (e) => {
      this.handleColorSchemeChange(e.matches ? 'dark' : 'light')
    })
  }
  
  /**
   * 设置触摸手势
   */
  private setupTouchGestures(): void {
    touchGestureManager.addEventListener('tap', (event) => {
      this.stats.mobile.touchEvents++
      this.handleTapGesture(event)
    })
    
    touchGestureManager.addEventListener('swipe', (event) => {
      this.stats.mobile.gestureRecognitions++
      this.handleSwipeGesture(event)
    })
    
    touchGestureManager.addEventListener('longpress', (event) => {
      this.stats.mobile.gestureRecognitions++
      this.handleLongPressGesture(event)
    })
  }
  
  /**
   * 设置键盘导航
   */
  private setupKeyboardNavigation(): void {
    document.addEventListener('keydown', (event) => {
      this.stats.accessibility.keyboardNavigations++
      this.handleKeyboardNavigation(event)
    })
  }
  
  /**
   * 设置屏幕阅读器支持
   */
  private setupScreenReaderSupport(): void {
    // 创建公告区域
    const announcer = document.createElement('div')
    announcer.setAttribute('aria-live', 'polite')
    announcer.setAttribute('aria-atomic', 'true')
    announcer.className = 'sr-only'
    announcer.style.cssText = `
      position: absolute;
      left: -10000px;
      width: 1px;
      height: 1px;
      overflow: hidden;
    `
    document.body.appendChild(announcer)
  }
  
  /**
   * 应用初始优化
   */
  private applyInitialOptimizations(): void {
    // 检测并应用用户偏好
    this.detectAndApplyUserPreferences()
    
    // 优化初始布局
    this.optimizeInitialLayout()
    
    // 预加载关键资源
    this.preloadCriticalResources()
  }
  
  /**
   * 检测并应用用户偏好
   */
  private detectAndApplyUserPreferences(): void {
    // 检测减少动画偏好
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.handleReducedMotionChange(true)
    }
    
    // 检测高对比度偏好
    if (window.matchMedia('(prefers-contrast: high)').matches) {
      this.handleHighContrastChange(true)
    }
    
    // 检测颜色方案偏好
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      this.handleColorSchemeChange('dark')
    }
  }
  
  /**
   * 优化初始布局
   */
  private optimizeInitialLayout(): void {
    // 设置视口
    this.optimizeViewport()
    
    // 应用响应式样式
    this.applyResponsiveStyles()
    
    // 优化字体加载
    this.optimizeFontLoading()
  }
  
  /**
   * 优化视口
   */
  private optimizeViewport(): void {
    let viewport = document.querySelector('meta[name="viewport"]')
    if (!viewport) {
      viewport = document.createElement('meta')
      viewport.setAttribute('name', 'viewport')
      document.head.appendChild(viewport)
    }
    
    const isMobile = responsiveManager.getCurrentDevice() === 'mobile'
    const content = isMobile 
      ? 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no'
      : 'width=device-width, initial-scale=1.0'
    
    viewport.setAttribute('content', content)
  }
  
  /**
   * 应用响应式样式
   */
  private applyResponsiveStyles(): void {
    const style = document.createElement('style')
    style.id = 'ux-responsive-styles'
    style.textContent = `
      /* 响应式基础样式 */
      .ux-responsive {
        width: 100%;
        max-width: 100vw;
        overflow-x: hidden;
      }
      
      /* 移动端优化 */
      @media (max-width: ${this.config.responsive.breakpoints.mobile}px) {
        .ux-mobile-optimized {
          padding: 10px;
          font-size: 16px;
          line-height: 1.5;
        }
        
        .ux-touch-target {
          min-height: 44px;
          min-width: 44px;
        }
      }
      
      /* 平板优化 */
      @media (min-width: ${this.config.responsive.breakpoints.mobile + 1}px) and (max-width: ${this.config.responsive.breakpoints.tablet}px) {
        .ux-tablet-optimized {
          padding: 15px;
          font-size: 18px;
          line-height: 1.4;
        }
      }
      
      /* 桌面优化 */
      @media (min-width: ${this.config.responsive.breakpoints.tablet + 1}px) {
        .ux-desktop-optimized {
          padding: 20px;
          font-size: 16px;
          line-height: 1.6;
        }
      }
      
      /* 可访问性样式 */
      .ux-sr-only {
        position: absolute;
        left: -10000px;
        width: 1px;
        height: 1px;
        overflow: hidden;
      }
      
      .ux-focus-visible:focus-visible {
        outline: 2px solid #0066cc;
        outline-offset: 2px;
      }
      
      /* 减少动画 */
      @media (prefers-reduced-motion: reduce) {
        .ux-animated {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
      }
      
      /* 高对比度 */
      @media (prefers-contrast: high) {
        .ux-high-contrast {
          border: 2px solid;
          background: white;
          color: black;
        }
      }
    `
    
    // 移除旧样式
    const oldStyle = document.getElementById('ux-responsive-styles')
    if (oldStyle) {
      oldStyle.remove()
    }
    
    document.head.appendChild(style)
  }
  
  /**
   * 优化字体加载
   */
  private optimizeFontLoading(): void {
    // 预加载关键字体
    const fontPreload = document.createElement('link')
    fontPreload.rel = 'preload'
    fontPreload.as = 'font'
    fontPreload.type = 'font/woff2'
    fontPreload.crossOrigin = 'anonymous'
    fontPreload.href = '/fonts/game-font.woff2'
    document.head.appendChild(fontPreload)
  }
  
  /**
   * 预加载关键资源
   */
  private preloadCriticalResources(): void {
    // 预加载游戏图片
    const imagesToPreload = [
      '/tiles/tile-1.webp',
      '/tiles/tile-2.webp',
      '/tiles/tile-3.webp'
    ]
    
    imagesToPreload.forEach(src => {
      const link = document.createElement('link')
      link.rel = 'preload'
      link.as = 'image'
      link.href = src
      document.head.appendChild(link)
    })
  }
  
  // 事件处理方法
  private handleResize(): void {
    this.stats.responsive.layoutAdjustments++
    this.optimizeViewport()
  }
  
  private handleDeviceChange(data: any): void {
    console.log('📱 设备类型变化:', data)
    this.applyResponsiveStyles()
  }
  
  private handleOrientationChange(data?: any): void {
    console.log('🔄 屏幕方向变化:', data)
    setTimeout(() => {
      this.optimizeViewport()
      this.applyResponsiveStyles()
    }, 100)
  }
  
  private handleVisibilityChange(): void {
    if (document.hidden) {
      // 页面隐藏时暂停优化
      performanceMonitor.pause()
    } else {
      // 页面显示时恢复优化
      performanceMonitor.resume()
    }
  }
  
  private handleReducedMotionChange(enabled: boolean): void {
    document.body.classList.toggle('reduced-motion', enabled)
    console.log(`🎭 减少动画模式: ${enabled ? '启用' : '禁用'}`)
  }
  
  private handleHighContrastChange(enabled: boolean): void {
    document.body.classList.toggle('high-contrast', enabled)
    console.log(`🎨 高对比度模式: ${enabled ? '启用' : '禁用'}`)
  }
  
  private handleColorSchemeChange(scheme: 'light' | 'dark'): void {
    document.body.classList.toggle('dark-theme', scheme === 'dark')
    console.log(`🌙 颜色方案: ${scheme}`)
  }
  
  private handleTapGesture(event: any): void {
    if (this.config.mobile.hapticFeedback) {
      this.triggerHapticFeedback(30)
    }
  }
  
  private handleSwipeGesture(event: any): void {
    if (this.config.mobile.hapticFeedback) {
      this.triggerHapticFeedback(50)
    }
  }
  
  private handleLongPressGesture(event: any): void {
    if (this.config.mobile.hapticFeedback) {
      this.triggerHapticFeedback([50, 100, 50])
    }
  }
  
  private handleKeyboardNavigation(event: KeyboardEvent): void {
    // 处理键盘导航逻辑
    if (event.key === 'Tab') {
      this.manageFocus(event)
    }
  }
  
  private manageFocus(event: KeyboardEvent): void {
    // 焦点管理逻辑
    this.stats.accessibility.focusChanges++
  }
  
  private triggerHapticFeedback(pattern: number | number[]): void {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern)
      this.stats.mobile.hapticFeedbacks++
    }
  }
  
  private optimizeAnimations(): void {
    // 动画优化逻辑
    this.stats.performance.animationOptimizations++
  }

  /**
   * 初始化难度平衡系统
   */
  private initializeDifficultyBalancing(): void {
    console.log('🎯 初始化难度平衡系统...')

    // 设置游戏指标监听
    this.setupGameMetricsTracking()

    console.log('✅ 难度平衡系统初始化完成')
  }

  /**
   * 设置游戏指标跟踪
   */
  private setupGameMetricsTracking(): void {
    // 监听游戏事件并更新难度管理器
    document.addEventListener('game-match', (event: any) => {
      difficultyBalanceManager.updateGameMetrics({
        averageMatchTime: event.detail.matchTime,
        comboCount: event.detail.comboCount
      })
    })

    document.addEventListener('game-mistake', (event: any) => {
      difficultyBalanceManager.updateGameMetrics({
        mistakeCount: (difficultyBalanceManager.getDifficultyStats().gameMetrics.mistakeCount || 0) + 1
      })
    })

    document.addEventListener('game-hint-used', () => {
      difficultyBalanceManager.updateGameMetrics({
        hintsUsed: (difficultyBalanceManager.getDifficultyStats().gameMetrics.hintsUsed || 0) + 1
      })
    })
  }
  
  /**
   * 获取默认配置
   */
  private getDefaultConfig(): UXConfig {
    return {
      responsive: {
        enabled: true,
        breakpoints: {
          mobile: 768,
          tablet: 1024,
          desktop: 1200
        },
        autoDetect: true
      },
      mobile: {
        enabled: true,
        touchOptimization: true,
        gestureSupport: true,
        hapticFeedback: true,
        viewportOptimization: true
      },
      accessibility: {
        enabled: true,
        keyboardNavigation: true,
        screenReader: true,
        highContrast: true,
        reducedMotion: true,
        focusManagement: true
      },
      gameExperience: {
        animationOptimization: true,
        audioFeedback: true,
        visualFeedback: true,
        performanceMonitoring: true,
        adaptiveDifficulty: false,
        difficultyBalancing: true
      }
    }
  }
  
  /**
   * 获取默认统计
   */
  private getDefaultStats(): UXStats {
    return {
      responsive: {
        deviceDetections: 0,
        layoutAdjustments: 0,
        orientationChanges: 0
      },
      mobile: {
        touchEvents: 0,
        gestureRecognitions: 0,
        hapticFeedbacks: 0
      },
      accessibility: {
        keyboardNavigations: 0,
        screenReaderAnnouncements: 0,
        focusChanges: 0
      },
      performance: {
        averageFrameRate: 60,
        animationOptimizations: 0,
        memoryUsage: 0
      }
    }
  }
  
  /**
   * 合并配置
   */
  private mergeConfig(defaultConfig: UXConfig, customConfig: Partial<UXConfig>): UXConfig {
    return {
      responsive: { ...defaultConfig.responsive, ...customConfig.responsive },
      mobile: { ...defaultConfig.mobile, ...customConfig.mobile },
      accessibility: { ...defaultConfig.accessibility, ...customConfig.accessibility },
      gameExperience: { ...defaultConfig.gameExperience, ...customConfig.gameExperience }
    }
  }
  
  /**
   * 获取当前配置
   */
  getConfig(): UXConfig {
    return { ...this.config }
  }
  
  /**
   * 获取统计信息
   */
  getStats(): UXStats {
    return { ...this.stats }
  }
  
  /**
   * 生成用户体验报告
   */
  generateUXReport(): string {
    const report = [
      '# 用户体验优化报告',
      '',
      `**初始化状态**: ${this.isInitialized ? '已初始化' : '未初始化'}`,
      '',
      '## 响应式设计',
      `- 设备检测次数: ${this.stats.responsive.deviceDetections}`,
      `- 布局调整次数: ${this.stats.responsive.layoutAdjustments}`,
      `- 方向变化次数: ${this.stats.responsive.orientationChanges}`,
      '',
      '## 移动端优化',
      `- 触摸事件数: ${this.stats.mobile.touchEvents}`,
      `- 手势识别数: ${this.stats.mobile.gestureRecognitions}`,
      `- 触觉反馈数: ${this.stats.mobile.hapticFeedbacks}`,
      '',
      '## 可访问性',
      `- 键盘导航数: ${this.stats.accessibility.keyboardNavigations}`,
      `- 屏幕阅读器公告数: ${this.stats.accessibility.screenReaderAnnouncements}`,
      `- 焦点变化数: ${this.stats.accessibility.focusChanges}`,
      '',
      '## 性能优化',
      `- 平均帧率: ${this.stats.performance.averageFrameRate} FPS`,
      `- 动画优化数: ${this.stats.performance.animationOptimizations}`,
      `- 内存使用: ${this.stats.performance.memoryUsage} MB`,
      ''
    ]
    
    return report.join('\n')
  }
}

// 导出单例实例
export const uxOptimizationManager = UXOptimizationManager.getInstance()
