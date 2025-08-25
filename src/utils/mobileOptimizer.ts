/**
 * 移动端优化管理器
 * 专门针对移动设备进行性能和用户体验优化
 */

import { Logger } from './logger';
import { environmentGuard } from './environmentGuard';
import { configManager } from './configManager';
import { touchGestureManager, GestureType } from './touchGestureManager';

// 移动端设备类型
export enum MobileDeviceType {
  PHONE = 'phone',
  TABLET = 'tablet',
  DESKTOP = 'desktop'
}

// 屏幕方向
export enum ScreenOrientation {
  PORTRAIT = 'portrait',
  LANDSCAPE = 'landscape'
}

// 移动端配置
interface MobileConfig {
  enableTouchOptimization: boolean;
  enableVibration: boolean;
  enableReducedMotion: boolean;
  touchSensitivity: number;
  gestureThreshold: number;
}

export class MobileOptimizer {
  private static instance: MobileOptimizer;
  private logger: Logger;
  private config: MobileConfig;
  private deviceType: MobileDeviceType = MobileDeviceType.DESKTOP;
  private orientation: ScreenOrientation = ScreenOrientation.PORTRAIT;
  private isVisible = true;

  private constructor() {
    this.logger = Logger.getInstance();
    this.config = {
      enableTouchOptimization: true,
      enableVibration: true,
      enableReducedMotion: false,
      touchSensitivity: 1.0,
      gestureThreshold: 50
    };

    this.detectDevice();
    this.setupEventListeners();
    this.optimizeForMobile();

    environmentGuard.runInDevelopment(() => {
      this.logger.debug('移动端优化管理器已初始化', {
        deviceType: this.deviceType,
        orientation: this.orientation
      }, 'MobileOptimizer');
    });
  }

  static getInstance(): MobileOptimizer {
    if (!MobileOptimizer.instance) {
      MobileOptimizer.instance = new MobileOptimizer();
    }
    return MobileOptimizer.instance;
  }

  /**
   * 检测设备类型
   */
  private detectDevice(): void {
    const userAgent = navigator.userAgent;
    const screenWidth = window.screen.width;
    const screenHeight = window.screen.height;
    const maxDimension = Math.max(screenWidth, screenHeight);
    const minDimension = Math.min(screenWidth, screenHeight);

    // 检查是否为移动设备
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    
    if (isMobile) {
      // 区分手机和平板
      if (minDimension >= 768 || maxDimension >= 1024) {
        this.deviceType = MobileDeviceType.TABLET;
      } else {
        this.deviceType = MobileDeviceType.PHONE;
      }
    } else {
      this.deviceType = MobileDeviceType.DESKTOP;
    }

    // 检测屏幕方向
    this.updateOrientation();
  }

