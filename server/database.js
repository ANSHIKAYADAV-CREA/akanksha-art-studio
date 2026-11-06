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

// Helper to load snapshot from local disk immediately
function loadFromLocalSnapshot() {
  let loaded = false;
  if (fs.existsSync(DATA_FILE)) {
    try {
      const raw = fs.readFileSync(DATA_FILE, "utf8");
      const parsed = JSON.parse(raw);
      databaseCache = {
        ...databaseCache,
        ...parsed,
        settings: { ...(databaseCache.settings || {}), ...(parsed.settings || {}) },
        facePaintingPricing: { ...(databaseCache.facePaintingPricing || {}), ...(parsed.facePaintingPricing || {}) }
      };
      console.log("📁 Loaded database snapshot from data.json");
      loaded = true;
    } catch (e) {
      console.warn("⚠️ Could not read data.json:", e.message);
    }
  }

  if (!loaded && fs.existsSync(BACKUP_FILE)) {
    try {
      const raw = fs.readFileSync(BACKUP_FILE, "utf8");
      const parsed = JSON.parse(raw);
      databaseCache = { ...databaseCache, ...parsed };
      console.log("📁 Loaded fallback database snapshot from data-backup.json");
      loaded = true;
    } catch (e) {
      console.warn("⚠️ Could not read data-backup.json:", e.message);
    }
  }

  return loaded;
}

// -------------------------------------------------------------
// LOAD DATABASE FROM FIRESTORE & RUN AUTO-MIGRATION
// -------------------------------------------------------------
async function loadAllFromFirestore() {
  if (!db) return;

  // 1. Load settings
  const settingsDoc = await db
    .collection("settings")
    .doc("main")
    .get();

  if (settingsDoc.exists) {
    databaseCache.settings = settingsDoc.data();
  } else {
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
      artistImage: "https://res.cloudinary.com/wempi94r/image/upload/v1788366558/akanksha-art-studio/spmgiyneusf3wopgn0in.jpg",
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

  // 4. AUTOMATIC MIGRATION: Separate Face Art from Artworks
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

      await db.collection("faceArts").doc(faceArtId).set(faceArtRecord);

      if (!databaseCache.faceArts.some(f => f.id === faceArtId || f.image === faceArtRecord.image)) {
        databaseCache.faceArts.unshift(faceArtRecord);
      }

      await db.collection("artworks").doc(String(item.id)).delete();
    }

    databaseCache.artworks = databaseCache.artworks.filter(art => {
      const cat = String(art.category || "").trim().toLowerCase();
      return !(cat === "face art" || cat === "face painting" || cat.includes("face art"));
    });
    console.log("✅ Face Art migration to dedicated collection completed!");
  }

  for (const fa of databaseCache.faceArts) {
    if (fa.isPublished === undefined) {
      fa.isPublished = true;
      await db.collection("faceArts").doc(String(fa.id)).set({ isPublished: true }, { merge: true });
    }
  }

  // 5. RESTORE MISSING NORMAL ARTWORKS, POEMS, REVIEWS FROM BACKUP IF EMPTY
  let backupData = null;
  if (fs.existsSync(BACKUP_FILE)) {
    try {
      backupData = JSON.parse(fs.readFileSync(BACKUP_FILE, "utf8"));
    } catch (e) {
      console.warn("⚠️ Could not read backup file:", e.message);
    }
  }

  if (backupData) {
    if (databaseCache.artworks.length === 0 && Array.isArray(backupData.artworks) && backupData.artworks.length > 0) {
      for (const art of backupData.artworks) {
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
    }

    if (databaseCache.poems.length === 0 && Array.isArray(backupData.poems) && backupData.poems.length > 0) {
      for (const poem of backupData.poems) {
        await db.collection("poems").doc(String(poem.id)).set(poem);
        databaseCache.poems.push(poem);
      }
    }

    if (databaseCache.reviews.length === 0 && Array.isArray(backupData.reviews) && backupData.reviews.length > 0) {
      for (const rev of backupData.reviews) {
        await db.collection("reviews").doc(String(rev.id)).set(rev);
        databaseCache.reviews.push(rev);
      }
    }
  }

  syncLocalSnapshot();
}

async function initDatabase() {
  // 1. Immediately hydrate memory cache from local disk
  loadFromLocalSnapshot();

  if (!db) {
    console.log("ℹ️ Running in Local File Mode (Firestore not initialized or offline).");
    databaseReady = true;
    return;
  }

  try {
    console.log("🔥 Connecting to Firebase Firestore (with 3.5s timeout)...");
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Firestore connection timed out")), 3500)
    );

    await Promise.race([
      loadAllFromFirestore(),
      timeoutPromise
    ]);

    databaseReady = true;
    console.log("✅ Firestore database initialized and verified successfully!");
    console.log(`   Total Artworks: ${databaseCache.artworks.length}`);
    console.log(`   Total Face Arts: ${databaseCache.faceArts.length}`);
    console.log(`   Total Products: ${databaseCache.products.length}`);
  } catch (error) {
    console.warn("⚠️ Firestore load note:", error.message);
    console.log("🛡️ Falling back to cached local snapshot to ensure uninterrupted service.");
    databaseReady = true;
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

  // 2. Persist to Firestore if available
  if (db) {
    try {
      await db.collection(collectionName).doc(String(item.id)).set(item, { merge: true });
    } catch (err) {
      console.warn(`⚠️ Could not sync item ${item.id} to Firestore (${err.message}). Local snapshot saved.`);
    }
  }

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

  // 2. Delete from Firestore if available
  if (db) {
    try {
      await db.collection(collectionName).doc(idStr).delete();
    } catch (err) {
      console.warn(`⚠️ Could not delete item ${idStr} from Firestore (${err.message}). Local snapshot updated.`);
    }
  }

  // 3. Sync local backup
  syncLocalSnapshot();
  return true;
}

// -------------------------------------------------------------
// SAVE SETTINGS
// -------------------------------------------------------------
async function saveSettings(settings) {
  databaseCache.settings = { ...databaseCache.settings, ...settings };
  if (db) {
    try {
      await db.collection("settings").doc("main").set(databaseCache.settings);
    } catch (err) {
      console.warn(`⚠️ Could not sync settings to Firestore (${err.message}). Local snapshot saved.`);
    }
  }
  syncLocalSnapshot();
  return databaseCache.settings;
}

// -------------------------------------------------------------
// SAVE FACE PAINTING PRICING
// -------------------------------------------------------------
async function saveFacePaintingPricing(pricing) {
  databaseCache.facePaintingPricing = { ...databaseCache.facePaintingPricing, ...pricing };
  if (db) {
    try {
      await db.collection("settings").doc("facePaintingPricing").set(databaseCache.facePaintingPricing);
    } catch (err) {
      console.warn(`⚠️ Could not sync pricing to Firestore (${err.message}). Local snapshot saved.`);
    }
  }
  syncLocalSnapshot();
  return databaseCache.facePaintingPricing;
}

// -------------------------------------------------------------
// SAFE FULL DATABASE WRITE (Backward Compatibility)
// -------------------------------------------------------------
async function writeDB(data) {
  databaseCache = data;
  syncLocalSnapshot();

  if (db) {
    try {
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
    } catch (err) {
      console.warn(`⚠️ Full database write to Firestore encountered error: ${err.message}. Local snapshot preserved.`);
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