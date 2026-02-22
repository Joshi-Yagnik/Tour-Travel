/* ============================================================
   WANDERLUST — Auth Routes
   POST /api/auth/register
   POST /api/auth/login
   GET  /api/auth/me
   POST /api/auth/forgot-password
   ============================================================ */

const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const protect = require('../middleware/auth');

const router = express.Router();

/* Utility: generate JWT */
const signToken = (id) =>
    jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '30d',
    });

/* ── POST /api/auth/register ─────────────────────────────── */
router.post('/register', async (req, res) => {
    try {
        const { name, email, phone, password } = req.body;

        if (await User.findOne({ email })) {
            return res.status(409).json({ success: false, message: 'Email already registered.' });
        }

        const user = await User.create({ name, email, phone, passwordHash: password });
        const token = signToken(user._id);

        res.status(201).json({ success: true, token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

/* ── POST /api/auth/login ────────────────────────────────── */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password required.' });

        const user = await User.findOne({ email }).select('+passwordHash');
        if (!user || !(await user.matchPassword(password))) {
            return res.status(401).json({ success: false, message: 'Invalid email or password.' });
        }

        const token = signToken(user._id);
        res.json({ success: true, token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

/* ── GET /api/auth/me ────────────────────────────────────── */
router.get('/me', protect, async (req, res) => {
    const user = await User.findById(req.user.id).populate('wishlist');
    res.json({ success: true, user });
});

/* ── PUT /api/auth/me ────────────────────────────────────── */
router.put('/me', protect, async (req, res) => {
    try {
        const { name, phone, avatar } = req.body;
        const user = await User.findByIdAndUpdate(req.user.id, { name, phone, avatar }, { new: true, runValidators: true });
        res.json({ success: true, user });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

/* ── POST /api/auth/wishlist/:packageId ──────────────────── */
router.post('/wishlist/:packageId', protect, async (req, res) => {
    const user = await User.findById(req.user.id);
    const { packageId } = req.params;
    const idx = user.wishlist.indexOf(packageId);
    if (idx === -1) {
        user.wishlist.push(packageId);
    } else {
        user.wishlist.splice(idx, 1);
    }
    await user.save();
    res.json({ success: true, wishlist: user.wishlist });
});

module.exports = router;
