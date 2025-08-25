/**
 * 高级交互动画系统
 * 提供微交互、状态转换、视觉反馈等功能
 * 集成性能感知动画系统
 */

import { Logger } from './logger';
import { performanceAwareAnimator, PerformanceLevel } from './performanceAwareAnimator';
import { performanceMonitor } from './performanceMonitor';

/**
 * 动画配置接口
 */
export interface AnimationConfig {
  duration: number;
  easing: string;
  delay?: number;
  iterations?: number;
  direction?: 'normal' | 'reverse' | 'alternate';
  fillMode?: 'none' | 'forwards' | 'backwards' | 'both';
}

/**
 * 微交互类型
 */
export type MicroInteractionType = 
  | 'hover' | 'click' | 'focus' | 'select' | 'success' | 'error' | 'loading';

/**
 * 触觉反馈类型
 */
export type HapticFeedbackType = 'light' | 'medium' | 'heavy' | 'selection' | 'impact';

/**
 * 视觉反馈配置接口
 */
export interface VisualFeedbackConfig {
  type: 'ripple' | 'glow' | 'bounce' | 'shake' | 'pulse' | 'scale';
  color?: string;
  intensity?: number;
  duration?: number;
}

/**
 * 高级交互动画系统类
 */
export class InteractionAnimator {
  private static instance: InteractionAnimator;
  private activeAnimations = new Map<string, Animation>();
  private hapticSupported: boolean = false;
  private logger: Logger;
  private performanceLevel: PerformanceLevel = PerformanceLevel.HIGH;
  
  // 统一的微交互动画配置 - 基于Material Design 3.0规范
  private presets: Record<MicroInteractionType, AnimationConfig> = {
    hover: { duration: 200, easing: 'cubic-bezier(0.2, 0.0, 0.38, 0.9)' }, // 标准悬停
    click: { duration: 150, easing: 'cubic-bezier(0.2, 0.0, 0.38, 0.9)' }, // 快速点击反馈
    focus: { duration: 200, easing: 'cubic-bezier(0.2, 0.0, 0.38, 0.9)' }, // 统一焦点时长
    select: { duration: 200, easing: 'cubic-bezier(0.05, 0.7, 0.1, 1.0)' }, // 选择强调
    success: { duration: 300, easing: 'cubic-bezier(0.05, 0.7, 0.1, 1.0)' }, // 成功反馈
    error: { duration: 200, easing: 'cubic-bezier(0.2, 0.0, 0.38, 0.9)', iterations: 2, direction: 'alternate' }, // 错误震动
    loading: { duration: 800, easing: 'cubic-bezier(0.4, 0.0, 0.6, 1.0)', iterations: Infinity } // 加载动画
  };
  
  // 性能统计
  private stats = {
    totalAnimations: 0,
    microInteractions: 0,
    hapticFeedbacks: 0,
    averageAnimationTime: 0,
    totalAnimationTime: 0
  };

  private constructor() {
    this.logger = Logger.getInstance();
    this.checkHapticSupport();
    this.setupGlobalStyles();
    this.subscribeToPerformanceChanges();
  }

  /**
   * 订阅性能等级变更
   */
  private subscribeToPerformanceChanges(): void {
    // 监听性能等级变更事件
    window.addEventListener('performanceLevelChanged', (event: any) => {
      const { newLevel } = event.detail;
      this.performanceLevel = newLevel;
      this.updateAnimationPresets();

      this.logger.info(`交互动画器性能等级已更新: ${newLevel}`, undefined, 'InteractionAnimator');
    });

    // 初始化性能等级
    this.performanceLevel = performanceAwareAnimator.getCurrentLevel();
    this.updateAnimationPresets();
  }

  /**
   * 根据性能等级调整动画配置
   */
  private adjustConfigForPerformance(config: AnimationConfig): AnimationConfig {
    const animConfig = performanceAwareAnimator.getAnimationConfig();

    // 如果动画被禁用，返回极短时长配置
    if (!animConfig.enableAnimations) {
      return { ...config, duration: 0 };
    }

    // 根据性能等级调整时长
    const durationMultiplier = animConfig.duration / 300; // 基准300ms
    const adjustedDuration = Math.max(50, config.duration * durationMultiplier); // 最小50ms

    return {
      ...config,
      duration: adjustedDuration,
      easing: animConfig.enableTransforms3D ? config.easing : 'ease-out' // 低性能设备使用简单缓动
    };
  }

