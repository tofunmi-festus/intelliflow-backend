"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionController = void 0;
const supabase_1 = require("../config/supabase");
const TransactionService_1 = require("../services/TransactionService");
const CacheService_1 = require("../services/CacheService");
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
                .from("transactions_duplicate_entry")
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
            if (!data || data.length === 0) {
                return res.json({
                    success: true,
                    count: 0,
                    transactions: [],
                });
            }
            // ===== CHECK IF TRANSACTIONS HAVE CHANGED =====
            const hasChanged = CacheService_1.CacheService.hasTransactionChanged(userId, data);
            if (!hasChanged) {
                // Transactions haven't changed, try to return cached classifications
                const cachedClassification = CacheService_1.CacheService.getClassification(userId);
                if (cachedClassification) {
                    console.log(`⚡ Returning cached classifications for user ${userId}`);
                    return res.json({
                        success: true,
                        count: cachedClassification.length,
                        transactions: cachedClassification,
                        cached: true,
                    });
                }
            }
            else {
                console.log(`🔄 Transactions changed, invalidating classification cache`);
                CacheService_1.CacheService.invalidateClassification(userId);
            }
            // ===== CLASSIFY EACH TRANSACTION =====
            // const classified = await Promise.allSettled(
            //   data.map(async (tx) => {
            //     try {
            //       // Get prediction from ML service
            //       const predicted = await TransactionService.classifyTransactionRecord(tx);
            //       // Update the transaction record with predicted category
            //       // const { error: updateError } = await supabase
            //       //   .from("transactions")
            //       //   .update({
            //       //     categories: predicted,
            //       //     updated_at: new Date().toISOString(),
            //       //   })
            //       //   .eq("id", tx.id);
            //       // if (updateError) {
            //       //   console.error(`Failed to update transaction ${tx.id}:`, updateError.message);
            //       //   // Still return the transaction with prediction, even if update failed
            //       //   return {
            //       //     ...tx,
            //       //     predicted_category: predicted,
            //       //     update_failed: true,
            //       //   };
            //       // }
            //       return {
            //         ...tx,
            //         predicted_category: predicted,
            //       };
            //     } catch (classifyError) {
            //       console.error(`Failed to classify transaction ${tx.id}:`, classifyError);
            //       // Return transaction without prediction if classification fails
            //       return {
            //         ...tx,
            //         predicted_category: null,
            //         classification_failed: true,
            //       };
            //     }
            //   })
            // );
            const classified = await Promise.allSettled(data.map(async (tx) => {
                try {
                    // Get prediction from ML service
                    const predicted = await TransactionService_1.TransactionService.classifyTransactionRecord(tx);
                    // ✅ UNCOMMENT AND FIX THIS - Update the database!
                    // const { error: updateError } = await supabase
                    //   .from("transactions")
                    //   .update({
                    //     predicted_category: predicted, // ⚠️ Changed from 'categories' to 'predicted_category'
                    //     updated_at: new Date().toISOString(),
                    //   })
                    //   .eq("id", tx.id);
                    // if (updateError) {
                    //   console.error(
                    //     `Failed to update transaction ${tx.id}:`,
                    //     updateError.message
                    //   );
                    //   return {
                    //     ...tx,
                    //     predicted_category: predicted,
                    //     update_failed: true,
                    //   };
                    // }
                    return {
                        ...tx,
                        predicted_category: predicted,
                    };
                }
                catch (classifyError) {
                    console.error(`Failed to classify transaction ${tx.id}:`, classifyError);
                    return {
                        ...tx,
                        predicted_category: "UNCATEGORIZED",
                        classification_failed: true,
                    };
                }
            }));
            // Handle settled promises - extract fulfilled transactions
            const processedTransactions = classified
                .map((result) => {
                if (result.status === "fulfilled") {
                    return result.value;
                }
                else {
                    console.error("Transaction processing failed:", result.reason);
                    return null;
                }
            })
                .filter(Boolean);
            // Cache the classifications
            CacheService_1.CacheService.setClassification(userId, processedTransactions);
            return res.json({
                success: true,
                count: processedTransactions.length,
                transactions: processedTransactions,
                cached: false,
            });
        }
        catch (err) {
            console.error("Transaction fetch error:", err);
            return res.status(500).json({
                success: false,
                message: err.message || "Server error",
            });
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
