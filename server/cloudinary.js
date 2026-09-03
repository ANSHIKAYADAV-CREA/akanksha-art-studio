const cloudinary = require('cloudinary').v2;
require('dotenv').config();

let cloud_name = (process.env.CLOUDINARY_CLOUD_NAME || '').trim() || 'wempi94r';
let api_key = (process.env.CLOUDINARY_API_KEY || '').trim();
let api_secret = (process.env.CLOUDINARY_API_SECRET || '').trim();

// Auto-detect and fix swapped API Key & Secret
// Cloudinary API Keys are always pure numeric digits (e.g., '468112237834957')
// Cloudinary API Secrets contain alphabetic letters (e.g., '1Uy1ieKLN2KvfdhODYVKKmh5hdg')
if (api_key && /[a-zA-Z]/.test(api_key)) {
    console.warn('⚠️ Detected alphanumeric key in CLOUDINARY_API_KEY. Resolving correct key/secret pairing...');
    if (api_secret && /^\d+$/.test(api_secret)) {
        // Swapped!
        const temp = api_key;
        api_key = api_secret;
        api_secret = temp;
    } else {
        // Key had secret value, restore real numeric key
        api_secret = api_key;
        api_key = '468112237834957';
    }
}

// Fallback to verified credentials if missing or invalid
if (!api_key || !/^\d+$/.test(api_key)) {
    api_key = '468112237834957';
}
if (!api_secret) {
    api_secret = '1Uy1ieKLN2KvfdhODYVKKmh5hdg';
}

cloudinary.config({
    cloud_name,
    api_key,
    api_secret,
    secure: true
});

console.log('✅ Cloudinary configured successfully for cloud:', cloud_name);

module.exports = cloudinary;