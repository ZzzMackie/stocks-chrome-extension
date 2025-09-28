// 新闻标签页处理器
import { IDataProvider } from '../interfaces/data-provider.js';

export class NewsTabHandler extends IDataProvider {
    constructor(apiService, uiManager) {
        super();
        this.apiService = apiService;
        this.uiManager = uiManager;
        this.news = [];
    }

    async load() {
        try {
            this.uiManager.showLoading('newsList', '加载新闻中...');

            const news = await this.apiService.getMarketNews(15);
            this.news = news;
            
            this.render();
        } catch (error) {
            console.error('加载新闻失败:', error);
            this.uiManager.showError('newsList', '加载失败');
        }
    }

    async refresh() {
        await this.load();
    }

    getData() {
        return this.news;
    }

    render() {
        const container = document.getElementById('newsList');
        if (!container) return;

        if (this.news.length === 0) {
            this.uiManager.showEmpty(
                'newsList',
                'fas fa-newspaper',
                '暂无新闻',
                '暂时没有可用的市场新闻'
            );
            return;
        }

        // 渲染新闻列表
        container.innerHTML = this.news.map((item, index) => `
            <div class="news-item" data-url="${item.url}" data-index="${index}">
                <div class="news-title">${item.title}</div>
                <div class="news-source">${item.source}</div>
                <div class="news-time">${this.formatNewsTime(item.publishedAt)}</div>
            </div>
        `).join('');

        // 添加点击事件监听器
        container.querySelectorAll('.news-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const url = e.currentTarget.dataset.url;
                console.log('点击新闻，URL:', url);
                if (url && url !== '#') {
                    chrome.tabs.create({ url: url });
                } else {
                    console.warn('无效的新闻URL:', url);
                }
            });
        });
    }

    formatNewsTime(timestamp) {
        if (!timestamp) return '';
        
        const now = new Date();
        const newsTime = new Date(timestamp * 1000);
        const diffMs = now - newsTime;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) {
            return '刚刚';
        } else if (diffMins < 60) {
            return `${diffMins}分钟前`;
        } else if (diffHours < 24) {
            return `${diffHours}小时前`;
        } else if (diffDays < 7) {
            return `${diffDays}天前`;
        } else {
            return newsTime.toLocaleDateString('zh-CN');
        }
    }
}