/* ============================================================
   WANDERLUST — Contact Routes
   POST /api/contact          (public — submit message)
   GET  /api/contact          (admin — view all messages)
   PUT  /api/contact/:id/reply (admin — mark as replied)
   ============================================================ */

const express = require('express');
const Contact = require('../models/Contact');
const protect = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');

const router = express.Router();

/* ── POST /api/contact ───────────────────────────────────── */
router.post('/', async (req, res) => {
    try {
        const { firstName, lastName, email, phone, subject, destination, travelDate, travelers, message, newsletter } = req.body;

        const msg = await Contact.create({
            firstName, lastName, email, phone,
            subject, destination, travelDate, travelers,
            message, newsletter,
        });

        /*
          TODO: send confirmation email using Nodemailer
          await sendConfirmationEmail(email, firstName);
        */

        res.status(201).json({
            success: true,
            message: 'Your message has been received. We will get back to you within 24 hours.',
            data: { id: msg._id },
        });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

/* ── GET /api/contact — Admin ────────────────────────────── */
router.get('/', protect, adminOnly, async (req, res) => {
    const { replied, page = 1, limit = 25 } = req.query;
    const query = {};
    if (replied !== undefined) query.replied = replied === 'true';

    const total = await Contact.countDocuments(query);
    const messages = await Contact
        .find(query)
        .sort('-createdAt')
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit));

    res.json({ success: true, total, data: messages });
});

/* ── PUT /api/contact/:id/reply — Admin ─────────────────── */
router.put('/:id/reply', protect, adminOnly, async (req, res) => {
    const msg = await Contact.findByIdAndUpdate(
        req.params.id,
        { replied: true, repliedAt: new Date() },
        { new: true },
    );
    if (!msg) return res.status(404).json({ success: false, message: 'Message not found.' });
    res.json({ success: true, data: msg });
});

module.exports = router;
