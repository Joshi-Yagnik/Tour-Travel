/* ============================================================
   WANDERLUST — Admin Panel JS v3.0 — Complete CRUD + Charts
   ============================================================ */

'use strict';

const API = '/api';
let revenueChartInstance = null;
let statusChartInstance  = null;

/* ── State ──────────────────────────────────────────────────── */
const state = {
    packages:     { page: 1, total: 0 },
    destinations: { page: 1, total: 0 },
    hotels:       { page: 1, total: 0 },
    restaurants:  { page: 1, total: 0 },
    bookings:     { page: 1, total: 0 },
    users:        { page: 1, total: 0 },
    reviews: { filter: 'pending' },
    messages: { filter: null },
};

const LIMIT = 15;

/* ─────────────────────────────────────────────────────────────
   INIT
───────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {

    /* Auth Guard */
    if (!window.WL || !WL.Session.isLoggedIn()) {
        window.location.href = '../auth.html?redirect=/admin/index.html';
        return;
    }
    const user = WL.Session.getUser();
    if (!user || user.role !== 'admin') {
        alert('Access denied. Admin privileges required.');
        window.location.href = '../dashboard.html';
        return;
    }

    /* Populate profile info */
    const initial = (user.name || 'A')[0].toUpperCase();
    ['admin-sidebar-name', 'topbar-name'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = user.name || 'Admin';
    });
    ['admin-sidebar-avatar', 'topbar-avatar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = initial;
    });
    document.getElementById('dash-greeting').textContent =
        `Welcome back, ${user.name?.split(' ')[0] || 'Admin'}! Here's what's happening today.`;

    /* Sidebar toggle */
    const sidebar   = document.getElementById('admin-sidebar');
    const toggleBtn = document.getElementById('sidebar-toggle');
    const closeBtn  = document.getElementById('sidebar-close');

    if (toggleBtn) toggleBtn.addEventListener('click', () => sidebar?.classList.add('open'));
    if (closeBtn)  closeBtn.addEventListener('click',  () => sidebar?.classList.remove('open'));
    document.addEventListener('click', (e) => {
        if (sidebar && !sidebar.contains(e.target) && toggleBtn && !toggleBtn.contains(e.target)) {
            sidebar.classList.remove('open');
        }
    });

    /* Tab navigation */
    document.querySelectorAll('.admin-nav__link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            switchTab(link.dataset.tab);
            if (window.innerWidth <= 1024) sidebar?.classList.remove('open');
        });
    });

    /* Logout */
    document.getElementById('admin-logout')?.addEventListener('click', () => WL.Session.logout());

    /* Theme toggle */
    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) {
        const update = (dark) => { themeBtn.querySelector('i').className = `fas fa-${dark ? 'sun' : 'moon'}`; };
        update(document.documentElement.getAttribute('data-theme') === 'dark');
        themeBtn.addEventListener('click', () => update(WL.Session.toggleDarkMode()));
    }

    /* Modal form submissions */
    document.getElementById('pkg-form')?.addEventListener('submit',  handlePackageSubmit);
    document.getElementById('dest-form')?.addEventListener('submit', handleDestinationSubmit);
    document.getElementById('hotel-form')?.addEventListener('submit', handleHotelSubmit);
    document.getElementById('rest-form')?.addEventListener('submit', handleRestaurantSubmit);

    /* Backdrop close */
    document.querySelectorAll('.modal-backdrop').forEach(el => {
        el.addEventListener('click', (e) => { if (e.target === el) el.classList.remove('open'); });
    });

    /* Load initial dashboard */
    loadDashboard();
});

/* ── Switch Tab ──────────────────────────────────────────────── */
function switchTab(tab) {
    document.querySelectorAll('.admin-nav__link').forEach(l => l.classList.remove('active'));
    document.querySelectorAll('.admin-tab').forEach(c => c.classList.remove('active'));

    const navEl = document.getElementById(`nav-${tab}`);
    const tabEl = document.getElementById(`tab-${tab}`);
    if (navEl) navEl.classList.add('active');
    if (tabEl) tabEl.classList.add('active');

    const loaders = {
        dashboard:    loadDashboard,
        packages:     loadPackages,
        destinations: loadDestinations,
        hotels:       loadHotels,
        restaurants:  loadRestaurants,
        bookings:     loadBookings,
        reviews:      () => loadReviews(state.reviews.filter),
        users:        loadUsers,
        messages:     () => loadMessages(state.messages.filter),
    };
    loaders[tab]?.();
}

/* ── API Helper ───────────────────────────────────────────────── */
async function api(endpoint, options = {}) {
    return WL.Session.apiCall(endpoint, options);
}

/* ─────────────────────────────────────────────────────────────
   DASHBOARD
───────────────────────────────────────────────────────────── */
async function loadDashboard() {
    try {
        const { ok, data } = await api('/admin/stats');
        if (!ok || !data.data) return;

        const c = data.data.counts;
        const fmt = (n) => (n || 0).toLocaleString('en-IN');

        setEl('s-users',           fmt(c.users));
        setEl('s-bookings',        fmt(c.bookings));
        setEl('s-hotels',          fmt(c.hotels));
        setEl('s-packages',        fmt(c.packages));
        setEl('s-destinations',    fmt(c.destinations));
        setEl('s-pending',         fmt((c.pendingBookings || 0) + (c.pendingReviews || 0)));
        setEl('s-pending-reviews', fmt(c.pendingReviews));

        // Revenue formatted
        const rev = data.data.totalRevenue || 0;
        setEl('s-revenue', rev >= 100000
            ? `₹${(rev / 100000).toFixed(1)}L`
            : `₹${fmt(rev)}`
        );

        // Pending badges in nav
        setBadge('booking-pending-badge', c.pendingBookings);
        setBadge('review-pending-badge',  c.pendingReviews);

        renderRevenueChart(data.data.monthlyRevenue || []);
        renderStatusChart(data.data.bookingsByStatus || []);
        renderDashRecentBookings(data.data.recentBookings || []);
    } catch (err) {
        console.error('Dashboard load error:', err);
    }
}

