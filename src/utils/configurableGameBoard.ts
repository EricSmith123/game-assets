/**
 * 可配置游戏板系统
 * 支持动态尺寸、自定义规则和扩展性
 */

import type { GameTile } from '@/types/game';
import { configManager } from './configManager';
import { environmentGuard } from './environmentGuard';
import { Logger } from './logger';

// 游戏板配置接口
export interface BoardConfig {
  width: number;
  height: number;
  tileTypes: number;
  minMatchLength: number;
  maxMatchLength?: number;
  allowDiagonalMatches?: boolean;
  enableSpecialTiles?: boolean;
  customRules?: BoardRule[];
}

// 游戏板规则接口
export interface BoardRule {
  name: string;
  description: string;
  validator: (board: GameTile[][], config: BoardConfig) => boolean;
  modifier?: (board: GameTile[][], config: BoardConfig) => GameTile[][];
}

// 游戏板事件接口
export interface BoardEvent {
  type: 'resize' | 'tileChange' | 'match' | 'clear' | 'shuffle';
  data: any;
  timestamp: number;
}

// 游戏板统计信息
export interface BoardStats {
  totalTiles: number;
  tileTypeDistribution: Record<number, number>;
  emptyTiles: number;
  possibleMatches: number;
  averageMatchLength: number;
}

export class ConfigurableGameBoard {
  private config: BoardConfig;
  private tiles: GameTile[][];
  private logger: Logger;
  private eventListeners = new Map<string, Function[]>();
  private boardHistory: GameTile[][][] = [];
  private maxHistorySize = 10;

  constructor(config?: Partial<BoardConfig>) {
    this.logger = Logger.getInstance();
    this.config = this.mergeWithDefaultConfig(config);
    this.tiles = [];
    this.initializeBoard();
    
    // 订阅配置变更
    this.subscribeToConfigChanges();
    
    environmentGuard.runInDevelopment(() => {
      this.logger.debug('可配置游戏板已创建', this.config, 'ConfigurableGameBoard');
    });
  }

  /**
   * 合并默认配置
   */
  private mergeWithDefaultConfig(userConfig?: Partial<BoardConfig>): BoardConfig {
    const defaultConfig = configManager.get('board');
    
    const config: BoardConfig = {
      width: userConfig?.width || defaultConfig.size,
      height: userConfig?.height || defaultConfig.size,
      tileTypes: userConfig?.tileTypes || defaultConfig.tileTypes,
      minMatchLength: userConfig?.minMatchLength || defaultConfig.minMatchLength || 3,
      maxMatchLength: userConfig?.maxMatchLength || 8,
      allowDiagonalMatches: userConfig?.allowDiagonalMatches || false,
      enableSpecialTiles: userConfig?.enableSpecialTiles || false,
      customRules: userConfig?.customRules || []
    };

    // 验证配置
    this.validateConfig(config);
    
    return config;
  }

  /**
   * 验证配置
   */
  private validateConfig(config: BoardConfig): void {
    if (config.width < 4 || config.width > 12) {
      throw new Error('游戏板宽度必须在4-12之间');
    }
    
    if (config.height < 4 || config.height > 12) {
      throw new Error('游戏板高度必须在4-12之间');
    }
    
    if (config.tileTypes < 3 || config.tileTypes > 8) {
      throw new Error('方块类型数量必须在3-8之间');
    }
    
    if (config.minMatchLength < 3 || config.minMatchLength > 6) {
      throw new Error('最小匹配长度必须在3-6之间');
    }

    if (config.maxMatchLength && config.maxMatchLength < config.minMatchLength) {
      throw new Error('最大匹配长度不能小于最小匹配长度');
    }
  }

