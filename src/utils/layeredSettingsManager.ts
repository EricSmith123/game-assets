/**
 * 分层设置管理器
 * 根据用户类型显示不同复杂度的设置界面
 */

import { configManager, type GameConfig } from './configManager';
import { Logger } from './logger';
import { environmentGuard } from './environmentGuard';

// 用户类型枚举
export enum UserType {
  BASIC = 'basic',
  ADVANCED = 'advanced',
  DEVELOPER = 'developer'
}

// 设置项可见性级别
export enum VisibilityLevel {
  BASIC = 1,
  ADVANCED = 2,
  DEVELOPER = 3
}

// 设置项定义
export interface SettingItem {
  key: string;
  label: string;
  description: string;
  type: 'boolean' | 'number' | 'select' | 'range';
  category: keyof GameConfig;
  visibilityLevel: VisibilityLevel;
  defaultValue: any;
  options?: { value: any; label: string }[];
  min?: number;
  max?: number;
  step?: number;
  validation?: (value: any) => boolean | string;
  dependencies?: string[];
  recommendation?: (config: GameConfig) => any;
}

// 设置分组
export interface SettingGroup {
  id: string;
  label: string;
  description: string;
  icon: string;
  visibilityLevel: VisibilityLevel;
  items: SettingItem[];
}

export class LayeredSettingsManager {
  private static instance: LayeredSettingsManager;
  private logger: Logger;
  private currentUserType: UserType = UserType.BASIC;
  private settingGroups: SettingGroup[] = [];
  private recommendations = new Map<string, any>();

  private constructor() {
    this.logger = Logger.getInstance();
    this.initializeSettingGroups();
    this.detectUserType();
    this.generateRecommendations();

    environmentGuard.runInDevelopment(() => {
      this.logger.debug('分层设置管理器已初始化', {
        userType: this.currentUserType,
        visibleGroups: this.getVisibleGroups().length
      }, 'LayeredSettingsManager');
    });
  }

  static getInstance(): LayeredSettingsManager {
    if (!LayeredSettingsManager.instance) {
      LayeredSettingsManager.instance = new LayeredSettingsManager();
    }
    return LayeredSettingsManager.instance;
  }

