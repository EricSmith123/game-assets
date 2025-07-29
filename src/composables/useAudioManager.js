import { ref } from 'vue';

/**
 * 一个混合音频管理器类，优先使用 Web Audio API 以获得更低的延迟和更好的性能，
 * 在不支持或移动设备上则回退到使用 HTMLAudioElement。
 * 这个类本身只关心如何播放给定的音频源(URL)，不关心业务逻辑。
 */
class HybridAudioManager {
    constructor() {
        this.useWebAudio = false;
        this.audioContext = null;
        this.bgmGainNode = null;
        this.sfxGainNode = null;
        this.bgmSource = null;
        this.bgmBuffer = null;
        this.sfxBuffers = new Map();
        this.bgmAudio = null;
        this.sfxAudioPool = new Map();
        this.bgmVolume = 0.5;
        this.sfxVolume = 0.7;
        this.bgmPlaying = false;
        this.sfxEnabled = true;
        this.initialized = false;
        this.isMobile = this.detectMobile();
    }

    detectMobile() { return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || (navigator.maxTouchPoints && navigator.maxTouchPoints > 2); }
    
    async init() {
        if (this.initialized) return;
        // 在非移动设备上且支持AudioContext时，尝试初始化Web Audio
        if (!this.isMobile && window.AudioContext) {
            try {
                await this.initWebAudio();
                this.useWebAudio = true;
                console.log("🔊 音频管理器: Web Audio API 已激活。");
            } catch (e) {
                this.initFallback();
                console.warn("🔊 音频管理器: Web Audio API 初始化失败，回退到 HTML Audio。", e);
            }
        } else {
            this.initFallback();
        }
        this.initialized = true;
    }

    async initWebAudio() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.bgmGainNode = this.audioContext.createGain();
        this.sfxGainNode = this.audioContext.createGain();
        this.bgmGainNode.connect(this.audioContext.destination);
        this.sfxGainNode.connect(this.audioContext.destination);
        this.bgmGainNode.gain.value = this.bgmVolume;
        this.sfxGainNode.gain.value = this.sfxVolume;
        // 如果用户与页面交互前音频上下文被挂起，需要恢复它
        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
    }

    initFallback() {
        this.useWebAudio = false;
        console.log("🔊 音频管理器: 使用 HTML Audio 模式。");
    }

    async loadAudioBuffer(url) {
        if (!this.useWebAudio || !this.audioContext) return null;
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            return await this.audioContext.decodeAudioData(arrayBuffer);
        } catch (e) {
            console.error(`解码音频数据失败: ${url}`, e);
            return null;
        }
    }

    // BGM只接受一个源URL
    async playBgm(src) {
        if (!this.initialized) await this.init();
        if (this.useWebAudio) await this.playBgmWebAudio(src);
        else await this.playBgmFallback(src);
    }

    async playBgmWebAudio(src) {
        try {
            if (this.audioContext.state === 'suspended') await this.audioContext.resume();
            if (this.bgmSource) this.bgmSource.stop();
            this.bgmBuffer = await this.loadAudioBuffer(src);
            if (!this.bgmBuffer) return await this.playBgmFallback(src); // 如果解码失败，尝试回退
            this.bgmSource = this.audioContext.createBufferSource();
            this.bgmSource.buffer = this.bgmBuffer;
            this.bgmSource.loop = true;
            this.bgmSource.connect(this.bgmGainNode);
            this.bgmSource.start();
            this.bgmPlaying = true;
        } catch (e) {
            await this.playBgmFallback(src); // 任何错误都尝试回退
        }
    }

    async playBgmFallback(src) {
        try {
            if (this.bgmAudio) this.bgmAudio.pause();
            this.bgmAudio = new Audio(src);
            this.bgmAudio.loop = true;
            this.bgmAudio.volume = this.bgmVolume;
            if (this.isMobile) this.bgmAudio.load(); // 在移动端建议先load
            const playPromise = this.bgmAudio.play();
            if (playPromise) await playPromise;
            this.bgmPlaying = true;
        } catch (e) {
            this.bgmPlaying = false;
            throw e;
        }
    }

    // SFX也只接受一个源URL
    async playSfx(src) {
        if (!this.sfxEnabled || !this.initialized) return;
        if (this.useWebAudio) await this.playSfxWebAudio(src);
        else await this.playSfxFallback(src);
    }

    async playSfxWebAudio(src) {
        try {
            if (this.audioContext.state === 'suspended') await this.audioContext.resume();
            if (!this.sfxBuffers.has(src)) {
                const buffer = await this.loadAudioBuffer(src);
                if (buffer) this.sfxBuffers.set(src, buffer);
            }
            const buffer = this.sfxBuffers.get(src);
            if (!buffer) return await this.playSfxFallback(src); // 解码失败则回退
            const sourceNode = this.audioContext.createBufferSource();
            sourceNode.buffer = buffer;
            sourceNode.connect(this.sfxGainNode);
            sourceNode.start();
        } catch (e) {
            await this.playSfxFallback(src); // 任何错误都尝试回退
        }
    }

    async playSfxFallback(src) {
        try {
            if (!this.sfxAudioPool.has(src)) this.sfxAudioPool.set(src, []);
            const pool = this.sfxAudioPool.get(src);
            let audio = pool.find(a => a.paused || a.ended);
            if (!audio) {
                audio = new Audio(src);
                pool.push(audio);
                if (pool.length > 5) pool.shift(); // 限制对象池大小
            }
            audio.currentTime = 0;
            audio.volume = this.sfxVolume;
            const playPromise = audio.play();
            if (playPromise) await playPromise;
        } catch (e) {
            // 忽略播放失败的音效，避免中断游戏
        }
    }

    setBgmVolume(volume) { this.bgmVolume = Math.max(0, Math.min(1, volume)); if (this.useWebAudio && this.bgmGainNode) this.bgmGainNode.gain.value = this.bgmVolume; else if (this.bgmAudio) this.bgmAudio.volume = this.bgmVolume; }
    setSfxVolume(volume) { this.sfxVolume = Math.max(0, Math.min(1, volume)); if (this.useWebAudio && this.sfxGainNode) this.sfxGainNode.gain.value = this.sfxVolume; this.sfxAudioPool.forEach(p => p.forEach(a => a.volume = this.sfxVolume)); }
    pauseBgm() { if (this.useWebAudio && this.bgmSource && this.bgmPlaying) { this.bgmSource.stop(); this.bgmSource = null; } else if (this.bgmAudio && !this.bgmAudio.paused) { this.bgmAudio.pause(); } this.bgmPlaying = false; }
    resumeBgm() { if (this.useWebAudio && this.bgmBuffer && !this.bgmPlaying) { try { this.bgmSource = this.audioContext.createBufferSource(); this.bgmSource.buffer = this.bgmBuffer; this.bgmSource.loop = true; this.bgmSource.connect(this.bgmGainNode); this.bgmSource.start(); this.bgmPlaying = true; } catch (e) {} } else if (this.bgmAudio && this.bgmAudio.paused) { this.bgmAudio.play().then(() => this.bgmPlaying = true).catch(e => {}); } }
    toggleSfx() { this.sfxEnabled = !this.sfxEnabled; return this.sfxEnabled; }
    close() { if (this.audioContext) this.audioContext.close(); }
}

