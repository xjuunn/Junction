import { defineStore } from "pinia";
import type { Session, User } from "better-auth";

const REMEMBER_KEY = 'junction.rememberMe';
const TOKEN_KEY = 'junction.authToken';

export const useUserStore = defineStore("user", () => {
    const _session = ref<Session | null>(null);
    const _user = ref<User | null>(null);
    const _authToken = ref<string>("");
    const _isAuthChecked = ref(false);
    const _rememberMe = ref(false);

    if (import.meta.client) {
        const remembered = window.localStorage.getItem(REMEMBER_KEY);
        _rememberMe.value = remembered === '1';
        const sessionToken = window.sessionStorage.getItem(TOKEN_KEY) || '';
        const localToken = _rememberMe.value ? (window.localStorage.getItem(TOKEN_KEY) || '') : '';
        _authToken.value = localToken || sessionToken || '';
    }

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
    const rememberMe = computed(() => _rememberMe);

    function setAuthToken(token: string) {
        _authToken.value = token;
        refresh();
    }

    function setRememberMe(value: boolean) {
        _rememberMe.value = value;
        if (import.meta.client) {
            window.localStorage.setItem(REMEMBER_KEY, value ? '1' : '0');
            if (value && _authToken.value) {
                window.localStorage.setItem(TOKEN_KEY, _authToken.value);
            } else if (!value) {
                window.localStorage.removeItem(TOKEN_KEY);
            }
        }
    }

    function clearAuth() {
        _authToken.value = '';
        _session.value = null;
        _user.value = null;
        _isAuthChecked.value = false;
        if (import.meta.client) {
            window.sessionStorage.removeItem(TOKEN_KEY);
            window.localStorage.removeItem(TOKEN_KEY);
        }
    }

    function setUser(user: User) {
        _user.value = user;
    }

    function markAuthChecked() {
        _isAuthChecked.value = true;
    }

    if (import.meta.client) {
        watch(_authToken, (value) => {
            window.sessionStorage.setItem(TOKEN_KEY, value || '');
            if (_rememberMe.value && value) {
                window.localStorage.setItem(TOKEN_KEY, value);
            } else if (!_rememberMe.value) {
                window.localStorage.removeItem(TOKEN_KEY);
            }
        });
    }

    return {
        _session,
        _user,
        _authToken,
        _isAuthChecked,
        _rememberMe,
        session,
        user,
        authToken,
        isAuthChecked,
        rememberMe,
        refresh,
        setAuthToken,
        setRememberMe,
        clearAuth,
        setUser,
        markAuthChecked,
    };
});
