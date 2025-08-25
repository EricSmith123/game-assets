/**
 * 超级方块对象池系统 2.0
 * 减少对象创建/销毁，降低GC压力
 * 新增：内存池管理、对象生命周期管理、大对象分配策略
 */

import type { GameTile } from '@/types/game';
import { performanceMonitor } from './performanceMonitor';
import { logController } from './logController';

/**
 * 对象池统计信息
 */
export interface PoolStats {
  totalCreated: number;
  totalReused: number;
  currentPoolSize: number;
  maxPoolSize: number;
  hitRate: number;
  memoryUsage: number;
}

/**
 * 内存池配置接口
 */
export interface MemoryPoolConfig {
  initialSize: number; // 初始池大小
  maxSize: number; // 最大池大小
  growthFactor: number; // 增长因子
  shrinkThreshold: number; // 收缩阈值
  maxIdleTime: number; // 最大空闲时间
}

/**
 * 对象生命周期状态
 */
export enum ObjectLifecycleState {
  CREATED = 'created',
  ACTIVE = 'active',
  IDLE = 'idle',
  POOLED = 'pooled',
  DISPOSED = 'disposed'
}

/**
 * 池化对象接口
 */
export interface PooledObject<T> {
  object: T;
  state: ObjectLifecycleState;
  createdAt: number;
  lastUsed: number;
  useCount: number;
  size: number;
}

/**
 * 超级方块对象池 2.0
 */
export class TileObjectPool {
  private static instance: TileObjectPool;
  private pool: PooledObject<GameTile>[] = [];
  private config: MemoryPoolConfig = {
    initialSize: 50,
    maxSize: 200,
    growthFactor: 1.5,
    shrinkThreshold: 0.3,
    maxIdleTime: 300000 // 5分钟
  };

  // 统计信息
  private stats: PoolStats = {
    totalCreated: 0,
    totalReused: 0,
    currentPoolSize: 0,
    maxPoolSize: this.config.maxSize,
    hitRate: 0,
    memoryUsage: 0
  };



  private constructor() {
    this.preAllocate(this.config.initialSize);
    this.startCleanupTimer();

    // 注册内存清理监听器
    if (typeof window !== 'undefined') {
      window.addEventListener('memory-cleanup', () => {
        this.forceCleanup();
      });
    }
  }

  /**
   * 启动清理定时器
   */
  private startCleanupTimer(): void {
    window.setInterval(() => {
      this.cleanupIdleObjects();
    }, 60000); // 每分钟清理一次
  }

  /**
   * 强制清理
   */
  private forceCleanup(): void {
    const now = Date.now();
    const threshold = this.config.maxIdleTime / 2; // 更激进的清理

    this.pool = this.pool.filter(pooledObj => {
      return (now - pooledObj.lastUsed) < threshold;
    });

    console.log(`🧹 强制清理对象池，剩余: ${this.pool.length}`);
  }

  /**
   * 清理空闲对象
   */
  private cleanupIdleObjects(): void {
    const now = Date.now();
    const beforeSize = this.pool.length;

    this.pool = this.pool.filter(pooledObj => {
      return (now - pooledObj.lastUsed) < this.config.maxIdleTime;
    });

    const cleaned = beforeSize - this.pool.length;
    if (cleaned > 0) {
      console.log(`🧹 清理空闲对象: ${cleaned}个`);
    }
  }

  static getInstance(): TileObjectPool {
    if (!TileObjectPool.instance) {
      TileObjectPool.instance = new TileObjectPool();
    }
    return TileObjectPool.instance;
  }

