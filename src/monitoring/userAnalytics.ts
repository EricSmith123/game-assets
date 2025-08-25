/**
 * 用户行为分析系统
 * 
 * 收集、分析和报告用户行为数据，提供用户体验洞察
 */

/**
 * 用户事件类型
 */
export enum UserEventType {
  PAGE_VIEW = 'page_view',
  CLICK = 'click',
  SCROLL = 'scroll',
  HOVER = 'hover',
  FOCUS = 'focus',
  BLUR = 'blur',
  RESIZE = 'resize',
  GAME_START = 'game_start',
  GAME_END = 'game_end',
  GAME_PAUSE = 'game_pause',
  GAME_RESUME = 'game_resume',
  MATCH_MADE = 'match_made',
  LEVEL_UP = 'level_up',
  SETTINGS_CHANGE = 'settings_change',
  ERROR_OCCURRED = 'error_occurred',
  CUSTOM = 'custom'
}

/**
 * 用户事件接口
 */
export interface UserEvent {
  id: string
  type: UserEventType
  timestamp: number
  sessionId: string
  userId?: string
  data: Record<string, any>
  context: {
    url: string
    referrer: string
    userAgent: string
    viewport: { width: number; height: number }
    device: string
    browser: string
    os: string
  }
}

/**
 * 用户会话接口
 */
export interface UserSession {
  id: string
  userId?: string
  startTime: number
  endTime?: number
  duration?: number
  pageViews: number
  events: UserEvent[]
  gameStats: {
    gamesPlayed: number
    totalScore: number
    averageScore: number
    highestLevel: number
    totalPlayTime: number
  }
  deviceInfo: {
    type: string
    browser: string
    os: string
    screen: { width: number; height: number }
  }
}

/**
 * 用户行为统计
 */
export interface UserBehaviorStats {
  totalUsers: number
  activeUsers: number
  newUsers: number
  returningUsers: number
  averageSessionDuration: number
  bounceRate: number
  pageViewsPerSession: number
  mostPopularPages: Array<{ page: string; views: number }>
  mostCommonEvents: Array<{ event: UserEventType; count: number }>
  gameEngagement: {
    averagePlayTime: number
    completionRate: number
    retentionRate: number
  }
}

/**
 * 用户行为分析器
 */
export class UserAnalytics {
  private static instance: UserAnalytics
  private currentSession: UserSession | null = null
  private events: UserEvent[] = []
  private sessions: UserSession[] = []
  private isTracking = false
  private eventQueue: UserEvent[] = []
  private flushTimer?: number
  
  private constructor() {
    this.setupEventListeners()
  }
  
  static getInstance(): UserAnalytics {
    if (!UserAnalytics.instance) {
      UserAnalytics.instance = new UserAnalytics()
    }
    return UserAnalytics.instance
  }
  
  /**
   * 开始用户行为跟踪
   */
  startTracking(userId?: string): void {
    if (this.isTracking) {
      console.warn('📈 用户行为跟踪已在运行')
      return
    }
    
    this.isTracking = true
    this.startSession(userId)
    this.startEventFlushing()
    
    console.log('📈 用户行为分析已启动')
  }
  
  /**
   * 停止用户行为跟踪
   */
  stopTracking(): void {
    if (!this.isTracking) return
    
    this.isTracking = false
    this.endSession()
    this.flushEvents()
    
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
    }
    
