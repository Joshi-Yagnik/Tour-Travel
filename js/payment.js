/* ============================================================
   DEMO PAYMENT GATEWAY
   Simulates a modern payment gateway for demonstration.
   ============================================================ */

class DemoPaymentGatewayClass {
    constructor() {
        this.overlay = null;
        this.onSuccessCb = null;
        this.data = null;
        this.selectedMethod = 'upi';
        
        // Initialize DOM when ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initDOM());
        } else {
            this.initDOM();
        }
    }

    initDOM() {
        // Prevent multiple injections or injecting if body isn't ready
        if (document.getElementById('pg-overlay') || !document.body) return;

        const html = `
            <div class="pg-overlay" id="pg-overlay">
                <div class="pg-modal">
                    <div class="pg-demo-badge">TEST MODE</div>
                    
                    <div class="pg-header">
                        <button class="pg-close" id="pg-close" aria-label="Close"><i class="fas fa-times"></i></button>
                        <div class="pg-header-title"><i class="fas fa-shield-check"></i> Secure Checkout</div>
                        <div class="pg-header-amount" id="pg-header-amount">₹0</div>
                        <div class="pg-header-subtitle">Amount to Pay Now (40% Advance)</div>
                    </div>
                    
                    <div class="pg-body">
                        
                        <!-- Screen 1: Payment Details & Methods -->
                        <div class="pg-screen active" id="pg-screen-main">
                            <div class="pg-section-title">Booking Summary</div>
                            <div class="pg-summary">
                                <div class="pg-summary-row">
                                    <span>Booking Amount</span>
                                    <span id="pg-sum-base">₹0</span>
                                </div>
                                <div class="pg-summary-row">
                                    <span>Taxes & Fees</span>
                                    <span id="pg-sum-fees">₹0</span>
                                </div>
                                <div class="pg-summary-row pg-total">
                                    <span>Total Value</span>
                                    <span id="pg-sum-total">₹0</span>
                                </div>
                                <div class="pg-summary-row pg-advance" style="margin-top:12px">
                                    <span>Pay Now (40% Advance)</span>
                                    <span id="pg-sum-adv">₹0</span>
                                </div>
                                <div class="pg-summary-row">
                                    <span>Pay Later (60% Balance)</span>
                                    <span id="pg-sum-rem">₹0</span>
                                </div>
                            </div>
                            
                            <div class="pg-section-title">Payment Method</div>
                            <div class="pg-methods">
                                <button class="pg-method-btn active" data-method="upi">
                                    <i class="fas fa-qrcode pg-method-icon"></i>
                                    <span class="pg-method-label">UPI</span>
                                </button>
                                <button class="pg-method-btn" data-method="card">
                                    <i class="fas fa-credit-card pg-method-icon"></i>
                                    <span class="pg-method-label">Credit / Debit Card</span>
                                </button>
                                <button class="pg-method-btn" data-method="netbanking">
                                    <i class="fas fa-building-columns pg-method-icon"></i>
                                    <span class="pg-method-label">Net Banking</span>
                                </button>
                                <button class="pg-method-btn" data-method="wallet">
                                    <i class="fas fa-wallet pg-method-icon"></i>
                                    <span class="pg-method-label">Wallets</span>
                                </button>
                            </div>

                            <div id="pg-method-forms">
                                <!-- UPI Form -->
                                <div class="pg-upi-form" id="pg-form-upi">
                                    <div class="pg-input-group">
                                        <label class="pg-input-label">Enter UPI ID</label>
                                        <input type="text" class="pg-input" id="pg-upi-id" placeholder="e.g. example@upi" value="demo@ybl">
                                    </div>
                                    <div class="pg-input-group">
                                        <label class="pg-input-label">Enter UPI PIN</label>
                                        <input type="password" class="pg-input" id="pg-upi-pin" placeholder="••••" maxlength="6" value="1234">
                                    </div>
                                </div>
                                <!-- Mock for others -->
                                <div class="pg-upi-form" id="pg-form-other" style="display:none; text-align:center; color:var(--text-muted)">
                                    <i class="fas fa-info-circle"></i> This is a demo. All payment methods simulate success.
                                </div>
                            </div>

                            <button class="pg-btn" id="pg-pay-btn" style="margin-top:24px">
                                Pay <span id="pg-btn-amt">₹0</span> <i class="fas fa-arrow-right"></i>
                            </button>

                            <div class="pg-secure-badge">
                                <i class="fas fa-lock"></i> 100% Secure Payment Simulation
                            </div>
                        </div>

                        <!-- Screen 2: Processing -->
                        <div class="pg-screen" id="pg-screen-loading">
                            <div class="pg-loading">
                                <div class="pg-spinner"></div>
                                <div class="pg-loading-text">Processing Payment...</div>
                                <div class="pg-loading-sub">Please do not refresh or close this window.</div>
                            </div>
                        </div>

                        <!-- Screen 3: Success -->
                        <div class="pg-screen" id="pg-screen-success">
                            <div class="pg-success">
                                <div class="pg-success-icon"><i class="fas fa-check"></i></div>
                                <div class="pg-success-title">Payment Successful!</div>
                                <div class="pg-success-subtitle">Your advance payment has been received.</div>
                                
                                <div class="pg-receipt">
                                    <div class="pg-receipt-row">
                                        <span class="pg-receipt-label">Amount Paid</span>
                                        <span class="pg-receipt-value" id="pg-receipt-amt">₹0</span>
                                    </div>
                                    <div class="pg-receipt-row">
                                        <span class="pg-receipt-label">Payment Method</span>
                                        <span class="pg-receipt-value" id="pg-receipt-method">UPI</span>
                                    </div>
                                    <div class="pg-receipt-row">
                                        <span class="pg-receipt-label">Transaction ID</span>
                                        <span class="pg-receipt-value">DEMO-<span id="pg-receipt-txn"></span></span>
                                    </div>
                                </div>

                                <button class="pg-btn" id="pg-continue-btn">
                                    Confirm Booking <i class="fas fa-check-circle"></i>
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);

        this.overlay = document.getElementById('pg-overlay');
        
        // Event Listeners
        document.getElementById('pg-close').addEventListener('click', () => this.close());
        document.getElementById('pg-pay-btn').addEventListener('click', () => this.processPayment());
        document.getElementById('pg-continue-btn').addEventListener('click', () => this.finish());
        
        // Method Selectors
        document.querySelectorAll('.pg-method-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.pg-method-btn').forEach(b => b.classList.remove('active'));
                const target = e.currentTarget;
                target.classList.add('active');
                this.selectedMethod = target.dataset.method;
                
                if(this.selectedMethod === 'upi') {
                    document.getElementById('pg-form-upi').style.display = 'block';
                    document.getElementById('pg-form-other').style.display = 'none';
                } else {
                    document.getElementById('pg-form-upi').style.display = 'none';
                    document.getElementById('pg-form-other').style.display = 'block';
                }
            });
        });
    }

    switchScreen(screenId) {
        document.querySelectorAll('.pg-screen').forEach(s => s.classList.remove('active'));
        document.getElementById(screenId).classList.add('active');
    }

    open(data, onSuccess) {
        this.initDOM();
        
        this.data = data;
        this.onSuccessCb = onSuccess;
        
        // Reset states
        this.switchScreen('pg-screen-main');
        document.getElementById('pg-close').style.display = 'flex';
        
        // Format money helper
        const fmt = (val) => '₹' + (val || 0).toLocaleString('en-IN');
        
        // Map correct keys from WL_Pricing
        const advance = data.advanceAmount || 0;
        const remaining = data.remainingAmount || 0;
        const total = data.grandTotal || 0;
        const base = data.subtotal || 0;
        const fees = (data.platformFee || 0) + (data.totalTax || 0);

        // Populate amounts
        document.getElementById('pg-header-amount').textContent = fmt(advance);
        document.getElementById('pg-btn-amt').textContent = fmt(advance);
        
        document.getElementById('pg-sum-base').textContent = fmt(base);
        document.getElementById('pg-sum-fees').textContent = fmt(fees);
        document.getElementById('pg-sum-total').textContent = fmt(total);
        document.getElementById('pg-sum-adv').textContent = fmt(advance);
        document.getElementById('pg-sum-rem').textContent = fmt(remaining);

        // Show modal
        this.overlay.classList.add('open');
    }

    close() {
        this.overlay.classList.remove('open');
    }

    processPayment() {
        // Validation for UPI
        if (this.selectedMethod === 'upi') {
            const upiId = document.getElementById('pg-upi-id').value;
            const upiPin = document.getElementById('pg-upi-pin').value;
            if (!upiId || !upiPin) {
                alert('Please enter valid UPI credentials for the demo.');
                return;
            }
        }

        // Hide close button
        document.getElementById('pg-close').style.display = 'none';
        
        // Show loading
        this.switchScreen('pg-screen-loading');

        // Simulate network delay
        setTimeout(() => {
            // Setup success screen
            const fmt = (val) => '₹' + (val || 0).toLocaleString('en-IN');
            document.getElementById('pg-receipt-amt').textContent = fmt(this.data.advanceAmount || 0);
            
            const methodNames = {
                upi: 'UPI',
                card: 'Credit/Debit Card',
                netbanking: 'Net Banking',
                wallet: 'Wallet'
            };
            document.getElementById('pg-receipt-method').textContent = methodNames[this.selectedMethod] || 'Demo Payment';
            
            // Generate random 8-char hex string
            const txnId = Math.random().toString(16).substr(2, 8).toUpperCase();
            document.getElementById('pg-receipt-txn').textContent = txnId;

            this.switchScreen('pg-screen-success');
        }, 2000); // 2 second delay
    }

    finish() {
        this.close();
        if (this.onSuccessCb) {
            this.onSuccessCb({
                method: this.selectedMethod,
                amountPaid: this.data.advanceAmount || 0,
                paymentStatus: 'Partially Paid'
            });
        }
    }
}

// Global singleton
window.DemoPaymentGateway = new DemoPaymentGatewayClass();
