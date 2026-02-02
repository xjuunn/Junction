import { defineStore } from "pinia";
import type { Session, User } from "better-auth";

export const useUserStore = defineStore("user", () => {
    const _session = ref<Session | null>(null);
    const _user = ref<User | null>(null);
    const _authToken = ref<string>("");
    const _isAuthChecked = ref(false);

    async function refresh() {
        const authClient = useAuthClient();
        const { data } = await authClient.getSession();
        _session.value = data?.session ?? null;
        _user.value = data?.user ?? null;
        _isAuthChecked.value = true;
        return data;
    }

    const session = computed(() => _session);
    const user = computed(() => _user);
    const authToken = computed(() => _authToken);
    const isAuthChecked = computed(() => _isAuthChecked);

    function setAuthToken(token: string) {
        _authToken.value = token;
        refresh();
    }

    function setUser(user: User) {
        _user.value = user;
    }

    function markAuthChecked() {
        _isAuthChecked.value = true;
    }

    return {
        _session,
        _user,
        _authToken,
        _isAuthChecked,
        session,
        user,
        authToken,
        isAuthChecked,
        refresh,
        setAuthToken,
        setUser,
        markAuthChecked,
    };
}, {
    persist: true
});
