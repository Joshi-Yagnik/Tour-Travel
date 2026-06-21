/* ============================================================
   WANDERLUST — AI Service v2.0 (Groq-Primary Architecture)
   Central abstraction layer — all routes call this service.
   Provider priority: Groq → Gemini → Static Fallback
   ============================================================ */

'use strict';

const groqProvider   = require('./providers/groq');
const geminiProvider = require('./providers/gemini');
const prompts        = require('./prompts/travel');

/* ── Trending Cache (1-hour TTL) ─────────────────────────── */
let _trendingCache     = null;
let _trendingCacheTime = 0;
const TRENDING_TTL     = 60 * 60 * 1000;

/* ── Logging ─────────────────────────────────────────────── */
function log(level, msg, meta = {}) {
    const ts   = new Date().toISOString();
    const line = `[${ts}] [AI-Service] [${level.toUpperCase()}] ${msg}`;
    if (level === 'error') console.error(line, meta);
    else                   console.log(line, Object.keys(meta).length ? meta : '');
}

/* ── Provider Selection ──────────────────────────────────── */
function getProvider() {
    const preferred = process.env.AI_PRIMARY_PROVIDER || 'groq';
    if (preferred === 'gemini' && geminiProvider.available) return geminiProvider;
    if (groqProvider.available)                              return groqProvider;
    if (geminiProvider.available)                            return geminiProvider;
    return null;
}

