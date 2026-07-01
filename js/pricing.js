/* ============================================================
   WANDERLUST — Shared Pricing Engine v1.0
   WL_Pricing: calculates and renders full booking cost breakdown
   Platform Fee: ₹1,999 flat | GST: 9% | SGST: 9%
   ============================================================ */

window.WL_Pricing = (function () {
    'use strict';

    /* ── Constants ─────────────────────────────────────────── */
    const PLATFORM_FEE = 1999;
    const GST_RATE     = 0.09;   // 9%
    const SGST_RATE    = 0.09;   // 9%

    /* ── Currency formatter ─────────────────────────────────── */
    const fmt = (val) =>
        new Intl.NumberFormat('en-IN', {
            style:                 'currency',
            currency:              'INR',
            maximumFractionDigits: 0,
        }).format(val || 0);

    /* ── Core calculation ───────────────────────────────────── */
    /**
     * @param {object} params
     * @param {number} params.basePrice  - unit price (per night OR per person)
     * @param {number} params.nights     - nights (hotel) | default 1
     * @param {number} params.rooms      - rooms (hotel)  | default 1
     * @param {number} params.guests     - travelers/guests
     * @param {string} params.type       - 'hotel' | 'package'
     * @returns {object} Full pricing breakdown
     */
    function calculate({ basePrice = 0, nights = 1, rooms = 1, guests = 1, type = 'package' }) {
        const base   = parseFloat(basePrice) || 0;
        const n      = parseInt(nights)      || 1;
        const r      = parseInt(rooms)       || 1;
        const g      = parseInt(guests)      || 1;

        let subtotal;
        if (type === 'hotel') {
            subtotal = Math.round(base * n * r);
        } else {
            subtotal = Math.round(base * g);
        }

        const platformFee    = PLATFORM_FEE;
        const gst            = Math.round(subtotal * GST_RATE);
        const sgst           = Math.round(subtotal * SGST_RATE);
        const cgst           = 0;
        const convenienceFee = 0;
        const grandTotal     = subtotal + platformFee + gst + sgst + cgst + convenienceFee;

        const advanceAmount  = Math.round(grandTotal * 0.4);
        const remainingAmount = grandTotal - advanceAmount;

        return { basePrice: base, nights: n, rooms: r, guests: g, subtotal, platformFee, gst, sgst, cgst, convenienceFee, grandTotal, advanceAmount, remainingAmount, currency: 'INR' };
    }

    /* ── Render price breakdown HTML ────────────────────────── */
    /**
     * Injects a full, styled price breakdown into a container element.
     * @param {HTMLElement} container  - The element to inject into
     * @param {object}      pricing    - Result of calculate()
     * @param {string}      [label]    - Context label e.g. 'per night' or 'per person'
     * @param {string}      [type]     - 'hotel' | 'package'
     */
    function renderBreakdown(container, pricing, label = 'per night', type = 'hotel') {
        if (!container) return;
        const { basePrice, nights, rooms, guests, subtotal, platformFee, gst, sgst, grandTotal } = pricing;

        let formulaLine = '';
        if (type === 'hotel') {
            if (nights > 1 || rooms > 1) {
                formulaLine = `
                    <div class="pb-formula">
                        ${fmt(basePrice)} × ${nights} night${nights !== 1 ? 's' : ''}
                        ${rooms > 1 ? ` × ${rooms} room${rooms !== 1 ? 's' : ''}` : ''}
                        = ${fmt(subtotal)}
                    </div>`;
            }
        } else {
            if (guests > 1) {
                formulaLine = `
                    <div class="pb-formula">
                        ${fmt(basePrice)} × ${guests} person${guests !== 1 ? 's' : ''} = ${fmt(subtotal)}
                    </div>`;
            }
        }

        container.innerHTML = `
            <div class="price-breakdown">
                <div class="pb-header">
                    <span class="pb-base">${fmt(basePrice)}</span>
                    <span class="pb-label">${label}</span>
                </div>
                ${formulaLine}
                <div class="pb-rows">
                    <div class="pb-row">
                        <span class="pb-row__name">Subtotal</span>
                        <span class="pb-row__val">${fmt(subtotal)}</span>
                    </div>
                    <div class="pb-row">
                        <span class="pb-row__name">
                            Platform Fee
                            <span class="pb-info" title="Wanderlust service charge per booking">ⓘ</span>
                        </span>
                        <span class="pb-row__val">${fmt(platformFee)}</span>
                    </div>
                    <div class="pb-row pb-row--tax">
                        <span class="pb-row__name">GST (9%)</span>
                        <span class="pb-row__val">${fmt(gst)}</span>
                    </div>
                    <div class="pb-row pb-row--tax">
                        <span class="pb-row__name">SGST (9%)</span>
                        <span class="pb-row__val">${fmt(sgst)}</span>
                    </div>
                </div>
                <div class="pb-divider"></div>
                <div class="pb-total">
                    <span class="pb-total__label">Total Booking Amount</span>
                    <span class="pb-total__amount">${fmt(grandTotal)}</span>
                </div>
                <div class="pb-total" style="color: var(--primary); font-size: 1.1rem; margin-top: 0.5rem;">
                    <span class="pb-total__label">Pay Now (40%)</span>
                    <span class="pb-total__amount">${fmt(pricing.advanceAmount || Math.round(grandTotal * 0.4))}</span>
                </div>
                <div class="pb-total" style="color: var(--text-muted); font-size: 1rem; margin-top: 0.5rem;">
                    <span class="pb-total__label">Pay Later (60%)</span>
                    <span class="pb-total__amount">${fmt(pricing.remainingAmount || (grandTotal - Math.round(grandTotal * 0.4)))}</span>
                </div>
                <div class="pb-trust">
                    <span><i class="fas fa-shield-alt"></i> Taxes included</span>
                    <span><i class="fas fa-lock"></i> Secure payment</span>
                    <span><i class="fas fa-receipt"></i> GST invoice</span>
                </div>
            </div>`;
    }

    /* ── Render compact inline breakdown (for dashboard/cards) ─ */
    /**
     * Returns an HTML string for a compact booking price breakdown.
     * Used in dashboard booking cards.
     */
    function renderCompact(pricing) {
        if (!pricing || !pricing.grandTotal) return '';
        const { subtotal = 0, platformFee = 0, gst = 0, sgst = 0, grandTotal = 0 } = pricing;

        return `
            <div class="pb-compact">
                <div class="pb-compact__row">
                    <span>Subtotal</span><span>${fmt(subtotal)}</span>
                </div>
                <div class="pb-compact__row">
                    <span>Platform Fee</span><span>${fmt(platformFee)}</span>
                </div>
                <div class="pb-compact__row pb-compact__row--tax">
                    <span>GST + SGST (18%)</span><span>${fmt(gst + sgst)}</span>
                </div>
                <div class="pb-compact__row pb-compact__row--total">
                    <span><strong>Total Amount</strong></span>
                    <span><strong>${fmt(grandTotal)}</strong></span>
                </div>
                <div class="pb-compact__row" style="color: var(--primary); font-weight: 600; margin-top: 0.25rem;">
                    <span>Advance (40%)</span>
                    <span>${fmt(pricing.advanceAmount || Math.round(grandTotal * 0.4))}</span>
                </div>
                <div class="pb-compact__row" style="color: var(--text-muted); margin-top: 0.25rem;">
                    <span>Remaining (60%)</span>
                    <span>${fmt(pricing.remainingAmount || (grandTotal - Math.round(grandTotal * 0.4)))}</span>
                </div>
            </div>`;
    }

    /* ── Render owner earnings breakdown ───────────────────── */
    function renderOwnerEarnings(pricing) {
        if (!pricing) return '';
        const { grandTotal = 0, platformFee = 0 } = pricing;
        const ownerEarnings = Math.max(0, grandTotal - platformFee);
        return `
            <div class="pb-owner">
                <div class="pb-owner__row">
                    <span>Customer Paid</span>
                    <span class="pb-owner__val">${fmt(grandTotal)}</span>
                </div>
                <div class="pb-owner__row pb-owner__row--deduct">
                    <span>Platform Fee</span>
                    <span class="pb-owner__val pb-owner__val--red">− ${fmt(platformFee)}</span>
                </div>
                <div class="pb-owner__divider"></div>
                <div class="pb-owner__row pb-owner__row--total">
                    <span><strong>Your Earnings</strong></span>
                    <span class="pb-owner__val pb-owner__val--green"><strong>${fmt(ownerEarnings)}</strong></span>
                </div>
            </div>`;
    }

    return {
        PLATFORM_FEE,
        GST_RATE,
        SGST_RATE,
        calculate,
        format: fmt,
        renderBreakdown,
        renderCompact,
        renderOwnerEarnings,
    };
}());
