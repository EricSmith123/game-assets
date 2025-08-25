/**
 * 游戏难度平衡管理器
 * 
 * 提供自适应难度调整、难度等级管理和平衡机制
 */

import { DifficultyLevel, userPreferencesManager } from './userPreferencesManager'

/**
 * 难度配置接口
 */
export interface DifficultyConfig {
  level: DifficultyLevel
  boardSize: number
  tileTypes: number
  minMatchLength: number
  timeLimit: number
  scoreMultiplier: number
  specialTileChance: number
  cascadeBonus: number
  hintCooldown: number
  shuffleLimit: number
}

/**
 * 游戏性能指标
 */
export interface GamePerformanceMetrics {
  averageMatchTime: number
  successRate: number
  comboCount: number
  hintsUsed: number
  shufflesUsed: number
  totalScore: number
  playTime: number
  mistakeCount: number
}

/**
 * 自适应难度状态
 */
export interface AdaptiveDifficultyState {
  currentLevel: DifficultyLevel
  targetSuccessRate: number
  actualSuccessRate: number
  adjustmentFactor: number
  lastAdjustmentTime: number
  adjustmentHistory: Array<{
    timestamp: number
    fromLevel: DifficultyLevel
    toLevel: DifficultyLevel
    reason: string
  }>
}

/**
 * 难度平衡管理器
 */
export class DifficultyBalanceManager {
  private static instance: DifficultyBalanceManager
  private difficultyConfigs = new Map<DifficultyLevel, DifficultyConfig>()
  private gameMetrics: GamePerformanceMetrics
  private adaptiveState: AdaptiveDifficultyState
  private isAdaptiveEnabled = false
  private metricsHistory: GamePerformanceMetrics[] = []
  
  private constructor() {
    this.initializeDifficultyConfigs()
    this.initializeGameMetrics()
    this.initializeAdaptiveState()
  }
  
  static getInstance(): DifficultyBalanceManager {
    if (!DifficultyBalanceManager.instance) {
      DifficultyBalanceManager.instance = new DifficultyBalanceManager()
    }
    return DifficultyBalanceManager.instance
  }
  
  /**
   * 初始化难度配置
   */
  private initializeDifficultyConfigs(): void {
    // 简单难度
    this.difficultyConfigs.set(DifficultyLevel.EASY, {
      level: DifficultyLevel.EASY,
      boardSize: 6,
      tileTypes: 4,
      minMatchLength: 3,
      timeLimit: 300, // 5分钟
      scoreMultiplier: 1.0,
      specialTileChance: 0.15,
      cascadeBonus: 1.2,
      hintCooldown: 10, // 10秒
      shuffleLimit: 5
    })
    
    // 普通难度
    this.difficultyConfigs.set(DifficultyLevel.NORMAL, {
      level: DifficultyLevel.NORMAL,
      boardSize: 8,
      tileTypes: 5,
      minMatchLength: 3,
      timeLimit: 240, // 4分钟
      scoreMultiplier: 1.5,
      specialTileChance: 0.12,
      cascadeBonus: 1.5,
      hintCooldown: 15, // 15秒
      shuffleLimit: 3
    })
    
    // 困难难度
    this.difficultyConfigs.set(DifficultyLevel.HARD, {
      level: DifficultyLevel.HARD,
      boardSize: 10,
      tileTypes: 6,
      minMatchLength: 3,
      timeLimit: 180, // 3分钟
      scoreMultiplier: 2.0,
      specialTileChance: 0.10,
      cascadeBonus: 2.0,
      hintCooldown: 20, // 20秒
      shuffleLimit: 2
    })
    
    // 专家难度
    this.difficultyConfigs.set(DifficultyLevel.EXPERT, {
      level: DifficultyLevel.EXPERT,
      boardSize: 12,
      tileTypes: 7,
      minMatchLength: 4,
      timeLimit: 120, // 2分钟
      scoreMultiplier: 3.0,
      specialTileChance: 0.08,
      cascadeBonus: 2.5,
      hintCooldown: 30, // 30秒
      shuffleLimit: 1
    })
    
    console.log('🎯 难度配置已初始化')
  }
  
