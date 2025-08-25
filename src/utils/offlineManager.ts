/**
 * 离线游戏模式管理器
 * 提供离线游戏功能、数据同步、状态恢复等功能
 */

import { performanceMonitor } from './performanceMonitor';

/**
 * 离线游戏状态接口
 */
export interface OfflineGameState {
  gameBoard: any[][];
  score: number;
  level: number;
  moves: number;
  timestamp: number;
  version: string;
}

/**
 * 同步状态接口
 */
export interface SyncStatus {
  lastSync: number;
  pendingChanges: number;
  syncInProgress: boolean;
  lastError?: string;
}

/**
 * 离线配置接口
 */
export interface OfflineConfig {
  enableOfflineMode: boolean;
  autoSave: boolean;
  saveInterval: number; // 自动保存间隔（毫秒）
  maxSaveStates: number; // 最大保存状态数
  syncOnReconnect: boolean; // 重连时自动同步
}

/**
 * 离线游戏模式管理器类
 */
export class OfflineManager {
  private static instance: OfflineManager;
  private isOnline: boolean = navigator.onLine;
  private config: OfflineConfig = {
    enableOfflineMode: true,
    autoSave: true,
    saveInterval: 30000, // 30秒
    maxSaveStates: 10,
    syncOnReconnect: true
  };
  
  private saveTimer: number | null = null;
  private pendingChanges: any[] = [];
  private syncStatus: SyncStatus = {
    lastSync: 0,
    pendingChanges: 0,
    syncInProgress: false
  };
  
  // 性能统计
  private stats = {
    offlineTime: 0,
    saveOperations: 0,
    loadOperations: 0,
    syncOperations: 0,
    dataSize: 0,
    lastOfflineStart: 0
  };

  private constructor() {
    this.initOfflineSupport();
    this.setupEventListeners();
  }

  static getInstance(): OfflineManager {
    if (!OfflineManager.instance) {
      OfflineManager.instance = new OfflineManager();
    }
    return OfflineManager.instance;
  }

