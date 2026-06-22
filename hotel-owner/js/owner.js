/* ════════════════════════════════════════════════════════════
   WANDERLUST PARTNER HUB — Complete Application Logic v3.0
   Central management hub for hotel owners.
   All hotel management accessible from one portal.
   ════════════════════════════════════════════════════════════ */

const API = WL.Session.apiCall;

/* ── Global State ──────────────────────────────────────────── */
const APP = {
    user:         null,
    hotels:       [],    // cached owned hotels
    bookings:     [],    // cached bookings
    reviews:      [],    // cached reviews
    analytics:    null,  // cached analytics data
    guests:       [],    // cached guests
    activeHotelId: null, // quick-switch selected hotel

    navigate(viewId) {
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

        const view = document.getElementById(`view-${viewId}`);
        const nav  = document.querySelector(`.nav-item[data-view="${viewId}"]`);
        if (view) view.classList.add('active');
        if (nav)  nav.classList.add('active');

        this.currentView = viewId;

        const titles = {
            dashboard:   'Dashboard',
            analytics:   'Analytics & Revenue',
            'ai-advisor':'AI Business Advisor',
            packages:    'Packages & Tours',
            properties:  'My Properties',
            rooms:       'Rooms & Pricing',
            amenities:   'Amenities',
            gallery:     'Image Gallery',
            policies:    'Hotel Policies',
            bookings:    'Booking Management',
            guests:      'Guest Management',
            reviews:     'Guest Reviews',
            settings:    'Account Settings',
        };
        document.getElementById('topbar-breadcrumb').innerHTML = `<span>${titles[viewId] || viewId}</span>`;
        closeSidebar();

        // Load data
        const loaders = {
            dashboard:    loadDashboard,
            analytics:    loadAnalytics,
            'ai-advisor': () => typeof loadOwnerAdvisor === 'function' ? loadOwnerAdvisor() : null,
            packages:     loadPackages,
            properties:   loadProperties,
            rooms:        initRoomsView,
            amenities:    initAmenitiesView,
            gallery:      initGalleryView,
            policies:     initPoliciesView,
            bookings:     loadBookings,
            guests:       loadGuests,
            reviews:      loadReviews,
            settings:     populateSettings,
        };
        if (loaders[viewId]) loaders[viewId]();
    }
};

/* ════════════════════════════════════════════════════════════
   INIT
════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {
    const user = WL.Session.getUser();
    if (!user || user.role !== 'hotel_owner') {
        window.location.href = '../auth.html';
        return;
    }

    APP.user = user;
    seedUserUI(user);
    setupEventListeners();

    // Set date
    const el = document.getElementById('dash-date');
    if (el) el.textContent = new Date().toLocaleDateString('en-IN', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });

    // Pre-load hotels for dropdowns (critical — all views depend on this)
    await preloadHotels();

    APP.navigate('dashboard');
});

/* ── Pre-load hotels and seed all dropdowns ──────────────── */
async function preloadHotels() {
    try {
        const { ok, data } = await API('/owner/hotels');
        if (!ok) return;
        APP.hotels = data.data || [];
        seedHotelDropdowns();
    } catch (_) {}
}

function seedHotelDropdowns() {
    const opts = APP.hotels.map(h => `<option value="${h._id}">${h.name}</option>`).join('');
    const allOpt = '<option value="">All Properties</option>';
    const selOpt = '<option value="">Select a property...</option>';

    const propSelect  = document.getElementById('topbar-prop-select');
    const roomsSel    = document.getElementById('rooms-hotel-select');
    const amenSel     = document.getElementById('amenities-hotel-select');
    const galSel      = document.getElementById('gallery-hotel-select');
    const polSel      = document.getElementById('policies-hotel-select');
    const bookHotelSel= document.getElementById('booking-hotel-filter');
    const revHotelSel = document.getElementById('reviews-hotel-filter');
    const anHotelSel  = document.getElementById('analytics-hotel-filter');

    if (propSelect)   propSelect.innerHTML   = allOpt + opts;
    if (roomsSel)     roomsSel.innerHTML     = selOpt + opts;
    if (amenSel)      amenSel.innerHTML      = selOpt + opts;
    if (galSel)       galSel.innerHTML       = selOpt + opts;
    if (polSel)       polSel.innerHTML       = selOpt + opts;
    if (bookHotelSel) bookHotelSel.innerHTML = allOpt + opts;
    if (revHotelSel)  revHotelSel.innerHTML  = allOpt + opts;
    if (anHotelSel)   anHotelSel.innerHTML   = allOpt + opts;
}

/* ── User UI ──────────────────────────────────────────────── */
function seedUserUI(user) {
    const initial   = user.name.charAt(0).toUpperCase();
    const firstName = user.name.split(' ')[0];

    document.getElementById('sidebar-avatar').textContent = initial;
    document.getElementById('sidebar-name').textContent   = user.name;
    document.getElementById('topbar-avatar').textContent  = initial;
    document.getElementById('topbar-name').textContent    = firstName;
    document.getElementById('dash-firstname').textContent = firstName;
}

/* ── Event Listeners ──────────────────────────────────────── */
function setupEventListeners() {
    document.querySelectorAll('.nav-item').forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            APP.navigate(link.getAttribute('data-view'));
        });
    });

    document.getElementById('menu-toggle').addEventListener('click', openSidebar);
    document.getElementById('sidebar-close').addEventListener('click', closeSidebar);
    document.getElementById('sidebar-overlay').addEventListener('click', closeSidebar);

    document.getElementById('btn-logout').addEventListener('click', () => {
        WL.Session.clear();
        window.location.href = '../index.html';
    });

    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) {
        const current = document.documentElement.getAttribute('data-theme') || 'dark';
        themeBtn.querySelector('i').className = current === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        themeBtn.addEventListener('click', () => {
            const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', next);
            themeBtn.querySelector('i').className = next === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        });
    }

    // Quick-switch property (topbar select)
    document.getElementById('topbar-prop-select')?.addEventListener('change', function () {
        APP.activeHotelId = this.value || null;
        // Refresh the current view with the filter if applicable
        if (APP.currentView === 'bookings') filterBookings();
        if (APP.currentView === 'analytics') loadAnalytics();
    });

    document.getElementById('property-form').addEventListener('submit', handlePropertySubmit);

    // Drawer overlays
    document.getElementById('prop-drawer-overlay').addEventListener('click', closePropertyForm);
    document.getElementById('rooms-drawer-overlay').addEventListener('click', closeRoomsDrawer);
    document.getElementById('booking-drawer-overlay').addEventListener('click', closeBookingDrawer);
    document.getElementById('review-drawer-overlay').addEventListener('click', closeReviewDrawer);
}

function openSidebar()  { document.getElementById('sidebar').classList.add('open'); document.getElementById('sidebar-overlay').classList.add('open'); }
function closeSidebar() { document.getElementById('sidebar').classList.remove('open'); document.getElementById('sidebar-overlay').classList.remove('open'); }

/* ════════════════════════════════════════════════════════════
   DASHBOARD
════════════════════════════════════════════════════════════ */
async function loadDashboard() {
    try {
        const { ok, data } = await API('/owner/stats');
        if (!ok) throw new Error('Failed to load stats');

        const { counts, totalRevenue, recentBookings } = data.data;

        document.getElementById('kpi-revenue').textContent    = fmtMoney(totalRevenue);
        document.getElementById('kpi-bookings').textContent   = counts.totalBookings;
        document.getElementById('kpi-pending').textContent    = counts.pendingBookings;
        document.getElementById('kpi-properties').textContent = counts.activeProperties;

        const pendingEl = document.getElementById('kpi-pending-text');
        if (pendingEl) {
            pendingEl.textContent = counts.pendingBookings > 0
                ? `${counts.pendingBookings} need action`
                : 'All handled ✓';
        }

        updatePendingBadge(counts.pendingBookings);
        renderDashboardBookings(recentBookings);

    } catch (err) {
        toast('Could not load dashboard stats.', 'error');
    }
}

