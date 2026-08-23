const db = require("./firebase");

let databaseCache = {
  settings: {},
  artworks: [],
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
  "products",
  "bookings",
  "poems",
  "reviews",
  "orders"
];

// -------------------------------------------------------------
// LOAD DATABASE FROM FIRESTORE
// -------------------------------------------------------------
async function initDatabase() {
  try {
    console.log("🔥 Loading database from Firebase Firestore...");

    // Load settings
    const settingsDoc = await db
      .collection("settings")
      .doc("main")
      .get();

    if (settingsDoc.exists) {
      databaseCache.settings = settingsDoc.data();
    }

    // Load face painting pricing
    const pricingDoc = await db
      .collection("settings")
      .doc("facePaintingPricing")
      .get();

    if (pricingDoc.exists) {
      databaseCache.facePaintingPricing = {
        private: Number(pricingDoc.data().private) || 0,
        fest: Number(pricingDoc.data().fest) || 0,
        editorial: Number(pricingDoc.data().editorial) || 0
      };
    }

    // Load all collections
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

    databaseReady = true;

    console.log("✅ Firestore database loaded successfully!");
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
// WRITE DATABASE
// -------------------------------------------------------------
function writeDB(data) {
  databaseCache = data;

  return saveDatabaseToFirestore(data);
}

// -------------------------------------------------------------
// SAVE DATABASE TO FIRESTORE
// -------------------------------------------------------------
async function saveDatabaseToFirestore(data) {
  // ---------------------------------------------------------
  // SAVE SETTINGS
  // ---------------------------------------------------------
  if (data.settings) {
    await db
      .collection("settings")
      .doc("main")
      .set(data.settings);
  }
  // Save face painting pricing
  if (data.facePaintingPricing) {
    await db
      .collection("settings")
      .doc("facePaintingPricing")
      .set({
        private: Number(data.facePaintingPricing.private) || 0,
        fest: Number(data.facePaintingPricing.fest) || 0,
        editorial: Number(data.facePaintingPricing.editorial) || 0
      });
  }
  // ---------------------------------------------------------
  // SYNC ALL COLLECTIONS
  // ---------------------------------------------------------
  for (const collectionName of COLLECTIONS) {
    const items = Array.isArray(data[collectionName])
      ? data[collectionName]
      : [];

    const collectionRef = db.collection(collectionName);

    // Get everything currently stored in Firestore
    const existingSnapshot = await collectionRef.get();

    // IDs that should exist after synchronization
    const currentIds = new Set(
      items
        .filter(item => item.id)
        .map(item => String(item.id))
    );

    // -------------------------------------------------------
    // DELETE DOCUMENTS THAT NO LONGER EXIST
    // -------------------------------------------------------
    const deleteBatch = db.batch();
    let deleteCount = 0;

    existingSnapshot.docs.forEach(doc => {
      if (!currentIds.has(doc.id)) {
        deleteBatch.delete(doc.ref);
        deleteCount++;
      }
    });

    if (deleteCount > 0) {
      await deleteBatch.commit();

      console.log(
        `🗑️ Firestore: deleted ${deleteCount} old ${collectionName} record(s)`
      );
    }

    // -------------------------------------------------------
    // SAVE / UPDATE CURRENT DOCUMENTS
    // -------------------------------------------------------
    for (let i = 0; i < items.length; i += 400) {
      const batch = db.batch();
      const chunk = items.slice(i, i + 400);

      for (const item of chunk) {
        if (!item.id) continue;

        const docRef = collectionRef.doc(String(item.id));

        batch.set(docRef, item);
      }

      if (chunk.length > 0) {
        await batch.commit();
      }
    }
  }

  console.log("☁️ Database changes saved to Firestore.");
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
  initDatabase,
  isDatabaseReady
};