<template>
  <div class="game-board-container">
    <!-- 调试信息显示 -->
    <div class="debug-info" style="position: absolute; top: -30px; left: 0; font-size: 12px; color: #666;">
      方块数量: {{ props.flatBoard?.length || 0 }} | 网格: {{ boardStyle?.gridTemplateColumns }}
    </div>

    <div
      ref="gameboardRef"
      class="game-board optimized-board"
      :style="boardStyle"
      @click="$emit('outside-click')"
    >
      <!-- 调试：显示方块总数 -->
      <div v-if="!props.flatBoard || props.flatBoard.length === 0" class="no-tiles-warning">
        ⚠️ 没有方块数据
      </div>

      <!-- 优化的游戏方块渲染 -->
      <div
        v-for="(tile, index) in optimizedFlatBoard"
        :key="tile.id"
        class="game-tile optimized-tile"
        :class="getTileClasses(tile)"
        :style="isLargeBoard ? largeBoardTileStyle : standardTileStyle"
        @click.stop="handleTileClick(tile, index, $event)"
        @mouseenter="isLargeBoard ? null : handleTileHover(tile, $event)"
        @focus="handleTileFocus(tile, $event)"
        :title="isLargeBoard ? null : `方块 ${tile.type} (${tile.row}, ${tile.col})`"
        :aria-label="`第${tile.row + 1}行第${tile.col + 1}列的${tile.type}号方块`"
        :tabindex="tile.isEmpty ? -1 : 0"
        role="button"
      >
        <!-- 开发环境显示方块类型调试信息 -->
        <div v-if="isDev" class="tile-debug">{{ tile.type }}</div>

        <img
          v-if="hasImage(tile.type)"
          :src="getTileImage(tile.type)"
          :alt="getTileSymbol(tile.type)"
          @error="handleImageError"
          loading="lazy"
          :style="{ transform: 'translateZ(0)' }"
        />
        <span v-else class="tile-symbol">{{ getTileSymbol(tile.type) }}</span>
      </div>

      <!-- 紧急后备方案：如果 flatBoard 为空，显示测试方块 -->
      <div v-if="!props.flatBoard || props.flatBoard.length === 0" class="emergency-tiles">
        <div
          v-for="i in 64"
          :key="`emergency-${i}`"
          class="game-tile emergency-tile"
          :class="`tile-type-${((i-1) % 6) + 1}`"
        >
          <span class="tile-symbol">{{ getTileSymbol(((i-1) % 6) + 1) }}</span>
          <div class="debug-info">E{{ ((i-1) % 6) + 1 }}</div>
        </div>
      </div>
    </div>

    <div v-if="showChainEffect" class="chain-effect">
      <div class="chain-text">连锁 x{{ chainCount }}</div>
    </div>

    <div class="particle-effect">
      <div
        v-for="p in particles"
        :key="p.id"
        class="particle"
        :style="{ top: p.y + 'px', left: p.x + 'px' }"
      ></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { ASSETS_BASE_URL } from '../composables/useGameLogic';
import type { GameBoardProps, GameBoardEmits } from '@/types/components';
import type { GameTile } from '@/types/game';

const props = defineProps<GameBoardProps>();
const emit = defineEmits<GameBoardEmits>();

// 环境检查 - 移到script部分避免模板编译错误
const isDev = import.meta.env.DEV;

// 游戏板引用
const gameboardRef = ref<HTMLElement>();

// 基本响应式数据
const imageLoadErrors = ref<Set<string>>(new Set());
const imageCheckCache = new Map<string, boolean>();
const particles = ref<any[]>([]);

// 优化的图片检查 - 使用缓存避免重复检查
const checkImageExists = async (url: string): Promise<boolean> => {
    // 检查缓存
    if (imageCheckCache.has(url)) {
        return imageCheckCache.get(url)!;
    }

    try {
        const response = await fetch(url, { method: 'HEAD' });
        const exists = response.ok;

        // 缓存结果
        imageCheckCache.set(url, exists);

        // 只在开发环境输出日志
        if (isDev) {
            console.log(`🔍 图片检查 - ${url}: ${exists ? '✅ 存在' : '❌ 不存在'}`);
        }

        return exists;
    } catch (error) {
        // 缓存失败结果
        imageCheckCache.set(url, false);

        if (isDev) {
            console.error(`🔍 图片检查失败 - ${url}:`, error);
        }
        return false;
    }
};

// 响应式数据

