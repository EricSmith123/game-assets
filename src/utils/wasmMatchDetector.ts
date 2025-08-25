/**
 * WebAssembly加速匹配检测器
 * 提供超高性能的匹配检测算法
 */

import type { GameTile, TileCoordinates } from '@/types/game';

/**
 * WASM匹配检测结果接口
 */
export interface WasmMatchResult {
  matches: TileCoordinates[];
  executionTime: number;
  wasmEnabled: boolean;
  fallbackUsed: boolean;
}

/**
 * WASM模块接口
 */
interface WasmModule {
  memory: WebAssembly.Memory;
  findMatches: (boardPtr: number, width: number, height: number) => number;
  getMatchCount: () => number;
  getMatch: (index: number) => number;
  malloc: (size: number) => number;
  free: (ptr: number) => void;
}

/**
 * WebAssembly匹配检测器类
 */
export class WasmMatchDetector {
  private static instance: WasmMatchDetector;
  private wasmModule: WasmModule | null = null;
  private wasmSupported: boolean = false;
  private initializationPromise: Promise<void> | null = null;
  
  // 性能统计
  private stats = {
    wasmCalls: 0,
    fallbackCalls: 0,
    totalWasmTime: 0,
    totalFallbackTime: 0,
    averageWasmTime: 0,
    averageFallbackTime: 0,
    performanceGain: 0
  };

  private constructor() {}

  static getInstance(): WasmMatchDetector {
    if (!WasmMatchDetector.instance) {
      WasmMatchDetector.instance = new WasmMatchDetector();
    }
    return WasmMatchDetector.instance;
  }

  /**
   * 初始化WASM模块
   */
  async init(): Promise<void> {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.initializeWasm();
    return this.initializationPromise;
  }

  /**
   * 初始化WASM模块的具体实现
   */
  private async initializeWasm(): Promise<void> {
    try {
      // 检查WASM支持
      if (!this.checkWasmSupport()) {
        console.warn('⚠️ WebAssembly不支持，将使用JavaScript回退');
        return;
      }

      // 由于WASM模块复杂性，暂时禁用WASM功能
      console.log('⚠️ WASM功能暂时禁用，使用JavaScript回退');
      this.wasmSupported = false;
      return;
      this.wasmSupported = true;
      
      console.log('✅ WebAssembly匹配检测器初始化成功');
    } catch (error) {
      console.warn('⚠️ WebAssembly初始化失败，使用JavaScript回退:', error);
      this.wasmSupported = false;
    }
  }

  /**
   * 检查WASM支持
   */
  private checkWasmSupport(): boolean {
    return typeof WebAssembly === 'object' && 
           typeof WebAssembly.instantiate === 'function';
  }



  /**
   * 使用WASM检测匹配
   */
  async detectMatches(board: GameTile[][]): Promise<WasmMatchResult> {
    await this.init();
    
    const startTime = performance.now();
    
    if (this.wasmSupported && this.wasmModule) {
      try {
        const result = await this.detectMatchesWasm(board);
        const executionTime = performance.now() - startTime;
        
        this.stats.wasmCalls++;
        this.stats.totalWasmTime += executionTime;
        this.stats.averageWasmTime = this.stats.totalWasmTime / this.stats.wasmCalls;
        
        return {
          matches: result,
          executionTime,
          wasmEnabled: true,
          fallbackUsed: false
        };
      } catch (error) {
        console.warn('⚠️ WASM匹配检测失败，回退到JavaScript:', error);
      }
    }
    
    // JavaScript回退
    const result = this.detectMatchesFallback(board);
    const executionTime = performance.now() - startTime;
    
    this.stats.fallbackCalls++;
    this.stats.totalFallbackTime += executionTime;
    this.stats.averageFallbackTime = this.stats.totalFallbackTime / this.stats.fallbackCalls;
    
    // 计算性能提升
    if (this.stats.averageWasmTime > 0 && this.stats.averageFallbackTime > 0) {
      this.stats.performanceGain = ((this.stats.averageFallbackTime - this.stats.averageWasmTime) / this.stats.averageFallbackTime) * 100;
    }
    
    return {
      matches: result,
      executionTime,
      wasmEnabled: false,
      fallbackUsed: true
    };
  }

