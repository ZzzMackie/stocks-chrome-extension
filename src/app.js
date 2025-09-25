// 主应用文件
import { StockAPIService } from './services/api.js';
import { PortfolioManager } from './services/portfolio.js';
import { AlertManager } from './services/alerts.js';
import './components/stock-card.js';
import './components/chart-container.js';
import './components/stock-modal.js';

class StocksApp {
    constructor() {
        this.apiService = new StockAPIService();
        this.portfolioManager = new PortfolioManager();
        this.alertManager = new AlertManager();
        this.currentTab = 'portfolio';
        this.isChartModalOpen = false;
        this.currentChartSymbol = null;
        
        // 实时更新相关
        this.updateIntervals = new Map();
        this.isUpdating = new Set();
        this.marketStatus = 'unknown';
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

            // 检测侧边栏模式
            this.isSidebarMode = await this.detectSidebarMode();
            
            // 应用侧边栏模式样式
            this.applySidebarMode();

            // 设置事件监听器
            this.setupEventListeners();

            // 加载初始数据
            await this.loadPortfolio();
            await this.loadWatchlist();

            // 开始实时更新
            this.startRealTimeUpdates();

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
                this.switchTab(tabName);
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
                this.refreshData();
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

    async saveSettings() {
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
                            window.close(); // 关闭popup弹窗
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
            // 获取市场状态（这里简化处理，实际应该调用API）
            const now = new Date();
            const hour = now.getHours();
            const day = now.getDay();
            
            // 简单判断市场状态（周一到周五，9:30-16:00为交易时间）
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
            
            console.log(`市场状态更新: ${this.marketStatus}`);
            
        } catch (error) {
            console.error('更新市场状态失败:', error);
            this.marketStatus = 'unknown';
        }
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