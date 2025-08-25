/**
 * 优化的音频管理器
 * 集成资源预加载、多层缓存和智能错误处理
 */

import { ResourceType, ResourcePriority, type ResourceConfig } from './resourcePreloader';
import { configManager } from './configManager';
import type { SfxMap, BgmInfo } from '@/types/audio';

// 依赖注入接口
interface AudioManagerDependencies {
  resourcePreloader: any;
  cacheManager: any;
  performanceMonitor: any;
}

/**
 * 音频缓存项接口
 */
interface AudioCacheItem {
  buffer?: AudioBuffer;
  element?: HTMLAudioElement;
  url: string;
  type: 'bgm' | 'sfx';
  lastUsed: number;
}

/**
 * 优化的音频管理器类
 */
export class OptimizedAudioManager {
  private useWebAudio: boolean = false;
  private audioContext: AudioContext | null = null;
  private bgmGainNode: GainNode | null = null;
  private sfxGainNode: GainNode | null = null;
  private bgmSource: AudioBufferSourceNode | null = null;
  
  // 音频缓存
  private audioCache = new Map<string, AudioCacheItem>();
  private maxCacheSize: number = 50; // 最大缓存音频数量
  
  // 音频池
  private sfxAudioPool = new Map<string, HTMLAudioElement[]>();
  private maxPoolSize: number = 3; // 每个音效的最大池大小
  
  // 状态管理
  public bgmVolume: number = 0.5;
  public sfxVolume: number = 0.7;
  public bgmPlaying: boolean = false;
  public sfxEnabled: boolean = true;
  public initialized: boolean = false;
  public isMobile: boolean;
  
  // 预加载状态
  private preloadProgress: number = 0;
  private preloadComplete: boolean = false;

  // 依赖注入
  private dependencies: AudioManagerDependencies | null = null;

  constructor(dependencies?: AudioManagerDependencies) {
    this.dependencies = dependencies || null;
    this.isMobile = this.detectMobile();
    this.loadConfigSettings();
    this.subscribeToConfigChanges();
  }

  /**
   * 设置依赖（用于依赖注入）
   */
  setDependencies(dependencies: AudioManagerDependencies): void {
    this.dependencies = dependencies;
  }

  /**
   * 获取依赖（带默认值回退）
   */
  private getDependency<K extends keyof AudioManagerDependencies>(key: K): AudioManagerDependencies[K] {
    if (this.dependencies && this.dependencies[key]) {
      return this.dependencies[key];
    }

    // 回退到全局导入（向后兼容）
    switch (key) {
      case 'resourcePreloader':
        return require('./resourcePreloader').resourcePreloader;
      case 'cacheManager':
        return require('./cacheManager').cacheManager;
      case 'performanceMonitor':
        return require('./performanceMonitor').performanceMonitor;
      default:
        throw new Error(`依赖 ${key} 未找到`);
    }
  }

  /**
   * 从配置管理器加载音频设置
   */
  private loadConfigSettings(): void {
    const audioConfig = configManager.get('audio');
    this.bgmVolume = audioConfig.bgmVolume;
    this.sfxVolume = audioConfig.sfxVolume;
    this.sfxEnabled = audioConfig.enableSfx;
  }

  /**
   * 订阅配置变更
   */
  private subscribeToConfigChanges(): void {
    configManager.subscribe('audio', (newConfig) => {
      this.updateAudioSettings(newConfig);
    });
  }

  /**
   * 更新音频设置
   */
  private updateAudioSettings(audioConfig: any): void {
    this.bgmVolume = audioConfig.bgmVolume;
    this.sfxVolume = audioConfig.sfxVolume;
    this.sfxEnabled = audioConfig.enableSfx;

    // 更新音频上下文音量
    if (this.bgmGainNode) {
      this.bgmGainNode.gain.value = audioConfig.enableBgm ? this.bgmVolume : 0;
    }
    if (this.sfxGainNode) {
      this.sfxGainNode.gain.value = audioConfig.enableSfx ? this.sfxVolume : 0;
    }

    console.log('🔊 音频设置已更新:', audioConfig);
  }

  private detectMobile(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           (!!navigator.maxTouchPoints && navigator.maxTouchPoints > 2);
  }

