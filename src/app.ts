import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { AuthController } from "./controllers/AuthController";
import  authMiddleware   from "./middlewares/authMiddleware";
import { TransactionController } from "./controllers/TransactionController";
import { ClassifierClient } from "./services/ClassifierClient";

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

// ML Service health check
app.get("/api/ml/health", async (req, res) => {
  try {
    const mlServiceUrl = process.env.ML_SERVICE_URL || "http://localhost:8000";
    const isHealthy = await ClassifierClient.healthCheck();
    
    return res.json({
      status: isHealthy ? "ok" : "down",
      service: "ml-service",
      url: mlServiceUrl,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return res.status(503).json({
      status: "error",
      service: "ml-service",
      message: error.message,
    });
  }
});

// ML Service test endpoint
app.post("/api/ml/test", async (req, res) => {
  try {
    const testData = {
      reference: "TEST001",
      remarks: "Test transaction",
      debit: 0,
      credit: 1000,
    };

    console.log("📝 Testing ML service with:", testData);
    
    const result = await ClassifierClient.predictCategory(testData);

    return res.json({
      status: "success",
      prediction: result,
      testData: testData,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return res.status(500).json({
      status: "error",
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

export default app;
