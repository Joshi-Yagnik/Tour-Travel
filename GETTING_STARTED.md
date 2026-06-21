# 🚀 Wanderlust — Project Startup Guide

> **Complete guide to setting up, connecting, and running the Wanderlust Travel Platform from scratch.**

---

## ✅ Prerequisites

Make sure these are installed on your system before starting:

| Tool | Minimum Version | Check Command | Download |
|------|----------------|---------------|----------|
| **Node.js** | v18.0.0+ | `node --version` | [nodejs.org](https://nodejs.org) |
| **npm** | v8.0.0+ | `npm --version` | Comes with Node.js |
| **Git** | Any | `git --version` | [git-scm.com](https://git-scm.com) |

> 💡 If `node --version` shows v18 or higher, you're good to go!

---

## 📁 Project Structure

```
tour-travel/
│
├── 📂 backend/             ← Node.js + Express API server
│   ├── config/
│   │   └── db.js           ← MongoDB connection
│   ├── middleware/
│   │   ├── auth.js         ← JWT protection middleware
│   │   └── adminOnly.js    ← Admin role check
│   ├── models/             ← Mongoose database schemas
│   │   ├── User.js
│   │   ├── Package.js
│   │   ├── Hotel.js
│   │   ├── Booking.js
│   │   ├── Destination.js
│   │   ├── Review.js
│   │   └── Contact.js
│   ├── routes/             ← API route handlers
│   │   ├── auth.js         ← /api/auth/*
│   │   ├── packages.js     ← /api/packages/*
│   │   ├── hotels.js       ← /api/hotels/*
│   │   ├── bookings.js     ← /api/bookings/*
│   │   ├── destinations.js ← /api/destinations/*
│   │   ├── ai.js           ← /api/ai/*
│   │   ├── reviews.js      ← /api/reviews/*
│   │   ├── contact.js      ← /api/contact/*
│   │   └── admin.js        ← /api/admin/*
│   ├── .env                ← 🔒 Your private config (never commit!)
│   ├── .env.example        ← Template to copy from
│   ├── server.js           ← Main entry point
│   ├── seed.js             ← Database seed script
│   └── package.json
│
├── 📂 css/                 ← Stylesheets
├── 📂 js/                  ← Frontend JavaScript
│   ├── session.js          ← Auth session management
│   ├── auth.js             ← Login/signup forms
│   ├── nav.js              ← Navbar + dark mode
│   └── ai-assistant.js     ← AI chat widget
├── 📂 img/                 ← Images
├── 📂 admin/               ← Admin panel
│   ├── index.html
│   ├── css/admin.css
│   └── js/admin.js
│
├── index.html              ← Homepage
├── auth.html               ← Login / Sign Up
├── dashboard.html          ← User dashboard (protected)
├── packages.html           ← Tour packages listing
├── destinations.html       ← Destinations page
├── hotels.html             ← Hotels & accommodations
├── map.html                ← Interactive map
├── contact.html            ← Contact page
├── reset-password.html     ← Password reset page
├── 404.html                ← Error page
│
├── DATABASE_SETUP.md       ← MongoDB Atlas setup guide
└── GETTING_STARTED.md      ← ← This file
```

---

## ⚙️ Step-by-Step Setup

### Step 1 — Download / Clone the Project

If you have it as a ZIP file, extract it.  
If you're using Git:
```bash
git clone <your-repo-url>
cd tour-travel
```

---

### Step 2 — Install Backend Dependencies

```bash
# Go into the backend folder
cd backend

# Install all required packages
npm install
```

This installs: Express, Mongoose, JWT, bcrypt, nodemailer, Gemini AI, helmet, and more.

---

### Step 3 — Set Up the Environment File

The backend needs a `.env` file to run. A template is already provided:

```bash
# While inside the backend/ folder, copy the example file
copy .env.example .env
```

> On Mac/Linux: `cp .env.example .env`

Now **open `backend/.env`** in any text editor and fill in your values:

```env
# ── Server ──────────────────────────────────────────────
PORT=5000
NODE_ENV=development

# ── MongoDB Atlas Connection String ──────────────────────
# Get this from: https://cloud.mongodb.com
# (See DATABASE_SETUP.md for full instructions)
MONGO_URI=mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/wanderlust?retryWrites=true&w=majority&appName=Cluster0

# ── JWT Secrets ──────────────────────────────────────────
# Generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=paste_your_64_char_random_string_here
JWT_REFRESH_SECRET=paste_a_different_64_char_random_string_here

# ── Client URL (for CORS) ────────────────────────────────
CLIENT_URL=http://localhost:5000

# ── Email (Optional — needed for forgot-password emails) ─
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password
EMAIL_FROM=Wanderlust <your_email@gmail.com>

# ── Gemini AI (Optional — needed for AI Travel Assistant) ─
# Free key at: https://makersuite.google.com/app/apikey
GEMINI_API_KEY=your_gemini_key_here
```

> 📖 For setting up MongoDB, see **[DATABASE_SETUP.md](./DATABASE_SETUP.md)**

---

### Step 4 — Generate Secure JWT Secrets

Run this command to generate two strong random secrets:

```bash
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
node -e "console.log('JWT_REFRESH_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
```

Copy each output line into your `.env` file.

---

### Step 5 — Start the Backend Server

```bash
# Make sure you're in the backend/ folder
cd backend

# Development mode (auto-restarts when you save files)
npm run dev

# OR — production mode (no auto-restart)
npm start
```

✅ **You should see this output:**
```
✅ MongoDB Connected: cluster0.xxxxx.mongodb.net
✅ Gemini AI initialized.
✅ Wanderlust v2.0 running → http://localhost:5000
🌍 Environment: development
```

> ❌ If you see `MongoDB connection error` — check Step 3 and DATABASE_SETUP.md

---

### Step 6 — Seed the Database (First Time Only)

This populates your database with sample data so the site looks real:

```bash
# In a new terminal window, inside backend/ folder
npm run seed
```

✅ **Expected output:**
```
✅ Connected to MongoDB
🗑️  Cleared existing data
✅ Seeded 10 destinations
✅ Seeded 3 packages
🎉 Database seeded successfully!
```

---

### Step 7 — Open the Website

Open your browser and go to:

```
http://localhost:5000
```

The backend **serves the frontend** automatically — no separate server needed!

---

## 🌐 Important Pages & URLs

| Page | URL | Access |
|------|-----|--------|
| **Homepage** | `http://localhost:5000` | Public |
| **Login / Sign Up** | `http://localhost:5000/auth.html` | Public |
| **Dashboard** | `http://localhost:5000/dashboard.html` | 🔒 Login required |
| **Packages** | `http://localhost:5000/packages.html` | Public |
| **Hotels** | `http://localhost:5000/hotels.html` | Public |
| **Destinations** | `http://localhost:5000/destinations.html` | Public |
| **Map** | `http://localhost:5000/map.html` | Public |
| **Admin Panel** | `http://localhost:5000/admin/index.html` | 🔒 Admin role required |
| **Reset Password** | `http://localhost:5000/reset-password.html` | Via email link |

---

## 🔌 API Endpoints (Backend)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Create new account |
| `POST` | `/api/auth/login` | Login |
| `POST` | `/api/auth/logout` | Logout |
| `GET` | `/api/auth/me` | Get current user |
| `PUT` | `/api/auth/me` | Update profile |
| `POST` | `/api/auth/forgot-password` | Send reset email |
| `POST` | `/api/auth/reset-password/:token` | Reset password |
| `GET` | `/api/packages` | List all packages |
| `GET` | `/api/destinations` | List destinations |
| `GET` | `/api/hotels` | List hotels |
| `POST` | `/api/bookings` | Create booking |
| `GET` | `/api/bookings/my` | My bookings |
| `POST` | `/api/ai/chat` | AI travel assistant |
| `POST` | `/api/ai/itinerary` | Generate itinerary |
| `GET` | `/api/admin/stats` | Admin dashboard stats |
| `GET` | `/api/health` | Server health check |

---

## 🛠️ All Available Commands

```bash
# === Inside the backend/ folder ===

# Start in development mode (auto-restart on file change)
npm run dev

# Start in production mode
npm start

# Seed the database with sample data
npm run seed

# Run tests
npm test

# Generate secure random strings (for JWT secrets)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## 🔐 Create an Admin Account

After registering a normal account via `auth.html`:

### Option A — via MongoDB Atlas (easiest)
1. Open [cloud.mongodb.com](https://cloud.mongodb.com)
2. Navigate to: **Collections → wanderlust → users**
3. Find your user document
4. Edit `"role": "user"` → `"role": "admin"`
5. Save

### Option B — via MongoDB Shell
```bash
# Connect to your database
mongosh "mongodb+srv://your-cluster.mongodb.net/wanderlust"

# Update the role
db.users.updateOne(
  { email: "your@email.com" },
  { $set: { role: "admin" } }
)
```

---

## ❗ Common Errors & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `querySrv ENOTFOUND` | Wrong MongoDB URI or no internet | Check MONGO_URI in `.env` |
| `Authentication failed` | Wrong DB username/password | Re-check Atlas credentials |
| `Cannot find module` | Dependencies not installed | Run `npm install` in `backend/` |
| `EADDRINUSE: port 5000` | Port already in use | Kill existing process or change PORT |
| `JWT_SECRET is not defined` | Missing `.env` file | Create `backend/.env` from `.env.example` |
| `Cannot GET /api/...` | Server not running | Start server: `npm run dev` |
| Page shows "Please log in" | Session expired | Re-login at `/auth.html` |
| Admin panel redirects | Not an admin role | Follow "Create Admin" steps above |

---

## 🔄 Daily Workflow

Every time you want to work on the project:

```bash
# 1. Open terminal and navigate to the backend folder
cd tour-travel/backend

# 2. Start the server
npm run dev

# 3. Open browser
#    → http://localhost:5000

# 4. When done, stop the server
#    Press Ctrl + C in the terminal
```

---

## 💡 Tips

- **Dark Mode**: Click the 🌙 moon icon in the top-right navbar
- **AI Assistant**: Click the 🤖 robot icon (bottom-right on every page)
- **Backend logs**: Watch the terminal — every API request is logged
- **Database changes**: Always restart the server after changing `.env`
- **Forget to seed?**: Run `npm run seed` any time (it clears and re-seeds)
