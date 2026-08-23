const express = require('express');
const cors = require('cors');
const path = require('path');
const {
  readDB,
  writeDB,
  initDatabase,
  isDatabaseReady
} = require('./database');

const cloudinary = require('./cloudinary');
const upload = require('./upload');

const app = express();
const PORT = process.env.PORT || 3000;



// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
// Wait until Firestore database has been loaded
app.use((req, res, next) => {
  if (isDatabaseReady()) {
    return next();
  }

  return res.status(503).json({
    success: false,
    message: "Database is still initializing. Please try again."
  });
});

// Serve static frontend assets
app.use(express.static(path.join(__dirname, '..', 'public')));

// Helper to generate simple unique ID
function generateId(prefix = 'id') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
}

// -------------------------------------------------------------
// SETTINGS API
// -------------------------------------------------------------
app.get('/api/settings', (req, res) => {
  const db = readDB();
  const { adminPin, ...publicSettings } = db.settings;
  res.json({ success: true, data: publicSettings });
});

app.put('/api/settings', (req, res) => {
  const db = readDB();
  db.settings = {
    ...db.settings,
    ...req.body
  };
  writeDB(db);
  const { adminPin, ...publicSettings } = db.settings;
  res.json({ success: true, data: publicSettings, message: "Settings updated successfully" });
});

// -------------------------------------------------------------
// CLOUDINARY IMAGE UPLOAD API
// -------------------------------------------------------------
app.post('/api/upload-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    console.log('📸 Upload request received');
    console.log('📁 File:', req.file.originalname);
    console.log('📦 Size:', req.file.size);
    console.log('🖼️ Type:', req.file.mimetype);

    console.log('☁️ Cloudinary config:', {
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key_found: !!process.env.CLOUDINARY_API_KEY,
      api_secret_found: !!process.env.CLOUDINARY_API_SECRET
    });

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'akanksha-art-studio',
          resource_type: 'image'
        },
        (error, result) => {
          if (error) {
            console.error('❌ CLOUDINARY RAW ERROR:', error);
            console.error('❌ Message:', error.message);
            console.error('❌ HTTP Code:', error.http_code);
            console.error('❌ Error:', error.error);
            reject(error);
          } else {
            resolve(result);
          }
        }
      );

      stream.end(req.file.buffer);
    });

    console.log('✅ CLOUDINARY UPLOAD SUCCESS');
    console.log('🔗 URL:', result.secure_url);
    console.log('🆔 Public ID:', result.public_id);

    res.status(200).json({
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      message: 'Image uploaded successfully to Cloudinary'
    });

  } catch (error) {
    console.error('======================================');
    console.error('❌ CLOUDINARY UPLOAD FAILED');
    console.error('Message:', error.message);
    console.error('HTTP Code:', error.http_code);
    console.error('Error:', error.error);
    console.error('Full Error:', error);
    console.error('======================================');

    res.status(500).json({
      success: false,
      message: 'Image upload failed',
      error: error.message,
      http_code: error.http_code || 500
    });
  }
});
// -------------------------------------------------------------
// ARTWORKS API
// -------------------------------------------------------------
app.get('/api/artworks', (req, res) => {
  const db = readDB();
  res.json({ success: true, data: db.artworks || [] });
});

app.post('/api/artworks', (req, res) => {
  const db = readDB();
  const newArtwork = {
    id: generateId('art'),
    title: req.body.title || 'Untitled Artwork',
    category: req.body.category || 'Canvas Paintings',
    medium: req.body.medium || 'Acrylic on Canvas',
    dimensions: req.body.dimensions || '24 x 36 inches',
    year: req.body.year || new Date().getFullYear().toString(),
    price: Number(req.body.price) || 0,
    image: req.body.image || 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1000&q=80',
    publicId: req.body.publicId || '',
    description: req.body.description || '',
    isSold: Boolean(req.body.isSold),
    isFeatured: Boolean(req.body.isFeatured)
  };
  db.artworks.unshift(newArtwork);
  writeDB(db);
  res.status(201).json({ success: true, data: newArtwork, message: "Artwork added successfully" });
});

app.put('/api/artworks/:id', (req, res) => {
  const db = readDB();
  const index = db.artworks.findIndex(a => a.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ success: false, message: "Artwork not found" });
  }
  db.artworks[index] = {
    ...db.artworks[index],
    ...req.body,
    price: req.body.price !== undefined ? Number(req.body.price) : db.artworks[index].price,
    isSold: req.body.isSold !== undefined ? Boolean(req.body.isSold) : db.artworks[index].isSold,
    isFeatured: req.body.isFeatured !== undefined ? Boolean(req.body.isFeatured) : db.artworks[index].isFeatured
  };
  writeDB(db);
  res.json({ success: true, data: db.artworks[index], message: "Artwork updated successfully" });
});

