import type { AppController } from '@junction/backend/src/app.controller';
export function getHello() {
    return api.get<string>('/')
}

export function test() {
    return api.get<AwaitedReturnType<AppController['test']>>('/test');
}