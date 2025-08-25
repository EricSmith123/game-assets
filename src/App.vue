<template>
  <div class="app-root">
    <!-- 错误边界包装整个应用 -->
    <ErrorBoundary
      @error="onGlobalError"
      @retry="onErrorRetry"
      @reset="onErrorReset"
      @report="onErrorReport"
    >
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
        <button class="skip-loading-btn" @click="skipLoading" title="跳过加载">
          跳过加载 ({{ Math.round(loadingProgress) }}%)
        </button>
        <button class="skip-loading-btn" @click="showLoading = false" title="强制进入游戏" style="margin-top: 10px; background: rgba(255,0,0,0.3);">
          强制进入游戏
        </button>
      </div>
    </div>

    <div v-else>

    <button @click="openSettings" class="settings-btn">⚙️ 设置</button>

    <SettingsPanel
      v-model="showSettings"
      v-model:bgm-volume="bgmVolume"
      v-model:sfx-volume="sfxVolumePercent"
      @reset="resetSettings"
      @close="closeSettings"
      @test-sfx="testAllSfx"
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
          <button class="audio-btn" @click="testSingleSfx" title="测试音效管理器">
            🧪
          </button>
          <button class="audio-btn" @click="testGameSfx" title="测试游戏音效">
            🎮
          </button>
          <button class="audio-btn" @click="emergencyReset" title="紧急重置状态" style="background: #dc3545;">
            🚨
          </button>
          <button class="audio-btn" @click="testChainMatching" title="测试连锁消除" style="background: #17a2b8;">
            🔗
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
        @back-to-menu="backToMenu"
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
    </div>

    <!-- 错误通知组件 -->
    <ErrorToast
      v-for="notification in notifications.filter(n => !n.dismissed)"
      :key="notification.id"
      :visible="!notification.dismissed"
      :message="notification.strategy.userMessage"
      :details="notification.error.message"
      :severity="notification.error.severity"
      :can-retry="notification.strategy.retryable"
      :can-report="notification.strategy.shouldReport"
      :show-details="true"
      @dismiss="dismissNotification(notification.id)"
      @retry="retryFromNotification(notification.id)"
      @report="reportFromNotification(notification.id)"
    />

    </ErrorBoundary>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useUnifiedAudioManager } from './composables/useUnifiedAudioManager';
import { useGameLogic } from './composables/useGameLogic';
import SettingsPanel from './components/SettingsPanel.vue';
import GameBoard from './components/GameBoard.vue';
import GameModals from './components/GameModals.vue';
import ErrorBoundary from './components/ErrorBoundary.vue';
import ErrorToast from './components/ErrorToast.vue';
import { useErrorHandler } from './composables/useErrorHandler';
// 移除静态导入，改为通过服务注册中心获取
// import { runTechnicalDebtTests } from './utils/testSuite';
// import { debugHelper } from './utils/debugHelper';
// import { performanceMonitor } from './utils/performanceMonitor';
// import { benchmarkSuite } from './utils/benchmarkSuite';
// import { performanceComparison } from './utils/performanceComparison';
import { resourcePreloader, ResourceType, ResourcePriority } from './utils/resourcePreloader';
import { cacheManager } from './utils/cacheManager';
import { cdnManager } from './utils/cdnManager';
import { memoryOptimizer } from './utils/memoryOptimizer';
import { optimizedAudioManager } from './utils/optimizedAudioManager';
import { renderOptimizer } from './utils/renderOptimizer';
import { animationOptimizer } from './utils/animationOptimizer';
import { optimizedMatchDetector } from './utils/optimizedMatchDetector';
// 移除静态导入，改为通过服务注册中心获取
// import { memoryManager } from './utils/memoryManager';
// import { wasmMatchDetector } from './utils/wasmMatchDetector';
// import { tileObjectPool } from './utils/tileObjectPool';
// import { networkOptimizer } from './utils/networkOptimizer';
// import { serviceWorkerManager } from './utils/serviceWorkerManager';
// import { offlineManager } from './utils/offlineManager';
import { interactionAnimator } from './utils/interactionAnimator';
import { responsiveManager } from './utils/responsiveManager';
import { accessibilityManager } from './utils/accessibilityManager';
// 移除静态导入，改为通过服务注册中心获取
// import { userPreferencesManager } from './utils/userPreferencesManager';
// import { loadingExperienceManager } from './utils/loadingExperienceManager';
import { performCompleteCleanup, startElementMonitoring, cleanupGreenSquares } from './utils/elementCleaner';
import { devToolsController } from './utils/devToolsController';
import { serviceRegistry } from './utils/serviceRegistry';
import { layeredSettingsManager } from './utils/layeredSettingsManager';
import { smartResourcePreloader } from './utils/smartResourcePreloader';
import { mobileOptimizer } from './utils/mobileOptimizer';
import { touchGestureManager } from './utils/touchGestureManager';
import { ErrorCode } from '@/types/error';
import type { GameState, MessageType, BgmInfo } from '@/types/game';
import type { SfxMap } from '@/types/audio';

