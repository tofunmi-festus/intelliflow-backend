# CORS Fix Documentation

## Problem
Frontend was getting CORS error:
```
Access to fetch at 'https://intelliflow-backend-production.up.railway.app/api/auth/login' 
from origin 'https://intelli-flow-frontend-r7wo.vercel.app' has been blocked by CORS policy
```

## Root Causes Found & Fixed

### 1. ❌ Wrong Start Command in railway.json
**Before:**
```json
"startCommand": "node dist/index.js"
```

**After:**
```json
"startCommand": "node dist/src/index.js"
```

**Impact:** The server wasn't starting properly, causing all requests to fail.

---

### 2. ❌ Manual CORS Header in AuthController
**Before:**
```typescript
static async login(req: Request, res: Response) {
  const { accessCode, username, password } = req.body;
  res.header("Access-Control-Allow-Origin", "https://intelli-flow-frontend-r7wo.vercel.app");
  // ...
}
```

**After:**
```typescript
static async login(req: Request, res: Response) {
  const { accessCode, username, password } = req.body;
  // Removed manual header - CORS middleware handles this
  // ...
}
```

**Impact:** Manual headers conflicted with CORS middleware, causing preflight (OPTIONS) requests to fail.

---

### 3. ✅ Improved CORS Middleware in app.ts
**Now uses dynamic origin validation:**
```typescript
app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      "https://intelli-flow-frontend-r7wo.vercel.app",
      "http://localhost:3000",
      "http://localhost:3001"
    ];
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("CORS not allowed"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  optionsSuccessStatus: 200
}));
```

**Benefits:**
- ✅ Properly handles preflight OPTIONS requests
- ✅ Allows multiple origins (production + dev)
- ✅ Includes OPTIONS method for preflight
- ✅ Supports credentials (tokens in headers)
- ✅ Sets correct success status for Railway

---

## How CORS Works

1. **Browser sends preflight OPTIONS request**
   - Asks if it's allowed to send the actual request
   
2. **Server responds with CORS headers**
   - `Access-Control-Allow-Origin: https://intelli-flow-frontend-r7wo.vercel.app`
   - `Access-Control-Allow-Methods: GET, POST, PUT, DELETE`
   - `Access-Control-Allow-Headers: Content-Type, Authorization`

3. **Browser receives response and sends actual request**
   - POST, GET, etc.

**We fixed:** Both preflight AND actual request now return correct headers.

---

## Testing

### Test preflight (OPTIONS):
```bash
curl -i -X OPTIONS https://intelliflow-backend-production.up.railway.app/api/auth/login \
  -H "Origin: https://intelli-flow-frontend-r7wo.vercel.app" \
  -H "Access-Control-Request-Method: POST"
```

You should see:
```
Access-Control-Allow-Origin: https://intelli-flow-frontend-r7wo.vercel.app
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

### Test actual request:
```bash
curl -X POST https://intelliflow-backend-production.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -H "Origin: https://intelli-flow-frontend-r7wo.vercel.app" \
  -d '{"accessCode":"test","username":"user","password":"pass"}'
```

---

## Next Steps

1. **Commit changes:**
   ```bash
   git add src/app.ts src/controllers/AuthController.ts railway.json
   git commit -m "Fix CORS configuration for Railway deployment"
   git push origin main
   ```

2. **Railway will auto-deploy** - watch the build logs

3. **Test from frontend:**
   - Browser console should no longer show CORS errors
   - Login should work properly

---

## Allowed Origins

Currently configured to allow requests from:
- ✅ `https://intelli-flow-frontend-r7wo.vercel.app` (production frontend)
- ✅ `http://localhost:3000` (local development)
- ✅ `http://localhost:3001` (local development alternative)

To add more origins, update the `allowedOrigins` array in `src/app.ts`.

