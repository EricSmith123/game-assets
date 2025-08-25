/**
 * 性能感知动画系统
 * 根据设备性能自动调整动画质量，确保流畅的用户体验
 */

import { configManager } from './configManager';
import { environmentGuard } from './environmentGuard';
import { Logger } from './logger';

// 性能等级枚举
export enum PerformanceLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  ULTRA = 'ultra'
}

// 动画质量配置
export interface AnimationQualityConfig {
  enableAnimations: boolean;
  duration: number;
  easing: string;
  enableParticles: boolean;
  particleCount: number;
  enableBlur: boolean;
  enableShadows: boolean;
  enableTransforms3D: boolean;
  frameRate: number;
}

// 性能监控数据
export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  memoryUsage: number;
  cpuUsage: number;
  timestamp: number;
}

// 动画配置预设
const ANIMATION_PRESETS: Record<PerformanceLevel, AnimationQualityConfig> = {
  [PerformanceLevel.LOW]: {
    enableAnimations: true,
    duration: 150,
    easing: 'ease',
    enableParticles: false,
    particleCount: 0,
    enableBlur: false,
    enableShadows: false,
    enableTransforms3D: false,
    frameRate: 30
  },
  [PerformanceLevel.MEDIUM]: {
    enableAnimations: true,
    duration: 250,
    easing: 'ease-out',
    enableParticles: true,
    particleCount: 10,
    enableBlur: false,
    enableShadows: true,
    enableTransforms3D: false,
    frameRate: 45
  },
  [PerformanceLevel.HIGH]: {
    enableAnimations: true,
    duration: 300,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    enableParticles: true,
    particleCount: 20,
    enableBlur: true,
    enableShadows: true,
    enableTransforms3D: true,
    frameRate: 60
  },
  [PerformanceLevel.ULTRA]: {
    enableAnimations: true,
    duration: 400,
    easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    enableParticles: true,
    particleCount: 30,
    enableBlur: true,
    enableShadows: true,
    enableTransforms3D: true,
    frameRate: 60
  }
};

export class PerformanceAwareAnimator {
  private static instance: PerformanceAwareAnimator;
  private logger: Logger;
  private currentLevel: PerformanceLevel = PerformanceLevel.HIGH;
  private currentConfig: AnimationQualityConfig;
  private performanceHistory: PerformanceMetrics[] = [];
  private monitoringInterval: number | null = null;
  private frameTimeHistory: number[] = [];
  private readonly maxFrameHistorySize = 15; // 减少历史记录，提高响应速度
  private lastFrameTime = 0;
  private isMonitoring = false;

  private constructor() {
    this.logger = Logger.getInstance();
    this.currentConfig = { ...ANIMATION_PRESETS[this.currentLevel] };
    this.detectInitialPerformanceLevel();
    this.startPerformanceMonitoring();
    this.subscribeToConfigChanges();

    environmentGuard.runInDevelopment(() => {
      this.logger.debug('性能感知动画系统已初始化', {
        level: this.currentLevel,
        config: this.currentConfig
      }, 'PerformanceAwareAnimator');
    });
  }

  static getInstance(): PerformanceAwareAnimator {
    if (!PerformanceAwareAnimator.instance) {
      PerformanceAwareAnimator.instance = new PerformanceAwareAnimator();
    }
    return PerformanceAwareAnimator.instance;
  }

  /**
   * 检测初始性能等级
   */
  private detectInitialPerformanceLevel(): void {
    // 基于硬件信息检测
    const hardwareLevel = this.detectHardwareLevel();
    
    // 基于用户配置
    const uiConfig = configManager.get('ui');
    const performanceConfig = configManager.get('performance');
    
    // 如果用户禁用了动画，设置为低性能模式
    if (!uiConfig.enableAnimations) {
      this.currentLevel = PerformanceLevel.LOW;
    } else if (!performanceConfig.enableOptimizations) {
      this.currentLevel = PerformanceLevel.ULTRA;
    } else {
      this.currentLevel = hardwareLevel;
    }

    this.updateAnimationConfig();
    
    this.logger.info(`初始性能等级检测完成: ${this.currentLevel}`, {
      hardwareLevel,
      userPreferences: { enableAnimations: uiConfig.enableAnimations, enableOptimizations: performanceConfig.enableOptimizations }
    }, 'PerformanceAwareAnimator');
  }

