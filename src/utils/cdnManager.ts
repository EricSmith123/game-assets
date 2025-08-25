/**
 * CDN管理器
 * 智能CDN选择、并发测试、性能缓存和动态切换
 */

import { performanceMonitor } from './performanceMonitor';
import { cacheManager } from './cacheManager';

/**
 * CDN配置接口
 */
export interface CdnConfig {
  name: string;
  baseUrl: string;
  priority: number;
  timeout: number;
  testPath?: string;
  region?: string;
}

/**
 * CDN性能测试结果
 */
export interface CdnTestResult {
  name: string;
  baseUrl: string;
  responseTime: number;
  success: boolean;
  error?: string;
  timestamp: number;
}

/**
 * CDN统计信息
 */
export interface CdnStats {
  currentCdn: string;
  totalTests: number;
  successfulTests: number;
  averageResponseTime: number;
  lastTestTime: number;
  testResults: CdnTestResult[];
}

/**
 * CDN管理器类
 */
export class CdnManager {
  private static instance: CdnManager;
  private cdnConfigs: CdnConfig[] = [];
  private currentCdn: CdnConfig | null = null;
  private testResults: CdnTestResult[] = [];
  private lastTestTime: number = 0;
  private testCacheKey: string = 'cdn_test_results';
  private testCacheTTL: number = 1800000; // 30分钟缓存

  private constructor() {
    this.initializeDefaultCdns();
  }

  static getInstance(): CdnManager {
    if (!CdnManager.instance) {
      CdnManager.instance = new CdnManager();
    }
    return CdnManager.instance;
  }

  /**
   * 初始化默认CDN配置
   */
  private initializeDefaultCdns(): void {
    this.cdnConfigs = [
      {
        name: 'jsdelivr',
        baseUrl: 'https://cdn.jsdelivr.net/gh/EricSmith123/game-assets@main',
        priority: 1,
        timeout: 3000,
        testPath: '/test.txt',
        region: 'global'
      },
      {
        name: 'github',
        baseUrl: 'https://raw.githubusercontent.com/EricSmith123/game-assets/main',
        priority: 2,
        timeout: 5000,
        testPath: '/test.txt',
        region: 'global'
      },
      {
        name: 'local',
        baseUrl: '',
        priority: 3,
        timeout: 1000,
        testPath: '/test.txt',
        region: 'local'
      }
    ];
  }

  /**
   * 添加CDN配置
   */
  addCdn(config: CdnConfig): void {
    this.cdnConfigs.push(config);
    this.sortCdnsByPriority();
  }

  /**
   * 按优先级排序CDN
   */
  private sortCdnsByPriority(): void {
    this.cdnConfigs.sort((a, b) => a.priority - b.priority);
  }

  /**
   * 智能选择最佳CDN
   */
  async selectBestCdn(forceTest: boolean = false): Promise<CdnConfig> {
    console.log('🌐 开始智能CDN选择...');
    
    performanceMonitor.startTimer('cdnSelection');
    
    // 检查是否需要重新测试
    const now = Date.now();
    const shouldTest = forceTest || 
                      !this.currentCdn || 
                      (now - this.lastTestTime) > this.testCacheTTL;
    
    if (!shouldTest && this.currentCdn) {
      console.log(`✅ 使用缓存的CDN: ${this.currentCdn.name}`);
      performanceMonitor.endTimer('cdnSelection');
      return this.currentCdn;
    }

    // 尝试从缓存加载测试结果
    if (!forceTest) {
      const cachedResults = await this.loadCachedTestResults();
      if (cachedResults && cachedResults.length > 0) {
        const bestCached = cachedResults[0];
        const cachedCdn = this.cdnConfigs.find(cdn => cdn.name === bestCached.name);
        if (cachedCdn) {
          this.currentCdn = cachedCdn;
          console.log(`✅ 使用缓存的最佳CDN: ${cachedCdn.name} (${bestCached.responseTime}ms)`);
          performanceMonitor.endTimer('cdnSelection');
          return cachedCdn;
        }
      }
    }

    // 并发测试所有CDN
    const testResults = await this.testAllCdns();
    
    // 选择最佳CDN
    const bestCdn = this.selectBestFromResults(testResults);
    
    if (bestCdn) {
      this.currentCdn = bestCdn;
      this.lastTestTime = now;
      
      // 缓存测试结果
      await this.cacheTestResults(testResults);
      
      console.log(`✅ 选择最佳CDN: ${bestCdn.name}`);
    } else {
      // 如果所有CDN都失败，使用第一个作为备选
      this.currentCdn = this.cdnConfigs[0];
      console.warn(`⚠️ 所有CDN测试失败，使用默认CDN: ${this.currentCdn.name}`);
    }
    
    const duration = performanceMonitor.endTimer('cdnSelection');
    console.log(`🌐 CDN选择完成，耗时: ${duration.toFixed(2)}ms`);
    
    return this.currentCdn;
  }

