/* ============================================================
   WANDERLUST — Auth Routes v2.0
   POST /api/auth/register
   POST /api/auth/login
   POST /api/auth/logout
   GET  /api/auth/me
   PUT  /api/auth/me
   POST /api/auth/forgot-password
   POST /api/auth/reset-password/:token
   GET  /api/auth/verify-email/:token
   POST /api/auth/wishlist/:packageId
   POST /api/auth/refresh
   ============================================================ */

const express    = require('express');
const jwt        = require('jsonwebtoken');
const crypto     = require('crypto');
const mongoose   = require('mongoose');
const nodemailer = require('nodemailer');
const User       = require('../models/User');
const protect    = require('../middleware/auth');

const router = express.Router();

/* ── JWT helpers ─────────────────────────────────────────── */
const ACCESS_TOKEN_EXPIRE  = '7d';
const REFRESH_TOKEN_EXPIRE = '30d';

function signAccess(id) {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRE });
}
function signRefresh(id) {
    return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh', {
        expiresIn: REFRESH_TOKEN_EXPIRE,
    });
}

function sendTokens(res, user, statusCode = 200) {
    const accessToken  = signAccess(user._id);
    const refreshToken = signRefresh(user._id);

    // httpOnly cookie for refresh token (security)
    res.cookie('wl_refresh', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Lax',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    // Access token in non-httpOnly cookie so JS can read it as fallback
    // Primary usage: Bearer header (sent from memory/localStorage)
    // Fallback: cookie (sent automatically on every request)
    res.cookie('wl_token', accessToken, {
        httpOnly: false, // Must be readable by JS for Bearer header auth
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days - matches JWT expiry
    });

    res.status(statusCode).json({
        success: true,
        token: accessToken,
        user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            avatar: user.avatar,
            currency: user.currency,
            darkMode: user.darkMode,
            isVerified: user.isVerified,
            loyaltyTier: user.loyaltyTier,
            loyaltyPoints: user.loyaltyPoints,
        },
    });
}

/* ── Email helper ────────────────────────────────────────── */
async function sendEmail({ to, subject, html }) {
    try {
        const transporter = nodemailer.createTransporter({
            host: process.env.EMAIL_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.EMAIL_PORT || '587'),
            secure: false,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });
        await transporter.sendMail({
            from: process.env.EMAIL_FROM || `Wanderlust <${process.env.EMAIL_USER}>`,
            to,
            subject,
            html,
        });
        return true;
    } catch (err) {
        console.error('Email error:', err.message);
        return false;
    }
}

/* ── POST /api/auth/register ─────────────────────────────── */
router.post('/register', async (req, res) => {
    try {
        const { name, email, phone, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ success: false, message: 'Name, email and password are required.' });
        }
        if (password.length < 8) {
            return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
        }

        if (await User.findOne({ email: email.toLowerCase() })) {
            return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
        }

        // Generate email verification token
        const verifyToken   = crypto.randomBytes(32).toString('hex');
        const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        const user = await User.create({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            phone,
            passwordHash: password,
            verifyToken,
            verifyExpires,
        });

        // Send verification email (non-blocking)
        const verifyUrl = `${process.env.CLIENT_URL || 'http://localhost:5000'}/api/auth/verify-email/${verifyToken}`;
        sendEmail({
            to: user.email,
            subject: 'Verify your Wanderlust account',
            html: `
                <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:40px">
                    <h1 style="color:#FF6B35">Welcome to Wanderlust! 🧭</h1>
                    <p>Hi ${user.name}, thanks for signing up! Please verify your email to get started.</p>
                    <a href="${verifyUrl}" style="display:inline-block;background:#FF6B35;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;margin:20px 0">Verify Email</a>
                    <p style="color:#718096">This link expires in 24 hours. If you didn't sign up, ignore this email.</p>
                </div>
            `,
        });

        // Award loyalty points for registration
        user.loyaltyPoints = 100;
        await user.save();

        sendTokens(res, user, 201);
    } catch (err) {
        console.error('Register error:', err);
        res.status(400).json({ success: false, message: err.message });
    }
});

/* ── POST /api/auth/login ────────────────────────────────── */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required.' });
        }

        const user = await User.findOne({ email: email.toLowerCase() })
            .select('+passwordHash +isActive');

        if (!user || !user.isActive) {
            return res.status(401).json({ success: false, message: 'Invalid email or password.' });
        }

        if (!user.passwordHash) {
            return res.status(401).json({ success: false, message: 'This account uses Google Sign-In. Please login with Google.' });
        }

        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid email or password.' });
        }

        // Update login metadata
        user.lastLoginAt = new Date();
        user.loginCount  = (user.loginCount || 0) + 1;
        await user.save({ validateBeforeSave: false });

        sendTokens(res, user);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

/* ── POST /api/auth/logout ───────────────────────────────── */
router.post('/logout', (req, res) => {
    const cookieOpts = {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Lax',
        path: '/',
    };
    res.cookie('wl_token',   '', { ...cookieOpts, maxAge: 0 });
    res.cookie('wl_refresh', '', { ...cookieOpts, httpOnly: true, maxAge: 0 });
    res.json({ success: true, message: 'Logged out successfully.' });
});

/* ── POST /api/auth/refresh ──────────────────────────────── */
router.post('/refresh', async (req, res) => {
    try {
        const token = req.cookies.wl_refresh || req.body.refreshToken;
        if (!token) return res.status(401).json({ success: false, message: 'No refresh token.' });

        const decoded = jwt.verify(
            token,
            process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh'
        );
        const user = await User.findById(decoded.id).select('+isActive');
        if (!user)         return res.status(401).json({ success: false, message: 'User not found.' });
        if (!user.isActive) return res.status(401).json({ success: false, message: 'Account has been deactivated.' });

        sendTokens(res, user);
    } catch (err) {
        res.status(401).json({ success: false, message: 'Invalid or expired refresh token.' });
    }
});

