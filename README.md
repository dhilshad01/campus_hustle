# Campus Hustle (MERN)

MongoDB + Express + React (Vite) + Node. One server serves the API, photo uploads and, in production, the built React app.

## What's included
- Accounts: student or business sign-up, login with an httpOnly cookie, passwords hashed with bcrypt, rate-limited auth.
- Marketplace: listings with photo upload, search ("cycle under 3000"), filters, sub-categories, expiry, reserved / sold / out of stock.
- Structured bargaining: offer, counter, accept, reject. Accepting is atomic, so two buyers cannot both win. Then complete, then rate.
- Chat per listing, wishlist, report and block, notifications, WhatsApp share on listings.
- Requests, request-to-listing matching, and Campus Fire (demand score from real requests, searches, saves, offers, views and sales).
- Food pickup orders from business shops, Parcel Help, business storefront overview.
- Security: all rules are enforced on the server (only owners edit their listings, "reserved" cannot be set directly, verified flag cannot come from the client, input validated with zod, uploads limited to 3 MB images, NoSQL-injection sanitising, helmet).

Not ported from the prototype: Hustle points, confetti, Surprise me, the "jump 6 days" demo button.

## Run it on your computer
1. Install Node 18+ and MongoDB (or create a free cluster at mongodb.com/atlas and copy its connection string).
2. `cd server && cp .env.example .env` and fill in MONGODB_URI and a long random JWT_SECRET.
3. From the project root: `npm --prefix server install` and `npm --prefix client install`
4. `npm run seed` (adds demo users and listings; password for all demo accounts is `password123`).
5. Terminal 1: `npm run dev:server`   Terminal 2: `npm run dev:client`   then open http://localhost:5173
   Demo logins: student@demo.test (student), ananya@demo.test (women's community, sees Beauty), campusbites@shop.demo.test (business).

## Put it online (one service)
On Render or Railway: build command `npm run build`, start command `npm start`, and set MONGODB_URI, JWT_SECRET and NODE_ENV=production.
Uploaded photos are saved on the server's disk, which many hosts wipe on redeploy. For a real launch, move photos to Cloudinary or S3.
Seeding wipes users, listings and requests, so only run it on a fresh demo database.