  /**
   * 并发测试所有CDN
   */
  private async testAllCdns(): Promise<CdnTestResult[]> {
    console.log(`🧪 并发测试 ${this.cdnConfigs.length} 个CDN...`);
    
    const testPromises = this.cdnConfigs.map(cdn => this.testSingleCdn(cdn));
    const results = await Promise.allSettled(testPromises);
    
    const testResults: CdnTestResult[] = [];
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        testResults.push(result.value);
      } else {
        // 测试失败的CDN
        testResults.push({
          name: this.cdnConfigs[index].name,
          baseUrl: this.cdnConfigs[index].baseUrl,
          responseTime: Infinity,
          success: false,
          error: result.reason?.message || '测试失败',
          timestamp: Date.now()
        });
      }
    });
    
    // 按响应时间排序
    testResults.sort((a, b) => {
      if (a.success && !b.success) return -1;
      if (!a.success && b.success) return 1;
      return a.responseTime - b.responseTime;
    });
    
    this.testResults = testResults;
    
    console.log('🧪 CDN测试结果:', testResults.map(r => ({
      name: r.name,
      success: r.success,
      responseTime: r.success ? `${r.responseTime}ms` : 'failed'
    })));
    
    return testResults;
  }

  /**
   * 测试单个CDN
   */
  private async testSingleCdn(cdn: CdnConfig): Promise<CdnTestResult> {
    const testUrl = `${cdn.baseUrl}${cdn.testPath || '/test.txt'}?t=${Date.now()}`;
    const startTime = performance.now();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), cdn.timeout);
      
      const response = await fetch(testUrl, {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-cache'
      });
      
      clearTimeout(timeoutId);
      
      const responseTime = performance.now() - startTime;
      
      if (response.ok) {
        return {
          name: cdn.name,
          baseUrl: cdn.baseUrl,
          responseTime,
          success: true,
          timestamp: Date.now()
        };
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
    } catch (error) {
      const responseTime = performance.now() - startTime;
      
      return {
        name: cdn.name,
        baseUrl: cdn.baseUrl,
        responseTime,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now()
      };
    }
  }

  /**
   * 从测试结果中选择最佳CDN
   */
  private selectBestFromResults(results: CdnTestResult[]): CdnConfig | null {
    // 找到第一个成功的CDN
    const bestResult = results.find(result => result.success);
    
    if (bestResult) {
      return this.cdnConfigs.find(cdn => cdn.name === bestResult.name) || null;
    }
    
    return null;
  }

  /**
   * 缓存测试结果
   */
  private async cacheTestResults(results: CdnTestResult[]): Promise<void> {
    try {
      await cacheManager.set(
        this.testCacheKey,
        results,
        this.testCacheTTL,
        'cdn_test_results'
      );
    } catch (error) {
      console.warn('CDN测试结果缓存失败:', error);
    }
  }

  /**
   * 加载缓存的测试结果
   */
  private async loadCachedTestResults(): Promise<CdnTestResult[] | null> {
    try {
      const cached = await cacheManager.get(this.testCacheKey);
      if (cached && Array.isArray(cached)) {
        console.log('📋 加载缓存的CDN测试结果');
        return cached;
      }
    } catch (error) {
      console.warn('CDN测试结果缓存加载失败:', error);
    }
    return null;
  }

  /**
   * 获取当前CDN
   */
  getCurrentCdn(): CdnConfig | null {
    return this.currentCdn;
  }

  /**
   * 获取当前CDN的基础URL
   */
  getCurrentBaseUrl(): string {
    return this.currentCdn?.baseUrl || '';
  }

  /**
   * 动态切换CDN
   */
  async switchCdn(cdnName: string): Promise<boolean> {
    const targetCdn = this.cdnConfigs.find(cdn => cdn.name === cdnName);
    
    if (!targetCdn) {
      console.error(`❌ CDN不存在: ${cdnName}`);
      return false;
    }
    
    // 测试目标CDN
    const testResult = await this.testSingleCdn(targetCdn);
    
    if (testResult.success) {
      this.currentCdn = targetCdn;
      console.log(`✅ 成功切换到CDN: ${cdnName} (${testResult.responseTime}ms)`);
      return true;
    } else {
      console.error(`❌ CDN切换失败: ${cdnName} - ${testResult.error}`);
      return false;
    }
  }

  /**
   * 获取所有CDN配置
   */
  getAllCdns(): CdnConfig[] {
    return [...this.cdnConfigs];
  }

  /**
   * 获取CDN统计信息
   */
  getStats(): CdnStats {
    const successfulTests = this.testResults.filter(r => r.success);
    const averageResponseTime = successfulTests.length > 0 ?
      successfulTests.reduce((sum, r) => sum + r.responseTime, 0) / successfulTests.length : 0;
    
    return {
      currentCdn: this.currentCdn?.name || 'none',
      totalTests: this.testResults.length,
      successfulTests: successfulTests.length,
      averageResponseTime,
      lastTestTime: this.lastTestTime,
      testResults: [...this.testResults]
    };
  }

  /**
   * 清理缓存
   */
  async clearCache(): Promise<void> {
    await cacheManager.delete(this.testCacheKey);
    this.testResults = [];
    this.lastTestTime = 0;
    console.log('🧹 CDN缓存已清理');
  }

  /**
   * 打印CDN统计信息
   */
  printStats(): void {
    const stats = this.getStats();
    
    console.group('🌐 CDN管理器统计');
    console.log(`当前CDN: ${stats.currentCdn}`);
    console.log(`测试次数: ${stats.totalTests}`);
    console.log(`成功率: ${stats.totalTests > 0 ? ((stats.successfulTests / stats.totalTests) * 100).toFixed(1) : 0}%`);
    console.log(`平均响应时间: ${stats.averageResponseTime.toFixed(2)}ms`);
    console.log(`上次测试: ${stats.lastTestTime > 0 ? new Date(stats.lastTestTime).toLocaleString() : '未测试'}`);
    
    if (stats.testResults.length > 0) {
      console.log('最近测试结果:');
      stats.testResults.forEach(result => {
        console.log(`  ${result.name}: ${result.success ? `${result.responseTime.toFixed(2)}ms` : `失败 - ${result.error}`}`);
      });
    }
    
    console.groupEnd();
  }

  /**
   * 检查CDN健康状态
   */
  async checkHealth(): Promise<boolean> {
    if (!this.currentCdn) {
      return false;
    }
    
    const result = await this.testSingleCdn(this.currentCdn);
    return result.success;
  }

  /**
   * 自动故障转移
   */
  async autoFailover(): Promise<boolean> {
    console.log('🔄 执行CDN自动故障转移...');
    
    const healthCheck = await this.checkHealth();
    if (healthCheck) {
      console.log('✅ 当前CDN健康，无需故障转移');
      return true;
    }
    
    console.warn('⚠️ 当前CDN不健康，开始故障转移');
    
    // 重新选择最佳CDN
    const newCdn = await this.selectBestCdn(true);
    
    if (newCdn && newCdn !== this.currentCdn) {
      console.log(`✅ 故障转移完成: ${this.currentCdn?.name} -> ${newCdn.name}`);
      return true;
    } else {
      console.error('❌ 故障转移失败，无可用CDN');
      return false;
    }
  }
}

/**
 * 全局CDN管理器实例
 */
export const cdnManager = CdnManager.getInstance();

// 在开发环境中挂载到全局
if (import.meta.env.DEV) {
  (window as any).cdnManager = cdnManager;
  console.log('🌐 CDN管理器已挂载到 window.cdnManager');
}
