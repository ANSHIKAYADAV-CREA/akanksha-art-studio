const express = require('express');
const cors = require('cors');
const path = require('path');
const {
  readDB,
  writeDB,
  saveItem,
  deleteItem,
  saveSettings,
  saveFacePaintingPricing,
  initDatabase,
  isDatabaseReady
} = require('./database');

const cloudinary = require('./cloudinary');
const upload = require('./upload');

const app = express();
const PORT = process.env.PORT || 3000;



// Middleware
app.use(cors());
app.use(express.json({
  limit: '10mb',
  verify: (req, res, buf) => {
    // Preserve raw buffer for cryptographic webhook signature verification
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Helper to securely retrieve Razorpay configuration from env vars or database settings
function getRazorpayConfig() {
  const db = readDB();
  const keyId = (process.env.RAZORPAY_KEY_ID || db.settings?.razorpayKeyId || '').trim();
  const keySecret = (process.env.RAZORPAY_KEY_SECRET || db.settings?.razorpayKeySecret || '').trim();
  const webhookSecret = (process.env.RAZORPAY_WEBHOOK_SECRET || db.settings?.razorpayWebhookSecret || '').trim();
  return { keyId, keySecret, webhookSecret };
}

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
  // Never expose admin credentials, key secrets, or webhook secrets in public settings API
  const { adminPin, razorpayKeySecret, razorpayWebhookSecret, ...publicSettings } = db.settings || {};
  res.json({ success: true, data: publicSettings });
});

app.put('/api/settings', async (req, res) => {
  try {
    const db = readDB();
    const updated = {
      ...(db.settings || {}),
      ...req.body
    };
    await saveSettings(updated);
    const { adminPin, razorpayKeySecret, razorpayWebhookSecret, ...publicSettings } = updated;
    res.json({ success: true, data: publicSettings, message: "Settings updated successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to update settings", error: err.message });
  }
});

// -------------------------------------------------------------
// CLOUDINARY UTILITY & IMAGE UPLOAD API
// -------------------------------------------------------------
function extractCloudinaryPublicId(urlOrId) {
  if (!urlOrId || typeof urlOrId !== 'string') return null;
  const str = urlOrId.trim();
  if (str.includes('res.cloudinary.com')) {
    try {
      const uploadMarker = '/upload/';
      const uploadIndex = str.indexOf(uploadMarker);
      if (uploadIndex !== -1) {
        let cloudinaryPath = str.substring(uploadIndex + uploadMarker.length);
        cloudinaryPath = cloudinaryPath.replace(/^v\d+\//, '');
        cloudinaryPath = cloudinaryPath.replace(/\.[^/.]+$/, '');
        return cloudinaryPath;
      }
    } catch (e) {
      return null;
    }
  }
  if (!str.startsWith('http') && (str.includes('akanksha-art-studio') || (!str.includes('/') && str.length > 5))) {
    return str;
  }
  return null;
}

app.post('/api/upload-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    console.log('📸 Upload request received:', {
      file: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    });

    const dataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

    const result = await cloudinary.uploader.upload(dataUri, {
      folder: 'akanksha-art-studio',
      resource_type: 'auto'
    });

    console.log('✅ CLOUDINARY UPLOAD SUCCESS:', result.secure_url);

    res.status(200).json({
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      message: 'Image uploaded successfully to Cloudinary'
    });

  } catch (error) {
    console.error('❌ CLOUDINARY UPLOAD FAILED:', error);

    res.status(500).json({
      success: false,
      message: 'Image upload failed: ' + (error.message || 'Unknown error'),
      error: error.message || String(error)
    });
  }
});
// -------------------------------------------------------------
// ARTWORKS API (Normal Artworks / Canvas Paintings)
// -------------------------------------------------------------
app.get('/api/artworks', (req, res) => {
  const db = readDB();
  const artworks = (db.artworks || []).filter(artwork => {
    const category = String(artwork.category || '').trim().toLowerCase();
    return !(
      category === 'face art' ||
      category === 'face painting' ||
      category.includes('face art')
    );
  });
  res.json({ success: true, data: artworks });
});

app.post('/api/artworks', async (req, res) => {
  try {
    const {
      title,
      category,
      medium,
      dimensions,
      year,
      price,
      image,
      publicId,
      description,
      isSold,
      isFeatured
    } = req.body;

    if (!image) {
      return res.status(400).json({
        success: false,
        message: 'Artwork image is required.'
      });
    }

    const newArtwork = {
      id: generateId('art'),
      title: title ? String(title).trim() : 'Untitled Artwork',
      category: category || 'Canvas Paintings',
      medium: medium || 'Acrylic on Canvas',
      dimensions: dimensions || '24 x 36 inches',
      year: year ? String(year) : new Date().getFullYear().toString(),
      price: Number(price) || 0,
      image: image,
      publicId: publicId || '',
      description: description ? String(description).trim() : '',
      isSold: Boolean(isSold),
      isFeatured: Boolean(isFeatured)
    };

    await saveItem('artworks', newArtwork);
    console.log('🎨 Artwork saved to database:', newArtwork.id, newArtwork.title);

    res.status(201).json({
      success: true,
      data: newArtwork,
      message: 'Artwork added successfully'
    });
  } catch (err) {
    console.error('❌ Add artwork error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to add artwork',
      error: err.message
    });
  }
});

app.put('/api/artworks/:id', async (req, res) => {
  try {
    const db = readDB();
    const existing = (db.artworks || []).find(a => a.id === req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Artwork not found' });
    }

    const updated = {
      ...existing,
      ...req.body,
      price: req.body.price !== undefined ? Number(req.body.price) : existing.price,
      isSold: req.body.isSold !== undefined ? Boolean(req.body.isSold) : existing.isSold,
      isFeatured: req.body.isFeatured !== undefined ? Boolean(req.body.isFeatured) : existing.isFeatured
    };

    await saveItem('artworks', updated);
    res.json({ success: true, data: updated, message: 'Artwork updated successfully' });
  } catch (err) {
    console.error('❌ Update artwork error:', err);
    res.status(500).json({ success: false, message: 'Failed to update artwork', error: err.message });
  }
});

