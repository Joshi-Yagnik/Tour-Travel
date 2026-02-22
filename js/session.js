/* ============================================================
   WANDERLUST — Session Manager (shared across all pages)
   Stores user in localStorage, provides auth helpers
   ============================================================ */

const WL = window.WL || {};

WL.Session = (function () {
    const KEY_TOKEN = 'wl_token';
    const KEY_USER = 'wl_user';

    /* ── Save after login / register ──────────────────────── */
    function save(token, user) {
        localStorage.setItem(KEY_TOKEN, token);
        localStorage.setItem(KEY_USER, JSON.stringify(user));
    }

    /* ── Clear on logout ───────────────────────────────────── */
    function clear() {
        localStorage.removeItem(KEY_TOKEN);
        localStorage.removeItem(KEY_USER);
    }

    /* ── Getters ───────────────────────────────────────────── */
    function getToken() {
        return localStorage.getItem(KEY_TOKEN);
    }

    function getUser() {
        try {
            return JSON.parse(localStorage.getItem(KEY_USER)) || null;
        } catch {
            return null;
        }
    }

    function isLoggedIn() {
        return !!getToken() && !!getUser();
    }

    /* ── Avatar: generate initials SVG data-URL ────────────── */
    function getAvatarUrl(name, size = 80) {
        const user = getUser();
        if (user && user.avatar) return user.avatar;

        // Generate initials
        const parts = (name || 'User').trim().split(' ');
        const initials = parts.length >= 2
            ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
            : parts[0].substring(0, 2).toUpperCase();

        // Pick a color from name char codes
        const colors = ['#FF6B35', '#0F3460', '#38A169', '#3182CE', '#D69E2E', '#805AD5', '#E53E3E', '#319795'];
        const colorIdx = name
            ? [...name].reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % colors.length
            : 0;
        const bg = colors[colorIdx];

        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="${bg}"/>
      <text x="50%" y="50%" dy="0.35em" text-anchor="middle" fill="#fff"
        font-family="Inter,Arial,sans-serif" font-size="${size * 0.38}" font-weight="700">${initials}</text>
    </svg>`;
        return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
    }

    /* ── Require login (call on protected pages) ────────────── */
    function requireLogin(redirectTo = 'auth.html') {
        if (!isLoggedIn()) {
            window.location.href = redirectTo;
            return false;
        }
        return true;
    }

    /* ── Redirect if already logged in (call on auth page) ── */
    function redirectIfLoggedIn(redirectTo = 'dashboard.html') {
        if (isLoggedIn()) {
            window.location.href = redirectTo;
            return true;
        }
        return false;
    }

    /* ── Logout ─────────────────────────────────────────────── */
    function logout() {
        clear();
        window.location.href = 'index.html';
    }

    return { save, clear, getToken, getUser, isLoggedIn, getAvatarUrl, requireLogin, redirectIfLoggedIn, logout };
})();

window.WL = WL;
