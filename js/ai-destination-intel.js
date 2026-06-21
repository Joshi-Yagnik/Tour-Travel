/* ============================================================
   WANDERLUST — AI Destination Intelligence v1.0
   Provides inline AI-powered destination cards when DB search
   returns no results. Embeddable in any page.
   Usage: window.WL_AI.searchDestination(query, containerId)
   ============================================================ */

(function () {
    'use strict';

    /* ── Card CSS (injected once) ────────────────────────────── */
    if (!document.getElementById('wl-ai-intel-style')) {
        const style = document.createElement('style');
        style.id = 'wl-ai-intel-style';
        style.textContent = `
            .ai-intel-banner {
                background: linear-gradient(135deg, #1A1A2E, #0F3460);
                border: 1px solid rgba(99,102,241,0.35);
                border-radius: 16px;
                padding: 0;
                overflow: hidden;
                margin: 0 auto;
                max-width: 900px;
                animation: aiCardIn 0.4s cubic-bezier(.34,1.56,.64,1);
            }
            @keyframes aiCardIn {
                from { opacity: 0; transform: translateY(12px) scale(0.98); }
                to   { opacity: 1; transform: none; }
            }

            .ai-intel-hero {
                padding: 24px 28px;
                background: linear-gradient(135deg, rgba(99,102,241,0.15), rgba(99,102,241,0.05));
                border-bottom: 1px solid rgba(99,102,241,0.2);
                display: flex; align-items: flex-start; gap: 16px;
            }
            .ai-intel-hero-icon {
                width: 52px; height: 52px; border-radius: 14px;
                background: linear-gradient(135deg, #6366F1, #818CF8);
                display: flex; align-items: center; justify-content: center;
                font-size: 22px; flex-shrink: 0;
                box-shadow: 0 6px 20px rgba(99,102,241,0.35);
            }
            .ai-intel-hero-text { flex: 1; }
            .ai-intel-ai-badge {
                display: inline-flex; align-items: center; gap: 5px;
                font-size: 10px; font-weight: 800; letter-spacing: 0.06em;
                background: linear-gradient(135deg, #6366F1, #818CF8);
                color: white; padding: 3px 10px; border-radius: 20px;
                margin-bottom: 8px;
            }
            .ai-intel-name {
                font-size: 1.5rem; font-weight: 800; color: #fff;
                margin: 0 0 6px;
            }
            .ai-intel-tagline {
                font-size: 0.88rem; color: rgba(255,255,255,0.65); margin: 0;
            }
            .ai-intel-not-db {
                font-size: 0.75rem; color: rgba(255,107,53,0.9);
                background: rgba(255,107,53,0.1); border: 1px solid rgba(255,107,53,0.2);
                border-radius: 20px; padding: 3px 10px;
                display: inline-flex; align-items: center; gap: 5px; margin-top: 8px;
            }

            .ai-intel-body {
                display: grid;
                grid-template-columns: 2fr 1fr;
                gap: 0;
            }
            @media (max-width: 680px) {
                .ai-intel-body { grid-template-columns: 1fr; }
            }

            .ai-intel-main { padding: 22px 28px; border-right: 1px solid rgba(255,255,255,0.07); }
            .ai-intel-sidebar { padding: 22px 20px; }

            .ai-intel-section { margin-bottom: 18px; }
            .ai-intel-section-title {
                font-size: 0.7rem; font-weight: 800; letter-spacing: 0.08em;
                text-transform: uppercase; color: #6366F1; margin-bottom: 8px;
            }
            .ai-intel-about {
                font-size: 0.85rem; color: rgba(255,255,255,0.7);
                line-height: 1.65; margin: 0;
            }

            .ai-intel-attractions {
                display: flex; flex-direction: column; gap: 6px;
            }
            .ai-attr-item {
                display: flex; align-items: flex-start; gap: 8px;
                padding: 8px 10px;
                background: rgba(255,255,255,0.04);
                border: 1px solid rgba(255,255,255,0.07);
                border-radius: 8px;
            }
            .ai-attr-icon {
                width: 28px; height: 28px; border-radius: 7px; flex-shrink: 0;
                background: rgba(99,102,241,0.15);
                display: flex; align-items: center; justify-content: center;
                font-size: 12px; color: #818CF8;
            }
            .ai-attr-name { font-size: 0.8rem; font-weight: 600; color: #fff; }
            .ai-attr-desc { font-size: 0.73rem; color: rgba(255,255,255,0.55); }

            .ai-intel-tags { display: flex; flex-wrap: wrap; gap: 6px; }
            .ai-tag {
                font-size: 0.73rem; padding: 4px 10px; border-radius: 20px;
                border: 1px solid rgba(255,255,255,0.1);
                color: rgba(255,255,255,0.7);
                background: rgba(255,255,255,0.04);
            }

            .ai-budget-grid {
                display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px;
            }
            .ai-budget-item {
                text-align: center; padding: 8px 6px;
                background: rgba(255,255,255,0.04);
                border: 1px solid rgba(255,255,255,0.07);
                border-radius: 8px;
            }
            .ai-budget-tier { font-size: 0.62rem; color: rgba(255,255,255,0.4); text-transform: uppercase; margin-bottom: 4px; }
            .ai-budget-val { font-size: 0.72rem; font-weight: 700; color: #10B981; }

            .ai-intel-footer {
                padding: 14px 28px;
                border-top: 1px solid rgba(255,255,255,0.07);
                display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;
            }
            .ai-intel-footer-note { font-size: 0.72rem; color: rgba(255,255,255,0.35); }
            .ai-intel-ctas { display: flex; gap: 8px; }
            .ai-cta-btn {
                font-size: 0.78rem; font-weight: 600;
                padding: 7px 14px; border-radius: 8px;
                cursor: pointer; border: none; transition: all 0.2s;
            }
            .ai-cta-btn--primary {
                background: linear-gradient(135deg, #FF6B35, #E5521C);
                color: white;
            }
            .ai-cta-btn--primary:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(255,107,53,0.4); }
            .ai-cta-btn--ghost {
                background: rgba(255,255,255,0.07);
                border: 1px solid rgba(255,255,255,0.12);
                color: rgba(255,255,255,0.7);
            }
            .ai-cta-btn--ghost:hover { background: rgba(255,255,255,0.12); color: white; }

            /* Loading state */
            .ai-intel-loading {
                text-align: center; padding: 40px 20px;
                background: linear-gradient(135deg, #1A1A2E, #0F3460);
                border: 1px solid rgba(99,102,241,0.3);
                border-radius: 16px;
                color: rgba(255,255,255,0.6); font-size: 0.88rem;
            }
            .ai-intel-loading .ai-spinner {
                width: 36px; height: 36px;
                border: 3px solid rgba(99,102,241,0.2);
                border-top-color: #6366F1;
                border-radius: 50%;
                animation: aiSpin 0.8s linear infinite;
                margin: 0 auto 14px;
            }
            @keyframes aiSpin { to { transform: rotate(360deg); } }

            /* Zero-results wrapper */
            .ai-zero-wrap {
                padding: 32px 20px;
                text-align: center;
            }
            .ai-zero-title {
                font-size: 1.1rem; font-weight: 700;
                color: var(--text-dark, #1A202C);
                margin-bottom: 6px;
            }
            .ai-zero-sub {
                font-size: 0.85rem; color: var(--text-muted, #718096);
                margin-bottom: 20px;
            }
        `;
        document.head.appendChild(style);
    }

    /* ── Attraction type icon map ─────────────────────────────── */
    const ATTR_ICONS = {
        temple: 'fa-place-of-worship', beach: 'fa-umbrella-beach',
        fort: 'fa-chess-rook', market: 'fa-store', nature: 'fa-tree',
        museum: 'fa-landmark', palace: 'fa-chess-rook', waterfall: 'fa-water',
        mountain: 'fa-mountain', lake: 'fa-water', garden: 'fa-leaf',
        default: 'fa-map-pin',
    };

    function attrIcon(type) {
        return ATTR_ICONS[type?.toLowerCase()] || ATTR_ICONS.default;
    }

    /* ── Build the destination card HTML ─────────────────────── */
    function buildCard(d, query) {
        const notInDb = !d.inDatabase;
        return `
            <div class="ai-intel-banner">
                <div class="ai-intel-hero">
                    <div class="ai-intel-hero-icon">🌍</div>
                    <div class="ai-intel-hero-text">
                        <div class="ai-intel-ai-badge"><i class="fas fa-robot"></i> AI Destination Intelligence</div>
                        <h2 class="ai-intel-name">${d.name || query}</h2>
                        <p class="ai-intel-tagline">${d.tagline || ''}</p>
                        ${notInDb ? `<div class="ai-intel-not-db"><i class="fas fa-info-circle"></i> Not yet listed on Wanderlust — AI-generated information</div>` : ''}
                    </div>
                </div>

                <div class="ai-intel-body">
                    <div class="ai-intel-main">
                        ${d.about ? `
                        <div class="ai-intel-section">
                            <div class="ai-intel-section-title">About</div>
                            <p class="ai-intel-about">${d.about}</p>
                        </div>` : ''}

                        ${d.attractions?.length ? `
                        <div class="ai-intel-section">
                            <div class="ai-intel-section-title">Top Attractions</div>
                            <div class="ai-intel-attractions">
                                ${d.attractions.slice(0, 4).map(a => `
                                    <div class="ai-attr-item">
                                        <div class="ai-attr-icon"><i class="fas ${attrIcon(a.type)}"></i></div>
                                        <div>
                                            <div class="ai-attr-name">${typeof a === 'string' ? a : a.name}</div>
                                            ${a.desc ? `<div class="ai-attr-desc">${a.desc}</div>` : ''}
                                        </div>
                                    </div>`).join('')}
                            </div>
                        </div>` : ''}

                        ${d.food?.length ? `
                        <div class="ai-intel-section">
                            <div class="ai-intel-section-title">Local Food & Cuisine</div>
                            <div class="ai-intel-tags">${d.food.map(f => `<span class="ai-tag">🍽️ ${f}</span>`).join('')}</div>
                        </div>` : ''}
                    </div>

                    <div class="ai-intel-sidebar">
                        ${d.bestTime ? `
                        <div class="ai-intel-section">
                            <div class="ai-intel-section-title">Best Time to Visit</div>
                            <div style="font-size:0.8rem;color:rgba(255,255,255,0.7)">📅 ${d.bestTime}</div>
                        </div>` : ''}

                        ${d.budget ? `
                        <div class="ai-intel-section">
                            <div class="ai-intel-section-title">Estimated Budget</div>
                            <div class="ai-budget-grid">
                                <div class="ai-budget-item"><div class="ai-budget-tier">Budget</div><div class="ai-budget-val">${d.budget.budget}</div></div>
                                <div class="ai-budget-item"><div class="ai-budget-tier">Mid</div><div class="ai-budget-val">${d.budget.midRange}</div></div>
                                <div class="ai-budget-item"><div class="ai-budget-tier">Luxury</div><div class="ai-budget-val">${d.budget.luxury}</div></div>
                            </div>
                        </div>` : ''}

                        ${d.transport?.length ? `
                        <div class="ai-intel-section">
                            <div class="ai-intel-section-title">How to Reach</div>
                            <div class="ai-intel-tags">${d.transport.map(t => `<span class="ai-tag">🚌 ${t}</span>`).join('')}</div>
                        </div>` : ''}

                        ${d.nearbyPlaces?.length ? `
                        <div class="ai-intel-section">
                            <div class="ai-intel-section-title">Nearby Places</div>
                            <div class="ai-intel-tags">${d.nearbyPlaces.map(p => `<span class="ai-tag">📍 ${p}</span>`).join('')}</div>
                        </div>` : ''}

                        ${d.tips?.length ? `
                        <div class="ai-intel-section">
                            <div class="ai-intel-section-title">Travel Tips</div>
                            ${d.tips.slice(0, 3).map(t => `<div style="font-size:0.75rem;color:rgba(255,255,255,0.6);margin-bottom:5px">💡 ${t}</div>`).join('')}
                        </div>` : ''}
                    </div>
                </div>

                <div class="ai-intel-footer">
                    <span class="ai-intel-footer-note"><i class="fas fa-robot"></i> Powered by WanderBot AI · Information may vary</span>
                    <div class="ai-intel-ctas">
                        <button class="ai-cta-btn ai-cta-btn--ghost" onclick="window.WL_AI.openChat('${(d.name || query).replace(/'/g, "\\'")} travel guide')">
                            <i class="fas fa-comments"></i> Ask WanderBot
                        </button>
                        <button class="ai-cta-btn ai-cta-btn--primary" onclick="window.WL_AI.openChat('Plan a trip to ${(d.name || query).replace(/'/g, "\\'")} for me')">
                            <i class="fas fa-map-marked-alt"></i> Plan My Trip
                        </button>
                    </div>
                </div>
            </div>`;
    }

    /* ── Main API ─────────────────────────────────────────────── */
    window.WL_AI = {
        /**
         * Search a destination and render an AI card into the given container.
         * @param {string} query - The destination / search term
         * @param {string|HTMLElement} container - Container element or its ID
         * @param {object} dbData - Optional: existing DB data if any
         */
        async searchDestination(query, container, dbData = null) {
            const el = typeof container === 'string' ? document.getElementById(container) : container;
            if (!el || !query) return;

            // Show loading state
            el.innerHTML = `
                <div class="ai-intel-loading">
                    <div class="ai-spinner"></div>
                    <div><strong>AI is researching "${query}"...</strong></div>
                    <div style="margin-top:6px;font-size:0.78rem">Gathering destination intelligence from global knowledge</div>
                </div>`;

            try {
                const res = await fetch('/api/ai/destination', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ destination: query, dbData }),
                });
                const data = await res.json();

                if (data.success && data.data) {
                    el.innerHTML = buildCard(data.data, query);
                } else {
                    el.innerHTML = '';
                }
            } catch (err) {
                el.innerHTML = '';
                console.warn('WL_AI: destination search failed', err);
            }
        },

        /**
         * Show a zero-results AI prompt banner.
         */
        showZeroResultsBanner(query, container) {
            const el = typeof container === 'string' ? document.getElementById(container) : container;
            if (!el) return;

            el.innerHTML = `
                <div class="ai-zero-wrap">
                    <div style="font-size:2.5rem;margin-bottom:10px">🤖</div>
                    <div class="ai-zero-title">No results found for "${query}"</div>
                    <div class="ai-zero-sub">But our AI knows about it! Let WanderBot pull up information about this destination.</div>
                    <button class="ai-cta-btn ai-cta-btn--primary" style="margin:0 auto;display:flex;align-items:center;gap:8px"
                        onclick="window.WL_AI.searchDestination('${query.replace(/'/g, "\\'")}', this.closest('.ai-zero-wrap').parentElement)">
                        <i class="fas fa-robot"></i> Get AI Destination Intelligence
                    </button>
                </div>`;
        },

        /**
         * Open the WanderBot chatbot with a pre-filled message.
         */
        openChat(message) {
            // Open the chatbot widget if available
            const bubble = document.getElementById('ai-bubble');
            const panel  = document.getElementById('ai-panel');
            const input  = document.getElementById('ai-input');

            if (bubble && panel) {
                if (!panel.classList.contains('visible')) {
                    bubble.click();
                }
                setTimeout(() => {
                    if (input && message) {
                        input.value = message;
                        input.dispatchEvent(new Event('input'));
                        input.focus();
                    }
                }, 300);
            }
        },
    };

})();
