/**
 * 专门的元素清理工具
 * 用于清理可能的测试元素和动画残留
 */

/**
 * 清理特定的彩色移动元素
 */
export function cleanupColoredElements(): void {
    console.log('🧹 开始清理彩色移动元素...');
    
    let cleanedCount = 0;
    
    try {
        // 查找所有div元素
        const allDivs = document.querySelectorAll('div');
        
        allDivs.forEach(div => {
            const style = window.getComputedStyle(div);
            const inlineStyle = div.style;
            
            // 检查是否是可疑的彩色元素
            const hasColoredBackground = 
                style.backgroundColor.includes('rgb(255, 105, 180)') || // 粉色
                style.backgroundColor.includes('rgb(255, 192, 203)') || // 浅粉色
                style.backgroundColor.includes('rgb(255, 20, 147)') ||  // 深粉色
                inlineStyle.background?.includes('pink') ||
                inlineStyle.background?.includes('rose') ||
                inlineStyle.backgroundColor?.includes('pink') ||
                inlineStyle.backgroundColor?.includes('rose');
            
            const isPositioned = 
                style.position === 'fixed' || 
                style.position === 'absolute';
            
            const hasAnimation = 
                style.animation !== 'none' ||
                style.transform !== 'none' ||
                inlineStyle.animation ||
                inlineStyle.transform;
            
            // 检查是否在左上角区域
            const rect = div.getBoundingClientRect();
            const isInUpperLeft = rect.left < 200 && rect.top < 200;
            
            // 如果是可疑的彩色移动元素
            if (hasColoredBackground && 
                isPositioned && 
                (hasAnimation || isInUpperLeft) &&
                !div.closest('#app') &&
                !div.closest('.game-container') &&
                !div.closest('.loading-overlay') &&
                !div.closest('.accessibility-toolbar') &&
                div.tagName === 'DIV') {
                
                console.log('🎯 发现可疑的彩色元素:', {
                    element: div,
                    backgroundColor: style.backgroundColor,
                    position: style.position,
                    animation: style.animation,
                    transform: style.transform,
                    rect: rect
                });
                
                if (div.parentNode) {
                    div.parentNode.removeChild(div);
                    cleanedCount++;
                    console.log('🧹 已清理彩色元素');
                }
            }
        });
        
        console.log(`✅ 彩色元素清理完成，清理了 ${cleanedCount} 个元素`);
        
    } catch (error) {
        console.error('❌ 彩色元素清理失败:', error);
    }
}

/**
 * 清理所有可疑的动画元素
 */
export function cleanupAnimatedElements(): void {
    console.log('🎭 开始清理动画元素...');
    
    let cleanedCount = 0;
    
    try {
        // 查找所有有动画的元素
        const animatedElements = document.querySelectorAll('*');
        
        animatedElements.forEach(element => {
            const style = window.getComputedStyle(element);
            const htmlElement = element as HTMLElement;
            
            // 检查是否是可疑的动画元素
            const hasAnimation = 
                style.animation !== 'none' ||
                style.transform !== 'none' ||
                htmlElement.style.animation ||
                htmlElement.style.transform;
            
            const isUnidentified = 
                !element.className && 
                !element.id &&
                element.tagName === 'DIV';
            
            const isPositioned = 
                style.position === 'fixed' || 
                style.position === 'absolute';
            
            // 如果是可疑的动画元素
            if (hasAnimation && 
                isUnidentified && 
                isPositioned &&
                !element.closest('#app') &&
                !element.closest('.game-container') &&
                !element.closest('.loading-overlay') &&
                !element.closest('.accessibility-toolbar')) {
                
                console.log('🎯 发现可疑的动画元素:', {
                    element: element,
                    animation: style.animation,
                    transform: style.transform,
                    position: style.position
                });
                
                if (element.parentNode) {
                    element.parentNode.removeChild(element);
                    cleanedCount++;
                    console.log('🧹 已清理动画元素');
                }
            }
        });
        
        console.log(`✅ 动画元素清理完成，清理了 ${cleanedCount} 个元素`);
        
    } catch (error) {
        console.error('❌ 动画元素清理失败:', error);
    }
}

/**
 * 专门清理绿色方块元素（增强版）
 */