app.delete('/api/artworks/:id', async (req, res) => {
  try {
    const db = readDB();

    const index = db.artworks.findIndex(
      artwork => artwork.id === req.params.id
    );

    if (index === -1) {
      return res.status(404).json({
        success: false,
        message: 'Artwork not found'
      });
    }

    const artwork = db.artworks[index];

    // =====================================================
    // 1. GET CLOUDINARY PUBLIC ID
    // =====================================================

    let publicId = artwork.publicId || '';

    // For OLD artworks that don't have publicId saved,
    // try to extract it from the Cloudinary image URL.
    if (!publicId && artwork.image) {
      try {
        const imageUrl = artwork.image;

        if (imageUrl.includes('res.cloudinary.com')) {
          const uploadMarker = '/upload/';

          const uploadIndex = imageUrl.indexOf(uploadMarker);

          if (uploadIndex !== -1) {
            let cloudinaryPath =
              imageUrl.substring(
                uploadIndex + uploadMarker.length
              );

            // Remove version, e.g. v1234567890/
            cloudinaryPath = cloudinaryPath.replace(
              /^v\d+\//,
              ''
            );

            // Remove file extension
            cloudinaryPath = cloudinaryPath.replace(
              /\.[^/.]+$/,
              ''
            );

            publicId = cloudinaryPath;
          }
        }
      } catch (extractError) {
        console.error(
          '⚠️ Could not extract Cloudinary public ID:',
          extractError.message
        );
      }
    }

    console.log('🆔 Artwork Public ID:', publicId || 'NONE');

    // =====================================================
    // 2. DELETE IMAGE FROM CLOUDINARY
    // =====================================================

    if (publicId) {
      try {
        console.log(
          '☁️ Deleting image from Cloudinary:',
          publicId
        );

        const cloudinaryResult =
          await cloudinary.uploader.destroy(
            publicId,
            {
              resource_type: 'image'
            }
          );

        console.log(
          '☁️ Cloudinary delete result:',
          cloudinaryResult
        );

      } catch (cloudinaryError) {

        console.error(
          '❌ Cloudinary delete failed:',
          cloudinaryError.message
        );

        return res.status(500).json({
          success: false,
          message:
            'Artwork was not deleted because its Cloudinary image could not be deleted.',
          error: cloudinaryError.message
        });
      }

    } else {
      console.log(
        'ℹ️ No Cloudinary image found for this artwork.'
      );
    }

    // =====================================================
    // 3. DELETE ARTWORK FROM FIRESTORE / DATABASE
    // =====================================================

    db.artworks.splice(index, 1);

    writeDB(db);

    console.log(
      '🗑️ Artwork permanently deleted:',
      artwork.id
    );

    res.json({
      success: true,
      data: artwork,
      message:
        'Artwork and associated Cloudinary image deleted successfully'
    });

  } catch (error) {

    console.error(
      '❌ Artwork delete error:',
      error
    );

    res.status(500).json({
      success: false,
      message: 'Failed to delete artwork',
      error: error.message
    });
  }
});

// -------------------------------------------------------------
// PRODUCTS (MINI STORE) API
// -------------------------------------------------------------
app.get('/api/products', (req, res) => {
  const db = readDB();
  res.json({ success: true, data: db.products || [] });
});

app.post('/api/products', (req, res) => {
  const db = readDB();
  const newProduct = {
    id: generateId('prod'),
    title: req.body.title || 'New Aesthetic Artifact',
    category: req.body.category || 'Wearable Art',
    price: Number(req.body.price) || 0,
    originalPrice: Number(req.body.originalPrice) || Number(req.body.price) || 0,
    stock: Number(req.body.stock) || 10,
    image: req.body.image || 'https://images.unsplash.com/photo-1597633425046-08f5110420b5?auto=format&fit=crop&w=800&q=80',
    publicId: req.body.publicId || '',
    description: req.body.description || '',
    tag: req.body.tag || 'New',
    rating: Number(req.body.rating) || 5.0
  };
  db.products.unshift(newProduct);
  writeDB(db);
  res.status(201).json({ success: true, data: newProduct, message: "Product created successfully" });
});

