const fs = require("fs");
const path = require("path");
const db = require("./firebase");

const DATA_FILE = path.join(__dirname, "data.json");
const BACKUP_FILE = path.join(__dirname, "data-backup.json");

let databaseCache = {
  settings: {},
  artworks: [],
  faceArts: [],
  products: [],
  bookings: [],
  poems: [],
  reviews: [],
  orders: [],
  facePaintingPricing: {
    private: 0,
    fest: 0,
    editorial: 0
  }
};

let databaseReady = false;

// Firestore collections used by the application
const COLLECTIONS = [
  "artworks",
  "faceArts",
  "products",
  "bookings",
  "poems",
  "reviews",
  "orders"
];

// Helper to write local JSON backup snapshot
function syncLocalSnapshot() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(databaseCache, null, 2), "utf8");
  } catch (err) {
    console.warn("⚠️ Could not write local data.json snapshot:", err.message);
  }
}

// -------------------------------------------------------------
// LOAD DATABASE FROM FIRESTORE & RUN AUTO-MIGRATION
// -------------------------------------------------------------
async function initDatabase() {
  try {
    console.log("🔥 Loading database from Firebase Firestore...");

    // 1. Load settings
    const settingsDoc = await db
      .collection("settings")
      .doc("main")
      .get();

    if (settingsDoc.exists) {
      databaseCache.settings = settingsDoc.data();
    } else {
      // Fallback settings if not yet created
      databaseCache.settings = {
        name: "AKAMATOE",
        tagline: "unwearied creation",
        title: "unwearied creation",
        institution: "Hindu College, University of Delhi",
        bioQuote: "A young artist driven by the desire to create a colourful canvas of life.",
        email: "akankshachandreshwar@gmail.com",
        phone: "9517155681",
        instagramPrimary: "@_akanxha",
        instagramSecondary: "@psychotichic",
        artistImage: "",
        announcement: "🌸 Welcoming Custom Commissions & Delhi NCR Face Painting Bookings for College Fests & Gatherings • Free Shipping on Art Prints Across India ✨"
      };
      await db.collection("settings").doc("main").set(databaseCache.settings);
    }

    // 2. Load face painting pricing
    const pricingDoc = await db
      .collection("settings")
      .doc("facePaintingPricing")
      .get();

    if (pricingDoc.exists) {
      databaseCache.facePaintingPricing = {
        private: Number(pricingDoc.data().private) || 2500,
        fest: Number(pricingDoc.data().fest) || 3500,
        editorial: Number(pricingDoc.data().editorial) || 4000
      };
    } else {
      databaseCache.facePaintingPricing = {
        private: 2500,
        fest: 3500,
        editorial: 4000
      };
      await db.collection("settings").doc("facePaintingPricing").set(databaseCache.facePaintingPricing);
    }

    // 3. Load all collections from Firestore
    for (const collectionName of COLLECTIONS) {
      const snapshot = await db.collection(collectionName).get();

      databaseCache[collectionName] = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      }));

      console.log(
        `   ${collectionName}: ${databaseCache[collectionName].length} records`
      );
    }

    // ---------------------------------------------------------
    // 4. AUTOMATIC MIGRATION: Separate Face Art from Artworks
    // ---------------------------------------------------------
    console.log("🔄 Checking for Face Art migration...");
    const existingFaceArtsInArtworks = databaseCache.artworks.filter(art => {
      const cat = String(art.category || "").trim().toLowerCase();
      return cat === "face art" || cat === "face painting" || cat.includes("face art");
    });

    if (existingFaceArtsInArtworks.length > 0) {
      console.log(`✨ Found ${existingFaceArtsInArtworks.length} Face Art items in artworks collection. Migrating to dedicated faceArts collection...`);

      for (const item of existingFaceArtsInArtworks) {
        const faceArtId = item.id.startsWith("faceart")
          ? item.id
          : `faceart_${item.id.replace(/^art-/, "")}`;

        const faceArtRecord = {
          id: faceArtId,
          image: item.image || "",
          publicId: item.publicId || "",
          isPublished: item.isPublished !== undefined ? Boolean(item.isPublished) : true,
          createdAt: item.createdAt || new Date().toISOString()
        };

        // Save to faceArts collection in Firestore
        await db.collection("faceArts").doc(faceArtId).set(faceArtRecord);

        // Add to in-memory faceArts if not already present
        if (!databaseCache.faceArts.some(f => f.id === faceArtId || f.image === faceArtRecord.image)) {
          databaseCache.faceArts.unshift(faceArtRecord);
        }

        // Delete migrated record from Firestore artworks collection
        await db.collection("artworks").doc(String(item.id)).delete();
        console.log(`   Migrated: ${item.id} -> ${faceArtId}`);
      }

      // Remove migrated face arts from in-memory artworks
      databaseCache.artworks = databaseCache.artworks.filter(art => {
        const cat = String(art.category || "").trim().toLowerCase();
        return !(cat === "face art" || cat === "face painting" || cat.includes("face art"));
      });
      console.log("✅ Face Art migration to dedicated collection completed!");
    }

    // Ensure all faceArts have isPublished set
    for (const fa of databaseCache.faceArts) {
      if (fa.isPublished === undefined) {
        fa.isPublished = true;
        await db.collection("faceArts").doc(String(fa.id)).set({ isPublished: true }, { merge: true });
      }
    }

    // ---------------------------------------------------------
    // 5. RESTORE MISSING NORMAL ARTWORKS, POEMS, REVIEWS FROM BACKUP
    // ---------------------------------------------------------
    let backupData = null;
    if (fs.existsSync(BACKUP_FILE)) {
      try {
        backupData = JSON.parse(fs.readFileSync(BACKUP_FILE, "utf8"));
      } catch (e) {
        console.warn("⚠️ Could not read backup file:", e.message);
      }
    }

    if (backupData) {
      // If no normal artworks exist in Firestore, seed the portfolio artworks
      if (databaseCache.artworks.length === 0 && Array.isArray(backupData.artworks) && backupData.artworks.length > 0) {
        console.log(`🎨 Seeding ${backupData.artworks.length} original normal artworks to Firestore...`);
        for (const art of backupData.artworks) {
          // Normalize artwork format
          const normalized = {
            id: art.id,
            title: art.title || "Untitled Artwork",
            category: art.category || "Canvas Paintings",
            medium: art.medium || "Acrylic on Canvas",
            dimensions: art.dimensions || "24 x 36 inches",
            year: art.year || "2025",
            price: Number(art.price) || 0,
            image: art.image || "",
            publicId: art.publicId || "",
            description: art.description || "",
            isSold: Boolean(art.isSold),
            isFeatured: Boolean(art.isFeatured)
          };
          await db.collection("artworks").doc(String(normalized.id)).set(normalized);
          databaseCache.artworks.push(normalized);
        }
        console.log("✅ Normal artworks successfully seeded to Firestore!");
      }

      // If poems are empty, seed poems
      if (databaseCache.poems.length === 0 && Array.isArray(backupData.poems) && backupData.poems.length > 0) {
        console.log(`📜 Seeding ${backupData.poems.length} poems to Firestore...`);
        for (const poem of backupData.poems) {
          await db.collection("poems").doc(String(poem.id)).set(poem);
          databaseCache.poems.push(poem);
        }
      }

      // If reviews are empty, seed reviews
      if (databaseCache.reviews.length === 0 && Array.isArray(backupData.reviews) && backupData.reviews.length > 0) {
        console.log(`⭐ Seeding ${backupData.reviews.length} reviews to Firestore...`);
        for (const rev of backupData.reviews) {
          await db.collection("reviews").doc(String(rev.id)).set(rev);
          databaseCache.reviews.push(rev);
        }
      }
    }

    // Sync snapshot to local data.json
    syncLocalSnapshot();

    databaseReady = true;
    console.log("✅ Firestore database initialized and verified successfully!");
    console.log(`   Total Artworks: ${databaseCache.artworks.length}`);
    console.log(`   Total Face Arts: ${databaseCache.faceArts.length}`);
    console.log(`   Total Products: ${databaseCache.products.length}`);
  } catch (error) {
    console.error("❌ Failed to load Firestore database:");
    console.error(error);
    throw error;
  }
}

