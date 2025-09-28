// 市场标签页处理器
import { IDataProvider } from '../interfaces/data-provider.js';

export class MarketsTabHandler extends IDataProvider {
    constructor(apiService, uiManager) {
        super();
        this.apiService = apiService;
        this.uiManager = uiManager;
        this.indices = [];
        this.exchanges = [];
        this.updateInterval = null;
    }

    async load() {
        try {
            this.uiManager.showLoading('.market-indices', '加载市场数据中...');
            this.uiManager.showLoading('marketHours', '加载交易所状态中...');

            // 并行获取市场指数和交易所状态
            const [indices, exchanges] = await Promise.all([
                this.apiService.getMarketIndices(),
                this.apiService.getExchangeStatus()
            ]);

            this.indices = indices;
            this.exchanges = exchanges;

            this.render();
            this.startAutoUpdate();
        } catch (error) {
            console.error('加载市场数据失败:', error);
            this.uiManager.showError('.market-indices', '加载失败');
            this.uiManager.showError('marketHours', '加载失败');
        }
    }

    async refresh() {
        await this.load();
    }

    getData() {
        return {
            indices: this.indices,
            exchanges: this.exchanges
        };
    }

    render() {
        this.renderIndices();
        this.renderExchanges();
    }

    renderIndices() {
        const container = document.querySelector('.market-indices');
        if (!container) return;

        if (this.indices.length === 0) {
            this.uiManager.showEmpty(
                '.market-indices',
                'fas fa-chart-line',
                '暂无数据',
                '无法获取市场指数数据'
            );
            return;
        }

        // 只显示前6个主要指数
        const mainIndices = this.indices.slice(0, 6);
        
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

    renderExchanges() {
        const container = document.getElementById('marketHours');
        if (!container) return;

        container.innerHTML = this.exchanges.map(exchange => `
            <div class="hour-item">
                <span class="market-name">${exchange.name}</span>
                <span class="market-status">${exchange.status}</span>
            </div>
        `).join('');
    }

    startAutoUpdate() {
        this.stopAutoUpdate();
        
        // 检查是否有市场正在交易
        const hasActiveMarkets = this.checkActiveMarkets();
        const updateFrequency = hasActiveMarkets ? 30000 : 5 * 60 * 1000; // 30秒或5分钟
        
        this.updateInterval = setInterval(async () => {
            await this.updateData();
        }, updateFrequency);
    }

    stopAutoUpdate() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    async updateData() {
        try {
            console.log('自动更新市场数据...');
            
            const [indices, exchanges] = await Promise.all([
                this.apiService.getMarketIndices(),
                this.apiService.getExchangeStatus()
            ]);

            this.indices = indices;
            this.exchanges = exchanges;
            this.render();
        } catch (error) {
            console.error('自动更新市场数据失败:', error);
        }
    }

    checkActiveMarkets() {
        // 简化的市场活跃检查
        const now = new Date();
        const hour = now.getHours();
        const day = now.getDay();
        
        return day >= 1 && day <= 5 && hour >= 9 && hour < 16;
    }
}