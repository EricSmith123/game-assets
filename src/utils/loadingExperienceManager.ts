/**
 * 加载体验优化系统
 * 提供骨架屏、进度指示、错误处理等功能
 */

import { performanceMonitor } from './performanceMonitor';

/**
 * 加载状态枚举
 */
export enum LoadingState {
  IDLE = 'idle',
  LOADING = 'loading',
  SUCCESS = 'success',
  ERROR = 'error'
}

/**
 * 骨架屏配置接口
 */
export interface SkeletonConfig {
  width?: string;
  height?: string;
  borderRadius?: string;
  animation?: 'pulse' | 'wave' | 'none';
  count?: number;
}

/**
 * 进度指示器配置接口
 */
export interface ProgressConfig {
  type: 'linear' | 'circular' | 'dots' | 'spinner';
  color?: string;
  size?: 'small' | 'medium' | 'large';
  showPercentage?: boolean;
  showLabel?: boolean;
  label?: string;
}

/**
 * 错误处理配置接口
 */
export interface ErrorConfig {
  title?: string;
  message?: string;
  retryable?: boolean;
  retryText?: string;
  onRetry?: () => void;
}

/**
 * 加载体验优化管理器类
 */
export class LoadingExperienceManager {
  private static instance: LoadingExperienceManager;
  private loadingStates = new Map<string, LoadingState>();
  private progressValues = new Map<string, number>();
  private skeletonElements = new Map<string, HTMLElement>();
  private progressElements = new Map<string, HTMLElement>();
  
  // 性能统计
  private stats = {
    skeletonsCreated: 0,
    progressIndicatorsCreated: 0,
    errorsHandled: 0,
    loadingStatesChanged: 0,
    totalLoadingTime: 0,
    averageLoadingTime: 0
  };

  private constructor() {
    this.injectLoadingStyles();
  }

  static getInstance(): LoadingExperienceManager {
    if (!LoadingExperienceManager.instance) {
      LoadingExperienceManager.instance = new LoadingExperienceManager();
    }
    return LoadingExperienceManager.instance;
  }

  /**
   * 注入加载样式
   */
  private injectLoadingStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      /* 骨架屏样式 */
      .skeleton {
        background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
        background-size: 200% 100%;
        animation: skeleton-loading 1.5s infinite;
        border-radius: 4px;
      }
      
      .skeleton.pulse {
        animation: skeleton-pulse 1.5s ease-in-out infinite;
      }
      
      .skeleton.wave {
        animation: skeleton-wave 1.5s linear infinite;
      }
      
