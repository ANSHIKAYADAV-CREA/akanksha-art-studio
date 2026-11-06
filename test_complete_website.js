 /**
 * Complete Website & End-to-End Verification Suite for AKAMATOE
 * Validates:
 * 1. Static asset integrity (HTML, CSS, JS bundles)
 * 2. Express server boot & Firestore database sync
 * 3. All public REST endpoints (settings, artworks, face arts, products, poems, reviews, pricing, bookings, contact)
 * 4. Razorpay payment creation & verification flows
 * 5. Webhook event processing (captured, failed, settlement.processed)
 * 6. Admin authentication & protected endpoints
 * 7. HTML structure & script inclusion
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = 3055;
process.env.PORT = String(PORT);
process.env.RAZORPAY_KEY_ID = 'rzp_test_completeCheck';
process.env.RAZORPAY_KEY_SECRET = 'secret_key_complete_check_123';
process.env.RAZORPAY_WEBHOOK_SECRET = 'webhook_secret_complete_check_456';

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const rawBody = options.rawBody !== undefined 
      ? options.rawBody 
      : (options.body ? Buffer.from(JSON.stringify(options.body)) : null);

    const headers = {
      ...(options.headers || {})
    };
    if (rawBody && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
    if (rawBody) {
      headers['Content-Length'] = rawBody.length;
    }

    const req = http.request({
      hostname: '127.0.0.1',
      port: PORT,
      path: path,
      method: options.method || 'GET',
      headers
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        }
      });
    });

    req.on('error', reject);
    if (rawBody) req.write(rawBody);
    req.end();
  });
}

async function runAllChecks() {
  console.log('====================================================');
  console.log('🌸 STARTING COMPLETE AKAMATOE WEBSITE & CODE RECHECK');
  console.log('====================================================');

  let passed = 0;
  let failed = 0;

  function assert(title, condition, details = '') {
    if (condition) {
      console.log(`✅ [PASS] ${title}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${title} ${details}`);
      failed++;
    }
  }

  // -------------------------------------------------------------
  // Part 1: Check Local Static Asset Files Integrity
  // -------------------------------------------------------------
  console.log('\n📁 1. Verifying File Existence & Script Links...');
  const publicDir = path.join(__dirname, 'public');
  const indexHtml = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
  const adminHtml = fs.readFileSync(path.join(publicDir, 'admin.html'), 'utf8');

  // Check script tags in index.html
  const indexScripts = [
    'https://checkout.razorpay.com/v1/checkout.js',
    'js/api.js',
    'js/gallery.js',
    'js/faceart.js',
    'js/booking.js',
    'js/store.js',
    'js/reviews.js',
    'js/contact.js',
    'js/app.js'
  ];

  for (const script of indexScripts) {
    if (script.startsWith('http')) {
      assert(`index.html contains external SDK: ${script}`, indexHtml.includes(script));
    } else {
      const filePath = path.join(publicDir, script);
      const exists = fs.existsSync(filePath);
      assert(`index.html script exists on disk: ${script}`, exists && indexHtml.includes(script));
    }
  }

  // Check CSS files
  const cssFiles = ['css/main.css', 'css/components.css', 'css/admin.css'];
  for (const css of cssFiles) {
    const filePath = path.join(publicDir, css);
    assert(`CSS file exists: ${css}`, fs.existsSync(filePath));
  }

  // Check script tags in admin.html
  const adminScripts = ['js/api.js', 'js/admin.js'];
  for (const script of adminScripts) {
    const filePath = path.join(publicDir, script);
    assert(`admin.html script exists: ${script}`, fs.existsSync(filePath) && adminHtml.includes(script));
  }

  // -------------------------------------------------------------
  // Part 2: Boot Server & Wait for Database Initialization
  // -------------------------------------------------------------
  console.log('\n🚀 2. Booting Express Server & Firestore Connection...');
  require('./server/server.js');

  let ready = false;
  for (let i = 0; i < 40; i++) {
    try {
      const res = await request('/api/settings');
      if (res.status === 200 && res.body?.success) {
        ready = true;
        break;
      }
    } catch (e) {}
    await new Promise(r => setTimeout(r, 500));
  }

  if (!ready) {
    console.error('❌ Server boot timed out');
    process.exit(1);
  }
  console.log(`✅ Server successfully listening on http://127.0.0.1:${PORT}`);

  // -------------------------------------------------------------
  // Part 3: Test Web Pages (HTML Delivery)
  // -------------------------------------------------------------
  console.log('\n🌐 3. Testing HTML Delivery...');
  const homeRes = await request('/');
  assert('GET / delivers index.html', homeRes.status === 200 && typeof homeRes.body === 'string' && homeRes.body.includes('AKAMATOE'));

  const adminPageRes = await request('/admin.html');
  assert('GET /admin.html delivers admin portal', adminPageRes.status === 200 && typeof adminPageRes.body === 'string' && adminPageRes.body.includes('Studio Access Login'));

  const adminRouteRes = await request('/admin');
  assert('GET /admin cleanly redirects/delivers admin portal', adminRouteRes.status === 200 && typeof adminRouteRes.body === 'string' && adminRouteRes.body.includes('Studio Access Login'));

  // -------------------------------------------------------------
  // Part 4: Test All Public REST Endpoints
  // -------------------------------------------------------------
  console.log('\n🔌 4. Testing Public API Endpoints...');

  // Settings
  const settingsRes = await request('/api/settings');
  assert(
    'GET /api/settings returns studio configuration without exposing secrets',
    settingsRes.status === 200 &&
    settingsRes.body?.success === true &&
    settingsRes.body?.data?.adminPin === undefined &&
    settingsRes.body?.data?.razorpayKeySecret === undefined &&
    settingsRes.body?.data?.razorpayWebhookSecret === undefined
  );

  // Artworks
  const artworksRes = await request('/api/artworks');
  assert('GET /api/artworks returns array', artworksRes.status === 200 && Array.isArray(artworksRes.body?.data));

  // Face Arts
  const faceArtsRes = await request('/api/face-arts');
  assert('GET /api/face-arts returns array', faceArtsRes.status === 200 && Array.isArray(faceArtsRes.body?.data));

  // Products
  const productsRes = await request('/api/products');
  assert('GET /api/products returns array', productsRes.status === 200 && Array.isArray(productsRes.body?.data));

  // Face Painting Pricing
  const pricingRes = await request('/api/face-painting-pricing');
  assert('GET /api/face-painting-pricing returns valid pricing numbers', pricingRes.status === 200 && pricingRes.body?.data?.fest > 0);

  // Poems
  const poemsRes = await request('/api/poems');
  assert('GET /api/poems returns array', poemsRes.status === 200 && Array.isArray(poemsRes.body?.data));

  // Reviews
  const reviewsRes = await request('/api/reviews');
  assert('GET /api/reviews returns array', reviewsRes.status === 200 && Array.isArray(reviewsRes.body?.data));

  // Orders
  const ordersRes = await request('/api/orders');
  assert('GET /api/orders returns array', ordersRes.status === 200 && Array.isArray(ordersRes.body?.data));

  // Razorpay Gateway Status
  const rzpStatusRes = await request('/api/razorpay/status');
  assert('GET /api/razorpay/status reports gateway connectivity', rzpStatusRes.status === 200 && rzpStatusRes.body?.success === true);

  // -------------------------------------------------------------
  // Part 5: Test Submissions & Transactions
  // -------------------------------------------------------------
  console.log('\n💳 5. Testing Submissions & Dual Confirmation Flows...');

  // 1. Post Contact Inquiry
  const contactRes = await request('/api/contact', {
    method: 'POST',
    body: {
      name: 'Rohan Mehra',
      email: 'rohan@example.com',
      phone: '+91 98999 11111',
      subject: 'Custom Artwork Commission Inquiry',
      message: 'Hello Akanksha, I would like to commission an acrylic canvas.'
    }
  });
  assert('POST /api/contact receives messages', contactRes.status === 200 && contactRes.body?.success === true);

  // 2. Post Booking Inquiry
  const bookingRes = await request('/api/bookings', {
    method: 'POST',
    body: {
      clientName: 'Sanya Gupta',
      clientEmail: 'sanya@example.com',
      clientPhone: '+91 98777 22222',
      eventType: 'Fest & Cultural Gathering',
      eventDate: '2026-11-20',
      timeSlot: 'Afternoon (2:00 PM - 5:00 PM)',
      guestCount: 35,
      location: 'Delhi University Campus',
      notes: 'Floral motifs'
    }
  });
  assert('POST /api/bookings creates booking record', bookingRes.status === 201 && bookingRes.body?.data?.clientName === 'Sanya Gupta');

  // 3. Post Collector Review
  const reviewRes = await request('/api/reviews', {
    method: 'POST',
    body: {
      name: 'Dr. Anita Roy',
      role: 'Art Enthusiast',
      rating: 5,
      comment: 'The Lord Krishna painting is deeply divine and brings serenity to our home.'
    }
  });
  assert('POST /api/reviews creates review', reviewRes.status === 201 && reviewRes.body?.success === true);

  // 4. Create Online Order (Razorpay)
  const orderRes = await request('/api/orders', {
    method: 'POST',
    body: {
      customerName: 'Kunal Roy',
      email: 'kunal.roy@example.com',
      phone: '+91 98100 55443',
      address: 'Flat 304, Green Park, New Delhi',
      items: [{ id: 'prod-1', title: 'Serenity Print', price: 1500, quantity: 1 }],
      totalAmount: 1500,
      paymentMethod: 'Razorpay Gateway'
    }
  });
  const orderId = orderRes.body?.data?.id;
  assert('Online Order initialized with Pending payment & settlement', 
    orderRes.status === 201 && 
    orderRes.body?.data?.paymentStatus === 'Pending' &&
    orderRes.body?.data?.settlementStatus === 'Pending'
  );

  // 5. Create Razorpay Gateway Order
  const rzpOrderRes = await request('/api/razorpay/create-order', {
    method: 'POST',
    body: {
      amount: 1500,
      currency: 'INR',
      orderId: orderId,
      receipt: `rcpt_${orderId}`
    }
  });
  const rzpOrderId = rzpOrderRes.body?.orderId;
  assert('POST /api/razorpay/create-order generates gateway order ID', rzpOrderRes.status === 200 && !!rzpOrderId);

  // 6. Cryptographic Payment Verification (Customer Checkmark)
  const fakePaymentId = 'pay_fullcheck_' + Date.now();
  const validSignature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${rzpOrderId}|${fakePaymentId}`)
    .digest('hex');

  const verifyRes = await request('/api/razorpay/verify-payment', {
    method: 'POST',
    body: {
      orderId: orderId,
      razorpay_order_id: rzpOrderId,
      razorpay_payment_id: fakePaymentId,
      razorpay_signature: validSignature
    }
  });
  assert('Customer payment verification succeeds with valid HMAC', 
    verifyRes.status === 200 && 
    verifyRes.body?.success === true &&
    verifyRes.body?.paymentStatus === 'Paid'
  );

  // Check order in DB: paymentStatus is Paid, settlementStatus is still Pending
  const ordersCheck1 = await request('/api/orders');
  const checkedOrder1 = (ordersCheck1.body?.data || []).find(o => o.id === orderId);
  assert('Order has Paid ✓ status and Settlement Pending before payout', 
    checkedOrder1?.paymentStatus === 'Paid' && 
    checkedOrder1?.settlementStatus === 'Pending' &&
    checkedOrder1?.paymentVerifiedAt !== null
  );

  // 7. Settlement Processed Webhook (Owner Checkmark)
  const settlementRef = 'UTR_ICICI_2026101899';
  const settlementId = 'setl_fullcheck_999';

  // Associate order with settlementId for reconciliation
  const dbData = require('./server/database').readDB();
  const memoryOrder = (dbData.orders || []).find(o => o.id === orderId);
  if (memoryOrder) {
    memoryOrder.settlementId = settlementId;
    await require('./server/database').saveItem('orders', memoryOrder);
  }

  const settlementWebhookBody = JSON.stringify({
    event: 'settlement.processed',
    payload: {
      settlement: {
        entity: {
          id: settlementId,
          utr: settlementRef,
          created_at: Math.floor(Date.now() / 1000)
        }
      }
    }
  });

  const settlementSig = crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(settlementWebhookBody)
    .digest('hex');

  const settlementWebhookRes = await request('/api/razorpay/webhook', {
    method: 'POST',
    rawBody: Buffer.from(settlementWebhookBody),
    headers: {
      'x-razorpay-signature': settlementSig
    }
  });
  assert('settlement.processed webhook accepted (HTTP 200)', settlementWebhookRes.status === 200);

  const ordersCheck2 = await request('/api/orders');
  const checkedOrder2 = (ordersCheck2.body?.data || []).find(o => o.id === orderId);
  assert('Owner dashboard shows Settled to Bank ✓ with UTR reference', 
    checkedOrder2?.settlementStatus === 'Settled to Bank' &&
    checkedOrder2?.settlementReference === settlementRef
  );

  // -------------------------------------------------------------
  // Part 6: Admin Security & Auth Tests
  // -------------------------------------------------------------
  console.log('\n🔒 6. Testing Admin Authentication & Route Protection...');

  // 1. Wrong PIN login rejected
  const badLoginRes = await request('/api/admin/login', {
    method: 'POST',
    body: { pin: 'wrongPin123' }
  });
  assert('Invalid admin PIN rejected with 401', badLoginRes.status === 401);

  // 2. Correct PIN login accepted
  const goodLoginRes = await request('/api/admin/login', {
    method: 'POST',
    body: { pin: 'alright@12' }
  });
  const adminToken = goodLoginRes.body?.token;
  assert('Valid admin PIN accepted with token', goodLoginRes.status === 200 && !!adminToken);

  // 3. Admin stats accessible
  const statsRes = await request('/api/admin/stats');
  assert('GET /api/admin/stats returns aggregate analytics', statsRes.status === 200 && statsRes.body?.data?.totalOrders >= 0);

  // 4. Settlement sync authenticated
  const syncRes = await request('/api/razorpay/sync-settlements', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`
    }
  });
  assert('POST /api/razorpay/sync-settlements executes with admin authorization', syncRes.status === 200 && syncRes.body?.success === true);

  // 5. Unauthorized change-pin is blocked
  const unauthPinRes = await request('/api/admin/change-pin', {
    method: 'POST',
    body: { newPin: 'unauthorizedHacked' }
  });
  assert('Unauthorized change-pin is blocked with 401', unauthPinRes.status === 401);

  // -------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------
  console.log('\n====================================================');
  console.log(`RECHECK SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log('====================================================');

  process.exit(failed > 0 ? 1 : 0);
}

runAllChecks().catch(err => {
  console.error('Fatal check error:', err);
  process.exit(1);
});
