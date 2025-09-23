// 股票数据 API 服务 - 使用 yfinance 数据源
class StockAPIService {
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
        
        // 常见的加密货币符号列表（更高效）
        const cryptoSymbols = new Set([
            'BTC-USD', 'ETH-USD', 'ADA-USD', 'SOL-USD', 'MATIC-USD',
            'DOT-USD', 'AVAX-USD', 'LINK-USD', 'UNI-USD', 'AAVE-USD',
            'LTC-USD', 'BCH-USD', 'XRP-USD', 'DOGE-USD', 'SHIB-USD',
            'ATOM-USD', 'NEAR-USD', 'FTM-USD', 'ALGO-USD', 'VET-USD',
            'TRX-USD', 'XLM-USD', 'EOS-USD', 'XTZ-USD', 'FIL-USD',
            'ICP-USD', 'THETA-USD', 'HBAR-USD', 'MANA-USD', 'SAND-USD',
            'CRV-USD', 'COMP-USD', 'MKR-USD', 'SNX-USD', 'YFI-USD',
            '1INCH-USD', 'BAT-USD', 'ZRX-USD', 'ENJ-USD', 'CHZ-USD',
            'GRT-USD', 'LRC-USD', 'OMG-USD', 'KNC-USD', 'REN-USD',
            'STORJ-USD', 'DASH-USD', 'ZEC-USD', 'XMR-USD', 'NEO-USD',
            'QTUM-USD', 'IOTA-USD', 'ONT-USD', 'ICX-USD', 'WAVES-USD',
            'NANO-USD', 'SC-USD', 'DGB-USD', 'RVN-USD', 'DCR-USD',
            'LSK-USD', 'ARK-USD', 'REP-USD', 'GNT-USD', 'FUN-USD',
            'POWR-USD', 'REQ-USD', 'KMD-USD', 'SYS-USD', 'PART-USD',
            'DNT-USD', 'CVC-USD', 'ADX-USD', 'MCO-USD', 'EDG-USD',
            'WINGS-USD', 'RLC-USD', 'GAS-USD', 'FCT-USD', 'MAID-USD',
            'DGD-USD', '1ST-USD', 'CFI-USD', 'RDN-USD', 'ADT-USD',
            'QSP-USD', 'MYST-USD', 'BQX-USD', 'EVX-USD', 'VIB-USD',
            'TRST-USD'
        ]);
        
        return cryptoSymbols.has(symbol.toUpperCase());
    }

    async getSettings() {
        return new Promise((resolve) => {
            chrome.storage.sync.get(['rapidapiKey', 'refreshInterval'], (result) => {
                resolve({
                    rapidapiKey: result.rapidapiKey || '',
                    refreshInterval: result.refreshInterval || 60
                });
            });
        });
    }

    // 验证时间范围和间隔的兼容性
    validateRangeIntervalCombination(range, interval) {
        // Yahoo Finance API 支持的时间范围和间隔组合
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

        // 检查组合是否有效
        if (validCombinations[range] && validCombinations[range].includes(interval)) {
            return { valid: true, range, interval };
        }

        // 如果无效，找到最接近的有效组合
        const availableRanges = Object.keys(validCombinations);
        const availableIntervals = validCombinations[range] || validCombinations['1mo'];
        
        // 优先保持范围，调整间隔
        if (validCombinations[range]) {
            const fallbackInterval = validCombinations[range][validCombinations[range].length - 1];
            return { valid: false, range, interval: fallbackInterval };
        }
        
        // 如果范围也不支持，使用默认组合
        return { valid: false, range: '1mo', interval: '1d' };
    }

    // 获取股票实时价格 - 使用多种API源
    async getStockQuote(symbol, interval = '1d', range = '1d') {
        try {
            // 首先尝试 Yahoo Finance V8 API
            return await this.getStockQuoteYahooV8(symbol, interval, range);
        } catch (error) {
            console.log('Yahoo Finance V8 API 失败，尝试 V7 API:', error.message);
            try {
                // 备用方案：Yahoo Finance V7 API
                return await this.getStockQuoteYahooV7(symbol);
            } catch (v7Error) {
                console.log('Yahoo Finance V7 API 也失败，尝试备用端点:', v7Error.message);
                try {
                    // 最后备用方案：使用不同的端点
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
        // 使用更简单的参数，避免复杂的查询
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
        
        // 检查是否有错误信息
        if (data.chart && data.chart.error) {
            throw new Error(data.chart.error.description || 'API 返回错误');
        }
        
        if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
            throw new Error('未找到股票数据');
        }

        const result = data.chart.result[0];
        const meta = result.meta;
        const quote = result.indicators.quote[0];
        
        // 获取最新价格
        const prices = quote.close.filter(price => price !== null);
        const volumes = quote.volume.filter(vol => vol !== null);
        const highs = quote.high.filter(high => high !== null);
        const lows = quote.low.filter(low => low !== null);
        const opens = quote.open.filter(open => open !== null);
        
        const currentPrice = prices[prices.length - 1] || meta.regularMarketPrice;
        const previousClose = meta.chartPreviousClose || meta.previousClose;
        const change = currentPrice - previousClose;
        const changePercent = (change / previousClose) * 100;
        
        
        const resultData = {
            symbol: meta.symbol,
            price: currentPrice,
            change: change,
            changePercent: changePercent,
            volume: volumes[volumes.length - 1] || meta.regularMarketVolume,
            high: highs[highs.length - 1] || meta.regularMarketDayHigh,
            low: lows[lows.length - 1] || meta.regularMarketDayLow,
            open: opens[opens.length - 1] || meta.regularMarketOpen,
            previousClose: previousClose,
            marketState: meta.marketState || 'REGULAR',
            currency: meta.currency,
            exchange: meta.exchangeName,
            longName: meta.longName,
            shortName: meta.shortName,
            fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh,
            fiftyTwoWeekLow: meta.fiftyTwoWeekLow
        };
        
        return resultData;
    }

    // 备用 Yahoo Finance V7 API
    async getStockQuoteYahooV7(symbol) {
        try {
            const url = `${this.yahooQuoteURL}?symbols=${symbol}`;
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'application/json',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Referer': 'https://finance.yahoo.com/',
                    'Origin': 'https://finance.yahoo.com'
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
            
            const resultData = {
                symbol: quote.symbol,
                price: parseFloat(quote.regularMarketPrice),
                change: parseFloat(quote.regularMarketChange),
                changePercent: parseFloat(quote.regularMarketChangePercent),
                volume: parseInt(quote.regularMarketVolume),
                high: parseFloat(quote.regularMarketDayHigh),
                low: parseFloat(quote.regularMarketDayLow),
                open: parseFloat(quote.regularMarketOpen),
                previousClose: parseFloat(quote.previousClose),
                marketState: quote.marketState,
                currency: quote.currency,
                exchange: quote.exchange
            };
            
            return resultData;
        } catch (error) {
            console.error('Yahoo Finance V7 API 失败:', error);
            throw error;
        }
    }

    // 备用API方法 - 使用不同的端点
    async getStockQuoteAlternative(symbol) {
        // 使用更简单的端点
        const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbol}`;
        console.log(`备用API请求 URL (${symbol}):`, url);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1',
                'Accept': 'application/json',
                'Accept-Language': 'en-US,en;q=0.9'
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
        
        return {
            symbol: quote.symbol,
            price: parseFloat(quote.regularMarketPrice || quote.price || 0),
            change: parseFloat(quote.regularMarketChange || quote.change || 0),
            changePercent: parseFloat(quote.regularMarketChangePercent || quote.changePercent || 0),
            volume: parseInt(quote.regularMarketVolume || quote.volume || 0),
            high: parseFloat(quote.regularMarketDayHigh || quote.dayHigh || 0),
            low: parseFloat(quote.regularMarketDayLow || quote.dayLow || 0),
            open: parseFloat(quote.regularMarketOpen || quote.open || 0),
            previousClose: parseFloat(quote.previousClose || 0),
            marketState: quote.marketState || 'REGULAR',
            currency: quote.currency || 'USD',
            exchange: quote.exchange || 'NMS'
        };
    }

    // 备用 API - RapidAPI Yahoo Finance
    async getStockQuoteRapidAPI(symbol) {
        try {
            const url = `${this.rapidapiURL}/market/get-quotes?symbol=${symbol}`;
            const response = await fetch(url, {
                headers: {
                    'X-RapidAPI-Key': this.rapidapiKey,
                    'X-RapidAPI-Host': 'yahoo-finance15.p.rapidapi.com'
                }
            });

            if (!response.ok) {
                throw new Error(`RapidAPI HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (!data.body || data.body.length === 0) {
                throw new Error('未找到股票数据');
            }

            const quote = data.body[0];
            
            const resultData = {
                symbol: quote.symbol,
                price: parseFloat(quote.regularMarketPrice),
                change: parseFloat(quote.regularMarketChange),
                changePercent: parseFloat(quote.regularMarketChangePercent),
                volume: parseInt(quote.regularMarketVolume),
                high: parseFloat(quote.regularMarketDayHigh),
                low: parseFloat(quote.regularMarketDayLow),
                open: parseFloat(quote.regularMarketOpen),
                previousClose: parseFloat(quote.previousClose),
                marketState: quote.marketState,
                currency: quote.currency,
                exchange: quote.exchange
            };
            
            return resultData;
        } catch (error) {
            console.error('RapidAPI 也失败了:', error);
            throw new Error(`所有 API 都失败了: ${error.message}`);
        }
    }

    // 获取多个股票数据
    async getMultipleQuotes(symbols, interval = '1d', range = '1d') {
        const promises = symbols.map(symbol => this.getStockQuote(symbol, interval, range));
        const results = await Promise.allSettled(promises);
        
        return results.map((result, index) => ({
            symbol: symbols[index],
            success: result.status === 'fulfilled',
            data: result.status === 'fulfilled' ? result.value : null,
            error: result.status === 'rejected' ? result.reason.message : null
        }));
    }

    // 搜索股票 - 使用 Yahoo Finance API
    async searchStocks(query) {
        try {
            // 使用 Yahoo Finance 搜索 API
            const url = `${this.yahooSearchURL}?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0`;
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'application/json',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Referer': 'https://finance.yahoo.com/',
                    'Origin': 'https://finance.yahoo.com'
                },
                mode: 'cors'
            });


            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (!data.quotes || data.quotes.length === 0) {
                console.log('未找到搜索结果');
                return [];
            }

            // 转换数据格式以匹配原有接口
            const results = data.quotes.map(quote => ({
                '1. symbol': quote.symbol,
                '2. name': quote.longname || quote.shortname || quote.symbol,
                '3. type': quote.quoteType || 'EQUITY',
                '4. region': quote.region || 'US',
                '5. marketOpen': quote.marketState || 'REGULAR',
                '6. marketClose': quote.marketState || 'REGULAR',
                '7. timezone': quote.timezone || 'UTC',
                '8. currency': quote.currency || 'USD',
                '9. matchScore': quote.score || 1.0
            }));
            
            return results;
        } catch (error) {
            console.error('Yahoo Finance 搜索失败，尝试备用方案:', error);
            
            // 如果 Yahoo Finance 搜索失败，尝试使用 RapidAPI
            if (this.rapidapiKey) {
                return await this.searchStocksRapidAPI(query);
            }
            
            throw new Error(`搜索股票失败: ${error.message}`);
        }
    }

    // 备用搜索 API - RapidAPI Yahoo Finance
    async searchStocksRapidAPI(query) {
        try {
            const url = `${this.rapidapiURL}/market/search?query=${encodeURIComponent(query)}`;
            const response = await fetch(url, {
                headers: {
                    'X-RapidAPI-Key': this.rapidapiKey,
                    'X-RapidAPI-Host': 'yahoo-finance15.p.rapidapi.com'
                }
            });

            if (!response.ok) {
                throw new Error(`RapidAPI HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (!data.body || data.body.length === 0) {
                return [];
            }

            // 转换数据格式
            return data.body.map(quote => ({
                '1. symbol': quote.symbol,
                '2. name': quote.longName || quote.shortName || quote.symbol,
                '3. type': quote.quoteType || 'EQUITY',
                '4. region': quote.region || 'US',
                '5. marketOpen': quote.marketState || 'REGULAR',
                '6. marketClose': quote.marketState || 'REGULAR',
                '7. timezone': quote.timezone || 'UTC',
                '8. currency': quote.currency || 'USD',
                '9. matchScore': 1.0
            }));
        } catch (error) {
            console.error('RapidAPI 搜索也失败了:', error);
            throw new Error(`所有搜索 API 都失败了: ${error.message}`);
        }
    }

    // 获取市场指数
    async getMarketIndices() {
        const indices = [
            { symbol: 'DJI', name: '道琼斯' },
            { symbol: 'SPX', name: '标普500' },
            { symbol: 'IXIC', name: '纳斯达克' }
        ];

        try {
            const quotes = await this.getMultipleQuotes(indices.map(i => i.symbol));
            return quotes.map((quote, index) => ({
                ...indices[index],
                ...quote.data,
                success: quote.success
            }));
        } catch (error) {
            console.error('获取市场指数失败:', error);
            return indices.map(index => ({ ...index, success: false }));
        }
    }

    // 获取货币汇率 - 使用 Yahoo Finance API
    async getCurrencyRate(fromCurrency, toCurrency) {
        try {
            // 使用 Yahoo Finance 货币汇率 API
            const symbol = `${fromCurrency}${toCurrency}=X`;
            const url = `${this.yahooURL}/${symbol}?interval=1d&range=1d`;
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
                throw new Error('未找到汇率数据');
            }

            const result = data.chart.result[0];
            const meta = result.meta;
            const quote = result.indicators.quote[0];
            
            // 获取最新汇率
            const prices = quote.close.filter(price => price !== null);
            const currentRate = prices[prices.length - 1] || meta.regularMarketPrice;
            
            return parseFloat(currentRate.toFixed(4));
        } catch (error) {
            console.error('获取汇率失败:', error);
            
            // 如果 Yahoo Finance 失败，尝试使用 RapidAPI
            if (this.rapidapiKey) {
                return await this.getCurrencyRateRapidAPI(fromCurrency, toCurrency);
            }
            
            throw new Error(`获取汇率失败: ${error.message}`);
        }
    }

    // 备用货币汇率 API - RapidAPI
    async getCurrencyRateRapidAPI(fromCurrency, toCurrency) {
        try {
            const url = `${this.rapidapiURL}/market/get-quotes?symbol=${fromCurrency}${toCurrency}=X`;
            const response = await fetch(url, {
                headers: {
                    'X-RapidAPI-Key': this.rapidapiKey,
                    'X-RapidAPI-Host': 'yahoo-finance15.p.rapidapi.com'
                }
            });

            if (!response.ok) {
                throw new Error(`RapidAPI HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (!data.body || data.body.length === 0) {
                throw new Error('未找到汇率数据');
            }

            const quote = data.body[0];
            return parseFloat(quote.regularMarketPrice.toFixed(4));
        } catch (error) {
            console.error('RapidAPI 汇率也失败了:', error);
            throw new Error(`所有汇率 API 都失败了: ${error.message}`);
        }
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
            
            // 使用 Yahoo Finance API 获取历史数据
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

    // 获取新闻
    async getNews() {
        try {
            // 使用免费的财经新闻 API
            const url = 'https://api.rss2json.com/v1/api.json?rss_url=https://feeds.finance.yahoo.com/rss/2.0/headline';
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.status === 'ok' && data.items) {
                return data.items.slice(0, 10).map(item => ({
                    title: item.title,
                    description: item.description,
                    url: item.link,
                    publishedAt: item.pubDate,
                    source: { name: 'Yahoo Finance' }
                }));
            }
            
            // 备用新闻源
            return this.getFallbackNews();
        } catch (error) {
            console.error('获取新闻失败:', error);
            return this.getFallbackNews();
        }
    }

    getFallbackNews() {
        // 返回示例新闻数据
        return [
            {
                title: '市场动态：科技股表现强劲',
                description: '今日科技股整体表现良好，主要指数上涨。',
                url: '#',
                publishedAt: new Date().toISOString(),
                source: { name: '财经新闻' }
            },
            {
                title: '美联储政策影响市场走势',
                description: '美联储最新政策声明对市场产生重要影响。',
                url: '#',
                publishedAt: new Date(Date.now() - 3600000).toISOString(),
                source: { name: '财经新闻' }
            },
            {
                title: '加密货币市场波动加剧',
                description: '比特币等主要加密货币价格出现大幅波动。',
                url: '#',
                publishedAt: new Date(Date.now() - 7200000).toISOString(),
                source: { name: '财经新闻' }
            }
        ];
    }
}

// 投资组合管理
class PortfolioManager {
    constructor() {
        this.portfolio = [];
        this.watchlist = [];
    }

    async init() {
        await this.loadData();
    }

    async loadData() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['portfolio', 'watchlist'], (result) => {
                this.portfolio = result.portfolio || [];
                this.watchlist = result.watchlist || [];
                resolve();
            });
        });
    }

    async saveData() {
        return new Promise((resolve, reject) => {
            try {
                chrome.storage.local.set({
                    portfolio: this.portfolio,
                    watchlist: this.watchlist
                }, () => {
                    if (chrome.runtime.lastError) {
                        console.error('保存数据失败:', chrome.runtime.lastError);
                        reject(chrome.runtime.lastError);
                    } else {
                        console.log('数据保存成功');
                        resolve();
                    }
                });
            } catch (error) {
                console.error('保存数据时发生错误:', error);
                reject(error);
            }
        });
    }

    addToPortfolio(symbol, quantity, purchasePrice) {
        const existingIndex = this.portfolio.findIndex(item => item.symbol === symbol);
        
        if (existingIndex >= 0) {
            // 更新现有持仓
            const existing = this.portfolio[existingIndex];
            const totalQuantity = existing.quantity + quantity;
            const totalCost = (existing.quantity * existing.purchasePrice) + (quantity * purchasePrice);
            const averagePrice = totalCost / totalQuantity;
            
            this.portfolio[existingIndex] = {
                ...existing,
                quantity: totalQuantity,
                purchasePrice: averagePrice
            };
        } else {
            // 添加新持仓
            this.portfolio.push({
                symbol,
                quantity,
                purchasePrice,
                addedAt: new Date().toISOString()
            });
        }
        
        this.saveData();
    }

    async addToWatchlist(symbol) {
        console.log('PortfolioManager.addToWatchlist 被调用:', symbol);
        console.log('当前观察列表:', this.watchlist);
        
        if (!this.watchlist.includes(symbol)) {
            this.watchlist.push(symbol);
            console.log('股票已添加到观察列表:', symbol);
            console.log('更新后的观察列表:', this.watchlist);
            
            try {
                await this.saveData();
                console.log('数据已保存');
            } catch (error) {
                console.error('保存数据失败:', error);
                // 如果保存失败，从列表中移除刚添加的股票
                this.watchlist = this.watchlist.filter(item => item !== symbol);
                throw error;
            }
        } else {
            console.log('股票已在观察列表中:', symbol);
        }
    }

    removeFromPortfolio(symbol) {
        this.portfolio = this.portfolio.filter(item => item.symbol !== symbol);
        this.saveData();
    }

    removeFromWatchlist(symbol) {
        this.watchlist = this.watchlist.filter(item => item !== symbol);
        this.saveData();
    }

    calculatePortfolioValue(currentPrices) {
        let totalValue = 0;
        let totalCost = 0;
        let todayGain = 0;

        this.portfolio.forEach(item => {
            const currentPrice = currentPrices[item.symbol]?.price || 0;
            const currentValue = item.quantity * currentPrice;
            const cost = item.quantity * item.purchasePrice;
            const gain = currentValue - cost;
            
            totalValue += currentValue;
            totalCost += cost;
            todayGain += gain;
        });

        return {
            totalValue,
            totalCost,
            totalGain: totalValue - totalCost,
            totalGainPercent: totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0,
            todayGain
        };
    }
}

