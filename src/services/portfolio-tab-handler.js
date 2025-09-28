// 投资组合标签页处理器
import { IDataProvider } from '../interfaces/data-provider.js';

export class PortfolioTabHandler extends IDataProvider {
    constructor(portfolioManager, uiManager) {
        super();
        this.portfolioManager = portfolioManager;
        this.uiManager = uiManager;
        this.data = [];
    }

    async load() {
        try {
            this.uiManager.showLoading('portfolioList', '加载投资组合中...');
            
            const portfolio = this.portfolioManager.getPortfolio();
            this.data = portfolio;
            
            this.render();
        } catch (error) {
            console.error('加载投资组合失败:', error);
            this.uiManager.showError('portfolioList', '加载失败');
        }
    }

    async refresh() {
        await this.load();
    }

    getData() {
        return this.data;
    }

    render() {
        const container = document.getElementById('portfolioList');
        if (!container) return;

        if (this.data.length === 0) {
            this.uiManager.showEmpty(
                'portfolioList',
                'fas fa-briefcase',
                '投资组合为空',
                '添加一些股票到您的投资组合中'
            );
            return;
        }

        // 渲染投资组合列表
        container.innerHTML = this.data.map(stock => `
            <stock-card 
                symbol="${stock.symbol}"
                price="${stock.price || 0}"
                change="${stock.change || 0}"
                change-percent="${stock.changePercent || 0}">
            </stock-card>
        `).join('');
    }
}