/**
 * AKANKSHA ART STUDIO - Admin Dashboard Module
 * Complete Content Management System for Artworks, Products, Bookings, Poems, Reviews & Settings.
 */

// Ensure App object with toast/modal fallbacks exists even in standalone admin page
if (typeof window.App === 'undefined') {
  window.App = {
    showToast(message) {
      let container = document.getElementById('toastContainer');
      if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.style.cssText = `
          position: fixed;
          bottom: 2rem;
          right: 2rem;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          pointer-events: none;
        `;
        document.body.appendChild(container);
      }

      const toast = document.createElement('div');
      toast.style.cssText = `
        background: rgba(35, 31, 32, 0.95);
        color: white;
        padding: 0.85rem 1.4rem;
        border-radius: 9999px;
        box-shadow: 0 16px 36px rgba(201, 24, 74, 0.16);
        font-size: 0.9rem;
        font-weight: 500;
        backdrop-filter: blur(8px);
        border: 1px solid rgba(255, 117, 151, 0.4);
        display: flex;
        align-items: center;
        gap: 0.6rem;
        animation: slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        pointer-events: auto;
      `;
      toast.innerHTML = message;
      container.appendChild(toast);

      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
      }, 4000);
    },
    openModal(modalId) {
      const modal = document.getElementById(modalId);
      if (modal) modal.classList.add('open');
    },
    closeModal(modalId) {
      const modal = document.getElementById(modalId);
      if (modal) modal.classList.remove('open');
    },
    refreshSettings(s) {
      console.log('Studio settings refreshed in admin:', s);
    }
  };
}

