/**
 * 开发效率工具
 * 提供简化的开发和调试工具，提升开发效率
 */

import { Logger } from './logger';
import { environmentGuard } from './environmentGuard';
import { configManager } from './configManager';
import { simplifiedDebugHelper } from './simplifiedDebugHelper';

// 工具类型
export enum ToolType {
  QUICK_TEST = 'quickTest',
  CONFIG_EDITOR = 'configEditor',
  PERFORMANCE_MONITOR = 'performanceMonitor',
  LOG_VIEWER = 'logViewer',
  SYSTEM_INFO = 'systemInfo'
}

// 工具配置
export interface ToolConfig {
  enabled: boolean;
  autoStart: boolean;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  minimized: boolean;
}

export class DevEfficiencyTools {
  private static instance: DevEfficiencyTools;
  private logger: Logger;
  private tools = new Map<ToolType, ToolConfig>();
  private toolElements = new Map<ToolType, HTMLElement>();
  private isInitialized = false;

  private constructor() {
    this.logger = Logger.getInstance();
    this.initializeToolConfigs();

    environmentGuard.runInDevelopment(() => {
      this.logger.debug('开发效率工具已初始化', undefined, 'DevEfficiencyTools');
    });
  }

  static getInstance(): DevEfficiencyTools {
    if (!DevEfficiencyTools.instance) {
      DevEfficiencyTools.instance = new DevEfficiencyTools();
    }
    return DevEfficiencyTools.instance;
  }

  /**
   * 初始化工具配置
   */
  private initializeToolConfigs(): void {
    const defaultConfig: ToolConfig = {
      enabled: true,
      autoStart: false,
      position: 'top-right',
      minimized: true
    };

    this.tools.set(ToolType.QUICK_TEST, { ...defaultConfig });
    this.tools.set(ToolType.CONFIG_EDITOR, { ...defaultConfig, position: 'top-left' });
    this.tools.set(ToolType.PERFORMANCE_MONITOR, { ...defaultConfig, position: 'bottom-right' });
    this.tools.set(ToolType.LOG_VIEWER, { ...defaultConfig, position: 'bottom-left' });
    this.tools.set(ToolType.SYSTEM_INFO, { ...defaultConfig, autoStart: true });
  }

  /**
   * 初始化开发工具
   */
  initialize(): void {
    if (this.isInitialized || !environmentGuard.isDevelopment()) {
      return;
    }

    this.createToolbar();
    this.createTools();
    this.setupKeyboardShortcuts();
    this.isInitialized = true;

    this.logger.info('开发效率工具已启动', undefined, 'DevEfficiencyTools');
  }

  /**
   * 创建工具栏
   */
  private createToolbar(): void {
    const toolbar = document.createElement('div');
    toolbar.id = 'dev-efficiency-toolbar';
    toolbar.innerHTML = `
      <div class="toolbar-header">
        <span class="toolbar-title">🔧 开发工具</span>
        <button class="toolbar-toggle" onclick="window.devEfficiencyTools.toggleToolbar()">−</button>
      </div>
      <div class="toolbar-content">
        <button class="tool-btn" onclick="window.devEfficiencyTools.quickDiagnosis()" title="快速诊断 (Ctrl+Shift+D)">
          🔍 诊断
        </button>
        <button class="tool-btn" onclick="window.devEfficiencyTools.toggleTool('configEditor')" title="配置编辑器">
          ⚙️ 配置
        </button>
        <button class="tool-btn" onclick="window.devEfficiencyTools.toggleTool('performanceMonitor')" title="性能监控">
          📊 性能
        </button>
        <button class="tool-btn" onclick="window.devEfficiencyTools.toggleTool('logViewer')" title="日志查看器">
          📝 日志
        </button>
        <button class="tool-btn" onclick="window.devEfficiencyTools.clearCache()" title="清理缓存">
          🗑️ 清理
        </button>
        <button class="tool-btn" onclick="window.devEfficiencyTools.exportDebugInfo()" title="导出调试信息">
          📤 导出
        </button>
      </div>
    `;

    this.applyToolbarStyles(toolbar);
    document.body.appendChild(toolbar);
  }