  /**
   * WASM匹配检测实现
   */
  private async detectMatchesWasm(board: GameTile[][]): Promise<TileCoordinates[]> {
    if (!this.wasmModule) throw new Error('WASM模块未初始化');
    
    const width = board[0]?.length || 0;
    const height = board.length;
    
    // 将棋盘数据复制到WASM内存
    const boardSize = width * height;
    const boardPtr = this.wasmModule.malloc(boardSize * 4); // 4字节整数
    
    try {
      const memory = new Int32Array(this.wasmModule.memory.buffer);
      const boardOffset = boardPtr / 4;
      
      // 复制棋盘数据
      for (let r = 0; r < height; r++) {
        for (let c = 0; c < width; c++) {
          memory[boardOffset + r * width + c] = board[r][c]?.type || 0;
        }
      }
      
      // 调用WASM函数
      const matchCount = this.wasmModule.findMatches(boardPtr, width, height);
      
      // 获取匹配结果
      const matches: TileCoordinates[] = [];
      for (let i = 0; i < matchCount; i++) {
        const matchData = this.wasmModule.getMatch(i);
        const row = Math.floor(matchData / width);
        const col = matchData % width;
        matches.push({ row, col });
      }
      
      return matches;
    } finally {
      this.wasmModule.free(boardPtr);
    }
  }

  /**
   * JavaScript回退匹配检测
   */
  private detectMatchesFallback(board: GameTile[][]): TileCoordinates[] {
    const matches: TileCoordinates[] = [];
    const visited = new Set<string>();
    
    // 高效的单次遍历算法
    for (let r = 0; r < board.length; r++) {
      for (let c = 0; c < board[r].length; c++) {
        const key = `${r}-${c}`;
        if (visited.has(key) || board[r][c].type === 0) continue;
        
        // 水平匹配检测
        const horizontalMatches = this.findHorizontalMatches(board, r, c, visited);
        if (horizontalMatches.length >= 3) {
          matches.push(...horizontalMatches);
        }
        
        // 垂直匹配检测
        const verticalMatches = this.findVerticalMatches(board, r, c, visited);
        if (verticalMatches.length >= 3) {
          matches.push(...verticalMatches);
        }
      }
    }
    
    return matches;
  }

  /**
   * 查找水平匹配
   */
  private findHorizontalMatches(board: GameTile[][], row: number, col: number, visited: Set<string>): TileCoordinates[] {
    const matches: TileCoordinates[] = [];
    const type = board[row][col].type;
    
    let c = col;
    while (c < board[row].length && board[row][c].type === type) {
      const key = `${row}-${c}`;
      if (!visited.has(key)) {
        matches.push({ row, col: c });
        visited.add(key);
      }
      c++;
    }
    
    return matches;
  }

  /**
   * 查找垂直匹配
   */
  private findVerticalMatches(board: GameTile[][], row: number, col: number, visited: Set<string>): TileCoordinates[] {
    const matches: TileCoordinates[] = [];
    const type = board[row][col].type;
    
    let r = row;
    while (r < board.length && board[r][col].type === type) {
      const key = `${r}-${col}`;
      if (!visited.has(key)) {
        matches.push({ row: r, col });
        visited.add(key);
      }
      r++;
    }
    
    return matches;
  }

  /**
   * 获取性能统计
   */
  getStats() {
    return {
      ...this.stats,
      wasmSupported: this.wasmSupported,
      wasmInitialized: this.wasmModule !== null,
      totalCalls: this.stats.wasmCalls + this.stats.fallbackCalls,
      wasmUsageRate: this.stats.wasmCalls / (this.stats.wasmCalls + this.stats.fallbackCalls) * 100
    };
  }

  /**
   * 打印性能统计
   */
  printStats(): void {
    const stats = this.getStats();
    
    console.group('⚡ WebAssembly匹配检测器统计');
    console.log(`WASM支持: ${stats.wasmSupported ? '✅' : '❌'}`);
    console.log(`WASM初始化: ${stats.wasmInitialized ? '✅' : '❌'}`);
    console.log(`总调用次数: ${stats.totalCalls}`);
    console.log(`WASM调用: ${stats.wasmCalls}`);
    console.log(`回退调用: ${stats.fallbackCalls}`);
    console.log(`WASM使用率: ${stats.wasmUsageRate.toFixed(1)}%`);
    console.log(`平均WASM时间: ${stats.averageWasmTime.toFixed(3)}ms`);
    console.log(`平均回退时间: ${stats.averageFallbackTime.toFixed(3)}ms`);
    console.log(`性能提升: ${stats.performanceGain.toFixed(1)}%`);
    console.groupEnd();
  }

  /**
   * 关闭WASM检测器
   */
  close(): void {
    this.wasmModule = null;
    this.wasmSupported = false;
    this.initializationPromise = null;
    console.log('⚡ WebAssembly匹配检测器已关闭');
  }
}

/**
 * 全局WASM匹配检测器实例
 */
export const wasmMatchDetector = WasmMatchDetector.getInstance();

// 在开发环境中挂载到全局
if (import.meta.env.DEV) {
  (window as any).wasmMatchDetector = wasmMatchDetector;
  console.log('⚡ WebAssembly匹配检测器已挂载到 window.wasmMatchDetector');
}
