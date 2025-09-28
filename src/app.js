// 主应用文件 - 重构后遵循SOLID原则
import { AppFactory } from './services/app-factory.js';
import './components/stock-card.js';
import './components/chart-container.js';
import './components/stock-modal.js';

class StocksApp {
    constructor() {
        // 使用工厂模式创建依赖
        const services = AppFactory.createApp();
        
        this.apiService = services.apiService;
        this.portfolioManager = services.portfolioManager;
        this.alertManager = services.alertManager;
        this.marketStatusService = services.marketStatusService;
        this.uiManager = services.uiManager;
        this.tabHandler = services.tabHandler;
        
        this.currentTab = 'portfolio';
        this.isChartModalOpen = false;
        this.currentChartSymbol = null;
        
        // 实时更新相关
        this.updateIntervals = new Map();
        this.isUpdating = new Set();
        this.updateFrequency = 5000; // 5秒更新一次（交易时间内）
        this.offHoursUpdateFrequency = 30000; // 非交易时间30秒更新一次
        this.cryptoUpdateFrequency = 1000; // 加密货币1秒更新一次
        
        // 涨跌颜色配置
        this.colorScheme = 'red-up-green-down'; // 'red-up-green-down' 或 'green-up-red-down'
        
        // 侧边栏模式将在init中检测
        this.isSidebarMode = false;
    }

    async init() {
        try {
            // 初始化服务
            await this.apiService.init();
            await this.portfolioManager.init();
            await this.alertManager.init();

            // 初始化UI管理器
            this.uiManager.init();

            // 检测侧边栏模式
            this.isSidebarMode = await this.detectSidebarMode();
            
            // 应用侧边栏模式样式
            this.applySidebarMode();
            // 设置事件监听器
            this.setupEventListeners();

            // 加载初始数据
            await this.tabHandler.switchTab('portfolio');
            await this.loadWatchlist();

            // 开始实时更新
            this.startRealTimeUpdates();

            // 初始化市场状态
            await this.marketStatusService.updateStatus();

            console.log('StocksApp 初始化完成');
        } catch (error) {
            console.error('应用初始化失败:', error);
        }
    }