// 简化的计算属性 - 保持核心功能，移除过度优化
// 大型游戏板优化配置
const LARGE_BOARD_THRESHOLD = 512; // 32x32 = 1024方块
const isLargeBoard = computed(() => props.flatBoard && props.flatBoard.length > LARGE_BOARD_THRESHOLD);

// 样式优化配置
const standardTileStyle = {
  transform: 'translateZ(0)',
  willChange: 'transform, opacity, box-shadow',
  backfaceVisibility: 'hidden'
};

const largeBoardTileStyle = {
  transform: 'translateZ(0)',
  willChange: 'transform',
  backfaceVisibility: 'hidden',
  transition: 'none' // 禁用过渡动画以提升性能
};

// 优化的方块渲染计算 - 使用requestIdleCallback优化
const optimizedFlatBoard = computed(() => {
  // 基本验证
  if (!props.flatBoard || props.flatBoard.length === 0) {
    return [];
  }

  // 过滤非空方块
  const validTiles = props.flatBoard.filter(tile => !tile.isEmpty);

  // 对于大型游戏板，添加额外的优化
  if (isLargeBoard.value) {
    // 使用Object.freeze减少响应式开销
    return Object.freeze(validTiles.map(tile => Object.freeze({ ...tile })));
  }

  // 标准渲染：返回所有有效方块
  return validTiles;
});

// 方块类名缓存机制
const tileClassCache = new Map<string, string[]>();

// 生成缓存key的函数
const generateCacheKey = (tile: GameTile): string => {
  const isSelected = (props.selectedTile && props.selectedTile.row === tile.row && props.selectedTile.col === tile.col) || tile.isSelected;
  const isMatched = props.matchedTiles.has(`${tile.row}-${tile.col}`) || tile.isMatched;
  const isShaking = props.shakingTile && props.shakingTile.row === tile.row && props.shakingTile.col === tile.col;

  return `${tile.type}-${isSelected ? 1 : 0}-${isMatched ? 1 : 0}-${isShaking ? 1 : 0}-${tile.isHighlighted ? 1 : 0}-${tile.isAnimating ? 1 : 0}-${tile.isEmpty ? 1 : 0}-${isLargeBoard.value ? 1 : 0}`;
};

// 优化的方块类名计算（带缓存）
const getTileClasses = (tile: GameTile): string[] => {
  if (!tile) return [];

  // 生成缓存key
  const cacheKey = generateCacheKey(tile);

  // 检查缓存
  if (tileClassCache.has(cacheKey)) {
    return tileClassCache.get(cacheKey)!;
  }

  // 计算类名
  const classes = [
    'tile',
    `tile-type-${tile.type}`
  ];

  // 状态类名 - 兼容props和tile属性
  if ((props.selectedTile && props.selectedTile.row === tile.row && props.selectedTile.col === tile.col) || tile.isSelected) {
    classes.push('selected');
  }

  if (props.matchedTiles.has(`${tile.row}-${tile.col}`) || tile.isMatched) {
    classes.push('matched');
  }

  if (props.shakingTile && props.shakingTile.row === tile.row && props.shakingTile.col === tile.col) {
    classes.push('shaking');
  }

  // 支持tile自身的状态属性（如果存在）
  if (tile.isHighlighted) classes.push('highlighted');
  if (tile.isAnimating) classes.push('animating');
  if (tile.isEmpty) classes.push('empty');

  // 大型游戏板优化类名
  if (isLargeBoard.value) {
    classes.push('large-board-tile');
  }

  // 缓存结果
  tileClassCache.set(cacheKey, classes);

  // 限制缓存大小，避免内存泄漏
  if (tileClassCache.size > 1000) {
    const firstKey = tileClassCache.keys().next().value;
    tileClassCache.delete(firstKey);
  }

  return classes;
};

const getTileImage = (type: number): string => {
    if (type < 1 || type > 6) return '';

    // 使用已定义的isDev变量
    let imagePath: string;

    if (isDev) {
        // 开发环境：直接从 public 目录加载
        imagePath = `/tiles/tile-${type}.webp`;
        console.log(`🖼️ [开发环境] 加载图片 - 类型: ${type}, 路径: ${imagePath}`);
    } else {
        // 生产环境：使用CDN或绝对路径
        let baseUrl = props.cdnUrl || ASSETS_BASE_URL;

        if (baseUrl && baseUrl !== '') {
            // 使用CDN路径，根据GitHub仓库结构：public/tiles/
            const separator = baseUrl.endsWith('/') ? '' : '/';
            imagePath = `${baseUrl}${separator}public/tiles/tile-${type}.webp`;
            console.log(`🖼️ [生产环境] 使用CDN加载图片 - 类型: ${type}, 路径: ${imagePath}`);
        } else {
            // CDN不可用，使用绝对路径
            imagePath = `/tiles/tile-${type}.webp`;
            console.log(`🔄 [生产环境] CDN不可用，图片使用绝对路径: ${imagePath}`);
        }
    }

    return imagePath;
};