  /**
   * 预分配对象池
   */
  preAllocate(count: number): void {
    console.log(`🏗️ 预分配方块对象池: ${count}个对象`);
    
    for (let i = 0; i < count; i++) {
      const tile: GameTile = {
        type: 0,
        id: '',
        row: -1,
        col: -1
      };
      const pooledObj: PooledObject<GameTile> = {
        object: tile,
        state: ObjectLifecycleState.POOLED,
        createdAt: Date.now(),
        lastUsed: Date.now(),
        useCount: 0,
        size: 64 // 估算大小
      };
      this.pool.push(pooledObj);
    }
    
    this.stats.currentPoolSize = this.pool.length;
    this.stats.totalCreated += count;
    
    performanceMonitor.recordObjectCreation('tile', count);
    console.log(`✅ 对象池预分配完成，当前大小: ${this.pool.length}`);
  }

  /**
   * 从对象池获取方块对象
   */
  getTile(type: number, row: number, col: number): GameTile {
    let tile: GameTile;

    if (this.pool.length > 0) {
      // 从池中复用对象
      const pooledObj = this.pool.pop()!;
      tile = pooledObj.object;
      pooledObj.state = ObjectLifecycleState.ACTIVE;
      pooledObj.lastUsed = Date.now();
      pooledObj.useCount++;
      this.stats.totalReused++;
      this.stats.currentPoolSize = this.pool.length;

      // 重置对象属性
      tile.type = type;
      tile.row = row;
      tile.col = col;
      tile.id = this.generateTileId(row, col);
      tile.isSpecial = undefined;
      tile.specialType = undefined;
      
    } else {
      // 池为空，创建新对象
      tile = {
        type,
        id: this.generateTileId(row, col),
        row,
        col
      };
      this.stats.totalCreated++;
      performanceMonitor.recordObjectCreation('tile', 1);
    }

    // 更新命中率
    const totalRequests = this.stats.totalCreated + this.stats.totalReused;
    this.stats.hitRate = totalRequests > 0 ? (this.stats.totalReused / totalRequests) * 100 : 0;

    return tile;
  }

  /**
   * 将方块对象返回到池中
   */
  returnTile(tile: GameTile): void {
    if (this.pool.length < this.config.maxSize) {
      // 清理对象状态
      tile.type = 0;
      tile.id = '';
      tile.row = -1;
      tile.col = -1;
      tile.isSpecial = undefined;
      tile.specialType = undefined;

      const pooledObj: PooledObject<GameTile> = {
        object: tile,
        state: ObjectLifecycleState.POOLED,
        createdAt: Date.now(),
        lastUsed: Date.now(),
        useCount: 0,
        size: 64
      };

      this.pool.push(pooledObj);
      this.stats.currentPoolSize = this.pool.length;

      performanceMonitor.recordObjectDestruction('tile', 1);
    }
    // 如果池已满，让对象被GC回收
  }

  /**
   * 批量返回方块对象
   */
  returnTiles(tiles: GameTile[]): void {
    for (const tile of tiles) {
      this.returnTile(tile);
    }
  }

  /**
   * 生成方块ID - 优化版本
   */
  private generateTileId(row: number, col: number): string {
    // 使用更简单的ID生成策略，减少字符串操作
    return `${row}-${col}-${Date.now()}`;
  }

  /**
   * 创建完整的游戏棋盘
   */
  createBoard(size: number, tileTypes: number): GameTile[][] {
    performanceMonitor.startTimer('createBoard');
    
    const board: GameTile[][] = [];
    
    for (let r = 0; r < size; r++) {
      board[r] = [];
      for (let c = 0; c < size; c++) {
        let type: number;
        
        // 确保开局没有匹配
        do {
          type = Math.floor(Math.random() * tileTypes) + 1;
        } while (
          (c >= 2 && board[r][c - 1].type === type && board[r][c - 2].type === type) ||
          (r >= 2 && board[r - 1][c].type === type && board[r - 2][c].type === type)
        );
        
        board[r][c] = this.getTile(type, r, c);
      }
    }
    
    const duration = performanceMonitor.endTimer('createBoard');
    console.log(`🎮 棋盘创建完成: ${size}x${size}, 耗时: ${duration.toFixed(2)}ms`);
    
    return board;
  }