// 价格提醒管理
class AlertManager {
    constructor() {
        this.alerts = [];
    }

    async init() {
        await this.loadAlerts();
    }

    async loadAlerts() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['alerts'], (result) => {
                this.alerts = result.alerts || [];
                resolve();
            });
        });
    }

    async saveAlerts() {
        return new Promise((resolve) => {
            chrome.storage.local.set({ alerts: this.alerts }, resolve);
        });
    }

    addAlert(symbol, targetPrice, condition) {
        const alert = {
            id: Date.now().toString(),
            symbol,
            targetPrice,
            condition, // 'above' or 'below'
            createdAt: new Date().toISOString(),
            triggered: false
        };
        
        this.alerts.push(alert);
        this.saveAlerts();
    }

    checkAlerts(currentPrices) {
        this.alerts.forEach(alert => {
            if (alert.triggered) return;
            
            const currentPrice = currentPrices[alert.symbol]?.price;
            if (!currentPrice) return;

            let shouldTrigger = false;
            if (alert.condition === 'above' && currentPrice >= alert.targetPrice) {
                shouldTrigger = true;
            } else if (alert.condition === 'below' && currentPrice <= alert.targetPrice) {
                shouldTrigger = true;
            }

            if (shouldTrigger) {
                this.triggerAlert(alert, currentPrice);
            }
        });
    }

    // 检查单个股票的价格提醒
    checkSingleAlert(symbol, quote) {
        const currentPrices = { [symbol]: quote };
        this.checkAlerts(currentPrices);
    }

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

// 主应用类
class StocksApp {
    constructor() {
        this.apiService = new StockAPIService();
        this.portfolioManager = new PortfolioManager();
        this.alertManager = new AlertManager();
        this.currentTab = 'portfolio';
        this.refreshInterval = null;
        
        // 全局货币设置
        this.globalCurrency = 'USD'; // 默认美元
        this.exchangeRate = null; // 当前汇率缓存
        this.lastRateUpdate = null; // 汇率更新时间
        
        // 实时更新相关
        this.updateIntervals = new Map(); // 存储每个股票的独立更新间隔
        this.isUpdating = new Set(); // 跟踪正在更新的股票
        this.lastUpdateTime = new Map(); // 存储每个股票的最后更新时间
        this.updateFrequency = 5000; // 5秒更新一次（交易时间内）
        this.offHoursUpdateFrequency = 30000; // 非交易时间30秒更新一次
        this.cryptoUpdateFrequency = 1000; // 加密货币1秒更新一次
        this.marketStatus = 'unknown'; // 'open', 'closed', 'pre-market', 'after-hours'
        this.priceHistory = new Map(); // 存储价格历史用于动画效果
        
            // Lightweight Charts 相关
            this.chart = null; // Lightweight Charts 实例
            this.candlestickSeries = null; // 蜡烛图系列
            this.chartUpdateIntervals = new Map(); // 存储每个股票的K线图更新间隔
            this.currentChartSymbol = null; // 当前显示的K线图股票
            this.chartDataCache = new Map(); // 缓存K线图数据
            this.chartCurrentPeriod = '1d'; // 当前K线周期
            this.chartCurrentRange = '1mo'; // 当前时间范围
            this.chartContainer = null; // 图表容器
            this.isChartModalOpen = false; // 图表弹窗是否打开
            this.chartEventListeners = new Map(); // 存储图表事件监听器
    }

    async init() {
        await this.apiService.init();
        await this.portfolioManager.init();
        await this.alertManager.init();
        
        // 检查LightweightCharts库是否可用
        if (typeof LightweightCharts === 'undefined') {
            console.log('等待LightweightCharts库加载...');
            await this.waitForLightweightCharts();
        }
        
        this.setupEventListeners();
        this.loadInitialData();
        this.startAutoRefresh();
        this.startRealTimeUpdates();
    }

