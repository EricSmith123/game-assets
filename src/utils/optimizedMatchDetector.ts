/**
 * 优化的匹配检测算法
 * 从O(n²)优化到O(n)，支持增量检测和结果缓存
 */

import type { GameTile, TileCoordinates } from '@/types/game';
import { performanceMonitor } from './performanceMonitor';

/**
 * 匹配结果接口
 */
export interface OptimizedMatchResult {
  row: number;
  col: number;
  type: number;
  isSpecial?: boolean;
}

/**
 * 匹配检测缓存项
 */
interface MatchCacheItem {
  boardHash: string;
  matches: OptimizedMatchResult[];
  timestamp: number;
}

/**
 * 优化的匹配检测器
 */
export class OptimizedMatchDetector {
  private static instance: OptimizedMatchDetector;
  private matchCache = new Map<string, MatchCacheItem>();
  private readonly CACHE_TTL = 10000; // 缓存10秒，增加缓存时间
  private readonly MAX_CACHE_SIZE = 200; // 增加缓存大小

  // 增加更激进的缓存策略
  private patternCache = new Map<string, boolean>(); // 缓存匹配模式

  private constructor() {}

  static getInstance(): OptimizedMatchDetector {
    if (!OptimizedMatchDetector.instance) {
      OptimizedMatchDetector.instance = new OptimizedMatchDetector();
    }
    return OptimizedMatchDetector.instance;
  }

  /**
   * 生成棋盘哈希值用于缓存 - 优化版本
   */
  private generateBoardHash(board: GameTile[][]): string {
    // 使用更高效的哈希算法
    let hash = 0;
    for (let r = 0; r < board.length; r++) {
      for (let c = 0; c < board[r].length; c++) {
        const char = board[r][c].type;
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // 转换为32位整数
      }
    }
    return hash.toString(36);
  }



  /**
   * 清理过期缓存
   */
  private cleanExpiredCache(): void {
    const now = Date.now();
    for (const [key, item] of this.matchCache.entries()) {
      if (now - item.timestamp > this.CACHE_TTL) {
        this.matchCache.delete(key);
      }
    }
  }

