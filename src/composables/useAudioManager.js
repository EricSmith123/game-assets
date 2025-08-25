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
        console.log(`🔊 playSfx 调用 - 音效启用: ${this.sfxEnabled}, 已初始化: ${this.initialized}`);
        if (!this.sfxEnabled || !this.initialized) {
            console.log(`🔇 跳过音效播放 - 音效启用: ${this.sfxEnabled}, 已初始化: ${this.initialized}`);
            return;
        }

        console.log(`🔊 选择播放方式 - WebAudio: ${this.useWebAudio}`);
        if (this.useWebAudio) {
            await this.playSfxWebAudio(src);
        } else {
            await this.playSfxFallback(src);
        }
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
        const fileName = src.split('/').pop();
        console.log(`🔊 [Fallback] 开始播放音效: ${fileName}`);

        try {
            if (!this.sfxAudioPool.has(src)) {
                console.log(`🔊 [Fallback] 创建新的音频池: ${fileName}`);
                this.sfxAudioPool.set(src, []);
            }

            const pool = this.sfxAudioPool.get(src);
            let audio = pool.find(a => a.paused || a.ended);

            if (!audio) {
                console.log(`🔊 [Fallback] 创建新的 Audio 对象: ${fileName}`);
                audio = new Audio(src);

                // 添加事件监听器用于调试
                audio.addEventListener('loadstart', () => console.log(`🔊 [${fileName}] 开始加载`));
                audio.addEventListener('canplay', () => console.log(`🔊 [${fileName}] 可以播放`));
                audio.addEventListener('play', () => console.log(`🔊 [${fileName}] 开始播放`));
                audio.addEventListener('ended', () => console.log(`🔊 [${fileName}] 播放结束`));
                audio.addEventListener('error', (e) => console.error(`🔊 [${fileName}] 播放错误:`, e));

                pool.push(audio);
                if (pool.length > 3) {
                    console.log(`🔊 [Fallback] 清理音频池，移除旧对象`);
                    pool.shift();
                }
            } else {
                console.log(`🔊 [Fallback] 复用现有 Audio 对象: ${fileName}`);
            }

            audio.currentTime = 0;

            // 确保音量值有效
            const validVolume = isNaN(this.sfxVolume) ? 0.7 : this.sfxVolume;
            audio.volume = validVolume;
            console.log(`🔊 [Fallback] 设置音量: ${validVolume} for ${fileName}`);

            const playPromise = audio.play();
            if (playPromise) {
                await playPromise;
                console.log(`✅ [Fallback] 音效播放成功: ${fileName}`);
            }
        } catch (e) {
            console.error(`❌ [Fallback] 音效播放失败: ${fileName}`, e);
            throw e;
        }
    }

    setBgmVolume(volume) { this.bgmVolume = Math.max(0, Math.min(1, volume)); if (this.useWebAudio && this.bgmGainNode) this.bgmGainNode.gain.value = this.bgmVolume; else if (this.bgmAudio) this.bgmAudio.volume = this.bgmVolume; }
    setSfxVolume(volume) { this.sfxVolume = Math.max(0, Math.min(1, volume)); if (this.useWebAudio && this.sfxGainNode) this.sfxGainNode.gain.value = this.sfxVolume; this.sfxAudioPool.forEach(p => p.forEach(a => a.volume = this.sfxVolume)); }
    pauseBgm() {
        console.log('🎵 AudioManager.pauseBgm 被调用');
        if (this.useWebAudio && this.bgmSource && this.bgmPlaying) {
            this.bgmSource.stop();
            this.bgmSource = null;
        } else if (this.bgmAudio && !this.bgmAudio.paused) {
            this.bgmAudio.pause();
        }
        this.bgmPlaying = false;
        console.log('🎵 AudioManager BGM 已暂停');
    }
    resumeBgm() {
        console.log('🎵 AudioManager.resumeBgm 被调用');
        if (this.useWebAudio && this.bgmBuffer && !this.bgmPlaying) {
            try {
                this.bgmSource = this.audioContext.createBufferSource();
                this.bgmSource.buffer = this.bgmBuffer;
                this.bgmSource.loop = true;
                this.bgmSource.connect(this.bgmGainNode);
                this.bgmSource.start();
                this.bgmPlaying = true;
                console.log('🎵 AudioManager BGM WebAudio 恢复成功');
            } catch (e) {
                console.error('❌ AudioManager BGM WebAudio 恢复失败:', e);
            }
        } else if (this.bgmAudio && this.bgmAudio.paused) {
            this.bgmAudio.play().then(() => {
                this.bgmPlaying = true;
                console.log('🎵 AudioManager BGM HTML5 Audio 恢复成功');
            }).catch(e => {
                console.error('❌ AudioManager BGM HTML5 Audio 恢复失败:', e);
            });
        }
    }
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

    // 音效播放状态跟踪
    const sfxPlayingStatus = new Map();
    const sfxLoadStatus = new Map();

    // 检查音效文件是否可访问
    const checkSfxAvailability = async () => {
        console.log('🔍 ===== 音效文件可用性检查 =====');
        for (const [name, src] of Object.entries(sfxMap)) {
            try {
                const response = await fetch(src, { method: 'HEAD' });
                const status = response.ok ? '✅ 可用' : '❌ 不可用';
                sfxLoadStatus.set(name, response.ok);
                console.log(`${status} ${name}: ${src} (状态: ${response.status})`);
            } catch (error) {
                sfxLoadStatus.set(name, false);
                console.log(`❌ 网络错误 ${name}: ${src} - ${error.message}`);
            }
        }
        console.log('🔍 ===== 音效检查完成 =====');
    };

    // 简化的音效播放函数，移除复杂的队列管理
    const playNamedSfx = async (name) => {
        const timestamp = Date.now();
        console.log(`🎵 [${timestamp}] 请求播放音效: ${name}`);

        if (!sfxEnabled.value) {
            console.log(`🔇 [${timestamp}] 音效已禁用，跳过: ${name}`);
            return;
        }

        const src = sfxMap[name];
        if (!src) {
            console.error(`❌ [${timestamp}] 音效名未在 sfxMap 中找到: ${name}`);
            console.log('📋 可用的音效:', Object.keys(sfxMap));
            return;
        }

        // 检查文件是否可用
        if (sfxLoadStatus.has(name) && !sfxLoadStatus.get(name)) {
            console.error(`❌ [${timestamp}] 音效文件不可用: ${name}`);
            return;
        }

        try {
            console.log(`🎵 [${timestamp}] 开始播放音效: ${name} -> ${src}`);
            sfxPlayingStatus.set(name, timestamp);

            // 直接播放，不使用复杂的队列管理
            await audioManager.playSfx(src);

            console.log(`✅ [${timestamp}] 音效播放完成: ${name}`);
        } catch (e) {
            console.error(`❌ [${timestamp}] 播放音效失败: ${name}`, e);
        } finally {
            sfxPlayingStatus.delete(name);
        }
    };

    // BGM播放函数保持不变，它直接接收URL
    const playBgm = async (src) => {
        if (!src) return;
        console.log('🎵 playBgm 被调用，源:', src);
        try {
            await audioManager.playBgm(src);
            bgmPlaying.value = true;
            console.log('🎵 playBgm 成功，状态已更新为:', bgmPlaying.value);
        } catch (e) {
            bgmPlaying.value = false;
            console.error('❌ playBgm 失败:', e);
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

    // 音效测试函数
    const testAllSfx = async () => {
        console.log('🧪 ===== 开始全面音效测试 =====');

        // 首先检查文件可用性
        await checkSfxAvailability();

        console.log('🧪 开始逐个测试音效播放...');
        const sfxNames = Object.keys(sfxMap);

        for (const name of sfxNames) {
            console.log(`🧪 测试音效: ${name}`);
            try {
                await playNamedSfx(name);
                await new Promise(resolve => setTimeout(resolve, 800)); // 间隔800ms，确保播放完成
            } catch (e) {
                console.error(`❌ 音效测试失败: ${name}`, e);
            }
        }
        console.log('🧪 ===== 音效测试完成 =====');
    };

    // 单独测试特定音效
    const testSingleSfx = async (name) => {
        console.log(`🧪 单独测试音效: ${name}`);
        await playNamedSfx(name);
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
        testAllSfx, // 添加测试函数
    };
}