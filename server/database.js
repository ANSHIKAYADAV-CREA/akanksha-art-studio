const db = require("./firebase");

let databaseCache = {
  settings: {},
  artworks: [],
  products: [],
  bookings: [],
  poems: [],
  reviews: [],
  orders: []
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
  // Update local memory immediately
  databaseCache = data;

  // Save changes to Firestore in background
  saveDatabaseToFirestore(data).catch(error => {
    console.error("❌ Firestore save error:");
    console.error(error);
  });

  return true;
}

// -------------------------------------------------------------
// SAVE DATABASE TO FIRESTORE
// -------------------------------------------------------------
async function saveDatabaseToFirestore(data) {
  // Save settings
  if (data.settings) {
    await db
      .collection("settings")
      .doc("main")
      .set(data.settings);
  }

  // Save all collection data
  for (const collectionName of COLLECTIONS) {
    const items = Array.isArray(data[collectionName])
      ? data[collectionName]
      : [];

    /*
     * Firestore batch writes have a 500-operation limit.
     * We therefore process the data in chunks.
     */
    for (let i = 0; i < items.length; i += 400) {
      const batch = db.batch();
      const chunk = items.slice(i, i + 400);

      for (const item of chunk) {
        if (!item.id) continue;

        const docRef = db
          .collection(collectionName)
          .doc(String(item.id));

        batch.set(docRef, item);
      }

      await batch.commit();
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