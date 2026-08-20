/**
 * AKANKSHA ART STUDIO - Admin Dashboard Module
 * Complete Content Management System for Artworks, Products, Bookings, Poems, Reviews & Settings.
 */

const Admin = {
  isLoggedIn: false,
  currentTab: 'overview',

  init() {
    this.bindEvents();
  },

  bindEvents() {
    // Open admin portal trigger
    const openAdminBtn = document.getElementById('openAdminBtn');
    if (openAdminBtn) {
      openAdminBtn.addEventListener('click', () => this.open());
    }

    // Admin login form
    const loginForm = document.getElementById('adminLoginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => this.handleLogin(e));
    }

    // Admin tab buttons
    const navItems = document.querySelectorAll('.admin-nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        navItems.forEach(n => n.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.switchTab(e.currentTarget.dataset.tab);
      });
    });
  },

  open() {
    if (this.isLoggedIn) {
      this.showDashboard();
    } else {
      this.showLoginForm();
    }
    App.openModal('adminModal');
  },

  async handleLogin(e) {
    e.preventDefault();
    const pin = document.getElementById('adminPinInput').value;
    const res = await API.loginAdmin(pin);
    if (res.success) {
      this.isLoggedIn = true;
      App.showToast('🌸 Welcome back to your Studio Dashboard, Akanksha!');
      this.showDashboard();
    } else {
      const errEl = document.getElementById('adminLoginError');
      if (errEl) errEl.textContent = res.message || 'Incorrect PIN. Default is 1234.';
    }
  },

  showLoginForm() {
    document.getElementById('adminLoginView').style.display = 'block';
    document.getElementById('adminDashboardView').style.display = 'none';
  },

  async showDashboard() {
    document.getElementById('adminLoginView').style.display = 'none';
    document.getElementById('adminDashboardView').style.display = 'flex';
    await this.switchTab('overview');
  },

  async switchTab(tabName) {
    this.currentTab = tabName;
    const contentArea = document.getElementById('adminTabContent');
    if (!contentArea) return;

    contentArea.innerHTML = '<div style="text-align:center; padding: 2rem;"><p>Loading...</p></div>';

    switch (tabName) {
      case 'overview':
        await this.renderOverview(contentArea);
        break;
      case 'artworks':
        await this.renderArtworks(contentArea);
        break;
      case 'products':
        await this.renderProducts(contentArea);
        break;
      case 'bookings':
        await this.renderBookings(contentArea);
        break;
      case 'poems':
        await this.renderPoems(contentArea);
        break;
      case 'reviews':
        await this.renderReviews(contentArea);
        break;
      case 'orders':
        await this.renderOrders(contentArea);
        break;
      case 'settings':
        await this.renderSettings(contentArea);
        break;
    }
  },

  // 1. Overview Tab
  async renderOverview(container) {
    const statsRes = await API.getAdminStats();
    const stats = statsRes.data || {};

    container.innerHTML = `
      <div>
        <h3 style="font-family: var(--font-serif); font-size: 1.6rem; margin-bottom: 0.5rem;">
          Studio Overview & Live Analytics
        </h3>
        <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1.75rem;">
          Here is your live studio activity, pending bookings, and artwork inquiries.
        </p>

        <div class="admin-stats-grid">
          <div class="stat-box">
            <div class="stat-box-num">${stats.totalArtworks || 0}</div>
            <div class="stat-box-title">Artworks in Gallery</div>
            <div style="font-size: 0.75rem; color: #155724; margin-top: 0.25rem;">${stats.availableArtworks || 0} available for sale</div>
          </div>
          <div class="stat-box">
            <div class="stat-box-num">${stats.pendingBookings || 0}</div>
            <div class="stat-box-title">Pending Face Painting Bookings</div>
            <div style="font-size: 0.75rem; color: var(--color-pink-600); margin-top: 0.25rem;">Needs confirmation</div>
          </div>
          <div class="stat-box">
            <div class="stat-box-num">₹${(stats.totalRevenue || 0).toLocaleString('en-IN')}</div>
            <div class="stat-box-title">Store Revenue</div>
            <div style="font-size: 0.75rem; color: var(--text-light); margin-top: 0.25rem;">${stats.totalOrders || 0} total orders placed</div>
          </div>
          <div class="stat-box">
            <div class="stat-box-num">★ ${stats.avgRating || '5.0'}</div>
            <div class="stat-box-title">Collector Rating</div>
            <div style="font-size: 0.75rem; color: #FFB703; margin-top: 0.25rem;">${stats.totalReviews || 0} reviews posted</div>
          </div>
        </div>

        <div style="background: white; padding: 1.5rem; border-radius: var(--radius-md); border: 1px solid var(--border-pink);">
          <h4 style="font-family: var(--font-serif); font-size: 1.25rem; margin-bottom: 0.75rem;">Quick Actions</h4>
          <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
            <button class="btn btn-primary btn-sm" onclick="Admin.openAddArtworkModal()">🎨 Add New Artwork</button>
            <button class="btn btn-secondary btn-sm" onclick="Admin.openAddProductModal()">🛍️ Add Store Product</button>
            <button class="btn btn-earth btn-sm" onclick="Admin.switchTab('bookings')">📅 View Face Paint Bookings</button>
            <button class="btn btn-secondary btn-sm" onclick="Admin.switchTab('settings')">⚙️ Edit Bio Quote & Contacts</button>
          </div>
        </div>
      </div>
    `;
  },

  // 2. Artworks Tab
  async renderArtworks(container) {
    const res = await API.getArtworks();
    const artworks = res.data || [];

    container.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
        <div>
          <h3 style="font-family: var(--font-serif); font-size: 1.5rem;">Manage Artworks & Showcase</h3>
          <p style="font-size: 0.85rem; color: var(--text-muted);">Add new canvas paintings, update prices, or mark items as sold.</p>
        </div>
        <button class="btn btn-primary btn-sm" onclick="Admin.openAddArtworkModal()">+ Add New Artwork</button>
      </div>

      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Image</th>
              <th>Title & Medium</th>
              <th>Category</th>
              <th>Price</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${artworks.map(art => `
              <tr>
                <td><img src="${art.image}" class="table-thumb" alt="${art.title}" /></td>
                <td>
                  <strong>${art.title}</strong><br/>
                  <span style="font-size: 0.75rem; color: var(--text-light);">${art.medium} (${art.dimensions})</span>
                </td>
                <td>${art.category}</td>
                <td><strong>₹${art.price.toLocaleString('en-IN')}</strong></td>
                <td>
                  <span class="table-badge ${art.isSold ? 'badge-sold' : 'badge-available'}">
                    ${art.isSold ? 'Sold' : 'Available'}
                  </span>
                </td>
                <td>
                  <div class="action-btn-group">
                    <button class="btn-table-action" onclick="Admin.toggleArtworkSold('${art.id}', ${!art.isSold})">
                      ${art.isSold ? 'Mark Available' : 'Mark Sold'}
                    </button>
                    <button class="btn-table-action btn-table-danger" onclick="Admin.deleteArtwork('${art.id}')">
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  // 3. Products Tab
  async renderProducts(container) {
    const res = await API.getProducts();
    const products = res.data || [];

    container.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
        <div>
          <h3 style="font-family: var(--font-serif); font-size: 1.5rem;">Manage Mini Store & Artifacts</h3>
          <p style="font-size: 0.85rem; color: var(--text-muted);">Totes, wearable art, custom painted jackets, prints and accessories.</p>
        </div>
        <button class="btn btn-primary btn-sm" onclick="Admin.openAddProductModal()">+ Add Product</button>
      </div>

      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Image</th>
              <th>Title</th>
              <th>Category</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${products.map(p => `
              <tr>
                <td><img src="${p.image}" class="table-thumb" alt="${p.title}" /></td>
                <td><strong>${p.title}</strong></td>
                <td>${p.category}</td>
                <td><strong>₹${p.price.toLocaleString('en-IN')}</strong></td>
                <td>${p.stock} units</td>
                <td>
                  <div class="action-btn-group">
                    <button class="btn-table-action btn-table-danger" onclick="Admin.deleteProduct('${p.id}')">
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  // 4. Bookings Tab
  async renderBookings(container) {
    const res = await API.getBookings();
    const bookings = res.data || [];

    container.innerHTML = `
      <div style="margin-bottom: 1.5rem;">
        <h3 style="font-family: var(--font-serif); font-size: 1.5rem;">Face Painting & Creative Bookings</h3>
        <p style="font-size: 0.85rem; color: var(--text-muted);">Manage requests for college fests, shoots, and private celebrations.</p>
      </div>

      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Ref ID</th>
              <th>Client</th>
              <th>Event & Date</th>
              <th>Slot</th>
              <th>Location</th>
              <th>Fee</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${bookings.map(b => `
              <tr>
                <td><strong style="color: var(--color-pink-600);">${b.id}</strong></td>
                <td>
                  <strong>${b.clientName}</strong><br/>
                  <span style="font-size: 0.75rem; color: var(--text-light);">${b.clientPhone}</span>
                </td>
                <td>
                  ${b.eventType}<br/>
                  <span style="font-size: 0.75rem; color: var(--text-muted);">📅 ${b.eventDate}</span>
                </td>
                <td><span style="font-size: 0.8rem;">${b.timeSlot}</span></td>
                <td><span style="font-size: 0.8rem;">${b.location}</span></td>
                <td><strong>₹${(b.estimatedAmount || 0).toLocaleString('en-IN')}</strong></td>
                <td>
                  <span class="table-badge ${b.status === 'Confirmed' ? 'badge-confirmed' : 'badge-pending'}">
                    ${b.status}
                  </span>
                </td>
                <td>
                  <div class="action-btn-group">
                    <button class="btn-table-action" onclick="Admin.updateBookingStatus('${b.id}', 'Confirmed')">
                      Accept
                    </button>
                    <button class="btn-table-action btn-table-danger" onclick="Admin.deleteBooking('${b.id}')">
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  // 5. Poems Tab
  async renderPoems(container) {
    const res = await API.getPoems();
    const poems = res.data || [];

    container.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
        <div>
          <h3 style="font-family: var(--font-serif); font-size: 1.5rem;">Manage Poetry & Writings</h3>
          <p style="font-size: 0.85rem; color: var(--text-muted);">Publish verses, poems, and book excerpts.</p>
        </div>
        <button class="btn btn-primary btn-sm" onclick="Admin.openAddPoemModal()">+ Write New Poem</button>
      </div>

      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Theme</th>
              <th>Book / Collection</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${poems.map(p => `
              <tr>
                <td><strong>${p.title}</strong></td>
                <td>${p.theme}</td>
                <td>📖 ${p.book}</td>
                <td>${p.date}</td>
                <td>
                  <button class="btn-table-action btn-table-danger" onclick="Admin.deletePoem('${p.id}')">
                    Delete
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  // 6. Reviews Tab
  async renderReviews(container) {
    const res = await API.getReviews();
    const reviews = res.data || [];

    container.innerHTML = `
      <div style="margin-bottom: 1.5rem;">
        <h3 style="font-family: var(--font-serif); font-size: 1.5rem;">Manage Collector Reviews</h3>
        <p style="font-size: 0.85rem; color: var(--text-muted);">Approve or moderate ratings from buyers and event organizers.</p>
      </div>

      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Reviewer</th>
              <th>Rating</th>
              <th>Comment</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${reviews.map(r => `
              <tr>
                <td>
                  <strong>${r.name}</strong><br/>
                  <span style="font-size: 0.75rem; color: var(--text-light);">${r.role}</span>
                </td>
                <td><span style="color: #FFB703;">★ ${r.rating}</span></td>
                <td><p style="font-size: 0.85rem; max-width: 320px;">"${r.comment}"</p></td>
                <td>${r.date}</td>
                <td>
                  <button class="btn-table-action btn-table-danger" onclick="Admin.deleteReview('${r.id}')">
                    Delete
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  // 7. Orders Tab
  async renderOrders(container) {
    const res = await API.getOrders();
    const orders = res.data || [];

    container.innerHTML = `
      <div style="margin-bottom: 1.5rem;">
        <h3 style="font-family: var(--font-serif); font-size: 1.5rem;">Customer Orders</h3>
        <p style="font-size: 0.85rem; color: var(--text-muted);">Track customer purchases, delivery addresses, and payment modes.</p>
      </div>

      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Items</th>
              <th>Total</th>
              <th>Payment</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${orders.map(o => `
              <tr>
                <td><strong style="color: var(--color-pink-600);">${o.id}</strong></td>
                <td>
                  <strong>${o.customerName}</strong><br/>
                  <span style="font-size: 0.75rem; color: var(--text-light);">${o.phone}</span>
                </td>
                <td>
                  <ul style="padding-left: 1rem; font-size: 0.8rem;">
                    ${(o.items || []).map(i => `<li>${i.title} (×${i.quantity})</li>`).join('')}
                  </ul>
                </td>
                <td><strong>₹${(o.totalAmount || 0).toLocaleString('en-IN')}</strong></td>
                <td><span style="font-size: 0.8rem;">${o.paymentMethod}</span></td>
                <td>
                  <span class="table-badge badge-confirmed">${o.status}</span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  openToSettings() {
    this.open();
    if (this.isLoggedIn) {
      const navItems = document.querySelectorAll('.admin-nav-item');
      navItems.forEach(n => n.classList.remove('active'));
      const settingsNav = document.querySelector('.admin-nav-item[data-tab="settings"]');
      if (settingsNav) settingsNav.classList.add('active');
      this.switchTab('settings');
    }
  },

  // 8. Site Settings & Bio Editor Tab
  async renderSettings(container) {
    const res = await API.getSettings();
    const s = res.data || {};

    container.innerHTML = `
      <div style="max-width: 680px;">
        <h3 style="font-family: var(--font-serif); font-size: 1.5rem; margin-bottom: 0.5rem;">
          Edit Bio, Photo & Studio Settings
        </h3>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1.5rem;">
          Upload your portrait photo directly from your device, update your home quote, and customize contact details.
        </p>

        <form id="adminSettingsForm" onsubmit="Admin.handleSettingsSave(event)">
          
          <!-- Artist Photo Upload Section -->
          <div style="background: white; border: 1px solid var(--border-pink); padding: 1.5rem; border-radius: var(--radius-md); margin-bottom: 1.5rem; box-shadow: var(--shadow-sm);">
            <label class="form-label" style="font-size: 0.95rem; margin-bottom: 0.75rem; display: block;">
              📸 Main Artist Portrait Photo
            </label>
            <div style="display: flex; gap: 1.5rem; align-items: center; flex-wrap: wrap;">
              <div style="width: 100px; height: 120px; border-radius: 6px; overflow: hidden; border: 2px solid var(--color-pink-300); box-shadow: var(--shadow-sm); background: var(--color-pink-50);">
                <img id="adminPhotoPreview" src="${s.artistImage || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1000&q=80'}" alt="Preview" style="width: 100%; height: 100%; object-fit: cover;" />
              </div>
              <div style="flex: 1; min-width: 240px;">
                <label style="display: inline-block; background: var(--color-pink-500); color: white; padding: 0.5rem 1.25rem; border-radius: var(--radius-full); font-size: 0.85rem; font-weight: 600; cursor: pointer; margin-bottom: 0.5rem;">
                  📁 Upload Photo from Device
                  <input type="file" id="adminPhotoFileInput" accept="image/*" style="display: none;" onchange="Admin.handlePhotoFileSelect(event)" />
                </label>
                <div style="font-size: 0.75rem; color: var(--text-light); margin-bottom: 0.5rem;">
                  Or enter/paste an image URL below:
                </div>
                <input type="text" name="artistImage" id="adminArtistImageUrl" class="form-input" value="${s.artistImage || ''}" placeholder="https://..." oninput="Admin.previewPhotoUrl(this.value)" />
              </div>
            </div>

            <!-- Presets -->
            <div style="margin-top: 1rem; border-top: 1px dashed var(--border-subtle); padding-top: 0.75rem;">
              <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">Sample Aesthetic Presets:</span>
              <div style="display: flex; gap: 0.5rem; margin-top: 0.4rem; flex-wrap: wrap;">
                <button type="button" class="btn btn-secondary btn-sm" style="font-size: 0.75rem; padding: 0.25rem 0.6rem;" onclick="Admin.selectPhotoPreset('https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1000&q=80')">Blush Studio</button>
                <button type="button" class="btn btn-secondary btn-sm" style="font-size: 0.75rem; padding: 0.25rem 0.6rem;" onclick="Admin.selectPhotoPreset('https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1000&q=80')">Editorial Chic</button>
                <button type="button" class="btn btn-secondary btn-sm" style="font-size: 0.75rem; padding: 0.25rem 0.6rem;" onclick="Admin.selectPhotoPreset('https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1000&q=80')">Sunlit Artist</button>
              </div>
            </div>
          </div>

          <div class="form-group" style="margin-bottom: 1rem;">
            <label class="form-label">Artist Name</label>
            <input type="text" name="name" class="form-input" value="${s.name || 'Akanksha'}" required />
          </div>

          <div class="form-group" style="margin-bottom: 1rem;">
            <label class="form-label">College / University</label>
            <input type="text" name="institution" class="form-input" value="${s.institution || 'Hindu College, University of Delhi'}" required />
          </div>

          <div class="form-group" style="margin-bottom: 1rem;">
            <label class="form-label">Home Section Artist Statement Quote ("Mera photuu left, text right")</label>
            <textarea name="bioQuote" class="form-textarea" rows="4" required>${s.bioQuote || ''}</textarea>
          </div>

          <div class="form-grid" style="margin-bottom: 1rem;">
            <div class="form-group">
              <label class="form-label">Primary Instagram</label>
              <input type="text" name="instagramPrimary" class="form-input" value="${s.instagramPrimary || '@_akanxha'}" />
            </div>
            <div class="form-group">
              <label class="form-label">Secondary Instagram</label>
              <input type="text" name="instagramSecondary" class="form-input" value="${s.instagramSecondary || '@psychotichic'}" />
            </div>
          </div>

          <div class="form-grid" style="margin-bottom: 1.5rem;">
            <div class="form-group">
              <label class="form-label">Contact Email</label>
              <input type="email" name="email" class="form-input" value="${s.email || 'akankshachandreshwar@gmail.com'}" required />
            </div>
            <div class="form-group">
              <label class="form-label">WhatsApp / Phone</label>
              <input type="text" name="phone" class="form-input" value="${s.phone || '9517155681'}" required />
            </div>
          </div>

          <!-- Razorpay Payment Gateway Settings -->
          <div style="background: var(--color-pink-50); border: 1px solid var(--border-pink); padding: 1.25rem; border-radius: var(--radius-md); margin-bottom: 1.5rem;">
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
              <span style="font-size: 1.2rem;">💳</span>
              <strong style="font-size: 0.95rem; color: var(--color-pink-600);">Razorpay Payment Gateway Integration</strong>
            </div>
            <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 1rem;">
              Enter your Razorpay API keys to accept real UPI (GPay/PhonePe), Credit/Debit Cards, and Netbanking with direct bank settlement.
            </p>
            <div class="form-grid" style="margin-bottom: 0.75rem;">
              <div class="form-group">
                <label class="form-label" style="font-size: 0.8rem;">Razorpay Key ID</label>
                <input type="text" name="razorpayKeyId" class="form-input" placeholder="rzp_test_... or rzp_live_..." value="${s.razorpayKeyId || ''}" />
              </div>
              <div class="form-group">
                <label class="form-label" style="font-size: 0.8rem;">Razorpay Key Secret</label>
                <input type="password" name="razorpayKeySecret" class="form-input" placeholder="••••••••••••" value="${s.razorpayKeySecret || ''}" />
              </div>
            </div>
            <div class="form-group">
              <label class="form-label" style="font-size: 0.8rem;">Direct UPI ID (for QR & Manual Payments)</label>
              <input type="text" name="upiId" class="form-input" placeholder="e.g. 9517155681@okaxis" value="${s.upiId || '9517155681@okaxis'}" />
            </div>
          </div>

          <button type="submit" class="btn btn-primary" style="width: 100%; margin-bottom: 2rem;">
            💾 Save Profile Settings & Payment Keys
          </button>
        </form>


        <!-- Change Admin PIN / Password Section -->
        <div style="background: white; border: 1px solid var(--border-pink); padding: 1.75rem; border-radius: var(--radius-md); box-shadow: var(--shadow-sm);">
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
            <span style="font-size: 1.3rem;">🔐</span>
            <h4 style="font-family: var(--font-serif); font-size: 1.25rem;">Change Admin Dashboard PIN / Password</h4>
          </div>
          <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1.25rem;">
            Set a new custom PIN or password to secure your studio dashboard.
          </p>

          <form id="adminPinChangeForm" onsubmit="Admin.handlePinChange(event)">
            <div class="form-grid" style="margin-bottom: 1rem;">
              <div class="form-group">
                <label class="form-label">New PIN / Password</label>
                <input type="password" id="newAdminPin" class="form-input" placeholder="e.g. 5678 or akanksha2026" required minlength="3" />
              </div>
              <div class="form-group">
                <label class="form-label">Confirm New PIN / Password</label>
                <input type="password" id="confirmAdminPin" class="form-input" placeholder="Re-enter PIN" required minlength="3" />
              </div>
            </div>
            <div id="adminPinMsg" style="font-size: 0.8rem; margin-bottom: 1rem;"></div>
            <button type="submit" class="btn btn-secondary">
              🔒 Update Admin Password
            </button>
          </form>
        </div>
      </div>
    `;
  },

  // Pin change handler
  async handlePinChange(e) {
    e.preventDefault();
    const newPin = document.getElementById('newAdminPin').value;
    const confirmPin = document.getElementById('confirmAdminPin').value;
    const msgEl = document.getElementById('adminPinMsg');

    if (newPin !== confirmPin) {
      if (msgEl) {
        msgEl.style.color = '#E03131';
        msgEl.textContent = '❌ PINs do not match. Please re-enter.';
      }
      return;
    }

    const res = await API.changeAdminPin(newPin);
    if (res.success) {
      if (msgEl) {
        msgEl.style.color = '#155724';
        msgEl.textContent = '✅ PIN updated successfully! Use your new credentials next time.';
      }
      App.showToast('🔐 Admin PIN / Password updated successfully!');
      document.getElementById('newAdminPin').value = '';
      document.getElementById('confirmAdminPin').value = '';
    } else {
      if (msgEl) {
        msgEl.style.color = '#E03131';
        msgEl.textContent = res.message || 'Failed to update PIN.';
      }
    }
  },

  // Photo handlers
  async handlePhotoFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      App.showToast('Please select a valid image file (JPG, PNG, WebP).');
      return;
    }

    const preview = document.getElementById('adminPhotoPreview');

    // Show preview immediately
    if (preview) {
      preview.src = URL.createObjectURL(file);
    }

    try {
      App.showToast('⏳ Uploading photo to Cloudinary...');

      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Image upload failed');
      }

      const cloudinaryUrl = data.url;

      const inputUrl = document.getElementById('adminArtistImageUrl');

      if (inputUrl) {
        inputUrl.value = cloudinaryUrl;
      }

      if (preview) {
        preview.src = cloudinaryUrl;
      }

      App.showToast('✅ Photo uploaded to Cloudinary successfully!');

      console.log('Cloudinary URL:', cloudinaryUrl);
      console.log('Cloudinary Public ID:', data.publicId);

    } catch (error) {
      console.error('Cloudinary upload error:', error);
      App.showToast('❌ Photo upload failed: ' + error.message);
    }
  },

  previewPhotoUrl(url) {
    const preview = document.getElementById('adminPhotoPreview');
    if (preview && url) preview.src = url;
  },

  selectPhotoPreset(url) {
    const preview = document.getElementById('adminPhotoPreview');
    const inputUrl = document.getElementById('adminArtistImageUrl');
    if (preview) preview.src = url;
    if (inputUrl) inputUrl.value = url;
    App.showToast('Preset selected! Click "Save Profile Settings & Photo" to publish.');
  },

  // Actions
  async handleSettingsSave(e) {
    e.preventDefault();
    const form = e.target;
    const data = {
      name: form.elements['name'].value,
      institution: form.elements['institution'].value,
      bioQuote: form.elements['bioQuote'].value,
      artistImage: form.elements['artistImage'].value,
      instagramPrimary: form.elements['instagramPrimary'].value,
      instagramSecondary: form.elements['instagramSecondary'].value,
      email: form.elements['email'].value,
      phone: form.elements['phone'].value,
      razorpayKeyId: form.elements['razorpayKeyId'] ? form.elements['razorpayKeyId'].value.trim() : '',
      razorpayKeySecret: form.elements['razorpayKeySecret'] ? form.elements['razorpayKeySecret'].value.trim() : '',
      upiId: form.elements['upiId'] ? form.elements['upiId'].value.trim() : '9517155681@okaxis'
    };

    const res = await API.updateSettings(data);
    if (res.success) {
      App.showToast('🌸 Bio, Portrait Photo, Payment Keys & Settings saved successfully!');
      App.refreshSettings(res.data);
    }
  },



  async toggleArtworkSold(id, isSold) {
    await API.updateArtwork(id, { isSold });
    App.showToast(`Artwork marked as ${isSold ? 'Sold' : 'Available'}`);
    await Gallery.fetchArtworks();
    this.switchTab('artworks');
  },

  async deleteArtwork(id) {
    if (confirm('Are you sure you want to delete this artwork?')) {
      await API.deleteArtwork(id);
      App.showToast('Artwork deleted.');
      await Gallery.fetchArtworks();
      this.switchTab('artworks');
    }
  },

  async deleteProduct(id) {
    if (confirm('Are you sure you want to delete this product?')) {
      await API.deleteProduct(id);
      App.showToast('Product removed.');
      await Store.fetchProducts();
      this.switchTab('products');
    }
  },

  async updateBookingStatus(id, status) {
    await API.updateBooking(id, { status });
    App.showToast(`Booking marked as ${status}!`);
    this.switchTab('bookings');
  },

  async deleteBooking(id) {
    if (confirm('Delete this booking?')) {
      await API.deleteBooking(id);
      this.switchTab('bookings');
    }
  },

  async deletePoem(id) {
    if (confirm('Delete this poem?')) {
      await API.deletePoem(id);
      await Poetry.fetchPoems();
      this.switchTab('poems');
    }
  },

  async deleteReview(id) {
    if (confirm('Delete this review?')) {
      await API.deleteReview(id);
      await Reviews.fetchReviews();
      this.switchTab('reviews');
    }
  },


  async openAddArtworkModal() {
    const title = prompt('Artwork Title:', 'Whispers of North Campus II');
    if (!title) return;

    const medium = prompt(
      'Medium & Dimensions:',
      'Acrylic & Gold Leaf on Canvas (24x36)'
    );

    const price = parseInt(prompt('Price in INR:', '15000')) || 15000;

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/jpeg,image/png,image/webp,image/jpg';
    fileInput.style.display = 'none';

    document.body.appendChild(fileInput);

    fileInput.onchange = async (event) => {
      const file = event.target.files[0];

      fileInput.remove();

      if (!file) {
        App.showToast('❌ No image selected.');
        return;
      }

      if (!file.type.startsWith('image/')) {
        App.showToast('❌ Please select a valid image.');
        return;
      }

      try {
        App.showToast('⏳ Uploading artwork image...');

        const formData = new FormData();
        formData.append('image', file);

        console.log('Uploading artwork:', file.name);
        console.log('File size:', file.size);
        console.log('File type:', file.type);

        const uploadResponse = await fetch('/api/upload-image', {
          method: 'POST',
          body: formData
        });

        console.log('Upload response status:', uploadResponse.status);

        const uploadData = await uploadResponse.json();

        console.log('Upload response:', uploadData);

        if (!uploadResponse.ok || !uploadData.success) {
          throw new Error(
            uploadData.message || 'Cloudinary upload failed'
          );
        }

        const image = uploadData.url;

        if (!image) {
          throw new Error('Cloudinary did not return an image URL');
        }

        console.log('Cloudinary image URL:', image);

        App.showToast('✅ Image uploaded! Publishing artwork...');

        const result = await API.addArtwork({
          title,
          medium,
          category: 'Canvas Paintings',
          price,
          image,
          dimensions: '24 x 36 inches',
          description:
            'Original studio creation inspired by delicate blush tones and Delhi sunlight.',
          isSold: false
        });

        console.log('Artwork API response:', result);

        if (!result || !result.success) {
          throw new Error(
            result?.message || 'Artwork could not be saved'
          );
        }

        App.showToast('✨ Artwork uploaded & published successfully!');

        await Gallery.fetchArtworks();
        this.switchTab('artworks');

      } catch (error) {
        console.error('❌ ARTWORK UPLOAD ERROR:', error);

        App.showToast(
          '❌ Artwork upload failed: ' + error.message
        );
      }
    };

    fileInput.click();
  },

  openAddProductModal() {
    const title = prompt('Product Title:', 'Custom Hand-Painted Tote');
    if (!title) return;
    const price = parseInt(prompt('Price in INR:', '1299')) || 1299;
    const image = prompt('Product Image URL:', 'https://images.unsplash.com/photo-1597633425046-08f5110420b5?auto=format&fit=crop&w=800&q=80');

    API.addProduct({
      title,
      category: 'Wearable Art',
      price,
      image,
      description: 'Hand-crafted aesthetic artifact made with love.'
    }).then(() => {
      App.showToast('✨ Product added to store!');
      Store.fetchProducts();
      this.switchTab('products');
    });
  },

  openAddPoemModal() {
    const title = prompt('Poem Title:');
    if (!title) return;
    const fullText = prompt('Full Poem text:');
    if (!fullText) return;

    API.addPoem({
      title,
      fullText,
      book: 'Chronicles of Blush & Ink',
      theme: 'Poetic Musings',
      date: 'Recent'
    }).then(() => {
      App.showToast('✍️ Poem published!');
      Poetry.fetchPoems();
      this.switchTab('poems');
    });
  }
};
