/**
 * AKANKSHA ART STUDIO - Store & E-Commerce Module
 * Handles artifacts catalog, shopping cart, discounts, and checkout.
 */

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
    
    // Update Checkout summary
    const checkoutSummaryEl = document.getElementById('checkoutOrderSummary');
    if (checkoutSummaryEl) {
      checkoutSummaryEl.innerHTML = `
        <div style="background: var(--color-pink-50); padding: 1.25rem; border-radius: var(--radius-md); margin-bottom: 1.5rem; border: 1px solid var(--border-pink);">
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

  async handleCheckoutSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    const customerName = form.elements['customerName'].value;
    const email = form.elements['email'].value;
    const phone = form.elements['phone'].value;
    const address = form.elements['address'].value;
    const paymentMethod = form.elements['paymentMethod'].value;
    const total = this.getTotal();

    // Check if online Razorpay gateway is selected (not COD)
    const isOnlinePayment = !paymentMethod.includes('Cash on Delivery');

    if (isOnlinePayment && typeof Razorpay !== 'undefined') {
      try {
        // 1. Create Razorpay Order via backend
        const rzpRes = await API.createRazorpayOrder({
          amount: total,
          currency: 'INR',
          receipt: `rcpt_${Date.now()}`
        });

        if (rzpRes && rzpRes.success) {
          const self = this;
          const options = {
            key: rzpRes.keyId || 'rzp_test_akanksha',
            amount: rzpRes.amount,
            currency: rzpRes.currency || 'INR',
            name: 'Akanksha Art Studio',
            description: `Original Art & Artifacts (${self.cart.length} items)`,
            image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
            order_id: rzpRes.isLiveGateway ? rzpRes.orderId : undefined,
            prefill: {
              name: customerName,
              email: email,
              contact: phone
            },
            notes: {
              address: address,
              university: 'Hindu College DU'
            },
            theme: {
              color: '#E64972'
            },
            handler: async function (response) {
              // 2. Verified Payment from Razorpay
              const orderData = {
                customerName,
                email,
                phone,
                address,
                items: [...self.cart],
                totalAmount: total,
                paymentMethod: `${paymentMethod} (Razorpay Ref: ${response.razorpay_payment_id || 'Verified'})`
              };

              const orderRes = await API.createOrder(orderData);
              if (orderRes.success) {
                await API.verifyRazorpayPayment({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  orderId: orderRes.data.id
                });

                self.cart = [];
                self.appliedDiscount = 0;
                self.saveCart();
                App.closeModal('checkoutModal');
                self.showOrderConfirmation(orderRes.data);
              }
            },
            modal: {
              ondismiss: function () {
                if (submitBtn) submitBtn.disabled = false;
                App.showToast('Payment window closed. You can retry whenever you are ready.');
              }
            }
          };

          const razorpayInstance = new Razorpay(options);
          razorpayInstance.on('payment.failed', function (resp) {
            if (submitBtn) submitBtn.disabled = false;
            App.showToast(`Payment failed: ${resp.error.description || 'Please try another method'}`);
          });

          razorpayInstance.open();
          return;
        }
      } catch (err) {
        console.warn("Razorpay popup error, proceeding with standard confirmation:", err);
      }
    }

    // Direct / COD / Fallback Order placement
    const orderData = {
      customerName,
      email,
      phone,
      address,
      items: [...this.cart],
      totalAmount: total,
      paymentMethod
    };

    const res = await API.createOrder(orderData);
    if (submitBtn) submitBtn.disabled = false;

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


  showOrderConfirmation(order) {
    const modalContent = document.getElementById('orderSuccessModalContent');
    if (modalContent) {
      modalContent.innerHTML = `
        <div style="text-align: center; padding: 1rem 0;">
          <div style="width: 70px; height: 70px; background: var(--color-pink-100); border-radius: var(--radius-full); display: flex; align-items: center; justify-content: center; margin: 0 auto 1.25rem; font-size: 2.2rem;">
            🌸
          </div>
          <h2 style="font-family: var(--font-serif); font-size: 2.2rem; color: var(--text-main); margin-bottom: 0.5rem;">
            Order Placed Successfully!
          </h2>
          <p style="font-family: var(--font-editorial); font-size: 1.2rem; color: var(--text-muted); font-style: italic; margin-bottom: 1.5rem;">
            Thank you, ${order.customerName}! Akanksha has received your order and is preparing your art package with love & handwritten notes.
          </p>
          <div style="background: white; border: 1px solid var(--border-pink); border-radius: var(--radius-md); padding: 1.5rem; text-align: left; margin-bottom: 2rem; box-shadow: var(--shadow-sm);">
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border-light); padding-bottom: 0.75rem; margin-bottom: 0.75rem;">
              <span style="font-family: var(--font-mono); font-size: 0.85rem; color: var(--color-pink-600);">Order ID: <strong>${order.id}</strong></span>
              <span style="font-size: 0.85rem; color: var(--text-light);">${new Date().toLocaleDateString()}</span>
            </div>
            <div style="font-size: 0.9rem; line-height: 1.6; margin-bottom: 1rem;">
              <strong>Delivery Address:</strong> ${order.address}<br/>
              <strong>Contact:</strong> ${order.phone} (${order.email})<br/>
              <strong>Payment Method:</strong> ${order.paymentMethod}
            </div>
            <div style="font-size: 1.15rem; font-weight: 700; color: var(--color-pink-600); text-align: right;">
              Total Paid: ₹${order.totalAmount.toLocaleString('en-IN')}
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
