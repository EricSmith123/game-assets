/**
 * 触摸手势管理器
 * 处理移动端触摸手势，提供流畅的触摸交互体验
 */

import { Logger } from './logger';
import { environmentGuard } from './environmentGuard';

// 手势类型
export enum GestureType {
  TAP = 'tap',
  LONG_PRESS = 'longPress',
  SWIPE = 'swipe',
  PINCH = 'pinch'
}

// 手势事件
export interface GestureEvent {
  type: GestureType;
  target: HTMLElement;
  startPoint: { x: number; y: number };
  endPoint?: { x: number; y: number };
  direction?: 'up' | 'down' | 'left' | 'right';
  distance?: number;
  duration: number;
  scale?: number;
}

// 手势配置
interface GestureConfig {
  tapTimeout: number;
  longPressTimeout: number;
  swipeThreshold: number;
  pinchThreshold: number;
  preventDefault: boolean;
}

export class TouchGestureManager {
  private static instance: TouchGestureManager;
  private logger: Logger;
  private config: GestureConfig;
  private listeners = new Map<string, Set<(event: GestureEvent) => void>>();
  private activeTouch: Touch | null = null;
  private startTime = 0;
  private startPoint = { x: 0, y: 0 };
  private longPressTimer: number | null = null;
  private isLongPress = false;

  private constructor() {
    this.logger = Logger.getInstance();
    this.config = {
      tapTimeout: 300,
      longPressTimeout: 500,
      swipeThreshold: 50,
      pinchThreshold: 0.1,
      preventDefault: true
    };

    this.setupEventListeners();

    environmentGuard.runInDevelopment(() => {
      this.logger.debug('触摸手势管理器已初始化', undefined, 'TouchGestureManager');
    });
  }

  static getInstance(): TouchGestureManager {
    if (!TouchGestureManager.instance) {
      TouchGestureManager.instance = new TouchGestureManager();
    }
    return TouchGestureManager.instance;
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    // 检查是否支持触摸
    if (!('ontouchstart' in window)) {
      this.logger.warn('设备不支持触摸事件', undefined, 'TouchGestureManager');
      return;
    }

    document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
    document.addEventListener('touchcancel', this.handleTouchCancel.bind(this), { passive: false });
  }

  /**
   * 处理触摸开始
   */
  private handleTouchStart(event: TouchEvent): void {
    if (event.touches.length === 1) {
      this.activeTouch = event.touches[0];
      this.startTime = Date.now();
      this.startPoint = {
        x: this.activeTouch.clientX,
        y: this.activeTouch.clientY
      };
      this.isLongPress = false;

      // 设置长按定时器
      this.longPressTimer = window.setTimeout(() => {
        this.isLongPress = true;
        this.triggerGesture({
          type: GestureType.LONG_PRESS,
          target: event.target as HTMLElement,
          startPoint: this.startPoint,
          duration: Date.now() - this.startTime
        });
      }, this.config.longPressTimeout);

      if (this.config.preventDefault) {
        event.preventDefault();
      }
    }
  }

  /**
   * 处理触摸移动
   */
  private handleTouchMove(event: TouchEvent): void {
    if (!this.activeTouch || event.touches.length !== 1) return;

    const currentTouch = event.touches[0];
    const deltaX = currentTouch.clientX - this.startPoint.x;
    const deltaY = currentTouch.clientY - this.startPoint.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // 如果移动距离超过阈值，取消长按
    if (distance > this.config.swipeThreshold && this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }

    if (this.config.preventDefault) {
      event.preventDefault();
    }
  }

  /**
   * 处理触摸结束
   */
  private handleTouchEnd(event: TouchEvent): void {
    if (!this.activeTouch) return;

    const endTime = Date.now();
    const duration = endTime - this.startTime;
    const endPoint = {
      x: this.activeTouch.clientX,
      y: this.activeTouch.clientY
    };

    // 清除长按定时器
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }

    // 如果不是长按，检查是否为点击或滑动
    if (!this.isLongPress) {
      const deltaX = endPoint.x - this.startPoint.x;
      const deltaY = endPoint.y - this.startPoint.y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      if (distance < this.config.swipeThreshold && duration < this.config.tapTimeout) {
        // 点击手势
        this.triggerGesture({
          type: GestureType.TAP,
          target: event.target as HTMLElement,
          startPoint: this.startPoint,
          endPoint,
          duration
        });
      } else if (distance >= this.config.swipeThreshold) {
        // 滑动手势
        const direction = this.getSwipeDirection(deltaX, deltaY);
        this.triggerGesture({
          type: GestureType.SWIPE,
          target: event.target as HTMLElement,
          startPoint: this.startPoint,
          endPoint,
          direction,
          distance,
          duration
        });
      }
    }

    this.activeTouch = null;
    this.isLongPress = false;

    if (this.config.preventDefault) {
      event.preventDefault();
    }
  }

  /**
   * 处理触摸取消
   */
  private handleTouchCancel(event: TouchEvent): void {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
    this.activeTouch = null;
    this.isLongPress = false;
  }

  /**
   * 获取滑动方向
   */
  private getSwipeDirection(deltaX: number, deltaY: number): 'up' | 'down' | 'left' | 'right' {
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      return deltaX > 0 ? 'right' : 'left';
    } else {
      return deltaY > 0 ? 'down' : 'up';
    }
  }

  /**
   * 触发手势事件
   */
  private triggerGesture(gestureEvent: GestureEvent): void {
    const listeners = this.listeners.get(gestureEvent.type);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(gestureEvent);
        } catch (error) {
          this.logger.error(`手势事件处理错误: ${gestureEvent.type}`, error, 'TouchGestureManager');
        }
      });
    }

    this.logger.debug(`手势事件触发: ${gestureEvent.type}`, {
      target: gestureEvent.target.tagName,
      duration: gestureEvent.duration,
      direction: gestureEvent.direction
    }, 'TouchGestureManager');
  }

  /**
   * 添加手势监听器
   */
  addEventListener(type: GestureType, listener: (event: GestureEvent) => void): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    
    this.listeners.get(type)!.add(listener);

    // 返回移除监听器的函数
    return () => {
      this.listeners.get(type)?.delete(listener);
    };
  }

  /**
   * 移除手势监听器
   */
  removeEventListener(type: GestureType, listener: (event: GestureEvent) => void): void {
    this.listeners.get(type)?.delete(listener);
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<GestureConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.logger.debug('手势配置已更新', this.config, 'TouchGestureManager');
  }

  /**
   * 启用震动反馈
   */
  vibrate(pattern: number | number[] = 50): void {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  }

  /**
   * 检查触摸支持
   */
  isTouchSupported(): boolean {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  /**
   * 销毁管理器
   */
  destroy(): void {
    document.removeEventListener('touchstart', this.handleTouchStart.bind(this));
    document.removeEventListener('touchmove', this.handleTouchMove.bind(this));
    document.removeEventListener('touchend', this.handleTouchEnd.bind(this));
    document.removeEventListener('touchcancel', this.handleTouchCancel.bind(this));

    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
    }

    this.listeners.clear();
    this.logger.info('触摸手势管理器已销毁', undefined, 'TouchGestureManager');
  }
}

// 创建全局实例
export const touchGestureManager = TouchGestureManager.getInstance();

// 在开发环境中挂载到全局
environmentGuard.runInDevelopment(() => {
  (window as any).touchGestureManager = touchGestureManager;
  console.log('📱 触摸手势管理器已挂载到 window.touchGestureManager');
});
