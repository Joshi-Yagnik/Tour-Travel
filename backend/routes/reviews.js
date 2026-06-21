/* ============================================================
   WANDERLUST — Reviews Routes v2.0
   GET  /api/reviews/:type/:id  — Get reviews for a target
   POST /api/reviews            — Create review (authenticated)
   PUT  /api/reviews/:id/helpful — Vote helpful
   DELETE /api/reviews/:id      — Delete own review
   ============================================================ */

const express  = require('express');
const Review   = require('../models/Review');
const Booking  = require('../models/Booking');
const protect  = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');

const router = express.Router();

/* ── GET /api/reviews/:type/:id ──────────────────────────── */
router.get('/:type/:id', async (req, res) => {
    try {
        const { type, id } = req.params;
        const { sort = '-createdAt', page = 1, limit = 10, rating } = req.query;

        const validTypes = ['package', 'hotel', 'destination'];
        if (!validTypes.includes(type)) {
            return res.status(400).json({ success: false, message: 'Invalid review type.' });
        }

        const query = { targetType: type, targetId: id, isApproved: true };
        if (rating) query.rating = Number(rating);

        const total = await Review.countDocuments(query);
        const reviews = await Review
            .find(query)
            .populate('user', 'name avatar loyaltyTier')
            .sort(sort)
            .skip((Number(page) - 1) * Number(limit))
            .limit(Number(limit));

        // Calculate average and distribution
        const allReviews = await Review.find({ targetType: type, targetId: id, isApproved: true }).select('rating');
        const avgRating = allReviews.length > 0
            ? allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
            : 0;

        const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        allReviews.forEach(r => distribution[r.rating]++);

        res.json({
            success: true,
            total,
            page: Number(page),
            pages: Math.ceil(total / Number(limit)),
            averageRating: Math.round(avgRating * 10) / 10,
            distribution,
            data: reviews,
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

/* ── POST /api/reviews — Create Review ───────────────────── */
router.post('/', protect, async (req, res) => {
    try {
        const { targetType, targetId, rating, title, content, photos, travelType, travelMonth, ratings } = req.body;

        if (!targetType || !targetId || !rating || !content) {
            return res.status(400).json({ success: false, message: 'targetType, targetId, rating and content are required.' });
        }

        // Check for duplicate
        const existing = await Review.findOne({ user: req.user.id, targetType, targetId });
        if (existing) {
            return res.status(409).json({ success: false, message: 'You have already reviewed this. Edit your existing review instead.' });
        }

        // Check if user has a verified booking (for "Verified Stay" badge)
        let verified = false;
        if (targetType === 'package') {
            const booking = await Booking.findOne({
                user: req.user.id,
                package: targetId,
                status: 'completed',
            });
            verified = !!booking;
        }

        const review = await Review.create({
            user: req.user.id,
            targetType,
            targetId,
            rating,
            title,
            content,
            photos: photos || [],
            travelType,
            travelMonth,
            ratings,
            verified,
        });

        await review.populate('user', 'name avatar loyaltyTier');

        res.status(201).json({ success: true, data: review });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ success: false, message: 'You have already reviewed this.' });
        }
        res.status(400).json({ success: false, message: err.message });
    }
});

/* ── PUT /api/reviews/:id — Edit Own Review ─────────────── */
router.put('/:id', protect, async (req, res) => {
    try {
        const review = await Review.findOne({ _id: req.params.id, user: req.user.id });
        if (!review) return res.status(404).json({ success: false, message: 'Review not found.' });

        const { rating, title, content, photos } = req.body;
        if (rating) review.rating = rating;
        if (title !== undefined) review.title = title;
        if (content) review.content = content;
        if (photos) review.photos = photos;

        await review.save();
        res.json({ success: true, data: review });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

/* ── PUT /api/reviews/:id/helpful — Vote ─────────────────── */
router.put('/:id/helpful', protect, async (req, res) => {
    try {
        const review = await Review.findById(req.params.id);
        if (!review) return res.status(404).json({ success: false, message: 'Review not found.' });

        const alreadyVoted = review.helpfulVoters.includes(req.user.id);
        if (alreadyVoted) {
            review.helpfulVoters.pull(req.user.id);
            review.helpfulVotes = Math.max(0, review.helpfulVotes - 1);
        } else {
            review.helpfulVoters.push(req.user.id);
            review.helpfulVotes++;
        }
        await review.save();

        res.json({ success: true, helpfulVotes: review.helpfulVotes, voted: !alreadyVoted });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

/* ── DELETE /api/reviews/:id — Delete ───────────────────── */
router.delete('/:id', protect, async (req, res) => {
    try {
        const query = { _id: req.params.id };
        if (req.user.role !== 'admin') query.user = req.user.id;

        const review = await Review.findOneAndDelete(query);
        if (!review) return res.status(404).json({ success: false, message: 'Review not found.' });

        res.json({ success: true, message: 'Review deleted.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

/* ── GET /api/reviews — Admin: all reviews ───────────────── */
router.get('/', protect, adminOnly, async (req, res) => {
    try {
        const { reported, page = 1, limit = 20 } = req.query;
        const query = {};
        if (reported === 'true') query.isReported = true;

        const total = await Review.countDocuments(query);
        const reviews = await Review
            .find(query)
            .populate('user', 'name email')
            .sort('-createdAt')
            .skip((Number(page) - 1) * Number(limit))
            .limit(Number(limit));

        res.json({ success: true, total, data: reviews });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
