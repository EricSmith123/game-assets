<template>
  <div class="layered-settings">
    <!-- 用户类型切换 -->
    <div class="user-type-selector">
      <h3>设置模式</h3>
      <div class="user-type-buttons">
        <button
          v-for="type in userTypes"
          :key="type.value"
          :class="['user-type-btn', { active: currentUserType === type.value }]"
          @click="switchUserType(type.value)"
        >
          <span class="icon">{{ type.icon }}</span>
          <span class="label">{{ type.label }}</span>
          <span class="description">{{ type.description }}</span>
        </button>
      </div>
    </div>

    <!-- 智能推荐 -->
    <div v-if="hasRecommendations" class="recommendations">
      <h3>🎯 智能推荐</h3>
      <p>基于您的设备性能，我们推荐以下设置：</p>
      <button class="apply-recommendations-btn" @click="applyRecommendations">
        应用推荐设置
      </button>
    </div>

    <!-- 设置分组 -->
    <div class="settings-groups">
      <div
        v-for="group in visibleGroups"
        :key="group.id"
        class="settings-group"
      >
        <div class="group-header" @click="toggleGroup(group.id)">
          <span class="icon">{{ group.icon }}</span>
          <h3>{{ group.label }}</h3>
          <span class="description">{{ group.description }}</span>
          <span class="toggle-icon" :class="{ expanded: expandedGroups.has(group.id) }">
            ▼
          </span>
        </div>

        <div v-if="expandedGroups.has(group.id)" class="group-content">
          <div
            v-for="item in group.items"
            :key="item.key"
            class="setting-item"
          >
            <div class="setting-info">
              <label :for="item.key">{{ item.label }}</label>
              <span class="setting-description">{{ item.description }}</span>
              
              <!-- 推荐标识 -->
              <span
                v-if="getRecommendation(item.key) !== undefined"
                class="recommendation-badge"
                :title="`推荐值: ${getRecommendation(item.key)}`"
              >
                💡 推荐
              </span>
            </div>

            <div class="setting-control">
              <!-- 布尔值开关 -->
              <label
                v-if="item.type === 'boolean'"
                class="switch"
              >
                <input
                  :id="item.key"
                  type="checkbox"
                  :checked="getSettingValue(item.category, item.key)"
                  @change="updateSetting(item, $event.target.checked)"
                />
                <span class="slider"></span>
              </label>

              <!-- 数值范围 -->
              <div v-else-if="item.type === 'range'" class="range-control">
                <input
                  :id="item.key"
                  type="range"
                  :min="item.min"
                  :max="item.max"
                  :step="item.step"
                  :value="getSettingValue(item.category, item.key)"
                  @input="updateSetting(item, parseFloat($event.target.value))"
                />
                <span class="range-value">
                  {{ getSettingValue(item.category, item.key) }}
                </span>
              </div>

              <!-- 选择框 -->
              <select
                v-else-if="item.type === 'select'"
                :id="item.key"
                :value="getSettingValue(item.category, item.key)"
                @change="updateSetting(item, $event.target.value)"
              >
                <option
                  v-for="option in item.options"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </option>
              </select>

              <!-- 数值输入 -->
              <input
                v-else-if="item.type === 'number'"
                :id="item.key"
                type="number"
                :min="item.min"
                :max="item.max"
                :step="item.step"
                :value="getSettingValue(item.category, item.key)"
                @input="updateSetting(item, parseFloat($event.target.value))"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="settings-actions">
      <button class="action-btn secondary" @click="resetSettings">
        重置默认
      </button>
      <button class="action-btn secondary" @click="exportSettings">
        导出设置
      </button>
      <button class="action-btn secondary" @click="importSettings">
        导入设置
      </button>
    </div>

    <!-- 设置统计 -->
    <div v-if="currentUserType === 'developer'" class="settings-stats">
      <h4>设置统计</h4>
      <p>显示设置: {{ stats.visibleSettings }} / {{ stats.totalSettings }}</p>
      <p>用户类型: {{ stats.userType }}</p>
      <p>推荐数量: {{ stats.recommendationCount }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { layeredSettingsManager, UserType, type SettingGroup, type SettingItem } from '@/utils/layeredSettingsManager';
import type { GameConfig } from '@/utils/configManager';

// 响应式数据
const currentUserType = ref<UserType>(UserType.BASIC);
const visibleGroups = ref<SettingGroup[]>([]);
const expandedGroups = ref<Set<string>>(new Set(['basic'])); // 默认展开基础设置
const stats = ref({
  totalSettings: 0,
  visibleSettings: 0,
  userType: UserType.BASIC,
  recommendationCount: 0
});

// 用户类型选项
const userTypes = [
  {
    value: UserType.BASIC,
    label: '简单',
    description: '只显示常用设置',
    icon: '👤'
  },
  {
    value: UserType.ADVANCED,
    label: '高级',
    description: '显示更多设置选项',
    icon: '⚙️'
  },
  {
    value: UserType.DEVELOPER,
    label: '开发者',
    description: '显示所有设置和调试选项',
    icon: '🔧'
  }
];

// 计算属性
const hasRecommendations = computed(() => {
  return stats.value.recommendationCount > 0;
});

// 方法
const loadSettings = () => {
  try {
    currentUserType.value = layeredSettingsManager.getCurrentUserType();
    visibleGroups.value = layeredSettingsManager.getVisibleGroups();
    stats.value = layeredSettingsManager.getSettingsStats();
  } catch (error) {
    console.error('Failed to load settings:', error);
    // 设置默认值以防止组件崩溃
    visibleGroups.value = [];
    stats.value = {
      totalSettings: 0,
      modifiedSettings: 0,
      recommendationCount: 0,
      lastModified: null
    };
  }
};

const switchUserType = (userType: UserType) => {
  try {
    layeredSettingsManager.setUserType(userType);
    loadSettings();
  } catch (error) {
    console.error('Failed to switch user type:', error);
  }
};

const toggleGroup = (groupId: string) => {
  if (expandedGroups.value.has(groupId)) {
    expandedGroups.value.delete(groupId);
  } else {
    expandedGroups.value.add(groupId);
  }
};

const getSettingValue = (category: keyof GameConfig, key: string) => {
  return layeredSettingsManager.getSettingValue(category, key);
};

const updateSetting = (item: SettingItem, value: any) => {
  try {
    layeredSettingsManager.setSettingValue(item.category, item.key, value);
  } catch (error) {
    console.error('Failed to update setting:', error);
  }
};

const getRecommendation = (key: string) => {
  return layeredSettingsManager.getRecommendation(key);
};

const applyRecommendations = async () => {
  try {
    await layeredSettingsManager.applyRecommendations();
    loadSettings();
  } catch (error) {
    console.error('Failed to apply recommendations:', error);
  }
};

const resetSettings = () => {
  if (confirm('确定要重置所有设置到默认值吗？')) {
    try {
      layeredSettingsManager.resetToDefaults();
      loadSettings();
    } catch (error) {
      console.error('Failed to reset settings:', error);
    }
  }
};

const exportSettings = () => {
  const settings = layeredSettingsManager.exportSettings();
  const blob = new Blob([settings], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'game-settings.json';
  a.click();
  URL.revokeObjectURL(url);
};

const importSettings = () => {
  try {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const content = e.target?.result as string;
            const success = layeredSettingsManager.importSettings(content);
            if (success) {
              loadSettings();
              alert('设置导入成功！');
            } else {
              alert('设置导入失败，请检查文件格式。');
            }
          } catch (error) {
            console.error('Failed to import settings:', error);
            alert('设置导入失败，请检查文件格式。');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  } catch (error) {
    console.error('Failed to create file input:', error);
  }
};

// 生命周期
onMounted(() => {
  loadSettings();
});
</script>

<style scoped>
.layered-settings {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.user-type-selector {
  margin-bottom: 30px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  backdrop-filter: blur(10px);
}

.user-type-buttons {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  margin-top: 15px;
}

.user-type-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
}

.user-type-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: translateY(-2px);
}

.user-type-btn.active {
  border-color: #667eea;
  background: rgba(102, 126, 234, 0.2);
}

.user-type-btn .icon {
  font-size: 24px;
  margin-bottom: 8px;
}

.user-type-btn .label {
  font-weight: bold;
  margin-bottom: 4px;
}

.user-type-btn .description {
  font-size: 12px;
  opacity: 0.8;
  text-align: center;
}

.recommendations {
  margin-bottom: 30px;
  padding: 20px;
  background: rgba(102, 126, 234, 0.1);
  border-radius: 12px;
  border-left: 4px solid #667eea;
}

.apply-recommendations-btn {
  padding: 10px 20px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
  transition: background 0.3s ease;
}

.apply-recommendations-btn:hover {
  background: #5a6fd8;
}

.settings-group {
  margin-bottom: 20px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  overflow: hidden;
}

.group-header {
  display: flex;
  align-items: center;
  padding: 20px;
  cursor: pointer;
  transition: background 0.3s ease;
}

.group-header:hover {
  background: rgba(255, 255, 255, 0.1);
}

.group-header .icon {
  font-size: 20px;
  margin-right: 12px;
}

.group-header h3 {
  flex: 1;
  margin: 0;
  color: white;
}

.group-header .description {
  margin-right: 15px;
  opacity: 0.7;
  font-size: 14px;
}

.toggle-icon {
  transition: transform 0.3s ease;
}

.toggle-icon.expanded {
  transform: rotate(180deg);
}

.group-content {
  padding: 0 20px 20px;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-info {
  flex: 1;
  margin-right: 20px;
}

.setting-info label {
  display: block;
  font-weight: bold;
  color: white;
  margin-bottom: 4px;
}

.setting-description {
  font-size: 12px;
  opacity: 0.7;
  display: block;
}

.recommendation-badge {
  display: inline-block;
  margin-top: 4px;
  padding: 2px 8px;
  background: rgba(255, 193, 7, 0.2);
  color: #ffc107;
  border-radius: 12px;
  font-size: 10px;
  font-weight: bold;
}

.setting-control {
  min-width: 150px;
}

/* 开关样式 */
.switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 24px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.3);
  transition: 0.3s;
  border-radius: 24px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: #667eea;
}

input:checked + .slider:before {
  transform: translateX(26px);
}

/* 范围控制样式 */
.range-control {
  display: flex;
  align-items: center;
  gap: 10px;
}

.range-control input[type="range"] {
  flex: 1;
  height: 4px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.3);
  outline: none;
}

.range-value {
  min-width: 40px;
  text-align: center;
  font-weight: bold;
  color: white;
}

/* 选择框和输入框样式 */
select, input[type="number"] {
  padding: 8px 12px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 14px;
}

select option {
  background: #2a2a2a;
  color: white;
}

.settings-actions {
  display: flex;
  gap: 15px;
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.action-btn {
  padding: 10px 20px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
}

.action-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-1px);
}

.settings-stats {
  margin-top: 30px;
  padding: 15px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  font-size: 12px;
  opacity: 0.8;
}

.settings-stats h4 {
  margin: 0 0 10px 0;
  color: white;
}

.settings-stats p {
  margin: 5px 0;
  color: white;
}
</style>
