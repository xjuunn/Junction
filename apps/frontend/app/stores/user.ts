import { defineStore } from "pinia";
import type { Session, User } from "better-auth";

export const useUserStore = defineStore("user", () => {
    const _session = ref<Session | null>(null);
    const _user = ref<User | null>(null);

    async function refresh() {
        const authClient = useAuthClient();
        const { data } = await authClient.getSession();
        console.log("获取到session：", data);

        _session.value = data?.session ?? null;
        _user.value = data?.user ?? null;

        return data;
    }

    const session = computed(() => _session);
    const user = computed(() => _user);

    onMounted(refresh);

    return {
        session,
        user,
        refresh,
    };
});
