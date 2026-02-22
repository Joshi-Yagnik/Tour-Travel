/* ============================================================
   WANDERLUST — Bookings Routes
   POST /api/bookings             (authenticated)
   GET  /api/bookings/my          (authenticated, own bookings)
   GET  /api/bookings/:id         (authenticated, own booking)
   PUT  /api/bookings/:id/cancel  (authenticated)
   GET  /api/bookings             (admin, all bookings)
   PUT  /api/bookings/:id/status  (admin)
   ============================================================ */

const express = require('express');
const Booking = require('../models/Booking');
const Package = require('../models/Package');
const protect = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');

const router = express.Router();

/* ── POST /api/bookings — Create a booking ───────────────── */
router.post('/', protect, async (req, res) => {
    try {
        const { packageId, travelDate, travelers, specialRequests } = req.body;

        const pkg = await Package.findById(packageId);
        if (!pkg) return res.status(404).json({ success: false, message: 'Package not found.' });

        if (travelers > pkg.groupSize.max) {
            return res.status(400).json({ success: false, message: `Max group size is ${pkg.groupSize.max}.` });
        }

        const totalPrice = pkg.price * travelers;

        const booking = await Booking.create({
            user: req.user.id,
            package: packageId,
            travelDate,
            travelers,
            totalPrice,
            specialRequests,
        });

        await booking.populate('package', 'title coverImage duration');
        res.status(201).json({ success: true, data: booking });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

/* ── GET /api/bookings/my — Logged-in user's bookings ───── */
router.get('/my', protect, async (req, res) => {
    const { status } = req.query;
    const query = { user: req.user.id };
    if (status) query.status = status;

    const bookings = await Booking
        .find(query)
        .populate('package', 'title coverImage destination duration price')
        .sort('-createdAt');

    res.json({ success: true, data: bookings });
});

/* ── GET /api/bookings/:id — Single booking ─────────────── */
router.get('/:id', protect, async (req, res) => {
    const booking = await Booking
        .findOne({ _id: req.params.id, user: req.user.id })
        .populate('package');

    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });
    res.json({ success: true, data: booking });
});

/* ── PUT /api/bookings/:id/cancel ────────────────────────── */
router.put('/:id/cancel', protect, async (req, res) => {
    const booking = await Booking.findOne({ _id: req.params.id, user: req.user.id });
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });
    if (booking.status === 'cancelled') return res.status(400).json({ success: false, message: 'Already cancelled.' });

    booking.status = 'cancelled';
    booking.cancelledAt = new Date();
    booking.cancelReason = req.body.reason || 'User requested cancellation';
    await booking.save();

    res.json({ success: true, data: booking });
});

/* ── GET /api/bookings — Admin: all bookings ─────────────── */
router.get('/', protect, adminOnly, async (req, res) => {
    const { status, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status) query.status = status;

    const total = await Booking.countDocuments(query);
    const bookings = await Booking
        .find(query)
        .populate('user', 'name email')
        .populate('package', 'title price')
        .sort('-createdAt')
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit));

    res.json({ success: true, total, data: bookings });
});

/* ── PUT /api/bookings/:id/status — Admin update ─────────── */
router.put('/:id/status', protect, adminOnly, async (req, res) => {
    const { status, paymentStatus } = req.body;
    const booking = await Booking.findByIdAndUpdate(
        req.params.id,
        { status, paymentStatus },
        { new: true },
    );
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });
    res.json({ success: true, data: booking });
});

module.exports = router;
