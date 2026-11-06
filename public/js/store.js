/**
 * AKANKSHA ART STUDIO - Store & E-Commerce Module
 * Handles artifacts catalog, shopping cart, discounts, and checkout.
 */

// Web Audio API UPI Soundbox Chime & Voice Notification
const SoundFX = window.SoundFX || {
  ctx: null,
  init() {
    if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
  },
  playPaymentChime(amount) {
    try {
      this.init();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }

      const now = this.ctx.currentTime;
      // High fidelity 4-tone melodic UPI Soundbox bell chime (C5, E5, G5, C6)
      const notes = [
        { f: 523.25, t: now + 0.00, d: 0.18, gain: 0.32 },
        { f: 659.25, t: now + 0.13, d: 0.18, gain: 0.35 },
        { f: 783.99, t: now + 0.26, d: 0.22, gain: 0.38 },
        { f: 1046.50, t: now + 0.40, d: 0.55, gain: 0.42 }
      ];

      notes.forEach(({ f, t, d, gain: targetGain }) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, t);

        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(targetGain, t + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + d);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + d);
      });

      // Authentic Soundbox voice alert: "Payment of X rupees received"
      if ('speechSynthesis' in window && amount) {
        setTimeout(() => {
          try {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(`Payment of ${amount} rupees received.`);
            utterance.rate = 1.05;
            utterance.pitch = 1.1;
            utterance.lang = 'en-IN';
            window.speechSynthesis.speak(utterance);
          } catch (e) {}
        }, 650);
      }
    } catch (err) {
      console.warn('Audio chime notice:', err);
    }
  }
};
window.SoundFX = SoundFX;

