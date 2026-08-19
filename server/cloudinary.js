const cloudinary = require('cloudinary').v2;

require('dotenv').config();

console.log('Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME);
console.log('API Key:', process.env.CLOUDINARY_API_KEY);
console.log('Secret Found:', !!process.env.CLOUDINARY_API_SECRET);

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

console.log('Cloudinary Config:', cloudinary.config());

module.exports = cloudinary;