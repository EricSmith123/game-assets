<template>
  <div v-if="showLoading" class="loading-overlay">
    <div class="loading-content">
      <div class="loading-spinner"></div>
      <h2>🎮 游戏加载中...</h2>
      <div class="loading-progress">
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: loadingProgress + '%' }"></div>
        </div>
        <div class="progress-text">{{ Math.round(loadingProgress) }}%</div>
      </div>
      <div class="loading-tips">
        <p v-if="loadingProgress < 20">正在连接资源服务器...</p>
        <p v-else-if="loadingProgress < 95">正在加载游戏资源...</p>
        <p v-else>即将完成...</p>
      </div>
    </div>
  </div>

  <template v-else>
    <button @click="openSettings" class="settings-btn">⚙️ 设置</button>

    <SettingsPanel
      v-model="showSettings"
      v-model:bgm-volume="bgmVolume"
      v-model:sfx-volume="sfxVolumePercent"
      @reset="resetSettings"
      @close="closeSettings"
    />

    <div class="game-container">
      <div v-if="gameState !== 'menu'" class="top-controls">
        <div class="bgm-selector">
          <button
            v-for="bgm in bgmList"
            :key="bgm.id"
            class="bgm-btn"
            :class="{ active: currentBgmId === bgm.id }"
            @click="switchBgm(bgm)"
          >
            BGM{{ bgm.id }}
          </button>
        </div>
        <div class="right-controls">
          <button class="audio-btn" @click="toggleBgm" :title="bgmPlaying ? '暂停音乐' : '播放音乐'">
            {{ bgmPlaying ? '🔊' : '🔇' }}
          </button>
          <button class="audio-btn" @click="toggleSfx" :title="sfxEnabled ? '关闭音效' : '开启音效'">
            {{ sfxEnabled ? '🎵' : '🔕' }}
          </button>
          <button class="pause-btn" @click="togglePause" v-if="gameState === 'playing'">
            ⏸️
          </button>
        </div>
      </div>

      <GameModals
        :game-state="gameState"
        :score="score"
        :moves-used="movesUsed"
        :formatted-time="formattedTime"
        @start-game="startGame"
        @restart-game="restartGame"
        @resume-game="togglePause"
      />

      <div class="game-content">
        <div class="score-info">
          <div class="score-box">
            <span class="score-label">分数</span>
            <span class="score-value">{{ score }}</span>
          </div>
          <div class="score-box">
            <span class="score-label">步数</span>
            <span class="score-value">{{ movesUsed }}</span>
          </div>
          <div class="score-box">
            <span class="score-label">时间</span>
            <span class="score-value">{{ formattedTime }}</span>
          </div>
        </div>

        <GameBoard
          :flat-board="flatBoard"
          :board-style="boardStyle"
          :selected-tile="selectedTile"
          :matched-tiles="matchedTiles"
          :shaking-tile="shakingTile"
          :particles="particles"
          :show-chain-effect="showChainEffect"
          :chain-count="chainCount"
          :cdn-url="CURRENT_CDN"
          @tile-click="onTileClick"
          @outside-click="selectedTile = null"
        />

        <div v-if="showMessage" class="message-box" :class="messageType">
          {{ message }}
        </div>
      </div>
    </div>
  </template>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useAudioManager } from './composables/useAudioManager.js';
import { useGameLogic } from './composables/useGameLogic.js';
import SettingsPanel from './components/SettingsPanel.vue';
import GameBoard from './components/GameBoard.vue';
import GameModals from './components/GameModals.vue';

// --- 资源与配置 ---
const CDN_OPTIONS = {
    jsdelivr: 'https://cdn.jsdelivr.net/gh/EricSmith123/game-assets@main',
    github: 'https://raw.githubusercontent.com/EricSmith123/game-assets/main'
};
let CURRENT_CDN = CDN_OPTIONS.jsdelivr;
const bgmList = ref([]);
const sfxMap = {};