// -------------------------------------------------------------
// READ DATABASE
// -------------------------------------------------------------
function readDB() {
  return databaseCache;
}

// -------------------------------------------------------------
// ITEM-LEVEL SAVE (Add or Update)
// -------------------------------------------------------------
async function saveItem(collectionName, item) {
  if (!item || !item.id) {
    throw new Error(`Cannot save item without id in collection ${collectionName}`);
  }

  // 1. Update in-memory cache
  if (!Array.isArray(databaseCache[collectionName])) {
    databaseCache[collectionName] = [];
  }
  const index = databaseCache[collectionName].findIndex(
    i => String(i.id) === String(item.id)
  );
  if (index !== -1) {
    databaseCache[collectionName][index] = { ...databaseCache[collectionName][index], ...item };
  } else {
    databaseCache[collectionName].unshift(item);
  }

  // 2. Persist to Firestore
  await db.collection(collectionName).doc(String(item.id)).set(item, { merge: true });

  // 3. Sync local backup
  syncLocalSnapshot();
  return item;
}

// -------------------------------------------------------------
// ITEM-LEVEL DELETE
// -------------------------------------------------------------
async function deleteItem(collectionName, itemId) {
  const idStr = String(itemId);

  // 1. Remove from in-memory cache
  if (Array.isArray(databaseCache[collectionName])) {
    databaseCache[collectionName] = databaseCache[collectionName].filter(
      i => String(i.id) !== idStr
    );
  }

  // 2. Delete from Firestore
  await db.collection(collectionName).doc(idStr).delete();

  // 3. Sync local backup
  syncLocalSnapshot();
  return true;
}