  /**
   * 根据性能等级更新动画预设
   */
  private updateAnimationPresets(): void {
    const animConfig = performanceAwareAnimator.getAnimationConfig();

    // 根据性能等级调整预设
    const durationMultiplier = animConfig.duration / 300; // 基准300ms

    this.presets = {
      hover: {
        duration: Math.round(150 * durationMultiplier),
        easing: animConfig.easing,
        fillMode: 'forwards'
      },
      click: {
        duration: Math.round(200 * durationMultiplier),
        easing: animConfig.easing,
        fillMode: 'forwards'
      },
      focus: {
        duration: Math.round(250 * durationMultiplier),
        easing: animConfig.easing,
        fillMode: 'forwards'
      },
      select: {
        duration: Math.round(300 * durationMultiplier),
        easing: animConfig.easing,
        fillMode: 'forwards'
      },
      success: {
        duration: Math.round(400 * durationMultiplier),
        easing: animConfig.easing,
        fillMode: 'forwards'
      },
      error: {
        duration: Math.round(350 * durationMultiplier),
        easing: 'ease-out',
        fillMode: 'forwards'
      },
      loading: {
        duration: Math.round(1000 * durationMultiplier),
        easing: 'linear',
        iterations: Infinity,
        fillMode: 'forwards'
      }
    };
  }

  static getInstance(): InteractionAnimator {
    if (!InteractionAnimator.instance) {
      InteractionAnimator.instance = new InteractionAnimator();
    }
    return InteractionAnimator.instance;
  }

  /**
   * 检查触觉反馈支持
   */
  private checkHapticSupport(): void {
    this.hapticSupported = 'vibrate' in navigator || 'hapticFeedback' in navigator;
    console.log(`📳 触觉反馈支持: ${this.hapticSupported ? '✅' : '❌'}`);
  }

  /**
   * 设置全局动画样式
   */
  private setupGlobalStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .interaction-element {
        transition: transform 0.2s cubic-bezier(0.4, 0.0, 0.2, 1);
        will-change: transform;
      }
      
      .ripple-container {
        position: relative;
        overflow: hidden;
      }
      
