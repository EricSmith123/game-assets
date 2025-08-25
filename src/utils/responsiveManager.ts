/**
 * 响应式设计管理器
 * 提供移动端适配、触摸优化、屏幕适配等功能
 */

import { performanceMonitor } from './performanceMonitor';

/**
 * 设备类型枚举
 */
export enum DeviceType {
  MOBILE = 'mobile',
  TABLET = 'tablet',
  DESKTOP = 'desktop'
}

/**
 * 屏幕方向枚举
 */
export enum ScreenOrientation {
  PORTRAIT = 'portrait',
  LANDSCAPE = 'landscape'
}

/**
 * 断点配置接口
 */
export interface BreakpointConfig {
  mobile: number;
  tablet: number;
  desktop: number;
}

/**
 * 触摸手势类型
 */
export type GestureType = 'tap' | 'swipe' | 'pinch' | 'rotate' | 'pan';

/**
 * 手势事件接口
 */
export interface GestureEvent {
  type: GestureType;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  deltaX: number;
  deltaY: number;
  distance: number;
  angle: number;
  scale: number;
  rotation: number;
  velocity: number;
  duration: number;
}

/**
 * 响应式设计管理器类
 */
export class ResponsiveManager {
  private static instance: ResponsiveManager;
  private currentDevice: DeviceType = DeviceType.DESKTOP;
  private currentOrientation: ScreenOrientation = ScreenOrientation.PORTRAIT;
  private breakpoints: BreakpointConfig = {
    mobile: 768,
    tablet: 1024,
    desktop: 1200
  };
  
  // 触摸手势状态
  private gestureState = {
    isTracking: false,
    startTime: 0,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    initialDistance: 0,
    initialAngle: 0
  };
  
  // 事件监听器
  private listeners = new Map<string, Set<Function>>();
  
  // 性能统计
  private stats = {
    deviceDetections: 0,
    orientationChanges: 0,
    gestureEvents: 0,
    touchOptimizations: 0,
    layoutAdjustments: 0
  };

  private constructor() {
    this.detectDevice();
    this.detectOrientation();
    this.setupEventListeners();
    this.setupTouchOptimizations();
    this.injectResponsiveStyles();
  }

  static getInstance(): ResponsiveManager {
    if (!ResponsiveManager.instance) {
      ResponsiveManager.instance = new ResponsiveManager();
    }
    return ResponsiveManager.instance;
  }

  /**
   * 检测设备类型
   */
  private detectDevice(): void {
    const width = window.innerWidth;
    
    if (width < this.breakpoints.mobile) {
      this.currentDevice = DeviceType.MOBILE;
    } else if (width < this.breakpoints.tablet) {
      this.currentDevice = DeviceType.TABLET;
    } else {
      this.currentDevice = DeviceType.DESKTOP;
    }
    
    this.stats.deviceDetections++;
    console.log(`📱 设备检测: ${this.currentDevice}, 宽度: ${width}px`);
  }

