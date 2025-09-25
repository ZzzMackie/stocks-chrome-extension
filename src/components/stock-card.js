// 股票卡片组件
export class StockCard extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.stock = null;
        this.onClick = null;
    }

    static get observedAttributes() {
        return ['symbol', 'price', 'change', 'change-percent'];
    }

    connectedCallback() {
        // 从属性中获取股票数据
        this.stock = {
            symbol: this.getAttribute('symbol') || '',
            price: parseFloat(this.getAttribute('price')) || 0,
            change: parseFloat(this.getAttribute('change')) || 0,
            changePercent: parseFloat(this.getAttribute('change-percent')) || 0,
            currency: 'USD'
        };
        
        this.render();
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue !== newValue) {
            // 更新股票数据
            if (this.stock) {
                switch (name) {
                    case 'symbol':
                        this.stock.symbol = newValue || '';
                        break;
                    case 'price':
                        this.stock.price = parseFloat(newValue) || 0;
                        break;
                    case 'change':
                        this.stock.change = parseFloat(newValue) || 0;
                        break;
                    case 'change-percent':
                        this.stock.changePercent = parseFloat(newValue) || 0;
                        break;
                }
            }
            this.render();
        }
    }

    setStock(stock) {
        this.stock = stock;
        this.render();
    }

    setOnClick(callback) {
        this.onClick = callback;
    }

    render() {
        const stock = this.stock || {
            symbol: this.getAttribute('symbol') || '',
            price: parseFloat(this.getAttribute('price')) || 0,
            change: parseFloat(this.getAttribute('change')) || 0,
            changePercent: parseFloat(this.getAttribute('change-percent')) || 0,
            currency: 'USD'
        };

        const isPositive = stock.change >= 0;
        const changeClass = isPositive ? 'positive' : 'negative';
        const changeIcon = isPositive ? '↗' : '↘';
        
        // 获取全局颜色方案
        const app = window.app || { colorScheme: 'red-up-green-down' };
        const positiveColor = this.getChangeColor(true, app.colorScheme);
        const negativeColor = this.getChangeColor(false, app.colorScheme);

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    background: var(--card-bg, #1e1e1e);
                    border-radius: 8px;
                    padding: 16px;
                    margin-bottom: 12px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    border: 1px solid var(--card-border, #333);
                    --positive-color: ${positiveColor};
                    --negative-color: ${negativeColor};
                    --price-color: ${isPositive ? positiveColor : negativeColor};
                }

                :host(:hover) {
                    background: var(--card-bg-hover, #2a2a2a);
                    border-color: var(--card-border-hover, #555);
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                }

                .stock-card{
                    padding: 10px;
                }

                .stock-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 8px;
                }

                .symbol {
                    font-size: 16px;
                    font-weight: 600;
                    color: #fff;
                }

                .price {
                    font-size: 18px;
                    font-weight: 700;
                    color: var(--price-color, #fff);
                }

                .change-info {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .change {
                    font-size: 14px;
                    font-weight: 500;
                }

                .change.positive {
                    color: var(--positive-color, #4caf50);
                }

                .change.negative {
                    color: var(--negative-color, #f44336);
                }

                .change-icon {
                    font-size: 16px;
                }

                .change-icon.positive {
                    color: var(--positive-color, #4caf50);
                }

                .change-icon.negative {
                    color: var(--negative-color, #f44336);
                }

                /* 价格变化动画效果 */
                .price-up {
                    animation: priceUp 1s ease-out;
                }

                .price-down {
                    animation: priceDown 1s ease-out;
                }

                .change-up {
                    animation: changeUp 1s ease-out;
                }

                .change-down {
                    animation: changeDown 1s ease-out;
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

                @keyframes changeUp {
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

                @keyframes changeDown {
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
            </style>
            
            <div class="stock-card" onclick="this.dispatchEvent(new CustomEvent('stock-click', { detail: this.stock }))">
                <div class="stock-header">
                    <div class="symbol">${stock.symbol}</div>
                    <div class="price">$${this.formatPrice(stock.price)}</div>
                </div>
                <div class="change-info">
                    <span class="change-icon ${changeClass}">${changeIcon}</span>
                    <span class="change ${changeClass}">
                        ${isPositive ? '+' : ''}${this.formatChange(stock.change)} (${isPositive ? '+' : ''}${this.formatChangePercent(stock.changePercent)}%)
                    </span>
                </div>
            </div>
        `;

        // 添加点击事件监听器
        this.shadowRoot.querySelector('.stock-card').addEventListener('click', () => {
            if (this.onClick) {
                this.onClick(stock);
            }
            this.dispatchEvent(new CustomEvent('stock-click', { 
                detail: stock,
                bubbles: true 
            }));
        });
    }

    // 更新价格数据
    updatePrice(newData) {
        if (!newData) return;
        
        // 更新股票数据
        this.stock = { ...this.stock, ...newData };
        
        // 重新渲染
        this.render();
        
        // 更新颜色变量
        this.updateColorVariables();
    }

    // 更新颜色
    updateColors() {
        if (!this.stock || !this.shadowRoot) {
            console.warn('股票卡片更新颜色失败: 缺少股票数据或shadowRoot');
            return;
        }
        
        
        // 重新渲染以应用新的颜色方案
        this.render();
        
        // 确保颜色变量被正确设置
        this.updateColorVariables();
    }

    // 更新颜色变量
    updateColorVariables() {
        if (!this.stock || !this.shadowRoot) return;
        
        const isPositive = this.stock.change >= 0;
        const app = window.app || { colorScheme: 'red-up-green-down' };
        const positiveColor = this.getChangeColor(true, app.colorScheme);
        const negativeColor = this.getChangeColor(false, app.colorScheme);
        const priceColor = isPositive ? positiveColor : negativeColor;
        
        // 更新CSS变量
        this.style.setProperty('--positive-color', positiveColor);
        this.style.setProperty('--negative-color', negativeColor);
        this.style.setProperty('--price-color', priceColor);
        
        // 直接更新元素样式作为备用方案
        const priceElement = this.shadowRoot.querySelector('.price');
        const changeElement = this.shadowRoot.querySelector('.change');
        const changeIconElement = this.shadowRoot.querySelector('.change-icon');
        
        if (priceElement) {
            priceElement.style.color = priceColor;
        }
        
        if (changeElement) {
            changeElement.style.color = isPositive ? positiveColor : negativeColor;
        }
        
        if (changeIconElement) {
            changeIconElement.style.color = isPositive ? positiveColor : negativeColor;
        }
        
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

    // 获取涨跌颜色
    getChangeColor(isPositive, colorScheme) {
        if (colorScheme === 'red-up-green-down') {
            return isPositive ? '#f44336' : '#4caf50'; // 红涨绿跌
        } else {
            return isPositive ? '#4caf50' : '#f44336'; // 绿涨红跌
        }
    }
}

customElements.define('stock-card', StockCard);