  /**
   * 初始化音频系统
   */
  async init(): Promise<void> {
    if (this.initialized) return;
    
    console.log('🔊 初始化优化音频管理器...');
    this.getDependency('performanceMonitor').startTimer('audioInit');

    // 初始化缓存管理器
    await this.getDependency('cacheManager').init();
    
    // 在非移动设备上且支持AudioContext时，尝试初始化Web Audio
    if (!this.isMobile && window.AudioContext) {
      try {
        await this.initWebAudio();
        this.useWebAudio = true;
        console.log("✅ Web Audio API 已激活");
      } catch (e) {
        this.initFallback();
        console.warn("⚠️ Web Audio API 初始化失败，回退到 HTML Audio", e);
      }
    } else {
      this.initFallback();
    }
    
    this.initialized = true;
    const duration = this.getDependency('performanceMonitor').endTimer('audioInit');
    console.log(`✅ 音频管理器初始化完成，耗时: ${duration.toFixed(2)}ms`);
  }

  private async initWebAudio(): Promise<void> {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.bgmGainNode = this.audioContext.createGain();
    this.sfxGainNode = this.audioContext.createGain();
    this.bgmGainNode.connect(this.audioContext.destination);
    this.sfxGainNode.connect(this.audioContext.destination);
    this.bgmGainNode.gain.value = this.bgmVolume;
    this.sfxGainNode.gain.value = this.sfxVolume;
    
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  private initFallback(): void {
    this.useWebAudio = false;
    console.log("🔊 使用 HTML Audio 模式");
  }

  /**
   * 预加载音频资源
   */
  async preloadAudio(
    sfxMap: SfxMap,
    bgmList: BgmInfo[],
    onProgress?: (progress: number) => void
  ): Promise<void> {
    console.log('🚀 开始预加载音频资源...');
    this.getDependency('performanceMonitor').startTimer('audioPreload');
    
    // 准备预加载配置
    const preloadConfigs: ResourceConfig[] = [];
    
    // 添加音效到预加载队列 (高优先级)
    Object.entries(sfxMap).forEach(([name, url]) => {
      preloadConfigs.push({
        url,
        type: ResourceType.AUDIO,
        priority: ResourcePriority.HIGH,
        metadata: { name, type: 'sfx' }
      });
    });
    
    // 添加BGM到预加载队列 (普通优先级)
    bgmList.forEach(bgm => {
      preloadConfigs.push({
        url: bgm.src,
        type: ResourceType.AUDIO,
        priority: ResourcePriority.NORMAL,
        metadata: { name: bgm.name, type: 'bgm', id: bgm.id }
      });
    });
    
    // 开始预加载
    const resourcePreloader = this.getDependency('resourcePreloader');
    resourcePreloader.addResources(preloadConfigs);

    const results = await resourcePreloader.preload(
      (progress) => {
        this.preloadProgress = progress.progress;
        onProgress?.(progress.progress);
        console.log(`🎵 音频预加载进度: ${progress.progress.toFixed(1)}%`);
      },
      (result) => {
        if (result.success && result.metadata) {
          this.cacheAudioData(result.url, result.data, result.metadata.type || 'unknown');
        }
      }
    );
    
    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;
    
    this.preloadComplete = true;
    const duration = this.getDependency('performanceMonitor').endTimer('audioPreload');
    
    console.log(`✅ 音频预加载完成: ${successCount}/${totalCount} 成功, 耗时: ${duration.toFixed(2)}ms`);
  }

  /**
   * 缓存音频数据
   */
  private async cacheAudioData(url: string, data: ArrayBuffer, type: string): Promise<void> {
    try {
      const cacheManager = this.getDependency('cacheManager');
      // 缓存原始数据
      await cacheManager.set(`audio_raw_${url}`, data, 86400000, 'audio_raw'); // 24小时
      
      // 如果使用Web Audio，解码并缓存AudioBuffer
      if (this.useWebAudio && this.audioContext) {
        try {
          const buffer = await this.audioContext.decodeAudioData(data.slice(0));
          await cacheManager.set(`audio_buffer_${url}`, buffer, 86400000, 'audio_buffer');
          
          this.audioCache.set(url, {
            buffer,
            url,
            type: type as 'bgm' | 'sfx',
            lastUsed: Date.now()
          });
        } catch (decodeError) {
          console.warn(`音频解码失败: ${url}`, decodeError);
        }
      }
      
    } catch (error) {
      console.warn(`音频缓存失败: ${url}`, error);
    }
  }

  /**
   * 获取音频缓存
   */
  private async getAudioFromCache(url: string): Promise<AudioBuffer | null> {
    // 先检查内存缓存
    const cached = this.audioCache.get(url);
    if (cached?.buffer) {
      cached.lastUsed = Date.now();
      return cached.buffer;
    }
    
    // 检查多层缓存
    const cacheManager = this.getDependency('cacheManager');
    const cachedBuffer = await cacheManager.get(`audio_buffer_${url}`);
    if (cachedBuffer) {
      this.audioCache.set(url, {
        buffer: cachedBuffer,
        url,
        type: 'sfx', // 默认为sfx类型
        lastUsed: Date.now()
      });
      return cachedBuffer;
    }
    
    // 检查原始数据缓存
    const cachedRaw = await cacheManager.get(`audio_raw_${url}`);
    if (cachedRaw && this.audioContext) {
      try {
        const buffer = await this.audioContext.decodeAudioData(cachedRaw.slice(0));
        await cacheManager.set(`audio_buffer_${url}`, buffer, 86400000, 'audio_buffer');
        
        this.audioCache.set(url, {
          buffer,
          url,
          type: 'sfx', // 默认为sfx类型
          lastUsed: Date.now()
        });
        
        return buffer;
      } catch (error) {
        console.warn(`缓存音频解码失败: ${url}`, error);
      }
    }
    
    return null;
  }

  /**
   * 播放BGM
   */
  async playBgm(src: string): Promise<void> {
    if (!this.initialized) await this.init();

    this.getDependency('performanceMonitor').startTimer('playBgm');
    
    if (this.useWebAudio) {
      await this.playBgmWebAudio(src);
    } else {
      await this.playBgmFallback(src);
    }

    this.getDependency('performanceMonitor').endTimer('playBgm');
  }

  private async playBgmWebAudio(src: string): Promise<void> {
    try {
      if (this.audioContext!.state === 'suspended') {
        await this.audioContext!.resume();
      }
      
      if (this.bgmSource) {
        this.bgmSource.stop();
      }
      
      // 尝试从缓存获取
      let buffer = await this.getAudioFromCache(src);
      
      if (!buffer) {
        // 缓存未命中，加载音频
        console.log(`🎵 BGM缓存未命中，加载: ${src}`);
        buffer = await this.loadAudioBuffer(src);
        if (buffer) {
          await this.cacheAudioData(src, buffer as any, 'bgm');
        }
      }
      
      if (!buffer) {
        return await this.playBgmFallback(src);
      }
      
      this.bgmSource = this.audioContext!.createBufferSource();
      this.bgmSource.buffer = buffer;
      this.bgmSource.loop = true;
      this.bgmSource.connect(this.bgmGainNode!);
      this.bgmSource.start();
      this.bgmPlaying = true;
      
    } catch (e) {
      console.warn('Web Audio BGM播放失败，回退到HTML Audio:', e);
      await this.playBgmFallback(src);
    }
  }

  private async playBgmFallback(src: string): Promise<void> {
    try {
      // 检查是否有缓存的Audio元素
      const cached = this.audioCache.get(src);
      let audio = cached?.element;
      
      if (!audio) {
        audio = new Audio(src);
        audio.loop = true;
        audio.volume = this.bgmVolume;
        
        this.audioCache.set(src, {
          element: audio,
          url: src,
          type: 'bgm',
          lastUsed: Date.now()
        });
      }
      
      await audio.play();
      this.bgmPlaying = true;
      
    } catch (e) {
      console.error('BGM播放失败:', e);
    }
  }

  /**
   * 播放音效
   */
  async playSfx(src: string): Promise<void> {
    if (!this.sfxEnabled || !this.initialized) return;

    this.getDependency('performanceMonitor').startTimer('playSfx');
    
    if (this.useWebAudio) {
      await this.playSfxWebAudio(src);
    } else {
      await this.playSfxFallback(src);
    }

    this.getDependency('performanceMonitor').endTimer('playSfx');
  }

  private async playSfxWebAudio(src: string): Promise<void> {
    try {
      if (this.audioContext!.state === 'suspended') {
        await this.audioContext!.resume();
      }
      
      // 尝试从缓存获取
      let buffer = await this.getAudioFromCache(src);
      
      if (!buffer) {
        // 缓存未命中，加载音频
        buffer = await this.loadAudioBuffer(src);
        if (buffer) {
          await this.cacheAudioData(src, buffer as any, 'sfx');
        }
      }
      
      if (!buffer) {
        return await this.playSfxFallback(src);
      }
      
      const sourceNode = this.audioContext!.createBufferSource();
      sourceNode.buffer = buffer;
      sourceNode.connect(this.sfxGainNode!);
      sourceNode.start();
      
    } catch (e) {
      await this.playSfxFallback(src);
    }
  }

  private async playSfxFallback(src: string): Promise<void> {
    try {
      if (!this.sfxAudioPool.has(src)) {
        this.sfxAudioPool.set(src, []);
      }

      const pool = this.sfxAudioPool.get(src)!;
      let audio = pool.find(a => a.paused || a.ended);

      if (!audio) {
        audio = new Audio(src);
        audio.volume = this.sfxVolume;
        
        pool.push(audio);
        if (pool.length > this.maxPoolSize) {
          pool.shift();
        }
      }

      await audio.play();
      
    } catch (e) {
      console.warn('音效播放失败:', src, e);
    }
  }

  /**
   * 加载音频缓冲区
   */
  private async loadAudioBuffer(url: string): Promise<AudioBuffer | null> {
    if (!this.useWebAudio || !this.audioContext) return null;
    
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      return await this.audioContext.decodeAudioData(arrayBuffer);
    } catch (e) {
      console.error(`音频解码失败: ${url}`, e);
      return null;
    }
  }

