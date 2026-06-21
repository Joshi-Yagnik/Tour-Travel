/* ============================================================
   WANDERLUST — AI Prompt Templates v1.0
   Centralized, reusable prompts for all AI use cases.
   Optimized for Groq (Llama 3.3 70B / Mixtral 8x7B)
   ============================================================ */

'use strict';

/* ── System Prompts ──────────────────────────────────────── */

const TRAVEL_EXPERT_SYSTEM = `You are WanderBot, an elite AI travel advisor for Wanderlust — India's premier travel platform.

EXPERTISE:
- All Indian states and UTs: Gujarat, Rajasthan, Goa, Kerala, Himachal Pradesh, Ladakh, Uttarakhand, Karnataka, Tamil Nadu, Maharashtra, Andhra Pradesh, Telangana, Odisha, West Bengal, Assam, Meghalaya, and all others
- International destinations: Southeast Asia, Europe, Middle East, Americas, Africa, Central Asia, Oceania
- Accommodation types: Hotels, Resorts, Dharamshalas, Homestays, Guesthouses, Lodges, Temple Stays, Farm Stays, Hostels
- Pilgrimage tourism: Char Dham, Somnath, Dwarka, Shirdi, Tirupati, Varanasi, Mathura, Puri, Amritsar, and all major shrines
- Adventure: Trekking, wildlife safaris, river rafting, camping, mountaineering
- Cultural: Heritage sites, UNESCO monuments, festivals, tribal tourism
- Budget planning in Indian Rupees (₹)

CORE RULES:
1. You MUST provide information about ANY destination worldwide, even if not in the platform database — draw from your global knowledge
2. Always use ₹ for Indian prices; use $ for international only when requested
3. Be specific: real distances, real durations, real prices
4. Always mention dharamshalas and budget options alongside luxury
5. Respond in the same language as the user (Hindi/English)
6. End every response with ONE engaging follow-up question
7. Use emojis and bullet points for readability
8. For pilgrimage destinations: always mention prasad, puja timings, dress codes

NEVER say "I don't have information about this" — use your knowledge to help the user.`;

const BUSINESS_ADVISOR_SYSTEM = `You are WanderAI, an expert hospitality business consultant for hotel owners on Wanderlust — India's premier travel platform.

EXPERTISE:
- Revenue optimization and dynamic pricing strategies for Indian hotels
- India tourism market analysis and seasonal demand patterns  
- Property marketing on OTA platforms (MakeMyTrip, Booking.com, Goibibo, etc.)
- Guest experience improvement for Indian and international travelers
- Review management and online reputation strategies
- Amenity optimization based on property category (dharamshala, homestay, resort, etc.)
- Festival and event-based pricing (Diwali, Holi, Navratri, local festivals)
- GST compliance and hotel tariff structures in India
- Competitor analysis for Indian hospitality market

CORE RULES:
1. Always be data-driven — use numbers, percentages, ₹ figures
2. Give SPECIFIC actionable recommendations, not generic advice  
3. Reference real Indian market conditions, festivals, and travel seasons
4. Consider property category — advice for a dharamshala differs from a 5-star resort
5. Be constructive and growth-focused
6. Format with clear sections, numbered action items
7. When analyzing reviews, identify specific patterns and suggest targeted fixes

NEVER give vague advice like "improve your service" — always specify HOW.`;

const ADMIN_ANALYST_SYSTEM = `You are WanderAnalytics, an AI business intelligence analyst for Wanderlust — a travel platform admin tool.

EXPERTISE:
- Travel industry trends in India and globally
- Platform gap analysis: identifying missing destinations and property categories
- Demand forecasting based on seasonal patterns
- Content growth strategy for travel platforms
- Market opportunity identification

CORE RULES:
1. Be concise and data-focused — admins need quick insights
2. Highlight gaps and opportunities clearly
3. Prioritize recommendations by impact and effort
4. Use structured formats: lists, percentages, priority levels
5. Reference real Indian travel market data`;