// --- 状态管理 ---
// UI 状态
const showLoading = ref(true);
const loadingProgress = ref(0);
const showSettings = ref(false);
const showMessage = ref(false);
const message = ref('');
const messageType = ref('info');
const gameState = ref('menu'); // 'menu', 'playing', 'paused', 'gameover'
const gameTime = ref(0);
const gameTimer = ref(null);

// 设置状态
const bgmVolume = ref(50);
const sfxVolumePercent = ref(70);
const currentBgmId = ref(0);

// --- 逻辑模块初始化 ---
const { audioManager, bgmPlaying, sfxEnabled, playNamedSfx, playBgm, toggleBgm, toggleSfx, activateAudioOnMobile } = useAudioManager(sfxMap);
const { score, movesUsed, flatBoard, boardStyle, selectedTile, matchedTiles, shakingTile, particles, showChainEffect, chainCount, handleTileClick, resetGame } = useGameLogic(playNamedSfx);

// --- 计算属性 ---
const formattedTime = computed(() => {
    const minutes = Math.floor(gameTime.value / 60);
    const seconds = gameTime.value % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
});

// --- 方法 ---
// 消息提示
const showMessageTip = (msg, type = 'info', duration = 1200) => {
    message.value = msg;
    messageType.value = type;
    showMessage.value = true;
    setTimeout(() => { showMessage.value = false; }, duration);
};

// 游戏流程控制
const startGame = async () => {
    await activateAudioOnMobile();
    await playNamedSfx('click');
    gameState.value = 'playing';
    gameTime.value = 0;
    resetGame();
    if (gameTimer.value) clearInterval(gameTimer.value);
    gameTimer.value = setInterval(() => { if (gameState.value === 'playing') gameTime.value++; }, 1000);
    await playLastOrDefaultBgm();
};

const restartGame = () => {
    if (gameTimer.value) clearInterval(gameTimer.value);
    startGame();
};

const onTileClick = async (tile) => {
    if (gameState.value !== 'playing' || isSwapping.value || isChecking.value) return;
    const result = await handleTileClick(tile, showMessageTip);
    if (result === 'no-moves') {
        playNamedSfx('nomove');
        showMessageTip('没有可移动的步数了!', 'error', 2000);
        gameState.value = 'gameover';
    }
};

const togglePause = () => {
    if (gameState.value !== 'playing' && gameState.value !== 'paused') return;
    
    if (gameState.value === 'playing') {
        gameState.value = 'paused';
        audioManager.pauseBgm();
        bgmPlaying.value = false;
    } else {
        gameState.value = 'playing';
        audioManager.resumeBgm();
        bgmPlaying.value = true;
    }
    playNamedSfx('click');
};

// BGM
const switchBgm = async (bgm) => { 
    if (currentBgmId.value === bgm.id) return; 
    await playNamedSfx('click');
    currentBgmId.value = bgm.id; 
    localStorage.setItem('last_played_bgm_id', bgm.id.toString()); 
    try { await playBgm(bgm.src); } catch { showMessageTip('BGM 切换失败', 'error'); } 
};
const playLastOrDefaultBgm = async () => { 
    const id = localStorage.getItem('last_played_bgm_id'); 
    const bgm = bgmList.value.find(b => b.id === parseInt(id, 10)) || bgmList.value[0]; 
    if (bgm && bgm.src) { 
        try { await playBgm(bgm.src); currentBgmId.value = bgm.id; } catch (e) { showMessageTip('BGM 加载失败', 'error'); } 
    } 
};

