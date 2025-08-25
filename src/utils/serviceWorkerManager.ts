/**
 * Service Worker管理器
 * 提供Service Worker注册、通信、缓存管理等功能
 */

import { performanceMonitor } from './performanceMonitor';

/**
 * Service Worker统计接口
 */
export interface ServiceWorkerStats {
  requests: number;
  cacheHits: number;
  networkHits: number;
  errors: number;
  averageResponseTime: number;
  cacheHitRate: number;
}

/**
 * 缓存更新配置接口
 */
export interface CacheUpdateConfig {
  urls: string[];
  force?: boolean;
  priority?: 'high' | 'normal' | 'low';
}

/**
 * Service Worker管理器类
 */
export class ServiceWorkerManager {
  private static instance: ServiceWorkerManager;
  private registration: ServiceWorkerRegistration | null = null;
  private isSupported: boolean = false;
  private isRegistered: boolean = false;
  private messageChannel: MessageChannel | null = null;
  
  // 性能统计
  private stats: ServiceWorkerStats = {
    requests: 0,
    cacheHits: 0,
    networkHits: 0,
    errors: 0,
    averageResponseTime: 0,
    cacheHitRate: 0
  };

  private constructor() {
    this.checkSupport();
  }

  static getInstance(): ServiceWorkerManager {
    if (!ServiceWorkerManager.instance) {
      ServiceWorkerManager.instance = new ServiceWorkerManager();
    }
    return ServiceWorkerManager.instance;
  }

  /**
   * 检查Service Worker支持
   */
  private checkSupport(): void {
    this.isSupported = 'serviceWorker' in navigator;
    
    if (!this.isSupported) {
      console.warn('⚠️ Service Worker不支持');
    }
  }

