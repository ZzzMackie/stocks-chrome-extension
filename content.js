// 内容脚本 - 在网页中注入股票信息
class StockSitebar {
    constructor() {
        this.sitebar = null;
        this.isVisible = false;
        this.currentSymbol = null;
        this.init();
    }

    async init() {
        // 检查是否启用网站侧边栏
        const settings = await this.getSettings();
        if (!settings.enableSitebar) return;

        this.createSitebar();
        this.detectStockSymbols();
        this.setupEventListeners();
    }

    async getSettings() {
        return new Promise((resolve) => {
            chrome.storage.sync.get(['enableSitebar'], (result) => {
                resolve({
                    enableSitebar: result.enableSitebar !== false // 默认启用
                });
            });
        });
    }

    createSitebar() {
        // 创建侧边栏容器
        this.sitebar = document.createElement('div');
        this.sitebar.id = 'stocks-sitebar';
        this.sitebar.innerHTML = `
            <div class="sitebar-header">
                <div class="sitebar-title">
                    <i class="fas fa-chart-line"></i>
                    <span>Stocks</span>
                </div>
                <div class="sitebar-controls">
                    <button class="sitebar-btn" id="sitebarToggle">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="sitebar-btn" id="sitebarClose">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            <div class="sitebar-content">
                <div class="sitebar-loading" id="sitebarLoading">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>加载股票数据...</p>
                </div>
                <div class="sitebar-stock-info" id="sitebarStockInfo" style="display: none;">
                    <div class="stock-header">
                        <div class="stock-symbol" id="sitebarSymbol">-</div>
                        <div class="stock-price" id="sitebarPrice">-</div>
                    </div>
                    <div class="stock-change" id="sitebarChange">-</div>
                    <div class="stock-actions">
                        <button class="sitebar-action-btn" id="addToWatchlist">
                            <i class="fas fa-eye"></i>
                            添加到观察列表
                        </button>
                        <button class="sitebar-action-btn" id="viewDetails">
                            <i class="fas fa-info-circle"></i>
                            查看详情
                        </button>
                    </div>
                </div>
                <div class="sitebar-no-data" id="sitebarNoData" style="display: none;">
                    <i class="fas fa-search"></i>
                    <p>未检测到股票信息</p>
                    <p class="sitebar-hint">访问股票相关网站时自动显示</p>
                </div>
            </div>
        `;

        // 添加到页面
        document.body.appendChild(this.sitebar);

        // 添加样式
        this.addStyles();
    }

    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            #stocks-sitebar {
                position: fixed;
                top: 0;
                right: -350px;
                width: 350px;
                height: 100vh;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                z-index: 999999;
                transition: right 0.3s ease;
                box-shadow: -5px 0 15px rgba(0, 0, 0, 0.2);
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }

            #stocks-sitebar.visible {
                right: 0;
            }

            .sitebar-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px 20px;
                background: rgba(255, 255, 255, 0.1);
                border-bottom: 1px solid rgba(255, 255, 255, 0.2);
            }

            .sitebar-title {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 18px;
                font-weight: 700;
            }

            .sitebar-title i {
                font-size: 20px;
            }

            .sitebar-controls {
                display: flex;
                gap: 8px;
            }

            .sitebar-btn {
                background: rgba(255, 255, 255, 0.2);
                border: none;
                color: white;
                width: 32px;
                height: 32px;
                border-radius: 6px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background 0.2s;
            }

            .sitebar-btn:hover {
                background: rgba(255, 255, 255, 0.3);
            }

            .sitebar-content {
                padding: 20px;
                height: calc(100vh - 80px);
                overflow-y: auto;
            }

            .sitebar-loading,
            .sitebar-no-data {
                text-align: center;
                padding: 40px 20px;
            }

            .sitebar-loading i,
            .sitebar-no-data i {
                font-size: 48px;
                margin-bottom: 16px;
                opacity: 0.7;
            }

            .sitebar-loading p,
            .sitebar-no-data p {
                margin-bottom: 8px;
                font-size: 16px;
            }

            .sitebar-hint {
                font-size: 12px !important;
                opacity: 0.7;
            }

            .sitebar-stock-info {
                text-align: center;
            }

            .stock-header {
                margin-bottom: 16px;
            }

            .stock-symbol {
                font-size: 24px;
                font-weight: 700;
                margin-bottom: 8px;
            }

            .stock-price {
                font-size: 32px;
                font-weight: 700;
                margin-bottom: 8px;
            }

            .stock-change {
                font-size: 16px;
                margin-bottom: 24px;
                padding: 8px 16px;
                border-radius: 20px;
                background: rgba(255, 255, 255, 0.1);
                display: inline-block;
            }

            .stock-change.positive {
                background: rgba(40, 167, 69, 0.3);
                color: #28a745;
            }

            .stock-change.negative {
                background: rgba(220, 53, 69, 0.3);
                color: #dc3545;
            }

            .stock-actions {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }

            .sitebar-action-btn {
                background: rgba(255, 255, 255, 0.2);
                border: none;
                color: white;
                padding: 12px 16px;
                border-radius: 8px;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 14px;
                transition: background 0.2s;
            }

            .sitebar-action-btn:hover {
                background: rgba(255, 255, 255, 0.3);
            }

            .sitebar-action-btn i {
                font-size: 16px;
            }

            /* 响应式设计 */
            @media (max-width: 768px) {
                #stocks-sitebar {
                    width: 100vw;
                    right: -100vw;
                }
            }
        `;
        document.head.appendChild(style);
    }

    detectStockSymbols() {
        // 检测页面中的股票代码
        const text = document.body.innerText;
        
        // 常见的股票代码模式
        const patterns = [
            /\b[A-Z]{1,5}\b/g, // 1-5个大写字母
            /\$[A-Z]{1,5}\b/g, // $符号后跟股票代码
        ];

        const symbols = new Set();
        
        patterns.forEach(pattern => {
            const matches = text.match(pattern);
            if (matches) {
                matches.forEach(match => {
                    const symbol = match.replace('$', '').toUpperCase();
                    if (this.isValidStockSymbol(symbol)) {
                        symbols.add(symbol);
                    }
                });
            }
        });

        if (symbols.size > 0) {
            // 选择第一个检测到的股票代码
            this.currentSymbol = Array.from(symbols)[0];
            this.loadStockData(this.currentSymbol);
        } else {
            this.showNoData();
        }
    }

    isValidStockSymbol(symbol) {
        // 简单的股票代码验证
        if (symbol.length < 1 || symbol.length > 5) return false;
        if (!/^[A-Z]+$/.test(symbol)) return false;
        
        // 排除常见的非股票代码
        const excludeList = ['THE', 'AND', 'OR', 'FOR', 'BUT', 'NOT', 'YOU', 'ALL', 'CAN', 'HER', 'WAS', 'ONE', 'OUR', 'OUT', 'DAY', 'GET', 'HAS', 'HIM', 'HIS', 'HOW', 'ITS', 'MAY', 'NEW', 'NOW', 'OLD', 'SEE', 'TWO', 'WAY', 'WHO', 'BOY', 'DID', 'ITS', 'LET', 'PUT', 'SAY', 'SHE', 'TOO', 'USE'];
        return !excludeList.includes(symbol);
    }

    async loadStockData(symbol) {
        try {
            // 显示加载状态
            document.getElementById('sitebarLoading').style.display = 'block';
            document.getElementById('sitebarStockInfo').style.display = 'none';
            document.getElementById('sitebarNoData').style.display = 'none';

            // 获取股票数据
            const response = await chrome.runtime.sendMessage({
                action: 'getStockData',
                symbol: symbol
            });

            if (response.success) {
                this.displayStockData(response.data);
            } else {
                this.showNoData();
            }
        } catch (error) {
            console.error('加载股票数据失败:', error);
            this.showNoData();
        }
    }

    displayStockData(data) {
        document.getElementById('sitebarLoading').style.display = 'none';
        document.getElementById('sitebarStockInfo').style.display = 'block';
        document.getElementById('sitebarNoData').style.display = 'none';

        document.getElementById('sitebarSymbol').textContent = data.symbol;
        document.getElementById('sitebarPrice').textContent = `$${data.price.toFixed(2)}`;
        
        const changeElement = document.getElementById('sitebarChange');
        const changeText = `${data.change >= 0 ? '+' : ''}$${data.change.toFixed(2)} (${data.changePercent.toFixed(2)}%)`;
        changeElement.textContent = changeText;
        changeElement.className = `stock-change ${data.change >= 0 ? 'positive' : 'negative'}`;
    }

    showNoData() {
        document.getElementById('sitebarLoading').style.display = 'none';
        document.getElementById('sitebarStockInfo').style.display = 'none';
        document.getElementById('sitebarNoData').style.display = 'block';
    }

    setupEventListeners() {
        // 切换显示/隐藏
        document.getElementById('sitebarToggle').addEventListener('click', () => {
            this.toggleVisibility();
        });

        // 关闭侧边栏
        document.getElementById('sitebarClose').addEventListener('click', () => {
            this.hide();
        });

        // 添加到观察列表
        document.getElementById('addToWatchlist').addEventListener('click', () => {
            this.addToWatchlist();
        });

        // 查看详情
        document.getElementById('viewDetails').addEventListener('click', () => {
            this.viewDetails();
        });

        // 点击页面其他地方隐藏侧边栏
        document.addEventListener('click', (e) => {
            if (!this.sitebar.contains(e.target) && this.isVisible) {
                this.hide();
            }
        });

        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'S') {
                e.preventDefault();
                this.toggleVisibility();
            }
        });
    }

    toggleVisibility() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    show() {
        this.sitebar.classList.add('visible');
        this.isVisible = true;
    }

    hide() {
        this.sitebar.classList.remove('visible');
        this.isVisible = false;
    }

    async addToWatchlist() {
        if (!this.currentSymbol) return;

        try {
            const response = await chrome.runtime.sendMessage({
                action: 'addToWatchlist',
                symbol: this.currentSymbol
            });

            if (response.success) {
                // 显示成功提示
                const btn = document.getElementById('addToWatchlist');
                const originalText = btn.innerHTML;
                btn.innerHTML = '<i class="fas fa-check"></i> 已添加';
                btn.style.background = 'rgba(40, 167, 69, 0.3)';
                
                setTimeout(() => {
                    btn.innerHTML = originalText;
                    btn.style.background = '';
                }, 2000);
            }
        } catch (error) {
            console.error('添加到观察列表失败:', error);
        }
    }

    viewDetails() {
        if (!this.currentSymbol) return;
        
        // 打开股票详情页面
        const url = `https://finance.yahoo.com/quote/${this.currentSymbol}`;
        window.open(url, '_blank');
    }
}

// 初始化网站侧边栏
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new StockSitebar();
    });
} else {
    new StockSitebar();
}