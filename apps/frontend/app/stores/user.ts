import { defineStore } from "pinia";
import type { Session, User } from "better-auth";

export const useUserStore = defineStore("user", () => {
    const _session = ref<Session | null>(null);
    const _user = ref<User | null>(null);
    const _authToken = ref<string>("");

    async function refresh() {
        const authClient = useAuthClient();
        const { data } = await authClient.getSession();
        _session.value = data?.session ?? null;
        _user.value = data?.user ?? null;
        return data;
    }

    const session = computed(() => _session);
    const user = computed(() => _user);
    const authToken = computed(() => _authToken);

    function setAuthToken(token: string) {
        _authToken.value = token;
        refresh();
    }

    // onMounted(refresh);

    return {
        _session,
        _user,
        _authToken,
        session,
        user,
        authToken,
        refresh,
        setAuthToken,
    };
}, {
    persist: true
});