      @keyframes skeleton-loading {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
      
      @keyframes skeleton-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.4; }
      }
      
      @keyframes skeleton-wave {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(100%); }
      }
      
      /* 进度指示器样式 */
      .progress-container {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px;
      }
      
      .progress-linear {
        width: 100%;
        height: 4px;
        background: #e0e0e0;
        border-radius: 2px;
        overflow: hidden;
      }
      
      .progress-linear-bar {
        height: 100%;
        background: #667eea;
        border-radius: 2px;
        transition: width 0.3s ease;
      }
      
      .progress-circular {
        width: 40px;
        height: 40px;
        border: 4px solid #e0e0e0;
        border-top: 4px solid #667eea;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }
      
      .progress-dots {
        display: flex;
        gap: 4px;
      }
      
      .progress-dot {
        width: 8px;
        height: 8px;
        background: #667eea;
        border-radius: 50%;
        animation: dot-bounce 1.4s ease-in-out infinite both;
      }
      
      .progress-dot:nth-child(1) { animation-delay: -0.32s; }
      .progress-dot:nth-child(2) { animation-delay: -0.16s; }
      .progress-dot:nth-child(3) { animation-delay: 0s; }
      
      .progress-spinner {
        width: 40px;
        height: 40px;
        border: 4px solid rgba(255, 255, 255, 0.2);
        border-top: 4px solid #ffffff;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
      }
      
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      @keyframes dot-bounce {
        0%, 80%, 100% { transform: scale(0); }
        40% { transform: scale(1); }
      }
      
      /* 错误处理样式 */
      .error-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 20px;
        text-align: center;
        background: #fff;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      }
      
      .error-icon {
        width: 48px;
        height: 48px;
        background: #ff4757;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 24px;
        margin-bottom: 16px;
      }
      
      .error-title {
        font-size: 18px;
        font-weight: 600;
        color: #333;
        margin-bottom: 8px;
      }
      
      .error-message {
        font-size: 14px;
        color: #666;
        margin-bottom: 16px;
        line-height: 1.5;
      }
      
      .error-retry-button {
        background: #667eea;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        transition: background 0.2s;
      }
      
      .error-retry-button:hover {
        background: #5a67d8;
      }
      
      /* 加载遮罩 */
      .loading-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, rgba(102, 126, 234, 0.95), rgba(118, 75, 162, 0.95));
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        animation: fadeIn 0.3s ease-out;
      }

      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      .loading-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 24px;
        background: rgba(255, 255, 255, 0.15);
        padding: 48px;
        border-radius: 20px;
        box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
        backdrop-filter: blur(25px);
        -webkit-backdrop-filter: blur(25px);
        border: 1px solid rgba(255, 255, 255, 0.25);
        position: relative;
        overflow: hidden;
      }

      .loading-content::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(45deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05));
        border-radius: 20px;
        pointer-events: none;
      }

      .loading-text {
        font-size: 20px;
        color: #ffffff;
        font-weight: 600;
        text-align: center;
        margin: 0;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        letter-spacing: 0.5px;
      }
      
      /* 响应式调整 */
      @media (max-width: 768px) {
        .progress-container {
          padding: 8px;
        }
        
        .error-container {
          margin: 10px;
          padding: 16px;
        }
        
        .loading-text {
          font-size: 14px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * 创建骨架屏
   */
  createSkeleton(container: HTMLElement, config: SkeletonConfig = {}): string {
    const skeletonId = `skeleton_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    performanceMonitor.startTimer('createSkeleton');
    
    const {
      width = '100%',
      height = '20px',
      borderRadius = '4px',
      animation = 'loading',
      count = 1
    } = config;
    
    const skeletonContainer = document.createElement('div');
    skeletonContainer.className = 'skeleton-container';
    
    for (let i = 0; i < count; i++) {
      const skeleton = document.createElement('div');
      skeleton.className = `skeleton ${animation}`;
      skeleton.style.width = width;
      skeleton.style.height = height;
      skeleton.style.borderRadius = borderRadius;
      skeleton.style.marginBottom = i < count - 1 ? '8px' : '0';
      
      skeletonContainer.appendChild(skeleton);
    }
    
    container.appendChild(skeletonContainer);
    this.skeletonElements.set(skeletonId, skeletonContainer);
    
    const duration = performanceMonitor.endTimer('createSkeleton');
    this.stats.skeletonsCreated++;
    
    console.log(`💀 骨架屏已创建: ${skeletonId}, 耗时: ${duration.toFixed(2)}ms`);
    
    return skeletonId;
  }

  /**
   * 移除骨架屏
   */
  removeSkeleton(skeletonId: string): void {
    const skeleton = this.skeletonElements.get(skeletonId);
    if (skeleton && skeleton.parentNode) {
      skeleton.parentNode.removeChild(skeleton);
      this.skeletonElements.delete(skeletonId);
      console.log(`💀 骨架屏已移除: ${skeletonId}`);
    }
  }

  /**
   * 创建进度指示器
   */
  createProgressIndicator(container: HTMLElement, config: ProgressConfig): string {
    const progressId = `progress_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    performanceMonitor.startTimer('createProgress');
    
    const progressContainer = document.createElement('div');
    progressContainer.className = 'progress-container';
    
    let progressElement: HTMLElement;
    
    switch (config.type) {
      case 'linear':
        progressElement = this.createLinearProgress(config);
        break;
      case 'circular':
        progressElement = this.createCircularProgress(config);
        break;
      case 'dots':
        progressElement = this.createDotsProgress(config);
        break;
      case 'spinner':
        progressElement = this.createSpinnerProgress(config);
        break;
      default:
        progressElement = this.createLinearProgress(config);
    }
    
    progressContainer.appendChild(progressElement);
    
    if (config.showLabel && config.label) {
      const label = document.createElement('span');
      label.className = 'progress-label';
      label.textContent = config.label;
      progressContainer.appendChild(label);
    }
    
    container.appendChild(progressContainer);
    this.progressElements.set(progressId, progressContainer);
    this.progressValues.set(progressId, 0);
    
    const duration = performanceMonitor.endTimer('createProgress');
    this.stats.progressIndicatorsCreated++;
    
    console.log(`📊 进度指示器已创建: ${progressId}, 耗时: ${duration.toFixed(2)}ms`);
    
    return progressId;
  }

  /**
   * 创建线性进度条
   */
  private createLinearProgress(config: ProgressConfig): HTMLElement {
    const container = document.createElement('div');
    container.className = 'progress-linear';
    
    const bar = document.createElement('div');
    bar.className = 'progress-linear-bar';
    bar.style.width = '0%';
    
    if (config.color) {
      bar.style.background = config.color;
    }
    
    container.appendChild(bar);
    return container;
  }

  /**
   * 创建圆形进度条
   */
  private createCircularProgress(config: ProgressConfig): HTMLElement {
    const spinner = document.createElement('div');
    spinner.className = 'progress-circular';
    
    if (config.color) {
      spinner.style.borderTopColor = config.color;
    }
    
    return spinner;
  }

  /**
   * 创建点状进度条
   */
  private createDotsProgress(config: ProgressConfig): HTMLElement {
    const container = document.createElement('div');
    container.className = 'progress-dots';
    
    for (let i = 0; i < 3; i++) {
      const dot = document.createElement('div');
      dot.className = 'progress-dot';
      
      if (config.color) {
        dot.style.background = config.color;
      }
      
      container.appendChild(dot);
    }
    
    return container;
  }

  /**
   * 创建旋转器进度条
   */
  private createSpinnerProgress(config: ProgressConfig): HTMLElement {
    const spinner = document.createElement('div');
    spinner.className = 'progress-spinner';
    
    if (config.color) {
      spinner.style.borderTopColor = config.color;
    }
    
    return spinner;
  }

  /**
   * 更新进度
   */
  updateProgress(progressId: string, value: number): void {
    const progressElement = this.progressElements.get(progressId);
    if (!progressElement) return;
    
    const clampedValue = Math.max(0, Math.min(100, value));
    this.progressValues.set(progressId, clampedValue);
    
    const linearBar = progressElement.querySelector('.progress-linear-bar') as HTMLElement;
    if (linearBar) {
      linearBar.style.width = `${clampedValue}%`;
    }
    
    const percentageElement = progressElement.querySelector('.progress-percentage');
    if (percentageElement) {
      percentageElement.textContent = `${Math.round(clampedValue)}%`;
    }
  }

  /**
   * 移除进度指示器
   */
  removeProgressIndicator(progressId: string): void {
    const progressElement = this.progressElements.get(progressId);
    if (progressElement && progressElement.parentNode) {
      progressElement.parentNode.removeChild(progressElement);
      this.progressElements.delete(progressId);
      this.progressValues.delete(progressId);
      console.log(`📊 进度指示器已移除: ${progressId}`);
    }
  }

  /**
   * 创建错误处理界面
   */
  createErrorHandler(container: HTMLElement, config: ErrorConfig): HTMLElement {
    performanceMonitor.startTimer('createErrorHandler');
    
    const errorContainer = document.createElement('div');
    errorContainer.className = 'error-container';
    
    const errorIcon = document.createElement('div');
    errorIcon.className = 'error-icon';
    errorIcon.textContent = '!';
    
    const errorTitle = document.createElement('div');
    errorTitle.className = 'error-title';
    errorTitle.textContent = config.title || '出现错误';
    
    const errorMessage = document.createElement('div');
    errorMessage.className = 'error-message';
    errorMessage.textContent = config.message || '请稍后重试';
    
    errorContainer.appendChild(errorIcon);
    errorContainer.appendChild(errorTitle);
    errorContainer.appendChild(errorMessage);
    
    if (config.retryable && config.onRetry) {
      const retryButton = document.createElement('button');
      retryButton.className = 'error-retry-button';
      retryButton.textContent = config.retryText || '重试';
      retryButton.addEventListener('click', config.onRetry);
      errorContainer.appendChild(retryButton);
    }
    
    container.appendChild(errorContainer);
    
    const duration = performanceMonitor.endTimer('createErrorHandler');
    this.stats.errorsHandled++;
    
    console.log(`❌ 错误处理界面已创建, 耗时: ${duration.toFixed(2)}ms`);
    
    return errorContainer;
  }

  /**
   * 创建全屏加载遮罩
   */
  createLoadingOverlay(config: ProgressConfig & { text?: string } = { type: 'spinner' }): string {
    const overlayId = `overlay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.id = overlayId;
    
    const content = document.createElement('div');
    content.className = 'loading-content';
    
    // 创建进度指示器
    const progressContainer = document.createElement('div');
    const progressElement = this.createSpinnerProgress(config);
    progressContainer.appendChild(progressElement);
    content.appendChild(progressContainer);
    
    // 添加文本
    if (config.text) {
      const text = document.createElement('div');
      text.className = 'loading-text';
      text.textContent = config.text;
      content.appendChild(text);
    }
    
    overlay.appendChild(content);
    document.body.appendChild(overlay);
    
    console.log(`🔄 加载遮罩已创建: ${overlayId}`);
    
    return overlayId;
  }

  /**
   * 移除加载遮罩
   */
  removeLoadingOverlay(overlayId: string): void {
    const overlay = document.getElementById(overlayId);
    if (overlay && overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
      console.log(`🔄 加载遮罩已移除: ${overlayId}`);
    }
  }

  /**
   * 设置加载状态
   */
  setLoadingState(key: string, state: LoadingState): void {
    const oldState = this.loadingStates.get(key);
    this.loadingStates.set(key, state);
    
    if (oldState !== state) {
      this.stats.loadingStatesChanged++;
      console.log(`🔄 加载状态变更: ${key} ${oldState} → ${state}`);
    }
  }

  /**
   * 获取加载状态
   */
  getLoadingState(key: string): LoadingState {
    return this.loadingStates.get(key) || LoadingState.IDLE;
  }

  /**
   * 获取性能统计
   */
  getStats() {
    return {
      ...this.stats,
      activeSkeletons: this.skeletonElements.size,
      activeProgressIndicators: this.progressElements.size,
      activeLoadingStates: this.loadingStates.size
    };
  }

  /**
   * 打印性能统计
   */
  printStats(): void {
    const stats = this.getStats();
    
    console.group('🔄 加载体验管理器统计');
    console.log(`骨架屏创建数: ${stats.skeletonsCreated}`);
    console.log(`进度指示器创建数: ${stats.progressIndicatorsCreated}`);
    console.log(`错误处理数: ${stats.errorsHandled}`);
    console.log(`加载状态变更数: ${stats.loadingStatesChanged}`);
    console.log(`活跃骨架屏数: ${stats.activeSkeletons}`);
    console.log(`活跃进度指示器数: ${stats.activeProgressIndicators}`);
    console.log(`活跃加载状态数: ${stats.activeLoadingStates}`);
    console.log(`平均加载时间: ${stats.averageLoadingTime.toFixed(2)}ms`);
    console.groupEnd();
  }
}

/**
 * 全局加载体验管理器实例
 */
export const loadingExperienceManager = LoadingExperienceManager.getInstance();

// 在开发环境中挂载到全局
if (import.meta.env.DEV) {
  (window as any).loadingExperienceManager = loadingExperienceManager;
  console.log('🔄 加载体验管理器已挂载到 window.loadingExperienceManager');
}
