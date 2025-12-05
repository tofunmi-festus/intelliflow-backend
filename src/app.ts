import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

import express from "express";
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


// Protected routes
app.post("/api/auth/login", AuthController.login);

app.post("/api/auth/logout", authMiddleware, AuthController.logout);

app.get("/api/transactions", authMiddleware, TransactionController.getMyTransactions);

app.get("/api/dashboard/summary", authMiddleware, TransactionController.getDashboardSummary);

app.get("/api/forecast", authMiddleware, ForecastController.getForecast);

app.get("/api/creditscore", authMiddleware, CreditScoreController.getCreditScore);

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
