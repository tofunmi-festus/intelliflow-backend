"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const AuthController_1 = require("./controllers/AuthController");
const authMiddleware_1 = __importDefault(require("./middlewares/authMiddleware"));
const TransactionController_1 = require("./controllers/TransactionController");
const ForecastController_1 = require("./controllers/ForecastController");
const CreditScoreController_1 = require("./controllers/CreditScoreController");
const ManagerController_1 = require("./controllers/ManagerController");
const managerMiddleware_1 = __importDefault(require("./middlewares/managerMiddleware"));
const CacheService_1 = require("./services/CacheService");
const app = (0, express_1.default)();
app.use((0, cors_1.default)({
    origin: function (origin, callback) {
        const allowedOrigins = [
            "https://intelli-flow-frontend-r7wo.vercel.app",
            "http://localhost:3000",
            "http://localhost:3001"
        ];
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error("CORS not allowed"));
        }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    optionsSuccessStatus: 200
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Protected routes
app.post("/api/auth/login", AuthController_1.AuthController.login);
app.post("/api/auth/logout", authMiddleware_1.default, AuthController_1.AuthController.logout);
app.get("/api/transactions", authMiddleware_1.default, TransactionController_1.TransactionController.getMyTransactions);
app.get("/api/dashboard/summary", authMiddleware_1.default, TransactionController_1.TransactionController.getDashboardSummary);
app.get("/api/forecast", authMiddleware_1.default, ForecastController_1.ForecastController.getForecast);
app.get("/api/creditscore", authMiddleware_1.default, CreditScoreController_1.CreditScoreController.getCreditScore);
app.post("/api/manager/login", ManagerController_1.ManagerController.login);
app.post("/api/manager/logout", managerMiddleware_1.default, ManagerController_1.ManagerController.logout);
app.get("/api/manager/users", managerMiddleware_1.default, ManagerController_1.ManagerController.getManagedUsers);
app.get("/api/manager/full", managerMiddleware_1.default, ManagerController_1.ManagerController.getManagedUsersWithTransactions);
// Test protected route
app.get("/api/me", authMiddleware_1.default, (req, res) => {
    // Cast req as any to safely access user without TS error
    const user = req.user;
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
    const stats = CacheService_1.CacheService.getStats();
    return res.json({
        success: true,
        stats,
    });
});
app.delete("/api/cache/clear", (req, res) => {
    CacheService_1.CacheService.clearAll();
    return res.json({
        success: true,
        message: "All caches cleared",
    });
});
exports.default = app;
