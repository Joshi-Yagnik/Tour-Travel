/* ============================================================
   WANDERLUST — Hotels Routes v2.0
   GET  /api/hotels           — search/filter all accommodations
   GET  /api/hotels/nearby    — geolocation-based nearby search
   GET  /api/hotels/:id       — single hotel
   POST /api/hotels           — create (hotel_owner/admin)
   PUT  /api/hotels/:id       — update (owner/admin)
   DELETE /api/hotels/:id     — delete (admin)
   ============================================================ */

const express  = require('express');
const Hotel    = require('../models/Hotel');
const protect  = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');

const router = express.Router();

/* ── GET /api/hotels — Search & Filter ───────────────────── */
router.get('/', async (req, res) => {
    try {
        const {
            type, city, state, country = 'India',
            minPrice, maxPrice, minRating,
            search, sort = '-rating', featured,
            page = 1, limit = 12,
            amenities, verified,
        } = req.query;

        const query = { isActive: true, approvalStatus: 'approved' };


        if (type) query.type = type;
        if (city) query['location.city'] = new RegExp(city, 'i');
        if (state) query['location.state'] = new RegExp(state, 'i');
        if (country) query['location.country'] = new RegExp(country, 'i');
        if (featured === 'true') query.featured = true;
        if (verified === 'true') query.verified = true;
        if (minRating) query.rating = { $gte: Number(minRating) };

        if (minPrice || maxPrice) {
            query.priceFrom = {};
            if (minPrice) query.priceFrom.$gte = Number(minPrice);
            if (maxPrice) query.priceFrom.$lte = Number(maxPrice);
        }

        if (amenities) {
            const amenityList = amenities.split(',').map(a => a.trim());
            query.amenities = { $all: amenityList };
        }

        if (search) {
            query.$text = { $search: search };
        }

        const total = await Hotel.countDocuments(query);
        const hotels = await Hotel
            .find(query)
            .select('-rooms -policies.__v')
            .sort(sort)
            .skip((Number(page) - 1) * Number(limit))
            .limit(Number(limit))
            .lean();

        res.json({
            success: true,
            total,
            page: Number(page),
            pages: Math.ceil(total / Number(limit)),
            data: hotels,
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

/* ── GET /api/hotels/nearby — Geolocation Search ─────────── */
router.get('/nearby', async (req, res) => {
    try {
        const { lat, lng, radius = 10, type, limit = 20 } = req.query;

        if (!lat || !lng) {
            return res.status(400).json({ success: false, message: 'lat and lng are required.' });
        }

        const latN = parseFloat(lat);
        const lngN = parseFloat(lng);
        const radiusKm = parseFloat(radius);

        // Approximate bounding box for fast query
        const latDelta = radiusKm / 111;
        const lngDelta = radiusKm / (111 * Math.cos(latN * Math.PI / 180));

        const query = {
            isActive: true,
            approvalStatus: 'approved',
            'location.coordinates.lat': { $gte: latN - latDelta, $lte: latN + latDelta },
            'location.coordinates.lng': { $gte: lngN - lngDelta, $lte: lngN + lngDelta },
        };

        if (type) query.type = type;

        const hotels = await Hotel
            .find(query)
            .select('name type location rating priceFrom coverImage contact verified')
            .limit(Number(limit))
            .lean();

        // Add calculated distance
        const withDistance = hotels.map(h => {
            const dlat = (h.location.coordinates.lat - latN) * 111;
            const dlng = (h.location.coordinates.lng - lngN) * 111 * Math.cos(latN * Math.PI / 180);
            h.distance = Math.round(Math.sqrt(dlat * dlat + dlng * dlng) * 10) / 10;
            return h;
        }).sort((a, b) => a.distance - b.distance);

        res.json({ success: true, total: withDistance.length, data: withDistance });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

/* ── GET /api/hotels/types — Get available types ─────────── */
router.get('/types', (req, res) => {
    res.json({
        success: true,
        data: [
            { value: 'hotel',       label: 'Hotel',        icon: 'fa-hotel' },
            { value: 'resort',      label: 'Resort',       icon: 'fa-umbrella-beach' },
            { value: 'dharamshala', label: 'Dharamshala',  icon: 'fa-place-of-worship' },
            { value: 'homestay',    label: 'Homestay',     icon: 'fa-house-user' },
            { value: 'guesthouse',  label: 'Guest House',  icon: 'fa-door-open' },
            { value: 'lodge',       label: 'Lodge',        icon: 'fa-tree' },
            { value: 'temple_stay', label: 'Temple Stay',  icon: 'fa-om' },
            { value: 'hostel',      label: 'Hostel',       icon: 'fa-bed' },
            { value: 'villa',       label: 'Villa',        icon: 'fa-building' },
            { value: 'farmstay',    label: 'Farm Stay',    icon: 'fa-tractor' },
        ],
    });
});

/* ── GET /api/hotels/:id ─────────────────────────────────── */
router.get('/:id', async (req, res) => {
    try {
        const hotel = await Hotel.findById(req.params.id).populate('owner', 'name email');
        if (!hotel || !hotel.isActive) {
            return res.status(404).json({ success: false, message: 'Hotel not found.' });
        }
        res.json({ success: true, data: hotel });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

/* ── POST /api/hotels ─ Create Hotel ─────────────────────── */
router.post('/', protect, async (req, res) => {
    try {
        // Allow hotel owners and admins
        if (!['hotel_owner', 'admin'].includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'Only hotel owners and admins can create hotels.' });
        }

        const hotel = await Hotel.create({
            ...req.body,
            owner: req.user.id,
            verified: req.user.role === 'admin', // Auto-verify if admin
        });

        res.status(201).json({ success: true, data: hotel });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

/* ── PUT /api/hotels/:id ─ Update ───────────────────────── */
router.put('/:id', protect, async (req, res) => {
    try {
        const hotel = await Hotel.findById(req.params.id);
        if (!hotel) return res.status(404).json({ success: false, message: 'Hotel not found.' });

        // Only owner or admin can update
        if (hotel.owner.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized.' });
        }

        const updated = await Hotel.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        res.json({ success: true, data: updated });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

/* ── PUT /api/hotels/:id/verify ─ Admin verify ──────────── */
router.put('/:id/verify', protect, adminOnly, async (req, res) => {
    try {
        const hotel = await Hotel.findByIdAndUpdate(
            req.params.id,
            { verified: true },
            { new: true }
        );
        if (!hotel) return res.status(404).json({ success: false, message: 'Hotel not found.' });
        res.json({ success: true, data: hotel, message: 'Hotel verified successfully.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

/* ── DELETE /api/hotels/:id ─ Admin delete ──────────────── */
router.delete('/:id', protect, adminOnly, async (req, res) => {
    try {
        await Hotel.findByIdAndUpdate(req.params.id, { isActive: false });
        res.json({ success: true, message: 'Hotel deactivated.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