// -------------------------------------------------------------
// SAVE SETTINGS
// -------------------------------------------------------------
async function saveSettings(settings) {
  databaseCache.settings = { ...databaseCache.settings, ...settings };
  await db.collection("settings").doc("main").set(databaseCache.settings);
  syncLocalSnapshot();
  return databaseCache.settings;
}

// -------------------------------------------------------------
// SAVE FACE PAINTING PRICING
// -------------------------------------------------------------
async function saveFacePaintingPricing(pricing) {
  databaseCache.facePaintingPricing = { ...databaseCache.facePaintingPricing, ...pricing };
  await db.collection("settings").doc("facePaintingPricing").set(databaseCache.facePaintingPricing);
  syncLocalSnapshot();
  return databaseCache.facePaintingPricing;
}

// -------------------------------------------------------------
// SAFE FULL DATABASE WRITE (Backward Compatibility)
// -------------------------------------------------------------
async function writeDB(data) {
  databaseCache = data;
  syncLocalSnapshot();

  // Persist settings if present
  if (data.settings) {
    await db.collection("settings").doc("main").set(data.settings);
  }
  if (data.facePaintingPricing) {
    await db.collection("settings").doc("facePaintingPricing").set(data.facePaintingPricing);
  }

  // Persist items for each collection safely without destructive blanket delete
  for (const collectionName of COLLECTIONS) {
    const items = Array.isArray(data[collectionName]) ? data[collectionName] : [];
    if (items.length > 0) {
      for (let i = 0; i < items.length; i += 400) {
        const batch = db.batch();
        const chunk = items.slice(i, i + 400);
        for (const item of chunk) {
          if (!item.id) continue;
          const docRef = db.collection(collectionName).doc(String(item.id));
          batch.set(docRef, item, { merge: true });
        }
        await batch.commit();
      }
    }
  }

  return true;
}

// -------------------------------------------------------------
// DATABASE STATUS
// -------------------------------------------------------------
function isDatabaseReady() {
  return databaseReady;
}

module.exports = {
  readDB,
  writeDB,
  saveItem,
  deleteItem,
  saveSettings,
  saveFacePaintingPricing,
  initDatabase,
  isDatabaseReady
};