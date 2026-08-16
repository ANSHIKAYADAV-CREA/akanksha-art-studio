/**
 * AKANKSHA ART STUDIO - Poetry & Writings Module
 * Vintage typewriter poetry reader and book preview.
 */

const Poetry = {
  poems: [],

  async init() {
    await this.fetchPoems();
  },

  async fetchPoems() {
    const res = await API.getPoems();
    if (res.success && res.data) {
      this.poems = res.data;
      this.render();
    }
  },

  render() {
    const grid = document.getElementById('poetryGrid');
    if (!grid) return;

    grid.innerHTML = this.poems.map(poem => `
      <div class="poetry-card" onclick="Poetry.openReader('${poem.id}')" style="cursor: pointer;">
        <div class="poetry-date">${poem.date} • ${poem.theme}</div>
        <h3 class="poetry-title">${poem.title}</h3>
        <p class="poetry-excerpt">"${poem.excerpt}"</p>
        <div class="poetry-footer">
          <span class="poetry-book-tag">📖 ${poem.book}</span>
          <span style="font-size: 0.85rem; color: var(--color-pink-600); font-weight: 600;">
            Read Full Verse →
          </span>
        </div>
      </div>
    `).join('');
  },

  openReader(id) {
    const poem = this.poems.find(p => p.id === id);
    if (!poem) return;

    const modal = document.getElementById('poemModal');
    const modalContent = document.getElementById('poemModalContent');
    if (!modal || !modalContent) return;

    modalContent.innerHTML = `
      <div style="max-width: 520px; margin: 0 auto; text-align: center;">
        <span class="section-tag" style="margin-bottom: 0.5rem;">${poem.theme}</span>
        <h2 style="font-family: var(--font-serif); font-size: 2.2rem; margin-bottom: 0.5rem; color: var(--text-main);">
          ${poem.title}
        </h2>
        <div style="font-family: var(--font-mono); font-size: 0.8rem; color: var(--color-pink-500); margin-bottom: 2rem;">
          From "${poem.book}" • ${poem.date}
        </div>
        <div style="background: #FFFDF9; border: 1px solid var(--border-pink); padding: 2.5rem 2rem; border-radius: var(--radius-md); box-shadow: var(--shadow-sm); margin-bottom: 2rem; text-align: left;">
          <pre style="font-family: var(--font-editorial); font-size: 1.25rem; line-height: 2; color: var(--text-main); font-style: italic; white-space: pre-wrap; word-break: break-word;">${poem.fullText}</pre>
        </div>
        <div style="display: flex; gap: 1rem; justify-content: center;">
          <button class="btn btn-primary btn-sm" onclick="Store.addToCart('prod-3', 'Chronicles of Blush & Ink - Poetry Zine (Vol. I)', 499, 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80', 'Poetry Books'); App.closeModal('poemModal');">
            📖 Buy Poetry Book (₹499)
          </button>
          <button class="btn btn-secondary btn-sm" onclick="App.shareLink('${poem.title}', window.location.href)">
            🔗 Share Poem
          </button>
        </div>
      </div>
    `;

    App.openModal('poemModal');
  }
};
