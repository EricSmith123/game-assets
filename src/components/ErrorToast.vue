<template>
  <Teleport to="body">
    <Transition name="toast" appear>
      <div 
        v-if="visible" 
        class="error-toast" 
        :class="[severityClass, { 'auto-close': autoClose }]"
        @click="handleToastClick"
      >
        <div class="toast-icon">
          <span v-if="severity === 'low'">⚠️</span>
          <span v-else-if="severity === 'medium'">🚨</span>
          <span v-else-if="severity === 'high'">❌</span>
          <span v-else>💥</span>
        </div>
        
        <div class="toast-content">
          <div class="toast-message">{{ message }}</div>
          <div v-if="showDetails && details" class="toast-details">
            {{ details }}
          </div>
          <div v-if="autoClose && duration" class="toast-progress">
            <div 
              class="progress-bar" 
              :style="{ animationDuration: `${duration}ms` }"
            ></div>
          </div>
        </div>
        
        <div class="toast-actions">
          <button 
            v-if="canRetry" 
            @click.stop="handleRetry" 
            class="toast-btn retry"
            title="重试"
          >
            🔄
          </button>
          <button 
            v-if="canReport" 
            @click.stop="handleReport" 
            class="toast-btn report"
            title="报告问题"
          >
            📤
          </button>
          <button 
            v-if="showDetails" 
            @click.stop="toggleDetails" 
            class="toast-btn details"
            :title="detailsExpanded ? '隐藏详情' : '显示详情'"
          >
            {{ detailsExpanded ? '▲' : '▼' }}
          </button>
          <button 
            @click.stop="handleDismiss" 
            class="toast-btn dismiss"
            title="关闭"
          >
            ×
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import type { ErrorToastProps, ErrorToastEmits } from '@/types/components';

const props = withDefaults(defineProps<ErrorToastProps>(), {
  autoClose: true,
  duration: 5000,
  showDetails: false,
  canRetry: false,
  canReport: false
});

const emit = defineEmits<ErrorToastEmits>();

// 状态管理
const detailsExpanded = ref(false);
let autoCloseTimer: number | null = null;

// 计算属性
const severityClass = computed(() => `toast-${props.severity}`);

// 方法
const handleToastClick = (): void => {
  // 点击toast主体时暂停自动关闭
  if (autoCloseTimer) {
    clearTimeout(autoCloseTimer);
    autoCloseTimer = null;
  }

  // 触发close事件
  emit('close');
};

const handleDismiss = (): void => {
  emit('dismiss');
};

const handleRetry = (): void => {
  emit('retry');
};

const handleReport = (): void => {
  emit('report');
};

const toggleDetails = (): void => {
  detailsExpanded.value = !detailsExpanded.value;
};

// 自动关闭逻辑
const setupAutoClose = (): void => {
  if (props.autoClose && props.duration && props.duration > 0) {
    autoCloseTimer = window.setTimeout(() => {
      emit('dismiss');
    }, props.duration);
  }
};

// 生命周期
onMounted(() => {
  setupAutoClose();
});

onUnmounted(() => {
  if (autoCloseTimer) {
    clearTimeout(autoCloseTimer);
  }
});

// 监听visible变化重新设置自动关闭
const setupAutoCloseWatcher = (): void => {
  if (props.visible) {
    setupAutoClose();
  } else if (autoCloseTimer) {
    clearTimeout(autoCloseTimer);
    autoCloseTimer = null;
  }
};

// 暴露方法
defineExpose({
  dismiss: handleDismiss,
  retry: handleRetry,
  report: handleReport
});
</script>

<style scoped>
.error-toast {
  position: fixed;
  top: 20px;
  right: 20px;
  max-width: 400px;
  min-width: 300px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: flex-start;
  padding: 16px;
  z-index: 9998;
  cursor: pointer;
  transition: all 0.3s ease;
}

