import { defineStore } from "pinia";
import type { Session, User } from "better-auth";
import { isTauri } from '~/utils/check';
import { isAuthInvalidError, resolveAuthErrorStatus } from '~/utils/auth';

const REMEMBER_KEY = 'junction.rememberMe';
const TOKEN_KEY = 'junction.authToken';

export const useUserStore = defineStore("user", () => {
    const _session = ref<Session | null>(null);
    const _user = ref<User | null>(null);
    const _authToken = ref<string>("");
    const _isAuthChecked = ref(false);
    const _rememberMe = ref(false);

    if (import.meta.client) {
        const tauriEnv = isTauri();
        const remembered = window.localStorage.getItem(REMEMBER_KEY);
        _rememberMe.value = remembered === '1';
        const sessionToken = window.sessionStorage.getItem(TOKEN_KEY) || '';
        const localToken = (tauriEnv || _rememberMe.value) ? (window.localStorage.getItem(TOKEN_KEY) || '') : '';
        _authToken.value = localToken || sessionToken || '';
    }

    async function refresh() {
        const authClient = useAuthClient();
        const { data, error } = await authClient.getSession();
        _session.value = data?.session ?? null;
        _user.value = data?.user ?? null;
        _isAuthChecked.value = true;
        if (error) {
            const err = new Error(error.message || '获取会话失败') as Error & { status?: number; code?: string };
            const status = resolveAuthErrorStatus(error);
            if (status) err.status = status;
            if ((error as any)?.code) err.code = String((error as any).code);
            throw err;
        }
        return data;
    }

    const session = computed(() => _session);
    const user = computed(() => _user);
    const authToken = computed(() => _authToken);
    const isAuthChecked = computed(() => _isAuthChecked);
    const rememberMe = computed(() => _rememberMe);

    function setAuthToken(token: string) {
        _authToken.value = token;
        if (!token) {
            _session.value = null;
            _user.value = null;
            _isAuthChecked.value = true;
            return;
        }
        void refresh().catch((error) => {
            if (isAuthInvalidError(error)) {
                clearAuth();
                return;
            }
            _isAuthChecked.value = true;
        });
    }

    function setRememberMe(value: boolean) {
        _rememberMe.value = value;
        if (import.meta.client) {
            const tauriEnv = isTauri();
            window.localStorage.setItem(REMEMBER_KEY, value ? '1' : '0');
            if (value && _authToken.value) {
                window.localStorage.setItem(TOKEN_KEY, _authToken.value);
            } else if (!value && !tauriEnv) {
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
            const tauriEnv = isTauri();
            window.sessionStorage.setItem(TOKEN_KEY, value || '');
            if ((tauriEnv || _rememberMe.value) && value) {
                window.localStorage.setItem(TOKEN_KEY, value);
            } else if (!_rememberMe.value && !tauriEnv) {
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