  /**
   * 初始化设置分组
   */
  private initializeSettingGroups(): void {
    this.settingGroups = [
      {
        id: 'basic',
        label: '基础设置',
        description: '常用的游戏设置',
        icon: '⚙️',
        visibilityLevel: VisibilityLevel.BASIC,
        items: [
          {
            key: 'enableSfx',
            label: '音效',
            description: '开启或关闭游戏音效',
            type: 'boolean',
            category: 'audio',
            visibilityLevel: VisibilityLevel.BASIC,
            defaultValue: true
          },
          {
            key: 'enableBgm',
            label: '背景音乐',
            description: '开启或关闭背景音乐',
            type: 'boolean',
            category: 'audio',
            visibilityLevel: VisibilityLevel.BASIC,
            defaultValue: true
          },
          {
            key: 'volume',
            label: '主音量',
            description: '调整整体音量大小',
            type: 'range',
            category: 'audio',
            visibilityLevel: VisibilityLevel.BASIC,
            defaultValue: 0.7,
            min: 0,
            max: 1,
            step: 0.1
          },
          {
            key: 'theme',
            label: '主题',
            description: '选择界面主题',
            type: 'select',
            category: 'ui',
            visibilityLevel: VisibilityLevel.BASIC,
            defaultValue: 'auto',
            options: [
              { value: 'light', label: '浅色' },
              { value: 'dark', label: '深色' },
              { value: 'auto', label: '自动' }
            ]
          }
        ]
      },
      {
        id: 'gameplay',
        label: '游戏设置',
        description: '游戏玩法相关设置',
        icon: '🎮',
        visibilityLevel: VisibilityLevel.ADVANCED,
        items: [
          {
            key: 'size',
            label: '游戏板尺寸',
            description: '设置游戏板的大小',
            type: 'select',
            category: 'board',
            visibilityLevel: VisibilityLevel.ADVANCED,
            defaultValue: 8,
            options: [
              { value: 4, label: '4×4 (简单)' },
              { value: 6, label: '6×6 (普通)' },
              { value: 8, label: '8×8 (标准)' },
              { value: 10, label: '10×10 (困难)' },
              { value: 12, label: '12×12 (专家)' }
            ]
          },
          {
            key: 'tileTypes',
            label: '方块类型数量',
            description: '设置游戏中方块的种类数量',
            type: 'range',
            category: 'board',
            visibilityLevel: VisibilityLevel.ADVANCED,
            defaultValue: 6,
            min: 3,
            max: 8,
            step: 1
          },
          {
            key: 'animationDuration',
            label: '动画速度',
            description: '调整游戏动画的播放速度',
            type: 'range',
            category: 'board',
            visibilityLevel: VisibilityLevel.ADVANCED,
            defaultValue: 300,
            min: 100,
            max: 1000,
            step: 50
          }
        ]
      },
      {
        id: 'performance',
        label: '性能设置',
        description: '性能和优化相关设置',
        icon: '⚡',
        visibilityLevel: VisibilityLevel.ADVANCED,
        items: [
          {
            key: 'enableAnimations',
            label: '启用动画',
            description: '开启或关闭界面动画效果',
            type: 'boolean',
            category: 'ui',
            visibilityLevel: VisibilityLevel.ADVANCED,
            defaultValue: true
          },
          {
            key: 'targetFPS',
            label: '目标帧率',
            description: '设置游戏的目标帧率',
            type: 'select',
            category: 'performance',
            visibilityLevel: VisibilityLevel.ADVANCED,
            defaultValue: 60,
            options: [
              { value: 30, label: '30 FPS (省电)' },
              { value: 45, label: '45 FPS (平衡)' },
              { value: 60, label: '60 FPS (流畅)' }
            ]
          },
          {
            key: 'enableOptimizations',
            label: '性能优化',
            description: '启用自动性能优化功能',
            type: 'boolean',
            category: 'performance',
            visibilityLevel: VisibilityLevel.ADVANCED,
            defaultValue: true
          }
        ]
      },
      {
        id: 'accessibility',
        label: '无障碍设置',
        description: '无障碍访问相关设置',
        icon: '♿',
        visibilityLevel: VisibilityLevel.ADVANCED,
        items: [
          {
            key: 'accessibility',
            label: '无障碍模式',
            description: '启用无障碍访问功能',
            type: 'boolean',
            category: 'ui',
            visibilityLevel: VisibilityLevel.ADVANCED,
            defaultValue: false
          },
          {
            key: 'showFPS',
            label: '显示帧率',
            description: '在界面上显示实时帧率',
            type: 'boolean',
            category: 'ui',
            visibilityLevel: VisibilityLevel.ADVANCED,
            defaultValue: false
          }
        ]
      },
      {
        id: 'developer',
        label: '开发者设置',
        description: '开发和调试相关设置',
        icon: '🔧',
        visibilityLevel: VisibilityLevel.DEVELOPER,
        items: [
          {
            key: 'enableLogs',
            label: '启用日志',
            description: '开启详细的控制台日志',
            type: 'boolean',
            category: 'debug',
            visibilityLevel: VisibilityLevel.DEVELOPER,
            defaultValue: true
          },
          {
            key: 'logLevel',
            label: '日志级别',
            description: '设置日志的详细程度',
            type: 'select',
            category: 'debug',
            visibilityLevel: VisibilityLevel.DEVELOPER,
            defaultValue: 'info',
            options: [
              { value: 'error', label: '错误' },
              { value: 'warn', label: '警告' },
              { value: 'info', label: '信息' },
              { value: 'debug', label: '调试' },
              { value: 'verbose', label: '详细' }
            ]
          },
          {
            key: 'enableDevTools',
            label: '开发工具',
            description: '启用开发者工具面板',
            type: 'boolean',
            category: 'debug',
            visibilityLevel: VisibilityLevel.DEVELOPER,
            defaultValue: false
          },
          {
            key: 'enableMonitoring',
            label: '性能监控',
            description: '启用详细的性能监控',
            type: 'boolean',
            category: 'performance',
            visibilityLevel: VisibilityLevel.DEVELOPER,
            defaultValue: true
          }
        ]
      }
    ];
  }

  /**
   * 检测用户类型
   */
  private detectUserType(): void {
    // 检查是否为开发环境
    if (environmentGuard.isDevelopment()) {
      this.currentUserType = UserType.DEVELOPER;
      return;
    }

    // 检查用户偏好设置
    const savedUserType = localStorage.getItem('userType');
    if (savedUserType && Object.values(UserType).includes(savedUserType as UserType)) {
      this.currentUserType = savedUserType as UserType;
      return;
    }

    // 基于使用行为检测
    const config = configManager.getAll();
    let advancedFeatureCount = 0;

    // 检查是否使用了高级功能
    if (config.board.size !== 8) advancedFeatureCount++;
    if (config.board.tileTypes !== 6) advancedFeatureCount++;
    if (!config.performance.enableOptimizations) advancedFeatureCount++;
    if (config.ui.accessibility) advancedFeatureCount++;

    if (advancedFeatureCount >= 2) {
      this.currentUserType = UserType.ADVANCED;
    } else {
      this.currentUserType = UserType.BASIC;
    }

    this.logger.info(`用户类型检测完成: ${this.currentUserType}`, {
      advancedFeatureCount,
      savedUserType
    }, 'LayeredSettingsManager');
  }

  /**
   * 生成智能推荐
   */
  private generateRecommendations(): void {
    const config = configManager.getAll();
    
    // 基于设备性能推荐设置
    const navigator = window.navigator as any;
    const deviceMemory = navigator.deviceMemory || 4;
    const hardwareConcurrency = navigator.hardwareConcurrency || 4;

    // 低端设备推荐
    if (deviceMemory < 4 || hardwareConcurrency < 4) {
      this.recommendations.set('enableAnimations', false);
      this.recommendations.set('targetFPS', 30);
      this.recommendations.set('size', 6);
    }

    // 高端设备推荐
    if (deviceMemory >= 8 && hardwareConcurrency >= 8) {
      this.recommendations.set('enableAnimations', true);
      this.recommendations.set('targetFPS', 60);
      this.recommendations.set('size', 10);
    }

    // 移动设备推荐
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
      this.recommendations.set('size', 6);
      this.recommendations.set('animationDuration', 200);
    }

