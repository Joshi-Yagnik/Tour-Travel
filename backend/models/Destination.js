/* ============================================================
   WANDERLUST — Destination Model
   ============================================================ */

const mongoose = require('mongoose');

const destinationSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Destination name is required'],
        trim: true,
    },
    country: {
        type: String,
        required: true,
    },
    region: {
        type: String,
        enum: ['Asia', 'Europe', 'Americas', 'Africa', 'Oceania', 'Middle East'],
        required: true,
    },
    image: {
        type: String, // URL
        required: true,
    },
    description: {
        type: String,
        maxlength: 1000,
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
        type: String, // e.g. "Apr – Jun"
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
    },
    featured: {
        type: Boolean,
        default: false,
    },
    tags: [String],
}, {
    timestamps: true,
});

// Index for text search
destinationSchema.index({ name: 'text', country: 'text', region: 'text' });

module.exports = mongoose.model('Destination', destinationSchema);
