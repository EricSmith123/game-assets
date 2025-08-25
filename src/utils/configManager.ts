/**
 * 统一配置管理中心
 * 管理所有模块的配置项，支持运行时更新和持久化
 */

import { environmentGuard } from './environmentGuard';

// 配置接口定义
export interface GameConfig {
  board: {
    size: number;
    tileTypes: number;
    animationDuration: number;
    minMatchLength: number;
  };
  audio: {
    enableSfx: boolean;
    enableBgm: boolean;
    volume: number;
    sfxVolume: number;
    bgmVolume: number;
  };
  performance: {
    enableMonitoring: boolean;
    enableOptimizations: boolean;
    targetFPS: number;
    enableGPUAcceleration: boolean;
    maxCacheSize: number;
  };
  ui: {
    enableAnimations: boolean;
    theme: 'light' | 'dark' | 'auto';
    accessibility: boolean;
    showFPS: boolean;
    language: string;
  };
  debug: {
    enableLogs: boolean;
    logLevel: 'error' | 'warn' | 'info' | 'debug' | 'verbose';
    enableDevTools: boolean;
    enableAutoTests: boolean;
    enableBenchmarks: boolean;
  };
  network: {
    enableCDN: boolean;
    enableOffline: boolean;
    cacheStrategy: 'aggressive' | 'normal' | 'minimal';
    timeout: number;
  };
}

// 配置变更监听器类型
export type ConfigChangeListener<K extends keyof GameConfig> = (
  newConfig: GameConfig[K],
  oldConfig: GameConfig[K],
  section: K
) => void;

// 配置验证器类型
export type ConfigValidator<K extends keyof GameConfig> = (
  config: GameConfig[K]
) => boolean | string;

export class ConfigManager {
  private static instance: ConfigManager;
  private config: GameConfig;
  private readonly CONFIG_KEY = 'game_config_v1';
  private listeners = new Map<keyof GameConfig, Set<ConfigChangeListener<any>>>();
  private validators = new Map<keyof GameConfig, ConfigValidator<any>>();

  private constructor() {
    this.config = this.loadConfig();
    this.setupValidators();
    this.logConfigInfo();
  }

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  /**
   * 获取默认配置
   */
  private getDefaultConfig(): GameConfig {
    const isProduction = environmentGuard.isProduction();
    
    return {
      board: {
        size: 8,
        tileTypes: 6,
        animationDuration: 300,
        minMatchLength: 3
      },
      audio: {
        enableSfx: true,
        enableBgm: true,
        volume: 0.7,
        sfxVolume: 0.8,
        bgmVolume: 0.6
      },
      performance: {
        enableMonitoring: !isProduction,
        enableOptimizations: true,
        targetFPS: 60,
        enableGPUAcceleration: true,
        maxCacheSize: 50 * 1024 * 1024 // 50MB
      },
      ui: {
        enableAnimations: true,
        theme: 'auto',
        accessibility: false,
        showFPS: !isProduction,
        language: 'zh-CN'
      },
      debug: {
        enableLogs: !isProduction,
        logLevel: isProduction ? 'warn' : 'info',
        enableDevTools: !isProduction,
        enableAutoTests: false,
        enableBenchmarks: false
      },
      network: {
        enableCDN: true,
        enableOffline: true,
        cacheStrategy: 'normal',
        timeout: 10000
      }
    };
  }

  /**
   * 从localStorage加载配置
   */
  private loadConfig(): GameConfig {
    try {
      const savedConfig = localStorage.getItem(this.CONFIG_KEY);
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        const defaultConfig = this.getDefaultConfig();
        
        // 深度合并配置，确保新增的配置项有默认值
        return this.deepMerge(defaultConfig, parsed);
      }
    } catch (error) {
      console.warn('⚠️ 配置加载失败，使用默认配置:', error);
    }
    