function renderDashboardBookings(bookings) {
    const tbody = document.getElementById('dash-recent-tbody');
    if (!tbody) return;

    if (!bookings?.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="empty-state-cell"><i class="far fa-calendar-xmark" style="font-size:2rem;color:var(--text-muted);display:block;margin-bottom:8px;"></i>No bookings yet</td></tr>`;
        return;
    }

    tbody.innerHTML = bookings.map(b => `
        <tr>
            <td><div class="td-primary">${b.user?.name || 'Guest'}</div><div class="td-secondary">${b.user?.email || ''}</div></td>
            <td>${b.hotel?.name || '—'}</td>
            <td>${fmtDate(b.travelDate)}</td>
            <td>${chipHtml(b.status)}</td>
            <td><strong>${fmtMoney(b.totalPrice)}</strong></td>
            <td><button class="tbl-btn view" onclick="openBookingDrawer('${b._id}')" title="View"><i class="fas fa-arrow-right"></i></button></td>
        </tr>`
    ).join('');
}

/* ════════════════════════════════════════════════════════════
   ANALYTICS
════════════════════════════════════════════════════════════ */
async function loadAnalytics() {
    const tbody = document.getElementById('an-prop-tbody');
    if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="empty-state-cell"><div class="skeleton-loader"></div></td></tr>`;

    try {
        const hotelId = document.getElementById('analytics-hotel-filter')?.value || '';
        const qs = hotelId ? `?hotelId=${hotelId}` : '';
        const { ok, data } = await API(`/owner/analytics${qs}`);
        if (!ok) throw new Error('Failed to load analytics');

        APP.analytics = data.data;
        const { totalRevenue, totalBookings, statusCounts, monthlyData, propertyPerformance } = data.data;

        document.getElementById('an-revenue').textContent   = fmtMoney(totalRevenue);
        document.getElementById('an-bookings').textContent  = totalBookings;
        document.getElementById('an-completed').textContent = statusCounts.completed || 0;
        document.getElementById('an-avg').textContent       = totalBookings
            ? fmtMoney(Math.round(totalRevenue / totalBookings))
            : '₹0';

        renderRevenueChart(monthlyData);
        renderPropertyPerformance(propertyPerformance);

    } catch (err) {
        toast('Could not load analytics.', 'error');
    }
}

function renderRevenueChart(monthlyData) {
    const chart = document.getElementById('revenue-chart');
    if (!chart) return;

    const maxAmt = Math.max(...monthlyData.map(m => m.revenue), 1);

    chart.innerHTML = monthlyData.map(m => {
        const pct = Math.round((m.revenue / maxAmt) * 100);
        return `
            <div class="bar-group">
                <div class="bar-fill" style="height:${Math.max(pct, 2)}%" title="${fmtMoney(m.revenue)}">
                    <span class="bar-tooltip">${fmtMoney(m.revenue)}</span>
                </div>
                <div class="bar-label">${m.label}</div>
            </div>`;
    }).join('');
}

function renderPropertyPerformance(props) {
    const tbody = document.getElementById('an-prop-tbody');
    if (!tbody) return;

    if (!props?.length) {
        tbody.innerHTML = `<tr><td colspan="7" class="empty-state-cell">No properties found.</td></tr>`;
        return;
    }

    tbody.innerHTML = props.map(p => `
        <tr>
            <td><div class="td-primary">${p.name}</div></td>
            <td><span class="type-pill">${fmtType(p.type)}</span></td>
            <td>${p.bookings}</td>
            <td><strong>${fmtMoney(p.revenue)}</strong></td>
            <td>
                <span style="color:var(--hub-amber)">${starIcons(p.avgRating)}</span>
                <span style="font-size:0.78rem;margin-left:4px;">${p.avgRating || '—'}</span>
            </td>
            <td>${p.reviews}</td>
            <td>${p.pending > 0 ? `<span class="chip chip-pending">${p.pending}</span>` : '<span style="color:var(--text-muted)">—</span>'}</td>
        </tr>`
    ).join('');
}

/* ════════════════════════════════════════════════════════════
   PROPERTIES
════════════════════════════════════════════════════════════ */
async function loadProperties() {
    const grid  = document.getElementById('prop-cards-grid');
    const empty = document.getElementById('prop-empty');

    grid.innerHTML  = '<div class="skeleton-prop-card"></div><div class="skeleton-prop-card"></div><div class="skeleton-prop-card"></div>';
    grid.style.display  = 'grid';
    empty.style.display = 'none';

    try {
        const { ok, data } = await API('/owner/hotels');
        if (!ok) throw new Error('Failed to load hotels');

        APP.hotels = data.data || [];
        seedHotelDropdowns(); // Refresh dropdowns if new hotels added

        if (!APP.hotels.length) {
            grid.style.display  = 'none';
            empty.style.display = 'flex';
            return;
        }

        grid.style.display  = 'grid';
        empty.style.display = 'none';
        grid.innerHTML = APP.hotels.map(buildPropertyCard).join('');

    } catch (err) {
        grid.innerHTML = `<div class="empty-state"><div class="empty-state-icon" style="background:var(--hub-rose-subtle);color:var(--hub-rose)"><i class="fas fa-triangle-exclamation"></i></div><h3>Error</h3><p>${err.message}</p></div>`;
    }
}

function buildPropertyCard(h) {
    const statusClass = h.isActive ? (h.verified ? 'chip-active' : 'chip-pending-verification') : 'chip-inactive';
    const statusText  = h.isActive ? (h.verified ? 'Active' : 'Pending Approval') : 'Inactive';
    const hJson       = encodeHtml(JSON.stringify(h));
    const roomCount   = (h.rooms || []).length;
    const isRestaurant = ['restaurant', 'dhaba', 'cafe', 'street_food', 'fine_dining', 'fast_food', 'bakery', 'bar_lounge', 'rooftop', 'food_court'].includes(h.type);
    
    // For restaurants, cost for two is often used instead of min price
    const minPrice    = isRestaurant ? (h.avgCostForTwo || 0) : (roomCount ? Math.min(...h.rooms.map(r => r.pricePerNight || 0)) : (h.startingPrice || h.priceFrom || 0));
    
    const imgHtml     = h.coverImage
        ? `<img src="${h.coverImage}" class="prop-card-img" alt="${h.name}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
        : '';
    const placeholderIcon = isRestaurant ? 'fa-utensils' : 'fa-hotel';
    const placeholder = `<div class="prop-card-img-placeholder" ${h.coverImage ? 'style="display:none"' : ''}><i class="fas ${placeholderIcon}"></i></div>`;

    return `
        <div class="prop-card">
            ${imgHtml}${placeholder}
            <div class="prop-card-status"><span class="chip ${statusClass}">${statusText}</span></div>
            <div class="prop-card-body">
                <div class="prop-card-type">${fmtType(h.type)} ${h.starRating ? '⭐'.repeat(h.starRating) : ''}</div>
                <div class="prop-card-name">${h.name}</div>
                <div class="prop-card-location"><i class="fas fa-location-dot" style="color:var(--hub-accent);font-size:0.75rem"></i> ${[h.location?.city, h.location?.state].filter(Boolean).join(', ') || 'Location not set'}</div>
                <div class="prop-card-meta">
                    <div class="prop-card-meta-item"><span class="prop-meta-value">${fmtMoney(minPrice)}</span><span class="prop-meta-label">${isRestaurant ? 'Avg Cost' : 'From/night'}</span></div>
                    <div class="prop-card-meta-item"><span class="prop-meta-value">${isRestaurant ? (h.cuisine ? h.cuisine.length : 0) : roomCount}</span><span class="prop-meta-label">${isRestaurant ? 'Cuisines' : 'Room Types'}</span></div>
                    <div class="prop-card-meta-item"><span class="prop-meta-value">${h.rating ? h.rating.toFixed(1) : '—'}</span><span class="prop-meta-label">Rating</span></div>
                    <div class="prop-card-meta-item"><span class="prop-meta-value">${h.reviewCount || 0}</span><span class="prop-meta-label">Reviews</span></div>
                </div>
                <div class="prop-card-actions">
                    <button class="btn-sm-ghost" onclick='openPropertyForm(JSON.parse(decodeURIComponent("${encodeURIComponent(JSON.stringify(h))}")))' title="Edit"><i class="fas fa-pen"></i> Edit</button>
                    ${!isRestaurant ? `<button class="btn-sm-rooms" onclick="openRoomsDrawer('${h._id}')" title="Rooms"><i class="fas fa-bed"></i> Rooms</button>` : ''}
                    <button class="btn-sm-ghost" onclick="APP.navigate('gallery'); document.getElementById('gallery-hotel-select').value='${h._id}'; loadGalleryByHotel()" title="Gallery"><i class="fas fa-images"></i></button>
                    <button class="btn-sm-ghost" onclick="APP.navigate('policies'); document.getElementById('policies-hotel-select').value='${h._id}'; loadPoliciesByHotel()" title="Policies"><i class="fas fa-shield-halved"></i></button>
                </div>
            </div>
        </div>`;
}

/* ── Property Drawer ─────────────────────────────────────── */
function openPropertyForm(p = null) {
    const isEdit = p?._id;
    document.getElementById('prop-drawer-title').textContent = isEdit ? 'Edit Property' : 'Add New Property';
    document.getElementById('property-form').reset();
    document.getElementById('prop-id').value = '';

    if (isEdit) {
        document.getElementById('prop-id').value           = p._id;
        document.getElementById('prop-name').value         = p.name || '';
        document.getElementById('prop-type').value         = p.type || 'hotel';
        document.getElementById('prop-stars').value        = p.starRating || 3;
        document.getElementById('prop-short-desc').value   = p.shortDescription || '';
        document.getElementById('prop-desc').value         = p.description || '';
        document.getElementById('prop-address').value      = p.location?.address || '';
        document.getElementById('prop-city').value         = p.location?.city || '';
        document.getElementById('prop-state').value        = p.location?.state || '';
        document.getElementById('prop-landmark').value     = p.location?.landmark || '';
        document.getElementById('prop-phone').value        = p.contact?.phone || '';
        document.getElementById('prop-email').value        = p.contact?.email || '';
        document.getElementById('prop-website').value      = p.contact?.website || '';
        document.getElementById('prop-cover').value        = p.coverImage || '';
        document.getElementById('prop-amenities').value    = (p.amenities || []).join(', ');
        document.getElementById('prop-price').value        = p.startingPrice || p.priceFrom || '';
        document.getElementById('prop-tags').value         = (p.tags || []).join(', ');
    }

    openDrawer('prop-drawer', 'prop-drawer-overlay');
}

function closePropertyForm() { closeDrawer('prop-drawer', 'prop-drawer-overlay'); }

async function handlePropertySubmit(e) {
    e.preventDefault();
    const id  = document.getElementById('prop-id').value;
    const btn = document.getElementById('prop-submit-btn');

    const body = {
        name:             document.getElementById('prop-name').value,
        type:             document.getElementById('prop-type').value,
        starRating:       Number(document.getElementById('prop-stars').value),
        shortDescription: document.getElementById('prop-short-desc').value,
        description:      document.getElementById('prop-desc').value,
        location: {
            address:  document.getElementById('prop-address').value,
            city:     document.getElementById('prop-city').value,
            state:    document.getElementById('prop-state').value,
            country:  'India',
            landmark: document.getElementById('prop-landmark').value,
        },
        contact: {
            phone:   document.getElementById('prop-phone').value,
            email:   document.getElementById('prop-email').value,
            website: document.getElementById('prop-website').value,
        },
        coverImage:  document.getElementById('prop-cover').value,
        amenities:   document.getElementById('prop-amenities').value.split(',').map(a => a.trim()).filter(Boolean),
        tags:        document.getElementById('prop-tags').value.split(',').map(t => t.trim()).filter(Boolean),
    };

    // Only send price if the field has a valid positive value (prevents zeroing out on edit)
    const rawPrice = Number(document.getElementById('prop-price').value);
    if (rawPrice > 0) body.startingPrice = rawPrice;

    try {
        btn.disabled  = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

        // Use the owner-scoped endpoint
        const endpoint = id ? `/owner/hotels/${id}` : '/owner/hotels';
        const method   = id ? 'PUT' : 'POST';
        const { ok, data } = await API(endpoint, { method, body: JSON.stringify(body) });

        if (!ok) throw new Error(data.message || 'Failed to save property');

        toast(`Property ${id ? 'updated' : 'created'} successfully!`, 'success');
        closePropertyForm();
        document.getElementById('property-form').reset();
        if (!id) toast('Your listing is pending admin verification before going live.', 'info');
        await loadProperties(); // Refresh + re-seed dropdowns

    } catch (err) {
        toast(err.message, 'error');
    } finally {
        btn.disabled  = false;
        btn.innerHTML = '<i class="fas fa-floppy-disk"></i> Save Property';
    }
}

/* ════════════════════════════════════════════════════════════
   ROOMS & PRICING VIEW
════════════════════════════════════════════════════════════ */
function initRoomsView() {
    // Trigger render if a hotel is already selected via topbar
    if (APP.activeHotelId) {
        document.getElementById('rooms-hotel-select').value = APP.activeHotelId;
        loadRoomsByHotel();
    }
}

function loadRoomsByHotel() {
    const hotelId = document.getElementById('rooms-hotel-select').value;
    const content = document.getElementById('rooms-view-content');

    if (!hotelId) {
        content.innerHTML = `<div class="empty-state"><div class="empty-state-icon"><i class="fas fa-bed"></i></div><h3>Select a Property</h3><p>Choose a property to view its rooms.</p></div>`;
        return;
    }

    const hotel = APP.hotels.find(h => h._id === hotelId);
    if (!hotel) return;

    const rooms = hotel.rooms || [];

    if (!rooms.length) {
        content.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon"><i class="fas fa-bed"></i></div>
                <h3>No Rooms Configured</h3>
                <p>Add room types to start accepting bookings for <strong>${hotel.name}</strong>.</p>
                <button class="btn-primary" onclick="openRoomsDrawer('${hotel._id}')"><i class="fas fa-plus"></i> Add Room Types</button>
            </div>`;
        return;
    }

    content.innerHTML = `
        <div class="card-header" style="margin-bottom:16px">
            <div><h3 class="card-title">${hotel.name}</h3><p class="card-subtitle">${rooms.length} room type${rooms.length !== 1 ? 's' : ''} configured</p></div>
            <button class="btn-primary" onclick="openRoomsDrawer('${hotel._id}')"><i class="fas fa-pen"></i> Edit Rooms</button>
        </div>
        <div class="rooms-cards-grid">
            ${rooms.map(r => buildRoomCard(r, hotel._id)).join('')}
        </div>`;
}