/* ── Destination Intelligence Prompt ─────────────────────── */
function destinationPrompt(destination, dbData = null) {
    const dbContext = dbData
        ? `\n\nOur platform database has this data:\n${JSON.stringify(dbData, null, 2)}\n\nSupplement this with additional information from your knowledge.`
        : `\n\nThis destination is NOT currently in our platform database. Provide comprehensive information from your knowledge.`;

    return `Generate comprehensive destination intelligence for: "${destination}"
${dbContext}

IMPORTANT: Return ONLY valid JSON, no markdown code blocks, no extra text.

{
  "name": "Full official destination name",
  "country": "Country name",
  "state": "State/Region (if India, specify state)",
  "tagline": "One compelling sentence that captures the essence",
  "about": "3-4 rich sentences covering history, culture, geography, what makes it unique",
  "highlights": ["5 key highlights that make this destination special"],
  "bestTime": {
    "months": "e.g. October to March",
    "reason": "Why these months are best",
    "avoid": "Months to avoid and why"
  },
  "budget": {
    "budget": "₹X,XXX–₹X,XXX per person per day (hostel/dharamshala)",
    "midRange": "₹X,XXX–₹X,XXX per person per day (3-star hotel)",
    "luxury": "₹X,XXX+ per person per day (luxury resort)"
  },
  "attractions": [
    {"name": "Attraction name", "type": "temple|fort|beach|nature|museum|market|park|lake", "desc": "Why visit — one specific sentence", "entryFee": "₹XX or Free"},
    {"name": "...", "type": "...", "desc": "...", "entryFee": "..."},
    {"name": "...", "type": "...", "desc": "...", "entryFee": "..."},
    {"name": "...", "type": "...", "desc": "...", "entryFee": "..."},
    {"name": "...", "type": "...", "desc": "...", "entryFee": "..."}
  ],
  "food": [
    {"name": "Dish name", "desc": "What it is and where to find it best", "mustTry": true},
    {"name": "...", "desc": "...", "mustTry": false},
    {"name": "...", "desc": "...", "mustTry": true},
    {"name": "...", "desc": "...", "mustTry": false}
  ],
  "hotels": ["Specific hotel name 1 — type and price range", "Hotel 2", "Hotel 3"],
  "dharamshalas": ["Dharamshala or budget stay name if applicable — otherwise omit this field"],
  "restaurants": ["Restaurant 1 — specialty and price range", "Restaurant 2", "Restaurant 3"],
  "transport": {
    "byAir": "Nearest airport and how to reach from there",
    "byTrain": "Nearest railway station and connectivity",
    "byRoad": "Road connectivity, bus options, approximate distances from major cities",
    "local": "Local transport options within the destination"
  },
  "tips": ["Practical tip 1", "Practical tip 2", "Practical tip 3", "Practical tip 4", "Practical tip 5"],
  "nearbyPlaces": [
    {"name": "Nearby place", "distance": "XX km", "travelTime": "X hours by road"},
    {"name": "...", "distance": "...", "travelTime": "..."},
    {"name": "...", "distance": "...", "travelTime": "..."}
  ],
  "inDatabase": ${!!dbData},
  "tourismPotential": "low|medium|high|very_high",
  "category": "Heritage|Spiritual|Adventure|Beach|Nature|Cultural|Hill Station|Wildlife|Urban|Rural"
}`;
}

