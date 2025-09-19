// Web Components 基础类
class BaseComponent extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.state = {};
        this.props = {};
    }

    // 设置属性
    setProps(props) {
        this.props = { ...this.props, ...props };
        this.render();
    }

    // 设置状态
    setState(newState) {
        this.state = { ...this.state, ...newState };
        this.render();
    }

    // 渲染方法（子类需要实现）
    render() {
        throw new Error('render() method must be implemented');
    }

    // 样式模板
    getStyles() {
        return `
            <style>
                :host {
                    display: block;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                }
                
                * {
                    box-sizing: border-box;
                }
                
                .component {
                    width: 100%;
                }
            </style>
        `;
    }

    // 连接组件
    connectedCallback() {
        this.render();
        this.afterRender();
    }

    // 渲染后回调（子类可以重写）
    afterRender() {}

    // 断开连接
    disconnectedCallback() {
        this.beforeDestroy();
    }

    // 销毁前回调（子类可以重写）
    beforeDestroy() {}
}

// 股票卡片组件
class StockCard extends BaseComponent {
    render() {
        const { symbol, name, price, change, changePercent, currency = 'USD' } = this.props;
        const isPositive = change >= 0;
        
        this.shadowRoot.innerHTML = `
            ${this.getStyles()}
            <div class="stock-card">
                <div class="stock-info">
                    <div class="stock-symbol">${symbol}</div>
                    <div class="stock-name">${name}</div>
                </div>
                <div class="stock-price">
                    <div class="stock-current-price">${this.formatPrice(price, currency)}</div>
                    <div class="stock-change ${isPositive ? 'positive' : 'negative'}">
                        ${this.formatChange(change, currency)} (${this.formatChangePercent(changePercent)})
                    </div>
                </div>
                <div class="stock-actions">
                    <slot name="actions"></slot>
                </div>
            </div>
        `;
    }

    getStyles() {
        return `
            <style>
                .stock-card {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 12px 0;
                    border-bottom: 1px solid #e9ecef;
                    cursor: pointer;
                    transition: background 0.2s;
                }
                
                .stock-card:hover {
                    background: #f8f9fa;
                    margin: 0 -20px;
                    padding: 12px 20px;
                }
                
                .stock-info {
                    flex: 1;
                }
                
                .stock-symbol {
                    font-weight: 600;
                    font-size: 14px;
                    margin-bottom: 2px;
                }
                
                .stock-name {
                    font-size: 12px;
                    color: #6c757d;
                    max-width: 100px;
                    margin-bottom: 2px;
                }
                
                .stock-price {
                    text-align: right;
                    margin-right: 10px;
                }
                
                .stock-current-price {
                    font-weight: 600;
                    font-size: 14px;
                    margin-bottom: 2px;
                }
                
                .stock-change {
                    font-size: 12px;
                }
                
                .stock-change.positive {
                    color: #28a745;
                }
                
                .stock-change.negative {
                    color: #dc3545;
                }
                
                .stock-actions {
                    display: flex;
                    align-items: center;
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

    formatChange(change, currency) {
        const getDecimalPlaces = (value) => {
            const absValue = Math.abs(value);
            if (absValue >= 1) return 2;
            if (absValue >= 0.01) return 4;
            return 10;
        };
        
        const decimalPlaces = getDecimalPlaces(change);
        const symbol = currency === 'CNY' ? '¥' : '$';
        return `${change >= 0 ? '+' : ''}${symbol}${change.toFixed(decimalPlaces)}`;
    }

    formatChangePercent(changePercent) {
        const getDecimalPlaces = (value) => {
            const absValue = Math.abs(value);
            if (absValue >= 1) return 2;
            if (absValue >= 0.01) return 4;
            return 10;
        };
        
        const decimalPlaces = getDecimalPlaces(changePercent);
        return `${changePercent.toFixed(decimalPlaces)}%`;
    }
}

// 按钮组件
class StockButton extends BaseComponent {
    render() {
        const { type = 'primary', size = 'medium', disabled = false, icon = '' } = this.props;
        const { text = '', clickHandler = null } = this.state;
        
        this.shadowRoot.innerHTML = `
            ${this.getStyles()}
            <button class="btn btn-${type} btn-${size}" ${disabled ? 'disabled' : ''}>
                ${icon ? `<i class="fas fa-${icon}"></i>` : ''}
                <span>${text}</span>
            </button>
        `;

        if (clickHandler) {
            const button = this.shadowRoot.querySelector('button');
            button.addEventListener('click', clickHandler);
        }
    }

    getStyles() {
        return `
            <style>
                .btn {
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: 500;
                    transition: all 0.2s;
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    text-decoration: none;
                }
                
                .btn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }
                
