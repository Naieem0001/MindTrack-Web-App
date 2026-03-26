# MindTrack Web App (Hackathon MVP)

Mental wellness tracker that supports:
- Daily mood/stress/sleep/energy check-ins
- Safe daily AI suggestions (no diagnosis)
- Weekly/monthly trend charts + a non-diagnostic risk report card
- Safe chatbot with crisis-keyword guardrails
- Appointment request flow (saved to MySQL)

## Tech Stack
- Frontend: plain HTML + Vanilla JS, Tailwind CSS (CDN), Bootstrap
- Backend: Node.js + Express (REST)
- Database: MySQL + Sequelize
- Auth: JWT + bcrypt
- AI: OpenAI API (optional; app still works with safe fallbacks)

## Local Setup
1. Install dependencies:
   - `npm install`
2. Create environment file:
   - Copy `.env.example` to `.env` and fill values.
3. Start server:
   - `npm run dev`
4. Open:
   - `http://localhost:5000`

## Required Environment Variables
Backend reads these from `.env` (or from Render environment variables in production):
- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `DB_SSL` (set to `true` for Railway MySQL; recommended)
- `JWT_SECRET`
- `OPENAI_API_KEY` (optional for demo; safer fallbacks used if missing)
- `PORT` (optional; defaults to `5000`)

## REST API (endpoints)
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/checkins` (auth)
- `GET /api/checkins` (auth)
- `GET /api/reports?days=7|30` (auth)
- `POST /api/chat` (auth)
- `POST /api/bookings/request` (auth)

## Deploy (Render + Railway)
### Railway: Provision MySQL
1. Provision MySQL in Railway.
2. Copy the MySQL connection details from Railway:
   - host, port, database, username, password

### Render: Deploy backend
1. Create a Render Web Service from your GitHub repo.
2. Build command:
   - `npm install`
3. Start command:
   - `npm start`
4. Set Environment Variables on Render:
   - `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
   - `DB_SSL=true` (recommended for Railway)
   - `JWT_SECRET`
   - `OPENAI_API_KEY` (optional but recommended)
   - `NODE_ENV=production` (optional)

### Frontend
This project serves the frontend from `public/` via Express static hosting, so deploying the backend service is enough.

## Security Note
Do not push real secrets in Git. Only commit `.env.example`. The `.env` file is ignored by Git.
