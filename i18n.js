// 国际化工具类
class I18nManager {
    constructor() {
        this.currentLanguage = 'zh_CN';
        this.supportedLanguages = [
            { code: 'zh_CN', name: '简体中文', flag: '🇨🇳' },
            { code: 'en_US', name: 'English', flag: '🇺🇸' }
        ];
        this.init();
    }

    async init() {
        // 获取用户设置的语言
        const settings = await this.getLanguageSettings();
        this.currentLanguage = settings.language || 'zh_CN';
        
        // 应用国际化
        this.applyI18n();
        
        // 添加语言切换功能
        this.addLanguageSwitcher();
    }

    async getLanguageSettings() {
        return new Promise((resolve) => {
            chrome.storage.sync.get(['language'], (result) => {
                resolve({
                    language: result.language || 'zh_CN'
                });
            });
        });
    }

    async setLanguage(languageCode) {
        this.currentLanguage = languageCode;
        
        // 保存到存储
        chrome.storage.sync.set({ language: languageCode }, () => {
            console.log('Language saved:', languageCode);
        });

        // 重新应用国际化
        this.applyI18n();
        
        // 重新加载页面以应用新语言
        window.location.reload();
    }

    applyI18n() {
        // 处理所有带有 data-i18n 属性的元素
        const elements = document.querySelectorAll('[data-i18n]');
        
        elements.forEach(element => {
            const messageKey = element.getAttribute('data-i18n');
            const message = chrome.i18n.getMessage(messageKey);
            
            if (message) {
                if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                    // 对于输入框，设置 placeholder
                    element.placeholder = message;
                } else if (element.tagName === 'OPTION') {
                    // 对于选项，设置文本内容
                    element.textContent = message;
                } else {
                    // 对于其他元素，设置文本内容
                    element.textContent = message;
                }
            }
        });

        // 处理 title 属性
        const titleElements = document.querySelectorAll('[title]');
        titleElements.forEach(element => {
            const titleKey = element.getAttribute('data-i18n');
            if (titleKey) {
                const message = chrome.i18n.getMessage(titleKey);
                if (message) {
                    element.title = message;
                }
            }
        });
    }

    addLanguageSwitcher() {
        // 在设置按钮旁边添加语言切换按钮
        const headerActions = document.querySelector('.header-actions');
        if (headerActions && !document.getElementById('languageSwitcher')) {
            const languageSwitcher = document.createElement('div');
            languageSwitcher.id = 'languageSwitcher';
            languageSwitcher.className = 'language-switcher';
            languageSwitcher.innerHTML = `
                <button class="btn-icon" id="languageBtn" title="切换语言">
                    <span id="currentLanguageFlag">🇨🇳</span>
                </button>
                <div class="language-dropdown" id="languageDropdown" style="display: none;">
                    ${this.supportedLanguages.map(lang => `
                        <div class="language-option ${lang.code === this.currentLanguage ? 'active' : ''}" 
                             data-lang="${lang.code}">
                            <span class="flag">${lang.flag}</span>
                            <span class="name">${lang.name}</span>
                        </div>
                    `).join('')}
                </div>
            `;

            // 插入到设置按钮之前
            const settingsBtn = document.getElementById('settingsBtn');
            headerActions.insertBefore(languageSwitcher, settingsBtn);

            // 添加事件监听器
            this.setupLanguageSwitcherEvents();
        }
    }

    setupLanguageSwitcherEvents() {
        const languageBtn = document.getElementById('languageBtn');
        const languageDropdown = document.getElementById('languageDropdown');
        const currentLanguageFlag = document.getElementById('currentLanguageFlag');

        if (languageBtn && languageDropdown) {
            // 更新当前语言标志
            const currentLang = this.supportedLanguages.find(lang => lang.code === this.currentLanguage);
            if (currentLang && currentLanguageFlag) {
                currentLanguageFlag.textContent = currentLang.flag;
            }

            // 切换下拉菜单
            languageBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isVisible = languageDropdown.style.display !== 'none';
                languageDropdown.style.display = isVisible ? 'none' : 'block';
            });

            // 语言选择
            const languageOptions = languageDropdown.querySelectorAll('.language-option');
            languageOptions.forEach(option => {
                option.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const selectedLang = option.getAttribute('data-lang');
                    if (selectedLang !== this.currentLanguage) {
                        this.setLanguage(selectedLang);
                    }
                    languageDropdown.style.display = 'none';
                });
            });

            // 点击外部关闭下拉菜单
            document.addEventListener('click', () => {
                languageDropdown.style.display = 'none';
            });
        }
    }

    // 获取当前语言
    getCurrentLanguage() {
        return this.currentLanguage;
    }

    // 获取支持的语言列表
    getSupportedLanguages() {
        return this.supportedLanguages;
    }

    // 格式化消息（支持参数替换）
    formatMessage(messageKey, ...args) {
        let message = chrome.i18n.getMessage(messageKey);
        
        // 替换参数
        args.forEach((arg, index) => {
            message = message.replace(`$${index + 1}`, arg);
        });
        
        return message;
    }
}

// 创建全局实例
window.i18nManager = new I18nManager();