                .btn-primary {
                    background: #667eea;
                    color: white;
                }
                
                .btn-primary:hover:not(:disabled) {
                    background: #5a6fd8;
                }
                
                .btn-secondary {
                    background: #6c757d;
                    color: white;
                }
                
                .btn-secondary:hover:not(:disabled) {
                    background: #5a6268;
                }
                
                .btn-danger {
                    background: #dc3545;
                    color: white;
                }
                
                .btn-danger:hover:not(:disabled) {
                    background: #c82333;
                }
                
                .btn-sm {
                    padding: 4px 8px;
                    font-size: 12px;
                }
                
                .btn-medium {
                    padding: 8px 16px;
                    font-size: 14px;
                }
                
                .btn-lg {
                    padding: 12px 24px;
                    font-size: 16px;
                }
            </style>
        `;
    }
}

// 输入框组件
class StockInput extends BaseComponent {
    render() {
        const { type = 'text', placeholder = '', value = '', disabled = false } = this.props;
        
        this.shadowRoot.innerHTML = `
            ${this.getStyles()}
            <input 
                type="${type}" 
                placeholder="${placeholder}" 
                value="${value}" 
                ${disabled ? 'disabled' : ''}
                class="stock-input"
            />
        `;
    }

    getStyles() {
        return `
            <style>
                .stock-input {
                    width: 100%;
                    padding: 10px 12px;
                    border: 1px solid #e9ecef;
                    border-radius: 6px;
                    font-size: 14px;
                    transition: border-color 0.2s;
                }
                
                .stock-input:focus {
                    outline: none;
                    border-color: #667eea;
                }
                
                .stock-input:disabled {
                    background: #f8f9fa;
                    cursor: not-allowed;
                }
            </style>
        `;
    }
}

// 模态框组件
class StockModal extends BaseComponent {
    render() {
        const { title = '', visible = false } = this.props;
        
        this.shadowRoot.innerHTML = `
            ${this.getStyles()}
            <div class="modal ${visible ? 'active' : ''}">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>${title}</h2>
                        <button class="modal-close">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <slot></slot>
                    </div>
                </div>
            </div>
        `;

        // 添加关闭事件
        const closeBtn = this.shadowRoot.querySelector('.modal-close');
        const modal = this.shadowRoot.querySelector('.modal');
        
        closeBtn.addEventListener('click', () => {
            this.dispatchEvent(new CustomEvent('modal-close'));
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.dispatchEvent(new CustomEvent('modal-close'));
            }
        });
    }

    getStyles() {
        return `
            <style>
                .modal {
                    display: none;
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.5);
                    z-index: 1000;
                    align-items: center;
                    justify-content: center;
                }
                
                .modal.active {
                    display: flex;
                }
                
                .modal-content {
                    background: white;
                    border-radius: 12px;
                    width: 90%;
                    max-width: 500px;
                    max-height: 80vh;
                    overflow-y: auto;
                    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
                }
                
                .modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 20px;
                    border-bottom: 1px solid #e9ecef;
                }
                
                .modal-header h2 {
                    font-size: 18px;
                    color: #333;
                    margin: 0;
                }
                
                .modal-close {
                    background: none;
                    border: none;
                    font-size: 18px;
                    color: #6c757d;
                    cursor: pointer;
                    padding: 4px;
                    border-radius: 4px;
                    transition: background 0.2s;
                }
                
                .modal-close:hover {
                    background: #f8f9fa;
                }
                
                .modal-body {
                    padding: 20px;
                }
            </style>
        `;
    }
}

// 注册所有组件
customElements.define('stock-card', StockCard);
customElements.define('stock-button', StockButton);
customElements.define('stock-input', StockInput);
customElements.define('stock-modal', StockModal);

// 导出基础类
export { BaseComponent, StockCard, StockButton, StockInput, StockModal };