    // 等待LightweightCharts库加载
    async waitForLightweightCharts() {
        return new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                if (typeof LightweightCharts !== 'undefined') {
                    clearInterval(checkInterval);
                    console.log('LightweightCharts库已加载');
                    resolve();
                }
            }, 100);
            
            // 10秒超时
            setTimeout(() => {
                clearInterval(checkInterval);
                console.warn('LightweightCharts库加载超时');
                resolve();
            }, 10000);
        });
    }

    setupEventListeners() {
        // 标签页切换
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.currentTarget.dataset.tab;
                this.switchTab(tabName);
            });
        });

        // 搜索功能
        const searchInput = document.getElementById('stockSearch');
        const searchBtn = document.getElementById('searchBtn');
        
        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                this.handleSearch();
            });
        }

        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleSearch();
                }
            });
        }

        // 添加股票按钮
        const addStockBtn = document.getElementById('addStockBtn');
        const addWatchlistBtn = document.getElementById('addWatchlistBtn');
        
        if (addStockBtn) {
            addStockBtn.addEventListener('click', () => {
                this.showAddStockModal();
            });
        }

        if (addWatchlistBtn) {
            addWatchlistBtn.addEventListener('click', () => {
                this.showAddStockModal();
            });
        }

        // 模态框关闭
        const modalClose = document.getElementById('modalClose');
        const addStockModalClose = document.getElementById('addStockModalClose');
        const cancelAddStock = document.getElementById('cancelAddStock');
        const confirmAddStock = document.getElementById('confirmAddStock');

        if (modalClose) {
            modalClose.addEventListener('click', () => {
                this.hideModal('stockModal');
            });
        }

        if (addStockModalClose) {
            addStockModalClose.addEventListener('click', () => {
                this.hideModal('addStockModal');
            });
        }

        if (cancelAddStock) {
            cancelAddStock.addEventListener('click', () => {
                this.hideModal('addStockModal');
            });
        }

        if (confirmAddStock) {
            confirmAddStock.addEventListener('click', () => {
                this.addStock();
            });
        }

        // 设置按钮
        const settingsBtn = document.getElementById('settingsBtn');
        const settingsModalClose = document.getElementById('settingsModalClose');
        const cancelSettings = document.getElementById('cancelSettings');
        const saveSettings = document.getElementById('saveSettings');
        const manageAlertsBtn = document.getElementById('manageAlertsBtn');

        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                this.showSettingsModal();
            });
        }

        if (settingsModalClose) {
            settingsModalClose.addEventListener('click', () => {
                this.hideModal('settingsModal');
            });
        }

        if (cancelSettings) {
            cancelSettings.addEventListener('click', () => {
                this.hideModal('settingsModal');
            });
        }

        if (saveSettings) {
            saveSettings.addEventListener('click', () => {
                this.saveSettings();
            });
        }

        if (manageAlertsBtn) {
            manageAlertsBtn.addEventListener('click', () => {
                this.showAlertsModal();
            });
        }

        // 价格提醒管理
        const alertsModalClose = document.getElementById('alertsModalClose');
        const addAlertBtn = document.getElementById('addAlertBtn');

        if (alertsModalClose) {
            alertsModalClose.addEventListener('click', () => {
                this.hideModal('alertsModal');
            });
        }

        if (addAlertBtn) {
            addAlertBtn.addEventListener('click', () => {
                this.addAlert();
            });
        }

        // 测试按钮
        const testWatchlistBtn = document.getElementById('testWatchlistBtn');
        if (testWatchlistBtn) {
            testWatchlistBtn.addEventListener('click', () => {
                this.testWatchlistFunction();
            });
        }

        // 测试股票详情按钮
        const testStockDetailsBtn = document.getElementById('testStockDetailsBtn');
        if (testStockDetailsBtn) {
            testStockDetailsBtn.addEventListener('click', () => {
                this.testStockDetailsFunction();
            });
        }

        // 刷新按钮
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.refreshData();
            });
        }

        // 货币转换
        this.setupCurrencyConverter();
        
        // K线图控制事件监听器
        this.setupChartEventListeners();
    }

    // 设置K线图事件监听器（仅在弹窗打开时调用）
    setupChartEventListeners() {
        // 清理旧的事件监听器
        this.cleanupChartEventListeners();
        
        // 周期切换
        const chartRangeSelect = document.getElementById('chartRange');
        const chartIntervalSelect = document.getElementById('chartInterval');
        
        if (chartRangeSelect) {
            const rangeHandler = (e) => {
                this.chartCurrentRange = e.target.value;
                this.updateIntervalOptions(e.target.value);
                this.updateChartPeriod();
            };
            chartRangeSelect.addEventListener('change', rangeHandler);
            this.chartEventListeners.set('chartRange', { element: chartRangeSelect, event: 'change', handler: rangeHandler });
        }
        
        if (chartIntervalSelect) {
            const intervalHandler = (e) => {
                this.chartCurrentPeriod = e.target.value;
                this.updateChartPeriod();
            };
            chartIntervalSelect.addEventListener('change', intervalHandler);
            this.chartEventListeners.set('chartInterval', { element: chartIntervalSelect, event: 'change', handler: intervalHandler });
        }

        // K线图画布交互事件
        const canvas = document.getElementById('candlestickCanvas');
        if (canvas) {
            // 鼠标移动事件（十字光标）
            const mouseMoveHandler = (e) => this.handleChartMouseMove(e);
            canvas.addEventListener('mousemove', mouseMoveHandler);
            this.chartEventListeners.set('canvas-mousemove', { element: canvas, event: 'mousemove', handler: mouseMoveHandler });

            // 鼠标离开事件（隐藏十字光标）
            const mouseLeaveHandler = () => {
                this.chartCrosshairVisible = false;
                this.redrawChart();
            };
            canvas.addEventListener('mouseleave', mouseLeaveHandler);
            this.chartEventListeners.set('canvas-mouseleave', { element: canvas, event: 'mouseleave', handler: mouseLeaveHandler });

            // 鼠标按下事件（开始拖拽）
            const mouseDownHandler = (e) => this.handleChartMouseDown(e);
            canvas.addEventListener('mousedown', mouseDownHandler);
            this.chartEventListeners.set('canvas-mousedown', { element: canvas, event: 'mousedown', handler: mouseDownHandler });

            // 鼠标释放事件（结束拖拽）
            const mouseUpHandler = () => this.handleChartMouseUp();
            canvas.addEventListener('mouseup', mouseUpHandler);
            this.chartEventListeners.set('canvas-mouseup', { element: canvas, event: 'mouseup', handler: mouseUpHandler });

            // 滚轮事件（缩放）
            const wheelHandler = (e) => this.handleChartWheel(e);
            canvas.addEventListener('wheel', wheelHandler);
            this.chartEventListeners.set('canvas-wheel', { element: canvas, event: 'wheel', handler: wheelHandler });

            // 双击事件（重置缩放）
            const dblClickHandler = () => this.resetChartZoom();
            canvas.addEventListener('dblclick', dblClickHandler);
            this.chartEventListeners.set('canvas-dblclick', { element: canvas, event: 'dblclick', handler: dblClickHandler });
        }
    }

    // 清理图表事件监听器
    cleanupChartEventListeners() {
        this.chartEventListeners.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        this.chartEventListeners.clear();
    }

    switchTab(tabName) {
        // 更新标签页状态
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
        });
        const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
        if (activeTab) {
            activeTab.classList.add('active');
        }

        // 更新内容区域
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        const activeContent = document.getElementById(`${tabName}-tab`);
        if (activeContent) {
            activeContent.classList.add('active');
        }

        this.currentTab = tabName;

        // 加载对应数据
        switch (tabName) {
            case 'portfolio':
                this.loadPortfolio();
                break;
            case 'watchlist':
                this.loadWatchlist();
                break;
            case 'news':
                this.loadNews();
                break;
            case 'markets':
                this.loadMarketData();
                break;
        }
    }

    // 启动实时价格更新
    startRealTimeUpdates() {
        // 清除所有现有的更新间隔
        this.stopRealTimeUpdates();
        
        // 立即执行一次市场状态更新
        this.updateMarketStatus();
        
        // 为每个股票设置独立的更新间隔
        this.setupIndividualUpdates();
    }
    
    // 停止实时更新
    stopRealTimeUpdates() {
        // 清除所有股票的更新间隔
        this.updateIntervals.forEach((intervalId, symbol) => {
            clearInterval(intervalId);
        });
        this.updateIntervals.clear();
        this.isUpdating.clear();
        
        // 清除所有K线图更新间隔
        this.chartUpdateIntervals.forEach((intervalId, symbol) => {
            clearInterval(intervalId);
        });
        this.chartUpdateIntervals.clear();
    }
    
    // 设置独立的更新间隔
    setupIndividualUpdates() {
        const symbolsToUpdate = this.getSymbolsToUpdate();
        
        symbolsToUpdate.forEach(symbol => {
            this.setupSymbolUpdate(symbol);
        });
    }
    
    // 为单个股票设置更新间隔
    setupSymbolUpdate(symbol) {
        // 如果已经有更新间隔，先清除
        if (this.updateIntervals.has(symbol)) {
            clearInterval(this.updateIntervals.get(symbol));
        }
        
        // 获取该股票的更新频率
        const frequency = this.getSymbolUpdateFrequency(symbol);
        
        // 立即执行一次更新
        this.updateSymbolPrice(symbol);
        
        // 设置定时更新
        const intervalId = setInterval(() => {
            this.updateSymbolPrice(symbol);
        }, frequency);
        
        this.updateIntervals.set(symbol, intervalId);
    }
    
    // 获取单个股票的更新频率
    getSymbolUpdateFrequency(symbol) {
        if (this.isCryptocurrency(symbol)) {
            return this.cryptoUpdateFrequency; // 1秒
        } else {
            // 传统股票根据市场状态决定
            return this.marketStatus === 'open' ? 
                this.updateFrequency : 
                this.offHoursUpdateFrequency;
        }
    }
    
    // 更新单个股票价格
    async updateSymbolPrice(symbol) {
        // 防止重复更新
        if (this.isUpdating.has(symbol)) {
            console.log(`${symbol} 正在更新中，跳过本次更新`);
            return;
        }
        
        this.isUpdating.add(symbol);
        this.lastUpdateTime.set(symbol, new Date());
        
        try {
            
            // 获取价格数据
            const quote = await this.apiService.getStockQuote(symbol);
            
            if (quote) {
                // 更新UI显示
                await this.updateSinglePriceDisplay(symbol, quote);
                
                // 检查价格提醒
                this.alertManager.checkSingleAlert(symbol, quote);
            }
            
        } catch (error) {
            console.error(`更新 ${symbol} 价格失败:`, error);
        } finally {
            this.isUpdating.delete(symbol);
        }
    }
    
    // 更新单个价格显示
    async updateSinglePriceDisplay(symbol, quote) {
        const updatedPrices = { [symbol]: quote };
        
        // 更新投资组合中的价格
        await this.updatePortfolioPrices(updatedPrices);
        
        // 更新观察列表中的价格
        await this.updateWatchlistPrices(updatedPrices);
        
        // 更新市场数据中的价格
        await this.updateMarketDataPrices(updatedPrices);
    }
    
    // 检测是否为加密货币交易对
    isCryptocurrency(symbol) {
        // 使用更简洁的检测方法：检查是否以-USD结尾且不是传统股票
        if (!symbol || typeof symbol !== 'string') return false;
        
        // 常见的加密货币符号列表（更高效）
        const cryptoSymbols = new Set([
            'BTC-USD', 'ETH-USD', 'ADA-USD', 'SOL-USD', 'MATIC-USD',
            'DOT-USD', 'AVAX-USD', 'LINK-USD', 'UNI-USD', 'AAVE-USD',
            'LTC-USD', 'BCH-USD', 'XRP-USD', 'DOGE-USD', 'SHIB-USD',
            'ATOM-USD', 'NEAR-USD', 'FTM-USD', 'ALGO-USD', 'VET-USD',
            'TRX-USD', 'XLM-USD', 'EOS-USD', 'XTZ-USD', 'FIL-USD',
            'ICP-USD', 'THETA-USD', 'HBAR-USD', 'MANA-USD', 'SAND-USD',
            'CRV-USD', 'COMP-USD', 'MKR-USD', 'SNX-USD', 'YFI-USD',
            '1INCH-USD', 'BAT-USD', 'ZRX-USD', 'ENJ-USD', 'CHZ-USD',
            'GRT-USD', 'LRC-USD', 'OMG-USD', 'KNC-USD', 'REN-USD',
            'STORJ-USD', 'DASH-USD', 'ZEC-USD', 'XMR-USD', 'NEO-USD',
            'QTUM-USD', 'IOTA-USD', 'ONT-USD', 'ICX-USD', 'WAVES-USD',
            'NANO-USD', 'SC-USD', 'DGB-USD', 'RVN-USD', 'DCR-USD',
            'LSK-USD', 'ARK-USD', 'REP-USD', 'GNT-USD', 'FUN-USD',
            'POWR-USD', 'REQ-USD', 'KMD-USD', 'SYS-USD', 'PART-USD',
            'DNT-USD', 'CVC-USD', 'ADX-USD', 'MCO-USD', 'EDG-USD',
            'WINGS-USD', 'RLC-USD', 'GAS-USD', 'FCT-USD', 'MAID-USD',
            'DGD-USD', '1ST-USD', 'CFI-USD', 'RDN-USD', 'ADT-USD',
            'QSP-USD', 'MYST-USD', 'BQX-USD', 'EVX-USD', 'VIB-USD',
            'TRST-USD'
        ]);
        
        return cryptoSymbols.has(symbol.toUpperCase());
    }

    // 检查是否有加密货币在监控列表中（用于UI显示）
    hasCryptocurrencyInWatchlist() {
        const allSymbols = this.getSymbolsToUpdate();
        return allSymbols.some(symbol => this.isCryptocurrency(symbol));
    }
    
    // 当股票列表变化时重新设置更新间隔
    refreshUpdateIntervals() {
        const currentSymbols = this.getSymbolsToUpdate();
        const existingSymbols = Array.from(this.updateIntervals.keys());
        
        // 添加新的股票
        currentSymbols.forEach(symbol => {
            if (!this.updateIntervals.has(symbol)) {
                this.setupSymbolUpdate(symbol);
            }
        });
        
        // 移除不再需要的股票
        existingSymbols.forEach(symbol => {
            if (!currentSymbols.includes(symbol)) {
                const intervalId = this.updateIntervals.get(symbol);
                if (intervalId) {
                    clearInterval(intervalId);
                    this.updateIntervals.delete(symbol);
                    this.isUpdating.delete(symbol);
                    console.log(`移除 ${symbol} 的更新间隔`);
                }
            }
        });
    }
    
    // 更新市场状态
    async updateMarketStatus() {
        try {
            const now = new Date();
            const hour = now.getHours();
            const minute = now.getMinutes();
            const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
            
            // 美股交易时间（东部时间）
            // 正常交易时间：周一至周五 9:30 AM - 4:00 PM ET
            // 盘前交易：4:00 AM - 9:30 AM ET
            // 盘后交易：4:00 PM - 8:00 PM ET
            
            if (dayOfWeek === 0 || dayOfWeek === 6) {
                this.marketStatus = 'closed';
            } else {
                const currentTime = hour * 60 + minute;
                const marketOpen = 9 * 60 + 30; // 9:30 AM
                const marketClose = 16 * 60; // 4:00 PM
                const preMarketStart = 4 * 60; // 4:00 AM
                const afterHoursEnd = 20 * 60; // 8:00 PM
                
                if (currentTime >= marketOpen && currentTime < marketClose) {
                    this.marketStatus = 'open';
                } else if (currentTime >= preMarketStart && currentTime < marketOpen) {
                    this.marketStatus = 'pre-market';
                } else if (currentTime >= marketClose && currentTime < afterHoursEnd) {
                    this.marketStatus = 'after-hours';
                } else {
                    this.marketStatus = 'closed';
                }
            }
            
            // 更新UI显示市场状态
            this.updateMarketStatusDisplay();
            
        } catch (error) {
            console.error('更新市场状态失败:', error);
            this.marketStatus = 'unknown';
        }
    }
    
    // 更新市场状态显示
    updateMarketStatusDisplay() {
        const statusElement = document.getElementById('marketStatus');
        if (!statusElement) return;
        
        // 检查是否有加密货币在监控列表中
        const hasCrypto = this.hasCryptocurrencyInWatchlist();
        
        let statusText;
        if (hasCrypto) {
            statusText = {
                'open': '🟢 交易中 (含加密货币)',
                'closed': '🟢 加密货币24h交易中',
                'pre-market': '🟡 盘前交易 (含加密货币)',
                'after-hours': '🟡 盘后交易 (含加密货币)',
                'unknown': '🟢 加密货币24h交易中'
            };
        } else {
            statusText = {
                'open': '🟢 交易中',
                'closed': '🔴 休市',
                'pre-market': '🟡 盘前交易',
                'after-hours': '🟡 盘后交易',
                'unknown': '❓ 状态未知'
            };
        }
        
        statusElement.textContent = statusText[this.marketStatus] || '❓ 状态未知';
        statusElement.className = `market-status ${this.marketStatus}${hasCrypto ? ' crypto-active' : ''}`;
    }
    
    // 执行实时更新
    async performRealTimeUpdate() {
        if (this.isUpdating) {
            console.log('正在更新中，跳过本次更新');
            return;
        }
        
        this.isUpdating = true;
        this.lastUpdateTime = new Date();
        
        try {
            console.log(`开始实时更新 - 市场状态: ${this.marketStatus}`);
            
            // 更新市场状态
            await this.updateMarketStatus();
            
            // 获取需要更新的股票代码
            const symbolsToUpdate = this.getSymbolsToUpdate();
            
            if (symbolsToUpdate.length === 0) {
                console.log('没有需要更新的股票');
                return;
            }
            
            // 批量获取价格数据
            const updatedPrices = await this.batchUpdatePrices(symbolsToUpdate);
            
            // 更新UI显示
            await this.updatePriceDisplays(updatedPrices);
            
            // 检查价格提醒
            this.alertManager.checkAlerts(updatedPrices);
            
            console.log(`实时更新完成 - 更新了 ${Object.keys(updatedPrices).length} 只股票`);
            
        } catch (error) {
            console.error('实时更新失败:', error);
        } finally {
            this.isUpdating = false;
        }
    }
    
    // 获取需要更新的股票代码
    getSymbolsToUpdate() {
        const symbols = new Set();
        
        // 添加投资组合中的股票
        this.portfolioManager.portfolio.forEach(item => {
            symbols.add(item.symbol);
        });
        
        // 添加观察列表中的股票
        this.portfolioManager.watchlist.forEach(symbol => {
            symbols.add(symbol);
        });
        
        // 添加价格提醒中的股票
        this.alertManager.alerts.forEach(alert => {
            symbols.add(alert.symbol);
        });
        
        return Array.from(symbols);
    }
    
    // 批量更新价格（优化API调用）
    async batchUpdatePrices(symbols) {
        const updatedPrices = {};
        const batchSize = 5; // 每批处理5个股票，避免API限制
        
        for (let i = 0; i < symbols.length; i += batchSize) {
            const batch = symbols.slice(i, i + batchSize);
            
            try {
                const promises = batch.map(async (symbol) => {
                    try {
                        const quote = await this.apiService.getStockQuote(symbol);
                        return { symbol, quote };
                    } catch (error) {
                        console.error(`获取 ${symbol} 价格失败:`, error);
                        return { symbol, quote: null };
                    }
                });
                
                const results = await Promise.allSettled(promises);
                
                results.forEach((result, index) => {
                    if (result.status === 'fulfilled' && result.value.quote) {
                        updatedPrices[result.value.symbol] = result.value.quote;
                    }
                });
                
                // 批次间延迟，避免API限制
                if (i + batchSize < symbols.length) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
                
            } catch (error) {
                console.error(`批次更新失败:`, error);
            }
        }
        
        return updatedPrices;
    }
    
    // 更新价格显示
    async updatePriceDisplays(updatedPrices) {
        // 更新投资组合
        await this.updatePortfolioPrices(updatedPrices);
        
        // 更新观察列表
        await this.updateWatchlistPrices(updatedPrices);
        
        // 更新市场数据
        await this.updateMarketDataPrices(updatedPrices);
    }
    
    // 更新投资组合价格显示
    async updatePortfolioPrices(updatedPrices) {
        const portfolioItems = document.querySelectorAll('.portfolio-item');
        
        portfolioItems.forEach(item => {
            const symbolElement = item.querySelector('.stock-symbol');
            if (!symbolElement) return;
            
            const symbol = symbolElement.textContent.trim();
            const quote = updatedPrices[symbol];
            
            if (!quote) return;
            
            // 更新价格显示
            const priceElement = item.querySelector('.stock-current-price');
            const changeElement = item.querySelector('.stock-change');
            
            if (priceElement) {
                const newPrice = this.formatPrice(quote.price, null, quote.currency);
                const oldPrice = priceElement.textContent;
                
                if (oldPrice !== newPrice) {
                    this.animatePriceChange(priceElement, oldPrice, newPrice);
                }
            }
            
            if (changeElement) {
                const gain = quote.price - this.portfolioManager.portfolio.find(p => p.symbol === symbol)?.purchasePrice || 0;
                const gainPercent = (gain / (this.portfolioManager.portfolio.find(p => p.symbol === symbol)?.purchasePrice || 1)) * 100;
                
                const newChange = `${this.formatChange(gain, null, quote.currency)} (${this.formatChangePercent(gainPercent)})`;
                const oldChange = changeElement.textContent;
                
                if (oldChange !== newChange) {
                    this.animatePriceChange(changeElement, oldChange, newChange);
                }
            }
        });
    }
    
    // 更新观察列表价格显示
    async updateWatchlistPrices(updatedPrices) {
        const watchlistItems = document.querySelectorAll('.watchlist-item');
        
        watchlistItems.forEach(item => {
            const symbolElement = item.querySelector('.stock-symbol');
            if (!symbolElement) return;
            
            const symbol = symbolElement.textContent.trim();
            const quote = updatedPrices[symbol];
            
            if (!quote) return;
            
            // 更新价格显示
            const priceElement = item.querySelector('.stock-current-price');
            const changeElement = item.querySelector('.stock-change');
            
            if (priceElement) {
                const newPrice = this.formatPrice(quote.price, null, quote.currency);
                const oldPrice = priceElement.textContent;
                
                if (oldPrice !== newPrice) {
                    this.animatePriceChange(priceElement, oldPrice, newPrice);
                }
            }
            
            if (changeElement) {
                const newChange = `${this.formatChange(quote.change, null, quote.currency)} (${this.formatChangePercent(quote.changePercent)})`;
                const oldChange = changeElement.textContent;
                
                if (oldChange !== newChange) {
                    this.animatePriceChange(changeElement, oldChange, newChange);
                }
            }
        });
    }
    
    // 更新市场数据价格显示
    async updateMarketDataPrices(updatedPrices) {
        // 这里可以更新市场指数的价格显示
        // 由于市场指数通常不需要频繁更新，这里暂时跳过
    }
    
    // 价格变化动画
    animatePriceChange(element, oldValue, newValue) {
        // 添加变化动画类
        element.classList.add('price-updating');
        
        // 短暂延迟后更新价格
        setTimeout(() => {
            element.textContent = newValue;
            element.classList.remove('price-updating');
            element.classList.add('price-updated');
            
            // 移除更新完成类
            setTimeout(() => {
                element.classList.remove('price-updated');
            }, 1000);
        }, 100);
    }

    // 初始化股票图表
    async initializeStockChart(symbol, currency) {
        try {
            const chartLoading = document.getElementById('chartLoading');
            const chartContainer = document.querySelector('.chart-container');
            
            if (chartLoading) {
                chartLoading.style.display = 'flex';
            }
            if (chartContainer) {
                chartContainer.style.display = 'none';
            }
            
            // 等待Chart.js库加载
            try {
                await this.waitForChartJS();
            } catch (error) {
                console.log('Chart.js 加载失败，使用备用图表');
            }
            
            // 获取历史数据
            const historicalData = await this.apiService.getHistoricalData(symbol, '1mo', '1d');
            
            // 创建图表
            this.createStockChart(historicalData, currency);
            
            if (chartLoading) {
                chartLoading.style.display = 'none';
            }
            if (chartContainer) {
                chartContainer.style.display = 'block';
            }
            
        } catch (error) {
            console.error('初始化图表失败:', error);
            
            const chartLoading = document.getElementById('chartLoading');
            const chartContainer = document.querySelector('.chart-container');
            
            if (chartLoading) {
                chartLoading.innerHTML = '<i class="fas fa-exclamation-triangle"></i><span>图表加载失败</span>';
            }
            if (chartContainer) {
                chartContainer.style.display = 'block';
            }
        }
    }

    // 等待Chart.js库加载
    async waitForChartJS() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 50; // 最多等待5秒
            
            const checkChart = () => {
                attempts++;
                
                if (typeof Chart !== 'undefined') {
                    console.log('Chart.js 库已加载');
                    resolve();
                } else if (attempts >= maxAttempts) {
                    console.error('Chart.js 库加载超时');
                    reject(new Error('Chart.js 库加载超时'));
                } else {
                    setTimeout(checkChart, 100);
                }
            };
            
            checkChart();
        });
    }

    // 创建股票图表
    createStockChart(historicalData, currency) {
        const canvas = document.getElementById('stockChart');
        if (!canvas) {
            console.error('图表画布未找到');
            return;
        }

        // 检查Chart.js是否已加载
        if (typeof Chart === 'undefined') {
            console.error('Chart.js 库未加载，使用备用图表');
            this.createSimpleChart(historicalData, currency);
            return;
        }

        // 销毁现有图表
        if (this.stockChart) {
            this.stockChart.destroy();
        }

        const ctx = canvas.getContext('2d');
        
        // 准备图表数据
        const labels = historicalData.data.map(item => {
            const date = item.date;
            return date.toLocaleDateString('zh-CN', { 
                month: 'short', 
                day: 'numeric' 
            });
        });
        
        const prices = historicalData.data.map(item => item.close);
        
        // 确定价格颜色（基于涨跌）
        const firstPrice = prices[0];
        const lastPrice = prices[prices.length - 1];
        const isPositive = lastPrice >= firstPrice;
        
        this.stockChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: `${historicalData.symbol} 价格`,
                    data: prices,
                    borderColor: isPositive ? '#28a745' : '#dc3545',
                    backgroundColor: isPositive ? 'rgba(40, 167, 69, 0.1)' : 'rgba(220, 53, 69, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.1,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    pointHoverBackgroundColor: isPositive ? '#28a745' : '#dc3545',
                    pointHoverBorderColor: '#fff',
                    pointHoverBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: isPositive ? '#28a745' : '#dc3545',
                        borderWidth: 1,
                        callbacks: {
                            label: function(context) {
                                const value = context.parsed.y;
                                const formattedValue = value.toFixed(2);
                                return `${historicalData.symbol}: ${formattedValue} ${currency}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        display: true,
                        grid: {
                            display: false
                        },
                        ticks: {
                            maxTicksLimit: 8,
                            font: {
                                size: 10
                            }
                        }
                    },
                    y: {
                        display: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)',
                            drawBorder: false
                        },
                        ticks: {
                            font: {
                                size: 10
                            },
                            callback: function(value) {
                                return value.toFixed(2);
                            }
                        }
                    }
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                },
                elements: {
                    point: {
                        radius: 0
                    }
                }
            }
        });
    }

    // 更新股票图表
    async updateStockChart(symbol, range, interval) {
        try {
            const chartLoading = document.getElementById('chartLoading');
            const chartContainer = document.querySelector('.chart-container');
            
            if (chartLoading) {
                chartLoading.style.display = 'flex';
            }
            if (chartContainer) {
                chartContainer.style.display = 'none';
            }
            
            // 等待Chart.js库加载
            try {
                await this.waitForChartJS();
            } catch (error) {
                console.log('Chart.js 加载失败，使用备用图表');
            }
            
            // 获取新的历史数据
            const historicalData = await this.apiService.getHistoricalData(symbol, range, interval);
            
            // 更新图表数据
            if (this.stockChart) {
                this.stockChart.destroy();
            }
            
            // 重新创建图表
            this.createStockChart(historicalData, historicalData.currency);
            
            if (chartLoading) {
                chartLoading.style.display = 'none';
            }
            if (chartContainer) {
                chartContainer.style.display = 'block';
            }
            
        } catch (error) {
            console.error('更新图表失败:', error);
            
            const chartLoading = document.getElementById('chartLoading');
            const chartContainer = document.querySelector('.chart-container');
            
            if (chartLoading) {
                chartLoading.innerHTML = '<i class="fas fa-exclamation-triangle"></i><span>图表更新失败</span>';
            }
            if (chartContainer) {
                chartContainer.style.display = 'block';
            }
        }
    }

    // 初始化K线图
    async initializeCandlestickChart(symbol, currency) {
        try {
            const chartLoading = document.getElementById('chartLoading');
            const chartContainer = document.querySelector('.chart-container');
            
            if (chartLoading) {
                chartLoading.style.display = 'flex';
            }
            if (chartContainer) {
                chartContainer.style.display = 'none';
            }
            
            // 设置当前K线图股票
            this.currentChartSymbol = symbol;
            
            // 根据股票类型选择不同的时间间隔
            let range, interval;
            if (this.isCryptocurrency(symbol)) {
                range = '7d'; // 加密货币显示7天数据
                interval = '1h'; // 1小时K线
            } else {
                range = '1mo'; // 传统股票显示1个月数据
                interval = '1d'; // 1天K线
            }
            
            // 获取历史数据
            const historicalData = await this.apiService.getHistoricalData(symbol, range, interval);
            
            // 缓存数据
            this.chartDataCache.set(symbol, historicalData);
            
            // 创建K线图
            this.createCandlestickChart(historicalData, currency, symbol);
            
            // 启动K线图实时更新
            this.startChartRealTimeUpdate(symbol);
            
            if (chartLoading) {
                chartLoading.style.display = 'none';
            }
            if (chartContainer) {
                chartContainer.style.display = 'block';
            }
            
        } catch (error) {
            console.error('初始化K线图失败:', error);
            
            const chartLoading = document.getElementById('chartLoading');
            const chartContainer = document.querySelector('.chart-container');
            
            if (chartLoading) {
                chartLoading.innerHTML = '<i class="fas fa-exclamation-triangle"></i><span>K线图加载失败</span>';
            }
            if (chartContainer) {
                chartContainer.style.display = 'block';
            }
        }
    }

    // 验证和转换图表数据
    validateAndConvertChartData(data) {
        return data
            .filter(item => {
                // 检查必要字段是否存在且不为null/undefined
                return item && 
                       item.timestamp && 
                       item.open !== null && item.open !== undefined &&
                       item.high !== null && item.high !== undefined &&
                       item.low !== null && item.low !== undefined &&
                       item.close !== null && item.close !== undefined;
            })
            .map(item => {
                const open = parseFloat(item.open);
                const high = parseFloat(item.high);
                const low = parseFloat(item.low);
                const close = parseFloat(item.close);
                
                // 检查转换后的数值是否有效
                if (isNaN(open) || isNaN(high) || isNaN(low) || isNaN(close)) {
                    console.warn('发现无效数值:', item);
                    return null;
                }
                
                return {
                    time: Math.floor(new Date(item.timestamp).getTime() / 1000), // 转换为秒级时间戳
                    open: open,
                    high: high,
                    low: low,
                    close: close
                };
            })
            .filter(item => item !== null); // 过滤掉null值
    }

    // 创建K线图
    createCandlestickChart(historicalData, currency, symbol) {
        // 检查LightweightCharts是否已加载
        if (typeof LightweightCharts === 'undefined') {
            console.error('LightweightCharts库未加载');
            return;
        }

        // 创建图表容器
        this.createChartContainer();
        
        if (!this.chartContainer) {
            console.error('图表容器未找到');
            return;
        }

        // 准备数据
        const data = historicalData.data;
        if (data.length === 0) return;

        // 转换数据格式为Lightweight Charts格式，过滤无效数据
        const chartData = this.validateAndConvertChartData(data);

        // 检查数据有效性
        if (chartData.length === 0) {
            console.error('没有有效的图表数据');
            return;
        }

        // 检查数据格式
        const firstItem = chartData[0];

        try {
            // 创建Lightweight Charts实例
            this.chart = LightweightCharts.createChart(this.chartContainer, {
                width: this.chartContainer.clientWidth,
                height: 400,
                layout: {
                    background: { color: '#1e1e1e' },
                    textColor: '#d1d4dc',
                },
                grid: {
                    vertLines: { color: '#2B2B43' },
                    horzLines: { color: '#2B2B43' },
                },
                crosshair: {
                    mode: LightweightCharts.CrosshairMode.Normal,
                },
                rightPriceScale: {
                    borderColor: '#485158',
                    scaleMargins: {
                        top: 0.1,
                        bottom: 0.1,
                    },
                },
                timeScale: {
                    borderColor: '#485158',
                    timeVisible: true,
                    secondsVisible: false,
                },
            });

            // 创建蜡烛图系列
            this.candlestickSeries = this.chart.addSeries(LightweightCharts.CandlestickSeries, {
                upColor: '#26a69a',
                downColor: '#ef5350',
                borderDownColor: '#ef5350',
                borderUpColor: '#26a69a',
                wickDownColor: '#ef5350',
                wickUpColor: '#26a69a',
            });

            // 设置数据
            this.candlestickSeries.setData(chartData);
            
            // 自动调整视图
            this.chart.timeScale().fitContent();

            // 更新当前价格显示
            this.updateChartPriceDisplay(symbol);

            // 添加十字线
            this.chart.subscribeCrosshairMove((param) => {
                if (param.point === undefined || !param.time || param.point.x < 0 || param.point.x > this.chartContainer.clientWidth || param.point.y < 0 || param.point.y > 400) {
                    return;
                }

                const data = param.seriesData.get(this.candlestickSeries);
            });

            // 处理窗口大小变化
            const resizeObserver = new ResizeObserver(entries => {
                if (entries.length === 0 || entries[0].target !== this.chartContainer) return;
                const newRect = entries[0].contentRect;
                this.chart.applyOptions({ width: newRect.width, height: 400 });
            });
            resizeObserver.observe(this.chartContainer);
        } catch (error) {
            console.error('创建Lightweight Charts失败:', error);
        }
    }

    // 加载LightweightCharts库
    async loadLightweightCharts() {
        return new Promise((resolve, reject) => {
            // 检查是否已经加载
            if (typeof LightweightCharts !== 'undefined') {
                resolve();
                return;
            }

            // 创建script标签动态加载
            const script = document.createElement('script');
            script.src = 'lightweight-charts.standalone.production.js';
            script.onload = () => {
                console.log('LightweightCharts库加载成功');
                resolve();
            };
            script.onerror = () => {
                console.error('LightweightCharts库加载失败');
                reject(new Error('无法加载LightweightCharts库'));
            };
            
            document.head.appendChild(script);
        });
    }

    // 显示图表错误
    showChartError(message) {
        const modalBody = document.getElementById('modalBody');
        if (modalBody) {
            modalBody.innerHTML = `
                <div class="chart-error">
                    <div class="error-icon">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <div class="error-message">
                        <h3>图表加载失败</h3>
                        <p>${message}</p>
                        <p>请检查网络连接或刷新页面重试</p>
                    </div>
                    <div class="error-actions">
                        <button class="btn-primary" onclick="location.reload()">
                            <i class="fas fa-refresh"></i> 刷新页面
                        </button>
                    </div>
                </div>
            `;
        }
    }

    // 创建图表容器
    createChartContainer() {
        // 查找或创建图表容器
        let container = document.getElementById('lightweightChartContainer');
        
        if (!container) {
            // 创建图表容器
            container = document.createElement('div');
            container.id = 'lightweightChartContainer';
            container.style.width = '100%';
            container.style.height = '400px';
            container.style.border = '1px solid #333';
            container.style.borderRadius = '4px';
            container.style.background = '#1e1e1e';
            
            // 查找模态框内容区域
            const modalBody = document.getElementById('modalBody');
            if (modalBody) {
                // 清空现有内容
                modalBody.innerHTML = '';
                
                // 添加图表控制
                const chartControls = document.createElement('div');
                chartControls.className = 'chart-controls';
                chartControls.innerHTML = `
                    <div class="chart-price-info">
                        <div class="current-price">
                            <span class="price-label">当前价格:</span>
                            <span id="chartCurrentPrice" class="price-value">--</span>
                        </div>
                        <div class="price-change">
                            <span id="chartPriceChange" class="change-value">--</span>
                            <span id="chartPriceChangePercent" class="change-percent">--</span>
                        </div>
                    </div>
                    <div class="chart-control-group">
                        <label for="chartRange">时间范围:</label>
                                <select id="chartRange" class="chart-range-select">
                                    <option value="1d">1天</option>
                                    <option value="5d">5天</option>
                                    <option value="1mo" selected>1个月</option>
                                    <option value="3mo">3个月</option>
                                    <option value="6mo">6个月</option>
                                    <option value="1y">1年</option>
                                    <option value="2y">2年</option>
                                    <option value="5y">5年</option>
                                    <option value="max">最大</option>
                                </select>
                    </div>
                    <div class="chart-control-group">
                        <label for="chartInterval">时间间隔:</label>
                        <select id="chartInterval" class="chart-interval-select">
                            <option value="1m">1分钟</option>
                            <option value="5m">5分钟</option>
                            <option value="15m">15分钟</option>
                            <option value="30m">30分钟</option>
                            <option value="1h">1小时</option>
                            <option value="60m">60分钟</option>
                            <option value="1d" selected>1天</option>
                            <option value="1wk">1周</option>
                            <option value="1mo">1月</option>
                        </select>
                    </div>
                `;
                
                modalBody.appendChild(chartControls);
                modalBody.appendChild(container);
                
                // 绑定控制事件
                this.setupChartControls();
            }
        }
        
        this.chartContainer = container;
    }


    // 创建简单备用图表（当Chart.js不可用时）
    createSimpleChart(historicalData, currency) {
        const canvas = document.getElementById('stockChart');
        if (!canvas) {
            console.error('图表画布未找到');
            return;
        }

        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        // 清除画布
        ctx.clearRect(0, 0, width, height);
        
        // 准备数据
        const prices = historicalData.data.map(item => item.close);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const priceRange = maxPrice - minPrice;
        
        // 设置样式
        ctx.strokeStyle = '#667eea';
        ctx.fillStyle = 'rgba(102, 126, 234, 0.1)';
        ctx.lineWidth = 2;
        
        // 绘制价格线
        ctx.beginPath();
        prices.forEach((price, index) => {
            const x = (index / (prices.length - 1)) * (width - 40) + 20;
            const y = height - 20 - ((price - minPrice) / priceRange) * (height - 40);
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.stroke();
        
        // 绘制填充区域
        ctx.lineTo(width - 20, height - 20);
        ctx.lineTo(20, height - 20);
        ctx.closePath();
        ctx.fill();
        
        console.log('简单图表创建完成');
    }

    // 绘制K线图状态
    drawChartStatus(ctx, width, height) {
        if (!this.currentChartSymbol) return;
        
        const isCrypto = this.isCryptocurrency(this.currentChartSymbol);
        const statusText = isCrypto ? '🟢 实时K线 (30s更新, 1h周期)' : '🟡 K线图 (1min更新, 1d周期)';
        
        ctx.fillStyle = isCrypto ? '#26a69a' : '#ff9800';
        ctx.font = '12px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(statusText, width - 10, 20);
    }

    // 绘制十字光标
    drawCrosshair(ctx, width, height, chartMinPrice, chartMaxPrice, data, candleSpacing, clampedOffset) {
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        
        // 垂直线
        ctx.beginPath();
        ctx.moveTo(this.chartMouseX, 20);
        ctx.lineTo(this.chartMouseX, height - 20);
        ctx.stroke();
        
        // 水平线
        ctx.beginPath();
        ctx.moveTo(30, this.chartMouseY);
        ctx.lineTo(width - 30, this.chartMouseY);
        ctx.stroke();
        
        ctx.setLineDash([]);
        
        // 绘制价格信息
        const chartPriceRange = chartMaxPrice - chartMinPrice;
        const price = chartMaxPrice - ((this.chartMouseY - 20) / (height - 40)) * chartPriceRange;
        
        // 背景
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(this.chartMouseX + 10, this.chartMouseY - 20, 80, 40);
        
        // 价格文本
        ctx.fillStyle = '#fff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`$${price.toFixed(2)}`, this.chartMouseX + 15, this.chartMouseY - 5);
        
        // 时间信息
        const dataIndex = Math.floor((this.chartMouseX - 30 - clampedOffset) / candleSpacing);
        if (dataIndex >= 0 && dataIndex < data.length) {
            const timeText = new Date(data[dataIndex].timestamp).toLocaleString();
            ctx.fillText(timeText, this.chartMouseX + 15, this.chartMouseY + 10);
        }
    }

    // 启动K线图实时更新（仅在弹窗打开时）
    startChartRealTimeUpdate(symbol) {
        // 停止之前的K线图更新
        this.stopChartRealTimeUpdate(symbol);
        
        // 只有弹窗打开时才启动更新
        if (!this.isChartModalOpen) {
            console.log('图表弹窗未打开，跳过实时更新');
            return;
        }
        
        // 获取更新频率
        const updateFrequency = this.getChartUpdateFrequency(symbol);
        
        // 设置定时更新
        const intervalId = setInterval(async () => {
            // 再次检查弹窗是否仍然打开
            if (this.isChartModalOpen && this.currentChartSymbol === symbol) {
                await this.updateChartPeriod();
            } else {
                // 如果弹窗已关闭，停止更新
                this.stopChartRealTimeUpdate(symbol);
            }
        }, updateFrequency);
        
        this.chartUpdateIntervals.set(symbol, intervalId);
        console.log(`K线图实时更新已启动: ${symbol}, 频率: ${updateFrequency}ms`);
    }
    
    // 停止K线图实时更新
    stopChartRealTimeUpdate(symbol) {
        const intervalId = this.chartUpdateIntervals.get(symbol);
        if (intervalId) {
            clearInterval(intervalId);
            this.chartUpdateIntervals.delete(symbol);
            console.log(`K线图实时更新已停止: ${symbol}`);
        }
    }
    
    // 获取K线图更新频率
    getChartUpdateFrequency(symbol) {
        if (this.isCryptocurrency(symbol)) {
            return 30000; // 加密货币30秒更新一次K线图
        } else {
            return 60000; // 传统股票1分钟更新一次K线图
        }
    }
    

    // 更新图表价格显示
    async updateChartPriceDisplay(symbol, interval = '1d', range = '1d') {
        try {
            const quote = await this.apiService.getStockQuote(symbol, interval, range);
            if (quote && quote.price) {
                const currentPriceEl = document.getElementById('chartCurrentPrice');
                const priceChangeEl = document.getElementById('chartPriceChange');
                const priceChangePercentEl = document.getElementById('chartPriceChangePercent');
                
                if (currentPriceEl) {
                    currentPriceEl.textContent = `$${quote.price.toFixed(2)}`;
                }
                
                if (priceChangeEl && quote.change !== undefined) {
                    const changeValue = quote.change > 0 ? `+$${quote.change.toFixed(2)}` : `-$${Math.abs(quote.change).toFixed(2)}`;
                    priceChangeEl.textContent = changeValue;
                    priceChangeEl.className = `change-value ${quote.change >= 0 ? 'positive' : 'negative'}`;
                }
                
                if (priceChangePercentEl && quote.changePercent !== undefined) {
                    const changePercent = quote.changePercent > 0 ? `+${quote.changePercent.toFixed(2)}%` : `${quote.changePercent.toFixed(2)}%`;
                    priceChangePercentEl.textContent = changePercent;
                    priceChangePercentEl.className = `change-percent ${quote.changePercent >= 0 ? 'positive' : 'negative'}`;
                }
            }
        } catch (error) {
            console.error('更新图表价格显示失败:', error);
        }
    }

    // 更新K线图周期
    async updateChartPeriod() {
        if (!this.currentChartSymbol) return;
        
        try {
            console.log(`更新K线图周期: ${this.currentChartSymbol}, 范围: ${this.chartCurrentRange}, 间隔: ${this.chartCurrentPeriod}`);
            
            // 显示加载状态
            this.showChartLoading();
            
            // 清除旧缓存，强制获取新数据
            const cacheKey = `${this.currentChartSymbol}_${this.chartCurrentRange}_${this.chartCurrentPeriod}`;
            this.chartDataCache.delete(cacheKey);
            
            // 获取新的历史数据
            const historicalData = await this.apiService.getHistoricalData(
                this.currentChartSymbol, 
                this.chartCurrentRange, 
                this.chartCurrentPeriod
            );
            
            // 更新缓存
            this.chartDataCache.set(cacheKey, historicalData);
            
            // 更新Lightweight Charts
            if (this.candlestickSeries && historicalData.data) {
                const chartData = this.validateAndConvertChartData(historicalData.data);
                
                this.candlestickSeries.setData(chartData);
                this.chart.timeScale().fitContent();
                console.log(`Lightweight Charts周期已更新: ${this.currentChartSymbol}`);
                
                // 更新价格显示
                await this.updateChartPriceDisplay(this.currentChartSymbol);
            }
            
            // 隐藏加载状态
            this.hideChartLoading();
            
        } catch (error) {
            console.error('更新K线图周期失败:', error);
            this.hideChartLoading();
            this.showChartError('更新图表数据失败，请稍后重试');
        }
    }

    // 根据时间范围更新间隔选项
    updateIntervalOptions(range) {
        const intervalSelect = document.getElementById('chartInterval');
        if (!intervalSelect) return;

        // Yahoo Finance API 支持的时间范围和间隔组合
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

        const availableIntervals = validCombinations[range] || validCombinations['1mo'];
        const currentValue = intervalSelect.value;

        // 清空现有选项
        intervalSelect.innerHTML = '';

        // 添加可用的间隔选项
        const intervalLabels = {
            '1m': '1分钟',
            '2m': '2分钟',
            '5m': '5分钟',
            '15m': '15分钟',
            '30m': '30分钟',
            '60m': '60分钟',
            '90m': '90分钟',
            '1h': '1小时',
            '1d': '1天',
            '5d': '5天',
            '1wk': '1周',
            '1mo': '1月'
        };

        availableIntervals.forEach(interval => {
            const option = document.createElement('option');
            option.value = interval;
            option.textContent = intervalLabels[interval] || interval;
            if (interval === currentValue || (interval === '1d' && !availableIntervals.includes(currentValue))) {
                option.selected = true;
                this.chartCurrentPeriod = interval;
            }
            intervalSelect.appendChild(option);
        });
    }

    // 显示图表加载状态
    showChartLoading() {
        const chartContainer = document.getElementById('lightweightChartContainer');
        if (chartContainer) {
            const loadingDiv = document.createElement('div');
            loadingDiv.id = 'chartLoadingIndicator';
            loadingDiv.className = 'chart-loading';
            loadingDiv.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 正在加载图表数据...';
            chartContainer.appendChild(loadingDiv);
        }
    }

    // 隐藏图表加载状态
    hideChartLoading() {
        const loadingDiv = document.getElementById('chartLoadingIndicator');
        if (loadingDiv) {
            loadingDiv.remove();
        }
    }

    // 显示图表错误信息
    showChartError(message) {
        const chartContainer = document.getElementById('lightweightChartContainer');
        if (chartContainer) {
            const errorDiv = document.createElement('div');
            errorDiv.id = 'chartErrorIndicator';
            errorDiv.className = 'chart-error';
            errorDiv.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${message}`;
            chartContainer.appendChild(errorDiv);
            
            // 3秒后自动隐藏错误信息
            setTimeout(() => {
                if (errorDiv.parentNode) {
                    errorDiv.remove();
                }
            }, 3000);
        }
    }

    // 创建简单备用图表（当Chart.js不可用时）
    createSimpleChart(historicalData, currency) {
        const canvas = document.getElementById('stockChart');
        if (!canvas) {
            console.error('图表画布未找到');
            return;
        }

        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        // 清除画布
        ctx.clearRect(0, 0, width, height);
        
        // 准备数据
        const prices = historicalData.data.map(item => item.close);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const priceRange = maxPrice - minPrice;
        
        // 设置样式
        ctx.strokeStyle = '#667eea';
        ctx.fillStyle = 'rgba(102, 126, 234, 0.1)';
        ctx.lineWidth = 2;
        
        // 绘制价格线
        ctx.beginPath();
        prices.forEach((price, index) => {
            const x = (index / (prices.length - 1)) * (width - 40) + 20;
            const y = height - 20 - ((price - minPrice) / priceRange) * (height - 40);
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.stroke();
        
        // 绘制填充区域
        ctx.lineTo(width - 20, height - 20);
        ctx.lineTo(20, height - 20);
        ctx.closePath();
        ctx.fill();
        
        // 绘制坐标轴
        ctx.strokeStyle = '#e9ecef';
        ctx.lineWidth = 1;
        
        // X轴
        ctx.beginPath();
        ctx.moveTo(20, height - 20);
        ctx.lineTo(width - 20, height - 20);
        ctx.stroke();
        
        // Y轴
        ctx.beginPath();
        ctx.moveTo(20, 20);
        ctx.lineTo(20, height - 20);
        ctx.stroke();
        
        // 绘制价格标签
        ctx.fillStyle = '#333';
        ctx.font = '12px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(maxPrice.toFixed(2), 18, 25);
        ctx.fillText(minPrice.toFixed(2), 18, height - 15);
        
        // 绘制标题
        ctx.textAlign = 'center';
        ctx.font = '14px Arial';
        ctx.fillText(`${historicalData.symbol} 价格走势`, width / 2, 15);
        
        console.log('备用图表创建完成');
    }

    async loadInitialData() {
        await this.loadPortfolio();
        await this.loadMarketData();
    }

    async loadPortfolio() {
        const portfolioList = document.getElementById('portfolioList');
        if (!portfolioList) return;
        
        if (this.portfolioManager.portfolio.length === 0) {
            portfolioList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-plus-circle"></i>
                    <p>添加股票到您的投资组合</p>
                    <button class="btn-primary" id="addStockBtn">添加股票</button>
                </div>
            `;
            
            // 重新绑定事件
            const addStockBtn = document.getElementById('addStockBtn');
            if (addStockBtn) {
                addStockBtn.addEventListener('click', () => {
                    this.showAddStockModal();
                });
            }
            return;
        }

        try {
            const symbols = this.portfolioManager.portfolio.map(item => item.symbol);
            const quotes = await this.apiService.getMultipleQuotes(symbols);
            
            // 计算投资组合价值
            const currentPrices = {};
            quotes.forEach(quote => {
                if (quote.success) {
                    currentPrices[quote.symbol] = quote.data;
                }
            });

            const portfolioValue = this.portfolioManager.calculatePortfolioValue(currentPrices);
            
            // 更新摘要
            const totalValue = document.getElementById('totalValue');
            const totalChange = document.getElementById('totalChange');
            
            if (totalValue) {
                totalValue.textContent = this.formatPrice(portfolioValue.totalValue);
            }
            
            if (totalChange) {
                totalChange.textContent = 
                    `${this.formatChange(portfolioValue.totalGain)} (${this.formatChangePercent(portfolioValue.totalGainPercent)})`;
                totalChange.className = 
                    `summary-change ${portfolioValue.totalGain >= 0 ? 'positive' : 'negative'}`;
            }

            // 渲染投资组合列表
            portfolioList.innerHTML = this.portfolioManager.portfolio.map(item => {
                const quote = currentPrices[item.symbol];
                if (!quote) {
                    return `
                        <div class="stock-item portfolio-item" data-symbol="${item.symbol}">
                            <div class="stock-info">
                                <div class="stock-symbol">${item.symbol}</div>
                                <div class="stock-name">数据加载失败</div>
                                <div class="stock-quantity">${item.quantity} 股 @ $${item.purchasePrice}</div>
                            </div>
                            <div class="stock-price">
                                <div class="stock-current-price">-</div>
                                <div class="stock-change">-</div>
                            </div>
                            <div class="stock-actions">
                                <button class="btn-danger btn-sm remove-portfolio-btn" data-symbol="${item.symbol}">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    `;
                }

                const currentValue = item.quantity * quote.price;
                const cost = item.quantity * item.purchasePrice;
                const gain = currentValue - cost;
                const gainPercent = (gain / cost) * 100;

                return `
                    <div class="stock-item portfolio-item" data-symbol="${item.symbol}">
                        <div class="stock-info">
                            <div class="stock-symbol">${item.symbol}</div>
                            <div class="stock-name">${quote.shortName || quote.longName || '未知公司'}</div>
                            <div class="stock-quantity">${item.quantity} 股 @ $${item.purchasePrice}</div>
                        </div>
                        <div class="stock-price">
                            <div class="stock-current-price">${this.formatPrice(quote.price, null, quote.currency)}</div>
                            <div class="stock-change ${gain >= 0 ? 'positive' : 'negative'}">
                                ${this.formatChange(gain, null, quote.currency)} (${this.formatChangePercent(gainPercent)})
                            </div>
                        </div>
                        <div class="stock-actions">
                            <button class="btn-danger btn-sm remove-portfolio-btn" data-symbol="${item.symbol}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `;
            }).join('');

            // 添加投资组合项目的点击事件监听器
            const portfolioItems = portfolioList.querySelectorAll('.portfolio-item');
            portfolioItems.forEach(item => {
                // 点击股票项目查看详情
                item.addEventListener('click', (e) => {
                    // 如果点击的是删除按钮，不触发查看详情
                    if (e.target.closest('.remove-portfolio-btn')) {
                        return;
                    }
                    const symbol = item.getAttribute('data-symbol');
                    this.showStockDetails(symbol);
                });
            });

            // 添加删除按钮的事件监听器
            const removeButtons = portfolioList.querySelectorAll('.remove-portfolio-btn');
            removeButtons.forEach(button => {
                button.addEventListener('click', (e) => {
                    e.stopPropagation(); // 阻止事件冒泡
                    const symbol = button.getAttribute('data-symbol');
                    this.removeFromPortfolio(symbol);
                });
            });

            // 检查价格提醒
            this.alertManager.checkAlerts(currentPrices);

        } catch (error) {
            console.error('加载投资组合失败:', error);
            portfolioList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>加载投资组合失败</p>
                    <button class="btn-primary" onclick="location.reload()">重试</button>
                </div>
            `;
        }
    }

    async loadWatchlist() {
        const watchlistList = document.getElementById('watchlistList');
        if (!watchlistList) return;
        
        if (this.portfolioManager.watchlist.length === 0) {
            watchlistList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-eye"></i>
                    <p>添加股票到观察列表</p>
                    <button class="btn-primary" id="addWatchlistBtn">添加股票</button>
                </div>
            `;
            
            // 重新绑定事件
            const addWatchlistBtn = document.getElementById('addWatchlistBtn');
            if (addWatchlistBtn) {
                addWatchlistBtn.addEventListener('click', () => {
                    this.showAddStockModal();
                });
            }
            return;
        }

        try {
            const quotes = await this.apiService.getMultipleQuotes(this.portfolioManager.watchlist);
            
            watchlistList.innerHTML = quotes.map(quote => {
                if (!quote.success) {
                    return `
                        <div class="stock-item watchlist-item" data-symbol="${quote.symbol}">
                            <div class="stock-info">
                                <div class="stock-symbol">${quote.symbol}</div>
                                <div class="stock-name">数据加载失败</div>
                            </div>
                            <div class="stock-price">
                                <div class="stock-current-price">-</div>
                                <div class="stock-change">-</div>
                            </div>
                            <div class="stock-actions">
                                <button class="btn-danger btn-sm remove-watchlist-btn" data-symbol="${quote.symbol}">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    `;
                }

                const data = quote.data;
                return `
                    <div class="stock-item watchlist-item" data-symbol="${data.symbol}">
                        <div class="stock-info">
                            <div class="stock-symbol">${data.symbol}</div>
                            <div class="stock-name">${data.shortName || data.longName || '未知公司'}</div>
                        </div>
                        <div class="stock-price">
                            <div class="stock-current-price">${this.formatPrice(data.price, null, data.currency)}</div>
                            <div class="stock-change ${data.change >= 0 ? 'positive' : 'negative'}">
                                ${this.formatChange(data.change, null, data.currency)} (${this.formatChangePercent(data.changePercent)})
                            </div>
                        </div>
                        <div class="stock-actions">
                            <button class="btn-danger btn-sm remove-watchlist-btn" data-symbol="${data.symbol}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `;
            }).join('');

            // 添加观察列表项目的点击事件监听器
            const watchlistItems = watchlistList.querySelectorAll('.watchlist-item');
            watchlistItems.forEach(item => {
                // 点击股票项目查看详情
                item.addEventListener('click', (e) => {
                    // 如果点击的是删除按钮，不触发查看详情
                    if (e.target.closest('.remove-watchlist-btn')) {
                        return;
                    }
                    const symbol = item.getAttribute('data-symbol');
                    this.showStockDetails(symbol);
                });
            });

            // 添加删除按钮的事件监听器
            const removeButtons = watchlistList.querySelectorAll('.remove-watchlist-btn');
            removeButtons.forEach(button => {
                button.addEventListener('click', (e) => {
                    e.stopPropagation(); // 阻止事件冒泡
                    const symbol = button.getAttribute('data-symbol');
                    this.removeFromWatchlist(symbol);
                });
            });

        } catch (error) {
            console.error('加载观察列表失败:', error);
            watchlistList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>加载观察列表失败</p>
                    <button class="btn-primary" onclick="location.reload()">重试</button>
                </div>
            `;
        }
    }

    async loadNews() {
        const newsList = document.getElementById('newsList');
        if (!newsList) return;
        
        try {
            const news = await this.apiService.getNews();
            
            if (news.length === 0) {
                newsList.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-newspaper"></i>
                        <p>暂无新闻</p>
                    </div>
                `;
                return;
            }

            newsList.innerHTML = news.slice(0, 10).map(article => `
                <div class="news-item" onclick="window.open('${article.url}', '_blank')">
                    <div class="news-title">${article.title}</div>
                    <div class="news-source">${article.source.name}</div>
                    <div class="news-time">${new Date(article.publishedAt).toLocaleString()}</div>
                </div>
            `).join('');

        } catch (error) {
            console.error('加载新闻失败:', error);
            newsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>加载新闻失败</p>
                    <button class="btn-primary" onclick="location.reload()">重试</button>
                </div>
            `;
        }
    }

    async loadMarketData() {
        try {
            const indices = await this.apiService.getMarketIndices();
            
            indices.forEach(index => {
                if (index.success) {
                    const valueElement = document.getElementById(`${index.symbol.toLowerCase()}Value`);
                    const changeElement = document.getElementById(`${index.symbol.toLowerCase()}Change`);
                    
                    if (valueElement) {
                        valueElement.textContent = `$${index.price}`;
                    }
                    
                    if (changeElement) {
                        changeElement.textContent = 
                            `${index.change >= 0 ? '+' : ''}$${index.change} (${this.formatChangePercent(index.changePercent)})`;
                        changeElement.className = 
                            `index-change ${index.change >= 0 ? 'positive' : 'negative'}`;
                    }
                }
            });

            // 更新市场开放时间
            this.updateMarketHours();

        } catch (error) {
            console.error('加载市场数据失败:', error);
        }
    }

    updateMarketHours() {
        const now = new Date();
        const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
        
        // 纽约时间 (UTC-5)
        const nyTime = new Date(utc + (-5 * 3600000));
        const nyHour = nyTime.getHours();
        const nyOpen = nyHour >= 9 && nyHour < 16;
        
        // 伦敦时间 (UTC+0)
        const londonTime = new Date(utc);
        const londonHour = londonTime.getHours();
        const londonOpen = londonHour >= 8 && londonHour < 16;
        
        // 东京时间 (UTC+9)
        const tokyoTime = new Date(utc + (9 * 3600000));
        const tokyoHour = tokyoTime.getHours();
        const tokyoOpen = tokyoHour >= 9 && tokyoHour < 15;

        const nyseStatus = document.getElementById('nyseStatus');
        const nasdaqStatus = document.getElementById('nasdaqStatus');
        const lseStatus = document.getElementById('lseStatus');
        const tseStatus = document.getElementById('tseStatus');

        if (nyseStatus) {
            nyseStatus.textContent = nyOpen ? '开放' : '关闭';
            nyseStatus.className = `market-status ${nyOpen ? 'open' : 'closed'}`;
        }
        
        if (nasdaqStatus) {
            nasdaqStatus.textContent = nyOpen ? '开放' : '关闭';
            nasdaqStatus.className = `market-status ${nyOpen ? 'open' : 'closed'}`;
        }
        
        if (lseStatus) {
            lseStatus.textContent = londonOpen ? '开放' : '关闭';
            lseStatus.className = `market-status ${londonOpen ? 'open' : 'closed'}`;
        }
        
        if (tseStatus) {
            tseStatus.textContent = tokyoOpen ? '开放' : '关闭';
            tseStatus.className = `market-status ${tokyoOpen ? 'open' : 'closed'}`;
        }
    }

    setupCurrencyConverter() {
        const amountInput = document.getElementById('amount');
        const convertedAmount = document.getElementById('convertedAmount');
        const conversionRate = document.getElementById('conversionRate');
        const rateUpdateTime = document.getElementById('rateUpdateTime');
        const fromCurrencyDisplay = document.getElementById('fromCurrencyDisplay');
        const toCurrencyDisplay = document.getElementById('toCurrencyDisplay');
        const currencySwapBtn = document.getElementById('currencySwapBtn');

        if (!amountInput || !convertedAmount || !conversionRate || !rateUpdateTime || 
            !fromCurrencyDisplay || !toCurrencyDisplay || !currencySwapBtn) {
            return;
        }

        // 当前货币设置
        let fromCurrency = 'USD';
        let toCurrency = 'CNY';
        let currentRate = null;
        let lastUpdateTime = null;

        // 更新显示
        const updateDisplay = () => {
            fromCurrencyDisplay.textContent = fromCurrency;
            toCurrencyDisplay.textContent = toCurrency;
            
            // 更新按钮状态
            document.querySelectorAll('.currency-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            document.querySelector(`[data-currency="${fromCurrency}"]`).classList.add('active');
        };

        // 获取汇率
        const fetchExchangeRate = async () => {
            try {
                const rate = await this.apiService.getCurrencyRate(fromCurrency, toCurrency);
                currentRate = rate;
                lastUpdateTime = new Date();
                
                conversionRate.textContent = `1 ${fromCurrency} = ${rate} ${toCurrency}`;
                rateUpdateTime.textContent = `更新时间: ${lastUpdateTime.toLocaleTimeString()}`;
                
                return rate;
            } catch (error) {
                console.error('获取汇率失败:', error);
                conversionRate.textContent = '获取汇率失败';
                rateUpdateTime.textContent = '';
                return null;
            }
        };

        // 执行转换
        const convertCurrency = async () => {
            const amount = parseFloat(amountInput.value) || 0;
            
            if (amount <= 0) {
                convertedAmount.value = '';
                return;
            }

            if (fromCurrency === toCurrency) {
                convertedAmount.value = amount;
                conversionRate.textContent = `1 ${fromCurrency} = 1 ${toCurrency}`;
                rateUpdateTime.textContent = '相同货币';
                return;
            }

            // 如果没有汇率或汇率过期（超过5分钟），重新获取
            const now = new Date();
            const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
            
            if (!currentRate || !lastUpdateTime || lastUpdateTime < fiveMinutesAgo) {
                const rate = await fetchExchangeRate();
                if (!rate) return;
            }

            const converted = amount * currentRate;
            convertedAmount.value = converted;
        };

        // 切换货币
        const swapCurrencies = () => {
            [fromCurrency, toCurrency] = [toCurrency, fromCurrency];
            updateDisplay();
            currentRate = null; // 清除缓存的汇率
            convertCurrency();
            
            // 更新全局货币设置
            this.setGlobalCurrency(fromCurrency);
        };

        // 事件监听器
        amountInput.addEventListener('input', convertCurrency);
        
        currencySwapBtn.addEventListener('click', swapCurrencies);
        
        // 货币按钮点击事件
        document.querySelectorAll('.currency-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const currency = btn.getAttribute('data-currency');
                if (currency !== fromCurrency && currency !== toCurrency) {
                    // 如果点击的是新货币，替换fromCurrency
                    fromCurrency = currency;
                    updateDisplay();
                    currentRate = null; // 清除缓存的汇率
                    convertCurrency();
                    
                    // 更新全局货币设置
                    this.setGlobalCurrency(fromCurrency);
                }
            });
        });

        // 初始化
        updateDisplay();
        convertCurrency();
    }

    async handleSearch() {
        const searchInput = document.getElementById('stockSearch');
        if (!searchInput) return;
        
        const query = searchInput.value.trim();
        if (!query) return;

        try {
            const results = await this.apiService.searchStocks(query);
            this.showSearchResults(results);
        } catch (error) {
            console.error('搜索失败:', error);
            alert('搜索失败: ' + error.message);
        }
    }

    showSearchResults(results) {
        if (!results || results.length === 0) {
            alert('未找到相关股票');
            return;
        }

        // 创建搜索结果模态框
        const modal = document.createElement('div');
        modal.id = 'searchResultsModal';
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>搜索结果</h2>
                    <button class="modal-close" id="searchResultsModalClose">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="search-results-list">
                        ${results.slice(0, 10).map(result => `
                            <div class="search-result-item" data-symbol="${result['1. symbol']}">
                                <div class="result-info">
                                    <div class="result-symbol">${result['1. symbol']}</div>
                                    <div class="result-name">${result['2. name']}</div>
                                    <div class="result-type">${result['3. type']}</div>
                                    <div class="result-region">${result['4. region']}</div>
                                </div>
                                <div class="result-actions">
                                    <button class="btn-primary btn-sm add-to-watchlist-btn" data-symbol="${result['1. symbol']}">
                                        添加到观察列表
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // 添加事件监听器
        const closeBtn = modal.querySelector('#searchResultsModalClose');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                modal.remove();
            });
        }

        // 添加"添加到观察列表"按钮的事件监听器
        const addButtons = modal.querySelectorAll('.add-to-watchlist-btn');
        addButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const symbol = e.target.getAttribute('data-symbol');
                this.addToWatchlistFromSearch(symbol);
            });
        });

        // 点击模态框外部关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    async addToWatchlistFromSearch(symbol) {
        try {
            console.log('添加股票到观察列表:', symbol);
            
            if (!this.portfolioManager) {
                console.error('portfolioManager 未初始化');
                alert('系统错误：投资组合管理器未初始化');
                return;
            }
            
            await this.portfolioManager.addToWatchlist(symbol);
            alert(`${symbol} 已添加到观察列表`);
            
            // 关闭搜索结果模态框
            const searchModal = document.querySelector('#searchResultsModal');
            if (searchModal) {
                searchModal.remove();
                console.log('搜索结果模态框已关闭');
            } else {
                console.log('未找到搜索结果模态框');
            }
            
            // 刷新观察列表
            await this.loadWatchlist();
            console.log('观察列表已刷新');
            
            // 刷新更新间隔（为新添加的股票设置独立更新频率）
            this.refreshUpdateIntervals();
        } catch (error) {
            console.error('添加到观察列表失败:', error);
            alert('添加到观察列表失败: ' + error.message);
        }
    }

    showAddStockModal() {
        const modal = document.getElementById('addStockModal');
        if (modal) {
            modal.classList.add('active');
        }
    }

    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
        }
        
        // 如果是股票详情弹窗关闭，清理图表状态
        if (modalId === 'stockModal') {
            this.isChartModalOpen = false;
            this.currentChartSymbol = null;
            
            // 停止所有图表更新
            this.chartUpdateIntervals.forEach((intervalId, symbol) => {
                clearInterval(intervalId);
            });
            this.chartUpdateIntervals.clear();
            
            // 清理事件监听器
            this.cleanupChartEventListeners();
            
            console.log('股票详情弹窗已关闭，图表状态已清理');
        }
    }

    async addStock() {
        const symbolInput = document.getElementById('stockSymbol');
        const quantityInput = document.getElementById('stockQuantity');
        const priceInput = document.getElementById('stockPrice');
        const addToSelect = document.getElementById('addToPortfolio');

        if (!symbolInput || !quantityInput || !priceInput || !addToSelect) {
            return;
        }

        const symbol = symbolInput.value.trim().toUpperCase();
        const quantity = parseFloat(quantityInput.value) || 1;
        const price = parseFloat(priceInput.value) || 0;
        const addTo = addToSelect.value;

        if (!symbol) {
            alert('请输入股票代码');
            return;
        }

        try {
            if (addTo === 'portfolio') {
                if (price <= 0) {
                    alert('请输入有效的购买价格');
                    return;
                }
                this.portfolioManager.addToPortfolio(symbol, quantity, price);
            } else {
                await this.portfolioManager.addToWatchlist(symbol);
            }

            this.hideModal('addStockModal');
            this.refreshData();
            
            // 清空表单
            symbolInput.value = '';
            quantityInput.value = '1';
            priceInput.value = '';

        } catch (error) {
            console.error('添加股票失败:', error);
            alert('添加股票失败: ' + error.message);
        }
    }

    showSettingsModal() {
        const modal = document.getElementById('settingsModal');
        if (modal) {
            modal.classList.add('active');
        }
    }

    showAlertsModal() {
        const modal = document.getElementById('alertsModal');
        if (modal) {
            modal.classList.add('active');
            this.loadAlertsList();
        }
    }

    async loadAlertsList() {
        const alertsList = document.getElementById('alertsList');
        if (!alertsList) return;

        await this.alertManager.loadAlerts();

        if (this.alertManager.alerts.length === 0) {
            alertsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-bell"></i>
                    <p>暂无价格提醒</p>
                </div>
            `;
            return;
        }

        alertsList.innerHTML = this.alertManager.alerts.map(alert => `
            <div class="alert-item">
                <div class="alert-info">
                    <div class="alert-symbol">${alert.symbol}</div>
                    <div class="alert-condition">
                        ${alert.condition === 'above' ? '上涨至' : '下跌至'} $${alert.targetPrice}
                    </div>
                    <div class="alert-status ${alert.triggered ? 'triggered' : 'active'}">
                        ${alert.triggered ? '已触发' : '活跃'}
                    </div>
                </div>
                <div class="alert-actions">
                    <button class="btn-secondary btn-sm remove-alert-btn" data-alert-id="${alert.id}">
                        删除
                    </button>
                </div>
            </div>
        `).join('');

        // 添加删除按钮的事件监听器
        const removeButtons = alertsList.querySelectorAll('.remove-alert-btn');
        removeButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const alertId = e.target.getAttribute('data-alert-id');
                this.removeAlert(alertId);
            });
        });
    }

    async addAlert() {
        const symbolInput = document.getElementById('alertSymbol');
        const priceInput = document.getElementById('alertPrice');
        const conditionSelect = document.getElementById('alertCondition');

        if (!symbolInput || !priceInput || !conditionSelect) {
            return;
        }

        const symbol = symbolInput.value.trim().toUpperCase();
        const price = parseFloat(priceInput.value);
        const condition = conditionSelect.value;

        if (!symbol || !price || price <= 0) {
            alert('请输入有效的股票代码和目标价格');
            return;
        }

        try {
            this.alertManager.addAlert(symbol, price, condition);
            alert(`价格提醒已添加：${symbol} ${condition === 'above' ? '上涨至' : '下跌至'} $${price}`);
            
            // 清空表单
            symbolInput.value = '';
            priceInput.value = '';
            
            // 刷新提醒列表
            this.loadAlertsList();
        } catch (error) {
            console.error('添加提醒失败:', error);
            alert('添加提醒失败: ' + error.message);
        }
    }

    async removeAlert(alertId) {
        if (confirm('确定要删除这个价格提醒吗？')) {
            this.alertManager.alerts = this.alertManager.alerts.filter(alert => alert.id !== alertId);
            await this.alertManager.saveAlerts();
            this.loadAlertsList();
        }
    }

    async testStockDetailsFunction() {
        try {
            console.log('开始测试股票详情功能...');
            
            // 测试几个不同的股票
            const testSymbols = ['AAPL', 'MSFT', 'GOOGL', 'TSLA'];
            
            for (const symbol of testSymbols) {
                console.log(`\n=== 测试股票: ${symbol} ===`);
                try {
                    const quote = await this.apiService.getStockQuote(symbol);
                    console.log(`${symbol} 数据获取成功:`, quote);
                    
                    // 验证数据完整性
                    const requiredFields = ['symbol', 'price', 'change', 'changePercent', 'volume', 'high', 'low', 'open', 'previousClose'];
                    const missingFields = requiredFields.filter(field => quote[field] === undefined || quote[field] === null);
                    
                    if (missingFields.length > 0) {
                        console.warn(`${symbol} 缺少字段:`, missingFields);
                    } else {
                        console.log(`${symbol} 数据完整`);
                    }
                    
                    // 验证数据类型
                    if (typeof quote.price !== 'number' || isNaN(quote.price)) {
                        console.error(`${symbol} 价格数据类型错误:`, typeof quote.price, quote.price);
                    }
                    
                    // 如果第一个股票成功，就停止测试
                    if (symbol === 'AAPL' && quote && quote.price) {
                        console.log('AAPL 测试成功，停止其他测试');
                        break;
                    }
                    
                } catch (error) {
                    console.error(`${symbol} 测试失败:`, error);
                }
            }
            
            // 测试显示股票详情
            console.log('\n=== 测试显示股票详情 ===');
            await this.showStockDetails('AAPL');
            
            alert('股票详情功能测试完成！请查看控制台日志。');
        } catch (error) {
            console.error('股票详情功能测试失败:', error);
            alert('股票详情功能测试失败: ' + error.message);
        }
    }

    async showStockDetails(symbol) {
        try {
            console.log('获取股票详情:', symbol);
            const quote = await this.apiService.getStockQuote(symbol);
            console.log('股票详情数据:', quote);
            
            const modal = document.getElementById('stockModal');
            const modalTitle = document.getElementById('modalTitle');
            const modalBody = document.getElementById('modalBody');

            if (!modal || !modalTitle || !modalBody) {
                console.error('模态框元素未找到');
                return;
            }

            // 设置图表弹窗状态
            this.isChartModalOpen = true;
            this.currentChartSymbol = symbol;

            modalTitle.textContent = `${quote.longName || quote.shortName || symbol} (${symbol}) - 股票详情`;
            
            // 检查数据完整性
            if (!quote) {
                throw new Error('未获取到股票数据');
            }
            
            if (typeof quote.price !== 'number' || isNaN(quote.price)) {
                throw new Error('股票价格数据无效');
            }
            
            modalBody.innerHTML = `
                <div class="stock-details">
                    <div class="stock-header">
                        <div class="stock-symbol-large">${quote.symbol || symbol}</div>
                        <div class="stock-name-large">${quote.longName || quote.shortName || '未知公司'}</div>
                        <div class="stock-price-large">${this.formatPrice(quote.price || 0, null, quote.currency)}</div>
                        <div class="stock-change-large ${(quote.change || 0) >= 0 ? 'positive' : 'negative'}">
                            ${this.formatChange(quote.change || 0, null, quote.currency)} (${this.formatChangePercent(quote.changePercent || 0)})
                        </div>
                    </div>
                    
                    <!-- 图表区域 -->
                    <div class="chart-section">
                        <div class="chart-header">
                            <h3>K线图</h3>
                            <div class="chart-controls">
                                <select id="chartRange" class="chart-range-select">
                                    <option value="1d">1天</option>
                                    <option value="5d">5天</option>
                                    <option value="1mo" selected>1个月</option>
                                    <option value="3mo">3个月</option>
                                    <option value="6mo">6个月</option>
                                    <option value="1y">1年</option>
                                    <option value="2y">2年</option>
                                    <option value="5y">5年</option>
                                </select>
                                <select id="chartInterval" class="chart-interval-select">
                                    <option value="1m">1分钟</option>
                                    <option value="5m">5分钟</option>
                                    <option value="15m">15分钟</option>
                                    <option value="1h">1小时</option>
                                    <option value="1d" selected>1天</option>
                                </select>
                            </div>
                        </div>
                        <div class="chart-container">
                            <canvas id="candlestickCanvas" width="400" height="300"></canvas>
                        </div>
                        <div class="chart-loading" id="chartLoading" style="display: none;">
                            <i class="fas fa-spinner fa-spin"></i>
                            <span>加载K线图数据...</span>
                        </div>
                    </div>
                    
                    <div class="stock-stats">
                        <div class="stat-row">
                            <span class="stat-label">开盘价</span>
                            <span class="stat-value">${this.formatPrice(quote.open || 0, null, quote.currency)}</span>
                        </div>
                        <div class="stat-row">
                            <span class="stat-label">最高价</span>
                            <span class="stat-value">${this.formatPrice(quote.high || 0, null, quote.currency)}</span>
                        </div>
                        <div class="stat-row">
                            <span class="stat-label">最低价</span>
                            <span class="stat-value">${this.formatPrice(quote.low || 0, null, quote.currency)}</span>
                        </div>
                        <div class="stat-row">
                            <span class="stat-label">前收盘价</span>
                            <span class="stat-value">${this.formatPrice(quote.previousClose || 0, null, quote.currency)}</span>
                        </div>
                        <div class="stat-row">
                            <span class="stat-label">成交量</span>
                            <span class="stat-value">${(quote.volume || 0).toLocaleString()}</span>
                        </div>
                        ${quote.fiftyTwoWeekHigh ? `
                        <div class="stat-row">
                            <span class="stat-label">52周最高</span>
                            <span class="stat-value">${this.formatPrice(quote.fiftyTwoWeekHigh, null, quote.currency)}</span>
                        </div>
                        ` : ''}
                        ${quote.fiftyTwoWeekLow ? `
                        <div class="stat-row">
                            <span class="stat-label">52周最低</span>
                            <span class="stat-value">${this.formatPrice(quote.fiftyTwoWeekLow, null, quote.currency)}</span>
                        </div>
                        ` : ''}
                        ${quote.marketState ? `
                        <div class="stat-row">
                            <span class="stat-label">市场状态</span>
                            <span class="stat-value">${quote.marketState}</span>
                        </div>
                        ` : ''}
                        ${quote.exchange ? `
                        <div class="stat-row">
                            <span class="stat-label">交易所</span>
                            <span class="stat-value">${quote.exchange}</span>
                        </div>
                        ` : ''}
                        ${quote.currency ? `
                        <div class="stat-row">
                            <span class="stat-label">货币</span>
                            <span class="stat-value">${quote.currency}</span>
                        </div>
                        ` : ''}
                    </div>
                    
                    <div class="stock-actions">
                        <button class="btn-primary" id="addToWatchlistFromDetailsBtn" data-symbol="${symbol}">
                            添加到观察列表
                        </button>
                        <button class="btn-secondary" id="setPriceAlertBtn" data-symbol="${symbol}" data-price="${quote.price || 0}">
                            设置价格提醒
                        </button>
                    </div>
                </div>
            `;

            modal.classList.add('active');

            // 初始化K线图
            await this.initializeCandlestickChart(symbol, quote.currency);

            // 添加事件监听器
            const addToWatchlistBtn = modalBody.querySelector('#addToWatchlistFromDetailsBtn');
            if (addToWatchlistBtn) {
                addToWatchlistBtn.addEventListener('click', () => {
                    const symbol = addToWatchlistBtn.getAttribute('data-symbol');
                    this.addToWatchlistFromDetails(symbol);
                });
            }

            const setPriceAlertBtn = modalBody.querySelector('#setPriceAlertBtn');
            if (setPriceAlertBtn) {
                setPriceAlertBtn.addEventListener('click', () => {
                    const symbol = setPriceAlertBtn.getAttribute('data-symbol');
                    const price = parseFloat(setPriceAlertBtn.getAttribute('data-price'));
                    this.setPriceAlert(symbol, price);
                });
            }

            // 设置图表事件监听器
            this.setupChartEventListeners();
            
            // 启动图表实时更新
            this.startChartRealTimeUpdate(symbol);
            
        } catch (error) {
            console.error('获取股票详情失败:', error);
            alert('获取股票详情失败: ' + error.message);
        }
    }

    async addToWatchlistFromDetails(symbol) {
        try {
            await this.portfolioManager.addToWatchlist(symbol);
            alert(`${symbol} 已添加到观察列表`);
            this.hideModal('stockModal');
            
            // 刷新观察列表和更新间隔
            await this.loadWatchlist();
            this.refreshUpdateIntervals();
        } catch (error) {
            console.error('添加到观察列表失败:', error);
            alert('添加到观察列表失败: ' + error.message);
        }
    }

    async removeFromPortfolio(symbol) {
        try {
            if (confirm(`确定要从投资组合中删除 ${symbol} 吗？`)) {
                this.portfolioManager.removeFromPortfolio(symbol);
                alert(`${symbol} 已从投资组合中删除`);
                await this.loadPortfolio();
                
                // 刷新更新间隔（移除不再需要的股票更新）
                this.refreshUpdateIntervals();
            }
        } catch (error) {
            console.error('删除投资组合项目失败:', error);
            alert('删除失败: ' + error.message);
        }
    }

    async removeFromWatchlist(symbol) {
        try {
            if (confirm(`确定要从观察列表中删除 ${symbol} 吗？`)) {
                this.portfolioManager.removeFromWatchlist(symbol);
                alert(`${symbol} 已从观察列表中删除`);
                await this.loadWatchlist();
                
                // 刷新更新间隔（移除不再需要的股票更新）
                this.refreshUpdateIntervals();
            }
        } catch (error) {
            console.error('删除观察列表项目失败:', error);
            alert('删除失败: ' + error.message);
        }
    }

    setPriceAlert(symbol, currentPrice) {
        this.hideModal('stockModal');
        this.showAlertsModal();
        
        // 预填充表单
        const symbolInput = document.getElementById('alertSymbol');
        const priceInput = document.getElementById('alertPrice');
        
        if (symbolInput) symbolInput.value = symbol;
        if (priceInput) priceInput.value = currentPrice;
    }

    async saveSettings() {
        const rapidapiKeyInput = document.getElementById('rapidapiKey');
        const refreshIntervalSelect = document.getElementById('refreshInterval');
        const enableNotificationsCheckbox = document.getElementById('enableNotifications');
        const enableSitebarCheckbox = document.getElementById('enableSitebar');

        if (!rapidapiKeyInput || !refreshIntervalSelect || !enableNotificationsCheckbox || !enableSitebarCheckbox) {
            return;
        }

        const rapidapiKey = rapidapiKeyInput.value.trim();
        const refreshInterval = parseInt(refreshIntervalSelect.value);
        const enableNotifications = enableNotificationsCheckbox.checked;
        const enableSitebar = enableSitebarCheckbox.checked;

        await new Promise((resolve) => {
            chrome.storage.sync.set({
                rapidapiKey,
                refreshInterval,
                enableNotifications,
                enableSitebar
            }, resolve);
        });

        this.apiService.rapidapiKey = rapidapiKey;
        this.startAutoRefresh();
        
        this.hideModal('settingsModal');
        alert('设置已保存');
    }

    startAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }

        this.apiService.getSettings().then(settings => {
            const interval = (settings.refreshInterval || 60) * 1000;

            this.refreshInterval = setInterval(() => {
                this.refreshData();
            }, interval);
        });
    }

    async refreshData() {
        switch (this.currentTab) {
            case 'portfolio':
                await this.loadPortfolio();
                break;
            case 'watchlist':
                await this.loadWatchlist();
                break;
            case 'news':
                await this.loadNews();
                break;
            case 'markets':
                await this.loadMarketData();
                break;
        }
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const app = new StocksApp();
        await app.init();
        
        // 将应用实例暴露到全局，方便调试
        window.stocksApp = app;
    } catch (error) {
        console.error('应用初始化失败:', error);
    }
});

// 全局货币管理方法
StocksApp.prototype.setGlobalCurrency = async function(currency) {
    if (currency === this.globalCurrency) return;
    
    this.globalCurrency = currency;
    
    // 获取汇率
    if (currency === 'CNY') {
        await this.fetchExchangeRate();
    } else {
        this.exchangeRate = null;
    }
    
    // 刷新所有显示
    await this.refreshAllData();
};

StocksApp.prototype.fetchExchangeRate = async function() {
    try {
        const rate = await this.apiService.getCurrencyRate('USD', 'CNY');
        this.exchangeRate = rate;
        this.lastRateUpdate = new Date();
        return rate;
    } catch (error) {
        console.error('获取汇率失败:', error);
        this.exchangeRate = null;
        return null;
    }
};

StocksApp.prototype.formatPrice = function(price, currency = null, stockCurrency = null) {
    const targetCurrency = currency || this.globalCurrency;
    
    // 动态确定小数位数
    const getDecimalPlaces = (value) => {
        if (value >= 1) return 2;        // 大于等于1，保留2位小数
        if (value >= 0.01) return 4;     // 0.01到1之间，保留4位小数
        return 10;                      // 小于0.01，保留10位小数
    };
    
    // 如果没有股票原始货币信息，按原逻辑处理
    if (!stockCurrency) {
        if (targetCurrency === 'USD') {
            const decimalPlaces = getDecimalPlaces(price);
            return `$${price.toFixed(decimalPlaces)}`;
        } else if (targetCurrency === 'CNY' && this.exchangeRate) {
            const cnyPrice = price * this.exchangeRate;
            const decimalPlaces = getDecimalPlaces(cnyPrice);
            return `¥${cnyPrice.toFixed(decimalPlaces)}`;
        } else {
            const decimalPlaces = getDecimalPlaces(price);
            return `$${price.toFixed(decimalPlaces)}`;
        }
    }
    
    // 根据目标货币和股票原始货币决定是否需要转换
    if (targetCurrency === 'USD' && stockCurrency === 'CNY') {
        // 美元显示模式，中国股票需要从人民币换算成美元
        if (this.exchangeRate) {
            const usdPrice = price / this.exchangeRate;
            const decimalPlaces = getDecimalPlaces(usdPrice);
            return `$${usdPrice.toFixed(decimalPlaces)}`;
        } else {
            const decimalPlaces = getDecimalPlaces(price);
            return `¥${price.toFixed(decimalPlaces)}`; // 如果没有汇率，显示原币种
        }
    } else if (targetCurrency === 'CNY' && stockCurrency === 'USD') {
        // 人民币显示模式，国际股票需要从美元换算成人民币
        if (this.exchangeRate) {
            const cnyPrice = price * this.exchangeRate;
            const decimalPlaces = getDecimalPlaces(cnyPrice);
            return `¥${cnyPrice.toFixed(decimalPlaces)}`;
        } else {
            const decimalPlaces = getDecimalPlaces(price);
            return `$${price.toFixed(decimalPlaces)}`; // 如果没有汇率，显示原币种
        }
    } else {
        // 同币种或无需转换，直接显示原价
        const decimalPlaces = getDecimalPlaces(price);
        if (stockCurrency === 'CNY') {
            return `¥${price.toFixed(decimalPlaces)}`;
        } else {
            return `$${price.toFixed(decimalPlaces)}`;
        }
    }
};

StocksApp.prototype.formatChange = function(change, currency = null, stockCurrency = null) {
    const targetCurrency = currency || this.globalCurrency;
    
    // 动态确定小数位数
    const getDecimalPlaces = (value) => {
        const absValue = Math.abs(value);
        if (absValue >= 1) return 2;        // 大于等于1，保留2位小数
        if (absValue >= 0.01) return 4;     // 0.01到1之间，保留4位小数
        return 10;                          // 小于0.01，保留10位小数
    };
    
    // 如果没有股票原始货币信息，按原逻辑处理
    if (!stockCurrency) {
        if (targetCurrency === 'USD') {
            const decimalPlaces = getDecimalPlaces(change);
            return `${change >= 0 ? '+' : ''}$${change.toFixed(decimalPlaces)}`;
        } else if (targetCurrency === 'CNY' && this.exchangeRate) {
            const cnyChange = change * this.exchangeRate;
            const decimalPlaces = getDecimalPlaces(cnyChange);
            return `${cnyChange >= 0 ? '+' : ''}¥${cnyChange.toFixed(decimalPlaces)}`;
        } else {
            const decimalPlaces = getDecimalPlaces(change);
            return `${change >= 0 ? '+' : ''}$${change.toFixed(decimalPlaces)}`;
        }
    }
    
    // 根据目标货币和股票原始货币决定是否需要转换
    if (targetCurrency === 'USD' && stockCurrency === 'CNY') {
        // 美元显示模式，中国股票涨跌幅需要从人民币换算成美元
        if (this.exchangeRate) {
            const usdChange = change / this.exchangeRate;
            const decimalPlaces = getDecimalPlaces(usdChange);
            return `${usdChange >= 0 ? '+' : ''}$${usdChange.toFixed(decimalPlaces)}`;
        } else {
            const decimalPlaces = getDecimalPlaces(change);
            return `${change >= 0 ? '+' : ''}¥${change.toFixed(decimalPlaces)}`; // 如果没有汇率，显示原币种
        }
    } else if (targetCurrency === 'CNY' && stockCurrency === 'USD') {
        // 人民币显示模式，国际股票涨跌幅需要从美元换算成人民币
        if (this.exchangeRate) {
            const cnyChange = change * this.exchangeRate;
            const decimalPlaces = getDecimalPlaces(cnyChange);
            return `${cnyChange >= 0 ? '+' : ''}¥${cnyChange.toFixed(decimalPlaces)}`;
        } else {
            const decimalPlaces = getDecimalPlaces(change);
            return `${change >= 0 ? '+' : ''}$${change.toFixed(decimalPlaces)}`; // 如果没有汇率，显示原币种
        }
    } else {
        // 同币种或无需转换，直接显示原价
        const decimalPlaces = getDecimalPlaces(change);
        if (stockCurrency === 'CNY') {
            return `${change >= 0 ? '+' : ''}¥${change.toFixed(decimalPlaces)}`;
        } else {
            return `${change >= 0 ? '+' : ''}$${change.toFixed(decimalPlaces)}`;
        }
    }
};

StocksApp.prototype.formatChangePercent = function(changePercent) {
    // 动态确定小数位数
    const getDecimalPlaces = (value) => {
        const absValue = Math.abs(value);
        if (absValue >= 1) return 2;        // 大于等于1%，保留2位小数
        if (absValue >= 0.01) return 4;     // 0.01%到1%之间，保留4位小数
        return 10;                          // 小于0.01%，保留10位小数
    };
    
    const decimalPlaces = getDecimalPlaces(changePercent);
    return `${changePercent.toFixed(decimalPlaces)}%`;
};

StocksApp.prototype.refreshAllData = async function() {
    await this.loadPortfolio();
    await this.loadWatchlist();
    await this.loadMarketData();
};