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
    }  catch (err) {
      console.error(`[API] Request failed for ${endpoint}:`, err.message);

      // NEVER use local fallback for admin authentication
      if (
        endpoint === '/api/admin/login' ||
        endpoint === '/api/admin/change-pin'
      ) {
        return {
          success: false,
          message: 'Admin authentication service is unavailable.'
        };
      }

      // Local fallback is allowed for normal website data
      return API.localFallback(endpoint, options);
    }
  },

  // Image Upload (Cloudinary)
  async uploadImage(file) {
    const formData = new FormData();
    formData.append('image', file);
    const response = await fetch(`${API_BASE}/api/upload-image`, {
      method: 'POST',
      body: formData
    });
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || errData.error || `HTTP Error ${response.status}`);
    }
    return await response.json();
  },

  // Site Settings
  getSettings: () => API.request('/api/settings'),
  updateSettings: (data) => API.request('/api/settings', { method: 'PUT', body: JSON.stringify(data) }),

  // Artworks
  getArtworks: () => API.request('/api/artworks'),
  addArtwork: (data) => API.request('/api/artworks', { method: 'POST', body: JSON.stringify(data) }),
  updateArtwork: (id, data) => API.request(`/api/artworks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteArtwork: (id) => API.request(`/api/artworks/${id}`, { method: 'DELETE' }),

  // Face Arts (Dedicated Image Showcase)
  getFaceArts: () => API.request('/api/face-arts'),
  getAdminFaceArts: () => API.request('/api/admin/face-arts'),
  addFaceArt: (data) => API.request('/api/face-arts', { method: 'POST', body: JSON.stringify(data) }),
  updateFaceArt: (id, data) => API.request(`/api/face-arts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteFaceArt: (id) => API.request(`/api/face-arts/${id}`, { method: 'DELETE' }),

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

  // Face Painting Pricing
  getFacePaintingPricing: () => API.request('/api/face-painting-pricing'),
  updateFacePaintingPricing: (data) =>
    API.request('/api/face-painting-pricing', {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
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


  // Offline/local fallback handler (only used when network/server is totally unreachable)
  localFallback(endpoint, options) {
    const method = options.method || 'GET';
    const key = 'akanksha_local_db';
    let db = null;
    try {
      db = JSON.parse(localStorage.getItem(key) || 'null');
    } catch (e) {
      db = null;
    }

    if (!db) {
      db = {
        settings: {},
        artworks: [],
        faceArts: [],
        products: [],
        bookings: [],
        poems: [],
        reviews: [],
        orders: []
      };
    }

    if (endpoint === '/api/settings') {
      if (method === 'PUT') {
        db.settings = { ...db.settings, ...JSON.parse(options.body || '{}') };
        try { localStorage.setItem(key, JSON.stringify(db)); } catch (e) {}
      }
      return { success: true, data: db.settings || {} };
    }

    if (endpoint === '/api/artworks') {
      return { success: true, data: db.artworks || [] };
    }

    if (endpoint === '/api/face-arts') {
      return { success: true, data: (db.faceArts || []).filter(f => f.isPublished !== false) };
    }

    if (endpoint === '/api/admin/face-arts') {
      return { success: true, data: db.faceArts || [] };
    }

    if (endpoint === '/api/products') {
      return { success: true, data: db.products || [] };
    }

    if (endpoint === '/api/poems') {
      return { success: true, data: db.poems || [] };
    }

    if (endpoint === '/api/reviews') {
      return { success: true, data: db.reviews || [] };
    }

    return { success: false, data: [], message: 'Offline request.' };
  }
};
