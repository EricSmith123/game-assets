/**
 * 性能优化对比测试
 */

import type { GameTile } from '@/types/game';
import { performanceMonitor, type BenchmarkResult } from './performanceMonitor';
import { optimizedMatchDetector } from './optimizedMatchDetector';
import { tileObjectPool } from './tileObjectPool';

/**
 * 性能对比测试类
 */
export class PerformanceComparison {
  private static instance: PerformanceComparison;

  private constructor() {}

  static getInstance(): PerformanceComparison {
    if (!PerformanceComparison.instance) {
      PerformanceComparison.instance = new PerformanceComparison();
    }
    return PerformanceComparison.instance;
  }

  /**
   * 创建测试棋盘
   */
  private createTestBoard(size: number = 8): GameTile[][] {
    const board: GameTile[][] = [];
    for (let r = 0; r < size; r++) {
      board[r] = [];
      for (let c = 0; c < size; c++) {
        board[r][c] = {
          type: Math.floor(Math.random() * 6) + 1,
          id: `test-${r}-${c}`,
          row: r,
          col: c
        };
      }
    }
    return board;
  }

  /**
   * 创建有匹配的测试棋盘
   */
  private createBoardWithMatches(): GameTile[][] {
    const board = this.createTestBoard();
    
    // 创建水平匹配
    board[0][0].type = 1;
    board[0][1].type = 1;
    board[0][2].type = 1;
    
    // 创建垂直匹配
    board[1][0].type = 2;
    board[2][0].type = 2;
    board[3][0].type = 2;
    
    return board;
  }

  /**
   * 旧版匹配检测算法
   */
  private oldCheckMatches(board: GameTile[][]): Array<{row: number, col: number}> {
    const matches: Array<{row: number, col: number}> = [];
    const baseMatches = new Set<string>();
    const boardSize = 8;

    // 检查水平匹配
    for (let r = 0; r < boardSize; r++) {
      for (let c = 0; c < boardSize - 2; c++) {
        const tile1 = board[r][c];
        const tile2 = board[r][c + 1];
        const tile3 = board[r][c + 2];

        if (tile1 && tile2 && tile3 &&
            tile1.type !== 0 && tile1.type === tile2.type && tile1.type === tile3.type) {
          baseMatches.add(`${r}-${c}`);
          baseMatches.add(`${r}-${c + 1}`);
          baseMatches.add(`${r}-${c + 2}`);

          let extendC = c + 3;
          while (extendC < boardSize && board[r][extendC] &&
                 board[r][extendC].type === tile1.type) {
            baseMatches.add(`${r}-${extendC}`);
            extendC++;
          }
        }
      }
    }

    // 检查垂直匹配
    for (let c = 0; c < boardSize; c++) {
      for (let r = 0; r < boardSize - 2; r++) {
        const tile1 = board[r][c];
        const tile2 = board[r + 1][c];
        const tile3 = board[r + 2][c];

        if (tile1 && tile2 && tile3 &&
            tile1.type !== 0 && tile1.type === tile2.type && tile1.type === tile3.type) {
          baseMatches.add(`${r}-${c}`);
          baseMatches.add(`${r + 1}-${c}`);
          baseMatches.add(`${r + 2}-${c}`);

          let extendR = r + 3;
          while (extendR < boardSize && board[extendR] && board[extendR][c] &&
                 board[extendR][c].type === tile1.type) {
            baseMatches.add(`${extendR}-${c}`);
            extendR++;
          }
        }
      }
    }

    baseMatches.forEach(match => {
      const [row, col] = match.split('-').map(Number);
      matches.push({ row, col });
    });

    return matches;
  }

  /**
   * 旧版深拷贝方法
   */
  private oldCloneBoard(board: GameTile[][]): GameTile[][] {
    return board.map(row => row.map(tile => ({ ...tile })));
  }

  /**
   * JSON深拷贝方法
   */
  private jsonCloneBoard(board: GameTile[][]): GameTile[][] {
    return JSON.parse(JSON.stringify(board));
  }

  /**
   * 对比匹配检测性能
   */
  async compareMatchDetection(): Promise<{old: BenchmarkResult, optimized: BenchmarkResult}> {
    console.log('🔍 开始匹配检测性能对比...');
    
    const testBoard = this.createBoardWithMatches();
    
    // 测试旧版算法
    const oldResult = await performanceMonitor.runBenchmark(
      'Old Match Detection',
      () => { this.oldCheckMatches(testBoard); },
      1000
    );
    
    // 测试优化版算法
    const optimizedResult = await performanceMonitor.runBenchmark(
      'Optimized Match Detection',
      () => { optimizedMatchDetector.checkMatches(testBoard); },
      1000
    );
    
    return { old: oldResult, optimized: optimizedResult };
  }

  /**
   * 对比深拷贝性能
   */
  async compareCloning(): Promise<{old: BenchmarkResult, json: BenchmarkResult, optimized: BenchmarkResult}> {
    console.log('📋 开始深拷贝性能对比...');
    
    const testBoard = this.createTestBoard();
    
    // 测试旧版深拷贝
    const oldResult = await performanceMonitor.runBenchmark(
      'Old Clone Board',
      () => { this.oldCloneBoard(testBoard); },
      1000
    );
    
    // 测试JSON深拷贝
    const jsonResult = await performanceMonitor.runBenchmark(
      'JSON Clone Board',
      () => { this.jsonCloneBoard(testBoard); },
      1000
    );
    
    // 测试优化版深拷贝
    const optimizedResult = await performanceMonitor.runBenchmark(
      'Optimized Clone Board',
      () => { tileObjectPool.cloneBoard(testBoard); },
      1000
    );
    
    return { old: oldResult, json: jsonResult, optimized: optimizedResult };
  }

