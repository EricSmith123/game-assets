/**
 * 游戏性能基准测试套件
 */

import type { GameTile } from '@/types/game';
import { performanceMonitor, type BenchmarkResult } from './performanceMonitor';

/**
 * 基准测试套件
 */
export class BenchmarkSuite {
  private static instance: BenchmarkSuite;
  
  private constructor() {}

  static getInstance(): BenchmarkSuite {
    if (!BenchmarkSuite.instance) {
      BenchmarkSuite.instance = new BenchmarkSuite();
    }
    return BenchmarkSuite.instance;
  }

  /**
   * 创建测试用的游戏棋盘
   */
  private createTestBoard(size: number = 8): GameTile[][] {
    const board: GameTile[][] = [];
    for (let r = 0; r < size; r++) {
      board[r] = [];
      for (let c = 0; c < size; c++) {
        board[r][c] = {
          type: Math.floor(Math.random() * 6) + 1,
          id: `test-${r}-${c}-${Date.now()}`,
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
   * 当前匹配检测算法基准测试
   */
  async benchmarkCurrentMatchDetection(): Promise<BenchmarkResult> {
    const testBoard = this.createBoardWithMatches();
    
    // 模拟当前的匹配检测算法
    const currentCheckMatches = (board: GameTile[][]) => {
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

            // 检查更长的匹配
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

            // 检查更长的匹配
            let extendR = r + 3;
            while (extendR < boardSize && board[extendR] && board[extendR][c] &&
                   board[extendR][c].type === tile1.type) {
              baseMatches.add(`${extendR}-${c}`);
              extendR++;
            }
          }
        }
      }

      // 转换为结果数组
      baseMatches.forEach(match => {
        const [row, col] = match.split('-').map(Number);
        matches.push({ row, col });
      });

      return matches;
    };

    return await performanceMonitor.runBenchmark(
      'Current Match Detection',
      () => { currentCheckMatches(testBoard); },
      1000
    );
  }

  /**
   * 深拷贝操作基准测试
   */
  async benchmarkDeepClone(): Promise<BenchmarkResult> {
    const testBoard = this.createTestBoard();

    // 当前的深拷贝方法
    const cloneBoard = (board: GameTile[][]) => {
      return board.map(row => row.map(tile => ({ ...tile })));
    };

    return await performanceMonitor.runBenchmark(
      'Deep Clone Board',
      () => { cloneBoard(testBoard); },
      1000
    );
  }

  /**
   * JSON序列化深拷贝基准测试
   */
  async benchmarkJSONClone(): Promise<BenchmarkResult> {
    const testBoard = this.createTestBoard();

    const jsonClone = (board: GameTile[][]) => {
      return JSON.parse(JSON.stringify(board));
    };

    return await performanceMonitor.runBenchmark(
      'JSON Clone Board',
      () => jsonClone(testBoard),
      1000
    );
  }

  /**
   * 方块对象创建基准测试
   */
  async benchmarkTileCreation(): Promise<BenchmarkResult> {
    const createTile = (row: number, col: number, type: number) => {
      return {
        type,
        id: `tile-${row}-${col}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        row,
        col
      };
    };

    return await performanceMonitor.runBenchmark(
      'Tile Creation',
      () => {
        for (let i = 0; i < 64; i++) {
          createTile(Math.floor(i / 8), i % 8, (i % 6) + 1);
        }
      },
      100
    );
  }

  /**
   * flatBoard计算基准测试
   */
  async benchmarkFlatBoardCalculation(): Promise<BenchmarkResult> {
    const testBoard = this.createTestBoard();

    const calculateFlatBoard = (board: GameTile[][]) => {
      const flat: GameTile[] = [];
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          if (board[r] && board[r][c]) {
            flat.push({
              ...board[r][c],
              row: r,
              col: c
            });
          }
        }
      }
      return flat;
    };

    return await performanceMonitor.runBenchmark(
      'FlatBoard Calculation',
      () => { calculateFlatBoard(testBoard); },
      1000
    );
  }

  /**
   * Set操作基准测试
   */
  async benchmarkSetOperations(): Promise<BenchmarkResult> {
    const testMatches = Array.from({ length: 20 }, (_, i) => `${Math.floor(i / 8)}-${i % 8}`);

    const setOperations = () => {
      const matchedTiles = new Set<string>();
      testMatches.forEach(match => matchedTiles.add(match));
      
      // 模拟清除操作
      matchedTiles.clear();
      
      // 再次添加
      testMatches.forEach(match => matchedTiles.add(match));
    };

    return await performanceMonitor.runBenchmark(
      'Set Operations',
      setOperations,
      1000
    );
  }

  /**
   * 运行完整的基准测试套件
   */
  async runFullSuite(): Promise<BenchmarkResult[]> {
    console.log('🚀 开始运行完整基准测试套件...');
    
    const results: BenchmarkResult[] = [];
    
    try {
      // 重置性能监控器
      performanceMonitor.reset();
      
      console.log('📊 测试1: 匹配检测算法');
      results.push(await this.benchmarkCurrentMatchDetection());
      
      console.log('📊 测试2: 深拷贝操作');
      results.push(await this.benchmarkDeepClone());
      
      console.log('📊 测试3: JSON序列化拷贝');
      results.push(await this.benchmarkJSONClone());
      
      console.log('📊 测试4: 方块对象创建');
      results.push(await this.benchmarkTileCreation());
      
      console.log('📊 测试5: flatBoard计算');
      results.push(await this.benchmarkFlatBoardCalculation());
      
      console.log('📊 测试6: Set操作');
      results.push(await this.benchmarkSetOperations());
      
      console.log('✅ 基准测试套件完成');
      this.printResults(results);
      
    } catch (error) {
      console.error('❌ 基准测试失败:', error);
    }
    
    return results;
  }

  /**
   * 打印测试结果
   */
  private printResults(results: BenchmarkResult[]): void {
    console.group('📊 基准测试结果摘要');
    
    results.forEach(result => {
      console.log(`🧪 ${result.testName}:`);
      console.log(`   平均耗时: ${result.averageTime.toFixed(3)}ms`);
      console.log(`   最小耗时: ${result.minTime.toFixed(3)}ms`);
      console.log(`   最大耗时: ${result.maxTime.toFixed(3)}ms`);
      console.log(`   内存变化: ${(result.memoryDelta / 1024).toFixed(2)}KB`);
      console.log('');
    });
    
    console.groupEnd();
  }

  /**
   * 比较两次测试结果
   */
  compareResults(before: BenchmarkResult[], after: BenchmarkResult[]): void {
    console.group('📈 性能优化对比结果');
    
    before.forEach((beforeResult, index) => {
      const afterResult = after[index];
      if (!afterResult || beforeResult.testName !== afterResult.testName) {
        console.warn(`⚠️ 测试 ${beforeResult.testName} 无法对比`);
        return;
      }
      
      const timeImprovement = ((beforeResult.averageTime - afterResult.averageTime) / beforeResult.averageTime) * 100;
      const memoryImprovement = ((beforeResult.memoryDelta - afterResult.memoryDelta) / Math.abs(beforeResult.memoryDelta)) * 100;
      
      console.log(`🔍 ${beforeResult.testName}:`);
      console.log(`   时间优化: ${timeImprovement > 0 ? '+' : ''}${timeImprovement.toFixed(1)}%`);
      console.log(`   内存优化: ${memoryImprovement > 0 ? '+' : ''}${memoryImprovement.toFixed(1)}%`);
      console.log(`   优化前: ${beforeResult.averageTime.toFixed(3)}ms`);
      console.log(`   优化后: ${afterResult.averageTime.toFixed(3)}ms`);
      console.log('');
    });
    
    console.groupEnd();
  }

  /**
   * 资源加载性能基准测试
   */
  async benchmarkResourceLoading(): Promise<BenchmarkResult> {
    const testUrls = [
      '/audio/sfx/click.mp3',
      '/audio/sfx/swap.mp3',
      '/audio/sfx/match.mp3',
      '/tiles/tile-1.webp',
      '/tiles/tile-2.webp'
    ];

    const loadResource = async (url: string) => {
      const response = await fetch(url);
      return await response.arrayBuffer();
    };

    return await performanceMonitor.runBenchmark(
      'Resource Loading',
      async () => {
        const promises = testUrls.map(url => loadResource(url).catch(() => null));
        await Promise.all(promises);
      },
      10
    );
  }

  /**
   * CDN切换性能基准测试
   */
  async benchmarkCdnSwitching(): Promise<BenchmarkResult> {
    const testCdns = [
      'https://cdn.jsdelivr.net/gh/EricSmith123/game-assets@main',
      'https://raw.githubusercontent.com/EricSmith123/game-assets/main'
    ];

    const testCdn = async (baseUrl: string) => {
      try {
        const response = await fetch(`${baseUrl}/test.txt?t=${Date.now()}`, {
          method: 'HEAD',
          signal: AbortSignal.timeout(3000)
        });
        return response.ok;
      } catch {
        return false;
      }
    };

    return await performanceMonitor.runBenchmark(
      'CDN Switching',
      async () => {
        const promises = testCdns.map(cdn => testCdn(cdn));
        await Promise.all(promises);
      },
      5
    );
  }

  /**
   * 缓存性能基准测试
   */
  async benchmarkCaching(): Promise<BenchmarkResult> {
    const testData = new ArrayBuffer(1024 * 100); // 100KB测试数据
    const testKey = 'benchmark_cache_test';

    return await performanceMonitor.runBenchmark(
      'Cache Performance',
      async () => {
        // 模拟缓存操作
        const cache = new Map();
        cache.set(testKey, testData);
        const retrieved = cache.get(testKey);
        cache.delete(testKey);
        return retrieved;
      },
      1000
    );
  }

  /**
   * 运行资源加载基准测试套件
   */
  async runResourceLoadingSuite(): Promise<BenchmarkResult[]> {
    console.log('🚀 开始运行资源加载基准测试套件...');

    const results: BenchmarkResult[] = [];

    try {
      console.log('📊 测试1: 资源加载性能');
      results.push(await this.benchmarkResourceLoading());

      console.log('📊 测试2: CDN切换性能');
      results.push(await this.benchmarkCdnSwitching());

      console.log('📊 测试3: 缓存性能');
      results.push(await this.benchmarkCaching());

      console.log('✅ 资源加载基准测试套件完成');
      this.printResults(results);

    } catch (error) {
      console.error('❌ 资源加载基准测试失败:', error);
    }

    return results;
  }

  /**
   * 渲染性能基准测试
   */
  async benchmarkRenderingPerformance(): Promise<BenchmarkResult> {
    const testElement = document.createElement('div');
    testElement.style.cssText = `
      position: absolute;
      top: -9999px;
      left: -9999px;
      width: 500px;
      height: 500px;
      display: grid;
      grid-template-columns: repeat(8, 1fr);
      gap: 3px;
    `;
    document.body.appendChild(testElement);

    const createTestTiles = (count: number) => {
      const tiles = [];
      for (let i = 0; i < count; i++) {
        const tile = document.createElement('div');
        tile.className = 'test-tile';
        tile.style.cssText = `
          aspect-ratio: 1;
          background: linear-gradient(135deg, #ff6b35, #f7931e);
          border-radius: 8px;
          transform: translateZ(0);
          will-change: transform;
        `;
        tiles.push(tile);
      }
      return tiles;
    };

    const result = await performanceMonitor.runBenchmark(
      'Rendering Performance',
      () => {
        // 清空容器
        testElement.innerHTML = '';

        // 创建64个方块
        const tiles = createTestTiles(64);

        // 批量添加到DOM
        const fragment = document.createDocumentFragment();
        tiles.forEach(tile => fragment.appendChild(tile));
        testElement.appendChild(fragment);

        // 强制重排
        testElement.offsetHeight;

        // 模拟动画
        tiles.forEach((tile, index) => {
          tile.style.transform = `translateZ(0) scale(${1 + Math.sin(index) * 0.1})`;
        });

        // 强制重绘
        testElement.offsetHeight;
      },
      50
    );

    document.body.removeChild(testElement);
    return result;
  }

  /**
   * GPU加速动画性能测试
   */
  async benchmarkGPUAnimation(): Promise<BenchmarkResult> {
    const testElement = document.createElement('div');
    testElement.style.cssText = `
      position: absolute;
      top: -9999px;
      left: -9999px;
      width: 100px;
      height: 100px;
      background: #ff6b35;
      border-radius: 8px;
    `;
    document.body.appendChild(testElement);

    const result = await performanceMonitor.runBenchmark(
      'GPU Animation',
      () => {
        // GPU加速动画
        testElement.style.transform = 'translateZ(0) scale(1.2) rotate(45deg)';
        testElement.style.willChange = 'transform';
        testElement.style.backfaceVisibility = 'hidden';

        // 强制重绘
        testElement.offsetHeight;

        // 重置
        testElement.style.transform = 'translateZ(0) scale(1) rotate(0deg)';
        testElement.offsetHeight;
      },
      100
    );

    document.body.removeChild(testElement);
    return result;
  }

  /**
   * 虚拟化渲染性能测试
   */
  async benchmarkVirtualization(): Promise<BenchmarkResult> {
    const mockTiles = Array.from({ length: 64 }, (_, i) => ({
      id: `tile-${i}`,
      row: Math.floor(i / 8),
      col: i % 8,
      type: (i % 6) + 1,
      isSpecial: false
    }));

    return await performanceMonitor.runBenchmark(
      'Virtualization',
      () => {
        // 模拟虚拟化计算
        const visibleTiles = mockTiles.filter((_, index) => {
          // 模拟可见性检测
          const isVisible = index < 32; // 假设只有一半可见
          return isVisible;
        });

        // 模拟渲染计算
        visibleTiles.forEach(tile => {
          const key = `${tile.row}-${tile.col}`;
          const classes = [`tile-type-${tile.type}`];
          if (tile.isSpecial) classes.push('special');
          return { key, classes };
        });
      },
      200
    );
  }

  /**
   * 运行渲染性能基准测试套件
   */
  async runRenderingSuite(): Promise<BenchmarkResult[]> {
    console.log('🎬 开始运行渲染性能基准测试套件...');

    const results: BenchmarkResult[] = [];

    try {
      console.log('📊 测试1: 渲染性能');
      results.push(await this.benchmarkRenderingPerformance());

      console.log('📊 测试2: GPU动画性能');
      results.push(await this.benchmarkGPUAnimation());

      console.log('📊 测试3: 虚拟化性能');
      results.push(await this.benchmarkVirtualization());

      console.log('✅ 渲染性能基准测试套件完成');
      this.printResults(results);

    } catch (error) {
      console.error('❌ 渲染性能基准测试失败:', error);
    }

    return results;
  }

  /**
   * 内存管理性能基准测试
   */
  async benchmarkMemoryManagement(): Promise<BenchmarkResult> {
    const testObjects: any[] = [];

    return await performanceMonitor.runBenchmark(
      'Memory Management',
      () => {
        // 创建大量对象
        for (let i = 0; i < 1000; i++) {
          testObjects.push({
            id: i,
            data: new Array(100).fill(Math.random()),
            timestamp: Date.now()
          });
        }

        // 模拟内存压力
        const largeArray = new Array(10000).fill(0).map(() => ({
          value: Math.random(),
          nested: { data: new Array(50).fill(Math.random()) }
        }));

        // 清理引用
        testObjects.length = 0;
        largeArray.length = 0;
      },
      20
    );
  }

  /**
   * 缓存性能压力测试
   */
  async benchmarkCacheStress(): Promise<BenchmarkResult> {
    const testData = new Map<string, any>();

    return await performanceMonitor.runBenchmark(
      'Cache Stress Test',
      () => {
        // 大量缓存操作
        for (let i = 0; i < 500; i++) {
          const key = `test_key_${i}`;
          const data = { id: i, payload: new Array(20).fill(Math.random()) };

          // 设置缓存
          testData.set(key, data);

          // 读取缓存
          testData.get(key);

          // 模拟缓存命中/未命中
          if (i % 3 === 0) {
            testData.delete(key);
          }
        }

        // 清理
        testData.clear();
      },
      30
    );
  }

  /**
   * 对象池性能测试
   */
  async benchmarkObjectPool(): Promise<BenchmarkResult> {
    const pool: any[] = [];
    const maxPoolSize = 100;

    const createObject = () => ({
      id: Math.random(),
      data: new Array(50).fill(Math.random()),
      active: true
    });

    const getFromPool = () => {
      if (pool.length > 0) {
        const obj = pool.pop();
        obj.active = true;
        return obj;
      }
      return createObject();
    };

    const returnToPool = (obj: any) => {
      if (pool.length < maxPoolSize) {
        obj.active = false;
        pool.push(obj);
      }
    };

    return await performanceMonitor.runBenchmark(
      'Object Pool Performance',
      () => {
        const objects = [];

        // 从池中获取对象
        for (let i = 0; i < 200; i++) {
          objects.push(getFromPool());
        }

        // 归还对象到池
        objects.forEach(obj => returnToPool(obj));
        objects.length = 0;
      },
      50
    );
  }

  /**
   * WebAssembly性能测试
   */
  async benchmarkWebAssembly(): Promise<BenchmarkResult> {
    // 模拟WASM vs JS性能对比
    const testArray = new Array(1000).fill(0).map(() => Math.floor(Math.random() * 6) + 1);

    const jsImplementation = (arr: number[]) => {
      let matches = 0;
      for (let i = 0; i < arr.length - 2; i++) {
        if (arr[i] === arr[i + 1] && arr[i + 1] === arr[i + 2]) {
          matches++;
        }
      }
      return matches;
    };

    return await performanceMonitor.runBenchmark(
      'WebAssembly vs JavaScript',
      () => {
        // JavaScript实现
        const jsResult = jsImplementation(testArray);

        // 模拟WASM调用开销
        const wasmOverhead = Math.random() * 0.001; // 模拟WASM调用开销
        const wasmResult = jsResult; // 相同结果，但有调用开销

        // 不返回值，只执行计算
        void jsResult;
        void wasmResult;
        void wasmOverhead;
      },
      100
    );
  }

  /**
   * 运行内存和性能基准测试套件
   */
  async runMemoryAndPerformanceSuite(): Promise<BenchmarkResult[]> {
    console.log('🧠 开始运行内存和性能基准测试套件...');

    const results: BenchmarkResult[] = [];

    try {
      console.log('📊 测试1: 内存管理性能');
      results.push(await this.benchmarkMemoryManagement());

      console.log('📊 测试2: 缓存压力测试');
      results.push(await this.benchmarkCacheStress());

      console.log('📊 测试3: 对象池性能');
      results.push(await this.benchmarkObjectPool());

      console.log('📊 测试4: WebAssembly性能');
      results.push(await this.benchmarkWebAssembly());

      console.log('✅ 内存和性能基准测试套件完成');
      this.printResults(results);

    } catch (error) {
      console.error('❌ 内存和性能基准测试失败:', error);
    }

    return results;
  }

  /**
   * 网络请求性能基准测试
   */
  async benchmarkNetworkRequests(): Promise<BenchmarkResult> {
    const testUrls = [
      '/tiles/tile-1.webp',
      '/tiles/tile-2.webp',
      '/audio/sfx/click.mp3',
      '/manifest.json'
    ];

    return await performanceMonitor.runBenchmark(
      'Network Requests',
      async () => {
        const promises = testUrls.map(async (url) => {
          try {
            const response = await fetch(url, {
              cache: 'no-cache',
              method: 'HEAD'
            });
            return response.ok;
          } catch {
            return false;
          }
        });

        const results = await Promise.all(promises);
        const successCount = results.filter(Boolean).length;
        void successCount; // 使用结果但不返回
      },
      5
    );
  }

  /**
   * Service Worker缓存性能测试
   */
  async benchmarkServiceWorkerCache(): Promise<BenchmarkResult> {
    const testData = new Array(100).fill(0).map((_, i) => ({
      id: i,
      data: `test-data-${i}`,
      timestamp: Date.now()
    }));

    return await performanceMonitor.runBenchmark(
      'Service Worker Cache',
      async () => {
        // 模拟缓存操作
        const cache = await caches.open('test-cache');

        // 存储测试数据
        const requests = testData.map(item =>
          cache.put(`/test/${item.id}`, new Response(JSON.stringify(item)))
        );
        await Promise.all(requests);

        // 读取测试数据
        const responses = testData.map(item => cache.match(`/test/${item.id}`));
        await Promise.all(responses);

        // 清理测试缓存
        await caches.delete('test-cache');
      },
      3
    );
  }

  /**
   * 离线存储性能测试
   */
  async benchmarkOfflineStorage(): Promise<BenchmarkResult> {
    const testData = {
      gameBoard: new Array(64).fill(0).map((_, i) => ({
        id: i,
        type: Math.floor(Math.random() * 6) + 1,
        row: Math.floor(i / 8),
        col: i % 8
      })),
      score: 12345,
      level: 5,
      moves: 100
    };

    return await performanceMonitor.runBenchmark(
      'Offline Storage',
      async () => {
        // 模拟IndexedDB操作
        const dbName = 'test-offline-db';
        const request = indexedDB.open(dbName, 1);

        const db = await new Promise<IDBDatabase>((resolve, reject) => {
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
          request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains('gameStates')) {
              db.createObjectStore('gameStates', { keyPath: 'id', autoIncrement: true });
            }
          };
        });

        // 存储数据
        const transaction = db.transaction(['gameStates'], 'readwrite');
        const store = transaction.objectStore('gameStates');

        await new Promise<void>((resolve, reject) => {
          const request = store.add({ ...testData, timestamp: Date.now() });
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });

        // 读取数据
        await new Promise<void>((resolve, reject) => {
          const request = store.getAll();
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });

        db.close();

        // 清理测试数据库
        await new Promise<void>((resolve) => {
          const deleteRequest = indexedDB.deleteDatabase(dbName);
          deleteRequest.onsuccess = () => resolve();
          deleteRequest.onerror = () => resolve(); // 忽略删除错误
        });
      },
      5
    );
  }

  /**
   * 网络质量检测测试
   */
  async benchmarkNetworkQuality(): Promise<BenchmarkResult> {
    return await performanceMonitor.runBenchmark(
      'Network Quality Detection',
      async () => {
        // 模拟网络质量检测
        const startTime = performance.now();

        try {
          // 发送小请求测试延迟
          const response = await fetch('/favicon.ico', {
            method: 'HEAD',
            cache: 'no-cache'
          });

          const endTime = performance.now();
          const latency = endTime - startTime;

          // 模拟带宽检测
          const connection = (navigator as any).connection;
          const effectiveType = connection?.effectiveType || 'unknown';
          const downlink = connection?.downlink || 0;

          const result = {
            latency,
            effectiveType,
            downlink,
            online: response.ok
          };
          void result; // 使用结果但不返回
        } catch {
          const result = {
            latency: 9999,
            effectiveType: 'offline',
            downlink: 0,
            online: false
          };
          void result; // 使用结果但不返回
        }
      },
      10
    );
  }

  /**
   * 资源压缩效果测试
   */
  async benchmarkResourceCompression(): Promise<BenchmarkResult> {
    const testData = JSON.stringify({
      largeArray: new Array(1000).fill(0).map((_, i) => ({
        id: i,
        name: `item-${i}`,
        description: `This is a test item with id ${i}`,
        data: new Array(50).fill(`data-${i}`)
      }))
    });

    return await performanceMonitor.runBenchmark(
      'Resource Compression',
      async () => {
        // 模拟压缩效果测试
        const originalSize = new Blob([testData]).size;

        // 模拟Gzip压缩（简化版本）
        const compressedData = testData.replace(/\s+/g, ' ').trim();
        const compressedSize = new Blob([compressedData]).size;

        const compressionRatio = (originalSize - compressedSize) / originalSize;

        const result = {
          originalSize,
          compressedSize,
          compressionRatio,
          savings: compressionRatio * 100
        };
        void result; // 使用结果但不返回
      },
      20
    );
  }

  /**
   * 运行网络性能基准测试套件
   */
  async runNetworkSuite(): Promise<BenchmarkResult[]> {
    console.log('🌐 开始运行网络性能基准测试套件...');

    const results: BenchmarkResult[] = [];

    try {
      console.log('📊 测试1: 网络请求性能');
      results.push(await this.benchmarkNetworkRequests());

      console.log('📊 测试2: Service Worker缓存');
      results.push(await this.benchmarkServiceWorkerCache());

      console.log('📊 测试3: 离线存储性能');
      results.push(await this.benchmarkOfflineStorage());

      console.log('📊 测试4: 网络质量检测');
      results.push(await this.benchmarkNetworkQuality());

      console.log('📊 测试5: 资源压缩效果');
      results.push(await this.benchmarkResourceCompression());

      console.log('✅ 网络性能基准测试套件完成');
      this.printResults(results);

    } catch (error) {
      console.error('❌ 网络性能基准测试失败:', error);
    }

    return results;
  }

  /**
   * 交互响应时间测试
   */
  async benchmarkInteractionResponse(): Promise<BenchmarkResult> {
    return await performanceMonitor.runBenchmark(
      'Interaction Response Time',
      async () => {
        // 模拟点击交互
        const button = document.createElement('button');
        button.textContent = '测试按钮';
        document.body.appendChild(button);

        const startTime = performance.now();

        // 模拟点击事件
        const clickEvent = new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          view: window
        });

        button.dispatchEvent(clickEvent);

        const endTime = performance.now();
        const responseTime = endTime - startTime;

        // 清理
        document.body.removeChild(button);

        void responseTime; // 使用结果但不返回
      },
      50
    );
  }

  /**
   * 动画流畅度测试
   */
  async benchmarkAnimationSmoothness(): Promise<BenchmarkResult> {
    return await performanceMonitor.runBenchmark(
      'Animation Smoothness',
      async () => {
        const element = document.createElement('div');
        element.style.cssText = `
          width: 50px;
          height: 50px;
          background: red;
          position: absolute;
          top: 0;
          left: 0;
        `;
        document.body.appendChild(element);

        // 测量动画性能
        const animation = element.animate([
          { transform: 'translateX(0px)' },
          { transform: 'translateX(200px)' }
        ], {
          duration: 1000,
          easing: 'ease-in-out'
        });

        await animation.finished;

        // 清理
        document.body.removeChild(element);
      },
      10
    );
  }

  /**
   * 响应式布局测试
   */
  async benchmarkResponsiveLayout(): Promise<BenchmarkResult> {
    return await performanceMonitor.runBenchmark(
      'Responsive Layout',
      async () => {
        const container = document.createElement('div');
        container.style.cssText = `
          width: 100%;
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        `;

        // 创建多个响应式元素
        for (let i = 0; i < 20; i++) {
          const item = document.createElement('div');
          item.style.cssText = `
            flex: 1 1 calc(25% - 10px);
            height: 50px;
            background: blue;
            min-width: 100px;
          `;
          container.appendChild(item);
        }

        document.body.appendChild(container);

        // 模拟窗口大小变化

        // 触发重新布局
        container.style.width = '50%';
        await new Promise(resolve => requestAnimationFrame(resolve));

        container.style.width = '100%';
        await new Promise(resolve => requestAnimationFrame(resolve));

        // 清理
        document.body.removeChild(container);
      },
      5
    );
  }

  /**
   * 可访问性测试
   */
  async benchmarkAccessibility(): Promise<BenchmarkResult> {
    return await performanceMonitor.runBenchmark(
      'Accessibility Features',
      async () => {
        // 测试键盘导航
        const elements = [];
        for (let i = 0; i < 10; i++) {
          const button = document.createElement('button');
          button.textContent = `按钮 ${i + 1}`;
          button.tabIndex = i;
          document.body.appendChild(button);
          elements.push(button);
        }

        // 模拟Tab键导航
        for (const element of elements) {
          element.focus();
          await new Promise(resolve => setTimeout(resolve, 10));
        }

        // 测试ARIA标签
        elements.forEach((element, index) => {
          element.setAttribute('aria-label', `测试按钮 ${index + 1}`);
          element.setAttribute('role', 'button');
        });

        // 清理
        elements.forEach(element => {
          if (element.parentNode) {
            element.parentNode.removeChild(element);
          }
        });
      },
      20
    );
  }

  /**
   * 加载体验测试
   */
  async benchmarkLoadingExperience(): Promise<BenchmarkResult> {
    return await performanceMonitor.runBenchmark(
      'Loading Experience',
      async () => {
        // 测试骨架屏创建
        const container = document.createElement('div');
        document.body.appendChild(container);

        // 创建多个骨架屏元素
        for (let i = 0; i < 5; i++) {
          const skeleton = document.createElement('div');
          skeleton.className = 'skeleton';
          skeleton.style.cssText = `
            width: 100%;
            height: 20px;
            background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
            background-size: 200% 100%;
            animation: skeleton-loading 1.5s infinite;
            margin-bottom: 10px;
          `;
          container.appendChild(skeleton);
        }

        // 模拟加载完成
        await new Promise(resolve => setTimeout(resolve, 100));

        // 清理
        document.body.removeChild(container);
      },
      15
    );
  }

  /**
   * 触摸交互测试
   */
  async benchmarkTouchInteraction(): Promise<BenchmarkResult> {
    return await performanceMonitor.runBenchmark(
      'Touch Interaction',
      async () => {
        const element = document.createElement('div');
        element.style.cssText = `
          width: 100px;
          height: 100px;
          background: green;
          touch-action: manipulation;
        `;
        document.body.appendChild(element);

        // 模拟触摸事件
        const touchStart = new TouchEvent('touchstart', {
          bubbles: true,
          cancelable: true,
          touches: [{
            clientX: 50,
            clientY: 50,
            identifier: 0,
            target: element,
            force: 1,
            pageX: 50,
            pageY: 50,
            radiusX: 10,
            radiusY: 10,
            rotationAngle: 0,
            screenX: 50,
            screenY: 50
          } as unknown as Touch]
        });

        const touchEnd = new TouchEvent('touchend', {
          bubbles: true,
          cancelable: true,
          changedTouches: [{
            clientX: 50,
            clientY: 50,
            identifier: 0,
            target: element,
            force: 1,
            pageX: 50,
            pageY: 50,
            radiusX: 10,
            radiusY: 10,
            rotationAngle: 0,
            screenX: 50,
            screenY: 50
          } as unknown as Touch]
        });

        element.dispatchEvent(touchStart);
        await new Promise(resolve => setTimeout(resolve, 10));
        element.dispatchEvent(touchEnd);

        // 清理
        document.body.removeChild(element);
      },
      30
    );
  }

  /**
   * 运行用户体验基准测试套件
   */
  async runUserExperienceSuite(): Promise<BenchmarkResult[]> {
    console.log('🎨 开始运行用户体验基准测试套件...');

    const results: BenchmarkResult[] = [];

    try {
      console.log('📊 测试1: 交互响应时间');
      results.push(await this.benchmarkInteractionResponse());

      console.log('📊 测试2: 动画流畅度');
      results.push(await this.benchmarkAnimationSmoothness());

      console.log('📊 测试3: 响应式布局');
      results.push(await this.benchmarkResponsiveLayout());

      console.log('📊 测试4: 可访问性功能');
      results.push(await this.benchmarkAccessibility());

      console.log('📊 测试5: 加载体验');
      results.push(await this.benchmarkLoadingExperience());

      console.log('📊 测试6: 触摸交互');
      results.push(await this.benchmarkTouchInteraction());

      console.log('✅ 用户体验基准测试套件完成');
      this.printResults(results);

    } catch (error) {
      console.error('❌ 用户体验基准测试失败:', error);
    }

    return results;
  }
}

/**
 * 全局基准测试套件实例
 */
export const benchmarkSuite = BenchmarkSuite.getInstance();

// 在开发环境中挂载到全局
if (import.meta.env.DEV) {
  (window as any).benchmarkSuite = benchmarkSuite;
  console.log('🧪 基准测试套件已挂载到 window.benchmarkSuite');
}
