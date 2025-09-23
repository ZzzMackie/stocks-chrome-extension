// 价格提醒管理服务
export class AlertManager {
    constructor() {
        this.alerts = [];
    }

    async init() {
        await this.loadAlerts();
    }

    // 加载提醒
    async loadAlerts() {
        return new Promise((resolve) => {
            chrome.storage.sync.get(['alerts'], (result) => {
                this.alerts = result.alerts || [];
                resolve(this.alerts);
            });
        });
    }

    // 保存提醒
    async saveAlerts() {
        return new Promise((resolve) => {
            chrome.storage.sync.set({ alerts: this.alerts }, () => {
                resolve();
            });
        });
    }

    // 添加提醒
    async addAlert(symbol, condition, price, message = '') {
        const alert = {
            id: Date.now().toString(),
            symbol,
            condition, // 'above' or 'below'
            price: parseFloat(price),
            message,
            created: new Date().toISOString(),
            triggered: false
        };

        this.alerts.push(alert);
        await this.saveAlerts();
        return alert;
    }

    // 删除提醒
    async removeAlert(alertId) {
        this.alerts = this.alerts.filter(alert => alert.id !== alertId);
        await this.saveAlerts();
    }

    // 获取所有提醒
    getAlerts() {
        return this.alerts;
    }

    // 获取活跃提醒
    getActiveAlerts() {
        return this.alerts.filter(alert => !alert.triggered);
    }

    // 检查价格提醒
    checkAlerts(currentPrices) {
        this.getActiveAlerts().forEach(alert => {
            const currentPrice = currentPrices[alert.symbol];
            if (currentPrice) {
                this.checkSingleAlert(alert, currentPrice);
            }
        });
    }

    // 检查单个提醒
    checkSingleAlert(alert, currentPrice) {
        let shouldTrigger = false;

        if (alert.condition === 'above' && currentPrice >= alert.price) {
            shouldTrigger = true;
        } else if (alert.condition === 'below' && currentPrice <= alert.price) {
            shouldTrigger = true;
        }

        if (shouldTrigger) {
            this.triggerAlert(alert, currentPrice);
        }
    }

    // 触发提醒
    triggerAlert(alert, currentPrice) {
        alert.triggered = true;
        this.saveAlerts();

        // 显示通知
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon48.png',
            title: '价格提醒',
            message: `${alert.symbol} 价格 ${alert.condition === 'above' ? '上涨至' : '下跌至'} $${currentPrice}`
        });
    }
}