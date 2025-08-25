import type {
    BoardStyle,
    GameConfig,
    GameTile,
    MatchResult,
    Particle,
    PlaySfxFunction,
    SelectionState,
    ShowMessageTip,
    TileCoordinates
} from '@/types/game';
import { configManager } from '@/utils/configManager';
import { ConfigurableGameBoard } from '@/utils/configurableGameBoard';
import { DynamicMatchDetector } from '@/utils/dynamicMatchDetector';
import { performanceMonitor } from '@/utils/performanceMonitor';
import { logger } from '@/utils/productionLogger';
import { tileObjectPool } from '@/utils/tileObjectPool';
import { computed, nextTick, ref, type ComputedRef, type Ref } from 'vue';

// 游戏配置常量（将从配置管理器获取）
const getGameConfig = (): GameConfig => {
  const boardConfig = configManager.get('board');
  return {
    boardSize: boardConfig.size,
    tileTypes: boardConfig.tileTypes,
    scoreMultiplier: 10,
    chainBonus: 1
  };
};

// 使用配置常量
const GAME_CONFIG = getGameConfig();

// 资源基础URL（优先使用本地资源，避免CDN加载失败）
export const ASSETS_BASE_URL = import.meta.env.DEV ? '' : './';  // 生产环境也使用相对路径

// 游戏逻辑返回值接口
export interface GameLogicReturn {
  // 状态
  score: Ref<number>;
  movesUsed: Ref<number>;
  gameBoard: Ref<GameTile[][]>;
  selectedTile: Ref<TileCoordinates | null>;
  matchedTiles: Ref<Set<string>>;
  shakingTile: Ref<TileCoordinates | null>;
  particles: Ref<Particle[]>;
  showChainEffect: Ref<boolean>;
  chainCount: Ref<number>;
  isProcessing: Ref<boolean>;
  
  // 计算属性
  flatBoard: ComputedRef<GameTile[]>;
  boardStyle: ComputedRef<BoardStyle>;
  adjacentTiles: ComputedRef<TileCoordinates[]>;
  
  // 选择状态
  isSelecting: ComputedRef<boolean>;
  canSelect: ComputedRef<boolean>;
  highlightedTiles: ComputedRef<Set<string>>;
  selectedTileFromState: ComputedRef<TileCoordinates | null>;
  
  // 方法
  handleTileClick: (coords: TileCoordinates, showTip: ShowMessageTip) => Promise<void | string>;
  resetGame: () => void;
  emergencyReset: () => void;
  testGameSfx: () => Promise<void>;
  testChainMatching: () => Promise<void>;
  cleanup: () => void;
  
  // 内部状态访问器（用于调试）
  isSwapping: Ref<boolean>;
  isChecking: Ref<boolean>;
}

/**
 * 游戏逻辑组合式函数
 * @param playNamedSfx 播放音效的函数
 * @returns 游戏逻辑相关的状态和方法
 */
