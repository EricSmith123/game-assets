<template>
  <div class="virtual-game-board-container">
    <!-- 性能监控显示 -->
    <div v-if="showPerformanceInfo" class="performance-info">
      <div>渲染方块: {{ visibleTiles.length }}/{{ totalTiles }}</div>
      <div>FPS: {{ currentFPS }}</div>
      <div>渲染时间: {{ lastRenderTime }}ms</div>
    </div>

    <div
      ref="containerRef"
      class="virtual-game-board"
      :style="containerStyle"
      @scroll="handleScroll"
    >
      <!-- 虚拟化内容容器 -->
      <div
        class="virtual-content"
        :style="contentStyle"
      >
        <!-- 只渲染可见的方块 -->
        <div
          v-for="tile in visibleTiles"
          :key="tile.id"
          class="virtual-tile"
          :class="getTileClasses(tile)"
          :style="getTileStyle(tile)"
          @click.stop="handleTileClick(tile, $event)"
          @mouseenter="handleTileHover(tile, $event)"
          :title="`方块 ${tile.type} (${tile.row}, ${tile.col})`"
          :aria-label="`第${tile.row + 1}行第${tile.col + 1}列的${tile.type}号方块`"
          :tabindex="tile.isEmpty ? -1 : 0"
          role="button"
        >
          <!-- 方块内容 -->
          <img
            v-if="hasImage(tile.type)"
            :src="getTileImage(tile.type)"
            :alt="getTileSymbol(tile.type)"
            @error="handleImageError"
            loading="lazy"
            class="tile-image"
          />
          <span v-else class="tile-symbol">{{ getTileSymbol(tile.type) }}</span>
          
          <!-- 开发环境调试信息 -->
          <div v-if="isDev" class="tile-debug">{{ tile.type }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import type { GameTile } from '@/types/game'
import type { GameBoardProps, GameBoardEmits } from '@/types/components'
import { performanceMonitor } from '@/utils/performanceMonitor'

// Props和Emits
const props = withDefaults(defineProps<GameBoardProps>(), {
  flatBoard: () => [],
  boardStyle: () => ({ gridTemplateColumns: 'repeat(8, 1fr)', gridTemplateRows: 'repeat(8, 1fr)' }),
  selectedTile: null,
  matchedTiles: () => new Set(),
  shakingTile: null,
  cdnUrl: ''
})

const emit = defineEmits<GameBoardEmits>()

// 环境检查
const isDev = import.meta.env.DEV
const showPerformanceInfo = ref(isDev)

// 响应式数据
const containerRef = ref<HTMLElement>()
const scrollTop = ref(0)
const scrollLeft = ref(0)
const currentFPS = ref(60)
const lastRenderTime = ref(0)

// 动态虚拟化配置 - 根据游戏板大小调整
const TILE_SIZE = 60
const VISIBLE_ROWS = 8
const VISIBLE_COLS = 8

// 动态缓冲区大小 - 大型游戏板使用更小的缓冲区
const getBufferSize = (totalTiles: number) => {
  if (totalTiles > 1000) return 1  // 32x32以上使用最小缓冲
  if (totalTiles > 500) return 2   // 16x16-32x32使用中等缓冲
  return 3                         // 小型游戏板使用大缓冲
}

// 计算总方块数
const totalTiles = computed(() => props.flatBoard?.length || 0)

// 计算容器样式
const containerStyle = computed(() => ({
  width: `${VISIBLE_COLS * TILE_SIZE}px`,
  height: `${VISIBLE_ROWS * TILE_SIZE}px`,
  overflow: 'auto',
  position: 'relative'
}))

// 计算内容区域样式
const contentStyle = computed(() => {
  const rows = Math.ceil(totalTiles.value / VISIBLE_COLS)
  return {
    width: `${VISIBLE_COLS * TILE_SIZE}px`,
    height: `${rows * TILE_SIZE}px`,
    position: 'relative'
  }
})

// 高性能可见方块计算 - 使用空间索引优化
const visibleTiles = computed(() => {
  performanceMonitor.startTimer('calculateVisibleTiles')

  if (!props.flatBoard || props.flatBoard.length === 0) {
    performanceMonitor.endTimer('calculateVisibleTiles')
    return []
  }

  const totalTiles = props.flatBoard.length
  const bufferSize = getBufferSize(totalTiles)

  // 计算可见区域
  const startRow = Math.max(0, Math.floor(scrollTop.value / TILE_SIZE) - bufferSize)
  const endRow = Math.min(VISIBLE_ROWS, startRow + VISIBLE_ROWS + bufferSize * 2)
  const startCol = Math.max(0, Math.floor(scrollLeft.value / TILE_SIZE) - bufferSize)
  const endCol = Math.min(VISIBLE_COLS, startCol + VISIBLE_COLS + bufferSize * 2)

  // 使用更高效的过滤算法
  const visible = []
  for (let i = 0; i < props.flatBoard.length; i++) {
    const tile = props.flatBoard[i]
    if (tile.row >= startRow && tile.row < endRow &&
        tile.col >= startCol && tile.col < endCol &&
        !tile.isEmpty) {
      visible.push(tile)
    }

    // 对于大型游戏板，限制最大渲染数量
    if (totalTiles > 1000 && visible.length > 200) {
      break
    }
  }

  const duration = performanceMonitor.endTimer('calculateVisibleTiles')
  lastRenderTime.value = duration

  return visible
})

// 方块样式计算
const getTileStyle = (tile: GameTile) => ({
  position: 'absolute',
  left: `${tile.col * TILE_SIZE}px`,
  top: `${tile.row * TILE_SIZE}px`,
  width: `${TILE_SIZE}px`,
  height: `${TILE_SIZE}px`,
  transform: 'translateZ(0)',
  willChange: 'transform, opacity'
})

// 方块类名计算
const getTileClasses = (tile: GameTile): string[] => {
  const classes = [`tile-type-${tile.type}`]
  
  if (tile.isSelected) classes.push('selected')
  if (tile.isMatched) classes.push('matched')
  if (tile.isShaking) classes.push('shaking')
  if (tile.isHighlighted) classes.push('highlighted')
  if (tile.isAnimating) classes.push('animating')
  
  return classes
}

// 图片相关方法
const hasImage = (type: number): boolean => {
  return type > 0 && type <= 6
}

const getTileImage = (type: number): string => {
  return `/tiles/tile-${type}.webp`
}

const getTileSymbol = (type: number): string => {
  const symbols = ['', '🟤', '🩷', '💚', '💙', '💜', '🧡']
  return symbols[type] || '❓'
}

const handleImageError = (event: Event) => {
  const target = event.target as HTMLImageElement
  target.style.display = 'none'
}

// 事件处理
const handleScroll = (event: Event) => {
  const target = event.target as HTMLElement
  scrollTop.value = target.scrollTop
  scrollLeft.value = target.scrollLeft
}

const handleTileClick = (tile: GameTile, event: Event) => {
  if (!tile || tile.isEmpty) return
  
  console.log(`虚拟化方块点击: 位置(${tile.row}, ${tile.col}), 类型: ${tile.type}`)
  emit('tile-click', tile)
}

const handleTileHover = (tile: GameTile, event: Event) => {
  if (!tile || tile.isEmpty) return
  // 悬停处理逻辑
}

// FPS监控
let frameCount = 0
let lastTime = performance.now()

const updateFPS = () => {
  frameCount++
  const now = performance.now()

  if (now - lastTime >= 1000) {
    currentFPS.value = Math.round((frameCount * 1000) / (now - lastTime))
    frameCount = 0
    lastTime = now
  }

  // 在测试环境中避免使用requestAnimationFrame
  if (typeof requestAnimationFrame !== 'undefined') {
    requestAnimationFrame(updateFPS)
  }
}

// 生命周期
onMounted(() => {
  console.log('🖼️ VirtualGameBoard 组件已挂载')
  
  if (showPerformanceInfo.value) {
    updateFPS()
  }
})

onUnmounted(() => {
  console.log('🖼️ VirtualGameBoard 组件已卸载')
})

// 监听flatBoard变化
watch(() => props.flatBoard, (newBoard) => {
  if (newBoard && newBoard.length > 0) {
    console.log(`🖼️ 虚拟化渲染更新: ${newBoard.length} 个方块`)
  }
}, { immediate: true })
</script>

<style scoped>
.virtual-game-board-container {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.performance-info {
  position: absolute;
  top: -60px;
  left: 0;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 8px;
  border-radius: 4px;
  font-size: 12px;
  z-index: 10;
}

.virtual-game-board {
  border: 2px solid #ddd;
  border-radius: 8px;
  background: #f5f5f5;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.virtual-content {
  position: relative;
}

.virtual-tile {
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border: 1px solid #ddd;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.virtual-tile:hover {
  transform: translateZ(0) scale(1.05);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.virtual-tile.selected {
  border-color: #ff6b35;
  box-shadow: 0 0 10px rgba(255, 107, 53, 0.5);
}

.virtual-tile.matched {
  background: #e8f5e8;
  border-color: #4caf50;
}

.virtual-tile.shaking {
  animation: shake 0.3s ease-in-out;
}

.tile-image {
  width: 80%;
  height: 80%;
  object-fit: contain;
}

.tile-symbol {
  font-size: 24px;
  font-weight: bold;
}

.tile-debug {
  position: absolute;
  top: 2px;
  left: 2px;
  font-size: 10px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 1px 3px;
  border-radius: 2px;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-2px); }
  75% { transform: translateX(2px); }
}

/* 性能优化的CSS */
.virtual-tile {
  contain: layout style paint;
  will-change: transform, opacity;
  backface-visibility: hidden;
}
</style>
