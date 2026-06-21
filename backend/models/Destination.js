/* ============================================================
   WANDERLUST — Destination Model v2.1
   Enhanced: isActive, slug, state, better indexes
   ============================================================ */

const mongoose = require('mongoose');

const destinationSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Destination name is required'],
        trim: true,
        maxlength: 120,
    },
    slug: {
        type: String,
        unique: true,
        lowercase: true,
        sparse: true,
    },
    country: {
        type: String,
        required: true,
        default: 'India',
    },
    state: {
        type: String, // e.g. "Gujarat", "Rajasthan"
    },
    region: {
        type: String,
        enum: ['Asia', 'Europe', 'Americas', 'Africa', 'Oceania', 'Middle East', 'South Asia'],
        required: true,
    },
    image: {
        type: String, // URL
        required: true,
    },
    images: [String],
    description: {
        type: String,
        maxlength: 2000,
    },
    shortDescription: {
        type: String,
        maxlength: 300,
    },
    rating: {
        type: Number,
        min: 1,
        max: 5,
        default: 4.5,
    },
    reviewCount: {
        type: Number,
        default: 0,
    },
    bestSeason: {
        type: String,
    },
    language: {
        type: String,
    },
    currency: {
        type: String,
    },
    startingPrice: {
        type: Number,
        required: true,
        min: 0,
    },
    featured: {
        type: Boolean,
        default: false,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    tags: [String],
    attractions: [String], // Notable places
    travelTips: [String],
    coordinates: {
        lat: Number,
        lng: Number,
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
    },
}, {
    timestamps: true,
});

/* ── Auto-generate slug ──────────────────────────────────── */
destinationSchema.pre('save', function (next) {
    if (!this.slug) {
        this.slug = this.name
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .substring(0, 80)
            + '-' + Date.now().toString(36);
    }
    next();
});

// Indexes
destinationSchema.index({ name: 'text', country: 'text', region: 'text', state: 'text' });
destinationSchema.index({ name: 1, isActive: 1 });
destinationSchema.index({ featured: -1, isActive: 1 });
destinationSchema.index({ region: 1, isActive: 1 });
destinationSchema.index({ country: 1, state: 1 });

module.exports = mongoose.model('Destination', destinationSchema);
