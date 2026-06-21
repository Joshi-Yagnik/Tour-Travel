/* ============================================================
   WANDERLUST — Enhanced User Model v2.0
   ============================================================ */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        maxlength: [80, 'Name cannot exceed 80 characters'],
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    phone: {
        type: String,
        trim: true,
    },
    passwordHash: {
        type: String,
        minlength: 6,
        select: false,
    },
    googleId: {
        type: String,
        select: false,
    },
    role: {
        type: String,
        enum: ['user', 'hotel_owner', 'admin'],
        default: 'user',
    },
    avatar: {
        type: String,
        default: '',
    },
    bio: String,
    dob: Date,
    nationality: String,

    // Preferences
    currency: {
        type: String,
        enum: ['INR', 'USD', 'EUR', 'GBP'],
        default: 'INR',
    },
    darkMode: {
        type: Boolean,
        default: false,
    },
    language: {
        type: String,
        default: 'en',
    },
    travelPreferences: [String],

    // Wishlist
    wishlist: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Package',
    }],

    // Loyalty
    loyaltyPoints: {
        type: Number,
        default: 0,
    },
    loyaltyTier: {
        type: String,
        enum: ['Bronze', 'Silver', 'Gold', 'Platinum'],
        default: 'Bronze',
    },
    totalTrips: {
        type: Number,
        default: 0,
    },

    // Email verification
    isVerified: {
        type: Boolean,
        default: false,
    },
    verifyToken: {
        type: String,
        select: false,
    },
    verifyExpires: {
        type: Date,
        select: false,
    },

    // Password reset
    resetPasswordToken: {
        type: String,
        select: false,
    },
    resetPasswordExpires: {
        type: Date,
        select: false,
    },

    // Security
    lastLoginAt: Date,
    loginCount: {
        type: Number,
        default: 0,
    },
    isActive: {
        type: Boolean,
        default: true,
    },

    // Notifications preferences
    notifications: {
        email: { type: Boolean, default: true },
        sms: { type: Boolean, default: false },
        newsletter: { type: Boolean, default: true },
    },
}, {
    timestamps: true,
});

/* ── Auto-update loyalty tier ────────────────────────────── */
userSchema.pre('save', function (next) {
    if (this.isModified('loyaltyPoints')) {
        if (this.loyaltyPoints >= 5000) this.loyaltyTier = 'Platinum';
        else if (this.loyaltyPoints >= 2000) this.loyaltyTier = 'Gold';
        else if (this.loyaltyPoints >= 500) this.loyaltyTier = 'Silver';
        else this.loyaltyTier = 'Bronze';
    }
    next();
});

/* ── Hash password before save ───────────────────────────── */
userSchema.pre('save', async function (next) {
    if (!this.isModified('passwordHash') || !this.passwordHash) return next();
    const salt = await bcrypt.genSalt(12);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
});

/* ── Instance method: compare password ───────────────────── */
userSchema.methods.matchPassword = async function (enteredPassword) {
    if (!this.passwordHash) return false;
    return bcrypt.compare(enteredPassword, this.passwordHash);
};

/* ── Virtual: full display name ──────────────────────────── */
userSchema.virtual('displayName').get(function () {
    return this.name || this.email.split('@')[0];
});

// Indexes — email already indexed by unique:true above
userSchema.index({ googleId: 1 }, { sparse: true });
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ resetPasswordToken: 1 }, { sparse: true });
userSchema.index({ verifyToken: 1 }, { sparse: true });

module.exports = mongoose.model('User', userSchema);
