// API 服务模块
export class StockAPIService {
    constructor() {
        // 使用 Yahoo Finance API (yfinance 的数据源)
        this.yahooURL = 'https://query1.finance.yahoo.com/v8/finance/chart';
        this.yahooQuoteURL = 'https://query1.finance.yahoo.com/v7/finance/quote';
        this.yahooSearchURL = 'https://query1.finance.yahoo.com/v1/finance/search';
        this.yahooNewsURL = 'https://query1.finance.yahoo.com/v1/finance/search';
        
        // 备用 API 服务
        this.rapidapiURL = 'https://yahoo-finance15.p.rapidapi.com/api/v1';
        this.rapidapiKey = null;
    }

    async init() {
        const settings = await this.getSettings();
        this.rapidapiKey = settings.rapidapiKey;
    }

    // 检测是否为加密货币交易对
    isCryptocurrency(symbol) {
        if (!symbol || typeof symbol !== 'string') return false;
        
        // 常见的加密货币符号列表
        const cryptoSymbols = new Set([
            'BTC-USD', 'ETH-USD', 'ADA-USD', 'SOL-USD', 'MATIC-USD',
            'DOT-USD', 'AVAX-USD', 'LINK-USD', 'UNI-USD', 'AAVE-USD',
            'LTC-USD', 'BCH-USD', 'XRP-USD', 'DOGE-USD', 'SHIB-USD',
            'ATOM-USD', 'NEAR-USD', 'FTM-USD', 'ALGO-USD', 'VET-USD',
            'TRX-USD', 'XLM-USD', 'EOS-USD', 'XTZ-USD', 'FIL-USD',
            'ICP-USD', 'THETA-USD', 'HBAR-USD', 'MANA-USD', 'SAND-USD'
        ]);
        
        return cryptoSymbols.has(symbol.toUpperCase());
    }

    // 格式化价格显示，根据数值大小动态保留小数位
    formatPrice(price) {
        if (price === null || price === undefined || isNaN(price)) {
            return '0.00';
        }
        
        const num = Math.abs(price);
        
        // 根据数值大小确定小数位数
        let decimals;
        if (num >= 1000) {
            decimals = 2; // >= 1000 保留2位小数
        } else if (num >= 100) {
            decimals = 2; // >= 100 保留2位小数
        } else if (num >= 10) {
            decimals = 2; // >= 10 保留2位小数
        } else if (num >= 1) {
            decimals = 3; // >= 1 保留3位小数
        } else if (num >= 0.1) {
            decimals = 4; // >= 0.1 保留4位小数
        } else if (num >= 0.01) {
            decimals = 5; // >= 0.01 保留5位小数
        } else if (num >= 0.001) {
            decimals = 6; // >= 0.001 保留6位小数
        } else if (num >= 0.0001) {
            decimals = 7; // >= 0.0001 保留7位小数
        } else if (num >= 0.00001) {
            decimals = 8; // >= 0.00001 保留8位小数
        } else {
            decimals = 8; // 其他情况保留8位小数
        }
        
        return price.toFixed(decimals);
    }

    // 格式化涨跌幅显示
    formatChange(change) {
        if (change === null || change === undefined || isNaN(change)) {
            return '0.00';
        }
        
        const num = Math.abs(change);
        
        // 涨跌幅通常保留2-4位小数
        let decimals;
        if (num >= 100) {
            decimals = 2; // >= 100 保留2位小数
        } else if (num >= 10) {
            decimals = 2; // >= 10 保留2位小数
        } else if (num >= 1) {
            decimals = 3; // >= 1 保留3位小数
        } else if (num >= 0.1) {
            decimals = 4; // >= 0.1 保留4位小数
        } else {
            decimals = 5; // 其他情况保留5位小数
        }
        
        return change.toFixed(decimals);
    }

