const fs = require("fs");
const path = require("path");
const db = require("./firebase");

// Existing local database
const DATA_FILE = path.join(__dirname, "data.json");

// Firestore collections we want to migrate
const COLLECTIONS = [
    "artworks",
    "products",
    "bookings",
    "poems",
    "reviews",
    "orders"
];

async function migrateCollection(collectionName, items) {
    if (!Array.isArray(items)) {
        console.log(`⚠️ ${collectionName}: no array found, skipping.`);
        return 0;
    }

    let count = 0;

    for (const item of items) {
        if (!item.id) {
            console.log(`⚠️ ${collectionName}: item without ID skipped.`);
            continue;
        }

        await db
            .collection(collectionName)
            .doc(String(item.id))
            .set(item);

        count++;
    }

    console.log(`✅ ${collectionName}: ${count} documents migrated.`);
    return count;
}

async function migrateSettings(settings) {
    if (!settings || typeof settings !== "object") {
        console.log("⚠️ settings: no settings object found, skipping.");
        return;
    }

    await db
        .collection("settings")
        .doc("main")
        .set(settings);

    console.log("✅ settings: migrated successfully.");
}

async function migrate() {
    try {
        console.log("🚀 Starting Firestore migration...");
        console.log("----------------------------------------");

        if (!fs.existsSync(DATA_FILE)) {
            throw new Error(`data.json not found at: ${DATA_FILE}`);
        }

        const rawData = fs.readFileSync(DATA_FILE, "utf8");
        const data = JSON.parse(rawData);

        console.log("📦 Local data.json loaded successfully.");
        console.log("");

        // Migrate settings
        await migrateSettings(data.settings);

        // Migrate collections
        let total = 0;

        for (const collectionName of COLLECTIONS) {
            const migrated = await migrateCollection(
                collectionName,
                data[collectionName]
            );

            total += migrated;
        }

        console.log("");
        console.log("----------------------------------------");
        console.log("🎉 MIGRATION COMPLETED SUCCESSFULLY!");
        console.log(`📊 Total documents migrated: ${total}`);
        console.log("----------------------------------------");
        console.log("");
        console.log("⚠️ IMPORTANT:");
        console.log("Your original data.json has NOT been deleted.");
        console.log("Your data-backup.json has NOT been deleted.");
        console.log("You can now verify the data in Firebase Console.");

    } catch (error) {
        console.error("");
        console.error("❌ MIGRATION FAILED");
        console.error("----------------------------------------");
        console.error(error);
        console.error("----------------------------------------");
        process.exitCode = 1;
    }
}

migrate();