// 图表容器组件
export class ChartContainer extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.chart = null;
        this.candlestickSeries = null;
        this.currentSymbol = null;
        this.currentRange = '1mo';
        this.currentInterval = '1d';
        this.isLoading = false;
    }

    static get observedAttributes() {
        return ['symbol', 'range', 'interval'];
    }

    connectedCallback() {
        this.render();
        this.setupEventListeners();
    }

    disconnectedCallback() {
        this.cleanup();
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue !== newValue) {
            if (name === 'symbol' && newValue) {
                this.loadChart(newValue);
            } else if (name === 'range' || name === 'interval') {
                this.updateChart();
            }
        }
    }

    setSymbol(symbol) {
        this.currentSymbol = symbol;
        this.setAttribute('symbol', symbol);
        this.loadChart(symbol);
    }

    setRange(range) {
        this.currentRange = range;
        this.setAttribute('range', range);
        this.updateChart();
    }

    setInterval(interval) {
        this.currentInterval = interval;
        this.setAttribute('interval', interval);
        this.updateChart();
    }

    async loadChart(symbol) {
        if (!symbol) return;

        this.showLoading();
        
        try {
            // 动态导入 LightweightCharts
            const { createChart } = await import('../lib/lightweight-charts.js');
            
            // 创建图表容器
            const container = this.shadowRoot.querySelector('#chart-container');
            if (this.chart) {
                this.chart.remove();
            }

            this.chart = createChart(container, {
                width: container.clientWidth,
                height: 400,
                layout: {
                    background: { color: '#1e1e1e' },
                    textColor: '#d1d4dc',
                },
                grid: {
                    vertLines: { color: '#2B2B43' },
                    horzLines: { color: '#2B2B43' },
                },
                crosshair: {
                    mode: 1,
                },
                rightPriceScale: {
                    borderColor: '#485c7b',
                },
                timeScale: {
                    borderColor: '#485c7b',
                },
            });

            // 创建蜡烛图系列
            this.candlestickSeries = this.chart.addCandlestickSeries({
                upColor: '#4caf50',
                downColor: '#f44336',
                borderDownColor: '#f44336',
                borderUpColor: '#4caf50',
                wickDownColor: '#f44336',
                wickUpColor: '#4caf50',
            });

            // 加载数据
            await this.loadChartData(symbol);
            
            this.hideLoading();
        } catch (error) {
            console.error('加载图表失败:', error);
            this.showError('图表加载失败');
        }
    }

    async loadChartData(symbol) {
        if (!this.chart || !this.candlestickSeries) return;

        try {
            // 这里需要从外部获取数据，通过事件或属性传递
            const event = new CustomEvent('chart-data-request', {
                detail: { symbol, range: this.currentRange, interval: this.currentInterval },
                bubbles: true
            });
            this.dispatchEvent(event);

            // 监听数据响应
            this.addEventListener('chart-data-response', this.handleChartData.bind(this), { once: true });
        } catch (error) {
            console.error('加载图表数据失败:', error);
            this.showError('数据加载失败');
        }
    }

    handleChartData(event) {
        const { data } = event.detail;
        if (data && data.length > 0) {
            const chartData = data.map(item => ({
                time: item.timestamp,
                open: item.open,
                high: item.high,
                low: item.low,
                close: item.close
            }));

            this.candlestickSeries.setData(chartData);
            this.chart.timeScale().fitContent();
        }
    }

    updateChart() {
        if (this.currentSymbol) {
            this.loadChartData(this.currentSymbol);
        }
    }

    showLoading() {
        this.isLoading = true;
        this.render();
    }

    hideLoading() {
        this.isLoading = false;
        this.render();
    }

    showError(message) {
        this.isLoading = false;
        const errorDiv = this.shadowRoot.querySelector('#error-message');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
        }
    }

    setupEventListeners() {
        // 监听窗口大小变化
        window.addEventListener('resize', () => {
            if (this.chart) {
                const container = this.shadowRoot.querySelector('#chart-container');
                this.chart.applyOptions({ width: container.clientWidth });
            }
        });
    }

    cleanup() {
        if (this.chart) {
            this.chart.remove();
            this.chart = null;
        }
        this.candlestickSeries = null;
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    background: #1e1e1e;
                    border-radius: 8px;
                    padding: 16px;
                    margin: 16px 0;
                }

                .chart-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 16px;
                }

                .chart-title {
                    font-size: 18px;
                    font-weight: 600;
                    color: #fff;
                    margin: 0;
                }

                .chart-controls {
                    display: flex;
                    gap: 12px;
                    align-items: center;
                }

                .control-group {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .control-group label {
                    color: #d1d4dc;
                    font-size: 12px;
                    font-weight: 500;
                }

                select {
                    padding: 6px 12px;
                    border: 1px solid #555;
                    border-radius: 4px;
                    background: #2a2a2a;
                    color: #d1d4dc;
                    font-size: 12px;
                    cursor: pointer;
                }

                select:focus {
                    outline: none;
                    border-color: #667eea;
                }

                #chart-container {
                    width: 100%;
                    height: 400px;
                    position: relative;
                }

                .loading {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    height: 400px;
                    color: #d1d4dc;
                    font-size: 14px;
                    gap: 10px;
                }

                .loading i {
                    animation: spin 1s linear infinite;
                }

                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }

                #error-message {
                    display: none;
                    color: #f44336;
                    text-align: center;
                    padding: 20px;
                    background: rgba(244, 67, 54, 0.1);
                    border-radius: 4px;
                    margin-top: 16px;
                }
            </style>
            
            <div class="chart-header">
                <h3 class="chart-title">K线图</h3>
                <div class="chart-controls">
                    <div class="control-group">
                        <label for="range-select">时间范围:</label>
                        <select id="range-select">
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
                    </div>
                    <div class="control-group">
                        <label for="interval-select">时间间隔:</label>
                        <select id="interval-select">
                            <option value="1m">1分钟</option>
                            <option value="5m">5分钟</option>
                            <option value="15m">15分钟</option>
                            <option value="30m">30分钟</option>
                            <option value="1h">1小时</option>
                            <option value="1d" selected>1天</option>
                            <option value="1wk">1周</option>
                            <option value="1mo">1月</option>
                        </select>
                    </div>
                </div>
            </div>
            
            <div id="chart-container"></div>
            
            ${this.isLoading ? `
                <div class="loading">
                    <i class="fas fa-spinner"></i>
                    <span>正在加载图表数据...</span>
                </div>
            ` : ''}
            
            <div id="error-message"></div>
        `;

        // 设置选择器事件监听器
        const rangeSelect = this.shadowRoot.querySelector('#range-select');
        const intervalSelect = this.shadowRoot.querySelector('#interval-select');

        if (rangeSelect) {
            rangeSelect.value = this.currentRange;
            rangeSelect.addEventListener('change', (e) => {
                this.setRange(e.target.value);
            });
        }

        if (intervalSelect) {
            intervalSelect.value = this.currentInterval;
            intervalSelect.addEventListener('change', (e) => {
                this.setInterval(e.target.value);
            });
        }
    }
}

customElements.define('chart-container', ChartContainer);