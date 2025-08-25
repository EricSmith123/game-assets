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

      <!-- 可访问性设置 -->
      <div class="setting-group accessibility-group">
        <label>♿ 可访问性工具</label>
        <button @click="toggleAccessibilityToolbar" class="accessibility-toggle">
          {{ showAccessibilityToolbar ? '隐藏' : '显示' }}工具栏
        </button>
        <div class="accessibility-info">
          <small>快捷键：Ctrl+H(高对比度) Alt+R(减少动画) Ctrl+K(键盘帮助)</small>
        </div>
      </div>
      <div class="settings-actions">
        <!-- 开发环境专用测试按钮 -->
        <button v-if="isDev" @click="$emit('test-sfx')" class="test-btn">🧪 测试音效</button>
        <button @click="$emit('reset')" class="reset-btn">重置设置</button>
        <button @click="$emit('close')" class="close-btn">关闭</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SettingsPanelEmits, SettingsPanelProps } from '@/types/components';
import { accessibilityManager } from '@/utils/accessibilityManager';
import { onMounted, ref } from 'vue';

// 环境检测
const isDev = import.meta.env.DEV;

// 可访问性工具栏状态
const showAccessibilityToolbar = ref(false);

const props = defineProps<SettingsPanelProps>();
const emit = defineEmits<SettingsPanelEmits>();

// 检查可访问性工具栏状态
onMounted(() => {
  const toolbar = document.getElementById('accessibility-toolbar');
  showAccessibilityToolbar.value = !!toolbar;
});

// 切换可访问性工具栏
const toggleAccessibilityToolbar = () => {
  if (showAccessibilityToolbar.value) {
    accessibilityManager.disableAccessibilityToolbar();
    showAccessibilityToolbar.value = false;
  } else {
    accessibilityManager.enableAccessibilityToolbar();
    showAccessibilityToolbar.value = true;
  }
};
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
.test-btn { background: #f39c12; color: white; }
.reset-btn { background: #ff6b6b; color: white; }
.close-btn { background: #4ecdc4; color: white; }
.settings-actions button:hover { transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.2); }

/* 可访问性设置样式 */
.accessibility-group { border-top: 1px solid #eee; padding-top: 15px; }
.accessibility-toggle {
  width: 100%; padding: 8px 12px; border: 1px solid #ddd;
  border-radius: 5px; background: #f8f9fa; cursor: pointer;
  transition: all 0.3s ease; font-size: 14px;
}
.accessibility-toggle:hover { background: #e9ecef; border-color: #adb5bd; }
.accessibility-info { margin-top: 8px; }
.accessibility-info small { color: #6c757d; line-height: 1.4; }
</style>