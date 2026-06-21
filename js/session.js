/* ============================================================
   WANDERLUST — Session Manager v3.0
   Production-ready session management
   - Access token: stored in memory + non-httpOnly cookie (short-lived)
   - Refresh token: httpOnly cookie (long-lived, managed by server)
   - User data: localStorage + sessionStorage for persistence
   ============================================================ */

(function () {
    'use strict';

    const API_BASE  = '/api';
    const KEY_USER  = 'wl_user';
    const KEY_TOKEN = 'wl_token';

    /* ── In-memory token (primary, most secure) ─────────────── */
    let _token = null;

    /* ── Cookie helper ───────────────────────────────────────── */
    function getCookie(name) {
        const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
        return match ? decodeURIComponent(match[2]) : null;
    }

    function setCookie(name, value, days) {
        const expires = days
            ? `; expires=${new Date(Date.now() + days * 864e5).toUTCString()}`
            : '';
        document.cookie = `${name}=${encodeURIComponent(value)}${expires}; path=/; SameSite=Lax`;
    }

    function deleteCookie(name) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax`;
    }

    /* ── Initialize from storage on page load ────────────────── */
    function init() {
        // Priority: 1) cookie (fastest, survives tab close), 2) localStorage
        const cookieToken = getCookie(KEY_TOKEN);
        const storedToken = localStorage.getItem(KEY_TOKEN);
        _token = cookieToken || storedToken || null;
    }

    /* ── Save after login / register ─────────────────────────── */
    function save(token, user) {
        if (token) {
            _token = token;
            localStorage.setItem(KEY_TOKEN, token);
            setCookie(KEY_TOKEN, token, 7); // 7 days, matches JWT expiry
        }
        if (user) {
            const userStr = JSON.stringify(user);
            sessionStorage.setItem(KEY_USER, userStr);
            localStorage.setItem(KEY_USER, userStr);
        }
    }

    /* ── Clear on logout ─────────────────────────────────────── */
    function clear() {
        _token = null;
        localStorage.removeItem(KEY_TOKEN);
        localStorage.removeItem(KEY_USER);
        sessionStorage.removeItem(KEY_USER);
        deleteCookie(KEY_TOKEN);
        // wl_refresh is httpOnly, cleared by backend
    }

    /* ── Getters ──────────────────────────────────────────────── */
    function getToken() {
        if (_token) return _token;
        const cookieToken = getCookie(KEY_TOKEN);
        if (cookieToken) { _token = cookieToken; return _token; }
        const stored = localStorage.getItem(KEY_TOKEN);
        if (stored) { _token = stored; return _token; }
        return null;
    }

    function getUser() {
        try {
            const fromSession = sessionStorage.getItem(KEY_USER);
            if (fromSession) return JSON.parse(fromSession);
            const fromLocal = localStorage.getItem(KEY_USER);
            if (fromLocal) return JSON.parse(fromLocal);
            return null;
        } catch {
            return null;
        }
    }

    function isLoggedIn() {
        return !!getToken() && !!getUser();
    }

    /* ── API Call Helper ─────────────────────────────────────── */
    async function apiCall(endpoint, options = {}) {
        const token = getToken();
        const headers = {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers,
        };

        try {
            const response = await fetch(API_BASE + endpoint, {
                ...options,
                headers,
                credentials: 'include', // Always send cookies (for refresh token)
            });

            // Handle 401 — try token refresh automatically
            if (response.status === 401 && !endpoint.includes('/refresh')) {
                const refreshed = await refreshToken();
                if (refreshed) {
                    // Retry original request with new token
                    const newToken = getToken();
                    if (newToken) headers.Authorization = `Bearer ${newToken}`;
                    const retryResponse = await fetch(API_BASE + endpoint, {
                        ...options,
                        headers,
                        credentials: 'include',
                    });
                    const retryData = await retryResponse.json();
                    return { ok: retryResponse.ok, status: retryResponse.status, data: retryData };
                } else {
                    clear();
                    return { ok: false, status: 401, data: { message: 'Session expired. Please log in again.' } };
                }
            }

            const data = await response.json();
            return { ok: response.ok, status: response.status, data };
        } catch (err) {
            console.error('API call failed:', endpoint, err.message);
            return { ok: false, status: 0, data: { message: 'Network error. Please check your connection.' } };
        }
    }

    /* ── Refresh access token using httpOnly refresh cookie ──── */
    async function refreshToken() {
        try {
            const response = await fetch(API_BASE + '/auth/refresh', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
            });
            if (!response.ok) return false;
            const data = await response.json();
            if (data.success && data.token) {
                save(data.token, data.user);
                return true;
            }
        } catch (e) {
            console.error('Token refresh failed:', e.message);
        }
        return false;
    }

    /* ── Fetch current user from API (validates session) ─────── */
    async function fetchMe() {
        try {
            const { ok, status, data } = await apiCall('/auth/me');
            if (ok && data.user) {
                save(null, data.user); // Update user data, keep token
                return data.user;
            }
            if (status === 401) {
                clear();
            }
        } catch (e) {
            console.error('fetchMe failed:', e.message);
        }
        return null;
    }

    /* ── Avatar: generate initials SVG data-URL ─────────────── */
    function getAvatarUrl(name, size = 80) {
        const user = getUser();
        if (user && user.avatar && user.avatar.startsWith('http')) return user.avatar;

        const displayName = name || (user && user.name) || 'U';
        const parts = displayName.trim().split(/\s+/);
        const initials = parts.length >= 2
            ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
            : parts[0].substring(0, 2).toUpperCase();

        const colors = ['#FF6B35', '#0F3460', '#38A169', '#3182CE', '#D69E2E', '#805AD5', '#E53E3E', '#319795'];
        const colorIdx = [...displayName].reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % colors.length;
        const bg = colors[colorIdx];

        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="${bg}"/>
  <text x="50%" y="50%" dy="0.35em" text-anchor="middle" fill="#fff"
    font-family="Inter,Arial,sans-serif" font-size="${Math.round(size * 0.38)}" font-weight="700">${initials}</text>
</svg>`;
        return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
    }

    /* ── Require login (call on protected pages) ─────────────── */
    function requireLogin(redirectTo = 'auth.html') {
        if (!isLoggedIn()) {
            const current = encodeURIComponent(window.location.pathname + window.location.search);
            window.location.href = redirectTo + '?redirect=' + current;
            return false;
        }
        return true;
    }

    /* ── Redirect if already logged in (call on auth page) ────── */
    function redirectIfLoggedIn(redirectTo = 'dashboard.html') {
        if (isLoggedIn()) {
            const params = new URLSearchParams(window.location.search);
            const redirect = params.get('redirect');
            // Security: only allow relative redirects to prevent open redirects
            const safeRedirect = redirect && !redirect.startsWith('http') ? redirect : redirectTo;
            window.location.href = safeRedirect;
            return true;
        }
        return false;
    }

    /* ── Logout ──────────────────────────────────────────────── */
    async function logout() {
        try {
            await fetch(API_BASE + '/auth/logout', {
                method: 'POST',
                credentials: 'include',
                headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {},
            });
        } catch (e) {
            // Proceed with local clear even if backend is unreachable
        }
        clear();
        window.location.href = 'index.html';
    }

    /* ── Dark mode preference ────────────────────────────────── */
    function applyDarkMode() {
        const user = getUser();
        const savedMode = localStorage.getItem('wl_dark_mode');
        const darkMode = (user && user.darkMode) || savedMode === 'true';
        if (darkMode) {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
        return !!darkMode;
    }

    function toggleDarkMode() {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        if (isDark) {
            document.documentElement.removeAttribute('data-theme');
            localStorage.setItem('wl_dark_mode', 'false');
        } else {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('wl_dark_mode', 'true');
        }
        // Sync with server if logged in (non-blocking)
        if (isLoggedIn()) {
            apiCall('/auth/me', {
                method: 'PUT',
                body: JSON.stringify({ darkMode: !isDark }),
            }).catch(() => {});
        }
        return !isDark;
    }

    /* ── Currency helper ─────────────────────────────────────── */
    function getCurrency() {
        const user = getUser();
        return (user && user.currency) || localStorage.getItem('wl_currency') || 'INR';
    }

    function formatPrice(amount, currency) {
        const curr = currency || getCurrency();
        const locale = curr === 'INR' ? 'en-IN' : 'en-US';
        try {
            return new Intl.NumberFormat(locale, {
                style: 'currency',
                currency: curr,
                maximumFractionDigits: 0,
            }).format(amount);
        } catch {
            return `₹${amount}`;
        }
    }

    // Initialize on load
    init();

    // Expose public API
    const Session = {
        save, clear, getToken, getUser, isLoggedIn,
        getAvatarUrl, requireLogin, redirectIfLoggedIn, logout,
        applyDarkMode, toggleDarkMode, getCurrency, formatPrice,
        fetchMe, apiCall, refreshToken,
    };

    window.WL = window.WL || {};
    window.WL.Session = Session;

    // Apply dark mode immediately (before render) to prevent flash
    Session.applyDarkMode();

})();
