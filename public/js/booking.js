/**
 * AKANKSHA ART STUDIO - Face Painting Booking Module
 * Interactive slot picker, live pricing estimation, and booking submission.
 */

const Booking = {
  selectedSlot: 'Afternoon (2:00 PM - 5:00 PM)',
  pricing: null,
  pricingPromise: null,

  // ==========================================
  // INITIALIZE
  // ==========================================
  async init() {
    this.bindEvents();
    this.setMinDate();

    await this.loadFacePaintingPricing();
    await this.calculateEstimate();
  },

  // ==========================================
  // SET MINIMUM BOOKING DATE
  // ==========================================
  setMinDate() {
    const dateInput = document.getElementById('bookingDateInput');

    if (!dateInput) {
      return;
    }

    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    const today = `${year}-${month}-${day}`;

    dateInput.min = today;

    if (!dateInput.value) {
      dateInput.value = today;
    }
  },

  // ==========================================
  // BIND EVENTS
  // ==========================================
  bindEvents() {
    const chips = document.querySelectorAll('.slot-chip');

    chips.forEach((chip) => {
      chip.addEventListener('click', (event) => {
        chips.forEach((item) => {
          item.classList.remove('selected');
        });

        event.currentTarget.classList.add('selected');

        this.selectedSlot =
          event.currentTarget.dataset.slot ||
          this.selectedSlot;

        this.calculateEstimate();
      });
    });

    const form = document.getElementById(
      'facePaintBookingForm'
    );

    if (!form) {
      return;
    }

    form.addEventListener('input', () => {
      this.calculateEstimate();
    });

    form.addEventListener('change', () => {
      this.calculateEstimate();
    });

    form.addEventListener('submit', (event) => {
      this.handleSubmit(event);
    });

    const selectedChip = document.querySelector(
      '.slot-chip.selected'
    );

    if (selectedChip && selectedChip.dataset.slot) {
      this.selectedSlot = selectedChip.dataset.slot;
    }
  },

  // ==========================================
  // LOAD FACE PAINTING PRICING
  // ==========================================
  async loadFacePaintingPricing() {
    if (this.pricing) {
      this.renderPricing(this.pricing);
      return this.pricing;
    }

    if (this.pricingPromise) {
      return this.pricingPromise;
    }

    if (
      typeof API === 'undefined' ||
      typeof API.getFacePaintingPricing !== 'function'
    ) {
      console.error(
        'API.getFacePaintingPricing() is not available.'
      );

      return null;
    }

    this.pricingPromise = (async () => {
      try {
        const response =
          await API.getFacePaintingPricing();

        if (
          !response ||
          !response.success ||
          !response.data
        ) {
          console.error(
            'Face painting pricing unavailable:',
            response
          );

          return null;
        }

        this.pricing = response.data;

        this.renderPricing(this.pricing);

        return this.pricing;
      } catch (error) {
        console.error(
          'Failed to load face painting pricing:',
          error
        );

        return null;
      } finally {
        this.pricingPromise = null;
      }
    })();

    return this.pricingPromise;
  },

  // ==========================================
  // DISPLAY PRICES
  // ==========================================
  renderPricing(pricing) {
    if (!pricing) {
      return;
    }

    const festEl =
      document.getElementById('facePriceFest');

    const editorialEl =
      document.getElementById('facePriceEditorial');

    const privateEl =
      document.getElementById('facePricePrivate');

    const bridalEl =
      document.getElementById('facePriceBridal');

    if (festEl) {
      festEl.textContent =
        this.formatCurrency(pricing.fest);
    }

    if (editorialEl) {
      editorialEl.textContent =
        this.formatCurrency(pricing.editorial);
    }

    if (privateEl) {
      privateEl.textContent =
        this.formatCurrency(pricing.private);
    }

    if (bridalEl) {
      bridalEl.textContent =
        this.formatCurrency(pricing.bridal);
    }
  },

  // ==========================================
  // CALCULATE BOOKING ESTIMATE
  // ==========================================
  async calculateEstimate() {
    const form = document.getElementById(
      'facePaintBookingForm'
    );

    const estimateValEl =
      document.getElementById(
        'bookingEstimateVal'
      );

    if (!form || !estimateValEl) {
      return 0;
    }

    const eventTypeInput =
      form.elements['eventType'] ||
      form.querySelector('[name="eventType"]');

    if (!eventTypeInput) {
      estimateValEl.textContent = '₹0';
      return 0;
    }

    try {
      const pricing =
        this.pricing ||
        await this.loadFacePaintingPricing();

      if (!pricing) {
        estimateValEl.textContent = '₹0';
        return 0;
      }

      const eventType = String(
        eventTypeInput.value || ''
      )
        .trim()
        .toLowerCase();

      let total = 0;

      // College Fest / Cultural Event
      if (
        eventType === 'fest' ||
        eventType.includes('college') ||
        eventType.includes('cultural') ||
        eventType.includes('fest')
      ) {
        total = Number(pricing.fest) || 0;
      }

      // Editorial / Fashion
      else if (
        eventType === 'editorial' ||
        eventType.includes('editorial') ||
        eventType.includes('fashion')
      ) {
        total = Number(pricing.editorial) || 0;
      }

      // Private Gathering / Festival
      else if (
        eventType === 'private' ||
        eventType.includes('private') ||
        eventType.includes('gathering') ||
        eventType.includes('festival')
      ) {
        total = Number(pricing.private) || 0;
      }

      // Bridal
      else if (
        eventType === 'bridal' ||
        eventType.includes('bridal')
      ) {
        total = Number(pricing.bridal) || 0;
      }

      estimateValEl.textContent =
        this.formatCurrency(total);

      return total;
    } catch (error) {
      console.error(
        'Failed to calculate face painting estimate:',
        error
      );

      estimateValEl.textContent = '₹0';

      return 0;
    }
  },

  // ==========================================
  // SUBMIT BOOKING
  // ==========================================
  async handleSubmit(event) {
    event.preventDefault();

    const form = event.target;

    if (!form) {
      return;
    }

    const btn = form.querySelector(
      'button[type="submit"]'
    );

    if (btn) {
      btn.disabled = true;

      btn.dataset.originalText =
        btn.textContent;

      btn.textContent = 'Submitting...';
    }

    try {
      const estimatedAmount =
        await this.calculateEstimate();

      const getValue = (name) => {
        const field = form.elements[name];

        return field
          ? String(field.value || '').trim()
          : '';
      };

      const bookingData = {
        clientName: getValue('clientName'),

        clientEmail: getValue('clientEmail'),

        clientPhone: getValue('clientPhone'),

        eventType: getValue('eventType'),

        eventDate: getValue('eventDate'),

        timeSlot: this.selectedSlot,

        guestCount: getValue('guestCount'),

        location: getValue('location'),

        notes: getValue('notes'),

        estimatedAmount: estimatedAmount
      };

      // Basic validation
      if (
        !bookingData.clientName ||
        !bookingData.clientEmail ||
        !bookingData.clientPhone ||
        !bookingData.eventType ||
        !bookingData.eventDate ||
        !bookingData.location
      ) {
        this.showToast(
          'Please fill in all required booking fields.'
        );

        return;
      }

      if (
        typeof API === 'undefined' ||
        typeof API.createBooking !== 'function'
      ) {
        console.error(
          'API.createBooking() is not available.'
        );

        this.showToast(
          'Booking service is currently unavailable.'
        );

        return;
      }

      const response =
        await API.createBooking(
          bookingData
        );

      if (
        response &&
        response.success &&
        response.data
      ) {
        const booking = response.data;

        form.reset();

        this.setMinDate();

        const chips =
          document.querySelectorAll(
            '.slot-chip'
          );

        chips.forEach((chip) => {
          chip.classList.remove('selected');

          if (
            chip.dataset.slot ===
            this.selectedSlot
          ) {
            chip.classList.add('selected');
          }
        });

        await this.calculateEstimate();

        this.showConfirmation(booking);
      } else {
        this.showToast(
          response?.message ||
          'Failed to submit booking request. Please check your inputs.'
        );
      }
    } catch (error) {
      console.error(
        'Booking submission failed:',
        error
      );

      this.showToast(
        '❌ Something went wrong while submitting the booking.'
      );
    } finally {
      if (btn) {
        btn.disabled = false;

        btn.textContent =
          btn.dataset.originalText ||
          'Submit Booking';
      }
    }
  },

  // ==========================================
  // SUCCESS MODAL
  // ==========================================
  showConfirmation(booking) {
    const modalContent =
      document.getElementById(
        'bookingSuccessModalContent'
      );

    if (!modalContent || !booking) {
      return;
    }

    const estimatedAmount =
      Number(booking.estimatedAmount) || 0;

    const clientName =
      this.escapeHtml(
        booking.clientName
      );

    const bookingId =
      this.escapeHtml(
        booking.id
      );

    const eventType =
      this.escapeHtml(
        booking.eventType
      );

    const eventDate =
      this.escapeHtml(
        booking.eventDate
      );

    const timeSlot =
      this.escapeHtml(
        booking.timeSlot
      );

    const location =
      this.escapeHtml(
        booking.location
      );

    modalContent.innerHTML = `
      <div style="
        text-align: center;
        padding: 1rem 0;
      ">

        <div style="
          width: 70px;
          height: 70px;
          background: var(--color-pink-100);
          border-radius: var(--radius-full);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1.25rem;
          font-size: 2.2rem;
        ">
          🎨
        </div>

        <h2 style="
          font-family: var(--font-serif);
          font-size: 2.2rem;
          color: var(--text-main);
          margin-bottom: 0.5rem;
        ">
          Booking Request Received!
        </h2>

        <p style="
          font-family: var(--font-editorial);
          font-size: 1.2rem;
          color: var(--text-muted);
          font-style: italic;
          margin-bottom: 1.5rem;
        ">
          Thank you, ${clientName}!
          Akanksha has received your face painting
          booking request and will contact you via
          WhatsApp / phone to confirm the schedule.
        </p>

        <div style="
          background: white;
          border: 1px solid var(--border-pink);
          border-radius: var(--radius-md);
          padding: 1.5rem;
          text-align: left;
          margin-bottom: 2rem;
          box-shadow: var(--shadow-sm);
        ">

          <div style="
            display: flex;
            justify-content: space-between;
            gap: 1rem;
            flex-wrap: wrap;
            border-bottom: 1px solid var(--border-light);
            padding-bottom: 0.75rem;
            margin-bottom: 0.75rem;
          ">

            <span style="
              font-family: var(--font-mono);
              font-size: 0.85rem;
              color: var(--color-pink-600);
            ">
              Booking Reference:
              <strong>${bookingId}</strong>
            </span>

            <span style="
              font-size: 0.85rem;
              color: #856404;
              background: #FFF3CD;
              padding: 0.2rem 0.6rem;
              border-radius: var(--radius-full);
              font-weight: 600;
            ">
              Status: Pending Confirmation
            </span>

          </div>

          <div style="
            font-size: 0.925rem;
            line-height: 1.7;
          ">

            <strong>Event:</strong>
            ${eventType}
            <br>

            <strong>Date &amp; Slot:</strong>
            ${eventDate}
            (${timeSlot})
            <br>

            <strong>Location:</strong>
            ${location}
            <br>

            <strong>Estimated Fee:</strong>
            ${this.formatCurrency(
      estimatedAmount
    )}

          </div>

        </div>

        <button
          type="button"
          class="btn btn-primary"
          onclick="App.closeModal('bookingSuccessModal')"
        >
          Great, Thanks!
        </button>

      </div>
    `;

    if (
      typeof App !== 'undefined' &&
      typeof App.openModal === 'function'
    ) {
      App.openModal(
        'bookingSuccessModal'
      );
    } else {
      console.warn(
        'App.openModal() is not available.'
      );
    }
  },

  // ==========================================
  // FORMAT CURRENCY
  // ==========================================
  formatCurrency(value) {
    const amount =
      Number(value) || 0;

    return `₹${amount.toLocaleString(
      'en-IN'
    )}`;
  },

  // ==========================================
  // ESCAPE HTML
  // ==========================================
  escapeHtml(value) {
    return String(
      value ?? ''
    ).replace(
      /[&<>"']/g,
      (character) => {
        const entities = {
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#039;'
        };

        return entities[character];
      }
    );
  },

  // ==========================================
  // TOAST
  // ==========================================
  showToast(message) {
    if (
      typeof App !== 'undefined' &&
      typeof App.showToast === 'function'
    ) {
      App.showToast(message);
      return;
    }

    console.warn(message);

    window.alert(message);
  }
};


// ==========================================
// AUTO INITIALIZE
// ==========================================
document.addEventListener(
  'DOMContentLoaded',
  () => {
    Booking.init();
  }
);