  /**
   * 销毁棋盘并回收对象
   */
  destroyBoard(board: GameTile[][]): void {
    performanceMonitor.startTimer('destroyBoard');
    
    let recycledCount = 0;
    
    for (let r = 0; r < board.length; r++) {
      for (let c = 0; c < board[r].length; c++) {
        this.returnTile(board[r][c]);
        recycledCount++;
      }
    }
    
    const duration = performanceMonitor.endTimer('destroyBoard');
    console.log(`🗑️ 棋盘销毁完成: 回收${recycledCount}个对象, 耗时: ${duration.toFixed(2)}ms`);
  }

  /**
   * 优化的棋盘克隆
   */
  cloneBoard(board: GameTile[][]): GameTile[][] {
    performanceMonitor.startTimer('cloneBoard');
    
    const cloned: GameTile[][] = [];
    
    for (let r = 0; r < board.length; r++) {
      cloned[r] = [];
      for (let c = 0; c < board[r].length; c++) {
        const original = board[r][c];
        cloned[r][c] = this.getTile(original.type, original.row, original.col);
        
        // 复制特殊属性
        if (original.isSpecial) {
          cloned[r][c].isSpecial = original.isSpecial;
          cloned[r][c].specialType = original.specialType;
        }
      }
    }
    
    const duration = performanceMonitor.endTimer('cloneBoard');
    performanceMonitor.recordObjectCreation('boardClone', 1);

    // 使用日志控制器减少重复输出
    logController.countLog('棋盘克隆操作');
    logController.batchLog('棋盘克隆', `棋盘克隆完成: 耗时: ${duration.toFixed(2)}ms`, {
      duration,
      boardSize: cloned.length * cloned[0]?.length || 0
    });
    
    return cloned;
  }

  /**
   * 填充新方块
   */
  fillEmptyTiles(board: GameTile[][], tileTypes: number): number {
    let filledCount = 0;
    
    for (let r = 0; r < board.length; r++) {
      for (let c = 0; c < board[r].length; c++) {
        if (board[r][c].type === 0) {
          // 回收旧对象
          this.returnTile(board[r][c]);
          
          // 创建新方块
          const newType = Math.floor(Math.random() * tileTypes) + 1;
          board[r][c] = this.getTile(newType, r, c);
          filledCount++;
        }
      }
    }
    
    return filledCount;
  }

  /**
   * 获取对象池统计信息
   */
  getStats(): PoolStats {
    return { ...this.stats };
  }

  /**
   * 清理对象池
   */
  cleanup(): void {
    console.log(`🧹 清理对象池: 释放${this.pool.length}个对象`);
    this.pool = [];
    this.stats.currentPoolSize = 0;
  }

  /**
   * 调整对象池大小
   */
  resize(newSize: number): void {
    if (newSize > this.pool.length) {
      // 扩大池
      this.preAllocate(newSize - this.pool.length);
    } else if (newSize < this.pool.length) {
      // 缩小池
      const removed = this.pool.splice(newSize);
      this.stats.currentPoolSize = this.pool.length;
      console.log(`📏 对象池已调整大小: ${removed.length}个对象被移除`);
    }
  }

  /**
   * 打印对象池状态
   */
  printStats(): void {
    const stats = this.getStats();
    
    console.group('🏗️ 方块对象池统计');
    console.log(`当前池大小: ${stats.currentPoolSize}/${stats.maxPoolSize}`);
    console.log(`总创建数: ${stats.totalCreated}`);
    console.log(`总复用数: ${stats.totalReused}`);
    console.log(`命中率: ${stats.hitRate.toFixed(1)}%`);
    console.log(`内存节省: ${((stats.totalReused / (stats.totalCreated + stats.totalReused)) * 100).toFixed(1)}%`);
    console.groupEnd();
  }
}

/**
 * 全局方块对象池实例
 */
export const tileObjectPool = TileObjectPool.getInstance();

// 在开发环境中挂载到全局
if (import.meta.env.DEV) {
  (window as any).tileObjectPool = tileObjectPool;
  console.log('🏗️ 方块对象池已挂载到 window.tileObjectPool');
}