app.put('/api/products/:id', (req, res) => {
  const db = readDB();
  const index = db.products.findIndex(p => p.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ success: false, message: "Product not found" });
  }
  db.products[index] = {
    ...db.products[index],
    ...req.body,
    price: req.body.price !== undefined ? Number(req.body.price) : db.products[index].price,
    stock: req.body.stock !== undefined ? Number(req.body.stock) : db.products[index].stock
  };
  writeDB(db);
  res.json({ success: true, data: db.products[index], message: "Product updated successfully" });
});
app.delete('/api/products/:id', async (req, res) => {
  try {
    const db = readDB();

    const index = db.products.findIndex(
      product => product.id === req.params.id
    );

    if (index === -1) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const product = db.products[index];

    // =====================================================
    // 1. GET CLOUDINARY PUBLIC ID
    // =====================================================

    let publicId = product.publicId || '';

    // For older products where publicId wasn't saved,
    // extract it from the Cloudinary image URL.
    if (!publicId && product.image) {
      try {
        const imageUrl = product.image;

        if (imageUrl.includes('res.cloudinary.com')) {
          const uploadMarker = '/upload/';
          const uploadIndex = imageUrl.indexOf(uploadMarker);

          if (uploadIndex !== -1) {
            let cloudinaryPath = imageUrl.substring(
              uploadIndex + uploadMarker.length
            );

            // Remove version, e.g. v1234567890/
            cloudinaryPath = cloudinaryPath.replace(
              /^v\d+\//,
              ''
            );

            // Remove file extension
            cloudinaryPath = cloudinaryPath.replace(
              /\.[^/.]+$/,
              ''
            );

            publicId = cloudinaryPath;
          }
        }
      } catch (extractError) {
        console.error(
          '⚠️ Could not extract Product Cloudinary Public ID:',
          extractError.message
        );
      }
    }

    console.log(
      '🆔 Product Public ID:',
      publicId || 'NONE'
    );

    // =====================================================
    // 2. DELETE IMAGE FROM CLOUDINARY
    // =====================================================

    if (publicId) {
      try {
        console.log(
          '☁️ Deleting product image from Cloudinary:',
          publicId
        );

        const cloudinaryResult =
          await cloudinary.uploader.destroy(
            publicId,
            {
              resource_type: 'image'
            }
          );

        console.log(
          '☁️ Cloudinary delete result:',
          cloudinaryResult
        );

      } catch (cloudinaryError) {

        console.error(
          '❌ Product Cloudinary delete failed:',
          cloudinaryError.message
        );

        return res.status(500).json({
          success: false,
          message:
            'Product was not deleted because its Cloudinary image could not be deleted.',
          error: cloudinaryError.message
        });
      }

    } else {
      console.log(
        'ℹ️ No Cloudinary image found for this product.'
      );
    }

    // =====================================================
    // 3. DELETE PRODUCT FROM FIRESTORE / DATABASE
    // =====================================================

    db.products.splice(index, 1);

    writeDB(db);

    console.log(
      '🗑️ Product permanently deleted:',
      product.id
    );

    res.json({
      success: true,
      data: product,
      message:
        'Product and associated Cloudinary image deleted successfully'
    });

  } catch (error) {

    console.error(
      '❌ Product delete error:',
      error
    );

    res.status(500).json({
      success: false,
      message: 'Failed to delete product',
      error: error.message
    });
  }
});

app.delete('/api/artworks/:id', async (req, res) => {
  try {
    const db = readDB();

    const index = db.artworks.findIndex(
      artwork => artwork.id === req.params.id
    );

    if (index === -1) {
      return res.status(404).json({
        success: false,
        message: 'Artwork not found'
      });
    }

    const artwork = db.artworks[index];

    // Delete image from Cloudinary first
    if (artwork.publicId) {
      try {
        const cloudinaryResult = await cloudinary.uploader.destroy(
          artwork.publicId,
          {
            resource_type: 'image'
          }
        );

        console.log('☁️ Cloudinary delete result:', cloudinaryResult);
      } catch (cloudinaryError) {
        console.error(
          '❌ Cloudinary delete failed:',
          cloudinaryError.message
        );

        return res.status(500).json({
          success: false,
          message: 'Could not delete the artwork image from Cloudinary.',
          error: cloudinaryError.message
        });
      }
    }

    // Delete artwork record from database
    db.artworks.splice(index, 1);
    writeDB(db);

    console.log('🗑️ Artwork permanently deleted:', artwork.id);

    res.json({
      success: true,
      data: artwork,
      message: 'Artwork and Cloudinary image permanently deleted'
    });

  } catch (error) {
    console.error('❌ Artwork delete error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to delete artwork',
      error: error.message
    });
  }
});

