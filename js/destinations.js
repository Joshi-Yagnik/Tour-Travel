/* ============================================================
   WANDERLUST — Destinations Filter JS
   ============================================================ */
(function () {
    'use strict';

    const grid = document.getElementById('destinations-grid');
    const noResults = document.getElementById('no-results');
    const countEl = document.getElementById('results-count');
    const searchInput = document.getElementById('dest-search');
    const regionFilter = document.getElementById('region-filter');
    const budgetFilter = document.getElementById('budget-filter');
    const sortFilter = document.getElementById('sort-filter');
    const loadMoreBtn = document.getElementById('load-more');

    function filterAndSort() {
        const search = searchInput.value.toLowerCase().trim();
        const region = regionFilter.value;
        const budget = budgetFilter.value;

        const items = [...grid.querySelectorAll('.dest-item')];
        let visible = [];

        items.forEach(item => {
            const name = item.dataset.name.toLowerCase();
            const itemRegion = item.dataset.region;
            const price = parseInt(item.dataset.price, 10);

            let show = true;
            if (search && !name.includes(search)) show = false;
            if (region && itemRegion !== region) show = false;
            if (budget === 'budget' && price >= 1000) show = false;
            if (budget === 'mid' && (price < 1000 || price > 2000)) show = false;
            if (budget === 'luxury' && price < 2000) show = false;

            item.classList.toggle('hidden', !show);
            if (show) visible.push(item);
        });

        // Sort visible items
        const sortBy = sortFilter.value;
        visible.sort((a, b) => {
            if (sortBy === 'price-low') return parseInt(a.dataset.price) - parseInt(b.dataset.price);
            if (sortBy === 'price-high') return parseInt(b.dataset.price) - parseInt(a.dataset.price);
            if (sortBy === 'rating') return parseInt(b.dataset.rating) - parseInt(a.dataset.rating);
            return 0; // popular = original order
        });

        // Re-insert in sorted order
        visible.forEach(item => grid.appendChild(item));

        // Update count
        const count = visible.length;
        if (countEl) countEl.textContent = count;
        if (noResults) noResults.style.display = count === 0 ? 'block' : 'none';
    }

    window.clearFilters = function () {
        searchInput.value = '';
        regionFilter.value = '';
        budgetFilter.value = '';
        sortFilter.value = 'popular';
        filterAndSort();
    };

    if (searchInput) searchInput.addEventListener('input', filterAndSort);
    if (regionFilter) regionFilter.addEventListener('change', filterAndSort);
    if (budgetFilter) budgetFilter.addEventListener('change', filterAndSort);
    if (sortFilter) sortFilter.addEventListener('change', filterAndSort);

    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', () => {
            showToast('Loading more destinations...', 'info');
            // In a real app, this would fetch more pages from the backend
        });
    }
}());