function renderRevenueChart(monthlyData) {
    const ctx = document.getElementById('revenueChart');
    if (!ctx || !window.Chart) return;

    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const labels  = monthlyData.map(d => `${monthNames[d._id.month - 1]} ${d._id.year}`);
    const revenue = monthlyData.map(d => d.revenue);

    if (revenueChartInstance) revenueChartInstance.destroy();
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const gridColor = isDark ? '#2D3748' : '#F1F5F9';
    const textColor = isDark ? '#A0AEC0' : '#718096';

    revenueChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Revenue (₹)',
                data: revenue,
                borderColor: '#FF6B35',
                backgroundColor: 'rgba(255,107,53,0.08)',
                borderWidth: 2.5,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#FF6B35',
                pointRadius: 4,
            }],
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => `₹${ctx.raw.toLocaleString('en-IN')}`,
                    },
                },
            },
            scales: {
                x: { grid: { color: gridColor }, ticks: { color: textColor } },
                y: {
                    grid: { color: gridColor },
                    ticks: { color: textColor, callback: (v) => `₹${(v/1000).toFixed(0)}K` },
                },
            },
        },
    });
}

function renderStatusChart(statusData) {
    const ctx = document.getElementById('statusChart');
    if (!ctx || !window.Chart) return;

    const colorMap = {
        pending:   '#F59E0B',
        confirmed: '#3B82F6',
        completed: '#10B981',
        cancelled: '#EF4444',
        rejected:  '#6B7280',
    };
    const labels  = statusData.map(d => d._id);
    const counts  = statusData.map(d => d.count);
    const colors  = labels.map(l => colorMap[l] || '#718096');

    if (statusChartInstance) statusChartInstance.destroy();
    statusChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{ data: counts, backgroundColor: colors, borderWidth: 0 }],
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { padding: 16, font: { size: 12, family: 'Inter' } },
                },
            },
            cutout: '65%',
        },
    });
}

function renderDashRecentBookings(bookings) {
    const tbody = document.getElementById('dash-recent-bookings');
    if (!tbody) return;
    if (!bookings.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="t-center t-muted" style="padding:2rem">No recent bookings</td></tr>';
        return;
    }
    tbody.innerHTML = bookings.map(b => `
        <tr>
            <td style="font-family:monospace;font-size:12px">${b.bookingRef || '#' + b._id?.slice(-6)?.toUpperCase()}</td>
            <td><div class="cell-with-avatar"><div class="user-avatar-sm">${(b.user?.name||'U')[0]}</div>${b.user?.name || '—'}</div></td>
            <td>${b.package?.title || '—'}</td>
            <td>${b.travelDate ? new Date(b.travelDate).toLocaleDateString('en-IN') : '—'}</td>
            <td>${statusBadge(b.status)}</td>
            <td style="font-weight:700">₹${(b.totalPrice||0).toLocaleString('en-IN')}</td>
        </tr>
    `).join('');
}

/* ─────────────────────────────────────────────────────────────
   PACKAGES
───────────────────────────────────────────────────────────── */
async function loadPackages() {
    const tbody = document.getElementById('packages-body');
    if (!tbody) return;
    tbody.innerHTML = loadingRow(7);

    const search = document.getElementById('pkg-search')?.value || '';
    const status = document.getElementById('pkg-status-filter')?.value || '';
    const p = state.packages.page;

    const params = new URLSearchParams({ page: p, limit: LIMIT });
    if (search) params.set('search', search);
    if (status) params.set('status', status);

    try {
        const { ok, data } = await api(`/admin/packages?${params}`);
        if (!ok || !data.data) { tbody.innerHTML = errorRow(7, 'Failed to load packages'); return; }

        state.packages.total = data.total || 0;

        if (!data.data.length) { tbody.innerHTML = emptyRow(7, 'No packages found'); return; }

        tbody.innerHTML = data.data.map(p => `
            <tr>
                <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;font-weight:600">${p.title}</td>
                <td>${p.destination?.name || '—'}</td>
                <td style="font-weight:700;color:#FF6B35">₹${(p.price||0).toLocaleString('en-IN')}</td>
                <td>${p.duration?.days || '?'}D/${p.duration?.nights || '?'}N</td>
                <td>${statusBadge(p.status || 'active')}</td>
                <td>${starsHtml(p.rating)}</td>
                <td>
                    <button class="action-btn view" onclick="editPackage('${p._id}')" title="Edit"><i class="fas fa-edit"></i></button>
                    <button class="action-btn delete" onclick="deletePackage('${p._id}', this)" title="Archive"><i class="fas fa-archive"></i></button>
                </td>
            </tr>
        `).join('');

        renderPagination('pkg-pagination', state.packages, loadPackages);
    } catch (err) {
        tbody.innerHTML = errorRow(7, err.message);
    }
}

async function editPackage(id) {
    // Fetch and open modal pre-filled
    const { ok, data } = await api(`/admin/packages`);
    // Simple approach: re-use create modal
    document.getElementById('pkg-modal-title').textContent = 'Edit Package';
    document.getElementById('pkg-id').value = id;
    openModal('pkg-modal');
}

async function handlePackageSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('pkg-id').value;
    const btn = document.getElementById('pkg-submit-btn');
    btn.disabled = true; btn.textContent = 'Saving...';

    const body = {
        title: document.getElementById('pkg-title').value,
        destination: document.getElementById('pkg-destination').value,
        price: Number(document.getElementById('pkg-price').value),
        duration: {
            days: Number(document.getElementById('pkg-days').value),
            nights: Number(document.getElementById('pkg-nights').value),
        },
        groupSize: { max: Number(document.getElementById('pkg-groupsize').value) },
        difficulty: document.getElementById('pkg-difficulty').value,
        status: document.getElementById('pkg-status').value,
        coverImage: document.getElementById('pkg-cover').value,
        description: document.getElementById('pkg-desc').value,
        featured: document.getElementById('pkg-featured').checked,
    };

    try {
        const endpoint = id ? `/admin/packages/${id}` : '/admin/packages';
        const method   = id ? 'PUT' : 'POST';
        const { ok, data } = await api(endpoint, { method, body: JSON.stringify(body) });
        if (!ok) throw new Error(data.message || 'Failed');
        toast(`Package ${id ? 'updated' : 'created'} successfully!`, 'success');
        closeModal('pkg-modal');
        resetForm('pkg-form');
        loadPackages();
    } catch (err) {
        toast(err.message, 'error');
    }
    btn.disabled = false; btn.textContent = 'Save Package';
}

