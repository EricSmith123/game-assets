<template>
  <div v-if="displayError" class="error-boundary">
    <div class="error-content">
      <div class="error-icon">💥</div>
      <h3 class="error-title">出现了一些问题</h3>
      <p class="error-message">{{ displayUserMessage }}</p>
      
      <div v-if="props.showDetails" class="error-details">
        <details>
          <summary>错误详情</summary>
          <div class="error-info">
            <p><strong>错误代码:</strong> {{ displayErrorCode }}</p>
            <p><strong>时间:</strong> {{ displayErrorTime }}</p>
            <p><strong>组件:</strong> {{ displayErrorComponent }}</p>
            <div v-if="displayErrorStack" class="error-stack">
              <strong>堆栈信息:</strong>
              <pre>{{ displayErrorStack }}</pre>
            </div>
          </div>
        </details>
      </div>
      
      <div class="error-actions">
        <button @click="retry" class="error-btn retry-btn">
          🔄 重试
        </button>
        <button @click="reset" class="error-btn reset-btn">
          🔄 重置游戏
        </button>
        <button @click="reportError" class="error-btn report-btn">
          📤 报告问题
        </button>
        <button v-if="props.canGoBack" @click="goBack" class="error-btn back-btn">
          ← 返回
        </button>
      </div>
      
      <div class="error-tips">
        <p>💡 如果问题持续存在，请尝试：</p>
        <ul>
          <li>刷新页面</li>
          <li>清除浏览器缓存</li>
          <li>检查网络连接</li>
          <li>更新浏览器版本</li>
        </ul>
      </div>
    </div>
  </div>
  
  <slot v-else />
</template>

<script setup lang="ts">
import { ref, onErrorCaptured, computed } from 'vue';
import { ErrorHandler } from '@/utils/errorHandler';
import { Logger } from '@/utils/logger';
import type { ErrorBoundaryProps } from '@/types/components';
import type { GameError, ErrorCode } from '@/types/error';

interface Props extends ErrorBoundaryProps {
  showDetails?: boolean;
  canGoBack?: boolean;
  autoRetry?: boolean;
  maxRetries?: number;
  // 测试中使用的额外Props
  hasError?: boolean;
  userMessage?: string;
  errorCode?: string;
  errorTime?: string;
  errorComponent?: string;
  errorStack?: string;
}

const props = withDefaults(defineProps<Props>(), {
  showDetails: true,
  canGoBack: false,
  autoRetry: false,
  maxRetries: 3
});

const emit = defineEmits<{
  error: [error: Error, instance: any, info: string];
  retry: [];
  reset: [];
  report: [error: GameError];
  'go-back': [];
}>();

// 状态管理
const hasError = ref(false);
const errorDetails = ref<Error | null>(null);
const errorInfo = ref<string>('');
const errorInstance = ref<any>(null);
const retryCount = ref(0);

// 错误处理器和日志器
const errorHandler = ErrorHandler.getInstance();
const logger = Logger.getInstance();

// 计算属性 - 优先使用props，fallback到内部状态
const displayError = computed(() => {
  return props.hasError !== undefined ? props.hasError : hasError.value;
});

const displayUserMessage = computed(() => {
  if (props.userMessage) return props.userMessage;
  if (!errorDetails.value) return '发生了未知错误';
  return errorDetails.value.message || '组件渲染出现问题，请尝试重新加载';
});

const displayErrorCode = computed(() => {
  return props.errorCode || 'COMPONENT_ERROR' as ErrorCode;
});

const displayErrorTime = computed(() => {
  return props.errorTime || new Date().toLocaleString();
});

const displayErrorComponent = computed(() => {
  return props.errorComponent ||
         errorInstance.value?.$options?.name ||
         errorInstance.value?.$?.type?.name ||
         'Unknown Component';
});

const displayErrorStack = computed(() => {
  return props.errorStack || errorDetails.value?.stack;
});

// 错误捕获
onErrorCaptured((error: Error, instance: any, info: string) => {
  console.error('🚨 ErrorBoundary 捕获到错误:', error);
  
  // 设置错误状态
  hasError.value = true;
  errorDetails.value = error;
  errorInfo.value = info;
  errorInstance.value = instance;
  
  // 创建游戏错误对象
  const gameError: GameError = {
    code: 'COMPONENT_ERROR' as ErrorCode,
    message: error.message,
    severity: 'high',
    context: {
      component: displayErrorComponent.value,
      action: 'render',
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      additionalData: {
        errorInfo: info,
        componentStack: instance?.$?.parent?.$.type?.name
      }
    },
    originalError: error,
    stack: error.stack,
    recoverable: true
  };
  
  // 记录日志
  logger.error('Component Error Boundary Triggered', {
    error: error.message,
    stack: error.stack,
    info,
    component: displayErrorComponent.value,
    retryCount: retryCount.value
  }, 'ErrorBoundary');
  
  // 处理错误
  errorHandler.handleError(gameError);
  
  // 触发事件
  emit('error', error, instance, info);
  
  // 自动重试逻辑
  if (props.autoRetry && retryCount.value < props.maxRetries) {
    setTimeout(() => {
      retry();
    }, 2000);
  }
  
  // 阻止错误继续传播
  return false;
});

