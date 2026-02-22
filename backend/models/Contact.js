/* ============================================================
   WANDERLUST — Contact Message Model
   ============================================================ */

const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: [true, 'First name is required'],
        trim: true,
    },
    lastName: {
        type: String,
        required: [true, 'Last name is required'],
        trim: true,
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    phone: String,
    subject: {
        type: String,
        enum: ['Book a Trip', 'General Inquiry', 'Support', 'Other'],
        default: 'General Inquiry',
    },
    destination: String,
    travelDate: Date,
    travelers: Number,
    message: {
        type: String,
        required: [true, 'Message is required'],
        minlength: [10, 'Message must be at least 10 characters'],
        maxlength: 2000,
    },
    replied: {
        type: Boolean,
        default: false,
    },
    repliedAt: Date,
    newsletter: {
        type: Boolean,
        default: false,
    },
}, {
    timestamps: true,
});

module.exports = mongoose.model('Contact', contactSchema);
