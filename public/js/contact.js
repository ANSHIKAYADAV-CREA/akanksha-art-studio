/**
 * AKANKSHA ART STUDIO - Contact & Social Module
 */

const Contact = {
  init() {
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
      contactForm.addEventListener('submit', (e) => this.handleSubmit(e));
    }
  },

  async handleSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('button[type="submit"]');
    if (btn) btn.disabled = true;

    const data = {
      name: form.elements['name'].value,
      email: form.elements['email'].value,
      phone: form.elements['phone'].value,
      subject: form.elements['subject'].value,
      message: form.elements['message'].value
    };

    const res = await API.sendContact(data);
    if (btn) btn.disabled = false;

    if (res.success) {
      form.reset();
      App.showToast(`💌 Message sent to Akanksha! She will reach out soon.`);
    } else {
      App.showToast('Could not send message. Please reach out directly on WhatsApp!');
    }
  }
};
