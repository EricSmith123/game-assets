/**
 * 可访问性支持系统
 * 提供键盘导航、屏幕阅读器、ARIA标签等功能
 */



/**
 * 可访问性配置接口
 */
export interface AccessibilityConfig {
  keyboardNavigation: boolean;
  screenReader: boolean;
  highContrast: boolean;
  reducedMotion: boolean;
  focusIndicator: boolean;
  announcements: boolean;
}

/**
 * 焦点管理器接口
 */
export interface FocusManager {
  currentIndex: number;
  focusableElements: HTMLElement[];
  trapFocus: boolean;
}

/**
 * 可访问性支持系统类
 */
export class AccessibilityManager {
  private static instance: AccessibilityManager;
  private config: AccessibilityConfig = {
    keyboardNavigation: true,
    screenReader: true,
    highContrast: false,
    reducedMotion: false,
    focusIndicator: true,
    announcements: true
  };
  
  private focusManager: FocusManager = {
    currentIndex: -1,
    focusableElements: [],
    trapFocus: false
  };
  
  private announcer: HTMLElement | null = null;
  
  // 性能统计
  private stats = {
    keyboardNavigations: 0,
    announcements: 0,
    focusChanges: 0,
    ariaUpdates: 0,
    contrastToggles: 0
  };

  private constructor() {
    this.detectUserPreferences();
    this.setupKeyboardNavigation();
    this.setupScreenReaderSupport();
    this.setupFocusManagement();
    this.injectAccessibilityStyles();
  }

  static getInstance(): AccessibilityManager {
    if (!AccessibilityManager.instance) {
      AccessibilityManager.instance = new AccessibilityManager();
    }
    return AccessibilityManager.instance;
  }

  /**
   * 检测用户偏好设置
   */
  private detectUserPreferences(): void {
    // 检测减少动画偏好
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.config.reducedMotion = true;
      document.body.classList.add('reduced-motion');
      console.log('🎭 检测到减少动画偏好');
    }
    
    // 检测高对比度偏好
    if (window.matchMedia('(prefers-contrast: high)').matches) {
      this.config.highContrast = true;
      document.body.classList.add('high-contrast');
      console.log('🎨 检测到高对比度偏好');
    }
    
