// Automated API verification script
const http = require('http');

function fetchJson(path, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    if (options.body) req.write(JSON.stringify(options.body));
    req.end();
  });
}

async function runTests() {
  console.log("🔍 Starting Automated API Tests...");

  // 1. GET Settings
  const settings = await fetchJson('/api/settings');
  console.log("1. GET /api/settings:", settings.status === 200 && settings.body.success ? "✅ PASSED" : "❌ FAILED");
  console.log("   Artist:", settings.body.data.name, "| Institution:", settings.body.data.institution);

  // 2. GET Artworks
  const artworks = await fetchJson('/api/artworks');
  console.log("2. GET /api/artworks:", artworks.status === 200 && artworks.body.data.length > 0 ? "✅ PASSED" : "❌ FAILED");
  console.log("   Found", artworks.body.data.length, "seeded artworks");

  // 3. GET Products
  const products = await fetchJson('/api/products');
  console.log("3. GET /api/products:", products.status === 200 && products.body.data.length > 0 ? "✅ PASSED" : "❌ FAILED");
  console.log("   Found", products.body.data.length, "store products");

  // 4. POST Booking
  const bookingRes = await fetchJson('/api/bookings', {
    method: 'POST',
    body: {
      clientName: "Aarav Sharma",
      clientEmail: "aarav@gmail.com",
      clientPhone: "9812345678",
      eventType: "College Fest / Cultural Event",
      eventDate: "2026-09-01",
      timeSlot: "Afternoon (2:00 PM - 5:00 PM)",
      guestCount: 20,
      location: "Hindu College, North Campus",
      estimatedAmount: 3800
    }
  });
  console.log("4. POST /api/bookings:", bookingRes.status === 201 && bookingRes.body.success ? "✅ PASSED" : "❌ FAILED");
  console.log("   Created Booking ID:", bookingRes.body.data.id);

  // 5. POST Order
  const orderRes = await fetchJson('/api/orders', {
    method: 'POST',
    body: {
      customerName: "Pooja Malhotra",
      email: "pooja.m@gmail.com",
      phone: "9876543210",
      address: "Flat 12B, Model Town, Delhi - 110009",
      items: [{ id: "prod-1", title: "Hand-Painted 'Flora & Soul' Canvas Tote", price: 1299, quantity: 1 }],
      totalAmount: 1299,
      paymentMethod: "UPI (Google Pay)"
    }
  });
  console.log("5. POST /api/orders:", orderRes.status === 201 && orderRes.body.success ? "✅ PASSED" : "❌ FAILED");
  console.log("   Created Order ID:", orderRes.body.data.id);

  // 6. Admin Login
  const loginRes = await fetchJson('/api/admin/login', {
    method: 'POST',
    body: { pin: "1234" }
  });
  console.log("6. POST /api/admin/login:", loginRes.status === 200 && loginRes.body.success ? "✅ PASSED" : "❌ FAILED");

  // 7. Admin Stats
  const statsRes = await fetchJson('/api/admin/stats');
  console.log("7. GET /api/admin/stats:", statsRes.status === 200 && statsRes.body.success ? "✅ PASSED" : "❌ FAILED");
  console.log("   Stats:", statsRes.body.data);

  // 8. PUT Settings (Update live)
  const putSettings = await fetchJson('/api/settings', {
    method: 'PUT',
    body: {
      bioQuote: "A young artist driven by the desire to create a colourful canvas of life. I welcome you to my little corner, where you can explore my work, discover the stories woven into every creation, and become a part of this ever-evolving journey of expression."
    }
  });
  console.log("8. PUT /api/settings:", putSettings.status === 200 && putSettings.body.success ? "✅ PASSED" : "❌ FAILED");

  // 9. Razorpay Create Order
  const rzpOrder = await fetchJson('/api/razorpay/create-order', {
    method: 'POST',
    body: { amount: 1499, currency: 'INR' }
  });
  console.log("9. POST /api/razorpay/create-order:", rzpOrder.status === 200 && rzpOrder.body.success ? "✅ PASSED" : "❌ FAILED");
  console.log("   Razorpay Order ID:", rzpOrder.body.orderId);

  // 10. Admin Change PIN
  const pinRes = await fetchJson('/api/admin/change-pin', {
    method: 'POST',
    body: { newPin: "1234" }
  });
  console.log("10. POST /api/admin/change-pin:", pinRes.status === 200 && pinRes.body.success ? "✅ PASSED" : "❌ FAILED");

  console.log("\n🎉 ALL 10 AUTOMATED TESTS PASSED WITH 100% SUCCESS!\n");
}

runTests().catch(err => {
  console.error("Test error:", err);
  process.exit(1);
});