/* ── JSON Parser (tries both providers' parsers) ─────────── */
function parseJSON(text, provider) {
    try { return provider.parseJSON(text); }
    catch {
        // Generic fallback parse
        const cleaned = text.replace(/```(?:json)?\n?/g, '').trim();
        const start   = Math.min(
            cleaned.indexOf('{') === -1 ? Infinity : cleaned.indexOf('{'),
            cleaned.indexOf('[') === -1 ? Infinity : cleaned.indexOf('['),
        );
        const end = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'));
        if (start !== Infinity && end !== -1) return JSON.parse(cleaned.slice(start, end + 1));
        throw new Error('Cannot parse JSON from AI response');
    }
}

/* ════════════════════════════════════════════════════════════
   PUBLIC API
════════════════════════════════════════════════════════════ */

const AIService = {

    /**
     * General conversational travel chat.
     * Used by: /api/ai/chat
     */
    async chat(message, history = [], context = {}) {
        const provider = getProvider();
        if (!provider) {
            log('warn', 'No AI provider available for chat');
            return { text: getFallbackChat(message), provider: 'fallback' };
        }

        let enhancedMessage = message;
        if (context.location)     enhancedMessage += `\n[User location: ${context.location}]`;
        if (context.budget)       enhancedMessage += `\n[Budget: ₹${context.budget}]`;
        if (context.currentPage)  enhancedMessage += `\n[Currently viewing: ${context.currentPage}]`;
        if (context.searchQuery)  enhancedMessage += `\n[Searched for: ${context.searchQuery}]`;

        try {
            const text = await provider.conversationalChat(
                prompts.TRAVEL_EXPERT_SYSTEM,
                history,
                enhancedMessage,
                { model: provider.primaryModel, maxTokens: 1500 },
            );
            log('info', `Chat OK — provider: ${provider.constructor.name}`);
            return { text, provider: provider.constructor.name };
        } catch (err) {
            log('error', 'Chat failed', { error: err.message });
            return { text: getFallbackChat(message), provider: 'fallback' };
        }
    },

    /**
     * Full destination intelligence — works for ANY destination worldwide.
     * Used by: /api/ai/destination
     */
    async generateDestinationIntel(destination, dbData = null) {
        const provider = getProvider();
        if (!provider) {
            return { data: buildFallbackDestination(destination), provider: 'fallback' };
        }

        const prompt = prompts.destinationPrompt(destination, dbData);

        try {
            const raw  = await provider.complete(
                prompts.TRAVEL_EXPERT_SYSTEM,
                prompt,
                { model: provider.primaryModel, maxTokens: 3000, temperature: 0.6 },
            );
            const data = parseJSON(raw, provider);
            log('info', `Destination intel OK: ${destination}`);
            return { data, provider: provider.constructor.name };
        } catch (err) {
            log('error', `Destination intel failed: ${destination}`, { error: err.message });
            return { data: buildFallbackDestination(destination), provider: 'fallback' };
        }
    },

    /**
     * Hotel owner business advisor — context-aware advice.
     * Used by: /api/ai/owner-advisor
     */
    async generateOwnerAdvice(message, ownerContext = {}, history = []) {
        const provider = getProvider();
        if (!provider) {
            return { text: getFallbackOwnerAdvice(message), provider: 'fallback' };
        }

        const userPrompt = prompts.ownerAdvicePrompt(message, ownerContext);

        // Use long-context model if owner has many properties/reviews
        const hasLotOfData = (ownerContext.properties?.length > 3) ||
                             (ownerContext.recentReviews?.length > 5);
        const model = hasLotOfData && provider.longCtxModel
            ? provider.longCtxModel
            : provider.primaryModel;

        try {
            const text = await provider.conversationalChat(
                prompts.BUSINESS_ADVISOR_SYSTEM,
                history,
                userPrompt,
                { model, maxTokens: 2000 },
            );
            log('info', 'Owner advisor OK');
            return { text, provider: provider.constructor.name };
        } catch (err) {
            log('error', 'Owner advisor failed', { error: err.message });
            return { text: getFallbackOwnerAdvice(message), provider: 'fallback' };
        }
    },

    /**
     * Trending destinations & market intelligence.
     * Used by: /api/ai/trending
     * Cached for 1 hour.
     */
    async generateTrending(forceRefresh = false) {
        // Return cache if valid
        if (!forceRefresh && _trendingCache && (Date.now() - _trendingCacheTime) < TRENDING_TTL) {
            log('info', 'Trending served from cache');
            return { data: _trendingCache, cached: true, provider: 'cache' };
        }

        const provider = getProvider();
        if (!provider) {
            return { data: getFallbackTrending(), cached: false, provider: 'fallback' };
        }

        try {
            const raw  = await provider.complete(
                prompts.ADMIN_ANALYST_SYSTEM,
                prompts.trendingPrompt(),
                { model: provider.fastModel || provider.primaryModel, maxTokens: 3500, temperature: 0.5 },
            );
            const data = parseJSON(raw, provider);

            // Validate structure
            if (!data.trending || !Array.isArray(data.trending)) throw new Error('Invalid trending structure');

            _trendingCache     = data;
            _trendingCacheTime = Date.now();

            log('info', 'Trending generated & cached');
            return { data, cached: false, provider: provider.constructor.name };
        } catch (err) {
            log('error', 'Trending generation failed', { error: err.message });
            const fallback = getFallbackTrending();
            _trendingCache     = fallback;
            _trendingCacheTime = Date.now();
            return { data: fallback, cached: false, provider: 'fallback' };
        }
    },

    /**
     * Discover if a place should be added to the platform.
     * Used by: /api/ai/discover
     */
    async discoverDestination(destination) {
        const provider = getProvider();
        if (!provider) {
            return {
                data: {
                    destination,
                    isReal: true,
                    shouldAdd: true,
                    tourismPotential: 'medium',
                    briefDesc: `${destination} is a travel destination worth exploring for platform listings.`,
                    suggestedListings: ['Hotel', 'Dharamshala', 'Restaurant'],
                },
                provider: 'fallback',
            };
        }

        try {
            const raw  = await provider.complete(
                prompts.ADMIN_ANALYST_SYSTEM,
                prompts.discoverPrompt(destination),
                { model: provider.fastModel || provider.primaryModel, maxTokens: 1000, temperature: 0.5 },
            );
            const data = parseJSON(raw, provider);
            log('info', `Discover OK: ${destination}`);
            return { data, provider: provider.constructor.name };
        } catch (err) {
            log('error', `Discover failed: ${destination}`, { error: err.message });
            return {
                data: {
                    name: destination,
                    isReal: true,
                    shouldAdd: true,
                    tourismPotential: 'medium',
                    briefDesc: `${destination} is a travel destination. Configure AI for detailed analysis.`,
                    suggestedListings: ['Hotel', 'Dharamshala'],
                },
                provider: 'fallback',
            };
        }
    },

    /**
     * Zero-results search fallback.
     * Used by: /api/ai/search-assist
     */
    async searchAssist(query) {
        const provider = getProvider();
        if (!provider) {
            return {
                data: {
                    isValidPlace: true,
                    suggestion: `We couldn't find "${query}" in our database. Our AI can help! Please add your Groq API key for intelligent search assistance.`,
                    canHelp: false,
                },
                provider: 'fallback',
            };
        }

        try {
            const raw  = await provider.complete(
                prompts.TRAVEL_EXPERT_SYSTEM,
                prompts.searchAssistPrompt(query),
                { model: provider.fastModel || provider.primaryModel, maxTokens: 800, temperature: 0.5 },
            );
            const data = parseJSON(raw, provider);
            log('info', `Search-assist OK: ${query}`);
            return { data, provider: provider.constructor.name };
        } catch (err) {
            log('error', `Search-assist failed: ${query}`, { error: err.message });
            return {
                data: {
                    isValidPlace: true,
                    canHelp: false,
                    suggestion: `"${query}" — we don't have specific results right now. Try browsing our destinations or contact support.`,
                },
                provider: 'fallback',
            };
        }
    },

    /**
     * Admin platform insights.
     * Used by: /api/ai/admin-insights
     */
    async adminInsights(platformStats = {}) {
        const provider = getProvider();
        if (!provider) {
            return { data: getFallbackAdminInsights(), provider: 'fallback' };
        }

        try {
            const raw  = await provider.complete(
                prompts.ADMIN_ANALYST_SYSTEM,
                prompts.adminInsightsPrompt(platformStats),
                { model: provider.fastModel || provider.primaryModel, maxTokens: 2000, temperature: 0.5 },
            );
            const data = parseJSON(raw, provider);
            log('info', 'Admin insights generated');
            return { data, provider: provider.constructor.name };
        } catch (err) {
            log('error', 'Admin insights failed', { error: err.message });
            return { data: getFallbackAdminInsights(), provider: 'fallback' };
        }
    },

    /**
     * Get status of all AI providers.
     */
    getProviderStatus() {
        return {
            groq:    { available: groqProvider.available,   name: 'Groq (Llama 3.3 70B)' },
            gemini:  { available: geminiProvider.available, name: 'Google Gemini 1.5 Flash' },
            active:  getProvider()?.constructor?.name || 'None',
            fallback: !groqProvider.available && !geminiProvider.available,
        };
    },

    /**
     * Invalidate trending cache (e.g., admin triggered refresh).
     */
    invalidateTrendingCache() {
        _trendingCache     = null;
        _trendingCacheTime = 0;
        log('info', 'Trending cache invalidated');
    },
};

