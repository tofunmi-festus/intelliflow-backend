import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import bodyParser from "body-parser";
import { AuthController } from "./controllers/AuthController";
import  authMiddleware   from "./middlewares/authMiddleware";
import { TransactionController } from "./controllers/TransactionController";

const app = express();
app.use(cors({
  origin: ["https://intelli-flow-frontend.vercel.app"],
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true    // REQUIRED
}));


app.use(express.json());


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

export default app;