    console.log('📈 用户行为跟踪已停止')
  }
  
  /**
   * 开始新会话
   */
  private startSession(userId?: string): void {
    this.currentSession = {
      id: this.generateSessionId(),
      userId,
      startTime: Date.now(),
      pageViews: 0,
      events: [],
      gameStats: {
        gamesPlayed: 0,
        totalScore: 0,
        averageScore: 0,
        highestLevel: 0,
        totalPlayTime: 0
      },
      deviceInfo: this.getDeviceInfo()
    }
    
    // 记录页面访问事件
    this.trackEvent(UserEventType.PAGE_VIEW, {
      page: window.location.pathname,
      title: document.title
    })
  }
  
  /**
   * 结束当前会话
   */
  private endSession(): void {
    if (!this.currentSession) return
    
    this.currentSession.endTime = Date.now()
    this.currentSession.duration = this.currentSession.endTime - this.currentSession.startTime
    
    this.sessions.push(this.currentSession)
    this.currentSession = null
  }
  
  /**
   * 跟踪用户事件
   */
  trackEvent(type: UserEventType, data: Record<string, any> = {}): void {
    if (!this.isTracking) return
    
    const event: UserEvent = {
      id: this.generateEventId(),
      type,
      timestamp: Date.now(),
      sessionId: this.currentSession?.id || 'unknown',
      userId: this.currentSession?.userId,
      data,
      context: this.getEventContext()
    }
    
    this.events.push(event)
    this.eventQueue.push(event)
    
    if (this.currentSession) {
      this.currentSession.events.push(event)
      
      // 更新会话统计
      if (type === UserEventType.PAGE_VIEW) {
        this.currentSession.pageViews++
      }
      
      // 更新游戏统计
      this.updateGameStats(event)
    }
  }
  
  /**
   * 跟踪页面访问
   */
  trackPageView(page?: string, title?: string): void {
    this.trackEvent(UserEventType.PAGE_VIEW, {
      page: page || window.location.pathname,
      title: title || document.title,
      referrer: document.referrer
    })
  }
  
  /**
   * 跟踪点击事件
   */
  trackClick(element: HTMLElement, data: Record<string, any> = {}): void {
    this.trackEvent(UserEventType.CLICK, {
      element: element.tagName.toLowerCase(),
      id: element.id,
      className: element.className,
      text: element.textContent?.slice(0, 100),
      ...data
    })
  }
  
  /**
   * 跟踪游戏事件
   */
  trackGameEvent(type: UserEventType, gameData: Record<string, any>): void {
    this.trackEvent(type, {
      ...gameData,
      category: 'game'
    })
  }
  
  /**
   * 跟踪自定义事件
   */
  trackCustomEvent(name: string, data: Record<string, any> = {}): void {
    this.trackEvent(UserEventType.CUSTOM, {
      name,
      ...data
    })
  }
  
  /**
   * 设置用户属性
   */
  setUserProperties(properties: Record<string, any>): void {
    if (this.currentSession) {
      this.currentSession.userId = properties.userId || this.currentSession.userId
    }
    
    this.trackEvent(UserEventType.CUSTOM, {
      name: 'user_properties_set',
      properties
    })
  }
  
  /**
   * 获取用户行为统计
   */
  getBehaviorStats(): UserBehaviorStats {
    const now = Date.now()
    const dayMs = 24 * 60 * 60 * 1000
    const recentSessions = this.sessions.filter(s => now - s.startTime < dayMs)
    
    // 计算用户数量
    const allUserIds = new Set(this.sessions.map(s => s.userId).filter(Boolean))
    const recentUserIds = new Set(recentSessions.map(s => s.userId).filter(Boolean))
    const returningUsers = recentSessions.filter(s => 
      this.sessions.some(prev => prev.userId === s.userId && prev.startTime < s.startTime)
    ).length
    
    // 计算会话统计
    const totalDuration = recentSessions.reduce((sum, s) => sum + (s.duration || 0), 0)
    const averageSessionDuration = recentSessions.length > 0 ? totalDuration / recentSessions.length : 0
    
    // 计算跳出率（只有一个页面访问的会话）
    const bouncedSessions = recentSessions.filter(s => s.pageViews <= 1).length
    const bounceRate = recentSessions.length > 0 ? bouncedSessions / recentSessions.length : 0
    
    // 计算页面访问统计
    const totalPageViews = recentSessions.reduce((sum, s) => sum + s.pageViews, 0)
    const pageViewsPerSession = recentSessions.length > 0 ? totalPageViews / recentSessions.length : 0
    
    // 统计最受欢迎的页面
    const pageViews = new Map<string, number>()
    this.events
      .filter(e => e.type === UserEventType.PAGE_VIEW && now - e.timestamp < dayMs)
      .forEach(e => {
        const page = e.data.page || 'unknown'
        pageViews.set(page, (pageViews.get(page) || 0) + 1)
      })
    
    const mostPopularPages = Array.from(pageViews.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([page, views]) => ({ page, views }))
    
    // 统计最常见的事件
    const eventCounts = new Map<UserEventType, number>()
    this.events
      .filter(e => now - e.timestamp < dayMs)
      .forEach(e => {
        eventCounts.set(e.type, (eventCounts.get(e.type) || 0) + 1)
      })
    
    const mostCommonEvents = Array.from(eventCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([event, count]) => ({ event, count }))
    
    // 计算游戏参与度
    const gameSessions = recentSessions.filter(s => s.gameStats.gamesPlayed > 0)
    const averagePlayTime = gameSessions.length > 0 
      ? gameSessions.reduce((sum, s) => sum + s.gameStats.totalPlayTime, 0) / gameSessions.length
      : 0
    
    const completionRate = gameSessions.length > 0
      ? gameSessions.filter(s => s.gameStats.averageScore > 0).length / gameSessions.length
      : 0
    
    const retentionRate = recentUserIds.size > 0 ? returningUsers / recentUserIds.size : 0
    
    return {
      totalUsers: allUserIds.size,
      activeUsers: recentUserIds.size,
      newUsers: recentUserIds.size - returningUsers,
      returningUsers,
      averageSessionDuration,
      bounceRate,
      pageViewsPerSession,
      mostPopularPages,
      mostCommonEvents,
      gameEngagement: {
        averagePlayTime,
        completionRate,
        retentionRate
      }
    }
  }
  
  /**
   * 获取用户旅程
   */
  getUserJourney(userId: string): UserEvent[] {
    return this.events
      .filter(e => e.userId === userId)
      .sort((a, b) => a.timestamp - b.timestamp)
  }
  
  /**
   * 获取热力图数据
   */
  getHeatmapData(): Array<{ x: number; y: number; intensity: number }> {
    const clickEvents = this.events.filter(e => e.type === UserEventType.CLICK)
    const heatmapData = new Map<string, number>()
    
    clickEvents.forEach(event => {
      const x = Math.floor((event.data.clientX || 0) / 10) * 10
      const y = Math.floor((event.data.clientY || 0) / 10) * 10
      const key = `${x},${y}`
      heatmapData.set(key, (heatmapData.get(key) || 0) + 1)
    })
    
    return Array.from(heatmapData.entries()).map(([key, intensity]) => {
      const [x, y] = key.split(',').map(Number)
      return { x, y, intensity }
    })
  }
  
  /**
   * 生成用户行为报告
   */
  generateBehaviorReport(): string {
    const stats = this.getBehaviorStats()
    
    const report = [
      '# 用户行为分析报告',
      '',
      `**生成时间**: ${new Date().toLocaleString()}`,
      `**数据时间范围**: 最近24小时`,
      '',
      '## 用户概览',
      '',
      `- 总用户数: ${stats.totalUsers}`,
      `- 活跃用户: ${stats.activeUsers}`,
      `- 新用户: ${stats.newUsers}`,
      `- 回访用户: ${stats.returningUsers}`,
      `- 平均会话时长: ${(stats.averageSessionDuration / 1000 / 60).toFixed(1)}分钟`,
      `- 跳出率: ${(stats.bounceRate * 100).toFixed(1)}%`,
      `- 平均页面访问数: ${stats.pageViewsPerSession.toFixed(1)}`,
      '',
      '## 页面访问排行',
      '',
      ...stats.mostPopularPages.map((page, index) => 
        `${index + 1}. ${page.page} - ${page.views}次访问`
      ),
      '',
      '## 用户行为事件',
      '',
      ...stats.mostCommonEvents.map((event, index) => 
        `${index + 1}. ${event.event} - ${event.count}次`
      ),
      '',
      '## 游戏参与度',
      '',
      `- 平均游戏时长: ${(stats.gameEngagement.averagePlayTime / 1000 / 60).toFixed(1)}分钟`,
      `- 完成率: ${(stats.gameEngagement.completionRate * 100).toFixed(1)}%`,
      `- 留存率: ${(stats.gameEngagement.retentionRate * 100).toFixed(1)}%`,
      ''
    ]
    
    return report.join('\n')
  }
  
  // 私有方法
  private setupEventListeners(): void {
    // 页面卸载时结束会话
    window.addEventListener('beforeunload', () => {
      this.endSession()
      this.flushEvents()
    })
    
    // 页面可见性变化
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.trackEvent(UserEventType.BLUR, { reason: 'page_hidden' })
      } else {
        this.trackEvent(UserEventType.FOCUS, { reason: 'page_visible' })
      }
    })
    
    // 窗口大小变化
    window.addEventListener('resize', () => {
      this.trackEvent(UserEventType.RESIZE, {
        width: window.innerWidth,
        height: window.innerHeight
      })
    })
    
    // 滚动事件（节流）
    let scrollTimer: number | undefined
    window.addEventListener('scroll', () => {
      if (scrollTimer) clearTimeout(scrollTimer)
      scrollTimer = window.setTimeout(() => {
        this.trackEvent(UserEventType.SCROLL, {
          scrollY: window.scrollY,
          scrollX: window.scrollX
        })
      }, 100)
    })
  }
  
  private updateGameStats(event: UserEvent): void {
    if (!this.currentSession) return
    
    const gameStats = this.currentSession.gameStats
    
    switch (event.type) {
      case UserEventType.GAME_START:
        gameStats.gamesPlayed++
        break
      case UserEventType.GAME_END:
        if (event.data.score) {
          gameStats.totalScore += event.data.score
          gameStats.averageScore = gameStats.totalScore / gameStats.gamesPlayed
        }
        if (event.data.level && event.data.level > gameStats.highestLevel) {
          gameStats.highestLevel = event.data.level
        }
        if (event.data.playTime) {
          gameStats.totalPlayTime += event.data.playTime
        }
        break
    }
  }
  
  private startEventFlushing(): void {
    this.flushTimer = window.setInterval(() => {
      this.flushEvents()
    }, 30000) // 每30秒发送一次
  }
  
  private flushEvents(): void {
    if (this.eventQueue.length === 0) return
    
    const events = [...this.eventQueue]
    this.eventQueue = []
    
    // 这里可以发送到分析服务
    console.log('📈 发送用户行为数据:', events.length, '个事件')
    
    // 本地存储备份
    try {
      const stored = localStorage.getItem('user_analytics_backup') || '[]'
      const backup = JSON.parse(stored)
      backup.push(...events)
      
      // 只保留最近1000个事件
      if (backup.length > 1000) {
        backup.splice(0, backup.length - 1000)
      }
      
      localStorage.setItem('user_analytics_backup', JSON.stringify(backup))
    } catch (error) {
      console.warn('📈 用户行为数据本地存储失败:', error)
    }
  }
  
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  
  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  
  private getDeviceInfo(): UserSession['deviceInfo'] {
    const ua = navigator.userAgent
    
    return {
      type: /Mobile|Android|iPhone|iPad/.test(ua) ? 'mobile' : 'desktop',
      browser: this.getBrowserName(ua),
      os: this.getOSName(ua),
      screen: {
        width: screen.width,
        height: screen.height
      }
    }
  }
  
  private getEventContext(): UserEvent['context'] {
    return {
      url: window.location.href,
      referrer: document.referrer,
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      device: /Mobile|Android|iPhone|iPad/.test(navigator.userAgent) ? 'mobile' : 'desktop',
      browser: this.getBrowserName(navigator.userAgent),
      os: this.getOSName(navigator.userAgent)
    }
  }
  
  private getBrowserName(ua: string): string {
    if (ua.includes('Chrome')) return 'Chrome'
    if (ua.includes('Firefox')) return 'Firefox'
    if (ua.includes('Safari')) return 'Safari'
    if (ua.includes('Edge')) return 'Edge'
    return 'Unknown'
  }
  
  private getOSName(ua: string): string {
    if (ua.includes('Windows')) return 'Windows'
    if (ua.includes('Mac')) return 'macOS'
    if (ua.includes('Linux')) return 'Linux'
    if (ua.includes('Android')) return 'Android'
    if (ua.includes('iOS')) return 'iOS'
    return 'Unknown'
  }
}

// 导出单例实例
export const userAnalytics = UserAnalytics.getInstance()

// 在开发环境中挂载到全局
if (import.meta.env.DEV) {
  (window as any).userAnalytics = userAnalytics
  console.log('📈 用户行为分析已挂载到 window.userAnalytics')
}
