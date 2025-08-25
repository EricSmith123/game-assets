import { computed, nextTick, ref } from 'vue';

// ==================== 新增逻辑 开始 ====================

/**
 * @description 判断当前环境是否为开发环境
 * Vite 会在 `npm run dev` 时将 import.meta.env.DEV 设置为 true
 * 在 `npm run build` 时将其设置为 false
 */
const IS_DEV = import.meta.env.DEV;

/**
<<<<<<< HEAD
 * @description 检测是否为本地环境
 */
const IS_LOCAL = typeof window !== 'undefined' &&
  (window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1'));

/**
 * @description 根据当前环境动态生成资源的根路径
 * - 在开发环境或本地环境下，我们直接从根目录 '/' 读取 public 文件夹下的资源。
 * - 在生产环境下（打包后），我们使用CDN的绝对路径。
 */
export const ASSETS_BASE_URL = (IS_DEV || IS_LOCAL)
=======
 * @description 根据当前环境动态生成资源的根路径
 * - 在开发环境下，我们直接从根目录 '/' 读取 public 文件夹下的资源。
 * - 在生产环境下（打包后），我们使用CDN的绝对路径。
 */
export const ASSETS_BASE_URL = IS_DEV
>>>>>>> 9fddd3036fe0c9b5a6941f9fb1031aa12c6e3389
  ? '/'
  : 'https://cdn.jsdelivr.net/gh/EricSmith123/game-assets@main/'; // 确保末尾有一个斜杠

// 打印一下当前使用的资源路径，方便调试
<<<<<<< HEAD
console.log(`[当前环境] ${(IS_DEV || IS_LOCAL) ? '本地环境' : '生产环境'}, [资源根路径] ${ASSETS_BASE_URL}`);
=======
console.log(`[当前环境] ${IS_DEV ? '开发环境' : '生产环境'}, [资源根路径] ${ASSETS_BASE_URL}`);
>>>>>>> 9fddd3036fe0c9b5a6941f9fb1031aa12c6e3389

// ==================== 新增逻辑 结束 ====================


/**
 * @description 封装了游戏所有核心玩法逻辑的 Vue Composable
 * @param {Function} playNamedSfx - 播放音效的回调函数
 */
export function useGameLogic(playNamedSfx) {
    console.log('🎮 useGameLogic 初始化，playNamedSfx 函数:', typeof playNamedSfx);

    // --- 游戏状态管理 ---
    const gameBoard = ref([]);
    const score = ref(0);
    const movesUsed = ref(0);

    // --- 内部状态变量 ---
    const selectedTile = ref(null);
    const isProcessing = ref(false);
    const chainCount = ref(0);
    const matchedTiles = ref(new Set());
    const shakingTile = ref(null);
    const particles = ref([]);
    const showChainEffect = ref(false);

    // --- 增强的选择状态管理 ---
    const selectionState = ref({
        selectedTile: null,           // 当前选中的方块
        isSelecting: false,           // 是否处于选择模式
        canSelect: true,              // 是否允许选择（动画期间禁用）
        highlightedTiles: [],         // 高亮显示的可交换方块
        lastClickTime: 0              // 防止重复点击
    });

    console.log('🎯 选择状态管理系统已初始化');

    // --- 常量定义 ---
    const boardSize = 8; // 固定棋盘大小为8x8
    const tileTypes = 6;

    /**
     * @description 初始化棋盘，生成随机方块，并确保开局没有可直接消除的组合
     */
    const initializeBoard = () => {
        console.log('🎮 开始初始化棋盘 - 尺寸:', boardSize, 'x', boardSize, '方块类型数:', tileTypes);
        const board = [];
        let totalTiles = 0;

        for (let r = 0; r < boardSize; r++) {
            board[r] = [];
            for (let c = 0; c < boardSize; c++) {
                let type;
                do {
                    type = Math.floor(Math.random() * tileTypes) + 1;
                } while (
                    (c >= 2 && board[r][c - 1].type === type && board[r][c - 2].type === type) ||
                    (r >= 2 && board[r - 1][c].type === type && board[r - 2][c].type === type)
                );
                board[r][c] = { type, id: `tile-${r}-${c}-${Date.now()}-${Math.random()}` };
                totalTiles++;
            }
        }
        gameBoard.value = board;
        console.log("🎮 棋盘初始化完成 - 总方块数:", totalTiles);
        console.log("🎮 第一行方块示例:", board[0].slice(0, 3));
        console.log("🎮 gameBoard.value 设置完成，长度:", gameBoard.value.length);
    };

    /**
     * @description 处理玩家点击方块的事件
     * @param {{row: number, col: number}} tileCoords - 被点击方块的坐标
     * @param {Function} showMessageTip - 显示消息提示的回调函数
     */
    const handleTileClick = async (tileCoords, showMessageTip) => {
        console.log(`🎮 handleTileClick 被调用 - 坐标: (${tileCoords.row}, ${tileCoords.col})`);

        if (isProcessing.value) {
            console.log('⏸️ 游戏正在处理中，忽略点击');
            return;
        }

        if (!selectedTile.value) {
            // 首次选择方块：播放点击音效
            selectedTile.value = tileCoords;
            console.log('🎵 首次选择方块，播放点击音效');
            if (playNamedSfx) {
                console.log('🎵 调用 playNamedSfx("click") - 首次选择');
                playNamedSfx('click').catch(e => console.error('❌ 点击音效播放失败:', e));
            } else {
                console.error('❌ playNamedSfx 函数未定义');
            }
            return;
        }

        if (selectedTile.value.row === tileCoords.row && selectedTile.value.col === tileCoords.col) {
            // 取消选择：播放点击音效
            selectedTile.value = null;
            console.log('🎵 取消选择方块，播放点击音效');
            if (playNamedSfx) {
                console.log('🎵 调用 playNamedSfx("click") - 取消选择');
                playNamedSfx('click').catch(e => console.error('❌ 点击音效播放失败:', e));
            } else {
                console.error('❌ playNamedSfx 函数未定义');
            }
            return;
        }

        if (areAdjacent(selectedTile.value, tileCoords)) {
            // 尝试交换：不在这里播放音效，由 attemptSwap 根据结果播放
            console.log(`🔄 尝试交换相邻方块: (${selectedTile.value.row}, ${selectedTile.value.col}) <-> (${tileCoords.row}, ${tileCoords.col})`);
            const firstTile = selectedTile.value;
            selectedTile.value = null;
            await attemptSwap(firstTile, tileCoords, showMessageTip);
        } else {
            // 非相邻方块：播放错误音效，显示震动和错误消息，然后选择新方块
            console.log(`❌ 尝试交换非相邻方块: (${selectedTile.value.row}, ${selectedTile.value.col}) <-> (${tileCoords.row}, ${tileCoords.col})`);

            // 播放错误音效
            if (playNamedSfx) {
                console.log('🎵 调用 playNamedSfx("error") - 非相邻交换');
                playNamedSfx('error').catch(e => console.error('❌ 错误音效播放失败:', e));
            } else {
                console.error('❌ playNamedSfx 函数未定义');
            }

            // 添加震动效果
            console.log('📳 添加震动效果 - 非相邻方块');
            shakingTile.value = tileCoords;
            setTimeout(() => {
                shakingTile.value = null;
            }, 400);

            // 显示错误消息
            if (showMessageTip) {
                showMessageTip('只能与相邻的方块交换!', 'error');
            }

            // 选择新方块
            selectedTile.value = tileCoords;
            console.log(`🎵 选择新方块: (${tileCoords.row}, ${tileCoords.col})`);
        }
    };

    /**
     * @description 判断两个方块是否相邻（上下左右）
     */
    const areAdjacent = (tile1, tile2) => {
        return Math.abs(tile1.row - tile2.row) + Math.abs(tile1.col - tile2.col) === 1;
    };

    /**
     * @description 尝试交换两个方块，并处理后续的匹配逻辑
     */
    const attemptSwap = async (tile1Coords, tile2Coords, showMessageTip) => {
        console.log(`🔄 attemptSwap 开始 - 从 (${tile1Coords.row}, ${tile1Coords.col}) 到 (${tile2Coords.row}, ${tile2Coords.col})`);
        isProcessing.value = true;
        movesUsed.value++;

        try {
            // 参考文档：在开始时播放交换音效
            if (playNamedSfx) {
                console.log('🎵 调用 playNamedSfx("swap") - 开始交换');
                playNamedSfx('swap').catch(e => console.error('❌ 交换音效播放失败:', e));
            }

            const { row: r1, col: c1 } = tile1Coords;
            const { row: r2, col: c2 } = tile2Coords;

            // 执行交换
            const newBoard = JSON.parse(JSON.stringify(gameBoard.value));
            [newBoard[r1][c1], newBoard[r2][c2]] = [newBoard[r2][c2], newBoard[r1][c1]];

            // 检查匹配
            const matches = checkMatches(newBoard);
            console.log(`🔍 交换结果检查 - 匹配数量: ${matches.length}`);

            // 更新视图
            gameBoard.value = newBoard;
            await nextTick();

            if (matches.length > 0) {
                // 有效交换：处理匹配
                console.log('✅ 有效交换，处理匹配');
                await new Promise(res => setTimeout(res, 150));
                chainCount.value = 0;
                await processMatches(newBoard, showMessageTip);
            } else {
                // 无效交换：显示错误信息并恢复，播放失败音效
                console.log('❌ 无效交换，显示错误并恢复原状');

                // 显示错误消息
                if (showMessageTip) {
                    showMessageTip('无效移动', 'error');
                }

                // 播放错误音效
                if (playNamedSfx) {
                    console.log('🎵 调用 playNamedSfx("error")');
                    playNamedSfx('error').catch(e => console.error('❌ 错误音效播放失败:', e));
                } else {
                    console.error('❌ playNamedSfx 函数未定义');
                }

                // 添加震动效果
                console.log('📳 添加震动效果');
                shakingTile.value = { row: r1, col: c1 };
                setTimeout(() => {
                    shakingTile.value = { row: r2, col: c2 };
                }, 100);
                setTimeout(() => {
                    shakingTile.value = null;
                }, 400);

                // 等待一下然后恢复原状
                await new Promise(res => setTimeout(res, 300));

                // 恢复原状
                console.log('🔄 恢复到原始状态');
                const restoredBoard = JSON.parse(JSON.stringify(newBoard));
                [restoredBoard[r1][c1], restoredBoard[r2][c2]] = [restoredBoard[r2][c2], restoredBoard[r1][c1]];
                gameBoard.value = restoredBoard;
            }

            if (!hasPossibleMove(gameBoard.value)) {
                console.log("没有可移动的步数了!");
                return 'no-moves';
            }
        } catch (error) {
            console.error('❌ attemptSwap 函数执行出错:', error);
            // 确保在出错时也能恢复状态
        } finally {
            // 无论如何都要重置处理状态
            isProcessing.value = false;
            console.log('🔄 重置 isProcessing 状态为 false');
        }
    };

    /**
     * @description 在整个棋盘上检查所有可消除的匹配（三连及以上）
     */
    /**
     * @description 检查指定位置的四个方向相邻位置
     */
    const getAdjacentPositions = (row, col) => {
        const adjacent = [];
        const directions = [
            [-1, 0], // 上
            [1, 0],  // 下
            [0, -1], // 左
            [0, 1]   // 右
        ];

        for (const [dr, dc] of directions) {
            const newRow = row + dr;
            const newCol = col + dc;
            if (newRow >= 0 && newRow < boardSize && newCol >= 0 && newCol < boardSize) {
                adjacent.push({ row: newRow, col: newCol });
            }
        }
        return adjacent;
    };

    /**
     * @description 递归扩展匹配区域，找到所有连通的相同类型方块
     */
    const expandMatchArea = (board, startPositions, targetType, visited = new Set()) => {
        const toExpand = [...startPositions];
        const expanded = new Set();

        // 将起始位置加入已访问和扩展集合
        for (const pos of startPositions) {
            const key = `${pos.row}-${pos.col}`;
            visited.add(key);
            expanded.add(key);
        }

        while (toExpand.length > 0) {
            const current = toExpand.shift();
            const adjacent = getAdjacentPositions(current.row, current.col);

            for (const adjPos of adjacent) {
                const key = `${adjPos.row}-${adjPos.col}`;

                // 如果已经访问过，跳过
                if (visited.has(key)) continue;

                const tile = board[adjPos.row][adjPos.col];

                // 如果是相同类型的方块，加入扩展区域
                if (tile && tile.type === targetType && tile.type !== 0) {
                    visited.add(key);
                    expanded.add(key);
                    toExpand.push(adjPos);
                    console.log(`🔗 扩展匹配: (${adjPos.row}, ${adjPos.col}) - 类型 ${targetType}`);
                }
            }
        }

        return Array.from(expanded).map(coord => {
            const [row, col] = coord.split('-').map(Number);
            return { row, col };
        });
    };

    const checkMatches = (board) => {
        console.log('🔍 开始检查匹配（支持连锁消除）');
        const baseMatches = new Set();

        // 验证棋盘有效性
        if (!board || board.length !== boardSize) {
            console.error('❌ 棋盘无效');
            return [];
        }

        // 第一步：检查基础的水平匹配（3连及以上）
        for (let r = 0; r < boardSize; r++) {
            if (!board[r] || board[r].length !== boardSize) {
                console.error(`❌ 行 ${r} 无效`);
                continue;
            }
            for (let c = 0; c < boardSize - 2; c++) {
                const tile1 = board[r][c];
                const tile2 = board[r][c + 1];
                const tile3 = board[r][c + 2];

                if (tile1 && tile2 && tile3 &&
                    tile1.type !== 0 && tile1.type === tile2.type && tile1.type === tile3.type) {
                    console.log(`🔍 发现水平基础匹配: (${r}, ${c}-${c+2}) - 类型 ${tile1.type}`);
                    baseMatches.add(`${r}-${c}`);
                    baseMatches.add(`${r}-${c + 1}`);
                    baseMatches.add(`${r}-${c + 2}`);

                    // 检查是否有更长的匹配
                    let extendC = c + 3;
                    while (extendC < boardSize && board[r][extendC] &&
                           board[r][extendC].type === tile1.type) {
                        baseMatches.add(`${r}-${extendC}`);
                        extendC++;
                    }
                }
            }
        }

        // 第二步：检查基础的垂直匹配（3连及以上）
        for (let c = 0; c < boardSize; c++) {
            for (let r = 0; r < boardSize - 2; r++) {
                const tile1 = board[r][c];
                const tile2 = board[r + 1][c];
                const tile3 = board[r + 2][c];

                if (tile1 && tile2 && tile3 &&
                    tile1.type !== 0 && tile1.type === tile2.type && tile1.type === tile3.type) {
                    console.log(`🔍 发现垂直基础匹配: (${r}-${r+2}, ${c}) - 类型 ${tile1.type}`);
                    baseMatches.add(`${r}-${c}`);
                    baseMatches.add(`${r + 1}-${c}`);
                    baseMatches.add(`${r + 2}-${c}`);

                    // 检查是否有更长的匹配
                    let extendR = r + 3;
                    while (extendR < boardSize && board[extendR][c] &&
                           board[extendR][c].type === tile1.type) {
                        baseMatches.add(`${extendR}-${c}`);
                        extendR++;
                    }
                }
            }
        }

        // 如果没有基础匹配，直接返回
        if (baseMatches.size === 0) {
            console.log('🔍 没有发现任何基础匹配，交换无效');
            return [];
        }

        // 第三步：基于基础匹配进行连锁扩展
        const allMatches = new Set();
        const visited = new Set();

        // 按类型分组基础匹配
        const matchesByType = new Map();
        for (const matchKey of baseMatches) {
            const [row, col] = matchKey.split('-').map(Number);
            const tile = board[row][col];
            if (tile && tile.type !== 0) {
                if (!matchesByType.has(tile.type)) {
                    matchesByType.set(tile.type, []);
                }
                matchesByType.get(tile.type).push({ row, col });
            }
        }

        // 对每种类型的基础匹配进行扩展
        for (const [tileType, positions] of matchesByType) {
            console.log(`🔗 开始扩展类型 ${tileType} 的匹配区域，基础匹配数: ${positions.length}`);
            const expandedMatches = expandMatchArea(board, positions, tileType, visited);

            for (const match of expandedMatches) {
                allMatches.add(`${match.row}-${match.col}`);
            }

            console.log(`🔗 类型 ${tileType} 扩展完成，总匹配数: ${expandedMatches.length}`);
        }

        const finalMatches = Array.from(allMatches).map(coord => {
            const [row, col] = coord.split('-').map(Number);
            return { row, col };
        });

        console.log(`🔍 连锁匹配检查完成 - 基础匹配: ${baseMatches.size}, 最终匹配: ${finalMatches.length}`);
        return finalMatches;
    };

    /**
     * @description 递归处理所有匹配、下落和填充的连锁反应
     */
    const processMatches = async (board, showMessageTip) => {
        const matches = checkMatches(board);
        if (matches.length === 0) return;

        chainCount.value++;
        const scoreToAdd = matches.length * 10 * chainCount.value;
        score.value += scoreToAdd;

        // 分析匹配类型分布
        const matchesByType = new Map();
        matches.forEach(({ row, col }) => {
            const tile = board[row][col];
            if (tile && tile.type !== 0) {
                if (!matchesByType.has(tile.type)) {
                    matchesByType.set(tile.type, 0);
                }
                matchesByType.set(tile.type, matchesByType.get(tile.type) + 1);
            }
        });

        console.log(`💥 连锁消除 #${chainCount.value} - 总匹配数: ${matches.length}, 得分: +${scoreToAdd}`);
        for (const [type, count] of matchesByType) {
            console.log(`   类型 ${type}: ${count} 个方块`);
        }

        // 播放匹配音效（不阻塞游戏逻辑）
        if (playNamedSfx) {
            playNamedSfx('match').catch(e => console.error('匹配音效播放失败:', e));
        }

        // 显示连锁效果
        if (chainCount.value > 1) {
            showChainEffect.value = true;
            setTimeout(() => { showChainEffect.value = false; }, 1000);
        }

        // 标记匹配的方块为待消除
        matches.forEach(({ row, col }) => {
            if (board[row] && board[row][col]) {
                console.log(`💥 消除方块: (${row}, ${col}) - 类型 ${board[row][col].type}`);
                board[row][col].type = 0;
            }
        });

        // 更新匹配状态用于视觉效果
        matchedTiles.value = new Set(matches.map(({ row, col }) => `${row}-${col}`));

        gameBoard.value = JSON.parse(JSON.stringify(board));
        await new Promise(res => setTimeout(res, 300)); // 稍微延长显示时间

        // 清除匹配状态
        matchedTiles.value = new Set();

        await handleFall(board);
        await fillNewTiles(board);
        await processMatches(board, showMessageTip);
    };

    /**
     * @description 处理方块下落
     */
    const handleFall = async (board) => {
        console.log('🔽 开始处理方块下落');
        let hasFallen = false;

        for (let c = 0; c < boardSize; c++) {
            let emptyRow = boardSize - 1;
            for (let r = boardSize - 1; r >= 0; r--) {
                if (board[r][c].type !== 0) {
                    if (emptyRow !== r) {
                        console.log(`🔽 方块下落: (${r}, ${c}) -> (${emptyRow}, ${c})`);
                        [board[emptyRow][c], board[r][c]] = [board[r][c], board[emptyRow][c]];
                        hasFallen = true;
                    }
                    emptyRow--;
                }
            }
        }

        if (hasFallen) {
            console.log('🎵 播放方块下落音效');
            if (playNamedSfx) {
                console.log('🎵 调用 playNamedSfx("fall")');
                playNamedSfx('fall').catch(e => console.error('❌ 下落音效播放失败:', e));
            } else {
                console.error('❌ playNamedSfx 函数未定义');
            }
        }

        gameBoard.value = JSON.parse(JSON.stringify(board));
        await new Promise(res => setTimeout(res, 200));
    };

    /**
     * @description 填充新的方块
     */
    const fillNewTiles = async (board) => {
        console.log('🆕 开始填充新方块');
        let hasFilled = false;
        let filledCount = 0;

        for (let r = 0; r < boardSize; r++) {
            for (let c = 0; c < boardSize; c++) {
                if (board[r][c].type === 0) {
                    hasFilled = true;
                    filledCount++;
                    const newType = Math.floor(Math.random() * tileTypes) + 1;
                    board[r][c].type = newType;
                    board[r][c].id = `tile-${r}-${c}-${Date.now()}`;
                    console.log(`🆕 填充新方块: (${r}, ${c}) -> 类型 ${newType}`);
                }
            }
        }

        if (hasFilled) {
            console.log(`🆕 总共填充了 ${filledCount} 个新方块`);
            gameBoard.value = JSON.parse(JSON.stringify(board));
            await new Promise(res => setTimeout(res, 100));
        }
    };

    /**
     * @description 检查是否还有可能的移动
     */
    const hasPossibleMove = (board) => {
        for (let r = 0; r < boardSize; r++) {
            for (let c = 0; c < boardSize; c++) {
                // 检查右边
                if (c < boardSize - 1) {
                    const testBoard = JSON.parse(JSON.stringify(board));
                    [testBoard[r][c], testBoard[r][c + 1]] = [testBoard[r][c + 1], testBoard[r][c]];
                    if (checkMatches(testBoard).length > 0) return true;
                }
                // 检查下边
                if (r < boardSize - 1) {
                    const testBoard = JSON.parse(JSON.stringify(board));
                    [testBoard[r][c], testBoard[r + 1][c]] = [testBoard[r + 1][c], testBoard[r][c]];
                    if (checkMatches(testBoard).length > 0) return true;
                }
            }
        }
        return false;
    };

    /**
     * @description 重置游戏
     */
    const resetGame = () => {
        score.value = 0;
        movesUsed.value = 0;
        selectedTile.value = null;
        isProcessing.value = false;
        chainCount.value = 0;
        matchedTiles.value = new Set();
        shakingTile.value = null;
        particles.value = [];
        showChainEffect.value = false;

        // 重置选择状态
        selectionState.value = {
            selectedTile: null,
            isSelecting: false,
            canSelect: true,
            highlightedTiles: [],
            lastClickTime: 0
        };

        initializeBoard();
        console.log("🎮 游戏重置完成，选择状态已清理");
    };

    // 紧急状态重置功能
    const emergencyReset = () => {
        console.log('🚨 执行紧急状态重置');
        // 重置所有状态到初始值
        score.value = 0;
        movesUsed.value = 0;
        chainCount.value = 0;
        isProcessing.value = false;
        selectedTile.value = null;
        shakingTile.value = null;
        matchedTiles.value = new Set();
        particles.value = [];
        showChainEffect.value = false;
        console.log('✅ 紧急重置完成，游戏状态已解锁');
    };

    // --- 计算属性 ---
    const flatBoard = computed(() => {
        console.log('🎮 flatBoard 计算开始 - gameBoard.value:', gameBoard.value?.length);
        const flat = [];

        if (!gameBoard.value || gameBoard.value.length === 0) {
            console.warn('⚠️ gameBoard.value 为空或未定义');
            return flat;
        }

        for (let r = 0; r < boardSize; r++) {
            for (let c = 0; c < boardSize; c++) {
                if (gameBoard.value[r] && gameBoard.value[r][c]) {
                    const tile = {
                        ...gameBoard.value[r][c],
                        row: r,
                        col: c
                    };
                    flat.push(tile);
                } else {
                    console.warn(`⚠️ 方块缺失 - 位置 [${r}][${c}]`);
                }
            }
        }
        console.log('🎮 flatBoard 计算完成，方块数量:', flat.length);
        if (flat.length > 0) {
            console.log('🎮 前3个方块示例:', flat.slice(0, 3));
        }
        return flat;
    });

    const boardStyle = computed(() => ({
        gridTemplateColumns: `repeat(${boardSize}, 1fr)`,
        gridTemplateRows: `repeat(${boardSize}, 1fr)`
    }));

    // 计算当前选中方块的相邻可交换方块
    const adjacentTiles = computed(() => {
        if (!selectionState.value.selectedTile) {
            return [];
        }

        const { row, col } = selectionState.value.selectedTile;
        const adjacent = [];

        // 检查四个方向的相邻方块
        const directions = [
            { row: row - 1, col: col },     // 上
            { row: row + 1, col: col },     // 下
            { row: row, col: col - 1 },     // 左
            { row: row, col: col + 1 }      // 右
        ];

        directions.forEach(pos => {
            // 检查边界
            if (pos.row >= 0 && pos.row < boardSize && pos.col >= 0 && pos.col < boardSize) {
                // 检查方块是否存在
                if (gameBoard.value[pos.row] && gameBoard.value[pos.row][pos.col]) {
                    const tile = gameBoard.value[pos.row][pos.col];
                    adjacent.push({
                        ...tile,
                        row: pos.row,
                        col: pos.col
                    });
                }
            }
        });

        console.log('🎯 计算相邻方块:', adjacent.length, '个');
        return adjacent;
    });

    // 初始化棋盘
    console.log('🎮 开始初始化游戏棋盘...');
    initializeBoard();
    console.log('🎮 游戏棋盘初始化完成，棋盘大小:', gameBoard.value.length, 'x', gameBoard.value[0]?.length);

    // --- 返回值 ---
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

        // 选择状态（计算属性形式）
        isSelecting: computed(() => selectionState.value.isSelecting),
        canSelect: computed(() => selectionState.value.canSelect),
        highlightedTiles: computed(() => selectionState.value.highlightedTiles),
        selectedTileFromState: computed(() => selectionState.value.selectedTile),

        // 方法
        handleTileClick,
        resetGame,
        emergencyReset,
        testGameSfx: async () => {
            console.log('🧪 测试游戏逻辑中的音效播放');

            const testSounds = [
                { name: 'click', desc: '点击音效' },
                { name: 'swap', desc: '交换成功音效' },
                { name: 'match', desc: '匹配音效' },
                { name: 'error', desc: '无效交换音效' },
                { name: 'fall', desc: '方块下落音效' }
            ];

            for (const sound of testSounds) {
                console.log(`🧪 测试 ${sound.desc} (${sound.name})`);
                if (playNamedSfx) {
                    console.log(`🎵 调用 playNamedSfx("${sound.name}")`);
                    try {
                        await playNamedSfx(sound.name);
                        console.log(`✅ ${sound.desc} 播放成功`);
                    } catch (e) {
                        console.error(`❌ ${sound.desc} 播放失败:`, e);
                    }
                } else {
                    console.error(`❌ playNamedSfx 函数未定义`);
                }
                await new Promise(resolve => setTimeout(resolve, 800));
            }
            console.log('🧪 游戏音效测试完成');
        },

        // 测试连锁消除功能
        testChainMatching: () => {
            console.log('🧪 测试连锁消除功能');

            // 创建一个测试棋盘，包含L型和T型匹配
            const testBoard = JSON.parse(JSON.stringify(gameBoard.value));

            // 创建一个L型匹配（类型1）
            testBoard[3][3] = { type: 1, id: 'test-1-1' };
            testBoard[3][4] = { type: 1, id: 'test-1-2' };
            testBoard[3][5] = { type: 1, id: 'test-1-3' }; // 水平3连
            testBoard[4][3] = { type: 1, id: 'test-1-4' }; // L型扩展
            testBoard[5][3] = { type: 1, id: 'test-1-5' }; // L型扩展
            testBoard[2][3] = { type: 1, id: 'test-1-6' }; // 相邻扩展

            // 创建一个T型匹配（类型2）
            testBoard[1][1] = { type: 2, id: 'test-2-1' };
            testBoard[1][2] = { type: 2, id: 'test-2-2' };
            testBoard[1][3] = { type: 2, id: 'test-2-3' }; // 水平3连
            testBoard[0][2] = { type: 2, id: 'test-2-4' }; // T型扩展
            testBoard[2][2] = { type: 2, id: 'test-2-5' }; // T型扩展

            console.log('🧪 设置测试棋盘完成');
            gameBoard.value = testBoard;

            // 测试匹配检测
            setTimeout(() => {
                const matches = checkMatches(testBoard);
                console.log(`🧪 连锁消除测试结果: 找到 ${matches.length} 个匹配位置`);

                if (matches.length > 6) {
                    console.log('✅ 连锁消除功能正常 - 检测到扩展匹配');
                } else {
                    console.log('❌ 连锁消除功能可能有问题 - 只检测到基础匹配');
                }
            }, 1000);
        },

        // 别名（为了兼容性）
        isSwapping: isProcessing,
        isChecking: isProcessing
    };
}