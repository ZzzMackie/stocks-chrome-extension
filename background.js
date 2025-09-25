// 后台服务工作者
class BackgroundService {
    constructor() {
        this.alarmName = 'stockPriceCheck';
        this.setupEventListeners();
        // 扩展启动时立即加载侧边栏设置
        this.loadSidePanelSettings();
    }

    setupEventListeners() {
        // 安装扩展时
        chrome.runtime.onInstalled.addListener((details) => {
            console.log('Stocks 扩展已安装');
            this.setupAlarms();
            this.setupDefaultSidePanel();
        });

        // 扩展启动时
        chrome.runtime.onStartup.addListener(() => {
            console.log('Stocks 扩展已启动');
            this.loadSidePanelSettings();
        });

        // 处理通知点击
        chrome.notifications.onClicked.addListener((notificationId) => {
            chrome.notifications.clear(notificationId);
        });

        // 处理闹钟
        chrome.alarms.onAlarm.addListener((alarm) => {
            if (alarm.name === this.alarmName) {
                this.checkPriceAlerts();
            }
        });

        // 处理来自内容脚本的消息
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            this.handleMessage(request, sender, sendResponse);
            return true; // 保持消息通道开放
        });
    }

    async setupAlarms() {
        // 清除现有闹钟
        await chrome.alarms.clear(this.alarmName);
        
        // 设置新的闹钟，每5分钟检查一次价格提醒
        chrome.alarms.create(this.alarmName, {
            delayInMinutes: 1,
            periodInMinutes: 5
        });
    }

    async setupDefaultSidePanel() {
        try {
            // 默认禁用侧边栏
            await chrome.sidePanel.setOptions({
                enabled: false
            });
            await chrome.sidePanel.setPanelBehavior({ 
                openPanelOnActionClick: false 
            });
            console.log('侧边栏默认已禁用');
        } catch (error) {
            console.error('设置默认侧边栏失败:', error);
        }
    }

    async loadSidePanelSettings() {
        try {
            // 获取用户的侧边栏设置
            const result = await chrome.storage.sync.get(['enableSitebar']);
            const enableSitebar = result.enableSitebar || false;
            
            console.log('加载侧边栏设置:', enableSitebar);
            
            if (enableSitebar) {
                // 启用侧边栏
                await chrome.sidePanel.setOptions({
                    path: 'popup.html',
                    enabled: true
                });
                await chrome.sidePanel.setPanelBehavior({ 
                    openPanelOnActionClick: true 
                });
                console.log('侧边栏已根据设置启用');
            } else {
                // 禁用侧边栏
                await chrome.sidePanel.setOptions({
                    enabled: false
                });
                await chrome.sidePanel.setPanelBehavior({ 
                    openPanelOnActionClick: false 
                });
                console.log('侧边栏已根据设置禁用');
            }
        } catch (error) {
            console.error('加载侧边栏设置失败:', error);
        }
    }

    async checkPriceAlerts() {
        try {
            // 获取存储的提醒
            const result = await chrome.storage.local.get(['alerts', 'portfolio', 'watchlist']);
            const alerts = result.alerts || [];
            const portfolio = result.portfolio || [];
            const watchlist = result.watchlist || [];

            if (alerts.length === 0) return;

            // 获取所有需要检查的股票代码
            const symbols = [...new Set([
                ...alerts.map(alert => alert.symbol),
                ...portfolio.map(item => item.symbol),
                ...watchlist
            ])];

            if (symbols.length === 0) return;

            // 获取当前价格
            const quotes = await this.getStockQuotes(symbols);
            
            // 检查提醒
            alerts.forEach(alert => {
                if (alert.triggered) return;

                const quote = quotes.find(q => q.symbol === alert.symbol);
                if (!quote) return;

                let shouldTrigger = false;
                if (alert.condition === 'above' && quote.price >= alert.targetPrice) {
                    shouldTrigger = true;
                } else if (alert.condition === 'below' && quote.price <= alert.targetPrice) {
                    shouldTrigger = true;
                }

                if (shouldTrigger) {
                    this.triggerAlert(alert, quote);
                }
            });

        } catch (error) {
            console.error('检查价格提醒失败:', error);
        }
    }

    async getStockQuotes(symbols) {
        // 这里应该调用实际的股票 API
        // 为了演示，返回模拟数据
        return symbols.map(symbol => ({
            symbol,
            price: Math.random() * 100 + 50, // 模拟价格
            change: (Math.random() - 0.5) * 10,
            changePercent: (Math.random() - 0.5) * 5
        }));
    }

    async triggerAlert(alert, quote) {
        // 标记提醒为已触发
        const result = await chrome.storage.local.get(['alerts']);
        const alerts = result.alerts || [];
        const alertIndex = alerts.findIndex(a => a.id === alert.id);
        
        if (alertIndex >= 0) {
            alerts[alertIndex].triggered = true;
            await chrome.storage.local.set({ alerts });
        }

        // 显示通知
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon48.png',
            title: '价格提醒',
            message: `${alert.symbol} 价格 ${alert.condition === 'above' ? '上涨至' : '下跌至'} $${quote.price.toFixed(2)}`
        });
    }

    async handleMessage(request, sender, sendResponse) {
        switch (request.action) {
            case 'getStockData':
                try {
                    const data = await this.getStockDataForPage(request.symbol);
                    sendResponse({ success: true, data });
                } catch (error) {
                    sendResponse({ success: false, error: error.message });
                }
                break;

            case 'addToWatchlist':
                try {
                    await this.addToWatchlist(request.symbol);
                    sendResponse({ success: true });
                } catch (error) {
                    sendResponse({ success: false, error: error.message });
                }
                break;

            case 'getPortfolioValue':
                try {
                    const value = await this.getPortfolioValue();
                    sendResponse({ success: true, value });
                } catch (error) {
                    sendResponse({ success: false, error: error.message });
                }
                break;

            case 'openSidePanel':
                try {
                    await chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT });
                    sendResponse({ success: true });
                } catch (error) {
                    sendResponse({ success: false, error: error.message });
                }
                break;

            case 'enableSidePanel':
                try {
                    // 设置侧边栏路径
                    await chrome.sidePanel.setOptions({
                        path: 'popup.html',
                        enabled: true
                    });
                    // 设置点击行为
                    await chrome.sidePanel.setPanelBehavior({ 
                        openPanelOnActionClick: true 
                    });
                    sendResponse({ success: true });
                } catch (error) {
                    sendResponse({ success: false, error: error.message });
                }
                break;

            case 'disableSidePanel':
                try {
                    // 禁用侧边栏
                    await chrome.sidePanel.setOptions({
                        enabled: false
                    });
                    // 设置点击行为
                    await chrome.sidePanel.setPanelBehavior({ 
                        openPanelOnActionClick: false 
                    });
                    sendResponse({ success: true });
                } catch (error) {
                    sendResponse({ success: false, error: error.message });
                }
                break;

            default:
                sendResponse({ success: false, error: '未知操作' });
        }
    }

    async getStockDataForPage(symbol) {
        // 获取股票数据用于页面显示
        // 这里应该调用实际的股票 API
        return {
            symbol,
            price: Math.random() * 100 + 50,
            change: (Math.random() - 0.5) * 10,
            changePercent: (Math.random() - 0.5) * 5
        };
    }

    async addToWatchlist(symbol) {
        const result = await chrome.storage.local.get(['watchlist']);
        const watchlist = result.watchlist || [];
        
        if (!watchlist.includes(symbol)) {
            watchlist.push(symbol);
            await chrome.storage.local.set({ watchlist });
        }
    }

    async getPortfolioValue() {
        const result = await chrome.storage.local.get(['portfolio']);
        const portfolio = result.portfolio || [];
        
        // 计算投资组合总价值
        let totalValue = 0;
        for (const item of portfolio) {
            // 这里应该获取当前价格
            const currentPrice = Math.random() * 100 + 50; // 模拟价格
            totalValue += item.quantity * currentPrice;
        }
        
        return totalValue;
    }
}

// 初始化后台服务
new BackgroundService();