  /**
   * 对比对象创建性能
   */
  async compareObjectCreation(): Promise<{traditional: BenchmarkResult, pooled: BenchmarkResult}> {
    console.log('🏗️ 开始对象创建性能对比...');
    
    // 传统对象创建
    const traditionalResult = await performanceMonitor.runBenchmark(
      'Traditional Object Creation',
      () => {
        for (let i = 0; i < 64; i++) {
          const tile = {
            type: (i % 6) + 1,
            id: `tile-${Math.floor(i / 8)}-${i % 8}-${Date.now()}-${Math.random()}`,
            row: Math.floor(i / 8),
            col: i % 8
          };
          // 模拟使用对象
          tile.type = tile.type;
        }
      },
      100
    );
    
    // 对象池创建
    const pooledResult = await performanceMonitor.runBenchmark(
      'Pooled Object Creation',
      () => {
        const tiles: GameTile[] = [];
        for (let i = 0; i < 64; i++) {
          const tile = tileObjectPool.getTile((i % 6) + 1, Math.floor(i / 8), i % 8);
          tiles.push(tile);
        }
        // 回收对象
        tileObjectPool.returnTiles(tiles);
      },
      100
    );
    
    return { traditional: traditionalResult, pooled: pooledResult };
  }

  /**
   * 运行完整的性能对比测试
   */
  async runFullComparison(): Promise<void> {
    console.log('🚀 开始完整性能对比测试...');
    
    // 重置性能监控器
    performanceMonitor.reset();
    
    try {
      // 1. 匹配检测对比
      const matchResults = await this.compareMatchDetection();
      this.printMatchComparisonResults(matchResults);
      
      // 2. 深拷贝对比
      const cloneResults = await this.compareCloning();
      this.printCloneComparisonResults(cloneResults);
      
      // 3. 对象创建对比
      const objectResults = await this.compareObjectCreation();
      this.printObjectComparisonResults(objectResults);
      
      // 4. 打印总体性能摘要
      this.printOverallSummary();
      
    } catch (error) {
      console.error('❌ 性能对比测试失败:', error);
    }
  }

  /**
   * 打印匹配检测对比结果
   */
  private printMatchComparisonResults(results: {old: BenchmarkResult, optimized: BenchmarkResult}): void {
    const improvement = ((results.old.averageTime - results.optimized.averageTime) / results.old.averageTime) * 100;
    
    console.group('🔍 匹配检测性能对比');
    console.log(`旧版算法: ${results.old.averageTime.toFixed(3)}ms`);
    console.log(`优化算法: ${results.optimized.averageTime.toFixed(3)}ms`);
    console.log(`性能提升: ${improvement.toFixed(1)}%`);
    console.groupEnd();
  }

  /**
   * 打印深拷贝对比结果
   */
  private printCloneComparisonResults(results: {old: BenchmarkResult, json: BenchmarkResult, optimized: BenchmarkResult}): void {
    const oldImprovement = ((results.old.averageTime - results.optimized.averageTime) / results.old.averageTime) * 100;
    const jsonImprovement = ((results.json.averageTime - results.optimized.averageTime) / results.json.averageTime) * 100;
    
    console.group('📋 深拷贝性能对比');
    console.log(`旧版方法: ${results.old.averageTime.toFixed(3)}ms`);
    console.log(`JSON方法: ${results.json.averageTime.toFixed(3)}ms`);
    console.log(`优化方法: ${results.optimized.averageTime.toFixed(3)}ms`);
    console.log(`相比旧版提升: ${oldImprovement.toFixed(1)}%`);
    console.log(`相比JSON提升: ${jsonImprovement.toFixed(1)}%`);
    console.groupEnd();
  }

  /**
   * 打印对象创建对比结果
   */
  private printObjectComparisonResults(results: {traditional: BenchmarkResult, pooled: BenchmarkResult}): void {
    const improvement = ((results.traditional.averageTime - results.pooled.averageTime) / results.traditional.averageTime) * 100;
    const memoryImprovement = ((results.traditional.memoryDelta - results.pooled.memoryDelta) / Math.abs(results.traditional.memoryDelta)) * 100;
    
    console.group('🏗️ 对象创建性能对比');
    console.log(`传统方式: ${results.traditional.averageTime.toFixed(3)}ms`);
    console.log(`对象池方式: ${results.pooled.averageTime.toFixed(3)}ms`);
    console.log(`时间性能提升: ${improvement.toFixed(1)}%`);
    console.log(`内存使用优化: ${memoryImprovement.toFixed(1)}%`);
    console.groupEnd();
  }

  /**
   * 打印总体性能摘要
   */
  private printOverallSummary(): void {
    console.group('📊 总体性能优化摘要');
    performanceMonitor.printSummary();
    tileObjectPool.printStats();
    console.groupEnd();
  }
}

/**
 * 全局性能对比测试实例
 */
export const performanceComparison = PerformanceComparison.getInstance();

// 在开发环境中挂载到全局
if (import.meta.env.DEV) {
  (window as any).performanceComparison = performanceComparison;
  console.log('📊 性能对比测试已挂载到 window.performanceComparison');
}