  /**
   * 初始化游戏指标
   */
  private initializeGameMetrics(): void {
    this.gameMetrics = {
      averageMatchTime: 0,
      successRate: 0,
      comboCount: 0,
      hintsUsed: 0,
      shufflesUsed: 0,
      totalScore: 0,
      playTime: 0,
      mistakeCount: 0
    }
  }
  
  /**
   * 初始化自适应状态
   */
  private initializeAdaptiveState(): void {
    const currentDifficulty = userPreferencesManager.getPreferences().difficulty
    
    this.adaptiveState = {
      currentLevel: currentDifficulty,
      targetSuccessRate: 0.7, // 目标70%成功率
      actualSuccessRate: 0,
      adjustmentFactor: 1.0,
      lastAdjustmentTime: Date.now(),
      adjustmentHistory: []
    }
  }
  
  /**
   * 启用自适应难度
   */
  enableAdaptiveDifficulty(): void {
    this.isAdaptiveEnabled = true
    console.log('🎯 自适应难度已启用')
  }
  
  /**
   * 禁用自适应难度
   */
  disableAdaptiveDifficulty(): void {
    this.isAdaptiveEnabled = false
    console.log('🎯 自适应难度已禁用')
  }
  
  /**
   * 获取当前难度配置
   */
  getCurrentDifficultyConfig(): DifficultyConfig {
    const currentLevel = userPreferencesManager.getPreferences().difficulty
    return this.difficultyConfigs.get(currentLevel) || this.difficultyConfigs.get(DifficultyLevel.NORMAL)!
  }
  
  /**
   * 设置难度等级
   */
  setDifficultyLevel(level: DifficultyLevel): void {
    const oldLevel = userPreferencesManager.getPreferences().difficulty
    
    userPreferencesManager.updatePreferences({ difficulty: level })
    this.adaptiveState.currentLevel = level
    
    // 记录调整历史
    this.adaptiveState.adjustmentHistory.push({
      timestamp: Date.now(),
      fromLevel: oldLevel,
      toLevel: level,
      reason: 'Manual adjustment'
    })
    
    console.log(`🎯 难度等级已调整: ${oldLevel} -> ${level}`)
  }
  
  /**
   * 更新游戏指标
   */
  updateGameMetrics(metrics: Partial<GamePerformanceMetrics>): void {
    Object.assign(this.gameMetrics, metrics)

    // 只有在没有直接设置successRate时才重新计算
    if (metrics.successRate === undefined && this.gameMetrics.playTime > 0) {
      // 假设每分钟允许的错误次数为基准，计算成功率
      const allowedMistakesPerMinute = 10; // 每分钟允许10个错误
      const playTimeInMinutes = this.gameMetrics.playTime / 60000;
      const expectedMistakes = allowedMistakesPerMinute * playTimeInMinutes;
      this.gameMetrics.successRate = Math.max(0, Math.min(1, 1 - (this.gameMetrics.mistakeCount / Math.max(expectedMistakes, 1))));
    }
    
    // 保存到历史记录
    this.metricsHistory.push({ ...this.gameMetrics })
    
    // 限制历史记录长度
    if (this.metricsHistory.length > 100) {
      this.metricsHistory.shift()
    }
    
    // 如果启用了自适应难度，检查是否需要调整
    if (this.isAdaptiveEnabled) {
      this.checkAdaptiveDifficultyAdjustment()
    }
    
    console.log('📊 游戏指标已更新:', this.gameMetrics)
  }
  
