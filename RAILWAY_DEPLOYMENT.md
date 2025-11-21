# Railway Deployment Guide

## Backend Deployment to Railway

### Prerequisites
- GitHub account (with your code pushed)
- Railway account (railway.app)
- Node.js 20.x

---

## Step 1: Push Code to GitHub

```bash
cd c:\Users\TOFUNMI\Desktop\Smart-SME\backend-node
git add .
git commit -m "Prepare for Railway deployment"
git push origin main
```

---

## Step 2: Create Railway Project

1. Go to **railway.app** and log in
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Select your GitHub repository: `intelliflow-backend`
5. Click **"Deploy"**

---

## Step 3: Add Environment Variables

Once the project is created:

1. Go to your Railway project dashboard
2. Click **"Variables"** tab
3. Add each variable:

```
SUPABASE_URL=https://bwebpdxtkirfhshsrmqw.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3ZWJwZHh0a2lyZmhzaHNybXF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0MTYyNjIsImV4cCI6MjA3ODk5MjI2Mn0.AJ1kPYAp3FD5gWjOClfG964tPBmC3wfIQKKqgaCKTt8
JWT_SECRET=DXgtAX1B589XbymchwFa4RxgSY1FJ4HgGDZstQBfJNtgTNTll8LOxiqvDOBgkM3fs9oEKmFOOjmg6of8J1BzMA==
ML_SERVICE_URL=http://localhost:8000
PORT=5000
NODE_ENV=production
```

**Important:** 
- `PORT` should be `5000` (Railway assigns this)
- `NODE_ENV=production` ensures optimizations

---

## Step 4: Deploy

Once variables are set:

1. Click **"Deploy"** button
2. Watch the build logs
3. Wait for deployment to complete

**Build should:**
- ✅ Install dependencies (`npm install`)
- ✅ Compile TypeScript (`npm run build`)
- ✅ Start server (`npm start`)

---

## Step 5: Get Your URL

After successful deployment:

1. Go to **Settings** tab
2. Find **"Public URL"** or **"Domain"**
3. Copy the URL (format: `https://xxx.railway.app`)

Your backend is now live! Example: `https://smart-sme-backend.railway.app`

---

## Step 6: Configure Frontend

Update your frontend `.env.local`:

```
REACT_APP_API_URL=https://your-railway-url.railway.app
```

Frontend API calls:
```typescript
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4000";

// Example
fetch(`${API_URL}/api/auth/login`, { /* ... */ })
```

---

## Testing Deployment

### Test health endpoint:
```bash
curl https://your-railway-url.railway.app/api/health
```

Expected response:
```json
{ "status": "ok", "service": "backend" }
```

### Test login endpoint:
```bash
curl -X POST https://your-railway-url.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"accessCode":"test","username":"user","password":"pass"}'
```

---

## Troubleshooting

### Build fails?
1. Check **Deployments** tab → **Build Logs**
2. Common issues:
   - Missing dependencies: Run `npm install` locally
   - TypeScript errors: Run `npm run build` locally to check
   - Wrong Node version: Verify `engines.node` in package.json

### Can't connect from frontend?
1. Check CORS is enabled: ✅ Already done in `src/app.ts`
2. Verify environment variables are set
3. Check API URL in frontend matches Railway domain

### "Cannot find module"?
- Make sure `dist/` is being generated
- Verify `tsconfig.json` includes all source files

---

## Auto-Deployment from GitHub

Railway automatically deploys when you:
1. Push to `main` branch
2. Create a pull request

To disable auto-deploy, go to **Settings** → **Deploy on Push** → toggle OFF

---

## Environment Variables - How to Get Them

**SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY:**
- From your `.env` file (already there)

**JWT_SECRET:**
- From your `.env` file (already there)
- Change it regularly for security!

**ML_SERVICE_URL:**
- Currently set to `http://localhost:8000`
- Change to your deployed ML service when ready

---

## Next Steps

1. ✅ Update `.gitignore` and `package.json` (done)
2. ✅ Create `railway.json` (done)
3. ⏳ Push to GitHub
4. ⏳ Connect to Railway
5. ⏳ Add environment variables
6. ⏳ Deploy
7. ⏳ Test endpoints
8. ⏳ Update frontend API URL

**Your Railway backend URL:** (will be provided after deployment)

