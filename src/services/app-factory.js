// 应用工厂 - 依赖倒置原则
import { StockAPIService } from './api.js';
import { PortfolioManager } from './portfolio.js';
import { AlertManager } from './alerts.js';
import { MarketStatusService } from './market-status.js';
import { UIManager } from './ui-manager.js';
import { TabHandler } from './tab-handler.js';
import { PortfolioTabHandler } from './portfolio-tab-handler.js';
import { MarketsTabHandler } from './markets-tab-handler.js';
import { NewsTabHandler } from './news-tab-handler.js';
import { IObserver } from '../interfaces/observer.js';

// 市场状态观察者
class MarketStatusObserver extends IObserver {
    constructor(uiManager) {
        super();
        this.uiManager = uiManager;
    }

    update(status) {
        this.uiManager.updateMarketStatus(status);
    }
}

export class AppFactory {
    static createApp() {
        // 创建核心服务
        const apiService = new StockAPIService();
        const portfolioManager = new PortfolioManager();
        const alertManager = new AlertManager();
        const marketStatusService = new MarketStatusService();
        const uiManager = new UIManager();

        // 创建标签页处理器
        const tabHandler = new TabHandler(uiManager);
        const portfolioTabHandler = new PortfolioTabHandler(portfolioManager, uiManager);
        const marketsTabHandler = new MarketsTabHandler(apiService, uiManager);
        const newsTabHandler = new NewsTabHandler(apiService, uiManager);

        // 注册标签页处理器
        tabHandler.register('portfolio', portfolioTabHandler);
        tabHandler.register('markets', marketsTabHandler);
        tabHandler.register('news', newsTabHandler);

        // 设置观察者
        const marketStatusObserver = new MarketStatusObserver(uiManager);
        marketStatusService.subscribe(marketStatusObserver);

        return {
            apiService,
            portfolioManager,
            alertManager,
            marketStatusService,
            uiManager,
            tabHandler
        };
    }
}