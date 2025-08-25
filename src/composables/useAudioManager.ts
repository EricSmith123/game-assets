import type {
    AudioManagerReturn,
    SfxMap
} from '@/types/audio';
import { logger } from '@/utils/productionLogger';
import { ref } from 'vue';

/**
 * 混合音频管理器类
 * 优先使用 Web Audio API，在不支持或移动设备上回退到 HTMLAudioElement
 */
class HybridAudioManager {
  private useWebAudio: boolean = false;
  private audioContext: AudioContext | null = null;
  private bgmGainNode: GainNode | null = null;
  private sfxGainNode: GainNode | null = null;
  private bgmSource: AudioBufferSourceNode | null = null;
  private bgmBuffer: AudioBuffer | null = null;
  private sfxBuffers: Map<string, AudioBuffer> = new Map();
  private bgmAudio: HTMLAudioElement | null = null;
  private sfxAudioPool: Map<string, HTMLAudioElement[]> = new Map();
  
  public bgmVolume: number = 0.5;
  public sfxVolume: number = 0.7;
  public bgmPlaying: boolean = false;
  public sfxEnabled: boolean = true;
  public initialized: boolean = false;
  public isMobile: boolean;

  constructor() {
    this.isMobile = this.detectMobile();
  }

  private detectMobile(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           (!!navigator.maxTouchPoints && navigator.maxTouchPoints > 2);
  }

  async init(): Promise<void> {
    if (this.initialized) return;
    
    // 在非移动设备上且支持AudioContext时，尝试初始化Web Audio
    if (!this.isMobile && window.AudioContext) {
      try {
        await this.initWebAudio();
        this.useWebAudio = true;
        logger.audio("音频管理器: Web Audio API 已激活");
      } catch (e) {
        this.initFallback();
        logger.warn("音频管理器: Web Audio API 初始化失败，回退到 HTML Audio", e);
      }
    } else {
      this.initFallback();
    }
    this.initialized = true;
  }

  private async initWebAudio(): Promise<void> {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.bgmGainNode = this.audioContext.createGain();
    this.sfxGainNode = this.audioContext.createGain();
    this.bgmGainNode.connect(this.audioContext.destination);
    this.sfxGainNode.connect(this.audioContext.destination);
    this.bgmGainNode.gain.value = this.bgmVolume;
    this.sfxGainNode.gain.value = this.sfxVolume;
    
    // 如果音频上下文被挂起，需要恢复它
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  private initFallback(): void {
    this.useWebAudio = false;
    logger.audio("音频管理器: 使用 HTML Audio 模式");
  }

  private async loadAudioBuffer(url: string): Promise<AudioBuffer | null> {
    if (!this.useWebAudio || !this.audioContext) return null;
    
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      return await this.audioContext.decodeAudioData(arrayBuffer);
    } catch (e) {
      logger.error(`解码音频数据失败: ${url}`, e);
      return null;
    }
  }

  // BGM播放方法
  async playBgm(src: string): Promise<void> {
    if (!this.initialized) await this.init();
    
    if (this.useWebAudio) {
      await this.playBgmWebAudio(src);
    } else {
      await this.playBgmFallback(src);
    }
  }

  private async playBgmWebAudio(src: string): Promise<void> {
    try {
      if (this.audioContext!.state === 'suspended') {
        await this.audioContext!.resume();
      }
      
      if (this.bgmSource) {
        this.bgmSource.stop();
      }
      
      this.bgmBuffer = await this.loadAudioBuffer(src);
      if (!this.bgmBuffer) {
        return await this.playBgmFallback(src);
      }
      
      this.bgmSource = this.audioContext!.createBufferSource();
      this.bgmSource.buffer = this.bgmBuffer;
      this.bgmSource.loop = true;
      this.bgmSource.connect(this.bgmGainNode!);
      this.bgmSource.start();
      this.bgmPlaying = true;
    } catch (e) {
      await this.playBgmFallback(src);
    }
  }

  private async playBgmFallback(src: string): Promise<void> {
    try {
      if (this.bgmAudio) {
        this.bgmAudio.pause();
      }
      
      this.bgmAudio = new Audio(src);
      this.bgmAudio.loop = true;
      this.bgmAudio.volume = this.bgmVolume;
      
      if (this.isMobile) {
        this.bgmAudio.load();
      }
      
      const playPromise = this.bgmAudio.play();
      if (playPromise) {
        await playPromise;
      }
      
      this.bgmPlaying = true;
    } catch (e) {
      this.bgmPlaying = false;
      throw e;
    }
  }

  // SFX播放方法
  async playSfx(src: string): Promise<void> {
    logger.audio(`playSfx 调用 - 音效启用: ${this.sfxEnabled}, 已初始化: ${this.initialized}`);

    if (!this.sfxEnabled || !this.initialized) {
      logger.audio(`跳过音效播放 - 音效启用: ${this.sfxEnabled}, 已初始化: ${this.initialized}`);
      return;
    }

    if (this.useWebAudio) {
      await this.playSfxWebAudio(src);
    } else {
      await this.playSfxFallback(src);
    }
  }

