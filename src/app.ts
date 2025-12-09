import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { createHash } from "crypto";
import { AuthController } from "./controllers/AuthController";
import  authMiddleware   from "./middlewares/authMiddleware";
import { TransactionController } from "./controllers/TransactionController";
import { ForecastController } from "./controllers/ForecastController";
import { CreditScoreController } from "./controllers/CreditScoreController";
import { ManagerController } from "./controllers/ManagerController";
import managerMiddleware from "./middlewares/managerMiddleware";
import { CacheService } from "./services/CacheService";

const app = express();

app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      "https://intelli-flow-frontend-r7wo.vercel.app",
      "https://intelli-flow-frontend.vercel.app",
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

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware to set cache headers for GET requests (1 hour cache)
const setCacheHeaders = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  res.set({
    "Cache-Control": "private, max-age=3600, immutable",
    "Pragma": "cache",
  });
  next();
};

// Middleware to generate and handle ETags
const eTagMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const originalJson = res.json.bind(res);
  
  res.json = function(body: any) {
    // Generate ETag from response body
    const etag = createHash('md5').update(JSON.stringify(body)).digest('hex');
    
    // Check if client sent If-None-Match header
    if (req.headers['if-none-match'] === etag) {
      return res.status(304).end(); // Not Modified
    }
    
    // Set ETag header
    res.set('ETag', etag);
    return originalJson(body);
  };
  
  next();
};

// Protected routes
app.post("/api/auth/login", AuthController.login);

app.post("/api/auth/logout", authMiddleware, AuthController.logout);

app.get("/api/transactions", authMiddleware, eTagMiddleware, setCacheHeaders, TransactionController.getMyTransactions);

app.get("/api/dashboard/summary", authMiddleware, eTagMiddleware, setCacheHeaders, TransactionController.getDashboardSummary);

app.get("/api/forecast", authMiddleware, eTagMiddleware, setCacheHeaders, ForecastController.getForecast);

app.get("/api/creditscore", authMiddleware, eTagMiddleware, setCacheHeaders, CreditScoreController.getCreditScore);

app.post("/api/manager/login", ManagerController.login);

app.post("/api/manager/logout", managerMiddleware, ManagerController.logout);

app.get("/api/manager/users", managerMiddleware, ManagerController.getManagedUsers);

app.get("/api/manager/full", managerMiddleware, ManagerController.getManagedUsersWithTransactions);


// Test protected route
app.get("/api/me", authMiddleware, (req, res) => {
  // Cast req as any to safely access user without TS error
  const user = (req as any).user;
  return res.json({ user });
});

// Health check endpoint
app.get("/", (req, res) => {
  res.json({ status: "Backend is running", timestamp: new Date().toISOString() });
});

// Health check endpoint for Vercel
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "backend" });
});

// Cache management endpoints (development only)
app.get("/api/cache/stats", (req, res) => {
  const stats = CacheService.getStats();
  return res.json({
    success: true,
    stats,
  });
});

app.delete("/api/cache/clear", (req, res) => {
  CacheService.clearAll();
  return res.json({
    success: true,
    message: "All caches cleared",
  });
});

export default app;
