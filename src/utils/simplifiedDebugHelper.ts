/**
 * 简化的调试助手
 * 提供清晰、易用的调试接口，降低复杂度
 */

import { Logger } from './logger';
import { environmentGuard } from './environmentGuard';
import { configManager } from './configManager';

// 调试级别
export enum DebugLevel {
  BASIC = 'basic',
  DETAILED = 'detailed',
  EXPERT = 'expert'
}

// 调试报告接口
export interface DebugReport {
  timestamp: string;
  level: DebugLevel;
  summary: string;
  sections: DebugSection[];
  recommendations: string[];
}

export interface DebugSection {
  title: string;
  status: 'success' | 'warning' | 'error' | 'info';
  items: DebugItem[];
}

export interface DebugItem {
  label: string;
  value: any;
  status?: 'success' | 'warning' | 'error';
  description?: string;
}

export class SimplifiedDebugHelper {
  private static instance: SimplifiedDebugHelper;
  private logger: Logger;
  private currentLevel: DebugLevel = DebugLevel.BASIC;

  private constructor() {
    this.logger = Logger.getInstance();
    this.detectDebugLevel();

    environmentGuard.runInDevelopment(() => {
      this.logger.debug('简化调试助手已初始化', { level: this.currentLevel }, 'SimplifiedDebugHelper');
    });
  }

  static getInstance(): SimplifiedDebugHelper {
    if (!SimplifiedDebugHelper.instance) {
      SimplifiedDebugHelper.instance = new SimplifiedDebugHelper();
    }
    return SimplifiedDebugHelper.instance;
  }

  /**
   * 检测调试级别
   */
  private detectDebugLevel(): void {
    const debugConfig = configManager.get('debug');
    
    if (!environmentGuard.isDevelopment()) {
      this.currentLevel = DebugLevel.BASIC;
    } else if (debugConfig.logLevel === 'verbose' || debugConfig.logLevel === 'debug') {
      this.currentLevel = DebugLevel.EXPERT;
    } else if (debugConfig.enableLogs) {
      this.currentLevel = DebugLevel.DETAILED;
    } else {
      this.currentLevel = DebugLevel.BASIC;
    }
  }

  /**
   * 快速健康检查
   */
  quickHealthCheck(): DebugReport {
    const sections: DebugSection[] = [];

    // 基础系统检查
    sections.push(this.checkBasicSystems());

    // 根据级别添加更多检查
    if (this.currentLevel !== DebugLevel.BASIC) {
      sections.push(this.checkPerformance());
      sections.push(this.checkConfiguration());
    }

    if (this.currentLevel === DebugLevel.EXPERT) {
      sections.push(this.checkAdvancedSystems());
    }

    const report: DebugReport = {
      timestamp: new Date().toISOString(),
      level: this.currentLevel,
      summary: this.generateSummary(sections),
      sections,
      recommendations: this.generateRecommendations(sections)
    };

    this.logger.info('快速健康检查完成', { 
      level: this.currentLevel,
      sectionsCount: sections.length,
      status: report.summary
    }, 'SimplifiedDebugHelper');

    return report;
  }

  /**
   * 检查基础系统
   */
  private checkBasicSystems(): DebugSection {
    const items: DebugItem[] = [];

    // 环境检查
    const envInfo = environmentGuard.getEnvironmentInfo();
    items.push({
      label: '运行环境',
      value: envInfo.isDevelopment ? '开发环境' : '生产环境',
      status: 'success'
    });

    // 配置管理器检查
    try {
      const config = configManager.getAll();
      items.push({
        label: '配置管理器',
        value: '正常',
        status: 'success',
        description: `已加载 ${Object.keys(config).length} 个配置节`
      });
    } catch (error) {
      items.push({
        label: '配置管理器',
        value: '异常',
        status: 'error',
        description: String(error)
      });
    }

    // 日志系统检查
    items.push({
      label: '日志系统',
      value: '正常',
      status: 'success'
    });

    // 浏览器兼容性检查
    const browserSupport = this.checkBrowserSupport();
    items.push({
      label: '浏览器支持',
      value: browserSupport.supported ? '完全支持' : '部分支持',
      status: browserSupport.supported ? 'success' : 'warning',
      description: browserSupport.issues.join(', ') || '所有功能正常'
    });

    return {
      title: '基础系统',
      status: items.every(item => item.status === 'success') ? 'success' : 'warning',
      items
    };
  }

  /**
   * 检查性能状态
   */
  private checkPerformance(): DebugSection {
    const items: DebugItem[] = [];

    // 内存使用检查
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const memoryUsage = (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100;
      
      items.push({
        label: '内存使用率',
        value: `${memoryUsage.toFixed(1)}%`,
        status: memoryUsage > 80 ? 'warning' : 'success',
        description: `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(1)}MB / ${(memory.totalJSHeapSize / 1024 / 1024).toFixed(1)}MB`
      });
    }

    // 性能时间检查
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigation) {
      const loadTime = navigation.loadEventEnd - navigation.navigationStart;
      items.push({
        label: '页面加载时间',
        value: `${loadTime.toFixed(0)}ms`,
        status: loadTime > 3000 ? 'warning' : 'success'
      });
    }

