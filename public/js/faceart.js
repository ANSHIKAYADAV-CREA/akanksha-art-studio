/**
 * AKANKSHA ART STUDIO - Face Art Gallery Module
 * Pure image showcase for festival looks, creative face painting, and editorial art.
 * NO prices, NO descriptions, NO titles displayed publicly, NO cart buttons.
 */

const FaceArt = {
  faceArts: [],
  currentLightboxIndex: 0,
  isLoading: false,

  async init() {
    await this.fetchFaceArts();
    this.bindEvents();
  },

  async fetchFaceArts() {
    const grid = document.getElementById('faceArtGrid');
    if (!grid) return;

    this.isLoading = true;

    // 1. Loading state
    grid.innerHTML = `
      <div id="faceArtLoading" style="
        grid-column: 1 / -1;
        text-align: center;
        padding: 4rem 1rem;
        color: var(--text-muted);
      ">
        <div style="font-size: 2.5rem; margin-bottom: 0.75rem; animation: pulse 1.5s infinite ease-in-out;">🎨</div>
        <p style="font-family: var(--font-serif); font-size: 1.25rem; margin-bottom: 0.25rem; color: var(--text-main);">Loading Face Art Showcase...</p>
        <p style="font-size: 0.85rem; color: var(--text-light);">Fetching high-resolution studio photographs</p>
      </div>
    `;

    try {
      // 2. Fetch fresh published Face Arts from /api/face-arts
      const response = await fetch('/api/face-arts');
      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}`);
      }

      const result = await response.json();
      console.log('FACE ART API:', result);

      const items = Array.isArray(result?.data) ? result.data : [];
      console.log('PUBLISHED FACE ARTS:', items.length);

      this.faceArts = items.filter(item => item && item.image);

      // 3. Render
      this.render();

    } catch (error) {
      console.error('❌ Face Art fetch error:', error);
      // 4. Error state with Retry button
      grid.innerHTML = `
        <div style="
          grid-column: 1 / -1;
          text-align: center;
          padding: 3.5rem 1.5rem;
          background: rgba(255, 245, 247, 0.7);
          border: 1px dashed var(--color-pink-300);
          border-radius: var(--radius-md);
        ">
          <div style="font-size: 2.2rem; margin-bottom: 0.75rem;">✨</div>
          <h3 style="font-family: var(--font-serif); font-size: 1.3rem; margin-bottom: 0.5rem; color: var(--text-main);">
            Unable to load Face Art Gallery
          </h3>
          <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1.25rem;">
            A temporary connection issue occurred while loading images.
          </p>
          <button class="btn btn-primary btn-sm" onclick="FaceArt.fetchFaceArts()">
            🔄 Retry
          </button>
        </div>
      `;
    } finally {
      this.isLoading = false;
    }
  },

  render() {
    const grid = document.getElementById('faceArtGrid');
    if (!grid) return;

    // Empty state
    if (this.faceArts.length === 0) {
      grid.innerHTML = `
        <div style="
          grid-column: 1 / -1;
          text-align: center;
          padding: 4rem 1.5rem;
          background: rgba(255, 245, 247, 0.4);
          border: 1px solid var(--border-pink);
          border-radius: var(--radius-lg);
        ">
          <div style="font-size: 3rem; margin-bottom: 1rem;">🎨</div>
          <h3 style="font-family: var(--font-serif); font-size: 1.4rem; margin-bottom: 0.5rem; color: var(--text-main);">
            No Face Art Available Yet
          </h3>
          <p style="color: var(--text-muted); font-size: 0.9rem; max-width: 420px; margin: 0 auto;">
            Akanksha's latest festival face designs, editorial body paint, and celebration motifs will appear here soon.
          </p>
        </div>
      `;
      return;
    }

    // Pure image showcase: ONLY images, rounded corners, cover fit, hover animation, lightbox click
    grid.innerHTML = this.faceArts.map((art, index) => `
      <div 
        class="faceart-card" 
        data-index="${index}"
        onclick="FaceArt.openLightbox(${index})"
        style="
          cursor: pointer;
          position: relative;
          overflow: hidden;
          border-radius: var(--radius-md);
          background: var(--color-pink-50);
          box-shadow: var(--shadow-sm);
          aspect-ratio: 1 / 1;
          transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.35s ease;
        "
        onmouseenter="this.style.transform='translateY(-6px) scale(1.02)'; this.style.boxShadow='var(--shadow-lg)';"
        onmouseleave="this.style.transform='translateY(0) scale(1)'; this.style.boxShadow='var(--shadow-sm)';"
      >
        <img 
          src="${art.image}" 
          alt="Face Art by Akanksha" 
          loading="lazy"
          style="
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
            border-radius: var(--radius-md);
            transition: transform 0.5s ease;
          "
          onerror="this.parentElement.style.display='none'"
        />
        <div class="faceart-hover-overlay" style="
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, rgba(0,0,0,0.45) 0%, transparent 60%);
          opacity: 0;
          transition: opacity 0.3s ease;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          padding: 1rem;
        ">
          <span style="
            color: white;
            font-size: 0.85rem;
            font-weight: 500;
            background: rgba(255, 255, 255, 0.25);
            backdrop-filter: blur(8px);
            padding: 0.35rem 0.85rem;
            border-radius: var(--radius-full);
            letter-spacing: 0.5px;
          ">
            🔍 View Full Art
          </span>
        </div>
      </div>
    `).join('');

    // Attach overlay hover listeners
    grid.querySelectorAll('.faceart-card').forEach(card => {
      const overlay = card.querySelector('.faceart-hover-overlay');
      if (overlay) {
        card.addEventListener('mouseenter', () => overlay.style.opacity = '1');
        card.addEventListener('mouseleave', () => overlay.style.opacity = '0');
      }
    });

    // Update booking section feature photo with custom setting or latest published Face Art
    const bookingFeatureImg = document.getElementById('bookingFeatureImage');
    if (bookingFeatureImg) {
      if (App && App.settings && App.settings.bookingFeatureImage && App.settings.bookingFeatureImage.trim() !== '') {
        bookingFeatureImg.src = App.settings.bookingFeatureImage;
      } else if (this.faceArts.length > 0 && this.faceArts[0].image) {
        bookingFeatureImg.src = this.faceArts[0].image;
      }
    }
  },

  openLightbox(index) {
    if (!this.faceArts || this.faceArts.length === 0) return;
    this.currentLightboxIndex = Math.max(0, Math.min(index, this.faceArts.length - 1));

    let modal = document.getElementById('faceArtLightboxModal');
    if (!modal) {
      this.createLightboxModal();
      modal = document.getElementById('faceArtLightboxModal');
    }

    this.updateLightboxImage();

    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('open'), 10);
    const overlay = document.getElementById('globalModalOverlay');
    if (overlay) overlay.classList.add('open');
  },

  createLightboxModal() {
    let existing = document.getElementById('faceArtLightboxModal');
    if (existing) return;

    const modal = document.createElement('div');
    modal.id = 'faceArtLightboxModal';
    modal.className = 'modal-container';
    modal.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) scale(0.95);
      z-index: 1001;
      width: 90vw;
      max-width: 820px;
      max-height: 90vh;
      background: rgba(18, 14, 16, 0.96);
      border: 1px solid rgba(255, 182, 193, 0.25);
      border-radius: var(--radius-lg);
      padding: 1.5rem;
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.65);
      backdrop-filter: blur(20px);
      display: none;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    `;

    modal.innerHTML = `
      <button 
        id="faceArtCloseBtn"
        style="
          position: absolute;
          top: 1rem;
          right: 1rem;
          background: rgba(255, 255, 255, 0.15);
          border: 1px solid rgba(255, 255, 255, 0.25);
          color: white;
          width: 38px;
          height: 38px;
          border-radius: 50%;
          font-size: 1.2rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s ease, transform 0.2s ease;
          z-index: 10;
        "
        onmouseenter="this.style.background='rgba(255, 255, 255, 0.3)'; this.style.transform='scale(1.1)';"
        onmouseleave="this.style.background='rgba(255, 255, 255, 0.15)'; this.style.transform='scale(1)';"
        onclick="FaceArt.closeLightbox()"
      >✕</button>

      <div style="position: relative; width: 100%; display: flex; align-items: center; justify-content: center; overflow: hidden; border-radius: var(--radius-md);">
        <button 
          id="faceArtPrevBtn"
          style="
            position: absolute;
            left: 0.75rem;
            top: 50%;
            transform: translateY(-50%);
            background: rgba(0, 0, 0, 0.5);
            border: 1px solid rgba(255, 255, 255, 0.25);
            color: white;
            width: 44px;
            height: 44px;
            border-radius: 50%;
            font-size: 1.5rem;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
            z-index: 5;
          "
          onmouseenter="this.style.background='rgba(255, 117, 151, 0.8)';"
          onmouseleave="this.style.background='rgba(0, 0, 0, 0.5)';"
          onclick="FaceArt.prevImage()"
        >❮</button>

        <img 
          id="faceArtLightboxImg"
          src="" 
          alt="Face Art Showcase" 
          style="
            max-width: 100%;
            max-height: 72vh;
            object-fit: contain;
            border-radius: var(--radius-md);
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
            transition: opacity 0.25s ease;
          "
        />

        <button 
          id="faceArtNextBtn"
          style="
            position: absolute;
            right: 0.75rem;
            top: 50%;
            transform: translateY(-50%);
            background: rgba(0, 0, 0, 0.5);
            border: 1px solid rgba(255, 255, 255, 0.25);
            color: white;
            width: 44px;
            height: 44px;
            border-radius: 50%;
            font-size: 1.5rem;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
            z-index: 5;
          "
          onmouseenter="this.style.background='rgba(255, 117, 151, 0.8)';"
          onmouseleave="this.style.background='rgba(0, 0, 0, 0.5)';"
          onclick="FaceArt.nextImage()"
        >❯</button>
      </div>

      <div style="margin-top: 1rem; color: rgba(255, 255, 255, 0.7); font-size: 0.85rem; font-family: var(--font-mono); letter-spacing: 1px;">
        <span id="faceArtLightboxCounter"></span>
      </div>
    `;

    document.body.appendChild(modal);
  },

  updateLightboxImage() {
    const art = this.faceArts[this.currentLightboxIndex];
    if (!art) return;

    const img = document.getElementById('faceArtLightboxImg');
    const counter = document.getElementById('faceArtLightboxCounter');

    if (img) {
      img.style.opacity = '0';
      setTimeout(() => {
        img.src = art.image;
        img.style.opacity = '1';
      }, 150);
    }

    if (counter) {
      counter.textContent = `${this.currentLightboxIndex + 1} / ${this.faceArts.length}`;
    }
  },

  prevImage() {
    if (this.faceArts.length === 0) return;
    this.currentLightboxIndex = (this.currentLightboxIndex - 1 + this.faceArts.length) % this.faceArts.length;
    this.updateLightboxImage();
  },

  nextImage() {
    if (this.faceArts.length === 0) return;
    this.currentLightboxIndex = (this.currentLightboxIndex + 1) % this.faceArts.length;
    this.updateLightboxImage();
  },

  closeLightbox() {
    const modal = document.getElementById('faceArtLightboxModal');
    const overlay = document.getElementById('globalModalOverlay');
    if (modal) {
      modal.classList.remove('open');
      modal.style.display = 'none';
    }
    if (overlay) {
      overlay.classList.remove('open');
    }
  },

  bindEvents() {
    // Keyboard navigation
    window.addEventListener('keydown', (e) => {
      const modal = document.getElementById('faceArtLightboxModal');
      if (modal && modal.classList.contains('open')) {
        if (e.key === 'ArrowLeft') this.prevImage();
        if (e.key === 'ArrowRight') this.nextImage();
        if (e.key === 'Escape') this.closeLightbox();
      }
    });
  }
};
