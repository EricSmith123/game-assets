<!-- src/components/SettingsPanel.vue -->
<template>
  <div v-if="modelValue" class="settings-panel">
    <div class="settings-content">
      <h3>🎮 游戏设置</h3>
      <div class="setting-group">
        <label>🎵 BGM音量</label>
        <input type="range" min="0" max="100" :value="bgmVolume" @input="$emit('update:bgmVolume', Number($event.target.value))">
        <span>{{ bgmVolume }}%</span>
      </div>
      <div class="setting-group">
        <label>🔊 音效音量</label>
        <input type="range" min="0" max="100" :value="sfxVolume" @input="$emit('update:sfxVolume', Number($event.target.value))">
        <span>{{ sfxVolume }}%</span>
      </div>
      <div class="settings-actions">
        <button @click="$emit('reset')" class="reset-btn">重置设置</button>
        <button @click="$emit('close')" class="close-btn">关闭</button>
      </div>
    </div>
  </div>
</template>

<script setup>
// 定义组件接收的属性
defineProps({
  modelValue: Boolean, // 用于控制显示/隐藏 (v-model)
  bgmVolume: Number,
  sfxVolume: Number,
});

// 定义组件可以触发的事件
defineEmits(['update:modelValue', 'update:bgmVolume', 'update:sfxVolume', 'reset', 'close']);
</script>

<style scoped>
/* 这里只包含设置面板自己的样式 */
.settings-panel {
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex; justify-content: center; align-items: center;
    z-index: 2000;
}
.settings-content {
    background: white; padding: 30px; border-radius: 15px;
    max-width: 400px; width: 90%; max-height: 80vh; overflow-y: auto;
}
.settings-content h3 { margin: 0 0 20px 0; text-align: center; color: #333; }
.setting-group { margin-bottom: 20px; }
.setting-group label { display: block; margin-bottom: 8px; font-weight: bold; color: #555; }
.setting-group input[type="range"] { width: 70%; margin-right: 10px; vertical-align: middle; }
.setting-group span { vertical-align: middle; }
.settings-actions { display: flex; gap: 10px; margin-top: 25px; }
.settings-actions button { flex: 1; padding: 10px; border: none; border-radius: 5px; cursor: pointer; font-size: 14px; transition: all 0.3s ease; }
.reset-btn { background: #ff6b6b; color: white; }
.close-btn { background: #4ecdc4; color: white; }
.settings-actions button:hover { transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.2); }
</style>