async function deletePackage(id) {
    confirmAction('Archive this package?', async () => {
        const { ok } = await api(`/admin/packages/${id}`, { method: 'DELETE' });
        if (ok) { toast('Package archived.', 'success'); loadPackages(); }
        else toast('Failed to archive package.', 'error');
    });
}

/* ─────────────────────────────────────────────────────────────
   DESTINATIONS
───────────────────────────────────────────────────────────── */
async function loadDestinations() {
    const tbody = document.getElementById('destinations-body');
    if (!tbody) return;
    tbody.innerHTML = loadingRow(7);

    const search = document.getElementById('dest-search')?.value || '';
    const region = document.getElementById('dest-region-filter')?.value || '';
    const p = state.destinations.page;
    const params = new URLSearchParams({ page: p, limit: LIMIT });
    if (search) params.set('search', search);
    if (region) params.set('region', region);

    try {
        const { ok, data } = await api(`/admin/destinations?${params}`);
        if (!ok || !data.data) { tbody.innerHTML = errorRow(7, 'Failed to load'); return; }
        state.destinations.total = data.total || 0;
        if (!data.data.length) { tbody.innerHTML = emptyRow(7, 'No destinations found'); return; }

        tbody.innerHTML = data.data.map(d => `
            <tr>
                <td style="font-weight:600">${d.name}</td>
                <td>${d.country}</td>
                <td>${d.region}</td>
                <td style="font-weight:700;color:#FF6B35">₹${(d.startingPrice||0).toLocaleString('en-IN')}</td>
                <td>${starsHtml(d.rating)}</td>
                <td>${d.featured ? '<span class="badge badge--orange">⭐ Yes</span>' : '<span class="badge badge--muted">No</span>'}</td>
                <td>
                    <button class="action-btn view" onclick="openEditDestination(${JSON.stringify(d).replace(/"/g, '&quot;')})" title="Edit"><i class="fas fa-edit"></i></button>
                    <button class="action-btn delete" onclick="deleteDestination('${d._id}')" title="Deactivate"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `).join('');
        renderPagination('dest-pagination', state.destinations, loadDestinations);
    } catch (err) {
        tbody.innerHTML = errorRow(7, err.message);
    }
}

function openEditDestination(d) {
    document.getElementById('dest-modal-title').textContent = 'Edit Destination';
    document.getElementById('dest-id').value       = d._id;
    document.getElementById('dest-name').value     = d.name || '';
    document.getElementById('dest-country').value  = d.country || 'India';
    document.getElementById('dest-state').value    = d.state || '';
    document.getElementById('dest-region').value   = d.region || 'Asia';
    document.getElementById('dest-price').value    = d.startingPrice || '';
    document.getElementById('dest-season').value   = d.bestSeason || '';
    document.getElementById('dest-image').value    = d.image || '';
    document.getElementById('dest-desc').value     = d.description || '';
    document.getElementById('dest-featured').checked = d.featured || false;
    document.getElementById('dest-active').checked   = d.isActive !== false;
    openModal('dest-modal');
}

async function handleDestinationSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('dest-id').value;

    const body = {
        name: document.getElementById('dest-name').value,
        country: document.getElementById('dest-country').value,
        state: document.getElementById('dest-state').value,
        region: document.getElementById('dest-region').value,
        startingPrice: Number(document.getElementById('dest-price').value),
        bestSeason: document.getElementById('dest-season').value,
        image: document.getElementById('dest-image').value,
        description: document.getElementById('dest-desc').value,
        featured: document.getElementById('dest-featured').checked,
        isActive: document.getElementById('dest-active').checked,
    };

    try {
        const endpoint = id ? `/admin/destinations/${id}` : '/admin/destinations';
        const method   = id ? 'PUT' : 'POST';
        const { ok, data } = await api(endpoint, { method, body: JSON.stringify(body) });
        if (!ok) throw new Error(data.message || 'Failed');
        toast(`Destination ${id ? 'updated' : 'created'}!`, 'success');
        closeModal('dest-modal');
        resetForm('dest-form');
        loadDestinations();
    } catch (err) {
        toast(err.message, 'error');
    }
}

async function deleteDestination(id) {
    confirmAction('Deactivate this destination?', async () => {
        const { ok } = await api(`/admin/destinations/${id}`, { method: 'DELETE' });
        if (ok) { toast('Destination deactivated.', 'success'); loadDestinations(); }
        else toast('Failed.', 'error');
    });
}