    this.logger.debug('智能推荐已生成', Object.fromEntries(this.recommendations), 'LayeredSettingsManager');
  }

  /**
   * 获取当前用户类型
   */
  getCurrentUserType(): UserType {
    return this.currentUserType;
  }

  /**
   * 设置用户类型
   */
  setUserType(userType: UserType): void {
    this.currentUserType = userType;
    localStorage.setItem('userType', userType);
    
    this.logger.info(`用户类型已更新: ${userType}`, undefined, 'LayeredSettingsManager');
  }

  /**
   * 获取可见的设置分组
   */
  getVisibleGroups(): SettingGroup[] {
    const userLevel = this.getUserLevel();
    
    return this.settingGroups
      .filter(group => group.visibilityLevel <= userLevel)
      .map(group => ({
        ...group,
        items: group.items.filter(item => item.visibilityLevel <= userLevel)
      }));
  }

  /**
   * 获取用户级别
   */
  private getUserLevel(): VisibilityLevel {
    switch (this.currentUserType) {
      case UserType.BASIC:
        return VisibilityLevel.BASIC;
      case UserType.ADVANCED:
        return VisibilityLevel.ADVANCED;
      case UserType.DEVELOPER:
        return VisibilityLevel.DEVELOPER;
      default:
        return VisibilityLevel.BASIC;
    }
  }

  /**
   * 获取设置项的当前值
   */
  getSettingValue(category: keyof GameConfig, key: string): any {
    const config = configManager.get(category);
    return config[key as keyof typeof config];
  }

  /**
   * 设置设置项的值
   */
  setSettingValue(category: keyof GameConfig, key: string, value: any): boolean {
    const setting = this.findSetting(key);
    if (!setting) {
      this.logger.warn(`设置项未找到: ${key}`, undefined, 'LayeredSettingsManager');
      return false;
    }

    // 验证值
    if (setting.validation && !setting.validation(value)) {
      this.logger.warn(`设置值验证失败: ${key} = ${value}`, undefined, 'LayeredSettingsManager');
      return false;
    }

    // 更新配置
    const success = configManager.set(category, { [key]: value });
    
    if (success) {
      this.logger.info(`设置已更新: ${category}.${key} = ${value}`, undefined, 'LayeredSettingsManager');
    }

    return success;
  }

  /**
   * 查找设置项
   */
  private findSetting(key: string): SettingItem | null {
    for (const group of this.settingGroups) {
      const setting = group.items.find(item => item.key === key);
      if (setting) return setting;
    }
    return null;
  }

  /**
   * 获取推荐值
   */
  getRecommendation(key: string): any {
    return this.recommendations.get(key);
  }

  /**
   * 应用推荐设置
   */
  applyRecommendations(): void {
    let appliedCount = 0;

    for (const [key, value] of this.recommendations) {
      const setting = this.findSetting(key);
      if (setting) {
        const success = this.setSettingValue(setting.category, key, value);
        if (success) appliedCount++;
      }
    }

    this.logger.info(`已应用 ${appliedCount} 个推荐设置`, undefined, 'LayeredSettingsManager');
  }

  /**
   * 重置到默认设置
   */
  resetToDefaults(): void {
    configManager.reset();
    this.logger.info('设置已重置到默认值', undefined, 'LayeredSettingsManager');
  }

  /**
   * 导出设置
   */
  exportSettings(): string {
    return configManager.export();
  }

  /**
   * 导入设置
   */
  importSettings(settingsJson: string): boolean {
    const success = configManager.import(settingsJson);
    
    if (success) {
      this.logger.info('设置导入成功', undefined, 'LayeredSettingsManager');
    } else {
      this.logger.error('设置导入失败', undefined, 'LayeredSettingsManager');
    }

    return success;
  }

  /**
   * 获取设置统计信息
   */
  getSettingsStats(): {
    totalSettings: number;
    visibleSettings: number;
    userType: UserType;
    recommendationCount: number;
  } {
    const visibleGroups = this.getVisibleGroups();
    const visibleSettings = visibleGroups.reduce((sum, group) => sum + group.items.length, 0);
    const totalSettings = this.settingGroups.reduce((sum, group) => sum + group.items.length, 0);

    return {
      totalSettings,
      visibleSettings,
      userType: this.currentUserType,
      recommendationCount: this.recommendations.size
    };
  }
}

// 创建全局实例
export const layeredSettingsManager = LayeredSettingsManager.getInstance();

// 在开发环境中挂载到全局
environmentGuard.runInDevelopment(() => {
  (window as any).layeredSettingsManager = layeredSettingsManager;
  console.log('🎨 分层设置管理器已挂载到 window.layeredSettingsManager');
});
