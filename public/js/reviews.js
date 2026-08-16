/**
 * AKANKSHA ART STUDIO - Reviews & Ratings Module
 * Collector testimonials and interactive rating submission.
 */

const Reviews = {
  reviews: [],

  async init() {
    await this.fetchReviews();
    this.bindEvents();
  },

  async fetchReviews() {
    const res = await API.getReviews();
    if (res.success && res.data) {
      this.reviews = res.data.filter(r => r.approved !== false);
      this.render();
    }
  },

  bindEvents() {
    const writeBtn = document.getElementById('writeReviewBtn');
    if (writeBtn) {
      writeBtn.addEventListener('click', () => App.openModal('writeReviewModal'));
    }

    const reviewForm = document.getElementById('reviewForm');
    if (reviewForm) {
      reviewForm.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    // Star rating picker
    const starPicker = document.querySelectorAll('.star-picker-star');
    starPicker.forEach(star => {
      star.addEventListener('click', (e) => {
        const rating = parseInt(e.currentTarget.dataset.rating);
        document.getElementById('reviewRatingValue').value = rating;
        starPicker.forEach(s => {
          s.style.color = parseInt(s.dataset.rating) <= rating ? '#FFB703' : '#E0D6D8';
        });
      });
    });
  },

  render() {
    const grid = document.getElementById('reviewsGrid');
    const avgScoreEl = document.getElementById('avgRatingScore');
    const totalCountEl = document.getElementById('totalReviewsCount');

    if (this.reviews.length > 0) {
      const avg = (this.reviews.reduce((s, r) => s + (r.rating || 5), 0) / this.reviews.length).toFixed(1);
      if (avgScoreEl) avgScoreEl.textContent = avg;
      if (totalCountEl) totalCountEl.textContent = `Based on ${this.reviews.length} collector & client reviews`;
    }

    if (!grid) return;

    grid.innerHTML = this.reviews.map(rev => `
      <div class="review-card">
        <div class="review-header">
          <img src="${rev.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}" alt="${rev.name}" class="review-avatar" />
          <div>
            <div class="review-author">${rev.name}</div>
            <div class="review-role">${rev.role}</div>
          </div>
          <div style="margin-left: auto; color: #FFB703; font-size: 0.9rem;">
            ${'★'.repeat(rev.rating || 5)}${'☆'.repeat(5 - (rev.rating || 5))}
          </div>
        </div>
        <p class="review-comment">"${rev.comment}"</p>
        <div style="margin-top: 1rem; font-size: 0.75rem; color: var(--text-light); display: flex; justify-content: space-between;">
          <span>${rev.date}</span>
          ${rev.verified ? `<span style="color: #155724; font-weight: 600;">✓ Verified Art Collector / Client</span>` : ''}
        </div>
      </div>
    `).join('');
  },

  async handleSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const reviewData = {
      name: form.elements['reviewerName'].value,
      role: form.elements['reviewerRole'].value || 'Art Enthusiast',
      rating: parseInt(form.elements['rating'].value) || 5,
      comment: form.elements['comment'].value
    };

    const res = await API.createReview(reviewData);
    if (res.success) {
      form.reset();
      App.closeModal('writeReviewModal');
      App.showToast('💖 Thank you for your heartfelt review!');
      await this.fetchReviews();
    } else {
      App.showToast('Could not post review. Please try again.');
    }
  }
};
