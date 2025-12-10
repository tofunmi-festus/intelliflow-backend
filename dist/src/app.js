"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const crypto_1 = require("crypto");
const AuthController_1 = require("./controllers/AuthController");
const authMiddleware_1 = __importDefault(require("./middlewares/authMiddleware"));
const TransactionController_1 = require("./controllers/TransactionController");
const ForecastController_1 = require("./controllers/ForecastController");
const CreditScoreController_1 = require("./controllers/CreditScoreController");
const ManagerController_1 = require("./controllers/ManagerController");
const InvoiceController_1 = require("./controllers/InvoiceController");
const managerMiddleware_1 = __importDefault(require("./middlewares/managerMiddleware"));
const CacheService_1 = require("./services/CacheService");
const app = (0, express_1.default)();
app.use((0, cors_1.default)({
    origin: function (origin, callback) {
        const allowedOrigins = [
            "https://intelli-flow-frontend-r7wo.vercel.app",
            "https://intelli-flow-frontend.vercel.app",
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
// Middleware to set cache headers for GET requests (1 hour cache)
const setCacheHeaders = (req, res, next) => {
    res.set({
        "Cache-Control": "private, max-age=3600, immutable",
        "Pragma": "cache",
    });
    next();
};
// Middleware to generate and handle ETags
const eTagMiddleware = (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = function (body) {
        // Generate ETag from response body
        const etag = (0, crypto_1.createHash)('md5').update(JSON.stringify(body)).digest('hex');
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
app.post("/api/auth/login", AuthController_1.AuthController.login);
app.post("/api/auth/logout", authMiddleware_1.default, AuthController_1.AuthController.logout);
app.get("/api/transactions", authMiddleware_1.default, eTagMiddleware, setCacheHeaders, TransactionController_1.TransactionController.getMyTransactions);
app.get("/api/dashboard/summary", authMiddleware_1.default, eTagMiddleware, setCacheHeaders, TransactionController_1.TransactionController.getDashboardSummary);
app.get("/api/forecast", authMiddleware_1.default, eTagMiddleware, setCacheHeaders, ForecastController_1.ForecastController.getForecast);
app.get("/api/creditscore", authMiddleware_1.default, eTagMiddleware, setCacheHeaders, CreditScoreController_1.CreditScoreController.getCreditScore);
app.post("/api/manager/login", ManagerController_1.ManagerController.login);
app.post("/api/manager/logout", managerMiddleware_1.default, ManagerController_1.ManagerController.logout);
app.get("/api/manager/users", managerMiddleware_1.default, ManagerController_1.ManagerController.getManagedUsers);
app.get("/api/manager/full", managerMiddleware_1.default, ManagerController_1.ManagerController.getManagedUsersWithTransactions);
// InvoiceFlow Hub Routes
app.post("/api/invoices", authMiddleware_1.default, InvoiceController_1.InvoiceController.createInvoice);
app.get("/api/invoices", authMiddleware_1.default, eTagMiddleware, setCacheHeaders, InvoiceController_1.InvoiceController.getInvoices);
app.get("/api/invoices/dashboard/summary", authMiddleware_1.default, eTagMiddleware, setCacheHeaders, InvoiceController_1.InvoiceController.getDashboardSummary);
app.get("/api/invoices/:id", authMiddleware_1.default, InvoiceController_1.InvoiceController.getInvoice);
app.put("/api/invoices/:id/status", authMiddleware_1.default, InvoiceController_1.InvoiceController.updateInvoiceStatus);
app.post("/api/invoices/:id/payments", authMiddleware_1.default, InvoiceController_1.InvoiceController.recordPayment);
app.get("/api/invoices/:id/payments", authMiddleware_1.default, InvoiceController_1.InvoiceController.getPaymentHistory);
app.post("/api/invoices/:id/reminders", authMiddleware_1.default, InvoiceController_1.InvoiceController.scheduleReminder);
app.delete("/api/invoices/:id", authMiddleware_1.default, InvoiceController_1.InvoiceController.deleteInvoice);
// Send invoice endpoint
app.post("/api/invoices/:id/send", authMiddleware_1.default, InvoiceController_1.InvoiceController.sendInvoice);
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
// Email diagnostic endpoint (for testing only)
app.post("/api/email/test", async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email address required",
            });
        }
        console.log("[Email Test] Testing email to:", email);
        console.log("[Email Test] Configuration:", {
            EMAIL_FROM: process.env.EMAIL_FROM,
            BREVO_API_KEY_SET: !!process.env.BREVO_API_KEY,
        });
        const axios = require("axios");
        const response = await axios.post("https://api.brevo.com/v3/smtp/email", {
            to: [{ email, name: "Test User" }],
            subject: "IntelliFlow Email Test",
            htmlContent: "<h1>Email Service Test</h1><p>If you received this, Brevo email is working!</p>",
            sender: {
                name: "IntelliFlow",
                email: process.env.EMAIL_FROM || "noreply@intelliflow.com",
            },
        }, {
            headers: {
                "api-key": process.env.BREVO_API_KEY,
                "Content-Type": "application/json",
            },
        });
        return res.json({
            success: true,
            message: "Test email sent successfully via Brevo",
            sentTo: email,
            messageId: response.data.messageId,
        });
    }
    catch (error) {
        console.error("[Email Test] Error:", error.message);
        const errorMsg = error.response?.data?.message || error.message || "Unknown error";
        return res.status(500).json({
            success: false,
            message: errorMsg,
            hint: "Get free Brevo API key at https://www.brevo.com - sign up and check Settings > SMTP & API",
        });
    }
});
exports.default = app;
