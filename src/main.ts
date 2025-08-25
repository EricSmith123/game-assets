import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { uxOptimizationManager } from './utils/uxOptimizationManager'

const app = createApp(App)

// 全局错误处理
app.config.errorHandler = (err, instance, info) => {
  console.error('Vue Global Error:', err)
  console.error('Component Instance:', instance)
  console.error('Error Info:', info)
}

// 全局警告处理
app.config.warnHandler = (msg, instance, trace) => {
  console.warn('Vue Warning:', msg)
  console.warn('Component Instance:', instance)
  console.warn('Component Trace:', trace)
}

// 初始化用户体验优化管理器
async function initializeUXOptimization() {
  try {
    await uxOptimizationManager.initialize({
      responsive: {
        enabled: true,
        autoDetect: true
      },
      mobile: {
        enabled: true,
        touchOptimization: true,
        gestureSupport: true,
        hapticFeedback: true
      },
      accessibility: {
        enabled: true,
        keyboardNavigation: true,
        screenReader: true,
        reducedMotion: true
      },
      gameExperience: {
        animationOptimization: true,
        performanceMonitoring: true
      }
    })

    console.log('🎨 用户体验优化已启用')
    console.log(uxOptimizationManager.generateUXReport())
  } catch (error) {
    console.error('❌ 用户体验优化初始化失败:', error)
  }
}

// 启动应用
app.mount('#app')

// 异步初始化用户体验优化
initializeUXOptimization()
