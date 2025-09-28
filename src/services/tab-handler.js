// 标签页处理器 - 里氏替换原则
export class TabHandler {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.handlers = new Map();
    }

    // 注册标签页处理器
    register(tabName, handler) {
        this.handlers.set(tabName, handler);
    }

    // 切换标签页
    async switchTab(tabName) {
        this.uiManager.switchTab(tabName);
        
        const handler = this.handlers.get(tabName);
        if (handler) {
            await handler.load();
        }
    }

    // 获取所有注册的标签页
    getRegisteredTabs() {
        return Array.from(this.handlers.keys());
    }
}