export function useGameLogic(playNamedSfx: PlaySfxFunction): GameLogicReturn {
  logger.game('useGameLogic 初始化，playNamedSfx 函数类型:', typeof playNamedSfx);

  // --- 可配置游戏板和匹配检测器 ---
  const configurableBoard = new ConfigurableGameBoard();
  const dynamicMatchDetector = new DynamicMatchDetector({
    minMatchLength: configurableBoard.minMatchLength,
    allowDiagonalMatches: false,
    allowSpecialShapes: true,
    enableScoring: true
  });

  // --- 定时器管理 - 防止内存泄漏 ---
  const activeTimers = new Set<number>();

  const safeSetTimeout = (callback: () => void, delay: number): number => {
    const timerId = window.setTimeout(() => {
      activeTimers.delete(timerId);
      callback();
    }, delay);
    activeTimers.add(timerId);
    return timerId;
  };

  const clearAllTimers = () => {
    const timerCount = activeTimers.size;
    activeTimers.forEach(timerId => {
      clearTimeout(timerId);
    });
    activeTimers.clear();
    if (timerCount > 0) {
      logger.game(`清理了 ${timerCount} 个活跃定时器`);
    }
  };

  // --- 游戏状态管理 ---
  const gameBoard = ref<GameTile[][]>(configurableBoard.getTiles());
  const score = ref<number>(0);
  const movesUsed = ref<number>(0);

  // --- 内部状态变量 ---
  const selectedTile = ref<TileCoordinates | null>(null);
  const isProcessing = ref<boolean>(false);
  const chainCount = ref<number>(0);
  const matchedTiles = ref<Set<string>>(new Set());
  const shakingTile = ref<TileCoordinates | null>(null);
  const particles = ref<Particle[]>([]);
  const showChainEffect = ref<boolean>(false);

  // --- 简化的操作管理 ---
  let currentOperationId = 0;

  // 生成唯一操作ID（用于日志追踪）
  const generateOperationId = (): number => {
    return ++currentOperationId;
  };

  // 兼容性别名
  const isSwapping = ref<boolean>(false);
  const isChecking = ref<boolean>(false);

  // 选择状态管理
  const selectionState = ref<SelectionState>({
    isSelecting: false,
    canSelect: true,
    selectedTile: null,
    highlightedTiles: new Set()
  });

  // --- 计算属性 ---
  const flatBoard = computed<GameTile[]>(() => {
    if (!gameBoard.value || gameBoard.value.length === 0) {
      logger.warn('gameBoard 为空，返回空数组');
      return [];
    }

    // 简化：直接展平数组，过滤掉空方块
    const flat: GameTile[] = [];
    const board = gameBoard.value;

    for (let r = 0; r < board.length; r++) {
      const row = board[r];
      if (row) {
        for (let c = 0; c < row.length; c++) {
          const tile = row[c];
          if (tile && tile.type > 0) { // 只包含非空方块
            flat.push(tile);
          }
        }
      }
    }

    return flat;
  });

  const boardStyle = computed<BoardStyle>(() => ({
    gridTemplateColumns: `repeat(${configurableBoard.width}, 1fr)`,
    gridTemplateRows: `repeat(${configurableBoard.height}, 1fr)`
  }));

  const adjacentTiles = computed<TileCoordinates[]>(() => {
    if (!selectedTile.value) return [];
    
    const { row, col } = selectedTile.value;
    const adjacent: TileCoordinates[] = [];
    
    // 上下左右四个方向
    const directions = [
      { row: -1, col: 0 }, // 上
      { row: 1, col: 0 },  // 下
      { row: 0, col: -1 }, // 左
      { row: 0, col: 1 }   // 右
    ];
    
    directions.forEach(dir => {
      const newRow = row + dir.row;
      const newCol = col + dir.col;
      if (isValidCoordinates({ row: newRow, col: newCol })) {
        adjacent.push({ row: newRow, col: newCol });
      }
    });
    
    return adjacent;
  });

  // 选择状态计算属性
  const isSelecting = computed<boolean>(() => selectionState.value.isSelecting);
  const canSelect = computed<boolean>(() => selectionState.value.canSelect);
  const highlightedTiles = computed<Set<string>>(() => selectionState.value.highlightedTiles);
  const selectedTileFromState = computed<TileCoordinates | null>(() => selectionState.value.selectedTile);

  // --- 辅助函数 ---
  
  /**
   * 验证坐标是否有效
   */
  function isValidCoordinates(coords: TileCoordinates): boolean {
    return coords.row >= 0 && coords.row < GAME_CONFIG.boardSize && 
           coords.col >= 0 && coords.col < GAME_CONFIG.boardSize;
  }

  /**
   * 检查两个方块是否相邻
   */
  function areAdjacent(tile1: TileCoordinates, tile2: TileCoordinates): boolean {
    const rowDiff = Math.abs(tile1.row - tile2.row);
    const colDiff = Math.abs(tile1.col - tile2.col);
    return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
  }

  /**
   * 生成唯一的方块ID
   */
  function generateTileId(row: number, col: number): string {
    return `tile-${row}-${col}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 深拷贝游戏棋盘 - 优化版本使用对象池
   */
  function cloneBoard(board: GameTile[][]): GameTile[][] {
    return tileObjectPool.cloneBoard(board);
  }

  /**
   * 初始化游戏棋盘 - 使用可配置游戏板
   */
  function initializeBoard(): void {
    const config = configurableBoard.getConfig();
    logger.game('开始初始化棋盘 - 尺寸:', config.width, 'x', config.height, '方块类型数:', config.tileTypes);

    performanceMonitor.startTimer('initializeBoard');

    // 重新生成可配置游戏板
    configurableBoard.regenerateBoard();

    // 同步到Vue响应式状态
    gameBoard.value = configurableBoard.getTiles();

    const duration = performanceMonitor.endTimer('initializeBoard');
    logger.perf(`棋盘初始化完成，总方块数: ${config.width * config.height}`, duration);

    // 记录响应式更新
    performanceMonitor.recordReactiveUpdate('gameboard');
  }

  /**
   * 检查棋盘中的匹配 - 优化版本
   */
  function checkMatches(board: GameTile[][]): MatchResult[] {
    const boardConfig = configurableBoard.getConfig();

    // 使用动态匹配检测器
    const dynamicMatches = dynamicMatchDetector.detectAllMatches(board, boardConfig);

    // 转换为原始MatchResult格式以保持兼容性
    const matches: MatchResult[] = dynamicMatches.map(match => ({
      row: match.startPosition.row,
      col: match.startPosition.col,
      type: match.type,
      isSpecial: match.type !== 'horizontal' && match.type !== 'vertical'
    }));

    logger.game(`匹配检测完成 - 发现 ${matches.length} 个匹配`);
    return matches;
  }

  /**
   * 处理方块点击事件
   */
  const handleTileClick = async (tileCoords: TileCoordinates, showMessageTip: ShowMessageTip): Promise<void | string> => {
    logger.game(`handleTileClick 被调用 - 坐标: (${tileCoords.row}, ${tileCoords.col})`);

    // 防止竞态条件 - 使用操作队列
    return executeOperation(async () => {
      if (isProcessing.value) {
        logger.game('游戏正在处理中，忽略点击');
        return;
      }

      const operationId = generateOperationId();
      logger.game(`开始处理点击操作 ID: ${operationId}`);

      await handleTileClickInternal(tileCoords, showMessageTip, operationId);
    });
  };

  // 内部点击处理函数
  const handleTileClickInternal = async (tileCoords: TileCoordinates, showMessageTip: ShowMessageTip, operationId: number): Promise<void> => {

    if (!selectedTile.value) {
      // 首次选择方块
      selectedTile.value = tileCoords;
      logger.audio('首次选择方块，播放点击音效');
      if (playNamedSfx) {
        try {
          await playNamedSfx('click');
        } catch (e) {
          logger.error('点击音效播放失败:', e);
        }
      }
      return;
    }

    // 检查是否点击同一个方块（取消选择）
    if (selectedTile.value.row === tileCoords.row && selectedTile.value.col === tileCoords.col) {
      selectedTile.value = null;
      if (playNamedSfx) {
        try {
          await playNamedSfx('click');
        } catch (e) {
          logger.error('点击音效播放失败:', e);
        }
      }
      return;
    }

    if (areAdjacent(selectedTile.value, tileCoords)) {
      // 尝试交换相邻方块
      logger.game(`尝试交换相邻方块: (${selectedTile.value.row}, ${selectedTile.value.col}) <-> (${tileCoords.row}, ${tileCoords.col})`);
      const firstTile = selectedTile.value;
      selectedTile.value = null;
      await attemptSwap(firstTile, tileCoords, showMessageTip, operationId);
    } else {
      // 非相邻方块：播放错误音效并选择新方块
      logger.game(`尝试交换非相邻方块`);

      if (playNamedSfx) {
        try {
          await playNamedSfx('error');
        } catch (e) {
          logger.error('错误音效播放失败:', e);
        }
      }

      // 显示震动效果
      shakingTile.value = selectedTile.value;
      safeSetTimeout(() => {
        shakingTile.value = tileCoords;
      }, 100);
      safeSetTimeout(() => {
        shakingTile.value = null;
      }, 400);

      // 选择新方块
      selectedTile.value = tileCoords;
      if (showMessageTip) {
        showMessageTip('请选择相邻的方块', 'error');
      }
    }
  };

  /**
   * 尝试交换两个方块
   */
  async function attemptSwap(tile1Coords: TileCoordinates, tile2Coords: TileCoordinates, showMessageTip: ShowMessageTip, operationId?: number): Promise<void> {
    logger.game(`开始交换方块: (${tile1Coords.row}, ${tile1Coords.col}) <-> (${tile2Coords.row}, ${tile2Coords.col}), 操作ID: ${operationId}`);

    // 设置处理状态，防止并发操作
    if (isProcessing.value) {
      logger.warn('尝试在处理中进行交换，操作被拒绝');
      return;
    }

    isProcessing.value = true;
    isSwapping.value = true;
    movesUsed.value++;

    try {
      // 播放交换音效 - 立即触发，不等待完成
      if (playNamedSfx) {
        // 立即播放音效，不阻塞交换逻辑
        playNamedSfx('swap').catch(e => {
          logger.error('交换音效播放失败:', e);
        });
      }

      const { row: r1, col: c1 } = tile1Coords;
      const { row: r2, col: c2 } = tile2Coords;

      // 执行交换
      const newBoard = cloneBoard(gameBoard.value);
      [newBoard[r1][c1], newBoard[r2][c2]] = [newBoard[r2][c2], newBoard[r1][c1]];

      // 更新方块的行列信息
      newBoard[r1][c1].row = r1;
      newBoard[r1][c1].col = c1;
      newBoard[r2][c2].row = r2;
      newBoard[r2][c2].col = c2;

      // 检查匹配
      const matches = checkMatches(newBoard);
      logger.game(`交换结果检查 - 匹配数量: ${matches.length}`);

      // 更新视图
      gameBoard.value = newBoard;
      await nextTick();

      if (matches.length > 0) {
        // 有效交换：处理匹配
        logger.game('有效交换，处理匹配');
        // 使用Promise链确保操作顺序
        await new Promise<void>(resolve => {
          safeSetTimeout(() => resolve(), 150);
        });
        chainCount.value = 0;
        await processMatches(newBoard, showMessageTip);
      } else {
        // 无效交换：显示错误信息并恢复
        logger.game('无效交换，显示错误并恢复原状');

        if (showMessageTip) {
          showMessageTip('无效移动', 'error');
        }

        if (playNamedSfx) {
          try {
            await playNamedSfx('error');
          } catch (e) {
            logger.error('错误音效播放失败:', e);
          }
        }

        // 添加震动效果
        shakingTile.value = { row: r1, col: c1 };
        safeSetTimeout(() => {
          shakingTile.value = { row: r2, col: c2 };
        }, 100);
        safeSetTimeout(() => {
          shakingTile.value = null;
        }, 400);

        // 恢复原状 - 使用Promise链确保操作顺序
        await new Promise<void>(resolve => {
          safeSetTimeout(() => resolve(), 300);
        });
        [gameBoard.value[r1][c1], gameBoard.value[r2][c2]] = [gameBoard.value[r2][c2], gameBoard.value[r1][c1]];

        // 恢复方块的行列信息
        gameBoard.value[r1][c1].row = r1;
        gameBoard.value[r1][c1].col = c1;
        gameBoard.value[r2][c2].row = r2;
        gameBoard.value[r2][c2].col = c2;

        movesUsed.value--; // 无效移动不计入步数
      }
    } catch (error) {
      logger.error('交换过程中发生错误:', error);
      if (showMessageTip) {
        showMessageTip('交换失败，请重试', 'error');
      }
    } finally {
      isProcessing.value = false;
      isSwapping.value = false;
    }
  }

  /**
   * 处理匹配和连锁反应
   */
  async function processMatches(board: GameTile[][], showMessageTip: ShowMessageTip): Promise<void> {
    const matches = checkMatches(board);
    if (matches.length === 0) return;

    chainCount.value++;
    const scoreToAdd = matches.length * GAME_CONFIG.scoreMultiplier * chainCount.value;
    score.value += scoreToAdd;

    logger.game(`连锁消除 #${chainCount.value} - 总匹配数: ${matches.length}, 得分: +${scoreToAdd}`);

    // 播放匹配音效 - 优化同步性，确保95%以上同步率
    if (playNamedSfx) {
      try {
        const audioStartTime = performance.now();

        // 立即触发音效，记录同步性能
        const audioPromise = playNamedSfx('match');

        // 监控音效播放延迟
        audioPromise.then(() => {
          const audioLatency = performance.now() - audioStartTime;
          if (audioLatency > 50) { // 超过50ms认为延迟过高
            console.warn(`🔊 音效播放延迟: ${audioLatency.toFixed(2)}ms`);
          }

          // 记录音效同步性能
          if (window.performanceMonitor) {
            window.performanceMonitor.recordMetric('audioSyncLatency', audioLatency);
          }
        }).catch(e => {
          logger.error('匹配音效播放失败:', e);

          // 记录音效失败
          if (window.performanceMonitor) {
            window.performanceMonitor.recordMetric('audioSyncFailure', 1);
          }
        });
      } catch (e) {
        logger.error('匹配音效播放失败:', e);
      }
    }

    // 显示连锁效果
    if (chainCount.value > 1) {
      showChainEffect.value = true;
      safeSetTimeout(() => { showChainEffect.value = false; }, 1000);

      if (showMessageTip) {
        showMessageTip(`连锁 x${chainCount.value}!`, 'chain', 1500);
      }
    }

    // 标记匹配的方块为待消除
    matches.forEach(({ row, col }) => {
      if (board[row] && board[row][col]) {
        board[row][col].type = 0;
      }
    });

    // 更新匹配状态用于视觉效果
    const matchKeys = matches.map(({ row, col }) => `${row}-${col}`);
    matchedTiles.value = new Set(matchKeys);

    // 直接更新引用
    gameBoard.value = board;

    // 使用Promise链确保操作顺序
    await new Promise<void>(resolve => {
      safeSetTimeout(() => resolve(), 300);
    });

    // 清除匹配状态
    matchedTiles.value = new Set();

    await handleFall(board);
    await fillNewTiles(board);
    await processMatches(board, showMessageTip); // 递归处理新的匹配
  }

  /**
   * 处理方块下落
   */
  async function handleFall(board: GameTile[][]): Promise<void> {
    logger.game('开始处理方块下落');
    let hasFallen = false;

    for (let c = 0; c < GAME_CONFIG.boardSize; c++) {
      let emptyRow = GAME_CONFIG.boardSize - 1;
      for (let r = GAME_CONFIG.boardSize - 1; r >= 0; r--) {
        if (board[r][c].type !== 0) {
          if (emptyRow !== r) {
            logger.game(`方块下落: (${r}, ${c}) -> (${emptyRow}, ${c})`);
            [board[emptyRow][c], board[r][c]] = [board[r][c], board[emptyRow][c]];

            // 更新方块位置信息
            board[emptyRow][c].row = emptyRow;
            board[emptyRow][c].col = c;
            board[r][c].row = r;
            board[r][c].col = c;

            hasFallen = true;
          }
          emptyRow--;
        }
      }
    }

    if (hasFallen) {
      if (playNamedSfx) {
        try {
          await playNamedSfx('fall');
        } catch (e) {
          logger.error('下落音效播放失败:', e);
        }
      }
    }

    // 直接更新引用，避免不必要的克隆
    gameBoard.value = board;
    performanceMonitor.recordReactiveUpdate('gameboard');
    // 使用Promise链确保操作顺序
    await new Promise<void>(resolve => {
      safeSetTimeout(() => resolve(), 200);
    });
  }

  /**
   * 填充新的方块 - 优化版本使用对象池
   */
  async function fillNewTiles(board: GameTile[][]): Promise<void> {
    logger.game('开始填充新方块');

    performanceMonitor.startTimer('fillNewTiles');

    const filledCount = tileObjectPool.fillEmptyTiles(board, GAME_CONFIG.tileTypes);

    if (filledCount > 0) {
      logger.game(`总共填充了 ${filledCount} 个新方块`);

      // 直接更新引用，避免不必要的克隆
      gameBoard.value = board;
      performanceMonitor.recordReactiveUpdate('gameboard');

      // 使用Promise链确保操作顺序
      await new Promise<void>(resolve => {
        safeSetTimeout(() => resolve(), 100);
      });
    }

    const duration = performanceMonitor.endTimer('fillNewTiles');
    logger.perf(`填充完成`, duration);
  }

  // 事件监听器引用，用于清理
  const resizeHandler = (event: any) => {
    logger.game('游戏板尺寸已变更:', event.data);
    gameBoard.value = configurableBoard.getTiles();

    // 更新匹配检测器配置
    dynamicMatchDetector.updateConfig({
      minMatchLength: configurableBoard.minMatchLength
    });
  };

  const clearHandler = (event: any) => {
    logger.game('游戏板已重新生成:', event.data);
    gameBoard.value = configurableBoard.getTiles();
  };

  // 监听可配置游戏板事件
  configurableBoard.addEventListener('resize', resizeHandler);
  configurableBoard.addEventListener('clear', clearHandler);

  // 清理函数 - 移除所有事件监听器和定时器
  const cleanup = () => {
    logger.game('开始清理useGameLogic资源...');

    try {
      // 清理所有活跃定时器
      clearAllTimers();

      // 清理操作队列
      operationQueue.length = 0;
      isExecutingQueue = false;
      currentOperationId = 0;

      // 移除事件监听器
      configurableBoard.removeEventListener('resize', resizeHandler);
      configurableBoard.removeEventListener('clear', clearHandler);

      // 清理性能监控器
      performanceMonitor.cleanup?.();

      // 清理对象池
      tileObjectPool.cleanup?.();

      // 重置状态
      isProcessing.value = false;
      selectedTile.value = null;
      shakingTile.value = null;
      showChainEffect.value = false;
      matchedTiles.value.clear();
      particles.value = [];

      logger.game('useGameLogic资源清理完成');
    } catch (error) {
      logger.error('清理useGameLogic资源时发生错误:', error);
    }
  };

  // 组件卸载时自动清理
  onUnmounted(() => {
    cleanup();
  });

  // 初始化棋盘
  logger.game('开始初始化游戏棋盘...');
  initializeBoard();
  logger.game('游戏棋盘初始化完成');

  return {
    // 状态
    score,
    movesUsed,
    gameBoard,
    selectedTile,
    matchedTiles,
    shakingTile,
    particles,
    showChainEffect,
    chainCount,
    isProcessing,
    
    // 计算属性
    flatBoard,
    boardStyle,
    adjacentTiles,
    
    // 选择状态
    isSelecting,
    canSelect,
    highlightedTiles,
    selectedTileFromState,
    
    // 方法
    handleTileClick,
    resetGame: () => {
      logger.game('重置游戏');
      score.value = 0;
      movesUsed.value = 0;
      chainCount.value = 0;
      selectedTile.value = null;
      matchedTiles.value = new Set();
      shakingTile.value = null;
      particles.value = [];
      showChainEffect.value = false;
      isProcessing.value = false;
      initializeBoard();
    },
    emergencyReset: () => {
      logger.warn('紧急重置游戏状态');
      // 重置所有状态到初始值
      score.value = 0;
      movesUsed.value = 0;
      chainCount.value = 0;
      selectedTile.value = null;
      matchedTiles.value = new Set();
      shakingTile.value = null;
      particles.value = [];
      showChainEffect.value = false;
      isProcessing.value = false;
      isSwapping.value = false;
      isChecking.value = false;

      // 重新初始化棋盘
      try {
        initializeBoard();
        logger.info('紧急重置完成');
      } catch (error) {
        logger.error('紧急重置失败:', error);
        // 如果初始化失败，创建一个基本的棋盘
        gameBoard.value = Array(GAME_CONFIG.boardSize).fill(null).map((_, r) =>
          Array(GAME_CONFIG.boardSize).fill(null).map((_, c) => ({
            type: Math.floor(Math.random() * GAME_CONFIG.tileTypes) + 1,
            id: generateTileId(r, c),
            row: r,
            col: c
          }))
        );
      }
    },
    testGameSfx: async () => {
      logger.debug('测试游戏音效');
      const testSounds = ['click', 'swap', 'match', 'error', 'fall'];
      for (const sound of testSounds) {
        logger.debug(`测试音效: ${sound}`);
        try {
          await playNamedSfx(sound);
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (e) {
          logger.error(`音效测试失败: ${sound}`, e);
        }
      }
    },
    testChainMatching: async () => {
      logger.debug('测试连锁消除机制');
      // 创建一个测试棋盘，包含预设的匹配
      const testBoard: GameTile[][] = Array(GAME_CONFIG.boardSize).fill(null).map((_, r) =>
        Array(GAME_CONFIG.boardSize).fill(null).map((_, c) => ({
          type: r < 3 && c < 3 ? 1 : Math.floor(Math.random() * GAME_CONFIG.tileTypes) + 1,
          id: generateTileId(r, c),
          row: r,
          col: c
        }))
      );

      gameBoard.value = testBoard;
      logger.debug('测试棋盘已设置，包含预设匹配');

      // 触发匹配检测
      const matches = checkMatches(gameBoard.value);
      logger.debug(`检测到 ${matches.length} 个匹配`);
    },

    // 清理方法 - 手动清理资源
    cleanup,

    // 兼容性别名
    isSwapping,
    isChecking
  };
}