      .ripple-effect {
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.6);
        transform: scale(0);
        animation: ripple 0.6s linear;
        pointer-events: none;
      }
      
      @keyframes ripple {
        to {
          transform: scale(4);
          opacity: 0;
        }
      }
      
      .glow-effect {
        box-shadow: 0 0 20px rgba(102, 126, 234, 0.6);
        transition: box-shadow 0.3s ease;
      }
      
      .bounce-effect {
        animation: bounce 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
      }
      
      @keyframes bounce {
        0%, 20%, 53%, 80%, 100% {
          transform: translate3d(0, 0, 0);
        }
        40%, 43% {
          transform: translate3d(0, -10px, 0);
        }
        70% {
          transform: translate3d(0, -5px, 0);
        }
        90% {
          transform: translate3d(0, -2px, 0);
        }
      }
      
      .shake-effect {
        animation: shake 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
      }
      
      @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
        20%, 40%, 60%, 80% { transform: translateX(5px); }
      }
      
      .pulse-effect {
        animation: pulse 1s infinite;
      }
      
      @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); }
        100% { transform: scale(1); }
      }
      
      .scale-effect {
        animation: scale 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      }
      
      @keyframes scale {
        0% { transform: scale(1); }
        50% { transform: scale(1.1); }
        100% { transform: scale(1); }
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * 创建微交互动画 - 优化版本，支持性能感知和响应时间监控
   */
  createMicroInteraction(
    element: HTMLElement,
    type: MicroInteractionType,
    customConfig?: Partial<AnimationConfig>
  ): string {
    const animationId = `micro_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = performance.now();

    performanceMonitor.startTimer('microInteraction');

    // 基于性能等级调整配置
    const baseConfig = { ...this.presets[type], ...customConfig };
    const config = this.adjustConfigForPerformance(baseConfig);

    let keyframes: Keyframe[] = [];
    
    switch (type) {
      case 'hover':
        keyframes = [
          { transform: 'scale(1)', filter: 'brightness(1)' },
          { transform: 'scale(1.02)', filter: 'brightness(1.1)' }
        ];
        break;
        
      case 'click':
        keyframes = [
          { transform: 'scale(1)' },
          { transform: 'scale(0.95)' },
          { transform: 'scale(1)' }
        ];
        break;
        
      case 'focus':
        keyframes = [
          { boxShadow: '0 0 0 0 rgba(102, 126, 234, 0.4)' },
          { boxShadow: '0 0 0 4px rgba(102, 126, 234, 0.4)' }
        ];
        break;
        
      case 'select':
        keyframes = [
          { transform: 'scale(1)', boxShadow: '0 3px 6px rgba(0,0,0,0.15)' },
          { transform: 'scale(1.05)', boxShadow: '0 0 15px rgba(255, 107, 53, 0.6)' }
        ];
        break;
        
      case 'success':
        keyframes = [
          { transform: 'scale(1)', backgroundColor: 'var(--success-color, #4CAF50)' },
          { transform: 'scale(1.1)', backgroundColor: 'var(--success-color, #4CAF50)' },
          { transform: 'scale(1)', backgroundColor: 'transparent' }
        ];
        break;
        
      case 'error':
        keyframes = [
          { transform: 'translateX(0)' },
          { transform: 'translateX(-5px)' },
          { transform: 'translateX(5px)' },
          { transform: 'translateX(0)' }
        ];
        break;
        
      case 'loading':
        keyframes = [
          { transform: 'rotate(0deg)' },
          { transform: 'rotate(360deg)' }
        ];
        break;
    }
    
    const animation = element.animate(keyframes, {
      duration: config.duration,
      easing: config.easing,
      delay: config.delay || 0,
      iterations: config.iterations || 1,
      direction: config.direction || 'normal',
      fill: config.fillMode || 'none'
    });
    
    this.activeAnimations.set(animationId, animation);
    
    animation.addEventListener('finish', () => {
      this.activeAnimations.delete(animationId);
    });
    
    const duration = performanceMonitor.endTimer('microInteraction');
    const totalTime = performance.now() - startTime;

    // 更新统计信息
    this.stats.totalAnimations++;
    this.stats.microInteractions++;
    this.stats.totalAnimationTime += duration;
    this.stats.averageAnimationTime = this.stats.totalAnimationTime / this.stats.totalAnimations;

    // 增强的性能监控：确保60fps目标
    const targetFrameTime = 16.67; // 60fps = 16.67ms per frame
    if (totalTime > targetFrameTime) {
      console.warn(`⚠️ 微交互动画创建耗时过长: ${type}, ${totalTime.toFixed(2)}ms (目标: <${targetFrameTime}ms)`);

      // 记录性能问题到监控系统
      if (window.performanceMonitor) {
        window.performanceMonitor.recordMetric('animationPerformanceIssue', {
          type,
          actualTime: totalTime,
          targetTime: targetFrameTime,
          overrun: totalTime - targetFrameTime
        });
      }
    } else {
      console.log(`✨ 微交互动画创建: ${type}, 耗时: ${totalTime.toFixed(2)}ms ✅`);
    }

    // 记录动画性能指标
    if (window.performanceMonitor) {
      window.performanceMonitor.recordMetric('animationCreationTime', totalTime);
      window.performanceMonitor.recordMetric('animationFrameRate', 1000 / totalTime);
    }

    return animationId;
  }

  /**
   * 创建视觉反馈效果
   */
  createVisualFeedback(
    element: HTMLElement,
    config: VisualFeedbackConfig,
    event?: MouseEvent | TouchEvent
  ): void {
    performanceMonitor.startTimer('visualFeedback');
    
    switch (config.type) {
      case 'ripple':
        this.createRippleEffect(element, event, config);
        break;
      case 'glow':
        this.createGlowEffect(element, config);
        break;
      case 'bounce':
        this.createBounceEffect(element, config);
        break;
      case 'shake':
        this.createShakeEffect(element, config);
        break;
      case 'pulse':
        this.createPulseEffect(element, config);
        break;
      case 'scale':
        this.createScaleEffect(element, config);
        break;
    }
    
    const duration = performanceMonitor.endTimer('visualFeedback');
    console.log(`🎨 视觉反馈创建: ${config.type}, 耗时: ${duration.toFixed(2)}ms`);
  }

  /**
   * 创建涟漪效果
   */
  private createRippleEffect(
    element: HTMLElement,
    event?: MouseEvent | TouchEvent,
    config?: VisualFeedbackConfig
  ): void {
    const rect = element.getBoundingClientRect();
    let x, y;

    if (event) {
      const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
      const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;
      x = clientX - rect.left;
      y = clientY - rect.top;
    } else {
      x = rect.width / 2;
      y = rect.height / 2;
    }

    const ripple = document.createElement('span');
    ripple.className = 'ripple-effect';
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    ripple.style.width = '10px';
    ripple.style.height = '10px';

    if (config?.color) {
      ripple.style.background = config.color;
    }

    // 确保元素有正确的样式
    const originalPosition = element.style.position;
    const originalOverflow = element.style.overflow;

    element.style.position = originalPosition || 'relative';
    element.style.overflow = 'hidden';
    element.appendChild(ripple);

    // 使用性能感知动画系统
    const animConfig = performanceAwareAnimator.getAnimationConfig();

    // 如果动画被禁用，直接返回
    if (!animConfig.enableAnimations) {
      element.removeChild(ripple);
      return;
    }

    // 根据性能等级调整涟漪效果
    const scale = animConfig.enableParticles ? 4 : 2;
    const duration = config?.duration || animConfig.duration;

    // 创建性能感知的涟漪动画
    const animation = performanceAwareAnimator.createAnimation(ripple, [
      {
        transform: 'scale(0)',
        opacity: '0.6'
      },
      {
        transform: `scale(${scale})`,
        opacity: '0'
      }
    ], {
      duration,
      easing: animConfig.easing,
      fill: 'forwards'
    });

    // 清理函数，确保元素被移除
    const cleanup = () => {
      if (ripple && ripple.parentNode) {
        ripple.parentNode.removeChild(ripple);
      }
      // 恢复原始样式
      if (!originalPosition) {
        element.style.position = '';
      }
      if (!originalOverflow) {
        element.style.overflow = '';
      }
    };

    // 动画完成后清理
    animation.addEventListener('finish', cleanup);
    animation.addEventListener('cancel', cleanup);
  }

  /**
   * 创建发光效果
   */
  private createGlowEffect(element: HTMLElement, config: VisualFeedbackConfig): void {
    const animConfig = performanceAwareAnimator.getAnimationConfig();

    // 如果不支持阴影效果，跳过
    if (!animConfig.enableShadows) {
      return;
    }

    const originalBoxShadow = element.style.boxShadow;
    const color = config.color || 'rgba(102, 126, 234, 0.6)';
    const intensity = config.intensity || 20;
    const duration = config.duration || animConfig.duration;

    // 使用性能感知动画
    const animation = performanceAwareAnimator.createAnimation(element, [
      {
        boxShadow: originalBoxShadow || 'none'
      },
      {
        boxShadow: `0 0 ${intensity}px ${color}`
      },
      {
        boxShadow: originalBoxShadow || 'none'
      }
    ], {
      duration,
      easing: animConfig.easing
    });

    animation.addEventListener('finish', () => {
      element.style.boxShadow = originalBoxShadow;
    });
  }

  /**
   * 创建弹跳效果
   */
  private createBounceEffect(element: HTMLElement, config: VisualFeedbackConfig): void {
    element.classList.add('bounce-effect');
    setTimeout(() => {
      element.classList.remove('bounce-effect');
    }, config.duration || 600);
  }

  /**
   * 创建摇摆效果
   */
  private createShakeEffect(element: HTMLElement, config: VisualFeedbackConfig): void {
    element.classList.add('shake-effect');
    setTimeout(() => {
      element.classList.remove('shake-effect');
    }, config.duration || 400);
  }

  /**
   * 创建脉冲效果
   */
  private createPulseEffect(element: HTMLElement, config: VisualFeedbackConfig): void {
    element.classList.add('pulse-effect');
    setTimeout(() => {
      element.classList.remove('pulse-effect');
    }, config.duration || 1000);
  }

  /**
   * 创建缩放效果
   */
  private createScaleEffect(element: HTMLElement, config: VisualFeedbackConfig): void {
    element.classList.add('scale-effect');
    setTimeout(() => {
      element.classList.remove('scale-effect');
    }, config.duration || 300);
  }

  /**
   * 触发触觉反馈
   */
  triggerHapticFeedback(type: HapticFeedbackType): void {
    if (!this.hapticSupported) return;
    
    let pattern: number | number[] = 50;
    
    switch (type) {
      case 'light':
        pattern = 10;
        break;
      case 'medium':
        pattern = 50;
        break;
      case 'heavy':
        pattern = 100;
        break;
      case 'selection':
        pattern = [10, 50];
        break;
      case 'impact':
        pattern = [50, 50, 50];
        break;
    }
    
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
    
    this.stats.hapticFeedbacks++;
    console.log(`📳 触觉反馈触发: ${type}`);
  }

  /**
   * 取消动画
   */
  cancelAnimation(animationId: string): void {
    const animation = this.activeAnimations.get(animationId);
    if (animation) {
      animation.cancel();
      this.activeAnimations.delete(animationId);
      console.log(`❌ 动画已取消: ${animationId}`);
    }
  }

  /**
   * 取消所有动画
   */
  cancelAllAnimations(): void {
    for (const [, animation] of this.activeAnimations.entries()) {
      animation.cancel();
    }
    this.activeAnimations.clear();
    console.log(`❌ 所有动画已取消`);
  }

  /**
   * 安全清理测试元素（更保守的方法）
   */
  cleanupTestElements(): void {
    console.log('🧹 开始安全清理交互动画测试元素...');

    let cleanedCount = 0;

    try {
      // 只清理涟漪效果元素（这些是临时的）
      const rippleElements = document.querySelectorAll('.ripple-effect');
      rippleElements.forEach(element => {
        if (element.parentNode) {
          element.parentNode.removeChild(element);
          cleanedCount++;
        }
      });

      // 清理明确标记为测试的元素
      const testElements = document.querySelectorAll('[data-test-element="true"]');
      testElements.forEach(element => {
        if (element.parentNode) {
          element.parentNode.removeChild(element);
          cleanedCount++;
        }
      });

      // 取消所有活跃的动画
      this.cancelAllAnimations();

      console.log(`🧹 安全清理完成，清理了 ${cleanedCount} 个元素`);
    } catch (error) {
      console.warn('⚠️ 安全清理失败:', error);
    }
  }



  /**
   * 获取性能统计
   */
  getStats() {
    return {
      ...this.stats,
      activeAnimations: this.activeAnimations.size,
      hapticSupported: this.hapticSupported
    };
  }

  /**
   * 打印性能统计
   */
  printStats(): void {
    const stats = this.getStats();
    
    console.group('✨ 交互动画系统统计');
    console.log(`总动画数: ${stats.totalAnimations}`);
    console.log(`微交互数: ${stats.microInteractions}`);
    console.log(`触觉反馈数: ${stats.hapticFeedbacks}`);
    console.log(`活跃动画数: ${stats.activeAnimations}`);
    console.log(`平均动画时间: ${stats.averageAnimationTime.toFixed(2)}ms`);
    console.log(`触觉反馈支持: ${stats.hapticSupported ? '✅' : '❌'}`);
    console.groupEnd();
  }
}

/**
 * 全局交互动画系统实例
 */
export const interactionAnimator = InteractionAnimator.getInstance();

// 在开发环境中挂载到全局
if (import.meta.env.DEV) {
  (window as any).interactionAnimator = interactionAnimator;
  console.log('✨ 交互动画系统已挂载到 window.interactionAnimator');
}
