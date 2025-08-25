import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  base: './', // 使用相对路径，解决部署路径问题
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  build: {
    target: 'esnext',
    minify: 'terser',
    sourcemap: process.env.NODE_ENV !== 'production', // 生产环境不生成sourcemap
    cssCodeSplit: true, // CSS代码分割
    assetsInlineLimit: 4096, // 小于4KB的资源内联
    rollupOptions: {
      onwarn(warning, warn) {
        // 抑制特定的动态导入警告
        if (warning.code === 'DYNAMIC_IMPORT_VARS_WARNING') {
          return
        }
        // 抑制循环依赖警告（已通过DI容器解决）
        if (warning.code === 'CIRCULAR_DEPENDENCY') {
          return
        }
        warn(warning)
      },
      output: {
        manualChunks: {
          // 核心框架
          'vendor': ['vue'],

          // 性能相关服务
          'performance': [
            './src/utils/performanceMonitor.ts',
            './src/utils/renderOptimizer.ts',
            './src/utils/animationOptimizer.ts',
            './src/utils/performanceAwareAnimator.ts'
          ],

          // UI相关服务
          'ui': [
            './src/utils/interactionAnimator.ts',
            './src/utils/responsiveManager.ts',
            './src/utils/accessibilityManager.ts'
          ],

          // 音频相关
          'audio': [
            './src/utils/optimizedAudioManager.ts'
          ],

          // 存储相关
          'storage': [
            './src/utils/cacheManager.ts',
            './src/utils/cdnManager.ts'
          ],

          // 开发工具（生产环境排除）
          ...(process.env.NODE_ENV === 'production' ? {} : {
            'dev-tools': [
              './src/utils/debugHelper.ts',
              './src/utils/testSuite.ts',
              './src/utils/benchmarkSuite.ts',
              './src/utils/simplifiedDebugHelper.ts',
              './src/utils/devEfficiencyTools.ts',
              './src/utils/lazyDebugLoader.ts'
            ]
          })
        }
      }
    },
    // 减少构建警告
    chunkSizeWarningLimit: 1000
  },
  server: {
    port: 3000,
    open: true
  }
})