// 方法
const retry = (): void => {
  logger.info('用户触发错误重试', { retryCount: retryCount.value }, 'ErrorBoundary');
  
  retryCount.value++;
  hasError.value = false;
  errorDetails.value = null;
  errorInfo.value = '';
  errorInstance.value = null;
  
  emit('retry');
};

const reset = (): void => {
  logger.info('用户触发游戏重置', undefined, 'ErrorBoundary');
  
  // 重置错误状态
  hasError.value = false;
  errorDetails.value = null;
  errorInfo.value = '';
  errorInstance.value = null;
  retryCount.value = 0;
  
  // 触发重置事件
  emit('reset');
  
  // 如果有自定义重置逻辑，执行它
  if (props.onError) {
    try {
      props.onError(errorDetails.value!, errorInstance.value, errorInfo.value);
    } catch (e) {
      console.error('自定义错误处理函数执行失败:', e);
    }
  }
  
  // 最后的重置选项：重新加载页面
  setTimeout(() => {
    if (hasError.value) {
      if (confirm('重置失败，是否重新加载页面？')) {
        window.location.reload();
      }
    }
  }, 1000);
};

const reportError = (): void => {
  logger.info('用户触发错误报告', undefined, 'ErrorBoundary');

  // 如果没有真实的错误详情，创建一个基于props的错误对象
  const errorMessage = displayUserMessage.value;
  const mockError = errorDetails.value || new Error(errorMessage);
  
  const gameError: GameError = {
    code: displayErrorCode.value,
    message: mockError.message,
    severity: 'high',
    context: {
      component: displayErrorComponent.value,
      action: 'user_report',
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      additionalData: {
        errorInfo: errorInfo.value,
        retryCount: retryCount.value
      }
    },
    originalError: mockError,
    stack: mockError.stack,
    recoverable: true
  };
  
  emit('report', gameError);
  
  // 创建错误报告
  const errorReport = {
    error: mockError.message,
    stack: mockError.stack,
    component: displayErrorComponent.value,
    info: errorInfo.value,
    timestamp: Date.now(),
    userAgent: navigator.userAgent,
    url: window.location.href,
    logs: logger.getRecentLogs(20)
  };
  
  // 复制到剪贴板
  if (navigator.clipboard) {
    navigator.clipboard.writeText(JSON.stringify(errorReport, null, 2))
      .then(() => {
        alert('错误报告已复制到剪贴板，请发送给开发者');
      })
      .catch(() => {
        console.log('错误报告:', errorReport);
        alert('请查看控制台中的错误报告信息');
      });
  } else {
    console.log('错误报告:', errorReport);
    alert('请查看控制台中的错误报告信息');
  }
};

const goBack = (): void => {
  logger.info('用户触发返回操作', undefined, 'ErrorBoundary');

  // 触发go-back事件
  emit('go-back');

  if (window.history.length > 1) {
    window.history.back();
  } else {
    // 如果没有历史记录，重置到初始状态
    reset();
  }
};

// 暴露方法给父组件
defineExpose({
  retry,
  reset,
  reportError,
  hasError: () => hasError.value,
  getErrorDetails: () => errorDetails.value
});
</script>

<style scoped>
.error-boundary {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
}

.error-content {
  background: white;
  border-radius: 12px;
  padding: 30px;
  max-width: 600px;
  width: 100%;
  max-height: 80vh;
  overflow-y: auto;
  text-align: center;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.error-icon {
  font-size: 48px;
  margin-bottom: 20px;
}

.error-title {
  color: #e74c3c;
  margin-bottom: 15px;
  font-size: 24px;
}

.error-message {
  color: #666;
  margin-bottom: 25px;
  font-size: 16px;
  line-height: 1.5;
}

.error-details {
  margin-bottom: 25px;
  text-align: left;
}

.error-details summary {
  cursor: pointer;
  color: #3498db;
  font-weight: bold;
  margin-bottom: 10px;
}

.error-info {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 6px;
  font-size: 14px;
}

.error-stack {
  margin-top: 10px;
}

.error-stack pre {
  background: #2c3e50;
  color: #ecf0f1;
  padding: 10px;
  border-radius: 4px;
  font-size: 12px;
  overflow-x: auto;
  max-height: 200px;
}

.error-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 25px;
}

.error-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
  transition: all 0.3s ease;
  min-width: 100px;
}

.retry-btn {
  background: #3498db;
  color: white;
}

.retry-btn:hover {
  background: #2980b9;
}

.reset-btn {
  background: #e74c3c;
  color: white;
}

.reset-btn:hover {
  background: #c0392b;
}

.report-btn {
  background: #f39c12;
  color: white;
}

.report-btn:hover {
  background: #e67e22;
}

.back-btn {
  background: #95a5a6;
  color: white;
}

.back-btn:hover {
  background: #7f8c8d;
}

.error-tips {
  background: #e8f4fd;
  padding: 15px;
  border-radius: 6px;
  text-align: left;
  font-size: 14px;
}

.error-tips p {
  margin-bottom: 10px;
  font-weight: bold;
  color: #2980b9;
}

.error-tips ul {
  margin: 0;
  padding-left: 20px;
}

.error-tips li {
  margin-bottom: 5px;
  color: #666;
}

@media (max-width: 768px) {
  .error-content {
    padding: 20px;
    margin: 10px;
  }
  
  .error-actions {
    flex-direction: column;
  }
  
  .error-btn {
    width: 100%;
  }
}
</style>