function buildRoomCard(r, hotelId) {
    const avail = r.available !== false;
    return `
        <div class="room-display-card">
            <div class="room-display-header">
                <div>
                    <div class="room-type-badge">${r.type}</div>
                    <div class="room-price">${fmtMoney(r.pricePerNight)}<span class="room-price-unit">/night</span></div>
                </div>
                <span class="chip ${avail ? 'chip-confirmed' : 'chip-rejected'}">${avail ? 'Available' : 'Unavailable'}</span>
            </div>
            <div class="room-display-meta">
                <span><i class="fas fa-user-group" style="color:var(--hub-accent)"></i> Max ${r.maxOccupancy} guests</span>
                <span><i class="fas fa-door-open" style="color:var(--hub-sky)"></i> ${r.totalRooms || 1} room${r.totalRooms !== 1 ? 's' : ''}</span>
            </div>
            ${r.amenities?.length ? `<div class="room-amenities">${r.amenities.slice(0,5).map(a => `<span class="amenity-tag">${a}</span>`).join('')}</div>` : ''}
        </div>`;
}

/* ════════════════════════════════════════════════════════════
   AMENITIES VIEW
════════════════════════════════════════════════════════════ */
const ALL_AMENITIES = [
    '🛜 WiFi', '❄️ Air Conditioning', '🅿️ Parking', '🏊 Swimming Pool', '🏋️ Gym/Fitness',
    '🍽️ Restaurant', '☕ Breakfast Included', '🔝 Elevator', '🧹 Housekeeping',
    '🛎️ Room Service', '📺 Cable TV', '🧺 Laundry', '💆 Spa', '🏓 Recreation',
    '💒 Conference Hall', '🎰 Casino', '🌐 Business Center', '🔒 Locker',
    '🚌 Airport Shuttle', '🚗 Car Rental', '🧊 Mini Fridge', '🍷 Minibar',
    '🔥 Geyser/Hot Water', '🌿 Garden', '🏖️ Beach Access', '⛵ Boat Service',
    '🌄 Mountain View', '🕌 Prayer Room', '🥗 Vegetarian Kitchen', '🐾 Pet Friendly',
];

function initAmenitiesView() {
    if (APP.activeHotelId) {
        document.getElementById('amenities-hotel-select').value = APP.activeHotelId;
        loadAmenitiesByHotel();
    }
}

function loadAmenitiesByHotel() {
    const hotelId = document.getElementById('amenities-hotel-select').value;
    const content = document.getElementById('amenities-view-content');

    if (!hotelId) {
        content.innerHTML = `<div class="empty-state"><div class="empty-state-icon"><i class="fas fa-star-of-life"></i></div><h3>Select a Property</h3><p>Choose a property to manage amenities.</p></div>`;
        return;
    }

    const hotel   = APP.hotels.find(h => h._id === hotelId);
    if (!hotel) return;

    const current = new Set(hotel.amenities || []);

    content.innerHTML = `
        <div class="owner-panel">
            <div class="card-header">
                <div><h3 class="card-title">Amenities — ${hotel.name}</h3><p class="card-subtitle">Click to toggle. Changes save automatically.</p></div>
                <div style="display:flex;gap:8px;align-items:center">
                    <input type="text" id="custom-amenity-input" class="field-input" style="width:200px" placeholder="Add custom amenity...">
                    <button class="btn-primary" onclick="addCustomAmenity('${hotelId}')"><i class="fas fa-plus"></i> Add</button>
                </div>
            </div>
            <div class="amenities-toggle-grid" id="amenities-toggle-grid">
                ${ALL_AMENITIES.map(a => {
                    // Strip emoji prefix for matching
                    const key = a.replace(/^.+ /, '');
                    const isOn = Array.from(current).some(c => c.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(c.toLowerCase()));
                    return `<button class="amenity-toggle-btn ${isOn ? 'on' : ''}" onclick="toggleAmenity(this, '${hotelId}', '${key}')">${a}</button>`;
                }).join('')}
            </div>
            <div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border)">
                <strong style="font-size:0.82rem;color:var(--text-muted)">CURRENT AMENITIES (${hotel.amenities?.length || 0})</strong>
                <div class="amenity-current-list" id="amenity-current-list-${hotelId}">
                    ${(hotel.amenities || []).map(a => `<span class="amenity-tag amenity-tag--active">${a}</span>`).join('') || '<span style="color:var(--text-muted);font-size:0.82rem">None added yet</span>'}
                </div>
            </div>
            <div style="margin-top:16px;text-align:right">
                <button class="btn-primary" onclick="saveAmenities('${hotelId}')"><i class="fas fa-floppy-disk"></i> Save Amenities</button>
            </div>
        </div>`;

    // Store current amenities for save
    window._pendingAmenities = { [hotelId]: [...(hotel.amenities || [])] };
}

