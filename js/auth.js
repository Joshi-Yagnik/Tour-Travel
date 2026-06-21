/* ============================================================
   WANDERLUST — Auth JS v3.0
   - Real API calls to backend
   - Tab switch, form validation, password strength
   - Login/Signup/Forgot Password
   ============================================================ */
(function () {
    'use strict';

    const API = '/api/auth';

    // Role-based redirect if already logged in
    if (window.WL && WL.Session.isLoggedIn()) {
        const u = WL.Session.getUser();
        if (u && u.role === 'admin')       { window.location.href = '/admin/index.html'; return; }
        if (u && u.role === 'hotel_owner') { window.location.href = '/hotel-owner/index.html'; return; }
        WL.Session.redirectIfLoggedIn('dashboard.html');
        return;
    }

    /* ── Elements ────────────────────────────────────────────── */
    const tabs       = document.querySelectorAll('.auth-tab');
    const loginForm  = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const forgotForm = document.getElementById('forgot-form');
    const slider     = document.querySelector('.auth-tab__slider');

    /* ── Tab switching ───────────────────────────────────────── */
    window.switchTab = function (tab) {
        [loginForm, signupForm, forgotForm].forEach(f => f && (f.style.display = 'none'));
        tabs[0]?.classList.remove('active');
        tabs[1]?.classList.remove('active');
        slider?.classList.remove('right');

        if (tab === 'signup') {
            tabs[1]?.classList.add('active');
            slider?.classList.add('right');
            if (signupForm) signupForm.style.display = 'block';
        } else if (tab === 'forgot') {
            if (forgotForm) forgotForm.style.display = 'block';
        } else {
            tabs[0]?.classList.add('active');
            if (loginForm) loginForm.style.display = 'block';
        }
    };

    tabs.forEach((tab, i) => tab.addEventListener('click', () => switchTab(i === 1 ? 'signup' : 'login')));
    if (window.location.hash === '#signup') switchTab('signup');

    /* ── Disable social login buttons (not yet implemented) ─── */
    document.querySelectorAll('.social-btn').forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            if (window.showToast) {
                showToast('🔜 Social login coming soon! Please use email & password.', 'info', 4000);
            }
        });
    });

    /* ── Password toggle ─────────────────────────────────────── */
    window.togglePass = function (inputId, btn) {
        const input = document.getElementById(inputId);
        const icon  = btn.querySelector('i');
        if (!input) return;
        if (input.type === 'password') {
            input.type = 'text';
            icon?.classList.replace('fa-eye', 'fa-eye-slash');
        } else {
            input.type = 'password';
            icon?.classList.replace('fa-eye-slash', 'fa-eye');
        }
    };

    /* ── Password strength ───────────────────────────────────── */
    const signupPw      = document.getElementById('signup-password');
    const strengthBar   = document.getElementById('pw-strength-bar');
    const strengthLabel = document.getElementById('pw-strength-label');

    if (signupPw && strengthBar) {
        signupPw.addEventListener('input', function () {
            const pw = this.value;
            let score = 0;
            if (pw.length >= 8)            score++;
            if (pw.length >= 12)           score++;
            if (/[A-Z]/.test(pw))          score++;
            if (/[0-9]/.test(pw))          score++;
            if (/[^A-Za-z0-9]/.test(pw))   score++;

            const levels = ['', '#E53E3E', '#D69E2E', '#D69E2E', '#38A169', '#3182CE'];
            const labels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
            const widths = ['0%', '20%', '40%', '60%', '80%', '100%'];

            strengthBar.style.width      = widths[score] || '0%';
            strengthBar.style.background = levels[score] || 'transparent';
            if (strengthLabel) {
                strengthLabel.textContent = pw.length === 0 ? '' : (labels[score] || '');
                strengthLabel.style.color = levels[score] || '';
            }
        });
    }

    /* ── Validation helpers ──────────────────────────────────── */
    function setError(id, msg) {
        const el = document.getElementById(id);
        if (el) el.textContent = msg;
        const inputId = id.replace(/-err$/, '');
        const input   = document.getElementById(inputId);
        if (input) input.classList.toggle('error', !!msg);
    }

    function clearErrors(form) {
        form.querySelectorAll('.form-error').forEach(el => el.textContent = '');
        form.querySelectorAll('.form-control').forEach(el => el.classList.remove('error'));
    }

    function setButtonLoading(btn, loading, originalHTML, loadText) {
        if (loading) {
            btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${loadText}`;
            btn.disabled  = true;
        } else {
            btn.innerHTML = originalHTML;
            btn.disabled  = false;
        }
    }

    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const MIN_PW_LEN  = 8; // Consistent with backend

    /* ── LOGIN FORM ──────────────────────────────────────────── */
    if (loginForm) {
        loginForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            clearErrors(this);

            const email    = document.getElementById('login-email')?.value.trim();
            const password = document.getElementById('login-password')?.value;
            const btn      = this.querySelector('button[type="submit"]');
            const originalHTML = btn.innerHTML;

            let valid = true;
            if (!email || !EMAIL_REGEX.test(email)) {
                setError('login-email-err', 'Please enter a valid email address.');
                valid = false;
            }
            if (!password || password.length < MIN_PW_LEN) {
                setError('login-pw-err', `Password must be at least ${MIN_PW_LEN} characters.`);
                valid = false;
            }
            if (!valid) return;

            setButtonLoading(btn, true, originalHTML, 'Logging in...');

            try {
                const response = await fetch(API + '/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ email, password }),
                });
                const data = await response.json();

                if (!response.ok) {
                    setError('login-pw-err', data.message || 'Login failed. Please try again.');
                    setButtonLoading(btn, false, originalHTML, '');
                    return;
                }

                // Save session (token + user)
                WL.Session.save(data.token, data.user);

                if (window.showToast) {
                    showToast(`Welcome back, ${data.user.name.split(' ')[0]}! 🎉`, 'success');
                }

                // Role-based redirect
                setTimeout(() => {
                    if (data.user.role === 'admin') {
                        // Admin → Admin Panel
                        window.location.href = '/admin/index.html';
                        return;
                    }
                    if (data.user.role === 'hotel_owner') {
                        // Hotel Owner → Owner Panel
                        window.location.href = '/hotel-owner/index.html';
                        return;
                    }
                    // Regular user → intended page or dashboard
                    const params   = new URLSearchParams(window.location.search);
                    const redirect = params.get('redirect');
                    // Security: only allow relative paths
                    const safe = redirect && !redirect.startsWith('http') ? redirect : 'dashboard.html';
                    window.location.href = safe;
                }, 800);

            } catch (err) {
                setError('login-pw-err', 'Connection error. Please check your internet and try again.');
                setButtonLoading(btn, false, originalHTML, '');
            }
        });
    }

    /* ── SIGNUP FORM ─────────────────────────────────────────── */
    if (signupForm) {
        signupForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            clearErrors(this);

            const name     = document.getElementById('signup-name')?.value.trim();
            const email    = document.getElementById('signup-email')?.value.trim();
            const phone    = document.getElementById('signup-phone')?.value.trim();
            const password = document.getElementById('signup-password')?.value;
            const confirm  = document.getElementById('signup-confirm')?.value;
            const terms    = document.getElementById('terms-check')?.checked;
            const btn      = this.querySelector('button[type="submit"]');
            const originalHTML = btn.innerHTML;

            let valid = true;
            if (!name || name.length < 2) {
                setError('signup-name-err', 'Please enter your full name (min 2 characters).');
                valid = false;
            }
            if (!email || !EMAIL_REGEX.test(email)) {
                setError('signup-email-err', 'Please enter a valid email address.');
                valid = false;
            }
            if (phone && !/^\+?[\d\s\-()\\.]{7,15}$/.test(phone)) {
                setError('signup-phone-err', 'Please enter a valid phone number.');
                valid = false;
            }
            if (!password || password.length < MIN_PW_LEN) {
                setError('signup-pw-err', `Password must be at least ${MIN_PW_LEN} characters.`);
                valid = false;
            }
            if (password !== confirm) {
                setError('signup-confirm-err', 'Passwords do not match.');
                valid = false;
            }
            if (!terms) {
                setError('terms-err', 'You must accept the Terms & Privacy Policy to continue.');
                valid = false;
            }
            if (!valid) return;

            setButtonLoading(btn, true, originalHTML, 'Creating account...');

            try {
                const response = await fetch(API + '/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ name, email, phone, password }),
                });
                const data = await response.json();

                if (!response.ok) {
                    if (data.message?.toLowerCase().includes('already')) {
                        setError('signup-email-err', 'This email is already registered. Try logging in.');
                    } else {
                        setError('signup-pw-err', data.message || 'Registration failed. Please try again.');
                    }
                    setButtonLoading(btn, false, originalHTML, '');
                    return;
                }

                // Save session
                WL.Session.save(data.token, data.user);

                // Show success modal
                if (window.openModal) openModal('success-modal');

                setTimeout(() => {
                    if (data.user.role === 'hotel_owner') {
                        window.location.href = '/hotel-owner/index.html';
                    } else {
                        window.location.href = 'dashboard.html';
                    }
                }, 2500);

            } catch (err) {
                setError('signup-pw-err', 'Connection error. Please check your internet and try again.');
                setButtonLoading(btn, false, originalHTML, '');
            }
        });
    }

    /* ── FORGOT PASSWORD FORM ────────────────────────────────── */
    if (forgotForm) {
        forgotForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            clearErrors(this);

            const email = document.getElementById('forgot-email')?.value.trim();
            const btn   = this.querySelector('button[type="submit"]');
            const originalHTML = btn.innerHTML;

            if (!email || !EMAIL_REGEX.test(email)) {
                setError('forgot-email-err', 'Please enter a valid email address.');
                return;
            }

            setButtonLoading(btn, true, originalHTML, 'Sending reset link...');

            try {
                const response = await fetch(API + '/forgot-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ email }),
                });
                // Always show success (even if email not found — prevents user enumeration)
                await response.json();

                // Replace form with success message
                forgotForm.innerHTML = `
                    <div style="text-align:center;padding:var(--space-8)">
                        <div style="font-size:3rem;margin-bottom:var(--space-4)">📬</div>
                        <h3 style="margin-bottom:var(--space-3)">Check Your Email</h3>
                        <p style="color:var(--text-muted);margin:var(--space-4) 0">
                            If an account exists for <strong>${email}</strong>, we've sent
                            password reset instructions. Check your inbox (and spam folder).
                        </p>
                        <p style="font-size:var(--text-sm);color:var(--text-muted);margin-bottom:var(--space-6)">
                            The link expires in <strong>1 hour</strong>.
                        </p>
                        <button type="button" class="btn btn-outline" onclick="switchTab('login')">
                            <i class="fas fa-arrow-left"></i> Back to Login
                        </button>
                    </div>
                `;

            } catch (err) {
                setError('forgot-email-err', 'Connection error. Please try again.');
                setButtonLoading(btn, false, originalHTML, '');
            }
        });
    }

}());