  /**
   * 应用工具栏样式
   */
  private applyToolbarStyles(toolbar: HTMLElement): void {
    const style = document.createElement('style');
    style.textContent = `
      #dev-efficiency-toolbar {
        position: fixed;
        top: 10px;
        right: 10px;
        background: rgba(0, 0, 0, 0.9);
        color: white;
        border-radius: 8px;
        padding: 10px;
        font-family: monospace;
        font-size: 12px;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        backdrop-filter: blur(10px);
        min-width: 200px;
      }

      .toolbar-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
        padding-bottom: 8px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.2);
      }

      .toolbar-title {
        font-weight: bold;
      }

      .toolbar-toggle {
        background: none;
        border: none;
        color: white;
        cursor: pointer;
        font-size: 16px;
        padding: 0;
        width: 20px;
        height: 20px;
      }

      .toolbar-content {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 5px;
      }

      .tool-btn {
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: white;
        padding: 8px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 11px;
        transition: all 0.2s ease;
      }

      .tool-btn:hover {
        background: rgba(255, 255, 255, 0.2);
        transform: translateY(-1px);
      }

      .dev-tool-panel {
        position: fixed;
        background: rgba(0, 0, 0, 0.95);
        color: white;
        border-radius: 8px;
        padding: 15px;
        font-family: monospace;
        font-size: 12px;
        z-index: 9999;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        backdrop-filter: blur(10px);
        max-width: 400px;
        max-height: 300px;
        overflow: auto;
      }

      .panel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
        padding-bottom: 8px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.2);
      }

      .panel-close {
        background: none;
        border: none;
        color: white;
        cursor: pointer;
        font-size: 16px;
      }

      .config-item {
        margin-bottom: 10px;
      }

      .config-label {
        display: block;
        margin-bottom: 3px;
        font-weight: bold;
      }

      .config-input {
        width: 100%;
        padding: 4px;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: white;
        border-radius: 3px;
      }

      .log-entry {
        margin-bottom: 5px;
        padding: 3px;
        border-left: 3px solid #666;
        padding-left: 8px;
      }

      .log-entry.error { border-left-color: #ff4444; }
      .log-entry.warn { border-left-color: #ffaa00; }
      .log-entry.info { border-left-color: #4488ff; }
      .log-entry.debug { border-left-color: #888; }
    `;
    document.head.appendChild(style);
  }

  /**
   * 创建工具面板
   */
  private createTools(): void {
    // 这里可以根据需要创建各种工具面板
    // 当前先创建基础框架
  }

