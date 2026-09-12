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
  const { adminPin, ...publicSettings } = db.settings || {};
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
    const { adminPin, ...publicSettings } = updated;
    res.json({ success: true, data: publicSettings, message: "Settings updated successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to update settings", error: err.message });
  }
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
app.get('/api/orders', (req, res) => {
  const db = readDB();
  res.json({ success: true, data: db.orders || [] });
});

app.post('/api/orders', async (req, res) => {
  try {
    const orderNum = Math.floor(1000 + Math.random() * 9000);
    const paymentMethod = req.body.paymentMethod || 'Cash on Delivery (COD)';
    const isCOD = paymentMethod.toLowerCase().includes('cash');

    // Determine payment status: Paid, To Pay, or Not Yet
    let paymentStatus = req.body.paymentStatus;
    if (!paymentStatus) {
      if (isCOD) {
        paymentStatus = 'To Pay';
      } else if (req.body.paymentVerified || paymentMethod.includes('Razorpay')) {
        paymentStatus = 'Paid';
      } else {
        paymentStatus = 'Not Yet';
      }
    }

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
      status: req.body.status || 'Processing',
      notes: req.body.notes || '',
      paymentDetails: req.body.paymentDetails || {},
      createdAt: new Date().toISOString()
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
    const db = readDB();
    const existing = (db.orders || []).find(o => o.id === req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }
    const updated = {
      ...existing,
      ...req.body
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
    const id = req.params.id;
    await deleteItem('orders', id);
    res.json({ success: true, message: "Order deleted successfully" });
  } catch (error) {
    console.error("Order delete error:", error);
    res.status(500).json({ success: false, message: "Failed to delete order", error: error.message });
  }
});

// -------------------------------------------------------------
// RAZORPAY PAYMENT GATEWAY API
// -------------------------------------------------------------
app.post('/api/razorpay/create-order', async (req, res) => {
  const db = readDB();
  const { amount, currency = 'INR', receipt } = req.body;
  const keyId = db.settings?.razorpayKeyId ? db.settings.razorpayKeyId.trim() : '';
  const keySecret = db.settings?.razorpayKeySecret ? db.settings.razorpayKeySecret.trim() : '';

  // Amount in paise (1 INR = 100 paise)
  const amountInPaise = Math.round(Number(amount) * 100);

  if (keyId && keySecret && (keyId.startsWith('rzp_test_') || keyId.startsWith('rzp_live_'))) {
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
      return res.json({
        success: false,
        isLiveGateway: false,
        message: "Razorpay order creation failed: " + (err.error?.description || err.message || "Invalid API keys"),
        error: err.message
      });
    }
  }

  // If no valid live/test Razorpay keys are configured, fallback cleanly to direct studio payment mode
  res.json({
    success: true,
    isLiveGateway: false,
    keyId: '',
    message: "No live Razorpay keys configured. Using Studio Direct UPI / Order placement mode."
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
    const newPin = String(req.body.newPin || '').trim();

    if (newPin.length < 3) {
      return res.status(400).json({
        success: false,
        message: "PIN/Password must be at least 3 characters long."
      });
    }

    // Read current database
    const database = await readDB();

    // Update admin password
    database.settings = {
      ...(database.settings || {}),
      adminPin: newPin
    };

    // Save updated database to Firestore
    await writeDB(database);

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