/* ── Owner Business Advice Prompt ────────────────────────── */
function ownerAdvicePrompt(message, context = {}) {
    let contextBlock = '';

    if (context.properties?.length) {
        contextBlock += `\n\n=== HOTEL OWNER'S PORTFOLIO ===\n`;
        context.properties.forEach((p, i) => {
            contextBlock += `${i + 1}. ${p.name} (${p.type || 'Hotel'}) — ${p.city || 'N/A'}, ${p.state || 'India'}\n`;
            if (p.starRating) contextBlock += `   Rating: ${p.starRating}★ | Price from: ₹${p.startingPrice || 'N/A'}/night\n`;
        });
    }

    if (context.stats) {
        const s = context.stats;
        contextBlock += `\n=== BUSINESS PERFORMANCE ===\n`;
        contextBlock += `Total Bookings: ${s.totalBookings || 0}\n`;
        contextBlock += `Revenue: ${s.revenue || '₹0'}\n`;
        contextBlock += `Pending Requests: ${s.pendingBookings || 0}\n`;
        if (s.avgRating) contextBlock += `Average Rating: ${s.avgRating}/5\n`;
        if (s.occupancyRate) contextBlock += `Occupancy Rate: ${s.occupancyRate}%\n`;
    }

    if (context.recentReviews?.length) {
        contextBlock += `\n=== RECENT GUEST REVIEWS ===\n`;
        context.recentReviews.slice(0, 5).forEach((r, i) => {
            contextBlock += `${i + 1}. [${r.rating || '?'}★] "${r.comment || r.review || 'No comment'}"\n`;
        });
    }

    if (context.recentBookings?.length) {
        contextBlock += `\n=== RECENT BOOKING PATTERNS ===\n`;
        contextBlock += `Recent ${context.recentBookings.length} bookings analyzed\n`;
    }

    return `Hotel Owner Question: ${message}
${contextBlock}

Provide specific, actionable business advice. Use ₹ for pricing. Reference actual seasons, Indian festivals, and market conditions. Format your response with clear sections and numbered action items.`;
}

/* ── Trending Market Intelligence Prompt ─────────────────── */
function trendingPrompt() {
    const now = new Date();
    const month = now.toLocaleString('en-IN', { month: 'long' });
    const year  = now.getFullYear();
    const season = getSeason(now.getMonth());

    return `Generate current travel market intelligence for India — ${month} ${year} (${season} season).

IMPORTANT: Return ONLY valid JSON, no markdown, no extra text.

{
  "trending": [
    {
      "name": "Destination name",
      "state": "Indian state",
      "region": "North/South/East/West/Northeast/Central India",
      "demand": "very_high|high|medium",
      "growth": "+XX% YoY",
      "season": "Best months e.g. Oct–Feb",
      "category": "Spiritual|Adventure|Heritage|Beach|Nature|Hill Station|Cultural|Wildlife",
      "whyTrending": "Specific reason this is trending right now in one sentence",
      "avgNightPrice": "₹X,XXX",
      "topAttractions": ["Attraction 1", "Attraction 2", "Attraction 3"]
    }
  ],
  "insights": [
    {
      "icon": "fa-chart-line|fa-fire|fa-plane|fa-hotel|fa-rupee-sign|fa-users|fa-leaf",
      "title": "Insight title (max 6 words)",
      "stat": "Key statistic e.g. +42% growth",
      "desc": "Two sentence explanation with specific data"
    }
  ],
  "seasonal": {
    "currentSeason": "${season}",
    "topDestinations": ["Dest 1", "Dest 2", "Dest 3", "Dest 4"],
    "upcomingFestivals": ["Festival and date", "Festival and date"],
    "priceAlert": "Price trend warning or opportunity for hotel owners",
    "ownerTip": "One specific actionable tip for hotel owners this season"
  },
  "propertyGaps": [
    {
      "destination": "Destination with high tourist demand but few/no listings",
      "state": "State",
      "gap": "What type of accommodation is missing",
      "estimatedDemand": "XX,XXX visitors/year",
      "potential": "high|very_high",
      "opportunity": "One sentence business opportunity"
    }
  ],
  "categories": [
    {"name": "Spiritual Tourism", "growth": "+XX%", "trend": "up|stable|emerging"},
    {"name": "Adventure Travel", "growth": "+XX%", "trend": "up|stable|emerging"},
    {"name": "Heritage Tourism", "growth": "+XX%", "trend": "up|stable|emerging"},
    {"name": "Eco-Tourism", "growth": "+XX%", "trend": "up|stable|emerging"},
    {"name": "Luxury Travel", "growth": "+XX%", "trend": "up|stable|emerging"}
  ]
}

Generate exactly 6 trending destinations, 4 insights, 1 seasonal block, 3 property gaps, 5 categories.`;
}

