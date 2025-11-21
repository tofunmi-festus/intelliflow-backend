import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { AuthController } from "./controllers/AuthController";
import  authMiddleware   from "./middlewares/authMiddleware";
import { TransactionController } from "./controllers/TransactionController";

const app = express();
app.use(cors({
  origin: ["https://intelli-flow-frontend-r7wo.vercel.app/login"],
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: false,
  optionsSuccessStatus: 200    // REQUIRED
}));

app.options("*", cors())
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

export default app;
