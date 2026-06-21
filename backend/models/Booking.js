/* ============================================================
   WANDERLUST — Booking Model v2.1
   Enhanced: bookingType, approvedBy, adminNotes, better indexes
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
        default: null,
    },
    hotel: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Hotel',
        default: null,
    },
    bookingType: {
        type: String,
        enum: ['package', 'hotel'],
        default: 'package',
    },
    bookingRef: {
        type: String,
        unique: true,
        sparse: true,  // allows multiple null values without duplicate key errors
    },
    travelDate: {
        type: Date,
        required: [true, 'Travel date is required'],
    },
    returnDate: {
        type: Date,
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
        enum: ['pending', 'confirmed', 'cancelled', 'completed', 'rejected'],
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

    // Admin fields
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
    },
    approvedAt: Date,
    adminNotes: {
        type: String,
        maxlength: 500,
    },
}, {
    timestamps: true,
});

/* ── Generate booking reference before save ──────────────── */
bookingSchema.pre('save', function (next) {
    if (!this.bookingRef) {
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const randPart = Math.random().toString(36).substring(2, 7).toUpperCase();
        this.bookingRef = `WL-${dateStr}-${randPart}`;
    }
    next();
});

// Indexes
bookingSchema.index({ user: 1, status: 1 });
bookingSchema.index({ status: 1, createdAt: -1 });
bookingSchema.index({ package: 1, status: 1 });
bookingSchema.index({ hotel: 1, status: 1 });
bookingSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Booking', bookingSchema);