  /**
   * 初始化离线支持
   */
  private initOfflineSupport(): void {
    // 检查IndexedDB支持
    if (!('indexedDB' in window)) {
      console.warn('⚠️ IndexedDB不支持，离线功能受限');
      this.config.enableOfflineMode = false;
      return;
    }

    // 初始化数据库
    this.initDatabase();
    
    // 启动自动保存
    if (this.config.autoSave) {
      this.startAutoSave();
    }
    
    console.log('🔌 离线游戏模式已初始化');
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    // 监听网络状态变化
    window.addEventListener('online', () => {
      this.onNetworkOnline();
    });

    window.addEventListener('offline', () => {
      this.onNetworkOffline();
    });

    // 监听页面卸载
    window.addEventListener('beforeunload', () => {
      this.onPageUnload();
    });

    // 监听页面可见性变化
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.saveCurrentState();
      }
    });
  }

  /**
   * 网络上线处理
   */
  private onNetworkOnline(): void {
    console.log('🌐 网络已连接');
    this.isOnline = true;
    
    // 记录离线时间
    if (this.stats.lastOfflineStart > 0) {
      this.stats.offlineTime += Date.now() - this.stats.lastOfflineStart;
      this.stats.lastOfflineStart = 0;
    }
    
    // 自动同步
    if (this.config.syncOnReconnect && this.pendingChanges.length > 0) {
      this.syncPendingChanges();
    }
  }

  /**
   * 网络离线处理
   */
  private onNetworkOffline(): void {
    console.log('🔌 网络已断开，启用离线模式');
    this.isOnline = false;
    this.stats.lastOfflineStart = Date.now();
    
    // 立即保存当前状态
    this.saveCurrentState();
  }

  /**
   * 页面卸载处理
   */
  private onPageUnload(): void {
    // 同步保存当前状态
    this.saveCurrentState();
  }

  /**
   * 初始化数据库
   */
  private async initDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('GameOfflineDB', 1);
      
      request.onerror = () => {
        console.error('❌ 离线数据库初始化失败');
        reject(request.error);
      };
      
      request.onsuccess = () => {
        console.log('✅ 离线数据库初始化成功');
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // 创建游戏状态存储
        if (!db.objectStoreNames.contains('gameStates')) {
          const gameStore = db.createObjectStore('gameStates', { keyPath: 'id', autoIncrement: true });
          gameStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
        
        // 创建待同步数据存储
        if (!db.objectStoreNames.contains('pendingSync')) {
          const syncStore = db.createObjectStore('pendingSync', { keyPath: 'id', autoIncrement: true });
          syncStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  /**
   * 保存游戏状态
   */
  async saveGameState(gameState: OfflineGameState): Promise<boolean> {
    if (!this.config.enableOfflineMode) {
      return false;
    }

    try {
      performanceMonitor.startTimer('saveGameState');
      
      const db = await this.openDatabase();
      const transaction = db.transaction(['gameStates'], 'readwrite');
      const store = transaction.objectStore('gameStates');
      
      const stateWithId = {
        ...gameState,
        timestamp: Date.now(),
        version: '1.0.0'
      };
      
      await new Promise((resolve, reject) => {
        const request = store.add(stateWithId);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
      // 清理旧状态
      await this.cleanupOldStates(store);
      
      const duration = performanceMonitor.endTimer('saveGameState');
      this.stats.saveOperations++;
      this.stats.dataSize = JSON.stringify(stateWithId).length;
      
      console.log(`💾 游戏状态已保存, 耗时: ${duration.toFixed(2)}ms`);
      return true;
      
    } catch (error) {
      console.error('❌ 保存游戏状态失败:', error);
      return false;
    }
  }

  /**
   * 加载最新游戏状态
   */
  async loadLatestGameState(): Promise<OfflineGameState | null> {
    if (!this.config.enableOfflineMode) {
      return null;
    }

    try {
      performanceMonitor.startTimer('loadGameState');
      
      const db = await this.openDatabase();
      const transaction = db.transaction(['gameStates'], 'readonly');
      const store = transaction.objectStore('gameStates');
      const index = store.index('timestamp');
      
      const states = await new Promise<OfflineGameState[]>((resolve, reject) => {
        const request = index.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
      const duration = performanceMonitor.endTimer('loadGameState');
      this.stats.loadOperations++;
      
      if (states.length > 0) {
        const latestState = states[states.length - 1];
        console.log(`📂 游戏状态已加载, 耗时: ${duration.toFixed(2)}ms`);
        return latestState;
      }
      
      return null;
      
    } catch (error) {
      console.error('❌ 加载游戏状态失败:', error);
      return null;
    }
  }

  /**
   * 获取所有保存的游戏状态
   */
  async getAllGameStates(): Promise<OfflineGameState[]> {
    if (!this.config.enableOfflineMode) {
      return [];
    }

    try {
      const db = await this.openDatabase();
      const transaction = db.transaction(['gameStates'], 'readonly');
      const store = transaction.objectStore('gameStates');
      const index = store.index('timestamp');
      
      return new Promise((resolve, reject) => {
        const request = index.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
    } catch (error) {
      console.error('❌ 获取游戏状态失败:', error);
      return [];
    }
  }

  /**
   * 删除游戏状态
   */
  async deleteGameState(id: number): Promise<boolean> {
    try {
      const db = await this.openDatabase();
      const transaction = db.transaction(['gameStates'], 'readwrite');
      const store = transaction.objectStore('gameStates');
      
      await new Promise((resolve, reject) => {
        const request = store.delete(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
      console.log(`🗑️ 游戏状态已删除: ${id}`);
      return true;
      
    } catch (error) {
      console.error('❌ 删除游戏状态失败:', error);
      return false;
    }
  }

  /**
   * 启动自动保存
   */
  private startAutoSave(): void {
    if (this.saveTimer) {
      clearInterval(this.saveTimer);
    }
    
    this.saveTimer = window.setInterval(() => {
      this.saveCurrentState();
    }, this.config.saveInterval);
    
    console.log(`⏰ 自动保存已启动，间隔: ${this.config.saveInterval / 1000}秒`);
  }

  /**
   * 停止自动保存
   */
  private stopAutoSave(): void {
    if (this.saveTimer) {
      clearInterval(this.saveTimer);
      this.saveTimer = null;
      console.log('⏰ 自动保存已停止');
    }
  }

  /**
   * 保存当前状态
   */
  private saveCurrentState(): void {
    // 这里需要从游戏组件获取当前状态
    // 暂时使用模拟数据
    const currentState: OfflineGameState = {
      gameBoard: [],
      score: 0,
      level: 1,
      moves: 0,
      timestamp: Date.now(),
      version: '1.0.0'
    };
    
    this.saveGameState(currentState);
  }

  /**
   * 同步待处理的变更
   */
  private async syncPendingChanges(): Promise<void> {
    if (this.syncStatus.syncInProgress || this.pendingChanges.length === 0) {
      return;
    }

    this.syncStatus.syncInProgress = true;
    this.syncStatus.pendingChanges = this.pendingChanges.length;
    
    try {
      console.log(`🔄 开始同步 ${this.pendingChanges.length} 个待处理变更...`);
      
      // 这里实现实际的同步逻辑
      // 暂时模拟同步过程
      await this.sleep(1000);
      
      this.pendingChanges = [];
      this.syncStatus.lastSync = Date.now();
      this.syncStatus.pendingChanges = 0;
      this.stats.syncOperations++;
      
      console.log('✅ 数据同步完成');
      
    } catch (error) {
      console.error('❌ 数据同步失败:', error);
      this.syncStatus.lastError = error instanceof Error ? error.message : '同步失败';
    } finally {
      this.syncStatus.syncInProgress = false;
    }
  }

  /**
   * 清理旧状态
   */
  private async cleanupOldStates(store: IDBObjectStore): Promise<void> {
    const index = store.index('timestamp');
    const states = await new Promise<any[]>((resolve, reject) => {
      const request = index.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    
    if (states.length > this.config.maxSaveStates) {
      const toDelete = states.slice(0, states.length - this.config.maxSaveStates);
      
      for (const state of toDelete) {
        await new Promise<void>((resolve, reject) => {
          const request = store.delete(state.id);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      }
      
      console.log(`🧹 清理了 ${toDelete.length} 个旧游戏状态`);
    }
  }

  /**
   * 打开数据库
   */
  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('GameOfflineDB', 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 睡眠函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取离线状态
   */
  getOfflineStatus() {
    return {
      isOnline: this.isOnline,
      offlineModeEnabled: this.config.enableOfflineMode,
      autoSaveEnabled: this.config.autoSave,
      syncStatus: this.syncStatus,
      stats: this.stats
    };
  }

  /**
   * 获取性能统计
   */
  getStats() {
    return {
      ...this.stats,
      isOnline: this.isOnline,
      offlineModeEnabled: this.config.enableOfflineMode,
      pendingChanges: this.pendingChanges.length,
      syncStatus: this.syncStatus
    };
  }

  /**
   * 打印离线管理器统计
   */
  printStats(): void {
    const stats = this.getStats();
    
    console.group('🔌 离线管理器统计');
    console.log(`网络状态: ${stats.isOnline ? '🌐 在线' : '🔌 离线'}`);
    console.log(`离线模式: ${stats.offlineModeEnabled ? '✅ 启用' : '❌ 禁用'}`);
    console.log(`离线时间: ${(stats.offlineTime / 1000 / 60).toFixed(1)}分钟`);
    console.log(`保存操作: ${stats.saveOperations}`);
    console.log(`加载操作: ${stats.loadOperations}`);
    console.log(`同步操作: ${stats.syncOperations}`);
    console.log(`数据大小: ${(stats.dataSize / 1024).toFixed(2)}KB`);
    console.log(`待处理变更: ${stats.pendingChanges}`);
    console.log(`上次同步: ${stats.syncStatus.lastSync > 0 ? new Date(stats.syncStatus.lastSync).toLocaleString() : '从未同步'}`);
    console.groupEnd();
  }

  /**
   * 配置离线管理器
   */
  configure(config: Partial<OfflineConfig>): void {
    this.config = { ...this.config, ...config };
    
    if (config.autoSave !== undefined) {
      if (config.autoSave) {
        this.startAutoSave();
      } else {
        this.stopAutoSave();
      }
    }
    
    console.log('⚙️ 离线管理器配置已更新:', this.config);
  }
}

/**
 * 全局离线管理器实例
 */
export const offlineManager = OfflineManager.getInstance();

// 在开发环境中挂载到全局
if (import.meta.env.DEV) {
  (window as any).offlineManager = offlineManager;
  console.log('🔌 离线管理器已挂载到 window.offlineManager');
}
