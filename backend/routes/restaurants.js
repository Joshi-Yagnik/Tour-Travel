/* ============================================================
   WANDERLUST — Restaurant Routes v1.0
   GET  /api/restaurants         — search & filter
   GET  /api/restaurants/types   — list types
   GET  /api/restaurants/:id     — single restaurant
   POST /api/restaurants         — create (admin/owner)
   PUT  /api/restaurants/:id     — update (owner/admin)
   DELETE /api/restaurants/:id   — deactivate (admin)
   ============================================================ */

const express    = require('express');
const Restaurant = require('../models/Restaurant');
const protect    = require('../middleware/auth');
const adminOnly  = require('../middleware/adminOnly');

const router = express.Router();

/* ── GET /api/restaurants — Search & Filter ──────────────── */
router.get('/', async (req, res) => {
    try {
        const {
            type, city, state, isVeg, cuisine,
            priceRange, minRating, search,
            sort = '-rating', featured,
            page = 1, limit = 12,
        } = req.query;

        const query = { isActive: true, approvalStatus: 'approved' };

        if (type)      query.type                  = type;
        if (city)      query['location.city']      = new RegExp(city, 'i');
        if (state)     query['location.state']     = new RegExp(state, 'i');
        if (featured === 'true') query.featured    = true;
        if (isVeg === 'true')    query.isVeg       = true;
        if (priceRange)          query.priceRange  = priceRange;
        if (minRating)           query.rating      = { $gte: Number(minRating) };
        if (cuisine) {
            const cuisineList = cuisine.split(',').map(c => c.trim());
            query.cuisine = { $in: cuisineList };
        }
        if (search) {
            query.$text = { $search: search };
        }

        const total = await Restaurant.countDocuments(query);
        const restaurants = await Restaurant
            .find(query)
            .sort(sort)
            .skip((Number(page) - 1) * Number(limit))
            .limit(Number(limit))
            .lean();

        res.json({
            success: true,
            total,
            page: Number(page),
            pages: Math.ceil(total / Number(limit)),
            data: restaurants,
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

/* ── GET /api/restaurants/types ──────────────────────────── */
router.get('/types', (req, res) => {
    res.json({
        success: true,
        data: [
            { value: 'restaurant',  label: 'Restaurant',   icon: 'fa-utensils' },
            { value: 'dhaba',       label: 'Dhaba',        icon: 'fa-fire' },
            { value: 'cafe',        label: 'Café',         icon: 'fa-coffee' },
            { value: 'street_food', label: 'Street Food',  icon: 'fa-shopping-cart' },
            { value: 'fine_dining', label: 'Fine Dining',  icon: 'fa-wine-glass-alt' },
            { value: 'fast_food',   label: 'Fast Food',    icon: 'fa-hamburger' },
            { value: 'bakery',      label: 'Bakery',       icon: 'fa-bread-slice' },
            { value: 'bar_lounge',  label: 'Bar & Lounge', icon: 'fa-glass-martini-alt' },
            { value: 'rooftop',     label: 'Rooftop',      icon: 'fa-building' },
            { value: 'food_court',  label: 'Food Court',   icon: 'fa-store' },
        ],
    });
});

/* ── GET /api/restaurants/:id ────────────────────────────── */
router.get('/:id', async (req, res) => {
    try {
        const restaurant = await Restaurant.findById(req.params.id).populate('owner', 'name email');
        if (!restaurant || !restaurant.isActive) {
            return res.status(404).json({ success: false, message: 'Restaurant not found.' });
        }
        res.json({ success: true, data: restaurant });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

/* ── POST /api/restaurants — Create ─────────────────────── */
router.post('/', protect, async (req, res) => {
    try {
        if (!['admin'].includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'Only admins can create restaurants.' });
        }
        const restaurant = await Restaurant.create({
            ...req.body,
            owner: req.user.id,
            verified: req.user.role === 'admin',
            approvalStatus: req.user.role === 'admin' ? 'approved' : 'pending',
        });
        res.status(201).json({ success: true, data: restaurant });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

/* ── PUT /api/restaurants/:id — Update ──────────────────── */
router.put('/:id', protect, async (req, res) => {
    try {
        const restaurant = await Restaurant.findById(req.params.id);
        if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant not found.' });

        if (restaurant.owner?.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized.' });
        }

        const updated = await Restaurant.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        res.json({ success: true, data: updated });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

/* ── DELETE /api/restaurants/:id — Soft delete (admin) ──── */
router.delete('/:id', protect, adminOnly, async (req, res) => {
    try {
        await Restaurant.findByIdAndUpdate(req.params.id, { isActive: false });
        res.json({ success: true, message: 'Restaurant deactivated.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