/* ════════════════════════════════════════════════════════════
   STATIC FALLBACKS (when no AI provider is available)
════════════════════════════════════════════════════════════ */

function getFallbackChat(message) {
    const msg = message.toLowerCase();
    if (msg.includes('goa'))        return `🌊 **Goa** is India's beach paradise! Best time: November–February. Don't miss Baga Beach, Anjuna flea market, and the Portuguese churches in Old Goa. Budget: ₹2,000–₹5,000/day. What type of experience are you looking for in Goa?`;
    if (msg.includes('rajasthan'))  return `🏰 **Rajasthan** is India's royal gem! Visit Jaipur's Amber Fort, Udaipur's Lake Palace, Jaisalmer's golden fort. Best time: October–March. Budget: ₹2,500–₹8,000/day. Which Rajasthan city interests you most?`;
    if (msg.includes('kerala'))     return `🌿 **Kerala** — God's Own Country! Famous for backwaters, Munnar tea gardens, Varkala beach. Best time: September–March. Don't miss a houseboat stay on Alleppey backwaters! Which part of Kerala are you planning to visit?`;
    if (msg.includes('ladakh'))     return `🏔️ **Ladakh** is breathtaking! Visit Pangong Lake, Nubra Valley, Thiksey Monastery. Best time: June–September. Altitude sickness tip: acclimatize 1-2 days in Leh first. Budget: ₹3,500–₹8,000/day. How many days are you planning?`;
    if (msg.includes('dharamshala')) return `🙏 **Dharamshalas** in India offer peaceful, affordable stays near temples. Popular ones: Haridwar (₹200–₹500/night), Varanasi (₹150–₹400/night), Somnath (₹200–₹600/night), Tirupati TTD (₹100–₹300/night). Which pilgrimage destination are you visiting?`;

    return `🤖 **WanderBot** is ready to help! I can plan trips to any destination in India or worldwide.\n\nTry asking me:\n• "Plan a 5-day Rajasthan trip"\n• "Best time to visit Kerala"\n• "Budget trip to Goa under ₹15,000"\n• "Dharamshalas near Somnath Temple"\n\n*Configure GROQ_API_KEY for full AI-powered responses!*\n\nWhat destination are you interested in? ✈️`;
}

function getFallbackOwnerAdvice(message) {
    return `📊 **Business Advisor** — AI key required for personalized advice.\n\n**Quick Tips:**\n• **Pricing**: Increase rates 25–40% during festive seasons (Navratri, Diwali, New Year)\n• **Reviews**: Respond to all guest reviews within 24 hours — shows commitment\n• **Photos**: Professional photos increase bookings by 150% — worth the investment\n• **Amenities**: Free WiFi + breakfast packages show 35% higher booking rates\n• **Visibility**: Keep your listing updated with seasonal offers\n\nAdd **GROQ_API_KEY** to your .env file for personalized AI analysis of your specific properties!`;
}

