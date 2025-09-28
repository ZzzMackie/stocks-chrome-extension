// 观察者接口 - 接口隔离原则
export class IObserver {
    update(data) {
        throw new Error('update() method must be implemented');
    }
}