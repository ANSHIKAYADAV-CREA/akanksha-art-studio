/**
 * AKANKSHA ART STUDIO - Gallery Module
 * Handles Artworks rendering, category filters, search, and Lightbox modal.
 */

// Normalization mapper for backward and forward compatibility
function mapArtwork(item) {
  if (!item) return null;
  return {
    id: item.id || `art-${Date.now()}`,
    title: item.title || item.name || 'Untitled Artwork',
    category: item.category || item.cat || 'Canvas Paintings',
    medium: item.medium || 'Acrylic on Canvas',
    dimensions: item.dimensions || item.ratio || '24 x 36 inches',
    year: item.year ? String(item.year) : new Date().getFullYear().toString(),
    price: Number(item.price) || 0,
    image: item.image || item.img || '',
    publicId: item.publicId || '',
    description: item.description || '',
    isSold: Boolean(item.isSold),
    isFeatured: Boolean(item.isFeatured)
  };
}

const Gallery = {
  artworks: [],
  currentFilter: 'all',
  searchQuery: '',

  async init() {
    await this.fetchArtworks();
    this.bindEvents();
  },

  async fetchArtworks() {
    try {
      const res = await API.getArtworks();
      console.log('ARTWORK API:', res);

      const rawArtworks = Array.isArray(res?.data)
        ? res.data
        : (Array.isArray(res) ? res : []);

      console.log('ARTWORK COUNT:', rawArtworks.length);

      this.artworks = rawArtworks
        .map(mapArtwork)
        .filter(artwork => {
          if (!artwork || !artwork.image) return false;
          const category = String(artwork.category || '')
            .trim()
            .toLowerCase();

          // Face Art has its own dedicated showcase
          return !(
            category === 'face art' ||
            category === 'face painting' ||
            category.includes('face art')
          );
        });

      this.render();
    } catch (error) {
      console.error('❌ Failed to fetch artworks:', error);
      const grid = document.getElementById('galleryGrid');
      if (grid && this.artworks.length === 0) {
        grid.innerHTML = `
          <div style="grid-column: 1/-1; text-align: center; padding: 4rem 1rem;">
            <p style="font-family: var(--font-editorial); font-size: 1.5rem; color: var(--text-muted); font-style: italic;">
              Unable to load gallery right now.
            </p>
            <button class="btn btn-secondary btn-sm" style="margin-top: 1rem;" onclick="Gallery.fetchArtworks()">
              🔄 Try Again
            </button>
          </div>
        `;
      }
    }
  },

  bindEvents() {
    // Filter buttons
    const filterButtons = document.querySelectorAll('.gallery-filter-btn');
    filterButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        filterButtons.forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.currentFilter = e.currentTarget.dataset.filter;
        this.render();
      });
    });

    // Search bar
    const searchInput = document.getElementById('gallerySearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        this.render();
      });
    }
  },

  getFilteredArtworks() {
    return this.artworks.filter(art => {
      // Category check
      const matchesCategory =
        this.currentFilter === 'all' ||
        (this.currentFilter === 'available' && !art.isSold) ||
        (this.currentFilter === 'sold' && art.isSold) ||
        art.category.toLowerCase().includes(this.currentFilter.toLowerCase());

      // Search check
      const matchesSearch =
        !this.searchQuery ||
        art.title.toLowerCase().includes(this.searchQuery) ||
        art.medium.toLowerCase().includes(this.searchQuery) ||
        art.description.toLowerCase().includes(this.searchQuery);

      return matchesCategory && matchesSearch;
    });
  },

  render() {
    const grid = document.getElementById('galleryGrid');
    if (!grid) return;

    const filtered = this.getFilteredArtworks();

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 4rem 1rem;">
          <p style="font-family: var(--font-editorial); font-size: 1.5rem; color: var(--text-muted); font-style: italic;">
            No artworks match your search or filter. ✨
          </p>
          <button class="btn btn-secondary btn-sm" style="margin-top: 1rem;" onclick="Gallery.resetFilters()">
            View All Artworks
          </button>
        </div>
      `;
      return;
    }

    grid.innerHTML = filtered.map(art => {
      const safeTitle = art.title.replace(/'/g, "\\'").replace(/"/g, '&quot;');
      const safeImg = art.image.replace(/'/g, "\\'");

      return `
      <div class="artwork-card" data-id="${art.id}">
        <div class="artwork-img-wrap" onclick="Gallery.openLightbox('${art.id}')" style="cursor: pointer;">
          <img src="${art.image}" alt="${art.title}" class="artwork-img" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1000&q=80'" />
          ${art.isSold
            ? `<span class="artwork-badge-sold">Sold Out</span>`
            : `<span class="artwork-badge-cat">${art.category}</span>`
          }
        </div>
        <div class="artwork-info">
          <h3 class="artwork-title" onclick="Gallery.openLightbox('${art.id}')" style="cursor: pointer;">
            ${art.title}
          </h3>
          <div class="artwork-medium">${art.medium} • ${art.dimensions}</div>
          <p class="artwork-desc">${art.description}</p>
          <div class="artwork-meta">
            <div class="artwork-price">₹${art.price.toLocaleString('en-IN')}</div>
            <div class="artwork-actions">
              <button class="btn btn-secondary btn-sm" onclick="Gallery.openLightbox('${art.id}')" title="View Details">
                🔍 Details
              </button>
              ${!art.isSold
                ? `<button class="btn btn-primary btn-sm" onclick="Store.addToCart('${art.id}', '${safeTitle}', ${art.price}, '${safeImg}', 'Original Artwork')">
                    Add to Bag
                   </button>`
                : `<button class="btn btn-earth btn-sm" onclick="App.openCommissionModal('${safeTitle}')">
                    Inquire Similar
                   </button>`
              }
            </div>
          </div>
        </div>
      </div>
    `;
    }).join('');
  },

  openLightbox(id) {
    const art = this.artworks.find(a => a.id === id);
    if (!art) return;

    const modal = document.getElementById('artworkModal');
    const modalContent = document.getElementById('artworkModalContent');
    if (!modal || !modalContent) return;

    const safeTitle = art.title.replace(/'/g, "\\'").replace(/"/g, '&quot;');
    const safeImg = art.image.replace(/'/g, "\\'");

    modalContent.innerHTML = `
      <div style="display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 2rem; align-items: center;">
        <div style="position: relative; border-radius: var(--radius-md); overflow: hidden; box-shadow: var(--shadow-md);">
          <img src="${art.image}" alt="${art.title}" style="width: 100%; max-height: 520px; object-fit: cover;" onerror="this.src='https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1000&q=80'" />
          ${art.isSold ? '<span class="artwork-badge-sold" style="top: 15px; right: 15px;">Sold Out</span>' : ''}
        </div>
        <div>
          <span class="section-tag" style="margin-bottom: 0.5rem;">${art.category}</span>
          <h2 style="font-family: var(--font-serif); font-size: 2rem; margin-bottom: 0.5rem; color: var(--text-main);">
            ${art.title}
          </h2>
          <p style="color: var(--color-pink-600); font-family: var(--font-mono); font-size: 0.9rem; margin-bottom: 1.25rem;">
            ${art.medium} • ${art.dimensions} (${art.year})
          </p>
          <div style="background: var(--color-pink-50); padding: 1.25rem; border-radius: var(--radius-sm); margin-bottom: 1.5rem; border-left: 3px solid var(--color-pink-500);">
            <p style="font-family: var(--font-editorial); font-size: 1.15rem; font-style: italic; color: var(--text-main); line-height: 1.6;">
              "${art.description}"
            </p>
          </div>
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem;">
            <div>
              <span style="font-size: 0.8rem; color: var(--text-light); text-transform: uppercase;">Investment Price</span>
              <div style="font-size: 1.8rem; font-weight: 700; color: var(--color-pink-600);">
                ₹${art.price.toLocaleString('en-IN')}
              </div>
            </div>
            <div style="font-size: 0.85rem; color: var(--color-earth-700); background: var(--color-earth-100); padding: 0.4rem 0.8rem; border-radius: var(--radius-full);">
              ✓ Includes Certificate of Authenticity
            </div>
          </div>
          <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
            ${!art.isSold
              ? `<button class="btn btn-primary" style="flex: 1;" onclick="Store.addToCart('${art.id}', '${safeTitle}', ${art.price}, '${safeImg}', 'Original Artwork'); App.closeModal('artworkModal');">
                  🛍️ Add to Cart & Checkout
                 </button>`
              : `<button class="btn btn-earth" style="flex: 1;" onclick="App.closeModal('artworkModal'); App.openCommissionModal('${safeTitle}');">
                  ✨ Commission a Similar Piece
                 </button>`
            }
            <button class="btn btn-secondary" onclick="App.shareLink('${safeTitle}', window.location.href)">
              🔗 Share
            </button>
          </div>
        </div>
      </div>
    `;

    App.openModal('artworkModal');
  },

  resetFilters() {
    this.currentFilter = 'all';
    this.searchQuery = '';
    const searchInput = document.getElementById('gallerySearchInput');
    if (searchInput) searchInput.value = '';
    const filterButtons = document.querySelectorAll('.gallery-filter-btn');
    filterButtons.forEach(b => b.classList.toggle('active', b.dataset.filter === 'all'));
    this.render();
  }
};
