// K线图（蜡烛图）组件
class CandlestickChart extends BaseComponent {
    constructor() {
        super();
        this.canvas = null;
        this.ctx = null;
        this.chartData = [];
        this.candlesticks = [];
        this.mouseX = 0;
        this.mouseY = 0;
        this.hoveredCandle = null;
        this.zoomLevel = 1;
        this.panOffset = 0;
        this.isDragging = false;
        this.lastMouseX = 0;
    }

    render() {
        const { data = [], width = 400, height = 300 } = this.props;
        
        this.shadowRoot.innerHTML = `
            ${this.getStyles()}
            <div class="candlestick-chart">
                <div class="chart-header">
                    <h3>K线图</h3>
                    <div class="chart-controls">
                        <button class="btn-sm" id="zoomIn">放大</button>
                        <button class="btn-sm" id="zoomOut">缩小</button>
                        <button class="btn-sm" id="resetZoom">重置</button>
                    </div>
                </div>
                <div class="chart-container">
                    <canvas id="candlestickCanvas" width="${width}" height="${height}"></canvas>
                    <div class="chart-tooltip" id="tooltip"></div>
                </div>
                <div class="chart-info">
                    <div class="price-info">
                        <span id="currentPrice">-</span>
                        <span id="priceChange">-</span>
                    </div>
                    <div class="volume-info">
                        <span>成交量: </span>
                        <span id="currentVolume">-</span>
                    </div>
                </div>
            </div>
        `;

        this.canvas = this.shadowRoot.querySelector('#candlestickCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.chartData = data;
        this.processData();
        this.setupEventListeners();
        this.drawChart();
    }

    processData() {
        this.candlesticks = this.chartData.map((item, index) => ({
            index,
            timestamp: item.timestamp,
            date: item.date,
            open: item.open,
            high: item.high,
            low: item.low,
            close: item.close,
            volume: item.volume,
            x: 0, // 将在drawChart中计算
            y: 0, // 将在drawChart中计算
            width: 0, // 将在drawChart中计算
            height: 0 // 将在drawChart中计算
        }));
    }

    setupEventListeners() {
        // 鼠标移动事件
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouseX = e.clientX - rect.left;
            this.mouseY = e.clientY - rect.top;
            this.updateTooltip();
        });

        // 鼠标离开事件
        this.canvas.addEventListener('mouseleave', () => {
            this.hoveredCandle = null;
            this.hideTooltip();
        });

