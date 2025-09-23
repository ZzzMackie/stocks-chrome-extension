// 投资组合管理服务
export class PortfolioManager {
    constructor() {
        this.portfolio = [];
        this.watchlist = [];
    }

    async init() {
        await this.loadPortfolio();
        await this.loadWatchlist();
    }

    // 加载投资组合
    async loadPortfolio() {
        return new Promise((resolve) => {
            chrome.storage.sync.get(['portfolio'], (result) => {
                this.portfolio = result.portfolio || [];
                resolve(this.portfolio);
            });
        });
    }

    // 加载观察列表
    async loadWatchlist() {
        return new Promise((resolve) => {
            chrome.storage.sync.get(['watchlist'], (result) => {
                this.watchlist = result.watchlist || [];
                resolve(this.watchlist);
            });
        });
    }

    // 保存投资组合
    async savePortfolio() {
        return new Promise((resolve) => {
            chrome.storage.sync.set({ portfolio: this.portfolio }, () => {
                resolve();
            });
        });
    }

    // 保存观察列表
    async saveWatchlist() {
        return new Promise((resolve) => {
            chrome.storage.sync.set({ watchlist: this.watchlist }, () => {
                resolve();
            });
        });
    }

    // 添加到投资组合
    async addToPortfolio(symbol, quantity, price) {
        const existingIndex = this.portfolio.findIndex(item => item.symbol === symbol);
        
        if (existingIndex >= 0) {
            // 更新现有项目
            const existing = this.portfolio[existingIndex];
            const totalQuantity = existing.quantity + quantity;
            const totalCost = (existing.quantity * existing.price) + (quantity * price);
            const averagePrice = totalCost / totalQuantity;
            
            this.portfolio[existingIndex] = {
                ...existing,
                quantity: totalQuantity,
                price: averagePrice
            };
        } else {
            // 添加新项目
            this.portfolio.push({
                symbol,
                quantity,
                price,
                addedDate: new Date().toISOString()
            });
        }
        
        await this.savePortfolio();
    }

    // 添加到观察列表
    async addToWatchlist(symbol) {
        if (!this.watchlist.find(item => item.symbol === symbol)) {
            this.watchlist.push({
                symbol,
                addedDate: new Date().toISOString()
            });
            await this.saveWatchlist();
        }
    }

    // 从投资组合移除
    removeFromPortfolio(symbol) {
        this.portfolio = this.portfolio.filter(item => item.symbol !== symbol);
        this.savePortfolio();
    }

    // 从观察列表移除
    removeFromWatchlist(symbol) {
        this.watchlist = this.watchlist.filter(item => item.symbol !== symbol);
        this.saveWatchlist();
    }

    // 获取投资组合
    getPortfolio() {
        return this.portfolio;
    }

    // 获取观察列表
    getWatchlist() {
        return this.watchlist;
    }

    // 检查是否在投资组合中
    isInPortfolio(symbol) {
        return this.portfolio.some(item => item.symbol === symbol);
    }

    // 检查是否在观察列表中
    isInWatchlist(symbol) {
        return this.watchlist.some(item => item.symbol === symbol);
    }
}