// 设置
const openSettings = () => { showSettings.value = true; };
const closeSettings = () => { showSettings.value = false; };
const updateBgmVolume = () => { audioManager.setBgmVolume(bgmVolume.value / 100); localStorage.setItem('bgm_volume', bgmVolume.value); };
const updateSfxVolume = () => { audioManager.setSfxVolume(sfxVolumePercent.value / 100); localStorage.setItem('sfx_volume', sfxVolumePercent.value); };
const resetSettings = () => { bgmVolume.value = 50; sfxVolumePercent.value = 70; updateBgmVolume(); updateSfxVolume(); localStorage.removeItem('bgm_volume'); localStorage.removeItem('sfx_volume'); showMessageTip('设置已重置', 'success'); };
const loadSettings = () => { const v = localStorage.getItem('bgm_volume'); const s = localStorage.getItem('sfx_volume'); if (v) bgmVolume.value = parseInt(v, 10); if (s) sfxVolumePercent.value = parseInt(s, 10); updateBgmVolume(); updateSfxVolume(); };

// 初始化
const initializeGame = async () => {
    const detectBestCDN = async () => {
        for (const [name, baseUrl] of Object.entries(CDN_OPTIONS)) {
            try {
                const testUrl = `${baseUrl}/test.txt?t=${Date.now()}`;
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 3000);
                const response = await fetch(testUrl, { method: 'HEAD', signal: controller.signal });
                clearTimeout(timeoutId);
                if (response.ok) { CURRENT_CDN = baseUrl; return; }
            } catch (error) {}
        }
    };
    const updateAudioSources = () => {
        bgmList.value = [
            { id: 1, name: "轻松BGM", src: `${CURRENT_CDN}/audio/bgm/bgm_1.mp3` },
            { id: 2, name: "活泼BGM", src: `${CURRENT_CDN}/audio/bgm/bgm_2.mp3` }
        ];
        Object.assign(sfxMap, {
            click: `${CURRENT_CDN}/audio/sfx/click.mp3`, swap: `${CURRENT_CDN}/audio/sfx/swap.mp3`,
            match: `${CURRENT_CDN}/audio/sfx/match.mp3`, error: `${CURRENT_CDN}/audio/sfx/error.mp3`,
            fall: `${CURRENT_CDN}/audio/sfx/fall.mp3`, nomove: `${CURRENT_CDN}/audio/sfx/nomove.mp3`
        });
    };
    try {
        loadingProgress.value = 10;
        await detectBestCDN();
        loadingProgress.value = 20;
        updateAudioSources();
        await audioManager.init();
        loadingProgress.value = 95;
        await new Promise(resolve => setTimeout(resolve, 500));
        loadingProgress.value = 100;
        setTimeout(() => { showLoading.value = false; }, 300);
    } catch (error) {
        showLoading.value = false;
        showMessageTip('资源加载失败，请检查网络并刷新', 'error', 3000);
    }
};

// --- 生命周期钩子 ---
onMounted(async () => {
    loadSettings();
    await initializeGame();
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && bgmPlaying.value) {
            audioManager.pauseBgm();
            bgmPlaying.value = false;
        } else if (!document.hidden && gameState.value === 'playing') {
            audioManager.resumeBgm();
            bgmPlaying.value = true;
        }
    });
});

onUnmounted(() => {
    if (gameTimer.value) clearInterval(gameTimer.value);
    audioManager.close();
});
</script>

