/**
 * 智能资源预加载管理器
 * 根据用户行为和游戏状态智能预加载资源，避免预加载警告
 */

import { configManager } from './configManager';
import { environmentGuard } from './environmentGuard';
import { Logger } from './logger';

// 资源类型
export enum ResourceType {
  IMAGE = 'image',
  AUDIO = 'audio',
  FONT = 'font',
  SCRIPT = 'script',
  STYLE = 'style'
}

// 预加载策略
export enum PreloadStrategy {
  IMMEDIATE = 'immediate',    // 立即预加载
  ON_INTERACTION = 'on_interaction', // 用户交互时预加载
  ON_DEMAND = 'on_demand',    // 按需预加载
  LAZY = 'lazy'               // 懒加载
}

// 资源配置
interface ResourceConfig {
  url: string;
  type: ResourceType;
  strategy: PreloadStrategy;
  priority: number; // 1-5, 5最高
  condition?: () => boolean; // 预加载条件
  timeout?: number; // 预加载超时时间
  retries?: number; // 重试次数
}

// 预加载状态
enum PreloadStatus {
  PENDING = 'pending',
  LOADING = 'loading',
  LOADED = 'loaded',
  ERROR = 'error',
  CANCELLED = 'cancelled'
}

interface ResourceState {
  config: ResourceConfig;
  status: PreloadStatus;
  element?: HTMLElement;
  loadTime?: number;
  error?: Error;
  retryCount: number;
}

export class SmartResourcePreloader {
  private static instance: SmartResourcePreloader;
  private logger: Logger;
  private resources = new Map<string, ResourceState>();
  private loadQueue: string[] = [];
  private isProcessingQueue = false;
  private userInteracted = false;
  private gameStarted = false;
  private maxConcurrentLoads = 3;
  private currentLoads = 0;

  private constructor() {
    this.logger = Logger.getInstance();
    this.initializeResourceConfigs();
    this.setupEventListeners();

    environmentGuard.runInDevelopment(() => {
      this.logger.debug('智能资源预加载管理器已初始化', {
        resourceCount: this.resources.size
      }, 'SmartResourcePreloader');
    });
  }

  static getInstance(): SmartResourcePreloader {
    if (!SmartResourcePreloader.instance) {
      SmartResourcePreloader.instance = new SmartResourcePreloader();
    }
    return SmartResourcePreloader.instance;
  }

