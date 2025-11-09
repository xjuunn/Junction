export function getHello() {
    return api.get<string>('/')
}