    // 检测颜色方案偏好
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.body.classList.add('dark-theme');
      console.log('🌙 检测到深色主题偏好');
    }
  }

  /**
   * 设置键盘导航
   */
  private setupKeyboardNavigation(): void {
    if (!this.config.keyboardNavigation) return;
    
    // 全局键盘事件监听
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    document.addEventListener('keyup', this.handleKeyUp.bind(this));
    
    // 焦点事件监听
    document.addEventListener('focusin', this.handleFocusIn.bind(this));
    document.addEventListener('focusout', this.handleFocusOut.bind(this));
    
    console.log('⌨️ 键盘导航已启用');
  }

  /**
   * 设置屏幕阅读器支持
   */
  private setupScreenReaderSupport(): void {
    if (!this.config.screenReader) return;
    
    // 创建屏幕阅读器公告区域
    this.announcer = document.createElement('div');
    this.announcer.setAttribute('aria-live', 'polite');
    this.announcer.setAttribute('aria-atomic', 'true');
    this.announcer.className = 'sr-only';
    this.announcer.style.cssText = `
      position: absolute !important;
      width: 1px !important;
      height: 1px !important;
      padding: 0 !important;
      margin: -1px !important;
      overflow: hidden !important;
      clip: rect(0, 0, 0, 0) !important;
      white-space: nowrap !important;
      border: 0 !important;
    `;
    document.body.appendChild(this.announcer);
    
    console.log('📢 屏幕阅读器支持已启用');
  }

  /**
   * 设置焦点管理
   */
  private setupFocusManagement(): void {
    // 更新可焦点元素列表
    this.updateFocusableElements();
    
    // 监听DOM变化
    const observer = new MutationObserver(() => {
      this.updateFocusableElements();
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['tabindex', 'disabled', 'aria-hidden']
    });
  }

  /**
   * 注入可访问性样式
   */
  private injectAccessibilityStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      /* 焦点指示器 */
      .focus-visible {
        outline: 2px solid #667eea !important;
        outline-offset: 2px !important;
      }
      
      /* 跳过链接 */
      .skip-link {
        position: absolute;
        top: -40px;
        left: 6px;
        background: #000;
        color: #fff;
        padding: 8px;
        text-decoration: none;
        z-index: 10000;
        border-radius: 4px;
      }
      
      .skip-link:focus {
        top: 6px;
      }
      
      /* 高对比度模式 */
      .high-contrast {
        filter: contrast(150%);
      }
      
      .high-contrast .game-tile {
        border: 2px solid #000 !important;
      }
      
      .high-contrast .game-board {
        background: #fff !important;
        border: 3px solid #000 !important;
      }
      
      /* 减少动画模式 */
      .reduced-motion * {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }
      
      /* 键盘导航指示 */
      .keyboard-navigation .game-tile:focus {
        outline: 3px solid #ff6b35 !important;
        outline-offset: 2px !important;
        z-index: 10 !important;
      }
      
      /* 屏幕阅读器专用 */
      .sr-only {
        position: absolute !important;
        width: 1px !important;
        height: 1px !important;
        padding: 0 !important;
        margin: -1px !important;
        overflow: hidden !important;
        clip: rect(0, 0, 0, 0) !important;
        white-space: nowrap !important;
        border: 0 !important;
      }
      
      /* 可访问性工具栏 */
      .accessibility-toolbar {
        position: fixed;
        bottom: 20px;
        left: 20px;
        background: rgba(0, 0, 0, 0.85);
        color: white;
        padding: 12px;
        border-radius: 12px;
        z-index: 10000;
        display: flex;
        gap: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        transition: all 0.3s ease;
      }

      .accessibility-toolbar:hover {
        background: rgba(0, 0, 0, 0.9);
        transform: translateY(-2px);
        box-shadow: 0 6px 25px rgba(0, 0, 0, 0.4);
      }
      
      .accessibility-button {
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.3);
        color: #fff;
        padding: 8px 12px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 500;
        transition: all 0.2s ease;
        white-space: nowrap;
      }

      .accessibility-button:hover,
      .accessibility-button:focus {
        background: rgba(255, 255, 255, 0.2);
        border-color: rgba(255, 255, 255, 0.5);
        transform: translateY(-1px);
      }

      .accessibility-button.active {
        background: #667eea;
        border-color: #667eea;
        box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
      }

      /* 移动端适配 */
      @media (max-width: 768px) {
        .accessibility-toolbar {
          bottom: 10px;
          left: 10px;
          padding: 8px;
          gap: 6px;
          flex-wrap: wrap;
          max-width: calc(100vw - 20px);
        }

        .accessibility-button {
          padding: 6px 8px;
          font-size: 11px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * 处理键盘按下事件
   */
  private handleKeyDown(event: KeyboardEvent): void {
    const { key, ctrlKey, altKey } = event;
    
    // Tab导航
    if (key === 'Tab') {
      this.handleTabNavigation(event);
      return;
    }
    
    // 方向键导航
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
      this.handleArrowNavigation(event);
      return;
    }
    
    // Enter/Space激活
    if (key === 'Enter' || key === ' ') {
      this.handleActivation(event);
      return;
    }
    
    // Escape键
    if (key === 'Escape') {
      this.handleEscape(event);
      return;
    }
    
    // 快捷键
    if (ctrlKey || altKey) {
      this.handleShortcuts(event);
      return;
    }
    
    this.stats.keyboardNavigations++;
  }

  /**
   * 处理键盘释放事件
   */
  private handleKeyUp(_event: KeyboardEvent): void {
    // 处理键盘释放逻辑
  }

  /**
   * 处理Tab导航
   */
  private handleTabNavigation(event: KeyboardEvent): void {
    if (this.focusManager.trapFocus && this.focusManager.focusableElements.length > 0) {
      event.preventDefault();
      
      const direction = event.shiftKey ? -1 : 1;
      this.focusManager.currentIndex += direction;
      
      if (this.focusManager.currentIndex >= this.focusManager.focusableElements.length) {
        this.focusManager.currentIndex = 0;
      } else if (this.focusManager.currentIndex < 0) {
        this.focusManager.currentIndex = this.focusManager.focusableElements.length - 1;
      }
      
      this.focusManager.focusableElements[this.focusManager.currentIndex].focus();
    }
  }

  /**
   * 处理方向键导航
   */
  private handleArrowNavigation(event: KeyboardEvent): void {
    const gameBoard = document.querySelector('.game-board');
    if (!gameBoard) return;
    
    const tiles = Array.from(gameBoard.querySelectorAll('.game-tile')) as HTMLElement[];
    const currentFocus = document.activeElement as HTMLElement;
    const currentIndex = tiles.indexOf(currentFocus);
    
    if (currentIndex === -1) return;
    
    event.preventDefault();
    
    const boardSize = 8; // 8x8棋盘
    const row = Math.floor(currentIndex / boardSize);
    const col = currentIndex % boardSize;
    
    let newRow = row;
    let newCol = col;
    
    switch (event.key) {
      case 'ArrowUp':
        newRow = Math.max(0, row - 1);
        break;
      case 'ArrowDown':
        newRow = Math.min(boardSize - 1, row + 1);
        break;
      case 'ArrowLeft':
        newCol = Math.max(0, col - 1);
        break;
      case 'ArrowRight':
        newCol = Math.min(boardSize - 1, col + 1);
        break;
    }
    
    const newIndex = newRow * boardSize + newCol;
    if (tiles[newIndex]) {
      tiles[newIndex].focus();
      this.announce(`移动到第${newRow + 1}行第${newCol + 1}列`);
    }
  }

  /**
   * 处理激活事件
   */
  private handleActivation(event: KeyboardEvent): void {
    const target = event.target as HTMLElement;
    
    if (target.classList.contains('game-tile')) {
      event.preventDefault();
      target.click();
      this.announce('方块已选择');
    }
  }

  /**
   * 处理Escape键
   */
  private handleEscape(_event: KeyboardEvent): void {
    // 关闭模态框或返回主菜单
    const modal = document.querySelector('.modal:not([hidden])');
    if (modal) {
      (modal as HTMLElement).style.display = 'none';
      this.announce('对话框已关闭');
    }
  }

  /**
   * 处理快捷键
   */
  private handleShortcuts(event: KeyboardEvent): void {
    const { key, ctrlKey, altKey } = event;
    
    // Ctrl+H: 切换高对比度
    if (ctrlKey && key === 'h') {
      event.preventDefault();
      this.toggleHighContrast();
    }
    
    // Alt+R: 切换减少动画
    if (altKey && key === 'r') {
      event.preventDefault();
      this.toggleReducedMotion();
    }
    
    // Ctrl+K: 显示键盘快捷键帮助
    if (ctrlKey && key === 'k') {
      event.preventDefault();
      this.showKeyboardHelp();
    }
  }

  /**
   * 处理焦点进入
   */
  private handleFocusIn(event: FocusEvent): void {
    const target = event.target as HTMLElement;
    
    if (this.config.focusIndicator) {
      target.classList.add('focus-visible');
    }
    
    // 更新焦点管理器
    const index = this.focusManager.focusableElements.indexOf(target);
    if (index !== -1) {
      this.focusManager.currentIndex = index;
    }
    
    this.stats.focusChanges++;
  }

  /**
   * 处理焦点离开
   */
  private handleFocusOut(event: FocusEvent): void {
    const target = event.target as HTMLElement;
    target.classList.remove('focus-visible');
  }

  /**
   * 更新可焦点元素列表
   */
  private updateFocusableElements(): void {
    const selector = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
      '.game-tile:not([disabled])'
    ].join(', ');
    
    this.focusManager.focusableElements = Array.from(
      document.querySelectorAll(selector)
    ) as HTMLElement[];
  }

  /**
   * 屏幕阅读器公告
   */
  announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    if (!this.config.announcements || !this.announcer) return;
    
    this.announcer.setAttribute('aria-live', priority);
    this.announcer.textContent = message;
    
    // 清空内容以便下次公告
    setTimeout(() => {
      if (this.announcer) {
        this.announcer.textContent = '';
      }
    }, 1000);
    
    this.stats.announcements++;
    console.log(`📢 屏幕阅读器公告: ${message}`);
  }

  /**
   * 设置ARIA标签
   */
  setAriaLabel(element: HTMLElement, label: string): void {
    element.setAttribute('aria-label', label);
    this.stats.ariaUpdates++;
  }

  /**
   * 设置ARIA描述
   */
  setAriaDescription(element: HTMLElement, description: string): void {
    element.setAttribute('aria-describedby', description);
    this.stats.ariaUpdates++;
  }

  /**
   * 切换高对比度模式
   */
  toggleHighContrast(): void {
    this.config.highContrast = !this.config.highContrast;
    document.body.classList.toggle('high-contrast', this.config.highContrast);
    
    this.announce(
      this.config.highContrast ? '高对比度模式已开启' : '高对比度模式已关闭'
    );
    
    this.stats.contrastToggles++;
  }

  /**
   * 切换减少动画模式
   */
  toggleReducedMotion(): void {
    this.config.reducedMotion = !this.config.reducedMotion;
    document.body.classList.toggle('reduced-motion', this.config.reducedMotion);
    
    this.announce(
      this.config.reducedMotion ? '减少动画模式已开启' : '减少动画模式已关闭'
    );
  }

  /**
   * 显示键盘快捷键帮助
   */
  showKeyboardHelp(): void {
    const helpText = `
      键盘快捷键：
      Tab/Shift+Tab: 切换焦点
      方向键: 在游戏板上导航
      Enter/空格: 选择方块
      Escape: 关闭对话框
      Ctrl+H: 切换高对比度
      Alt+R: 切换减少动画
      Ctrl+K: 显示此帮助
    `;
    
    this.announce(helpText, 'assertive');
  }

  /**
   * 创建可访问性工具栏
   */
  createAccessibilityToolbar(): void {
    // 检查是否已存在工具栏
    const existingToolbar = document.querySelector('.accessibility-toolbar');
    if (existingToolbar) {
      console.log('♿ 可访问性工具栏已存在，跳过创建');
      return;
    }

    const toolbar = document.createElement('div');
    toolbar.className = 'accessibility-toolbar';
    toolbar.setAttribute('role', 'toolbar');
    toolbar.setAttribute('aria-label', '可访问性工具');
    toolbar.id = 'accessibility-toolbar';

    const buttons = [
      {
        text: '高对比度',
        action: () => this.toggleHighContrast(),
        ariaLabel: '切换高对比度模式'
      },
      {
        text: '减少动画',
        action: () => this.toggleReducedMotion(),
        ariaLabel: '切换减少动画模式'
      },
      {
        text: '键盘帮助',
        action: () => this.showKeyboardHelp(),
        ariaLabel: '显示键盘快捷键帮助'
      }
    ];

    buttons.forEach(({ text, action, ariaLabel }) => {
      const button = document.createElement('button');
      button.className = 'accessibility-button';
      button.textContent = text;
      button.setAttribute('aria-label', ariaLabel);
      button.addEventListener('click', action);
      toolbar.appendChild(button);
    });

    document.body.appendChild(toolbar);
    console.log('♿ 可访问性工具栏已创建');
  }

  /**
   * 移除可访问性工具栏
   */
  removeAccessibilityToolbar(): void {
    const toolbar = document.getElementById('accessibility-toolbar');
    if (toolbar && toolbar.parentNode) {
      toolbar.parentNode.removeChild(toolbar);
      console.log('♿ 可访问性工具栏已移除');
    }
  }

  /**
   * 启用焦点陷阱
   */
  enableFocusTrap(container: HTMLElement): void {
    this.focusManager.trapFocus = true;
    this.focusManager.focusableElements = Array.from(
      container.querySelectorAll('button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])')
    ) as HTMLElement[];
    
    if (this.focusManager.focusableElements.length > 0) {
      this.focusManager.focusableElements[0].focus();
      this.focusManager.currentIndex = 0;
    }
  }

  /**
   * 禁用焦点陷阱
   */
  disableFocusTrap(): void {
    this.focusManager.trapFocus = false;
    this.updateFocusableElements();
  }

  /**
   * 获取配置
   */
  getConfig(): AccessibilityConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<AccessibilityConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('♿ 可访问性配置已更新:', this.config);
  }

  /**
   * 获取性能统计
   */
  getStats() {
    return {
      ...this.stats,
      config: this.config,
      focusableElementsCount: this.focusManager.focusableElements.length,
      currentFocusIndex: this.focusManager.currentIndex
    };
  }

  /**
   * 打印性能统计
   */
  printStats(): void {
    const stats = this.getStats();
    
    console.group('♿ 可访问性管理器统计');
    console.log(`键盘导航: ${stats.config.keyboardNavigation ? '✅' : '❌'}`);
    console.log(`屏幕阅读器: ${stats.config.screenReader ? '✅' : '❌'}`);
    console.log(`高对比度: ${stats.config.highContrast ? '✅' : '❌'}`);
    console.log(`减少动画: ${stats.config.reducedMotion ? '✅' : '❌'}`);
    console.log(`键盘导航次数: ${stats.keyboardNavigations}`);
    console.log(`屏幕阅读器公告: ${stats.announcements}`);
    console.log(`焦点变化次数: ${stats.focusChanges}`);
    console.log(`ARIA更新次数: ${stats.ariaUpdates}`);
    console.log(`对比度切换次数: ${stats.contrastToggles}`);
    console.log(`可焦点元素数: ${stats.focusableElementsCount}`);
    console.groupEnd();
  }
}

/**
 * 全局可访问性管理器实例
 */
export const accessibilityManager = AccessibilityManager.getInstance();

// 在开发环境中挂载到全局
if (import.meta.env.DEV) {
  (window as any).accessibilityManager = accessibilityManager;
  console.log('♿ 可访问性管理器已挂载到 window.accessibilityManager');
}
