/* ============================================================
   WANDERLUST — Booking Model v3.0
   Enhanced: full pricing sub-document (GST, SGST, Platform Fee)
   ============================================================ */

const mongoose = require('mongoose');

/* ── Pricing sub-schema ──────────────────────────────────── */
const pricingSchema = new mongoose.Schema({
    basePrice:      { type: Number, default: 0 },   // unit price (per night or per person)
    nights:         { type: Number, default: 1 },   // hotel: number of nights
    rooms:          { type: Number, default: 1 },   // hotel: number of rooms
    guests:         { type: Number, default: 1 },   // travelers / guests
    subtotal:       { type: Number, default: 0 },   // basePrice × nights × rooms (or × guests)
    platformFee:    { type: Number, default: 1999 }, // flat ₹1,999
    gst:            { type: Number, default: 0 },   // 9% of subtotal
    sgst:           { type: Number, default: 0 },   // 9% of subtotal
    cgst:           { type: Number, default: 0 },   // 0 (future inter-state)
    convenienceFee: { type: Number, default: 0 },   // 0 (future)
    grandTotal:     { type: Number, default: 0 },   // final payable amount
    currency:       { type: String, default: 'INR' },
}, { _id: false });

/* ── Main Booking schema ─────────────────────────────────── */
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
        sparse: true,
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
    rooms: {
        type: Number,
        default: 1,
        min: 1,
    },

    /* ── Full pricing breakdown ── */
    pricing: {
        type: pricingSchema,
        default: () => ({}),
    },

    /* ── Partial Payment details ── */
    advancePercentage: {
        type: Number,
        default: 40,
    },
    advanceAmount: {
        type: Number,
        default: 0,
    },
    remainingAmount: {
        type: Number,
        default: 0,
    },
    amountPaid: {
        type: Number,
        default: 0,
    },

    /* ── Grand total (kept for backwards compat + easy querying) ── */
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
        enum: ['unpaid', 'partial', 'Partially Paid', 'paid', 'refunded'],
        default: 'unpaid',
    },
    paymentMethod: {
        type: String,
        enum: ['cod', 'upi', 'card', 'netbanking', 'razorpay', 'stripe', 'other'],
        default: 'cod',
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
