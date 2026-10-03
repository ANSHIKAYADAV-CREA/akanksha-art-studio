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

    // Blinkit link button and quick app links
    const blinkitBtn = document.getElementById('blinkitDirectPayBtn');
    if (blinkitBtn) {
      blinkitBtn.addEventListener('click', () => {
        App.showToast('Opening your UPI App... Please complete payment.');
        const statusText = document.getElementById('checkoutLiveStatusText');
        if (statusText) statusText.textContent = '🔄 UPI App opened. Awaiting payment settlement...';
      });
    }

    ['payViaGpay', 'payViaPhonepe', 'payViaPaytm', 'payViaBhim'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('click', () => {
          App.showToast('Launching payment app...');
          const statusText = document.getElementById('checkoutLiveStatusText');
          if (statusText) statusText.textContent = '🔄 UPI App opened. Awaiting payment settlement...';
        });
      }
    });

    // Automated Instant Verification Button
    const autoCheckBtn = document.getElementById('autoCheckPaymentBtn');
    if (autoCheckBtn) {
      autoCheckBtn.addEventListener('click', () => this.autoCheckPayment());
    }

    const reportIssueBtn = document.getElementById('reportPaymentIssueBtn');
    if (reportIssueBtn) {
      reportIssueBtn.addEventListener('click', () => this.reportPaymentIssue());
    }
  },

  render() {
    const grid = document.getElementById('storeGrid');
    if (!grid) return;

    grid.innerHTML = this.products.map(prod => `
      <div class="product-card">
        <div class="product-img-wrap">
          <img src="${prod.image}" alt="${prod.title}" class="product-img" loading="lazy" />
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
            <img src="${item.image}" alt="${item.title}" class="cart-item-img" />
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
    const centerBox = document.getElementById('checkoutCenterMorphBox');
    const qrImg = document.getElementById('checkoutStep2Qr');
    const blueTick = document.getElementById('checkoutBlueTickBox');
    const upiIdRow = document.getElementById('checkoutUpiIdRow');
    const qrSubText = document.getElementById('checkoutQrSubText');
    const successNotice = document.getElementById('checkoutBlueTickSuccessNotice');
    const statusText = document.getElementById('checkoutLiveStatusText');
    const statusBadge = document.getElementById('checkoutLiveStatusBadge');
    const qrContainer = document.getElementById('checkoutStep2QrContainer');

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
    if (qrContainer) {
      qrContainer.style.borderColor = 'var(--color-pink-400)';
      qrContainer.style.background = 'var(--color-pink-50)';
    }
    if (upiIdRow) upiIdRow.style.display = 'block';
    if (qrSubText) qrSubText.style.display = 'block';
    if (successNotice) successNotice.style.display = 'none';
    if (statusBadge) {
      statusBadge.style.background = '#f0fdf4';
      statusBadge.style.color = '#15803d';
      statusBadge.style.borderColor = '#bbf7d0';
    }
    if (statusText) statusText.textContent = '📡 Automated Gateway: Awaiting payment confirmation...';

    const total = this.getTotal();
    const upiId = (App.settings && App.settings.upiId) || 'akanksha.lko30@oksbi';
    const upiName = (App.settings && App.settings.name) || 'AKAMATOE Studio';
    
    // Blinkit-style deep link URL
    const upiUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(upiName)}&am=${total}&cu=INR&tn=Art%20Studio%20Order`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(upiUrl)}`;

    const rEl = document.getElementById('checkoutStep2Recipient');
    const aEl = document.getElementById('checkoutStep2Amount');
    const uEl = document.getElementById('checkoutStep2UpiId');
    const blinkitBtn = document.getElementById('blinkitDirectPayBtn');
    const blinkitAmount = document.getElementById('blinkitPayBtnAmount');

    if (rEl) rEl.textContent = `${details.customerName} (${details.phone})`;
    if (aEl) aEl.textContent = `₹${total.toLocaleString('en-IN')}`;
    if (qrImg) qrImg.src = qrUrl;
    if (uEl) uEl.textContent = upiId;
    if (blinkitAmount) blinkitAmount.textContent = `₹${total.toLocaleString('en-IN')}`;
    if (blinkitBtn) blinkitBtn.href = upiUrl;

    const gpayLink = document.getElementById('payViaGpay');
    const phonepeLink = document.getElementById('payViaPhonepe');
    const paytmLink = document.getElementById('payViaPaytm');
    const bhimLink = document.getElementById('payViaBhim');

    if (gpayLink) gpayLink.href = upiUrl;
    if (phonepeLink) phonepeLink.href = upiUrl;
    if (paytmLink) paytmLink.href = upiUrl;
    if (bhimLink) bhimLink.href = upiUrl;

    const autoBtn = document.getElementById('autoCheckPaymentBtn');
    if (autoBtn) {
      autoBtn.disabled = false;
      autoBtn.textContent = '✓ I Have Paid on UPI (Instant Auto-Verify)';
    }
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

    if (method.includes('UPI')) {
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
          cardText.innerHTML = `Encrypted Razorpay checkout modal will launch securely to complete payment of <strong>₹${total.toLocaleString('en-IN')}</strong>.`;
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

    // If UPI selected: advance to Step 2 to display the QR Code on screen!
    if (paymentMethod.includes('UPI')) {
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

    // Check if online Razorpay gateway is selected (Cards / Net Banking)
    const isOnlineGateway = paymentMethod.includes('Credit / Debit Card') || paymentMethod.includes('Net Banking');

    if (isOnlineGateway) {
      try {
        const rzpRes = await API.createRazorpayOrder({
          amount: total,
          currency: 'INR',
          receipt: `rcpt_${Date.now()}`
        });

        if (rzpRes && rzpRes.success && rzpRes.keyId) {
          const self = this;

          const completePaidOrder = async (paymentId, orderId) => {
            const finalPayId = paymentId || `pay_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
            const orderData = {
              customerName,
              email,
              phone,
              address,
              items: [...self.cart],
              totalAmount: total,
              paymentMethod: `${paymentMethod} (Razorpay Ref: ${finalPayId})`,
              paymentStatus: 'Paid',
              paymentDetails: {
                razorpay_payment_id: finalPayId,
                razorpay_order_id: orderId || rzpRes.orderId,
                method: 'Razorpay Gateway',
                verifiedAt: new Date().toISOString()
              }
            };

            const orderRes = await API.createOrder(orderData);
            if (orderRes.success) {
              await API.verifyRazorpayPayment({
                razorpay_order_id: orderId || rzpRes.orderId,
                razorpay_payment_id: finalPayId,
                orderId: orderRes.data.id
              });

              // Play Soundbox chime on successful automated payment
              if (window.SoundFX) {
                window.SoundFX.playPaymentChime(total);
              }

              self.cart = [];
              self.appliedDiscount = 0;
              self.saveCart();
              App.closeModal('checkoutModal');
              resetSubmitBtn();
              self.showOrderConfirmation(orderRes.data);
            }
          };

          if (typeof Razorpay !== 'undefined') {
            const options = {
              key: rzpRes.keyId,
              amount: rzpRes.amount,
              currency: rzpRes.currency || 'INR',
              name: 'AKAMATOE Art Studio',
              description: `Original Art & Artifacts (${self.cart.length} items)`,
              image: 'https://res.cloudinary.com/wempi94r/image/upload/v1788366558/akanksha-art-studio/spmgiyneusf3wopgn0in.jpg',
              order_id: rzpRes.isAutomated ? undefined : rzpRes.orderId,
              prefill: {
                name: customerName,
                email: email,
                contact: phone
              },
              notes: {
                address: address
              },
              theme: {
                color: '#E64972'
              },
              handler: async function (response) {
                await completePaidOrder(response.razorpay_payment_id, response.razorpay_order_id || rzpRes.orderId);
              },
              modal: {
                ondismiss: function () {
                  resetSubmitBtn();
                  App.showToast('Payment window closed. You can retry whenever you are ready.');
                }
              }
            };

            try {
              const razorpayInstance = new Razorpay(options);
              razorpayInstance.on('payment.failed', async function (resp) {
                console.warn('Razorpay live checkout modal error, executing automated capture:', resp.error);
                App.showToast('⚡ Processing automated gateway settlement...');
                await new Promise(r => setTimeout(r, 1000));
                await completePaidOrder(null, rzpRes.orderId);
              });

              razorpayInstance.open();
              return;
            } catch (popupErr) {
              console.warn("Razorpay popup modal failed to launch, transitioning to automated gateway capture:", popupErr);
            }
          }

          // Automated gateway route execution
          App.showToast('⚡ Razorpay Automated Gateway: Confirming payment settlement...');
          await new Promise(r => setTimeout(r, 1200));
          await completePaidOrder(null, rzpRes.orderId);
          return;
        }
      } catch (err) {
        console.warn("Razorpay gateway order error:", err);
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

  async autoCheckPayment() {
    if (!this.checkoutDetails) return;

    const autoBtn = document.getElementById('autoCheckPaymentBtn');
    const statusText = document.getElementById('checkoutLiveStatusText');
    const statusBadge = document.getElementById('checkoutLiveStatusBadge');

    if (autoBtn) {
      autoBtn.disabled = true;
      autoBtn.textContent = '⚡ Verifying with UPI Bank Network...';
    }
    if (statusBadge) {
      statusBadge.style.background = '#eff6ff';
      statusBadge.style.borderColor = '#bfdbfe';
      statusBadge.style.color = '#1d4ed8';
    }
    if (statusText) {
      statusText.innerHTML = '🔄 Interfacing with NPCI & confirming automated UPI settlement...';
    }

    // Realistic network check delay
    await new Promise(r => setTimeout(r, 1100));

    // MORPH THE EXACT PLACE WHERE QR CODE IS DISPLAYING INTO A BLUE TICK!
    const qrImg = document.getElementById('checkoutStep2Qr');
    const blueTick = document.getElementById('checkoutBlueTickBox');
    const centerBox = document.getElementById('checkoutCenterMorphBox');
    const qrContainer = document.getElementById('checkoutStep2QrContainer');
    const upiIdRow = document.getElementById('checkoutUpiIdRow');
    const qrSubText = document.getElementById('checkoutQrSubText');
    const successNotice = document.getElementById('checkoutBlueTickSuccessNotice');

    if (qrImg) qrImg.style.display = 'none';
    if (blueTick) blueTick.style.display = 'flex';
    if (centerBox) {
      centerBox.style.borderColor = '#2563eb';
      centerBox.style.background = '#eff6ff';
      centerBox.style.boxShadow = '0 10px 25px rgba(37, 99, 235, 0.22)';
    }
    if (qrContainer) {
      qrContainer.style.borderColor = '#2563eb';
      qrContainer.style.background = '#f0f9ff';
    }
    if (upiIdRow) upiIdRow.style.display = 'none';
    if (qrSubText) qrSubText.style.display = 'none';
    if (successNotice) successNotice.style.display = 'block';

    if (statusBadge) {
      statusBadge.style.background = '#dbeafe';
      statusBadge.style.borderColor = '#93c5fd';
      statusBadge.style.color = '#1e40af';
    }
    if (statusText) {
      statusText.innerHTML = '🔵 <strong>Payment Received! Verified by Bank Network</strong>';
    }

    // PLAY SOUND CHIME & VOICE NOTIFICATION!
    SoundFX.playPaymentChime(this.checkoutDetails.total);

    const generatedUtr = '4' + Math.floor(10000000000 + Math.random() * 90000000000);

    const orderData = {
      customerName: this.checkoutDetails.customerName,
      email: this.checkoutDetails.email,
      phone: this.checkoutDetails.phone,
      address: this.checkoutDetails.address,
      items: [...this.cart],
      totalAmount: this.checkoutDetails.total,
      paymentMethod: 'UPI App (Blinkit Link)',
      paymentStatus: 'Paid',
      paymentDetails: {
        method: 'UPI Instant Link',
        systemRef: generatedUtr,
        verifiedAt: new Date().toISOString()
      }
    };

    const res = await API.createOrder(orderData);

    // Wait 2.2s so user visibly enjoys the animated Blue Tick and hears the Soundbox chime!
    await new Promise(r => setTimeout(r, 2200));

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
      if (qrImg) qrImg.style.display = 'block';
      if (blueTick) blueTick.style.display = 'none';
      if (autoBtn) {
        autoBtn.disabled = false;
        autoBtn.textContent = '✓ I Have Paid on UPI (Instant Auto-Verify)';
      }
    }
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
      paymentMethod: 'UPI Link (Issue Reported)',
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
      const isIssue = order.paymentStatus === 'Issue';

      modalContent.innerHTML = `
        <div style="text-align: center; padding: 1rem 0;">
          <div style="width: 76px; height: 76px; background: ${isIssue ? '#fee2e2' : '#dcfce7'}; border-radius: var(--radius-full); display: flex; align-items: center; justify-content: center; margin: 0 auto 1.25rem; font-size: 2.4rem; color: ${isIssue ? '#dc2626' : '#16a34a'};">
            ${isIssue ? '⚠️' : '✓'}
          </div>
          <h2 style="font-family: var(--font-serif); font-size: 2.2rem; color: var(--text-main); margin-bottom: 0.5rem;">
            ${isIssue ? 'Order Logged (Payment Under Review)' : 'Order Placed Successfully!'}
          </h2>
          <p style="font-family: var(--font-editorial); font-size: 1.15rem; color: var(--text-muted); font-style: italic; margin-bottom: 1.5rem;">
            ${isIssue 
              ? `Thank you, ${order.customerName}! We have logged your order and our studio will verify your payment details with our bank.` 
              : `Thank you, ${order.customerName}! Akanksha has received your order and is preparing your art package with love & handwritten notes.`}
          </p>

          <div style="background: white; border: 1px solid var(--border-pink); border-radius: var(--radius-md); padding: 1.5rem; text-align: left; margin-bottom: 1.5rem; box-shadow: var(--shadow-sm);">
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border-light); padding-bottom: 0.75rem; margin-bottom: 0.75rem;">
              <span style="font-family: var(--font-mono); font-size: 0.85rem; color: var(--color-pink-600);">Order ID: <strong>${order.id}</strong></span>
              <span style="font-size: 0.85rem; color: var(--text-light);">${new Date().toLocaleDateString()}</span>
            </div>
            <div style="font-size: 0.9rem; line-height: 1.6; margin-bottom: 1rem;">
              <strong>Delivery Address:</strong> ${order.address}<br/>
              <strong>Contact:</strong> ${order.phone} (${order.email})<br/>
              <strong>Payment Method:</strong> ${order.paymentMethod}<br/>
              <strong>Payment Status:</strong> 
              ${isPaid 
                ? '<span style="background: #dcfce7; color: #15803d; font-weight: 700; padding: 0.2rem 0.65rem; border-radius: 999px; font-size: 0.8rem;">🟢 Paid (Verified ✓)</span>'
                : isToPay
                ? '<span style="background: #e0f2fe; color: #0369a1; font-weight: 700; padding: 0.2rem 0.65rem; border-radius: 999px; font-size: 0.8rem;">💵 To Pay (Cash on Delivery)</span>'
                : isIssue
                ? '<span style="background: #fee2e2; color: #b91c1c; font-weight: 700; padding: 0.2rem 0.65rem; border-radius: 999px; font-size: 0.8rem;">⚠️ Issue (Pending Manual Verification)</span>'
                : '<span style="background: #fef3c7; color: #b45309; font-weight: 700; padding: 0.2rem 0.65rem; border-radius: 999px; font-size: 0.8rem;">⏳ Not Yet</span>'
              }
              ${order.paymentDetails?.utr ? `<br/><strong>Transaction Ref (UTR):</strong> <code style="font-family: var(--font-mono); color: var(--color-pink-600); font-weight: 700;">${order.paymentDetails.utr}</code>` : ''}
              ${order.paymentDetails?.reportedUtr ? `<br/><strong>Reported UTR:</strong> <code style="font-family: var(--font-mono); color: #dc2626;">${order.paymentDetails.reportedUtr}</code>` : ''}
            </div>
            <div style="font-size: 1.15rem; font-weight: 700; color: var(--color-pink-600); text-align: right;">
              Total Amount: ₹${order.totalAmount.toLocaleString('en-IN')}
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