        // 鼠标按下事件（拖拽）
        this.canvas.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            this.lastMouseX = e.clientX;
        });

        // 鼠标移动事件（拖拽）
        this.canvas.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                const deltaX = e.clientX - this.lastMouseX;
                this.panOffset += deltaX;
                this.lastMouseX = e.clientX;
                this.drawChart();
            }
        });

        // 鼠标释放事件
        this.canvas.addEventListener('mouseup', () => {
            this.isDragging = false;
        });

        // 滚轮缩放事件
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            this.zoomLevel *= delta;
            this.zoomLevel = Math.max(0.1, Math.min(5, this.zoomLevel));
            this.drawChart();
        });

        // 控制按钮事件
        const zoomInBtn = this.shadowRoot.querySelector('#zoomIn');
        const zoomOutBtn = this.shadowRoot.querySelector('#zoomOut');
        const resetZoomBtn = this.shadowRoot.querySelector('#resetZoom');

        zoomInBtn.addEventListener('click', () => {
            this.zoomLevel *= 1.2;
            this.zoomLevel = Math.min(5, this.zoomLevel);
            this.drawChart();
        });

        zoomOutBtn.addEventListener('click', () => {
            this.zoomLevel *= 0.8;
            this.zoomLevel = Math.max(0.1, this.zoomLevel);
            this.drawChart();
        });

        resetZoomBtn.addEventListener('click', () => {
            this.zoomLevel = 1;
            this.panOffset = 0;
            this.drawChart();
        });
    }

    drawChart() {
        if (!this.ctx || this.candlesticks.length === 0) return;

        const canvas = this.canvas;
        const ctx = this.ctx;
        const width = canvas.width;
        const height = canvas.height;

        // 清除画布
        ctx.clearRect(0, 0, width, height);

        // 计算价格范围
        const prices = this.candlesticks.flatMap(candle => [candle.high, candle.low]);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const priceRange = maxPrice - minPrice;
        const padding = priceRange * 0.1; // 10% 边距
        const chartMinPrice = minPrice - padding;
        const chartMaxPrice = maxPrice + padding;
        const chartPriceRange = chartMaxPrice - chartMinPrice;

        // 计算蜡烛宽度和间距
        const visibleCandles = Math.floor(width / (20 * this.zoomLevel));
        const candleWidth = Math.max(2, Math.min(20, (width - 60) / visibleCandles * this.zoomLevel));
        const candleSpacing = candleWidth + 2;

        // 绘制网格线
        this.drawGrid(ctx, width, height, chartMinPrice, chartMaxPrice);

        // 绘制蜡烛
        this.candlesticks.forEach((candle, index) => {
            const x = 30 + index * candleSpacing + this.panOffset;
            
            // 只绘制可见范围内的蜡烛
            if (x > -candleWidth && x < width + candleWidth) {
                candle.x = x;
                candle.width = candleWidth;
                
                // 计算Y坐标
                const highY = height - 20 - ((candle.high - chartMinPrice) / chartPriceRange) * (height - 40);
                const lowY = height - 20 - ((candle.low - chartMinPrice) / chartPriceRange) * (height - 40);
                const openY = height - 20 - ((candle.open - chartMinPrice) / chartPriceRange) * (height - 40);
                const closeY = height - 20 - ((candle.close - chartMinPrice) / chartPriceRange) * (height - 40);

                candle.highY = highY;
                candle.lowY = lowY;
                candle.openY = openY;
                candle.closeY = closeY;

                // 绘制蜡烛
                this.drawCandlestick(ctx, candle, x, candleWidth);
            }
        });

        // 绘制价格标签
        this.drawPriceLabels(ctx, width, height, chartMinPrice, chartMaxPrice);
    }

    drawGrid(ctx, width, height, minPrice, maxPrice) {
        ctx.strokeStyle = '#f0f0f0';
        ctx.lineWidth = 1;

        // 水平网格线
        const priceLevels = 5;
        for (let i = 0; i <= priceLevels; i++) {
            const y = 20 + (i / priceLevels) * (height - 40);
            ctx.beginPath();
            ctx.moveTo(30, y);
            ctx.lineTo(width - 10, y);
            ctx.stroke();
        }

        // 垂直网格线
        const timeLevels = 8;
        for (let i = 0; i <= timeLevels; i++) {
            const x = 30 + (i / timeLevels) * (width - 40);
            ctx.beginPath();
            ctx.moveTo(x, 20);
            ctx.lineTo(x, height - 20);
            ctx.stroke();
        }
    }

    drawCandlestick(ctx, candle, x, width) {
        const isBullish = candle.close >= candle.open;
        const bodyTop = Math.min(candle.openY, candle.closeY);
        const bodyBottom = Math.max(candle.openY, candle.closeY);
        const bodyHeight = bodyBottom - bodyTop;

        // 绘制影线（上下影线）
        ctx.strokeStyle = isBullish ? '#26a69a' : '#ef5350';
        ctx.lineWidth = 1;
        
        // 上影线
        ctx.beginPath();
        ctx.moveTo(x + width / 2, candle.highY);
        ctx.lineTo(x + width / 2, bodyTop);
        ctx.stroke();

        // 下影线
        ctx.beginPath();
        ctx.moveTo(x + width / 2, bodyBottom);
        ctx.lineTo(x + width / 2, candle.lowY);
        ctx.stroke();

        // 绘制实体（蜡烛体）
        if (isBullish) {
            // 阳线（上涨）- 空心或绿色
            ctx.strokeStyle = '#26a69a';
            ctx.fillStyle = 'rgba(38, 166, 154, 0.1)';
        } else {
            // 阴线（下跌）- 实心或红色
            ctx.strokeStyle = '#ef5350';
            ctx.fillStyle = '#ef5350';
        }

        ctx.lineWidth = 1;
        
        // 绘制蜡烛体
        if (bodyHeight > 0) {
            ctx.fillRect(x + 1, bodyTop, width - 2, bodyHeight);
            ctx.strokeRect(x + 1, bodyTop, width - 2, bodyHeight);
        } else {
            // 十字星（开盘价等于收盘价）
            ctx.beginPath();
            ctx.moveTo(x + 1, candle.openY);
            ctx.lineTo(x + width - 1, candle.openY);
            ctx.stroke();
        }
    }

    drawPriceLabels(ctx, width, height, minPrice, maxPrice) {
        ctx.fillStyle = '#666';
        ctx.font = '10px Arial';
        ctx.textAlign = 'right';

        const priceLevels = 5;
        for (let i = 0; i <= priceLevels; i++) {
            const price = minPrice + (i / priceLevels) * (maxPrice - minPrice);
            const y = 20 + (i / priceLevels) * (height - 40);
            ctx.fillText(price.toFixed(2), 25, y + 3);
        }
    }

    updateTooltip() {
        const tooltip = this.shadowRoot.querySelector('#tooltip');
        const currentPrice = this.shadowRoot.querySelector('#currentPrice');
        const priceChange = this.shadowRoot.querySelector('#priceChange');
        const currentVolume = this.shadowRoot.querySelector('#currentVolume');

        // 找到鼠标悬停的蜡烛
        this.hoveredCandle = null;
        for (const candle of this.candlesticks) {
            if (candle.x && this.mouseX >= candle.x && this.mouseX <= candle.x + candle.width) {
                this.hoveredCandle = candle;
                break;
            }
        }

        if (this.hoveredCandle) {
            const candle = this.hoveredCandle;
            const change = candle.close - candle.open;
            const changePercent = (change / candle.open) * 100;

            // 更新价格信息
            currentPrice.textContent = `$${candle.close.toFixed(2)}`;
            priceChange.textContent = `${change >= 0 ? '+' : ''}$${change.toFixed(2)} (${changePercent.toFixed(2)}%)`;
            priceChange.className = change >= 0 ? 'positive' : 'negative';
            currentVolume.textContent = candle.volume.toLocaleString();

            // 显示工具提示
            tooltip.style.display = 'block';
            tooltip.style.left = `${candle.x + candle.width / 2}px`;
            tooltip.style.top = `${candle.highY - 10}px`;
            tooltip.innerHTML = `
                <div class="tooltip-content">
                    <div class="tooltip-date">${candle.date.toLocaleDateString()}</div>
                    <div class="tooltip-price">开盘: $${candle.open.toFixed(2)}</div>
                    <div class="tooltip-price">最高: $${candle.high.toFixed(2)}</div>
                    <div class="tooltip-price">最低: $${candle.low.toFixed(2)}</div>
                    <div class="tooltip-price">收盘: $${candle.close.toFixed(2)}</div>
                    <div class="tooltip-volume">成交量: ${candle.volume.toLocaleString()}</div>
                </div>
            `;
        } else {
            this.hideTooltip();
        }
    }

    hideTooltip() {
        const tooltip = this.shadowRoot.querySelector('#tooltip');
        tooltip.style.display = 'none';
    }

    getStyles() {
        return `
            <style>
                .candlestick-chart {
                    background: #1e1e1e;
                    border-radius: 8px;
                    padding: 16px;
                    color: white;
                }
                
                .chart-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 16px;
                }
                
                .chart-header h3 {
                    margin: 0;
                    font-size: 16px;
                    color: white;
                }
                
                .chart-controls {
                    display: flex;
                    gap: 8px;
                }
                
                .btn-sm {
                    padding: 4px 8px;
                    font-size: 12px;
                    border: 1px solid #444;
                    background: #333;
                    color: white;
                    border-radius: 4px;
                    cursor: pointer;
                    transition: background 0.2s;
                }
                
                .btn-sm:hover {
                    background: #444;
                }
                
                .chart-container {
                    position: relative;
                    background: #2a2a2a;
                    border-radius: 4px;
                    overflow: hidden;
                }
                
                #candlestickCanvas {
                    display: block;
                    cursor: crosshair;
                }
                
                .chart-tooltip {
                    position: absolute;
                    background: rgba(0, 0, 0, 0.9);
                    color: white;
                    padding: 8px;
                    border-radius: 4px;
                    font-size: 12px;
                    pointer-events: none;
                    z-index: 1000;
                    display: none;
                    transform: translateX(-50%);
                }
                
                .tooltip-content {
                    white-space: nowrap;
                }
                
                .tooltip-date {
                    font-weight: bold;
                    margin-bottom: 4px;
                }
                
                .tooltip-price {
                    margin: 2px 0;
                }
                
                .tooltip-volume {
                    margin-top: 4px;
                    color: #ccc;
                }
                
                .chart-info {
                    display: flex;
                    justify-content: space-between;
                    margin-top: 12px;
                    font-size: 12px;
                }
                
                .price-info {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }
                
                .volume-info {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    color: #ccc;
                }
                
                .positive {
                    color: #26a69a;
                }
                
                .negative {
                    color: #ef5350;
                }
            </style>
        `;
    }
}

// 注册K线图组件
customElements.define('candlestick-chart', CandlestickChart);