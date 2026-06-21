# 🗄️ Wanderlust — Database Setup Guide

## Overview

This project uses **MongoDB Atlas** (cloud-hosted MongoDB) as its database.  
The backend connects via **Mongoose** (an ODM for MongoDB + Node.js).

---

## Step 1 — Create a MongoDB Atlas Account

1. Go to **[https://www.mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)**
2. Click **"Try Free"** and sign up (free tier is sufficient)
3. Create an **Organization** and a **Project** (name it `Wanderlust`)

---

## Step 2 — Create a Free Cluster

1. Inside your project, click **"Create"**
2. Choose **"M0 Free Tier"** (shared, free forever)
3. Pick your preferred cloud provider and region (e.g. AWS / Mumbai)
4. Click **"Create Cluster"** — takes ~2 minutes

---

## Step 3 — Create a Database User

1. In the left sidebar, click **"Database Access"**
2. Click **"+ Add New Database User"**
3. Choose **"Password"** authentication method
4. Enter a **Username** and **Password** (save these!)
5. Under "Built-in Role", select **"Read and write to any database"**
6. Click **"Add User"**

---

## Step 4 — Whitelist Your IP Address

1. In the left sidebar, click **"Network Access"**
2. Click **"+ Add IP Address"**
3. For development: click **"Allow Access from Anywhere"** (`0.0.0.0/0`)
4. Click **"Confirm"**

> ⚠️ For production, restrict to your server's actual IP address.

---

## Step 5 — Get Your Connection String

1. Go to **"Database"** in the left sidebar
2. Click **"Connect"** on your cluster
3. Choose **"Connect your application"**
4. Driver: **Node.js**, Version: **5.5 or later**
5. Copy the connection string — it looks like:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

---

## Step 6 — Configure the `.env` File

Open `backend/.env` and fill in your values:

```env
# ── Server ──────────────────────────────────────────────
PORT=5000
NODE_ENV=development

# ── MongoDB Atlas ────────────────────────────────────────
# Replace <username>, <password>, and the cluster URL with yours
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/wanderlust?retryWrites=true&w=majority&appName=Cluster0

# ── JWT Secrets (CHANGE THESE!) ──────────────────────────
# Generate strong secrets with:
#   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=your_super_long_random_secret_here_min_64_chars
JWT_REFRESH_SECRET=another_completely_different_random_secret_here

# ── Client URL ───────────────────────────────────────────
CLIENT_URL=http://localhost:5000

# ── Email (for forgot-password emails) ───────────────────
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password   # NOT your Gmail login password!
EMAIL_FROM=Wanderlust <your_email@gmail.com>

# ── Google AI (Gemini) ───────────────────────────────────
# Free key at: https://makersuite.google.com/app/apikey
GEMINI_API_KEY=your_gemini_api_key_here
```

> 🔑 **Gmail App Password**: Go to `Google Account → Security → 2-Step Verification → App Passwords`. Create one for "Mail" and paste it as `EMAIL_PASS`.

---

## Step 7 — Install Dependencies & Start

```bash
# Navigate to the backend folder
cd backend

# Install all dependencies
npm install

# Start the server (development mode with auto-restart)
npm run dev
```

✅ You should see:
```
✅ MongoDB Connected: cluster0.xxxxx.mongodb.net
✅ Gemini AI initialized.
✅ Wanderlust v2.0 running → http://localhost:5000
```

---

## Step 8 — Seed the Database (First Time Only)

This populates your database with sample **destinations** and **packages**:

```bash
# Make sure you're inside the backend/ folder
cd backend

# Run the seed script
npm run seed
```

✅ You should see:
```
✅ Connected to MongoDB
🗑️  Cleared existing data
✅ Seeded 10 destinations
✅ Seeded 3 packages
🎉 Database seeded successfully! Restart your server.
```

Then restart the server:
```bash
npm run dev
```

---

## Step 9 — Create an Admin User

After seeding, register a normal account at `http://localhost:5000/auth.html`, then manually upgrade it to admin in MongoDB Atlas:

1. Go to Atlas → **Collections**
2. Select the **`users`** collection
3. Find your user document
4. Click the **edit (pencil)** icon
5. Change `"role": "user"` → `"role": "admin"`
6. Click **Update**

Now you can access `http://localhost:5000/admin/index.html`

---

## Database Structure (Collections)

| Collection     | Purpose                                    |
|----------------|--------------------------------------------|
| `users`        | User accounts, roles, loyalty points       |
| `packages`     | Travel packages with itineraries           |
| `destinations` | Destination cards shown on the site        |
| `hotels`       | Hotels, dharamshalas, homestays            |
| `bookings`     | User booking records                       |
| `reviews`      | Package/hotel reviews                      |
| `contacts`     | Contact form submissions                   |

---

## How the Code Connects

### `backend/config/db.js`
```js
const mongoose = require('mongoose');

const connectDB = async () => {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
};

module.exports = connectDB;
```

### `backend/server.js` (called at startup)
```js
const connectDB = require('./config/db');

connectDB().then(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});
```

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| `querySrv ENOTFOUND` | Wrong cluster URL, or no internet connection |
| `Authentication failed` | Wrong username or password in MONGO_URI |
| `IP not whitelisted` | Add your IP in Atlas → Network Access |
| `MongoServerError: user not found` | Database user not created in Step 3 |
| `ECONNREFUSED 127.0.0.1:27017` | Trying to connect to local MongoDB (not Atlas); check MONGO_URI |

---

## Local MongoDB (Alternative — No Atlas Required)

If you prefer to run MongoDB locally during development:

1. [Download MongoDB Community Server](https://www.mongodb.com/try/download/community)
2. Install and start the service
3. Change your `.env`:
   ```env
   MONGO_URI=mongodb://localhost:27017/wanderlust
   ```
4. Run `npm run dev` — it will connect to your local instance

---

## Security Notes for Production

- Never commit your `.env` file — it's already in `.gitignore` ✅
- Use strong, random JWT secrets (64+ chars)
- Set `NODE_ENV=production`
- Restrict Atlas Network Access to your server's IP only
- Enable MongoDB Atlas backups