  /**
   * 设置键盘快捷键
   */
  private setupKeyboardShortcuts(): void {
    document.addEventListener('keydown', (e) => {
      // Ctrl+Shift+D: 快速诊断
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        this.quickDiagnosis();
      }

      // Ctrl+Shift+C: 清理缓存
      if (e.ctrlKey && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        this.clearCache();
      }

      // Ctrl+Shift+E: 导出调试信息
      if (e.ctrlKey && e.shiftKey && e.key === 'E') {
        e.preventDefault();
        this.exportDebugInfo();
      }

      // Ctrl+Shift+H: 显示/隐藏工具栏
      if (e.ctrlKey && e.shiftKey && e.key === 'H') {
        e.preventDefault();
        this.toggleToolbar();
      }
    });
  }

  /**
   * 快速诊断
   */
  quickDiagnosis(): void {
    simplifiedDebugHelper.oneClickDiagnosis();
    
    // 显示简化的诊断结果
    const report = simplifiedDebugHelper.quickHealthCheck();
    this.showNotification(`系统诊断完成: ${report.summary}`, 'info');
  }

  /**
   * 切换工具
   */
  toggleTool(toolType: string): void {
    const type = toolType as ToolType;
    
    switch (type) {
      case ToolType.CONFIG_EDITOR:
        this.showConfigEditor();
        break;
      case ToolType.PERFORMANCE_MONITOR:
        this.showPerformanceMonitor();
        break;
      case ToolType.LOG_VIEWER:
        this.showLogViewer();
        break;
      default:
        this.logger.warn(`未知工具类型: ${toolType}`, undefined, 'DevEfficiencyTools');
    }
  }

  /**
   * 显示配置编辑器
   */
  private showConfigEditor(): void {
    const existing = document.getElementById('config-editor-panel');
    if (existing) {
      existing.remove();
      return;
    }

    const panel = document.createElement('div');
    panel.id = 'config-editor-panel';
    panel.className = 'dev-tool-panel';
    panel.style.top = '60px';
    panel.style.left = '10px';

    const config = configManager.getAll();
    
    panel.innerHTML = `
      <div class="panel-header">
        <span>⚙️ 配置编辑器</span>
        <button class="panel-close" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
      <div class="config-item">
        <label class="config-label">游戏板尺寸:</label>
        <input class="config-input" type="number" value="${config.board.size}" min="4" max="12" 
               onchange="window.devEfficiencyTools.updateConfig('board', 'size', parseInt(this.value))">
      </div>
      <div class="config-item">
        <label class="config-label">方块类型:</label>
        <input class="config-input" type="number" value="${config.board.tileTypes}" min="3" max="8"
               onchange="window.devEfficiencyTools.updateConfig('board', 'tileTypes', parseInt(this.value))">
      </div>
      <div class="config-item">
        <label class="config-label">目标帧率:</label>
        <select class="config-input" onchange="window.devEfficiencyTools.updateConfig('performance', 'targetFPS', parseInt(this.value))">
          <option value="30" ${config.performance.targetFPS === 30 ? 'selected' : ''}>30 FPS</option>
          <option value="45" ${config.performance.targetFPS === 45 ? 'selected' : ''}>45 FPS</option>
          <option value="60" ${config.performance.targetFPS === 60 ? 'selected' : ''}>60 FPS</option>
        </select>
      </div>
      <div class="config-item">
        <label class="config-label">
          <input type="checkbox" ${config.ui.enableAnimations ? 'checked' : ''}
                 onchange="window.devEfficiencyTools.updateConfig('ui', 'enableAnimations', this.checked)">
          启用动画
        </label>
      </div>
    `;

    document.body.appendChild(panel);
  }

  /**
   * 显示性能监控器
   */
  private showPerformanceMonitor(): void {
    const existing = document.getElementById('performance-monitor-panel');
    if (existing) {
      existing.remove();
      return;
    }

    const panel = document.createElement('div');
    panel.id = 'performance-monitor-panel';
    panel.className = 'dev-tool-panel';
    panel.style.bottom = '10px';
    panel.style.right = '10px';

    const snapshot = simplifiedDebugHelper.performanceSnapshot();
    
    panel.innerHTML = `
      <div class="panel-header">
        <span>📊 性能监控</span>
        <button class="panel-close" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
      <div>FPS: ${snapshot.fps || 'N/A'}</div>
      <div>内存: ${snapshot.memory ? `${snapshot.memory.used}MB / ${snapshot.memory.total}MB` : 'N/A'}</div>
      <div>加载时间: ${snapshot.timing ? `${snapshot.timing.loadTime}ms` : 'N/A'}</div>
      <button class="tool-btn" onclick="window.devEfficiencyTools.refreshPerformanceMonitor()" style="margin-top: 10px; width: 100%;">
        🔄 刷新
      </button>
    `;

    document.body.appendChild(panel);
  }

  /**
   * 显示日志查看器
   */
  private showLogViewer(): void {
    const existing = document.getElementById('log-viewer-panel');
    if (existing) {
      existing.remove();
      return;
    }

    const panel = document.createElement('div');
    panel.id = 'log-viewer-panel';
    panel.className = 'dev-tool-panel';
    panel.style.bottom = '10px';
    panel.style.left = '10px';

    panel.innerHTML = `
      <div class="panel-header">
        <span>📝 日志查看器</span>
        <button class="panel-close" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
      <div id="log-content" style="max-height: 200px; overflow-y: auto;">
        <div class="log-entry info">日志查看器已启动</div>
      </div>
      <button class="tool-btn" onclick="window.devEfficiencyTools.clearLogs()" style="margin-top: 10px; width: 100%;">
        🗑️ 清空日志
      </button>
    `;

    document.body.appendChild(panel);
  }

  /**
   * 更新配置
   */
  updateConfig(category: string, key: string, value: any): void {
    const success = configManager.set(category as any, { [key]: value });
    if (success) {
      this.showNotification(`配置已更新: ${category}.${key} = ${value}`, 'success');
    } else {
      this.showNotification(`配置更新失败: ${category}.${key}`, 'error');
    }
  }

  /**
   * 刷新性能监控器
   */
  refreshPerformanceMonitor(): void {
    const panel = document.getElementById('performance-monitor-panel');
    if (panel) {
      panel.remove();
      this.showPerformanceMonitor();
    }
  }

  /**
   * 清空日志
   */
  clearLogs(): void {
    const logContent = document.getElementById('log-content');
    if (logContent) {
      logContent.innerHTML = '<div class="log-entry info">日志已清空</div>';
    }
  }

  /**
   * 清理缓存
   */
  clearCache(): void {
    try {
      localStorage.clear();
      sessionStorage.clear();
      
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => caches.delete(name));
        });
      }

      this.showNotification('缓存已清理', 'success');
      this.logger.info('缓存清理完成', undefined, 'DevEfficiencyTools');
    } catch (error) {
      this.showNotification('缓存清理失败', 'error');
      this.logger.error('缓存清理失败', error, 'DevEfficiencyTools');
    }
  }

  /**
   * 导出调试信息
   */
  exportDebugInfo(): void {
    const debugInfo = {
      timestamp: new Date().toISOString(),
      environment: environmentGuard.getEnvironmentInfo(),
      config: configManager.getAll(),
      healthCheck: simplifiedDebugHelper.quickHealthCheck(),
      performance: simplifiedDebugHelper.performanceSnapshot(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    const blob = new Blob([JSON.stringify(debugInfo, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `debug-info-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    this.showNotification('调试信息已导出', 'success');
  }

  /**
   * 切换工具栏
   */
  toggleToolbar(): void {
    const toolbar = document.getElementById('dev-efficiency-toolbar');
    const content = toolbar?.querySelector('.toolbar-content') as HTMLElement;
    const toggle = toolbar?.querySelector('.toolbar-toggle') as HTMLElement;
    
    if (content && toggle) {
      if (content.style.display === 'none') {
        content.style.display = 'grid';
        toggle.textContent = '−';
      } else {
        content.style.display = 'none';
        toggle.textContent = '+';
      }
    }
  }

  /**
   * 显示通知
   */
  private showNotification(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 50px;
      right: 10px;
      background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
      color: white;
      padding: 10px 15px;
      border-radius: 4px;
      z-index: 10001;
      font-family: monospace;
      font-size: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  /**
   * 销毁工具
   */
  destroy(): void {
    // 移除工具栏
    const toolbar = document.getElementById('dev-efficiency-toolbar');
    if (toolbar) {
      toolbar.remove();
    }

    // 移除所有工具面板
    this.toolElements.forEach((element) => {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
    });

    this.toolElements.clear();
    this.isInitialized = false;

    this.logger.info('开发效率工具已销毁', undefined, 'DevEfficiencyTools');
  }
}

// 创建全局实例
export const devEfficiencyTools = DevEfficiencyTools.getInstance();

// 在开发环境中挂载到全局
environmentGuard.runInDevelopment(() => {
  (window as any).devEfficiencyTools = devEfficiencyTools;
  console.log('🔧 开发效率工具已挂载到 window.devEfficiencyTools');
});