    // 格式化涨跌幅百分比显示
    formatChangePercent(changePercent) {
        if (changePercent === null || changePercent === undefined || isNaN(changePercent)) {
            return '0.00';
        }
        
        const num = Math.abs(changePercent);
        
        // 百分比通常保留2-3位小数
        let decimals;
        if (num >= 100) {
            decimals = 2; // >= 100% 保留2位小数
        } else if (num >= 10) {
            decimals = 2; // >= 10% 保留2位小数
        } else if (num >= 1) {
            decimals = 2; // >= 1% 保留2位小数
        } else {
            decimals = 3; // 其他情况保留3位小数
        }
        
        return changePercent.toFixed(decimals);
    }

    async getSettings() {
        return new Promise((resolve) => {
            chrome.storage.sync.get(['rapidapiKey', 'refreshInterval', 'enableNotifications', 'enableSitebar'], (result) => {
                resolve({
                    rapidapiKey: result.rapidapiKey || '',
                    refreshInterval: result.refreshInterval || 60,
                    enableNotifications: result.enableNotifications || false,
                    enableSitebar: result.enableSitebar || false
                });
            });
        });
    }

    // 验证时间范围和间隔的兼容性
    validateRangeIntervalCombination(range, interval) {
        const validCombinations = {
            '1d': ['1m', '2m', '5m', '15m', '30m', '60m', '90m'],
            '5d': ['1m', '2m', '5m', '15m', '30m', '60m', '90m'],
            '1mo': ['1m', '2m', '5m', '15m', '30m', '60m', '90m', '1h', '1d'],
            '3mo': ['1m', '2m', '5m', '15m', '30m', '60m', '90m', '1h', '1d'],
            '6mo': ['1m', '2m', '5m', '15m', '30m', '60m', '90m', '1h', '1d'],
            '1y': ['1m', '2m', '5m', '15m', '30m', '60m', '90m', '1h', '1d', '5d', '1wk', '1mo'],
            '2y': ['1h', '1d', '5d', '1wk', '1mo'],
            '5y': ['1d', '5d', '1wk', '1mo'],
            '10y': ['1d', '5d', '1wk', '1mo'],
            'ytd': ['1d', '5d', '1wk', '1mo'],
            'max': ['1d', '5d', '1wk', '1mo']
        };

        if (validCombinations[range] && validCombinations[range].includes(interval)) {
            return { valid: true, range, interval };
        }

        if (validCombinations[range]) {
            const fallbackInterval = validCombinations[range][validCombinations[range].length - 1];
            return { valid: false, range, interval: fallbackInterval };
        }
        
        return { valid: false, range: '1mo', interval: '1d' };
    }

    // 获取股票实时价格
    async getStockQuote(symbol, interval = '1d', range = '1d') {
        try {
            return await this.getStockQuoteYahooV8(symbol, interval, range);
        } catch (error) {
            console.log('Yahoo Finance V8 API 失败，尝试 V7 API:', error.message);
            try {
                return await this.getStockQuoteYahooV7(symbol);
            } catch (v7Error) {
                console.log('Yahoo Finance V7 API 也失败，尝试备用端点:', v7Error.message);
                try {
                    return await this.getStockQuoteAlternative(symbol);
                } catch (altError) {
                    console.error('所有API都失败了:', altError.message);
                    throw new Error(`无法获取 ${symbol} 的价格数据`);
                }
            }
        }
    }

