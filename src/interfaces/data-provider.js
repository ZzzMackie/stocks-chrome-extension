// 数据提供者接口 - 接口隔离原则
export class IDataProvider {
    async load() {
        throw new Error('load() method must be implemented');
    }

    async refresh() {
        throw new Error('refresh() method must be implemented');
    }

    getData() {
        throw new Error('getData() method must be implemented');
    }
}