    setupEventListeners() {
        // 标签页切换
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.currentTarget.dataset.tab;
                this.tabHandler.switchTab(tabName);
            });
        });

        // 颜色切换按钮
        const colorToggleBtn = document.getElementById('colorToggleBtn');
        if (colorToggleBtn) {
            colorToggleBtn.addEventListener('click', () => {
                this.toggleColorScheme();
            });
        } else {
            console.error('找不到颜色切换按钮');
        }

        // 搜索功能
        const searchInput = document.getElementById('stockSearch');
        const searchBtn = document.getElementById('searchBtn');
        
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleSearch();
                }
            });
        }

        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                this.handleSearch();
            });
        }

        // 设置按钮
        const settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                this.showSettings();
            });
        }

        // 设置模态框事件
        const settingsModalClose = document.getElementById('settingsModalClose');
        const cancelSettings = document.getElementById('cancelSettings');
        const saveSettings = document.getElementById('saveSettings');
        const manageAlertsBtn = document.getElementById('manageAlertsBtn');

        if (settingsModalClose) {
            settingsModalClose.addEventListener('click', () => {
                this.hideModal('settingsModal');
            });
        }

        if (cancelSettings) {
            cancelSettings.addEventListener('click', () => {
                this.hideModal('settingsModal');
            });
        }

        if (saveSettings) {
            saveSettings.addEventListener('click', () => {
                this.saveSettings();
            });
        }

        if (manageAlertsBtn) {
            manageAlertsBtn.addEventListener('click', () => {
                this.showAlertsModal();
            });
        }

        // 价格提醒管理模态框事件
        const alertsModalClose = document.getElementById('alertsModalClose');
        const addAlertBtn = document.getElementById('addAlertBtn');

        if (alertsModalClose) {
            alertsModalClose.addEventListener('click', () => {
                this.hideModal('alertsModal');
            });
        }

        if (addAlertBtn) {
            addAlertBtn.addEventListener('click', () => {
                this.addAlert();
            });
        }

        // 刷新按钮
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.refreshPage();
            });
        }

        // 股票卡片点击事件
        document.addEventListener('stock-click', (e) => {
            this.showStockDetails(e.detail);
        });

        // 模态框事件
        document.addEventListener('add-to-watchlist', (e) => {
            this.addToWatchlist(e.detail.symbol);
        });

        document.addEventListener('set-price-alert', (e) => {
            this.setPriceAlert(e.detail);
        });

        // 图表数据请求事件
        document.addEventListener('chart-data-request', async (e) => {
            const { symbol, range, interval } = e.detail;
            try {
                const data = await this.apiService.getHistoricalData(symbol, range, interval);
                const responseEvent = new CustomEvent('chart-data-response', {
                    detail: { data: data.data },
                    bubbles: true
                });
                document.dispatchEvent(responseEvent);
            } catch (error) {
                console.error('获取图表数据失败:', error);
            }
        });

        // 图表更新事件
        document.addEventListener('chart-update', async (e) => {
            const { symbol, range, interval } = e.detail;
            try {
                const data = await this.apiService.getHistoricalData(symbol, range, interval);
                const responseEvent = new CustomEvent('chart-data-response', {
                    detail: { data: data.data },
                    bubbles: true
                });
                document.dispatchEvent(responseEvent);
            } catch (error) {
                console.error('更新图表数据失败:', error);
            }
        });

        // 图表数据请求事件
        document.addEventListener('chart-data-request', async (e) => {
            const { symbol, range, interval } = e.detail;
            try {
                const data = await this.apiService.getHistoricalData(symbol, range, interval);
                const responseEvent = new CustomEvent('chart-data-response', {
                    detail: { data: data.data },
                    bubbles: true
                });
                document.dispatchEvent(responseEvent);
            } catch (error) {
                console.error('请求图表数据失败:', error);
            }
        });

        // 股票数据请求事件
        document.addEventListener('stock-data-request', async (e) => {
            const { symbol } = e.detail;
            try {
                const data = await this.apiService.getStockQuote(symbol);
                const responseEvent = new CustomEvent('stock-data-response', {
                    detail: data,
                    bubbles: true
                });
                document.dispatchEvent(responseEvent);
            } catch (error) {
                console.error('请求股票数据失败:', error);
            }
        });

        // 货币转换器事件
        this.setupCurrencyConverter();
    }

    switchTab(tabName) {
        // 更新标签页状态
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // 更新内容区域
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        const targetTab = document.getElementById(`${tabName}-tab`);
        if (targetTab) {
            targetTab.classList.add('active');
        }

        this.currentTab = tabName;

        // 根据标签页加载相应数据
        if (tabName === 'portfolio') {
            this.loadPortfolio();
        } else if (tabName === 'watchlist') {
            this.loadWatchlist();
        } else if (tabName === 'alerts') {
            this.loadAlerts();
        } else if (tabName === 'news') {
            this.loadNews();
        } else if (tabName === 'markets') {
            this.loadMarkets();
        } else {
            // 切换到其他标签页时停止市场数据更新
            this.stopMarketDataAutoUpdate();
        }
    }

    async loadPortfolio() {
        const portfolio = this.portfolioManager.getPortfolio();
        const container = document.getElementById('portfolioList');
        
        if (!container) return;

        if (portfolio.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-briefcase"></i>
                    <h3>投资组合为空</h3>
                    <p>添加一些股票到您的投资组合中</p>
                    <button class="btn btn-primary" onclick="app.showAddStockModal()">添加股票</button>
                </div>
            `;
            return;
        }

        // 获取实时价格数据
        const symbols = portfolio.map(item => item.symbol);
        const quotes = await this.getMultipleQuotes(symbols);

        // 渲染股票卡片
        container.innerHTML = portfolio.map(item => {
            const quote = quotes[item.symbol];
            if (!quote) return '';

            return `
                <stock-card 
                    symbol="${item.symbol}"
                    price="${quote.price}"
                    change="${quote.change}"
                    change-percent="${quote.changePercent}"
                ></stock-card>
            `;
        }).join('');
    }

    async loadWatchlist() {
        const watchlist = this.portfolioManager.getWatchlist();
        const container = document.getElementById('watchlistList');
        
        if (!container) return;

        if (watchlist.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-eye"></i>
                    <h3>观察列表为空</h3>
                    <p>添加一些股票到您的观察列表中</p>
                    <button class="btn btn-primary" data-action="add-stock">
                        <i class="fas fa-plus"></i> 添加股票
                    </button>
                </div>
            `;
            
            // 添加事件监听器
            const addButton = container.querySelector('[data-action="add-stock"]');
            if (addButton) {
                addButton.addEventListener('click', () => {
                    this.showAddStockModal();
                });
            }
            return;
        }

        // 获取实时价格数据
        const symbols = watchlist.map(item => item.symbol);
        const quotes = await this.getMultipleQuotes(symbols);

        // 渲染观察列表标题和股票卡片
        container.innerHTML = `
            <div class="watchlist-header">
                <div class="watchlist-title">
                    <i class="fas fa-eye"></i>
                    <span>观察列表</span>
                </div>
                <div class="watchlist-count">${watchlist.length} 只股票</div>
            </div>
            <div class="watchlist-items">
                ${watchlist.map(item => {
                    const quote = quotes[item.symbol];
                    if (!quote) return '';

                    return `
                        <div class="watchlist-item">
                            <stock-card 
                                symbol="${item.symbol}"
                                price="${quote.price}"
                                change="${quote.change}"
                                change-percent="${quote.changePercent}"
                            ></stock-card>
                            <button class="btn-icon btn-remove" data-action="remove-watchlist" data-symbol="${item.symbol}" title="从观察列表移除">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
        
        // 添加删除按钮的事件监听器
        const removeButtons = container.querySelectorAll('[data-action="remove-watchlist"]');
        removeButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const symbol = e.target.closest('[data-symbol]').dataset.symbol;
                this.removeFromWatchlist(symbol);
            });
        });
    }

    async loadAlerts() {
        const alerts = this.alertManager.getAlerts();
        const container = document.getElementById('alertsContent');
        
        if (!container) return;

        if (alerts.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-bell"></i>
                    <p>暂无价格提醒</p>
                </div>
            `;
            return;
        }

        // 渲染提醒列表
        container.innerHTML = alerts.map(alert => `
            <div class="alert-item">
                <div class="alert-info">
                    <div class="alert-symbol">${alert.symbol}</div>
                    <div class="alert-condition">
                        ${alert.condition === 'above' ? '上涨至' : '下跌至'} $${alert.price}
                    </div>
                </div>
                <div class="alert-actions">
                    <button class="btn btn-sm btn-danger" onclick="app.removeAlert('${alert.id}')">
                        删除
                    </button>
                </div>
            </div>
        `).join('');
    }

    async getMultipleQuotes(symbols) {
        const promises = symbols.map(symbol => 
            this.apiService.getStockQuote(symbol).catch(error => {
                console.error(`获取 ${symbol} 价格失败:`, error);
                return null;
            })
        );
        
        const results = await Promise.all(promises);
        const quotes = {};
        
        results.forEach((quote, index) => {
            if (quote) {
                quotes[symbols[index]] = quote;
            }
        });
        
        return quotes;
    }

    async showStockDetails(stock) {
        try {
            // 获取完整的股票数据
            const fullStockData = await this.apiService.getStockQuote(stock.symbol);
            
            // 合并数据
            const completeStockData = {
                ...stock,
                ...fullStockData,
                symbol: stock.symbol
            };

            // 创建或获取模态框
            let modal = document.querySelector('stock-modal');
            if (!modal) {
                modal = document.createElement('stock-modal');
                document.body.appendChild(modal);
            }

            // 设置股票数据并打开模态框
            modal.setStock(completeStockData);
            modal.open();

            // 设置图表弹窗状态
            this.isChartModalOpen = true;
            this.currentChartSymbol = stock.symbol;
        } catch (error) {
            console.error('获取股票详情失败:', error);
            alert('获取股票详情失败: ' + error.message);
        }
    }

    async handleSearch() {
        const searchInput = document.getElementById('stockSearch');
        const query = searchInput.value.trim();
        
        if (!query) return;

        try {
            const results = await this.apiService.searchStocks(query);
            this.displaySearchResults(results);
        } catch (error) {
            console.error('搜索失败:', error);
            alert('搜索失败: ' + error.message);
        }
    }

    displaySearchResults(results) {
        // 创建搜索结果模态框
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.id = 'searchResultsModal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>搜索结果</h2>
                    <button class="modal-close" data-action="close">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="search-results-list">
                        ${results.map(result => `
                            <div class="search-result-item">
                                <div class="result-info">
                                    <div class="result-symbol">${result.symbol}</div>
                                    <div class="result-name">${result.name}</div>
                                    <div class="result-type">${result.exchange || 'N/A'}</div>
                                </div>
                                <div class="result-actions">
                                    <button class="btn btn-sm btn-primary" data-action="add-portfolio" data-symbol="${result.symbol}">
                                        添加到投资组合
                                    </button>
                                    <button class="btn btn-sm btn-secondary" data-action="add-watchlist" data-symbol="${result.symbol}">
                                        添加到观察列表
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;

        // 添加事件监听器
        modal.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            const symbol = e.target.dataset.symbol;
            
            if (action === 'close') {
                this.hideModal('searchResultsModal');
            } else if (action === 'add-portfolio' && symbol) {
                this.addToPortfolio(symbol);
            } else if (action === 'add-watchlist' && symbol) {
                this.addToWatchlist(symbol);
            }
        });

        document.body.appendChild(modal);
    }

    async addToWatchlist(symbol) {
        try {
            await this.portfolioManager.addToWatchlist(symbol);
            alert(`${symbol} 已添加到观察列表`);
            this.loadWatchlist();
            this.hideModal('searchResultsModal');
        } catch (error) {
            console.error('添加到观察列表失败:', error);
            alert('添加失败: ' + error.message);
        }
    }

    async removeFromWatchlist(symbol) {
        try {
            await this.portfolioManager.removeFromWatchlist(symbol);
            alert(`${symbol} 已从观察列表移除`);
            this.loadWatchlist();
        } catch (error) {
            console.error('从观察列表移除失败:', error);
            alert('移除失败: ' + error.message);
        }
    }

    async addToPortfolio(symbol) {
        try {
            // 检查是否已经在投资组合中
            if (this.portfolioManager.isInPortfolio(symbol)) {
                alert(`${symbol} 已经在投资组合中`);
                return;
            }

            // 获取当前价格
            const quote = await this.apiService.getStockQuote(symbol);
            if (!quote || !quote.price) {
                alert(`无法获取 ${symbol} 的价格信息`);
                return;
            }

            // 使用默认数量1和当前价格添加到投资组合
            await this.portfolioManager.addToPortfolio(symbol, 1, quote.price);
            alert(`${symbol} 已添加到投资组合 (数量: 1, 价格: $${quote.price.toFixed(2)})`);
            this.loadPortfolio();
            this.hideModal('searchResultsModal');
        } catch (error) {
            console.error('添加到投资组合失败:', error);
            alert('添加失败: ' + error.message);
        }
    }

    async removeAlert(alertId) {
        try {
            await this.alertManager.removeAlert(alertId);
            this.loadAlerts();
        } catch (error) {
            console.error('删除提醒失败:', error);
        }
    }

    setPriceAlert(stock) {
        const price = prompt(`设置 ${stock.symbol} 的价格提醒价格:`);
        if (!price) return;

        const condition = prompt('选择条件 (above/below):', 'above');
        if (!condition) return;

        this.alertManager.addAlert(stock.symbol, condition, parseFloat(price));
        this.loadAlerts();
    }

    showSettings() {
        this.showSettingsModal();
    }

    showSettingsModal() {
        const modal = document.getElementById('settingsModal');
        if (modal) {
            modal.classList.add('active');
            this.loadSettings();
        }
    }

    async loadSettings() {
        const settings = await this.apiService.getSettings();
        
        // 加载设置到表单
        const rapidapiKeyInput = document.getElementById('rapidapiKey');
        const refreshIntervalSelect = document.getElementById('refreshInterval');
        const enableNotificationsCheckbox = document.getElementById('enableNotifications');
        const enableSitebarCheckbox = document.getElementById('enableSitebar');

        if (rapidapiKeyInput) rapidapiKeyInput.value = settings.rapidapiKey || '';
        if (refreshIntervalSelect) refreshIntervalSelect.value = settings.refreshInterval || 60;
        if (enableNotificationsCheckbox) enableNotificationsCheckbox.checked = settings.enableNotifications || false;
        if (enableSitebarCheckbox) enableSitebarCheckbox.checked = settings.enableSitebar || false;
    }

    async saveSettings(flag = true) {
        const rapidapiKeyInput = document.getElementById('rapidapiKey');
        const refreshIntervalSelect = document.getElementById('refreshInterval');
        const enableNotificationsCheckbox = document.getElementById('enableNotifications');
        const enableSitebarCheckbox = document.getElementById('enableSitebar');

        if (!rapidapiKeyInput || !refreshIntervalSelect || !enableNotificationsCheckbox || !enableSitebarCheckbox) {
            console.error('保存设置失败: 找不到必要的DOM元素');
            alert('保存设置失败: 找不到必要的DOM元素');
            return;
        }

        const rapidapiKey = rapidapiKeyInput.value.trim();
        const refreshInterval = parseInt(refreshIntervalSelect.value);
        const enableNotifications = enableNotificationsCheckbox.checked;
        const enableSitebar = enableSitebarCheckbox.checked;

        try {
            await new Promise((resolve) => {
                chrome.storage.sync.set({
                    rapidapiKey,
                    refreshInterval,
                    enableNotifications,
                    enableSitebar
                }, resolve);
            });

            
            // 根据设置控制侧边栏
            try {
                if (enableSitebar) {
                    await chrome.runtime.sendMessage({ action: 'enableSidePanel' });
                    console.log('侧边栏已启用');
                    
                    // 更新本地状态
                    this.isSidebarMode = true;
                    this.applySidebarMode();
                    
                    // 启用侧边栏后，关闭popup并打开侧边栏
                    setTimeout(async () => {
                        try {
                            await chrome.runtime.sendMessage({ action: 'openSidePanel' });
                            flag && window.close(); // 关闭popup弹窗
                        } catch (error) {
                            console.error('打开侧边栏失败:', error);
                        }
                    }, 100);
                } else {
                    await chrome.runtime.sendMessage({ action: 'disableSidePanel' });
                    console.log('侧边栏已禁用');
                    
                    // 更新本地状态
                    this.isSidebarMode = false;
                    this.applySidebarMode();
                }
            } catch (error) {
                console.error('设置侧边栏失败:', error);
            }

            this.apiService.rapidapiKey = rapidapiKey;
            this.startAutoRefresh();
            
            this.hideModal('settingsModal');
            
            // 只有在启用侧边栏时才不显示alert（因为会自动切换到侧边栏）
            if (!enableSitebar) {
                alert('设置已保存');
            }
        } catch (error) {
            console.error('保存设置失败:', error);
            alert('保存设置失败: ' + error.message);
        }
    }

    showAlertsModal() {
        const modal = document.getElementById('alertsModal');
        if (modal) {
            modal.classList.add('active');
            this.loadAlerts();
        }
    }

    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            // 如果是动态创建的模态框，延迟删除
            if (modalId === 'searchResultsModal') {
                setTimeout(() => {
                    if (modal && modal.parentNode) {
                        modal.parentNode.removeChild(modal);
                    }
                }, 300); // 等待动画完成
            }
        }
    }

    async startAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }

        const settings = await this.apiService.getSettings();
        const interval = (settings.refreshInterval || 60) * 1000;

        this.refreshInterval = setInterval(() => {
            this.refreshData();
        }, interval);
    }

    addAlert() {
        const symbolInput = document.getElementById('alertSymbol');
        const priceInput = document.getElementById('alertPrice');
        const conditionSelect = document.getElementById('alertCondition');

        if (!symbolInput || !priceInput || !conditionSelect) {
            return;
        }

        const symbol = symbolInput.value.trim().toUpperCase();
        const price = parseFloat(priceInput.value);
        const condition = conditionSelect.value;

        if (!symbol || !price || price <= 0) {
            alert('请输入有效的股票代码和价格');
            return;
        }

        this.alertManager.addAlert(symbol, condition, price);
        this.loadAlerts();

        // 清空表单
        symbolInput.value = '';
        priceInput.value = '';
        conditionSelect.value = 'above';

        alert('价格提醒已添加');
    }

    removeAlert(alertId) {
        this.alertManager.removeAlert(alertId);
        this.loadAlerts();
    }

    async refreshData() {
        // 刷新当前标签页的数据
        if (this.currentTab === 'portfolio') {
            await this.loadPortfolio();
        } else if (this.currentTab === 'watchlist') {
            await this.loadWatchlist();
        }
    }

    // 刷新页面
    refreshPage() {
        console.log('刷新插件页面');
        
        // 添加刷新动画
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            const icon = refreshBtn.querySelector('i');
            if (icon) {
                icon.style.animation = 'spin 1s linear infinite';
            }
        }
        
        // 延迟刷新，让用户看到动画效果
        setTimeout(() => {
            // 重新加载页面
            window.location.reload();
        }, 500);
    }

    showAddStockModal() {
        // 实现添加股票模态框
        console.log('显示添加股票模态框');
        // TODO: 实现添加股票功能
    }

    // 开始实时更新
    startRealTimeUpdates() {
        // 清除所有现有的更新间隔
        this.stopRealTimeUpdates();
        
        // 立即执行一次市场状态更新
        this.updateMarketStatus();
        
        // 为每个股票设置独立的更新间隔
        this.setupIndividualUpdates();
    }

    // 停止实时更新
    stopRealTimeUpdates() {
        // 清除所有股票的更新间隔
        this.updateIntervals.forEach((intervalId, symbol) => {
            clearInterval(intervalId);
        });
        this.updateIntervals.clear();
        this.isUpdating.clear();
    }

    // 设置独立的更新间隔
    setupIndividualUpdates() {
        const symbolsToUpdate = this.getSymbolsToUpdate();
        
        symbolsToUpdate.forEach(symbol => {
            this.setupSymbolUpdate(symbol);
        });
    }

    // 获取需要更新的股票列表
    getSymbolsToUpdate() {
        const symbols = new Set();
        
        // 从投资组合获取股票
        const portfolio = this.portfolioManager.getPortfolio();
        portfolio.forEach(item => {
            symbols.add(item.symbol);
        });
        
        // 从观察列表获取股票
        const watchlist = this.portfolioManager.getWatchlist();
        watchlist.forEach(item => {
            symbols.add(item.symbol);
        });
        
        return Array.from(symbols);
    }

    // 为单个股票设置更新间隔
    setupSymbolUpdate(symbol) {
        // 如果已经有更新间隔，先清除
        if (this.updateIntervals.has(symbol)) {
            clearInterval(this.updateIntervals.get(symbol));
        }
        
        // 获取该股票的更新频率
        const frequency = this.getSymbolUpdateFrequency(symbol);
        
        // 立即执行一次更新
        this.updateSymbolPrice(symbol);
        
        // 设置定时更新
        const intervalId = setInterval(() => {
            this.updateSymbolPrice(symbol);
        }, frequency);
        
        this.updateIntervals.set(symbol, intervalId);
    }

    // 获取单个股票的更新频率
    getSymbolUpdateFrequency(symbol) {
        if (this.isCryptocurrency(symbol)) {
            return this.cryptoUpdateFrequency; // 1秒
        } else {
            // 传统股票根据市场状态决定
            return this.marketStatus === 'open' ? 
                this.updateFrequency : 
                this.offHoursUpdateFrequency;
        }
    }

    // 更新单个股票价格
    async updateSymbolPrice(symbol) {
        // 防止重复更新
        if (this.isUpdating.has(symbol)) {
            console.log(`${symbol} 正在更新中，跳过本次更新`);
            return;
        }
        
        this.isUpdating.add(symbol);
        
        try {
            // 获取价格数据
            const quote = await this.apiService.getStockQuote(symbol);
            
            if (quote) {
                // 更新UI显示
                await this.updateSinglePriceDisplay(symbol, quote);
                
                // 检查价格提醒
                this.alertManager.checkSingleAlert(symbol, quote);
            }
            
        } catch (error) {
            console.error(`更新 ${symbol} 价格失败:`, error);
        } finally {
            this.isUpdating.delete(symbol);
        }
    }

    // 更新单个股票的价格显示
    async updateSinglePriceDisplay(symbol, quote) {
        // 更新投资组合中的股票卡片
        const portfolioCards = document.querySelectorAll(`stock-card[symbol="${symbol}"]`);
        portfolioCards.forEach(card => {
            if (card.updatePrice) {
                card.updatePrice(quote);
            }
        });
        
        // 更新观察列表中的股票卡片
        const watchlistCards = document.querySelectorAll(`#watchlistList stock-card[symbol="${symbol}"]`);
        watchlistCards.forEach(card => {
            if (card.updatePrice) {
                card.updatePrice(quote);
            }
        });
    }

    // 更新市场状态
    async updateMarketStatus() {
        try {
            // 检查是否有活跃市场
            const hasActiveMarkets = this.checkActiveMarkets();
            const now = new Date();
            const hour = now.getHours();
            const day = now.getDay();
            
            if (hasActiveMarkets) {
                // 有市场在交易
                if (day >= 1 && day <= 5) {
                    if (hour >= 9 && hour < 16) {
                        this.marketStatus = 'open';
                    } else if (hour >= 4 && hour < 9) {
                        this.marketStatus = 'pre-market';
                    } else if (hour >= 16 && hour < 20) {
                        this.marketStatus = 'after-hours';
                    } else {
                        this.marketStatus = 'closed';
                    }
                } else {
                    this.marketStatus = 'closed';
                }
            } else {
                // 没有市场在交易
                this.marketStatus = 'closed';
            }
            
            console.log(`市场状态更新: ${this.marketStatus}`);
            
            // 更新UI显示
            this.updateMarketStatusDisplay();
            
        } catch (error) {
            console.error('更新市场状态失败:', error);
            this.marketStatus = 'unknown';
            this.updateMarketStatusDisplay();
        }
    }

    // 更新市场状态显示
    updateMarketStatusDisplay() {
        const statusElement = document.getElementById('marketStatus');
        if (!statusElement) return;

        const statusConfig = {
            'open': { text: '🟢 市场开放', class: 'open' },
            'pre-market': { text: '🟡 盘前交易', class: 'pre-market' },
            'after-hours': { text: '🟡 盘后交易', class: 'after-hours' },
            'closed': { text: '🔴 市场关闭', class: 'closed' },
            'unknown': { text: '❓ 状态未知', class: 'unknown' }
        };

        const config = statusConfig[this.marketStatus] || statusConfig['unknown'];
        
        statusElement.textContent = config.text;
        statusElement.className = `market-status ${config.class}`;
    }

    // 检测是否为加密货币
    isCryptocurrency(symbol) {
        if (!symbol || typeof symbol !== 'string') return false;
        
        const cryptoSymbols = new Set([
            'BTC-USD', 'ETH-USD', 'ADA-USD', 'SOL-USD', 'MATIC-USD',
            'DOT-USD', 'AVAX-USD', 'LINK-USD', 'UNI-USD', 'AAVE-USD',
            'LTC-USD', 'BCH-USD', 'XRP-USD', 'DOGE-USD', 'SHIB-USD',
            'ATOM-USD', 'NEAR-USD', 'FTM-USD', 'ALGO-USD', 'VET-USD',
            'TRX-USD', 'XLM-USD', 'EOS-USD', 'XTZ-USD', 'FIL-USD',
            'ICP-USD', 'THETA-USD', 'HBAR-USD', 'MANA-USD', 'SAND-USD'
        ]);
        
        return cryptoSymbols.has(symbol.toUpperCase());
    }

    // 获取涨跌颜色
    getChangeColor(isPositive) {
        if (this.colorScheme === 'red-up-green-down') {
            return isPositive ? '#f44336' : '#4caf50'; // 红涨绿跌
        } else {
            return isPositive ? '#4caf50' : '#f44336'; // 绿涨红跌
        }
    }

    // 切换涨跌颜色方案
    toggleColorScheme() {
        console.log('开始切换颜色方案，当前方案:', this.colorScheme);
        this.colorScheme = this.colorScheme === 'red-up-green-down' ? 'green-up-red-down' : 'red-up-green-down';
        console.log('切换后方案:', this.colorScheme);
        
        // 更新所有股票卡片的颜色
        this.updateAllStockColors();
        
        // 更新图表颜色
        this.updateChartColors();
        
        console.log(`颜色方案已切换为: ${this.colorScheme}`);
    }

    // 更新所有股票卡片的颜色
    updateAllStockColors() {
        const stockCards = document.querySelectorAll('stock-card');
        console.log(`找到 ${stockCards.length} 个股票卡片`);
        
        stockCards.forEach((card, index) => {
            console.log(`更新股票卡片 ${index + 1}:`, card.stock?.symbol);
            if (card.updateColors) {
                card.updateColors();
            } else {
                console.warn(`股票卡片 ${index + 1} 没有 updateColors 方法`);
            }
        });
        
        // 更新股票详情模态框的颜色
        const stockModal = document.querySelector('stock-modal');
        if (stockModal && stockModal.updateColors) {
            console.log('更新股票详情模态框颜色');
            stockModal.updateColors();
        }
    }

    // 更新图表颜色
    updateChartColors() {
        // 这里可以添加图表颜色更新逻辑
        // 当有图表打开时，更新图表的涨跌颜色
        if (this.isChartModalOpen && this.currentChartSymbol) {
            // 触发图表颜色更新事件
            document.dispatchEvent(new CustomEvent('chart-color-update', {
                detail: { colorScheme: this.colorScheme }
            }));
        }
    }

    // 检测是否在侧边栏模式
    async detectSidebarMode() {
        try {
            // 根据用户设置判断是否在侧边栏模式
            const settings = await this.apiService.getSettings();
            const enableSitebar = settings.enableSitebar || false;
            
            console.log('根据设置检测侧边栏模式:', enableSitebar);
            return enableSitebar;
        } catch (error) {
            console.error('检测侧边栏模式失败:', error);
            return false;
        }
    }

    // 应用侧边栏模式样式
    applySidebarMode() {
        if (this.isSidebarMode) {
            document.body.classList.add('sidebar-mode');
            console.log('已应用侧边栏模式样式');
        } else {
            document.body.classList.remove('sidebar-mode');
            console.log('已应用弹窗模式样式');
        }
    }

    // 手动切换侧边栏模式（用于调试）
    toggleSidebarMode() {
        this.isSidebarMode = !this.isSidebarMode;
        this.applySidebarMode();
        console.log('手动切换侧边栏模式:', this.isSidebarMode);
    }

    // 设置货币转换器
    setupCurrencyConverter() {
        const amountInput = document.getElementById('amount');
        const convertedAmount = document.getElementById('convertedAmount');
        const conversionRate = document.getElementById('conversionRate');
        const rateUpdateTime = document.getElementById('rateUpdateTime');
        const fromCurrencyDisplay = document.getElementById('fromCurrencyDisplay');
        const toCurrencyDisplay = document.getElementById('toCurrencyDisplay');
        const currencySwapBtn = document.getElementById('currencySwapBtn');

        if (!amountInput || !convertedAmount || !conversionRate || !rateUpdateTime || 
            !fromCurrencyDisplay || !toCurrencyDisplay || !currencySwapBtn) {
            console.log('货币转换器元素未找到，跳过初始化');
            return;
        }

        // 当前货币设置
        let fromCurrency = 'USD';
        let toCurrency = 'CNY';
        let currentRate = null;
        let lastUpdateTime = null;

        // 更新显示
        const updateDisplay = () => {
            fromCurrencyDisplay.textContent = fromCurrency;
            toCurrencyDisplay.textContent = toCurrency;
            
            // 更新按钮状态
            document.querySelectorAll('.currency-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            const activeBtn = document.querySelector(`[data-currency="${fromCurrency}"]`);
            if (activeBtn) {
                activeBtn.classList.add('active');
            }
        };

        // 获取汇率
        const fetchExchangeRate = async () => {
            try {
                console.log(`正在获取汇率: ${fromCurrency} -> ${toCurrency}`);
                const rate = await this.apiService.getCurrencyRate(fromCurrency, toCurrency);
                console.log(`获取到汇率: ${rate}`);
                
                currentRate = rate;
                lastUpdateTime = new Date();
                
                conversionRate.textContent = `1 ${fromCurrency} = ${rate} ${toCurrency}`;
                rateUpdateTime.textContent = `更新时间: ${lastUpdateTime.toLocaleTimeString()}`;
                
                return rate;
            } catch (error) {
                console.error('获取汇率失败:', error);
                conversionRate.textContent = `获取汇率失败: ${error.message}`;
                rateUpdateTime.textContent = '';
                return null;
            }
        };

        // 执行转换
        const convertCurrency = async () => {
            const amount = parseFloat(amountInput.value) || 0;
            
            if (amount <= 0) {
                convertedAmount.value = '';
                return;
            }

            if (fromCurrency === toCurrency) {
                convertedAmount.value = amount;
                conversionRate.textContent = `1 ${fromCurrency} = 1 ${toCurrency}`;
                rateUpdateTime.textContent = '相同货币';
                return;
            }

            // 如果没有汇率或汇率过期（超过5分钟），重新获取
            const now = new Date();
            const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
            
            if (!currentRate || !lastUpdateTime || lastUpdateTime < fiveMinutesAgo) {
                console.log('需要获取新汇率');
                const rate = await fetchExchangeRate();
                if (!rate) {
                    console.log('汇率获取失败，无法转换');
                    return;
                }
            }

            const converted = amount * currentRate;
            convertedAmount.value = converted.toFixed(4);
        };

        // 切换货币
        const swapCurrencies = () => {
            [fromCurrency, toCurrency] = [toCurrency, fromCurrency];
            updateDisplay();
            currentRate = null; // 清除缓存的汇率
            convertCurrency();
        };

        // 手动刷新汇率
        const refreshRateBtn = document.getElementById('refreshRateBtn');
        const refreshRate = async () => {
            refreshRateBtn.classList.add('loading');
            refreshRateBtn.disabled = true;
            
            try {
                currentRate = null; // 清除缓存的汇率
                lastUpdateTime = null; // 清除更新时间
                await convertCurrency();
            } catch (error) {
                console.error('刷新汇率失败:', error);
            } finally {
                refreshRateBtn.classList.remove('loading');
                refreshRateBtn.disabled = false;
            }
        };

        // 事件监听器
        amountInput.addEventListener('input', convertCurrency);
        
        currencySwapBtn.addEventListener('click', swapCurrencies);
        
        refreshRateBtn.addEventListener('click', refreshRate);
        
        // 货币按钮点击事件
        document.querySelectorAll('.currency-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const currency = btn.getAttribute('data-currency');
                if (currency !== fromCurrency && currency !== toCurrency) {
                    // 如果点击的是新货币，替换fromCurrency
                    fromCurrency = currency;
                    updateDisplay();
                    currentRate = null; // 清除缓存的汇率
                    convertCurrency();
                }
            });
        });

        // 初始化
        updateDisplay();
        console.log('开始初始化汇率转换器');
        convertCurrency();
    }

    // 加载新闻数据
    async loadNews() {
        const container = document.getElementById('newsList');
        if (!container) return;

        try {
            // 显示加载状态
            container.innerHTML = `
                <div class="loading">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>加载新闻中...</p>
                </div>
            `;

            // 获取市场新闻
            const news = await this.apiService.getMarketNews(15);
            
            if (news.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-newspaper"></i>
                        <h3>暂无新闻</h3>
                        <p>暂时没有可用的市场新闻</p>
                    </div>
                `;
                return;
            }

            // 渲染新闻列表
            container.innerHTML = news.map((item, index) => `
                <div class="news-item" data-url="${item.url}" data-index="${index}">
                    <div class="news-title">${item.title}</div>
                    <div class="news-source">${item.source}</div>
                    <div class="news-time">${this.formatNewsTime(item.publishedAt)}</div>
                </div>
            `).join('');

            // 添加点击事件监听器
            container.querySelectorAll('.news-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    const url = e.currentTarget.dataset.url;
                    console.log('点击新闻，URL:', url);
                    if (url && url !== '#') {
                        chrome.tabs.create({ url: url });
                    } else {
                        console.warn('无效的新闻URL:', url);
                    }
                });
            });

        } catch (error) {
            console.error('加载新闻失败:', error);
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>加载失败</h3>
                    <p>无法加载新闻数据，请稍后重试</p>
                </div>
            `;
        }
    }

    // 格式化新闻时间
    formatNewsTime(timestamp) {
        if (!timestamp) return '';
        
        const now = new Date();
        const newsTime = new Date(timestamp * 1000);
        const diffMs = now - newsTime;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) {
            return '刚刚';
        } else if (diffMins < 60) {
            return `${diffMins}分钟前`;
        } else if (diffHours < 24) {
            return `${diffHours}小时前`;
        } else if (diffDays < 7) {
            return `${diffDays}天前`;
        } else {
            return newsTime.toLocaleDateString('zh-CN');
        }
    }

    // 加载市场数据
    async loadMarkets() {
        try {
            // 显示加载状态
            this.showMarketLoading();

            // 并行获取市场指数和交易所状态
            const [indices, exchanges] = await Promise.all([
                this.apiService.getMarketIndices(),
                this.apiService.getExchangeStatus()
            ]);

            console.log('获取到的市场指数数据:', indices);
            console.log('获取到的交易所状态数据:', exchanges);

            // 更新市场指数显示
            this.updateMarketIndices(indices);
            
            // 更新交易所状态显示
            this.updateExchangeStatus(exchanges);

            // 启动市场数据自动更新
            this.startMarketDataAutoUpdate();

        } catch (error) {
            console.error('加载市场数据失败:', error);
            this.showMarketError();
        }
    }

    // 显示市场加载状态
    showMarketLoading() {
        const indicesContainer = document.querySelector('.market-indices');
        const hoursContainer = document.getElementById('marketHours');
        
        if (indicesContainer) {
            indicesContainer.innerHTML = `
                <div class="loading">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>加载市场数据中...</p>
                </div>
            `;
        }
        
        if (hoursContainer) {
            hoursContainer.innerHTML = `
                <div class="loading">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>加载交易所状态中...</p>
                </div>
            `;
        }
    }

    // 显示市场错误状态
    showMarketError() {
        const indicesContainer = document.querySelector('.market-indices');
        const hoursContainer = document.getElementById('marketHours');
        
        if (indicesContainer) {
            indicesContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>加载失败</h3>
                    <p>无法加载市场数据，请稍后重试</p>
                </div>
            `;
        }
        
        if (hoursContainer) {
            hoursContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>加载失败</h3>
                    <p>无法加载交易所状态，请稍后重试</p>
                </div>
            `;
        }
    }

    // 更新市场指数显示
    updateMarketIndices(indices) {
        const container = document.querySelector('.market-indices');
        console.log('市场指数容器:', container);
        console.log('市场指数数据:', indices);
        
        if (!container) {
            console.error('找不到市场指数容器 .market-indices');
            return;
        }

        if (!indices || indices.length === 0) {
            console.warn('市场指数数据为空');
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-chart-line"></i>
                    <h3>暂无数据</h3>
                    <p>无法获取市场指数数据</p>
                </div>
            `;
            return;
        }

        // 只显示前6个主要指数
        const mainIndices = indices.slice(0, 6);
        console.log('显示的主要指数:', mainIndices);
        
        container.innerHTML = mainIndices.map(index => {
            const changeClass = index.change >= 0 ? 'positive' : 'negative';
            const changeSymbol = index.change >= 0 ? '+' : '';
            
            return `
                <div class="index-card">
                    <div class="index-name">${index.name}</div>
                    <div class="index-value">${index.price ? index.price.toFixed(2) : '-'}</div>
                    <div class="index-change ${changeClass}">
                        ${index.change ? `${changeSymbol}${index.change.toFixed(2)} (${changeSymbol}${index.changePercent.toFixed(2)}%)` : '-'}
                    </div>
                </div>
            `;
        }).join('');
    }

    // 更新交易所状态显示
    updateExchangeStatus(exchanges) {
        const container = document.getElementById('marketHours');
        if (!container) return;

        container.innerHTML = exchanges.map(exchange => `
            <div class="hour-item">
                <span class="market-name">${exchange.name}</span>
                <span class="market-status">${exchange.status}</span>
            </div>
        `).join('');
    }

    // 启动市场数据自动更新
    startMarketDataAutoUpdate() {
        // 清除之前的定时器
        this.stopMarketDataAutoUpdate();

        // 检查是否有市场正在交易
        const hasActiveMarkets = this.checkActiveMarkets();
        
        if (hasActiveMarkets) {
            console.log('检测到活跃市场，启动30秒自动更新');
            const intervalId = setInterval(async () => {
                if (this.currentTab === 'markets') {
                    await this.updateMarketData();
                }
            }, this.marketIndicesUpdateFrequency);
            
            this.updateIntervals.set('marketIndices', intervalId);
        } else {
            console.log('没有活跃市场，使用5分钟更新频率');
            const intervalId = setInterval(async () => {
                if (this.currentTab === 'markets') {
                    await this.updateMarketData();
                }
            }, 5 * 60 * 1000); // 5分钟更新一次
            
            this.updateIntervals.set('marketIndices', intervalId);
        }
    }

    // 停止市场数据自动更新
    stopMarketDataAutoUpdate() {
        const intervalId = this.updateIntervals.get('marketIndices');
        if (intervalId) {
            clearInterval(intervalId);
            this.updateIntervals.delete('marketIndices');
        }
    }

    // 检查是否有活跃市场
    checkActiveMarkets() {
        // 获取当前时间
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentTime = currentHour * 60 + currentMinute;

        // 定义各市场的交易时间（UTC+8）
        const marketHours = {
            // 美国市场 (UTC-5, 对应UTC+8的21:30-04:00)
            us: { start: 21 * 60 + 30, end: 4 * 60 },
            // 香港市场 (UTC+8, 09:30-16:00)
            hk: { start: 9 * 60 + 30, end: 16 * 60 },
            // 中国A股市场 (UTC+8, 09:30-11:30, 13:00-15:00)
            cn: { 
                morning: { start: 9 * 60 + 30, end: 11 * 60 + 30 },
                afternoon: { start: 13 * 60, end: 15 * 60 }
            },
            // 欧洲市场 (UTC+1, 对应UTC+8的15:00-23:30)
            eu: { start: 15 * 60, end: 23 * 60 + 30 },
            // 日本市场 (UTC+9, 对应UTC+8的08:00-10:30, 11:30-15:00)
            jp: { 
                morning: { start: 8 * 60, end: 10 * 60 + 30 },
                afternoon: { start: 11 * 60 + 30, end: 15 * 60 }
            }
        };

        // 检查各市场是否在交易时间
        const isUSOpen = this.isTimeInRange(currentTime, marketHours.us.start, marketHours.us.end);
        const isHKOpen = this.isTimeInRange(currentTime, marketHours.hk.start, marketHours.hk.end);
        const isCNOpen = this.isTimeInRange(currentTime, marketHours.cn.morning.start, marketHours.cn.morning.end) ||
                        this.isTimeInRange(currentTime, marketHours.cn.afternoon.start, marketHours.cn.afternoon.end);
        const isEUOpen = this.isTimeInRange(currentTime, marketHours.eu.start, marketHours.eu.end);
        const isJPOpen = this.isTimeInRange(currentTime, marketHours.jp.morning.start, marketHours.jp.morning.end) ||
                        this.isTimeInRange(currentTime, marketHours.jp.afternoon.start, marketHours.jp.afternoon.end);

        return isUSOpen || isHKOpen || isCNOpen || isEUOpen || isJPOpen;
    }

    // 检查时间是否在指定范围内
    isTimeInRange(currentTime, startTime, endTime) {
        if (startTime <= endTime) {
            // 同一天内的时间范围
            return currentTime >= startTime && currentTime <= endTime;
        } else {
            // 跨天的时间范围（如美国市场）
            return currentTime >= startTime || currentTime <= endTime;
        }
    }

    // 更新市场数据（不显示加载状态）
    async updateMarketData() {
        try {
            console.log('自动更新市场数据...');
            
            // 并行获取市场指数和交易所状态
            const [indices, exchanges] = await Promise.all([
                this.apiService.getMarketIndices(),
                this.apiService.getExchangeStatus()
            ]);

            // 静默更新显示
            this.updateMarketIndices(indices);
            this.updateExchangeStatus(exchanges);

        } catch (error) {
            console.error('自动更新市场数据失败:', error);
        }
    }
}

// 创建全局应用实例
const app = new StocksApp();

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});

// 导出应用实例供全局使用
window.app = app;
export default app;