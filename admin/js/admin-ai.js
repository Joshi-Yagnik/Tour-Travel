/* ============================================================
   WANDERLUST ADMIN — AI Insights Module v1.0
   Powered by Groq (Llama 3.3 70B)
   ============================================================ */

'use strict';

/* ── Wire AI Insights tab into admin navigation ───────────── */
(function patchAdminNav() {
    document.addEventListener('DOMContentLoaded', () => {
        const navLink = document.getElementById('nav-ai-insights');
        if (!navLink) return;

        navLink.addEventListener('click', (e) => {
            e.preventDefault();
            // Hide all other tabs
            document.querySelectorAll('.admin-tab').forEach(t => t.style.display = 'none');
            document.querySelectorAll('.admin-nav__link').forEach(l => l.classList.remove('active'));
            // Show AI tab
            const tab = document.getElementById('tab-ai-insights');
            if (tab) tab.style.display = 'block';
            navLink.classList.add('active');
            // Load content if empty
            if (!tab.dataset.loaded) {
                tab.dataset.loaded = 'true';
                loadAIProviderStatus();
                loadAIInsights();
            }
        });
    });
})();

/* ── Check AI provider status ─────────────────────────────── */
async function loadAIProviderStatus() {
    try {
        const res  = await fetch('/api/ai/status');
        const data = await res.json();
        const el   = document.getElementById('ai-provider-text');
        if (el && data.status) {
            const s = data.status;
            el.textContent = s.fallback
                ? '⚠️ No AI provider — add GROQ_API_KEY'
                : `${s.active} · Active`;
        }
    } catch (e) {}
}

/* ── Load full AI insights ────────────────────────────────── */
async function loadAIInsights() {
    showLoading();

    try {
        const token = window.WL?.Session?.getToken?.() || localStorage.getItem('token');
        
        // Gather platform stats from the correct admin endpoint
        let stats = {};
        try {
            const statsRes = await fetch('/api/admin/stats', {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (statsRes.ok) {
                const d = await statsRes.json();
                // admin/stats returns counts for hotels, users, bookings, etc.
                stats = d.data || d.stats || d || {};
            }
        } catch (e) { /* stats are optional — AI still works without them */ }

        const res = await fetch('/api/ai/admin-insights', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ stats }),
        });

        const data = await res.json();

        if (data.success && data.data) {
            renderInsights(data.data);
        } else {
            showError('Could not load AI insights. Please try again.');
        }

    } catch (err) {
        showError('Connection error. Please check your internet connection.');
        console.error('[Admin AI] Error:', err);
    }

    // Also load trending
    loadTrendingData();
}

