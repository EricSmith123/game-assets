/**
 * 渲染性能优化器
 * 提供虚拟化渲染、GPU加速、批量更新等优化功能
 */

import type { GameTile } from '@/types/game';
import { computed, nextTick, type ComputedRef, type Ref } from 'vue';
import { performanceMonitor } from './performanceMonitor';

/**
 * 视口配置接口
 */
export interface ViewportConfig {
  width: number;
  height: number;
  tileSize: number;
  visibleRows: number;
  visibleCols: number;
  bufferRows: number;
  bufferCols: number;
}

/**
 * 可见方块接口
 */
export interface VisibleTile extends GameTile {
  renderIndex: number;
  isVisible: boolean;
  isBuffer: boolean;
}

/**
 * 批量更新队列项
 */
interface BatchUpdateItem {
  key: string;
  value: any;
  timestamp: number;
}

/**
 * 渲染优化器类
 */
export class RenderOptimizer {
  private static instance: RenderOptimizer;
  private batchUpdateQueue = new Map<string, BatchUpdateItem>();
  private batchUpdateTimer: number | null = null;
  private readonly batchDelay: number = 16; // 16ms ≈ 60fps
  
  // 虚拟化相关
  private viewport: ViewportConfig = {
    width: 500,
    height: 500,
    tileSize: 60,
    visibleRows: 8,
    visibleCols: 8,
    bufferRows: 1,
    bufferCols: 1
  };
  
  // 性能统计
  private stats = {
    totalRenders: 0,
    virtualizedRenders: 0,
    batchUpdates: 0,
    skippedUpdates: 0,
    averageRenderTime: 0,
    totalRenderTime: 0
  };

  private constructor() {}

  static getInstance(): RenderOptimizer {
    if (!RenderOptimizer.instance) {
      RenderOptimizer.instance = new RenderOptimizer();
    }
    return RenderOptimizer.instance;
  }

  /**
   * 配置视口参数
   */
  configureViewport(config: Partial<ViewportConfig>): void {
    this.viewport = { ...this.viewport, ...config };
    console.log('🖼️ 视口配置已更新:', this.viewport);
  }

  /**
   * 计算可见方块
   */
  calculateVisibleTiles(
    allTiles: GameTile[],
    scrollTop: number = 0,
    scrollLeft: number = 0
  ): VisibleTile[] {
    performanceMonitor.startTimer('calculateVisibleTiles');
    
    const { tileSize, visibleRows, visibleCols, bufferRows, bufferCols } = this.viewport;
    
    // 计算可见区域
    const startRow = Math.max(0, Math.floor(scrollTop / tileSize) - bufferRows);
    const endRow = Math.min(8, startRow + visibleRows + bufferRows * 2);
    const startCol = Math.max(0, Math.floor(scrollLeft / tileSize) - bufferCols);
    const endCol = Math.min(8, startCol + visibleCols + bufferCols * 2);
    
    const visibleTiles: VisibleTile[] = [];
    let renderIndex = 0;
    
    // 只处理可见区域的方块
    for (const tile of allTiles) {
      const inVisibleArea = tile.row >= startRow && tile.row < endRow &&
                           tile.col >= startCol && tile.col < endCol;
      
      if (inVisibleArea) {
        const isBuffer = tile.row < startRow + bufferRows || 
                        tile.row >= endRow - bufferRows ||
                        tile.col < startCol + bufferCols || 
                        tile.col >= endCol - bufferCols;
        
        visibleTiles.push({
          ...tile,
          renderIndex: renderIndex++,
          isVisible: true,
          isBuffer
        });
      }
    }
    
    const duration = performanceMonitor.endTimer('calculateVisibleTiles');
    this.stats.totalRenders++;
    this.stats.virtualizedRenders++;
    this.stats.totalRenderTime += duration;
    this.stats.averageRenderTime = this.stats.totalRenderTime / this.stats.totalRenders;
    
    console.log(`🖼️ 虚拟化渲染: ${visibleTiles.length}/${allTiles.length} 方块, 耗时: ${duration.toFixed(2)}ms`);
    
    return visibleTiles;
  }

  /**
   * 批量更新状态
   */
  batchUpdate<T>(key: string, value: T, callback?: (value: T) => void): void {
    // 添加到批量更新队列
    this.batchUpdateQueue.set(key, {
      key,
      value,
      timestamp: Date.now()
    });
    
    // 如果已有定时器，清除它
    if (this.batchUpdateTimer) {
      clearTimeout(this.batchUpdateTimer);
    }
    
    // 设置新的批量更新定时器
    this.batchUpdateTimer = window.setTimeout(() => {
      this.flushBatchUpdates(callback);
    }, this.batchDelay);
  }

