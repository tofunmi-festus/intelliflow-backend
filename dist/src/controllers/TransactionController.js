"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionController = void 0;
const supabase_1 = require("../config/supabase");
const TransactionService_1 = require("../services/TransactionService");
class TransactionController {
    static async getMyTransactions(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res
                    .status(401)
                    .json({ success: false, message: "Unauthorized" });
            }
            let query = supabase_1.supabase
                .from("transactions")
                .select("*")
                .eq("user_id", userId);
            const { startDate, endDate, minAmount, type } = req.query;
            if (startDate && endDate) {
                query = query
                    .gte("transaction_date", startDate)
                    .lte("transaction_date", endDate);
            }
            if (minAmount) {
                query = query.or(`debit.gte.${minAmount},credit.gte.${minAmount}`);
            }
            if (type === "credit")
                query = query.gt("credit", 0);
            if (type === "debit")
                query = query.gt("debit", 0);
            query = query.order("transaction_date", { ascending: false });
            const { data, error } = await query;
            if (error) {
                return res.status(500).json({ success: false, error: error.message });
            }
            // ===== CLASSIFY EACH TRANSACTION =====
            const classified = await Promise.all(data.map(async (tx) => {
                const predicted = await TransactionService_1.TransactionService.classifyTransactionRecord(tx);
                return {
                    ...tx,
                    predicted_category: predicted,
                };
            }));
            return res.json({
                success: true,
                count: classified.length,
                transactions: classified,
            });
        }
        catch (err) {
            return res.status(500).json({ success: false, message: "Server error" });
        }
    }
    static async getDashboardSummary(req, res) {
        try {
            const userId = req.user.id; // cast here to access user
            const summary = await TransactionService_1.TransactionService.getDashboardSummary(userId);
            return res.json({ success: true, data: summary });
        }
        catch (error) {
            return res.status(500).json({ success: false, message: error.message });
        }
    }
}
exports.TransactionController = TransactionController;
