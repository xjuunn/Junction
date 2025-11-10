import { breakpointsTailwind } from '@vueuse/core';
export function useTailwindBreakpoints() {
    return useBreakpoints(breakpointsTailwind);
}