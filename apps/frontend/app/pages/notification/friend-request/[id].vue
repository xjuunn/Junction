<template>
    <div class="overflow-auto border max-h-full">
        <pre>
            <code>
                {{ friendship }}
            </code>
        </pre>
    </div>
</template>

<script setup lang="ts">
import * as NotificationApi from '~/api/notification';
import * as FriendshipApi from '~/api/friendship';
import type { PrismaTypes } from '@junction/types';
const route = useRoute();
const id = route.params.id as string;
const friendship = ref<AwaitedReturnType<typeof FriendshipApi['findOne']>['data']>();

onMounted(() => {
    initData();

})

async function initData() {
    const result = await NotificationApi.findOne(id);
    if (!result.success) return;
    const payload = result.data?.payload as { id: string, type: string }
    const friendshipId = payload.id;
    const result2 = await FriendshipApi.findOne(friendshipId);
    console.log(result2);
    friendship.value = result2.data;

}
</script>