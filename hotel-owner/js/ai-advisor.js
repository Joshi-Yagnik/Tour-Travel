/* ============================================================
   WANDERLUST — Hotel Owner AI Business Advisor v1.0
   Dedicated AI intelligence module for the Partner Hub
   Handles: Business chat, Trending insights, Property discovery
   ============================================================ */

'use strict';

/* ─────────────────────────────────────────────────────────
   OWNER ADVISOR CHAT
───────────────────────────────────────────────────────── */
let advisorHistory = [];
let advisorTyping  = false;

const OWNER_QUICK_PROMPTS = [
    '📊 Analyze my reviews and give business insights',
    '💰 Suggest pricing for peak and off-season',
    '🛎️ What amenities should I add to increase bookings?',
    '📍 Which destination should I expand my business to?',
    '⭐ How can I improve my hotel rating?',
    '📱 How do I increase my online visibility?',
    '🗓️ What are the peak booking periods I should prepare for?',
    '💡 Give me tips to attract more guests this month',
];

async function loadOwnerAdvisor() {
    const container = document.getElementById('ai-advisor-view');
    if (!container) return;

    // Load trending insights and property discovery in parallel
    await Promise.all([loadTrendingInsights(), loadPropertyDiscovery()]);
    initAdvisorChat();
}

function initAdvisorChat() {
    // Render quick prompts
    const chipsEl = document.getElementById('advisor-chips');
    if (chipsEl && chipsEl.children.length === 0) {
        OWNER_QUICK_PROMPTS.forEach(prompt => {
            const btn = document.createElement('button');
            btn.className = 'advisor-chip';
            btn.textContent = prompt;
            btn.addEventListener('click', () => sendAdvisorMessage(prompt));
            chipsEl.appendChild(btn);
        });
    }

    // Welcome message if chat is empty
    const msgArea = document.getElementById('advisor-messages');
    if (msgArea && msgArea.children.length === 0) {
        const user = APP?.user;
        const propCount = APP?.hotels?.length || 0;
        const welcome = `👋 Hello${user?.name ? `, **${user.name.split(' ')[0]}**` : ''}! I'm your **AI Business Advisor**.

I have access to your property data and can help you:
• 📈 Optimize revenue and pricing
• ⭐ Improve guest experience and ratings  
• 📍 Identify new business opportunities
• 🎯 Boost bookings and visibility

${propCount > 0 ? `I can see you have **${propCount} propert${propCount > 1 ? 'ies' : 'y'}** listed. ` : ''}What would you like help with today?`;
        addAdvisorMessage('bot', welcome);
    }
}

function addAdvisorMessage(role, content) {
    const msgArea = document.getElementById('advisor-messages');
    if (!msgArea) return;

    const div = document.createElement('div');
    div.className = `adv-msg adv-msg--${role}`;
    const icon = role === 'bot' ? '🤖' : (APP?.user?.name?.[0]?.toUpperCase() || '👤');
    div.innerHTML = `
        <div class="adv-msg__avatar">${icon}</div>
        <div class="adv-msg__bubble">${formatAdvisorMarkdown(content)}</div>
    `;
    msgArea.appendChild(div);
    msgArea.scrollTop = msgArea.scrollHeight;
    return div;
}

function formatAdvisorMarkdown(text) {
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code style="background:rgba(255,255,255,0.1);padding:1px 6px;border-radius:3px;font-family:monospace">$1</code>')
        .replace(/\n/g, '<br>')
        .replace(/• /g, '&bull; ');
}

function showAdvisorTyping() {
    const msgArea = document.getElementById('advisor-messages');
    if (!msgArea) return;
    const el = document.createElement('div');
    el.className = 'adv-msg adv-msg--bot';
    el.id = 'adv-typing';
    el.innerHTML = `
        <div class="adv-msg__avatar">🤖</div>
        <div class="adv-msg__bubble adv-typing">
            <span></span><span></span><span></span>
        </div>`;
    msgArea.appendChild(el);
    msgArea.scrollTop = msgArea.scrollHeight;
}

function hideAdvisorTyping() {
    document.getElementById('adv-typing')?.remove();
}