  private async playSfxWebAudio(src: string): Promise<void> {
    try {
      if (this.audioContext!.state === 'suspended') {
        await this.audioContext!.resume();
      }
      
      if (!this.sfxBuffers.has(src)) {
        const buffer = await this.loadAudioBuffer(src);
        if (buffer) {
          this.sfxBuffers.set(src, buffer);
        }
      }
      
      const buffer = this.sfxBuffers.get(src);
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
    const fileName = src.split('/').pop() || 'unknown';
    logger.audio(`[Fallback] 开始播放音效: ${fileName}`);

    try {
      if (!this.sfxAudioPool.has(src)) {
        this.sfxAudioPool.set(src, []);
      }

      const pool = this.sfxAudioPool.get(src)!;
      let audio = pool.find(a => a.paused || a.ended);

      if (!audio) {
        audio = new Audio(src);
        
        // 添加事件监听器
        audio.addEventListener('loadstart', () => logger.audio(`[${fileName}] 开始加载`));
        audio.addEventListener('canplay', () => logger.audio(`[${fileName}] 可以播放`));
        audio.addEventListener('play', () => logger.audio(`[${fileName}] 开始播放`));
        audio.addEventListener('ended', () => console.log(`🔊 [${fileName}] 播放结束`));
        audio.addEventListener('error', (e) => console.error(`🔊 [${fileName}] 播放错误:`, e));

        pool.push(audio);
        if (pool.length > 3) {
          pool.shift();
        }
      }

      audio.currentTime = 0;
      audio.volume = isNaN(this.sfxVolume) ? 0.7 : this.sfxVolume;

      const playPromise = audio.play();
      if (playPromise) {
        await playPromise;
        console.log(`✅ [Fallback] 音效播放成功: ${fileName}`);
      }
    } catch (e) {
      console.error(`❌ [Fallback] 音效播放失败: ${fileName}`, e);
      throw e;
    }
  }

  // 音量控制方法
  setBgmVolume(volume: number): void {
    this.bgmVolume = Math.max(0, Math.min(1, volume));
    
    if (this.useWebAudio && this.bgmGainNode) {
      this.bgmGainNode.gain.value = this.bgmVolume;
    } else if (this.bgmAudio) {
      this.bgmAudio.volume = this.bgmVolume;
    }
  }

  setSfxVolume(volume: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
    
    if (this.useWebAudio && this.sfxGainNode) {
      this.sfxGainNode.gain.value = this.sfxVolume;
    }
    
    // 更新现有音频池中的音量
    this.sfxAudioPool.forEach(pool => {
      pool.forEach(audio => {
        audio.volume = this.sfxVolume;
      });
    });
  }

  // BGM控制方法
  pauseBgm(): void {
    console.log('🎵 AudioManager.pauseBgm 被调用');
    
    if (this.useWebAudio && this.bgmSource && this.bgmPlaying) {
      this.bgmSource.stop();
      this.bgmSource = null;
    } else if (this.bgmAudio && !this.bgmAudio.paused) {
      this.bgmAudio.pause();
    }
    
    this.bgmPlaying = false;
    console.log('🎵 AudioManager BGM 已暂停');
  }

  resumeBgm(): void {
    console.log('🎵 AudioManager.resumeBgm 被调用');
    
    if (this.useWebAudio && this.bgmBuffer && !this.bgmPlaying) {
      try {
        this.bgmSource = this.audioContext!.createBufferSource();
        this.bgmSource.buffer = this.bgmBuffer;
        this.bgmSource.loop = true;
        this.bgmSource.connect(this.bgmGainNode!);
        this.bgmSource.start();
        this.bgmPlaying = true;
        console.log('🎵 AudioManager BGM WebAudio 恢复成功');
      } catch (e) {
        console.error('❌ AudioManager BGM WebAudio 恢复失败:', e);
      }
    } else if (this.bgmAudio && this.bgmAudio.paused) {
      this.bgmAudio.play().then(() => {
        this.bgmPlaying = true;
        console.log('🎵 AudioManager BGM HTML5 Audio 恢复成功');
      }).catch(e => {
        console.error('❌ AudioManager BGM HTML5 Audio 恢复失败:', e);
      });
    }
  }

  toggleSfx(): boolean {
    this.sfxEnabled = !this.sfxEnabled;
    return this.sfxEnabled;
  }

  close(): void {
    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}

/**
 * 音频管理组合式函数
 * @param sfxMap 音效名称到URL的映射
 * @returns 音频管理相关的状态和方法
 */
export function useAudioManager(sfxMap: SfxMap): AudioManagerReturn {
  const audioManager = new HybridAudioManager();
  const bgmPlaying = ref<boolean>(audioManager.bgmPlaying);
  const sfxEnabled = ref<boolean>(audioManager.sfxEnabled);

  // 音效播放状态跟踪
  const sfxPlayingStatus = new Map<string, number>();
  const sfxLoadStatus = new Map<string, boolean>();

  /**
   * 检查音效文件是否可访问
   */
  const checkSfxAvailability = async (): Promise<void> => {
    console.log('🔍 ===== 音效文件可用性检查 =====');

    for (const [name, src] of Object.entries(sfxMap)) {
      try {
        const response = await fetch(src, { method: 'HEAD' });
        const status = response.ok ? '✅ 可用' : '❌ 不可用';
        sfxLoadStatus.set(name, response.ok);
        console.log(`${status} ${name}: ${src} (状态: ${response.status})`);
      } catch (error) {
        sfxLoadStatus.set(name, false);
        console.log(`❌ 网络错误 ${name}: ${src} - ${(error as Error).message}`);
      }
    }

    console.log('🔍 ===== 音效检查完成 =====');
  };

  /**
   * 播放指定名称的音效
   */
  const playNamedSfx = async (name: string): Promise<void> => {
    const timestamp = Date.now();
    console.log(`🎵 [${timestamp}] 请求播放音效: ${name}`);

    if (!sfxEnabled.value) {
      console.log(`🔇 [${timestamp}] 音效已禁用，跳过: ${name}`);
      return;
    }

    const src = sfxMap[name];
    if (!src) {
      console.error(`❌ [${timestamp}] 音效名未在 sfxMap 中找到: ${name}`);
      console.log('📋 可用的音效:', Object.keys(sfxMap));
      return;
    }

    // 检查文件是否可用
    if (sfxLoadStatus.has(name) && !sfxLoadStatus.get(name)) {
      console.error(`❌ [${timestamp}] 音效文件不可用: ${name}`);
      return;
    }

    try {
      console.log(`🎵 [${timestamp}] 开始播放音效: ${name} -> ${src}`);
      sfxPlayingStatus.set(name, timestamp);

      await audioManager.playSfx(src);

      console.log(`✅ [${timestamp}] 音效播放完成: ${name}`);
    } catch (e) {
      console.error(`❌ [${timestamp}] 播放音效失败: ${name}`, e);
    } finally {
      sfxPlayingStatus.delete(name);
    }
  };

  /**
   * 播放BGM
   */
  const playBgm = async (src: string): Promise<void> => {
    if (!src) return;

    console.log('🎵 playBgm 被调用，源:', src);

    try {
      await audioManager.playBgm(src);
      bgmPlaying.value = true;
      console.log('🎵 playBgm 成功，状态已更新为:', bgmPlaying.value);
    } catch (e) {
      bgmPlaying.value = false;
      console.error('❌ playBgm 失败:', e);
      throw e;
    }
  };

  /**
   * 切换BGM播放状态
   */
  const toggleBgm = (): void => {
    if (bgmPlaying.value) {
      audioManager.pauseBgm();
    } else {
      audioManager.resumeBgm();
    }
    bgmPlaying.value = audioManager.bgmPlaying;
  };

  /**
   * 切换音效开关
   */
  const toggleSfx = (): void => {
    sfxEnabled.value = audioManager.toggleSfx();
  };

  /**
   * 激活移动端音频播放
   */
  const activateAudioOnMobile = async (): Promise<void> => {
    if (audioManager.isMobile && !audioManager.initialized) {
      await audioManager.init();

      // 尝试播放一个静音的音频来"解锁"移动端浏览器的音频播放限制
      try {
        const silentAudio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABgAZGF0YQAAAAA=');
        silentAudio.volume = 0;
        await silentAudio.play();
      } catch (e) {
        // 静默处理，即使失败也不影响后续操作
      }
    }
  };

  /**
   * 测试所有音效
   */
  const testAllSfx = async (): Promise<void> => {
    console.log('🧪 ===== 开始全面音效测试 =====');

    // 首先检查文件可用性
    await checkSfxAvailability();

    console.log('🧪 开始逐个测试音效播放...');
    const sfxNames = Object.keys(sfxMap);

    for (const name of sfxNames) {
      console.log(`🧪 测试音效: ${name}`);
      try {
        await playNamedSfx(name);
        await new Promise(resolve => setTimeout(resolve, 800)); // 间隔800ms
      } catch (e) {
        console.error(`❌ 音效测试失败: ${name}`, e);
      }
    }

    console.log('🧪 ===== 音效测试完成 =====');
  };

  return {
    audioManager,
    bgmPlaying,
    sfxEnabled,
    playNamedSfx,
    playBgm,
    toggleBgm,
    toggleSfx,
    activateAudioOnMobile,
    testAllSfx
  };
}
