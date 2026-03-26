# MindTrack Hackathon MVP (48h)

Mental wellness tracker with:
- Daily mood/stress/sleep/energy check-ins
- AI-generated safe daily suggestions
- Weekly/monthly trend report charts
- Safe support chatbot with crisis keyword guardrails

## Tech Stack
- Frontend: HTML, Vanilla JS, Tailwind CSS (CDN), Bootstrap
- Backend: Node.js, Express, REST API
- Database: MySQL + Sequelize ORM
- Auth: JWT + bcrypt
- AI: OpenAI API

## Setup
1. Create `.env` from `.env.example`.
2. Create MySQL DB:
   - Railway/Railway example DB: `CREATE DATABASE mental_hack;`
3. Install packages:
   - `npm install`
4. Start dev server:
   - `npm run dev`
5. Open:
   - `http://localhost:5000`

## Deploy (Render + Railway)
Render will run the Node/Express backend and also serve the frontend from `public/`.

### 1) Railway: MySQL
1. In Railway, provision MySQL.
2. Copy these values from Railway (service connection details):
   - `host`
   - `port`
   - `database`
   - `username`
   - `password`
3. Paste them into Render as environment variables (next section).

### 2) Render: Web Service
1. Create a new Render Web Service from your GitHub repo.
2. Build command:
   - `npm install`
3. Start command:
   - `npm start`
4. Environment variables on Render (set these):
   - `PORT` (optional; Render usually sets it automatically)
   - `DB_HOST`
   - `DB_PORT`
   - `DB_NAME`
   - `DB_USER`
   - `DB_PASSWORD`
   - `JWT_SECRET`
   - `OPENAI_API_KEY` (optional; without it the app uses safe fallback text)
   - `DB_SSL=true` (recommended for Railway MySQL)

### 3) After deploy
1. Open the Render URL.
2. Register a user and submit check-ins.
3. View the trends + risk report card and chatbot.

## REST Endpoints
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/checkins` (auth)
- `GET /api/checkins` (auth)
- `GET /api/reports?days=7|30` (auth)
- `POST /api/chat` (auth)
- `POST /api/bookings/request` (auth)

## 48-hour Delivery Plan
- Hour 0-8: Auth, DB models, daily check-in form, save API
- Hour 8-16: Charts + report API + UI polish
- Hour 16-26: AI insight + safe chatbot + crisis fallback
- Hour 26-36: Testing, bug fixes, sample data
- Hour 36-48: Pitch deck, demo script, final cleanup

## Important Safety Note
This app provides general wellness support and is **not** a medical diagnosis tool.