function toggleAmenity(btn, hotelId, amenityKey) {
    btn.classList.toggle('on');
    if (!window._pendingAmenities) window._pendingAmenities = {};
    if (!window._pendingAmenities[hotelId]) window._pendingAmenities[hotelId] = [];

    const arr = window._pendingAmenities[hotelId];
    const idx = arr.findIndex(a => a.toLowerCase().includes(amenityKey.toLowerCase()));
    if (idx >= 0) {
        arr.splice(idx, 1);
    } else {
        arr.push(amenityKey);
    }
}

async function addCustomAmenity(hotelId) {
    const input = document.getElementById('custom-amenity-input');
    const val   = input.value.trim();
    if (!val) return;

    if (!window._pendingAmenities) window._pendingAmenities = {};
    if (!window._pendingAmenities[hotelId]) window._pendingAmenities[hotelId] = [];
    window._pendingAmenities[hotelId].push(val);

    const grid = document.getElementById('amenities-toggle-grid');
    const btn  = document.createElement('button');
    btn.className = 'amenity-toggle-btn on';
    btn.textContent = val;
    btn.onclick = () => toggleAmenity(btn, hotelId, val);
    grid.appendChild(btn);

    input.value = '';
}

async function saveAmenities(hotelId) {
    const amenities = window._pendingAmenities?.[hotelId] || [];
    try {
        const { ok, data } = await API(`/owner/hotels/${hotelId}/amenities`, {
            method: 'PUT',
            body: JSON.stringify({ amenities }),
        });
        if (!ok) throw new Error(data.message);

        // Update cache
        const hotel = APP.hotels.find(h => h._id === hotelId);
        if (hotel) hotel.amenities = amenities;

        toast('Amenities saved!', 'success');
        loadAmenitiesByHotel();
    } catch (err) {
        toast(err.message, 'error');
    }
}

/* ════════════════════════════════════════════════════════════
   GALLERY VIEW
════════════════════════════════════════════════════════════ */
function initGalleryView() {
    if (APP.activeHotelId) {
        document.getElementById('gallery-hotel-select').value = APP.activeHotelId;
        loadGalleryByHotel();
    }
}

function loadGalleryByHotel() {
    const hotelId = document.getElementById('gallery-hotel-select').value;
    const content = document.getElementById('gallery-view-content');

    if (!hotelId) {
        content.innerHTML = `<div class="empty-state"><div class="empty-state-icon"><i class="fas fa-images"></i></div><h3>Select a Property</h3><p>Choose a property to manage its gallery.</p></div>`;
        return;
    }

    const hotel  = APP.hotels.find(h => h._id === hotelId);
    if (!hotel) return;

    const images = hotel.images || [];

    content.innerHTML = `
        <div class="owner-panel">
            <div class="card-header">
                <div><h3 class="card-title">Image Gallery — ${hotel.name}</h3><p class="card-subtitle">Cover image and photo gallery management</p></div>
            </div>

            <div class="form-section">
                <div class="form-section-title">Cover Image</div>
                <div class="gallery-cover-preview">
                    ${hotel.coverImage ? `<img src="${hotel.coverImage}" style="width:100%;max-height:200px;object-fit:cover;border-radius:var(--r-lg);margin-bottom:12px" alt="Cover">` : '<div style="height:120px;background:var(--bg-elevated);border-radius:var(--r-lg);display:flex;align-items:center;justify-content:center;margin-bottom:12px;color:var(--text-muted)"><i class="fas fa-image" style="font-size:2rem"></i></div>'}
                    <div class="field-row">
                        <div class="field-group"><label class="field-label">Cover Image URL</label><input type="text" id="gallery-cover-url" class="field-input" value="${hotel.coverImage || ''}" placeholder="https://..."></div>
                        <div style="display:flex;align-items:flex-end"><button class="btn-primary" onclick="saveCover('${hotelId}')"><i class="fas fa-floppy-disk"></i> Save Cover</button></div>
                    </div>
                </div>
            </div>

            <div class="form-section">
                <div class="form-section-title">Photo Gallery (${images.length} photos)</div>
                <div class="gallery-grid" id="gallery-grid-${hotelId}">
                    ${images.map((img, i) => `
                        <div class="gallery-item">
                            <img src="${img}" alt="Photo ${i+1}" onerror="this.parentElement.style.display='none'">
                            <button class="gallery-remove" onclick="removeGalleryImage('${hotelId}', ${i})" title="Remove"><i class="fas fa-xmark"></i></button>
                        </div>`).join('')}
                    <div class="gallery-add-slot">
                        <i class="fas fa-plus"></i>
                        <span>Add Photo</span>
                    </div>
                </div>
                <div class="field-row" style="margin-top:12px">
                    <div class="field-group"><label class="field-label">Add Image URL</label><input type="text" id="gallery-new-url" class="field-input" placeholder="https://..."></div>
                    <div style="display:flex;align-items:flex-end"><button class="btn-primary" onclick="addGalleryImage('${hotelId}')"><i class="fas fa-plus"></i> Add</button></div>
                </div>
            </div>

            <div style="text-align:right">
                <button class="btn-primary" onclick="saveGallery('${hotelId}')"><i class="fas fa-floppy-disk"></i> Save Gallery</button>
            </div>
        </div>`;

    window._pendingImages = { [hotelId]: [...images] };
}

async function saveCover(hotelId) {
    const url = document.getElementById('gallery-cover-url').value.trim();
    try {
        const { ok, data } = await API(`/owner/hotels/${hotelId}/images`, {
            method: 'PUT',
            body: JSON.stringify({ coverImage: url }),
        });
        if (!ok) throw new Error(data.message);
        const hotel = APP.hotels.find(h => h._id === hotelId);
        if (hotel) hotel.coverImage = url;
        toast('Cover image updated!', 'success');
        loadGalleryByHotel();
    } catch (err) { toast(err.message, 'error'); }
}

function addGalleryImage(hotelId) {
    const input = document.getElementById('gallery-new-url');
    const url   = input.value.trim();
    if (!url) return;

    if (!window._pendingImages) window._pendingImages = {};
    if (!window._pendingImages[hotelId]) window._pendingImages[hotelId] = [];
    window._pendingImages[hotelId].push(url);

    const grid = document.getElementById(`gallery-grid-${hotelId}`);
    const idx  = window._pendingImages[hotelId].length - 1;
    const item = document.createElement('div');
    item.className = 'gallery-item';
    item.innerHTML = `<img src="${url}" alt="Photo"><button class="gallery-remove" onclick="removeGalleryImage('${hotelId}', ${idx})"><i class="fas fa-xmark"></i></button>`;
    grid.insertBefore(item, grid.lastElementChild);
    input.value = '';
}

function removeGalleryImage(hotelId, idx) {
    if (window._pendingImages?.[hotelId]) {
        window._pendingImages[hotelId].splice(idx, 1);
    }
    loadGalleryByHotel();
}

async function saveGallery(hotelId) {
    const images = window._pendingImages?.[hotelId] || [];
    try {
        const { ok, data } = await API(`/owner/hotels/${hotelId}/images`, {
            method: 'PUT',
            body: JSON.stringify({ images }),
        });
        if (!ok) throw new Error(data.message);
        const hotel = APP.hotels.find(h => h._id === hotelId);
        if (hotel) hotel.images = images;
        toast('Gallery saved!', 'success');
    } catch (err) { toast(err.message, 'error'); }
}

/* ════════════════════════════════════════════════════════════
   POLICIES VIEW
════════════════════════════════════════════════════════════ */
function initPoliciesView() {
    if (APP.activeHotelId) {
        document.getElementById('policies-hotel-select').value = APP.activeHotelId;
        loadPoliciesByHotel();
    }
}

