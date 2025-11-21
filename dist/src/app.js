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
const app = (0, express_1.default)();
app.use((0, cors_1.default)({
    origin: ["*"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true // REQUIRED
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Protected routes
app.post("/api/auth/login", AuthController_1.AuthController.login);
app.post("/api/auth/logout", authMiddleware_1.default, AuthController_1.AuthController.logout);
app.get("/api/transactions", authMiddleware_1.default, TransactionController_1.TransactionController.getMyTransactions);
app.get("/api/dashboard/summary", authMiddleware_1.default, TransactionController_1.TransactionController.getDashboardSummary);
// Test protected route
app.get("/api/me", authMiddleware_1.default, (req, res) => {
    // Cast req as any to safely access user without TS error
    const user = req.user;
    return res.json({ user });
});
exports.default = app;