export function cleanupGreenSquares(): void {
    console.log('🟢 开始清理绿色方块元素...');

    let cleanedCount = 0;

    try {
        // 查找所有div元素（绿色方块通常是div）
        const allDivs = document.querySelectorAll('div');

        allDivs.forEach(div => {
            const style = window.getComputedStyle(div);
            const htmlElement = div as HTMLElement;
            const rect = div.getBoundingClientRect();

            // 扩展绿色检测范围
            const isGreen =
                style.backgroundColor.includes('rgb(0, 128, 0)') ||     // 标准绿色
                style.backgroundColor.includes('rgb(0, 255, 0)') ||     // 亮绿色
                style.backgroundColor.includes('rgb(34, 139, 34)') ||   // 森林绿
                style.backgroundColor.includes('rgb(50, 205, 50)') ||   // 酸橙绿
                style.backgroundColor.includes('rgb(0, 100, 0)') ||     // 深绿色
                style.backgroundColor.includes('rgb(144, 238, 144)') || // 浅绿色
                style.backgroundColor.includes('rgb(152, 251, 152)') || // 淡绿色
                style.backgroundColor.includes('rgb(124, 252, 0)') ||   // 草绿色
                htmlElement.style.backgroundColor?.includes('green') ||
                htmlElement.style.background?.includes('green') ||
                htmlElement.style.backgroundColor?.includes('#0') ||    // 十六进制绿色
                htmlElement.style.backgroundColor?.includes('#00ff00') ||
                htmlElement.style.backgroundColor?.includes('#008000');

            // 检查是否是方块形状（放宽条件）
            const isSquareish =
                rect.width > 5 && rect.width < 300 &&
                rect.height > 5 && rect.height < 300 &&
                Math.abs(rect.width - rect.height) < 100;

            // 检查是否在角落区域（扩大范围）
            const isInCorner =
                (rect.left < 400 && rect.bottom > window.innerHeight - 400) || // 左下角
                (rect.left < 400 && rect.top < 400) || // 左上角
                (rect.right > window.innerWidth - 400 && rect.bottom > window.innerHeight - 400) || // 右下角
                (rect.right > window.innerWidth - 400 && rect.top < 400); // 右上角

            // 检查是否是可疑的测试元素
            const isSuspicious =
                (!div.className || div.className.includes('test')) &&
                (!div.id || div.id.includes('test')) &&
                div.tagName === 'DIV';

            // 检查是否有固定定位
            const isFixed = style.position === 'fixed' || style.position === 'absolute';

            if (isGreen &&
                (isSquareish || isInCorner || isSuspicious || isFixed) &&
                !div.closest('.game-board') &&
                !div.closest('.game-container') &&
                !div.closest('.loading-overlay') &&
                !div.closest('.accessibility-toolbar') &&
                !div.closest('#app > .game-container')) {

                console.log('🎯 发现绿色方块元素:', {
                    element: div,
                    backgroundColor: style.backgroundColor,
                    inlineStyle: htmlElement.style.backgroundColor,
                    rect: rect,
                    className: div.className,
                    id: div.id,
                    position: style.position,
                    isInCorner: isInCorner,
                    isSuspicious: isSuspicious,
                    isFixed: isFixed
                });

                if (div.parentNode) {
                    div.parentNode.removeChild(div);
                    cleanedCount++;
                    console.log('🧹 已清理绿色方块');
                }
            }
        });

        // 额外检查：查找所有带有绿色样式的元素
        const greenStyleElements = document.querySelectorAll('[style*="green"], [style*="#0"], [style*="rgb(0"]');
        greenStyleElements.forEach(element => {
            const rect = element.getBoundingClientRect();
            if (element.tagName === 'DIV' &&
                rect.width > 0 && rect.height > 0 &&
                rect.width < 300 && rect.height < 300 &&
                !element.closest('.game-board') &&
                !element.closest('.game-container') &&
                !element.closest('.loading-overlay') &&
                !element.closest('.accessibility-toolbar')) {

                console.log('🎯 发现额外的绿色元素:', element);
                if (element.parentNode) {
                    element.parentNode.removeChild(element);
                    cleanedCount++;
                }
            }
        });

        console.log(`✅ 绿色方块清理完成，清理了 ${cleanedCount} 个元素`);

    } catch (error) {
        console.error('❌ 绿色方块清理失败:', error);
    }
}

/**
 * 执行完整的元素清理
 */
export function performCompleteCleanup(): void {
    console.log('🧹 开始完整元素清理...');

    cleanupColoredElements();
    cleanupAnimatedElements();
    cleanupGreenSquares();

    console.log('✅ 完整元素清理完成');
}

/**
 * 监控并自动清理可疑元素
 */
export function startElementMonitoring(): MutationObserver {
    console.log('👁️ 开始元素监控...');
    
    // 使用MutationObserver监控DOM变化
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        const element = node as HTMLElement;
                        
                        // 检查新添加的元素是否可疑
                        if (element.tagName === 'DIV' && 
                            !element.className && 
                            !element.id &&
                            element.style.position === 'fixed') {
                            
                            console.log('👁️ 检测到可疑的新元素:', element);
                            
                            // 延迟检查，给元素时间完成初始化
                            setTimeout(() => {
                                const style = window.getComputedStyle(element);
                                const hasColoredBackground = 
                                    style.backgroundColor.includes('rgb(255') ||
                                    element.style.background?.includes('pink') ||
                                    element.style.background?.includes('rose');
                                
                                if (hasColoredBackground && element.parentNode) {
                                    console.log('🧹 自动清理可疑元素:', element);
                                    element.parentNode.removeChild(element);
                                }
                            }, 100);
                        }
                    }
                });
            }
        });
    });
    
    // 开始监控
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    console.log('✅ 元素监控已启动');
    
    return observer;
}

// 在开发环境中挂载到全局
if (import.meta.env.DEV) {
    (window as any).elementCleaner = {
        cleanupColoredElements,
        cleanupAnimatedElements,
        performCompleteCleanup,
        startElementMonitoring
    };
    console.log('🧹 元素清理工具已挂载到 window.elementCleaner');
}
