# 模块化架构说明

## 新的文件结构

```
stocks-chrome-extension/
├── src/
│   ├── app.js                 # 主应用文件
│   ├── services/              # 服务层
│   │   ├── api.js            # API 服务
│   │   ├── portfolio.js      # 投资组合管理
│   │   └── alerts.js         # 价格提醒管理
│   ├── components/            # Web Components
│   │   ├── stock-card.js     # 股票卡片组件
│   │   ├── chart-container.js # 图表容器组件
│   │   └── stock-modal.js    # 股票详情模态框
│   └── lib/                   # 第三方库包装
│       └── lightweight-charts.js # LightweightCharts 包装器
├── popup.html                 # 主页面
├── popup.css                  # 样式文件
├── manifest.json              # 扩展配置
└── lightweight-charts.standalone.production.js # LightweightCharts 库
```

## 主要改进

### 1. ESM 模块化
- 使用 ES6 模块 (`import/export`)
- 清晰的依赖关系
- 更好的代码组织和维护性

### 2. Web Components
- 原生 Web Components 支持
- 组件化 UI 架构
- 可复用的自定义元素

### 3. 服务层分离
- `StockAPIService`: 处理所有 API 调用
- `PortfolioManager`: 管理投资组合和观察列表
- `AlertManager`: 管理价格提醒

### 4. 组件化 UI
- `StockCard`: 股票信息卡片
- `ChartContainer`: 图表容器（支持 LightweightCharts）
- `StockModal`: 股票详情模态框

## 使用方法

### 1. 启动应用
```javascript
// 在 popup.html 中
<script type="module" src="src/app.js"></script>
```

### 2. 使用组件
```html
<!-- 股票卡片 -->
<stock-card 
    symbol="AAPL"
    price="150.00"
    change="2.50"
    change-percent="1.69">
</stock-card>

<!-- 图表容器 -->
<chart-container 
    symbol="AAPL"
    range="1mo"
    interval="1d">
</chart-container>

<!-- 股票详情模态框 -->
<stock-modal></stock-modal>
```

### 3. 事件监听
```javascript
// 监听股票卡片点击
document.addEventListener('stock-click', (e) => {
    console.log('点击了股票:', e.detail);
});

// 监听添加到观察列表
document.addEventListener('add-to-watchlist', (e) => {
    console.log('添加到观察列表:', e.detail.symbol);
});
```

## LightweightCharts 集成

### 1. 加载方式
```html
<!-- 在 HTML 中加载 LightweightCharts -->
<script src="lightweight-charts.standalone.production.js"></script>
```

### 2. 在组件中使用
```javascript
// 在 chart-container.js 中
import { createChart } from '../lib/lightweight-charts.js';

// 创建图表
this.chart = createChart(container, {
    width: container.clientWidth,
    height: 400,
    // ... 其他配置
});
```

## 优势

1. **模块化**: 代码分离，易于维护
2. **组件化**: 可复用的 UI 组件
3. **现代化**: 使用最新的 Web 标准
4. **性能**: 按需加载，减少初始包大小
5. **可扩展**: 易于添加新功能

## 迁移指南

从旧的单文件架构迁移到新的模块化架构：

1. 将 `popup.js` 中的代码分离到相应的服务文件
2. 将 UI 部分重构为 Web Components
3. 更新 HTML 以使用新的组件
4. 确保 LightweightCharts 正确加载

## 注意事项

1. 确保 `manifest.json` 中的 CSP 配置支持 ES 模块
2. LightweightCharts 需要在 HTML 中先加载，然后才能作为 ES 模块导入
3. Web Components 需要在使用前注册
4. 事件监听器需要正确清理以避免内存泄漏