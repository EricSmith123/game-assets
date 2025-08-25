/**
 * 资源预加载系统
 * 支持音频、图片资源的智能预加载和并发控制
 */

import { performanceMonitor } from './performanceMonitor';

/**
 * 资源类型枚举
 */
export enum ResourceType {
  AUDIO = 'audio',
  IMAGE = 'image',
  VIDEO = 'video',
  JSON = 'json'
}

/**
 * 资源优先级枚举
 */
export enum ResourcePriority {
  CRITICAL = 'critical',  // 关键资源，立即加载
  HIGH = 'high',         // 高优先级，优先加载
  NORMAL = 'normal',     // 普通优先级
  LOW = 'low'           // 低优先级，后台加载
}

/**
 * 资源配置接口
 */
export interface ResourceConfig {
  url: string;
  type: ResourceType;
  priority: ResourcePriority;
  timeout?: number;
  retries?: number;
  metadata?: Record<string, any>;
}

/**
 * 加载结果接口
 */
export interface LoadResult {
  url: string;
  success: boolean;
  data?: any;
  error?: string;
  loadTime: number;
  fromCache: boolean;
  size?: number;
  metadata?: Record<string, any>;
}

/**
 * 加载进度接口
 */
export interface LoadProgress {
  total: number;
  loaded: number;
  failed: number;
  progress: number;
  currentResource?: string;
}

/**
 * 资源预加载器类
 */
export class ResourcePreloader {
  private static instance: ResourcePreloader;
  private loadQueue: ResourceConfig[] = [];
  private loadingResources = new Set<string>();
  private loadedResources = new Map<string, LoadResult>();
  private failedResources = new Map<string, string>();
  
  // 配置参数
  private maxConcurrent: number = 6; // 最大并发数
  private defaultTimeout: number = 10000; // 默认超时时间
  private defaultRetries: number = 3; // 默认重试次数
  
  // 统计信息
  private stats = {
    totalRequests: 0,
    successfulLoads: 0,
    failedLoads: 0,
    cacheHits: 0,
    totalLoadTime: 0,
    totalDataSize: 0
  };

  private constructor() {}

  static getInstance(): ResourcePreloader {
    if (!ResourcePreloader.instance) {
      ResourcePreloader.instance = new ResourcePreloader();
    }
    return ResourcePreloader.instance;
  }

  /**
   * 添加资源到预加载队列
   */
  addResource(config: ResourceConfig): void {
    // 避免重复添加
    if (this.loadQueue.some(item => item.url === config.url) || 
        this.loadedResources.has(config.url)) {
      return;
    }

    this.loadQueue.push({
      timeout: this.defaultTimeout,
      retries: this.defaultRetries,
      ...config
    });

    // 按优先级排序
    this.sortQueueByPriority();
  }

  /**
   * 批量添加资源
   */
  addResources(configs: ResourceConfig[]): void {
    configs.forEach(config => this.addResource(config));
  }

  /**
   * 按优先级排序队列
   */
  private sortQueueByPriority(): void {
    const priorityOrder = {
      [ResourcePriority.CRITICAL]: 0,
      [ResourcePriority.HIGH]: 1,
      [ResourcePriority.NORMAL]: 2,
      [ResourcePriority.LOW]: 3
    };

    this.loadQueue.sort((a, b) => 
      priorityOrder[a.priority] - priorityOrder[b.priority]
    );
  }

  /**
   * 开始预加载
   */
  async preload(
    onProgress?: (progress: LoadProgress) => void,
    onResourceLoaded?: (result: LoadResult) => void
  ): Promise<LoadResult[]> {
    console.log(`🚀 开始预加载 ${this.loadQueue.length} 个资源...`);
    
    performanceMonitor.startTimer('resourcePreload');
    
    const results: LoadResult[] = [];
    const total = this.loadQueue.length;
    let loaded = 0;
    let failed = 0;

    // 更新进度
    const updateProgress = (currentResource?: string) => {
      const progress: LoadProgress = {
        total,
        loaded,
        failed,
        progress: total > 0 ? ((loaded + failed) / total) * 100 : 100,
        currentResource
      };
      onProgress?.(progress);
    };

    // 初始进度
    updateProgress();

    // 并发加载控制
    const loadPromises: Promise<void>[] = [];
    
    while (this.loadQueue.length > 0 || loadPromises.length > 0) {
      // 启动新的加载任务
      while (loadPromises.length < this.maxConcurrent && this.loadQueue.length > 0) {
        const config = this.loadQueue.shift()!;
        
        const loadPromise = this.loadResource(config)
          .then(result => {
            results.push(result);
            
            if (result.success) {
              loaded++;
              this.stats.successfulLoads++;
            } else {
              failed++;
              this.stats.failedLoads++;
            }
            
            this.stats.totalLoadTime += result.loadTime;
            if (result.size) {
              this.stats.totalDataSize += result.size;
            }
            
            updateProgress();
            onResourceLoaded?.(result);
          })
          .catch(error => {
            console.error('资源加载失败:', error);
            failed++;
            this.stats.failedLoads++;
            updateProgress();
          });
        
        loadPromises.push(loadPromise);
      }

      // 等待至少一个任务完成
      if (loadPromises.length > 0) {
        await Promise.race(loadPromises);
        
        // 移除已完成的任务
        for (let i = loadPromises.length - 1; i >= 0; i--) {
          const promise = loadPromises[i];
          if (await this.isPromiseSettled(promise)) {
            loadPromises.splice(i, 1);
          }
        }
      }
    }

    const duration = performanceMonitor.endTimer('resourcePreload');
    
    console.log(`✅ 预加载完成: ${loaded}成功, ${failed}失败, 耗时: ${duration.toFixed(2)}ms`);
    
    return results;
  }