// -------------------------------------------------------------
// FACE PAINTING BOOKINGS API
// -------------------------------------------------------------
app.get('/api/bookings', (req, res) => {
  const db = readDB();
  res.json({ success: true, data: db.bookings || [] });
});

app.post('/api/bookings', (req, res) => {
  const db = readDB();
  const shortNum = Math.floor(1000 + Math.random() * 9000);
  const newBooking = {
    id: `BK-${shortNum}`,
    clientName: req.body.clientName || 'Anonymous',
    clientEmail: req.body.clientEmail || '',
    clientPhone: req.body.clientPhone || '',
    eventType: req.body.eventType || 'College Fest / Cultural Event',
    eventDate: req.body.eventDate || new Date().toISOString().split('T')[0],
    timeSlot: req.body.timeSlot || 'Afternoon (2:00 PM - 5:00 PM)',
    guestCount: Number(req.body.guestCount) || 10,
    location: req.body.location || 'Delhi University / Delhi NCR',
    notes: req.body.notes || '',
    status: 'Pending',
    estimatedAmount: Number(req.body.estimatedAmount) || 2500,
    createdAt: new Date().toISOString()
  };
  db.bookings.unshift(newBooking);
  writeDB(db);
  res.status(201).json({ success: true, data: newBooking, message: "Booking requested successfully! Akanksha will review and confirm shortly." });
});

app.put('/api/bookings/:id', (req, res) => {
  const db = readDB();
  const index = db.bookings.findIndex(b => b.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ success: false, message: "Booking not found" });
  }
  db.bookings[index] = {
    ...db.bookings[index],
    ...req.body
  };
  writeDB(db);
  res.json({ success: true, data: db.bookings[index], message: "Booking status updated" });
});

app.delete('/api/bookings/:id', (req, res) => {
  const db = readDB();
  const index = db.bookings.findIndex(b => b.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ success: false, message: "Booking not found" });
  }
  const deleted = db.bookings.splice(index, 1);
  writeDB(db);
  res.json({ success: true, data: deleted[0], message: "Booking deleted" });
});
app.get('/api/face-painting-pricing', (req, res) => {
  const db = readDB();

  const pricing = db.facePaintingPricing || {
    private: 0,
    fest: 0,
    editorial: 0
  };

  res.json({
    success: true,
    data: pricing
  });
});


app.put('/api/face-painting-pricing', (req, res) => {
  const db = readDB();

  const privatePrice = Number(req.body.private);
  const festPrice = Number(req.body.fest);
  const editorialPrice = Number(req.body.editorial);

  if (
    !Number.isFinite(privatePrice) ||
    privatePrice < 0 ||
    !Number.isFinite(festPrice) ||
    festPrice < 0 ||
    !Number.isFinite(editorialPrice) ||
    editorialPrice < 0
  ) {
    return res.status(400).json({
      success: false,
      message: 'Please enter valid prices for all face painting services.'
    });
  }

  db.facePaintingPricing = {
    private: privatePrice,
    fest: festPrice,
    editorial: editorialPrice
  };

  writeDB(db);

  res.json({
    success: true,
    data: db.facePaintingPricing,
    message: 'Face painting prices updated successfully!'
  });
});

// -------------------------------------------------------------
// POETRY & WRITINGS API
// -------------------------------------------------------------
app.get('/api/poems', (req, res) => {
  const db = readDB();
  res.json({ success: true, data: db.poems || [] });
});

app.post('/api/poems', (req, res) => {
  const db = readDB();
  const newPoem = {
    id: generateId('poem'),
    title: req.body.title || 'Untitled Verse',
    date: req.body.date || 'Recent Musings',
    excerpt: req.body.excerpt || (req.body.fullText ? req.body.fullText.substring(0, 100) + '...' : ''),
    fullText: req.body.fullText || '',
    book: req.body.book || 'Chronicles of Blush & Ink',
    theme: req.body.theme || 'Art & Life'
  };
  db.poems.unshift(newPoem);
  writeDB(db);
  res.status(201).json({ success: true, data: newPoem, message: "Poem added successfully" });
});