    return this.getDefaultConfig();
  }

  /**
   * 深度合并配置对象
   */
  private deepMerge(target: any, source: any): any {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {}, source[key]);
      } else if (source[key] !== undefined) {
        result[key] = source[key];
      }
    }
    
    return result;
  }

  /**
   * 保存配置到localStorage
   */
  private saveConfig(): void {
    try {
      localStorage.setItem(this.CONFIG_KEY, JSON.stringify(this.config));
    } catch (error) {
      console.error('❌ 配置保存失败:', error);
    }
  }

  /**
   * 设置配置验证器
   */
  private setupValidators(): void {
    // 游戏板配置验证
    this.validators.set('board', (config) => {
      if (config.size < 4 || config.size > 12) {
        return '游戏板尺寸必须在4-12之间';
      }
      if (config.tileTypes < 3 || config.tileTypes > 8) {
        return '方块类型数量必须在3-8之间';
      }
      if (config.animationDuration < 100 || config.animationDuration > 1000) {
        return '动画时长必须在100-1000ms之间';
      }
      return true;
    });

    // 音频配置验证
    this.validators.set('audio', (config) => {
      if (config.volume < 0 || config.volume > 1) {
        return '音量必须在0-1之间';
      }
      return true;
    });

    // 性能配置验证
    this.validators.set('performance', (config) => {
      if (config.targetFPS < 30 || config.targetFPS > 120) {
        return '目标帧率必须在30-120之间';
      }
      return true;
    });
  }

  /**
   * 记录配置信息
   */
  private logConfigInfo(): void {
    environmentGuard.runInDevelopment(() => {
      console.log('⚙️ Configuration loaded:', {
        environment: environmentGuard.getEnvironmentInfo(),
        config: this.config
      });
    });
  }

  /**
   * 获取配置节
   */
  get<K extends keyof GameConfig>(section: K): GameConfig[K] {
    return this.config[section];
  }

  /**
   * 设置配置节
   */
  set<K extends keyof GameConfig>(
    section: K, 
    value: Partial<GameConfig[K]>,
    skipValidation = false
  ): boolean {
    const oldConfig = { ...this.config[section] };
    const newConfig = { ...oldConfig, ...value };

    // 验证配置
    if (!skipValidation) {
      const validator = this.validators.get(section);
      if (validator) {
        const validationResult = validator(newConfig);
        if (validationResult !== true) {
          console.error(`❌ 配置验证失败 [${section}]:`, validationResult);
          return false;
        }
      }
    }

    // 更新配置
    this.config[section] = newConfig;
    this.saveConfig();

    // 通知监听器
    this.notifyConfigChange(section, newConfig, oldConfig);

    environmentGuard.runInDevelopment(() => {
      console.log(`⚙️ Configuration updated [${section}]:`, { old: oldConfig, new: newConfig });
    });

    return true;
  }

  /**
   * 获取完整配置
   */
  getAll(): GameConfig {
    return { ...this.config };
  }

  /**
   * 重置配置到默认值
   */
  reset(): void {
    const oldConfig = { ...this.config };
    this.config = this.getDefaultConfig();
    this.saveConfig();

    // 通知所有监听器
    Object.keys(this.config).forEach(section => {
      this.notifyConfigChange(
        section as keyof GameConfig,
        this.config[section as keyof GameConfig],
        oldConfig[section as keyof GameConfig]
      );
    });

    console.log('🔄 配置已重置到默认值');
  }

  /**
   * 订阅配置变更
   */
  subscribe<K extends keyof GameConfig>(
    section: K,
    listener: ConfigChangeListener<K>
  ): () => void {
    if (!this.listeners.has(section)) {
      this.listeners.set(section, new Set());
    }
    
    this.listeners.get(section)!.add(listener);

    // 返回取消订阅函数
    return () => {
      const sectionListeners = this.listeners.get(section);
      if (sectionListeners) {
        sectionListeners.delete(listener);
      }
    };
  }

  /**
   * 通知配置变更
   */
  private notifyConfigChange<K extends keyof GameConfig>(
    section: K,
    newConfig: GameConfig[K],
    oldConfig: GameConfig[K]
  ): void {
    const sectionListeners = this.listeners.get(section);
    if (sectionListeners) {
      sectionListeners.forEach(listener => {
        try {
          listener(newConfig, oldConfig, section);
        } catch (error) {
          console.error(`❌ 配置监听器执行失败 [${section}]:`, error);
        }
      });
    }
  }

  /**
   * 导出配置
   */
  export(): string {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * 导入配置
   */
  import(configJson: string): boolean {
    try {
      const importedConfig = JSON.parse(configJson);
      const defaultConfig = this.getDefaultConfig();
      const mergedConfig = this.deepMerge(defaultConfig, importedConfig);
      
      // 验证所有配置节
      for (const section in mergedConfig) {
        const validator = this.validators.get(section as keyof GameConfig);
        if (validator) {
          const validationResult = validator(mergedConfig[section]);
          if (validationResult !== true) {
            console.error(`❌ 导入配置验证失败 [${section}]:`, validationResult);
            return false;
          }
        }
      }

      const oldConfig = { ...this.config };
      this.config = mergedConfig;
      this.saveConfig();

      // 通知所有监听器
      Object.keys(this.config).forEach(section => {
        this.notifyConfigChange(
          section as keyof GameConfig,
          this.config[section as keyof GameConfig],
          oldConfig[section as keyof GameConfig]
        );
      });

      console.log('✅ 配置导入成功');
      return true;
    } catch (error) {
      console.error('❌ 配置导入失败:', error);
      return false;
    }
  }
}

// 创建全局实例
export const configManager = ConfigManager.getInstance();

// 在开发环境中挂载到全局
environmentGuard.runInDevelopment(() => {
  (window as any).configManager = configManager;
  console.log('⚙️ 配置管理器已挂载到 window.configManager');
});
