require("dotenv").config();

const cloudinary = require("./server/cloudinary");

const filePath =
    "C:\\Users\\shahe\\Pictures\\Screenshots\\Screenshot 2026-08-18 203814.png";

console.log("Cloud:", cloudinary.config().cloud_name);
console.log("API Key:", cloudinary.config().api_key);
console.log("Secret:", !!cloudinary.config().api_secret);

cloudinary.uploader.upload(
    filePath,
    {
        folder: "akanksha-test"
    },
    (error, result) => {
        if (error) {
            console.log("\n========== CLOUDINARY ERROR ==========");
            console.log("Message:", error.message);
            console.log("HTTP Code:", error.http_code);
            console.log("Name:", error.name);
            console.log("Headers:", error.http_headers);
            console.log("Full error:", error);
            console.log("======================================");
            return;
        }

        console.log("\n========== UPLOAD SUCCESS ==========");
        console.log("URL:", result.secure_url);
        console.log("Public ID:", result.public_id);
        console.log("====================================");
    }
);