.error-toast:hover {
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
  transform: translateY(-2px);
}

/* 严重程度样式 */
.toast-low { 
  border-left: 4px solid #ffa726;
  background: #fff8e1;
}

.toast-medium { 
  border-left: 4px solid #ff7043;
  background: #fce4ec;
}

.toast-high { 
  border-left: 4px solid #e53935;
  background: #ffebee;
}

.toast-critical { 
  border-left: 4px solid #d32f2f;
  background: #ffcdd2;
  animation: shake 0.5s ease-in-out;
}

/* 图标样式 */
.toast-icon {
  font-size: 20px;
  margin-right: 12px;
  flex-shrink: 0;
  margin-top: 2px;
}

/* 内容样式 */
.toast-content {
  flex: 1;
  min-width: 0;
}

.toast-message {
  font-weight: 500;
  color: #333;
  line-height: 1.4;
  margin-bottom: 4px;
}

.toast-details {
  font-size: 12px;
  color: #666;
  line-height: 1.3;
  margin-top: 8px;
  padding: 8px;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 4px;
  word-break: break-word;
}

/* 进度条样式 */
.toast-progress {
  margin-top: 8px;
  height: 2px;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 1px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #4caf50, #2196f3);
  width: 100%;
  animation: progress linear;
  transform-origin: left;
}

@keyframes progress {
  from { transform: scaleX(1); }
  to { transform: scaleX(0); }
}

/* 操作按钮样式 */
.toast-actions {
  display: flex;
  gap: 4px;
  margin-left: 8px;
  flex-shrink: 0;
}

.toast-btn {
  width: 24px;
  height: 24px;
  border: none;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  transition: all 0.2s ease;
  color: #666;
}

.toast-btn:hover {
  background: rgba(0, 0, 0, 0.2);
  transform: scale(1.1);
}

.toast-btn.retry {
  color: #2196f3;
}

.toast-btn.retry:hover {
  background: rgba(33, 150, 243, 0.1);
}

.toast-btn.report {
  color: #ff9800;
}

.toast-btn.report:hover {
  background: rgba(255, 152, 0, 0.1);
}

.toast-btn.details {
  color: #9c27b0;
}

.toast-btn.details:hover {
  background: rgba(156, 39, 176, 0.1);
}

.toast-btn.dismiss {
  color: #f44336;
  font-weight: bold;
}

.toast-btn.dismiss:hover {
  background: rgba(244, 67, 54, 0.1);
}

/* 动画效果 */
.toast-enter-active, .toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(100%) scale(0.8);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(100%) scale(0.8);
}

/* 震动动画 */
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .error-toast {
    top: 10px;
    right: 10px;
    left: 10px;
    max-width: none;
    min-width: 0;
  }
  
  .toast-message {
    font-size: 14px;
  }
  
  .toast-details {
    font-size: 11px;
  }
}

/* 多个toast的堆叠效果 */
.error-toast:nth-child(2) {
  top: 90px;
  transform: scale(0.95);
  opacity: 0.9;
}

.error-toast:nth-child(3) {
  top: 160px;
  transform: scale(0.9);
  opacity: 0.8;
}

.error-toast:nth-child(n+4) {
  display: none;
}

/* 暗色主题支持 */
@media (prefers-color-scheme: dark) {
  .error-toast {
    background: #2d2d2d;
    color: #fff;
  }
  
  .toast-message {
    color: #fff;
  }
  
  .toast-details {
    background: rgba(255, 255, 255, 0.1);
    color: #ccc;
  }
  
  .toast-low { 
    background: #3e2723;
    border-left-color: #ffb74d;
  }
  
  .toast-medium { 
    background: #3e2723;
    border-left-color: #ff8a65;
  }
  
  .toast-high { 
    background: #3e2723;
    border-left-color: #ef5350;
  }
  
  .toast-critical { 
    background: #3e2723;
    border-left-color: #f44336;
  }
}
</style>
