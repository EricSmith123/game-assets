/**
 * 动画性能优化器
 * 提供GPU加速、硬件优化、动画批处理等功能
 */

import { performanceMonitor } from './performanceMonitor';

/**
 * 动画配置接口
 */
export interface AnimationConfig {
  duration: number;
  easing: string;
  delay?: number;
  fillMode?: string;
  useGPU?: boolean;
  willChange?: string[];
}

/**
 * 动画状态接口
 */
export interface AnimationState {
  id: string;
  element: HTMLElement;
  config: AnimationConfig;
  startTime: number;
  endTime: number;
  isActive: boolean;
  onComplete?: () => void;
}

/**
 * GPU加速样式接口
 */
export interface GPUStyles {
  transform?: string;
  opacity?: number;
  filter?: string;
  willChange?: string;
  backfaceVisibility?: string;
  perspective?: string;
}

/**
 * 动画优化器类
 */
export class AnimationOptimizer {
  private static instance: AnimationOptimizer;
  private activeAnimations = new Map<string, AnimationState>();
  private animationFrame: number | null = null;
  private gpuAcceleration: boolean = true;
  
  // 性能统计
  private stats = {
    totalAnimations: 0,
    gpuAnimations: 0,
    batchedAnimations: 0,
    averageFrameTime: 0,
    totalFrameTime: 0,
    frameCount: 0
  };

  private constructor() {
    this.detectGPUSupport();
  }

  static getInstance(): AnimationOptimizer {
    if (!AnimationOptimizer.instance) {
      AnimationOptimizer.instance = new AnimationOptimizer();
    }
    return AnimationOptimizer.instance;
  }

  /**
   * 检测GPU支持
   */
  private detectGPUSupport(): void {
    const testElement = document.createElement('div');
    testElement.style.transform = 'translateZ(0)';
    testElement.style.willChange = 'transform';
    
    // 检查是否支持硬件加速
    const computedStyle = getComputedStyle(testElement);
    this.gpuAcceleration = computedStyle.transform !== 'none';
    
    console.log(`🎮 GPU加速支持: ${this.gpuAcceleration ? '✅' : '❌'}`);
  }

  /**
   * 应用GPU加速样式
   */
  applyGPUAcceleration(element: HTMLElement, styles: GPUStyles = {}): void {
    if (!this.gpuAcceleration) return;
    
    const gpuStyles: Record<string, string> = {
      // 强制GPU层
      transform: styles.transform || 'translateZ(0)',
      // 背面可见性
      backfaceVisibility: styles.backfaceVisibility || 'hidden',
      // 透视
      perspective: styles.perspective || '1000px',
      // will-change提示
      willChange: styles.willChange || 'transform, opacity',
      // 其他样式转换为字符串
      ...(styles.opacity !== undefined ? { opacity: styles.opacity.toString() } : {}),
      ...(styles.filter ? { filter: styles.filter } : {})
    };
    
    Object.assign(element.style, gpuStyles);
    
    console.log(`🎮 GPU加速已应用到元素:`, element.className);
  }

  /**
   * 移除GPU加速样式
   */
  removeGPUAcceleration(element: HTMLElement): void {
    element.style.transform = '';
    element.style.backfaceVisibility = '';
    element.style.perspective = '';
    element.style.willChange = '';
    
    console.log(`🎮 GPU加速已移除:`, element.className);
  }