/* ─────────────────────────────────────────────────────────────
   HOTELS
───────────────────────────────────────────────────────────── */
async function loadHotels() {
    const tbody = document.getElementById('hotels-body');
    if (!tbody) return;
    tbody.innerHTML = loadingRow(7);

    const search   = document.getElementById('hotel-search')?.value || '';
    const approval = document.getElementById('hotel-approval-filter')?.value || '';
    const type     = document.getElementById('hotel-type-filter')?.value || '';
    const p = state.hotels.page;
    const params = new URLSearchParams({ page: p, limit: LIMIT });
    if (search)   params.set('search', search);
    if (approval) params.set('approvalStatus', approval);
    if (type)     params.set('type', type);

    try {
        const { ok, data } = await api(`/admin/hotels?${params}`);
        if (!ok || !data.data) { tbody.innerHTML = errorRow(7, 'Failed to load'); return; }
        state.hotels.total = data.total || 0;
        if (!data.data.length) { tbody.innerHTML = emptyRow(7, 'No hotels found'); return; }

        tbody.innerHTML = data.data.map(h => `
            <tr>
                <td>
                    <div class="cell-with-avatar">
                        ${h.coverImage ? `<img src="${h.coverImage}" class="hotel-img-sm" onerror="this.style.display='none'">` : ''}
                        <span style="font-weight:600">${h.name}</span>
                    </div>
                </td>
                <td><span class="badge badge--info">${h.type}</span></td>
                <td>${h.location?.city || '—'}</td>
                <td>${h.owner?.name || '—'}</td>
                <td>${starsHtml(h.rating)}</td>
                <td>${approvalBadge(h.approvalStatus)}</td>
                <td>
                    <button class="action-btn view" onclick="openEditHotel(${JSON.stringify(h).replace(/"/g, '&quot;')})" title="Edit"><i class="fas fa-edit"></i></button>
                    ${h.approvalStatus === 'pending' ? `
                        <button class="action-btn approve" onclick="approveHotel('${h._id}')" title="Approve"><i class="fas fa-check"></i></button>
                        <button class="action-btn reject" onclick="rejectHotel('${h._id}')" title="Reject"><i class="fas fa-times"></i></button>
                    ` : ''}
                    <button class="action-btn delete" onclick="deactivateHotel('${h._id}')" title="Deactivate"><i class="fas fa-ban"></i></button>
                </td>
            </tr>
        `).join('');
        renderPagination('hotel-pagination', state.hotels, loadHotels);
    } catch (err) {
        tbody.innerHTML = errorRow(7, err.message);
    }
}

async function approveHotel(id) {
    const { ok } = await api(`/admin/hotels/${id}/approve`, { method: 'PUT' });
    if (ok) { toast('Hotel approved!', 'success'); loadHotels(); loadDashboard(); }
    else toast('Failed to approve.', 'error');
}

async function rejectHotel(id) {
    const reason = prompt('Reason for rejection (optional):') || '';
    const { ok } = await api(`/admin/hotels/${id}/reject`, { method: 'PUT', body: JSON.stringify({ reason }) });
    if (ok) { toast('Hotel rejected.', 'warning'); loadHotels(); }
    else toast('Failed to reject.', 'error');
}

async function deactivateHotel(id) {
    confirmAction('Deactivate this hotel?', async () => {
        const { ok } = await api(`/admin/hotels/${id}`, { method: 'DELETE' });
        if (ok) { toast('Hotel deactivated.', 'success'); loadHotels(); }
        else toast('Failed.', 'error');
    });
}

function openEditHotel(h = {}) {
    document.getElementById('hotel-modal-title').textContent = h._id ? 'Edit Hotel' : 'Add New Hotel';
    document.getElementById('hotel-id').value       = h._id || '';
    document.getElementById('hotel-name').value     = h.name || '';
    document.getElementById('hotel-type').value     = h.type || 'hotel';
    document.getElementById('hotel-city').value     = h.location?.city || '';
    document.getElementById('hotel-state').value    = h.location?.state || '';
    document.getElementById('hotel-address').value  = h.location?.address || '';
    document.getElementById('hotel-price').value    = h.startingPrice || '';
    document.getElementById('hotel-phone').value    = h.contact?.phone || '';
    document.getElementById('hotel-amenities').value= (h.amenities || []).join(', ');
    document.getElementById('hotel-cover').value    = h.coverImage || '';
    document.getElementById('hotel-desc').value     = h.description || '';
    document.getElementById('hotel-featured').checked = h.featured || false;
    openModal('hotel-modal');
}

async function handleHotelSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('hotel-id').value;

    const body = {
        name: document.getElementById('hotel-name').value,
        type: document.getElementById('hotel-type').value,
        location: {
            address: document.getElementById('hotel-address').value,
            city:    document.getElementById('hotel-city').value,
            state:   document.getElementById('hotel-state').value,
            country: 'India',
        },
        startingPrice: Number(document.getElementById('hotel-price').value),
        contact: { phone: document.getElementById('hotel-phone').value },
        amenities: document.getElementById('hotel-amenities').value.split(',').map(a => a.trim()).filter(Boolean),
        coverImage: document.getElementById('hotel-cover').value,
        description: document.getElementById('hotel-desc').value,
        featured: document.getElementById('hotel-featured').checked,
    };

    try {
        const endpoint = id ? `/admin/hotels/${id}` : '/admin/hotels';
        const method   = id ? 'PUT' : 'POST';
        const { ok, data } = await api(endpoint, { method, body: JSON.stringify(body) });
        if (!ok) throw new Error(data.message || 'Failed');
        toast(`Hotel ${id ? 'updated' : 'created'}!`, 'success');
        closeModal('hotel-modal');
        resetForm('hotel-form');
        loadHotels();
    } catch (err) {
        toast(err.message, 'error');
    }
}

/* ─────────────────────────────────────────────────────────────
   RESTAURANTS
───────────────────────────────────────────────────────────── */
async function loadRestaurants() {
    const tbody = document.getElementById('restaurants-body');
    if (!tbody) return;
    tbody.innerHTML = loadingRow(7);

    const search = document.getElementById('rest-search')?.value || '';
    const type   = document.getElementById('rest-type-filter')?.value || '';
    const p = state.restaurants.page;
    const params = new URLSearchParams({ page: p, limit: LIMIT });
    if (search) params.set('search', search);
    if (type)   params.set('type', type);

    try {
        const { ok, data } = await api(`/admin/restaurants?${params}`);
        if (!ok || !data.data) { tbody.innerHTML = errorRow(7, 'Failed to load'); return; }
        state.restaurants.total = data.total || 0;
        if (!data.data.length) { tbody.innerHTML = emptyRow(7, 'No restaurants found'); return; }

        tbody.innerHTML = data.data.map(r => `
            <tr>
                <td style="font-weight:600">${r.name}</td>
                <td><span class="badge badge--info">${r.type}</span></td>
                <td>${r.location?.city || '—'}</td>
                <td style="font-size:12px;max-width:140px;overflow:hidden;text-overflow:ellipsis">${(r.cuisine||[]).join(', ') || '—'}</td>
                <td>${starsHtml(r.rating)}</td>
                <td>${r.verified ? '<span class="badge badge--success">Verified</span>' : '<span class="badge badge--warning">Pending</span>'}</td>
                <td>
                    <button class="action-btn view" onclick="openEditRestaurant(${JSON.stringify(r).replace(/"/g, '&quot;')})" title="Edit"><i class="fas fa-edit"></i></button>
                    ${!r.verified ? `<button class="action-btn approve" onclick="verifyRestaurant('${r._id}')" title="Verify"><i class="fas fa-check"></i></button>` : ''}
                    <button class="action-btn delete" onclick="deleteRestaurant('${r._id}')" title="Deactivate"><i class="fas fa-ban"></i></button>
                </td>
            </tr>
        `).join('');
        renderPagination('rest-pagination', state.restaurants, loadRestaurants);
    } catch (err) {
        tbody.innerHTML = errorRow(7, err.message);
    }
}

