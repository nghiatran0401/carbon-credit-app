# Project Plan: Carbon Credit Platform

## 🌱 Core Project Ideas

- **Calculate Carbon Credits in Cần Giờ (Vietnam) based on forest coverage → convert to monetary value**
  - ✅ Implemented: Forests, credits, and calculation logic in backend and dashboard.
- **Expand to different types of forests/plants**
  - ✅ Supported: Forest type is a field; extensible for more types.
- **Scale across Vietnam, SE Asia, globally**
  - 🚧 Platform is architected for scalability; currently focused on Vietnam.
- **Expand to renewable energy projects**
  - ⏳ Not yet implemented; future roadmap.

## 🛠️ Proposed Features

- **Informational Website Section**
  - ✅ Home page introduces project, mission, and features.
- **User System (Auth0, profiles)**
  - ✅ Custom authentication, user profiles, admin/user roles.
  - ⏳ Auth0 not used; custom auth in place.
- **Interactive Map (Google Maps API)**
  - ✅ Interactive map (Leaflet) for forest visualization; extensible for Google Maps.
- **Location Pinning/Bookmarking**
  - ✅ Users can bookmark forests (API and UI).
- **Payment Integration (Stripe)**
  - ✅ Stripe Checkout integration; payment/order history in UI and admin.
- **Transaction History**
  - ✅ User and admin views for order/payment history.
- **Carbon Credit Sharing/Gifting**
  - ⏳ Not yet implemented.
- **Peer-to-Peer Carbon Market**
  - ⏳ Not yet implemented; planned for future.
- **Certificate Issuance**
  - ✅ Certificate/ownership proof via order/payment records; UI can be expanded.
- **Notification System**
  - ⏳ Toasts for feedback; no persistent notification system yet.
- **Fund Allocation Transparency**
  - ✅ Admin dashboard shows revenue, credits, analytics; can expand for more transparency.
- **Educational Section**
  - ⏳ Not yet implemented.
- **Analytics Dashboard**
  - ✅ Admin dashboard with charts, metrics, top users/forests.
- **Search, Filter, Sort Tools**
  - ✅ Implemented in marketplace, dashboard, admin.
- **Customer Support/Chatbot**
  - ⏳ Not yet implemented.

## 🧠 Future Considerations / Strategic Notes

- **Local Community Involvement**
  - ⏳ Not yet implemented; consider in future roadmap.
- **Corporate Users/ESG Partnerships**
  - ⏳ Not yet implemented; platform is architected for B2B.
- **NGO Funding Constraints**
  - ⏳ Not yet implemented; consider in future roadmap.
- **Tech Applications (AI, sensors, blockchain)**
  - ⏳ Not yet implemented; future potential.
- **Accreditation & Recognition**
  - ⏳ Not yet implemented; future potential.

---

## ✅ Completed

- Core carbon credit calculation, forest/credit/order CRUD, Stripe payments, admin analytics, user auth, interactive map, order/payment history, basic transparency.

## 🚧 In Progress

- TypeScript hygiene, session extraction, UI/UX polish, extensibility for new project types.

## ⏳ Next Steps

- Add educational and informational content sections.
- Implement persistent notification system.
- Add support for sharing/gifting credits.
- Plan/implement P2P carbon market features.
- Expand fund allocation transparency (visuals, reports).
- Add customer support/chatbot.
- Explore partnerships, accreditation, and advanced tech (AI, blockchain, sensors).
