/**
 * 用户体验优化验证脚本
 * 在浏览器控制台中运行以验证所有功能
 */

// 等待所有系统加载完成
function waitForAllSystems() {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 50; // 5秒超时
        
        const checkSystems = () => {
            attempts++;
            
            if (window.interactionAnimator && 
                window.responsiveManager && 
                window.accessibilityManager && 
                window.userPreferencesManager && 
                window.loadingExperienceManager &&
                window.benchmarkSuite) {
                
                console.log('✅ 所有用户体验优化系统已加载');
                resolve(true);
            } else if (attempts >= maxAttempts) {
                reject(new Error('系统加载超时'));
            } else {
                setTimeout(checkSystems, 100);
            }
        };
        
        checkSystems();
    });
}

// 验证交互动画系统
async function verifyInteractionAnimator() {
    console.group('✨ 验证交互动画系统');
    
    try {
        const stats = window.interactionAnimator.getStats();
        console.log('📊 交互动画系统统计:', stats);
        
        // 测试微交互
        const testElement = document.createElement('div');
        testElement.style.cssText = 'width: 50px; height: 50px; background: red; position: fixed; top: 10px; right: 10px; z-index: 9999;';
        document.body.appendChild(testElement);
        
        const animationId = window.interactionAnimator.createMicroInteraction(testElement, 'click');
        console.log('✅ 微交互动画创建成功:', animationId);
        
        // 测试视觉反馈
        window.interactionAnimator.createVisualFeedback(testElement, { type: 'ripple' });
        console.log('✅ 视觉反馈创建成功');
        
        // 测试触觉反馈
        window.interactionAnimator.triggerHapticFeedback('light');
        console.log('✅ 触觉反馈触发成功');
        
        // 清理测试元素
        setTimeout(() => {
            if (testElement.parentNode) {
                testElement.parentNode.removeChild(testElement);
            }
        }, 2000);
        
        console.log('✅ 交互动画系统验证通过');
        return true;
    } catch (error) {
        console.error('❌ 交互动画系统验证失败:', error);
        return false;
    } finally {
        console.groupEnd();
    }
}

// 验证响应式管理器
async function verifyResponsiveManager() {
    console.group('📱 验证响应式管理器');
    
    try {
        const deviceInfo = window.responsiveManager.getDeviceInfo();
        const stats = window.responsiveManager.getStats();
        
        console.log('📱 设备信息:', deviceInfo);
        console.log('📊 响应式管理器统计:', stats);
        
        // 测试设备检测
        console.log(`当前设备类型: ${deviceInfo.device}`);
        console.log(`屏幕方向: ${deviceInfo.orientation}`);
        console.log(`屏幕尺寸: ${deviceInfo.screenWidth}x${deviceInfo.screenHeight}`);
        console.log(`触摸支持: ${deviceInfo.touchSupported ? '是' : '否'}`);
        
        console.log('✅ 响应式管理器验证通过');
        return true;
    } catch (error) {
        console.error('❌ 响应式管理器验证失败:', error);
        return false;
    } finally {
        console.groupEnd();
    }
}

// 验证可访问性管理器
async function verifyAccessibilityManager() {
    console.group('♿ 验证可访问性管理器');
    
    try {
        const config = window.accessibilityManager.getConfig();
        const stats = window.accessibilityManager.getStats();
        
        console.log('⚙️ 可访问性配置:', config);
        console.log('📊 可访问性统计:', stats);
        
        // 测试屏幕阅读器公告
        window.accessibilityManager.announce('这是一个测试公告');
        console.log('✅ 屏幕阅读器公告测试成功');
        
        // 测试高对比度切换
        window.accessibilityManager.toggleHighContrast();
        console.log('✅ 高对比度切换测试成功');
        
        // 恢复原始状态
        setTimeout(() => {
            window.accessibilityManager.toggleHighContrast();
        }, 1000);
        
        console.log('✅ 可访问性管理器验证通过');
        return true;
    } catch (error) {
        console.error('❌ 可访问性管理器验证失败:', error);
        return false;
    } finally {
        console.groupEnd();
    }
}

// 验证用户偏好管理器
async function verifyUserPreferencesManager() {
    console.group('⚙️ 验证用户偏好管理器');
    
    try {
        const preferences = window.userPreferencesManager.getPreferences();
        const stats = window.userPreferencesManager.getStats();
        
        console.log('⚙️ 当前用户偏好:', preferences);
        console.log('📊 用户偏好统计:', stats);
        
        // 测试偏好设置更新
        const originalTheme = preferences.theme;
        window.userPreferencesManager.updatePreferences({ 
            soundVolume: 0.8 
        });
        console.log('✅ 偏好设置更新测试成功');
        
        // 测试设置导出
        const exportedSettings = window.userPreferencesManager.exportSettings();
        console.log('✅ 设置导出测试成功，数据长度:', exportedSettings.length);
        
        console.log('✅ 用户偏好管理器验证通过');
        return true;
    } catch (error) {
        console.error('❌ 用户偏好管理器验证失败:', error);
        return false;
    } finally {
        console.groupEnd();
    }
}

