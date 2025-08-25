/**
 * 网络优化管理器
 * 提供请求去重、批量处理、智能重试、网络监控等功能
 */



/**
 * 网络请求配置接口
 */
export interface NetworkRequestConfig {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  retries?: number;
  priority?: 'high' | 'normal' | 'low';
  cache?: boolean;
  dedupe?: boolean;
}

/**
 * 网络状态接口
 */
export interface NetworkStatus {
  online: boolean;
  effectiveType: string;
  downlink: number;
  rtt: number;
  saveData: boolean;
}

/**
 * 请求结果接口
 */
export interface RequestResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  fromCache: boolean;
  responseTime: number;
  retryCount: number;
}



/**
 * 网络优化管理器类
 */
export class NetworkOptimizer {
  private static instance: NetworkOptimizer;
  private requestCache = new Map<string, Promise<RequestResult>>();
  
  // 网络状态
  private networkStatus: NetworkStatus = {
    online: navigator.onLine,
    effectiveType: 'unknown',
    downlink: 0,
    rtt: 0,
    saveData: false
  };
  
  // 性能统计
  private stats = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    cacheHits: 0,
    deduplicatedRequests: 0,
    batchedRequests: 0,
    totalResponseTime: 0,
    averageResponseTime: 0,
    retryCount: 0
  };

  private constructor() {
    this.initNetworkMonitoring();
    this.setupEventListeners();
  }

  static getInstance(): NetworkOptimizer {
    if (!NetworkOptimizer.instance) {
      NetworkOptimizer.instance = new NetworkOptimizer();
    }
    return NetworkOptimizer.instance;
  }

  /**
   * 初始化网络监控
   */
  private initNetworkMonitoring(): void {
    // 监控网络状态变化
    window.addEventListener('online', () => {
      this.networkStatus.online = true;
      console.log('🌐 网络已连接');
      this.onNetworkStatusChange();
    });

    window.addEventListener('offline', () => {
      this.networkStatus.online = false;
      console.log('🔌 网络已断开');
      this.onNetworkStatusChange();
    });

    // 监控网络质量
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      
      const updateConnectionInfo = () => {
        this.networkStatus.effectiveType = connection.effectiveType || 'unknown';
        this.networkStatus.downlink = connection.downlink || 0;
        this.networkStatus.rtt = connection.rtt || 0;
        this.networkStatus.saveData = connection.saveData || false;
      };
      
      updateConnectionInfo();
      connection.addEventListener('change', updateConnectionInfo);
    }
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    // 页面可见性变化
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.onPageVisible();
      }
    });
  }

  /**
   * 网络状态变化处理
   */
  private onNetworkStatusChange(): void {
    if (this.networkStatus.online) {
      // 网络恢复，重试失败的请求
      this.retryFailedRequests();
    } else {
      // 网络断开，清理待处理的请求
      this.clearPendingRequests();
    }
  }

  /**
   * 页面可见时处理
   */
  private onPageVisible(): void {
    // 页面重新可见时，刷新网络状态
    this.refreshNetworkStatus();
  }

  /**
   * 发送网络请求
   */
  async request<T = any>(config: NetworkRequestConfig): Promise<RequestResult<T>> {
    this.stats.totalRequests++;
    
    // 生成请求键用于去重
    const requestKey = this.generateRequestKey(config);
    
    // 请求去重
    if (config.dedupe !== false && this.requestCache.has(requestKey)) {
      this.stats.deduplicatedRequests++;
      console.log('🔄 请求去重:', config.url);
      return this.requestCache.get(requestKey)!;
    }
    
    // 创建请求Promise
    const requestPromise = this.executeRequest<T>(config);
    
    // 缓存请求Promise
    if (config.dedupe !== false) {
      this.requestCache.set(requestKey, requestPromise);
      
      // 请求完成后清理缓存
      requestPromise.finally(() => {
        this.requestCache.delete(requestKey);
      });
    }
    
    return requestPromise;
  }

  /**
   * 批量请求
   */
  async batchRequest<T = any>(configs: NetworkRequestConfig[]): Promise<RequestResult<T>[]> {
    console.log(`📦 批量请求: ${configs.length}个请求`);
    
    const promises = configs.map(config => this.request<T>(config));
    const results = await Promise.all(promises);
    
    this.stats.batchedRequests += configs.length;
    
    return results;
  }

  /**
   * 执行单个请求
   */
  private async executeRequest<T>(config: NetworkRequestConfig): Promise<RequestResult<T>> {
    const startTime = performance.now();
    let retryCount = 0;
    const maxRetries = config.retries || 3;
    
    while (retryCount <= maxRetries) {
      try {
        // 检查网络状态
        if (!this.networkStatus.online) {
          throw new Error('网络不可用');
        }
        
        // 根据网络质量调整超时时间
        const timeout = this.calculateTimeout(config.timeout);
        
        // 发送请求
        const response = await this.fetchWithTimeout(config, timeout);
        const data = await this.parseResponse<T>(response);
        
        const responseTime = performance.now() - startTime;
        this.updateStats(true, responseTime, retryCount);
        
        return {
          success: true,
          data,
          fromCache: false,
          responseTime,
          retryCount
        };
        
      } catch (error) {
        retryCount++;
        
        if (retryCount > maxRetries) {
          const responseTime = performance.now() - startTime;
          this.updateStats(false, responseTime, retryCount);
          
          return {
            success: false,
            error: error instanceof Error ? error.message : '请求失败',
            fromCache: false,
            responseTime,
            retryCount
          };
        }
        
        // 计算重试延迟（指数退避）
        const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 10000);
        await this.sleep(delay);
        
        console.log(`🔄 重试请求 (${retryCount}/${maxRetries}):`, config.url);
      }
    }
    
    // 这里不会执行到，但为了TypeScript类型检查
    throw new Error('请求失败');
  }

  /**
   * 带超时的fetch请求
   */
  private async fetchWithTimeout(config: NetworkRequestConfig, timeout: number): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(config.url, {
        method: config.method || 'GET',
        headers: config.headers,
        body: config.body,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * 解析响应数据
   */
  private async parseResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type');
    
    if (contentType?.includes('application/json')) {
      return await response.json();
    } else if (contentType?.includes('text/')) {
      return await response.text() as any;
    } else {
      return await response.arrayBuffer() as any;
    }
  }

  /**
   * 计算超时时间
   */
  private calculateTimeout(configTimeout?: number): number {
    const baseTimeout = configTimeout || 10000; // 默认10秒
    
    // 根据网络质量调整超时时间
    switch (this.networkStatus.effectiveType) {
      case 'slow-2g':
        return baseTimeout * 3;
      case '2g':
        return baseTimeout * 2;
      case '3g':
        return baseTimeout * 1.5;
      case '4g':
      default:
        return baseTimeout;
    }
  }

  /**
   * 生成请求键
   */
  private generateRequestKey(config: NetworkRequestConfig): string {
    const key = `${config.method || 'GET'}_${config.url}`;
    if (config.body) {
      const bodyHash = JSON.stringify(config.body);
      return `${key}_${bodyHash}`;
    }
    return key;
  }

  /**
   * 更新统计信息
   */
  private updateStats(success: boolean, responseTime: number, retryCount: number): void {
    if (success) {
      this.stats.successfulRequests++;
    } else {
      this.stats.failedRequests++;
    }
    
    this.stats.totalResponseTime += responseTime;
    this.stats.averageResponseTime = this.stats.totalResponseTime / this.stats.totalRequests;
    this.stats.retryCount += retryCount;
  }

  /**
   * 重试失败的请求
   */
  private retryFailedRequests(): void {
    console.log('🔄 网络恢复，重试失败的请求...');
    // 这里可以实现失败请求的重试逻辑
  }

  /**
   * 清理待处理的请求
   */
  private clearPendingRequests(): void {
    console.log('🧹 清理待处理的网络请求...');
    this.requestCache.clear();
  }

  /**
   * 刷新网络状态
   */
  private refreshNetworkStatus(): void {
    this.networkStatus.online = navigator.onLine;
    console.log('🔄 网络状态已刷新:', this.networkStatus);
  }

  /**
   * 睡眠函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取网络状态
   */
  getNetworkStatus(): NetworkStatus {
    return { ...this.networkStatus };
  }

  /**
   * 获取性能统计
   */
  getStats() {
    return {
      ...this.stats,
      successRate: this.stats.totalRequests > 0 
        ? (this.stats.successfulRequests / this.stats.totalRequests) * 100 
        : 0,
      deduplicationRate: this.stats.totalRequests > 0 
        ? (this.stats.deduplicatedRequests / this.stats.totalRequests) * 100 
        : 0,
      networkStatus: this.networkStatus
    };
  }

  /**
   * 打印性能统计
   */
  printStats(): void {
    const stats = this.getStats();
    
    console.group('🌐 网络优化器统计');
    console.log(`总请求数: ${stats.totalRequests}`);
    console.log(`成功请求: ${stats.successfulRequests}`);
    console.log(`失败请求: ${stats.failedRequests}`);
    console.log(`成功率: ${stats.successRate.toFixed(1)}%`);
    console.log(`缓存命中: ${stats.cacheHits}`);
    console.log(`去重请求: ${stats.deduplicatedRequests}`);
    console.log(`去重率: ${stats.deduplicationRate.toFixed(1)}%`);
    console.log(`批量请求: ${stats.batchedRequests}`);
    console.log(`平均响应时间: ${stats.averageResponseTime.toFixed(2)}ms`);
    console.log(`重试次数: ${stats.retryCount}`);
    console.log(`网络状态:`, stats.networkStatus);
    console.groupEnd();
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      cacheHits: 0,
      deduplicatedRequests: 0,
      batchedRequests: 0,
      totalResponseTime: 0,
      averageResponseTime: 0,
      retryCount: 0
    };
  }
}

/**
 * 全局网络优化器实例
 */
export const networkOptimizer = NetworkOptimizer.getInstance();

// 在开发环境中挂载到全局
if (import.meta.env.DEV) {
  (window as any).networkOptimizer = networkOptimizer;
  console.log('🌐 网络优化器已挂载到 window.networkOptimizer');
}