  /**
   * 检测硬件性能等级
   */
  private detectHardwareLevel(): PerformanceLevel {
    const navigator = window.navigator as any;
    let score = 0;

    // CPU核心数
    const cores = navigator.hardwareConcurrency || 2;
    if (cores >= 8) score += 3;
    else if (cores >= 4) score += 2;
    else if (cores >= 2) score += 1;

    // 内存大小
    const memory = navigator.deviceMemory || 2;
    if (memory >= 8) score += 3;
    else if (memory >= 4) score += 2;
    else if (memory >= 2) score += 1;

    // 连接类型
    const connection = navigator.connection;
    if (connection) {
      if (connection.effectiveType === '4g') score += 2;
      else if (connection.effectiveType === '3g') score += 1;
    }

    // 设备类型
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (!isMobile) score += 2;

    // WebGL支持
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        if (renderer.includes('NVIDIA') || renderer.includes('AMD')) score += 2;
        else if (renderer.includes('Intel')) score += 1;
      }
    }

    // 根据分数确定性能等级
    if (score >= 10) return PerformanceLevel.ULTRA;
    if (score >= 7) return PerformanceLevel.HIGH;
    if (score >= 4) return PerformanceLevel.MEDIUM;
    return PerformanceLevel.LOW;
  }

  /**
   * 开始性能监控
   */
  private startPerformanceMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.lastFrameTime = performance.now();

    // 使用requestAnimationFrame监控帧率
    const monitorFrame = () => {
      if (!this.isMonitoring) return;

      const currentTime = performance.now();
      const frameTime = currentTime - this.lastFrameTime;
      this.lastFrameTime = currentTime;

      // 记录帧时间 - 使用更小的历史记录提高响应速度
      this.frameTimeHistory.push(frameTime);
      if (this.frameTimeHistory.length > this.maxFrameHistorySize) {
        this.frameTimeHistory.shift();
      }

      requestAnimationFrame(monitorFrame);
    };

    requestAnimationFrame(monitorFrame);

    // 定期分析性能并调整
    this.monitoringInterval = window.setInterval(() => {
      this.analyzePerformanceAndAdjust();
    }, 3000); // 每3秒检查一次

    this.logger.debug('性能监控已启动', undefined, 'PerformanceAwareAnimator');
  }

  /**
   * 分析性能并调整动画质量
   */
  private analyzePerformanceAndAdjust(): void {
    // 减少最小帧数要求，提高响应速度
    if (this.frameTimeHistory.length < this.maxFrameHistorySize) return;

    const metrics = this.calculatePerformanceMetrics();
    this.performanceHistory.push(metrics);

    // 保持历史记录在合理范围内
    if (this.performanceHistory.length > 20) {
      this.performanceHistory.shift();
    }

    // 分析最近的性能趋势
    const recentMetrics = this.performanceHistory.slice(-5);
    const avgFps = recentMetrics.reduce((sum, m) => sum + m.fps, 0) / recentMetrics.length;
    const avgFrameTime = recentMetrics.reduce((sum, m) => sum + m.frameTime, 0) / recentMetrics.length;

    // 根据性能调整等级
    const newLevel = this.determineOptimalLevel(avgFps, avgFrameTime);
    
    if (newLevel !== this.currentLevel) {
      this.adjustPerformanceLevel(newLevel, { avgFps, avgFrameTime });
    }

    environmentGuard.runInDevelopment(() => {
      this.logger.verbose('性能分析完成', {
        avgFps: avgFps.toFixed(1),
        avgFrameTime: avgFrameTime.toFixed(2),
        currentLevel: this.currentLevel,
        recommendedLevel: newLevel
      }, 'PerformanceAwareAnimator');
    });
  }

  /**
   * 计算当前性能指标
   */
  private calculatePerformanceMetrics(): PerformanceMetrics {
    const avgFrameTime = this.frameTimeHistory.reduce((sum, time) => sum + time, 0) / this.frameTimeHistory.length;
    const fps = Math.min(60, 1000 / avgFrameTime);

    // 获取内存使用情况（如果支持）
    let memoryUsage = 0;
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      memoryUsage = memory.usedJSHeapSize / memory.totalJSHeapSize;
    }

    return {
      fps,
      frameTime: avgFrameTime,
      memoryUsage,
      cpuUsage: 0, // 浏览器中无法直接获取CPU使用率
      timestamp: Date.now()
    };
  }

  /**
   * 确定最优性能等级
   */
  private determineOptimalLevel(avgFps: number, avgFrameTime: number): PerformanceLevel {
    const targetFps = configManager.get('performance').targetFPS;
    
    // 如果帧率低于目标的80%，降级
    if (avgFps < targetFps * 0.8) {
      if (this.currentLevel === PerformanceLevel.ULTRA) return PerformanceLevel.HIGH;
      if (this.currentLevel === PerformanceLevel.HIGH) return PerformanceLevel.MEDIUM;
      if (this.currentLevel === PerformanceLevel.MEDIUM) return PerformanceLevel.LOW;
    }
    
    // 如果帧率稳定在目标以上，可以升级
    if (avgFps > targetFps * 0.95 && avgFrameTime < 16.67) {
      if (this.currentLevel === PerformanceLevel.LOW) return PerformanceLevel.MEDIUM;
      if (this.currentLevel === PerformanceLevel.MEDIUM) return PerformanceLevel.HIGH;
      if (this.currentLevel === PerformanceLevel.HIGH) return PerformanceLevel.ULTRA;
    }

    return this.currentLevel;
  }

  /**
   * 调整性能等级
   */
  private adjustPerformanceLevel(newLevel: PerformanceLevel, metrics: { avgFps: number; avgFrameTime: number }): void {
    const oldLevel = this.currentLevel;
    this.currentLevel = newLevel;
    this.updateAnimationConfig();

    this.logger.info(`性能等级已调整: ${oldLevel} -> ${newLevel}`, {
      reason: metrics,
      newConfig: this.currentConfig
    }, 'PerformanceAwareAnimator');

    // 触发配置更新事件
    this.notifyConfigChange(oldLevel, newLevel);
  }

  /**
   * 更新动画配置
   */
  private updateAnimationConfig(): void {
    this.currentConfig = { ...ANIMATION_PRESETS[this.currentLevel] };
    
    // 应用用户偏好覆盖
    const uiConfig = configManager.get('ui');
    if (!uiConfig.enableAnimations) {
      this.currentConfig.enableAnimations = false;
      this.currentConfig.duration = 0;
    }
  }

  /**
   * 订阅配置变更
   */
  private subscribeToConfigChanges(): void {
    configManager.subscribe('ui', (newConfig) => {
      if (!newConfig.enableAnimations && this.currentConfig.enableAnimations) {
        this.currentConfig.enableAnimations = false;
        this.currentConfig.duration = 0;
        this.logger.info('动画已被用户禁用', undefined, 'PerformanceAwareAnimator');
      } else if (newConfig.enableAnimations && !this.currentConfig.enableAnimations) {
        this.updateAnimationConfig();
        this.logger.info('动画已被用户启用', undefined, 'PerformanceAwareAnimator');
      }
    });

    configManager.subscribe('performance', (newConfig) => {
      if (newConfig.targetFPS !== this.currentConfig.frameRate) {
        this.logger.info(`目标帧率已更新: ${newConfig.targetFPS}`, undefined, 'PerformanceAwareAnimator');
      }
    });
  }

  /**
   * 通知配置变更
   */
  private notifyConfigChange(oldLevel: PerformanceLevel, newLevel: PerformanceLevel): void {
    // 可以在这里添加事件发射器来通知其他组件
    const event = new CustomEvent('performanceLevelChanged', {
      detail: { oldLevel, newLevel, config: this.currentConfig }
    });
    window.dispatchEvent(event);
  }

  // === 公共API ===

  /**
   * 获取当前动画配置
   */
  getAnimationConfig(): AnimationQualityConfig {
    return { ...this.currentConfig };
  }

  /**
   * 获取当前性能等级
   */
  getCurrentLevel(): PerformanceLevel {
    return this.currentLevel;
  }

  /**
   * 手动设置性能等级
   */
  setPerformanceLevel(level: PerformanceLevel): void {
    if (level !== this.currentLevel) {
      const oldLevel = this.currentLevel;
      this.currentLevel = level;
      this.updateAnimationConfig();
      this.notifyConfigChange(oldLevel, level);
      
      this.logger.info(`性能等级已手动设置: ${oldLevel} -> ${level}`, undefined, 'PerformanceAwareAnimator');
    }
  }

  /**
   * 获取性能历史
   */
  getPerformanceHistory(): PerformanceMetrics[] {
    return [...this.performanceHistory];
  }

  /**
   * 创建性能感知的动画
   */
  createAnimation(element: HTMLElement, keyframes: Keyframe[], options?: KeyframeAnimationOptions): Animation {
    const config = this.getAnimationConfig();
    
    // 如果动画被禁用，返回一个立即完成的动画
    if (!config.enableAnimations) {
      const animation = element.animate(keyframes, { duration: 0 });
      return animation;
    }

    // 应用性能感知的配置
    const animationOptions: KeyframeAnimationOptions = {
      duration: config.duration,
      easing: config.easing,
      fill: 'forwards',
      ...options
    };

    // 根据性能等级调整关键帧
    const optimizedKeyframes = this.optimizeKeyframes(keyframes, config);
    
    return element.animate(optimizedKeyframes, animationOptions);
  }

  /**
   * 优化关键帧
   */
  private optimizeKeyframes(keyframes: Keyframe[], config: AnimationQualityConfig): Keyframe[] {
    return keyframes.map(frame => {
      const optimizedFrame = { ...frame };

      // 根据性能等级移除某些属性
      if (!config.enableBlur && 'filter' in optimizedFrame) {
        delete optimizedFrame.filter;
      }

      if (!config.enableShadows && 'boxShadow' in optimizedFrame) {
        delete optimizedFrame.boxShadow;
      }

      if (!config.enableTransforms3D) {
        // 将3D变换转换为2D变换
        if ('transform' in optimizedFrame && typeof optimizedFrame.transform === 'string') {
          optimizedFrame.transform = optimizedFrame.transform
            .replace(/translate3d\(([^,]+),([^,]+),[^)]+\)/g, 'translate($1,$2)')
            .replace(/translateZ\([^)]+\)/g, '')
            .replace(/rotateX\([^)]+\)/g, '')
            .replace(/rotateY\([^)]+\)/g, '');
        }
      }

      return optimizedFrame;
    });
  }

  /**
   * 停止性能监控
   */
  stopMonitoring(): void {
    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.logger.debug('性能监控已停止', undefined, 'PerformanceAwareAnimator');
  }

  /**
   * 销毁实例
   */
  dispose(): void {
    this.stopMonitoring();
    this.performanceHistory = [];
    this.frameTimeHistory = [];
    this.logger.info('性能感知动画系统已销毁', undefined, 'PerformanceAwareAnimator');
  }
}

// 创建全局实例
export const performanceAwareAnimator = PerformanceAwareAnimator.getInstance();

// 在开发环境中挂载到全局
environmentGuard.runInDevelopment(() => {
  (window as any).performanceAwareAnimator = performanceAwareAnimator;
  console.log('⚡ 性能感知动画系统已挂载到 window.performanceAwareAnimator');
});
