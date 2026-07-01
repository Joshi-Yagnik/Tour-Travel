/* ============================================================
   WANDERLUST — Bookings Routes v3.0
   Full pricing breakdown: GST, SGST, Platform Fee, Grand Total
   ============================================================
   POST /api/bookings             (authenticated)
   GET  /api/bookings/my          (authenticated, own bookings)
   GET  /api/bookings/:id         (authenticated, own booking)
   PUT  /api/bookings/:id/cancel  (authenticated)
   GET  /api/bookings             (admin, all bookings)
   PUT  /api/bookings/:id/status  (admin)
   GET  /api/bookings/pricing-preview (public, calculate pricing)
   ============================================================ */

const express  = require('express');
const Booking  = require('../models/Booking');
const Package  = require('../models/Package');
const Hotel    = require('../models/Hotel');
const protect  = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');

const router = express.Router();

/* ══════════════════════════════════════════════════════════
   PRICING ENGINE — shared calculation helper
   Platform Fee: ₹1,999 flat per booking
   GST: 9% of subtotal | SGST: 9% of subtotal
══════════════════════════════════════════════════════════ */
const PLATFORM_FEE   = 1999;
const GST_RATE       = 0.09;
const SGST_RATE      = 0.09;

/**
 * Calculate full pricing breakdown
 * @param {object} params
 * @param {number} params.basePrice   - unit price (per night OR per person)
 * @param {number} params.nights      - number of nights (hotel only, default 1)
 * @param {number} params.rooms       - number of rooms (hotel only, default 1)
 * @param {number} params.guests      - number of guests/travelers
 * @param {string} params.type        - 'hotel' | 'package'
 * @returns {object} Full pricing breakdown
 */
function calculatePricing({ basePrice = 0, nights = 1, rooms = 1, guests = 1, type = 'package' }) {
    // Subtotal calculation
    let subtotal;
    if (type === 'hotel') {
        subtotal = Math.round(basePrice * nights * rooms);
    } else {
        // Package: price is per person
        subtotal = Math.round(basePrice * guests);
    }

    const platformFee    = PLATFORM_FEE;
    const gst            = Math.round(subtotal * GST_RATE);
    const sgst           = Math.round(subtotal * SGST_RATE);
    const cgst           = 0;
    const convenienceFee = 0;
    const grandTotal     = subtotal + platformFee + gst + sgst + cgst + convenienceFee;

    const advanceAmount  = Math.round(grandTotal * 0.4);
    const remainingAmount = grandTotal - advanceAmount;

    return {
        basePrice,
        nights,
        rooms,
        guests,
        subtotal,
        platformFee,
        gst,
        sgst,
        cgst,
        convenienceFee,
        grandTotal,
        advanceAmount,
        remainingAmount,
        currency: 'INR',
    };
}

/* ── GET /api/bookings/pricing-preview — Public calc ────── */
router.get('/pricing-preview', (req, res) => {
    const { basePrice, nights, rooms, guests, type } = req.query;
    const pricing = calculatePricing({
        basePrice:  parseFloat(basePrice) || 0,
        nights:     parseInt(nights)      || 1,
        rooms:      parseInt(rooms)       || 1,
        guests:     parseInt(guests)      || 1,
        type:       type                  || 'package',
    });
    res.json({ success: true, data: pricing });
});

