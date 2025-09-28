// 市场状态服务 - 单一职责原则
export class MarketStatusService {
    constructor() {
        this.status = 'unknown';
        this.observers = [];
    }

    // 添加观察者
    subscribe(observer) {
        this.observers.push(observer);
    }

    // 移除观察者
    unsubscribe(observer) {
        const index = this.observers.indexOf(observer);
        if (index > -1) {
            this.observers.splice(index, 1);
        }
    }

    // 通知所有观察者
    notify() {
        this.observers.forEach(observer => observer.update(this.status));
    }

    // 检查是否有活跃市场
    checkActiveMarkets() {
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentTime = currentHour * 60 + currentMinute;

        // 定义各市场的交易时间（UTC+8）
        const marketHours = {
            // 美国市场 (UTC-5, 对应UTC+8的21:30-04:00)
            us: { start: 21 * 60 + 30, end: 4 * 60 },
            // 香港市场 (UTC+8, 09:30-16:00)
            hk: { start: 9 * 60 + 30, end: 16 * 60 },
            // 中国A股市场 (UTC+8, 09:30-11:30, 13:00-15:00)
            cn: { 
                morning: { start: 9 * 60 + 30, end: 11 * 60 + 30 },
                afternoon: { start: 13 * 60, end: 15 * 60 }
            },
            // 欧洲市场 (UTC+1, 对应UTC+8的15:00-23:30)
            eu: { start: 15 * 60, end: 23 * 60 + 30 },
            // 日本市场 (UTC+9, 对应UTC+8的08:00-10:30, 11:30-15:00)
            jp: { 
                morning: { start: 8 * 60, end: 10 * 60 + 30 },
                afternoon: { start: 11 * 60 + 30, end: 15 * 60 }
            }
        };

        // 检查各市场是否在交易时间
        const isUSOpen = this.isTimeInRange(currentTime, marketHours.us.start, marketHours.us.end);
        const isHKOpen = this.isTimeInRange(currentTime, marketHours.hk.start, marketHours.hk.end);
        const isCNOpen = this.isTimeInRange(currentTime, marketHours.cn.morning.start, marketHours.cn.morning.end) ||
                        this.isTimeInRange(currentTime, marketHours.cn.afternoon.start, marketHours.cn.afternoon.end);
        const isEUOpen = this.isTimeInRange(currentTime, marketHours.eu.start, marketHours.eu.end);
        const isJPOpen = this.isTimeInRange(currentTime, marketHours.jp.morning.start, marketHours.jp.morning.end) ||
                        this.isTimeInRange(currentTime, marketHours.jp.afternoon.start, marketHours.jp.afternoon.end);

        return isUSOpen || isHKOpen || isCNOpen || isEUOpen || isJPOpen;
    }

    // 检查时间是否在指定范围内
    isTimeInRange(currentTime, startTime, endTime) {
        if (startTime <= endTime) {
            // 同一天内的时间范围
            return currentTime >= startTime && currentTime <= endTime;
        } else {
            // 跨天的时间范围（如美国市场）
            return currentTime >= startTime || currentTime <= endTime;
        }
    }

    // 更新市场状态
    async updateStatus() {
        try {
            const hasActiveMarkets = this.checkActiveMarkets();
            const now = new Date();
            const hour = now.getHours();
            const day = now.getDay();
            
            if (hasActiveMarkets) {
                // 有市场在交易
                if (day >= 1 && day <= 5) {
                    if (hour >= 9 && hour < 16) {
                        this.status = 'open';
                    } else if (hour >= 4 && hour < 9) {
                        this.status = 'pre-market';
                    } else if (hour >= 16 && hour < 20) {
                        this.status = 'after-hours';
                    } else {
                        this.status = 'closed';
                    }
                } else {
                    this.status = 'closed';
                }
            } else {
                // 没有市场在交易
                this.status = 'closed';
            }
            
            console.log(`市场状态更新: ${this.status}`);
            this.notify();
            
        } catch (error) {
            console.error('更新市场状态失败:', error);
            this.status = 'unknown';
            this.notify();
        }
    }

    // 获取当前状态
    getStatus() {
        return this.status;
    }
}