async function sendAdvisorMessage(textOverride) {
    const inputEl = document.getElementById('advisor-input');
    const message = (textOverride || inputEl?.value || '').trim();
    if (!message || advisorTyping) return;

    if (inputEl) inputEl.value = '';
    advisorTyping = true;

    const sendBtn = document.getElementById('advisor-send');
    if (sendBtn) sendBtn.disabled = true;

    // Hide quick prompts after first message
    const chipsWrap = document.getElementById('advisor-chips-wrap');
    if (chipsWrap) chipsWrap.style.display = 'none';

    addAdvisorMessage('user', message);
    advisorHistory.push({ role: 'user', content: message });
    showAdvisorTyping();

    try {
        // Build rich owner context
        const ownerContext = {
            properties: (APP?.hotels || []).map(h => ({
                name: h.name, type: h.type, city: h.city || h.location?.city,
                state: h.state || h.location?.state, starRating: h.starRating,
                startingPrice: h.startingPrice,
            })),
            stats: {
                totalBookings:   document.getElementById('kpi-bookings')?.textContent || 0,
                pendingBookings: document.getElementById('kpi-pending')?.textContent || 0,
                revenue:         document.getElementById('kpi-revenue')?.textContent?.replace(/[₹,]/g, '') || 0,
            },
            recentReviews: APP?.reviews?.slice(0, 3) || [],
        };

        const token = WL.Session.getToken();
        const res = await fetch('/api/ai/owner-advisor', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ message, history: advisorHistory.slice(-8), ownerContext }),
        });

        const data = await res.json();
        hideAdvisorTyping();

        if (data.success) {
            addAdvisorMessage('bot', data.response);
            advisorHistory.push({ role: 'bot', content: data.response });
        } else {
            addAdvisorMessage('bot', '❌ Sorry, I encountered an issue. Please try again.');
        }
    } catch (err) {
        hideAdvisorTyping();
        addAdvisorMessage('bot', '🌐 Connection issue. Please check your internet and try again.');
    } finally {
        advisorTyping = false;
        if (sendBtn) sendBtn.disabled = false;
        if (inputEl) inputEl.focus();
    }
}

/* ─────────────────────────────────────────────────────────
   TRENDING INSIGHTS
───────────────────────────────────────────────────────── */
async function loadTrendingInsights() {
    const container = document.getElementById('trending-grid');
    const insightsEl = document.getElementById('market-insights-grid');
    const seasonEl   = document.getElementById('seasonal-tip');

    if (container) {
        container.innerHTML = `
            ${[1,2,3,4,5,6].map(() => `
            <div class="trend-card trend-card--skeleton">
                <div class="skel skel-h"></div>
                <div class="skel skel-t"></div>
                <div class="skel skel-t skel-t--sm"></div>
            </div>`).join('')}`;
    }

    try {
        const res  = await fetch('/api/ai/trending');
        const data = await res.json();

        if (!data.success) throw new Error('Failed to load');

        const d = data.data;

        // Render trending destinations
        if (container && d.trending) {
            const demandColor = { very_high: '#10B981', high: '#F59E0B', medium: '#6366F1', low: '#9CA3AF' };
            container.innerHTML = d.trending.map(t => `
                <div class="trend-card">
                    <div class="trend-card__top">
                        <div class="trend-card__name">${t.name}</div>
                        <span class="trend-badge" style="background:${demandColor[t.demand] || '#6366F1'}15;color:${demandColor[t.demand] || '#6366F1'};border:1px solid ${demandColor[t.demand] || '#6366F1'}40">
                            ${t.growth || '↑ Trending'}
                        </span>
                    </div>
                    <div class="trend-card__region"><i class="fas fa-map-marker-alt"></i> ${t.region}</div>
                    <div class="trend-card__category"><i class="fas fa-tag"></i> ${t.category}</div>
                    <div class="trend-card__desc">${t.desc}</div>
                    <div class="trend-card__season"><i class="fas fa-calendar"></i> Best: ${t.season}</div>
                    <button class="trend-card__cta" onclick="suggestAddProperty('${t.name}', '${t.region}')">
                        <i class="fas fa-plus-circle"></i> Add Property Here
                    </button>
                </div>`).join('');
        }

        // Render market insights
        if (insightsEl && d.insights) {
            insightsEl.innerHTML = d.insights.map(ins => `
                <div class="insight-card">
                    <div class="insight-icon"><i class="fas ${ins.icon}"></i></div>
                    <div class="insight-body">
                        <div class="insight-title">${ins.title}</div>
                        <div class="insight-desc">${ins.desc}</div>
                    </div>
                </div>`).join('');
        }

        // Seasonal tip
        if (seasonEl && d.seasonal) {
            const s = d.seasonal;
            seasonEl.innerHTML = `
                <div class="seasonal-banner">
                    <div class="seasonal-icon"><i class="fas fa-sun"></i></div>
                    <div class="seasonal-content">
                        <div class="seasonal-label">Coming Up: ${s.upcomingSeason}</div>
                        <div class="seasonal-spots">Hot spots: ${(s.upcomingHotspots || []).join(' · ')}</div>
                        <div class="seasonal-tip">💡 ${s.tip}</div>
                    </div>
                </div>`;
        }

    } catch (err) {
        if (container) container.innerHTML = `<div class="adv-empty"><i class="fas fa-wifi-slash"></i><p>Could not load trending data. Please try again.</p></div>`;
    }
}

