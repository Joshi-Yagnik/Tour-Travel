/* ============================================================
   WANDERLUST — Package Model v2.1
   Enhanced: isActive, status, createdBy, better indexes
   ============================================================ */

const mongoose = require('mongoose');

const itineraryDaySchema = new mongoose.Schema({
    day: { type: Number, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    activities: [String],
}, { _id: false });

const packageSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Package title is required'],
        trim: true,
        maxlength: 150,
    },
    slug: {
        type: String,
        unique: true,
        lowercase: true,
        sparse: true,
    },
    destination: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Destination',
        required: true,
    },
    description: {
        type: String,
        maxlength: 2000,
    },
    shortDescription: {
        type: String,
        maxlength: 300,
    },
    duration: {
        days: { type: Number, required: true },
        nights: { type: Number, required: true },
    },
    groupSize: {
        min: { type: Number, default: 1 },
        max: { type: Number, required: true },
    },
    difficulty: {
        type: String,
        enum: ['Easy', 'Moderate', 'Challenging', 'Expert'],
        default: 'Moderate',
    },
    price: {
        type: Number,
        required: [true, 'Price is required'],
        min: 0,
    },
    discountPrice: {
        type: Number,
        default: null,
    },
    priceIncludes: [String],
    priceExcludes: [String],
    highlights: [String],
    images: [String],
    coverImage: String,
    itinerary: [itineraryDaySchema],
    guide: {
        name: String,
        bio: String,
        avatar: String,
        rating: Number,
    },
    rating: {
        type: Number,
        min: 0,
        max: 5,
        default: 0,
    },
    reviewCount: {
        type: Number,
        default: 0,
    },
    featured: {
        type: Boolean,
        default: false,
    },
    badge: {
        type: String, // e.g. "Bestseller", "New", "Luxury"
    },
    availableFrom: Date,
    availableTo: Date,

    // Status & lifecycle
    status: {
        type: String,
        enum: ['draft', 'active', 'archived'],
        default: 'active',
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
    },
    tags: [String],
}, {
    timestamps: true,
});

/* ── Auto-generate slug ──────────────────────────────────── */
packageSchema.pre('save', function (next) {
    if (!this.slug) {
        this.slug = this.title
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .substring(0, 80)
            + '-' + Date.now().toString(36);
    }
    next();
});

// Indexes
packageSchema.index({ title: 'text', description: 'text' });
packageSchema.index({ isActive: 1, featured: -1, rating: -1 });
packageSchema.index({ destination: 1, isActive: 1 });
packageSchema.index({ status: 1, isActive: 1 });
packageSchema.index({ price: 1 });

module.exports = mongoose.model('Package', packageSchema);
