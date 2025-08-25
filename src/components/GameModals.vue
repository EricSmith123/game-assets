<!-- src/components/GameModals.vue -->
<template>
  <!-- 开始游戏弹窗 -->
  <div v-if="gameState === 'menu'" class="overlay">
    <div class="modal">
      <h2 style="margin-bottom: 20px; color: #333;">熊熊消消乐</h2>
      <button class="start-btn" @click="$emit('start-game')">开始游戏</button>
    </div>
  </div>

  <!-- 游戏结束弹窗 -->
  <div v-if="gameState === 'gameover'" class="overlay">
    <div class="modal">
      <h3 style="margin-bottom: 15px; color: #e74c3c;">游戏结束</h3>
      <div style="margin-bottom: 20px; color: #666;">
        <p>最终分数: {{ score }}</p>
        <p>使用步数: {{ movesUsed }}</p>
        <p>游戏时长: {{ formattedTime }}</p>
      </div>
      <div class="end-btn-row">
        <button class="action-btn purple restart-btn" @click="$emit('restart-game')">重新开始</button>
        <button class="action-btn gray menu-btn" @click="$emit('back-to-menu')">返回菜单</button>
      </div>
    </div>
  </div>

  <!-- 暂停弹窗 -->
  <div v-if="gameState === 'paused'" class="overlay">
    <div class="modal">
      <h3 style="margin-bottom: 15px; color: #3498db;">⏸️ 游戏暂停</h3>
      <div style="margin-bottom: 20px; color: #666;">
        <p>当前分数: {{ score }}</p>
        <p>已用步数: {{ movesUsed }}</p>
        <p>游戏时长: {{ formattedTime }}</p>
      </div>
      <div class="end-btn-row">
        <button class="action-btn green resume-btn" @click="$emit('resume-game')">继续游戏</button>
        <button class="action-btn purple restart-btn" @click="$emit('restart-game')">重新开始</button>
        <button class="action-btn gray menu-btn" @click="$emit('back-to-menu')">返回菜单</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { GameModalsProps, GameModalsEmits } from '@/types/components';

const props = defineProps<GameModalsProps>();
const emit = defineEmits<GameModalsEmits>();
</script>

<style scoped>
/* 只包含弹窗相关的样式 */
.overlay { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal { background: white; padding: 30px; border-radius: 15px; text-align: center; max-width: 350px; width: 90%; }
.start-btn, .action-btn { background: linear-gradient(45deg, #ff6b6b, #ee5a24); color: white; border: none; padding: 15px 30px; border-radius: 25px; font-size: 18px; font-weight: bold; cursor: pointer; transition: transform 0.2s; touch-action: manipulation; }
.start-btn:hover, .action-btn:hover { transform: scale(1.05); }
.end-btn-row { display: flex; gap: 10px; margin-top: 20px; justify-content: center; }
.action-btn.green { background: #27ae60; }
.action-btn.green:hover { background: #229954; }
.action-btn.purple { background: linear-gradient(45deg, #667eea, #764ba2); }
.action-btn.gray { background: linear-gradient(45deg, #bdc3c7, #95a5a6); }
</style>