// 验证加载体验管理器
async function verifyLoadingExperienceManager() {
    console.group('🔄 验证加载体验管理器');
    
    try {
        const stats = window.loadingExperienceManager.getStats();
        console.log('📊 加载体验管理器统计:', stats);
        
        // 测试骨架屏创建
        const testContainer = document.createElement('div');
        testContainer.style.cssText = 'position: fixed; top: 50px; right: 10px; width: 200px; height: 100px; background: white; border: 1px solid #ccc; z-index: 9999; padding: 10px;';
        document.body.appendChild(testContainer);
        
        const skeletonId = window.loadingExperienceManager.createSkeleton(testContainer, {
            count: 3,
            height: '20px'
        });
        console.log('✅ 骨架屏创建成功:', skeletonId);
        
        // 测试进度指示器
        const progressId = window.loadingExperienceManager.createProgressIndicator(testContainer, {
            type: 'linear',
            showPercentage: true
        });
        console.log('✅ 进度指示器创建成功:', progressId);
        
        // 模拟进度更新
        let progress = 0;
        const progressInterval = setInterval(() => {
            progress += 20;
            window.loadingExperienceManager.updateProgress(progressId, progress);
            
            if (progress >= 100) {
                clearInterval(progressInterval);
                
                // 清理测试元素
                setTimeout(() => {
                    window.loadingExperienceManager.removeSkeleton(skeletonId);
                    window.loadingExperienceManager.removeProgressIndicator(progressId);
                    if (testContainer.parentNode) {
                        testContainer.parentNode.removeChild(testContainer);
                    }
                }, 1000);
            }
        }, 200);
        
        console.log('✅ 加载体验管理器验证通过');
        return true;
    } catch (error) {
        console.error('❌ 加载体验管理器验证失败:', error);
        return false;
    } finally {
        console.groupEnd();
    }
}

// 运行用户体验基准测试
async function runUXBenchmarks() {
    console.group('🧪 运行用户体验基准测试');
    
    try {
        if (window.benchmarkSuite && window.benchmarkSuite.runUserExperienceSuite) {
            console.log('🚀 开始运行用户体验基准测试套件...');
            const results = await window.benchmarkSuite.runUserExperienceSuite();
            
            console.log('📊 用户体验基准测试结果:');
            results.forEach(result => {
                const status = result.averageTime < 100 ? '✅' : result.averageTime < 200 ? '⚠️' : '❌';
                console.log(`${status} ${result.name}: ${result.averageTime.toFixed(2)}ms (${result.iterations}次测试)`);
            });
            
            // 计算总体评分
            const avgTime = results.reduce((sum, r) => sum + r.averageTime, 0) / results.length;
            const score = avgTime < 100 ? 'A级' : avgTime < 150 ? 'B级' : avgTime < 200 ? 'C级' : 'D级';
            
            console.log(`🏆 用户体验总体评分: ${score} (平均响应时间: ${avgTime.toFixed(2)}ms)`);
            
            return { results, avgTime, score };
        } else {
            console.warn('⚠️ 基准测试套件未找到');
            return null;
        }
    } catch (error) {
        console.error('❌ 用户体验基准测试失败:', error);
        return null;
    } finally {
        console.groupEnd();
    }
}

// 显示所有系统统计信息
async function showAllSystemStats() {
    console.group('📈 所有系统统计信息');
    
    try {
        console.log('✨ 交互动画系统:', window.interactionAnimator?.getStats());
        console.log('📱 响应式管理器:', window.responsiveManager?.getStats());
        console.log('♿ 可访问性管理器:', window.accessibilityManager?.getStats());
        console.log('⚙️ 用户偏好管理器:', window.userPreferencesManager?.getStats());
        console.log('🔄 加载体验管理器:', window.loadingExperienceManager?.getStats());
        
        // 如果有其他系统的统计信息也显示
        if (window.networkOptimizer) {
            console.log('🌐 网络优化器:', window.networkOptimizer.getStats());
        }
        if (window.serviceWorkerManager) {
            console.log('🔧 Service Worker管理器: 可用');
        }
        if (window.offlineManager) {
            console.log('🔌 离线管理器:', window.offlineManager.getStats());
        }
        
    } catch (error) {
        console.error('❌ 获取系统统计信息失败:', error);
    } finally {
        console.groupEnd();
    }
}

// 主验证函数
async function verifyAllUXSystems() {
    console.log('🎨 开始验证所有用户体验优化系统...');
    
    try {
        // 等待系统加载
        await waitForAllSystems();
        
        // 运行所有验证测试
        const results = await Promise.all([
            verifyInteractionAnimator(),
            verifyResponsiveManager(),
            verifyAccessibilityManager(),
            verifyUserPreferencesManager(),
            verifyLoadingExperienceManager()
        ]);
        
        const passedTests = results.filter(Boolean).length;
        const totalTests = results.length;
        
        console.log(`\n🎯 验证结果: ${passedTests}/${totalTests} 个系统通过验证`);
        
        if (passedTests === totalTests) {
            console.log('🎉 所有用户体验优化系统验证通过！');
            
            // 运行基准测试
            const benchmarkResults = await runUXBenchmarks();
            
            // 显示统计信息
            await showAllSystemStats();
            
            return {
                success: true,
                passedTests,
                totalTests,
                benchmarkResults
            };
        } else {
            console.warn('⚠️ 部分系统验证失败');
            return {
                success: false,
                passedTests,
                totalTests
            };
        }
        
    } catch (error) {
        console.error('❌ 用户体验系统验证失败:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// 导出验证函数到全局
window.verifyAllUXSystems = verifyAllUXSystems;
window.runUXBenchmarks = runUXBenchmarks;
window.showAllSystemStats = showAllSystemStats;

console.log('📋 用户体验验证脚本已加载');
console.log('💡 运行 verifyAllUXSystems() 开始完整验证');
console.log('💡 运行 runUXBenchmarks() 仅运行基准测试');
console.log('💡 运行 showAllSystemStats() 显示所有统计信息');
