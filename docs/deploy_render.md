# FinRecon AI — Render Deployment Guide

Follow these steps to deploy FinRecon AI (Backend + Frontend + MongoDB Atlas) on Render.com.

---

## 1. Push Code to GitHub

Make sure your project is committed and pushed to GitHub:

```bash
git add .
git commit -m "feat: complete FinRecon AI autonomous financial controller"
git branch -M main
git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/<YOUR_REPO_NAME>.git
git push -u origin main
```

*(Note: Secrets, `.env`, and `node_modules` are automatically excluded by `.gitignore`)*

---

## 2. Option A: 1-Click Blueprint Deploy (`render.yaml`)

Because the repository includes [`render.yaml`](../render.yaml):

1. Go to [dashboard.render.com](https://dashboard.render.com/) and log in.
2. Click **New +** -> **Blueprint**.
3. Select your GitHub repository (`finrecon-ai`).
4. Render will parse `render.yaml` and create two services:
   - **`finrecon-backend`** (Web Service)
   - **`finrecon-frontend`** (Static Site)
5. Fill in the required Environment Variables when prompted:
   - **`MONGODB_URI`**: `mongodb+srv://finrecon_admin:AntigravityFinRecon2026@cluster0.cxx2xi2.mongodb.net/finrecon?retryWrites=true&w=majority&appName=Cluster0`
   - **`GROQ_API_KEY`**: Your Groq API key (`gsk_...`)
   - **`VITE_API_BASE_URL`**: `https://<YOUR-BACKEND-SERVICE-NAME>.onrender.com/api`
6. Click **Apply**.

---

## 3. Option B: Manual Service Setup on Render

If you prefer creating services manually:

### Service 1: Backend (Web Service)
1. In Render Dashboard, click **New +** -> **Web Service**.
2. Connect your GitHub repository.
3. Configure settings:
   - **Name:** `finrecon-backend`
   - **Region:** Singapore / Oregon (closest to your users)
   - **Root Directory:** `backend`
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** `Free`
4. Add **Environment Variables** (under Environment tab):
   - `NODE_ENV`: `production`
   - `PORT`: `10000`
   - `MONGODB_URI`: `mongodb+srv://finrecon_admin:AntigravityFinRecon2026@cluster0.cxx2xi2.mongodb.net/finrecon?retryWrites=true&w=majority&appName=Cluster0`
   - `GROQ_API_KEY`: `gsk_...`
   - `MATCH_CONFIDENCE_THRESHOLD`: `0.90`
   - `LIKELY_MATCH_THRESHOLD`: `0.70`
   - `SETTLEMENT_SLA_HOURS`: `2`
5. Click **Create Web Service**. Note your backend URL (e.g., `https://finrecon-backend.onrender.com`).

---

### Service 2: Frontend (Static Site)
1. In Render Dashboard, click **New +** -> **Static Site**.
2. Connect your GitHub repository.
3. Configure settings:
   - **Name:** `finrecon-frontend`
   - **Root Directory:** `frontend`
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`
4. Add **Environment Variable**:
   - `VITE_API_BASE_URL`: `https://finrecon-backend.onrender.com/api` *(use your actual backend URL from Service 1)*
5. Configure **Redirects / Rewrites** (under Redirects tab):
   - **Type:** `Rewrite`
   - **Source:** `/*`
   - **Destination:** `/index.html`
   *(This ensures client-side routing works without 404 on page refresh)*
6. Click **Create Static Site**.

---

## 4. Verification

Once both services show **Live**:
1. Open your Frontend URL (e.g. `https://finrecon-frontend.onrender.com`).
2. Upload the sample CSVs from `data/synthetic/train_dev_set/`.
3. Check the reconciliation dashboard, test the AI chat, and download the report!
