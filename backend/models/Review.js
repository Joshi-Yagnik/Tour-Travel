/* ============================================================
   WANDERLUST — Review Model v2.1
   Enhanced: isApproved defaults to FALSE (admin moderation),
   approvedBy, approvedAt, rejectedReason
   ============================================================ */

const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },

    // Polymorphic reference
    targetType: {
        type: String,
        required: true,
        enum: ['package', 'hotel', 'destination', 'restaurant'],
    },
    targetId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: 'targetModel',
    },
    targetModel: {
        type: String,
        required: true,
        enum: ['Package', 'Hotel', 'Destination', 'Restaurant'],
    },

    // Review content
    rating: {
        type: Number,
        required: [true, 'Rating is required'],
        min: 1,
        max: 5,
    },
    title: {
        type: String,
        trim: true,
        maxlength: 120,
    },
    content: {
        type: String,
        required: [true, 'Review content is required'],
        minlength: [10, 'Review must be at least 10 characters'],
        maxlength: 2000,
    },

    // Detailed ratings (optional)
    ratings: {
        cleanliness: { type: Number, min: 1, max: 5 },
        value: { type: Number, min: 1, max: 5 },
        location: { type: Number, min: 1, max: 5 },
        service: { type: Number, min: 1, max: 5 },
        comfort: { type: Number, min: 1, max: 5 },
    },

    // Photos
    photos: [String],

    // Metadata
    travelType: {
        type: String,
        enum: ['solo', 'couple', 'family', 'business', 'friends', 'group'],
    },
    travelMonth: String,

    // Verification (only users who actually booked)
    verified: {
        type: Boolean,
        default: false,
    },
    bookingRef: String,

    // Helpfulness
    helpfulVotes: {
        type: Number,
        default: 0,
    },
    helpfulVoters: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],

    // Moderation — isApproved now defaults to false (requires admin approval)
    isApproved: {
        type: Boolean,
        default: false, // Changed from true → admin must approve
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
    },
    approvedAt: Date,
    isReported: {
        type: Boolean,
        default: false,
    },
    reportReason: String,
    rejectedReason: String,

    // Admin response / Owner response
    ownerResponse: {
        content: String,
        respondedAt: Date,
    },
}, {
    timestamps: true,
});

/* ── Prevent duplicate reviews ───────────────────────────── */
reviewSchema.index({ user: 1, targetType: 1, targetId: 1 }, { unique: true });
reviewSchema.index({ targetType: 1, targetId: 1, isApproved: 1 });
reviewSchema.index({ isApproved: 1, isReported: 1, createdAt: -1 });
reviewSchema.index({ user: 1, createdAt: -1 });

/* ── Auto-map targetType to model name ───────────────────── */
reviewSchema.pre('validate', function (next) {
    const map = {
        package: 'Package',
        hotel: 'Hotel',
        destination: 'Destination',
        restaurant: 'Restaurant',
    };
    this.targetModel = map[this.targetType];
    next();
});

module.exports = mongoose.model('Review', reviewSchema);
