// 股票详情模态框组件
export class StockModal extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.stock = null;
        this.isOpen = false;
        this.chart = null;
        this.candlestickSeries = null;
        this.chartContainer = null;
        this.updateInterval = null;
        this.isUpdating = false;
    }

    static get observedAttributes() {
        return ['open'];
    }

    connectedCallback() {
        this.render();
        this.setupEventListeners();
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'open') {
            this.isOpen = newValue !== null;
            this.render();
        }
    }

    setStock(stock) {
        this.stock = stock;
        this.render();
    }

    open() {
        this.setAttribute('open', '');
        this.isOpen = true;
        this.render();
        // 延迟初始化图表，确保DOM已渲染
        setTimeout(() => {
            this.initializeChart();
        }, 100);
        // 开始实时更新
        this.startRealTimeUpdate();
    }

    close() {
        this.removeAttribute('open');
        this.isOpen = false;
        this.destroyChart();
        this.stopRealTimeUpdate();
        this.render();
    }

    setupEventListeners() {
        // 点击背景关闭模态框
        this.shadowRoot.addEventListener('click', (e) => {
            if (e.target === this.shadowRoot.querySelector('.modal-overlay')) {
                this.close();
            }
        });

        // 关闭按钮点击事件
        this.shadowRoot.addEventListener('click', (e) => {
            if (e.target.classList.contains('close-btn')) {
                this.close();
            }
        });

        // 按钮点击事件
        this.shadowRoot.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            if (action === 'add-to-watchlist') {
                this.dispatchEvent(new CustomEvent('add-to-watchlist', { 
                    detail: this.stock,
                    bubbles: true 
                }));
            } else if (action === 'set-price-alert') {
                this.dispatchEvent(new CustomEvent('set-price-alert', { 
                    detail: this.stock,
                    bubbles: true 
                }));
            }
        });

        // 图表控制事件
        this.shadowRoot.addEventListener('change', (e) => {
            const action = e.target.dataset.action;
            if (action === 'chart-range' || action === 'chart-interval') {
                this.requestChartData();
            }
        });

        // 图表数据响应事件
        document.addEventListener('chart-data-response', (e) => {
            this.updateChartData(e.detail.data);
        });

        // 股票数据响应事件
        document.addEventListener('stock-data-response', (e) => {
            this.updateStockDataFromResponse(e.detail);
        });

        // ESC键关闭模态框
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });
    }

    render() {
        if (!this.isOpen) {
            this.shadowRoot.innerHTML = '';
            return;
        }

        const stock = this.stock || {};
        const isPositive = stock.change >= 0;
        const changeClass = isPositive ? 'positive' : 'negative';
        
        // 获取全局颜色方案
        const app = window.app || { colorScheme: 'red-up-green-down' };
        const positiveColor = this.getChangeColor(true, app.colorScheme);
        const negativeColor = this.getChangeColor(false, app.colorScheme);

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    z-index: 1000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .modal-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.8);
                    backdrop-filter: blur(4px);
                    --positive-color: ${positiveColor};
                    --negative-color: ${negativeColor};
                    --price-color: ${isPositive ? positiveColor : negativeColor};
                }

                .modal-content {
                    position: relative;
                    background: #1e1e1e;
                    border-radius: 12px;
                    padding: 24px;
                    max-width: 800px;
                    width: 90%;
                    max-height: 90vh;
                    overflow-y: auto;
                    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
                    border: 1px solid #333;
                }

                .modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 24px;
                    padding-bottom: 16px;
                    border-bottom: 1px solid #333;
                }

                .modal-title {
                    font-size: 24px;
                    font-weight: 700;
                    color: #fff;
                    margin: 0;
                }

                .close-btn {
                    background: none;
                    border: none;
                    color: #d1d4dc;
                    font-size: 24px;
                    cursor: pointer;
                    padding: 8px;
                    border-radius: 4px;
                    transition: background-color 0.2s;
                }

                .close-btn:hover {
                    background: #333;
                }

                .stock-info {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 24px;
                    margin-bottom: 24px;
                }

                .price-section {
                    text-align: center;
                    padding: 20px;
                    background: linear-gradient(135deg, #2a2a2a 0%, #1e1e1e 100%);
                    border-radius: 12px;
                    border: 1px solid #333;
                }

                .stock-symbol {
                    font-size: 16px;
                    font-weight: 600;
                    color: #667eea;
                    margin-bottom: 4px;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }

                .stock-name {
                    font-size: 14px;
                    color: #d1d4dc;
                    margin-bottom: 16px;
                    line-height: 1.4;
                }

                .current-price {
                    font-size: 42px;
                    font-weight: 700;
                    color: var(--price-color, #fff);
                    margin-bottom: 12px;
                    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
                }

                .price-change {
                    font-size: 20px;
                    font-weight: 600;
                    margin-bottom: 6px;
                }

                .price-change.positive {
                    color: var(--positive-color, #4caf50);
                }

                .price-change.negative {
                    color: var(--negative-color, #f44336);
                }

                .price-change-percent {
                    font-size: 16px;
                    font-weight: 500;
                    margin-bottom: 16px;
                }

                .price-change-percent.positive {
                    color: var(--positive-color, #4caf50);
                }

                .price-change-percent.negative {
                    color: var(--negative-color, #f44336);
                }

                .market-status {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    padding: 8px 16px;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 20px;
                    font-size: 12px;
                    font-weight: 500;
                }

                .status-indicator {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                }

                .status-indicator.open {
                    background: #4caf50;
                    box-shadow: 0 0 8px rgba(76, 175, 80, 0.5);
                }

                .status-indicator.closed {
                    background: #f44336;
                    box-shadow: 0 0 8px rgba(244, 67, 54, 0.5);
                }

                .status-text {
                    color: #d1d4dc;
                }

                /* 价格变化动画效果 */
                .price-up {
                    animation: priceUp 1s ease-out;
                }

                .price-down {
                    animation: priceDown 1s ease-out;
                }

                @keyframes priceUp {
                    0% {
                        background-color: rgba(76, 175, 80, 0.3);
                        transform: scale(1);
                    }
                    50% {
                        background-color: rgba(76, 175, 80, 0.6);
                        transform: scale(1.05);
                    }
                    100% {
                        background-color: transparent;
                        transform: scale(1);
                    }
                }

                @keyframes priceDown {
                    0% {
                        background-color: rgba(244, 67, 54, 0.3);
                        transform: scale(1);
                    }
                    50% {
                        background-color: rgba(244, 67, 54, 0.6);
                        transform: scale(1.05);
                    }
                    100% {
                        background-color: transparent;
                        transform: scale(1);
                    }
                }

                .stats-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 16px;
                    padding: 20px;
                    background: #2a2a2a;
                    border-radius: 12px;
                    border: 1px solid #333;
                }

                .stat-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 12px 16px;
                    background: #1e1e1e;
                    border-radius: 8px;
                    border: 1px solid #333;
                    transition: all 0.2s ease;
                }

                .stat-item:hover {
                    background: #2a2a2a;
                    border-color: #555;
                    transform: translateY(-1px);
                }

                .stat-label {
                    color: #d1d4dc;
                    font-size: 13px;
                    font-weight: 500;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .stat-value {
                    color: #fff;
                    font-size: 14px;
                    font-weight: 600;
                    text-align: right;
                }

                .actions {
                    display: flex;
                    gap: 12px;
                    margin-top: 24px;
                }

                .btn {
                    padding: 12px 24px;
                    border: none;
                    border-radius: 6px;
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .btn-primary {
                    background: #667eea;
                    color: white;
                }

                .btn-primary:hover {
                    background: #5a6fd8;
                }

                .btn-secondary {
                    background: #333;
                    color: #d1d4dc;
                    border: 1px solid #555;
                }

                .btn-secondary:hover {
                    background: #444;
                }

                .chart-section {
                    margin: 24px 0;
                    padding: 20px;
                    background: #2a2a2a;
                    border-radius: 8px;
                    border: 1px solid #333;
                }

                .chart-section h3 {
                    color: #fff;
                    margin-bottom: 16px;
                    font-size: 18px;
                    font-weight: 600;
                }

                .chart-controls {
                    display: flex;
                    gap: 12px;
                    margin-bottom: 16px;
                }

                .chart-controls select {
                    background: #1e1e1e;
                    color: #fff;
                    border: 1px solid #555;
                    border-radius: 4px;
                    padding: 8px 12px;
                    font-size: 14px;
                    cursor: pointer;
                }

                .chart-controls select:focus {
                    outline: none;
                    border-color: #667eea;
                }

                .chart-container {
                    height: 300px;
                    background: #1e1e1e;
                    border-radius: 6px;
                    border: 1px solid #333;
                    position: relative;
                    overflow: hidden;
                }

                .chart-loading {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    height: 100%;
                    color: #d1d4dc;
                    font-size: 14px;
                    gap: 10px;
                }

                .chart-loading i {
                    animation: spin 1s linear infinite;
                }

                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }

                .chart-error {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    height: 100%;
                    color: #f44336;
                    font-size: 14px;
                    gap: 10px;
                    background: rgba(244, 67, 54, 0.1);
                    border: 1px solid rgba(244, 67, 54, 0.3);
                    border-radius: 6px;
                }

                @media (max-width: 768px) {
                    .modal-content {
                        width: 95%;
                        padding: 16px;
                    }

                    .stock-info {
                        grid-template-columns: 1fr;
                        gap: 16px;
                    }

                    .stats-grid {
                        grid-template-columns: 1fr;
                    }

                    .actions {
                        flex-direction: column;
                    }
                }
            </style>
            
            <div class="modal-overlay"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h2 class="modal-title">${stock.longName || stock.shortName || stock.symbol} (${stock.symbol})</h2>
                    <button class="close-btn">×</button>
                </div>
                
                <div class="price-section">
                    <div class="stock-symbol">${stock.symbol}</div>
                    <div class="stock-name">${stock.longName || stock.shortName || stock.symbol}</div>
                <div class="current-price">$${this.formatPrice(stock.price)}</div>
                <div class="price-change ${changeClass}">
                    ${isPositive ? '+' : ''}${this.formatChange(stock.change)}
                </div>
                <div class="price-change-percent ${changeClass}">
                    (${isPositive ? '+' : ''}${this.formatChangePercent(stock.changePercent)}%)
                </div>
                    <div class="market-status">
                        <span class="status-indicator ${stock.marketState === 'REGULAR' ? 'open' : 'closed'}"></span>
                        <span class="status-text">${stock.marketState === 'REGULAR' ? '交易中' : '已收盘'}</span>
                    </div>
                </div>
                <div class="chart-section">
                    <h3>价格图表</h3>
                    <div class="chart-controls">
                        <select class="chart-range" data-action="chart-range">
                            <option value="1d">1天</option>
                            <option value="5d">5天</option>
                            <option value="1mo" selected>1个月</option>
                            <option value="3mo">3个月</option>
                            <option value="6mo">6个月</option>
                            <option value="1y">1年</option>
                            <option value="2y">2年</option>
                            <option value="5y">5年</option>
                            <option value="max">最大</option>
                        </select>
                        <select class="chart-interval" data-action="chart-interval">
                            <option value="1m">1分钟</option>
                            <option value="5m">5分钟</option>
                            <option value="15m">15分钟</option>
                            <option value="1h">1小时</option>
                            <option value="1d" selected>1天</option>
                        </select>
                    </div>
                    <div class="chart-container" id="chartContainer">
                        <div class="chart-loading">
                            <i class="fas fa-spinner fa-spin"></i>
                            <span>加载图表中...</span>
                        </div>
                    </div>
                </div>
                
                <div class="stock-info">
                    
                    <div class="stats-grid">
                        <div class="stat-item">
                            <span class="stat-label">开盘价</span>
                            <span class="stat-value">$${this.formatPrice(stock.open)}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">最高价</span>
                            <span class="stat-value">$${this.formatPrice(stock.dayHigh || stock.high)}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">最低价</span>
                            <span class="stat-value">$${this.formatPrice(stock.dayLow || stock.low)}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">前收盘价</span>
                            <span class="stat-value">$${this.formatPrice(stock.previousClose)}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">成交量</span>
                            <span class="stat-value">${(stock.volume || 0).toLocaleString()}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">平均成交量</span>
                            <span class="stat-value">${(stock.averageVolume || 0).toLocaleString()}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">市值</span>
                            <span class="stat-value">${stock.marketCap ? this.formatMarketCap(stock.marketCap) : 'N/A'}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">市盈率</span>
                            <span class="stat-value">${this.formatPE(stock.trailingPE)}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">52周最高</span>
                            <span class="stat-value">$${this.formatPrice(stock.fiftyTwoWeekHigh)}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">52周最低</span>
                            <span class="stat-value">$${this.formatPrice(stock.fiftyTwoWeekLow)}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">股息收益率</span>
                            <span class="stat-value">${this.formatDividendYield(stock.dividendYield)}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Beta值</span>
                            <span class="stat-value">${this.formatBeta(stock.beta)}</span>
                        </div>
                    </div>
                </div>
                
                <div class="actions">
                    <button class="btn btn-primary" data-action="add-to-watchlist">
                        添加到观察列表
                    </button>
                    <button class="btn btn-secondary" data-action="set-price-alert">
                        设置价格提醒
                    </button>
                </div>
            </div>
        `;
    }

    async initializeChart() {
        if (!this.stock?.symbol) return;

        try {
            // 检查LightweightCharts是否可用
            if (typeof window.LightweightCharts === 'undefined') {
                console.error('LightweightCharts not available');
                return;
            }

            // 获取图表容器
            this.chartContainer = this.shadowRoot.querySelector('#chartContainer');
            if (!this.chartContainer) return;

            // 清空容器
            this.chartContainer.innerHTML = '';

            // 创建图表
            this.chart = window.LightweightCharts.createChart(this.chartContainer, {
                width: this.chartContainer.clientWidth,
                height: 300,
                layout: {
                    background: { color: '#1e1e1e' },
                    textColor: '#d1d4dc',
                },
                grid: {
                    vertLines: { color: '#333' },
                    horzLines: { color: '#333' },
                },
                crosshair: {
                    mode: window.LightweightCharts.CrosshairMode.Normal,
                },
                rightPriceScale: {
                    borderColor: '#333',
                },
                timeScale: {
                    borderColor: '#333',
                },
            });

            // 获取当前颜色方案
            const app = window.app || { colorScheme: 'red-up-green-down' };
            const colors = this.getChartColors(app.colorScheme);

            // 创建蜡烛图系列
            this.candlestickSeries = this.chart.addSeries(window.LightweightCharts.CandlestickSeries, {
                upColor: colors.upColor,
                downColor: colors.downColor,
                borderDownColor: colors.downColor,
                borderUpColor: colors.upColor,
                wickDownColor: colors.downColor,
                wickUpColor: colors.upColor,
            });

            // 请求图表数据
            this.requestChartData();

        } catch (error) {
            console.error('初始化图表失败:', error);
            this.showChartError('图表初始化失败');
        }
    }

    async requestChartData() {
        if (!this.stock?.symbol) return;

        try {
            // 获取当前选择的时间范围和间隔
            const rangeSelect = this.shadowRoot.querySelector('.chart-range');
            const intervalSelect = this.shadowRoot.querySelector('.chart-interval');
            
            const range = rangeSelect?.value || '1mo';
            const interval = intervalSelect?.value || '1d';

            // 发送数据请求事件
            const requestEvent = new CustomEvent('chart-data-request', {
                detail: { symbol: this.stock.symbol, range, interval },
                bubbles: true
            });
            document.dispatchEvent(requestEvent);

        } catch (error) {
            console.error('请求图表数据失败:', error);
            this.showChartError('请求数据失败');
        }
    }

    updateChartData(data) {
        if (!this.candlestickSeries || !data) return;

        try {
            // 转换数据格式
            const chartData = data.map(item => ({
                time: item.timestamp || item.time || Date.now() / 1000,
                open: parseFloat(item.open) || 0,
                high: parseFloat(item.high) || 0,
                low: parseFloat(item.low) || 0,
                close: parseFloat(item.close) || 0,
            }));

            // 更新图表数据
            this.candlestickSeries.setData(chartData);
            this.chart.timeScale().fitContent();

            // 隐藏加载状态
            this.hideChartLoading();

        } catch (error) {
            console.error('更新图表数据失败:', error);
            this.showChartError('更新数据失败');
        }
    }

    // 隐藏图表加载状态
    hideChartLoading() {
        if (!this.chartContainer) return;
        
        const loadingEl = this.chartContainer.querySelector('.chart-loading');
        if (loadingEl) {
            loadingEl.style.display = 'none';
        }
    }

    showChartError(message) {
        if (!this.chartContainer) return;
        
        this.chartContainer.innerHTML = `
            <div class="chart-error">
                <i class="fas fa-exclamation-triangle"></i>
                <span>${message}</span>
            </div>
        `;
    }

    destroyChart() {
        if (this.chart) {
            this.chart.remove();
            this.chart = null;
            this.candlestickSeries = null;
        }
    }

    formatMarketCap(marketCap) {
        if (!marketCap) return 'N/A';
        
        const value = parseFloat(marketCap);
        if (value >= 1e12) {
            return `$${(value / 1e12).toFixed(2)}T`;
        } else if (value >= 1e9) {
            return `$${(value / 1e9).toFixed(2)}B`;
        } else if (value >= 1e6) {
            return `$${(value / 1e6).toFixed(2)}M`;
        } else if (value >= 1e3) {
            return `$${(value / 1e3).toFixed(2)}K`;
        } else {
            return `$${value.toFixed(2)}`;
        }
    }

    // 开始实时更新
    startRealTimeUpdate() {
        if (!this.stock?.symbol) return;
        
        // 清除现有间隔
        this.stopRealTimeUpdate();
        
        // 立即执行一次更新
        this.updateStockData();
        
        // 根据股票类型和交易状态决定更新频率
        let updateFrequency;
        if (this.isCryptocurrency(this.stock.symbol)) {
            updateFrequency = 1000; // 加密货币1秒更新一次
        } else if (this.stock.marketState === 'REGULAR') {
            updateFrequency = 2000; // 交易时间内2秒更新一次
        } else {
            updateFrequency = 10000; // 非交易时间10秒更新一次
        }
        
        console.log(`开始实时更新: ${this.stock.symbol}, 频率: ${updateFrequency}ms`);
        
        this.updateInterval = setInterval(() => {
            this.updateStockData();
        }, updateFrequency);
    }

    // 停止实时更新
    stopRealTimeUpdate() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    // 更新股票数据
    async updateStockData() {
        if (!this.stock?.symbol || this.isUpdating) return;
        
        this.isUpdating = true;
        
        try {
            // 发送数据请求事件
            const requestEvent = new CustomEvent('stock-data-request', {
                detail: { symbol: this.stock.symbol },
                bubbles: true
            });
            document.dispatchEvent(requestEvent);
        } catch (error) {
            console.error('更新股票数据失败:', error);
        } finally {
            this.isUpdating = false;
        }
    }

    // 更新股票数据从响应
    updateStockDataFromResponse(newData) {
        if (!newData || !this.stock) return;
        
        // 更新股票数据
        this.stock = { ...this.stock, ...newData };
        
        // 只更新价格相关的DOM元素，不重新渲染整个模态框
        this.updatePriceDisplay();
        
        // 同时更新图表数据（如果图表已初始化）
        this.updateChartWithNewData(newData);
    }

    // 更新图表数据（不重新初始化）
    updateChartWithNewData(newData) {
        if (!this.chart || !this.candlestickSeries || !newData) return;

        try {
            // 获取当前图表数据
            const currentData = this.candlestickSeries.data();
            
            // 如果有新数据，更新最后一个数据点
            if (currentData && currentData.length > 0 && newData.price) {
                const lastIndex = currentData.length - 1;
                const lastDataPoint = currentData[lastIndex];
                
                // 获取当前时间戳
                const currentTime = Math.floor(Date.now() / 1000);
                
                // 检查是否需要更新最后一个数据点或添加新数据点
                const timeDiff = currentTime - lastDataPoint.time;
                
                // 根据时间间隔决定更新策略
                const interval = this.getCurrentInterval();
                const intervalSeconds = this.getIntervalSeconds(interval);
                
                if (timeDiff < intervalSeconds) { 
                    // 如果时间差小于当前间隔，更新最后一个数据点
                    const updatedDataPoint = {
                        ...lastDataPoint,
                        close: newData.price,
                        high: Math.max(lastDataPoint.high, newData.price),
                        low: Math.min(lastDataPoint.low, newData.price)
                    };
                    
                    // 更新图表数据
                    this.candlestickSeries.update(updatedDataPoint);
                    
                    // 添加价格变化动画效果
                    this.addPriceChangeAnimation(newData.price, lastDataPoint.close);
                } else { 
                    // 如果时间差大于当前间隔，添加新数据点
                    const newDataPoint = {
                        time: currentTime,
                        open: lastDataPoint.close, // 新数据点的开盘价是上一个数据点的收盘价
                        high: newData.price,
                        low: newData.price,
                        close: newData.price
                    };
                    
                    // 添加新数据点
                    this.candlestickSeries.update(newDataPoint);
                    
                    // 添加价格变化动画效果
                    this.addPriceChangeAnimation(newData.price, lastDataPoint.close);
                }
            }
        } catch (error) {
            console.error('更新图表数据失败:', error);
        }
    }

    // 更新价格显示
    updatePriceDisplay() {
        if (!this.stock || !this.shadowRoot) return;

        const stock = this.stock;
        const isPositive = stock.change >= 0;
        const changeClass = isPositive ? 'positive' : 'negative';
        
        // 获取全局颜色方案
        const app = window.app || { colorScheme: 'red-up-green-down' };
        const positiveColor = this.getChangeColor(true, app.colorScheme);
        const negativeColor = this.getChangeColor(false, app.colorScheme);

        // 更新当前价格
        const currentPriceEl = this.shadowRoot.querySelector('.current-price');
        if (currentPriceEl) {
            currentPriceEl.textContent = `$${this.formatPrice(stock.price)}`;
        }

        // 更新涨跌幅
        const priceChangeEl = this.shadowRoot.querySelector('.price-change');
        if (priceChangeEl) {
            priceChangeEl.textContent = `${isPositive ? '+' : ''}${this.formatChange(stock.change)}`;
            priceChangeEl.className = `price-change ${changeClass}`;
        }

        // 更新涨跌幅百分比
        const priceChangePercentEl = this.shadowRoot.querySelector('.price-change-percent');
        if (priceChangePercentEl) {
            priceChangePercentEl.textContent = `(${isPositive ? '+' : ''}${this.formatChangePercent(stock.changePercent)}%)`;
            priceChangePercentEl.className = `price-change-percent ${changeClass}`;
        }

        // 更新统计数据
        this.updateStatsDisplay();
        
        // 更新颜色变量
        this.updateColorVariables();
    }

    // 格式化价格显示，根据数值大小动态保留小数位
    formatPrice(price) {
        if (price === null || price === undefined || isNaN(price)) {
            return '0.00';
        }
        
        const num = Math.abs(price);
        
        // 根据数值大小确定小数位数
        let decimals;
        if (num >= 1000) {
            decimals = 2; // >= 1000 保留2位小数
        } else if (num >= 100) {
            decimals = 2; // >= 100 保留2位小数
        } else if (num >= 10) {
            decimals = 2; // >= 10 保留2位小数
        } else if (num >= 1) {
            decimals = 3; // >= 1 保留3位小数
        } else if (num >= 0.1) {
            decimals = 4; // >= 0.1 保留4位小数
        } else if (num >= 0.01) {
            decimals = 5; // >= 0.01 保留5位小数
        } else if (num >= 0.001) {
            decimals = 6; // >= 0.001 保留6位小数
        } else if (num >= 0.0001) {
            decimals = 7; // >= 0.0001 保留7位小数
        } else if (num >= 0.00001) {
            decimals = 8; // >= 0.00001 保留8位小数
        } else {
            decimals = 8; // 其他情况保留8位小数
        }
        
        return price.toFixed(decimals);
    }

    // 格式化涨跌幅显示
    formatChange(change) {
        if (change === null || change === undefined || isNaN(change)) {
            return '0.00';
        }
        
        const num = Math.abs(change);
        
        // 涨跌幅通常保留2-4位小数
        let decimals;
        if (num >= 100) {
            decimals = 2; // >= 100 保留2位小数
        } else if (num >= 10) {
            decimals = 2; // >= 10 保留2位小数
        } else if (num >= 1) {
            decimals = 3; // >= 1 保留3位小数
        } else if (num >= 0.1) {
            decimals = 4; // >= 0.1 保留4位小数
        } else {
            decimals = 5; // 其他情况保留5位小数
        }
        
        return change.toFixed(decimals);
    }

    // 格式化涨跌幅百分比显示
    formatChangePercent(changePercent) {
        if (changePercent === null || changePercent === undefined || isNaN(changePercent)) {
            return '0.00';
        }
        
        const num = Math.abs(changePercent);
        
        // 百分比通常保留2-3位小数
        let decimals;
        if (num >= 100) {
            decimals = 2; // >= 100% 保留2位小数
        } else if (num >= 10) {
            decimals = 2; // >= 10% 保留2位小数
        } else if (num >= 1) {
            decimals = 2; // >= 1% 保留2位小数
        } else {
            decimals = 3; // 其他情况保留3位小数
        }
        
        return changePercent.toFixed(decimals);
    }

    // 格式化市盈率显示
    formatPE(pe) {
        if (pe === null || pe === undefined || isNaN(pe)) {
            return 'N/A';
        }
        
        const num = Math.abs(pe);
        
        // 市盈率通常保留2-3位小数
        let decimals;
        if (num >= 100) {
            decimals = 2; // >= 100 保留2位小数
        } else if (num >= 10) {
            decimals = 2; // >= 10 保留2位小数
        } else if (num >= 1) {
            decimals = 2; // >= 1 保留2位小数
        } else {
            decimals = 3; // 其他情况保留3位小数
        }
        
        return pe.toFixed(decimals);
    }

    // 格式化股息收益率显示
    formatDividendYield(dividendYield) {
        if (dividendYield === null || dividendYield === undefined || isNaN(dividendYield)) {
            return 'N/A';
        }
        
        const percentage = dividendYield * 100;
        const num = Math.abs(percentage);
        
        // 股息收益率通常保留2-3位小数
        let decimals;
        if (num >= 10) {
            decimals = 2; // >= 10% 保留2位小数
        } else if (num >= 1) {
            decimals = 2; // >= 1% 保留2位小数
        } else {
            decimals = 3; // 其他情况保留3位小数
        }
        
        return percentage.toFixed(decimals) + '%';
    }

    // 格式化Beta值显示
    formatBeta(beta) {
        if (beta === null || beta === undefined || isNaN(beta)) {
            return 'N/A';
        }
        
        const num = Math.abs(beta);
        
        // Beta值通常保留2-3位小数
        let decimals;
        if (num >= 10) {
            decimals = 2; // >= 10 保留2位小数
        } else if (num >= 1) {
            decimals = 2; // >= 1 保留2位小数
        } else {
            decimals = 3; // 其他情况保留3位小数
        }
        
        return beta.toFixed(decimals);
    }

    // 获取涨跌颜色
    getChangeColor(isPositive, colorScheme) {
        if (colorScheme === 'red-up-green-down') {
            return isPositive ? '#f44336' : '#4caf50'; // 红涨绿跌
        } else {
            return isPositive ? '#4caf50' : '#f44336'; // 绿涨红跌
        }
    }

    // 获取图表颜色
    getChartColors(colorScheme) {
        if (colorScheme === 'red-up-green-down') {
            return {
                upColor: '#f44336',    // 红涨
                downColor: '#4caf50'   // 绿跌
            };
        } else {
            return {
                upColor: '#4caf50',    // 绿涨
                downColor: '#f44336'   // 红跌
            };
        }
    }

    // 更新统计数据显示
    updateStatsDisplay() {
        if (!this.stock || !this.shadowRoot) return;

        const stock = this.stock;

        // 更新开盘价
        const openEl = this.shadowRoot.querySelector('.stat-item:nth-child(1) .stat-value');
        if (openEl) {
            openEl.textContent = `$${this.formatPrice(stock.open)}`;
        }

        // 更新最高价
        const highEl = this.shadowRoot.querySelector('.stat-item:nth-child(2) .stat-value');
        if (highEl) {
            highEl.textContent = `$${this.formatPrice(stock.dayHigh || stock.high)}`;
        }

        // 更新最低价
        const lowEl = this.shadowRoot.querySelector('.stat-item:nth-child(3) .stat-value');
        if (lowEl) {
            lowEl.textContent = `$${this.formatPrice(stock.dayLow || stock.low)}`;
        }

        // 更新前收盘价
        const prevCloseEl = this.shadowRoot.querySelector('.stat-item:nth-child(4) .stat-value');
        if (prevCloseEl) {
            prevCloseEl.textContent = `$${this.formatPrice(stock.previousClose)}`;
        }

        // 更新成交量
        const volumeEl = this.shadowRoot.querySelector('.stat-item:nth-child(5) .stat-value');
        if (volumeEl) {
            volumeEl.textContent = (stock.volume || 0).toLocaleString();
        }

        // 更新平均成交量
        const avgVolumeEl = this.shadowRoot.querySelector('.stat-item:nth-child(6) .stat-value');
        if (avgVolumeEl) {
            avgVolumeEl.textContent = (stock.averageVolume || 0).toLocaleString();
        }

        // 更新市值
        const marketCapEl = this.shadowRoot.querySelector('.stat-item:nth-child(7) .stat-value');
        if (marketCapEl) {
            marketCapEl.textContent = stock.marketCap ? this.formatMarketCap(stock.marketCap) : 'N/A';
        }

        // 更新市盈率
        const peEl = this.shadowRoot.querySelector('.stat-item:nth-child(8) .stat-value');
        if (peEl) {
            peEl.textContent = this.formatPE(stock.trailingPE);
        }

        // 更新52周最高
        const weekHighEl = this.shadowRoot.querySelector('.stat-item:nth-child(9) .stat-value');
        if (weekHighEl) {
            weekHighEl.textContent = `$${this.formatPrice(stock.fiftyTwoWeekHigh)}`;
        }

        // 更新52周最低
        const weekLowEl = this.shadowRoot.querySelector('.stat-item:nth-child(10) .stat-value');
        if (weekLowEl) {
            weekLowEl.textContent = `$${this.formatPrice(stock.fiftyTwoWeekLow)}`;
        }

        // 更新股息收益率
        const dividendEl = this.shadowRoot.querySelector('.stat-item:nth-child(11) .stat-value');
        if (dividendEl) {
            dividendEl.textContent = this.formatDividendYield(stock.dividendYield);
        }

        // 更新Beta值
        const betaEl = this.shadowRoot.querySelector('.stat-item:nth-child(12) .stat-value');
        if (betaEl) {
            betaEl.textContent = this.formatBeta(stock.beta);
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

    // 更新颜色
    updateColors() {
        if (!this.stock || !this.shadowRoot) return;
        
        // 重新渲染以应用新的颜色方案
        this.render();
        
        // 确保颜色变量被正确设置
        this.updateColorVariables();
        
        // 更新图表颜色
        this.updateChartColors();
    }

    // 更新图表颜色
    updateChartColors() {
        if (!this.chart || !this.candlestickSeries) return;
        
        const app = window.app || { colorScheme: 'red-up-green-down' };
        const colors = this.getChartColors(app.colorScheme);
        
        // 更新蜡烛图系列颜色
        this.candlestickSeries.applyOptions({
            upColor: colors.upColor,
            downColor: colors.downColor,
            borderDownColor: colors.downColor,
            borderUpColor: colors.upColor,
            wickDownColor: colors.downColor,
            wickUpColor: colors.upColor,
        });
        
        console.log(`图表颜色已更新: ${app.colorScheme}, 涨色: ${colors.upColor}, 跌色: ${colors.downColor}`);
    }

    // 获取当前时间间隔
    getCurrentInterval() {
        const intervalSelect = this.shadowRoot.querySelector('.chart-interval');
        return intervalSelect?.value || '1d';
    }

    // 获取时间间隔对应的秒数
    getIntervalSeconds(interval) {
        const intervalMap = {
            '1m': 60,      // 1分钟
            '5m': 300,     // 5分钟
            '15m': 900,    // 15分钟
            '30m': 1800,   // 30分钟
            '1h': 3600,    // 1小时
            '4h': 14400,   // 4小时
            '1d': 86400,   // 1天
            '1w': 604800,  // 1周
            '1mo': 2592000 // 1月
        };
        return intervalMap[interval] || 86400; // 默认1天
    }

    // 添加价格变化动画效果
    addPriceChangeAnimation(newPrice, oldPrice) {
        if (!this.chart || !this.candlestickSeries) return;
        
        // 计算价格变化
        const priceChange = newPrice - oldPrice;
        const isPositive = priceChange >= 0;
        
        // 获取当前颜色方案
        const app = window.app || { colorScheme: 'red-up-green-down' };
        const colors = this.getChartColors(app.colorScheme);
        
        // 只记录价格变化，不改变颜色
        console.log(`价格变化: ${oldPrice} -> ${newPrice} (${isPositive ? '涨' : '跌'}), 当前颜色方案: ${app.colorScheme}`);
        
        // 确保颜色方案保持一致
        this.candlestickSeries.applyOptions({
            upColor: colors.upColor,
            downColor: colors.downColor,
            borderDownColor: colors.downColor,
            borderUpColor: colors.upColor,
            wickDownColor: colors.downColor,
            wickUpColor: colors.upColor,
        });
    }

    // 更新颜色变量
    updateColorVariables() {
        if (!this.stock || !this.shadowRoot) return;
        
        const isPositive = this.stock.change >= 0;
        const app = window.app || { colorScheme: 'red-up-green-down' };
        const positiveColor = this.getChangeColor(true, app.colorScheme);
        const negativeColor = this.getChangeColor(false, app.colorScheme);
        
        // 更新CSS变量
        this.style.setProperty('--positive-color', positiveColor);
        this.style.setProperty('--negative-color', negativeColor);
        this.style.setProperty('--price-color', isPositive ? positiveColor : negativeColor);
    }
}

customElements.define('stock-modal', StockModal);