  /**
   * 刷新批量更新
   */
  private flushBatchUpdates(callback?: (value: any) => void): void {
    if (this.batchUpdateQueue.size === 0) return;
    
    performanceMonitor.startTimer('batchUpdate');
    
    const updates = Array.from(this.batchUpdateQueue.values());
    this.batchUpdateQueue.clear();
    this.batchUpdateTimer = null;
    
    // 执行批量更新
    nextTick(() => {
      updates.forEach(update => {
        if (callback) {
          callback(update.value);
        }
      });
      
      const duration = performanceMonitor.endTimer('batchUpdate');
      this.stats.batchUpdates++;
      
      console.log(`📦 批量更新完成: ${updates.length}个更新, 耗时: ${duration.toFixed(2)}ms`);
    });
  }

  /**
   * 防抖函数
   */
  debounce<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let timeoutId: number | null = null;
    
    return (...args: Parameters<T>) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      timeoutId = window.setTimeout(() => {
        func.apply(this, args);
        timeoutId = null;
      }, delay);
    };
  }

  /**
   * 节流函数
   */
  throttle<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let lastCall = 0;
    
    return (...args: Parameters<T>) => {
      const now = Date.now();
      
      if (now - lastCall >= delay) {
        lastCall = now;
        func.apply(this, args);
      } else {
        this.stats.skippedUpdates++;
      }
    };
  }

  /**
   * 优化的方块类名计算
   */
  private tileClassCache = new Map<string, string[]>();
  
  public calculateTileClasses(
    tile: GameTile,
    selectedTile: GameTile | null,
    matchedTiles: Set<string>,
    shakingTile: GameTile | null
  ): string[] {
    const cacheKey = `${tile.id}-${tile.type}-${selectedTile?.id || 'none'}-${matchedTiles.has(`${tile.row}-${tile.col}`)}-${shakingTile?.id || 'none'}`;
    
    // 检查缓存
    if (this.tileClassCache.has(cacheKey)) {
      return this.tileClassCache.get(cacheKey)!;
    }
    
    const classes: string[] = [`tile-type-${tile.type}`];
    
    if (selectedTile && selectedTile.row === tile.row && selectedTile.col === tile.col) {
      classes.push('selected');
    }
    if (matchedTiles.has(`${tile.row}-${tile.col}`)) {
      classes.push('matched');
    }
    if (shakingTile && shakingTile.row === tile.row && shakingTile.col === tile.col) {
      classes.push('shake');
    }
    
    // 缓存结果
    this.tileClassCache.set(cacheKey, classes);
    
    // 限制缓存大小
    if (this.tileClassCache.size > 1000) {
      const firstKey = this.tileClassCache.keys().next().value;
      if (firstKey) {
        this.tileClassCache.delete(firstKey);
      }
    }
    
    return classes;
  }

  /**
   * 清理缓存
   */
  clearCache(): void {
    this.tileClassCache.clear();
    console.log('🧹 渲染优化器缓存已清理');
  }

  /**
   * 获取性能统计
   */
  getStats() {
    return {
      ...this.stats,
      cacheSize: this.tileClassCache.size,
      queueSize: this.batchUpdateQueue.size,
      virtualizationRatio: this.stats.totalRenders > 0 ? 
        (this.stats.virtualizedRenders / this.stats.totalRenders) * 100 : 0
    };
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.stats = {
      totalRenders: 0,
      virtualizedRenders: 0,
      batchUpdates: 0,
      skippedUpdates: 0,
      averageRenderTime: 0,
      totalRenderTime: 0
    };
  }

  /**
   * 打印性能统计
   */
  printStats(): void {
    const stats = this.getStats();
    
    console.group('🖼️ 渲染优化器统计');
    console.log(`总渲染次数: ${stats.totalRenders}`);
    console.log(`虚拟化渲染: ${stats.virtualizedRenders}`);
    console.log(`批量更新: ${stats.batchUpdates}`);
    console.log(`跳过更新: ${stats.skippedUpdates}`);
    console.log(`平均渲染时间: ${stats.averageRenderTime.toFixed(2)}ms`);
    console.log(`虚拟化比率: ${stats.virtualizationRatio.toFixed(1)}%`);
    console.log(`缓存大小: ${stats.cacheSize}`);
    console.log(`队列大小: ${stats.queueSize}`);
    console.groupEnd();
  }
}

/**
 * 创建优化的计算属性
 */
export function createOptimizedComputed<T>(
  getter: () => T,
  _dependencies: Ref<any>[],
  cacheKey?: string
): ComputedRef<T> {
  return computed(() => {
    performanceMonitor.startTimer(`computed_${cacheKey || 'unknown'}`);

    const result = getter();

    const duration = performanceMonitor.endTimer(`computed_${cacheKey || 'unknown'}`);

    if (duration > 5) { // 如果计算时间超过5ms，记录警告
      console.warn(`⚠️ 计算属性 ${cacheKey} 耗时较长: ${duration.toFixed(2)}ms`);
    }

    return result;
  });
}

/**
 * 全局渲染优化器实例
 */
export const renderOptimizer = RenderOptimizer.getInstance();

// 在开发环境中挂载到全局
if (import.meta.env.DEV) {
  (window as any).renderOptimizer = renderOptimizer;
  console.log('🖼️ 渲染优化器已挂载到 window.renderOptimizer');
}