/* ── GET /api/auth/verify-email/:token ───────────────────── */
router.get('/verify-email/:token', async (req, res) => {
    try {
        const user = await User.findOne({
            verifyToken: req.params.token,
            verifyExpires: { $gt: Date.now() },
        }).select('+verifyToken +verifyExpires');

        if (!user) {
            return res.status(400).send(`
                <html><body style="font-family:Inter,sans-serif;text-align:center;padding:60px">
                <h2>❌ Invalid or expired verification link</h2>
                <a href="/auth.html">Back to Login</a>
                </body></html>
            `);
        }

        user.isVerified    = true;
        user.verifyToken   = undefined;
        user.verifyExpires = undefined;
        user.loyaltyPoints = (user.loyaltyPoints || 0) + 50; // bonus for verifying
        await user.save({ validateBeforeSave: false });

        res.send(`
            <html><body style="font-family:Inter,sans-serif;text-align:center;padding:60px;background:#f7fafc">
            <div style="max-width:480px;margin:0 auto;background:white;padding:40px;border-radius:16px;box-shadow:0 8px 30px rgba(0,0,0,0.1)">
            <div style="font-size:3rem;margin-bottom:16px">✅</div>
            <h2 style="color:#1A202C">Email Verified!</h2>
            <p style="color:#718096">Your Wanderlust account is now fully active. You've earned 50 bonus loyalty points!</p>
            <a href="/dashboard.html" style="display:inline-block;background:#FF6B35;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:20px">Go to Dashboard</a>
            </div></body></html>
        `);
    } catch (err) {
        res.status(500).send('Server error during verification.');
    }
});

/* ── POST /api/auth/forgot-password ──────────────────────── */
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ success: false, message: 'Email is required.' });

        const user = await User.findOne({ email: email.toLowerCase() });

        // Always return success (don't reveal if email exists)
        if (!user) {
            return res.json({ success: true, message: 'If that email is registered, you will receive a reset link.' });
        }

        const resetToken   = crypto.randomBytes(32).toString('hex');
        const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        user.resetPasswordToken   = resetToken;
        user.resetPasswordExpires = resetExpires;
        await user.save({ validateBeforeSave: false });

        const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5000'}/reset-password.html?token=${resetToken}`;

        const sent = await sendEmail({
            to: user.email,
            subject: 'Reset your Wanderlust password',
            html: `
                <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:40px">
                    <h1 style="color:#FF6B35">🔐 Password Reset Request</h1>
                    <p>Hi ${user.name}, we received a request to reset your Wanderlust password.</p>
                    <a href="${resetUrl}" style="display:inline-block;background:#FF6B35;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;margin:20px 0">Reset Password</a>
                    <p style="color:#718096">This link expires in 1 hour. If you didn't request this, please ignore this email and your account remains safe.</p>
                </div>
            `,
        });

        res.json({
            success: true,
            message: 'If that email is registered, you will receive a reset link.',
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error sending reset email.' });
    }
});

/* ── POST /api/auth/reset-password/:token ────────────────── */
router.post('/reset-password/:token', async (req, res) => {
    try {
        const { password } = req.body;
        if (!password || password.length < 8) {
            return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
        }

        const user = await User.findOne({
            resetPasswordToken: req.params.token,
            resetPasswordExpires: { $gt: Date.now() },
        }).select('+resetPasswordToken +resetPasswordExpires');

        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid or expired reset token.' });
        }

        user.passwordHash          = password;
        user.resetPasswordToken    = undefined;
        user.resetPasswordExpires  = undefined;
        await user.save();

        sendTokens(res, user);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

/* ── GET /api/auth/me ────────────────────────────────────── */
router.get('/me', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).populate('wishlist', 'title coverImage price');
        if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
        res.json({ success: true, user });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

/* ── PUT /api/auth/me ────────────────────────────────────── */
router.put('/me', protect, async (req, res) => {
    try {
        const allowedFields = ['name', 'phone', 'avatar', 'bio', 'dob', 'nationality',
                               'currency', 'darkMode', 'language', 'travelPreferences', 'notifications'];
        const updates = {};
        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) updates[field] = req.body[field];
        });

        const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true, runValidators: true });
        res.json({ success: true, user });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

/* ── POST /api/auth/change-password ──────────────────────── */
router.post('/change-password', protect, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: 'Both passwords are required.' });
        }
        if (newPassword.length < 8) {
            return res.status(400).json({ success: false, message: 'New password must be at least 8 characters.' });
        }

        const user = await User.findById(req.user.id).select('+passwordHash');
        const isMatch = await user.matchPassword(currentPassword);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
        }

        user.passwordHash = newPassword;
        await user.save();

        res.json({ success: true, message: 'Password changed successfully.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

/* ── POST /api/auth/wishlist/:packageId ──────────────────── */
router.post('/wishlist/:packageId', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const { packageId } = req.params;
        const pkgId = mongoose.Types.ObjectId.isValid(packageId) ? packageId : null;
        if (!pkgId) return res.status(400).json({ success: false, message: 'Invalid package ID.' });

        const idx = user.wishlist.findIndex(id => id.toString() === packageId);
        let action;
        if (idx === -1) {
            user.wishlist.push(packageId);
            action = 'added';
        } else {
            user.wishlist.splice(idx, 1);
            action = 'removed';
        }
        await user.save();
        res.json({ success: true, action, wishlist: user.wishlist });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
