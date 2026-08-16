# 🚀 Deployment Guide: Akanksha's Art Studio & E-Commerce Website

Your website is **100% production-ready** and can be deployed in under 2 minutes using any of the following options:

---

## Option 1: Deploy with Firebase Hosting (Recommended for Firebase)

### Step 1: Install Firebase CLI
In your terminal, log in to Firebase:
```bash
npx firebase-tools login
```

### Step 2: Initialize & Connect Project
```bash
npx firebase-tools init
```
- Select **Hosting** and **Firestore**
- Choose your existing Firebase Project or create a new one
- Set public directory to `public`
- Configure as single-page app: `Yes`

### Step 3: Deploy
```bash
npx firebase-tools deploy
```
Your website will be live at `https://<YOUR_PROJECT_ID>.web.app`! 🎉

---

## Option 2: 1-Click Free Deploy with Render.com (Full-Stack Backend + Auto-Persistence)

1. Push your folder to a GitHub repository:
   ```bash
   git init
   git add .
   git commit -m "Akanksha Art Portfolio"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<repo-name>.git
   git push -u origin main
   ```
2. Go to **[render.com](https://render.com)** ➔ Click **New Web Service**.
3. Select your GitHub repository.
4. Render will auto-detect settings:
   - **Build Command**: `npm install`
   - **Start Command**: `node server/server.js`
5. Click **Deploy Web Service**! You'll get a free live `https://your-app.onrender.com` URL!

---

## Option 3: 1-Click Free Deploy with Vercel

1. Install Vercel CLI or link with GitHub:
   ```bash
   npx vercel
   ```
2. Follow the 3-step prompt to deploy instantly with free SSL and custom domain support!

---

## 🗄️ Where is Data Stored?

1. **Current Live Setup (Active Right Now)**:
   - All artworks, face painting bookings, store orders, customer reviews, poems, and bio settings are stored in **`server/data.json`** via the Express REST API backend.
   - Any changes made in the Admin Dashboard (PIN `1234`) are immediately saved to disk and persist across restarts.

2. **Cloud Firestore Integration**:
   - Ready-to-use config is set up in `public/js/firebase-config.js` and `firestore.rules`.
   - Once you paste your Firebase keys in `firebase-config.js`, all data can seamlessly sync to Google Cloud Firestore collections!