  /**
   * 清理音频缓存
   */
  cleanupCache(): void {
    if (this.audioCache.size <= this.maxCacheSize) return;

    // LRU清理策略
    const entries = Array.from(this.audioCache.entries())
      .sort(([, a], [, b]) => a.lastUsed - b.lastUsed);

    const toRemove = entries.slice(0, entries.length - this.maxCacheSize);
    toRemove.forEach(([key]) => this.audioCache.delete(key));

    console.log(`🧹 清理音频缓存: 移除${toRemove.length}个项目`);
  }

  /**
   * 停止BGM
   */
  stopBgm(): void {
    if (this.bgmSource) {
      this.bgmSource.stop();
      this.bgmSource = null;
    }
    this.bgmPlaying = false;
  }

  /**
   * 设置音量
   */
  setBgmVolume(volume: number): void {
    this.bgmVolume = Math.max(0, Math.min(1, volume));
    if (this.bgmGainNode) {
      this.bgmGainNode.gain.value = this.bgmVolume;
    }
  }

  setSfxVolume(volume: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
    if (this.sfxGainNode) {
      this.sfxGainNode.gain.value = this.sfxVolume;
    }
  }

  /**
   * 切换音效开关
   */
  toggleSfx(): boolean {
    this.sfxEnabled = !this.sfxEnabled;
    return this.sfxEnabled;
  }

  /**
   * 获取预加载进度
   */
  getPreloadProgress(): number {
    return this.preloadProgress;
  }

  /**
   * 检查预加载是否完成
   */
  isPreloadComplete(): boolean {
    return this.preloadComplete;
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats() {
    return {
      memoryCache: this.audioCache.size,
      maxCacheSize: this.maxCacheSize,
      poolSizes: Object.fromEntries(
        Array.from(this.sfxAudioPool.entries()).map(([key, pool]) => [key, pool.length])
      )
    };
  }

  /**
   * 关闭音频系统
   */
  close(): void {
    if (this.audioContext) {
      this.audioContext.close();
    }
    this.audioCache.clear();
    this.sfxAudioPool.clear();
  }
}

/**
 * 全局优化音频管理器实例
 */
export const optimizedAudioManager = new OptimizedAudioManager();

// 在开发环境中挂载到全局
if (import.meta.env.DEV) {
  (window as any).optimizedAudioManager = optimizedAudioManager;
  console.log('🎵 优化音频管理器已挂载到 window.optimizedAudioManager');
}
