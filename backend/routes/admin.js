/* ============================================================
   WANDERLUST — Admin Routes v3.0 — COMPLETE CRUD
   All routes require: protect + adminOnly middleware
   ============================================================
   GET    /api/admin/stats
   --- USERS ---
   GET    /api/admin/users
   PUT    /api/admin/users/:id
   PUT    /api/admin/users/:id/role
   PUT    /api/admin/users/:id/toggle
   DELETE /api/admin/users/:id
   --- PACKAGES ---
   GET    /api/admin/packages
   POST   /api/admin/packages
   PUT    /api/admin/packages/:id
   DELETE /api/admin/packages/:id
   --- DESTINATIONS ---
   GET    /api/admin/destinations
   POST   /api/admin/destinations
   PUT    /api/admin/destinations/:id
   DELETE /api/admin/destinations/:id
   --- HOTELS ---
   GET    /api/admin/hotels
   PUT    /api/admin/hotels/:id
   PUT    /api/admin/hotels/:id/approve
   PUT    /api/admin/hotels/:id/reject
   DELETE /api/admin/hotels/:id
   --- RESTAURANTS ---
   GET    /api/admin/restaurants
   POST   /api/admin/restaurants
   PUT    /api/admin/restaurants/:id
   PUT    /api/admin/restaurants/:id/verify
   DELETE /api/admin/restaurants/:id
   --- BOOKINGS ---
   GET    /api/admin/bookings
   PUT    /api/admin/bookings/:id/status
   PUT    /api/admin/bookings/:id/cancel
   --- REVIEWS ---
   GET    /api/admin/reviews
   PUT    /api/admin/reviews/:id/approve
   PUT    /api/admin/reviews/:id/reject
   DELETE /api/admin/reviews/:id
   --- CONTACT ---
   GET    /api/admin/contact
   PUT    /api/admin/contact/:id/replied
   ============================================================ */

const express     = require('express');
const User        = require('../models/User');
const Booking     = require('../models/Booking');
const Package     = require('../models/Package');
const Destination  = require('../models/Destination');
const protect     = require('../middleware/auth');
const adminOnly   = require('../middleware/adminOnly');

const router = express.Router();

// All admin routes require authentication + admin role
router.use(protect, adminOnly);