function loadPoliciesByHotel() {
    const hotelId = document.getElementById('policies-hotel-select').value;
    const content = document.getElementById('policies-view-content');

    if (!hotelId) {
        content.innerHTML = `<div class="empty-state"><div class="empty-state-icon"><i class="fas fa-shield-halved"></i></div><h3>Select a Property</h3><p>Choose a property to manage its policies.</p></div>`;
        return;
    }

    const hotel = APP.hotels.find(h => h._id === hotelId);
    if (!hotel) return;

    const p = hotel.policies || {};

    content.innerHTML = `
        <div class="owner-panel">
            <div class="card-header"><div><h3 class="card-title">Policies — ${hotel.name}</h3></div></div>
            <div class="settings-grid" style="gap:16px">
                <div class="settings-card">
                    <div class="settings-card-header"><i class="fas fa-clock"></i><h3>Check-in / Check-out</h3></div>
                    <div class="field-row">
                        <div class="field-group"><label class="field-label">Check-in Time</label><input type="text" id="pol-checkin" class="field-input" value="${p.checkInTime || '12:00 PM'}" placeholder="12:00 PM"></div>
                        <div class="field-group"><label class="field-label">Check-out Time</label><input type="text" id="pol-checkout" class="field-input" value="${p.checkOutTime || '11:00 AM'}" placeholder="11:00 AM"></div>
                    </div>
                </div>
                <div class="settings-card">
                    <div class="settings-card-header"><i class="fas fa-utensils"></i><h3>Meal Plan</h3></div>
                    <div class="field-group">
                        <label class="field-label">Included Meals</label>
                        <select id="pol-meal" class="field-input">
                            <option value="none" ${p.mealPlan==='none'?'selected':''}>No meals (Room Only)</option>
                            <option value="CP"   ${p.mealPlan==='CP'?'selected':''}>CP — Breakfast Included</option>
                            <option value="MAP"  ${p.mealPlan==='MAP'?'selected':''}>MAP — Breakfast & Dinner</option>
                            <option value="AP"   ${p.mealPlan==='AP'?'selected':''}>AP — All Meals Included</option>
                            <option value="EP"   ${p.mealPlan==='EP'?'selected':''}>EP — European Plan</option>
                        </select>
                    </div>
                </div>
                <div class="settings-card">
                    <div class="settings-card-header"><i class="fas fa-ban"></i><h3>Cancellation Policy</h3></div>
                    <div class="field-group">
                        <select id="pol-cancel" class="field-input">
                            <option value="free"           ${p.cancellation==='free'?'selected':''}>Free Cancellation</option>
                            <option value="moderate"       ${p.cancellation==='moderate'?'selected':''}>Moderate (partial refund)</option>
                            <option value="strict"         ${p.cancellation==='strict'?'selected':''}>Strict (no refund after 7 days)</option>
                            <option value="non_refundable" ${p.cancellation==='non_refundable'?'selected':''}>Non-Refundable</option>
                        </select>
                    </div>
                </div>
                <div class="settings-card">
                    <div class="settings-card-header"><i class="fas fa-house-user"></i><h3>House Rules</h3></div>
                    <div class="field-group" style="margin:0">
                        ${policyToggle('pol-smoking', 'Smoking Allowed', p.smokingAllowed)}
                        ${policyToggle('pol-pets', 'Pets Allowed', p.petsAllowed)}
                        ${policyToggle('pol-couples', 'Couples Allowed', p.couplesAllowed !== false)}
                        ${policyToggle('pol-children', 'Children Allowed', p.childrenAllowed !== false)}
                    </div>
                </div>
            </div>
            <div style="text-align:right;margin-top:16px">
                <button class="btn-primary" onclick="savePolicies('${hotelId}')"><i class="fas fa-floppy-disk"></i> Save Policies</button>
            </div>
        </div>`;
}

function policyToggle(id, label, value) {
    return `
        <label style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border);font-size:0.875rem;cursor:pointer">
            <span>${label}</span>
            <input type="checkbox" id="${id}" ${value ? 'checked' : ''} style="width:16px;height:16px;accent-color:var(--hub-accent)">
        </label>`;
}

async function savePolicies(hotelId) {
    const body = {
        checkInTime:     document.getElementById('pol-checkin').value,
        checkOutTime:    document.getElementById('pol-checkout').value,
        mealPlan:        document.getElementById('pol-meal').value,
        cancellation:    document.getElementById('pol-cancel').value,
        smokingAllowed:  document.getElementById('pol-smoking').checked,
        petsAllowed:     document.getElementById('pol-pets').checked,
        couplesAllowed:  document.getElementById('pol-couples').checked,
        childrenAllowed: document.getElementById('pol-children').checked,
    };
    try {
        const { ok, data } = await API(`/owner/hotels/${hotelId}/policies`, {
            method: 'PUT',
            body: JSON.stringify(body),
        });
        if (!ok) throw new Error(data.message);
        const hotel = APP.hotels.find(h => h._id === hotelId);
        if (hotel) hotel.policies = { ...hotel.policies, ...body };
        toast('Policies saved!', 'success');
    } catch (err) { toast(err.message, 'error'); }
}

/* ════════════════════════════════════════════════════════════
   ROOMS DRAWER (from property cards and rooms view)
════════════════════════════════════════════════════════════ */
function openRoomsDrawer(hotelId) {
    const hotel = APP.hotels.find(h => h._id === hotelId);
    if (!hotel) return;

    document.getElementById('rooms-hotel-id').value = hotelId;
    document.getElementById('rooms-drawer-prop-name').textContent = hotel.name;

    const list = document.getElementById('rooms-list');
    list.innerHTML = '';

    if (hotel.rooms?.length > 0) {
        hotel.rooms.forEach(r => addRoomBlock(r));
    } else {
        addRoomBlock();
    }

    openDrawer('rooms-drawer', 'rooms-drawer-overlay');
}

function closeRoomsDrawer() { closeDrawer('rooms-drawer', 'rooms-drawer-overlay'); }

function addRoomBlock(room = {}) {
    const list = document.getElementById('rooms-list');
    const idx  = list.children.length + 1;

    const block = document.createElement('div');
    block.className = 'room-block';
    block.innerHTML = `
        <div class="room-block-header">
            <span class="room-block-title">Room Type ${idx}</span>
            <button type="button" class="room-block-remove" onclick="this.closest('.room-block').remove(); reindexRoomBlocks()"><i class="fas fa-trash"></i></button>
        </div>
        <div class="field-row" style="margin-bottom:12px">
            <div class="field-group" style="margin:0">
                <label class="field-label">Room Type</label>
                <select class="field-input r-type">
                    ${['Single','Double','Triple','Suite','Deluxe','Premium','Dormitory'].map(t => `<option value="${t}" ${room.type===t?'selected':''}>${t}</option>`).join('')}
                </select>
            </div>
            <div class="field-group" style="margin:0">
                <label class="field-label">Price/Night (₹)</label>
                <input type="number" class="field-input r-price" value="${room.pricePerNight||''}" placeholder="1500" min="0" required>
            </div>
        </div>
        <div class="field-row">
            <div class="field-group" style="margin:0">
                <label class="field-label">Max Occupancy</label>
                <input type="number" class="field-input r-occupancy" value="${room.maxOccupancy||''}" placeholder="2" min="1" required>
            </div>
            <div class="field-group" style="margin:0">
                <label class="field-label">Total Rooms</label>
                <input type="number" class="field-input r-inventory" value="${room.totalRooms||1}" min="1" required>
            </div>
        </div>
        <div class="field-group" style="margin-top:12px;margin-bottom:0">
            <label class="field-label">Room Amenities</label>
            <input type="text" class="field-input r-amenities" value="${(room.amenities||[]).join(', ')}" placeholder="AC, TV, Minibar">
        </div>
        <div class="field-group" style="margin-top:8px;margin-bottom:0">
            <label style="display:flex;align-items:center;gap:8px;font-size:0.82rem;cursor:pointer">
                <input type="checkbox" class="r-available" ${room.available!==false?'checked':''} style="accent-color:var(--hub-accent)">
                <span>Room is available for booking</span>
            </label>
        </div>`;
    list.appendChild(block);
}

function reindexRoomBlocks() {
    document.querySelectorAll('.room-block .room-block-title').forEach((t, i) => t.textContent = `Room Type ${i + 1}`);
}

async function submitRooms() {
    const hotelId = document.getElementById('rooms-hotel-id').value;
    const blocks  = document.querySelectorAll('#rooms-list .room-block');

    if (!blocks.length) { toast('Add at least one room type.', 'warning'); return; }

    const rooms = Array.from(blocks).map(block => ({
        type:          block.querySelector('.r-type').value,
        pricePerNight: Number(block.querySelector('.r-price').value),
        maxOccupancy:  Number(block.querySelector('.r-occupancy').value),
        totalRooms:    Number(block.querySelector('.r-inventory').value),
        amenities:     block.querySelector('.r-amenities').value.split(',').map(a => a.trim()).filter(Boolean),
        available:     block.querySelector('.r-available').checked,
    }));

    if (rooms.some(r => r.pricePerNight <= 0 || r.maxOccupancy <= 0)) {
        toast('All rooms need valid price and occupancy.', 'error');
        return;
    }

    try {
        const { ok, data } = await API(`/owner/hotels/${hotelId}/rooms`, {
            method: 'PUT',
            body: JSON.stringify({ rooms }),
        });
        if (!ok) throw new Error(data.message);

        // Update local cache
        const hotel = APP.hotels.find(h => h._id === hotelId);
        if (hotel) hotel.rooms = data.data.rooms;

        toast('Rooms & pricing updated!', 'success');
        closeRoomsDrawer();

        // Refresh whichever view is active
        if (APP.currentView === 'rooms')      loadRoomsByHotel();
        if (APP.currentView === 'properties') loadProperties();

    } catch (err) { toast(err.message, 'error'); }
}

/* ════════════════════════════════════════════════════════════
   BOOKINGS
════════════════════════════════════════════════════════════ */
async function loadBookings() {
    const tbody = document.getElementById('bookings-tbody');
    if (tbody) tbody.innerHTML = `<tr><td colspan="9" class="empty-state-cell"><div class="skeleton-loader"></div></td></tr>`;

    try {
        const { ok, data } = await API('/owner/bookings');
        if (!ok) throw new Error('Failed to load bookings');

        APP.bookings = data.data || [];
        filterBookings();
        updateBookingStrip(APP.bookings);

    } catch (err) {
        const tbody = document.getElementById('bookings-tbody');
        if (tbody) tbody.innerHTML = `<tr><td colspan="9" class="empty-state-cell" style="color:var(--hub-rose)"><i class="fas fa-triangle-exclamation"></i> ${err.message}</td></tr>`;
    }
}