/* ─────────────────────────────────────────────────────────
   PROPERTY DISCOVERY
───────────────────────────────────────────────────────── */
async function loadPropertyDiscovery() {
    const container = document.getElementById('discovery-grid');
    if (!container) return;

    container.innerHTML = `<div class="adv-empty"><div class="spinner"></div><p>AI is scanning for opportunities...</p></div>`;

    try {
        const res  = await fetch('/api/ai/trending');
        const data = await res.json();

        if (!data.success || !data.data?.propertyGaps) throw new Error('No data');

        const gaps = data.data.propertyGaps;
        if (!gaps.length) {
            container.innerHTML = `<div class="adv-empty"><i class="fas fa-check-circle"></i><p>Platform has good coverage. Check back later for new opportunities.</p></div>`;
            return;
        }

        const potColor = { very_high: '#10B981', high: '#F59E0B', medium: '#6366F1' };
        container.innerHTML = gaps.map(g => `
            <div class="discovery-card">
                <div class="discovery-card__header">
                    <div>
                        <div class="discovery-card__name">${g.destination}</div>
                        <div class="discovery-card__state">${g.state}</div>
                    </div>
                    <span class="pot-badge" style="background:${potColor[g.potential] || '#6366F1'}20;color:${potColor[g.potential] || '#6366F1'}">
                        ${g.potential.replace('_', ' ').toUpperCase()} POTENTIAL
                    </span>
                </div>
                <div class="discovery-card__gap"><i class="fas fa-exclamation-circle"></i> ${g.gap}</div>
                <button class="btn-primary" style="width:100%;margin-top:12px;font-size:0.8rem" 
                    onclick="suggestAddProperty('${g.destination}', '${g.state}')">
                    <i class="fas fa-plus"></i> Add a Property Here
                </button>
            </div>`).join('');

    } catch (err) {
        container.innerHTML = `<div class="adv-empty"><i class="fas fa-robot"></i><p>Discovery data will appear here. Configure AI for live insights.</p></div>`;
    }
}

/* ─────────────────────────────────────────────────────────
   DESTINATION DISCOVERY SEARCH (in AI Advisor)
───────────────────────────────────────────────────────── */
async function searchDestinationForOwner() {
    const input = document.getElementById('discover-search-input');
    const dest  = input?.value?.trim();
    const resultEl = document.getElementById('discover-search-result');

    if (!dest) return;
    if (resultEl) resultEl.innerHTML = `<div class="adv-empty"><div class="spinner"></div><p>AI is analyzing "${dest}"...</p></div>`;

    try {
        const res  = await fetch('/api/ai/discover', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ destination: dest }),
        });
        const data = await res.json();

        if (!data.success) throw new Error('Failed');

        const d = data.data;
        if (resultEl) {
            resultEl.innerHTML = `
                <div class="discover-result-card">
                    <div class="discover-result-header">
                        <div>
                            <div class="discover-result-name">${d.name || dest}</div>
                            <div class="discover-result-loc">${d.state ? `${d.state}, ` : ''}${d.country || 'India'}</div>
                        </div>
                        <span class="discover-result-cat">${d.category || 'Destination'}</span>
                    </div>
                    <p class="discover-result-desc">${d.briefDesc || ''}</p>
                    ${d.keyAttractions?.length ? `<div class="discover-result-attrs">${d.keyAttractions.map(a => `<span class="attr-tag"><i class="fas fa-landmark"></i> ${a}</span>`).join('')}</div>` : ''}
                    <div class="discover-result-meta">
                        <span><i class="fas fa-users"></i> ${d.estimatedDemand || 'Growing'} visitors</span>
                        <span><i class="fas fa-chart-line"></i> ${d.tourismPotential?.replace('_', ' ')} potential</span>
                    </div>
                    ${d.shouldAdd ? `
                    <div class="discover-result-suggest">
                        <div class="suggest-label">Suggested property types to add:</div>
                        <div class="suggest-types">${(d.suggestedListings || ['Hotel']).map(t => `<span class="suggest-type-tag">${t}</span>`).join('')}</div>
                        <button class="btn-primary" style="margin-top:12px;width:100%" onclick="suggestAddProperty('${d.name || dest}', '${d.state || ''}')">
                            <i class="fas fa-plus-circle"></i> Add a Property in ${d.name || dest}
                        </button>
                    </div>` : '<div class="discover-result-nope">This destination may not be suitable for property listings at this time.</div>'}
                </div>`;
        }
    } catch (err) {
        if (resultEl) resultEl.innerHTML = `<div class="adv-empty"><i class="fas fa-exclamation-triangle"></i><p>Could not analyze this destination. Please try again.</p></div>`;
    }
}

function suggestAddProperty(destinationName, region) {
    // Navigate to properties view and pre-fill the add form
    APP.navigate('properties');
    setTimeout(() => {
        openPropertyForm();
        setTimeout(() => {
            const cityInput  = document.getElementById('prop-city');
            const stateInput = document.getElementById('prop-state');
            if (cityInput && destinationName)  cityInput.value  = destinationName;
            if (stateInput && region)           stateInput.value = region;
            toast(`📍 Opening property form for ${destinationName}`, 'info');
        }, 400);
    }, 300);
}

/* ─────────────────────────────────────────────────────────
   EXPOSE GLOBALLY
───────────────────────────────────────────────────────── */
window.loadOwnerAdvisor        = loadOwnerAdvisor;
window.sendAdvisorMessage      = sendAdvisorMessage;
window.loadTrendingInsights    = loadTrendingInsights;
window.loadPropertyDiscovery   = loadPropertyDiscovery;
window.searchDestinationForOwner = searchDestinationForOwner;
window.suggestAddProperty      = suggestAddProperty;