  /**
   * 订阅配置变更
   */
  private subscribeToConfigChanges(): void {
    configManager.subscribe('board', (newConfig) => {
      const oldConfig = { ...this.config };
      
      // 更新配置
      this.config.width = newConfig.size;
      this.config.height = newConfig.size;
      this.config.tileTypes = newConfig.tileTypes;
      this.config.minMatchLength = newConfig.minMatchLength || 3;
      
      // 如果尺寸发生变化，重新初始化游戏板
      if (oldConfig.width !== this.config.width || oldConfig.height !== this.config.height) {
        this.resize(this.config.width, this.config.height);
      }
      
      // 如果方块类型数量发生变化，重新生成游戏板
      if (oldConfig.tileTypes !== this.config.tileTypes) {
        this.regenerateBoard();
      }
      
      this.logger.info('游戏板配置已更新', { oldConfig, newConfig: this.config }, 'ConfigurableGameBoard');
    });
  }

  /**
   * 初始化游戏板
   */
  private initializeBoard(): void {
    this.tiles = Array(this.config.height).fill(null).map(() =>
      Array(this.config.width).fill(null).map(() => this.createRandomTile())
    );
    
    // 确保没有初始匹配
    this.removeInitialMatches();
    
    // 保存到历史记录
    this.saveToHistory();
    
    this.emitEvent('clear', { config: this.config });
    
    this.logger.info(`游戏板已初始化: ${this.config.width}×${this.config.height}`, 
      this.getStats(), 'ConfigurableGameBoard');
  }

  /**
   * 创建随机方块
   */
  private createRandomTile(): GameTile {
    return {
      id: Math.random().toString(36).substr(2, 9),
      type: Math.floor(Math.random() * this.config.tileTypes) + 1,
      x: 0, // 将在放置时设置
      y: 0, // 将在放置时设置
      matched: false,
      falling: false,
      removing: false
    };
  }

  /**
   * 移除初始匹配
   */
  private removeInitialMatches(): void {
    let hasMatches = true;
    let attempts = 0;
    const maxAttempts = 100;
    
    while (hasMatches && attempts < maxAttempts) {
      hasMatches = false;
      
      for (let row = 0; row < this.config.height; row++) {
        for (let col = 0; col < this.config.width; col++) {
          if (this.hasMatchAt(row, col)) {
            this.tiles[row][col] = this.createRandomTile();
            this.tiles[row][col].x = col;
            this.tiles[row][col].y = row;
            hasMatches = true;
          }
        }
      }
      
      attempts++;
    }
    
    if (attempts >= maxAttempts) {
      this.logger.warn('无法完全移除初始匹配，可能存在少量匹配', undefined, 'ConfigurableGameBoard');
    }
  }

  /**
   * 检查指定位置是否有匹配
   */
  private hasMatchAt(row: number, col: number): boolean {
    const tile = this.tiles[row][col];
    if (!tile) return false;
    
    // 检查水平匹配
    let horizontalCount = 1;
    
    // 向左检查
    for (let c = col - 1; c >= 0 && this.tiles[row][c]?.type === tile.type; c--) {
      horizontalCount++;
    }
    
    // 向右检查
    for (let c = col + 1; c < this.config.width && this.tiles[row][c]?.type === tile.type; c++) {
      horizontalCount++;
    }
    
    if (horizontalCount >= this.config.minMatchLength) {
      return true;
    }
    
    // 检查垂直匹配
    let verticalCount = 1;
    
    // 向上检查
    for (let r = row - 1; r >= 0 && this.tiles[r][col]?.type === tile.type; r--) {
      verticalCount++;
    }
    
    // 向下检查
    for (let r = row + 1; r < this.config.height && this.tiles[r][col]?.type === tile.type; r++) {
      verticalCount++;
    }
    
    if (verticalCount >= this.config.minMatchLength) {
      return true;
    }
    
    // 如果启用对角线匹配，检查对角线
    if (this.config.allowDiagonalMatches) {
      return this.hasDiagonalMatchAt(row, col);
    }
    
    return false;
  }

