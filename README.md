# 🧭 Wanderlust — Tour & Travel Platform

> A complete, modern, production-ready tour and travel agency web platform built with HTML5, CSS3 (Vanilla), Vanilla JavaScript, and a Node.js/Express/MongoDB backend scaffold.

---

## 🌍 Live Pages

| Page | File | Description |
|------|------|-------------|
| Landing | `index.html` | Hero slider, search bar, stats, destinations, testimonials |
| Login/Signup | `auth.html` | Split-screen with password strength, social login UI |
| Destinations | `destinations.html` | 12 destinations with live filter/search/sort |
| Packages | `packages.html` | 9 packages with duration/region/price filters |
| Package Detail | `package-detail.html` | Itinerary accordion, booking widget, reviews |
| Dashboard | `dashboard.html` | Bookings, wishlist, profile, settings |
| About | `about.html` | Mission, team, timeline, partner strip |
| Contact | `contact.html` | Form with validation, map, FAQ accordion |

---

## 🚀 Quick Start (Frontend Only)

Just open `index.html` in your browser — no build tools required!

```bash
# Optionally serve with a local server
npx serve .
# or
python -m http.server 8080
```

---

## 🛠️ Backend Setup (Node.js + Express + MongoDB)

### Prerequisites
- Node.js ≥ 18
- MongoDB (local or Atlas)

### Installation

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your MONGO_URI, JWT_SECRET, and email credentials
npm run dev
```

Server starts at **http://localhost:5000**

### API Endpoints

| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| POST | `/api/auth/register` | Register new user | Public |
| POST | `/api/auth/login` | Login, returns JWT | Public |
| GET | `/api/auth/me` | Get logged-in user | 🔒 User |
| PUT | `/api/auth/me` | Update profile | 🔒 User |
| POST | `/api/auth/wishlist/:packageId` | Toggle wishlist | 🔒 User |
| GET | `/api/destinations` | List destinations (filterable) | Public |
| GET | `/api/destinations/:id` | Single destination | Public |
| POST | `/api/destinations` | Create destination | 🔑 Admin |
| GET | `/api/packages` | List packages (filterable) | Public |
| GET | `/api/packages/:id` | Single package | Public |
| POST | `/api/packages` | Create package | 🔑 Admin |
| POST | `/api/bookings` | Create booking | 🔒 User |
| GET | `/api/bookings/my` | My bookings | 🔒 User |
| PUT | `/api/bookings/:id/cancel` | Cancel booking | 🔒 User |
| GET | `/api/bookings` | All bookings | 🔑 Admin |
| PUT | `/api/bookings/:id/status` | Update booking status | 🔑 Admin |
| POST | `/api/contact` | Send contact message | Public |
| GET | `/api/contact` | View all messages | 🔑 Admin |

---

## 📁 Project Structure

```
tour-travel/
├── index.html              ← Landing page
├── auth.html               ← Login / Sign Up
├── destinations.html       ← Destinations browser
├── packages.html           ← Tour packages
├── package-detail.html     ← Package detail + booking
├── dashboard.html          ← User dashboard
├── about.html              ← About us
├── contact.html            ← Contact form + map
│
├── css/
│   ├── variables.css       ← Design tokens
│   ├── base.css            ← Reset + typography
│   ├── components.css      ← Shared components
│   ├── responsive.css      ← Breakpoints
│   ├── index.css           ← Landing page styles
│   ├── auth.css            ← Auth styles
│   ├── destinations.css    ← Filter + grid
│   ├── package-detail.css  ← Detail + booking widget
│   └── dashboard.css       ← Sidebar + panels
│
├── js/
│   ├── nav.js              ← Shared nav + scroll + modals
│   ├── auth.js             ← Form validation + tabs
│   └── destinations.js     ← Live filter + sort
│
├── img/                    ← Local destination images
│
└── backend/
    ├── server.js           ← Express entry point
    ├── package.json
    ├── .env.example        ← Environment template
    ├── config/db.js        ← MongoDB connection
    ├── models/
    │   ├── User.js
    │   ├── Destination.js
    │   ├── Package.js
    │   ├── Booking.js
    │   └── Contact.js
    ├── routes/
    │   ├── auth.js
    │   ├── destinations.js
    │   ├── packages.js
    │   ├── bookings.js
    │   └── contact.js
    └── middleware/
        ├── auth.js         ← JWT protect
        └── adminOnly.js    ← Admin role guard
```

---

## 🎨 Design System

- **Primary Color**: `#FF6B35` (Orange)
- **Background**: `#0F0F1E` (Dark Navy)
- **Font**: Inter (Google Fonts)
- **Breakpoints**: 1024px (tablet), 768px (mobile), 480px (small mobile)

---

## 📦 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5, CSS3, Vanilla JS |
| Sliders | [Swiper.js](https://swiperjs.com/) |
| Icons | [Font Awesome 6](https://fontawesome.com/) |
| Backend | Node.js + Express.js |
| Database | MongoDB + Mongoose |
| Auth | JWT + bcryptjs |
| Email | Nodemailer (SMTP) |

---

## 👤 Author

**Yagnik Joshi** — joshiyagnik977@gmail.com | Ganpat University, Mehsana, Gujarat

---

## 📄 License

MIT © 2025 Wanderlust Travel Agency
