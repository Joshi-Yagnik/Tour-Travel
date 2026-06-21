/* ============================================================
   WANDERLUST — AI Routes v3.0 (Groq-Powered Architecture)
   All AI logic delegated to backend/services/aiService.js
   
   Endpoints:
   POST /api/ai/chat            — Conversational travel AI
   POST /api/ai/destination     — Full destination intelligence
   POST /api/ai/owner-advisor   — Hotel owner business advisor
   GET  /api/ai/trending        — Market intelligence & trends
   POST /api/ai/discover        — Destination discovery analysis
   POST /api/ai/search-assist   — Zero-results search fallback
   POST /api/ai/admin-insights  — Admin platform insights (auth)
   GET  /api/ai/suggestions     — Quick chat prompts
   GET  /api/ai/status          — Provider health check
   POST /api/ai/itinerary       — Detailed trip itinerary
   ============================================================ */

'use strict';

const express  = require('express');
const protect  = require('../middleware/auth');
const AIService = require('../services/aiService');

const router = express.Router();

/* ── Input validation helpers ───────────────────────────── */
const sanitize = (str, maxLen = 2000) =>
    typeof str === 'string' ? str.trim().slice(0, maxLen) : '';

/* ── POST /api/ai/chat ───────────────────────────────────── */
/* General conversational travel assistant                   */
router.post('/chat', async (req, res) => {
    try {
        const { message, history = [], context = {} } = req.body;

        const msg = sanitize(message);
        if (!msg) return res.status(400).json({ success: false, message: 'Message is required.' });

        const result = await AIService.chat(msg, history, context);

        res.json({
            success:  true,
            response: result.text,
            provider: result.provider,
            fallback: result.provider === 'fallback',
        });

    } catch (err) {
        console.error('[/chat] Error:', err.message);
        res.status(500).json({ success: false, message: 'AI service temporarily unavailable.' });
    }
});

/* ── POST /api/ai/destination ────────────────────────────── */
/* Full AI destination intelligence — works for ANY place    */
router.post('/destination', async (req, res) => {
    try {
        const { destination, dbData = null } = req.body;

        const dest = sanitize(destination, 200);
        if (!dest) return res.status(400).json({ success: false, message: 'destination is required.' });

        const result = await AIService.generateDestinationIntel(dest, dbData);

        res.json({
            success:  true,
            data:     result.data,
            provider: result.provider,
            fallback: result.provider === 'fallback',
        });

    } catch (err) {
        console.error('[/destination] Error:', err.message);
        res.status(500).json({ success: false, message: 'Destination intelligence unavailable.' });
    }
});

/* ── POST /api/ai/owner-advisor ──────────────────────────── */
/* Hotel owner AI business advisor                           */
router.post('/owner-advisor', protect, async (req, res) => {
    try {
        const { message, history = [], ownerContext = {} } = req.body;

        const msg = sanitize(message);
        if (!msg) return res.status(400).json({ success: false, message: 'Message is required.' });

        const result = await AIService.generateOwnerAdvice(msg, ownerContext, history);

        res.json({
            success:  true,
            response: result.text,
            provider: result.provider,
            fallback: result.provider === 'fallback',
        });

    } catch (err) {
        console.error('[/owner-advisor] Error:', err.message);
        res.status(500).json({ success: false, message: 'AI advisor temporarily unavailable.' });
    }
});

/* ── GET /api/ai/trending ────────────────────────────────── */
/* Market intelligence — trending destinations & insights    */
router.get('/trending', async (req, res) => {
    try {
        const forceRefresh = req.query.refresh === 'true';
        const result = await AIService.generateTrending(forceRefresh);

        res.json({
            success:  true,
            data:     result.data,
            cached:   result.cached,
            provider: result.provider,
        });

    } catch (err) {
        console.error('[/trending] Error:', err.message);
        res.status(500).json({ success: false, message: 'Trending data unavailable.' });
    }
});

/* ── POST /api/ai/discover ───────────────────────────────── */
/* AI-powered destination discovery analysis                 */
router.post('/discover', async (req, res) => {
    try {
        const { destination } = req.body;

        const dest = sanitize(destination, 200);
        if (!dest) return res.status(400).json({ success: false, message: 'destination is required.' });

        const result = await AIService.discoverDestination(dest);

        res.json({
            success:  true,
            data:     result.data,
            provider: result.provider,
        });

    } catch (err) {
        console.error('[/discover] Error:', err.message);
        res.status(500).json({ success: false, message: 'Discovery analysis unavailable.' });
    }
});

