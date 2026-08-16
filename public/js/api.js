/**
 * AKANKSHA ART STUDIO - API Client Layer
 * Handles REST endpoints with graceful offline/local fallback.
 */

const API_BASE = window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')
  ? '' 
  : '';

const API = {
  // Generic fetch wrapper
  async request(endpoint, options = {}) {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });
      
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || `HTTP Error ${response.status}`);
      }
      return await response.json();
    } catch (err) {
      console.warn(`[API] Fallback for ${endpoint}:`, err.message);
      return API.localFallback(endpoint, options);
    }
  },

  // Site Settings
  getSettings: () => API.request('/api/settings'),
  updateSettings: (data) => API.request('/api/settings', { method: 'PUT', body: JSON.stringify(data) }),

  // Artworks
  getArtworks: () => API.request('/api/artworks'),
  addArtwork: (data) => API.request('/api/artworks', { method: 'POST', body: JSON.stringify(data) }),
  updateArtwork: (id, data) => API.request(`/api/artworks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteArtwork: (id) => API.request(`/api/artworks/${id}`, { method: 'DELETE' }),

  // Products
  getProducts: () => API.request('/api/products'),
  addProduct: (data) => API.request('/api/products', { method: 'POST', body: JSON.stringify(data) }),
  updateProduct: (id, data) => API.request(`/api/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProduct: (id) => API.request(`/api/products/${id}`, { method: 'DELETE' }),

  // Bookings
  getBookings: () => API.request('/api/bookings'),
  createBooking: (data) => API.request('/api/bookings', { method: 'POST', body: JSON.stringify(data) }),
  updateBooking: (id, data) => API.request(`/api/bookings/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteBooking: (id) => API.request(`/api/bookings/${id}`, { method: 'DELETE' }),

  // Poems
  getPoems: () => API.request('/api/poems'),
  addPoem: (data) => API.request('/api/poems', { method: 'POST', body: JSON.stringify(data) }),
  updatePoem: (id, data) => API.request(`/api/poems/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePoem: (id) => API.request(`/api/poems/${id}`, { method: 'DELETE' }),

  // Reviews
  getReviews: () => API.request('/api/reviews'),
  createReview: (data) => API.request('/api/reviews', { method: 'POST', body: JSON.stringify(data) }),
  deleteReview: (id) => API.request(`/api/reviews/${id}`, { method: 'DELETE' }),

  // Orders
  getOrders: () => API.request('/api/orders'),
  createOrder: (data) => API.request('/api/orders', { method: 'POST', body: JSON.stringify(data) }),
  updateOrder: (id, data) => API.request(`/api/orders/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Razorpay Gateway
  createRazorpayOrder: (data) => API.request('/api/razorpay/create-order', { method: 'POST', body: JSON.stringify(data) }),
  verifyRazorpayPayment: (data) => API.request('/api/razorpay/verify-payment', { method: 'POST', body: JSON.stringify(data) }),


  // Admin Auth & Stats
  loginAdmin: (pin) => API.request('/api/admin/login', { method: 'POST', body: JSON.stringify({ pin }) }),
  changeAdminPin: (newPin) => API.request('/api/admin/change-pin', { method: 'POST', body: JSON.stringify({ newPin }) }),
  getAdminStats: () => API.request('/api/admin/stats'),

  // Contact
  sendContact: (data) => API.request('/api/contact', { method: 'POST', body: JSON.stringify(data) }),


  // Local storage fallback handler in case server isn't running
  localFallback(endpoint, options) {
    const method = options.method || 'GET';
    const key = 'akanksha_local_db';
    let db = JSON.parse(localStorage.getItem(key) || 'null');
    
    if (!db) {
      db = {
        settings: {
          name: "Akanksha",
          institution: "Hindu College, University of Delhi",
          email: "akankshachandreshwar@gmail.com",
          phone: "9517155681",
          instagramPrimary: "@_akanxha",
          instagramSecondary: "@psychotichic",
          bioQuote: "A young artist driven by the desire to create a colourful canvas of life. I welcome you to my little corner, where you can explore my work, discover the stories woven into every creation, and become a part of this ever-evolving journey of expression.",
          announcement: "🌸 Welcoming Custom Commissions & Delhi NCR Face Painting Bookings for College Fests & Gatherings • Free Shipping Across India ✨"
        },
        artworks: [],
        products: [],
        bookings: [],
        poems: [],
        reviews: [],
        orders: []
      };
      localStorage.setItem(key, JSON.stringify(db));
    }

    if (endpoint === '/api/settings') {
      if (method === 'PUT') {
        db.settings = { ...db.settings, ...JSON.parse(options.body || '{}') };
        localStorage.setItem(key, JSON.stringify(db));
      }
      return { success: true, data: db.settings };
    }

    if (endpoint === '/api/admin/login') {
      const { pin } = JSON.parse(options.body || '{}');
      if (pin === '1234' || pin === 'akanksha') {
        return { success: true, token: 'local_token' };
      }
      return { success: false, message: 'Invalid PIN (Use 1234)' };
    }

    return { success: true, data: [] };
  }
};
