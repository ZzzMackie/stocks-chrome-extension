// UI管理器 - 开闭原则
export class UIManager {
    constructor() {
        this.statusElement = null;
        this.currentTab = 'portfolio';
    }

    // 初始化UI元素
    init() {
        this.statusElement = document.getElementById('marketStatus');
    }

    // 更新市场状态显示
    updateMarketStatus(status) {
        if (!this.statusElement) return;

        const statusConfig = {
            'open': { text: '🟢 市场开放', class: 'open' },
            'pre-market': { text: '🟡 盘前交易', class: 'pre-market' },
            'after-hours': { text: '🟡 盘后交易', class: 'after-hours' },
            'closed': { text: '🔴 市场关闭', class: 'closed' },
            'unknown': { text: '❓ 状态未知', class: 'unknown' }
        };

        const config = statusConfig[status] || statusConfig['unknown'];
        
        this.statusElement.textContent = config.text;
        this.statusElement.className = `market-status ${config.class}`;
    }

    // 更新标签页
    switchTab(tabName) {
        // 更新标签页状态
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // 更新内容区域
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        const targetTab = document.getElementById(`${tabName}-tab`);
        if (targetTab) {
            targetTab.classList.add('active');
        }

        this.currentTab = tabName;
    }

    // 显示加载状态
    showLoading(containerId, message = '加载中...') {
        const container = document.getElementById(containerId) || document.querySelector(containerId);
        if (container) {
            container.innerHTML = `
                <div class="loading">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>${message}</p>
                </div>
            `;
        }
    }

    // 显示错误状态
    showError(containerId, message = '加载失败') {
        const container = document.getElementById(containerId) || document.querySelector(containerId);
        if (container) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>${message}</h3>
                    <p>请稍后重试</p>
                </div>
            `;
        }
    }

    // 显示空状态
    showEmpty(containerId, icon = 'fas fa-inbox', title = '暂无数据', message = '') {
        const container = document.getElementById(containerId) || document.querySelector(containerId);
        if (container) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="${icon}"></i>
                    <h3>${title}</h3>
                    ${message ? `<p>${message}</p>` : ''}
                </div>
            `;
        }
    }

    // 获取当前标签页
    getCurrentTab() {
        return this.currentTab;
    }
}