function filterBookings() {
    const statusFilter = document.getElementById('booking-status-filter')?.value;
    const hotelFilter  = document.getElementById('booking-hotel-filter')?.value || APP.activeHotelId;

    let filtered = [...APP.bookings];
    if (statusFilter) filtered = filtered.filter(b => b.status === statusFilter);
    if (hotelFilter)  filtered = filtered.filter(b => b.hotel?._id === hotelFilter || b.hotel === hotelFilter);

    renderBookingsTable(filtered);
}

function renderBookingsTable(bookings) {
    const tbody = document.getElementById('bookings-tbody');
    if (!tbody) return;

    if (!bookings.length) {
        tbody.innerHTML = `<tr><td colspan="9" class="empty-state-cell"><i class="far fa-calendar" style="font-size:2rem;color:var(--text-muted);display:block;margin-bottom:8px"></i>No bookings found</td></tr>`;
        return;
    }

    tbody.innerHTML = bookings.map(b => `
        <tr>
            <td><code style="font-size:0.75rem;background:var(--bg-elevated);padding:2px 6px;border-radius:4px">${b.bookingRef || '—'}</code></td>
            <td><div class="td-primary">${b.user?.name || 'Unknown'}</div><div class="td-secondary">${b.user?.email || ''}</div></td>
            <td>${b.hotel?.name || '—'}</td>
            <td>${fmtDate(b.travelDate)}</td>
            <td>${b.travelers}</td>
            <td><strong>${fmtMoney(b.totalPrice)}</strong></td>
            <td><span class="chip chip-${b.paymentStatus || 'inactive'}">${b.paymentStatus || 'unpaid'}</span></td>
            <td>${chipHtml(b.status)}</td>
            <td><button class="tbl-btn view" onclick="openBookingDrawer('${b._id}')" title="View & update"><i class="fas fa-arrow-right"></i></button></td>
        </tr>`
    ).join('');
}

function updateBookingStrip(bookings) {
    const counts = { pending: 0, confirmed: 0, completed: 0, rejected: 0 };
    bookings.forEach(b => { if (counts[b.status] !== undefined) counts[b.status]++; });
    document.getElementById('bs-pending').textContent   = counts.pending;
    document.getElementById('bs-confirmed').textContent = counts.confirmed;
    document.getElementById('bs-completed').textContent = counts.completed;
    document.getElementById('bs-rejected').textContent  = counts.rejected;
    updatePendingBadge(counts.pending);
}

/* ── Booking Drawer ─────────────────────────────────────── */
function openBookingDrawer(bookingId) {
    const b = APP.bookings.find(x => x._id === bookingId);
    if (!b) return;

    document.getElementById('active-booking-id').value   = bookingId;
    document.getElementById('booking-drawer-ref').textContent = b.bookingRef || bookingId.slice(-8).toUpperCase();
    document.getElementById('booking-new-status').value  = b.status;
    document.getElementById('booking-notes').value       = b.adminNotes || '';

    document.getElementById('booking-detail-grid').innerHTML = [
        ['Guest',       b.user?.name || 'Unknown'],
        ['Email',       b.user?.email || '—'],
        ['Phone',       b.user?.phone || '—'],
        ['Property',    b.hotel?.name || '—'],
        ['Travel Date', fmtDate(b.travelDate)],
        ['Return Date', fmtDate(b.returnDate)],
        ['Guests',      b.travelers],
        ['Total',       `<strong style="color:var(--hub-emerald)">${fmtMoney(b.totalPrice)}</strong>`],
        ['Payment',     b.paymentStatus || 'unpaid'],
        ['Special Req', b.specialRequests || '—'],
        ['Booked On',   fmtDate(b.createdAt)],
        ['Status',      chipHtml(b.status)],
    ].map(([label, value]) => `<div class="booking-detail-row"><span class="bd-label">${label}</span><span class="bd-value">${value}</span></div>`).join('');

    openDrawer('booking-drawer', 'booking-drawer-overlay');
}

function closeBookingDrawer() { closeDrawer('booking-drawer', 'booking-drawer-overlay'); }