app.put('/api/poems/:id', (req, res) => {
  const db = readDB();
  const index = db.poems.findIndex(p => p.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ success: false, message: "Poem not found" });
  }
  db.poems[index] = {
    ...db.poems[index],
    ...req.body
  };
  writeDB(db);
  res.json({ success: true, data: db.poems[index], message: "Poem updated successfully" });
});

app.delete('/api/poems/:id', (req, res) => {
  const db = readDB();
  const index = db.poems.findIndex(p => p.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ success: false, message: "Poem not found" });
  }
  const deleted = db.poems.splice(index, 1);
  writeDB(db);
  res.json({ success: true, data: deleted[0], message: "Poem deleted" });
});

// -------------------------------------------------------------
// REVIEWS & RATINGS API
// -------------------------------------------------------------
app.get('/api/reviews', (req, res) => {
  const db = readDB();
  res.json({ success: true, data: db.reviews || [] });
});

app.post('/api/reviews', (req, res) => {
  const db = readDB();
  const newReview = {
    id: generateId('rev'),
    name: req.body.name || 'Art Enthusiast',
    role: req.body.role || 'Art Lover',
    rating: Number(req.body.rating) || 5,
    comment: req.body.comment || '',
    date: 'Just now',
    avatar: req.body.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    verified: true,
    approved: true
  };
  db.reviews.unshift(newReview);
  writeDB(db);
  res.status(201).json({ success: true, data: newReview, message: "Thank you for your lovely review! 💖" });
});

app.delete('/api/reviews/:id', (req, res) => {
  const db = readDB();
  const index = db.reviews.findIndex(r => r.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ success: false, message: "Review not found" });
  }
  const deleted = db.reviews.splice(index, 1);
  writeDB(db);
  res.json({ success: true, data: deleted[0], message: "Review deleted" });
});

// -------------------------------------------------------------
// ORDERS & CHECKOUT API
// -------------------------------------------------------------
app.get('/api/orders', (req, res) => {
  const db = readDB();
  res.json({ success: true, data: db.orders || [] });
});

app.post('/api/orders', (req, res) => {
  const db = readDB();
  const orderNum = Math.floor(1000 + Math.random() * 9000);
  const newOrder = {
    id: `ORD-${orderNum}`,
    customerName: req.body.customerName || 'Anonymous Collector',
    email: req.body.email || '',
    phone: req.body.phone || '',
    address: req.body.address || '',
    items: req.body.items || [],
    totalAmount: Number(req.body.totalAmount) || 0,
    paymentMethod: req.body.paymentMethod || 'UPI (Google Pay / PhonePe)',
    status: 'Processing',
    createdAt: new Date().toISOString()
  };
  db.orders.unshift(newOrder);
  writeDB(db);
  res.status(201).json({ success: true, data: newOrder, message: "Order placed successfully! We are preparing your artistic package with love. ✨" });
});

app.put('/api/orders/:id', (req, res) => {
  const db = readDB();
  const index = db.orders.findIndex(o => o.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ success: false, message: "Order not found" });
  }
  db.orders[index] = {
    ...db.orders[index],
    ...req.body
  };
  writeDB(db);
  res.json({ success: true, data: db.orders[index], message: "Order status updated" });
});