  /**
   * 检查对角线匹配
   */
  private hasDiagonalMatchAt(row: number, col: number): boolean {
    const tile = this.tiles[row][col];
    if (!tile) return false;
    
    // 检查主对角线（左上到右下）
    let mainDiagonalCount = 1;
    
    // 向左上检查
    for (let i = 1; row - i >= 0 && col - i >= 0 && this.tiles[row - i][col - i]?.type === tile.type; i++) {
      mainDiagonalCount++;
    }
    
    // 向右下检查
    for (let i = 1; row + i < this.config.height && col + i < this.config.width && this.tiles[row + i][col + i]?.type === tile.type; i++) {
      mainDiagonalCount++;
    }
    
    if (mainDiagonalCount >= this.config.minMatchLength) {
      return true;
    }
    
    // 检查副对角线（右上到左下）
    let antiDiagonalCount = 1;
    
    // 向右上检查
    for (let i = 1; row - i >= 0 && col + i < this.config.width && this.tiles[row - i][col + i]?.type === tile.type; i++) {
      antiDiagonalCount++;
    }
    
    // 向左下检查
    for (let i = 1; row + i < this.config.height && col - i >= 0 && this.tiles[row + i][col - i]?.type === tile.type; i++) {
      antiDiagonalCount++;
    }
    
    return antiDiagonalCount >= this.config.minMatchLength;
  }

  /**
   * 调整游戏板尺寸
   */
  resize(newWidth: number, newHeight: number): void {
    const oldConfig = { ...this.config };
    const oldTiles = this.tiles.map(row => [...row]);
    
    // 验证新尺寸
    if (newWidth < 4 || newWidth > 12 || newHeight < 4 || newHeight > 12) {
      throw new Error('游戏板尺寸必须在4×4到12×12之间');
    }
    
    this.config.width = newWidth;
    this.config.height = newHeight;
    
    // 创建新的游戏板
    this.tiles = Array(newHeight).fill(null).map(() =>
      Array(newWidth).fill(null).map(() => null)
    );
    
    // 保留现有方块（如果位置仍然有效）
    for (let row = 0; row < Math.min(oldConfig.height, newHeight); row++) {
      for (let col = 0; col < Math.min(oldConfig.width, newWidth); col++) {
        if (oldTiles[row] && oldTiles[row][col]) {
          this.tiles[row][col] = { ...oldTiles[row][col] };
          this.tiles[row][col].x = col;
          this.tiles[row][col].y = row;
        }
      }
    }
    
    // 填充空位置
    for (let row = 0; row < newHeight; row++) {
      for (let col = 0; col < newWidth; col++) {
        if (!this.tiles[row][col]) {
          this.tiles[row][col] = this.createRandomTile();
          this.tiles[row][col].x = col;
          this.tiles[row][col].y = row;
        }
      }
    }
    
    // 移除可能的初始匹配
    this.removeInitialMatches();
    
    // 保存到历史记录
    this.saveToHistory();
    
    this.emitEvent('resize', { 
      oldConfig, 
      newConfig: this.config,
      preservedTiles: Math.min(oldConfig.width, newWidth) * Math.min(oldConfig.height, newHeight)
    });
    
    this.logger.info(`游戏板已调整尺寸: ${oldConfig.width}×${oldConfig.height} -> ${newWidth}×${newHeight}`, 
      this.getStats(), 'ConfigurableGameBoard');
  }

  /**
   * 重新生成游戏板
   */
  regenerateBoard(): void {
    this.initializeBoard();
    this.emitEvent('clear', { reason: 'regenerate', config: this.config });
    this.logger.info('游戏板已重新生成', this.getStats(), 'ConfigurableGameBoard');
  }

  /**
   * 保存到历史记录
   */
  private saveToHistory(): void {
    const boardCopy = this.tiles.map(row => row.map(tile => ({ ...tile })));
    this.boardHistory.push(boardCopy);
    
    // 限制历史记录大小
    if (this.boardHistory.length > this.maxHistorySize) {
      this.boardHistory.shift();
    }
  }