/**
 * 导出的组合式函数 (Composable)
 * @param {object} sfxMap - 一个从音效名到URL的映射对象
 * @returns 暴露给Vue组件使用的状态和方法
 */
export function useAudioManager(sfxMap) {
    const audioManager = new HybridAudioManager();
    const bgmPlaying = ref(audioManager.bgmPlaying);
    const sfxEnabled = ref(audioManager.sfxEnabled);

    // 这个函数处理游戏业务逻辑：通过名字播放音效
    const playNamedSfx = async (name) => {
        if (!sfxEnabled.value) return;
        const src = sfxMap[name];
        if (!src) {
            console.warn(`音效名未在 sfxMap 中找到: ${name}`);
            return;
        }
        try {
            await audioManager.playSfx(src);
        } catch (e) {
            console.error(`播放音效失败: ${name}`, e);
        }
    };

    // BGM播放函数保持不变，它直接接收URL
    const playBgm = async (src) => {
        if (!src) return;
        try {
            await audioManager.playBgm(src);
            bgmPlaying.value = true;
        } catch (e) {
            bgmPlaying.value = false;
            throw e;
        }
    };

    const toggleBgm = () => {
        if (bgmPlaying.value) {
            audioManager.pauseBgm();
        } else {
            audioManager.resumeBgm();
        }
        bgmPlaying.value = audioManager.bgmPlaying;
    };

    const toggleSfx = () => {
        sfxEnabled.value = audioManager.toggleSfx();
    };

    const activateAudioOnMobile = async () => {
        if (audioManager.isMobile && !audioManager.initialized) {
            await audioManager.init();
            // 尝试播放一个静音的音频来“解锁”移动端浏览器的音频播放限制
            try {
                const s = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABgAZGF0YQAAAAA=');
                s.volume = 0;
                await s.play();
            } catch (e) {
                // 静默处理，即使用户没有交互导致失败，也不影响后续操作
            }
        }
    };

    // 返回所有需要被Vue组件使用的状态和方法
    return {
        audioManager,
        bgmPlaying,
        sfxEnabled,
        playNamedSfx,
        playBgm,
        toggleBgm,
        toggleSfx,
        activateAudioOnMobile,
    };
}