  /**
   * 检查自适应难度调整
   */
  private checkAdaptiveDifficultyAdjustment(): void {
    const now = Date.now()
    const timeSinceLastAdjustment = now - this.adaptiveState.lastAdjustmentTime
    
    // 至少等待2分钟才进行下一次调整
    if (timeSinceLastAdjustment < 120000) {
      return
    }
    
    // 需要至少5个历史记录才能进行分析
    if (this.metricsHistory.length < 5) {
      return
    }
    
    // 计算最近的平均成功率
    const recentMetrics = this.metricsHistory.slice(-5)
    const averageSuccessRate = recentMetrics.reduce((sum, m) => sum + m.successRate, 0) / recentMetrics.length
    
    this.adaptiveState.actualSuccessRate = averageSuccessRate
    
    const currentLevel = this.adaptiveState.currentLevel
    const targetRate = this.adaptiveState.targetSuccessRate
    
    let newLevel: DifficultyLevel | null = null
    let reason = ''
    
    // 如果成功率太高，增加难度
    if (averageSuccessRate > targetRate + 0.15) {
      newLevel = this.getNextDifficultyLevel(currentLevel, 'increase')
      reason = `Success rate too high: ${(averageSuccessRate * 100).toFixed(1)}%`
    }
    // 如果成功率太低，降低难度
    else if (averageSuccessRate < targetRate - 0.15) {
      newLevel = this.getNextDifficultyLevel(currentLevel, 'decrease')
      reason = `Success rate too low: ${(averageSuccessRate * 100).toFixed(1)}%`
    }
    
    // 执行难度调整
    if (newLevel && newLevel !== currentLevel) {
      this.adaptiveState.adjustmentHistory.push({
        timestamp: now,
        fromLevel: currentLevel,
        toLevel: newLevel,
        reason
      })
      
      this.adaptiveState.currentLevel = newLevel
      this.adaptiveState.lastAdjustmentTime = now
      
      // 更新用户偏好
      userPreferencesManager.updatePreferences({ difficulty: newLevel })
      
      console.log(`🎯 自适应难度调整: ${currentLevel} -> ${newLevel} (${reason})`)
    }
  }
  
  /**
   * 获取下一个难度等级
   */
  private getNextDifficultyLevel(currentLevel: DifficultyLevel, direction: 'increase' | 'decrease'): DifficultyLevel {
    const levels = [DifficultyLevel.EASY, DifficultyLevel.NORMAL, DifficultyLevel.HARD, DifficultyLevel.EXPERT]
    const currentIndex = levels.indexOf(currentLevel)
    
    if (direction === 'increase' && currentIndex < levels.length - 1) {
      return levels[currentIndex + 1]
    } else if (direction === 'decrease' && currentIndex > 0) {
      return levels[currentIndex - 1]
    }
    
    return currentLevel
  }
  
  /**
   * 获取难度建议
   */
  getDifficultyRecommendation(): {
    recommendedLevel: DifficultyLevel
    reason: string
    confidence: number
  } {
    // 检查数据是否足够
    if (this.metricsHistory.length === 0) {
      return {
        recommendedLevel: DifficultyLevel.NORMAL,
        reason: 'Insufficient data for recommendation',
        confidence: 0.3
      }
    }

    const recentMetrics = this.metricsHistory.slice(-10)
    const averageSuccessRate = recentMetrics.reduce((sum, m) => sum + m.successRate, 0) / recentMetrics.length
    const averageMatchTime = recentMetrics.reduce((sum, m) => sum + m.averageMatchTime, 0) / recentMetrics.length

    let recommendedLevel: DifficultyLevel
    let reason: string
    let confidence: number

    // 更严格的成功率阈值判断
    if (averageSuccessRate < 0.5 || averageMatchTime > 4000) {
      recommendedLevel = DifficultyLevel.EASY
      reason = 'Low success rate'
      confidence = 0.8
    } else if (averageSuccessRate >= 0.9 && averageMatchTime <= 1500) {
      recommendedLevel = DifficultyLevel.EXPERT
      reason = 'High success rate and fast match times'
      confidence = 0.9
    } else if (averageSuccessRate > 0.75 && averageMatchTime < 3000) {
      recommendedLevel = DifficultyLevel.HARD
      reason = 'Good success rate and reasonable match times'
      confidence = 0.8
    } else if (averageSuccessRate < 0.7) {
      recommendedLevel = DifficultyLevel.NORMAL
      reason = 'Moderate success rate'
      confidence = 0.7
    } else {
      recommendedLevel = DifficultyLevel.NORMAL
      reason = 'Moderate success rate'
      confidence = 0.7
    }

    return { recommendedLevel, reason, confidence }
  }
  