  /**
   * 检查Promise是否已完成
   */
  private async isPromiseSettled(promise: Promise<void>): Promise<boolean> {
    try {
      await Promise.race([
        promise,
        new Promise(resolve => setTimeout(resolve, 0))
      ]);
      return true;
    } catch {
      return true;
    }
  }

  /**
   * 加载单个资源
   */
  private async loadResource(config: ResourceConfig): Promise<LoadResult> {
    const { url, type, timeout, retries } = config;
    
    this.stats.totalRequests++;
    this.loadingResources.add(url);
    
    // 检查是否已缓存
    if (this.loadedResources.has(url)) {
      const cached = this.loadedResources.get(url)!;
      this.stats.cacheHits++;
      return { ...cached, fromCache: true };
    }

    let lastError: string = '';
    
    for (let attempt = 0; attempt <= retries!; attempt++) {
      try {
        const startTime = performance.now();
        const result = await this.loadByType(url, type, timeout!);
        const loadTime = performance.now() - startTime;
        
        const loadResult: LoadResult = {
          url,
          success: true,
          data: result.data,
          loadTime,
          fromCache: false,
          size: result.size,
          metadata: config.metadata
        };
        
        this.loadedResources.set(url, loadResult);
        this.loadingResources.delete(url);
        
        return loadResult;
        
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        console.warn(`资源加载失败 (尝试 ${attempt + 1}/${retries! + 1}): ${url}`, lastError);
        
        if (attempt < retries!) {
          // 指数退避重试
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    // 所有重试都失败
    const loadResult: LoadResult = {
      url,
      success: false,
      error: lastError,
      loadTime: 0,
      fromCache: false,
      metadata: config.metadata
    };
    
    this.failedResources.set(url, lastError);
    this.loadingResources.delete(url);
    
    return loadResult;
  }

  /**
   * 根据类型加载资源
   */
  private async loadByType(url: string, type: ResourceType, timeout: number): Promise<{data: any, size?: number}> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      switch (type) {
        case ResourceType.AUDIO:
          return await this.loadAudio(url, controller.signal);
        case ResourceType.IMAGE:
          return await this.loadImage(url, controller.signal);
        case ResourceType.JSON:
          return await this.loadJSON(url, controller.signal);
        default:
          throw new Error(`不支持的资源类型: ${type}`);
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * 加载音频资源
   */
  private async loadAudio(url: string, signal: AbortSignal): Promise<{data: ArrayBuffer, size: number}> {
    const response = await fetch(url, { signal });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    return {
      data: arrayBuffer,
      size: arrayBuffer.byteLength
    };
  }

  /**
   * 加载图片资源
   */
  private async loadImage(url: string, signal: AbortSignal): Promise<{data: HTMLImageElement, size?: number}> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      const cleanup = () => {
        img.onload = null;
        img.onerror = null;
        signal.removeEventListener('abort', onAbort);
      };
      
      const onAbort = () => {
        cleanup();
        reject(new Error('加载被中止'));
      };
      
      img.onload = () => {
        cleanup();
        resolve({
          data: img,
          size: undefined // 图片大小难以准确获取
        });
      };
      
      img.onerror = () => {
        cleanup();
        reject(new Error('图片加载失败'));
      };
      
      signal.addEventListener('abort', onAbort);
      img.src = url;
    });
  }

  /**
   * 加载JSON资源
   */
  private async loadJSON(url: string, signal: AbortSignal): Promise<{data: any, size: number}> {
    const response = await fetch(url, { signal });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const text = await response.text();
    const data = JSON.parse(text);
    
    return {
      data,
      size: text.length
    };
  }

  /**
   * 获取已加载的资源
   */
  getLoadedResource(url: string): any | null {
    const result = this.loadedResources.get(url);
    return result?.success ? result.data : null;
  }

  /**
   * 检查资源是否已加载
   */
  isResourceLoaded(url: string): boolean {
    return this.loadedResources.has(url) && this.loadedResources.get(url)!.success;
  }

  /**
   * 获取加载统计信息
   */
  getStats() {
    return {
      ...this.stats,
      cacheHitRate: this.stats.totalRequests > 0 ? 
        (this.stats.cacheHits / this.stats.totalRequests) * 100 : 0,
      averageLoadTime: this.stats.successfulLoads > 0 ? 
        this.stats.totalLoadTime / this.stats.successfulLoads : 0,
      successRate: this.stats.totalRequests > 0 ? 
        (this.stats.successfulLoads / this.stats.totalRequests) * 100 : 0
    };
  }

  /**
   * 清理缓存
   */
  clearCache(): void {
    this.loadedResources.clear();
    this.failedResources.clear();
    console.log('🧹 资源预加载缓存已清理');
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.stats = {
      totalRequests: 0,
      successfulLoads: 0,
      failedLoads: 0,
      cacheHits: 0,
      totalLoadTime: 0,
      totalDataSize: 0
    };
  }
}

/**
 * 全局资源预加载器实例
 */
export const resourcePreloader = ResourcePreloader.getInstance();

// 在开发环境中挂载到全局
if (import.meta.env.DEV) {
  (window as any).resourcePreloader = resourcePreloader;
  console.log('🚀 资源预加载器已挂载到 window.resourcePreloader');
}
