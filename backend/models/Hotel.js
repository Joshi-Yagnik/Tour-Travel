/* ============================================================
   WANDERLUST — Hotel / Accommodation Model v2.0
   Supports: Hotels, Resorts, Dharamshalas, Homestays,
             Guesthouses, Lodges, Temple Stays
   ============================================================ */

const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        enum: ['Single', 'Double', 'Triple', 'Suite', 'Dormitory', 'Deluxe', 'Premium'],
    },
    description: String,
    pricePerNight: {
        type: Number,
        required: true,
        min: 0,
    },
    maxOccupancy: {
        type: Number,
        required: true,
        min: 1,
    },
    totalRooms: {
        type: Number,
        default: 1,
    },
    amenities: [String],
    images: [String],
    available: {
        type: Boolean,
        default: true,
    },
}, { _id: true });

const hotelSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Hotel name is required'],
        trim: true,
        maxlength: 120,
    },
    slug: {
        type: String,
        unique: true,
        lowercase: true,
    },
    type: {
        type: String,
        required: true,
        enum: [
            'hotel',
            'resort',
            'dharamshala',
            'homestay',
            'guesthouse',
            'lodge',
            'temple_stay',
            'hostel',
            'villa',
            'farmstay',
        ],
        default: 'hotel',
    },
    starRating: {
        type: Number,
        min: 1,
        max: 5,
        default: 3,
    },
    description: {
        type: String,
        maxlength: 3000,
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
        country: { type: String, required: true, default: 'India' },
        pincode: String,
        coordinates: {
            lat: { type: Number },
            lng: { type: Number },
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
    },

    // Media
    coverImage: {
        type: String,
        default: '',
    },
    images: [String],

    // Rooms
    rooms: [roomSchema],

    // Amenities
    amenities: {
        type: [String],
        default: [],
    },

    // Policies
    policies: {
        checkInTime: { type: String, default: '12:00 PM' },
        checkOutTime: { type: String, default: '11:00 AM' },
        cancellation: {
            type: String,
            enum: ['free', 'moderate', 'strict', 'non_refundable'],
            default: 'moderate',
        },
        smokingAllowed: { type: Boolean, default: false },
        petsAllowed: { type: Boolean, default: false },
        couplesAllowed: { type: Boolean, default: true },
        childrenAllowed: { type: Boolean, default: true },
        ageRestriction: { type: Number, default: 0 },
        mealPlan: {
            type: String,
            enum: ['EP', 'CP', 'MAP', 'AP', 'none'],
            default: 'none',
        },
    },

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

    // Pricing summary (for quick display)
    priceFrom: {
        type: Number,
        default: 0,
    },
    // Explicit starting price (set by owner/admin directly)
    startingPrice: {
        type: Number,
        default: 0,
    },

    // Nearby attractions
    nearbyAttractions: [String],

    // Special tags
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
    approvalNote: {
        type: String,
        maxlength: 500,
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
    },
    isActive: {
        type: Boolean,
        default: true,
    },

    // Owner
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },

    // Distance from popular places (for search)
    distanceFrom: {
        type: Map,
        of: Number, // e.g., { "Somnath Temple": 2.5 } in km
    },
}, {
    timestamps: true,
});

/* ── Auto-generate slug ──────────────────────────────────── */
hotelSchema.pre('save', function (next) {
    if (!this.slug) {
        this.slug = this.name
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .substring(0, 80)
            + '-' + Date.now().toString(36);
    }
    // Calculate priceFrom from rooms, but never overwrite with 0
    if (this.rooms && this.rooms.length > 0) {
        const minRoomPrice = Math.min(...this.rooms.map(r => r.pricePerNight || 0).filter(p => p > 0));
        if (minRoomPrice > 0) {
            this.priceFrom = minRoomPrice;
            // Only set startingPrice if not explicitly set to a valid value
            if (!this.startingPrice || this.startingPrice === 0) {
                this.startingPrice = minRoomPrice;
            }
        }
    }
    // Keep priceFrom and startingPrice in sync — use whichever is set
    if (this.startingPrice > 0 && this.priceFrom === 0) this.priceFrom = this.startingPrice;
    if (this.priceFrom > 0 && this.startingPrice === 0) this.startingPrice = this.priceFrom;
    next();
});

/* ── Sync priceFrom on findByIdAndUpdate ─────────────────── */
hotelSchema.pre('findOneAndUpdate', function (next) {
    const update = this.getUpdate();
    // If startingPrice is being set to a valid value, also update priceFrom
    if (update.startingPrice > 0) update.priceFrom = update.startingPrice;
    if (update.priceFrom > 0 && !update.startingPrice) update.startingPrice = update.priceFrom;
    // Never allow price to be saved as 0 if it was a valid update attempt
    // (0 coming from an empty field means 'not changed', not 'set to 0')
    if (update.startingPrice === 0) delete update.startingPrice;
    if (update.priceFrom === 0) delete update.priceFrom;
    next();
});

// Indexes
hotelSchema.index({ 'location.city': 1, type: 1 });
hotelSchema.index({ 'location.coordinates.lat': 1, 'location.coordinates.lng': 1 });
hotelSchema.index({ type: 1, rating: -1, featured: -1 });
hotelSchema.index({ name: 'text', 'location.city': 'text', description: 'text', tags: 'text' });
hotelSchema.index({ verified: 1, isActive: 1 });

module.exports = mongoose.model('Hotel', hotelSchema);
