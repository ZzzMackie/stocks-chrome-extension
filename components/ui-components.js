// 标签页组件
class StockTabs extends BaseComponent {
    render() {
        const { tabs = [], activeTab = 0 } = this.props;
        
        this.shadowRoot.innerHTML = `
            ${this.getStyles()}
            <div class="stock-tabs">
                <div class="tab-list">
                    ${tabs.map((tab, index) => `
                        <button class="tab ${index === activeTab ? 'active' : ''}" data-tab="${index}">
                            <i class="fas fa-${tab.icon}"></i>
                            <span>${tab.label}</span>
                        </button>
                    `).join('')}
                </div>
                <div class="tab-content">
                    <slot></slot>
                </div>
            </div>
        `;

        // 添加标签切换事件
        const tabButtons = this.shadowRoot.querySelectorAll('.tab');
        tabButtons.forEach((button, index) => {
            button.addEventListener('click', () => {
                this.dispatchEvent(new CustomEvent('tab-change', {
                    detail: { index, tab: tabs[index] }
                }));
            });
        });
    }

    getStyles() {
        return `
            <style>
                .stock-tabs {
                    width: 100%;
                }
                
                .tab-list {
                    display: flex;
                    background: #f8f9fa;
                    border-bottom: 1px solid #e9ecef;
                }
                
                .tab {
                    flex: 1;
                    background: none;
                    border: none;
                    padding: 12px 8px;
                    cursor: pointer;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 4px;
                    font-size: 12px;
                    color: #6c757d;
                    transition: all 0.2s;
                    position: relative;
                }
                
                .tab.active {
                    color: #667eea;
                    background: white;
                }
                
                .tab.active::after {
                    content: '';
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    height: 2px;
                    background: #667eea;
                }
                
                .tab i {
                    font-size: 16px;
                }
                
                .tab-content {
                    padding: 20px;
                    min-height: 400px;
                }
            </style>
        `;
    }
}

// 搜索组件
class StockSearch extends BaseComponent {
    render() {
        const { placeholder = '搜索股票、ETF、加密货币...' } = this.props;
        
        this.shadowRoot.innerHTML = `
            ${this.getStyles()}
            <div class="stock-search">
                <div class="search-container">
                    <i class="fas fa-search search-icon"></i>
                    <stock-input 
                        type="text" 
                        placeholder="${placeholder}"
                        class="search-input"
                    ></stock-input>
                    <stock-button 
                        type="primary" 
                        size="medium" 
                        icon="search"
                        class="search-btn"
                    ></stock-button>
                </div>
            </div>
        `;

        // 添加搜索事件
        const searchInput = this.shadowRoot.querySelector('stock-input');
        const searchBtn = this.shadowRoot.querySelector('stock-button');
        
        const performSearch = () => {
            const value = searchInput.shadowRoot.querySelector('input').value;
            this.dispatchEvent(new CustomEvent('search', {
                detail: { query: value }
            }));
        };

        searchBtn.addEventListener('click', performSearch);
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
    }

    getStyles() {
        return `
            <style>
                .stock-search {
                    padding: 16px 20px;
                    background: #f8f9fa;
                    border-bottom: 1px solid #e9ecef;
                }
                
                .search-container {
                    position: relative;
                    display: flex;
                    align-items: center;
                    background: white;
                    border-radius: 8px;
                    border: 2px solid #e9ecef;
                    transition: border-color 0.2s;
                }
                
                .search-container:focus-within {
                    border-color: #667eea;
                }
                
                .search-icon {
                    position: absolute;
                    left: 12px;
                    color: #6c757d;
                    z-index: 1;
                }
                
                .search-input {
                    flex: 1;
                    margin-left: 40px;
                }
                
                .search-input::part(input) {
                    border: none;
                    padding: 12px 12px 12px 0;
                }
                
                .search-btn {
                    margin-right: 4px;
                }
            </style>
        `;
    }
}

// 投资组合摘要组件
class PortfolioSummary extends BaseComponent {
    render() {
        const { totalValue = 0, totalGain = 0, totalGainPercent = 0, currency = 'USD' } = this.props;
        const isPositive = totalGain >= 0;
        
        this.shadowRoot.innerHTML = `
            ${this.getStyles()}
            <div class="portfolio-summary">
                <div class="summary-card">
                    <div class="summary-label">总价值</div>
                    <div class="summary-value">${this.formatPrice(totalValue, currency)}</div>
                </div>
                <div class="summary-card">
                    <div class="summary-label">总盈亏</div>
                    <div class="summary-value">${this.formatPrice(totalGain, currency)}</div>
                    <div class="summary-change ${isPositive ? 'positive' : 'negative'}">
                        ${this.formatChangePercent(totalGainPercent)}
                    </div>
                </div>
            </div>
        `;
    }