// -------------------------------------------------------------
// RAZORPAY PAYMENT GATEWAY API
// -------------------------------------------------------------
app.post('/api/razorpay/create-order', async (req, res) => {
  const db = readDB();
  const { amount, currency = 'INR', receipt } = req.body;
  const keyId = db.settings.razorpayKeyId;
  const keySecret = db.settings.razorpayKeySecret;

  // Amount in paise (1 INR = 100 paise)
  const amountInPaise = Math.round(Number(amount) * 100);

  if (keyId && keySecret && keyId.startsWith('rzp_')) {
    try {
      const Razorpay = require('razorpay');
      const rzp = new Razorpay({
        key_id: keyId,
        key_secret: keySecret
      });

      const options = {
        amount: amountInPaise,
        currency,
        receipt: receipt || `rcpt_${Date.now()}`
      };

      const order = await rzp.orders.create(options);
      return res.json({
        success: true,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: keyId,
        isLiveGateway: true
      });
    } catch (err) {
      console.error("Razorpay order creation error:", err);
      // Fallback to seamless simulation if live call fails
    }
  }

  // Simulated / Test Gateway Mode
  const simulatedOrderId = `order_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
  res.json({
    success: true,
    orderId: simulatedOrderId,
    amount: amountInPaise,
    currency: 'INR',
    keyId: keyId || 'rzp_test_akanksha_studio',
    isLiveGateway: false,
    message: "Using Studio Instant Gateway / Test Mode. Enter Razorpay keys in Admin Settings to activate live bank settlements."
  });
});

app.post('/api/razorpay/verify-payment', (req, res) => {
  const db = readDB();
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;
  const keySecret = db.settings.razorpayKeySecret;

  if (keySecret && razorpay_order_id && razorpay_payment_id && razorpay_signature) {
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', keySecret);
    hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const generatedSignature = hmac.digest('hex');

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: "Payment verification failed: invalid signature" });
    }
  }

  // Update matching order status in database if orderId is provided
  if (orderId) {
    const orderIndex = db.orders.findIndex(o => o.id === orderId);
    if (orderIndex !== -1) {
      db.orders[orderIndex].status = "Paid (Verified)";
      db.orders[orderIndex].paymentId = razorpay_payment_id || `pay_${Date.now()}`;
      writeDB(db);
    }
  }

  res.json({
    success: true,
    message: "Payment successfully verified! Your order is confirmed.",
    paymentId: razorpay_payment_id || `pay_sim_${Date.now()}`
  });
});


// -------------------------------------------------------------
// ADMIN AUTH & STATS API
// -------------------------------------------------------------
app.post('/api/admin/login', (req, res) => {
  const db = readDB();
  const pin = String(req.body.pin || '').trim();
  const currentPin = String(db.settings.adminPin || '1234').trim();

  if (pin === currentPin) {
    return res.json({
      success: true,
      token: 'admin_token_' + Date.now(),
      message: "Admin authenticated successfully! Welcome back, Akanksha 🌸"
    });
  }

  return res.status(401).json({
    success: false,
    message: "Invalid Admin PIN/Password. Please check your credentials."
  });
});

app.post('/api/admin/change-pin', async (req, res) => {
  try {
    const db = readDB();
    const newPin = String(req.body.newPin || '').trim();

    if (newPin.length < 3) {
      return res.status(400).json({
        success: false,
        message: "PIN/Password must be at least 3 characters long."
      });
    }

    // Update password in server memory
    db.settings = {
      ...db.settings,
      adminPin: newPin
    };

    // IMPORTANT:
    // Wait until Firestore successfully saves the new password.
    await writeDB(db);

    console.log("🔐 Admin password changed successfully.");
    console.log("☁️ New admin password saved to Firestore.");

    return res.json({
      success: true,
      message: "Admin PIN/Password changed successfully!"
    });

  } catch (error) {
    console.error("❌ Admin password change failed:", error);

    return res.status(500).json({
      success: false,
      message: "Could not save the new admin password. Please try again."
    });
  }
});


app.get('/api/admin/stats', (req, res) => {
  const db = readDB();
  const totalArtworks = (db.artworks || []).length;
  const availableArtworks = (db.artworks || []).filter(a => !a.isSold).length;
  const totalProducts = (db.products || []).length;
  const totalBookings = (db.bookings || []).length;
  const pendingBookings = (db.bookings || []).filter(b => b.status === 'Pending').length;
  const totalOrders = (db.orders || []).length;
  const totalRevenue = (db.orders || []).reduce((acc, o) => acc + (o.totalAmount || 0), 0);
  const totalReviews = (db.reviews || []).length;
  const avgRating = totalReviews > 0 ? ((db.reviews || []).reduce((acc, r) => acc + (r.rating || 5), 0) / totalReviews).toFixed(1) : "5.0";

  res.json({
    success: true,
    data: {
      totalArtworks,
      availableArtworks,
      totalProducts,
      totalBookings,
      pendingBookings,
      totalOrders,
      totalRevenue,
      totalReviews,
      avgRating
    }
  });
});

// Contact message API
app.post('/api/contact', (req, res) => {
  const { name, email, phone, message, subject } = req.body;
  console.log(`[Contact Form Received] From: ${name} (${email}, ${phone}) | Subject: ${subject} | Message: ${message}`);
  res.json({
    success: true,
    message: `Thank you, ${name || 'friend'}! Your message has been sent to Akanksha. She will get back to you within 24 hours.`
  });
});

// Fallback all non-API to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Start Server after Firebase database is loaded
initDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(
        `🌸 Akanksha Art Portfolio server running beautifully at http://localhost:${PORT}`
      );
    });
  })
  .catch((error) => {
    console.error("❌ Server could not start because Firebase failed:");
    console.error(error);
    process.exit(1);
  });