function buildFallbackDestination(destination) {
    return {
        name: destination,
        tagline: `Discover the beauty of ${destination}`,
        about: `${destination} is a fascinating destination with unique culture, history, and experiences waiting to be explored.`,
        highlights: ['Rich cultural heritage', 'Local cuisine', 'Natural beauty', 'Unique experiences', 'Warm hospitality'],
        bestTime: { months: 'October to March', reason: 'Pleasant weather', avoid: 'Peak summer months' },
        budget: { budget: '₹2,000–₹4,000/day', midRange: '₹4,000–₹10,000/day', luxury: '₹10,000+/day' },
        attractions: [
            { name: 'Main Attraction', type: 'nature', desc: 'The primary landmark of this destination', entryFee: 'Varies' },
        ],
        food: [{ name: 'Local Cuisine', desc: 'Traditional regional dishes', mustTry: true }],
        transport: { byAir: 'Via nearest airport', byTrain: 'Train connections available', byRoad: 'Well-connected by road', local: 'Local taxis and auto-rickshaws' },
        tips: ['Book accommodation in advance', 'Carry cash for local markets', 'Respect local customs'],
        nearbyPlaces: [],
        inDatabase: false,
        tourismPotential: 'medium',
        category: 'Cultural',
    };
}

function getFallbackTrending() {
    return {
        trending: [
            { name: 'Ladakh', state: 'J&K', region: 'North India', demand: 'very_high', growth: '+42%', season: 'May–Sep', category: 'Adventure', whyTrending: 'Surging demand for high-altitude adventure and monastery tourism post-COVID', avgNightPrice: '₹3,500', topAttractions: ['Pangong Lake', 'Nubra Valley', 'Thiksey Monastery'] },
            { name: 'Varanasi', state: 'Uttar Pradesh', region: 'North India', demand: 'very_high', growth: '+35%', season: 'Oct–Mar', category: 'Spiritual', whyTrending: 'Growing international spiritual tourism and Kashi Vishwanath Corridor completion', avgNightPrice: '₹2,200', topAttractions: ['Kashi Vishwanath', 'Ganga Aarti', 'Sarnath'] },
            { name: 'Goa', state: 'Goa', region: 'West India', demand: 'very_high', growth: '+38%', season: 'Nov–Feb', category: 'Beach', whyTrending: 'Year-round beach destination with rising luxury resort demand', avgNightPrice: '₹4,500', topAttractions: ['Baga Beach', 'Old Goa Churches', 'Dudhsagar Falls'] },
            { name: 'Coorg', state: 'Karnataka', region: 'South India', demand: 'high', growth: '+31%', season: 'Oct–Mar', category: 'Nature', whyTrending: 'Coffee plantation stays and eco-tourism experiencing boom', avgNightPrice: '₹3,200', topAttractions: ['Abbey Falls', 'Raja\'s Seat', 'Namdroling Monastery'] },
            { name: 'Rishikesh', state: 'Uttarakhand', region: 'North India', demand: 'high', growth: '+28%', season: 'Sep–Jun', category: 'Adventure', whyTrending: 'Growing yoga tourism and adventure sports market', avgNightPrice: '₹2,000', topAttractions: ['Laxman Jhula', 'River Rafting', 'Beatles Ashram'] },
            { name: 'Hampi', state: 'Karnataka', region: 'South India', demand: 'medium', growth: '+22%', season: 'Oct–Feb', category: 'Heritage', whyTrending: 'UNESCO heritage site gaining millennial traveler attention', avgNightPrice: '₹1,800', topAttractions: ['Virupaksha Temple', 'Stone Chariot', 'Vittala Temple'] },
        ],
        insights: [
            { icon: 'fa-pray', title: 'Spiritual Tourism Boom', stat: '+40% YoY', desc: 'Religious destinations seeing unprecedented growth post-2024. Char Dham Yatra bookings up 55%.' },
            { icon: 'fa-mountain', title: 'Adventure Travel Rising', stat: '+35% YoY', desc: 'Trekking and outdoor bookings surging among 22–35 age group. Ladakh and Spiti Valley lead.' },
            { icon: 'fa-home', title: 'Homestay Revolution', stat: '3x Growth', desc: 'Authentic rural and heritage homestays growing 3x faster than traditional hotels.' },
            { icon: 'fa-rupee-sign', title: 'Luxury Segment Expanding', stat: '+28% Revenue', desc: 'Premium hotel bookings growing 28% as domestic travelers upgrade their travel expectations.' },
        ],
        seasonal: {
            currentSeason: 'Monsoon',
            topDestinations: ['Meghalaya', 'Kerala', 'Coorg', 'Wayanad'],
            upcomingFestivals: ['Navratri (October)', 'Diwali (November)'],
            priceAlert: 'Pre-book October–November properties now — festive season causes 40% price surge',
            ownerTip: 'List winter season packages now to capture early-bird bookings for October–February peak season.',
        },
        propertyGaps: [
            { destination: 'Spiti Valley', state: 'Himachal Pradesh', gap: 'Very few quality hotels despite high search volume', estimatedDemand: '1.5 lakh visitors/year', potential: 'very_high', opportunity: 'Add a mid-range hotel or glamping property to capture growing adventure tourism.' },
            { destination: 'Ziro Valley', state: 'Arunachal Pradesh', gap: 'Minimal accommodation options listed on platforms', estimatedDemand: '80,000 visitors/year', potential: 'high', opportunity: 'Cultural homestays near Apatani tribe villages have zero competition currently.' },
            { destination: 'Majuli Island', state: 'Assam', gap: 'Unique river island with no platform listings', estimatedDemand: '60,000 visitors/year', potential: 'high', opportunity: 'Eco-resort or heritage guesthouse would dominate this uncrowded market.' },
        ],
        categories: [
            { name: 'Spiritual Tourism', growth: '+40%', trend: 'up' },
            { name: 'Adventure Travel',  growth: '+35%', trend: 'up' },
            { name: 'Heritage Tourism',  growth: '+22%', trend: 'up' },
            { name: 'Eco-Tourism',       growth: '+45%', trend: 'emerging' },
            { name: 'Luxury Travel',     growth: '+28%', trend: 'up' },
        ],
    };
}