  /**
   * 初始化资源配置
   */
  private initializeResourceConfigs(): void {
    // 游戏方块图片 - 用户交互时预加载
    for (let i = 1; i <= 6; i++) {
      this.resources.set(`tile-${i}`, {
        config: {
          url: `/tiles/tile-${i}.webp`,
          type: ResourceType.IMAGE,
          strategy: PreloadStrategy.ON_INTERACTION,
          priority: 4,
          condition: () => this.userInteracted,
          timeout: 5000,
          retries: 2
        },
        status: PreloadStatus.PENDING,
        retryCount: 0
      });
    }

    // 音频文件 - 游戏开始时预加载
    // 注意：音频路径将在运行时通过updateAudioPaths方法更新
    const audioFiles = ['match', 'swap', 'error', 'fall'];
    audioFiles.forEach(name => {
      this.resources.set(`audio-${name}`, {
        config: {
          url: `/audio/sfx/${name}.mp3`, // 临时路径，将在运行时更新
          type: ResourceType.AUDIO,
          strategy: PreloadStrategy.ON_DEMAND,
          priority: 3,
          condition: () => this.gameStarted && configManager.get('audio').enableSfx,
          timeout: 3000,
          retries: 1
        },
        status: PreloadStatus.PENDING,
        retryCount: 0
      });
    });

    // 背景音乐 - 懒加载
    this.resources.set('bgm-main', {
      config: {
        url: '/audio/bgm/bgm_1.mp3', // 临时路径，将在运行时更新
        type: ResourceType.AUDIO,
        strategy: PreloadStrategy.LAZY,
        priority: 2,
        condition: () => configManager.get('audio').enableBgm,
        timeout: 10000,
        retries: 1
      },
      status: PreloadStatus.PENDING,
      retryCount: 0
    });

    // 字体 - 立即预加载
    this.resources.set('game-font', {
      config: {
        url: '/fonts/game-font.woff2',
        type: ResourceType.FONT,
        strategy: PreloadStrategy.IMMEDIATE,
        priority: 5,
        timeout: 2000,
        retries: 1
      },
      status: PreloadStatus.PENDING,
      retryCount: 0
    });
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    // 用户首次交互
    const handleFirstInteraction = () => {
      this.userInteracted = true;
      this.processPreloadQueue();
      
      // 移除监听器
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('touchstart', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
    };

    document.addEventListener('click', handleFirstInteraction, { passive: true });
    document.addEventListener('touchstart', handleFirstInteraction, { passive: true });
    document.addEventListener('keydown', handleFirstInteraction, { passive: true });

    // 页面可见性变化
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pausePreloading();
      } else {
        this.resumePreloading();
      }
    });

    // 网络状态变化
    if ('connection' in navigator) {
      (navigator as any).connection.addEventListener('change', () => {
        this.adjustPreloadingStrategy();
      });
    }
  }

  /**
   * 开始预加载
   */
  startPreloading(): void {
    // 立即预加载高优先级资源
    this.preloadByStrategy(PreloadStrategy.IMMEDIATE);
    
    // 如果用户已交互，预加载交互相关资源
    if (this.userInteracted) {
      this.preloadByStrategy(PreloadStrategy.ON_INTERACTION);
    }

    this.logger.info('智能资源预加载已启动', {
      totalResources: this.resources.size,
      userInteracted: this.userInteracted
    }, 'SmartResourcePreloader');
  }

  /**
   * 更新音频资源路径
   */
  updateAudioPaths(sfxMap: Record<string, string>, bgmList: Array<{id: number, name: string, src: string}>): void {
    console.log('🔄 更新智能预加载器的音频路径...');

    // 更新音效路径
    Object.entries(sfxMap).forEach(([name, url]) => {
      const resourceKey = `audio-${name}`;
      const resource = this.resources.get(resourceKey);
      if (resource) {
        resource.config.url = url;
        console.log(`🔄 更新音效路径: ${name} -> ${url}`);
      }
    });

    // 更新BGM路径
    if (bgmList.length > 0) {
      const bgmResource = this.resources.get('bgm-main');
      if (bgmResource && bgmList[0]) {
        bgmResource.config.url = bgmList[0].src;
        console.log(`🔄 更新BGM路径: ${bgmList[0].name} -> ${bgmList[0].src}`);
      }
    }

    console.log('✅ 智能预加载器音频路径更新完成');
  }

  /**
   * 通知游戏开始
   */
  notifyGameStarted(): void {
    this.gameStarted = true;
    this.preloadByStrategy(PreloadStrategy.ON_DEMAND);

    this.logger.info('游戏已开始，触发按需预加载', undefined, 'SmartResourcePreloader');
  }

  /**
   * 按策略预加载
   */
  private preloadByStrategy(strategy: PreloadStrategy): void {
    const resources = Array.from(this.resources.entries())
      .filter(([_, state]) => 
        state.config.strategy === strategy && 
        state.status === PreloadStatus.PENDING &&
        (!state.config.condition || state.config.condition())
      )
      .sort(([_, a], [__, b]) => b.config.priority - a.config.priority);

    for (const [resourceId] of resources) {
      this.queueResource(resourceId);
    }

    this.processPreloadQueue();
  }

  /**
   * 队列资源
   */
  private queueResource(resourceId: string): void {
    if (!this.loadQueue.includes(resourceId)) {
      this.loadQueue.push(resourceId);
    }
  }

  /**
   * 处理预加载队列
   */
  private async processPreloadQueue(): Promise<void> {
    if (this.isProcessingQueue) return;

    this.isProcessingQueue = true;

    while (this.loadQueue.length > 0 && this.currentLoads < this.maxConcurrentLoads) {
      const resourceId = this.loadQueue.shift();
      if (resourceId) {
        this.loadResource(resourceId);
      }
    }

    this.isProcessingQueue = false;
  }

  /**
   * 加载资源
   */
  private async loadResource(resourceId: string): Promise<void> {
    const state = this.resources.get(resourceId);
    if (!state || state.status !== PreloadStatus.PENDING) return;

    this.currentLoads++;
    state.status = PreloadStatus.LOADING;
    const startTime = performance.now();

    try {
      const element = await this.createResourceElement(state.config);
      
      state.element = element;
      state.status = PreloadStatus.LOADED;
      state.loadTime = performance.now() - startTime;

      this.logger.debug(`资源预加载成功: ${resourceId}`, {
        loadTime: `${state.loadTime.toFixed(2)}ms`,
        type: state.config.type
      }, 'SmartResourcePreloader');

    } catch (error) {
      state.error = error as Error;
      state.retryCount++;

      if (state.retryCount < (state.config.retries || 0)) {
        // 重试
        state.status = PreloadStatus.PENDING;
        setTimeout(() => {
          this.queueResource(resourceId);
          this.processPreloadQueue();
        }, 1000 * state.retryCount);
      } else {
        state.status = PreloadStatus.ERROR;
        this.logger.warn(`资源预加载失败: ${resourceId}`, error, 'SmartResourcePreloader');
      }
    } finally {
      this.currentLoads--;
      this.processPreloadQueue();
    }
  }

  /**
   * 创建资源元素
   */
  private createResourceElement(config: ResourceConfig): Promise<HTMLElement> {
    return new Promise((resolve, reject) => {
      let element: HTMLElement;
      const timeout = setTimeout(() => {
        reject(new Error(`资源加载超时: ${config.url}`));
      }, config.timeout || 5000);

      const cleanup = () => {
        clearTimeout(timeout);
      };

      switch (config.type) {
        case ResourceType.IMAGE:
          element = new Image();
          element.onload = () => {
            cleanup();
            resolve(element);
          };
          element.onerror = () => {
            cleanup();
            reject(new Error(`图片加载失败: ${config.url}`));
          };
          (element as HTMLImageElement).src = config.url;
          break;

        case ResourceType.AUDIO:
          element = new Audio();
          element.addEventListener('canplaythrough', () => {
            cleanup();
            resolve(element);
          });
          element.onerror = () => {
            cleanup();
            reject(new Error(`音频加载失败: ${config.url}`));
          };
          (element as HTMLAudioElement).src = config.url;
          (element as HTMLAudioElement).preload = 'auto';
          break;

        case ResourceType.FONT:
          // 使用FontFace API
          if ('FontFace' in window) {
            fetch(config.url)
              .then(response => response.arrayBuffer())
              .then(buffer => {
                const fontFace = new FontFace('GameFont', buffer);
                return fontFace.load();
              })
              .then(loadedFace => {
                document.fonts.add(loadedFace);
                cleanup();
                resolve(document.createElement('div')); // 返回占位元素
              })
              .catch(error => {
                cleanup();
                reject(error);
              });
          } else {
            // 降级方案
            element = document.createElement('link');
            (element as HTMLLinkElement).rel = 'preload';
            (element as HTMLLinkElement).as = 'font';
            (element as HTMLLinkElement).href = config.url;
            (element as HTMLLinkElement).crossOrigin = 'anonymous';
            
            element.onload = () => {
              cleanup();
              resolve(element);
            };
            element.onerror = () => {
              cleanup();
              reject(new Error(`字体加载失败: ${config.url}`));
            };
            
            document.head.appendChild(element);
          }
          break;

        default:
          reject(new Error(`不支持的资源类型: ${config.type}`));
      }
    });
  }

  /**
   * 调整预加载策略 - 移动端优化版本
   */
  private adjustPreloadingStrategy(): void {
    const connection = (navigator as any).connection;
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (!connection) {
      // 无网络信息时的保守策略
      this.maxConcurrentLoads = isMobile ? 1 : 3;
      return;
    }

    // 移动端专用的网络适配策略
    if (isMobile) {
      this.adjustMobilePreloadingStrategy(connection);
    } else {
      this.adjustDesktopPreloadingStrategy(connection);
    }

    this.logger.debug('预加载策略已调整', {
      isMobile,
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt,
      saveData: connection.saveData,
      maxConcurrentLoads: this.maxConcurrentLoads
    }, 'SmartResourcePreloader');
  }

  /**
   * 移动端预加载策略调整
   */
  private adjustMobilePreloadingStrategy(connection: any): void {
    // 考虑移动端的特殊情况
    const { effectiveType, downlink, rtt, saveData } = connection;

    // 省流量模式下更保守
    if (saveData) {
      this.maxConcurrentLoads = 1;
      return;
    }

    // 基于网络质量和延迟调整
    if (effectiveType === '4g' && downlink > 5 && rtt < 100) {
      this.maxConcurrentLoads = 4; // 高质量4G网络
    } else if (effectiveType === '4g' && downlink > 2) {
      this.maxConcurrentLoads = 3; // 普通4G网络
    } else if (effectiveType === '3g' && rtt < 300) {
      this.maxConcurrentLoads = 2; // 较好的3G网络
    } else {
      this.maxConcurrentLoads = 1; // 慢速网络
    }

    // 移动端额外限制：避免过度消耗电池和流量
    this.maxConcurrentLoads = Math.min(this.maxConcurrentLoads, 3);
  }

  /**
   * 桌面端预加载策略调整
   */
  private adjustDesktopPreloadingStrategy(connection: any): void {
    const { effectiveType, downlink } = connection;

    if (effectiveType === '4g' || downlink > 10) {
      this.maxConcurrentLoads = 6; // 高速网络
    } else if (effectiveType === '3g' || downlink > 1) {
      this.maxConcurrentLoads = 3; // 中速网络
    } else {
      this.maxConcurrentLoads = 2; // 慢速网络
    }
  }

  /**
   * 暂停预加载
   */
  private pausePreloading(): void {
    // 取消正在进行的加载
    this.resources.forEach((state, resourceId) => {
      if (state.status === PreloadStatus.LOADING) {
        state.status = PreloadStatus.CANCELLED;
      }
    });

    this.currentLoads = 0;
    this.logger.debug('预加载已暂停', undefined, 'SmartResourcePreloader');
  }

  /**
   * 恢复预加载
   */
  private resumePreloading(): void {
    // 重新排队被取消的资源
    this.resources.forEach((state, resourceId) => {
      if (state.status === PreloadStatus.CANCELLED) {
        state.status = PreloadStatus.PENDING;
        this.queueResource(resourceId);
      }
    });

    this.processPreloadQueue();
    this.logger.debug('预加载已恢复', undefined, 'SmartResourcePreloader');
  }

  /**
   * 获取资源
   */
  getResource(resourceId: string): HTMLElement | null {
    const state = this.resources.get(resourceId);
    return state?.element || null;
  }

  /**
   * 检查资源是否已加载
   */
  isResourceLoaded(resourceId: string): boolean {
    const state = this.resources.get(resourceId);
    return state?.status === PreloadStatus.LOADED;
  }

  /**
   * 获取预加载统计
   */
  getPreloadStats(): {
    total: number;
    loaded: number;
    loading: number;
    error: number;
    pending: number;
  } {
    const stats = {
      total: this.resources.size,
      loaded: 0,
      loading: 0,
      error: 0,
      pending: 0
    };

    this.resources.forEach(state => {
      switch (state.status) {
        case PreloadStatus.LOADED:
          stats.loaded++;
          break;
        case PreloadStatus.LOADING:
          stats.loading++;
          break;
        case PreloadStatus.ERROR:
          stats.error++;
          break;
        case PreloadStatus.PENDING:
          stats.pending++;
          break;
      }
    });

    return stats;
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    this.resources.forEach((state, resourceId) => {
      if (state.element && state.element.parentNode) {
        state.element.parentNode.removeChild(state.element);
      }
    });

    this.resources.clear();
    this.loadQueue = [];
    this.currentLoads = 0;

    this.logger.info('资源预加载器已清理', undefined, 'SmartResourcePreloader');
  }
}

// 创建全局实例
export const smartResourcePreloader = SmartResourcePreloader.getInstance();

// 在开发环境中挂载到全局
environmentGuard.runInDevelopment(() => {
  (window as any).smartResourcePreloader = smartResourcePreloader;
  console.log('🎯 智能资源预加载管理器已挂载到 window.smartResourcePreloader');
});