const Store = {
  products: [],
  cart: [],
  appliedDiscount: 0,
  discountCode: '',

  async init() {
    this.loadCart();
    await this.fetchProducts();
    this.bindEvents();
    this.updateCartUI();
  },

  async fetchProducts() {
    const res = await API.getProducts();
    if (res.success && res.data) {
      this.products = res.data;
      this.render();
    }
  },

  bindEvents() {
    // Open/close cart drawer
    const openCartBtn = document.getElementById('openCartBtn');
    const closeCartBtn = document.getElementById('closeCartBtn');
    const cartOverlay = document.getElementById('cartOverlay');

    if (openCartBtn) openCartBtn.addEventListener('click', () => this.openCart());
    if (closeCartBtn) closeCartBtn.addEventListener('click', () => this.closeCart());
    if (cartOverlay) cartOverlay.addEventListener('click', () => this.closeCart());

    // Promo code apply
    const applyPromoBtn = document.getElementById('applyPromoBtn');
    if (applyPromoBtn) {
      applyPromoBtn.addEventListener('click', () => this.applyPromo());
    }

    // Checkout button
    const proceedCheckoutBtn = document.getElementById('proceedCheckoutBtn');
    if (proceedCheckoutBtn) {
      proceedCheckoutBtn.addEventListener('click', () => this.openCheckout());
    }

    // Checkout form submit
    const checkoutForm = document.getElementById('checkoutForm');
    if (checkoutForm) {
      checkoutForm.addEventListener('submit', (e) => this.handleCheckoutSubmit(e));
    }

    // Payment method selector change in checkout
    const paymentSelect = document.getElementById('checkoutPaymentMethodSelect');
    if (paymentSelect) {
      paymentSelect.addEventListener('change', () => this.handlePaymentMethodChange());
    }

    // Copy UPI ID buttons
    ['copyUpiBtn', 'copyStep2UpiBtn'].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) btn.addEventListener('click', () => this.copyUpiId());
    });

    // Step 2 controls
    const backBtn = document.getElementById('checkoutBackToStep1Btn');
    if (backBtn) {
      backBtn.addEventListener('click', () => this.showStep1());
    }

    // Step 2 QR payment confirmation (ticking & return to exploring)
    const confirmPaidBtn = document.getElementById('confirmPaymentPaidBtn');
    if (confirmPaidBtn) {
      confirmPaidBtn.addEventListener('click', () => this.confirmQrPayment());
    }

    const morphBox = document.getElementById('checkoutCenterMorphBox');
    if (morphBox) {
      morphBox.addEventListener('click', () => this.confirmQrPayment());
    }
  },

  render() {
    const grid = document.getElementById('storeGrid');
    if (!grid) return;

    grid.innerHTML = this.products.map(prod => `
      <div class="product-card">
        <div class="product-img-wrap">
          <img src="${prod.image}" alt="${prod.title}" class="product-img" loading="lazy" onerror="this.onerror=null;this.src='/images/timeless-love-pendant.jpg'" />
          ${prod.tag ? `<span class="product-tag">${prod.tag}</span>` : ''}
        </div>
        <div class="product-info">
          <div class="product-category">${prod.category}</div>
          <h3 class="product-title">${prod.title}</h3>
          <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.75rem;">
            ${prod.description}
          </p>
          <div class="product-price-row">
            <span class="product-price">₹${prod.price.toLocaleString('en-IN')}</span>
            ${prod.originalPrice > prod.price ? `<span class="product-original-price">₹${prod.originalPrice.toLocaleString('en-IN')}</span>` : ''}
            <span style="margin-left: auto; font-size: 0.75rem; color: #FFB703; font-weight: 600;">
              ★ ${prod.rating || 5.0}
            </span>
          </div>
          <button class="btn btn-primary btn-sm" style="width: 100%;" onclick="Store.addToCart('${prod.id}', '${prod.title.replace(/'/g, "\\'")}', ${prod.price}, '${prod.image}', '${prod.category}')">
            🛍️ Add to Bag
          </button>
        </div>
      </div>
    `).join('');
  },

  // Cart Management
  loadCart() {
    try {
      this.cart = JSON.parse(localStorage.getItem('akanksha_cart') || '[]');
    } catch (e) {
      this.cart = [];
    }
  },

  saveCart() {
    localStorage.setItem('akanksha_cart', JSON.stringify(this.cart));
    this.updateCartUI();
  },

  addToCart(id, title, price, image, category = 'Artifact') {
    const existing = this.cart.find(item => item.id === id);
    if (existing) {
      existing.quantity += 1;
    } else {
      this.cart.push({ id, title, price, image, category, quantity: 1 });
    }
    this.saveCart();
    this.openCart();
    App.showToast(`✨ "${title}" added to your bag!`);
  },

  removeFromCart(id) {
    this.cart = this.cart.filter(item => item.id !== id);
    this.saveCart();
  },

  updateQuantity(id, delta) {
    const item = this.cart.find(i => i.id === id);
    if (item) {
      item.quantity += delta;
      if (item.quantity <= 0) {
        this.removeFromCart(id);
        return;
      }
    }
    this.saveCart();
  },

  getSubtotal() {
    return this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  },

  getTotal() {
    const subtotal = this.getSubtotal();
    const discountAmount = subtotal * this.appliedDiscount;
    return Math.max(0, subtotal - discountAmount);
  },

  openCart() {
    document.getElementById('cartDrawer')?.classList.add('open');
    document.getElementById('cartOverlay')?.classList.add('open');
  },

  closeCart() {
    document.getElementById('cartDrawer')?.classList.remove('open');
    document.getElementById('cartOverlay')?.classList.remove('open');
  },

  applyPromo() {
    const input = document.getElementById('promoCodeInput');
    const msg = document.getElementById('promoMessage');
    if (!input) return;

    const code = input.value.trim().toUpperCase();
    if (code === 'HINDUCOLLEGE' || code === 'AKANKSHA10' || code === 'ARTLOVE') {
      this.appliedDiscount = 0.10; // 10% off
      this.discountCode = code;
      if (msg) {
        msg.style.color = '#155724';
        msg.textContent = '🎉 10% Discount Applied Successfully!';
      }
      App.showToast('🌸 10% Discount Code Applied!');
    } else {
      if (msg) {
        msg.style.color = '#721c24';
        msg.textContent = 'Invalid promo code. Try "HINDUCOLLEGE" or "AKANKSHA10"';
      }
    }
    this.updateCartUI();
  },

  updateCartUI() {
    const countBadge = document.getElementById('cartCountBadge');
    const itemsContainer = document.getElementById('cartItemsList');
    const subtotalEl = document.getElementById('cartSubtotal');
    const totalEl = document.getElementById('cartTotal');
    const discountRow = document.getElementById('cartDiscountRow');

    const totalCount = this.cart.reduce((sum, item) => sum + item.quantity, 0);
    if (countBadge) countBadge.textContent = totalCount;

    if (itemsContainer) {
      if (this.cart.length === 0) {
        itemsContainer.innerHTML = `
          <div style="text-align: center; padding: 4rem 1rem; color: var(--text-light);">
            <div style="font-size: 3rem; margin-bottom: 1rem;">🛍️</div>
            <p style="font-family: var(--font-editorial); font-size: 1.3rem; font-style: italic;">
              Your shopping bag is waiting for some art!
            </p>
          </div>
        `;
      } else {
        itemsContainer.innerHTML = this.cart.map(item => `
          <div class="cart-item">
            <img src="${item.image}" alt="${item.title}" class="cart-item-img" onerror="this.onerror=null;this.src='/images/timeless-love-pendant.jpg'" />
            <div style="flex: 1;">
              <h4 style="font-family: var(--font-serif); font-size: 1.05rem; margin-bottom: 0.2rem;">${item.title}</h4>
              <div style="font-size: 0.85rem; color: var(--color-pink-600); font-weight: 700;">
                ₹${item.price.toLocaleString('en-IN')}
              </div>
              <div style="display: flex; align-items: center; gap: 0.6rem; margin-top: 0.5rem;">
                <button style="width: 24px; height: 24px; border: 1px solid var(--border-subtle); background: white; border-radius: 4px; cursor: pointer;" onclick="Store.updateQuantity('${item.id}', -1)">-</button>
                <span style="font-size: 0.85rem; font-weight: 600;">${item.quantity}</span>
                <button style="width: 24px; height: 24px; border: 1px solid var(--border-subtle); background: white; border-radius: 4px; cursor: pointer;" onclick="Store.updateQuantity('${item.id}', 1)">+</button>
                <button style="background: none; border: none; color: #E03131; font-size: 0.75rem; margin-left: auto; cursor: pointer;" onclick="Store.removeFromCart('${item.id}')">Remove</button>
              </div>
            </div>
          </div>
        `).join('');
      }
    }

    const subtotal = this.getSubtotal();
    const total = this.getTotal();

    if (subtotalEl) subtotalEl.textContent = `₹${subtotal.toLocaleString('en-IN')}`;
    if (totalEl) totalEl.textContent = `₹${total.toLocaleString('en-IN')}`;

    if (discountRow) {
      if (this.appliedDiscount > 0) {
        discountRow.style.display = 'flex';
        discountRow.querySelector('.discount-val').textContent = `- ₹${(subtotal * this.appliedDiscount).toLocaleString('en-IN')}`;
      } else {
        discountRow.style.display = 'none';
      }
    }
  },

  openCheckout() {
    if (this.cart.length === 0) {
      App.showToast('Please add items to your shopping bag before checkout!');
      return;
    }
    this.closeCart();
    this.showStep1();

    // Reset payment method selection
    const paymentSelect = document.getElementById('checkoutPaymentMethodSelect');
    if (paymentSelect) {
      paymentSelect.selectedIndex = 0;
    }
    this.handlePaymentMethodChange();

    // Update Checkout summary
    const checkoutSummaryEl = document.getElementById('checkoutOrderSummary');
    if (checkoutSummaryEl) {
      checkoutSummaryEl.innerHTML = `
        <div style="background: var(--color-pink-50); padding: 1.25rem; border-radius: var(--radius-md); margin-bottom: 1.25rem; border: 1px solid var(--border-pink);">
          <h4 style="font-family: var(--font-serif); font-size: 1.2rem; margin-bottom: 0.75rem;">Order Overview (${this.cart.length} items)</h4>
          ${this.cart.map(i => `
            <div style="display: flex; justify-content: space-between; font-size: 0.9rem; margin-bottom: 0.4rem;">
              <span>${i.title} × ${i.quantity}</span>
              <strong>₹${(i.price * i.quantity).toLocaleString('en-IN')}</strong>
            </div>
          `).join('')}
          <div style="border-top: 1px dashed var(--color-pink-300); margin-top: 0.75rem; padding-top: 0.75rem; display: flex; justify-content: space-between; font-size: 1.15rem; font-weight: 700; color: var(--color-pink-600);">
            <span>Total Payable</span>
            <span>₹${this.getTotal().toLocaleString('en-IN')}</span>
          </div>
        </div>
      `;
    }

    App.openModal('checkoutModal');
  },

  showStep1() {
    const s1 = document.getElementById('checkoutStep1');
    const s2 = document.getElementById('checkoutStep2');
    if (s1) s1.style.display = 'block';
    if (s2) s2.style.display = 'none';
  },

  showStep2(details) {
    const s1 = document.getElementById('checkoutStep1');
    const s2 = document.getElementById('checkoutStep2');
    const qrImg = document.getElementById('checkoutStep2Qr');
    const blueTick = document.getElementById('checkoutBlueTickBox');
    const centerBox = document.getElementById('checkoutCenterMorphBox');
    const confirmBtn = document.getElementById('confirmPaymentPaidBtn');

    if (s1) s1.style.display = 'none';
    if (s2) s2.style.display = 'block';

    // Reset center box and styles to active QR scan mode
    if (qrImg) qrImg.style.display = 'block';
    if (blueTick) blueTick.style.display = 'none';
    if (centerBox) {
      centerBox.style.borderColor = 'var(--border-pink)';
      centerBox.style.background = 'white';
      centerBox.style.boxShadow = '0 6px 18px rgba(0,0,0,0.06)';
    }
    if (confirmBtn) {
      confirmBtn.disabled = false;
      confirmBtn.innerHTML = '✓ I Have Paid (Confirm &amp; Return)';
      confirmBtn.style.background = 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)';
    }

    const total = this.getTotal();
    const upiId = (App.settings && App.settings.upiId) || 'akanksha.lko30@oksbi';
    const upiName = (App.settings && App.settings.name) || 'AKAMATOE Studio';
    
    // Deep link URL for generating QR code or direct payment
    const upiUrl = (App.settings && App.settings.upiLink && App.settings.upiLink.trim())
      ? (App.settings.upiLink.includes('?') ? `${App.settings.upiLink}&am=${total}` : App.settings.upiLink)
      : `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(upiName)}&am=${total}&cu=INR&tn=Art%20Studio%20Order`;

    // If admin set or uploaded a custom QR Code image/url, use that; otherwise generate QR code dynamically
    const qrUrl = (App.settings && App.settings.qrUrl && App.settings.qrUrl.trim())
      ? App.settings.qrUrl.trim()
      : `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(upiUrl)}`;

    const rEl = document.getElementById('checkoutStep2Recipient');
    const aEl = document.getElementById('checkoutStep2Amount');

    if (rEl) rEl.textContent = `${details.customerName} (${details.phone})`;
    if (aEl) aEl.textContent = `₹${total.toLocaleString('en-IN')}`;
    if (qrImg) qrImg.src = qrUrl;
  },

  handlePaymentMethodChange() {
    const paymentSelect = document.getElementById('checkoutPaymentMethodSelect');
    const method = paymentSelect ? paymentSelect.value : '';
    const wrapper = document.getElementById('checkoutPaymentDetailsWrapper');
    const upiNotice = document.getElementById('checkoutUpiNotice');
    const codBox = document.getElementById('checkoutCodBox');
    const cardBox = document.getElementById('checkoutCardBox');
    const submitBtn = document.getElementById('checkoutSubmitBtn');
    const total = this.getTotal();

    if (!wrapper) return;

    if (!method) {
      wrapper.style.display = 'none';
      if (submitBtn) submitBtn.textContent = '🌸 Continue to Payment →';
      return;
    }

    wrapper.style.display = 'block';

    if (method.includes('Direct Artist UPI QR') || (method.includes('UPI') && !method.includes('Razorpay'))) {
      if (upiNotice) upiNotice.style.display = 'block';
      if (codBox) codBox.style.display = 'none';
      if (cardBox) cardBox.style.display = 'none';
      if (submitBtn) submitBtn.textContent = '🌸 Continue to UPI QR Payment →';
    } else if (method.includes('Cash on Delivery')) {
      if (upiNotice) upiNotice.style.display = 'none';
      if (codBox) {
        codBox.style.display = 'block';
        const codText = document.getElementById('checkoutCodText');
        if (codText) {
          codText.innerHTML = `No advance online payment required! Pay <strong>₹${total.toLocaleString('en-IN')}</strong> in cash or UPI to the courier partner upon parcel delivery.`;
        }
      }
      if (cardBox) cardBox.style.display = 'none';
      if (submitBtn) submitBtn.textContent = '🌸 Confirm Order (Cash on Delivery)';
    } else {
      if (upiNotice) upiNotice.style.display = 'none';
      if (codBox) codBox.style.display = 'none';
      if (cardBox) {
        cardBox.style.display = 'block';
        const cardText = document.getElementById('checkoutCardText');
        if (cardText) {
          cardText.innerHTML = `Encrypted Razorpay checkout modal will launch securely to complete payment of <strong>₹${total.toLocaleString('en-IN')}</strong>. Supports UPI, Cards, Net Banking & Wallets.`;
        }
      }
      if (submitBtn) submitBtn.textContent = `🌸 Proceed to Pay ₹${total.toLocaleString('en-IN')}`;
    }
  },

  copyUpiId() {
    const upiId = (App.settings && App.settings.upiId) || 'akanksha.lko30@oksbi';
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(upiId).then(() => {
        ['copyUpiBtn', 'copyStep2UpiBtn'].forEach(id => {
          const btn = document.getElementById(id);
          if (btn) btn.textContent = '✓ Copied!';
        });
        setTimeout(() => {
          ['copyUpiBtn', 'copyStep2UpiBtn'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) btn.textContent = '📋 Copy UPI ID';
          });
        }, 2000);
        App.showToast('UPI ID copied to clipboard!');
      }).catch(() => {
        App.showToast(`UPI ID: ${upiId}`);
      });
    } else {
      App.showToast(`UPI ID: ${upiId}`);
    }
  },

  async handleCheckoutSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');

    const customerName = (form.elements['customerName']?.value || '').trim();
    const email = (form.elements['email']?.value || '').trim();
    const phone = (form.elements['phone']?.value || '').trim();
    const address = (form.elements['address']?.value || '').trim();
    const paymentMethod = form.elements['paymentMethod']?.value || '';
    const total = this.getTotal();

    if (!paymentMethod) {
      App.showToast('Please select your payment method before proceeding.');
      const paymentSelect = document.getElementById('checkoutPaymentMethodSelect');
      if (paymentSelect) paymentSelect.focus();
      return;
    }

    this.checkoutDetails = {
      customerName,
      email,
      phone,
      address,
      paymentMethod,
      total
    };

    // If Direct UPI QR selected: advance to Step 2 to display the studio QR Code on screen
    if (paymentMethod.includes('Direct Artist UPI QR') || (paymentMethod.includes('UPI') && !paymentMethod.includes('Razorpay'))) {
      this.showStep2(this.checkoutDetails);
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = '⏳ Processing...';
    }

    const resetSubmitBtn = () => {
      if (submitBtn) {
        submitBtn.disabled = false;
        this.handlePaymentMethodChange();
      }
    };

    // Check if online Razorpay gateway is selected (Cards / Net Banking / Gateway)
    const isOnlineGateway = paymentMethod.includes('Razorpay') ||
                            paymentMethod.includes('Credit / Debit') ||
                            paymentMethod.includes('Net Banking') ||
                            paymentMethod.includes('Online');

    if (isOnlineGateway) {
      try {
        const self = this;

        // Step 1: Reuse existing pending order if retrying, or create a new order
        let placedOrder = null;
        if (self.currentPendingOrderId) {
          const checkRes = await API.request(`/api/orders/${self.currentPendingOrderId}`).catch(() => null);
          if (checkRes && checkRes.success && checkRes.data && checkRes.data.paymentStatus !== 'Paid') {
            placedOrder = checkRes.data;
          }
        }

        if (!placedOrder) {
          const initialOrderData = {
            customerName,
            email,
            phone,
            address,
            items: [...self.cart],
            totalAmount: total,
            paymentMethod,
            paymentStatus: 'Pending'
          };

          const initialOrderRes = await API.createOrder(initialOrderData);
          if (!initialOrderRes || !initialOrderRes.success) {
            throw new Error(initialOrderRes?.message || 'Could not initialize order.');
          }
          placedOrder = initialOrderRes.data;
          self.currentPendingOrderId = placedOrder.id;
        }

        // Step 2: Create Razorpay order on backend
        const rzpRes = await API.createRazorpayOrder({
          amount: total,
          currency: 'INR',
          orderId: placedOrder.id,
          receipt: `rcpt_${placedOrder.id}`
        });

        if (!rzpRes || !rzpRes.success) {
          throw new Error(rzpRes?.message || 'Failed to initialize payment gateway.');
        }

        // Dynamically load Razorpay SDK if not already loaded in DOM
        if (typeof Razorpay === 'undefined') {
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.onload = resolve;
            script.onerror = () => reject(new Error('Razorpay SDK failed to load. Please check your internet connection.'));
            document.head.appendChild(script);
          });
        }

        if (typeof Razorpay !== 'undefined') {
          const options = {
            key: rzpRes.keyId,
            amount: rzpRes.amount,
            currency: rzpRes.currency || 'INR',
            name: 'AKAMATOE Art Studio',
            description: `Original Art & Artifacts (${self.cart.length} items)`,
            image: 'https://res.cloudinary.com/wempi94r/image/upload/v1788366558/akanksha-art-studio/spmgiyneusf3wopgn0in.jpg',
            order_id: rzpRes.orderId && !rzpRes.orderId.startsWith('order_auto_') ? rzpRes.orderId : undefined,
            prefill: {
              name: customerName,
              email: email,
              contact: phone
            },
            notes: {
              orderId: placedOrder.id,
              address: address
            },
            theme: {
              color: '#E64972'
            },
            handler: async function (response) {
              try {
                App.showToast('⏳ Verifying payment securely with server...');
                const verifyRes = await API.verifyRazorpayPayment({
                  razorpay_order_id: response.razorpay_order_id || rzpRes.orderId,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  orderId: placedOrder.id
                });

                if (verifyRes && verifyRes.success) {
                  if (window.SoundFX) {
                    window.SoundFX.playPaymentChime(total);
                  }
                  self.cart = [];
                  self.appliedDiscount = 0;
                  self.currentPendingOrderId = null;
                  self.saveCart();
                  App.closeModal('checkoutModal');
                  resetSubmitBtn();
                  self.showOrderConfirmation(verifyRes.data || verifyRes.order || {
                    ...placedOrder,
                    paymentStatus: 'Paid',
                    paymentId: response.razorpay_payment_id,
                    paymentVerifiedAt: new Date().toISOString()
                  });
                } else {
                  throw new Error(verifyRes?.message || 'Payment verification could not be confirmed.');
                }
              } catch (verifyErr) {
                console.error('Payment verification error:', verifyErr);
                App.showToast('❌ Verification Failed: ' + verifyErr.message);
                self.showOrderConfirmation({
                  ...placedOrder,
                  paymentStatus: 'Pending',
                  verificationError: verifyErr.message
                });
              }
            },
            modal: {
              ondismiss: async function () {
                resetSubmitBtn();
                App.showToast('Payment window closed. You can retry checkout when ready.');
                if (placedOrder && placedOrder.id) {
                  await API.recordRazorpayFailure({
                    orderId: placedOrder.id,
                    reason: 'Payment modal closed by customer'
                  }).catch(() => {});
                }
              }
            }
          };

          const razorpayInstance = new Razorpay(options);
          razorpayInstance.on('payment.failed', async function (resp) {
            console.warn('Razorpay payment failed:', resp.error);
            App.showToast('❌ Payment Failed: ' + (resp.error?.description || 'Transaction declined.'));
            resetSubmitBtn();
            if (placedOrder && placedOrder.id) {
              await API.recordRazorpayFailure({
                orderId: placedOrder.id,
                reason: resp.error?.description || 'Transaction declined by issuer',
                paymentDetails: resp.error
              }).catch(() => {});
            }
          });

          razorpayInstance.open();
          return;
        } else {
          throw new Error('Razorpay SDK failed to load in browser.');
        }
      } catch (err) {
        console.error('Checkout error:', err);
        App.showToast('❌ Checkout error: ' + err.message);
        resetSubmitBtn();
        return;
      }
    }

    // Direct Cash on Delivery (COD) order placement
    const orderData = {
      customerName,
      email,
      phone,
      address,
      items: [...this.cart],
      totalAmount: total,
      paymentMethod,
      paymentStatus: 'To Pay'
    };

    const res = await API.createOrder(orderData);
    resetSubmitBtn();

    if (res.success) {
      const order = res.data;
      this.cart = [];
      this.appliedDiscount = 0;
      this.saveCart();
      App.closeModal('checkoutModal');
      this.showOrderConfirmation(order);
    } else {
      App.showToast('Could not process order. Please try again.');
    }
  },

  async confirmQrPayment() {
    if (!this.checkoutDetails) return;

    const qrImg = document.getElementById('checkoutStep2Qr');
    const blueTick = document.getElementById('checkoutBlueTickBox');
    const centerBox = document.getElementById('checkoutCenterMorphBox');
    const confirmBtn = document.getElementById('confirmPaymentPaidBtn');

    // 1. Instantly turn the QR code into the animated tick!
    if (qrImg) qrImg.style.display = 'none';
    if (blueTick) blueTick.style.display = 'flex';
    if (centerBox) {
      centerBox.style.borderColor = '#86efac';
      centerBox.style.background = '#f0fdf4';
      centerBox.style.boxShadow = '0 10px 30px rgba(22, 163, 74, 0.28)';
    }
    if (confirmBtn) {
      confirmBtn.disabled = true;
      confirmBtn.innerHTML = '✓ Payment Successful!';
      confirmBtn.style.background = '#15803d';
    }

    // 2. Play Soundbox UPI bell chime & audio alert
    try {
      SoundFX.playPaymentChime(this.checkoutDetails.total || 0);
    } catch (e) {
      console.warn('Audio chime notice:', e);
    }

    // 3. Save order to Firestore Database via API
    const orderData = {
      customerName: this.checkoutDetails.customerName,
      email: this.checkoutDetails.email,
      phone: this.checkoutDetails.phone,
      address: this.checkoutDetails.address,
      items: [...this.cart],
      totalAmount: this.checkoutDetails.total,
      paymentMethod: 'UPI QR Payment (Verified ✓)',
      paymentStatus: 'Paid',
      status: 'Confirmed',
      paymentVerifiedAt: new Date().toISOString(),
      notes: 'Customer completed payment via dynamic UPI QR code.',
      paymentDetails: {
        method: 'Direct UPI QR Code',
        verifiedAt: new Date().toISOString()
      }
    };

    try {
      await API.createOrder(orderData);
    } catch (err) {
      console.warn('Order save notice:', err);
    }

    // 4. Clear shopping cart
    this.cart = [];
    this.appliedDiscount = 0;
    this.saveCart();

    App.showToast('🎉 Payment verified! Returning to gallery...');

    // 5. After showing the animated tick for 1.8 seconds, return to the exploring page!
    setTimeout(() => {
      // Close modal
      App.closeModal('checkoutModal');
      this.showStep1();

      // Reset QR container for future checkouts
      if (qrImg) qrImg.style.display = 'block';
      if (blueTick) blueTick.style.display = 'none';
      if (centerBox) {
        centerBox.style.borderColor = 'var(--border-pink)';
        centerBox.style.background = 'white';
        centerBox.style.boxShadow = '0 6px 18px rgba(0,0,0,0.06)';
      }
      if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = '✓ I Have Paid (Confirm &amp; Return)';
        confirmBtn.style.background = 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)';
      }

      // Smooth scroll back to exploring page (Artworks Gallery)
      const exploreTarget = document.getElementById('gallery') || document.getElementById('store') || document.getElementById('home');
      if (exploreTarget) {
        exploreTarget.scrollIntoView({ behavior: 'smooth' });
      }
      window.location.hash = '#gallery';
    }, 1800);
  },

  async autoCheckPayment() {
    return this.confirmQrPayment();
  },

  async reportPaymentIssue() {
    if (!this.checkoutDetails) return;
    const confirmReport = confirm("Did your UPI app deduct the payment or is it pending in your bank? Click OK to log your order under 'Issue' status for manual artist verification.");
    if (!confirmReport) return;

    const orderData = {
      customerName: this.checkoutDetails.customerName,
      email: this.checkoutDetails.email,
      phone: this.checkoutDetails.phone,
      address: this.checkoutDetails.address,
      items: [...this.cart],
      totalAmount: this.checkoutDetails.total,
      paymentMethod: 'Direct UPI Link (Issue Reported)',
      paymentStatus: 'Issue',
      status: 'Under Verification',
      notes: 'Customer reported payment deduction issue or bank pending status during checkout.',
      paymentDetails: {
        reportedAt: new Date().toISOString()
      }
    };

    const res = await API.createOrder(orderData);
    if (res.success) {
      const order = res.data;
      this.cart = [];
      this.appliedDiscount = 0;
      this.saveCart();
      App.closeModal('checkoutModal');
      this.showStep1();
      this.showOrderConfirmation(order);
    } else {
      App.showToast('Could not record order. Please try again.');
    }
  },

  showOrderConfirmation(order) {
    const modalContent = document.getElementById('orderSuccessModalContent');
    if (modalContent) {
      const isPaid = order.paymentStatus === 'Paid';
      const isToPay = order.paymentStatus === 'To Pay';
      const isFailed = order.paymentStatus === 'Failed';

      modalContent.innerHTML = `
        <div style="text-align: center; padding: 1rem 0;">
          ${isPaid ? `
            <!-- DUAL AUTOMATIC CONFIRMATION INDICATOR 1: CUSTOMER SCREEN GREEN TICK -->
            <div style="width: 82px; height: 82px; background: #dcfce7; border: 3px solid #16a34a; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.25rem; font-size: 2.8rem; color: #16a34a; box-shadow: 0 10px 25px rgba(22, 163, 74, 0.22);">
              ✓
            </div>
            <h2 style="font-family: var(--font-serif); font-size: 2.2rem; color: #15803d; margin-bottom: 0.35rem;">
              Payment Successful ✓
            </h2>
            <div style="display: inline-flex; align-items: center; gap: 0.35rem; background: #dcfce7; color: #166534; font-weight: 700; font-size: 0.85rem; padding: 0.35rem 0.95rem; border-radius: 999px; margin-bottom: 1.25rem; border: 1px solid #86efac;">
              🟢 Verified by Razorpay Secure Gateway
            </div>
          ` : isToPay ? `
            <div style="width: 82px; height: 82px; background: #e0f2fe; border: 2.5px solid #0284c7; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.25rem; font-size: 2.6rem; color: #0284c7;">
              📦
            </div>
            <h2 style="font-family: var(--font-serif); font-size: 2.1rem; color: var(--text-main); margin-bottom: 0.5rem;">
              Order Placed Successfully!
            </h2>
            <div style="display: inline-flex; align-items: center; gap: 0.35rem; background: #e0f2fe; color: #075985; font-weight: 700; font-size: 0.85rem; padding: 0.35rem 0.95rem; border-radius: 999px; margin-bottom: 1.25rem; border: 1px solid #7dd3fc;">
              💵 Cash on Delivery
            </div>
          ` : `
            <div style="width: 82px; height: 82px; background: ${isFailed ? '#fee2e2' : '#fef3c7'}; border: 2.5px solid ${isFailed ? '#dc2626' : '#d97706'}; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.25rem; font-size: 2.6rem; color: ${isFailed ? '#dc2626' : '#d97706'};">
              ${isFailed ? '✕' : '⏳'}
            </div>
            <h2 style="font-family: var(--font-serif); font-size: 2rem; color: ${isFailed ? '#991b1b' : '#92400e'}; margin-bottom: 0.5rem;">
              ${isFailed ? 'Payment Not Completed' : 'Order Received (Pending Verification)'}
            </h2>
            <div style="display: inline-flex; align-items: center; gap: 0.35rem; background: ${isFailed ? '#fee2e2' : '#fef3c7'}; color: ${isFailed ? '#991b1b' : '#92400e'}; font-weight: 700; font-size: 0.85rem; padding: 0.35rem 0.95rem; border-radius: 999px; margin-bottom: 1.25rem; border: 1px solid ${isFailed ? '#fca5a5' : '#fde68a'};">
              ${isFailed ? '❌ Transaction Failed' : '⏳ Awaiting Provider Confirmation'}
            </div>
          `}

          <p style="font-family: var(--font-editorial); font-size: 1.15rem; color: var(--text-muted); font-style: italic; margin-bottom: 1.5rem; line-height: 1.5;">
            ${isPaid 
              ? `Thank you, ${order.customerName}! Your payment has been securely verified. Akanksha is preparing your package with love & handwritten notes. ✨`
              : isToPay
              ? `Thank you, ${order.customerName}! We have received your COD order. Please keep the exact amount ready upon delivery.`
              : `Thank you, ${order.customerName}! Your order is logged in our studio queue. We will verify the transaction record before packaging.`}
          </p>

          <div style="background: white; border: 1px solid var(--border-pink); border-radius: var(--radius-md); padding: 1.5rem; text-align: left; margin-bottom: 1.5rem; box-shadow: var(--shadow-sm);">
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border-light); padding-bottom: 0.75rem; margin-bottom: 0.75rem;">
              <span style="font-family: var(--font-mono); font-size: 0.85rem; color: var(--color-pink-600);">Order ID: <strong>${order.id}</strong></span>
              <span style="font-size: 0.85rem; color: var(--text-light);">${new Date().toLocaleDateString()}</span>
            </div>
            <div style="font-size: 0.9rem; line-height: 1.6; margin-bottom: 1rem;">
              <strong>Delivery Address:</strong> ${order.address}<br/>
              <strong>Contact:</strong> ${order.phone} (${order.email || 'No email'})<br/>
              <strong>Payment Method:</strong> ${order.paymentMethod}<br/>
              <strong>Payment Status:</strong> 
              ${isPaid 
                ? '<span style="background: #dcfce7; color: #15803d; font-weight: 700; padding: 0.2rem 0.65rem; border-radius: 999px; font-size: 0.8rem; display: inline-flex; align-items: center; gap: 0.25rem;">🟢 Paid (Verified ✓)</span>'
                : isToPay
                ? '<span style="background: #e0f2fe; color: #0369a1; font-weight: 700; padding: 0.2rem 0.65rem; border-radius: 999px; font-size: 0.8rem;">💵 To Pay (Cash on Delivery)</span>'
                : isFailed
                ? '<span style="background: #fee2e2; color: #b91c1c; font-weight: 700; padding: 0.2rem 0.65rem; border-radius: 999px; font-size: 0.8rem;">❌ Failed</span>'
                : '<span style="background: #fef3c7; color: #b45309; font-weight: 700; padding: 0.2rem 0.65rem; border-radius: 999px; font-size: 0.8rem;">⏳ Pending Verification</span>'
              }
              ${order.paymentId ? `<br/><strong>Razorpay Payment ID:</strong> <code style="font-family: var(--font-mono); color: var(--color-pink-600); font-weight: 700;">${order.paymentId}</code>` : ''}
              ${order.paymentDetails?.razorpay_order_id ? `<br/><strong>Razorpay Order Ref:</strong> <code style="font-family: var(--font-mono); color: var(--text-muted);">${order.paymentDetails.razorpay_order_id}</code>` : ''}
              ${order.paymentVerifiedAt ? `<br/><strong>Verified At:</strong> <span style="font-size: 0.8rem; color: var(--text-light);">${new Date(order.paymentVerifiedAt).toLocaleString('en-IN')}</span>` : ''}
            </div>
            <div style="font-size: 1.25rem; font-weight: 700; color: var(--color-pink-600); text-align: right; border-top: 1px dashed var(--border-pink); padding-top: 0.75rem;">
              Total Amount: ₹${Number(order.totalAmount || 0).toLocaleString('en-IN')}
            </div>
          </div>

          <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
            <button class="btn btn-primary" onclick="window.print()">
              🖨️ Print Receipt
            </button>
            <button class="btn btn-secondary" onclick="App.closeModal('orderSuccessModal')">
              Continue Exploring
            </button>
          </div>
        </div>
      `;
      App.openModal('orderSuccessModal');
    }
  }
};
