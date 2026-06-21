/* ============================================================
   WANDERLUST — Entry Point  v2.0
   Node.js + Express Backend Server
   ============================================================ */

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
require('dotenv').config();

// Optional security packages (graceful degradation if not yet installed)
let mongoSanitize, xssClean;
try { mongoSanitize = require('express-mongo-sanitize'); } catch(e) {}
try { xssClean = require('xss-clean'); } catch(e) {}

const app = express();
const PORT = process.env.PORT || 5000;
const isDev = process.env.NODE_ENV !== 'production';

/* ── Rate Limiters ───────────────────────────────────────── */
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isDev ? 10000 : 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests, please try again later.' },
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isDev ? 1000 : 15,
    message: { success: false, message: 'Too many auth attempts, please wait 15 minutes.' },
});

// AI rate limiter — Groq supports up to 30 req/min on free tier
const aiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: isDev ? 100 : 30,
    message: { success: false, message: 'Too many AI requests. Please wait a moment and try again.' },
});


/* ── Security Middleware ─────────────────────────────────── */
app.use(helmet({
    contentSecurityPolicy: false, // Disable for development flexibility
    crossOriginEmbedderPolicy: false,
}));

const allowedOrigins = [
    process.env.CLIENT_URL || 'http://localhost:5000',
    'http://localhost:3000',
    'http://127.0.0.1:5500',
    'http://127.0.0.1:5000',
];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin || isDev) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
if (mongoSanitize) app.use(mongoSanitize()); // Prevent NoSQL injection
if (xssClean) app.use(xssClean());           // Sanitize XSS
app.use(morgan(isDev ? 'dev' : 'combined'));
app.use(globalLimiter);

/* ── Static Files ────────────────────────────────────────── */
app.use(express.static(path.join(__dirname, '..')));

/* ── Routes ──────────────────────────────────────────────── */
const authRoutes        = require('./routes/auth');
const destinationRoutes = require('./routes/destinations');
const packageRoutes     = require('./routes/packages');
const bookingRoutes     = require('./routes/bookings');
const contactRoutes     = require('./routes/contact');

app.use('/api/auth',         authLimiter, authRoutes);
app.use('/api/destinations', destinationRoutes);
app.use('/api/packages',     packageRoutes);
app.use('/api/bookings',     bookingRoutes);
app.use('/api/contact',      contactRoutes);

// New routes — graceful degradation if files don't exist yet
try {
    const hotelRoutes  = require('./routes/hotels');
    app.use('/api/hotels', hotelRoutes);
} catch(e) { console.log('ℹ️  Hotels routes not yet available.'); }

try {
    const aiRoutes = require('./routes/ai');
    app.use('/api/ai', aiLimiter, aiRoutes);
} catch(e) { console.log('ℹ️  AI routes not yet available.'); }

try {
    const reviewRoutes = require('./routes/reviews');
    app.use('/api/reviews', reviewRoutes);
} catch(e) { console.log('ℹ️  Reviews routes not yet available.'); }

try {
    const restaurantRoutes = require('./routes/restaurants');
    app.use('/api/restaurants', restaurantRoutes);
} catch(e) { console.log('ℹ️  Restaurant routes not yet available.'); }

try {
    const adminRoutes = require('./routes/admin');
    app.use('/api/admin', adminRoutes);
} catch(e) { console.log('ℹ️  Admin routes not yet available.'); }

try {
    const ownerRoutes = require('./routes/owner');
    app.use('/api/owner', ownerRoutes);
} catch(e) { console.log('ℹ️  Owner routes not yet available.'); }

/* ── Health Check ────────────────────────────────────────── */
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        version: '2.0.0',
    });
});

/* ── 404 Handler for API ─────────────────────────────────── */
app.use('/api/*', (req, res) => {
    res.status(404).json({ success: false, message: 'API endpoint not found.' });
});

/* ── SPA Fallback (serve index.html for non-API routes) ──── */
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

/* ── Global Error Handler ────────────────────────────────── */
app.use((err, req, res, next) => {
    console.error('❌ Error:', err.message);
    if (isDev) console.error(err.stack);

    const statusCode = err.statusCode || err.status || 500;
    const message = statusCode === 500 && !isDev
        ? 'Internal Server Error'
        : err.message || 'Something went wrong';

    res.status(statusCode).json({ success: false, message });
});

/* ── Start Server & Connect DB ───────────────────────────── */
const connectDB = require('./config/db');
connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`✅ Wanderlust v2.0 running → http://localhost:${PORT}`);
        console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
}).catch(err => {
    console.error('❌ Failed to connect to database:', err.message);
    process.exit(1);
});

module.exports = app;
