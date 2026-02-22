/* ============================================================
   WANDERLUST — Destinations Routes
   GET  /api/destinations         (filter, sort, paginate)
   GET  /api/destinations/:id
   POST /api/destinations         (admin only)
   PUT  /api/destinations/:id     (admin only)
   DELETE /api/destinations/:id   (admin only)
   ============================================================ */

const express = require('express');
const Destination = require('../models/Destination');
const protect = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');

const router = express.Router();

/* ── GET /api/destinations ───────────────────────────────── */
router.get('/', async (req, res) => {
    try {
        const { region, minPrice, maxPrice, search, sort = '-rating', featured, page = 1, limit = 12 } = req.query;

        const query = {};
        if (region) query.region = region;
        if (featured) query.featured = true;
        if (minPrice || maxPrice) {
            query.startingPrice = {};
            if (minPrice) query.startingPrice.$gte = Number(minPrice);
            if (maxPrice) query.startingPrice.$lte = Number(maxPrice);
        }
        if (search) {
            query.$text = { $search: search };
        }

        const total = await Destination.countDocuments(query);
        const destinations = await Destination
            .find(query)
            .sort(sort)
            .skip((Number(page) - 1) * Number(limit))
            .limit(Number(limit));

        res.json({ success: true, total, page: Number(page), data: destinations });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

/* ── GET /api/destinations/:id ───────────────────────────── */
router.get('/:id', async (req, res) => {
    const dest = await Destination.findById(req.params.id);
    if (!dest) return res.status(404).json({ success: false, message: 'Destination not found.' });
    res.json({ success: true, data: dest });
});

/* ── POST /api/destinations (admin) ─────────────────────── */
router.post('/', protect, adminOnly, async (req, res) => {
    try {
        const dest = await Destination.create(req.body);
        res.status(201).json({ success: true, data: dest });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

/* ── PUT /api/destinations/:id (admin) ──────────────────── */
router.put('/:id', protect, adminOnly, async (req, res) => {
    const dest = await Destination.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!dest) return res.status(404).json({ success: false, message: 'Destination not found.' });
    res.json({ success: true, data: dest });
});

/* ── DELETE /api/destinations/:id (admin) ────────────────── */
router.delete('/:id', protect, adminOnly, async (req, res) => {
    await Destination.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Destination deleted.' });
});

module.exports = router;
