const cloudinary = require('cloudinary').v2;
require('dotenv').config();

const cloud_name = process.env.CLOUDINARY_CLOUD_NAME || 'wempi94r';
const api_key = process.env.CLOUDINARY_API_KEY || '468112237834957';
const api_secret = process.env.CLOUDINARY_API_SECRET || '1Uy1ieKLN2KvfdhODYVKKmh5hdg';

cloudinary.config({
    cloud_name,
    api_key,
    api_secret,
    secure: true
});

console.log('✅ Cloudinary configured for cloud:', cloud_name);

module.exports = cloudinary;