/* ── POST /api/ai/search-assist ─────────────────────────── */
/* Zero-results fallback — returns AI info about search term */
router.post('/search-assist', async (req, res) => {
    try {
        const { query, searchType = 'destination' } = req.body;

        const q = sanitize(query, 200);
        if (!q) return res.status(400).json({ success: false, message: 'query is required.' });

        const result = await AIService.searchAssist(q);

        res.json({
            success:  true,
            data:     result.data,
            provider: result.provider,
            fallback: result.provider === 'fallback',
        });

    } catch (err) {
        console.error('[/search-assist] Error:', err.message);
        res.status(500).json({ success: false, message: 'Search assistance unavailable.' });
    }
});

/* ── POST /api/ai/admin-insights ─────────────────────────── */
/* AI platform analytics for admin                           */
router.post('/admin-insights', protect, async (req, res) => {
    try {
        // Only admins can access this endpoint
        if (req.user?.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Admin access required.' });
        }

        const { stats = {} } = req.body;
        const result = await AIService.adminInsights(stats);

        res.json({
            success:  true,
            data:     result.data,
            provider: result.provider,
        });

    } catch (err) {
        console.error('[/admin-insights] Error:', err.message);
        res.status(500).json({ success: false, message: 'Admin insights unavailable.' });
    }
});

/* ── POST /api/ai/itinerary ──────────────────────────────── */
/* Generate a full trip itinerary                            */
router.post('/itinerary', async (req, res) => {
    try {
        const { destination, days, budget, travelers = 1, preferences = [] } = req.body;

        const dest = sanitize(destination, 200);
        if (!dest || !days) {
            return res.status(400).json({ success: false, message: 'destination and days are required.' });
        }

        const itineraryPrompt = `Create a detailed ${days}-day travel itinerary for ${dest}.

Travelers: ${travelers} person(s)
Budget: ${budget ? `₹${budget} total` : 'Not specified'}
Preferences: ${Array.isArray(preferences) ? preferences.join(', ') : 'General tourism'}

Format as a day-by-day plan with:
• Morning / Afternoon / Evening activities for each day
• Specific real places to visit with brief descriptions
• Local food recommendations (name the restaurants/eateries)
• Accommodation options including dharamshalas for budget travelers
• Transport between places (auto, bus, taxi — with costs)
• Estimated daily cost breakdown in ₹
• Total trip cost summary
• 5 must-know tips before going

Be specific, practical, and exciting! Mix famous spots with hidden gems.`;

        const result = await AIService.chat(itineraryPrompt, [], { currentPage: 'itinerary-planner' });

        res.json({
            success:   true,
            itinerary: result.text,
            provider:  result.provider,
        });

    } catch (err) {
        console.error('[/itinerary] Error:', err.message);
        res.status(500).json({ success: false, message: 'Itinerary generation unavailable.' });
    }
});

/* ── GET /api/ai/suggestions ─────────────────────────────── */
/* Quick prompts for chatbot UI                              */
router.get('/suggestions', (req, res) => {
    const quick_prompts = [
        '🏛️ Plan 3-day Udaipur trip under ₹15,000',
        '🙏 Dharamshala near Somnath Temple',
        '🗺️ Best places in Gujarat this month',
        '🌄 Weekend getaway from Ahmedabad',
        '🏨 Homestays in Coorg ₹2,000/night',
        '🎒 Budget Rajasthan 7-day itinerary',
        '🚂 Char Dham Yatra planning guide',
        '🌊 Goa 5-day trip under ₹20,000',
        '🏔️ Ladakh trip planning June',
        '🌿 Kerala houseboat experience',
        '🦁 Wildlife safari in Ranthambore',
        '🎭 Varanasi Ganga Aarti experience',
    ];

    res.json({ success: true, quick_prompts });
});

/* ── GET /api/ai/status ──────────────────────────────────── */
/* Check which AI providers are active                       */
router.get('/status', (req, res) => {
    const status = AIService.getProviderStatus();
    res.json({
        success: true,
        status,
        message: status.fallback
            ? '⚠️ No AI provider configured. Add GROQ_API_KEY to .env for full AI features.'
            : `✅ AI active via ${status.active}`,
    });
});

/* ── POST /api/ai/invalidate-cache ──────────────────────── */
/* Admin: force refresh trending cache                       */
router.post('/invalidate-cache', protect, (req, res) => {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Admin access required.' });
    }
    AIService.invalidateTrendingCache();
    res.json({ success: true, message: 'Trending cache cleared. Next request will fetch fresh data.' });
});

module.exports = router;