    // FPS检查（如果有性能监控器）
    if ((window as any).performanceMonitor) {
      const monitor = (window as any).performanceMonitor;
      const fps = monitor.getCurrentFPS ? monitor.getCurrentFPS() : 60;
      items.push({
        label: '当前帧率',
        value: `${fps.toFixed(1)} FPS`,
        status: fps < 30 ? 'error' : fps < 50 ? 'warning' : 'success'
      });
    }

    return {
      title: '性能状态',
      status: items.some(item => item.status === 'error') ? 'error' : 
              items.some(item => item.status === 'warning') ? 'warning' : 'success',
      items
    };
  }

  /**
   * 检查配置状态
   */
  private checkConfiguration(): DebugSection {
    const items: DebugItem[] = [];
    const config = configManager.getAll();

    // 游戏板配置检查
    const boardConfig = config.board;
    items.push({
      label: '游戏板尺寸',
      value: `${boardConfig.size}×${boardConfig.size}`,
      status: boardConfig.size >= 4 && boardConfig.size <= 12 ? 'success' : 'warning'
    });

    items.push({
      label: '方块类型数量',
      value: boardConfig.tileTypes,
      status: boardConfig.tileTypes >= 3 && boardConfig.tileTypes <= 8 ? 'success' : 'warning'
    });

    // 性能配置检查
    const perfConfig = config.performance;
    items.push({
      label: '性能优化',
      value: perfConfig.enableOptimizations ? '启用' : '禁用',
      status: perfConfig.enableOptimizations ? 'success' : 'info'
    });

    items.push({
      label: '目标帧率',
      value: `${perfConfig.targetFPS} FPS`,
      status: perfConfig.targetFPS >= 30 ? 'success' : 'warning'
    });

    // 音频配置检查
    const audioConfig = config.audio;
    items.push({
      label: '音频系统',
      value: audioConfig.enableSfx || audioConfig.enableBgm ? '启用' : '禁用',
      status: 'info'
    });

    return {
      title: '配置状态',
      status: items.some(item => item.status === 'warning') ? 'warning' : 'success',
      items
    };
  }

  /**
   * 检查高级系统
   */
  private checkAdvancedSystems(): DebugSection {
    const items: DebugItem[] = [];

    // 服务注册中心检查
    if ((window as any).serviceRegistry) {
      const registry = (window as any).serviceRegistry;
      const stats = registry.getServiceStats ? registry.getServiceStats() : null;
      
      if (stats) {
        items.push({
          label: '注册服务数量',
          value: stats.totalServices,
          status: 'success',
          description: `单例: ${stats.singletonServices}, 已初始化: ${stats.initializedSingletons}`
        });
      }
    }

    // 依赖注入容器检查
    if ((window as any).diContainer) {
      items.push({
        label: '依赖注入容器',
        value: '正常',
        status: 'success'
      });
    }

    // WebAssembly检查
    if ((window as any).wasmMatchDetector) {
      items.push({
        label: 'WebAssembly匹配器',
        value: '已加载',
        status: 'success'
      });
    }

    // 缓存系统检查
    if ((window as any).cacheManager) {
      const cacheManager = (window as any).cacheManager;
      const stats = cacheManager.getStats ? cacheManager.getStats() : null;
      
      if (stats) {
        items.push({
          label: '缓存命中率',
          value: `${(stats.hitRate * 100).toFixed(1)}%`,
          status: stats.hitRate > 0.8 ? 'success' : 'warning'
        });
      }
    }

    return {
      title: '高级系统',
      status: items.length > 0 ? 'success' : 'warning',
      items
    };
  }

  /**
   * 检查浏览器支持
   */
  private checkBrowserSupport(): { supported: boolean; issues: string[] } {
    const issues: string[] = [];

    // 检查关键API支持
    if (!window.requestAnimationFrame) {
      issues.push('不支持 requestAnimationFrame');
    }

    if (!window.localStorage) {
      issues.push('不支持 localStorage');
    }

    if (!window.fetch) {
      issues.push('不支持 Fetch API');
    }

    if (!window.Promise) {
      issues.push('不支持 Promise');
    }

    // 检查WebGL支持
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
      issues.push('不支持 WebGL');
    }

    // 检查Web Audio API支持
    if (!window.AudioContext && !(window as any).webkitAudioContext) {
      issues.push('不支持 Web Audio API');
    }

    return {
      supported: issues.length === 0,
      issues
    };
  }

  /**
   * 生成摘要
   */
  private generateSummary(sections: DebugSection[]): string {
    const errorCount = sections.filter(s => s.status === 'error').length;
    const warningCount = sections.filter(s => s.status === 'warning').length;

    if (errorCount > 0) {
      return `发现 ${errorCount} 个错误，${warningCount} 个警告`;
    } else if (warningCount > 0) {
      return `发现 ${warningCount} 个警告`;
    } else {
      return '所有系统正常';
    }
  }

  /**
   * 生成建议
   */
  private generateRecommendations(sections: DebugSection[]): string[] {
    const recommendations: string[] = [];

    for (const section of sections) {
      for (const item of section.items) {
        if (item.status === 'error') {
          recommendations.push(`修复 ${section.title} 中的 ${item.label} 问题`);
        } else if (item.status === 'warning') {
          recommendations.push(`检查 ${section.title} 中的 ${item.label} 配置`);
        }
      }
    }

    // 通用建议
    if (recommendations.length === 0) {
      recommendations.push('系统运行良好，建议定期进行健康检查');
    }

    return recommendations;
  }

  /**
   * 设置调试级别
   */
  setDebugLevel(level: DebugLevel): void {
    this.currentLevel = level;
    this.logger.info(`调试级别已设置为: ${level}`, undefined, 'SimplifiedDebugHelper');
  }

  /**
   * 获取当前调试级别
   */
  getDebugLevel(): DebugLevel {
    return this.currentLevel;
  }

  /**
   * 生成简化报告
   */
  generateSimpleReport(): string {
    const report = this.quickHealthCheck();
    
    let output = `=== 系统健康检查报告 ===\n`;
    output += `时间: ${new Date(report.timestamp).toLocaleString()}\n`;
    output += `级别: ${report.level}\n`;
    output += `状态: ${report.summary}\n\n`;

    for (const section of report.sections) {
      output += `${section.title} [${section.status.toUpperCase()}]\n`;
      for (const item of section.items) {
        const status = item.status ? `[${item.status.toUpperCase()}]` : '';
        output += `  - ${item.label}: ${item.value} ${status}\n`;
        if (item.description) {
          output += `    ${item.description}\n`;
        }
      }
      output += '\n';
    }

    if (report.recommendations.length > 0) {
      output += '建议:\n';
      for (const rec of report.recommendations) {
        output += `  - ${rec}\n`;
      }
    }

    return output;
  }

  /**
   * 一键诊断
   */
  oneClickDiagnosis(): void {
    console.group('🔍 一键系统诊断');
    
    const report = this.quickHealthCheck();
    
    console.log('📊 诊断摘要:', report.summary);
    console.log('⏰ 检查时间:', new Date(report.timestamp).toLocaleString());
    console.log('🎯 调试级别:', report.level);
    
    for (const section of report.sections) {
      const statusIcon = {
        success: '✅',
        warning: '⚠️',
        error: '❌',
        info: 'ℹ️'
      }[section.status];
      
      console.group(`${statusIcon} ${section.title}`);
      
      for (const item of section.items) {
        const itemIcon = item.status ? {
          success: '✅',
          warning: '⚠️',
          error: '❌'
        }[item.status] || 'ℹ️' : 'ℹ️';
        
        console.log(`${itemIcon} ${item.label}:`, item.value);
        if (item.description) {
          console.log(`   ${item.description}`);
        }
      }
      
      console.groupEnd();
    }
    
    if (report.recommendations.length > 0) {
      console.group('💡 建议');
      report.recommendations.forEach(rec => console.log(`• ${rec}`));
      console.groupEnd();
    }
    
    console.groupEnd();
  }

  /**
   * 性能快照
   */
  performanceSnapshot(): any {
    const snapshot = {
      timestamp: Date.now(),
      memory: null as any,
      timing: null as any,
      fps: null as any
    };

    // 内存信息
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      snapshot.memory = {
        used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(memory.totalJSHeapSize / 1024 / 1024),
        limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024)
      };
    }

    // 时间信息
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigation) {
      snapshot.timing = {
        loadTime: Math.round(navigation.loadEventEnd - navigation.navigationStart),
        domReady: Math.round(navigation.domContentLoadedEventEnd - navigation.navigationStart),
        firstPaint: Math.round(navigation.responseStart - navigation.navigationStart)
      };
    }

    // FPS信息
    if ((window as any).performanceMonitor) {
      const monitor = (window as any).performanceMonitor;
      snapshot.fps = monitor.getCurrentFPS ? Math.round(monitor.getCurrentFPS()) : null;
    }

    this.logger.info('性能快照已生成', snapshot, 'SimplifiedDebugHelper');
    return snapshot;
  }
}

// 创建全局实例
export const simplifiedDebugHelper = SimplifiedDebugHelper.getInstance();

// 在开发环境中挂载到全局
environmentGuard.runInDevelopment(() => {
  (window as any).simplifiedDebugHelper = simplifiedDebugHelper;
  
  // 添加便捷的全局方法
  (window as any).quickCheck = () => simplifiedDebugHelper.oneClickDiagnosis();
  (window as any).perfSnapshot = () => simplifiedDebugHelper.performanceSnapshot();
  
  console.log('🔍 简化调试助手已挂载到 window.simplifiedDebugHelper');
  console.log('💡 快捷命令: quickCheck() - 一键诊断, perfSnapshot() - 性能快照');
});
