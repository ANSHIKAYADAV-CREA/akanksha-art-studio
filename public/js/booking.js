/**
 * AKANKSHA ART STUDIO - Face Painting Booking Module
 * Interactive slot picker, live pricing estimation, and booking submission.
 */

const Booking = {
  selectedSlot: 'Afternoon (2:00 PM - 5:00 PM)',
  baseRatePerHour: 1200,

  init() {
    this.bindEvents();
    this.setMinDate();
    this.calculateEstimate();
  },

  setMinDate() {
    const dateInput = document.getElementById('bookingDateInput');
    if (dateInput) {
      const today = new Date().toISOString().split('T')[0];
      dateInput.min = today;
      dateInput.value = today;
    }
  },

  bindEvents() {
    // Time slot chips
    const chips = document.querySelectorAll('.slot-chip');
    chips.forEach(chip => {
      chip.addEventListener('click', (e) => {
        chips.forEach(c => c.classList.remove('selected'));
        e.currentTarget.classList.add('selected');
        this.selectedSlot = e.currentTarget.dataset.slot;
        this.calculateEstimate();
      });
    });

    // Form inputs change for real-time estimator
    const form = document.getElementById('facePaintBookingForm');
    if (form) {
      form.addEventListener('input', () => this.calculateEstimate());
      form.addEventListener('submit', (e) => this.handleSubmit(e));
    }
  },

  calculateEstimate() {
    const eventTypeSelect = document.getElementById('bookingEventType');
    const guestCountInput = document.getElementById('bookingGuestCount');
    const estimateValEl = document.getElementById('bookingEstimateVal');

    if (!eventTypeSelect || !guestCountInput || !estimateValEl) return;

    let base = 2500;
    const type = eventTypeSelect.value;
    const guests = parseInt(guestCountInput.value) || 10;

    if (type.includes('Fest')) base = 3500;
    if (type.includes('Editorial')) base = 4000;
    if (type.includes('Bridal')) base = 5000;

    const guestAddon = Math.max(0, guests - 10) * 120;
    const total = base + guestAddon;

    estimateValEl.textContent = `₹${total.toLocaleString('en-IN')}`;
    return total;
  },

  async handleSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('button[type="submit"]');
    if (btn) btn.disabled = true;

    const bookingData = {
      clientName: form.elements['clientName'].value,
      clientEmail: form.elements['clientEmail'].value,
      clientPhone: form.elements['clientPhone'].value,
      eventType: form.elements['eventType'].value,
      eventDate: form.elements['eventDate'].value,
      timeSlot: this.selectedSlot,
      guestCount: form.elements['guestCount'].value,
      location: form.elements['location'].value,
      notes: form.elements['notes'].value,
      estimatedAmount: this.calculateEstimate()
    };

    const res = await API.createBooking(bookingData);
    if (btn) btn.disabled = false;

    if (res.success) {
      const booking = res.data;
      form.reset();
      this.setMinDate();
      this.calculateEstimate();
      this.showConfirmation(booking);
    } else {
      App.showToast('Failed to submit booking request. Please check inputs.');
    }
  },

  showConfirmation(booking) {
    const modalContent = document.getElementById('bookingSuccessModalContent');
    if (modalContent) {
      modalContent.innerHTML = `
        <div style="text-align: center; padding: 1rem 0;">
          <div style="width: 70px; height: 70px; background: var(--color-pink-100); border-radius: var(--radius-full); display: flex; align-items: center; justify-content: center; margin: 0 auto 1.25rem; font-size: 2.2rem;">
            🎨
          </div>
          <h2 style="font-family: var(--font-serif); font-size: 2.2rem; color: var(--text-main); margin-bottom: 0.5rem;">
            Booking Request Received!
          </h2>
          <p style="font-family: var(--font-editorial); font-size: 1.2rem; color: var(--text-muted); font-style: italic; margin-bottom: 1.5rem;">
            Thank you, ${booking.clientName}! Akanksha has received your face painting booking request and will contact you via WhatsApp / phone to confirm the schedule.
          </p>
          <div style="background: white; border: 1px solid var(--border-pink); border-radius: var(--radius-md); padding: 1.5rem; text-align: left; margin-bottom: 2rem; box-shadow: var(--shadow-sm);">
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border-light); padding-bottom: 0.75rem; margin-bottom: 0.75rem;">
              <span style="font-family: var(--font-mono); font-size: 0.85rem; color: var(--color-pink-600);">Booking Reference: <strong>${booking.id}</strong></span>
              <span style="font-size: 0.85rem; color: #856404; background: #FFF3CD; padding: 0.2rem 0.6rem; border-radius: var(--radius-full); font-weight: 600;">Status: Pending Confirmation</span>
            </div>
            <div style="font-size: 0.925rem; line-height: 1.7;">
              <strong>Event:</strong> ${booking.eventType}<br/>
              <strong>Date & Slot:</strong> ${booking.eventDate} (${booking.timeSlot})<br/>
              <strong>Location:</strong> ${booking.location}<br/>
              <strong>Estimated Fee:</strong> ₹${booking.estimatedAmount.toLocaleString('en-IN')}
            </div>
          </div>
          <button class="btn btn-primary" onclick="App.closeModal('bookingSuccessModal')">
            Great, Thanks!
          </button>
        </div>
      `;
      App.openModal('bookingSuccessModal');
    }
  }
};
