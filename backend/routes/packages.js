/* ============================================================
   WANDERLUST — Packages Routes
   GET  /api/packages
   GET  /api/packages/:id
   POST /api/packages             (admin)
   PUT  /api/packages/:id         (admin)
   DELETE /api/packages/:id       (admin)
   ============================================================ */

const express = require('express');
const Package = require('../models/Package');
const protect = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');

const router = express.Router();

/* ── GET /api/packages ───────────────────────────────────── */
router.get('/', async (req, res) => {
    try {
        const {
            destination, minPrice, maxPrice, duration,
            sort = '-rating', featured, page = 1, limit = 9,
        } = req.query;

        const query = {};
        if (destination) query.destination = destination;
        if (featured) query.featured = true;
        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = Number(minPrice);
            if (maxPrice) query.price.$lte = Number(maxPrice);
        }
        if (duration === 'short') query['duration.days'] = { $lte: 3 };
        if (duration === 'medium') query['duration.days'] = { $gt: 3, $lte: 7 };
        if (duration === 'long') query['duration.days'] = { $gt: 7 };

        const total = await Package.countDocuments(query);
        const packages = await Package
            .find(query)
            .populate('destination', 'name country region')
            .sort(sort)
            .skip((Number(page) - 1) * Number(limit))
            .limit(Number(limit));

        res.json({ success: true, total, page: Number(page), data: packages });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

/* ── GET /api/packages/:id ───────────────────────────────── */
router.get('/:id', async (req, res) => {
    const pkg = await Package.findById(req.params.id).populate('destination');
    if (!pkg) return res.status(404).json({ success: false, message: 'Package not found.' });
    res.json({ success: true, data: pkg });
});

/* ── POST /api/packages (admin) ─────────────────────────── */
router.post('/', protect, adminOnly, async (req, res) => {
    try {
        const pkg = await Package.create(req.body);
        res.status(201).json({ success: true, data: pkg });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

/* ── PUT /api/packages/:id (admin) ──────────────────────── */
router.put('/:id', protect, adminOnly, async (req, res) => {
    const pkg = await Package.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!pkg) return res.status(404).json({ success: false, message: 'Package not found.' });
    res.json({ success: true, data: pkg });
});

/* ── DELETE /api/packages/:id (admin) ────────────────────── */
router.delete('/:id', protect, adminOnly, async (req, res) => {
    await Package.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Package deleted.' });
});

module.exports = router;