  /**
   * 发出事件
   */
  private emitEvent(type: BoardEvent['type'], data: any): void {
    const event: BoardEvent = {
      type,
      data,
      timestamp: Date.now()
    };
    
    const listeners = this.eventListeners.get(type) || [];
    listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        this.logger.error(`游戏板事件监听器执行失败: ${type}`, error, 'ConfigurableGameBoard');
      }
    });
  }

  // === 公共API ===

  /**
   * 获取游戏板配置
   */
  getConfig(): BoardConfig {
    return { ...this.config };
  }

  /**
   * 获取游戏板数据
   */
  getTiles(): GameTile[][] {
    return this.tiles.map(row => row.map(tile => ({ ...tile })));
  }

  /**
   * 获取指定位置的方块
   */
  getTileAt(row: number, col: number): GameTile | null {
    if (row < 0 || row >= this.config.height || col < 0 || col >= this.config.width) {
      return null;
    }
    return this.tiles[row][col] ? { ...this.tiles[row][col] } : null;
  }

  /**
   * 设置指定位置的方块
   */
  setTileAt(row: number, col: number, tile: GameTile | null): boolean {
    if (row < 0 || row >= this.config.height || col < 0 || col >= this.config.width) {
      return false;
    }
    
    const oldTile = this.tiles[row][col];
    this.tiles[row][col] = tile;
    
    if (tile) {
      tile.x = col;
      tile.y = row;
    }
    
    this.emitEvent('tileChange', { row, col, oldTile, newTile: tile });
    
    return true;
  }

  /**
   * 获取游戏板统计信息
   */
  getStats(): BoardStats {
    const stats: BoardStats = {
      totalTiles: this.config.width * this.config.height,
      tileTypeDistribution: {},
      emptyTiles: 0,
      possibleMatches: 0,
      averageMatchLength: 0
    };
    
    let totalMatches = 0;
    let totalMatchLength = 0;
    
    for (let row = 0; row < this.config.height; row++) {
      for (let col = 0; col < this.config.width; col++) {
        const tile = this.tiles[row][col];
        
        if (!tile) {
          stats.emptyTiles++;
        } else {
          stats.tileTypeDistribution[tile.type] = (stats.tileTypeDistribution[tile.type] || 0) + 1;
          
          if (this.hasMatchAt(row, col)) {
            stats.possibleMatches++;
            totalMatches++;
            // 这里可以计算具体的匹配长度
            totalMatchLength += this.config.minMatchLength; // 简化计算
          }
        }
      }
    }
    
    stats.averageMatchLength = totalMatches > 0 ? totalMatchLength / totalMatches : 0;
    
    return stats;
  }

  /**
   * 添加事件监听器
   */
  addEventListener(type: BoardEvent['type'], listener: (event: BoardEvent) => void): () => void {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, []);
    }
    
    this.eventListeners.get(type)!.push(listener);
    
    // 返回移除监听器的函数
    return () => {
      const listeners = this.eventListeners.get(type);
      if (listeners) {
        const index = listeners.indexOf(listener);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    };
  }

  /**
   * 移除事件监听器
   */
  removeEventListener(type: BoardEvent['type'], listener: (event: BoardEvent) => void): void {
    const listeners = this.eventListeners.get(type);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * 获取游戏板尺寸
   */
  get width(): number { return this.config.width; }
  get height(): number { return this.config.height; }
  get tileTypes(): number { return this.config.tileTypes; }
  get minMatchLength(): number { return this.config.minMatchLength; }

  /**
   * 销毁游戏板
   */
  dispose(): void {
    this.eventListeners.clear();
    this.boardHistory = [];
    this.tiles = [];
    this.logger.info('可配置游戏板已销毁', undefined, 'ConfigurableGameBoard');
  }
}
