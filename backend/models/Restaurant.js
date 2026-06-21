/* ============================================================
   WANDERLUST — Restaurant Model v1.0
   Supports: Restaurants, Dhabas, Cafes, Street Food, Fine Dining
   ============================================================ */

const mongoose = require('mongoose');

const openingHoursSchema = new mongoose.Schema({
    day: {
        type: String,
        enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        required: true,
    },
    open: String,  // e.g. "09:00"
    close: String, // e.g. "22:00"
    closed: { type: Boolean, default: false },
}, { _id: false });

const restaurantSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Restaurant name is required'],
        trim: true,
        maxlength: 120,
    },
    slug: {
        type: String,
        unique: true,
        lowercase: true,
        sparse: true,
    },
    type: {
        type: String,
        required: true,
        enum: [
            'restaurant',
            'dhaba',
            'cafe',
            'street_food',
            'fine_dining',
            'fast_food',
            'bakery',
            'bar_lounge',
            'rooftop',
            'food_court',
        ],
        default: 'restaurant',
    },
    cuisine: {
        type: [String],
        default: [],
        // e.g. ['North Indian', 'Gujarati', 'Chinese', 'Continental']
    },
    description: {
        type: String,
        maxlength: 2000,
    },
    shortDescription: {
        type: String,
        maxlength: 300,
    },

    // Location
    location: {
        address: { type: String, required: true },
        city: { type: String, required: true, index: true },
        state: { type: String, required: true },
        country: { type: String, default: 'India' },
        pincode: String,
        coordinates: {
            lat: Number,
            lng: Number,
        },
        googleMapsUrl: String,
        landmark: String,
    },

    // Contact
    contact: {
        phone: String,
        whatsapp: String,
        email: String,
        website: String,
        instagram: String,
    },

    // Media
    coverImage: {
        type: String,
        default: '',
    },
    images: [String],

    // Menu highlights
    mustTry: [String], // signature dishes

    // Ratings
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

    // Pricing
    priceRange: {
        type: String,
        enum: ['budget', 'moderate', 'expensive', 'luxury'],
        default: 'moderate',
    },
    avgCostForTwo: {
        type: Number, // in INR
        default: 0,
    },

    // Diet
    isVeg: {
        type: Boolean,
        default: false,
    },
    hasVegOptions: {
        type: Boolean,
        default: true,
    },
    isHalal: {
        type: Boolean,
        default: false,
    },

    // Features
    amenities: [String], // e.g. ['WiFi', 'Parking', 'Live Music', 'Outdoor Seating']
    openingHours: [openingHoursSchema],

    // Tags
    tags: [String],

    // Status
    featured: {
        type: Boolean,
        default: false,
    },
    verified: {
        type: Boolean,
        default: false,
    },
    approvalStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending',
    },
    approvalNote: String,
    isActive: {
        type: Boolean,
        default: true,
    },

    // Owner
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
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
restaurantSchema.pre('save', function (next) {
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
restaurantSchema.index({ 'location.city': 1, type: 1 });
restaurantSchema.index({ type: 1, rating: -1, featured: -1 });
restaurantSchema.index({ name: 'text', 'location.city': 'text', description: 'text', cuisine: 'text' });
restaurantSchema.index({ verified: 1, isActive: 1 });
restaurantSchema.index({ approvalStatus: 1, isActive: 1 });
restaurantSchema.index({ isVeg: 1, 'location.city': 1 });

module.exports = mongoose.model('Restaurant', restaurantSchema);