/* ── POST /api/bookings — Create a booking ───────────────── */
router.post('/', protect, async (req, res) => {
    try {
        const {
            packageId, hotelId, bookingType,
            travelDate, returnDate,
            travelers, rooms = 1,
            specialRequests, roomId,
            paymentMethod = 'cod',
        } = req.body;

        let basePrice = 0;
        let finalType = bookingType || 'package';
        let nights    = 1;

        if (finalType === 'package') {
            const pkg = await Package.findById(packageId);
            if (!pkg) return res.status(404).json({ success: false, message: 'Package not found.' });
            if (travelers > (pkg.groupSize?.max || 50)) {
                return res.status(400).json({ success: false, message: `Max group size is ${pkg.groupSize?.max || 50}.` });
            }
            basePrice = pkg.price || 0;

        } else if (finalType === 'hotel') {
            const hotel = await Hotel.findById(hotelId);
            if (!hotel) return res.status(404).json({ success: false, message: 'Hotel not found.' });

            // Resolve price from room or startingPrice
            let pricePerNight = hotel.startingPrice || hotel.priceFrom || 0;
            if (roomId && hotel.rooms) {
                const room = hotel.rooms.id(roomId);
                if (room && room.pricePerNight > 0) pricePerNight = room.pricePerNight;
            }
            basePrice = pricePerNight;

            // Calculate nights
            if (travelDate && returnDate) {
                const d1   = new Date(travelDate);
                const d2   = new Date(returnDate);
                const diff = (d2 - d1) / (1000 * 60 * 60 * 24);
                if (diff > 0) nights = Math.ceil(diff);
            }
        } else {
            return res.status(400).json({ success: false, message: 'Invalid booking type.' });
        }

        // Calculate full pricing
        const pricing = calculatePricing({
            basePrice,
            nights:  finalType === 'hotel' ? nights : 1,
            rooms:   finalType === 'hotel' ? (parseInt(rooms) || 1) : 1,
            guests:  parseInt(travelers) || 1,
            type:    finalType,
        });

        let paymentStatus = 'unpaid';
        let amountPaid = 0;
        
        // If they provided a payment method (even COD represents paying later but creating booking now, we set them to partially paid to reflect advance payment requirement in the future, but usually an online payment indicates they paid the advance).
        // Let's assume the advance is paid upon successful creation here (for COD it means they will pay advance).
        // For Razorpay/Stripe, the actual payment gateway logic might update it, but for now we set it to 'Partially Paid' as requested by the user flow.
        if (paymentMethod) {
            paymentStatus = 'Partially Paid';
            amountPaid = pricing.advanceAmount;
        }

        const booking = await Booking.create({
            user:          req.user.id,
            package:       finalType === 'package' ? packageId : null,
            hotel:         finalType === 'hotel'   ? hotelId   : null,
            bookingType:   finalType,
            travelDate,
            returnDate,
            travelers:     parseInt(travelers) || 1,
            rooms:         finalType === 'hotel' ? (parseInt(rooms) || 1) : 1,
            pricing,
            totalPrice:    pricing.grandTotal,
            advancePercentage: 40,
            advanceAmount: pricing.advanceAmount,
            remainingAmount: pricing.remainingAmount,
            amountPaid:    amountPaid,
            paymentStatus: paymentStatus,
            status:        paymentStatus === 'Partially Paid' ? 'pending' : 'pending',
            paymentMethod,
            specialRequests,
        });

        if (finalType === 'package') await booking.populate('package', 'title coverImage duration price');
        if (finalType === 'hotel')   await booking.populate('hotel',   'name coverImage location startingPrice type');

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
        .populate({
            path: 'package',
            select: 'title coverImage destination duration price',
            populate: { path: 'destination', select: 'name city state country' },
        })
        .populate('hotel', 'name coverImage location startingPrice type')
        .sort('-createdAt');

    res.json({ success: true, data: bookings });
});

/* ── GET /api/bookings/:id — Single booking ─────────────── */
router.get('/:id', protect, async (req, res) => {
    const booking = await Booking
        .findOne({ _id: req.params.id, user: req.user.id })
        .populate('package')
        .populate('hotel', 'name coverImage location startingPrice type');

    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });
    res.json({ success: true, data: booking });
});

/* ── PUT /api/bookings/:id/cancel ────────────────────────── */
router.put('/:id/cancel', protect, async (req, res) => {
    const booking = await Booking.findOne({ _id: req.params.id, user: req.user.id });
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });
    if (booking.status === 'cancelled') return res.status(400).json({ success: false, message: 'Already cancelled.' });

    booking.status       = 'cancelled';
    booking.cancelledAt  = new Date();
    booking.cancelReason = req.body.reason || 'User requested cancellation';
    await booking.save();

    res.json({ success: true, data: booking });
});

/* ── GET /api/bookings — Admin: all bookings ─────────────── */
router.get('/', protect, adminOnly, async (req, res) => {
    const { status, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status) query.status = status;

    const total    = await Booking.countDocuments(query);
    const bookings = await Booking
        .find(query)
        .populate('user', 'name email')
        .populate('package', 'title price')
        .populate('hotel', 'name startingPrice type')
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
module.exports.calculatePricing = calculatePricing;
