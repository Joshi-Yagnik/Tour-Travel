/* ============================================================
   WANDERLUST — Owner Routes v2.0
   Full property management hub for hotel partners
   ============================================================ */

const express = require('express');
const Hotel   = require('../models/Hotel');
const Restaurant = require('../models/Restaurant');
const Booking = require('../models/Booking');
const Review  = require('../models/Review');
const protect = require('../middleware/auth');

const router = express.Router();

/* ── Auth guard: hotel_owner or admin ─────────────────────── */
const ownerOnly = (req, res, next) => {
    if (!['hotel_owner', 'admin'].includes(req.user.role)) {
        return res.status(403).json({ success: false, message: 'Access denied. Hotel owner role required.' });
    }
    next();
};

/* Helper: verify property belongs to requesting owner */
async function assertOwnership(propertyId, userId, role) {
    let property = await Hotel.findById(propertyId);
    let isHotel = true;
    if (!property) {
        property = await Restaurant.findById(propertyId);
        isHotel = false;
    }
    if (!property) throw Object.assign(new Error('Property not found.'), { status: 404 });
    if (property.owner.toString() !== userId && role !== 'admin') {
        throw Object.assign(new Error('Not authorized to manage this property.'), { status: 403 });
    }
    return { property, isHotel };
}

/* ══════════════════════════════════════════════════════════
   DASHBOARD STATS
══════════════════════════════════════════════════════════ */
router.get('/stats', protect, ownerOnly, async (req, res) => {
    try {
        const hotels      = await Hotel.find({ owner: req.user.id });
        const restaurants = await Restaurant.find({ owner: req.user.id });
        const hotelIds    = hotels.map(h => h._id);

        const bookings = await Booking.find({ hotel: { $in: hotelIds }, bookingType: 'hotel' });

        const activeProperties = hotels.filter(h => h.isActive).length + restaurants.filter(r => r.isActive).length;
        const totalProperties  = hotels.length + restaurants.length;

        const totalBookings    = bookings.length;
        const pendingBookings  = bookings.filter(b => b.status === 'pending').length;
        const confirmedBookings = bookings.filter(b => b.status === 'confirmed').length;
        const completedBookings = bookings.filter(b => b.status === 'completed').length;

        const revenue = bookings
            .filter(b => ['confirmed', 'completed'].includes(b.status) || b.paymentStatus === 'paid')
            .reduce((acc, curr) => acc + (curr.totalPrice || 0), 0);

        // Monthly revenue for last 6 months
        const now = new Date();
        const monthlyRevenue = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const label = d.toLocaleString('en-IN', { month: 'short', year: '2-digit' });
            const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
            const monthEnd   = new Date(d.getFullYear(), d.getMonth() + 1, 0);
            const amt = bookings
                .filter(b => ['confirmed', 'completed'].includes(b.status) &&
                    new Date(b.createdAt) >= monthStart && new Date(b.createdAt) <= monthEnd)
                .reduce((acc, b) => acc + (b.totalPrice || 0), 0);
            monthlyRevenue.push({ label, amount: amt });
        }

        const recentBookings = await Booking
            .find({ hotel: { $in: hotelIds }, bookingType: 'hotel' })
            .populate('user', 'name email')
            .populate('hotel', 'name type')
            .sort('-createdAt')
            .limit(8);

        res.json({
            success: true,
            data: {
                counts: {
                    activeProperties,
                    totalBookings,
                    pendingBookings,
                    confirmedBookings,
                    completedBookings,
                    totalHotels: totalProperties,
                },
                totalRevenue: revenue,
                monthlyRevenue,
                recentBookings,
            },
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

/* ══════════════════════════════════════════════════════════
   HOTELS (PROPERTIES)
══════════════════════════════════════════════════════════ */

/* GET /api/owner/hotels — all owned properties (hotels + restaurants) */
router.get('/hotels', protect, ownerOnly, async (req, res) => {
    try {
        const hotels = await Hotel.find({ owner: req.user.id }).lean();
        const restaurants = await Restaurant.find({ owner: req.user.id }).lean();
        const properties = [...hotels, ...restaurants].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        res.json({ success: true, data: properties });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

/* GET /api/owner/hotels/:id — single hotel full detail */
router.get('/hotels/:id', protect, ownerOnly, async (req, res) => {
    try {
        const { property } = await assertOwnership(req.params.id, req.user.id, req.user.role);
        res.json({ success: true, data: property });
    } catch (err) {
        res.status(err.status || 500).json({ success: false, message: err.message });
    }
});

/* POST /api/owner/hotels — create property (hotel or restaurant) */
router.post('/hotels', protect, ownerOnly, async (req, res) => {
    try {
        const isRestaurant = ['restaurant', 'dhaba', 'cafe', 'street_food', 'fine_dining', 'fast_food', 'bakery', 'bar_lounge', 'rooftop', 'food_court'].includes(req.body.type);
        const Model = isRestaurant ? Restaurant : Hotel;
        
        const payload = { ...req.body, owner: req.user.id, verified: false, approvalStatus: 'pending' };
        if (isRestaurant && req.body.startingPrice) {
            payload.avgCostForTwo = req.body.startingPrice; // Map price for restaurants
        }
        
        const property = await Model.create(payload);
        res.status(201).json({ success: true, data: property });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

/* PUT /api/owner/hotels/:id — update property info */
router.put('/hotels/:id', protect, ownerOnly, async (req, res) => {
    try {
        const { property, isHotel } = await assertOwnership(req.params.id, req.user.id, req.user.role);
        const Model = isHotel ? Hotel : Restaurant;
        
        const payload = { ...req.body };
        if (!isHotel && payload.startingPrice) {
            payload.avgCostForTwo = payload.startingPrice; // Map price
        }
        
        const updated = await Model.findByIdAndUpdate(
            req.params.id,
            payload,
            { new: true, runValidators: true }
        );
        res.json({ success: true, data: updated });
    } catch (err) {
        res.status(err.status || 400).json({ success: false, message: err.message });
    }
});

/* PUT /api/owner/hotels/:id/rooms — update room inventory */
router.put('/hotels/:id/rooms', protect, ownerOnly, async (req, res) => {
    try {
        const { property, isHotel } = await assertOwnership(req.params.id, req.user.id, req.user.role);
        if (!isHotel) return res.status(400).json({ success: false, message: 'Restaurants do not have rooms.' });
        property.rooms = req.body.rooms || [];
        await property.save();
        res.json({ success: true, data: property });
    } catch (err) {
        res.status(err.status || 400).json({ success: false, message: err.message });
    }
});

/* PUT /api/owner/hotels/:id/policies — update hotel policies */
router.put('/hotels/:id/policies', protect, ownerOnly, async (req, res) => {
    try {
        const hotel = await assertOwnership(req.params.id, req.user.id, req.user.role);
        hotel.policies = { ...hotel.policies.toObject(), ...req.body };
        await hotel.save();
        res.json({ success: true, data: hotel.policies });
    } catch (err) {
        res.status(err.status || 400).json({ success: false, message: err.message });
    }
});

/* PUT /api/owner/hotels/:id/amenities — update amenities list */
router.put('/hotels/:id/amenities', protect, ownerOnly, async (req, res) => {
    try {
        const hotel = await assertOwnership(req.params.id, req.user.id, req.user.role);
        hotel.amenities = req.body.amenities || [];
        await hotel.save();
        res.json({ success: true, data: hotel.amenities });
    } catch (err) {
        res.status(err.status || 400).json({ success: false, message: err.message });
    }
});

/* PUT /api/owner/hotels/:id/images — update gallery images */
router.put('/hotels/:id/images', protect, ownerOnly, async (req, res) => {
    try {
        const hotel = await assertOwnership(req.params.id, req.user.id, req.user.role);
        if (req.body.coverImage !== undefined) hotel.coverImage = req.body.coverImage;
        if (req.body.images !== undefined) hotel.images = req.body.images;
        await hotel.save();
        res.json({ success: true, data: { coverImage: hotel.coverImage, images: hotel.images } });
    } catch (err) {
        res.status(err.status || 400).json({ success: false, message: err.message });
    }
});

/* DELETE /api/owner/hotels/:id — soft delete (deactivate) */
router.delete('/hotels/:id', protect, ownerOnly, async (req, res) => {
    try {
        const hotel = await assertOwnership(req.params.id, req.user.id, req.user.role);
        hotel.isActive = false;
        await hotel.save();
        res.json({ success: true, message: 'Property deactivated successfully.' });
    } catch (err) {
        res.status(err.status || 500).json({ success: false, message: err.message });
    }
});

/* ══════════════════════════════════════════════════════════
   BOOKINGS
══════════════════════════════════════════════════════════ */

/* GET /api/owner/bookings — all bookings for owned hotels */
router.get('/bookings', protect, ownerOnly, async (req, res) => {
    try {
        const { status, hotelId, page = 1, limit = 50 } = req.query;
        const hotels   = await Hotel.find({ owner: req.user.id }, '_id');
        const hotelIds = hotels.map(h => h._id);

        const query = { hotel: { $in: hotelIds }, bookingType: 'hotel' };
        if (status) query.status = status;
        if (hotelId) query.hotel = hotelId;

        const total = await Booking.countDocuments(query);
        const bookings = await Booking
            .find(query)
            .populate('user', 'name email phone')
            .populate('hotel', 'name type location')
            .sort('-createdAt')
            .skip((Number(page) - 1) * Number(limit))
            .limit(Number(limit));

        res.json({ success: true, total, data: bookings });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

/* PUT /api/owner/bookings/:id/status — update booking status */
router.put('/bookings/:id/status', protect, ownerOnly, async (req, res) => {
    try {
        const { status, adminNotes } = req.body;
        const booking = await Booking.findById(req.params.id);
        if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });

        const hotel = await Hotel.findById(booking.hotel);
        if (!hotel || (hotel.owner.toString() !== req.user.id && req.user.role !== 'admin')) {
            return res.status(403).json({ success: false, message: 'Not authorized.' });
        }

        booking.status = status;
        if (adminNotes) booking.adminNotes = adminNotes;
        if (status === 'confirmed') { booking.approvedBy = req.user.id; booking.approvedAt = new Date(); }
        await booking.save();

        res.json({ success: true, data: booking });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

/* ══════════════════════════════════════════════════════════
   REVIEWS
══════════════════════════════════════════════════════════ */

/* GET /api/owner/reviews — all reviews for owned hotels */
router.get('/reviews', protect, ownerOnly, async (req, res) => {
    try {
        const { hotelId } = req.query;
        const hotels   = await Hotel.find({ owner: req.user.id }, '_id name');
        const hotelIds = hotels.map(h => h._id);

        const query = {
            targetType: 'hotel',
            targetId: hotelId ? hotelId : { $in: hotelIds },
        };

        const reviews = await Review
            .find(query)
            .populate('user', 'name email avatar')
            .sort('-createdAt');

        // Attach hotel name to each review
        const hotelMap = {};
        hotels.forEach(h => { hotelMap[h._id.toString()] = h.name; });

        const enriched = reviews.map(r => ({
            ...r.toObject(),
            hotelName: hotelMap[r.targetId.toString()] || 'Unknown',
        }));

        // Rating distribution
        const total = enriched.length;
        const sum   = enriched.reduce((s, r) => s + r.rating, 0);
        const avgRating = total ? (sum / total).toFixed(1) : 0;
        const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        enriched.forEach(r => { if (distribution[r.rating] !== undefined) distribution[r.rating]++; });

        res.json({
            success: true,
            total,
            averageRating: Number(avgRating),
            distribution,
            data: enriched,
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

/* POST /api/owner/reviews/:id/respond — add owner response */
router.post('/reviews/:id/respond', protect, ownerOnly, async (req, res) => {
    try {
        const { content } = req.body;
        if (!content) return res.status(400).json({ success: false, message: 'Response content is required.' });

        const review = await Review.findById(req.params.id);
        if (!review) return res.status(404).json({ success: false, message: 'Review not found.' });

        // Ensure this review is for one of the owner's hotels
        const hotel = await Hotel.findOne({ _id: review.targetId, owner: req.user.id });
        if (!hotel && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized.' });
        }

        review.ownerResponse = { content, respondedAt: new Date() };
        await review.save();

        res.json({ success: true, data: review });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

/* ══════════════════════════════════════════════════════════
   ANALYTICS
══════════════════════════════════════════════════════════ */

/* GET /api/owner/analytics — detailed analytics for a hotel or all hotels */
router.get('/analytics', protect, ownerOnly, async (req, res) => {
    try {
        const { hotelId } = req.query;
        const hotels = await Hotel.find({ owner: req.user.id }, '_id name type');
        const hotelIds = hotelId ? [hotelId] : hotels.map(h => h._id);

        const bookings = await Booking.find({
            hotel: { $in: hotelIds },
            bookingType: 'hotel',
        });

        // Booking status breakdown
        const statusCounts = { pending: 0, confirmed: 0, completed: 0, rejected: 0, cancelled: 0 };
        bookings.forEach(b => { if (statusCounts[b.status] !== undefined) statusCounts[b.status]++; });

        // Revenue over last 12 months
        const now = new Date();
        const monthlyData = [];
        for (let i = 11; i >= 0; i--) {
            const d          = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const label      = d.toLocaleString('en-IN', { month: 'short', year: '2-digit' });
            const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
            const monthEnd   = new Date(d.getFullYear(), d.getMonth() + 1, 0);

            const monthBookings = bookings.filter(b =>
                new Date(b.createdAt) >= monthStart && new Date(b.createdAt) <= monthEnd
            );
            const revenue = monthBookings
                .filter(b => ['confirmed', 'completed'].includes(b.status))
                .reduce((acc, b) => acc + (b.totalPrice || 0), 0);

            monthlyData.push({
                label,
                bookings: monthBookings.length,
                revenue,
            });
        }

        // Per-property performance
        const propertyPerformance = await Promise.all(
            hotels.map(async h => {
                const hBookings = bookings.filter(b => b.hotel.toString() === h._id.toString());
                const hRevenue  = hBookings
                    .filter(b => ['confirmed', 'completed'].includes(b.status))
                    .reduce((acc, b) => acc + (b.totalPrice || 0), 0);

                const reviewData = await Review.find({ targetType: 'hotel', targetId: h._id, isApproved: true }).select('rating');
                const avgRating  = reviewData.length
                    ? (reviewData.reduce((s, r) => s + r.rating, 0) / reviewData.length).toFixed(1)
                    : 0;

                return {
                    id:          h._id,
                    name:        h.name,
                    type:        h.type,
                    bookings:    hBookings.length,
                    revenue:     hRevenue,
                    avgRating:   Number(avgRating),
                    reviews:     reviewData.length,
                    pending:     hBookings.filter(b => b.status === 'pending').length,
                };
            })
        );

        const totalRevenue = bookings
            .filter(b => ['confirmed', 'completed'].includes(b.status))
            .reduce((acc, b) => acc + (b.totalPrice || 0), 0);

        res.json({
            success: true,
            data: {
                totalRevenue,
                totalBookings: bookings.length,
                statusCounts,
                monthlyData,
                propertyPerformance,
            },
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

/* ══════════════════════════════════════════════════════════
   GUESTS
══════════════════════════════════════════════════════════ */

/* GET /api/owner/guests — unique guests who have booked owner's hotels */
router.get('/guests', protect, ownerOnly, async (req, res) => {
    try {
        const hotels   = await Hotel.find({ owner: req.user.id }, '_id');
        const hotelIds = hotels.map(h => h._id);

        const bookings = await Booking
            .find({ hotel: { $in: hotelIds }, bookingType: 'hotel' })
            .populate('user', 'name email createdAt')
            .populate('hotel', 'name')
            .sort('-createdAt');

        // Deduplicate guests and aggregate their booking count/spend
        const guestMap = {};
        bookings.forEach(b => {
            if (!b.user) return;
            const uid = b.user._id.toString();
            if (!guestMap[uid]) {
                guestMap[uid] = {
                    _id:          b.user._id,
                    name:         b.user.name,
                    email:        b.user.email,
                    joinedAt:     b.user.createdAt,
                    bookings:     0,
                    totalSpent:   0,
                    lastBooking:  null,
                    lastProperty: null,
                };
            }
            guestMap[uid].bookings++;
            guestMap[uid].totalSpent += (b.totalPrice || 0);
            if (!guestMap[uid].lastBooking || new Date(b.createdAt) > new Date(guestMap[uid].lastBooking)) {
                guestMap[uid].lastBooking  = b.createdAt;
                guestMap[uid].lastProperty = b.hotel?.name || '—';
            }
        });

        const guests = Object.values(guestMap).sort((a, b) => b.totalSpent - a.totalSpent);
        res.json({ success: true, total: guests.length, data: guests });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

/* ══════════════════════════════════════════════════════════
   PROFILE MANAGEMENT (Hotel Owner Portal)
   Keeps hotel owners inside the Partner Hub experience.
══════════════════════════════════════════════════════════ */

const User = require('../models/User');
const bcrypt = require('bcryptjs');

/* GET /api/owner/me — fetch full owner profile */
router.get('/me', protect, ownerOnly, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-passwordHash -resetPasswordToken -resetPasswordExpires -verifyToken');
        if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
        res.json({ success: true, data: user });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

/* PUT /api/owner/profile — update profile info */
router.put('/profile', protect, ownerOnly, async (req, res) => {
    try {
        // Fields that hotel owners are allowed to update
        const allowed = [
            'name', 'phone', 'avatar', 'bio', 'nationality',
            'currency', 'language',
            'notifications',
        ];

        const updates = {};
        allowed.forEach(field => {
            if (req.body[field] !== undefined) updates[field] = req.body[field];
        });

        // Email changes require separate verification flow
        if (req.body.email && req.body.email !== req.user.email) {
            return res.status(400).json({
                success: false,
                message: 'Email cannot be changed here. Please contact support.'
            });
        }

        const user = await User.findByIdAndUpdate(
            req.user.id,
            { $set: updates },
            { new: true, runValidators: true }
        ).select('-passwordHash -resetPasswordToken -verifyToken');

        // Update local session so JWT reflects new name
        res.json({
            success: true,
            message: 'Profile updated successfully.',
            data: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                avatar: user.avatar,
                bio: user.bio,
                nationality: user.nationality,
                currency: user.currency,
                language: user.language,
                notifications: user.notifications,
                role: user.role,
                isVerified: user.isVerified,
                loyaltyTier: user.loyaltyTier,
                loyaltyPoints: user.loyaltyPoints,
                createdAt: user.createdAt,
                lastLoginAt: user.lastLoginAt,
            },
        });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

/* PUT /api/owner/password — secure password change */
router.put('/password', protect, ownerOnly, async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;

        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({ success: false, message: 'All password fields are required.' });
        }
        if (newPassword.length < 8) {
            return res.status(400).json({ success: false, message: 'New password must be at least 8 characters.' });
        }
        if (newPassword !== confirmPassword) {
            return res.status(400).json({ success: false, message: 'Passwords do not match.' });
        }

        // Fetch user with passwordHash field
        const user = await User.findById(req.user.id).select('+passwordHash');
        if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

        // Verify current password using the model instance method
        const isMatch = await user.matchPassword(currentPassword);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
        }

        // Set new password — the pre-save hook will hash it
        user.passwordHash = newPassword;
        await user.save();

        res.json({ success: true, message: 'Password changed successfully.' });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

/* ══════════════════════════════════════════════════════════
   PACKAGES (linked to hotel owner's properties)
══════════════════════════════════════════════════════════ */
const Package = require('../models/Package');
const Destination = require('../models/Destination');

/* GET /api/owner/packages — all packages created by this owner */
router.get('/packages', protect, ownerOnly, async (req, res) => {
    try {
        const packages = await Package
            .find({ createdBy: req.user.id })
            .populate('destination', 'name country region')
            .sort('-createdAt');
        res.json({ success: true, total: packages.length, data: packages });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

/* GET /api/owner/packages/:id — single package */
router.get('/packages/:id', protect, ownerOnly, async (req, res) => {
    try {
        const pkg = await Package.findOne({ _id: req.params.id, createdBy: req.user.id })
            .populate('destination', 'name country region');
        if (!pkg) return res.status(404).json({ success: false, message: 'Package not found.' });
        res.json({ success: true, data: pkg });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

/* POST /api/owner/packages — create a new package */
router.post('/packages', protect, ownerOnly, async (req, res) => {
    try {
        const { title, price, description, shortDescription, destination, duration,
                groupSize, difficulty, coverImage, images, highlights, priceIncludes,
                priceExcludes, itinerary, tags, badge } = req.body;

        if (!title) return res.status(400).json({ success: false, message: 'Package title is required.' });
        if (!price || price <= 0) return res.status(400).json({ success: false, message: 'A valid price is required.' });

        // Validate destination
        let destId = destination;
        if (destId) {
            const destExists = await Destination.findById(destId);
            if (!destExists) return res.status(400).json({ success: false, message: 'Invalid destination.' });
        } else {
            // If no destination provided, try to find or create a generic one
            let genericDest = await Destination.findOne({ name: 'Other' });
            if (!genericDest) {
                genericDest = await Destination.create({
                    name: 'Other', country: 'India', region: 'India',
                    description: 'General destination', isActive: true,
                });
            }
            destId = genericDest._id;
        }

        const pkg = await Package.create({
            title, price: Number(price),
            description, shortDescription,
            destination: destId,
            duration: {
                days: Number(duration?.days || req.body.days || 1),
                nights: Number(duration?.nights || req.body.nights || 0),
            },
            groupSize: {
                min: Number(groupSize?.min || req.body.minGroup || 1),
                max: Number(groupSize?.max || req.body.maxGroup || 20),
            },
            difficulty: difficulty || 'Moderate',
            coverImage, images: images || [],
            highlights: highlights || [],
            priceIncludes: priceIncludes || [],
            priceExcludes: priceExcludes || [],
            itinerary: itinerary || [],
            tags: tags || [],
            badge,
            createdBy: req.user.id,
            status: 'active',
            isActive: true,
        });

        await pkg.populate('destination', 'name country region');
        res.status(201).json({ success: true, data: pkg });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

/* PUT /api/owner/packages/:id — update owned package */
router.put('/packages/:id', protect, ownerOnly, async (req, res) => {
    try {
        const pkg = await Package.findOne({ _id: req.params.id, createdBy: req.user.id });
        if (!pkg) return res.status(404).json({ success: false, message: 'Package not found or not authorized.' });

        const updates = { ...req.body };
        // Prevent price being zeroed
        if (updates.price !== undefined && Number(updates.price) <= 0) delete updates.price;
        if (updates.duration) {
            updates.duration = {
                days: Number(updates.duration.days || updates.days || pkg.duration.days),
                nights: Number(updates.duration.nights || updates.nights || pkg.duration.nights),
            };
        }

        const updated = await Package.findByIdAndUpdate(
            req.params.id, updates, { new: true, runValidators: true }
        ).populate('destination', 'name country region');

        res.json({ success: true, data: updated });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

/* DELETE /api/owner/packages/:id — soft delete */
router.delete('/packages/:id', protect, ownerOnly, async (req, res) => {
    try {
        const pkg = await Package.findOne({ _id: req.params.id, createdBy: req.user.id });
        if (!pkg) return res.status(404).json({ success: false, message: 'Package not found.' });
        pkg.isActive = false;
        pkg.status = 'archived';
        await pkg.save();
        res.json({ success: true, message: 'Package archived successfully.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

/* GET /api/owner/destinations — list all destinations for the package form dropdown */
router.get('/destinations', protect, ownerOnly, async (req, res) => {
    try {
        const Dest = require('../models/Destination');
        const dests = await Dest.find({ isActive: true }, 'name country region').sort('name');
        res.json({ success: true, data: dests });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;