    getStyles() {
        return `
            <style>
                .portfolio-summary {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 12px;
                    margin-bottom: 20px;
                }
                
                .summary-card {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 16px;
                    border-radius: 8px;
                    text-align: center;
                }
                
                .summary-label {
                    font-size: 12px;
                    opacity: 0.8;
                    margin-bottom: 4px;
                }
                
                .summary-value {
                    font-size: 18px;
                    font-weight: 700;
                    margin-bottom: 4px;
                }
                
                .summary-change {
                    font-size: 12px;
                    opacity: 0.9;
                }
                
                .summary-change.positive {
                    color: #90EE90;
                }
                
                .summary-change.negative {
                    color: #FFB6C1;
                }
            </style>
        `;
    }

    formatPrice(price, currency) {
        const getDecimalPlaces = (value) => {
            const absValue = Math.abs(value);
            if (absValue >= 1) return 2;
            if (absValue >= 0.01) return 4;
            return 10;
        };
        
        const decimalPlaces = getDecimalPlaces(price);
        const symbol = currency === 'CNY' ? '¥' : '$';
        return `${symbol}${price.toFixed(decimalPlaces)}`;
    }

    formatChangePercent(changePercent) {
        const getDecimalPlaces = (value) => {
            const absValue = Math.abs(value);
            if (absValue >= 1) return 2;
            if (absValue >= 0.01) return 4;
            return 10;
        };
        
        const decimalPlaces = getDecimalPlaces(changePercent);
        return `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(decimalPlaces)}%`;
    }
}

// 市场状态组件
class MarketStatus extends BaseComponent {
    render() {
        const { status = 'unknown' } = this.props;
        
        const statusConfig = {
            'open': { text: '🟢 交易中', class: 'open' },
            'closed': { text: '🔴 休市', class: 'closed' },
            'pre-market': { text: '🟡 盘前交易', class: 'pre-market' },
            'after-hours': { text: '🟡 盘后交易', class: 'after-hours' },
            'unknown': { text: '❓ 状态未知', class: 'unknown' }
        };
        
        const config = statusConfig[status] || statusConfig['unknown'];
        
        this.shadowRoot.innerHTML = `
            ${this.getStyles()}
            <div class="market-status ${config.class}">
                ${config.text}
            </div>
        `;
    }

    getStyles() {
        return `
            <style>
                .market-status {
                    font-size: 11px;
                    padding: 2px 6px;
                    border-radius: 4px;
                    margin-right: 8px;
                    font-weight: 500;
                }
                
                .market-status.open {
                    background-color: #d4edda;
                    color: #155724;
                }
                
                .market-status.closed {
                    background-color: #f8d7da;
                    color: #721c24;
                }
                
                .market-status.pre-market,
                .market-status.after-hours {
                    background-color: #fff3cd;
                    color: #856404;
                }
                
                .market-status.unknown {
                    background-color: #e2e3e5;
                    color: #383d41;
                }
            </style>
        `;
    }
}

// 空状态组件
class EmptyState extends BaseComponent {
    render() {
        const { icon = 'inbox', title = '暂无数据', description = '请添加一些内容' } = this.props;
        
        this.shadowRoot.innerHTML = `
            ${this.getStyles()}
            <div class="empty-state">
                <i class="fas fa-${icon}"></i>
                <h3>${title}</h3>
                <p>${description}</p>
                <slot name="action"></slot>
            </div>
        `;
    }

    getStyles() {
        return `
            <style>
                .empty-state {
                    text-align: center;
                    padding: 40px 20px;
                    color: #6c757d;
                }
                
                .empty-state i {
                    font-size: 48px;
                    margin-bottom: 16px;
                    opacity: 0.5;
                }
                
                .empty-state h3 {
                    margin-bottom: 8px;
                    color: #333;
                }
                
                .empty-state p {
                    margin-bottom: 16px;
                }
            </style>
        `;
    }
}

// 注册所有组件
customElements.define('stock-tabs', StockTabs);
customElements.define('stock-search', StockSearch);
customElements.define('portfolio-summary', PortfolioSummary);
customElements.define('market-status', MarketStatus);
customElements.define('empty-state', EmptyState);