<style>
/* App.vue 中只保留全局和最顶层的布局样式 */
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; }
.game-container { width: 100%; background: white; border-radius: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.1); overflow: hidden; position: relative; margin: 10px; max-width: min(95vw, 500px); max-height: min(95vh, 700px); }
.top-controls { position: absolute; top: 0; left: 0; right: 0; height: 60px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; justify-content: space-between; align-items: center; padding: 10px 15px; z-index: 100; }
.right-controls { display: flex; align-items: center; gap: 8px; }
.bgm-selector { position: static; background: none; border-radius: 0; padding: 0; display: flex; gap: 5px; }
.bgm-btn { background: rgba(255,255,255,0.3); border: none; color: white; padding: 6px 10px; border-radius: 8px; cursor: pointer; font-size: 11px; touch-action: manipulation; transition: all 0.2s; }
.bgm-btn.active { background: rgba(255,255,255,0.8); color: #333; }
.audio-btn { background: rgba(255,255,255,0.2); border: none; color: white; padding: 8px; border-radius: 50%; cursor: pointer; font-size: 14px; touch-action: manipulation; min-width: 32px; min-height: 32px; display: flex; align-items: center; justify-content: center; }
.pause-btn { background: rgba(255,255,255,0.2); border: none; color: white; padding: 8px 12px; border-radius: 15px; cursor: pointer; font-size: 12px; touch-action: manipulation; }
.game-content { padding: 70px 20px 20px 20px; }
.score-info { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px; margin: -70px -20px 20px -20px; padding-top: 75px; border-radius: 0; display: flex; justify-content: space-around; align-items: center; }
.score-box { text-align: center; }
.score-label { display: block; font-size: 12px; opacity: 0.8; }
.score-value { display: block; font-size: 18px; font-weight: bold; }
.message-box { position: absolute; bottom: 80px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.8); color: white; padding: 10px 20px; border-radius: 20px; z-index: 100; animation: fadeInOut 1.2s ease; }
.message-box.error { background: rgba(255, 107, 107, 0.9); }
.message-box.success { background: rgba(67, 233, 123, 0.9); }
.message-box.chain { background: rgba(255, 215, 0, 0.9); color: #333; }
.loading-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; justify-content: center; align-items: center; z-index: 9999; }
.loading-content { text-align: center; color: white; max-width: 400px; padding: 40px; }
.loading-spinner { width: 60px; height: 60px; border: 4px solid rgba(255, 255, 255, 0.3); border-top: 4px solid white; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 30px; }
.loading-progress { margin: 30px 0; }
.progress-bar { width: 100%; height: 8px; background: rgba(255, 255, 255, 0.3); border-radius: 4px; overflow: hidden; margin-bottom: 10px; }
.progress-fill { height: 100%; background: linear-gradient(90deg, #4CAF50, #8BC34A); border-radius: 4px; transition: width 0.3s ease; }
.progress-text { font-size: 18px; font-weight: bold; }
.loading-tips { margin-top: 20px; font-size: 14px; opacity: 0.9; }
.settings-btn { position: absolute; top: 20px; right: 20px; background: rgba(255, 255, 255, 0.9); border: none; padding: 10px 15px; border-radius: 8px; cursor: pointer; font-size: 14px; transition: all 0.3s ease; z-index: 1001; }
.settings-btn:hover { background: white; transform: translateY(-2px); }
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
@keyframes fadeInOut { 0%, 100% { opacity: 0; transform: translateX(-50%) scale(0.8); } 50% { opacity: 1; transform: translateX(-50%) scale(1); } }
@media (min-width: 768px) { .game-container { max-width: 600px; max-height: 800px; margin: 0 auto; } .top-controls { height: 70px; padding: 15px 20px; } .bgm-btn { padding: 8px 14px; font-size: 13px; } .audio-btn { min-width: 40px; min-height: 40px; font-size: 16px; } .game-content { padding: 80px 30px 30px 30px; } }
@media (min-width: 1200px) { .game-container { max-width: 700px; max-height: 900px; } }
@media (max-width: 480px) { .game-container { margin: 5px; border-radius: 15px; max-width: 98vw; max-height: 98vh; } .top-controls { height: 50px; padding: 8px 12px; } .bgm-btn { padding: 5px 8px; font-size: 10px; } .audio-btn { min-width: 28px; min-height: 28px; font-size: 12px; padding: 6px; } .pause-btn { padding: 6px 10px; font-size: 11px; } .game-content { padding: 60px 15px 15px 15px; } }
@media (max-width: 360px) { .bgm-btn { padding: 4px 6px; font-size: 9px; } }
@media (orientation: landscape) and (max-height: 500px) { body { align-items: flex-start; padding-top: 10px; } .game-container { max-height: 95vh; } }
</style>