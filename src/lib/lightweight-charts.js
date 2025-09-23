// LightweightCharts 包装器
// 这个文件将 LightweightCharts 作为 ES 模块导出

// 检查是否已经加载了 LightweightCharts
if (typeof window.LightweightCharts === 'undefined') {
    throw new Error('LightweightCharts 未加载。请确保在 HTML 中包含了 lightweight-charts.standalone.production.js');
}

// 导出 LightweightCharts 的主要功能
export const {
    createChart,
    ColorType,
    CrosshairMode,
    LineStyle,
    PriceScaleMode,
    TickMarkType,
    Time
} = window.LightweightCharts;

// 导出默认对象
export default window.LightweightCharts;