app.delete('/api/artworks/:id', async (req, res) => {
  try {
    const db = readDB();
    const index = (db.artworks || []).findIndex(a => a.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({
        success: false,
        message: 'Artwork not found'
      });
    }

    const artwork = db.artworks[index];

    // Extract Cloudinary public ID if available
    let publicId = artwork.publicId || '';
    if (!publicId && artwork.image && artwork.image.includes('res.cloudinary.com')) {
      try {
        const uploadMarker = '/upload/';
        const uploadIndex = artwork.image.indexOf(uploadMarker);
        if (uploadIndex !== -1) {
          let cloudinaryPath = artwork.image.substring(uploadIndex + uploadMarker.length);
          cloudinaryPath = cloudinaryPath.replace(/^v\d+\//, '');
          cloudinaryPath = cloudinaryPath.replace(/\.[^/.]+$/, '');
          publicId = cloudinaryPath;
        }
      } catch (extractError) {
        console.warn('⚠️ Could not extract Cloudinary public ID:', extractError.message);
      }
    }

    if (publicId) {
      try {
        console.log('☁️ Deleting artwork image from Cloudinary:', publicId);
        await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
      } catch (cloudinaryError) {
        console.warn('⚠️ Cloudinary delete warning:', cloudinaryError.message);
      }
    }

    await deleteItem('artworks', req.params.id);
    console.log('🗑️ Artwork permanently deleted:', artwork.id);

    res.json({
      success: true,
      data: artwork,
      message: 'Artwork deleted successfully'
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
// FACE ART GALLERY API (Dedicated Image Showcase)
// -------------------------------------------------------------

// Public: Only returns published face arts (pure image showcase)
app.get('/api/face-arts', (req, res) => {
  const db = readDB();
  const faceArts = (db.faceArts || [])
    .filter(item => item.isPublished !== false && item.image)
    .map(item => ({
      id: item.id,
      image: item.image
    }));

  res.json({ success: true, data: faceArts });
});

// Admin: Returns all face arts with internal/publication metadata
app.get('/api/admin/face-arts', (req, res) => {
  const db = readDB();
  res.json({ success: true, data: db.faceArts || [] });
});

// Admin: Upload new face art record
app.post('/api/face-arts', async (req, res) => {
  try {
    const { image, publicId, isPublished } = req.body;

    if (!image) {
      return res.status(400).json({
        success: false,
        message: 'Face art image is required.'
      });
    }

    const newFaceArt = {
      id: generateId('faceart'),
      image: String(image).trim(),
      publicId: publicId ? String(publicId).trim() : '',
      isPublished: isPublished !== undefined ? Boolean(isPublished) : true,
      createdAt: new Date().toISOString()
    };

    await saveItem('faceArts', newFaceArt);
    console.log('✨ Face Art record saved:', newFaceArt.id);

    res.status(201).json({
      success: true,
      data: newFaceArt,
      message: 'Face art uploaded successfully'
    });
  } catch (error) {
    console.error('❌ Save face art error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save face art',
      error: error.message
    });
  }
});

// Admin: Toggle publish status or update face art
app.put('/api/face-arts/:id', async (req, res) => {
  try {
    const db = readDB();
    const existing = (db.faceArts || []).find(f => f.id === req.params.id);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Face art not found'
      });
    }

    const updated = {
      ...existing,
      isPublished: req.body.isPublished !== undefined ? Boolean(req.body.isPublished) : existing.isPublished
    };

    await saveItem('faceArts', updated);
    console.log(`✨ Face art ${updated.id} publish status changed to:`, updated.isPublished);

    res.json({
      success: true,
      data: updated,
      message: `Face art ${updated.isPublished ? 'published on' : 'hidden from'} public website`
    });
  } catch (error) {
    console.error('❌ Update face art error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update face art',
      error: error.message
    });
  }
});

// Admin: Delete face art and delete its Cloudinary image
app.delete('/api/face-arts/:id', async (req, res) => {
  try {
    const db = readDB();
    const faceArt = (db.faceArts || []).find(f => f.id === req.params.id);

    if (!faceArt) {
      return res.status(404).json({
        success: false,
        message: 'Face art not found'
      });
    }

    // Extract Cloudinary public ID if available
    let publicId = faceArt.publicId || '';
    if (!publicId && faceArt.image && faceArt.image.includes('res.cloudinary.com')) {
      try {
        const uploadMarker = '/upload/';
        const uploadIndex = faceArt.image.indexOf(uploadMarker);
        if (uploadIndex !== -1) {
          let cloudinaryPath = faceArt.image.substring(uploadIndex + uploadMarker.length);
          cloudinaryPath = cloudinaryPath.replace(/^v\d+\//, '');
          cloudinaryPath = cloudinaryPath.replace(/\.[^/.]+$/, '');
          publicId = cloudinaryPath;
        }
      } catch (extractError) {
        console.warn('⚠️ Could not extract Cloudinary public ID for face art:', extractError.message);
      }
    }

    if (publicId) {
      try {
        console.log('☁️ Deleting Face Art image from Cloudinary:', publicId);
        await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
      } catch (cloudinaryError) {
        console.warn('⚠️ Cloudinary delete warning for face art:', cloudinaryError.message);
      }
    }

    await deleteItem('faceArts', req.params.id);
    console.log('🗑️ Face Art permanently deleted:', faceArt.id);

    res.json({
      success: true,
      data: faceArt,
      message: 'Face art deleted successfully'
    });
  } catch (error) {
    console.error('❌ Delete face art error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete face art',
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

app.post('/api/products', async (req, res) => {
  try {
    const { title, category, price, originalPrice, stock, image, publicId, description, tag, rating } = req.body;

    if (!image) {
      return res.status(400).json({ success: false, message: 'Product image is required.' });
    }

    const newProduct = {
      id: generateId('prod'),
      title: title ? String(title).trim() : 'New Aesthetic Artifact',
      category: category || 'Wearable Art',
      price: Number(price) || 0,
      originalPrice: Number(originalPrice) || Number(price) || 0,
      stock: Number(stock) || 10,
      image: image,
      publicId: publicId || '',
      description: description || '',
      tag: tag || 'New',
      rating: Number(rating) || 5.0,
      createdAt: new Date().toISOString()
    };

    await saveItem('products', newProduct);
    console.log('✅ Product saved to Firebase Firestore & cache:', newProduct.id, newProduct.title);
    res.status(201).json({ success: true, data: newProduct, message: "Product created successfully" });
  } catch (err) {
    console.error('❌ Product creation error:', err);
    res.status(500).json({ success: false, message: 'Failed to create product', error: err.message });
  }
});

app.put('/api/products/:id', async (req, res) => {
  try {
    const db = readDB();
    const existing = (db.products || []).find(p => String(p.id) === String(req.params.id));
    if (!existing) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }
    const updated = {
      ...existing,
      ...req.body,
      price: req.body.price !== undefined ? Number(req.body.price) : existing.price,
      stock: req.body.stock !== undefined ? Number(req.body.stock) : existing.stock
    };
    await saveItem('products', updated);
    res.json({ success: true, data: updated, message: "Product updated successfully" });
  } catch (err) {
    console.error('❌ Product update error:', err);
    res.status(500).json({ success: false, message: 'Failed to update product', error: err.message });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    const db = readDB();
    const product = (db.products || []).find(p => String(p.id) === String(req.params.id));

    // Try deleting Cloudinary image if it belongs to Cloudinary
    let publicId = (product && product.publicId) || '';
    if (!publicId && product && product.image && product.image.includes('res.cloudinary.com')) {
      try {
        const uploadMarker = '/upload/';
        const uploadIndex = product.image.indexOf(uploadMarker);
        if (uploadIndex !== -1) {
          let cloudinaryPath = product.image.substring(uploadIndex + uploadMarker.length);
          cloudinaryPath = cloudinaryPath.replace(/^v\d+\//, '');
          cloudinaryPath = cloudinaryPath.replace(/\.[^/.]+$/, '');
          publicId = cloudinaryPath;
        }
      } catch (extractError) {
        console.warn('⚠️ Could not extract Cloudinary public ID:', extractError.message);
      }
    }

    if (publicId && !publicId.includes('unsplash')) {
      try {
        console.log('☁️ Deleting product image from Cloudinary:', publicId);
        await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
      } catch (cErr) {
        console.warn('⚠️ Cloudinary image delete notice (continuing database delete):', cErr.message);
      }
    }

    // Unconditionally delete from Firebase Firestore & local database
    await deleteItem('products', req.params.id);
    console.log('🗑️ Product permanently deleted from Firebase & local cache:', req.params.id);

    res.json({
      success: true,
      message: 'Product deleted successfully from Firestore and Cloudinary'
    });
  } catch (error) {
    console.error('❌ Product delete error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete product', error: error.message });
  }
});


// -------------------------------------------------------------
// FACE PAINTING BOOKINGS API (NO PRICING REQUIRED)
// -------------------------------------------------------------
app.get('/api/bookings', (req, res) => {
  const db = readDB();
  res.json({ success: true, data: db.bookings || [] });
});

app.post('/api/bookings', async (req, res) => {
  try {
    const shortNum = Math.floor(1000 + Math.random() * 9000);
    const newBooking = {
      id: `BK-${shortNum}`,
      clientName: req.body.clientName || 'Anonymous',
      clientEmail: req.body.clientEmail || '',
      clientPhone: req.body.clientPhone || '',
      eventType: req.body.eventType || 'College Fest / Cultural Event',
      eventDate: req.body.eventDate || new Date().toISOString().split('T')[0],
      timeSlot: req.body.timeSlot || 'Afternoon (2:00 PM - 5:00 PM)',
      guestCount: Number(req.body.guestCount) || 20,
      location: req.body.location || 'Delhi University / Delhi NCR',
      notes: req.body.notes || '',
      status: 'Pending',
      createdAt: new Date().toISOString()
    };
    await saveItem('bookings', newBooking);
    res.status(201).json({
      success: true,
      data: newBooking,
      message: "Booking request submitted successfully! Akanksha will review and confirm shortly. 🌸"
    });
  } catch (err) {
    console.error("Booking creation error:", err);
    res.status(500).json({ success: false, message: "Failed to submit booking", error: err.message });
  }
});

app.put('/api/bookings/:id', async (req, res) => {
  try {
    const db = readDB();
    const existing = (db.bookings || []).find(b => b.id === req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }
    const updated = {
      ...existing,
      ...req.body
    };
    await saveItem('bookings', updated);
    res.json({ success: true, data: updated, message: "Booking status updated successfully" });
  } catch (err) {
    console.error("Booking update error:", err);
    res.status(500).json({ success: false, message: "Failed to update booking", error: err.message });
  }
});

app.delete('/api/bookings/:id', async (req, res) => {
  try {
    const id = req.params.id;
    await deleteItem('bookings', id);
    res.json({ success: true, message: "Booking deleted successfully" });
  } catch (err) {
    console.error("Booking delete error:", err);
    res.status(500).json({ success: false, message: "Failed to delete booking", error: err.message });
  }
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
// List orders: full details with customer PII for Admin; sanitized public summary for non-admin
app.get('/api/orders', (req, res) => {
  const authHeader = req.headers.authorization || '';
  const pinHeader = req.headers['x-admin-pin'] || req.query?.pin || '';
  const db = readDB();
  const currentPin = String(db.settings?.adminPin || 'alright@12').trim();

  const isAuthorized = (authHeader.startsWith('Bearer ') && authHeader.length > 10) || (pinHeader === currentPin);
  if (isAuthorized) {
    return res.json({ success: true, data: db.orders || [] });
  }

  // Security: redact customer PII (phone, email, delivery address, private notes) for unauthenticated queries
  const sanitizedOrders = (db.orders || []).map(o => ({
    id: o.id,
    status: o.status,
    paymentStatus: o.paymentStatus,
    paymentMethod: o.paymentMethod,
    paymentId: o.paymentId,
    paymentVerifiedAt: o.paymentVerifiedAt,
    settlementStatus: o.settlementStatus,
    settlementReference: o.settlementReference,
    totalAmount: o.totalAmount,
    createdAt: o.createdAt
  }));

  res.json({ success: true, data: sanitizedOrders, sanitized: true });
});

// Single order safe lookup (for customer order confirmation & tracking)
app.get('/api/orders/:id', (req, res) => {
  const db = readDB();
  const order = (db.orders || []).find(o => String(o.id) === String(req.params.id));
  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }

  const authHeader = req.headers.authorization || '';
  const pinHeader = req.headers['x-admin-pin'] || req.query?.pin || '';
  const currentPin = String(db.settings?.adminPin || 'alright@12').trim();
  const isAdmin = (authHeader.startsWith('Bearer ') && authHeader.length > 10) || (pinHeader === currentPin);

  if (isAdmin) {
    return res.json({ success: true, data: order });
  }

  // Safe sanitized order representation for customer confirmation screen
  const safeOrder = {
    id: order.id,
    customerName: order.customerName,
    items: order.items,
    totalAmount: order.totalAmount,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    paymentId: order.paymentId,
    status: order.status,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt
  };
  res.json({ success: true, data: safeOrder });
});

app.post('/api/orders', async (req, res) => {
  try {
    const orderNum = Math.floor(1000 + Math.random() * 9000);
    const paymentMethod = req.body.paymentMethod || 'Cash on Delivery (COD)';
    const isCOD = paymentMethod.toLowerCase().includes('cash');

    // Determine initial payment and settlement status securely
    // Online orders ALWAYS start as Pending until cryptographically verified server-side or via webhook
    const paymentStatus = isCOD ? 'To Pay' : 'Pending';
    const settlementStatus = isCOD ? 'N/A (Cash on Delivery)' : 'Pending';

    const newOrder = {
      id: `ORD-${orderNum}`,
      customerName: req.body.customerName || 'Anonymous Collector',
      email: req.body.email || '',
      phone: req.body.phone || '',
      address: req.body.address || '',
      items: Array.isArray(req.body.items) ? req.body.items : [],
      totalAmount: Number(req.body.totalAmount) || 0,
      paymentMethod: paymentMethod,
      paymentStatus: paymentStatus,
      paymentId: req.body.paymentId || null,
      razorpayOrderId: req.body.razorpayOrderId || null,
      paymentVerifiedAt: null,
      settlementStatus: settlementStatus,
      settlementId: null,
      settlementReference: null,
      settlementProcessedAt: null,
      bankCreditConfirmedAt: null,
      status: req.body.status || 'Processing',
      notes: req.body.notes || '',
      paymentDetails: req.body.paymentDetails || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await saveItem('orders', newOrder);
    res.status(201).json({
      success: true,
      data: newOrder,
      message: "Order placed successfully! We are preparing your artistic package with love. ✨"
    });
  } catch (error) {
    console.error("Order placement error:", error);
    res.status(500).json({ success: false, message: "Failed to place order", error: error.message });
  }
});

app.put('/api/orders/:id', async (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    const pinHeader = req.headers['x-admin-pin'] || req.body?.pin || '';
    const db = readDB();
    const currentPin = String(db.settings?.adminPin || '1234').trim();

    const isAuthorized = (authHeader.startsWith('Bearer ') && authHeader.length > 10) || (pinHeader === currentPin);
    if (!isAuthorized) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized. Admin credentials required to modify orders.'
      });
    }

    const existing = (db.orders || []).find(o => o.id === req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    // Protect paymentStatus and settlementStatus from manual manipulation.
    // Verified payment and bank settlement statuses are strictly driven by cryptographic server verification and Razorpay webhooks.
    const allowedUpdates = { ...req.body };
    delete allowedUpdates.paymentStatus;
    delete allowedUpdates.settlementStatus;
    delete allowedUpdates.paymentId;
    delete allowedUpdates.razorpayOrderId;
    delete allowedUpdates.paymentVerifiedAt;
    delete allowedUpdates.settlementId;
    delete allowedUpdates.settlementReference;
    delete allowedUpdates.settlementProcessedAt;
    delete allowedUpdates.bankCreditConfirmedAt;

    const updated = {
      ...existing,
      ...allowedUpdates,
      updatedAt: new Date().toISOString()
    };
    await saveItem('orders', updated);
    res.json({ success: true, data: updated, message: "Order status updated" });
  } catch (error) {
    console.error("Order update error:", error);
    res.status(500).json({ success: false, message: "Failed to update order", error: error.message });
  }
});

app.delete('/api/orders/:id', async (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    const pinHeader = req.headers['x-admin-pin'] || req.body?.pin || '';
    const db = readDB();
    const currentPin = String(db.settings?.adminPin || '1234').trim();

    const isAuthorized = (authHeader.startsWith('Bearer ') && authHeader.length > 10) || (pinHeader === currentPin);
    if (!isAuthorized) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized. Admin credentials required to delete orders.'
      });
    }

    const id = req.params.id;
    const existing = (db.orders || []).find(o => String(o.id) === String(id));
    if (!existing) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    // Set of catalog/website images to protect from deletion (e.g. original paintings or store stock)
    const catalogImages = new Set();
    (db.artworks || []).forEach(a => { if (a.image) catalogImages.add(a.image); });
    (db.products || []).forEach(p => { if (p.image) catalogImages.add(p.image); });
    (db.faceArts || []).forEach(f => { if (f.image) catalogImages.add(f.image); });
    if (db.settings?.artistImage) catalogImages.add(db.settings.artistImage);
    if (db.settings?.bookingFeatureImage) catalogImages.add(db.settings.bookingFeatureImage);

    // Collect all potential Cloudinary public IDs associated with this order
    const publicIdsToDelete = new Set();

    const candidateUrls = [
      existing.image,
      existing.imageUrl,
      existing.referenceImage,
      existing.referencePhoto,
      existing.customImage,
      existing.receipt,
      existing.receiptUrl,
      existing.proof,
      existing.proofUrl,
      existing.paymentProof,
      existing.paymentDetails?.receiptUrl,
      existing.paymentDetails?.proofUrl,
      existing.paymentDetails?.image
    ];

    if (Array.isArray(existing.attachments)) {
      candidateUrls.push(...existing.attachments);
    }

    // Direct publicIds
    if (existing.publicId) publicIdsToDelete.add(existing.publicId);
    if (existing.public_id) publicIdsToDelete.add(existing.public_id);
    if (Array.isArray(existing.publicIds)) {
      existing.publicIds.forEach(pid => publicIdsToDelete.add(pid));
    }

    // Inspect candidate URLs (skipping inventory artwork images)
    candidateUrls.forEach(url => {
      if (url && typeof url === 'string' && !catalogImages.has(url)) {
        const pid = extractCloudinaryPublicId(url);
        if (pid) publicIdsToDelete.add(pid);
      }
    });

    // Custom order item attachments
    if (Array.isArray(existing.items)) {
      existing.items.forEach(item => {
        const itemUrls = [
          item.referenceImage,
          item.customImage,
          item.uploadedImage,
          item.customPhoto
        ];
        if (item.publicId && !item.isCatalogItem) {
          publicIdsToDelete.add(item.publicId);
        }
        itemUrls.forEach(url => {
          if (url && typeof url === 'string' && !catalogImages.has(url)) {
            const pid = extractCloudinaryPublicId(url);
            if (pid) publicIdsToDelete.add(pid);
          }
        });
      });
    }

    // Clean up order assets from Cloudinary
    for (const pid of publicIdsToDelete) {
      try {
        console.log(`☁️ Deleting order asset from Cloudinary: ${pid}`);
        await cloudinary.uploader.destroy(pid, { resource_type: 'image' });
      } catch (cErr) {
        console.warn(`⚠️ Cloudinary order asset delete warning (${pid}):`, cErr.message);
      }
    }

    // Delete permanently from Database (Firestore + In-Memory Cache + Local JSON Backup)
    await deleteItem('orders', id);
    console.log(`🗑️ Order ${id} permanently deleted from Database & Cloudinary`);

    res.json({
      success: true,
      data: existing,
      deletedCloudinaryAssets: Array.from(publicIdsToDelete),
      message: "Order deleted successfully from database and Cloudinary"
    });
  } catch (error) {
    console.error("Order delete error:", error);
    res.status(500).json({ success: false, message: "Failed to delete order", error: error.message });
  }
});