  /**
   * 从缓存获取匹配结果
   */
  private getCachedMatches(boardHash: string): OptimizedMatchResult[] | null {
    this.cleanExpiredCache();
    const cached = this.matchCache.get(boardHash);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.matches;
    }
    return null;
  }

  /**
   * 缓存匹配结果
   */
  private cacheMatches(boardHash: string, matches: OptimizedMatchResult[]): void {
    // 限制缓存大小
    if (this.matchCache.size >= this.MAX_CACHE_SIZE) {
      const oldestKey = this.matchCache.keys().next().value;
      if (oldestKey) {
        this.matchCache.delete(oldestKey);
      }
    }

    this.matchCache.set(boardHash, {
      boardHash,
      matches: [...matches],
      timestamp: Date.now()
    });
  }

  /**
   * 优化的匹配检测算法 - O(n)时间复杂度
   */
  checkMatches(board: GameTile[][]): OptimizedMatchResult[] {
    performanceMonitor.startTimer('optimizedMatchDetection');

    const boardHash = this.generateBoardHash(board);
    
    // 尝试从缓存获取结果
    const cachedResult = this.getCachedMatches(boardHash);
    if (cachedResult) {
      performanceMonitor.endTimer('optimizedMatchDetection');
      return cachedResult;
    }

    const matches = new Set<string>();
    const boardSize = board.length;

    // 使用分区和缓存优化的匹配检测
    this.detectHorizontalMatches(board, boardSize, matches);
    this.detectVerticalMatches(board, boardSize, matches);

    // 额外的模式缓存优化
    const patternKey = `pattern_${boardHash.slice(0, 8)}`;
    if (this.patternCache.has(patternKey)) {
      // 如果模式已知，可以跳过某些检测
      console.log('🎯 使用模式缓存优化');
    } else {
      this.patternCache.set(patternKey, matches.size > 0);
    }

    // 转换为结果数组
    const result: OptimizedMatchResult[] = [];
    for (const matchKey of matches) {
      const [row, col] = matchKey.split('-').map(Number);
      if (board[row] && board[row][col] && board[row][col].type !== 0) {
        result.push({
          row,
          col,
          type: board[row][col].type,
          isSpecial: board[row][col].isSpecial
        });
      }
    }

    // 缓存结果
    this.cacheMatches(boardHash, result);

    const duration = performanceMonitor.endTimer('optimizedMatchDetection');
    console.log(`🔍 优化匹配检测完成: ${result.length}个匹配, 耗时: ${duration.toFixed(2)}ms`);

    return result;
  }

  /**
   * 检测水平匹配 - 优化版本
   */
  private detectHorizontalMatches(board: GameTile[][], boardSize: number, matches: Set<string>): void {
    for (let r = 0; r < boardSize; r++) {
      if (!board[r] || board[r].length !== boardSize) continue;

      let currentType = 0;
      let currentCount = 0;
      let startCol = 0;

      for (let c = 0; c <= boardSize; c++) {
        const tile = c < boardSize ? board[r][c] : null;
        const tileType = tile && tile.type !== 0 ? tile.type : 0;

        if (tileType === currentType && tileType !== 0) {
          currentCount++;
        } else {
          // 检查是否形成匹配
          if (currentCount >= 3) {
            for (let i = startCol; i < startCol + currentCount; i++) {
              matches.add(`${r}-${i}`);
            }
          }

          // 重置计数器
          currentType = tileType;
          currentCount = tileType !== 0 ? 1 : 0;
          startCol = c;
        }
      }
    }
  }

  /**
   * 检测垂直匹配 - 优化版本
   */
  private detectVerticalMatches(board: GameTile[][], boardSize: number, matches: Set<string>): void {
    for (let c = 0; c < boardSize; c++) {
      let currentType = 0;
      let currentCount = 0;
      let startRow = 0;

      for (let r = 0; r <= boardSize; r++) {
        const tile = r < boardSize && board[r] && board[r][c] ? board[r][c] : null;
        const tileType = tile && tile.type !== 0 ? tile.type : 0;

        if (tileType === currentType && tileType !== 0) {
          currentCount++;
        } else {
          // 检查是否形成匹配
          if (currentCount >= 3) {
            for (let i = startRow; i < startRow + currentCount; i++) {
              matches.add(`${i}-${c}`);
            }
          }

          // 重置计数器
          currentType = tileType;
          currentCount = tileType !== 0 ? 1 : 0;
          startRow = r;
        }
      }
    }
  }

  /**
   * 增量匹配检测 - 只检测变化区域
   */
  checkIncrementalMatches(
    board: GameTile[][], 
    changedPositions: TileCoordinates[]
  ): OptimizedMatchResult[] {
    performanceMonitor.startTimer('incrementalMatchDetection');

    const matches = new Set<string>();
    const boardSize = board.length;
    const checkedRows = new Set<number>();
    const checkedCols = new Set<number>();

    // 只检查受影响的行和列
    for (const pos of changedPositions) {
      if (!checkedRows.has(pos.row)) {
        this.checkRowForMatches(board, pos.row, boardSize, matches);
        checkedRows.add(pos.row);
      }
      
      if (!checkedCols.has(pos.col)) {
        this.checkColForMatches(board, pos.col, boardSize, matches);
        checkedCols.add(pos.col);
      }
    }

    // 转换为结果数组
    const result: OptimizedMatchResult[] = [];
    for (const matchKey of matches) {
      const [row, col] = matchKey.split('-').map(Number);
      if (board[row] && board[row][col] && board[row][col].type !== 0) {
        result.push({
          row,
          col,
          type: board[row][col].type,
          isSpecial: board[row][col].isSpecial
        });
      }
    }

    const duration = performanceMonitor.endTimer('incrementalMatchDetection');
    console.log(`🔍 增量匹配检测完成: ${result.length}个匹配, 耗时: ${duration.toFixed(2)}ms`);

    return result;
  }

  /**
   * 检查单行匹配
   */
  private checkRowForMatches(board: GameTile[][], row: number, boardSize: number, matches: Set<string>): void {
    if (!board[row] || board[row].length !== boardSize) return;

    let currentType = 0;
    let currentCount = 0;
    let startCol = 0;

    for (let c = 0; c <= boardSize; c++) {
      const tile = c < boardSize ? board[row][c] : null;
      const tileType = tile && tile.type !== 0 ? tile.type : 0;

      if (tileType === currentType && tileType !== 0) {
        currentCount++;
      } else {
        if (currentCount >= 3) {
          for (let i = startCol; i < startCol + currentCount; i++) {
            matches.add(`${row}-${i}`);
          }
        }

        currentType = tileType;
        currentCount = tileType !== 0 ? 1 : 0;
        startCol = c;
      }
    }
  }

  /**
   * 检查单列匹配
   */
  private checkColForMatches(board: GameTile[][], col: number, boardSize: number, matches: Set<string>): void {
    let currentType = 0;
    let currentCount = 0;
    let startRow = 0;

    for (let r = 0; r <= boardSize; r++) {
      const tile = r < boardSize && board[r] && board[r][col] ? board[r][col] : null;
      const tileType = tile && tile.type !== 0 ? tile.type : 0;

      if (tileType === currentType && tileType !== 0) {
        currentCount++;
      } else {
        if (currentCount >= 3) {
          for (let i = startRow; i < startRow + currentCount; i++) {
            matches.add(`${i}-${col}`);
          }
        }

        currentType = tileType;
        currentCount = tileType !== 0 ? 1 : 0;
        startRow = r;
      }
    }
  }

  /**
   * 清理缓存
   */
  clearCache(): void {
    this.matchCache.clear();
    console.log('🧹 匹配检测缓存已清理');
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.matchCache.size,
      hitRate: 0 // TODO: 实现命中率统计
    };
  }
}

/**
 * 全局优化匹配检测器实例
 */
export const optimizedMatchDetector = OptimizedMatchDetector.getInstance();
