import { ref, computed, nextTick } from 'vue';

// 导出一个组合式函数
// 它接收一个 "playNamedSfx" 函数作为参数，这样逻辑层就可以请求播放声音，而无需关心如何播放
export function useGameLogic(playNamedSfx) {
    // --- 游戏状态定义 ---
    const score = ref(0);
    const movesUsed = ref(0);
    const gameBoard = ref([]);
    const selectedTile = ref(null);
    const isSwapping = ref(false);
    const isChecking = ref(false);
    const matchedTiles = ref(new Set());
    const shakingTile = ref(null);
    const chainCount = ref(0);
    const particles = ref([]);
    const showChainEffect = ref(false);

    const boardSize = 8;
    const tileTypes = 6;

    // --- 计算属性 ---
    const boardStyle = computed(() => ({ gridTemplateColumns: `repeat(${boardSize}, 1fr)` }));

    const flatBoard = computed(() => {
        const flat = [];
        for (let row = 0; row < boardSize; row++) {
            for (let col = 0; col < boardSize; col++) {
                if (gameBoard.value[row] && gameBoard.value[row][col]) {
                    flat.push({ ...gameBoard.value[row][col], row, col });
                }
            }
        }
        return flat;
    });

    // --- 内部工具函数 ---
    const cloneBoard = b => b.map(r => r.map(t => ({ ...t })));
    const areAdjacent = (t1, t2) => Math.abs(t1.row - t2.row) + Math.abs(t1.col - t2.col) === 1;

    // --- 核心游戏方法 ---
    const initializeBoard = () => {
        const b = [];
        for (let r = 0; r < boardSize; r++) {
            b[r] = [];
            for (let c = 0; c < boardSize; c++) {
                let t;
                do {
                    t = Math.floor(Math.random() * tileTypes) + 1;
                } while ((c >= 2 && b[r][c - 1].type === t && b[r][c - 2].type === t) || (r >= 2 && b[r - 1][c].type === t && b[r - 2][c].type === t));
                b[r][c] = { type: t, id: `tile-${r}-${c}-${Date.now()}-${Math.random()}` };
            }
        }
        gameBoard.value = b;
    };

    const checkMatches = b => {
        const m = new Set;
        for (let r = 0; r < boardSize; r++) { for (let c = 0; c < boardSize - 2; c++) { if (b[r][c].type !== 0 && b[r][c].type === b[r][c + 1].type && b[r][c].type === b[r][c + 2].type) { m.add(`${r}-${c}`); m.add(`${r}-${c + 1}`); m.add(`${r}-${c + 2}`) } } }
        for (let c = 0; c < boardSize; c++) { for (let r = 0; r < boardSize - 2; r++) { if (b[r][c].type !== 0 && b[r][c].type === b[r + 1][c].type && b[r][c].type === b[r + 2][c].type) { m.add(`${r}-${c}`); m.add(`${r + 1}-${c}`); m.add(`${r + 2}-${c}`) } } }
        return Array.from(m).map(c => { const [r, o] = c.split('-').map(Number); return { row: r, col: o } });
    };

    const hasPossibleMove = () => {
        const b = gameBoard.value;
        for (let r = 0; r < boardSize; r++) {
            for (let c = 0; c < boardSize; c++) {
                if (c < boardSize - 1) { const n = cloneBoard(b);[n[r][c], n[r][c + 1]] = [n[r][c + 1], n[r][c]]; if (checkMatches(n).length > 0) return true; }
                if (r < boardSize - 1) { const n = cloneBoard(b);[n[r][c], n[r + 1][c]] = [n[r + 1][c], n[r][c]]; if (checkMatches(n).length > 0) return true; }
            }
        }
        return false;
    };

    const createParticleEffect = (r, c) => {
        const s = 400 / boardSize; // Assuming board pixel size, might need adjustment
        const x = c * s + s / 2;
        const y = r * s + s / 2;
        for (let i = 0; i < 5; i++) {
            const p = { id: Math.random(), x: x + (Math.random() - .5) * 20, y: y + (Math.random() - .5) * 20 };
            particles.value.push(p);
            setTimeout(() => { particles.value = particles.value.filter(a => a.id !== p.id) }, 1000);
        }
    };

    const fillNewTiles = async () => {
        const n = cloneBoard(gameBoard.value);
        let filled = false;
        for (let r = 0; r < boardSize; r++) {
            for (let c = 0; c < boardSize; c++) {
                if (n[r][c].type === 0) {
                    filled = true;
                    n[r][c] = { type: Math.floor(Math.random() * tileTypes) + 1, id: `tile-${r}-${c}-${Date.now()}-${Math.random()}` };
                }
            }
        }
        if (filled) {
            gameBoard.value = n;
            await nextTick();
        }
    };

    const handleFall = async () => {
        playNamedSfx('fall');
        const n = cloneBoard(gameBoard.value);
        for (let c = 0; c < boardSize; c++) {
            let emptyRow = boardSize - 1;
            for (let r = boardSize - 1; r >= 0; r--) {
                if (n[r][c].type !== 0) {
                    if (emptyRow !== r) {
                        [n[emptyRow][c], n[r][c]] = [n[r][c], n[emptyRow][c]];
                    }
                    emptyRow--;
                }
            }
        }
        gameBoard.value = n;
        await new Promise(r => setTimeout(r, 350));
    };

    const processMatches = async (matches, showMessageTip) => {
        isChecking.value = true;
        chainCount.value++;
        if (chainCount.value > 1) {
            showMessageTip(`连锁反应 x${chainCount.value}!`, 'chain');
            showChainEffect.value = true;
            setTimeout(() => { showChainEffect.value = false }, 1000);
            playNamedSfx('match');
        } else {
            playNamedSfx('match');
        }
        score.value += matches.length * 10 * chainCount.value;
        matchedTiles.value.clear();
        matches.forEach(t => {
            matchedTiles.value.add(`${t.row}-${t.col}`);
            createParticleEffect(t.row, t.col);
        });
        await new Promise(r => setTimeout(r, 300));
        const n = cloneBoard(gameBoard.value);
        matches.forEach(t => { n[t.row][t.col].type = 0 });
        matchedTiles.value.clear();
        gameBoard.value = n;
        await handleFall();
        await fillNewTiles();
        isChecking.value = false;
        const nextMatches = checkMatches(gameBoard.value);
        if (nextMatches.length > 0) {
            await new Promise(r => setTimeout(r, 300));
            return await processMatches(nextMatches, showMessageTip); // Return promise chain
        } else {
            chainCount.value = 0;
            if (!hasPossibleMove()) {
                return 'no-moves'; // Return a status instead of calling UI functions
            }
        }
        return 'ok';
    };

    const attemptSwap = async (t1, t2, showMessageTip) => {
        isSwapping.value = true;
        movesUsed.value++;
        playNamedSfx('swap');
        const n = cloneBoard(gameBoard.value);
        [n[t1.row][t1.col], n[t2.row][t2.col]] = [n[t2.row][t2.col], n[t1.row][t1.col]];
        const matches = checkMatches(n);
        gameBoard.value = n;
        await nextTick();
        if (matches.length > 0) {
            await new Promise(r => setTimeout(r, 150));
            isSwapping.value = false;
            return await processMatches(matches, showMessageTip);
        } else {
            showMessageTip('无效移动', 'error');
            playNamedSfx('error');
            await new Promise(r => setTimeout(r, 300));
            const o = cloneBoard(gameBoard.value);
            [o[t1.row][t1.col], o[t2.row][t2.col]] = [o[t2.row][t2.col], o[t1.row][t1.col]];
            gameBoard.value = o;
        }
        isSwapping.value = false;
        return 'invalid-swap';
    };

    const handleTileClick = (tile, showMessageTip) => {
        const clicked = { row: tile.row, col: tile.col };
        if (!selectedTile.value) {
            selectedTile.value = clicked;
            playNamedSfx('click');
            return null;
        } else {
            if (selectedTile.value.row === clicked.row && selectedTile.value.col === clicked.col) {
                selectedTile.value = null;
            } else if (areAdjacent(selectedTile.value, clicked)) {
                const firstTile = selectedTile.value;
                selectedTile.value = null;
                return attemptSwap(firstTile, clicked, showMessageTip);
            } else {
                playNamedSfx('error');
                shakingTile.value = clicked;
                setTimeout(() => { shakingTile.value = null }, 400);
                showMessageTip('只能与相邻的方块交换!', 'error');
                selectedTile.value = clicked;
            }
            return null;
        }
    };
    
    // 重置游戏状态的函数
    const resetGame = () => {
        score.value = 0;
        movesUsed.value = 0;
        chainCount.value = 0;
        selectedTile.value = null;
        initializeBoard();
    };

    // 返回所有需要被 App.vue 使用的状态和方法
    return {
        score,
        movesUsed,
        gameBoard,
        selectedTile,
        isSwapping,
        isChecking,
        matchedTiles,
        shakingTile,
        particles,
        showChainEffect,
        chainCount,
        boardStyle,
        flatBoard,
        handleTileClick,
        resetGame,
    };
}