// -------------------------------------------------------------
// RAZORPAY PAYMENT GATEWAY & BANK SETTLEMENT API
// -------------------------------------------------------------
const processedWebhookEvents = new Set();

app.get('/api/razorpay/status', (req, res) => {
  const { keyId, keySecret, webhookSecret } = getRazorpayConfig();
  const isConnected = !!(keyId && keySecret);
  res.json({
    success: true,
    connected: isConnected,
    keyId: keyId, // Public Key ID required for client checkout modal
    webhookConfigured: !!webhookSecret,
    mode: isConnected
      ? (keyId.startsWith('rzp_live_') ? 'Razorpay Live Production' : 'Razorpay Test Mode')
      : 'Direct UPI / COD Active'
  });
});

app.post('/api/razorpay/create-order', async (req, res) => {
  try {
    const { amount, currency = 'INR', receipt, orderId } = req.body;
    const { keyId, keySecret } = getRazorpayConfig();

    const amountInPaise = Math.round(Number(amount || 0) * 100);
    if (!amountInPaise || amountInPaise <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid payment amount specified.' });
    }

    if (keyId && keySecret) {
      try {
        const Razorpay = require('razorpay');
        const rzp = new Razorpay({ key_id: keyId, key_secret: keySecret });
        const options = {
          amount: amountInPaise,
          currency,
          receipt: receipt || (orderId ? `rcpt_${orderId}` : `rcpt_${Date.now()}`),
          notes: {
            orderId: orderId || ''
          }
        };

        const razorpayOrder = await rzp.orders.create(options);
        return res.json({
          success: true,
          orderId: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          keyId: keyId,
          isLiveGateway: true
        });
      } catch (err) {
        console.warn('Razorpay SDK order creation notice:', err?.error?.description || err.message);
        const automatedOrderId = `order_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
        return res.json({
          success: true,
          orderId: automatedOrderId,
          amount: amountInPaise,
          currency,
          keyId: keyId,
          isLiveGateway: false,
          warning: err?.error?.description || err.message
        });
      }
    }

    // Fallback automated order identifier if keys are not yet configured on environment
    const automatedOrderId = `order_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
    return res.json({
      success: true,
      orderId: automatedOrderId,
      amount: amountInPaise,
      currency,
      keyId: keyId || 'rzp_test_TVDislMsHzA1OV',
      isLiveGateway: false,
      message: 'Razorpay configured in simulation mode. Configure RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET for live transactions.'
    });
  } catch (error) {
    console.error('Razorpay create-order route error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/razorpay/verify-payment', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;
    const { keyId, keySecret } = getRazorpayConfig();

    if (!razorpay_order_id || !razorpay_payment_id) {
      return res.status(400).json({
        success: false,
        message: 'Missing required Razorpay payment identification parameters.'
      });
    }

    // 1. Verify payment signature securely using server-side Razorpay Key Secret
    if (keySecret) {
      if (!razorpay_signature) {
        return res.status(400).json({
          success: false,
          message: 'Missing Razorpay payment signature.'
        });
      }

      const crypto = require('crypto');
      const hmac = crypto.createHmac('sha256', keySecret);
      hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
      const generatedSignature = hmac.digest('hex');

      if (generatedSignature !== razorpay_signature) {
        console.error(`❌ Razorpay signature mismatch! Expected: ${generatedSignature}, Received: ${razorpay_signature}`);
        return res.status(400).json({
          success: false,
          message: 'Payment verification failed: Invalid cryptographic signature.'
        });
      }
    } else {
      if (keyId && keyId.startsWith('rzp_live_')) {
        return res.status(500).json({
          success: false,
          message: 'Security error: Live Razorpay payments strictly require RAZORPAY_KEY_SECRET on the server.'
        });
      }
      console.warn('⚠️ RAZORPAY_KEY_SECRET not set; running in test/simulation verification mode.');
    }

    // 2. Fetch payment details directly from Razorpay API when available
    let fetchedPayment = null;
    if (keyId && keySecret) {
      try {
        const Razorpay = require('razorpay');
        const rzp = new Razorpay({ key_id: keyId, key_secret: keySecret });
        fetchedPayment = await rzp.payments.fetch(razorpay_payment_id);
        if (fetchedPayment && fetchedPayment.status !== 'captured' && fetchedPayment.status !== 'authorized') {
          return res.status(400).json({
            success: false,
            message: `Razorpay payment status is "${fetchedPayment.status}", which is not captured.`
          });
        }
      } catch (fetchErr) {
        console.warn('⚠️ Razorpay payment API fetch notice (signature is valid):', fetchErr.message);
      }
    }

    // 3. Find and update order in Firestore database
    const db = readDB();
    let updatedOrder = null;

    if (orderId) {
      const existing = (db.orders || []).find(o => String(o.id) === String(orderId));
      if (existing) {
        const verifiedTime = existing.paymentVerifiedAt || new Date().toISOString();
        const settlementStatus = existing.settlementStatus && existing.settlementStatus !== 'Pending'
          ? existing.settlementStatus
          : (fetchedPayment?.settlement_id ? 'Settled to Bank' : 'Pending');

        updatedOrder = {
          ...existing,
          status: 'Confirmed',
          paymentStatus: 'Paid',
          paymentId: razorpay_payment_id,
          razorpayOrderId: razorpay_order_id,
          paymentVerifiedAt: verifiedTime,
          settlementStatus: settlementStatus,
          settlementId: existing.settlementId || fetchedPayment?.settlement_id || null,
          settlementReference: existing.settlementReference || fetchedPayment?.settlement_id || null,
          settlementProcessedAt: existing.settlementProcessedAt || null,
          bankCreditConfirmedAt: existing.bankCreditConfirmedAt || null,
          paymentDetails: {
            ...(existing.paymentDetails || {}),
            razorpay_payment_id: razorpay_payment_id,
            razorpay_order_id: razorpay_order_id,
            method: fetchedPayment?.method || existing.paymentMethod || 'Razorpay Gateway',
            verifiedAt: verifiedTime
          },
          updatedAt: new Date().toISOString()
        };

        await saveItem('orders', updatedOrder);
        console.log(`✅ Order ${orderId} successfully verified & updated in Firestore.`);
      }
    }

    return res.json({
      success: true,
      message: 'Payment successfully verified! Your order is confirmed. ✓',
      paymentId: razorpay_payment_id,
      razorpayOrderId: razorpay_order_id,
      paymentStatus: 'Paid',
      data: updatedOrder,
      order: updatedOrder
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Payment verification failed: ' + error.message
    });
  }
});

// Record customer payment failure / cancellation without creating duplicate orders
app.post('/api/razorpay/record-failure', async (req, res) => {
  try {
    const { orderId, reason, paymentDetails } = req.body;
    if (!orderId) {
      return res.status(400).json({ success: false, message: 'Missing orderId' });
    }
    const db = readDB();
    const existing = (db.orders || []).find(o => String(o.id) === String(orderId));
    if (existing) {
      // Never overwrite an already paid order with a failure
      if (existing.paymentStatus === 'Paid') {
        return res.json({ success: true, message: 'Order is already marked Paid', data: existing });
      }

      const updated = {
        ...existing,
        paymentStatus: 'Failed',
        status: 'Payment Failed',
        notes: `${existing.notes || ''} [Payment Failed: ${reason || 'Transaction declined or cancelled'}]`.trim(),
        paymentDetails: {
          ...(existing.paymentDetails || {}),
          ...(paymentDetails || {}),
          failedAt: new Date().toISOString(),
          failureReason: reason || 'Transaction declined or closed'
        },
        updatedAt: new Date().toISOString()
      };
      await saveItem('orders', updated);
      return res.json({ success: true, message: 'Payment failure logged safely', data: updated });
    }
    res.status(404).json({ success: false, message: 'Order not found' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// RAZORPAY WEBHOOK HANDLER
// Processes payment.captured, payment.failed, order.paid, and settlement.processed idempotently
app.post('/api/razorpay/webhook', async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const eventId = req.headers['x-razorpay-event-id'] || req.body?.event_id || signature;
    const { webhookSecret, keyId, keySecret } = getRazorpayConfig();

    if (!webhookSecret) {
      console.warn('⚠️ Webhook received but RAZORPAY_WEBHOOK_SECRET is not configured on server.');
      return res.status(400).json({ success: false, message: 'Webhook secret not configured on server' });
    }

    if (!signature) {
      console.error('❌ Razorpay webhook missing signature header');
      return res.status(400).json({ success: false, message: 'Missing x-razorpay-signature header' });
    }

    // Cryptographic HMAC SHA-256 verification using exact raw body buffer
    const crypto = require('crypto');
    const rawBodyBuffer = req.rawBody || Buffer.from(JSON.stringify(req.body));
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBodyBuffer)
      .digest('hex');

    if (expectedSignature !== signature) {
      console.error('❌ Invalid Razorpay webhook signature rejected.');
      return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
    }

    // Idempotent deduplication check
    if (eventId && processedWebhookEvents.has(eventId)) {
      console.log(`ℹ️ Duplicate webhook event ${eventId} received, skipping duplicate processing.`);
      return res.status(200).json({ status: 'ok', message: 'Event already processed', duplicate: true });
    }
    if (eventId) {
      processedWebhookEvents.add(eventId);
      if (processedWebhookEvents.size > 2000) {
        const first = processedWebhookEvents.values().next().value;
        processedWebhookEvents.delete(first);
      }
    }

    const event = req.body.event;
    console.log(`🔔 Razorpay Verified Webhook Event: "${event}"`);
    const db = readDB();

    // 1. Payment Captured or Order Paid
    if (event === 'payment.captured' || event === 'order.paid') {
      const paymentEntity = req.body.payload?.payment?.entity;
      const orderEntity = req.body.payload?.order?.entity;
      const paymentId = paymentEntity?.id;
      const razorpayOrderId = paymentEntity?.order_id || orderEntity?.id;
      const orderIdNote = paymentEntity?.notes?.orderId || orderEntity?.notes?.orderId;

      const order = (db.orders || []).find(o =>
        (orderIdNote && o.id === orderIdNote) ||
        (razorpayOrderId && (o.razorpayOrderId === razorpayOrderId || o.paymentDetails?.razorpay_order_id === razorpayOrderId)) ||
        (paymentId && (o.paymentId === paymentId || o.paymentDetails?.razorpay_payment_id === paymentId))
      );

      if (order) {
        const updated = {
          ...order,
          status: 'Confirmed',
          paymentStatus: 'Paid',
          paymentId: paymentId || order.paymentId,
          razorpayOrderId: razorpayOrderId || order.razorpayOrderId,
          paymentVerifiedAt: order.paymentVerifiedAt || new Date().toISOString(),
          settlementStatus: order.settlementStatus || 'Pending',
          paymentDetails: {
            ...(order.paymentDetails || {}),
            razorpay_payment_id: paymentId || order.paymentId,
            razorpay_order_id: razorpayOrderId || order.razorpayOrderId,
            verifiedAt: order.paymentVerifiedAt || new Date().toISOString(),
            method: paymentEntity?.method || order.paymentDetails?.method || 'Razorpay Gateway'
          },
          updatedAt: new Date().toISOString()
        };
        await saveItem('orders', updated);
        console.log(`✅ Webhook verified & updated Order ${order.id} to Paid ✓`);
      }
    }

    // 2. Payment Failed
    else if (event === 'payment.failed') {
      const paymentEntity = req.body.payload?.payment?.entity;
      const paymentId = paymentEntity?.id;
      const razorpayOrderId = paymentEntity?.order_id;
      const orderIdNote = paymentEntity?.notes?.orderId;

      const order = (db.orders || []).find(o =>
        (orderIdNote && o.id === orderIdNote) ||
        (razorpayOrderId && (o.razorpayOrderId === razorpayOrderId || o.paymentDetails?.razorpay_order_id === razorpayOrderId))
      );

      if (order && order.paymentStatus !== 'Paid') {
        const updated = {
          ...order,
          status: 'Payment Failed',
          paymentStatus: 'Failed',
          paymentId: paymentId || order.paymentId,
          paymentDetails: {
            ...(order.paymentDetails || {}),
            failureCode: paymentEntity?.error_code,
            failureReason: paymentEntity?.error_description,
            failedAt: new Date().toISOString()
          },
          updatedAt: new Date().toISOString()
        };
        await saveItem('orders', updated);
        console.log(`⚠️ Webhook recorded failed payment for Order ${order.id}`);
      }
    }

    // 3. Bank Settlement Processed
    else if (event === 'settlement.processed') {
      const settlementEntity = req.body.payload?.settlement?.entity;
      if (settlementEntity) {
        const settlementId = settlementEntity.id;
        const utr = settlementEntity.utr || null;
        const processedAt = settlementEntity.created_at
          ? new Date(settlementEntity.created_at * 1000).toISOString()
          : new Date().toISOString();

        console.log(`🏦 Webhook received bank settlement event: ${settlementId}, UTR: ${utr}`);

        // Reconcile matching paid orders with Razorpay API
        let reconciled = false;
        if (keyId && keySecret) {
          try {
            const Razorpay = require('razorpay');
            const rzp = new Razorpay({ key_id: keyId, key_secret: keySecret });
            for (const order of (db.orders || [])) {
              if (order.paymentStatus === 'Paid' && order.paymentId && order.settlementStatus !== 'Settled to Bank') {
                try {
                  const p = await rzp.payments.fetch(order.paymentId);
                  if (p && p.settlement_id === settlementId) {
                    order.settlementStatus = 'Settled to Bank';
                    order.settlementId = settlementId;
                    order.settlementReference = utr || settlementId;
                    order.settlementProcessedAt = processedAt;
                    order.bankCreditConfirmedAt = utr ? processedAt : null;
                    order.updatedAt = new Date().toISOString();
                    await saveItem('orders', order);
                    reconciled = true;
                    console.log(`🏦 Order ${order.id} verified as settled to bank with UTR: ${utr || settlementId}`);
                  }
                } catch (pErr) {
                  console.warn(`Could not fetch payment ${order.paymentId}:`, pErr.message);
                }
              }
            }
          } catch (rErr) {
            console.warn('Razorpay settlement reconciliation notice:', rErr.message);
          }
        }

        // If direct reconciliation could not match specific payment, mark orders explicitly linked to settlement
        if (!reconciled) {
          for (const order of (db.orders || [])) {
            if (order.settlementId === settlementId && order.settlementStatus !== 'Settled to Bank') {
              order.settlementStatus = 'Settled to Bank';
              order.settlementReference = utr || settlementId;
              order.settlementProcessedAt = processedAt;
              order.bankCreditConfirmedAt = utr ? processedAt : null;
              order.updatedAt = new Date().toISOString();
              await saveItem('orders', order);
            }
          }
        }
      }
    }

    // 4. Refund Processed
    else if (event === 'refund.processed') {
      const refundEntity = req.body.payload?.refund?.entity;
      const paymentId = refundEntity?.payment_id;
      if (paymentId) {
        const order = (db.orders || []).find(o => o.paymentId === paymentId);
        if (order) {
          order.settlementStatus = 'Failed or Reversed';
          order.status = 'Refunded';
          order.updatedAt = new Date().toISOString();
          await saveItem('orders', order);
          console.log(`⚠️ Order ${order.id} updated to Reversed due to refund.`);
        }
      }
    }

    return res.status(200).json({ status: 'ok', event: event });
  } catch (err) {
    console.error('❌ Webhook processing error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// AUTHENTICATED SETTLEMENT RECONCILIATION ROUTE (For Owner Dashboard)
app.post('/api/razorpay/sync-settlements', async (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    const pinHeader = req.headers['x-admin-pin'] || req.body?.pin || '';
    const db = readDB();
    const currentPin = String(db.settings?.adminPin || '1234').trim();

    const isAuthorized = (authHeader.startsWith('Bearer ') && authHeader.length > 10) || (pinHeader === currentPin);
    if (!isAuthorized) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized. Admin credentials required to sync settlements.'
      });
    }

    const { keyId, keySecret } = getRazorpayConfig();
    if (!keyId || !keySecret) {
      return res.json({
        success: false,
        message: 'Razorpay API keys not configured in environment or settings. Settlement sync requires live/test keys.'
      });
    }

    const Razorpay = require('razorpay');
    const rzp = new Razorpay({ key_id: keyId, key_secret: keySecret });

    const orders = db.orders || [];
    let updatedCount = 0;
    const syncedOrders = [];

    for (const order of orders) {
      if (order.paymentStatus === 'Paid' && order.paymentId && order.paymentId.startsWith('pay_')) {
        try {
          const payment = await rzp.payments.fetch(order.paymentId);
          if (payment) {
            let changed = false;

            // When Razorpay has processed settlement to bank account
            if (payment.settlement_id && order.settlementStatus !== 'Settled to Bank') {
              order.settlementStatus = 'Settled to Bank';
              order.settlementId = payment.settlement_id;
              order.settlementReference = payment.settlement_id;
              order.settlementProcessedAt = payment.settled_at
                ? new Date(payment.settled_at * 1000).toISOString()
                : new Date().toISOString();
              order.bankCreditConfirmedAt = new Date().toISOString();
              order.updatedAt = new Date().toISOString();
              changed = true;
            } else if (!order.settlementStatus) {
              order.settlementStatus = 'Pending';
              changed = true;
            }

            if (changed) {
              await saveItem('orders', order);
              updatedCount++;
              syncedOrders.push({ id: order.id, settlementStatus: order.settlementStatus, settlementId: order.settlementId });
            }
          }
        } catch (fetchErr) {
          console.warn(`Could not check payment ${order.paymentId} during settlement sync:`, fetchErr.message);
        }
      }
    }

    return res.json({
      success: true,
      message: updatedCount > 0
        ? `Successfully synced ${updatedCount} orders with Razorpay settlement records.`
        : 'All orders are already up to date with Razorpay settlement records.',
      updatedCount,
      syncedOrders
    });
  } catch (error) {
    console.error('Settlement sync error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});


// -------------------------------------------------------------
// ADMIN AUTH & STATS API
// -------------------------------------------------------------
app.post('/api/admin/login', async (req, res) => {
  try {
    const pin = String(req.body.pin || '').trim();

    if (!pin) {
      return res.status(400).json({
        success: false,
        message: "Please enter the Admin PIN/Password."
      });
    }

    // Read the latest settings from Firestore/database
    const database = await readDB();

    const currentPin = String(
      database.settings?.adminPin || '1234'
    ).trim();

    if (currentPin && pin === currentPin) {
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

  } catch (error) {
    console.error("❌ Admin login error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to verify Admin password."
    });
  }
});
app.post('/api/admin/change-pin', async (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    const pinHeader = req.headers['x-admin-pin'] || req.body?.oldPin || req.body?.currentPin || '';
    const db = readDB();
    const currentPin = String(db.settings?.adminPin || '1234').trim();

    const isAuthorized = (authHeader.startsWith('Bearer ') && authHeader.length > 10) || (pinHeader === currentPin);
    if (!isAuthorized) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized. Current admin credentials required to change PIN.'
      });
    }

    const newPin = String(req.body.newPin || '').trim();

    if (newPin.length < 3) {
      return res.status(400).json({
        success: false,
        message: "PIN/Password must be at least 3 characters long."
      });
    }

    // Update admin password
    const updated = {
      ...(db.settings || {}),
      adminPin: newPin
    };

    // Save updated settings to Firestore & local snapshot
    await saveSettings(updated);

    console.log("✅ Admin password successfully updated.");

    return res.json({
      success: true,
      message: "Admin password changed successfully."
    });

  } catch (error) {
    console.error("❌ Failed to change admin password:");
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Could not change admin password."
    });
  }
});


app.get('/api/admin/stats', (req, res) => {
  const db = readDB();
  const totalArtworks = (db.artworks || []).length;
  const availableArtworks = (db.artworks || []).filter(a => !a.isSold).length;
  const totalFaceArts = (db.faceArts || []).length;
  const publishedFaceArts = (db.faceArts || []).filter(f => f.isPublished !== false).length;
  const totalProducts = (db.products || []).length;
  const orders = db.orders || [];
  const totalOrders = orders.length;
  const paidOrders = orders.filter(o => o.paymentStatus === 'Paid').length;
  const toPayOrders = orders.filter(o => o.paymentStatus === 'To Pay' || (!o.paymentStatus && o.paymentMethod && o.paymentMethod.toLowerCase().includes('cash'))).length;
  const notYetOrders = orders.filter(o => o.paymentStatus === 'Not Yet' || (!o.paymentStatus && (!o.paymentMethod || !o.paymentMethod.toLowerCase().includes('cash')))).length;
  const issueOrders = orders.filter(o => o.paymentStatus === 'Issue').length;
  const totalRevenue = orders.filter(o => o.paymentStatus === 'Paid').reduce((acc, o) => acc + (Number(o.totalAmount) || 0), 0);
  const pendingRevenue = orders.filter(o => o.paymentStatus !== 'Paid').reduce((acc, o) => acc + (Number(o.totalAmount) || 0), 0);
  const totalBookings = (db.bookings || []).length;
  const pendingBookings = (db.bookings || []).filter(b => !b.status || b.status === 'Pending').length;
  const totalReviews = (db.reviews || []).length;
  const avgRating = totalReviews > 0 ? ((db.reviews || []).reduce((acc, r) => acc + (r.rating || 5), 0) / totalReviews).toFixed(1) : "5.0";

  res.json({
    success: true,
    data: {
      totalArtworks,
      availableArtworks,
      totalFaceArts,
      publishedFaceArts,
      totalProducts,
      totalBookings,
      pendingBookings,
      totalOrders,
      paidOrders,
      toPayOrders,
      notYetOrders,
      issueOrders,
      totalRevenue,
      pendingRevenue,
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

// Dedicated Studio Admin Landing & Management Suite
app.get(['/admin', '/admin.html'], (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'admin.html'));
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
