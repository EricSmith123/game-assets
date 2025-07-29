<!-- src/components/GameBoard.vue -->
<template>
  <div class="game-board-container">
    <div 
      class="game-board" 
      :style="boardStyle"
      @click="$emit('outside-click')"
    >
      <div
        v-for="tile in flatBoard"
        :key="tile.id"
        class="game-tile"
        :class="getTileClasses(tile)"
        @click.stop="$emit('tile-click', tile)"
      >
        <img v-if="hasImage(tile.type)" :src="getTileImage(tile.type)" :alt="getTileSymbol(tile.type)" @error="handleImageError" />
        <span v-else>{{ getTileSymbol(tile.type) }}</span>
      </div>
    </div>

    <!-- 视觉效果仍然属于棋盘的一部分 -->
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

<script setup>
import { ref } from 'vue';

const props = defineProps({
  flatBoard: Array,
  boardStyle: Object,
  selectedTile: Object,
  matchedTiles: Set,
  shakingTile: Object,
  particles: Array,
  showChainEffect: Boolean,
  chainCount: Number,
  cdnUrl: String,
});

defineEmits(['tile-click', 'outside-click']);

const imageLoadErrors = ref(new Set());

const getTileSymbol = (type) => ['', '🐻', '🐰', '🐱', '🐶', '🐸', '🐼'][type] || '';
const getTileImage = (type) => {
    if (type < 1 || type > 6) return '';
    return `${props.cdnUrl}/tiles/tile-${type}.webp`;
};
const hasImage = (type) => type >= 1 && type <= 6 && !imageLoadErrors.value.has(type);
const handleImageError = (event) => {
    const src = event.target.src;
    const match = src.match(/tile-(\d+)\.webp/);
    if (match && match[1]) imageLoadErrors.value.add(parseInt(match[1]));
};

const getTileClasses = (t) => {
    const c = [`tile-type-${t.type}`];
    if (props.selectedTile && props.selectedTile.row === t.row && props.selectedTile.col === t.col) c.push('selected');
    if (props.matchedTiles.has(`${t.row}-${t.col}`)) c.push('matched');
    if (props.shakingTile && props.shakingTile.row === t.row && props.shakingTile.col === t.col) c.push('shake');
    return c;
};
</script>

<style scoped>
/* 只包含与棋盘相关的样式 */
.game-board-container { position: relative; }
.game-board { width: min(90vw, 400px); height: min(90vw, 400px); max-width: 400px; max-height: 400px; margin: 0 auto; display: grid; gap: 2px; background: #f0f0f0; border-radius: 10px; padding: 10px; position: relative; }
.game-tile { aspect-ratio: 1; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.3s ease; position: relative; user-select: none; background: white; box-shadow: 0 2px 4px rgba(0,0,0,0.1); touch-action: manipulation; font-size: 24px; font-weight: bold; }
.game-tile img { width: 85%; height: 85%; object-fit: contain; pointer-events: none; }
.game-tile:hover { transform: scale(1.05); }
.game-tile.selected { transform: scale(1.1); box-shadow: 0 0 20px rgba(255, 215, 0, 0.8); border: 3px solid gold; }
.game-tile.matched { animation: matchPulse 0.3s ease; }
.game-tile.shake { animation: shake 0.4s ease; }
.chain-effect { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 200; pointer-events: none; }
.chain-text { font-size: 24px; font-weight: bold; color: #ff6b6b; text-shadow: 2px 2px 4px rgba(0,0,0,0.3); animation: chainPulse 1s ease-out; }
.particle-effect { position: absolute; pointer-events: none; z-index: 100; top:0; left:0; width:100%; height:100%; }
.particle { position: absolute; width: 4px; height: 4px; background: #ffd700; border-radius: 50%; animation: particle-float 1s ease-out forwards; }
.tile-type-1 { background: linear-gradient(135deg, #8B4513, #A0522D); color: white; }
.tile-type-2 { background: linear-gradient(135deg, #FFB6C1, #FFC0CB); color: #8B4513; }
.tile-type-3 { background: linear-gradient(135deg, #FF8C00, #FFA500); color: white; }
.tile-type-4 { background: linear-gradient(135deg, #8B4513, #D2691E); color: white; }
.tile-type-5 { background: linear-gradient(135deg, #32CD32, #90EE90); color: #006400; }
.tile-type-6 { background: linear-gradient(135deg, #000000, #696969); color: white; }

@keyframes matchPulse { 0% { transform: scale(1); } 50% { transform: scale(1.2); background: #ffd700; } 100% { transform: scale(1); } }
@keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
@keyframes chainPulse { 0% { transform: scale(0.5); opacity: 0; } 50% { transform: scale(1.2); opacity: 1; } 100% { transform: scale(1); opacity: 0; } }
@keyframes particle-float { 0% { opacity: 1; transform: translateY(0) scale(1); } 100% { opacity: 0; transform: translateY(-50px) scale(0.5); } }

/* 响应式调整 */
@media (min-width: 768px) { .game-board { width: 450px; height: 450px; max-width: 450px; max-height: 450px; } }
@media (min-width: 1200px) { .game-board { width: 500px; height: 500px; max-width: 500px; max-height: 500px; } }
@media (max-width: 480px) { .game-board { width: min(85vw, 350px); height: min(85vw, 350px); } }
@media (max-width: 360px) { .game-board { width: min(80vw, 300px); height: min(80vw, 300px); } }
@media (orientation: landscape) and (max-height: 500px) { .game-board { width: min(40vh, 350px); height: min(40vh, 350px); } }
</style>