  /**
   * 注册Service Worker
   */
  async register(): Promise<boolean> {
    if (!this.isSupported) {
      console.warn('⚠️ Service Worker不支持，跳过注册');
      return false;
    }

    try {
      performanceMonitor.startTimer('serviceWorkerRegistration');
      
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      
      const duration = performanceMonitor.endTimer('serviceWorkerRegistration');
      
      console.log(`✅ Service Worker注册成功, 耗时: ${duration.toFixed(2)}ms`);
      console.log('📍 作用域:', this.registration.scope);
      
      this.isRegistered = true;
      this.setupEventListeners();
      this.setupMessageChannel();
      
      return true;
    } catch (error) {
      console.error('❌ Service Worker注册失败:', error);
      return false;
    }
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    if (!this.registration) return;

    // 监听Service Worker状态变化
    this.registration.addEventListener('updatefound', () => {
      console.log('🔄 发现Service Worker更新');
      
      const newWorker = this.registration!.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          console.log('🔄 Service Worker状态:', newWorker.state);
          
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('✅ Service Worker更新完成');
            this.onServiceWorkerUpdated();
          }
        });
      }
    });

    // 监听Service Worker消息
    navigator.serviceWorker.addEventListener('message', event => {
      this.handleServiceWorkerMessage(event);
    });

    // 监听控制器变化
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('🔄 Service Worker控制器已变化');
      window.location.reload();
    });
  }

  /**
   * 设置消息通道
   */
  private setupMessageChannel(): void {
    this.messageChannel = new MessageChannel();
    
    this.messageChannel.port1.onmessage = (event) => {
      this.handleServiceWorkerResponse(event);
    };
  }

  /**
   * Service Worker更新处理
   */
  private onServiceWorkerUpdated(): void {
    // 可以在这里显示更新提示
    console.log('🎉 应用已更新，刷新页面以获取最新版本');
    
    // 自动刷新页面（可选）
    if (confirm('发现新版本，是否立即刷新页面？')) {
      window.location.reload();
    }
  }

  /**
   * 处理Service Worker消息
   */
  private handleServiceWorkerMessage(event: MessageEvent): void {
    const { type, data } = event.data;
    
    switch (type) {
      case 'CACHE_UPDATED':
        console.log('📦 缓存已更新');
        break;
      case 'OFFLINE_READY':
        console.log('🔌 离线模式已准备就绪');
        break;
      case 'ERROR':
        console.error('❌ Service Worker错误:', data);
        break;
    }
  }

  /**
   * 处理Service Worker响应
   */
  private handleServiceWorkerResponse(event: MessageEvent): void {
    const { type, data } = event.data;
    
    switch (type) {
      case 'STATS_RESPONSE':
        this.stats = data;
        break;
      case 'CACHE_CLEARED':
        console.log('🧹 缓存已清理');
        break;
      case 'CACHE_UPDATED':
        console.log('📦 缓存已更新');
        break;
    }
  }

  /**
   * 发送消息给Service Worker
   */
  private async sendMessage(message: any): Promise<any> {
    if (!this.isRegistered || !this.messageChannel) {
      throw new Error('Service Worker未注册或消息通道未建立');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Service Worker消息超时'));
      }, 5000);

      this.messageChannel!.port1.onmessage = (event) => {
        clearTimeout(timeout);
        resolve(event.data);
      };

      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage(message, [this.messageChannel!.port2]);
      } else {
        reject(new Error('Service Worker控制器不可用'));
      }
    });
  }

  /**
   * 获取Service Worker统计信息
   */
  async getStats(): Promise<ServiceWorkerStats> {
    try {
      const response = await this.sendMessage({ type: 'GET_STATS' });
      if (response.type === 'STATS_RESPONSE') {
        this.stats = response.data;
      }
    } catch (error) {
      console.warn('⚠️ 获取Service Worker统计失败:', error);
    }
    
    return this.stats;
  }

  /**
   * 清理所有缓存
   */
  async clearCache(): Promise<boolean> {
    try {
      const response = await this.sendMessage({ type: 'CLEAR_CACHE' });
      return response.type === 'CACHE_CLEARED' && response.data.success;
    } catch (error) {
      console.error('❌ 清理缓存失败:', error);
      return false;
    }
  }

  /**
   * 更新缓存
   */
  async updateCache(config: CacheUpdateConfig): Promise<boolean> {
    try {
      const response = await this.sendMessage({ 
        type: 'UPDATE_CACHE', 
        data: config 
      });
      return response.type === 'CACHE_UPDATED' && response.data.success;
    } catch (error) {
      console.error('❌ 更新缓存失败:', error);
      return false;
    }
  }

  /**
   * 预缓存资源
   */
  async precacheResources(urls: string[]): Promise<boolean> {
    console.log(`📦 预缓存资源: ${urls.length}个URL`);
    
    return this.updateCache({
      urls,
      force: true,
      priority: 'high'
    });
  }

  /**
   * 检查Service Worker状态
   */
  getStatus() {
    return {
      supported: this.isSupported,
      registered: this.isRegistered,
      active: this.registration?.active !== null,
      scope: this.registration?.scope,
      state: this.registration?.active?.state
    };
  }

  /**
   * 手动检查更新
   */
  async checkForUpdates(): Promise<boolean> {
    if (!this.registration) {
      console.warn('⚠️ Service Worker未注册');
      return false;
    }

    try {
      const registration = await this.registration.update();
      console.log('🔄 检查Service Worker更新完成');
      return registration.installing !== null;
    } catch (error) {
      console.error('❌ 检查Service Worker更新失败:', error);
      return false;
    }
  }

  /**
   * 卸载Service Worker
   */
  async unregister(): Promise<boolean> {
    if (!this.registration) {
      console.warn('⚠️ Service Worker未注册');
      return false;
    }

    try {
      const success = await this.registration.unregister();
      if (success) {
        console.log('✅ Service Worker已卸载');
        this.registration = null;
        this.isRegistered = false;
      }
      return success;
    } catch (error) {
      console.error('❌ Service Worker卸载失败:', error);
      return false;
    }
  }

  /**
   * 获取缓存大小
   */
  async getCacheSize(): Promise<number> {
    if (!('storage' in navigator) || !('estimate' in navigator.storage)) {
      return 0;
    }

    try {
      const estimate = await navigator.storage.estimate();
      return estimate.usage || 0;
    } catch (error) {
      console.warn('⚠️ 获取缓存大小失败:', error);
      return 0;
    }
  }

  /**
   * 打印Service Worker统计
   */
  async printStats(): Promise<void> {
    const stats = await this.getStats();
    const status = this.getStatus();
    const cacheSize = await this.getCacheSize();
    
    console.group('🔧 Service Worker统计');
    console.log(`支持状态: ${status.supported ? '✅' : '❌'}`);
    console.log(`注册状态: ${status.registered ? '✅' : '❌'}`);
    console.log(`激活状态: ${status.active ? '✅' : '❌'}`);
    console.log(`作用域: ${status.scope || 'N/A'}`);
    console.log(`状态: ${status.state || 'N/A'}`);
    console.log(`总请求数: ${stats.requests}`);
    console.log(`缓存命中: ${stats.cacheHits}`);
    console.log(`网络命中: ${stats.networkHits}`);
    console.log(`错误数: ${stats.errors}`);
    console.log(`缓存命中率: ${stats.cacheHitRate.toFixed(1)}%`);
    console.log(`平均响应时间: ${stats.averageResponseTime.toFixed(2)}ms`);
    console.log(`缓存大小: ${(cacheSize / 1024 / 1024).toFixed(2)}MB`);
    console.groupEnd();
  }
}

/**
 * 全局Service Worker管理器实例
 */
export const serviceWorkerManager = ServiceWorkerManager.getInstance();

// 在开发环境中挂载到全局
if (import.meta.env.DEV) {
  (window as any).serviceWorkerManager = serviceWorkerManager;
  console.log('🔧 Service Worker管理器已挂载到 window.serviceWorkerManager');
}