const Admin = {
  isLoggedIn: false,
  currentTab: 'overview',

  init() {
    this.bindEvents();

    // Check if user has an active session or remembered login
    const isRemembered = localStorage.getItem('akamatoe_admin_auth') === 'true';
    const isSessionActive = sessionStorage.getItem('akamatoe_admin_auth') === 'true';

    if (isRemembered || isSessionActive) {
      this.isLoggedIn = true;
      this.showDashboard();
    } else {
      this.showLoginForm();
    }
  },

  bindEvents() {
    // Open admin portal trigger (used in public page)
    const openAdminBtn = document.getElementById('openAdminBtn');
    if (openAdminBtn && openAdminBtn.tagName === 'BUTTON') {
      openAdminBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.open();
      });
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
        const btn = e.target.closest('.admin-nav-item') || e.currentTarget;
        const tab = btn?.dataset?.tab;
        if (tab) {
          this.switchTab(tab);
        }
      });
    });
  },

  open() {
    // If not currently on admin.html, navigate directly to admin landing page
    if (!window.location.pathname.endsWith('admin.html') && !window.location.pathname.endsWith('/admin')) {
      window.location.href = 'admin.html';
      return;
    }

    if (this.isLoggedIn) {
      this.showDashboard();
    } else {
      this.showLoginForm();
    }

    const modal = document.getElementById('adminModal');
    if (modal && typeof App !== 'undefined' && App.openModal) {
      App.openModal('adminModal');
    }
  },

  async handleLogin(e) {
    if (e) e.preventDefault();
    const pinInput = document.getElementById('adminPinInput');
    if (!pinInput) return;

    const pin = pinInput.value.trim();
    const rememberCheckbox = document.getElementById('adminRememberMe');
    const submitBtn = document.getElementById('adminLoginSubmitBtn');
    const errEl = document.getElementById('adminLoginError');

    if (errEl) {
      errEl.textContent = '';
      errEl.classList.remove('shake');
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>⏳ Verifying Studio Access...</span>';
    }

    try {
      const res = await API.loginAdmin(pin);
      if (res && res.success) {
        this.isLoggedIn = true;
        sessionStorage.setItem('akamatoe_admin_auth', 'true');
        if (rememberCheckbox && rememberCheckbox.checked) {
          localStorage.setItem('akamatoe_admin_auth', 'true');
        } else {
          localStorage.removeItem('akamatoe_admin_auth');
        }

        App.showToast('🌸 Welcome back to your Studio Dashboard, Akanksha!');
        this.showDashboard();
      } else {
        if (errEl) {
          errEl.textContent = (res && res.message) ? res.message : 'Incorrect Studio PIN. Please check your credentials.';
          errEl.classList.add('shake');
          setTimeout(() => errEl.classList.remove('shake'), 500);
        }
      }
    } catch (err) {
      if (errEl) {
        errEl.textContent = '❌ Service connection issue: ' + err.message;
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Unlock Studio Dashboard</span><span class="arrow-icon">→</span>';
      }
    }
  },

  logout() {
    this.isLoggedIn = false;
    sessionStorage.removeItem('akamatoe_admin_auth');
    localStorage.removeItem('akamatoe_admin_auth');
    
    // Clear input
    const pinInput = document.getElementById('adminPinInput');
    if (pinInput) pinInput.value = '';

    App.showToast('👋 Studio session locked safely.');
    this.showLoginForm();
  },

  showLoginForm() {
    // 1. Standalone Admin Landing Page Views
    const landingSection = document.getElementById('adminLandingSection');
    const dashboardSection = document.getElementById('adminDashboardSection');
    if (landingSection && dashboardSection) {
      landingSection.style.display = 'block';
      dashboardSection.style.display = 'none';
    }

    // 2. Fallback modal views
    const loginView = document.getElementById('adminLoginView');
    const dashboardView = document.getElementById('adminDashboardView');
    if (loginView) loginView.style.display = 'block';
    if (dashboardView) dashboardView.style.display = 'none';
  },

  async showDashboard() {
    // 1. Standalone Admin Landing Page Views
    const landingSection = document.getElementById('adminLandingSection');
    const dashboardSection = document.getElementById('adminDashboardSection');
    if (landingSection && dashboardSection) {
      landingSection.style.display = 'none';
      dashboardSection.style.display = 'flex';
    }

    // 2. Fallback modal views
    const loginView = document.getElementById('adminLoginView');
    const dashboardView = document.getElementById('adminDashboardView');
    if (loginView) loginView.style.display = 'none';
    if (dashboardView) dashboardView.style.display = 'flex';

    await this.switchTab(this.currentTab || 'overview');
  },

  async switchTab(tabName) {
    this.currentTab = tabName;
    const contentArea = document.getElementById('adminTabContent');
    if (!contentArea) return;

    // Auto-close mobile drawer on tab selection
    const sidebar = document.getElementById('adminSidebarNav');
    const overlay = document.getElementById('adminSidebarOverlay');
    if (sidebar) sidebar.classList.remove('mobile-open');
    if (overlay) overlay.classList.remove('active');

    // Synchronize active class across all matching tab buttons
    document.querySelectorAll('.admin-nav-item').forEach(item => {
      if (item.dataset.tab === tabName) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    contentArea.innerHTML = `
      <div class="admin-loading-spinner" style="padding: 3rem 1rem;">
        <div class="spinner-circle"></div>
        <p style="margin-top: 1rem; color: var(--text-muted); font-size: 0.9rem;">Loading ${tabName}...</p>
      </div>
    `;

    try {
      switch (tabName) {
        case 'overview':
          await this.renderOverview(contentArea);
          break;
        case 'artworks':
          await this.renderArtworks(contentArea);
          break;
        case 'facearts':
          await this.renderFaceArts(contentArea);
          break;
        case 'products':
          await this.renderProducts(contentArea);
          break;
        case 'bookings':
          await this.renderBookings(contentArea);
          break;
        case 'booking-photo':
        case 'placecard':
          await this.renderBookingPhoto(contentArea);
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
        default:
          await this.renderOverview(contentArea);
          break;
      }
    } catch (err) {
      console.error(`[Admin] Failed to render tab "${tabName}":`, err);
      contentArea.innerHTML = `
        <div style="background: white; border: 1px solid var(--border-pink); border-radius: var(--radius-md); padding: 3rem 2rem; text-align: center; max-width: 600px; margin: 2rem auto; box-shadow: var(--shadow-sm);">
          <div style="font-size: 2.5rem; margin-bottom: 0.75rem;">⚠️</div>
          <h3 style="font-family: var(--font-serif); font-size: 1.4rem; color: var(--color-pink-600); margin-bottom: 0.5rem;">
            Could Not Load Tab Content
          </h3>
          <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1.5rem;">
            ${err.message || 'The studio service encountered an issue loading this section.'}
          </p>
          <div style="display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap;">
            <button class="btn btn-primary btn-sm" onclick="Admin.switchTab('${tabName}')">
              🔄 Retry Tab
            </button>
            <button class="btn btn-secondary btn-sm" onclick="Admin.switchTab('overview')">
              📊 Back to Overview
            </button>
          </div>
        </div>
      `;
    }
  },

  // 1. Overview Tab
  async renderOverview(container) {
    const [statsRes, artworksRes, faceArtsRes] = await Promise.all([
      API.getAdminStats().catch(() => ({ data: {} })),
      API.getArtworks().catch(() => ({ data: [] })),
      API.getAdminFaceArts().catch(() => ({ data: [] }))
    ]);
    const stats = (statsRes && statsRes.data) || {};
    const artworks = (artworksRes && artworksRes.data) || [];
    const faceArts = (faceArtsRes && faceArtsRes.data) || [];

    container.innerHTML = `
      <div>
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap; margin-bottom: 1.5rem;">
          <div>
            <h3 style="font-family: var(--font-serif); font-size: 1.6rem; margin-bottom: 0.35rem;">
              Studio Overview &amp; Live Gallery
            </h3>
            <p style="color: var(--text-muted); font-size: 0.9rem; margin: 0;">
              Welcome, Akanksha. Overview of your live portfolio items, photos, and studio inquiries.
            </p>
          </div>
          <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
            <button class="btn btn-primary btn-sm" onclick="Admin.openAddArtworkModal()">🎨 + Add Artwork</button>
            <button class="btn btn-secondary btn-sm" onclick="Admin.openAddFaceArt()">✨ + Upload Face Art</button>
          </div>
        </div>

        <div class="admin-stats-grid">
          <div class="stat-box" onclick="Admin.switchTab('artworks')" style="cursor: pointer;">
            <div class="stat-box-num">${stats.totalArtworks || artworks.length || 0}</div>
            <div class="stat-box-title">Canvas Artworks</div>
            <div style="font-size: 0.75rem; color: #155724; margin-top: 0.25rem;">${stats.availableArtworks || artworks.length || 0} available &bull; Click to view</div>
          </div>
          <div class="stat-box" onclick="Admin.switchTab('facearts')" style="cursor: pointer;">
            <div class="stat-box-num">${stats.totalFaceArts || faceArts.length || 0}</div>
            <div class="stat-box-title">Face Art Photographs</div>
            <div style="font-size: 0.75rem; color: var(--color-pink-600); margin-top: 0.25rem;">Cloudinary hosted &bull; Click to view</div>
          </div>
          <div class="stat-box" onclick="Admin.switchTab('orders')" style="cursor: pointer;">
            <div class="stat-box-num">₹${(stats.totalRevenue || 0).toLocaleString('en-IN')}</div>
            <div class="stat-box-title">Store Revenue</div>
            <div style="font-size: 0.75rem; color: var(--text-light); margin-top: 0.25rem;">${stats.totalOrders || 0} total orders</div>
          </div>
          <div class="stat-box" onclick="Admin.switchTab('bookings')" style="cursor: pointer;">
            <div class="stat-box-num">${stats.pendingBookings || 0}</div>
            <div class="stat-box-title">Pending Bookings</div>
            <div style="font-size: 0.75rem; color: #e65100; margin-top: 0.25rem;">${stats.totalBookings || 0} total requests</div>
          </div>
        </div>

        <!-- Visual Image Gallery Showcase -->
        <div style="background: white; border: 1px solid var(--border-pink); border-radius: var(--radius-md); padding: 1.5rem; margin-bottom: 1.75rem; box-shadow: var(--shadow-sm);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <h4 style="font-family: var(--font-serif); font-size: 1.25rem; margin: 0; color: var(--text-main);">
              🎨 Live Uploaded Artworks (${artworks.length})
            </h4>
            <button class="btn btn-secondary btn-sm" onclick="Admin.switchTab('artworks')">
              Manage Artworks &rarr;
            </button>
          </div>
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 1rem;">
            ${artworks.map(art => `
              <div onclick="Admin.switchTab('artworks')" style="cursor: pointer; border-radius: var(--radius-sm); overflow: hidden; border: 1px solid var(--border-subtle); background: var(--color-pink-50); transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.03)'" onmouseout="this.style.transform='scale(1)'">
                <img src="${art.image}" alt="${art.title}" style="width: 100%; aspect-ratio: 1/1; object-fit: cover; display: block;" onerror="this.src='https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=300&q=80'" />
                <div style="padding: 0.5rem 0.6rem;">
                  <div style="font-weight: 600; font-size: 0.78rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${art.title}</div>
                  <div style="font-size: 0.72rem; color: var(--color-pink-600); font-weight: 600;">₹${(art.price || 0).toLocaleString('en-IN')}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Visual Face Art Showcase -->
        <div style="background: white; border: 1px solid var(--border-pink); border-radius: var(--radius-md); padding: 1.5rem; margin-bottom: 1.75rem; box-shadow: var(--shadow-sm);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <h4 style="font-family: var(--font-serif); font-size: 1.25rem; margin: 0; color: var(--text-main);">
              ✨ Live Face Art Photographs (${faceArts.length})
            </h4>
            <button class="btn btn-secondary btn-sm" onclick="Admin.switchTab('facearts')">
              Manage Face Art Gallery &rarr;
            </button>
          </div>
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 0.75rem;">
            ${faceArts.map(fa => `
              <div onclick="Admin.switchTab('facearts')" style="cursor: pointer; border-radius: var(--radius-sm); overflow: hidden; border: 1px solid var(--border-subtle); background: var(--color-pink-50); aspect-ratio: 1/1; position: relative;">
                <img src="${fa.image}" alt="Face Art" style="width: 100%; height: 100%; object-fit: cover; display: block;" onerror="this.src='https://images.unsplash.com/photo-1516914943479-89db7d9ae7f2?auto=format&fit=crop&w=300&q=80'" />
                <span style="position: absolute; bottom: 4px; right: 4px; font-size: 0.65rem; background: rgba(0,0,0,0.65); color: white; padding: 0.15rem 0.4rem; border-radius: 4px;">
                  ${fa.isPublished !== false ? '✓ Live' : 'Hidden'}
                </span>
              </div>
            `).join('')}
          </div>
        </div>

        <div style="background: white; padding: 1.5rem; border-radius: var(--radius-md); border: 1px solid var(--border-pink);">
          <h4 style="font-family: var(--font-serif); font-size: 1.25rem; margin-bottom: 0.75rem;">Quick Management Actions</h4>
          <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
            <button class="btn btn-primary btn-sm" onclick="Admin.openAddArtworkModal()">🎨 Add New Artwork</button>
            <button class="btn btn-secondary btn-sm" onclick="Admin.openAddFaceArt()">✨ Upload Face Art</button>
            <button class="btn btn-secondary btn-sm" onclick="Admin.openAddProductModal()">🛍️ Add Store Product</button>
            <button class="btn btn-earth btn-sm" onclick="Admin.switchTab('booking-photo')">🖼️ Update Spotlight Photo</button>
            <button class="btn btn-secondary btn-sm" onclick="Admin.switchTab('settings')">⚙️ Edit Bio Quote &amp; Contacts</button>
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
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h3 style="font-family: var(--font-serif); font-size: 1.5rem; margin-bottom: 0.25rem;">
            Manage Artworks &amp; Showcase (${artworks.length})
          </h3>
          <p style="font-size: 0.85rem; color: var(--text-muted); margin: 0;">
            Original paintings displayed on your public gallery. Click any thumbnail to view in full resolution.
          </p>
        </div>
        <button class="btn btn-primary btn-sm" onclick="Admin.openAddArtworkModal()">+ Add New Artwork</button>
      </div>

      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Image</th>
              <th>Title &amp; Medium</th>
              <th>Category</th>
              <th>Price</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${artworks.length === 0 ? `
              <tr>
                <td colspan="6" style="text-align: center; padding: 3.5rem 1rem; color: var(--text-muted);">
                  <div style="font-size: 2.5rem; margin-bottom: 0.75rem;">🎨</div>
                  <div style="font-family: var(--font-serif); font-size: 1.25rem; color: var(--text-main); margin-bottom: 0.35rem;">
                    No Artworks in Gallery Yet
                  </div>
                  <p style="font-size: 0.85rem; margin-bottom: 1.25rem;">Upload your canvas paintings to showcase them on the public website.</p>
                  <button class="btn btn-primary btn-sm" onclick="Admin.openAddArtworkModal()">+ Upload First Artwork</button>
                </td>
              </tr>
            ` : artworks.map(art => `
              <tr>
                <td>
                  <img 
                    src="${art.image}" 
                    class="table-thumb" 
                    alt="${art.title}" 
                    title="Click to view full image"
                    style="cursor: pointer;"
                    onclick="window.open('${art.image}', '_blank')"
                    onerror="this.src='https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=300&q=80'" 
                  />
                </td>
                <td>
                  <strong>${art.title}</strong><br/>
                  <span style="font-size: 0.75rem; color: var(--text-light);">${art.medium} (${art.dimensions})</span>
                </td>
                <td>${art.category}</td>
                <td><strong>₹${(art.price || 0).toLocaleString('en-IN')}</strong></td>
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
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h3 style="font-family: var(--font-serif); font-size: 1.5rem; margin-bottom: 0.25rem;">
            Manage Mini Store &amp; Artifacts (${products.length})
          </h3>
          <p style="font-size: 0.85rem; color: var(--text-muted); margin: 0;">
            Pendants, wearable art, prints and studio merchandise.
          </p>
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
            ${products.length === 0 ? `
              <tr>
                <td colspan="6" style="text-align: center; padding: 3.5rem 1rem; color: var(--text-muted);">
                  <div style="font-size: 2.5rem; margin-bottom: 0.75rem;">🛍️</div>
                  <div style="font-family: var(--font-serif); font-size: 1.25rem; color: var(--text-main); margin-bottom: 0.35rem;">
                    No Store Products Added Yet
                  </div>
                  <p style="font-size: 0.85rem; margin-bottom: 1.25rem;">Add resin items, prints, or wearable art for collectors to buy.</p>
                  <button class="btn btn-primary btn-sm" onclick="Admin.openAddProductModal()">+ Add First Product</button>
                </td>
              </tr>
            ` : products.map(p => `
              <tr>
                <td>
                  <img 
                    src="${p.image}" 
                    class="table-thumb" 
                    alt="${p.title}" 
                    title="Click to view full image"
                    style="cursor: pointer;"
                    onclick="window.open('${p.image}', '_blank')"
                    onerror="this.src='https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=300&q=80'" 
                  />
                </td>
                <td><strong>${p.title}</strong></td>
                <td>${p.category}</td>
                <td><strong>₹${(p.price || 0).toLocaleString('en-IN')}</strong></td>
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

    const pricingRes = await API.getFacePaintingPricing();
    const pricing = pricingRes.data || {
      private: 2500,
      fest: 3500,
      editorial: 4000,
      bridal: 5000,
      extraGuest: 120
    };

    container.innerHTML = `
      <!-- Helpful Navigation Banner for Face Painting Photos -->
      <div style="background: linear-gradient(135deg, rgba(255, 230, 235, 0.8), rgba(255, 240, 243, 0.8)); border: 1px solid var(--border-pink); border-radius: var(--radius-md); padding: 1.25rem 1.5rem; margin-bottom: 1.75rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap;">
        <div>
          <h4 style="font-family: var(--font-serif); font-size: 1.15rem; color: var(--color-pink-600); margin: 0 0 0.25rem;">
            ✨ Looking for your Face Painting Photos &amp; Looks?
          </h4>
          <p style="font-size: 0.85rem; color: var(--text-muted); margin: 0;">
            Photos of your face painting looks are managed in <strong>Face Art Gallery</strong> and <strong>Booking Spotlight Photo</strong>.
          </p>
        </div>
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
          <button class="btn btn-primary btn-sm" onclick="Admin.switchTab('facearts')">
            ✨ Open Face Art Gallery
          </button>
          <button class="btn btn-secondary btn-sm" onclick="Admin.switchTab('booking-photo')">
            🖼️ Edit Spotlight Photo
          </button>
        </div>
      </div>

      <div style="background: white; border: 1px solid var(--border-pink); border-radius: var(--radius-md); padding: 1.5rem; margin-bottom: 2rem; box-shadow: var(--shadow-sm);">
        <h3 style="font-family: var(--font-serif); font-size: 1.4rem; margin-bottom: 0.5rem;">
          🎨 Face Painting Pricing
        </h3>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1.25rem;">
          Set the price customers will see for each face painting service.
        </p>

        <form onsubmit="Admin.saveFacePaintingPricing(event)">
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">College Fest / Cultural Event (₹)</label>
              <input type="number" name="fest" class="form-input" value="${pricing.fest || 0}" min="0" required />
            </div>
            <div class="form-group">
              <label class="form-label">Editorial / Fashion Photoshoot (₹)</label>
              <input type="number" name="editorial" class="form-input" value="${pricing.editorial || 0}" min="0" required />
            </div>
            <div class="form-group">
              <label class="form-label">Private Gathering / Festival (₹)</label>
              <input type="number" name="private" class="form-input" value="${pricing.private || 0}" min="0" required />
            </div>
          </div>
          <button type="submit" class="btn btn-primary">
            💾 Save Face Painting Prices
          </button>
        </form>
      </div>

      <div style="margin-bottom: 1.5rem;">
        <h3 style="font-family: var(--font-serif); font-size: 1.5rem; margin-bottom: 0.25rem;">
          Face Painting Client Booking Requests (${bookings.length})
        </h3>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin: 0;">
          Manage incoming requests for college fests, shoots, and private celebrations.
        </p>
      </div>

      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Ref ID</th>
              <th>Client</th>
              <th>Event &amp; Date</th>
              <th>Slot</th>
              <th>Location</th>
              <th>Fee</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${bookings.length === 0 ? `
              <tr>
                <td colspan="8" style="text-align: center; padding: 3.5rem 1rem; color: var(--text-muted);">
                  <div style="font-size: 2.5rem; margin-bottom: 0.75rem;">📅</div>
                  <div style="font-family: var(--font-serif); font-size: 1.25rem; color: var(--text-main); margin-bottom: 0.35rem;">
                    No Face Painting Booking Inquiries Yet
                  </div>
                  <p style="font-size: 0.85rem; max-width: 480px; margin: 0 auto 1.25rem; color: var(--text-muted);">
                    When college fests, corporate events, or private shoots book face painting sessions on your website, their requests and contact info will appear here.
                  </p>
                  <a href="index.html#booking" target="_blank" class="btn btn-secondary btn-sm" style="display: inline-flex; align-items: center; gap: 0.4rem;">
                    <span>👁️ Test Public Booking Form</span>
                    <span>↗</span>
                  </a>
                </td>
              </tr>
            ` : bookings.map(b => `
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

  // 5. Booking Spotlight Photo Tab (Dedicated section for photo on the left of Face Painting booking)
  async renderBookingPhoto(container) {
    const res = await API.getSettings();
    const settings = res.data || {};
    const currentImg = settings.bookingFeatureImage || 'https://images.unsplash.com/photo-1516914943479-89db7d9ae7f2?auto=format&fit=crop&w=900&q=80';

    container.innerHTML = `
      <div style="max-width: 850px; margin: 0 auto;">
        <div style="margin-bottom: 2rem;">
          <span style="font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1.5px; color: var(--color-pink-600); font-weight: 600;">Booking Showcase</span>
          <h3 style="font-family: var(--font-serif); font-size: 1.8rem; margin: 0.25rem 0 0.5rem;">
            Face Painting Booking Spotlight Photo
          </h3>
          <p style="color: var(--text-muted); font-size: 0.9rem;">
            Upload and manage the photograph that appears in the spotlight card on the left side of the Face Painting booking form on the public website.
          </p>
        </div>

        <div style="display: grid; grid-template-columns: minmax(260px, 320px) 1fr; gap: 2rem; align-items: start; background: white; padding: 2rem; border-radius: var(--radius-md); border: 1px solid var(--border-pink); box-shadow: var(--shadow-sm);">
          
          <!-- Current Photo Preview -->
          <div>
            <label class="form-label" style="margin-bottom: 0.75rem; display: block; font-weight: 600;">
              Live Preview on Website
            </label>
            <div style="position: relative; border-radius: var(--radius-md); overflow: hidden; border: 2px solid var(--border-pink); box-shadow: var(--shadow-md); aspect-ratio: 4/5; background: var(--color-pink-50);">
              <img id="adminBookingPhotoPreview" src="${currentImg}" alt="Booking Spotlight" style="width: 100%; height: 100%; object-fit: cover;" />
            </div>
            <div style="text-align: center; margin-top: 0.75rem;">
              <span class="hero-tag-pill" style="font-size: 0.75rem;">🌸 Current Active Photo</span>
            </div>
          </div>

          <!-- Upload & Controls -->
          <div style="display: flex; flex-direction: column; gap: 1.5rem;">
            
            <!-- Direct Device Upload Area -->
            <div style="border: 2px dashed var(--color-pink-300); background: var(--color-pink-50); border-radius: var(--radius-md); padding: 2rem 1.5rem; text-align: center; cursor: pointer; transition: all 0.2s ease;"
                 onclick="document.getElementById('adminBookingPhotoFileInput').click()"
                 onmouseover="this.style.borderColor='var(--color-pink-500)'; this.style.background='var(--color-pink-100)'"
                 onmouseout="this.style.borderColor='var(--color-pink-300)'; this.style.background='var(--color-pink-50)'">
              <input type="file" id="adminBookingPhotoFileInput" accept="image/*" style="display: none;" onchange="Admin.handleBookingPhotoUpload(event)" />
              <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">📸</div>
              <h4 style="font-family: var(--font-serif); font-size: 1.2rem; color: var(--color-pink-600); margin-bottom: 0.35rem;">
                Upload New Photo from Device
              </h4>
              <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 1rem;">
                Click here to browse an image (JPG, PNG, WebP)
              </p>
              <button type="button" class="btn btn-primary btn-sm" onclick="event.stopPropagation(); document.getElementById('adminBookingPhotoFileInput').click()">
                Select Photo
              </button>
              <div id="adminBookingPhotoUploadStatus" style="margin-top: 0.75rem; font-size: 0.8rem; font-weight: 500; display: none;"></div>
            </div>

            <!-- Alternative: Direct Image URL -->
            <div style="background: var(--bg-surface-elevated); padding: 1.25rem; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
              <label class="form-label" style="font-size: 0.85rem; font-weight: 600;">Or Paste Image URL directly:</label>
              <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
                <input type="url" id="adminBookingPhotoUrlInput" class="form-input" placeholder="https://..." value="${currentImg}" style="font-size: 0.85rem;" />
                <button type="button" class="btn btn-secondary btn-sm" onclick="Admin.saveBookingPhotoUrl()">
                  Save URL
                </button>
              </div>
            </div>

            <!-- Reset option -->
            <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-light); padding-top: 1rem;">
              <span style="font-size: 0.8rem; color: var(--text-muted);">Want to restore default showcase?</span>
              <button type="button" class="btn btn-outline btn-sm" onclick="Admin.resetBookingPhoto()">
                Reset to Default
              </button>
            </div>

          </div>

        </div>
      </div>
    `;
  },

  async handleBookingPhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const statusEl = document.getElementById('adminBookingPhotoUploadStatus');
    const previewEl = document.getElementById('adminBookingPhotoPreview');

    if (statusEl) {
      statusEl.style.display = 'block';
      statusEl.style.color = 'var(--color-pink-600)';
      statusEl.textContent = '⏳ Uploading to Cloudinary... please wait.';
    }

    try {
      const uploadRes = await API.uploadImage(file);
      if (!uploadRes.success || !uploadRes.url) {
        throw new Error(uploadRes.message || 'Upload failed');
      }

      const photoUrl = uploadRes.url;
      if (previewEl) previewEl.src = photoUrl;

      // Save to settings
      const saveRes = await API.updateSettings({ bookingFeatureImage: photoUrl });
      if (!saveRes.success) throw new Error(saveRes.message || 'Could not update settings');
      if (saveRes.data && window.App && typeof App.refreshSettings === 'function') {
        App.refreshSettings(saveRes.data);
      }

      // Update public website DOM immediately
      const publicImg = document.getElementById('bookingFeatureImage');
      if (publicImg) publicImg.src = photoUrl;

      const urlInput = document.getElementById('adminBookingPhotoUrlInput');
      if (urlInput) urlInput.value = photoUrl;

      if (statusEl) {
        statusEl.style.color = '#155724';
        statusEl.textContent = '✅ Photo uploaded & published to Booking section successfully!';
      }
      App.showToast('🌸 Booking showcase photo updated successfully!');
    } catch (err) {
      console.error(err);
      if (statusEl) {
        statusEl.style.color = '#721c24';
        statusEl.textContent = '❌ ' + (err.message || 'Error uploading photo');
      }
      App.showToast('❌ ' + (err.message || 'Error uploading photo'));
    }
  },

  async saveBookingPhotoUrl() {
    const urlInput = document.getElementById('adminBookingPhotoUrlInput');
    const photoUrl = urlInput ? urlInput.value.trim() : '';
    if (!photoUrl) {
      App.showToast('⚠️ Please enter a valid photo URL');
      return;
    }

    try {
      const saveRes = await API.updateSettings({ bookingFeatureImage: photoUrl });
      if (!saveRes.success) throw new Error(saveRes.message || 'Could not update settings');
      if (saveRes.data && window.App && typeof App.refreshSettings === 'function') {
        App.refreshSettings(saveRes.data);
      }

      const previewEl = document.getElementById('adminBookingPhotoPreview');
      if (previewEl) previewEl.src = photoUrl;

      const publicImg = document.getElementById('bookingFeatureImage');
      if (publicImg) publicImg.src = photoUrl;

      App.showToast('✅ Booking showcase photo URL updated!');
    } catch (err) {
      App.showToast('❌ ' + (err.message || 'Failed to update photo URL'));
    }
  },

  async resetBookingPhoto() {
    const defaultUrl = 'https://images.unsplash.com/photo-1516914943479-89db7d9ae7f2?auto=format&fit=crop&w=900&q=80';
    try {
      const saveRes = await API.updateSettings({ bookingFeatureImage: defaultUrl });
      if (saveRes.data && window.App && typeof App.refreshSettings === 'function') {
        App.refreshSettings(saveRes.data);
      }
      const previewEl = document.getElementById('adminBookingPhotoPreview');
      if (previewEl) previewEl.src = defaultUrl;
      const publicImg = document.getElementById('bookingFeatureImage');
      if (publicImg) publicImg.src = defaultUrl;
      const urlInput = document.getElementById('adminBookingPhotoUrlInput');
      if (urlInput) urlInput.value = defaultUrl;
      App.showToast('🌸 Reset booking photo to default!');
    } catch (err) {
      App.showToast('❌ Failed to reset booking photo');
    }
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
            ${orders.length === 0 ? `
              <tr>
                <td colspan="6" style="text-align: center; padding: 3.5rem 1rem; color: var(--text-muted);">
                  <div style="font-size: 2.5rem; margin-bottom: 0.75rem;">📦</div>
                  <div style="font-family: var(--font-serif); font-size: 1.25rem; color: var(--text-main); margin-bottom: 0.35rem;">
                    No Customer Orders Yet
                  </div>
                  <p style="font-size: 0.85rem; max-width: 450px; margin: 0 auto; color: var(--text-muted);">
                    When customers buy original paintings or store artifacts through Razorpay, UPI, or Cash on Delivery, their full delivery addresses and items will appear here.
                  </p>
                </td>
              </tr>
            ` : orders.map(o => `
              <tr>
                <td><strong style="color: var(--color-pink-600);">${o.id}</strong></td>
                <td>
                  <strong>${o.customerName}</strong><br/>
                  <span style="font-size: 0.75rem; color: var(--text-light);">${o.phone}</span>
                </td>
                <td>
                  <ul style="padding-left: 1rem; font-size: 0.8rem;">
                    ${(o.items || []).map(i => `<li>${i.title} (&times;${i.quantity})</li>`).join('')}
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
                <img id="adminPhotoPreview" src="${s.artistImage || 'images/artist-placeholder.svg'}" alt="Preview" style="width: 100%; height: 100%; object-fit: cover;" />
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
            <label class="form-label">Artist Name / Brand</label>
            <input type="text" name="name" class="form-input" value="${s.name || 'AKAMATOE'}" required />
          </div>

          <div class="form-group" style="margin-bottom: 1rem;">
            <label class="form-label">College / University</label>
            <input type="text" name="institution" class="form-input" value="${s.institution || ''}" required />
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
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; margin-bottom: 0.5rem; flex-wrap: wrap;">
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <span style="font-size: 1.2rem;">💳</span>
                <strong style="font-size: 0.95rem; color: var(--color-pink-600);">Razorpay Payment Gateway (Optional)</strong>
              </div>
              <span style="font-size: 0.75rem; padding: 0.2rem 0.6rem; border-radius: 999px; font-weight: 600; ${s.razorpayKeyId && s.razorpayKeyId.startsWith('rzp_') ? 'background: #d4edda; color: #155724;' : 'background: #fff3cd; color: #856404;'}">
                ${s.razorpayKeyId && s.razorpayKeyId.startsWith('rzp_') ? '🟢 Live Gateway Configured' : '⚪ Direct UPI / COD Mode Active'}
              </span>
            </div>
            <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.75rem;">
              To accept automatic cards & netbanking via Razorpay, generate API keys from <a href="https://dashboard.razorpay.com/#/app/keys" target="_blank" rel="noreferrer" style="color: var(--color-pink-600); text-decoration: underline; font-weight: 600;">Razorpay Dashboard → Settings → API Keys</a>.
            </p>
            <p style="font-size: 0.75rem; color: var(--color-earth-700); background: rgba(255,255,255,0.7); padding: 0.5rem; border-radius: 4px; margin-bottom: 1rem;">
              💡 <em>Note: If you don't have Razorpay keys yet, leave them empty. Customers can pay instantly using your <strong>Direct UPI QR Code</strong> or Cash on Delivery without errors.</em>
            </p>
            <div class="form-grid" style="margin-bottom: 0.75rem;">
              <div class="form-group">
                <label class="form-label" style="font-size: 0.8rem;">Razorpay Key ID (e.g. rzp_test_... or rzp_live_...)</label>
                <input type="text" name="razorpayKeyId" class="form-input" placeholder="rzp_test_... or rzp_live_..." value="${s.razorpayKeyId || ''}" />
              </div>
              <div class="form-group">
                <label class="form-label" style="font-size: 0.8rem;">Razorpay Key Secret</label>
                <input type="password" name="razorpayKeySecret" class="form-input" placeholder="Generated from Razorpay dashboard" value="${s.razorpayKeySecret || ''}" />
              </div>
            </div>
            <div class="form-group">
              <label class="form-label" style="font-size: 0.8rem;">Direct UPI ID (for instant QR & GPay/PhonePe payments)</label>
              <input type="text" name="upiId" class="form-input" placeholder="e.g. akanksha.lko30@oksbi" value="${s.upiId || 'akanksha.lko30@oksbi'}" />
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

      // Auto-persist immediately to settings so hero photo persists across page refresh
      try {
        const updateRes = await API.updateSettings({ artistImage: cloudinaryUrl });
        if (updateRes.success && updateRes.data) {
          App.refreshSettings(updateRes.data);
        }
      } catch (saveErr) {
        console.warn('Auto-persist hero photo error:', saveErr);
      }

      App.showToast('✅ Photo uploaded and saved as Hero Portrait!');

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

  async saveFacePaintingPricing(e) {
    e.preventDefault();

    const form = e.target;

    const pricing = {
      private: Number(form.elements['private'].value),
      fest: Number(form.elements['fest'].value),
      editorial: Number(form.elements['editorial'].value)
    };

    if (
      !Number.isFinite(pricing.private) ||
      pricing.private < 0 ||
      !Number.isFinite(pricing.fest) ||
      pricing.fest < 0 ||
      !Number.isFinite(pricing.editorial) ||
      pricing.editorial < 0
    ) {
      App.showToast(
        '❌ Please enter valid prices for all services.'
      );
      return;
    }

    const res = await API.updateFacePaintingPricing(pricing);

    if (res.success) {
      App.showToast(
        '🎨 Face painting prices saved successfully!'
      );

      await this.switchTab('bookings');

    } else {
      App.showToast(
        '❌ Failed to save prices: ' +
        (res.message || 'Unknown error')
      );
    }
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

  openAddArtworkModal() {
    // Create a real file input immediately from the button action
    const fileInput = document.createElement('input');

    fileInput.type = 'file';
    fileInput.accept = 'image/jpeg,image/png,image/webp,image/jpg';

    fileInput.onchange = async (event) => {
      const file = event.target.files[0];

      if (!file) {
        App.showToast('❌ No image selected.');
        return;
      }

      if (!file.type.startsWith('image/')) {
        App.showToast('❌ Please select a valid image.');
        return;
      }

      // Ask details AFTER image is selected
      const title = prompt(
        'Artwork Title:',
        'Whispers of North Campus II'
      );

      if (!title) return;

      const medium = prompt(
        'Medium & Dimensions:',
        'Acrylic & Gold Leaf on Canvas (24x36)'
      );

      if (!medium) return;

      const priceInput = prompt(
        'Price in INR:',
        '15000'
      );

      const price = parseInt(priceInput);

      if (isNaN(price) || price < 0) {
        App.showToast('❌ Please enter a valid price.');
        return;
      }

      const description = prompt(
        'Artwork Description / Quote:',
        'Original studio creation inspired by delicate blush tones and Delhi sunlight.'
      );

      if (!description) return;

      try {
        App.showToast('⏳ Uploading artwork image to Cloudinary...');

        const formData = new FormData();
        formData.append('image', file);

        console.log('Uploading artwork:', file.name);
        console.log('File size:', file.size);
        console.log('File type:', file.type);

        const uploadResponse = await fetch('/api/upload-image', {
          method: 'POST',
          body: formData
        });

        console.log(
          'Upload response status:',
          uploadResponse.status
        );

        const uploadData = await uploadResponse.json();

        console.log('Upload response:', uploadData);

        if (!uploadResponse.ok || !uploadData.success) {
          throw new Error(
            uploadData.message || 'Cloudinary upload failed'
          );
        }

        const image = uploadData.url;
        const publicId = uploadData.publicId;
        if (!image) {
          throw new Error(
            'Cloudinary did not return an image URL'
          );
        }

        console.log('Cloudinary image URL:', image);

        App.showToast(
          '✅ Image uploaded! Saving artwork...'
        );

        const result = await API.addArtwork({
          title,
          medium,
          category: 'Canvas Paintings',
          price,
          image,
          publicId,
          dimensions: '24 x 36 inches',
          description: description,
          isSold: false,
          isFeatured: false
        });

        console.log('Artwork API response:', result);

        if (!result || !result.success) {
          throw new Error(
            result?.message ||
            'Artwork could not be saved'
          );
        }

        App.showToast(
          '✨ Artwork uploaded & published successfully!'
        );

        if (typeof Gallery !== 'undefined' && Gallery.fetchArtworks) {
          await Gallery.fetchArtworks();
        }

        this.switchTab('artworks');

      } catch (error) {

        console.error(
          '❌ ARTWORK UPLOAD ERROR:',
          error
        );

        App.showToast(
          '❌ Artwork upload failed: ' +
          error.message
        );
      }
    };

    // IMPORTANT:
    // This click happens directly from the Admin button action.
    fileInput.click();
  },
  async openAddProductModal() {
    // Create a real file input immediately from the button action
    const fileInput = document.createElement('input');

    fileInput.type = 'file';
    fileInput.accept = 'image/jpeg,image/png,image/webp,image/jpg';

    fileInput.onchange = async (event) => {
      const file = event.target.files[0];

      if (!file) {
        App.showToast('❌ No image selected.');
        return;
      }

      if (!file.type.startsWith('image/')) {
        App.showToast('❌ Please select a valid image.');
        return;
      }

      // Ask details AFTER image is selected
      const title = prompt(
        'Product Title:',
        'Custom Hand-Painted Tote'
      );

      if (!title) return;

      const priceInput = prompt(
        'Price in INR:',
        '1299'
      );

      const price = parseInt(priceInput);

      if (isNaN(price) || price < 0) {
        App.showToast('❌ Please enter a valid price.');
        return;
      }

      const description = prompt(
        'Product/Artifact Description:',
        'Hand-crafted aesthetic artifact made with love.'
      );

      if (!description) return;

      try {
        // ==========================================
        // 1. UPLOAD PRODUCT IMAGE TO CLOUDINARY
        // ==========================================

        App.showToast(
          '⏳ Uploading product image to Cloudinary...'
        );

        const formData = new FormData();
        formData.append('image', file);

        console.log('Uploading product:', file.name);
        console.log('File size:', file.size);
        console.log('File type:', file.type);

        const uploadResponse = await fetch(
          '/api/upload-image',
          {
            method: 'POST',
            body: formData
          }
        );

        console.log(
          'Upload response status:',
          uploadResponse.status
        );

        const uploadData = await uploadResponse.json();

        console.log(
          'Upload response:',
          uploadData
        );

        if (!uploadResponse.ok || !uploadData.success) {
          throw new Error(
            uploadData.message ||
            'Cloudinary upload failed'
          );
        }

        const image = uploadData.url;
        const publicId = uploadData.publicId;

        if (!image) {
          throw new Error(
            'Cloudinary did not return an image URL'
          );
        }

        if (!publicId) {
          throw new Error(
            'Cloudinary did not return a Public ID'
          );
        }

        console.log(
          'Cloudinary image URL:',
          image
        );

        console.log(
          'Cloudinary Public ID:',
          publicId
        );

        // ==========================================
        // 2. SAVE PRODUCT
        // ==========================================

        App.showToast(
          '✅ Image uploaded! Saving product...'
        );

        const result = await API.addProduct({
          title,
          category: 'Wearable Art',
          price,
          image,
          publicId,
          description: description
        });

        console.log(
          'Product API response:',
          result
        );

        if (!result || !result.success) {
          throw new Error(
            result?.message ||
            'Product could not be saved'
          );
        }

        // ==========================================
        // 3. SUCCESS
        // ==========================================

        App.showToast(
          '✨ Product uploaded & published successfully!'
        );

        if (typeof Store !== 'undefined' && Store.fetchProducts) {
          await Store.fetchProducts();
        }

        this.switchTab('products');

      } catch (error) {

        console.error(
          '❌ PRODUCT UPLOAD ERROR:',
          error
        );

        App.showToast(
          '❌ Product upload failed: ' +
          error.message
        );
      }
    };

    // IMPORTANT:
    // Open file picker directly from Admin button action
    fileInput.click();
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
  },
  // =====================================================
  // FACE ART GALLERY
  // =====================================================

  async renderFaceArts(container) {
    try {
      const res = await API.getAdminFaceArts();

      if (!res.success) {
        throw new Error(res.message || 'Failed to load face arts');
      }

      const faceArts = Array.isArray(res.data) ? res.data : [];
      const publishedCount = faceArts.filter(f => f.isPublished !== false).length;

      const escapeHtml = (value) => {
        return String(value ?? '').replace(/[&<>"']/g, (c) => ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#039;'
        }[c]));
      };

      container.innerHTML = `
      <div>
        <div style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
          margin-bottom: 1.5rem;
        ">
          <div>
            <h3 style="font-family: var(--font-serif); font-size: 1.6rem; margin-bottom: 0.4rem;">
              ✨ Face Art Gallery
            </h3>
            <p style="font-size: 0.85rem; color: var(--text-muted);">
              Pure image showcase for festival face painting and creative looks. Showing <strong>${publishedCount}</strong> of <strong>${faceArts.length}</strong> images on public gallery.
            </p>
          </div>

          <button class="btn btn-primary" onclick="Admin.openAddFaceArt()">
            + Upload Face Art
          </button>
        </div>

        ${faceArts.length === 0
          ? `
            <div style="
              background: white;
              border: 1px solid var(--border-pink);
              border-radius: var(--radius-md);
              padding: 3.5rem 1.5rem;
              text-align: center;
            ">
              <div style="font-size: 3rem; margin-bottom: 1rem;">🎨</div>
              <h4 style="font-family: var(--font-serif); margin-bottom: 0.5rem; font-size: 1.3rem;">
                No Face Arts Uploaded Yet
              </h4>
              <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1.5rem;">
                Upload festival looks and creative face painting photographs to showcase on the public website.
              </p>
              <button class="btn btn-primary" onclick="Admin.openAddFaceArt()">
                🎨 Upload First Face Art
              </button>
            </div>
          `
          : `
            <div style="
              display: grid;
              grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
              gap: 1.5rem;
            ">
              ${faceArts.map((art) => {
            const isPub = art.isPublished !== false;
            const safeId = escapeHtml(art.id);
            const safeImg = escapeHtml(art.image);

            return `
                  <div style="
                    background: white;
                    border: 1px solid ${isPub ? 'var(--border-pink)' : '#e5e7eb'};
                    border-radius: var(--radius-md);
                    overflow: hidden;
                    box-shadow: var(--shadow-sm);
                    display: flex;
                    flex-direction: column;
                    transition: transform 0.2s ease, box-shadow 0.2s ease;
                    opacity: ${isPub ? '1' : '0.85'};
                  ">
                    <div style="
                      width: 100%;
                      aspect-ratio: 1 / 1;
                      background: var(--color-pink-50);
                      overflow: hidden;
                      position: relative;
                    ">
                      <img
                        src="${safeImg}"
                        alt="Face Art"
                        title="Click to view photo in full resolution"
                        style="
                          width: 100%;
                          height: 100%;
                          object-fit: cover;
                          display: block;
                          cursor: pointer;
                        "
                        onclick="window.open('${safeImg}', '_blank')"
                        onerror="this.src='https://images.unsplash.com/photo-1516914943479-89db7d9ae7f2?auto=format&fit=crop&w=600&q=80'"
                        loading="lazy"
                      />
                      <span style="
                        position: absolute;
                        top: 10px;
                        right: 10px;
                        font-size: 0.75rem;
                        font-weight: 600;
                        padding: 0.3rem 0.65rem;
                        border-radius: 999px;
                        backdrop-filter: blur(8px);
                        ${isPub
                ? 'background: rgba(34, 197, 94, 0.9); color: white;'
                : 'background: rgba(107, 114, 128, 0.9); color: white;'
              }
                      ">
                        ${isPub ? '✓ Public' : 'Hidden'}
                      </span>
                    </div>

                    <div style="padding: 1.1rem; flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
                      <div style="margin-bottom: 1rem;">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem;">
                          <span style="
                            font-size: 0.72rem;
                            font-family: var(--font-mono);
                            color: var(--text-light);
                          ">
                            ${safeId}
                          </span>
                        </div>
                        <div style="font-size: 0.85rem; color: var(--text-main); font-weight: 500;">
                          ${isPub ? '🟢 Visible on Public Website' : '⚪ Hidden from Public Website'}
                        </div>
                      </div>

                      <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                        <button
                          class="btn-table-action"
                          style="
                            flex: 1;
                            font-size: 0.78rem;
                            padding: 0.4rem 0.6rem;
                            ${isPub
                ? 'background: #f3f4f6; color: #4b5563;'
                : 'background: var(--color-pink-50); color: var(--color-pink-600); border: 1px solid var(--border-pink);'
              }
                          "
                          onclick="Admin.toggleFaceArtPublished('${safeId}', ${!isPub})"
                        >
                          ${isPub ? '🚫 Hide from Website' : '👁️ Show on Website'}
                        </button>

                        <button
                          class="btn-table-action btn-table-danger"
                          style="font-size: 0.78rem; padding: 0.4rem 0.75rem;"
                          onclick="Admin.deleteFaceArt('${safeId}')"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                `;
          }).join('')}
            </div>
          `
        }
      </div>
    `;

    } catch (error) {
      console.error('❌ Failed to load face arts:', error);
      container.innerHTML = `
        <div style="padding: 3rem 1.5rem; text-align: center;">
          <h3 style="font-family: var(--font-serif); font-size: 1.4rem; margin-bottom: 0.5rem;">
            Unable to load Face Art Gallery
          </h3>
          <p style="color: var(--text-muted); margin-bottom: 1.25rem;">
            ${error.message}
          </p>
          <button class="btn btn-primary" onclick="Admin.switchTab('facearts')">
            Try Again
          </button>
        </div>
      `;
    }
  },

  async openAddFaceArt() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/jpeg,image/png,image/webp,image/jpg';

    fileInput.onchange = async (event) => {
      const file = event.target.files[0];
      if (!file) {
        App.showToast('❌ No image selected.');
        return;
      }

      if (!file.type.startsWith('image/')) {
        App.showToast('❌ Please select a valid image (JPG, PNG, WebP).');
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        App.showToast('❌ Image must be smaller than 10 MB.');
        return;
      }

      try {
        App.showToast('⏳ Uploading face art to Cloudinary...');

        // 1. Upload image to Cloudinary via existing endpoint
        const formData = new FormData();
        formData.append('image', file);

        const uploadResponse = await fetch('/api/upload-image', {
          method: 'POST',
          body: formData
        });

        const uploadData = await uploadResponse.json();

        if (!uploadResponse.ok || !uploadData.success) {
          throw new Error(uploadData.message || 'Cloudinary upload failed');
        }

        const image = uploadData.url;
        const publicId = uploadData.publicId || '';

        if (!image) {
          throw new Error('Cloudinary did not return an image URL.');
        }

        // 2. Save Face Art record via dedicated POST /api/face-arts
        App.showToast('✅ Image uploaded! Saving face art showcase...');

        const saveRes = await API.addFaceArt({
          image,
          publicId,
          isPublished: true
        });

        if (!saveRes || !saveRes.success) {
          throw new Error(saveRes.message || 'Face art could not be saved.');
        }

        App.showToast('✨ Face art uploaded and published successfully!');

        // 3. Refresh Admin list & public Face Art Gallery if initialized
        await this.renderFaceArts(document.getElementById('adminTabContent'));
        if (typeof FaceArt !== 'undefined' && FaceArt.fetchFaceArts) {
          FaceArt.fetchFaceArts();
        }

      } catch (error) {
        console.error('❌ FACE ART UPLOAD ERROR:', error);
        App.showToast('❌ Face art upload failed: ' + error.message);
      }
    };

    fileInput.click();
  },

  async toggleFaceArtPublished(id, newStatus) {
    try {
      App.showToast('⏳ Updating display status...');
      const res = await API.updateFaceArt(id, { isPublished: newStatus });

      if (!res.success) {
        throw new Error(res.message || 'Failed to update face art');
      }

      App.showToast(newStatus ? '✨ Visible on public website!' : '🚫 Hidden from public website.');
      await this.renderFaceArts(document.getElementById('adminTabContent'));

      if (typeof FaceArt !== 'undefined' && FaceArt.fetchFaceArts) {
        FaceArt.fetchFaceArts();
      }
    } catch (error) {
      console.error('❌ TOGGLE PUBLISH ERROR:', error);
      App.showToast('❌ Update failed: ' + error.message);
    }
  },

  async deleteFaceArt(id) {
    const confirmed = confirm('Are you sure you want to delete this face art image? This cannot be undone.');
    if (!confirmed) return;

    try {
      App.showToast('⏳ Deleting face art...');

      const res = await API.deleteFaceArt(id);
      if (!res.success) {
        throw new Error(res.message || 'Failed to delete face art.');
      }

      App.showToast('🗑️ Face art deleted successfully.');
      await this.renderFaceArts(document.getElementById('adminTabContent'));

      if (typeof FaceArt !== 'undefined' && FaceArt.fetchFaceArts) {
        FaceArt.fetchFaceArts();
      }

    } catch (error) {
      console.error('❌ FACE ART DELETE ERROR:', error);
      App.showToast('❌ Could not delete face art: ' + error.message);
    }
  },

  async toggleArtworkSold(id, isSold) {
    try {
      App.showToast('⏳ Updating artwork status...');
      const res = await API.updateArtwork(id, { isSold });
      if (!res.success) throw new Error(res.message || 'Update failed');
      App.showToast(isSold ? '🏷️ Marked as Sold' : '✨ Marked as Available');
      await this.renderArtworks(document.getElementById('adminTabContent'));
      if (typeof Gallery !== 'undefined' && Gallery.fetchArtworks) {
        await Gallery.fetchArtworks();
      }
    } catch (err) {
      console.error('Toggle sold error:', err);
      App.showToast('❌ Update failed: ' + err.message);
    }
  },

  async deleteArtwork(id) {
    if (!confirm('Are you sure you want to delete this artwork? This cannot be undone.')) return;
    try {
      App.showToast('⏳ Deleting artwork...');
      const res = await API.deleteArtwork(id);
      if (!res.success) throw new Error(res.message || 'Delete failed');
      App.showToast('🗑️ Artwork deleted');
      await this.renderArtworks(document.getElementById('adminTabContent'));
      if (typeof Gallery !== 'undefined' && Gallery.fetchArtworks) {
        await Gallery.fetchArtworks();
      }
    } catch (err) {
      console.error('Delete artwork error:', err);
      App.showToast('❌ Could not delete: ' + err.message);
    }
  },

  async deleteProduct(id) {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      App.showToast('⏳ Deleting product...');
      const res = await API.deleteProduct(id);
      if (!res.success) throw new Error(res.message || 'Delete failed');
      App.showToast('🗑️ Product deleted');
      await this.renderProducts(document.getElementById('adminTabContent'));
      if (typeof Store !== 'undefined' && Store.fetchProducts) {
        await Store.fetchProducts();
      }
    } catch (err) {
      console.error('Delete product error:', err);
      App.showToast('❌ Could not delete: ' + err.message);
    }
  },

  async updateBookingStatus(id, status) {
    try {
      App.showToast('⏳ Updating booking status...');
      const res = await API.updateBooking(id, { status });
      if (!res.success) throw new Error(res.message || 'Update failed');
      App.showToast(`✅ Booking ${status}`);
      await this.renderBookings(document.getElementById('adminTabContent'));
    } catch (err) {
      console.error('Update booking error:', err);
      App.showToast('❌ Could not update booking: ' + err.message);
    }
  },

  async deleteBooking(id) {
    if (!confirm('Are you sure you want to delete this booking request?')) return;
    try {
      App.showToast('⏳ Deleting booking...');
      const res = await API.deleteBooking(id);
      if (!res.success) throw new Error(res.message || 'Delete failed');
      App.showToast('🗑️ Booking deleted');
      await this.renderBookings(document.getElementById('adminTabContent'));
    } catch (err) {
      console.error('Delete booking error:', err);
      App.showToast('❌ Could not delete booking: ' + err.message);
    }
  },

  async deletePoem(id) {
    if (!confirm('Are you sure you want to delete this poem?')) return;
    try {
      App.showToast('⏳ Deleting poem...');
      const res = await API.deletePoem(id);
      if (!res.success) throw new Error(res.message || 'Delete failed');
      App.showToast('🗑️ Poem deleted');
      await this.renderPoems(document.getElementById('adminTabContent'));
      if (typeof Poetry !== 'undefined' && Poetry.fetchPoems) {
        await Poetry.fetchPoems();
      }
    } catch (err) {
      console.error('Delete poem error:', err);
      App.showToast('❌ Could not delete poem: ' + err.message);
    }
  },

  async deleteReview(id) {
    if (!confirm('Are you sure you want to delete this review?')) return;
    try {
      App.showToast('⏳ Deleting review...');
      const res = await API.deleteReview(id);
      if (!res.success) throw new Error(res.message || 'Delete failed');
      App.showToast('🗑️ Review deleted');
      await this.renderReviews(document.getElementById('adminTabContent'));
      if (typeof Reviews !== 'undefined' && Reviews.fetchReviews) {
        await Reviews.fetchReviews();
      }
    } catch (err) {
      console.error('Delete review error:', err);
      App.showToast('❌ Could not delete review: ' + err.message);
    }
  },

  async saveFacePaintingPricing(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const data = {
      fest: Number(formData.get('fest')) || 0,
      editorial: Number(formData.get('editorial')) || 0,
      bridal: Number(formData.get('bridal')) || 0,
      private: Number(formData.get('private')) || 0,
      extraGuest: Number(formData.get('extraGuest')) || 0
    };

    try {
      App.showToast('⏳ Updating face painting pricing...');
      const res = await API.updateFacePaintingPricing(data);
      if (!res.success) throw new Error(res.message || 'Failed to update pricing');
      App.showToast('✅ Face painting pricing updated successfully!');
      if (typeof Booking !== 'undefined' && Booking.loadFacePaintingPricing) {
        await Booking.loadFacePaintingPricing();
        await Booking.calculateEstimate();
      }
    } catch (err) {
      console.error('Update pricing error:', err);
      App.showToast('❌ Update failed: ' + err.message);
    }
  }
};

// Expose Admin globally
window.Admin = Admin;

// Auto-boot if standalone admin page
if (typeof window !== 'undefined' && (window.location.pathname.endsWith('admin.html') || window.location.pathname.endsWith('/admin'))) {
  function autoBootAdmin() {
    if (window.Admin && typeof window.Admin.init === 'function') {
      window.Admin.init();
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoBootAdmin);
  } else {
    autoBootAdmin();
  }
}