const hasImage = (type: number): boolean => {
    // type = 0 表示已移除的方块，不应该显示图片
    if (type === 0 || type < 1 || type > 6) {
        return false;
    }

    // 检查是否加载失败，如果失败则使用符号
    return !imageLoadErrors.value.has(type.toString());
};

const getTileSymbol = (type: number): string => {
    // type = 0 表示已移除的方块，返回空字符串（透明状态）
    if (type === 0) {
        return '';
    }

    // 使用更明显的符号，确保在任何情况下都能看到
    const symbols = ['', '🟤', '🩷', '🟠', '🟫', '🟢', '⚫'];
    const fallbackSymbols = ['', '●', '■', '▲', '♦', '★', '◆'];

    // 优先使用彩色符号，如果不支持则使用几何图案
    return symbols[type] || fallbackSymbols[type] || `T${type}`;
};

const handleImageError = (event: Event): void => {
    const target = event.target as HTMLImageElement;
    const src = target.src;
    const match = src.match(/tile-(\d+)\.webp/);
    if (match && match[1]) {
        const tileType = parseInt(match[1]);
        imageLoadErrors.value.add(tileType.toString());
        console.warn(`⚠️ 图片加载失败，切换到符号显示 - 类型: ${tileType}`);

        // 强制重新渲染以显示符号
        target.style.display = 'none';
    }
};

// 简化的方块点击处理
const handleTileClick = (tile: GameTile, index: number, event: Event) => {
  if (!tile || tile.isEmpty) {
    return;
  }

  console.log(`点击方块: 位置(${tile.row}, ${tile.col}), 类型: ${tile.type}, 索引: ${index}`);

  emit('tile-click', tile);
};

// 简化的方块悬停处理
const handleTileHover = (tile: GameTile, event: Event) => {
  if (!tile || tile.isEmpty) return;
  // 悬停逻辑可以在这里添加
};

// 简化的方块焦点处理
const handleTileFocus = (tile: GameTile, event: Event) => {
  if (!tile || tile.isEmpty) return;
  // 焦点逻辑可以在这里添加
};





onMounted(() => {
    console.log('🖼️ GameBoard 组件已挂载');
    console.log('🎮 flatBoard 数据:', props.flatBoard?.length, '个方块');

    // 详细检查 flatBoard 数据结构
    if (props.flatBoard && props.flatBoard.length > 0) {
        console.log('🎮 第一个方块数据:', props.flatBoard[0]);

        // 大型游戏板优化提示
        if (isLargeBoard.value) {
          console.log('🚀 大型游戏板优化已启用');
        }
    } else {
        console.error('❌ flatBoard 为空或未定义!');
    }

    // 简化的图片检查
    batchCheckImages();
});

// 简化的图片检查
const batchCheckImages = async () => {
    try {
        const imagePromises = [];
        for (let i = 1; i <= 6; i++) {
            imagePromises.push(checkImageExists(`/tiles/tile-${i}.webp`));
        }
        await Promise.all(imagePromises);
        console.log('🖼️ 图片资源检查完成');
    } catch (error) {
        console.warn('⚠️ 图片资源检查失败:', error);
    }
};

onUnmounted(() => {
    console.log('🎮 GameBoard 组件已卸载');

    // 清理方块类名缓存，避免内存泄漏
    tileClassCache.clear();
    console.log('🧹 方块类名缓存已清理');
});
</script>