    // Yahoo Finance V8 API
    async getStockQuoteYahooV8(symbol, interval = '1d', range = '1d') {
        const url = `${this.yahooURL}/${symbol}?interval=${interval}&range=${range}`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': 'https://finance.yahoo.com/'
            },
            mode: 'cors'
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
            throw new Error('未找到股票数据');
        }

        const result = data.chart.result[0];
        const meta = result.meta;
        const quote = result.indicators.quote[0];
        
        // 获取最新价格 - 使用popup.js中的方法
        const prices = quote.close.filter(price => price !== null);
        const volumes = quote.volume.filter(vol => vol !== null);
        const highs = quote.high.filter(high => high !== null);
        const lows = quote.low.filter(low => low !== null);
        const opens = quote.open.filter(open => open !== null);
        
        const currentPrice = prices[prices.length - 1] || meta.regularMarketPrice;
        const previousClose = meta.chartPreviousClose || meta.previousClose;
        const change = currentPrice - previousClose;
        const changePercent = (change / previousClose) * 100;
        
        // 对于加密货币，使用24小时数据
        const isCrypto = this.isCryptocurrency(meta.symbol);
        
        return {
            symbol: meta.symbol,
            price: currentPrice,
            change: change,
            changePercent: changePercent,
            previousClose: previousClose,
            open: opens[opens.length - 1] || meta.regularMarketOpen,
            high: highs[highs.length - 1] || meta.regularMarketDayHigh,
            low: lows[lows.length - 1] || meta.regularMarketDayLow,
            volume: volumes[volumes.length - 1] || meta.regularMarketVolume,
            currency: meta.currency,
            exchange: meta.exchangeName,
            longName: meta.longName,
            shortName: meta.shortName,
            marketState: isCrypto ? 'REGULAR' : (meta.marketState || 'CLOSED'),
            // 加密货币特有字段
            dayHigh: highs[highs.length - 1] || meta.regularMarketDayHigh,
            dayLow: lows[lows.length - 1] || meta.regularMarketDayLow,
            averageVolume: meta.averageVolume || 0,
            trailingPE: meta.trailingPE || null,
            fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh || null,
            fiftyTwoWeekLow: meta.fiftyTwoWeekLow || null,
            dividendYield: meta.dividendYield || null,
            beta: meta.beta || null,
            marketCap: meta.marketCap || null
        };
    }

    // 获取历史价格数据用于图表
    async getHistoricalData(symbol, range = '1mo', interval = '1d') {
        try {
            console.log(`获取历史数据: ${symbol}, 范围: ${range}, 间隔: ${interval}`);
            
            // 验证时间范围和间隔的兼容性
            const validCombination = this.validateRangeIntervalCombination(range, interval);
            if (!validCombination.valid) {
                console.warn(`无效的时间范围和间隔组合: ${range}/${interval}, 使用默认组合: ${validCombination.range}/${validCombination.interval}`);
                range = validCombination.range;
                interval = validCombination.interval;
            }
            
            const url = `${this.yahooURL}/${symbol}?interval=${interval}&range=${range}&includePrePost=false&useYfid=true&corsDomain=finance.yahoo.com&.tsrc=fin-srch`;
            console.log('历史数据请求 URL:', url);
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'application/json',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Connection': 'keep-alive',
                    'Referer': 'https://finance.yahoo.com/',
                    'Origin': 'https://finance.yahoo.com'
                },
                mode: 'cors'
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('历史数据 API 原始数据:', data);
            
            if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
                throw new Error('未找到历史数据');
            }

            const result = data.chart.result[0];
            const meta = result.meta;
            const quote = result.indicators.quote[0];
            const timestamps = result.timestamp;
            
            // 处理时间戳和价格数据
            const chartData = [];
            const validIndices = [];
            
            // 找到所有有效的数据点
            for (let i = 0; i < timestamps.length; i++) {
                if (quote.close[i] !== null && quote.close[i] !== undefined) {
                    validIndices.push(i);
                }
            }
            
            // 构建图表数据
            validIndices.forEach(index => {
                const timestamp = timestamps[index];
                const date = new Date(timestamp * 1000);
                
                chartData.push({
                    timestamp: timestamp,
                    date: date,
                    open: quote.open[index],
                    high: quote.high[index],
                    low: quote.low[index],
                    close: quote.close[index],
                    volume: quote.volume[index]
                });
            });
            
            console.log(`历史数据获取成功: ${symbol}, 数据点数量: ${chartData.length}`);
            
            return {
                symbol: symbol,
                currency: meta.currency,
                exchange: meta.exchangeName,
                data: chartData,
                meta: meta
            };
            
        } catch (error) {
            console.error('获取历史数据失败:', error);
            throw error;
        }
    }

    // 搜索股票
    async searchStocks(query) {
        try {
            const url = `${this.yahooSearchURL}?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0`;
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'application/json',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Referer': 'https://finance.yahoo.com/'
                },
                mode: 'cors'
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (!data.quotes || data.quotes.length === 0) {
                return [];
            }

            return data.quotes.map(quote => ({
                symbol: quote.symbol,
                name: quote.longname || quote.shortname,
                exchange: quote.exchange,
                type: quote.typeDisp
            }));
            
        } catch (error) {
            console.error('搜索股票失败:', error);
            throw error;
        }
    }

    // 备用API方法
    async getStockQuoteYahooV7(symbol) {
        const url = `${this.yahooQuoteURL}?symbols=${symbol}`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'application/json',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': 'https://finance.yahoo.com/'
            },
            mode: 'cors'
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (!data.quoteResponse || !data.quoteResponse.result || data.quoteResponse.result.length === 0) {
            throw new Error('未找到股票数据');
        }

        const quote = data.quoteResponse.result[0];
        
        // 对于加密货币，使用24小时数据
        const isCrypto = this.isCryptocurrency(quote.symbol);
        
        return {
            symbol: quote.symbol,
            price: quote.regularMarketPrice || 0,
            change: quote.regularMarketChange || 0,
            changePercent: quote.regularMarketChangePercent || 0,
            previousClose: quote.regularMarketPreviousClose || 0,
            open: quote.regularMarketOpen || 0,
            high: quote.regularMarketDayHigh || 0,
            low: quote.regularMarketDayLow || 0,
            volume: quote.regularMarketVolume || 0,
            currency: quote.currency,
            exchange: quote.exchange,
            longName: quote.longName,
            shortName: quote.shortName,
            marketState: isCrypto ? 'REGULAR' : (quote.marketState || 'CLOSED'),
            // 加密货币特有字段
            dayHigh: quote.regularMarketDayHigh || 0,
            dayLow: quote.regularMarketDayLow || 0,
            averageVolume: quote.averageVolume || 0,
            trailingPE: quote.trailingPE || null,
            fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh || null,
            fiftyTwoWeekLow: quote.fiftyTwoWeekLow || null,
            dividendYield: quote.dividendYield || null,
            beta: quote.beta || null,
            marketCap: quote.marketCap || null
        };
    }

    async getStockQuoteAlternative(symbol) {
        const url = `${this.yahooQuoteURL}?symbols=${symbol}`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'application/json',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': 'https://finance.yahoo.com/'
            },
            mode: 'cors'
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (!data.quoteResponse || !data.quoteResponse.result || data.quoteResponse.result.length === 0) {
            throw new Error('未找到股票数据');
        }

        const quote = data.quoteResponse.result[0];
        
        // 对于加密货币，使用24小时数据
        const isCrypto = this.isCryptocurrency(quote.symbol);
        
        return {
            symbol: quote.symbol,
            price: quote.regularMarketPrice || 0,
            change: quote.regularMarketChange || 0,
            changePercent: quote.regularMarketChangePercent || 0,
            previousClose: quote.regularMarketPreviousClose || 0,
            open: quote.regularMarketOpen || 0,
            high: quote.regularMarketDayHigh || 0,
            low: quote.regularMarketDayLow || 0,
            volume: quote.regularMarketVolume || 0,
            currency: quote.currency,
            exchange: quote.exchange,
            longName: quote.longName,
            shortName: quote.shortName,
            marketState: isCrypto ? 'REGULAR' : (quote.marketState || 'CLOSED'),
            // 加密货币特有字段
            dayHigh: quote.regularMarketDayHigh || 0,
            dayLow: quote.regularMarketDayLow || 0,
            averageVolume: quote.averageVolume || 0,
            trailingPE: quote.trailingPE || null,
            fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh || null,
            fiftyTwoWeekLow: quote.fiftyTwoWeekLow || null,
            dividendYield: quote.dividendYield || null,
            beta: quote.beta || null,
            marketCap: quote.marketCap || null
        };
    }
}