async function submitBookingUpdate() {
    const id     = document.getElementById('active-booking-id').value;
    const status = document.getElementById('booking-new-status').value;
    const notes  = document.getElementById('booking-notes').value;

    try {
        const { ok, data } = await API(`/owner/bookings/${id}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status, adminNotes: notes }),
        });
        if (!ok) throw new Error(data.message);

        toast('Booking updated!', 'success');
        closeBookingDrawer();

        // Update local state
        const idx = APP.bookings.findIndex(b => b._id === id);
        if (idx >= 0) APP.bookings[idx].status = status;

        filterBookings();
        updateBookingStrip(APP.bookings);
        if (APP.currentView === 'dashboard') loadDashboard();

    } catch (err) { toast(err.message, 'error'); }
}

/* ════════════════════════════════════════════════════════════
   GUESTS
════════════════════════════════════════════════════════════ */
async function loadGuests() {
    const tbody = document.getElementById('guests-tbody');
    if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="empty-state-cell"><div class="skeleton-loader"></div></td></tr>`;

    try {
        const { ok, data } = await API('/owner/guests');
        if (!ok) throw new Error('Failed to load guests');

        APP.guests = data.data || [];

        if (!APP.guests.length) {
            tbody.innerHTML = `<tr><td colspan="6" class="empty-state-cell"><i class="fas fa-users" style="font-size:2rem;color:var(--text-muted);display:block;margin-bottom:8px"></i>No guests yet</td></tr>`;
            return;
        }

        tbody.innerHTML = APP.guests.map(g => `
            <tr>
                <td>
                    <div style="display:flex;align-items:center;gap:10px">
                        <div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,var(--hub-accent),var(--hub-emerald));display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:0.8rem;flex-shrink:0">${(g.name||'G').charAt(0).toUpperCase()}</div>
                        <div class="td-primary">${g.name}</div>
                    </div>
                </td>
                <td>${g.email}</td>
                <td><strong>${g.bookings}</strong></td>
                <td><strong style="color:var(--hub-emerald)">${fmtMoney(g.totalSpent)}</strong></td>
                <td>${g.lastProperty || '—'}</td>
                <td>${fmtDate(g.lastBooking)}</td>
            </tr>`
        ).join('');

    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="6" class="empty-state-cell" style="color:var(--hub-rose)">${err.message}</td></tr>`;
    }
}

/* ════════════════════════════════════════════════════════════
   REVIEWS
════════════════════════════════════════════════════════════ */
async function loadReviews() {
    const list = document.getElementById('reviews-list');
    if (list) list.innerHTML = `<div class="empty-state"><div class="skeleton-loader" style="width:100%;height:80px"></div></div>`;

    try {
        const { ok, data } = await API('/owner/reviews');
        if (!ok) throw new Error('Failed to load reviews');

        APP.reviews = data.data || [];
        updateRatingOverview(data);
        renderReviewsList(APP.reviews);

        // Populate filter options
        const sel = document.getElementById('reviews-hotel-filter');
        if (sel) {
            const opts = APP.hotels.map(h => `<option value="${h._id}">${h.name}</option>`).join('');
            sel.innerHTML = '<option value="">All Properties</option>' + opts;
        }

    } catch (err) {
        if (list) list.innerHTML = `<div class="empty-state"><div class="empty-state-icon" style="background:var(--hub-rose-subtle);color:var(--hub-rose)"><i class="fas fa-triangle-exclamation"></i></div><h3>Error</h3><p>${err.message}</p></div>`;
    }
}

function filterReviews() {
    const hotelId = document.getElementById('reviews-hotel-filter')?.value;
    const filtered = hotelId
        ? APP.reviews.filter(r => r.targetId?.toString() === hotelId)
        : APP.reviews;
    renderReviewsList(filtered);
}

function renderReviewsList(reviews) {
    const list = document.getElementById('reviews-list');
    if (!list) return;

    if (!reviews.length) {
        list.innerHTML = `<div class="empty-state"><div class="empty-state-icon"><i class="fas fa-star"></i></div><h3>No Reviews Yet</h3><p>Guest reviews appear here once submitted and approved.</p></div>`;
        return;
    }

    list.innerHTML = reviews.map(r => `
        <div class="review-card">
            <div class="review-card-header">
                <div class="review-author">
                    <div class="review-avatar">${(r.user?.name || 'G').charAt(0).toUpperCase()}</div>
                    <div>
                        <div class="review-author-name">${r.user?.name || 'Anonymous'}${r.verified ? ' <span style="color:var(--hub-emerald);font-size:0.7rem;"><i class="fas fa-circle-check"></i> Verified Stay</span>' : ''}</div>
                        <div class="review-property"><i class="fas fa-hotel" style="font-size:0.65rem"></i> ${r.hotelName || '—'}</div>
                    </div>
                </div>
                <div style="text-align:right">
                    <div class="review-stars">${starIcons(r.rating)}</div>
                    <div class="review-date">${fmtDate(r.createdAt)}</div>
                </div>
            </div>
            ${r.title ? `<div style="font-weight:600;margin-bottom:6px;font-size:0.9rem">${r.title}</div>` : ''}
            ${r.content ? `<div class="review-body">"${r.content}"</div>` : ''}
            ${r.ownerResponse?.content ? `
                <div class="owner-response">
                    <div class="owner-response-label"><i class="fas fa-building-columns"></i> Owner Response</div>
                    <div class="owner-response-text">${r.ownerResponse.content}</div>
                </div>` : ''}
            <div style="margin-top:12px">
                <button class="btn-sm-ghost" onclick="openReviewDrawer('${r._id}', '${encodeHtml(r.user?.name || 'Guest')}', ${r.rating})">
                    <i class="fas fa-reply"></i> ${r.ownerResponse?.content ? 'Edit Response' : 'Respond'}
                </button>
            </div>
        </div>`
    ).join('');
}

function updateRatingOverview(data) {
    const { averageRating, total, distribution } = data;

    document.getElementById('avg-rating-score').textContent = averageRating || '—';
    document.getElementById('avg-rating-total').textContent = total ? `${total} review${total !== 1 ? 's' : ''}` : 'No reviews yet';
    document.getElementById('avg-rating-stars').innerHTML   = starIcons(parseFloat(averageRating) || 0);

    [1,2,3,4,5].forEach(n => {
        const count = distribution?.[n] || 0;
        const pct   = total ? Math.round((count / total) * 100) : 0;
        const bar   = document.getElementById(`rbar-${n}`);
        const cnt   = document.getElementById(`rbar-${n}-count`);
        if (bar) bar.style.width = pct + '%';
        if (cnt) cnt.textContent = count;
    });
}

/* ── Review Respond Drawer ──────────────────────────────── */
function openReviewDrawer(reviewId, guestName, rating) {
    document.getElementById('active-review-id').value = reviewId;
    document.getElementById('review-drawer-sub').textContent = `Review from ${guestName}`;

    const review = APP.reviews.find(r => r._id === reviewId);
    document.getElementById('review-detail-content').innerHTML = `
        <div class="review-stars" style="margin-bottom:8px">${starIcons(rating)}</div>
        <div class="review-body">"${review?.content || ''}"</div>`;
    document.getElementById('review-response-text').value = review?.ownerResponse?.content || '';

    openDrawer('review-drawer', 'review-drawer-overlay');
}

function closeReviewDrawer() { closeDrawer('review-drawer', 'review-drawer-overlay'); }

async function submitReviewResponse() {
    const id      = document.getElementById('active-review-id').value;
    const content = document.getElementById('review-response-text').value.trim();

    if (!content) { toast('Please write a response.', 'warning'); return; }

    try {
        const { ok, data } = await API(`/owner/reviews/${id}/respond`, {
            method: 'POST',
            body: JSON.stringify({ content }),
        });
        if (!ok) throw new Error(data.message);

        toast('Response published!', 'success');
        closeReviewDrawer();
        loadReviews();
    } catch (err) { toast(err.message, 'error'); }
}

/* ════════════════════════════════════════════════════════════
   SETTINGS & PROFILE
════════════════════════════════════════════════════════════ */
let settingsListenersBound = false;

async function populateSettings() {
    try {
        const { ok, data } = await API('/owner/me');
        if (!ok) throw new Error(data.message || 'Failed to load profile');
        const user = data.data;

        // Sidebar display
        const initial = user.name.charAt(0).toUpperCase();
        document.getElementById('settings-avatar-main').textContent = initial;
        document.getElementById('settings-name-main').textContent   = user.name;
        document.getElementById('settings-email-main').textContent  = user.email || '—';
        document.getElementById('settings-joined').textContent      = fmtDate(user.createdAt);

        // Form fields
        document.getElementById('prof-name').value        = user.name || '';
        document.getElementById('prof-phone').value       = user.phone || '';
        document.getElementById('prof-email').value       = user.email || '';
        document.getElementById('prof-nationality').value = user.nationality || '';
        document.getElementById('prof-bio').value         = user.bio || '';
        document.getElementById('prof-currency').value    = user.currency || 'INR';
        document.getElementById('prof-language').value    = user.language || 'en';

        if (!settingsListenersBound) {
            setupSettingsListeners();
            settingsListenersBound = true;
        }
    } catch (err) {
        toast(err.message, 'error');
    }
}

function setupSettingsListeners() {
    const profileForm = document.getElementById('owner-profile-form');
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('prof-save-btn');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            btn.disabled = true;

            const payload = {
                name: document.getElementById('prof-name').value.trim(),
                phone: document.getElementById('prof-phone').value.trim(),
                nationality: document.getElementById('prof-nationality').value.trim(),
                bio: document.getElementById('prof-bio').value.trim(),
                currency: document.getElementById('prof-currency').value,
                language: document.getElementById('prof-language').value,
            };

            try {
                const { ok, data } = await API('/owner/profile', {
                    method: 'PUT',
                    body: JSON.stringify(payload)
                });
                if (!ok) throw new Error(data.message);

                toast('Profile updated successfully', 'success');
                // Update local session
                if (window.WL && WL.Session) {
                    const sessionUser = WL.Session.getUser();
                    if (sessionUser) {
                        Object.assign(sessionUser, data.data);
                        WL.Session.save(null, sessionUser);
                    }
                }
                populateSettings(); // Reload
            } catch (err) {
                toast(err.message, 'error');
            } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        });
    }

    const pwForm = document.getElementById('owner-password-form');
    if (pwForm) {
        pwForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('pw-save-btn');
            
            const currentPassword = document.getElementById('pw-current').value;
            const newPassword     = document.getElementById('pw-new').value;
            const confirmPassword = document.getElementById('pw-confirm').value;

            if (newPassword !== confirmPassword) {
                toast('New passwords do not match', 'error');
                return;
            }

            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
            btn.disabled = true;

            try {
                const { ok, data } = await API('/owner/password', {
                    method: 'PUT',
                    body: JSON.stringify({ currentPassword, newPassword, confirmPassword })
                });
                if (!ok) throw new Error(data.message);

                toast('Password changed successfully', 'success');
                pwForm.reset();
            } catch (err) {
                toast(err.message, 'error');
            } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        });
    }
}

/* ════════════════════════════════════════════════════════════
   DRAWER SYSTEM
════════════════════════════════════════════════════════════ */
function openDrawer(drawerId, overlayId) {
    document.getElementById(drawerId).classList.add('open');
    document.getElementById(overlayId).classList.add('open');
    document.body.style.overflow = 'hidden';
}
function closeDrawer(drawerId, overlayId) {
    document.getElementById(drawerId).classList.remove('open');
    document.getElementById(overlayId).classList.remove('open');
    document.body.style.overflow = '';
}

/* ════════════════════════════════════════════════════════════
   HELPERS
════════════════════════════════════════════════════════════ */
function fmtMoney(amount) { return '₹' + Number(amount || 0).toLocaleString('en-IN'); }

function fmtDate(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtType(type) {
    if (!type) return '';
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function chipHtml(status) {
    const s = (status || 'pending').toLowerCase();
    return `<span class="chip chip-${s}">${s.charAt(0).toUpperCase() + s.slice(1)}</span>`;
}

function starIcons(rating) {
    const full  = Math.floor(rating);
    const half  = rating - full >= 0.5;
    const empty = 5 - full - (half ? 1 : 0);
    return (
        '<i class="fas fa-star"></i>'.repeat(full) +
        (half ? '<i class="fas fa-star-half-stroke"></i>' : '') +
        '<i class="far fa-star"></i>'.repeat(empty)
    );
}

function encodeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function updatePendingBadge(count) {
    const badge = document.getElementById('nav-pending-badge');
    if (!badge) return;
    badge.textContent    = count;
    badge.style.display  = count > 0 ? 'inline-block' : 'none';
}

/* ════════════════════════════════════════════════════════════
   TOAST SYSTEM
════════════════════════════════════════════════════════════ */
function toast(message, type = 'info') {
    const stack = document.getElementById('toast-stack');
    if (!stack) return;

    const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', warning: 'fa-triangle-exclamation', info: 'fa-circle-info' };
    const el    = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<i class="fas ${icons[type]||icons.info} toast-icon"></i><span>${message}</span>`;
    stack.appendChild(el);

    setTimeout(() => { el.classList.add('dismiss'); setTimeout(() => el.remove(), 280); }, 3500);
}

/* ════════════════════════════════════════════════════════════
   PACKAGES & TOURS
════════════════════════════════════════════════════════════ */
let ALL_PACKAGES = [];

async function loadPackages() {
    const grid  = document.getElementById('pkg-grid');
    const empty = document.getElementById('pkg-empty');
    if (!grid) return;

    grid.innerHTML = '<div class="skeleton-prop-card"></div><div class="skeleton-prop-card"></div>';
    grid.style.display = 'grid';
    if (empty) empty.style.display = 'none';

    try {
        const { ok, data } = await API('/owner/packages');
        if (!ok) throw new Error('Failed to load packages');

        ALL_PACKAGES = data.data || [];

        // Update stats
        const activeCount = ALL_PACKAGES.filter(p => p.isActive && p.status === 'active').length;
        const avgPrice    = ALL_PACKAGES.length
            ? Math.round(ALL_PACKAGES.reduce((s, p) => s + (p.price || 0), 0) / ALL_PACKAGES.length)
            : 0;
        const pkgCount = document.getElementById('pkg-count');
        const pkgActive = document.getElementById('pkg-active-count');
        const pkgAvg    = document.getElementById('pkg-avg-price');
        if (pkgCount)  pkgCount.textContent  = ALL_PACKAGES.length;
        if (pkgActive) pkgActive.textContent = activeCount;
        if (pkgAvg)    pkgAvg.textContent    = fmtMoney(avgPrice);

        if (!ALL_PACKAGES.length) {
            grid.style.display = 'none';
            if (empty) empty.style.display = 'flex';
            return;
        }

        grid.style.display = 'grid';
        if (empty) empty.style.display = 'none';
        grid.innerHTML = ALL_PACKAGES.map(buildPackageCard).join('');

    } catch (err) {
        grid.innerHTML = `<div class="empty-state"><div class="empty-state-icon" style="background:var(--hub-rose-subtle);color:var(--hub-rose)"><i class="fas fa-triangle-exclamation"></i></div><h3>Error</h3><p>${err.message}</p></div>`;
    }
}

function buildPackageCard(p) {
    const destName = p.destination?.name || '—';
    const destCountry = p.destination?.country || '';
    const isActive = p.isActive && p.status === 'active';
    const statusClass = isActive ? 'chip-active' : 'chip-inactive';
    const statusText  = isActive ? 'Active' : 'Archived';
    const duration = `${p.duration?.days || 1}D / ${p.duration?.nights || 0}N`;
    const rating = p.rating ? `<span style="color:var(--hub-amber)">★</span> ${p.rating.toFixed(1)}` : '—';

    return `
        <div class="prop-card">
            <div style="position:relative">
                ${p.coverImage
                    ? `<img src="${p.coverImage}" class="prop-card-img" alt="${p.title}" onerror="this.style.display='none'">`
                    : `<div class="prop-card-img-placeholder"><i class="fas fa-suitcase-rolling"></i></div>`
                }
                <div class="prop-card-status"><span class="chip ${statusClass}">${statusText}</span></div>
                ${p.badge ? `<div style="position:absolute;top:8px;left:8px;background:var(--hub-accent);color:#fff;font-size:0.7rem;font-weight:700;padding:3px 10px;border-radius:20px">${p.badge}</div>` : ''}
            </div>
            <div class="prop-card-body">
                <div class="prop-card-type"><i class="fas fa-suitcase-rolling"></i> ${duration}</div>
                <div class="prop-card-name">${p.title}</div>
                <div class="prop-card-location"><i class="fas fa-location-dot" style="color:var(--hub-accent);font-size:0.75rem"></i> ${destName}${destCountry ? ', ' + destCountry : ''}</div>
                <div class="prop-card-meta">
                    <div class="prop-card-meta-item"><span class="prop-meta-value">${fmtMoney(p.price || 0)}</span><span class="prop-meta-label">Per Person</span></div>
                    <div class="prop-card-meta-item"><span class="prop-meta-value">${p.groupSize?.max || '—'}</span><span class="prop-meta-label">Max Group</span></div>
                    <div class="prop-card-meta-item"><span class="prop-meta-value">${rating}</span><span class="prop-meta-label">Rating</span></div>
                    <div class="prop-card-meta-item"><span class="prop-meta-value">${p.reviewCount || 0}</span><span class="prop-meta-label">Reviews</span></div>
                </div>
                <div class="prop-card-actions">
                    <button class="btn-sm-ghost" onclick='openPackageForm(${JSON.stringify(p).replace(/'/g, "\\'")})'><i class="fas fa-pen"></i> Edit</button>
                    <a href="../package-detail.html?id=${p._id}" target="_blank" class="btn-sm-ghost"><i class="fas fa-eye"></i> View</a>
                    <button class="btn-sm-ghost" style="color:var(--hub-rose)" onclick="deletePackage('${p._id}')"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        </div>`;
}

/* ── Package Drawer ──────────────────────────────────────── */
async function openPackageForm(p = null) {
    const isEdit = p && p._id;
    document.getElementById('pkg-drawer-title').textContent = isEdit ? 'Edit Package' : 'Add New Package';
    document.getElementById('package-form').reset();
    document.getElementById('pkg-id').value = '';

    // Load destinations dropdown
    await loadDestinationsDropdown(isEdit ? p.destination?._id : null);

    if (isEdit) {
        document.getElementById('pkg-id').value          = p._id;
        document.getElementById('pkg-title').value       = p.title || '';
        document.getElementById('pkg-price').value       = p.price || '';
        document.getElementById('pkg-days').value        = p.duration?.days || 1;
        document.getElementById('pkg-nights').value      = p.duration?.nights || 0;
        document.getElementById('pkg-maxgroup').value    = p.groupSize?.max || 20;
        document.getElementById('pkg-difficulty').value  = p.difficulty || 'Moderate';
        document.getElementById('pkg-badge').value       = p.badge || '';
        document.getElementById('pkg-short-desc').value  = p.shortDescription || '';
        document.getElementById('pkg-desc').value        = p.description || '';
        document.getElementById('pkg-cover').value       = p.coverImage || '';
        document.getElementById('pkg-highlights').value  = (p.highlights || []).join(', ');
        document.getElementById('pkg-includes').value    = (p.priceIncludes || []).join(', ');
        document.getElementById('pkg-excludes').value    = (p.priceExcludes || []).join(', ');
        document.getElementById('pkg-tags').value        = (p.tags || []).join(', ');
        // Set destination select
        if (p.destination?._id) {
            document.getElementById('pkg-destination').value = p.destination._id;
        }
    }

    openDrawer('pkg-drawer', 'pkg-drawer-overlay');
}

async function loadDestinationsDropdown(selectedId = null) {
    const sel = document.getElementById('pkg-destination');
    if (!sel) return;
    sel.innerHTML = '<option value="">Loading destinations...</option>';
    try {
        const { ok, data } = await API('/owner/destinations');
        if (!ok) throw new Error('Failed');
        const dests = data.data || [];
        sel.innerHTML = '<option value="">-- Select Destination (optional) --</option>' +
            dests.map(d => `<option value="${d._id}" ${selectedId === d._id ? 'selected' : ''}>${d.name}, ${d.country}</option>`).join('');
    } catch (_) {
        sel.innerHTML = '<option value="">Could not load destinations</option>';
    }
}

function closePackageForm() { closeDrawer('pkg-drawer', 'pkg-drawer-overlay'); }

async function handlePackageSubmit(e) {
    e.preventDefault();
    const id  = document.getElementById('pkg-id').value;
    const btn = document.getElementById('pkg-submit-btn');

    const split = (str) => str.split(',').map(s => s.trim()).filter(Boolean);

    const body = {
        title:            document.getElementById('pkg-title').value.trim(),
        price:            Number(document.getElementById('pkg-price').value),
        destination:      document.getElementById('pkg-destination').value || undefined,
        duration:         { days: Number(document.getElementById('pkg-days').value), nights: Number(document.getElementById('pkg-nights').value) },
        groupSize:        { min: 1, max: Number(document.getElementById('pkg-maxgroup').value) },
        difficulty:       document.getElementById('pkg-difficulty').value,
        badge:            document.getElementById('pkg-badge').value.trim() || undefined,
        shortDescription: document.getElementById('pkg-short-desc').value.trim(),
        description:      document.getElementById('pkg-desc').value.trim(),
        coverImage:       document.getElementById('pkg-cover').value.trim() || undefined,
        highlights:       split(document.getElementById('pkg-highlights').value),
        priceIncludes:    split(document.getElementById('pkg-includes').value),
        priceExcludes:    split(document.getElementById('pkg-excludes').value),
        tags:             split(document.getElementById('pkg-tags').value),
    };

    if (!body.title) { toast('Package title is required.', 'error'); return; }
    if (!body.price || body.price <= 0) { toast('A valid price is required.', 'error'); return; }

    try {
        btn.disabled  = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

        const endpoint = id ? `/owner/packages/${id}` : '/owner/packages';
        const method   = id ? 'PUT' : 'POST';
        const { ok, data } = await API(endpoint, { method, body: JSON.stringify(body) });

        if (!ok) throw new Error(data.message || 'Failed to save package');

        toast(`Package ${id ? 'updated' : 'created'} successfully!`, 'success');
        closePackageForm();
        document.getElementById('package-form').reset();
        await loadPackages();

    } catch (err) {
        toast(err.message, 'error');
    } finally {
        btn.disabled  = false;
        btn.innerHTML = '<i class="fas fa-floppy-disk"></i> Save Package';
    }
}

async function deletePackage(id) {
    if (!confirm('Archive this package? It will be hidden from the public listing.')) return;
    try {
        const { ok, data } = await API(`/owner/packages/${id}`, { method: 'DELETE' });
        if (!ok) throw new Error(data.message || 'Failed to archive');
        toast('Package archived.', 'success');
        await loadPackages();
    } catch (err) {
        toast(err.message, 'error');
    }
}
