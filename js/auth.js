/* ============================================================
   WANDERLUST — Auth JS
   Tab switch, form validation, password strength
   + Persistent session via WL.Session (localStorage)
   ============================================================ */
(function () {
    'use strict';

    /* ───────────────────────────────────────────────────────────
       If user is already logged in → skip auth page entirely
    ─────────────────────────────────────────────────────────── */
    if (window.WL && WL.Session.redirectIfLoggedIn('dashboard.html')) return;

    /* ── Tab switching ──────────────────────────────────────── */
    const tabs = document.querySelectorAll('.auth-tab');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const slider = document.querySelector('.auth-tab__slider');

    window.switchTab = function (tab) {
        if (tab === 'signup') {
            tabs[0].classList.remove('active');
            tabs[1].classList.add('active');
            slider.classList.add('right');
            loginForm.style.display = 'none';
            signupForm.style.display = 'block';
        } else {
            tabs[0].classList.add('active');
            tabs[1].classList.remove('active');
            slider.classList.remove('right');
            loginForm.style.display = 'block';
            signupForm.style.display = 'none';
        }
    };

    tabs.forEach((tab, i) => tab.addEventListener('click', () => switchTab(i === 1 ? 'signup' : 'login')));
    if (window.location.hash === '#signup') switchTab('signup');

    /* ── Password toggle ────────────────────────────────────── */
    window.togglePass = function (inputId, btn) {
        const input = document.getElementById(inputId);
        const icon = btn.querySelector('i');
        if (input.type === 'password') {
            input.type = 'text';
            icon.classList.replace('fa-eye', 'fa-eye-slash');
        } else {
            input.type = 'password';
            icon.classList.replace('fa-eye-slash', 'fa-eye');
        }
    };

    /* ── Password strength ──────────────────────────────────── */
    const signupPw = document.getElementById('signup-password');
    const strengthBar = document.getElementById('pw-strength-bar');
    const strengthLabel = document.getElementById('pw-strength-label');

    if (signupPw && strengthBar) {
        signupPw.addEventListener('input', function () {
            const pw = this.value;
            let score = 0;
            if (pw.length >= 8) score++;
            if (/[A-Z]/.test(pw)) score++;
            if (/[0-9]/.test(pw)) score++;
            if (/[^A-Za-z0-9]/.test(pw)) score++;

            const levels = ['', '#E53E3E', '#D69E2E', '#38A169', '#3182CE'];
            const labels = ['', 'Weak', 'Fair', 'Strong', 'Very Strong'];
            const widths = ['0%', '25%', '50%', '75%', '100%'];

            strengthBar.style.width = widths[score] || '0%';
            strengthBar.style.background = levels[score] || 'transparent';
            strengthLabel.textContent = pw.length === 0 ? '' : labels[score] || '';
            strengthLabel.style.color = levels[score] || '';
        });
    }

    /* ── Validation helpers ─────────────────────────────────── */
    function setError(id, msg) {
        const el = document.getElementById(id);
        if (el) el.textContent = msg;
        const rawId = id.replace(/-err$/, '');
        const input = document.getElementById(rawId);
        if (input) input.classList.toggle('error', !!msg);
    }
    function clearErrors(form) {
        form.querySelectorAll('.form-error').forEach(el => el.textContent = '');
        form.querySelectorAll('.form-control').forEach(el => el.classList.remove('error'));
    }

    /* ── Mock user store (frontend-only until backend wired) ── */
    function mockLogin(name, email) {
        const user = { id: 'mock-' + Date.now(), name, email, role: 'user' };
        const token = 'mock-jwt-' + btoa(email + ':' + Date.now());
        WL.Session.save(token, user);
    }

    /* ── Login form ─────────────────────────────────────────── */
    if (loginForm) {
        loginForm.addEventListener('submit', function (e) {
            e.preventDefault();
            clearErrors(this);
            let valid = true;
            const email = document.getElementById('login-email').value.trim();
            const pw = document.getElementById('login-password').value;
            const remember = document.getElementById('remember-me')?.checked;

            if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                setError('login-email-err', 'Please enter a valid email address.');
                valid = false;
            }
            if (!pw || pw.length < 6) {
                setError('login-pw-err', 'Password must be at least 6 characters.');
                valid = false;
            }

            if (valid) {
                const btn = this.querySelector('button[type="submit"]');
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
                btn.disabled = true;

                // Simulate API call — replace with real fetch('/api/auth/login') later
                setTimeout(() => {
                    const nameGuess = email.split('@')[0].replace(/[._]/g, ' ')
                        .replace(/\b\w/g, c => c.toUpperCase());
                    mockLogin(nameGuess, email);
                    if (window.showToast) showToast('Welcome back! Redirecting...', 'success');
                    setTimeout(() => { window.location.href = 'dashboard.html'; }, 700);
                }, 1000);
            }
        });
    }

    /* ── Signup form ─────────────────────────────────────────── */
    if (signupForm) {
        signupForm.addEventListener('submit', function (e) {
            e.preventDefault();
            clearErrors(this);
            let valid = true;

            const name = document.getElementById('signup-name').value.trim();
            const email = document.getElementById('signup-email').value.trim();
            const phone = document.getElementById('signup-phone').value.trim();
            const pw = document.getElementById('signup-password').value;
            const confirm = document.getElementById('signup-confirm').value;
            const terms = document.getElementById('terms-check').checked;

            if (!name || name.length < 2) { setError('signup-name-err', 'Please enter your full name.'); valid = false; }
            if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('signup-email-err', 'Please enter a valid email.'); valid = false; }
            if (!phone || !/^\+?[\d\s\-()\\.]{7,}$/.test(phone)) { setError('signup-phone-err', 'Please enter a valid phone number.'); valid = false; }
            if (!pw || pw.length < 8) { setError('signup-pw-err', 'Password must be at least 8 characters.'); valid = false; }
            if (pw !== confirm) { setError('signup-confirm-err', 'Passwords do not match.'); valid = false; }
            if (!terms) { setError('terms-err', 'You must accept the Terms to continue.'); valid = false; }

            if (valid) {
                const btn = this.querySelector('button[type="submit"]');
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';
                btn.disabled = true;

                // Simulate API call — replace with fetch('/api/auth/register') later
                setTimeout(() => {
                    mockLogin(name, email);
                    openModal('success-modal');
                    // Redirect to dashboard after modal
                    setTimeout(() => { window.location.href = 'dashboard.html'; }, 2000);
                }, 1200);
            }
        });
    }

}());