function openEditRestaurant(r = {}) {
    document.getElementById('rest-modal-title').textContent = r._id ? 'Edit Restaurant' : 'Add New Restaurant';
    document.getElementById('rest-id').value       = r._id || '';
    document.getElementById('rest-name').value     = r.name || '';
    document.getElementById('rest-type').value     = r.type || 'restaurant';
    document.getElementById('rest-city').value     = r.location?.city || '';
    document.getElementById('rest-state').value    = r.location?.state || '';
    document.getElementById('rest-address').value  = r.location?.address || '';
    document.getElementById('rest-cuisine').value  = (r.cuisine || []).join(', ');
    document.getElementById('rest-price-range').value = r.priceRange || 'moderate';
    document.getElementById('rest-cost').value     = r.avgCostForTwo || '';
    document.getElementById('rest-phone').value    = r.contact?.phone || '';
    document.getElementById('rest-cover').value    = r.coverImage || '';
    document.getElementById('rest-desc').value     = r.description || '';
    document.getElementById('rest-isveg').checked  = r.isVegetarian || false;
    document.getElementById('rest-featured').checked = r.featured || false;
    openModal('rest-modal');
}

async function handleRestaurantSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('rest-id').value;

    const body = {
        name: document.getElementById('rest-name').value,
        type: document.getElementById('rest-type').value,
        location: {
            address: document.getElementById('rest-address').value,
            city:    document.getElementById('rest-city').value,
            state:   document.getElementById('rest-state').value,
            country: 'India',
        },
        cuisine: document.getElementById('rest-cuisine').value.split(',').map(c => c.trim()).filter(Boolean),
        priceRange:    document.getElementById('rest-price-range').value,
        avgCostForTwo: Number(document.getElementById('rest-cost').value) || 0,
        contact: { phone: document.getElementById('rest-phone').value },
        coverImage: document.getElementById('rest-cover').value,
        description: document.getElementById('rest-desc').value,
        isVegetarian: document.getElementById('rest-isveg').checked,
        featured:  document.getElementById('rest-featured').checked,
    };

    try {
        const endpoint = id ? `/admin/restaurants/${id}` : '/admin/restaurants';
        const method   = id ? 'PUT' : 'POST';
        const { ok, data } = await api(endpoint, { method, body: JSON.stringify(body) });
        if (!ok) throw new Error(data.message || 'Failed');
        toast(`Restaurant ${id ? 'updated' : 'created'}!`, 'success');
        closeModal('rest-modal');
        resetForm('rest-form');
        loadRestaurants();
    } catch (err) {
        toast(err.message, 'error');
    }
}

function openEditRestaurant(id) {
    document.getElementById('rest-modal-title').textContent = 'Edit Restaurant';
    document.getElementById('rest-id').value = id;
    openModal('rest-modal');
}

async function verifyRestaurant(id) {
    const { ok } = await api(`/admin/restaurants/${id}/verify`, { method: 'PUT' });
    if (ok) { toast('Restaurant verified!', 'success'); loadRestaurants(); }
    else toast('Failed.', 'error');
}

async function deleteRestaurant(id) {
    confirmAction('Deactivate this restaurant?', async () => {
        const { ok } = await api(`/admin/restaurants/${id}`, { method: 'DELETE' });
        if (ok) { toast('Restaurant deactivated.', 'success'); loadRestaurants(); }
        else toast('Failed.', 'error');
    });
}

/* ─────────────────────────────────────────────────────────────
   BOOKINGS
───────────────────────────────────────────────────────────── */
async function loadBookings() {
    const tbody = document.getElementById('bookings-body');
    if (!tbody) return;
    tbody.innerHTML = loadingRow(9);

    const search = document.getElementById('booking-search')?.value || '';
    const bstat  = document.getElementById('booking-status-filter')?.value || '';
    const bpay   = document.getElementById('booking-pay-filter')?.value || '';
    const p = state.bookings.page;
    const params = new URLSearchParams({ page: p, limit: LIMIT });
    if (search) params.set('search', search);
    if (bstat)  params.set('status', bstat);
    if (bpay)   params.set('paymentStatus', bpay);

    try {
        const { ok, data } = await api(`/admin/bookings?${params}`);
        if (!ok || !data.data) { tbody.innerHTML = errorRow(9, 'Failed to load'); return; }
        state.bookings.total = data.total || 0;
        if (!data.data.length) { tbody.innerHTML = emptyRow(9, 'No bookings found'); return; }

        tbody.innerHTML = data.data.map(b => `
            <tr>
                <td style="font-family:monospace;font-size:12px">${b.bookingRef || '#'+b._id?.slice(-6)?.toUpperCase()}</td>
                <td>
                    <div class="cell-with-avatar">
                        <div class="user-avatar-sm">${(b.user?.name||'U')[0]}</div>
                        <div>
                            <div style="font-weight:600;font-size:13px">${b.user?.name || '—'}</div>
                            <div style="font-size:11px;color:#718096">${b.user?.email || ''}</div>
                        </div>
                    </div>
                </td>
                <td style="max-width:140px;overflow:hidden;text-overflow:ellipsis">${b.package?.title || b.hotel?.name || '—'}</td>
                <td>${b.travelDate ? new Date(b.travelDate).toLocaleDateString('en-IN') : '—'}</td>
                <td>${b.travelers}</td>
                <td style="font-weight:700;color:#FF6B35">₹${(b.totalPrice||0).toLocaleString('en-IN')}</td>
                <td>${statusBadge(b.status)}</td>
                <td>${payBadge(b.paymentStatus)}</td>
                <td>
                    <button class="action-btn view" onclick="openBookingStatusModal('${b._id}','${b.status}','${b.paymentStatus}')" title="Update Status"><i class="fas fa-edit"></i></button>
                    <button class="action-btn delete" onclick="cancelBooking('${b._id}')" title="Cancel"><i class="fas fa-times"></i></button>
                </td>
            </tr>
        `).join('');
        renderPagination('booking-pagination', state.bookings, loadBookings);
    } catch (err) {
        tbody.innerHTML = errorRow(9, err.message);
    }
}

