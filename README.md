MindTrack Web App
A premium, calm, and interactive mental wellness tracker that supports:

<<<<<<< HEAD
A premium, calm, and interactive mental wellness tracker that supports:
- Daily mood, stress, sleep, energy, social connection, and focus check-ins (with 7 tailored fields and instant daily insights).
- Safe daily AI insights (powered by Groq, with warm support and clean local fallbacks).
- Interactive, responsive trend charts (Chart.js) with light/dark theme synchronization and a weighted deterministic wellness risk summary.
- Safe chatbot (MindTrack AI) with crisis-keyword guardrails and Tele MANAS support intercepts.
- Appointment request flow with automated HTML notifications sent to therapist/admin emails via Resend.

## Tech Stack
- **Frontend**: Plain HTML + Vanilla JS + custom design system built with premium Vanilla CSS variables (supporting full light/dark themes and responsive layout).
- **Backend**: Node.js + Express (REST API).
- **Database**: PostgreSQL (Supabase) + Sequelize ORM.
- **Auth**: JWT + bcryptjs.
- **AI Integration**: Groq API (Llama models) with robust safety parameters.
- **Email Notification**: Resend email API.
=======
Daily mood, stress, sleep, energy, social connection, and focus check-ins (with 7 tailored fields and instant daily insights).
Safe daily AI insights (powered by Groq, with warm support and clean local fallbacks).
Interactive, responsive trend charts (Chart.js) with light/dark theme synchronization and a weighted deterministic wellness risk summary.
Safe chatbot (MindTrack AI) with crisis-keyword guardrails and Tele MANAS support intercepts.
Appointment request flow with automated HTML notifications sent to therapist/admin emails via Resend.
Tech Stack
Frontend: Plain HTML + Vanilla JS + custom design system built with premium Vanilla CSS variables (supporting full light/dark themes and responsive layout).
Backend: Node.js + Express (REST API).
Database: PostgreSQL (Supabase) + Sequelize ORM.
Auth: JWT + bcryptjs.
AI Integration: Groq API (Llama models) with robust safety parameters.
Email Notification: Resend email API.
REST API Endpoints
POST /api/auth/register - Create a user account.
POST /api/auth/login - Verify credentials and retrieve a JWT.
POST /api/checkins - Submit/update today's check-in metrics (auth required).
GET /api/checkins - Retrieve user check-in history (auth required).
GET /api/reports?days=7|14|30 - Fetch statistical summaries, charts series, wellness risk cards, and AI trend analyses (auth required).
POST /api/chat - Interact with the warm AI companion (auth required).
POST /api/bookings/request - Submit an appointment request and trigger a notification email (auth required).
Local Development Setup
Clone the repository:

bash

git clone <repo-url>
cd "Project Hack"
Install dependencies:

bash

npm install
Configure Environment Variables: Create a .env file in the root directory:
>>>>>>> 6f617486de4de74d84abec793b842abe492f0dc7

## REST API Endpoints
- `POST /api/auth/register` - Create a user account.
- `POST /api/auth/login` - Verify credentials and retrieve a JWT.
- `POST /api/checkins` - Submit/update today's check-in metrics (auth required).
- `GET /api/checkins` - Retrieve user check-in history (auth required).
- `GET /api/reports?days=7|14|30` - Fetch statistical summaries, charts series, wellness risk cards, and AI trend analyses (auth required).
- `POST /api/chat` - Interact with the warm AI companion (auth required).
- `POST /api/bookings/request` - Submit an appointment request and trigger a notification email (auth required).

## Local Development Setup

<<<<<<< HEAD
1. **Clone the repository**:
   ```bash
   git clone <repo-url>
   cd "Project Hack"
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root directory:
   ```env
   PORT=5000
   CLIENT_URL=http://localhost:5000
   DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/postgres
   JWT_SECRET=your_jwt_secret_key
   GROK_API_KEY=your_groq_api_key
   RESEND_API_KEY=your_resend_api_key
   ADMIN_EMAIL=recipient_email@example.com
   ```

4. **Start the server**:
   ```bash
   npm run dev
   ```
   The backend will sync database tables (using Sequelize `alter: true`) and start listening on `http://localhost:5000`.

## Deployment

### Database (Supabase)
1. Provision a PostgreSQL database on [Supabase](https://supabase.com).
2. Copy the URI pooler connection string and paste it into the `DATABASE_URL` field in your environment configuration.

### Backend + Frontend (Render)
This project serves the frontend static assets directly from the `public/` folder, meaning deploying a single web service is sufficient:
1. Create a **Web Service** on Render.
2. Link your GitHub repository.
3. Configure the build parameters:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. Set the environment variables in your Render service settings dashboard:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `GROK_API_KEY`
   - `RESEND_API_KEY`
   - `ADMIN_EMAIL`
   - `CLIENT_URL` (matches your Render service web URL)

## Security Note
Do not push real secrets to Git. Always maintain active secrets in your local `.env` and configure them securely in your production hosting dashboards. Only the `.env.example` template should be committed.

=======
bash

npm run dev
The backend will sync database tables (using Sequelize alter: true) and start listening on http://localhost:5000.

Deployment
Database (Supabase)
Provision a PostgreSQL database on Supabase.
Copy the URI pooler connection string and paste it into the DATABASE_URL field in your environment configuration.
Backend + Frontend (Render)
This project serves the frontend static assets directly from the public/ folder, meaning deploying a single web service is sufficient:

Create a Web Service on Render.
Link your GitHub repository.
Configure the build parameters:
Build Command: npm install
Start Command: npm start
Set the environment variables in your Render service settings dashboard:
DATABASE_URL
JWT_SECRET
GROK_API_KEY
RESEND_API_KEY
ADMIN_EMAIL
CLIENT_URL (matches your Render service web URL)
Security Note
Do not push real secrets to Git. Always maintain active secrets in your local .env and configure them securely in your production hosting dashboards. Only the .env.example template should be committed.
>>>>>>> 6f617486de4de74d84abec793b842abe492f0dc7