/* ── Render all insight sections ─────────────────────────── */
function renderInsights(d) {
    // Summary banner
    const summaryEl = document.getElementById('ai-summary-text');
    if (summaryEl && d.summary) summaryEl.innerHTML = `<strong>🧠 AI Summary:</strong> ${d.summary}`;
    const bannerEl = document.getElementById('ai-summary-banner');
    if (bannerEl) bannerEl.style.borderColor = 'rgba(99,102,241,0.4)';

    // Opportunities
    const oppEl = document.getElementById('ai-opp-grid');
    if (oppEl && d.topOpportunities) {
        const colors = { high: '#EF4444', medium: '#F59E0B', low: '#10B981' };
        oppEl.innerHTML = d.topOpportunities.map(o => `
            <div class="ai-opp-card">
                <div class="ai-opp-header">
                    <div class="ai-opp-title">${o.title}</div>
                    <span class="ai-priority-badge" style="background:${colors[o.priority]}20;color:${colors[o.priority]};border-color:${colors[o.priority]}40">
                        ${o.priority?.toUpperCase()}
                    </span>
                </div>
                <div class="ai-opp-desc">${o.desc}</div>
                <div class="ai-opp-action"><i class="fas fa-bolt"></i> ${o.action}</div>
                ${o.estimatedImpact ? `<div class="ai-opp-impact"><i class="fas fa-chart-line"></i> ${o.estimatedImpact}</div>` : ''}
            </div>`).join('');
    }

    // Missing destinations
    const missingEl = document.getElementById('ai-missing-destinations');
    if (missingEl && d.missingDestinations) {
        missingEl.innerHTML = d.missingDestinations.map(m => `
            <div class="ai-list-item">
                <div class="ai-list-icon"><i class="fas fa-map-marker-alt"></i></div>
                <div>
                    <div class="ai-list-title">${m.name}${m.state ? `, ${m.state}` : ''}</div>
                    <div class="ai-list-desc">${m.reason}</div>
                    <div class="ai-list-meta">${m.demand || 'High'} demand</div>
                </div>
            </div>`).join('');
    }

    // Content gaps
    const gapsEl = document.getElementById('ai-content-gaps');
    if (gapsEl && d.contentGaps) {
        const gapColor = { high: '#EF4444', medium: '#F59E0B' };
        gapsEl.innerHTML = d.contentGaps.map(g => `
            <div class="ai-list-item">
                <div class="ai-list-icon" style="background:${gapColor[g.priority] || '#6366F1'}20;color:${gapColor[g.priority] || '#6366F1'}">
                    <i class="fas fa-exclamation-circle"></i>
                </div>
                <div>
                    <div class="ai-list-title">${g.category}</div>
                    <div class="ai-list-desc">${g.gap}</div>
                    <div class="ai-list-meta">Priority: ${g.priority?.toUpperCase()}</div>
                </div>
            </div>`).join('');
    }

    // Market trends
    const trendsEl = document.getElementById('ai-trends-grid');
    if (trendsEl && d.marketTrends) {
        trendsEl.innerHTML = d.marketTrends.map(t => `
            <div class="ai-trend-card">
                <div class="ai-trend-name"><i class="fas fa-arrow-trend-up"></i> ${t.trend}</div>
                <div class="ai-trend-impact">${t.impact}</div>
                <div class="ai-trend-rec"><strong>→</strong> ${t.recommendation}</div>
            </div>`).join('');
    }

    // Quick wins
    const winsEl = document.getElementById('ai-quickwins');
    if (winsEl && d.quickWins) {
        winsEl.innerHTML = d.quickWins.map((w, i) => `
            <div class="ai-win-item">
                <div class="ai-win-num">${i + 1}</div>
                <div class="ai-win-text">${w}</div>
            </div>`).join('');
    }
}

/* ── Load trending destinations ──────────────────────────── */
async function loadTrendingData() {
    const el = document.getElementById('ai-trending-grid');
    if (!el) return;
    el.innerHTML = `<div class="ai-skeleton-row"></div><div class="ai-skeleton-row"></div><div class="ai-skeleton-row"></div>`;

    try {
        const res  = await fetch('/api/ai/trending');
        const data = await res.json();

        if (!data.success || !data.data?.trending) throw new Error('No data');

        const demandBg = { very_high: '#10B98115', high: '#F59E0B15', medium: '#6366F115' };
        const demandColor = { very_high: '#10B981', high: '#F59E0B', medium: '#6366F1' };

        el.innerHTML = data.data.trending.map(t => `
            <div class="ai-dest-card">
                <div class="ai-dest-header">
                    <div>
                        <div class="ai-dest-name">${t.name}</div>
                        <div class="ai-dest-state">${t.state || t.region || ''}</div>
                    </div>
                    <span class="ai-demand-badge" style="background:${demandBg[t.demand]};color:${demandColor[t.demand]}">
                        ${t.growth || '↑ Trending'}
                    </span>
                </div>
                <div class="ai-dest-category"><i class="fas fa-tag"></i> ${t.category}</div>
                <div class="ai-dest-why">${t.whyTrending || t.desc || ''}</div>
                <div class="ai-dest-footer">
                    <span><i class="fas fa-calendar"></i> ${t.season}</span>
                    ${t.avgNightPrice ? `<span><i class="fas fa-rupee-sign"></i> ${t.avgNightPrice}/night</span>` : ''}
                </div>
            </div>`).join('');

    } catch (err) {
        el.innerHTML = `<div class="ai-error-msg"><i class="fas fa-wifi-slash"></i> Could not load trending data.</div>`;
    }
}

/* ── Loading / Error states ──────────────────────────────── */
function showLoading() {
    const ids = ['ai-opp-grid', 'ai-missing-destinations', 'ai-content-gaps', 'ai-trends-grid', 'ai-quickwins'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = `<div class="ai-skeleton-row"></div><div class="ai-skeleton-row"></div>`;
    });
    const s = document.getElementById('ai-summary-text');
    if (s) s.textContent = '🧠 AI is analyzing platform data...';
}

function showError(msg) {
    const s = document.getElementById('ai-summary-text');
    if (s) s.innerHTML = `<span style="color:#EF4444"><i class="fas fa-exclamation-triangle"></i> ${msg}</span>`;
}

window.loadAIInsights = loadAIInsights;
