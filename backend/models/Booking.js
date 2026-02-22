/* ============================================================
   WANDERLUST — Booking Model
   ============================================================ */

const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    package: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Package',
        required: true,
    },
    bookingRef: {
        type: String,
        unique: true,
    },
    travelDate: {
        type: Date,
        required: [true, 'Travel date is required'],
    },
    travelers: {
        type: Number,
        required: true,
        min: 1,
        max: 50,
    },
    totalPrice: {
        type: Number,
        required: true,
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'cancelled', 'completed'],
        default: 'pending',
    },
    paymentStatus: {
        type: String,
        enum: ['unpaid', 'partial', 'paid', 'refunded'],
        default: 'unpaid',
    },
    specialRequests: String,
    cancelledAt: Date,
    cancelReason: String,
}, {
    timestamps: true,
});

/* ── Generate booking reference before save ──────────────── */
bookingSchema.pre('save', function (next) {
    if (!this.bookingRef) {
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const randPart = Math.random().toString(36).substring(2, 6).toUpperCase();
        this.bookingRef = `WL-${dateStr}-${randPart}`;
    }
    next();
});

// Indexes
bookingSchema.index({ user: 1, status: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