<style scoped>
/* 样式保持不变 */
.game-board-container {
  position: relative;
  /* GPU加速优化 */
  transform: translateZ(0);
  will-change: transform;
}
.debug-info { background: rgba(255,255,255,0.9); padding: 4px 8px; border-radius: 4px; }
.no-tiles-warning {
  grid-column: 1 / -1;
  grid-row: 1 / -1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ffebee;
  color: #c62828;
  font-size: 18px;
  font-weight: bold;
}
.game-board {
  width: min(95vw, 500px);
  height: min(95vw, 500px);
  max-width: 500px;
  max-height: 500px;
  margin: 0 auto;
  display: grid;
  gap: 3px;
  background: #e0e0e0;
  border-radius: 12px;
  padding: 12px;
  position: relative;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

/* 优化的游戏板 */
.optimized-board {
  /* GPU加速 */
  transform: translateZ(0);
  will-change: transform;
  backface-visibility: hidden;
  perspective: 1000px;

  /* 优化渲染性能 */
  contain: layout style paint;
}
.game-tile {
  aspect-ratio: 1;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  user-select: none;
  background: white;
  box-shadow: 0 3px 6px rgba(0,0,0,0.15);
  touch-action: manipulation;
  font-size: 28px;
  font-weight: bold;
  border: 2px solid #ddd;
  min-height: 50px;
}

/* 超高性能优化的方块 - 针对大型游戏板 */
.optimized-tile {
  /* 激进的GPU加速和硬件优化 */
  transform: translateZ(0);
  will-change: transform, opacity;
  backface-visibility: hidden;
  perspective: 1000px;
  transform-style: preserve-3d;

  /* 最大化渲染性能优化 */
  contain: layout style paint size;
  isolation: isolate;
  content-visibility: auto;

  /* 超快速过渡动画 - 减少动画时间 */
  transition: transform 0.1s cubic-bezier(0.4, 0.0, 0.2, 1),
              opacity 0.1s cubic-bezier(0.4, 0.0, 0.2, 1);

  /* 尺寸和布局优化 */
  min-width: 50px;
  overflow: visible;

  /* 防止布局抖动和强制合成层 */
  box-sizing: border-box;
  position: relative;
  z-index: 0;
}

/* 超高性能动画状态 - 大型游戏板优化 */
.optimized-tile:hover {
  transform: translateZ(0) scale(1.01);
  /* 移除box-shadow以提升性能 */
}

.optimized-tile:active {
  transform: translateZ(0) scale(0.99);
  transition-duration: 0.05s;
}

.optimized-tile.selected {
  transform: translateZ(0) scale(1.03);
  border-color: #ff6b35;
  /* 移除box-shadow以提升性能 */
}

.optimized-tile.matched {
  transform: translateZ(0) scale(1.05);
  background: #e8f5e8;
  /* 简化动画，移除box-shadow */
  animation: matchPulse 0.3s ease-out;
}

.optimized-tile.shaking {
  animation: optimizedShake 0.3s ease-in-out;
}

.optimized-tile.animating {
  pointer-events: none;
  animation: fadeOut 0.4s ease-out forwards;
}

/* 超高性能关键帧动画 - 简化版本 */
@keyframes matchPulse {
  0% { transform: translateZ(0) scale(1); }
  50% { transform: translateZ(0) scale(1.08); }
  100% { transform: translateZ(0) scale(1.05); }
}

@keyframes optimizedShake {
  0%, 100% { transform: translateZ(0) translateX(0); }
  50% { transform: translateZ(0) translateX(-2px); }
}

@keyframes fadeOut {
  0% {
    opacity: 1;
    transform: translateZ(0) scale(1);
  }
  100% {
    opacity: 0;
    transform: translateZ(0) scale(0.9);
  }
}
.game-tile img {
  width: 85%;
  height: 85%;
  object-fit: contain;
  pointer-events: none;
}
.tile-symbol {
  font-size: 28px;
  font-weight: bold;
  color: #333;
  user-select: none;
}
.tile-debug {
  position: absolute;
  top: 2px;
  left: 2px;
  font-size: 10px;
  background: rgba(255,0,0,0.7);
  color: white;
  padding: 1px 3px;
  border-radius: 2px;
  z-index: 10;
}

.debug-info {
  position: absolute;
  top: 2px;
  right: 2px;
  background: rgba(0,0,0,0.7);
  color: white;
  font-size: 10px;
  padding: 2px 4px;
  border-radius: 3px;
  font-weight: bold;
}
.game-tile:hover { transform: scale(1.05); }
/* 增强的选中方块样式 */
.game-tile.selected {
  /* 边框：橙色实心边框 */
  border: 3px solid #ff6b35;

  /* 多层阴影效果 */
  box-shadow:
    0 0 15px rgba(255, 107, 53, 0.6),      /* 外发光 */
    inset 0 0 10px rgba(255, 107, 53, 0.2), /* 内阴影 */
    0 4px 12px rgba(0, 0, 0, 0.2);         /* 投影 */

  /* 适度放大 */
  transform: scale(1.05);

  /* 层级提升 */
  z-index: 10;

  /* 背景渐变 */
  background: linear-gradient(135deg,
    rgba(255, 107, 53, 0.1),
    rgba(255, 107, 53, 0.05));

  /* 硬件加速优化 */
  will-change: transform, box-shadow, border-color;
  transform-origin: center;

  /* 过渡动画 */
  transition: all 0.2s cubic-bezier(0.4, 0.0, 0.2, 1);
}

/* 脉冲动画边框效果 */
.game-tile.selected::before {
  content: '';
  position: absolute;
  top: -3px;
  left: -3px;
  right: -3px;
  bottom: -3px;
  border: 2px solid #ff6b35;
  border-radius: inherit;
  animation: selectedPulse 1.5s infinite;
  z-index: -1;
  pointer-events: none;
}

/* 脉冲动画关键帧 */
@keyframes selectedPulse {
  0% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.7;
    transform: scale(1.05);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}
.game-tile.matched { animation: matchPulse 0.3s ease; }
.game-tile.shake { animation: shake 0.4s ease; }
.chain-effect { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 200; pointer-events: none; }
.chain-text { font-size: 24px; font-weight: bold; color: #ff6b6b; text-shadow: 2px 2px 4px rgba(0,0,0,0.3); animation: chainPulse 1s ease-out; }
.particle-effect { position: absolute; pointer-events: none; z-index: 100; }
.particle { position: absolute; width: 4px; height: 4px; background: #ffd700; border-radius: 50%; animation: particle-float 1s ease-out forwards; }
/* 移除的方块 - 完全透明，带有消失动画 */
.tile-type-0 {
    background: transparent !important;
    opacity: 0 !important;
    pointer-events: none !important;
    transform: scale(0) !important;
    transition: all 0.3s ease-out;
}

/* 确保每种类型的方块都有明显的视觉区别 */
.tile-type-1 {
    background: linear-gradient(135deg, #8B4513, #A0522D) !important;
    color: white !important;
    border: 2px solid #654321 !important;
}
.tile-type-2 {
    background: linear-gradient(135deg, #FFB6C1, #FFC0CB) !important;
    color: #8B4513 !important;
    border: 2px solid #FF69B4 !important;
}
.tile-type-3 {
    background: linear-gradient(135deg, #FF8C00, #FFA500) !important;
    color: white !important;
    border: 2px solid #FF6347 !important;
}
.tile-type-4 {
    background: linear-gradient(135deg, #8B4513, #D2691E) !important;
    color: white !important;
    border: 2px solid #A0522D !important;
}
.tile-type-5 {
    background: linear-gradient(135deg, #32CD32, #90EE90) !important;
    color: #006400 !important;
    border: 2px solid #228B22 !important;
}
.tile-type-6 {
    background: linear-gradient(135deg, #000000, #696969) !important;
    color: white !important;
    border: 2px solid #333333 !important;
}

/* 确保所有方块都有最小尺寸和可见性 */
.game-tile {
    min-width: 40px !important;
    min-height: 40px !important;
    opacity: 1 !important;
    visibility: visible !important;
}

/* 紧急后备方案样式 */
.emergency-tiles {
    display: contents; /* 让子元素直接参与网格布局 */
}

.emergency-tile {
    border: 3px dashed #ff0000 !important;
    position: relative;
}

.emergency-tile::before {
    content: "TEST";
    position: absolute;
    top: 0;
    left: 0;
    font-size: 8px;
    color: red;
    background: rgba(255,255,255,0.8);
    padding: 1px;
}

/* 大型游戏板专用优化样式 */
.large-board-tile {
  /* 最小化样式计算 */
  transition: none !important;
  box-shadow: none !important;
  border: 1px solid #ddd !important;

  /* 禁用悬停效果以提升性能 */
  pointer-events: auto;
}

.large-board-tile:hover {
  transform: translateZ(0) !important;
  box-shadow: none !important;
}

.large-board-tile.selected {
  border-color: #ff6b35 !important;
  background: rgba(255, 107, 53, 0.1) !important;
  transform: translateZ(0) !important;
}

.large-board-tile.matched {
  background: #e8f5e8 !important;
  border-color: #4caf50 !important;
  transform: translateZ(0) !important;
}

@keyframes matchPulse { 0% { transform: scale(1); } 50% { transform: scale(1.2); background: #ffd700; } 100% { transform: scale(1); } }
@keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
@keyframes chainPulse { 0% { transform: scale(0.5); opacity: 0; } 50% { transform: scale(1.2); opacity: 1; } 100% { transform: scale(1); opacity: 0; } }
@keyframes particle-float { 0% { opacity: 1; transform: translateY(0) scale(1); } 100% { opacity: 0; transform: translateY(-50px) scale(0.5); } }
</style>