  /**
   * 更新屏幕方向
   */
  private updateOrientation(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    this.orientation = width > height ? ScreenOrientation.LANDSCAPE : ScreenOrientation.PORTRAIT;
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    // 屏幕方向变化
    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        this.updateOrientation();
        this.handleOrientationChange();
      }, 100);
    });

    // 窗口大小变化
    window.addEventListener('resize', () => {
      this.updateOrientation();
      this.optimizeLayout();
    });

    // 页面可见性变化
    document.addEventListener('visibilitychange', () => {
      this.isVisible = !document.hidden;
      this.handleVisibilityChange();
    });

    // 触摸手势集成
    if (this.isMobileDevice()) {
      this.setupTouchGestures();
    }
  }

  /**
   * 设置触摸手势
   */
  private setupTouchGestures(): void {
    // 点击手势
    touchGestureManager.addEventListener(GestureType.TAP, (event) => {
      this.handleTap(event);
    });

    // 滑动手势
    touchGestureManager.addEventListener(GestureType.SWIPE, (event) => {
      this.handleSwipe(event);
    });

    // 长按手势
    touchGestureManager.addEventListener(GestureType.LONG_PRESS, (event) => {
      this.handleLongPress(event);
    });
  }

  /**
   * 处理点击手势
   */
  private handleTap(event: any): void {
    // 添加触摸反馈
    if (this.config.enableVibration) {
      touchGestureManager.vibrate(30);
    }

    // 触发点击事件
    const clickEvent = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      clientX: event.startPoint.x,
      clientY: event.startPoint.y
    });
    
    event.target.dispatchEvent(clickEvent);
  }

  /**
   * 处理滑动手势
   */
  private handleSwipe(event: any): void {
    // 检查是否为游戏板上的滑动
    const gameBoard = event.target.closest('.game-board');
    if (gameBoard && event.distance > this.config.gestureThreshold) {
      // 触发方块交换逻辑
      this.handleTileSwap(event);
    }
  }

  /**
   * 处理长按手势
   */
  private handleLongPress(event: any): void {
    if (this.config.enableVibration) {
      touchGestureManager.vibrate([50, 100, 50]);
    }

    // 触发长按事件
    const longPressEvent = new CustomEvent('longpress', {
      bubbles: true,
      detail: {
        x: event.startPoint.x,
        y: event.startPoint.y,
        duration: event.duration
      }
    });
    
    event.target.dispatchEvent(longPressEvent);
  }

  /**
   * 处理方块交换
   */
  private handleTileSwap(event: any): void {
    // 发送自定义事件给游戏逻辑
    const swapEvent = new CustomEvent('tileSwap', {
      bubbles: true,
      detail: {
        direction: event.direction,
        startPoint: event.startPoint,
        endPoint: event.endPoint,
        target: event.target
      }
    });

    event.target.dispatchEvent(swapEvent);
  }

  /**
   * 处理屏幕方向变化
   */
  private handleOrientationChange(): void {
    this.optimizeLayout();
    
    // 通知其他组件方向变化
    window.dispatchEvent(new CustomEvent('mobileOrientationChange', {
      detail: { orientation: this.orientation }
    }));

    this.logger.debug(`屏幕方向已变更: ${this.orientation}`, undefined, 'MobileOptimizer');
  }

  /**
   * 处理页面可见性变化
   */
  private handleVisibilityChange(): void {
    if (this.isVisible) {
      // 页面变为可见，恢复优化
      this.resumeOptimizations();
    } else {
      // 页面变为隐藏，暂停优化
      this.pauseOptimizations();
    }
  }

  /**
   * 优化布局
   */
  private optimizeLayout(): void {
    const root = document.documentElement;
    
    // 设置CSS变量
    root.style.setProperty('--device-type', this.deviceType);
    root.style.setProperty('--orientation', this.orientation);
    
    // 安全区域适配
    if (this.deviceType === MobileDeviceType.PHONE) {
      root.style.setProperty('--safe-area-inset-top', 'env(safe-area-inset-top)');
      root.style.setProperty('--safe-area-inset-bottom', 'env(safe-area-inset-bottom)');
    }

    // 字体大小调整
    const baseFontSize = this.deviceType === MobileDeviceType.PHONE ? '14px' : '16px';
    root.style.setProperty('--base-font-size', baseFontSize);
  }

  /**
   * 移动端性能优化
   */
  private optimizeForMobile(): void {
    if (!this.isMobileDevice()) return;

    // 禁用某些动画以提升性能
    if (this.config.enableReducedMotion) {
      document.documentElement.style.setProperty('--animation-duration', '0s');
    }

    // 优化触摸事件
    if (this.config.enableTouchOptimization) {
      this.optimizeTouchEvents();
    }

    // 移动端特定的CSS优化
    this.applyMobileCSSOptimizations();
  }

  /**
   * 优化触摸事件
   */
  private optimizeTouchEvents(): void {
    // 添加touch-action CSS属性
    const style = document.createElement('style');
    style.textContent = `
      .game-board {
        touch-action: manipulation;
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        user-select: none;
      }
      
      .tile {
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * 应用移动端CSS优化
   */
  private applyMobileCSSOptimizations(): void {
    const style = document.createElement('style');
    style.textContent = `
      @media (max-width: 768px) {
        .game-container {
          padding: 10px;
        }
        
        .settings-panel {
          font-size: var(--base-font-size);
        }
        
        .button {
          min-height: 44px;
          min-width: 44px;
        }
      }
      
      @media (orientation: landscape) and (max-height: 500px) {
        .game-board {
          max-height: 80vh;
        }
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * 暂停优化
   */
  private pauseOptimizations(): void {
    // 暂停动画
    document.documentElement.style.setProperty('--animation-play-state', 'paused');
    
    this.logger.debug('移动端优化已暂停', undefined, 'MobileOptimizer');
  }

  /**
   * 恢复优化
   */
  private resumeOptimizations(): void {
    // 恢复动画
    document.documentElement.style.setProperty('--animation-play-state', 'running');
    
    this.logger.debug('移动端优化已恢复', undefined, 'MobileOptimizer');
  }

  /**
   * 检查是否为移动设备
   */
  isMobileDevice(): boolean {
    return this.deviceType !== MobileDeviceType.DESKTOP;
  }

  /**
   * 获取设备类型
   */
  getDeviceType(): MobileDeviceType {
    return this.deviceType;
  }

  /**
   * 获取屏幕方向
   */
  getOrientation(): ScreenOrientation {
    return this.orientation;
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<MobileConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // 重新应用优化
    this.optimizeForMobile();
    
    this.logger.debug('移动端配置已更新', this.config, 'MobileOptimizer');
  }

  /**
   * 获取移动端统计信息
   */
  getMobileStats(): {
    deviceType: MobileDeviceType;
    orientation: ScreenOrientation;
    touchSupported: boolean;
    vibrationSupported: boolean;
    screenSize: { width: number; height: number };
  } {
    return {
      deviceType: this.deviceType,
      orientation: this.orientation,
      touchSupported: touchGestureManager.isTouchSupported(),
      vibrationSupported: 'vibrate' in navigator,
      screenSize: {
        width: window.screen.width,
        height: window.screen.height
      }
    };
  }
}

// 创建全局实例
export const mobileOptimizer = MobileOptimizer.getInstance();

// 在开发环境中挂载到全局
environmentGuard.runInDevelopment(() => {
  (window as any).mobileOptimizer = mobileOptimizer;
  console.log('📱 移动端优化管理器已挂载到 window.mobileOptimizer');
});
