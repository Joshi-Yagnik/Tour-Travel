/* ============================================================
   WANDERLUST — Package Model
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
    priceIncludes: [String],
    priceExcludes: [String],
    highlights: [String],
    images: [String],   // Array of URLs
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
}, {
    timestamps: true,
});

packageSchema.index({ title: 'text', description: 'text' });

module.exports = mongoose.model('Package', packageSchema);