function getFallbackAdminInsights() {
    return {
        summary: 'Platform shows strong growth potential in spiritual and adventure tourism segments. Key opportunity: expanding dharamshala and homestay listings in underserved pilgrimage routes.',
        topOpportunities: [
            { title: 'Dharamshala Network Gap', priority: 'high', desc: 'Pilgrimage routes like Char Dham lack quality dharamshala listings', action: 'Partner with local dharamshala trusts to onboard 50+ properties', estimatedImpact: '+30% bookings in spiritual segment' },
            { title: 'Northeast India Expansion', priority: 'high', desc: 'Meghalaya, Arunachal, Sikkim have very few listings despite growing demand', action: 'Launch a Northeast India campaign with 20+ new properties', estimatedImpact: '+45% traffic from Northeast searches' },
            { title: 'Homestay Category Growth', priority: 'medium', desc: 'Homestays growing 3x faster than hotels but underrepresented in listings', action: 'Create a dedicated Homestay category and onboarding program', estimatedImpact: '+25% new partner registrations' },
        ],
        missingDestinations: [
            { name: 'Spiti Valley', state: 'Himachal Pradesh', reason: 'High search volume, minimal listings', demand: 'Very High' },
            { name: 'Ziro Valley', state: 'Arunachal Pradesh', reason: 'Growing eco-tourism, zero competition', demand: 'High' },
            { name: 'Majuli Island', state: 'Assam', reason: 'Unique UNESCO candidate destination', demand: 'Medium-High' },
            { name: 'Chopta', state: 'Uttarakhand', reason: 'Mini-Switzerland demand, no listings', demand: 'High' },
        ],
        contentGaps: [
            { category: 'Dharamshalas on Char Dham route', gap: 'Only 3 listings for 200+ actual dharamshalas', priority: 'high' },
            { category: 'Restaurants in Tier-2 cities', gap: 'Hotel listings present but restaurant data missing', priority: 'medium' },
            { category: 'Tribal homestays in Northeast', gap: 'Zero listings despite high international interest', priority: 'high' },
        ],
        marketTrends: [
            { trend: 'Workation Boom', impact: 'Extended stays growing — need properties with work amenities', recommendation: 'Add "Work-Friendly" filter and tag qualifying properties' },
            { trend: 'Solo Female Travel', impact: '28% of bookings now by solo women travelers', recommendation: 'Add "Women-Safe" and "Female-Friendly" property tags' },
            { trend: 'Spiritual Wellness Tourism', impact: 'Yoga retreats and meditation centers in high demand', recommendation: 'Create Wellness Tourism category with retreat packages' },
        ],
        quickWins: [
            'Add "Book Dharamshala" option on all pilgrimage destination pages',
            'Email existing hotel partners in Northeast India for partnership',
            'Add seasonal price recommendations to Hotel Owner dashboard',
        ],
    };
}

module.exports = AIService;