// --- 资源与配置 ---
interface CdnOptions {
    jsdelivr: string;
    github: string;
}

const CDN_OPTIONS: CdnOptions = {
    local: './',  // 优先使用本地资源
    jsdelivr: 'https://cdn.jsdelivr.net/gh/EricSmith123/game-assets@main',
    github: 'https://raw.githubusercontent.com/EricSmith123/game-assets/main'
};

let CURRENT_CDN: string = CDN_OPTIONS.jsdelivr;
const bgmList = ref<BgmInfo[]>([]);
const sfxMap: SfxMap = {};

// --- 状态管理 ---
// UI 状态
const showLoading = ref<boolean>(true);
const loadingProgress = ref<number>(0);
const showSettings = ref<boolean>(false);
const showMessage = ref<boolean>(false);
const message = ref<string>('');
const messageType = ref<MessageType>('info');
const gameState = ref<GameState>('menu');
const gameTime = ref<number>(0);
const gameTimer = ref<number | null>(null);

// 设置状态
const bgmVolume = ref<number>(50);
const sfxVolumePercent = ref<number>(70);
const currentBgmId = ref<number>(0);

// --- 错误处理初始化 ---
const {
  notifications,
  isReporting,
  handleError,
  createError,
  dismissNotification,
  retryFromNotification,
  reportFromNotification,
  wrapAsyncFunction
} = useErrorHandler();

// --- 统一音频管理初始化 ---
console.log('🎵 初始化统一音频管理器...');
const { audioManager, bgmPlaying, sfxEnabled, playNamedSfx, playBgm, toggleBgm, toggleSfx, activateAudioOnMobile, testAllSfx } = useUnifiedAudioManager(sfxMap);
console.log('✅ 统一音频管理器初始化成功');

// --- 游戏逻辑初始化 ---
console.log('🎮 初始化游戏逻辑...');
const { score, movesUsed, gameBoard, flatBoard, boardStyle, selectedTile, matchedTiles, shakingTile, particles, showChainEffect, chainCount, isProcessing, handleTileClick, resetGame, emergencyReset, testGameSfx, testChainMatching } = useGameLogic(playNamedSfx);
console.log('✅ 游戏逻辑初始化成功');



// --- 计算属性 ---
const formattedTime = computed(() => {
    const minutes = Math.floor(gameTime.value / 60);
    const seconds = gameTime.value % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
});

// --- 响应式监听器 ---
// 监听BGM音量变化
watch(bgmVolume, (newValue) => {
    console.log('🔊 BGM音量变化:', newValue);
    updateBgmVolume();
});