/* ─────────────────────────────────────────────────────────── */
/*  GET /api/admin/stats — Dashboard analytics                 */
/* ─────────────────────────────────────────────────────────── */
router.get('/stats', async (req, res) => {
    try {
        let Hotel, Review, Restaurant;
        try { Hotel      = require('../models/Hotel');      } catch (e) {}
        try { Review     = require('../models/Review');     } catch (e) {}
        try { Restaurant = require('../models/Restaurant'); } catch (e) {}

        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const [
            totalUsers,
            totalBookings,
            totalDestinations,
            totalPackages,
            pendingBookings,
            revenueData,
            recentBookings,
            recentUsers,
            totalHotels,
            totalReviews,
            pendingReviews,
            totalRestaurants,
        ] = await Promise.all([
            User.countDocuments({ isActive: true }),
            Booking.countDocuments(),
            Destination.countDocuments({ isActive: true }),
            Package.countDocuments({ isActive: true }),
            Booking.countDocuments({ status: 'pending' }),
            Booking.aggregate([
                { $match: { status: { $in: ['confirmed', 'completed'] } } },
                { $group: {
                    _id: null,
                    total:        { $sum: '$totalPrice' },
                    platformFees: { $sum: '$pricing.platformFee' },
                    gstTotal:     { $sum: { $add: ['$pricing.gst', '$pricing.sgst'] } },
                    subtotals:    { $sum: '$pricing.subtotal' },
                    advanceCollected: { $sum: '$advanceAmount' },
                    remainingBalance: { $sum: '$remainingAmount' },
                } },
            ]),
            Booking.find()
                .populate('user', 'name email')
                .populate('package', 'title')
                .sort('-createdAt')
                .limit(5),
            User.find({ isActive: true })
                .sort('-createdAt')
                .limit(5)
                .select('name email createdAt role avatar'),
            Hotel ? Hotel.countDocuments({ isActive: true }) : 0,
            Review ? Review.countDocuments() : 0,
            Review ? Review.countDocuments({ isApproved: false }) : 0,
            Restaurant ? Restaurant.countDocuments({ isActive: true }) : 0,
        ]);

        // Monthly revenue (last 6 months)
        const monthlyRevenue = await Booking.aggregate([
            {
                $match: {
                    status: { $in: ['confirmed', 'completed'] },
                    createdAt: { $gte: sixMonthsAgo },
                },
            },
            {
                $group: {
                    _id: {
                        year:  { $year: '$createdAt' },
                        month: { $month: '$createdAt' },
                    },
                    revenue:      { $sum: '$totalPrice' },
                    advanceCollected: { $sum: '$advanceAmount' },
                    platformFees: { $sum: '$pricing.platformFee' },
                    taxes:        { $sum: { $add: ['$pricing.gst', '$pricing.sgst'] } },
                    ownerPayouts: { $sum: { $subtract: ['$totalPrice', '$pricing.platformFee'] } },
                    count:        { $sum: 1 },
                },
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } },
        ]);

        // Bookings by status
        const bookingsByStatus = await Booking.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } },
        ]);

        res.json({
            success: true,
            data: {
                counts: {
                    users:          totalUsers,
                    bookings:       totalBookings,
                    destinations:   totalDestinations,
                    packages:       totalPackages,
                    hotels:         totalHotels,
                    reviews:        totalReviews,
                    pendingReviews,
                    restaurants:    totalRestaurants,
                    pendingBookings,
                },
                totalRevenue:       revenueData[0]?.total        || 0,
                advanceCollected:   revenueData[0]?.advanceCollected || 0,
                remainingBalance:   revenueData[0]?.remainingBalance || 0,
                totalPlatformFees:  revenueData[0]?.platformFees || 0,
                totalTaxes:         revenueData[0]?.gstTotal     || 0,
                ownerPayouts:       (revenueData[0]?.total || 0) - (revenueData[0]?.platformFees || 0),
                monthlyRevenue,
                bookingsByStatus,
                recentBookings,
                recentUsers,
            },
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

/* ─────────────────────────────────────────────────────────── */
/*  USERS                                                       */
/* ─────────────────────────────────────────────────────────── */

// GET /api/admin/users
router.get('/users', async (req, res) => {
    try {
        const { role, search, page = 1, limit = 20, isActive } = req.query;
        const query = {};
        if (role)     query.role    = role;
        if (isActive !== undefined) query.isActive = isActive === 'true';
        if (search) query.$or = [
            { name:  new RegExp(search, 'i') },
            { email: new RegExp(search, 'i') },
        ];

        const total = await User.countDocuments(query);
        const users = await User
            .find(query)
            .select('-passwordHash -verifyToken -resetPasswordToken -googleId')
            .sort('-createdAt')
            .skip((Number(page) - 1) * Number(limit))
            .limit(Number(limit));

        res.json({ success: true, total, page: Number(page), data: users });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT /api/admin/users/:id (edit details)
router.put('/users/:id', async (req, res) => {
    try {
        const allowedFields = ['name', 'phone', 'role', 'isActive', 'bio', 'avatar'];
        const updates = {};
        allowedFields.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

        // Prevent removing the last admin
        if (updates.role && updates.role !== 'admin') {
            const adminCount = await User.countDocuments({ role: 'admin', isActive: true });
            const target = await User.findById(req.params.id);
            if (target?.role === 'admin' && adminCount <= 1) {
                return res.status(400).json({ success: false, message: 'Cannot demote the last admin.' });
            }
        }

        const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true })
            .select('-passwordHash -verifyToken -resetPasswordToken');
        if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
        res.json({ success: true, data: user });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT /api/admin/users/:id/role
router.put('/users/:id/role', async (req, res) => {
    try {
        const { role } = req.body;
        const validRoles = ['user', 'hotel_owner', 'admin'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ success: false, message: 'Invalid role.' });
        }
        const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
        if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
        res.json({ success: true, data: user, message: `Role updated to ${role}.` });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT /api/admin/users/:id/toggle
router.put('/users/:id/toggle', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
        user.isActive = !user.isActive;
        await user.save({ validateBeforeSave: false });
        res.json({ success: true, isActive: user.isActive, message: `User ${user.isActive ? 'activated' : 'deactivated'}.` });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', async (req, res) => {
    try {
        if (req.params.id === req.user.id.toString()) {
            return res.status(400).json({ success: false, message: 'You cannot delete your own account.' });
        }
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
        res.json({ success: true, message: 'User permanently deleted.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

/* ─────────────────────────────────────────────────────────── */
/*  PACKAGES                                                    */
/* ─────────────────────────────────────────────────────────── */

// GET /api/admin/packages
router.get('/packages', async (req, res) => {
    try {
        const { search, status, page = 1, limit = 20 } = req.query;
        const query = {};
        if (status) query.status = status;
        if (search) query.$text = { $search: search };

        const total = await Package.countDocuments(query);
        const packages = await Package
            .find(query)
            .populate('destination', 'name country')
            .sort('-createdAt')
            .skip((Number(page) - 1) * Number(limit))
            .limit(Number(limit));

        res.json({ success: true, total, data: packages });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/admin/packages
router.post('/packages', async (req, res) => {
    try {
        const pkg = await Package.create({ ...req.body, createdBy: req.user.id });
        res.status(201).json({ success: true, data: pkg });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

// PUT /api/admin/packages/:id
router.put('/packages/:id', async (req, res) => {
    try {
        const pkg = await Package.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!pkg) return res.status(404).json({ success: false, message: 'Package not found.' });
        res.json({ success: true, data: pkg });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

// DELETE /api/admin/packages/:id (soft delete)
router.delete('/packages/:id', async (req, res) => {
    try {
        const pkg = await Package.findByIdAndUpdate(req.params.id, { isActive: false, status: 'archived' }, { new: true });
        if (!pkg) return res.status(404).json({ success: false, message: 'Package not found.' });
        res.json({ success: true, message: 'Package archived.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

/* ─────────────────────────────────────────────────────────── */
/*  DESTINATIONS                                               */
/* ─────────────────────────────────────────────────────────── */

// GET /api/admin/destinations
router.get('/destinations', async (req, res) => {
    try {
        const { search, page = 1, limit = 20, region } = req.query;
        const query = {};
        if (region) query.region = region;
        if (search) query.$or = [
            { name: new RegExp(search, 'i') },
            { country: new RegExp(search, 'i') },
        ];

        const total = await Destination.countDocuments(query);
        const destinations = await Destination
            .find(query)
            .sort('-createdAt')
            .skip((Number(page) - 1) * Number(limit))
            .limit(Number(limit));

        res.json({ success: true, total, data: destinations });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/admin/destinations
router.post('/destinations', async (req, res) => {
    try {
        const dest = await Destination.create({ ...req.body, createdBy: req.user.id });
        res.status(201).json({ success: true, data: dest });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

// PUT /api/admin/destinations/:id
router.put('/destinations/:id', async (req, res) => {
    try {
        const dest = await Destination.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!dest) return res.status(404).json({ success: false, message: 'Destination not found.' });
        res.json({ success: true, data: dest });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

// DELETE /api/admin/destinations/:id (soft delete)
router.delete('/destinations/:id', async (req, res) => {
    try {
        const dest = await Destination.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
        if (!dest) return res.status(404).json({ success: false, message: 'Destination not found.' });
        res.json({ success: true, message: 'Destination deactivated.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

/* ─────────────────────────────────────────────────────────── */
/*  HOTELS                                                     */
/* ─────────────────────────────────────────────────────────── */

// GET /api/admin/hotels
router.get('/hotels', async (req, res) => {
    try {
        let Hotel;
        try { Hotel = require('../models/Hotel'); }
        catch (e) { return res.json({ success: true, total: 0, data: [] }); }

        const { approvalStatus, type, search, page = 1, limit = 20 } = req.query;
        const query = {};
        if (approvalStatus) query.approvalStatus = approvalStatus;
        if (type)  query.type = type;
        if (search) query.$or = [
            { name: new RegExp(search, 'i') },
            { 'location.city': new RegExp(search, 'i') },
        ];

        const total = await Hotel.countDocuments(query);
        const hotels = await Hotel
            .find(query)
            .populate('owner', 'name email')
            .sort('-createdAt')
            .skip((Number(page) - 1) * Number(limit))
            .limit(Number(limit));

        res.json({ success: true, total, data: hotels });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT /api/admin/hotels/:id (full edit)
router.put('/hotels/:id', async (req, res) => {
    try {
        const Hotel = require('../models/Hotel');
        const hotel = await Hotel.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!hotel) return res.status(404).json({ success: false, message: 'Hotel not found.' });
        res.json({ success: true, data: hotel });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

// PUT /api/admin/hotels/:id/approve
router.put('/hotels/:id/approve', async (req, res) => {
    try {
        const Hotel = require('../models/Hotel');
        const hotel = await Hotel.findByIdAndUpdate(
            req.params.id,
            { verified: true, approvalStatus: 'approved', approvedBy: req.user.id, isActive: true },
            { new: true }
        );
        if (!hotel) return res.status(404).json({ success: false, message: 'Hotel not found.' });
        res.json({ success: true, data: hotel, message: 'Hotel approved.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT /api/admin/hotels/:id/reject
router.put('/hotels/:id/reject', async (req, res) => {
    try {
        const Hotel = require('../models/Hotel');
        const hotel = await Hotel.findByIdAndUpdate(
            req.params.id,
            { verified: false, approvalStatus: 'rejected', approvalNote: req.body.reason || '', isActive: false },
            { new: true }
        );
        if (!hotel) return res.status(404).json({ success: false, message: 'Hotel not found.' });
        res.json({ success: true, data: hotel, message: 'Hotel rejected.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// DELETE /api/admin/hotels/:id
router.delete('/hotels/:id', async (req, res) => {
    try {
        const Hotel = require('../models/Hotel');
        await Hotel.findByIdAndUpdate(req.params.id, { isActive: false });
        res.json({ success: true, message: 'Hotel deactivated.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

/* ─────────────────────────────────────────────────────────── */
/*  RESTAURANTS                                                */
/* ─────────────────────────────────────────────────────────── */

// GET /api/admin/restaurants
router.get('/restaurants', async (req, res) => {
    try {
        const Restaurant = require('../models/Restaurant');
        const { approvalStatus, type, search, page = 1, limit = 20 } = req.query;
        const query = {};
        if (approvalStatus) query.approvalStatus = approvalStatus;
        if (type)  query.type = type;
        if (search) query.$or = [
            { name: new RegExp(search, 'i') },
            { 'location.city': new RegExp(search, 'i') },
        ];

        const total = await Restaurant.countDocuments(query);
        const restaurants = await Restaurant
            .find(query)
            .populate('owner', 'name email')
            .sort('-createdAt')
            .skip((Number(page) - 1) * Number(limit))
            .limit(Number(limit));

        res.json({ success: true, total, data: restaurants });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/admin/restaurants
router.post('/restaurants', async (req, res) => {
    try {
        const Restaurant = require('../models/Restaurant');
        const rest = await Restaurant.create({ ...req.body, createdBy: req.user.id, approvalStatus: 'approved', verified: true });
        res.status(201).json({ success: true, data: rest });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

// PUT /api/admin/restaurants/:id
router.put('/restaurants/:id', async (req, res) => {
    try {
        const Restaurant = require('../models/Restaurant');
        const rest = await Restaurant.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!rest) return res.status(404).json({ success: false, message: 'Restaurant not found.' });
        res.json({ success: true, data: rest });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

// PUT /api/admin/restaurants/:id/verify
router.put('/restaurants/:id/verify', async (req, res) => {
    try {
        const Restaurant = require('../models/Restaurant');
        const rest = await Restaurant.findByIdAndUpdate(
            req.params.id,
            { verified: true, approvalStatus: 'approved' },
            { new: true }
        );
        if (!rest) return res.status(404).json({ success: false, message: 'Restaurant not found.' });
        res.json({ success: true, data: rest, message: 'Restaurant verified.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// DELETE /api/admin/restaurants/:id (soft delete)
router.delete('/restaurants/:id', async (req, res) => {
    try {
        const Restaurant = require('../models/Restaurant');
        await Restaurant.findByIdAndUpdate(req.params.id, { isActive: false });
        res.json({ success: true, message: 'Restaurant deactivated.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

/* ─────────────────────────────────────────────────────────── */
/*  BOOKINGS                                                   */
/* ─────────────────────────────────────────────────────────── */

// GET /api/admin/bookings
router.get('/bookings', async (req, res) => {
    try {
        const { status, paymentStatus, search, page = 1, limit = 20 } = req.query;
        const query = {};
        if (status)        query.status        = status;
        if (paymentStatus) query.paymentStatus = paymentStatus;
        if (search)        query.bookingRef    = new RegExp(search, 'i');

        const total = await Booking.countDocuments(query);
        const bookings = await Booking
            .find(query)
            .populate('user', 'name email phone')
            .populate('package', 'title price coverImage')
            .populate('hotel', 'name type location')
            .sort('-createdAt')
            .skip((Number(page) - 1) * Number(limit))
            .limit(Number(limit));

        res.json({ success: true, total, page: Number(page), data: bookings });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT /api/admin/bookings/:id/status
router.put('/bookings/:id/status', async (req, res) => {
    try {
        const { status, paymentStatus, adminNotes } = req.body;
        const updates = {};
        if (status)        updates.status        = status;
        if (paymentStatus) updates.paymentStatus = paymentStatus;
        if (adminNotes)    updates.adminNotes    = adminNotes;
        if (status === 'confirmed' || status === 'completed') {
            updates.approvedBy = req.user.id;
            updates.approvedAt = new Date();
        }

        const booking = await Booking.findByIdAndUpdate(req.params.id, updates, { new: true })
            .populate('user', 'name email')
            .populate('package', 'title');
        if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });
        res.json({ success: true, data: booking });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT /api/admin/bookings/:id/cancel (admin force cancel)
router.put('/bookings/:id/cancel', async (req, res) => {
    try {
        const booking = await Booking.findByIdAndUpdate(
            req.params.id,
            {
                status: 'cancelled',
                cancelledAt: new Date(),
                cancelReason: req.body.reason || 'Cancelled by admin',
                adminNotes: req.body.adminNotes || '',
            },
            { new: true }
        );
        if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });
        res.json({ success: true, data: booking, message: 'Booking cancelled.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

/* ─────────────────────────────────────────────────────────── */
/*  REVIEWS                                                    */
/* ─────────────────────────────────────────────────────────── */

// GET /api/admin/reviews
router.get('/reviews', async (req, res) => {
    try {
        const Review = require('../models/Review');
        const { isApproved, isReported, targetType, page = 1, limit = 20 } = req.query;
        const query = {};
        if (isApproved !== undefined) query.isApproved = isApproved === 'true';
        if (isReported !== undefined) query.isReported = isReported === 'true';
        if (targetType) query.targetType = targetType;

        const total = await Review.countDocuments(query);
        const reviews = await Review
            .find(query)
            .populate('user', 'name email avatar')
            .sort({ isApproved: 1, createdAt: -1 }) // pending first
            .skip((Number(page) - 1) * Number(limit))
            .limit(Number(limit));

        res.json({ success: true, total, data: reviews });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT /api/admin/reviews/:id/approve
router.put('/reviews/:id/approve', async (req, res) => {
    try {
        const Review = require('../models/Review');
        const review = await Review.findByIdAndUpdate(
            req.params.id,
            { isApproved: true, approvedBy: req.user.id, approvedAt: new Date(), rejectedReason: null },
            { new: true }
        ).populate('user', 'name email');
        if (!review) return res.status(404).json({ success: false, message: 'Review not found.' });
        res.json({ success: true, data: review, message: 'Review approved.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT /api/admin/reviews/:id/reject
router.put('/reviews/:id/reject', async (req, res) => {
    try {
        const Review = require('../models/Review');
        const review = await Review.findByIdAndUpdate(
            req.params.id,
            { isApproved: false, rejectedReason: req.body.reason || 'Does not meet guidelines' },
            { new: true }
        ).populate('user', 'name email');
        if (!review) return res.status(404).json({ success: false, message: 'Review not found.' });
        res.json({ success: true, data: review, message: 'Review rejected.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// DELETE /api/admin/reviews/:id
router.delete('/reviews/:id', async (req, res) => {
    try {
        const Review = require('../models/Review');
        const review = await Review.findByIdAndDelete(req.params.id);
        if (!review) return res.status(404).json({ success: false, message: 'Review not found.' });
        res.json({ success: true, message: 'Review permanently deleted.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

/* ─────────────────────────────────────────────────────────── */
/*  CONTACT MESSAGES                                           */
/* ─────────────────────────────────────────────────────────── */

// GET /api/admin/contact
router.get('/contact', async (req, res) => {
    try {
        const Contact = require('../models/Contact');
        const { replied, page = 1, limit = 20 } = req.query;
        const query = {};
        if (replied !== undefined) query.replied = replied === 'true';

        const total = await Contact.countDocuments(query);
        const messages = await Contact
            .find(query)
            .sort('-createdAt')
            .skip((Number(page) - 1) * Number(limit))
            .limit(Number(limit));

        res.json({ success: true, total, data: messages });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT /api/admin/contact/:id/replied
router.put('/contact/:id/replied', async (req, res) => {
    try {
        const Contact = require('../models/Contact');
        const msg = await Contact.findByIdAndUpdate(
            req.params.id,
            { replied: true, repliedAt: new Date() },
            { new: true }
        );
        if (!msg) return res.status(404).json({ success: false, message: 'Message not found.' });
        res.json({ success: true, data: msg, message: 'Marked as replied.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