  /**
   * 获取难度统计信息
   */
  getDifficultyStats(): {
    currentLevel: DifficultyLevel
    currentConfig: DifficultyConfig
    gameMetrics: GamePerformanceMetrics
    adaptiveState: AdaptiveDifficultyState
    recommendation: ReturnType<typeof this.getDifficultyRecommendation>
  } {
    return {
      currentLevel: this.adaptiveState.currentLevel,
      currentConfig: this.getCurrentDifficultyConfig(),
      gameMetrics: { ...this.gameMetrics },
      adaptiveState: { ...this.adaptiveState },
      recommendation: this.getDifficultyRecommendation()
    }
  }
  
  /**
   * 重置游戏指标
   */
  resetGameMetrics(): void {
    this.initializeGameMetrics()
    this.metricsHistory = [] // 清空历史记录
    console.log('📊 游戏指标已重置')
  }
  
  /**
   * 生成难度平衡报告
   */
  generateBalanceReport(): string {
    const stats = this.getDifficultyStats()
    const report = [
      '# 游戏难度平衡报告',
      '',
      `**当前难度**: ${stats.currentLevel}`,
      `**自适应难度**: ${this.isAdaptiveEnabled ? '启用' : '禁用'}`,
      '',
      '## 当前配置',
      `- 游戏板大小: ${stats.currentConfig.boardSize}×${stats.currentConfig.boardSize}`,
      `- 方块类型数: ${stats.currentConfig.tileTypes}`,
      `- 最小匹配长度: ${stats.currentConfig.minMatchLength}`,
      `- 时间限制: ${stats.currentConfig.timeLimit}秒`,
      `- 分数倍数: ${stats.currentConfig.scoreMultiplier}x`,
      '',
      '## 游戏指标',
      `- 平均匹配时间: ${stats.gameMetrics.averageMatchTime.toFixed(0)}ms`,
      `- 成功率: ${(stats.gameMetrics.successRate * 100).toFixed(1)}%`,
      `- 连击次数: ${stats.gameMetrics.comboCount}`,
      `- 使用提示次数: ${stats.gameMetrics.hintsUsed}`,
      `- 使用洗牌次数: ${stats.gameMetrics.shufflesUsed}`,
      `- 总分: ${stats.gameMetrics.totalScore}`,
      `- 游戏时间: ${(stats.gameMetrics.playTime / 1000).toFixed(1)}秒`,
      `- 错误次数: ${stats.gameMetrics.mistakeCount}`,
      '',
      '## 难度建议',
      `- 推荐难度: ${stats.recommendation.recommendedLevel}`,
      `- 建议原因: ${stats.recommendation.reason}`,
      `- 置信度: ${(stats.recommendation.confidence * 100).toFixed(0)}%`,
      '',
      '## 调整历史',
      ...stats.adaptiveState.adjustmentHistory.slice(-5).map((adj, index) => 
        `${index + 1}. ${new Date(adj.timestamp).toLocaleString()}: ${adj.fromLevel} → ${adj.toLevel} (${adj.reason})`
      ),
      ''
    ]
    
    return report.join('\n')
  }
}

// 导出单例实例
export const difficultyBalanceManager = DifficultyBalanceManager.getInstance()
