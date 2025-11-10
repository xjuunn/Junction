<template>
    <div class="flex h-full">
        <div v-show="isShowList || md" class="border-r border-base-content/10"
            :class="(isShowContent || md) ? 'w-[300px]' : 'flex-1'">
            <button class="btn btn-accent" @click="test">test</button>
            <slot name="list" />
        </div>
        <div v-show="isShowContent || md" class="flex-1">
            <slot name="content" />
        </div>
    </div>
</template>
<script lang="ts" setup>
const { md } = useTailwindBreakpoints();
const isShowList = ref(true);
const isShowContent = ref(true);
const route = useRoute();
const router = useRouter();
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

function test() {
    router.push({
        ...route,
        query: {
            ui: "content"
        }
    })
}



</script>