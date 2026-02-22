/* ============================================================
   WANDERLUST — Entry Point
   Node.js + Express Backend Server
   ============================================================ */

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

/* ── Rate Limiting ───────────────────────────────────────── */
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 min
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests, please try again later.' },
});
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10, // Strict: only 10 login attempts per 15 min
    message: { success: false, message: 'Too many login attempts, please wait 15 minutes.' },
});

/* ── Middleware ──────────────────────────────────────────── */
app.use(globalLimiter);
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || '*', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

/* ── Static Files ────────────────────────────────────────── */
// Serve frontend during production
app.use(express.static(path.join(__dirname, '..')));

/* ── Routes ──────────────────────────────────────────────── */
const authRoutes = require('./routes/auth');
const destinationRoutes = require('./routes/destinations');
const packageRoutes = require('./routes/packages');
const bookingRoutes = require('./routes/bookings');
const contactRoutes = require('./routes/contact');

app.use('/api/auth', authRoutes);
app.use('/api/destinations', destinationRoutes);
app.use('/api/packages', packageRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/contact', contactRoutes);

/* ── Health Check ────────────────────────────────────────── */
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

/* ── Global Error Handler ────────────────────────────────── */
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || 'Internal Server Error',
    });
});

/* ── Start Server & Connect DB ───────────────────────────── */
const connectDB = require('./config/db');
connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`✅ Wanderlust server running on http://localhost:${PORT}`);
    });
});

module.exports = app;