  /**
   * 创建优化的动画
   */
  createAnimation(
    element: HTMLElement,
    keyframes: Keyframe[],
    config: AnimationConfig
  ): string {
    const animationId = `anim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    performanceMonitor.startTimer('createAnimation');
    
    // 应用GPU加速
    if (config.useGPU !== false) {
      this.applyGPUAcceleration(element, {
        willChange: config.willChange?.join(', ') || 'transform, opacity'
      });
      this.stats.gpuAnimations++;
    }
    
    // 创建Web Animations API动画
    const animation = element.animate(keyframes, {
      duration: config.duration,
      easing: config.easing,
      delay: config.delay || 0,
      fill: config.fillMode as FillMode || 'forwards'
    });
    
    // 记录动画状态
    const animationState: AnimationState = {
      id: animationId,
      element,
      config,
      startTime: Date.now(),
      endTime: Date.now() + config.duration + (config.delay || 0),
      isActive: true
    };
    
    this.activeAnimations.set(animationId, animationState);
    
    // 动画完成处理
    animation.addEventListener('finish', () => {
      this.onAnimationComplete(animationId);
    });
    
    animation.addEventListener('cancel', () => {
      this.onAnimationComplete(animationId);
    });
    
    const duration = performanceMonitor.endTimer('createAnimation');
    this.stats.totalAnimations++;
    
    console.log(`🎬 动画创建: ${animationId}, 耗时: ${duration.toFixed(2)}ms`);
    
    return animationId;
  }

  /**
   * 动画完成处理
   */
  private onAnimationComplete(animationId: string): void {
    const animationState = this.activeAnimations.get(animationId);
    if (!animationState) return;
    
    // 移除GPU加速（如果需要）
    if (animationState.config.useGPU !== false) {
      this.removeGPUAcceleration(animationState.element);
    }
    
    // 执行完成回调
    if (animationState.onComplete) {
      animationState.onComplete();
    }
    
    // 清理动画状态
    this.activeAnimations.delete(animationId);
    
    console.log(`🎬 动画完成: ${animationId}`);
  }

  /**
   * 批量创建动画
   */
  createBatchAnimation(
    animations: Array<{
      element: HTMLElement;
      keyframes: Keyframe[];
      config: AnimationConfig;
    }>
  ): string[] {
    performanceMonitor.startTimer('batchAnimation');
    
    const animationIds: string[] = [];
    
    // 批量应用GPU加速
    animations.forEach(({ element, config }) => {
      if (config.useGPU !== false) {
        this.applyGPUAcceleration(element, {
          willChange: config.willChange?.join(', ') || 'transform, opacity'
        });
      }
    });
    
    // 批量创建动画
    animations.forEach(({ element, keyframes, config }) => {
      const animationId = this.createAnimation(element, keyframes, config);
      animationIds.push(animationId);
    });
    
    const duration = performanceMonitor.endTimer('batchAnimation');
    this.stats.batchedAnimations += animations.length;
    
    console.log(`🎬 批量动画创建: ${animations.length}个动画, 耗时: ${duration.toFixed(2)}ms`);
    
    return animationIds;
  }

  /**
   * 取消动画
   */
  cancelAnimation(animationId: string): void {
    const animationState = this.activeAnimations.get(animationId);
    if (!animationState) return;
    
    // 移除GPU加速
    if (animationState.config.useGPU !== false) {
      this.removeGPUAcceleration(animationState.element);
    }
    
    // 清理状态
    this.activeAnimations.delete(animationId);
    
    console.log(`🎬 动画已取消: ${animationId}`);
  }

  /**
   * 取消所有动画
   */
  cancelAllAnimations(): void {
    const animationIds = Array.from(this.activeAnimations.keys());
    animationIds.forEach(id => this.cancelAnimation(id));
    
    console.log(`🎬 所有动画已取消: ${animationIds.length}个`);
  }

  /**
   * 优化的CSS类切换
   */
  optimizedClassToggle(
    element: HTMLElement,
    className: string,
    force?: boolean
  ): void {
    performanceMonitor.startTimer('classToggle');
    
    // 使用requestAnimationFrame确保在下一帧执行
    requestAnimationFrame(() => {
      if (force !== undefined) {
        element.classList.toggle(className, force);
      } else {
        element.classList.toggle(className);
      }
      
      const duration = performanceMonitor.endTimer('classToggle');
      
      if (duration > 1) {
        console.warn(`⚠️ 类切换耗时较长: ${duration.toFixed(2)}ms`);
      }
    });
  }

  /**
   * 优化的样式批量更新
   */
  batchStyleUpdate(
    updates: Array<{
      element: HTMLElement;
      styles: Record<string, string>;
    }>
  ): void {
    performanceMonitor.startTimer('batchStyleUpdate');
    
    // 使用requestAnimationFrame批量更新
    requestAnimationFrame(() => {
      updates.forEach(({ element, styles }) => {
        Object.assign(element.style, styles);
      });
      
      const duration = performanceMonitor.endTimer('batchStyleUpdate');
      console.log(`🎨 批量样式更新: ${updates.length}个元素, 耗时: ${duration.toFixed(2)}ms`);
    });
  }

  /**
   * 创建高性能的方块动画
   */
  createTileAnimation(
    element: HTMLElement,
    type: 'select' | 'match' | 'shake' | 'fall',
    options: Partial<AnimationConfig> = {}
  ): string {
    const baseConfig: AnimationConfig = {
      duration: 300,
      easing: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
      useGPU: true,
      willChange: ['transform', 'opacity', 'box-shadow'],
      ...options
    };
    
    let keyframes: Keyframe[] = [];
    
    switch (type) {
      case 'select':
        keyframes = [
          { transform: 'scale(1)', boxShadow: '0 3px 6px rgba(0,0,0,0.15)' },
          { transform: 'scale(1.05)', boxShadow: '0 0 15px rgba(255, 107, 53, 0.6)' }
        ];
        break;
        
      case 'match':
        keyframes = [
          { transform: 'scale(1)', opacity: 1 },
          { transform: 'scale(1.2)', opacity: 0.8 },
          { transform: 'scale(0)', opacity: 0 }
        ];
        break;
        
      case 'shake':
        keyframes = [
          { transform: 'translateX(0)' },
          { transform: 'translateX(-5px)' },
          { transform: 'translateX(5px)' },
          { transform: 'translateX(-5px)' },
          { transform: 'translateX(0)' }
        ];
        baseConfig.duration = 400;
        break;
        
      case 'fall':
        keyframes = [
          { transform: 'translateY(-20px)', opacity: 0 },
          { transform: 'translateY(0)', opacity: 1 }
        ];
        break;
    }
    
    return this.createAnimation(element, keyframes, baseConfig);
  }

  /**
   * 启动性能监控
   */
  startPerformanceMonitoring(): void {
    if (this.animationFrame) return;
    
    const monitor = () => {
      const frameStart = performance.now();
      
      // 清理过期动画
      const now = Date.now();
      for (const [id, state] of this.activeAnimations.entries()) {
        if (now > state.endTime && state.isActive) {
          this.onAnimationComplete(id);
        }
      }
      
      const frameTime = performance.now() - frameStart;
      this.stats.frameCount++;
      this.stats.totalFrameTime += frameTime;
      this.stats.averageFrameTime = this.stats.totalFrameTime / this.stats.frameCount;
      
      this.animationFrame = requestAnimationFrame(monitor);
    };
    
    this.animationFrame = requestAnimationFrame(monitor);
    console.log('🎬 动画性能监控已启动');
  }

  /**
   * 停止性能监控
   */
  stopPerformanceMonitoring(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
      console.log('🎬 动画性能监控已停止');
    }
  }

  /**
   * 获取性能统计
   */
  getStats() {
    return {
      ...this.stats,
      activeAnimations: this.activeAnimations.size,
      gpuSupport: this.gpuAcceleration,
      gpuUsageRate: this.stats.totalAnimations > 0 ? 
        (this.stats.gpuAnimations / this.stats.totalAnimations) * 100 : 0
    };
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.stats = {
      totalAnimations: 0,
      gpuAnimations: 0,
      batchedAnimations: 0,
      averageFrameTime: 0,
      totalFrameTime: 0,
      frameCount: 0
    };
  }

  /**
   * 打印性能统计
   */
  printStats(): void {
    const stats = this.getStats();
    
    console.group('🎬 动画优化器统计');
    console.log(`GPU支持: ${stats.gpuSupport ? '✅' : '❌'}`);
    console.log(`总动画数: ${stats.totalAnimations}`);
    console.log(`GPU动画数: ${stats.gpuAnimations}`);
    console.log(`批量动画数: ${stats.batchedAnimations}`);
    console.log(`活跃动画数: ${stats.activeAnimations}`);
    console.log(`GPU使用率: ${stats.gpuUsageRate.toFixed(1)}%`);
    console.log(`平均帧时间: ${stats.averageFrameTime.toFixed(2)}ms`);
    console.log(`总帧数: ${stats.frameCount}`);
    console.groupEnd();
  }
}

/**
 * 全局动画优化器实例
 */
export const animationOptimizer = AnimationOptimizer.getInstance();

// 在开发环境中挂载到全局
if (import.meta.env.DEV) {
  (window as any).animationOptimizer = animationOptimizer;
  console.log('🎬 动画优化器已挂载到 window.animationOptimizer');
}
