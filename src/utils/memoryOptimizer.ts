/**
 * 内存优化工具
 * 专门用于优化游戏运行时的内存使用
 */

export class MemoryOptimizer {
  private static instance: MemoryOptimizer;
  private cleanupTasks: (() => void)[] = [];
  private memoryCheckInterval: number | null = null;
  private lastMemoryUsage = 0;

  static getInstance(): MemoryOptimizer {
    if (!MemoryOptimizer.instance) {
      MemoryOptimizer.instance = new MemoryOptimizer();
    }
    return MemoryOptimizer.instance;
  }

  /**
   * 初始化内存优化
   */
  initialize() {
    this.setupMemoryMonitoring();
    this.setupPeriodicCleanup();
    this.optimizeImageLoading();
    this.optimizeEventListeners();
  }

  /**
   * 设置内存监控
   */
  private setupMemoryMonitoring() {
    if (typeof performance !== 'undefined' && performance.memory) {
      this.memoryCheckInterval = window.setInterval(() => {
        const currentMemory = performance.memory.usedJSHeapSize / 1024 / 1024;
        
        // 如果内存使用增长超过10MB，触发清理
        if (currentMemory - this.lastMemoryUsage > 10) {
          console.log(`🧹 内存使用增长检测到: ${currentMemory.toFixed(2)}MB，触发清理`);
          this.performCleanup();
        }
        
        this.lastMemoryUsage = currentMemory;
      }, 5000);
    }
  }

  /**
   * 设置定期清理
   */
  private setupPeriodicCleanup() {
    // 每30秒执行一次轻量级清理
    setInterval(() => {
      this.performLightCleanup();
    }, 30000);
  }

  /**
   * 优化图片加载
   */
  private optimizeImageLoading() {
    // 使用Intersection Observer延迟加载图片
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            if (img.dataset.src) {
              img.src = img.dataset.src;
              img.removeAttribute('data-src');
              imageObserver.unobserve(img);
            }
          }
        });
      });

      // 观察所有延迟加载的图片
      document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
      });

      this.addCleanupTask(() => imageObserver.disconnect());
    }
  }

  /**
   * 优化事件监听器
   */
  private optimizeEventListeners() {
    // 使用事件委托减少事件监听器数量
    const gameContainer = document.querySelector('#app');
    if (gameContainer) {
      // 统一的点击事件处理
      const clickHandler = (event: Event) => {
        const target = event.target as HTMLElement;
        
        // 根据元素类型分发事件
        if (target.classList.contains('tile')) {
          // 处理方块点击
          this.handleTileClick(target, event);
        } else if (target.classList.contains('button')) {
          // 处理按钮点击
          this.handleButtonClick(target, event);
        }
      };

      gameContainer.addEventListener('click', clickHandler, { passive: true });
      
      this.addCleanupTask(() => {
        gameContainer.removeEventListener('click', clickHandler);
      });
    }
  }

  /**
   * 处理方块点击（示例）
   */
  private handleTileClick(tile: HTMLElement, event: Event) {
    // 这里会被实际的游戏逻辑替换
    console.log('Tile clicked:', tile);
  }

  /**
   * 处理按钮点击（示例）
   */
  private handleButtonClick(button: HTMLElement, event: Event) {
    // 这里会被实际的按钮逻辑替换
    console.log('Button clicked:', button);
  }

  /**
   * 执行清理
   */
  performCleanup() {
    // 清理未使用的DOM元素
    this.cleanupUnusedElements();
    
    // 清理缓存
    this.cleanupCache();
    
    // 强制垃圾回收（如果可用）
    this.forceGarbageCollection();
  }

  /**
   * 执行轻量级清理
   */
  performLightCleanup() {
    // 清理过期的缓存项
    this.cleanupExpiredCache();
    
    // 清理未使用的事件监听器
    this.cleanupUnusedListeners();
  }

  /**
   * 清理未使用的DOM元素
   */
  private cleanupUnusedElements() {
    // 移除隐藏的或不可见的元素
    const hiddenElements = document.querySelectorAll('[style*="display: none"], .hidden');
    hiddenElements.forEach(element => {
      if (element.parentNode && !element.classList.contains('keep-hidden')) {
        element.parentNode.removeChild(element);
      }
    });
  }

  /**
   * 清理缓存
   */
  private cleanupCache() {
    // 清理图片缓存
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      if (!img.isConnected) {
        img.src = '';
      }
    });
  }

  /**
   * 清理过期的缓存项
   */
  private cleanupExpiredCache() {
    // 这里可以清理localStorage中的过期项
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('temp_') || key.startsWith('cache_')) {
          const item = localStorage.getItem(key);
          if (item) {
            try {
              const data = JSON.parse(item);
              if (data.expiry && Date.now() > data.expiry) {
                localStorage.removeItem(key);
              }
            } catch (e) {
              // 如果解析失败，可能是旧的缓存项，删除它
              localStorage.removeItem(key);
            }
          }
        }
      });
    } catch (e) {
      console.warn('清理缓存时出错:', e);
    }
  }

  /**
   * 清理未使用的事件监听器
   */
  private cleanupUnusedListeners() {
    // 这里可以实现更复杂的事件监听器清理逻辑
    // 目前只是一个占位符
  }

  /**
   * 强制垃圾回收
   */
  private forceGarbageCollection() {
    // 在支持的浏览器中强制垃圾回收
    if (window.gc) {
      window.gc();
    }
  }

  /**
   * 添加清理任务
   */
  addCleanupTask(task: () => void) {
    this.cleanupTasks.push(task);
  }

  /**
   * 获取内存使用情况
   */
  getMemoryUsage() {
    if (typeof performance !== 'undefined' && performance.memory) {
      return {
        used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
        limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
      };
    }
    return null;
  }

  /**
   * 销毁优化器
   */
  destroy() {
    // 执行所有清理任务
    this.cleanupTasks.forEach(task => {
      try {
        task();
      } catch (e) {
        console.warn('清理任务执行失败:', e);
      }
    });

    // 清空清理任务列表
    this.cleanupTasks = [];

    // 停止内存监控
    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
      this.memoryCheckInterval = null;
    }
  }
}

// 全局类型声明
declare global {
  interface Window {
    gc?: () => void;
  }
}

// 导出单例实例
export const memoryOptimizer = MemoryOptimizer.getInstance();
