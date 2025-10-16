<template>
    <div class="h-full flex">
        <div v-show="isShowList || md" class="border-r border-base-content/10"
            :class="(isShowContent || md) ? 'w-[300px]' : 'flex-1'">
            <slot name="list" />
        </div>
        <div v-show="isShowContent || md" class="flex-1">
            <slot name="content" />
        </div>
    </div>
</template>
<script lang="ts" setup>
import { breakpointsTailwind } from '@vueuse/core';
const { md } = useBreakpoints(breakpointsTailwind);
const isShowList = ref(true);
const isShowContent = ref(true);
const route = useRoute();
watch(() => route.query.ui, () => {
    setIsShow();
})
onMounted(() => {
    setIsShow()
})

function setIsShow() {
    switch (route.query.ui) {
        case 'content':
            isShowList.value = false;
            isShowContent.value = true;
            break;
        case 'list':
        default:
            isShowList.value = true;
            isShowContent.value = false;
    }
}


</script>