  /**
   * 检测屏幕方向
   */
  private detectOrientation(): void {
    const orientation = window.innerHeight > window.innerWidth 
      ? ScreenOrientation.PORTRAIT 
      : ScreenOrientation.LANDSCAPE;
    
    if (orientation !== this.currentOrientation) {
      this.currentOrientation = orientation;
      this.stats.orientationChanges++;
      console.log(`🔄 屏幕方向: ${this.currentOrientation}`);
      this.emit('orientationchange', { orientation });
    }
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    // 窗口大小变化
    window.addEventListener('resize', () => {
      this.handleResize();
    });
    
    // 屏幕方向变化
    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        this.detectOrientation();
        this.handleOrientationChange();
      }, 100);
    });
    
    // 触摸事件
    document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
  }

  /**
   * 设置触摸优化
   */
  private setupTouchOptimizations(): void {
    // 禁用双击缩放
    document.addEventListener('touchstart', (e) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    });
    
    // 优化滚动性能
    document.addEventListener('touchmove', (e) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    }, { passive: false });
    
    // 添加触摸友好的CSS类
    document.body.classList.add('touch-optimized');
    
    this.stats.touchOptimizations++;
    console.log('👆 触摸优化已启用');
  }

  /**
   * 注入响应式样式
   */
  private injectResponsiveStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .touch-optimized {
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        -webkit-tap-highlight-color: transparent;
        touch-action: manipulation;
      }
      
      .responsive-container {
        width: 100%;
        max-width: 100vw;
        overflow-x: hidden;
      }
      
      .mobile-optimized {
        padding: 10px;
        font-size: 16px;
        line-height: 1.5;
      }
      
      .tablet-optimized {
        padding: 15px;
        font-size: 18px;
        line-height: 1.4;
      }
      
      .desktop-optimized {
        padding: 20px;
        font-size: 16px;
        line-height: 1.6;
      }
      
      .portrait-layout {
        flex-direction: column;
      }
      
      .landscape-layout {
        flex-direction: row;
      }
      
      @media (max-width: ${this.breakpoints.mobile}px) {
        .hide-mobile { display: none !important; }
        .show-mobile { display: block !important; }
        
        .game-board {
          width: 95vw !important;
          height: 95vw !important;
          max-width: 400px !important;
          max-height: 400px !important;
        }
        
        .game-tile {
          min-height: 40px !important;
          font-size: 20px !important;
        }
      }
      
      @media (min-width: ${this.breakpoints.mobile + 1}px) and (max-width: ${this.breakpoints.tablet}px) {
        .hide-tablet { display: none !important; }
        .show-tablet { display: block !important; }
        
        .game-board {
          width: 90vw !important;
          height: 90vw !important;
          max-width: 500px !important;
          max-height: 500px !important;
        }
      }
      
      @media (min-width: ${this.breakpoints.tablet + 1}px) {
        .hide-desktop { display: none !important; }
        .show-desktop { display: block !important; }
      }
      
      @media (orientation: portrait) {
        .portrait-only { display: block !important; }
        .landscape-only { display: none !important; }
      }
      
      @media (orientation: landscape) {
        .portrait-only { display: none !important; }
        .landscape-only { display: block !important; }
      }
      
      /* 高DPI屏幕优化 */
      @media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
        .high-dpi-optimized {
          image-rendering: -webkit-optimize-contrast;
          image-rendering: crisp-edges;
        }
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * 处理窗口大小变化
   */
  private handleResize(): void {
    performanceMonitor.startTimer('responsiveResize');
    
    const oldDevice = this.currentDevice;
    this.detectDevice();
    this.detectOrientation();
    
    if (oldDevice !== this.currentDevice) {
      this.emit('devicechange', { 
        oldDevice, 
        newDevice: this.currentDevice 
      });
      this.applyDeviceOptimizations();
    }
    
    this.stats.layoutAdjustments++;
    const duration = performanceMonitor.endTimer('responsiveResize');
    console.log(`📐 响应式调整完成, 耗时: ${duration.toFixed(2)}ms`);
  }

  /**
   * 处理屏幕方向变化
   */
  private handleOrientationChange(): void {
    this.applyOrientationOptimizations();
    this.emit('orientationchange', { 
      orientation: this.currentOrientation 
    });
  }

  /**
   * 应用设备优化
   */
  private applyDeviceOptimizations(): void {
    const body = document.body;
    
    // 移除旧的设备类
    body.classList.remove('mobile-optimized', 'tablet-optimized', 'desktop-optimized');
    
    // 添加新的设备类
    body.classList.add(`${this.currentDevice}-optimized`);
    
    // 设备特定优化
    switch (this.currentDevice) {
      case DeviceType.MOBILE:
        this.applyMobileOptimizations();
        break;
      case DeviceType.TABLET:
        this.applyTabletOptimizations();
        break;
      case DeviceType.DESKTOP:
        this.applyDesktopOptimizations();
        break;
    }
    
    console.log(`📱 设备优化已应用: ${this.currentDevice}`);
  }

  /**
   * 应用移动端优化 - 智能触摸目标尺寸
   */
  private applyMobileOptimizations(): void {
    // 调整视口
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      viewport.setAttribute('content',
        'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no'
      );
    }

    // 智能优化触摸目标大小
    this.optimizeTouchTargetSizes();
  }

  /**
   * 智能优化触摸目标尺寸
   */
  private optimizeTouchTargetSizes(): void {
    const devicePixelRatio = window.devicePixelRatio || 1;
    const screenWidth = window.screen.width;

    // 计算最佳触摸目标尺寸
    let minTouchSize = 44; // 基础尺寸 (Apple HIG标准)

    // 根据设备像素比调整
    if (devicePixelRatio >= 3) {
      minTouchSize = 48; // 高DPI设备需要更大的触摸目标
    } else if (devicePixelRatio >= 2) {
      minTouchSize = 46;
    }

    // 根据屏幕宽度调整
    if (screenWidth <= 320) {
      minTouchSize = Math.max(40, minTouchSize - 4); // 小屏设备适当减小
    } else if (screenWidth >= 414) {
      minTouchSize = Math.min(52, minTouchSize + 4); // 大屏设备适当增大
    }

    // 应用到游戏元素
    const gameElements = document.querySelectorAll('.game-tile, .button, .touch-target');
    gameElements.forEach(element => {
      const htmlElement = element as HTMLElement;
      htmlElement.style.minHeight = `${minTouchSize}px`;
      htmlElement.style.minWidth = `${minTouchSize}px`;

      // 添加触摸目标优化类
      htmlElement.classList.add('optimized-touch-target');
    });

    // 动态注入优化样式
    this.injectTouchTargetStyles(minTouchSize);

    console.log(`📱 触摸目标尺寸已优化: ${minTouchSize}px (DPR: ${devicePixelRatio}, 屏宽: ${screenWidth}px)`);
  }

  /**
   * 注入触摸目标优化样式
   */
  private injectTouchTargetStyles(minSize: number): void {
    const existingStyle = document.getElementById('touch-target-optimization');
    if (existingStyle) {
      existingStyle.remove();
    }

    const style = document.createElement('style');
    style.id = 'touch-target-optimization';
    style.textContent = `
      .optimized-touch-target {
        min-height: ${minSize}px !important;
        min-width: ${minSize}px !important;
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }

      /* 确保触摸区域足够大 */
      .optimized-touch-target::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        min-width: ${minSize}px;
        min-height: ${minSize}px;
        z-index: -1;
      }

      /* 高DPI屏幕优化 */
      @media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
        .optimized-touch-target {
          padding: 2px;
        }
      }

      @media (-webkit-min-device-pixel-ratio: 3), (min-resolution: 288dpi) {
        .optimized-touch-target {
          padding: 3px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  /**
   * 应用平板优化
   */
  private applyTabletOptimizations(): void {
    // 平板特定优化
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      viewport.setAttribute('content', 
        'width=device-width, initial-scale=1.0'
      );
    }
  }

  /**
   * 应用桌面端优化
   */
  private applyDesktopOptimizations(): void {
    // 桌面端特定优化
    document.body.style.cursor = 'default';
  }

  /**
   * 应用屏幕方向优化
   */
  private applyOrientationOptimizations(): void {
    const body = document.body;
    
    // 移除旧的方向类
    body.classList.remove('portrait-layout', 'landscape-layout');
    
    // 添加新的方向类
    body.classList.add(`${this.currentOrientation}-layout`);
  }

  /**
   * 处理触摸开始
   */
  private handleTouchStart(event: TouchEvent): void {
    if (event.touches.length === 1) {
      const touch = event.touches[0];
      this.gestureState.isTracking = true;
      this.gestureState.startTime = Date.now();
      this.gestureState.startX = touch.clientX;
      this.gestureState.startY = touch.clientY;
      this.gestureState.currentX = touch.clientX;
      this.gestureState.currentY = touch.clientY;
    } else if (event.touches.length === 2) {
      const touch1 = event.touches[0];
      const touch2 = event.touches[1];
      this.gestureState.initialDistance = this.calculateDistance(touch1, touch2);
      this.gestureState.initialAngle = this.calculateAngle(touch1, touch2);
    }
  }

  /**
   * 处理触摸移动
   */
  private handleTouchMove(event: TouchEvent): void {
    if (!this.gestureState.isTracking) return;
    
    if (event.touches.length === 1) {
      const touch = event.touches[0];
      this.gestureState.currentX = touch.clientX;
      this.gestureState.currentY = touch.clientY;
      
      const deltaX = this.gestureState.currentX - this.gestureState.startX;
      const deltaY = this.gestureState.currentY - this.gestureState.startY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      if (distance > 10) { // 最小滑动距离
        this.emitGestureEvent('pan', {
          deltaX,
          deltaY,
          distance
        });
      }
    }
  }

  /**
   * 处理触摸结束
   */
  private handleTouchEnd(_event: TouchEvent): void {
    if (!this.gestureState.isTracking) return;
    
    const duration = Date.now() - this.gestureState.startTime;
    const deltaX = this.gestureState.currentX - this.gestureState.startX;
    const deltaY = this.gestureState.currentY - this.gestureState.startY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const velocity = distance / duration;
    
    if (duration < 300 && distance < 10) {
      // 点击手势
      this.emitGestureEvent('tap', { duration, distance });
    } else if (distance > 50) {
      // 滑动手势
      this.emitGestureEvent('swipe', {
        deltaX,
        deltaY,
        distance,
        velocity,
        duration
      });
    }
    
    this.gestureState.isTracking = false;
  }

  /**
   * 发射手势事件
   */
  private emitGestureEvent(type: GestureType, data: Partial<GestureEvent>): void {
    const gestureEvent: GestureEvent = {
      type,
      startX: this.gestureState.startX,
      startY: this.gestureState.startY,
      currentX: this.gestureState.currentX,
      currentY: this.gestureState.currentY,
      deltaX: 0,
      deltaY: 0,
      distance: 0,
      angle: 0,
      scale: 1,
      rotation: 0,
      velocity: 0,
      duration: 0,
      ...data
    };
    
    this.emit('gesture', gestureEvent);
    this.stats.gestureEvents++;
  }

  /**
   * 计算两点距离
   */
  private calculateDistance(touch1: Touch, touch2: Touch): number {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * 计算两点角度
   */
  private calculateAngle(touch1: Touch, touch2: Touch): number {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.atan2(dy, dx) * 180 / Math.PI;
  }

  /**
   * 事件发射器
   */
  private emit(event: string, data: any): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach(listener => listener(data));
    }
  }

  /**
   * 添加事件监听器
   */
  on(event: string, listener: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
  }

  /**
   * 移除事件监听器
   */
  off(event: string, listener: Function): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  /**
   * 获取当前设备信息
   */
  getDeviceInfo() {
    return {
      device: this.currentDevice,
      orientation: this.currentOrientation,
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      pixelRatio: window.devicePixelRatio || 1,
      touchSupported: 'ontouchstart' in window,
      breakpoints: this.breakpoints
    };
  }

  /**
   * 获取性能统计
   */
  getStats() {
    return {
      ...this.stats,
      currentDevice: this.currentDevice,
      currentOrientation: this.currentOrientation,
      activeListeners: Array.from(this.listeners.keys()).length
    };
  }

  /**
   * 打印性能统计
   */
  printStats(): void {
    const stats = this.getStats();
    const deviceInfo = this.getDeviceInfo();
    
    console.group('📱 响应式管理器统计');
    console.log(`当前设备: ${stats.currentDevice}`);
    console.log(`屏幕方向: ${stats.currentOrientation}`);
    console.log(`屏幕尺寸: ${deviceInfo.screenWidth}x${deviceInfo.screenHeight}`);
    console.log(`像素比: ${deviceInfo.pixelRatio}`);
    console.log(`触摸支持: ${deviceInfo.touchSupported ? '✅' : '❌'}`);
    console.log(`设备检测次数: ${stats.deviceDetections}`);
    console.log(`方向变化次数: ${stats.orientationChanges}`);
    console.log(`手势事件数: ${stats.gestureEvents}`);
    console.log(`触摸优化数: ${stats.touchOptimizations}`);
    console.log(`布局调整数: ${stats.layoutAdjustments}`);
    console.log(`活跃监听器: ${stats.activeListeners}`);
    console.groupEnd();
  }
}

/**
 * 全局响应式管理器实例
 */
export const responsiveManager = ResponsiveManager.getInstance();

// 在开发环境中挂载到全局
if (import.meta.env.DEV) {
  (window as any).responsiveManager = responsiveManager;
  console.log('📱 响应式管理器已挂载到 window.responsiveManager');
}
