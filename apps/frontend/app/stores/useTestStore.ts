
export const useTestStore = defineStore('test', () => {
    const num = ref(0);
    function addNum() {
        num.value++;
    }
    return {
        num, addNum
    }
}, {
    persist: true
})