// 监听音效音量变化
watch(sfxVolumePercent, (newValue) => {
    console.log('🔊 音效音量变化:', newValue);
    updateSfxVolume();
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
    console.log('🎮 开始游戏流程...');

    try {
        // 1. 首先激活音频上下文（这是关键步骤）
        console.log('🔊 激活音频上下文...');
        await activateAudioOnMobile();

        // 2. 确保音频管理器完全初始化
        if (!audioManager.initialized) {
            console.log('🔊 音频管理器未初始化，开始初始化...');
            await audioManager.init();
        }

        // 3. 播放点击音效（这也有助于激活音频上下文）
        await playNamedSfx('click');
        console.log('✅ 点击音效播放完成');

        // 4. 立即尝试播放BGM（在用户交互的上下文中）
        console.log('🎵 立即播放BGM（在用户交互上下文中）...');
        await playLastOrDefaultBgm();

        // 5. 设置游戏状态
        gameState.value = 'playing';
        gameTime.value = 0;
        resetGame();

        // 6. 通知智能预加载器游戏已开始
        smartResourcePreloader.notifyGameStarted();

        // 6. 设置游戏计时器
        if (gameTimer.value) clearInterval(gameTimer.value);
        gameTimer.value = setInterval(() => {
            if (gameState.value === 'playing') gameTime.value++;
        }, 1000);

        console.log('✅ 游戏启动完成');

    } catch (error) {
        console.error('❌ 游戏启动过程中出错:', error);
        // 即使BGM播放失败，游戏也应该能正常开始
        gameState.value = 'playing';
        gameTime.value = 0;
        resetGame();
    }
};

const restartGame = () => {
    if (gameTimer.value) clearInterval(gameTimer.value);
    startGame();
};

const backToMenu = () => {
    console.log('🎮 返回菜单...');
    if (gameTimer.value) clearInterval(gameTimer.value);
    gameState.value = 'menu';
    score.value = 0;
    movesUsed.value = 0;
    gameTime.value = 0;
};

const onTileClick = async (tile) => {
    console.log('🎮 方块点击事件:', tile, '游戏状态:', gameState.value);

    if (gameState.value !== 'playing' || isProcessing.value) {
        console.log('🎮 点击被忽略 - 游戏状态:', gameState.value, '处理中:', isProcessing.value);
        return;
    }

    console.log('🎮 处理方块点击...');
    const result = await handleTileClick(tile, showMessageTip);
    console.log('🎮 方块点击结果:', result);

    if (result === 'no-moves') {
        playNamedSfx('nomove');
        showMessageTip('没有可移动的步数了!', 'error', 2000);
        gameState.value = 'gameover';
    }
};

// 简单的音效测试函数
const testSingleSfx = async () => {
    console.log('🧪 快速音效测试 - 测试所有音效');
    const testSounds = ['click', 'swap', 'match', 'error', 'fall'];
    for (const sound of testSounds) {
        console.log(`🧪 测试: ${sound}`);
        await playNamedSfx(sound);
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    console.log('🧪 快速音效测试完成');
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
    console.log('🎵 开始播放BGM - bgmList长度:', bgmList.value.length);
    console.log('🎵 音频管理器状态 - 已初始化:', audioManager.initialized, '使用WebAudio:', audioManager.useWebAudio);

    // 确保bgmList已经初始化
    if (!bgmList.value || bgmList.value.length === 0) {
        console.warn('⚠️ bgmList为空，无法播放BGM');
        return;
    }

    // 确保音频管理器已初始化
    if (!audioManager.initialized) {
        console.log('🔊 音频管理器未初始化，先初始化...');
        try {
            await audioManager.init();
            console.log('✅ 音频管理器初始化完成');
        } catch (e) {
            console.error('❌ 音频管理器初始化失败:', e);
            return;
        }
    }

    const lastPlayedId = localStorage.getItem('last_played_bgm_id');
    console.log('🎵 上次播放的BGM ID:', lastPlayedId);

    // 查找上次播放的BGM，如果没有则使用第一个
    let targetBgm;
    if (lastPlayedId) {
        targetBgm = bgmList.value.find(b => b.id === parseInt(lastPlayedId, 10));
        console.log('🎵 找到上次播放的BGM:', targetBgm);
    }

    // 如果没找到上次播放的，使用默认的第一个
    if (!targetBgm) {
        targetBgm = bgmList.value[0];
        console.log('🎵 使用默认BGM:', targetBgm);
    }

    if (targetBgm && targetBgm.src) {
        try {
            console.log('🎵 开始播放BGM:', targetBgm.name, '路径:', targetBgm.src);

            // 如果使用WebAudio，确保音频上下文已激活
            if (audioManager.useWebAudio && audioManager.audioContext) {
                if (audioManager.audioContext.state === 'suspended') {
                    console.log('🔊 音频上下文被暂停，尝试恢复...');
                    await audioManager.audioContext.resume();
                    console.log('✅ 音频上下文已恢复，状态:', audioManager.audioContext.state);
                }
            }

            await playBgm(targetBgm.src);
            currentBgmId.value = targetBgm.id;
            console.log('✅ BGM播放成功，当前ID:', currentBgmId.value);

            // 保存当前播放的BGM ID
            localStorage.setItem('last_played_bgm_id', targetBgm.id.toString());

        } catch (e) {
            console.error('❌ BGM播放失败:', e);
            console.error('❌ 错误详情:', e.message, e.stack);
            showMessageTip('BGM 播放失败，请手动点击BGM按钮', 'error', 3000);
        }
    } else {
        console.warn('⚠️ 没有可用的BGM');
    }
};

// 设置
const openSettings = async () => {
    await playNamedSfx('click');
    showSettings.value = true;
};
const closeSettings = async () => {
    await playNamedSfx('click');
    showSettings.value = false;
};
const updateBgmVolume = () => { audioManager.setBgmVolume(bgmVolume.value / 100); localStorage.setItem('bgm_volume', bgmVolume.value); };
const updateSfxVolume = () => { audioManager.setSfxVolume(sfxVolumePercent.value / 100); localStorage.setItem('sfx_volume', sfxVolumePercent.value); };
const resetSettings = () => { bgmVolume.value = 50; sfxVolumePercent.value = 70; updateBgmVolume(); updateSfxVolume(); localStorage.removeItem('bgm_volume'); localStorage.removeItem('sfx_volume'); showMessageTip('设置已重置', 'success'); };
const loadSettings = () => { const v = localStorage.getItem('bgm_volume'); const s = localStorage.getItem('sfx_volume'); if (v) bgmVolume.value = parseInt(v, 10); if (s) sfxVolumePercent.value = parseInt(s, 10); updateBgmVolume(); updateSfxVolume(); };

// 跳过加载
const skipLoading = () => {
    console.log('⏭️ 用户跳过加载');
    showLoading.value = false;
};

// 进度控制系统
class LoadingProgressController {
    private progressLock = false;
    private lastProgressValue = 0;
    private isCompleted = false;
    private activeCallbacks = new Set<() => void>();
    private progressMonitor: number | null = null;

    /**
     * 安全的进度设置函数，确保单调递增且不超过100%
     */
    async setProgress(value: number, stepName?: string): Promise<void> {
        // 如果已完成，忽略所有后续更新
        if (this.isCompleted) {
            console.log(`🚫 进度已完成，忽略更新: ${value}% - ${stepName || ''}`);
            return;
        }

        // 防止竞态条件
        if (this.progressLock) {
            console.log(`⏳ 进度设置被跳过（锁定中）: ${value}% - ${stepName || ''}`);
            return;
        }

        this.progressLock = true;

        try {
            const clampedValue = Math.max(this.lastProgressValue, Math.min(100, value));
            const timestamp = new Date().toISOString().split('T')[1].split('.')[0];

            // 只有当新值大于当前值时才更新（确保单调递增）
            if (clampedValue > this.lastProgressValue) {
                console.log(`📊 [${timestamp}] 加载进度: ${clampedValue}% ${stepName ? `- ${stepName}` : ''}`);

                loadingProgress.value = clampedValue;
                this.lastProgressValue = clampedValue;

                // 如果达到100%，标记为完成并清理回调
                if (clampedValue >= 100) {
                    this.markCompleted();
                }

                // 给UI时间渲染
                await nextTick();
                await new Promise(resolve => setTimeout(resolve, 50));
            } else {
                console.log(`⚠️ 进度值被忽略（非递增）: ${value}% -> ${clampedValue}% (当前: ${this.lastProgressValue}%)`);
            }
        } finally {
            this.progressLock = false;
        }
    }

    /**
     * 标记进度完成并清理所有回调
     */
    private markCompleted(): void {
        this.isCompleted = true;

        // 清理所有活跃的回调
        this.activeCallbacks.forEach(callback => {
            try {
                callback();
            } catch (error) {
                console.warn('清理回调时出错:', error);
            }
        });
        this.activeCallbacks.clear();

        // 清理进度监控
        if (this.progressMonitor) {
            clearInterval(this.progressMonitor);
            this.progressMonitor = null;
        }

        console.log('✅ 进度控制器已完成并清理所有回调');
    }

    /**
     * 注册需要在完成时清理的回调
     */
    registerCallback(callback: () => void): void {
        if (this.isCompleted) {
            callback();
        } else {
            this.activeCallbacks.add(callback);
        }
    }

    /**
     * 重置进度控制器
     */
    reset(): void {
        this.progressLock = false;
        this.lastProgressValue = 0;
        this.isCompleted = false;
        this.activeCallbacks.clear();

        if (this.progressMonitor) {
            clearInterval(this.progressMonitor);
            this.progressMonitor = null;
        }

        console.log('🔄 进度控制器已重置');
    }

    /**
     * 获取当前进度值
     */
    getCurrentProgress(): number {
        return this.lastProgressValue;
    }

    /**
     * 是否已完成
     */
    getIsCompleted(): boolean {
        return this.isCompleted;
    }
}

// 创建进度控制器实例
const progressController = new LoadingProgressController();

// 包装函数，保持向后兼容
const setLoadingProgress = (value: number, stepName?: string) => {
    return progressController.setProgress(value, stepName);
};

// 简化的加载进度监控
const startProgressMonitoring = () => {
    const startTime = Date.now();
    const progressMonitor = setInterval(() => {
        const elapsed = Date.now() - startTime;
        // 只在开发环境且启用详细日志时显示监控信息
        if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('verboseLogs') === '1') {
            console.log(`⏱️ [${Math.round(elapsed/1000)}s] 当前进度: ${loadingProgress.value}%`);
        }
    }, 3000); // 进一步减少监控频率到3秒

    return progressMonitor;
};

// 优化的初始化函数 - 添加性能测量
const initializeGame = async () => {
    const initStartTime = performance.now();
    const progressMonitor = startProgressMonitoring();

    try {
        // 重置进度控制器
        progressController.reset();

        console.log('🚀 开始优化初始化流程...');
        await setLoadingProgress(0, '开始初始化');

        // 1. 注册Service Worker
        console.log('🔧 注册Service Worker...');
        await setLoadingProgress(5, '准备Service Worker');
        await serviceWorkerManager.register();
        await setLoadingProgress(10, 'Service Worker已注册');

        // 2. 初始化网络优化器
        console.log('🌐 初始化网络优化器...');
        // 网络优化器会自动初始化
        await setLoadingProgress(15, '网络优化器已初始化');

        // 3. 初始化离线管理器
        console.log('🔌 初始化离线管理器...');
        await setLoadingProgress(18, '准备离线管理器');
        offlineManager.configure({
            enableOfflineMode: true,
            autoSave: true,
            saveInterval: 30000,
            syncOnReconnect: true
        });
        await setLoadingProgress(20, '离线管理器已配置');

        // 4. 初始化用户体验优化系统
        console.log('🎨 初始化用户体验优化系统...');

        // 初始化交互动画系统
        console.log('✨ 初始化交互动画系统...');
        // 交互动画系统会自动初始化

        // 初始化响应式管理器
        console.log('📱 初始化响应式管理器...');
        // 响应式管理器会自动初始化

        // 初始化可访问性管理器
        console.log('♿ 初始化可访问性管理器...');
        accessibilityManager.createAccessibilityToolbar();

        // 初始化用户偏好设置管理器
        console.log('⚙️ 初始化用户偏好设置管理器...');
        // 用户偏好设置管理器会自动初始化

        // 初始化加载体验管理器
        console.log('🔄 初始化加载体验管理器...');
        // 加载体验管理器会自动初始化

        await setLoadingProgress(25, '用户体验系统已初始化');

        // 5. 初始化内存管理器
        console.log('🧠 初始化智能内存管理器...');
        await setLoadingProgress(28, '准备内存管理器');
        memoryManager.init({
            maxMemoryUsage: 150, // 150MB
            gcThreshold: 75, // 75%触发GC
            monitorInterval: 3000, // 3秒监控
            leakDetectionEnabled: true
        });
        await setLoadingProgress(30, '内存管理器已初始化');

        // 6. 初始化缓存系统
        console.log('💾 初始化超级缓存系统...');
        await setLoadingProgress(32, '准备缓存系统');
        await cacheManager.init();
        await setLoadingProgress(35, '缓存系统已初始化');

        // 7. 智能CDN选择
        console.log('🌐 智能CDN选择...');
        await setLoadingProgress(38, '开始CDN选择');
        const isDev = import.meta.env.DEV;
        let selectedCdn;

        if (!isDev) {
            selectedCdn = await cdnManager.selectBestCdn();
            CURRENT_CDN = selectedCdn.baseUrl;
        } else {
            CURRENT_CDN = '';
        }
        await setLoadingProgress(40, 'CDN选择完成');

        // 3. 配置资源URL
        const updateAudioSources = () => {
            const baseUrl = isDev ? '' : CURRENT_CDN;

            bgmList.value = [
                { id: 1, name: "轻松BGM", src: `${baseUrl}/audio/bgm/bgm_1.mp3` },
                { id: 2, name: "活泼BGM", src: `${baseUrl}/audio/bgm/bgm_2.mp3` }
            ];

            Object.assign(sfxMap, {
                click: `${baseUrl}/audio/sfx/click.mp3`,
                swap: `${baseUrl}/audio/sfx/swap.mp3`,
                match: `${baseUrl}/audio/sfx/match.mp3`,
                error: `${baseUrl}/audio/sfx/error.mp3`,
                fall: `${baseUrl}/audio/sfx/fall.mp3`,
                nomove: `${baseUrl}/audio/sfx/nomove.mp3`
            });

            console.log('📁 音频资源已配置:', { bgmCount: bgmList.value.length, sfxCount: Object.keys(sfxMap).length });
        };

        updateAudioSources();
        await setLoadingProgress(42, '资源配置完成');

        // 4. 预加载图片资源
        console.log('🖼️ 预加载图片资源...');
        const imageConfigs = [];
        for (let i = 1; i <= 6; i++) {
            const baseUrl = isDev ? '' : CURRENT_CDN;
            imageConfigs.push({
                url: `${baseUrl}/tiles/tile-${i}.webp`,
                type: ResourceType.IMAGE,
                priority: ResourcePriority.HIGH
            });
        }

        resourcePreloader.addResources(imageConfigs);
        await setLoadingProgress(45, '开始预加载图片');

        let lastImageProgress = 0;
        let imageProgressActive = true;

        // 注册清理回调
        progressController.registerCallback(() => {
            imageProgressActive = false;
        });

        await resourcePreloader.preload(
            async (progress) => {
                // 检查是否仍然活跃
                if (!imageProgressActive) return;

                // 只在进度有显著变化时更新（减少频繁更新）
                const currentProgress = Math.round(progress.progress * 100);
                if (currentProgress - lastImageProgress >= 10) {
                    const progressValue = 45 + (progress.progress * 10);
                    await setLoadingProgress(progressValue, `图片预加载 ${currentProgress}%`);
                    lastImageProgress = currentProgress;
                }
            }
        );
        await setLoadingProgress(55, '图片预加载完成');

        // 5. 初始化WASM匹配检测器
        console.log('⚡ 初始化WebAssembly匹配检测器...');
        await setLoadingProgress(58, '准备WASM检测器');
        await wasmMatchDetector.init();
        await setLoadingProgress(62, 'WASM检测器已初始化');

        // 6. 初始化优化音频管理器
        console.log('🎵 初始化优化音频管理器...');
        await setLoadingProgress(65, '准备音频管理器');
        await optimizedAudioManager.init();
        await setLoadingProgress(68, '音频管理器已初始化');

        // 7. 预加载音频资源
        console.log('🎵 预加载音频资源...');
        await setLoadingProgress(70, '开始预加载音频');

        let lastAudioProgress = 0;
        let audioProgressActive = true;

        // 注册清理回调
        progressController.registerCallback(() => {
            audioProgressActive = false;
        });

        await optimizedAudioManager.preloadAudio(
            sfxMap,
            bgmList.value,
            async (progress) => {
                // 检查是否仍然活跃
                if (!audioProgressActive) return;

                // 只在进度有显著变化时更新（减少频繁更新）
                const currentProgress = Math.round(progress * 100);
                if (currentProgress - lastAudioProgress >= 10) {
                    const progressValue = 70 + (progress * 10);
                    await setLoadingProgress(progressValue, `音频预加载 ${currentProgress}%`);
                    lastAudioProgress = currentProgress;
                }
            }
        );
        await setLoadingProgress(80, '音频预加载完成');

        // 8. 初始化游戏板
        console.log('🎮 初始化游戏板...');
        await setLoadingProgress(85, '初始化游戏板');

        // 9. 完成最终设置
        console.log('🔧 完成最终设置...');
        await setLoadingProgress(90, '完成最终设置');

        // 10. 准备游戏界面
        console.log('🎨 准备游戏界面...');
        await setLoadingProgress(95, '准备游戏界面');

        console.log('✅ 所有初始化完成');
        await setLoadingProgress(100, '初始化完成');

        // 计算并报告加载性能
        const initEndTime = performance.now();
        const totalLoadTime = initEndTime - initStartTime;
        const userPerceivedTime = totalLoadTime / 1000; // 转换为秒

        console.log(`📊 加载性能报告:`);
        console.log(`   - 总加载时间: ${totalLoadTime.toFixed(2)}ms`);
        console.log(`   - 用户感知时间: ${userPerceivedTime.toFixed(2)}s`);
        console.log(`   - 性能目标: <3s (${userPerceivedTime < 3 ? '✅ 达标' : '❌ 未达标'})`);

        // 记录性能指标到监控系统
        if (window.performanceMonitor) {
            window.performanceMonitor.recordMetric('gameInitTime', totalLoadTime);
            window.performanceMonitor.recordMetric('userPerceivedLoadTime', userPerceivedTime);
        }

        // 清理进度监控
        clearInterval(progressMonitor);
        console.log('📊 加载进度监控已停止');

        // 通知开发工具控制器游戏加载完成
        devToolsController.notifyGameLoaded();

        // 显示游戏界面
        setTimeout(() => {
            showLoading.value = false;
            console.log('🎉 游戏界面已显示，所有资源已预加载');
        }, 500);

    } catch (error) {
        console.error('❌ 初始化失败:', error);
        clearInterval(progressMonitor);
        showLoading.value = false;
    }
};

// --- 错误处理方法 ---
const onGlobalError = (error: Error, instance: any, info: string): void => {
  console.error('🚨 全局错误捕获:', error);

  const gameError = createError(
    ErrorCode.COMPONENT_ERROR,
    `组件错误: ${error.message}`,
    {
      component: 'App',
      action: 'global_error_handler',
      additionalData: { info, componentName: instance?.$?.type?.name }
    }
  );

  gameError.originalError = error;
  gameError.stack = error.stack;

  handleError(gameError);
};

const onErrorRetry = (): void => {
  console.log('🔄 用户触发全局错误重试');
  // 可以在这里添加特定的重试逻辑
};

const onErrorReset = (): void => {
  console.log('🔄 用户触发全局重置');
  try {
    // 重置游戏状态
    gameState.value = 'menu';
    showLoading.value = false;
    showSettings.value = false;
    showMessage.value = false;

    // 重置游戏逻辑
    if (resetGame) {
      resetGame();
    }

    console.log('✅ 全局重置完成');
  } catch (resetError) {
    console.error('❌ 重置过程中发生错误:', resetError);
    // 最后的手段：重新加载页面
    window.location.reload();
  }
};

const onErrorReport = (error: any): void => {
  console.log('📤 用户触发错误报告:', error);
  // 错误报告逻辑已在useErrorHandler中处理
};

// 安全的全局清理函数
const performGlobalCleanup = () => {
    try {
        console.log('🧹 开始安全清理...');

        // 只清理明确标识为测试元素的内容
        const testElements = document.querySelectorAll(`
            [data-test="true"],
            [class*="test-element"],
            [id*="test-element"]
        `);

        let cleanedCount = 0;
        testElements.forEach(element => {
            // 确保不是核心游戏元素
            if (!element.closest('#app') ||
                element.closest('[data-test="true"]')) {
                if (element.parentNode) {
                    element.parentNode.removeChild(element);
                    cleanedCount++;
                }
            }
        });

        // 只清理明确的临时动画元素（更严格的条件）
        const tempElements = document.querySelectorAll('div');
        tempElements.forEach(element => {
            const style = element.style;
            // 只清理同时满足多个条件的可疑元素
            if (element.tagName === 'DIV' &&
                !element.className &&
                !element.id &&
                style.position === 'fixed' &&
                style.zIndex === '9999' &&
                (style.background?.includes('red') ||
                 style.background?.includes('green') ||
                 style.background?.includes('blue') ||
                 style.background?.includes('pink')) &&
                !element.closest('#app') &&
                !element.closest('.game-container') &&
                !element.closest('.loading-overlay') &&
                !element.closest('.accessibility-toolbar')) {

                if (element.parentNode) {
                    element.parentNode.removeChild(element);
                    cleanedCount++;
                    console.log('🧹 清理了测试元素:', element);
                }
            }
        });

        console.log(`✅ 安全清理完成，清理了 ${cleanedCount} 个元素`);
    } catch (error) {
        console.warn('⚠️ 安全清理失败:', error);
    }
};

// 定期清理函数（暂时禁用以防止误删核心元素）
const startPeriodicCleanup = () => {
    console.log('🔄 定期清理已禁用，防止误删核心元素');
    // 暂时注释掉定期清理
    // setInterval(() => {
    //     performGlobalCleanup();
    //     interactionAnimator.cleanupTestElements();
    // }, 30000);
};

// --- 生命周期钩子 ---
onMounted(async () => {
    // 初始化内存优化器
    console.log('🧠 初始化内存优化器...');
    memoryOptimizer.initialize();

    // 启动智能资源预加载
    console.log('🎯 启动智能资源预加载...');
    smartResourcePreloader.startPreloading();

    // 初始化移动端优化
    console.log('📱 初始化移动端优化...');
    mobileOptimizer; // 触发初始化

    // 首先初始化服务注册中心
    console.log('🔧 初始化服务注册中心...');
    try {
        await serviceRegistry.registerAllServices();
        await serviceRegistry.initializeAllServices();
        console.log('✅ 服务注册中心初始化完成');
    } catch (error) {
        console.error('❌ 服务注册中心初始化失败:', error);
        throw error;
    }

    loadSettings();

    // 开发环境特殊处理 - 仅初始化开发工具，不自动运行测试
    if (import.meta.env.DEV) {
        console.log('🔧 开发环境检测到，开发工具已就绪');
        console.log('💡 使用 Ctrl+Shift+D 打开开发工具面板，或在URL添加 ?devTests=1 启用自动测试');

        // 通过服务注册中心获取开发工具控制器
        try {
            const devToolsController = await serviceRegistry.getService('devToolsController');
            devToolsController.notifyGameLoaded();
        } catch (error) {
            console.warn('⚠️ 开发工具控制器获取失败，跳过初始化:', error);
        }

        // 运行网络性能测试
        console.log('🌐 运行网络性能测试...');
        try {
            await benchmarkSuite.runNetworkSuite();
            console.log('✅ 网络性能测试完成');
        } catch (testError) {
            console.error('❌ 网络性能测试失败:', testError);
        }

        // 运行用户体验测试
        console.log('🎨 运行用户体验测试...');
        try {
            await benchmarkSuite.runUserExperienceSuite();
            console.log('✅ 用户体验测试完成');
        } catch (testError) {
            console.error('❌ 用户体验测试失败:', testError);
        }

        // 清理测试元素和临时元素（使用专门的清理工具）
        console.log('🧹 执行专门的元素清理...');
        try {
            // 立即清理绿色方块（多次尝试）
            setTimeout(() => {
                cleanupGreenSquares();
            }, 500);

            setTimeout(() => {
                cleanupGreenSquares();
            }, 1500);

            setTimeout(() => {
                cleanupGreenSquares();
            }, 3000);

            // 延迟执行完整清理，确保游戏完全初始化
            setTimeout(() => {
                performCompleteCleanup();
                startElementMonitoring();
            }, 5000);

            // 暂时禁用定期清理
            startPeriodicCleanup();
        } catch (cleanupError) {
            console.warn('⚠️ 清理失败:', cleanupError);
        }

        // 打印优化系统统计信息
        console.log('📊 打印优化系统统计信息...');
        try {
            memoryManager.printStats();
            await cacheManager.printStats();
            cdnManager.printStats();
            console.log('🎵 音频缓存统计:', optimizedAudioManager.getCacheStats());
            console.log('🚀 资源预加载统计:', resourcePreloader.getStats());
            renderOptimizer.printStats();
            animationOptimizer.printStats();
            optimizedMatchDetector.printStats();
            wasmMatchDetector.printStats();
            tileObjectPool.printStats();
            networkOptimizer.printStats();
            await serviceWorkerManager.printStats();
            offlineManager.printStats();
            interactionAnimator.printStats();
            responsiveManager.printStats();
            accessibilityManager.printStats();
            userPreferencesManager.printStats();
            loadingExperienceManager.printStats();
        } catch (testError) {
            console.error('❌ 统计信息打印失败:', testError);
        }

        // 验证页面渲染状态
        console.log('🔍 验证页面渲染状态...');
        setTimeout(() => {
            const appElement = document.getElementById('app');
            const gameContainer = document.querySelector('.game-container');
            const gameBoard = document.querySelector('.game-board');

            console.log('🔍 页面渲染状态检查:');
            console.log('- App元素:', appElement ? '✅ 存在' : '❌ 缺失');
            console.log('- 游戏容器:', gameContainer ? '✅ 存在' : '❌ 缺失');
            console.log('- 游戏板:', gameBoard ? '✅ 存在' : '❌ 缺失');
            console.log('- 页面背景色:', window.getComputedStyle(document.body).backgroundColor);
            console.log('- App背景色:', appElement ? window.getComputedStyle(appElement).backgroundColor : 'N/A');

            if (!gameContainer || !gameBoard) {
                console.error('❌ 关键游戏元素缺失，可能存在渲染问题');
                // 尝试强制重新渲染
                if (appElement) {
                    appElement.style.display = 'none';
                    setTimeout(() => {
                        appElement.style.display = '';
                    }, 100);
                }
            } else {
                console.log('✅ 页面渲染正常');
            }
        }, 1000);

        console.log('🎉 游戏初始化完成！');
    }

    // 添加一个安全超时，确保游戏界面最终会显示
    const safetyTimeout = setTimeout(() => {
        console.log('⏰ 安全超时触发，强制显示游戏界面');
        showLoading.value = false;
        isLoading.value = false;
    }, 5000); // 5秒超时

    try {
        await initializeGame();
        clearTimeout(safetyTimeout);

        // 确保加载状态正确设置
        console.log('✅ 初始化成功，隐藏加载界面');
        showLoading.value = false;
        isLoading.value = false;

        // 验证状态
        setTimeout(() => {
            console.log('📊 最终状态验证:', {
                showLoading: showLoading.value,
                isLoading: isLoading.value,
                hasError: hasError.value,
                gameBoard: gameBoard.value?.length || 0
            });
        }, 500);

    } catch (error) {
        console.error('❌ 初始化失败:', error);
        clearTimeout(safetyTimeout);
        showLoading.value = false;
        isLoading.value = false;
        hasError.value = true;
        errorMessage.value = error instanceof Error ? error.message : '初始化失败';
    }
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

    // 销毁内存优化器
    memoryOptimizer.destroy();
});
</script>

<style>
/* App.vue 中只保留全局和最顶层的布局样式 */
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; margin: 0; padding: 0; }
.app-root { width: 100%; height: 100vh; display: flex; align-items: center; justify-content: center; }
.game-container { width: 100%; background: white; border-radius: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.1); overflow: hidden; position: relative; margin: 10px; max-width: min(95vw, 500px); max-height: min(95vh, 700px); }
.top-controls { position: absolute; top: 0; left: 0; right: 0; height: 60px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; justify-content: space-between; align-items: center; padding: 10px 15px; z-index: 10; }
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
.skip-loading-btn { margin-top: 20px; background: rgba(255, 255, 255, 0.2); border: 2px solid rgba(255, 255, 255, 0.5); color: white; padding: 8px 16px; border-radius: 20px; cursor: pointer; font-size: 12px; transition: all 0.3s ease; }
.skip-loading-btn:hover { background: rgba(255, 255, 255, 0.3); border-color: rgba(255, 255, 255, 0.8); }
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