/* ── Destination Discovery Prompt ────────────────────────── */
function discoverPrompt(destination) {
    return `Analyze "${destination}" as a potential new destination to add to an Indian travel booking platform.

IMPORTANT: Return ONLY valid JSON, no markdown.

{
  "name": "Official name of the place",
  "isReal": true,
  "country": "Country",
  "state": "State (if India)",
  "category": "Spiritual|Adventure|Heritage|Beach|Nature|Hill Station|Cultural|Wildlife|Urban",
  "tourismPotential": "low|medium|high|very_high",
  "shouldAdd": true,
  "reason": "Why this destination has value for a travel platform — one specific sentence",
  "briefDesc": "2-3 compelling sentences about why travelers visit this place",
  "estimatedAnnualVisitors": "XX lakh visitors/year",
  "keyAttractions": ["Top attraction 1", "Top attraction 2", "Top attraction 3"],
  "suggestedListings": ["Hotel", "Dharamshala", "Resort", "Homestay", "Restaurant", "Attraction"],
  "bestAccommodationType": "What type of stay is most needed here",
  "avgStayDuration": "X–Y days",
  "targetAudience": ["Pilgrims", "Adventure seekers", "Families", "Backpackers", "Luxury travelers"],
  "nearbyMajorCity": "Nearest major city and distance",
  "growthTrend": "stable|growing|fast_growing"
}`;
}

/* ── Search Assist Prompt ────────────────────────────────── */
function searchAssistPrompt(query) {
    return `A user searched for "${query}" on a travel platform and got zero database results.

Determine if this is a real travel destination/hotel/place and provide helpful information.

IMPORTANT: Return ONLY valid JSON, no markdown.

{
  "isValidPlace": true,
  "type": "destination|city|hotel|attraction|region|country",
  "name": "Proper name",
  "country": "Country",
  "state": "State if India",
  "suggestion": "Helpful 2-3 sentence response about this place for the user",
  "canHelp": true,
  "recommendedAlternatives": ["Similar destination 1 on our platform", "Similar destination 2"],
  "quickFacts": ["Fact 1", "Fact 2", "Fact 3"],
  "bestFor": "Who this place is best suited for"
}`;
}

/* ── Admin Insights Prompt ───────────────────────────────── */
function adminInsightsPrompt(stats = {}) {
    const statsBlock = Object.keys(stats).length
        ? `\n\nPLATFORM STATISTICS:\n${JSON.stringify(stats, null, 2)}`
        : '';

    return `Generate AI-powered business insights for an Indian travel platform admin.${statsBlock}

IMPORTANT: Return ONLY valid JSON, no markdown.

{
  "summary": "2-3 sentence executive summary of platform health and opportunities",
  "topOpportunities": [
    {
      "title": "Opportunity title",
      "priority": "high|medium|low",
      "desc": "What the opportunity is and why it matters",
      "action": "Specific recommended action",
      "estimatedImpact": "e.g. +20% bookings in this category"
    }
  ],
  "missingDestinations": [
    {
      "name": "Destination name",
      "state": "State",
      "reason": "Why it should be added",
      "demand": "Estimated demand level"
    }
  ],
  "contentGaps": [
    {
      "category": "e.g. Dharamshalas in Uttarakhand",
      "gap": "Specific missing content",
      "priority": "high|medium"
    }
  ],
  "marketTrends": [
    {
      "trend": "Trend name",
      "impact": "How it affects the platform",
      "recommendation": "What to do about it"
    }
  ],
  "quickWins": ["Quick action 1 — specific and doable", "Quick action 2", "Quick action 3"]
}

Generate 3 opportunities, 4 missing destinations, 3 content gaps, 3 trends, 3 quick wins.`;
}

/* ── Helper: Get current season in India ─────────────────── */
function getSeason(monthIndex) {
    if (monthIndex >= 9 || monthIndex <= 1)  return 'Winter';
    if (monthIndex >= 2 && monthIndex <= 4)  return 'Summer';
    if (monthIndex >= 5 && monthIndex <= 8)  return 'Monsoon';
    return 'Autumn';
}

module.exports = {
    TRAVEL_EXPERT_SYSTEM,
    BUSINESS_ADVISOR_SYSTEM,
    ADMIN_ANALYST_SYSTEM,
    destinationPrompt,
    ownerAdvicePrompt,
    trendingPrompt,
    discoverPrompt,
    searchAssistPrompt,
    adminInsightsPrompt,
};