function openBookingStatusModal(id, status, payStatus) {
    document.getElementById('booking-edit-id').value   = id;
    document.getElementById('booking-new-status').value = status || 'pending';
    document.getElementById('booking-new-pay').value    = payStatus || 'unpaid';
    document.getElementById('booking-admin-notes').value = '';
    openModal('booking-status-modal');
}

async function submitBookingUpdate() {
    const id     = document.getElementById('booking-edit-id').value;
    const status = document.getElementById('booking-new-status').value;
    const pay    = document.getElementById('booking-new-pay').value;
    const notes  = document.getElementById('booking-admin-notes').value;

    const { ok, data } = await api(`/admin/bookings/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status, paymentStatus: pay, adminNotes: notes }),
    });
    if (ok) {
        toast('Booking updated!', 'success');
        closeModal('booking-status-modal');
        loadBookings();
    } else {
        toast(data.message || 'Failed to update.', 'error');
    }
}

async function cancelBooking(id) {
    const reason = prompt('Reason for cancellation:') || 'Cancelled by admin';
    confirmAction(`Cancel this booking?`, async () => {
        const { ok } = await api(`/admin/bookings/${id}/cancel`, {
            method: 'PUT',
            body: JSON.stringify({ reason }),
        });
        if (ok) { toast('Booking cancelled.', 'warning'); loadBookings(); }
        else toast('Failed to cancel.', 'error');
    });
}

/* ─────────────────────────────────────────────────────────────
   REVIEWS
───────────────────────────────────────────────────────────── */
async function loadReviews(filter = 'pending') {
    state.reviews.filter = filter;
    const grid = document.getElementById('reviews-grid');
    if (!grid) return;
    grid.innerHTML = '<div class="t-center t-muted" style="padding:3rem">Loading reviews...</div>';

    const params = new URLSearchParams({ limit: 30 });
    if (filter === 'pending')  params.set('isApproved', 'false');
    if (filter === 'approved') params.set('isApproved', 'true');

    try {
        const { ok, data } = await api(`/admin/reviews?${params}`);
        if (!ok || !data.data) { grid.innerHTML = '<div class="t-center t-muted" style="padding:3rem">Failed to load reviews.</div>'; return; }
        if (!data.data.length) {
            grid.innerHTML = '<div class="t-center t-muted" style="padding:3rem">No reviews found.</div>';
            return;
        }

        grid.innerHTML = data.data.map(r => `
            <div class="review-card">
                <div class="review-card__header">
                    <div class="review-card__user">
                        <div class="review-card__avatar">${(r.user?.name||'U')[0]}</div>
                        <div>
                            <div class="review-card__name">${r.user?.name || '—'}</div>
                            <div class="review-card__meta">${new Date(r.createdAt).toLocaleDateString('en-IN')} · ${r.targetType}</div>
                        </div>
                    </div>
                    <div>
                        <div class="review-card__stars">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</div>
                        ${r.isApproved ? '<span class="badge badge--success" style="font-size:10px">Approved</span>' : '<span class="badge badge--warning" style="font-size:10px">Pending</span>'}
                    </div>
                </div>
                ${r.title ? `<div class="review-card__title">"${r.title}"</div>` : ''}
                <div class="review-card__content">${r.content}</div>
                <div class="review-card__actions">
                    ${!r.isApproved ? `
                        <button class="action-btn approve" onclick="approveReview('${r._id}')" title="Approve">
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="action-btn reject" onclick="openRejectReview('${r._id}')" title="Reject">
                            <i class="fas fa-times"></i>
                        </button>
                    ` : ''}
                    <button class="action-btn delete" onclick="deleteReview('${r._id}')" title="Delete permanently">
                        <i class="fas fa-trash"></i>
                    </button>
                    <span class="review-card__target">${r.targetType}</span>
                    ${r.verified ? '<span class="badge badge--info" style="font-size:10px">✓ Verified</span>' : ''}
                </div>
            </div>
        `).join('');
    } catch (err) {
        grid.innerHTML = `<div class="t-center t-muted" style="padding:3rem">${err.message}</div>`;
    }
}

function filterReviews(filter, btn) {
    document.querySelectorAll('.tab-header-filters .btn-filter').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    loadReviews(filter);
}

async function approveReview(id) {
    const { ok } = await api(`/admin/reviews/${id}/approve`, { method: 'PUT' });
    if (ok) { toast('Review approved!', 'success'); loadReviews(state.reviews.filter); setBadge('review-pending-badge'); }
    else toast('Failed to approve.', 'error');
}

function openRejectReview(id) {
    document.getElementById('reject-review-id').value = id;
    document.getElementById('reject-reason').value = '';
    openModal('reject-review-modal');
}

async function submitRejectReview() {
    const id = document.getElementById('reject-review-id').value;
    const reason = document.getElementById('reject-reason').value;
    const { ok } = await api(`/admin/reviews/${id}/reject`, {
        method: 'PUT',
        body: JSON.stringify({ reason }),
    });
    if (ok) { toast('Review rejected.', 'warning'); closeModal('reject-review-modal'); loadReviews(state.reviews.filter); }
    else toast('Failed to reject.', 'error');
}

async function deleteReview(id) {
    confirmAction('Permanently delete this review?', async () => {
        const { ok } = await api(`/admin/reviews/${id}`, { method: 'DELETE' });
        if (ok) { toast('Review deleted.', 'success'); loadReviews(state.reviews.filter); }
        else toast('Failed.', 'error');
    });
}

/* ─────────────────────────────────────────────────────────────
   USERS
───────────────────────────────────────────────────────────── */
async function loadUsers() {
    const tbody = document.getElementById('users-body');
    if (!tbody) return;
    tbody.innerHTML = loadingRow(7);

    const search = document.getElementById('user-search')?.value || '';
    const role   = document.getElementById('user-role-filter')?.value || '';
    const p = state.users.page;
    const params = new URLSearchParams({ page: p, limit: LIMIT });
    if (search) params.set('search', search);
    if (role)   params.set('role', role);

    try {
        const { ok, data } = await api(`/admin/users?${params}`);
        if (!ok || !data.data) { tbody.innerHTML = errorRow(7, 'Failed to load'); return; }
        state.users.total = data.total || 0;
        if (!data.data.length) { tbody.innerHTML = emptyRow(7, 'No users found'); return; }

        tbody.innerHTML = data.data.map(u => `
            <tr>
                <td>
                    <div class="cell-with-avatar">
                        <div class="user-avatar-sm">${(u.name||'U')[0]}</div>
                        <span style="font-weight:600">${u.name || '—'}</span>
                    </div>
                </td>
                <td style="color:#718096;font-size:12px">${u.email}</td>
                <td>${roleBadge(u.role)}</td>
                <td style="font-size:12px;color:#718096">${u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-IN') : '—'}</td>
                <td><span class="badge badge--muted">${u.loyaltyTier || 'Bronze'}</span></td>
                <td>${u.isActive ? '<span class="badge badge--success">Active</span>' : '<span class="badge badge--danger">Banned</span>'}</td>
                <td>
                    <select class="filter-select" style="padding:4px 8px;font-size:12px;width:120px" onchange="changeUserRole('${u._id}',this.value)" title="Change role">
                        <option value="user"        ${u.role==='user'?'selected':''}>User</option>
                        <option value="hotel_owner" ${u.role==='hotel_owner'?'selected':''}>Hotel Owner</option>
                        <option value="admin"       ${u.role==='admin'?'selected':''}>Admin</option>
                    </select>
                    <button class="action-btn ${u.isActive?'reject':'approve'}" onclick="toggleUser('${u._id}',this)" title="${u.isActive?'Ban user':'Activate user'}" style="margin-left:6px">
                        <i class="fas fa-${u.isActive?'ban':'check'}"></i>
                    </button>
                    <button class="action-btn delete" onclick="deleteUser('${u._id}')" title="Delete permanently" style="margin-left:2px">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
        renderPagination('user-pagination', state.users, loadUsers);
    } catch (err) {
        tbody.innerHTML = errorRow(7, err.message);
    }
}

async function changeUserRole(userId, role) {
    const { ok, data } = await api(`/admin/users/${userId}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role }),
    });
    if (ok) toast(`Role updated to ${role}.`, 'success');
    else toast(data.message || 'Failed to update role.', 'error');
}

async function toggleUser(userId, btn) {
    const { ok, data } = await api(`/admin/users/${userId}/toggle`, { method: 'PUT' });
    if (ok) { toast(data.message || 'User status updated.', 'success'); loadUsers(); }
    else toast('Failed.', 'error');
}

async function deleteUser(id) {
    confirmAction('Permanently delete this user? This cannot be undone.', async () => {
        const { ok, data } = await api(`/admin/users/${id}`, { method: 'DELETE' });
        if (ok) { toast('User deleted.', 'success'); loadUsers(); }
        else toast(data.message || 'Failed.', 'error');
    });
}

/* ─────────────────────────────────────────────────────────────
   MESSAGES
───────────────────────────────────────────────────────────── */
async function loadMessages(replied = null) {
    state.messages.filter = replied;
    const list = document.getElementById('messages-list');
    if (!list) return;
    list.innerHTML = '<div class="t-center t-muted" style="padding:3rem">Loading messages...</div>';

    const params = new URLSearchParams({ limit: 30 });
    if (replied !== null) params.set('replied', replied);

    try {
        const { ok, data } = await api(`/admin/contact?${params}`);
        if (!ok || !data.data) { list.innerHTML = '<div class="t-center t-muted" style="padding:3rem">Failed to load.</div>'; return; }
        if (!data.data.length) { list.innerHTML = '<div class="t-center t-muted" style="padding:3rem">No messages found.</div>'; return; }

        list.innerHTML = data.data.map(m => `
            <div class="message-card ${m.replied ? 'replied' : 'unreplied'}">
                <div class="message-card__info">
                    <div class="message-card__name">${m.firstName} ${m.lastName}</div>
                    <div class="message-card__subject">${m.subject || 'General Inquiry'}</div>
                    <div class="message-card__email">📧 ${m.email} ${m.phone ? '· 📞 '+m.phone : ''}</div>
                    <div class="message-card__body">${m.message}</div>
                </div>
                <div style="display:flex;flex-direction:column;align-items:flex-end;gap:10px;flex-shrink:0">
                    <div class="message-card__date">${new Date(m.createdAt).toLocaleDateString('en-IN')}</div>
                    ${m.replied
                        ? '<span class="badge badge--success">Replied</span>'
                        : `<button class="btn-secondary" style="font-size:12px;padding:6px 12px" onclick="markReplied('${m._id}',this)"><i class="fas fa-check"></i> Mark Replied</button>`
                    }
                </div>
            </div>
        `).join('');
    } catch (err) {
        list.innerHTML = `<div class="t-center t-muted" style="padding:3rem">${err.message}</div>`;
    }
}

function filterMessages(replied, btn) {
    document.querySelectorAll('[id^="msg-filter-"]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    loadMessages(replied);
}

async function markReplied(id, btn) {
    btn.disabled = true; btn.textContent = 'Saving...';
    const { ok } = await api(`/admin/contact/${id}/replied`, { method: 'PUT' });
    if (ok) { toast('Marked as replied.', 'success'); loadMessages(state.messages.filter); }
    else { toast('Failed.', 'error'); btn.disabled = false; btn.innerHTML = '<i class="fas fa-check"></i> Mark Replied'; }
}

/* ─────────────────────────────────────────────────────────────
   UTILITIES
───────────────────────────────────────────────────────────── */

function setEl(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}

function setBadge(id, count) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = count > 0 ? (count > 99 ? '99+' : count) : '';
}

function loadingRow(cols) {
    return `<tr><td colspan="${cols}" class="t-center t-muted" style="padding:2.5rem"><i class="fas fa-spinner fa-spin" style="margin-right:8px"></i>Loading...</td></tr>`;
}
function errorRow(cols, msg) {
    return `<tr><td colspan="${cols}" class="t-center" style="padding:2rem;color:#EF4444">${msg}</td></tr>`;
}
function emptyRow(cols, msg) {
    return `<tr><td colspan="${cols}" class="t-center t-muted" style="padding:2.5rem">${msg}</td></tr>`;
}

function starsHtml(rating) {
    const r = Math.round(rating || 0);
    return `<span class="stars">${'★'.repeat(r)}${'☆'.repeat(5-r)}</span> <span style="font-size:12px;color:#718096">${(rating||0).toFixed(1)}</span>`;
}

function statusBadge(status) {
    const map = {
        pending:   'badge--warning',
        confirmed: 'badge--info',
        completed: 'badge--success',
        cancelled: 'badge--danger',
        rejected:  'badge--muted',
        active:    'badge--success',
        draft:     'badge--warning',
        archived:  'badge--muted',
    };
    return `<span class="badge ${map[status] || 'badge--muted'}">${status || '—'}</span>`;
}

function payBadge(status) {
    const map = {
        unpaid:   'badge--danger',
        partial:  'badge--warning',
        paid:     'badge--success',
        refunded: 'badge--muted',
    };
    return `<span class="badge ${map[status] || 'badge--muted'}">${status || '—'}</span>`;
}

function approvalBadge(status) {
    const map = { pending: 'badge--warning', approved: 'badge--success', rejected: 'badge--danger' };
    return `<span class="badge ${map[status] || 'badge--muted'}">${status || 'pending'}</span>`;
}

function roleBadge(role) {
    const map = { admin: 'badge--orange', hotel_owner: 'badge--purple', user: 'badge--muted' };
    return `<span class="badge ${map[role] || 'badge--muted'}">${role || 'user'}</span>`;
}

function renderPagination(containerId, stateObj, loadFn) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const totalPages = Math.ceil(stateObj.total / LIMIT);
    if (totalPages <= 1) { container.innerHTML = ''; return; }

    const cur = stateObj.page;
    let html = '';

    const prevDisabled = cur === 1 ? 'disabled' : '';
    html += `<button class="page-btn" ${prevDisabled} onclick="changePage('${stateObj === state.packages ? 'packages' : ''}',${cur-1},${JSON.stringify(stateObj)})">‹</button>`;

    for (let i = 1; i <= Math.min(totalPages, 7); i++) {
        html += `<button class="page-btn ${i===cur?'active':''}" onclick="gotoPage(${i},'${containerId}')"> ${i} </button>`;
    }

    const nextDisabled = cur >= totalPages ? 'disabled' : '';
    html += `<button class="page-btn" ${nextDisabled} onclick="gotoPageNext('${containerId}',${cur+1},${totalPages})">›</button>`;

    container.innerHTML = html;
}

// Simple page nav
function gotoPage(page, containerId) {
    const map = {
        'pkg-pagination':     ['packages',     loadPackages],
        'dest-pagination':    ['destinations', loadDestinations],
        'hotel-pagination':   ['hotels',       loadHotels],
        'rest-pagination':    ['restaurants',  loadRestaurants],
        'booking-pagination': ['bookings',     loadBookings],
        'user-pagination':    ['users',        loadUsers],
    };
    const entry = map[containerId];
    if (entry) { state[entry[0]].page = page; entry[1](); }
}
function gotoPageNext(containerId, page, totalPages) {
    if (page <= totalPages) gotoPage(page, containerId);
}

/* Modal helpers */
function openModal(id) {
    document.getElementById(id)?.classList.add('open');
}
function closeModal(id) {
    document.getElementById(id)?.classList.remove('open');
    // Reset edit IDs
    const idFields = { 'pkg-modal': 'pkg-id', 'dest-modal': 'dest-id', 'rest-modal': 'rest-id' };
    if (idFields[id]) {
        document.getElementById(idFields[id]).value = '';
    }
}
function resetForm(formId) {
    document.getElementById(formId)?.reset();
}

/* Confirm dialog */
let _confirmCallback = null;
function confirmAction(msg, cb) {
    document.getElementById('confirm-message').textContent = msg;
    _confirmCallback = cb;
    openModal('confirm-modal');
}
document.getElementById('confirm-ok-btn')?.addEventListener('click', () => {
    closeModal('confirm-modal');
    if (_confirmCallback) { _confirmCallback(); _confirmCallback = null; }
});

/* Toast */
function toast(msg, type = 'success', duration = 3500) {
    const icons = { success: 'fa-check-circle', error: 'fa-times-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
    const container = document.getElementById('toast-container');
    if (!container) return;
    const el = document.createElement('div');
    el.className = `toast toast--${type}`;
    el.innerHTML = `<i class="fas ${icons[type] || 'fa-info-circle'}"></i> ${msg}`;
    container.appendChild(el);
    setTimeout(() => {
        el.style.opacity = '0';
        el.style.transform = 'translateX(20px)';
        el.style.transition = 'all 0.3s ease';
        setTimeout(() => el.remove(), 300);
    }, duration);
}

// Expose toast globally for session.js compatibility
window.showToast = (msg, type) => toast(msg, type);
