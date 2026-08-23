/**
 * AKANKSHA ART STUDIO - Master App Controller
 * Orchestrates all modules, modals, toasts, audio ambient toggle, and settings.
 */

const App = {
  async init() {
    console.log("🌸 Initializing Akanksha Art Studio App...");
    
    // Bind global navigation and modal handlers
    this.bindGlobalEvents();
    
    // Fetch and apply live settings from API
    await this.loadSettings();

    // Initialize sub-modules
    await Gallery.init();
    await Store.init();
    Booking.init();
    await Poetry.init();
    await Reviews.init();
    Contact.init();
    Admin.init();

    console.log("✨ All modules loaded successfully!");
  },

  async loadSettings() {
    const res = await API.getSettings();
    if (res.success && res.data) {
      this.refreshSettings(res.data);
    }
  },

  refreshSettings(s) {
    // Dynamic text elements
    document.querySelectorAll('.dyn-name').forEach(el => el.textContent = s.name || 'Akanksha');
    document.querySelectorAll('.dyn-institution').forEach(el => el.textContent = s.institution || '');
    document.querySelectorAll('.dyn-email').forEach(el => {
      el.textContent = s.email || 'akankshachandreshwar@gmail.com';
      if (el.tagName === 'A') el.href = `mailto:${s.email || 'akankshachandreshwar@gmail.com'}`;
    });
    document.querySelectorAll('.dyn-phone').forEach(el => {
      el.textContent = s.phone || '9517155681';
      if (el.tagName === 'A') el.href = `tel:${s.phone || '9517155681'}`;
    });
    document.querySelectorAll('.dyn-whatsapp').forEach(el => {
      if (el.tagName === 'A') el.href = `https://wa.me/91${s.phone || '9517155681'}?text=Hi%20Akanksha!%20I%20saw%20your%20art%20portfolio%20and%20would%20love%20to%20connect%20✨`;
    });

    // Dynamic Artist Image
    if (s.artistImage) {
      document.querySelectorAll('.dyn-artist-img').forEach(el => {
        el.src = s.artistImage;
      });
    }

    const bioQuoteEl = document.getElementById('heroBioQuote');
    if (bioQuoteEl && s.bioQuote) {
      bioQuoteEl.textContent = `"${s.bioQuote}"`;
    }

    const announcementEl = document.getElementById('announcementText');
    if (announcementEl && s.announcement) {
      announcementEl.textContent = s.announcement;
      const tickerDuplicate = document.getElementById('announcementTextDuplicate');
      if (tickerDuplicate) tickerDuplicate.textContent = s.announcement;
    }
  },

  bindGlobalEvents() {
    // Sticky Header Scroll state
    const header = document.querySelector('.site-header');
    window.addEventListener('scroll', () => {
      if (window.scrollY > 40) {
        header?.classList.add('scrolled');
      } else {
        header?.classList.remove('scrolled');
      }
    });

    // Mobile nav toggle & overlay
    const mobileToggle = document.getElementById('mobileNavToggle');
    const navDrawer = document.getElementById('navDrawer');
    const navDrawerOverlay = document.getElementById('navDrawerOverlay');
    const closeDrawer = document.getElementById('closeNavDrawer');

    const openMobileMenu = () => {
      navDrawer?.classList.add('open');
      navDrawerOverlay?.classList.add('open');
    };

    const closeMobileMenu = () => {
      navDrawer?.classList.remove('open');
      navDrawerOverlay?.classList.remove('open');
    };

    if (mobileToggle) mobileToggle.addEventListener('click', openMobileMenu);
    if (closeDrawer) closeDrawer.addEventListener('click', closeMobileMenu);
    if (navDrawerOverlay) navDrawerOverlay.addEventListener('click', closeMobileMenu);

    document.querySelectorAll('.nav-drawer .nav-link').forEach(link => {
      link.addEventListener('click', closeMobileMenu);
    });

    // Modal close buttons and overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.classList.remove('open');
          document.querySelectorAll('.modal-container, .admin-modal-container').forEach(m => m.classList.remove('open'));
        }
      });
    });

    document.querySelectorAll('.modal-close-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetModalId = btn.dataset.targetModal;
        if (targetModalId) {
          App.closeModal(targetModalId);
        } else {
          document.querySelectorAll('.modal-overlay, .modal-container, .admin-modal-container').forEach(m => m.classList.remove('open'));
        }
      });
    });

    // Escape key to close all modals & drawers
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay, .modal-container, .admin-modal-container, .cart-overlay, .cart-drawer, .nav-drawer').forEach(el => el.classList.remove('open'));
      }
    });
  },

  openModal(modalId) {
    const modal = document.getElementById(modalId);
    const overlay = document.getElementById(modalId + 'Overlay') || document.getElementById('globalModalOverlay');
    if (modal) modal.classList.add('open');
    if (overlay) overlay.classList.add('open');
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    const overlay = document.getElementById(modalId + 'Overlay') || document.getElementById('globalModalOverlay');
    if (modal) modal.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
  },

  openCommissionModal(artTitle = '') {
    const subjInput = document.getElementById('contactSubjectInput');
    const msgInput = document.getElementById('contactMessageInput');
    if (subjInput) subjInput.value = `Custom Commission: Similar to "${artTitle}"`;
    if (msgInput) msgInput.value = `Hi Akanksha! I loved your piece "${artTitle}" and would love to commission a custom original artwork for my space with similar palette and vibe.`;
    
    const contactSection = document.getElementById('contact');
    if (contactSection) {
      contactSection.scrollIntoView({ behavior: 'smooth' });
    }
  },

  showToast(message) {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.style.cssText = `
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        z-index: 500;
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
      border-radius: var(--radius-full);
      box-shadow: var(--shadow-lg);
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

  shareLink(title, url) {
    if (navigator.share) {
      navigator.share({ title, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      App.showToast('🔗 Link copied to clipboard!');
    }
  }
};

// Start application when DOM is ready
document.addEventListener('DOMContentLoaded', () => App.init());
