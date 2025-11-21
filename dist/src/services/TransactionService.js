"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionService = void 0;
const supabase_1 = require("../config/supabase");
const ClassifierClient_1 = require("../services/ClassifierClient");
class TransactionService {
    static async getUserTransactions(userId) {
        if (!userId)
            throw new Error("User ID missing");
        const { data, error } = await supabase_1.supabase
            .from("transactions")
            .select("*")
            .eq("user_id", userId)
            .order("transaction_date", { ascending: false });
        if (error) {
            throw new Error("Failed to fetch transactions: " + error.message);
        }
        return data;
    }
    static async getDashboardSummary(userId) {
        // 1. Get total credits
        const { data: creditsData, error: creditsError } = await supabase_1.supabase
            .from("transactions")
            .select("credit")
            .eq("user_id", userId);
        if (creditsError)
            throw creditsError;
        // 2. Get total debits
        const { data: debitsData, error: debitsError } = await supabase_1.supabase
            .from("transactions")
            .select("debit")
            .eq("user_id", userId);
        if (debitsError)
            throw debitsError;
        // 3. Get latest balance (based on the latest transaction_date)
        const { data: latestTransaction, error: latestError } = await supabase_1.supabase
            .from("transactions")
            .select("balance")
            .eq("user_id", userId)
            .order("transaction_date", { ascending: false })
            .limit(1)
            .single();
        if (latestError && latestError.code !== "PGRST116")
            throw latestError; // PGRST116 means no rows
        // Calculate totals
        const totalCredit = creditsData?.reduce((acc, row) => acc + (row.credit || 0), 0) || 0;
        const totalDebit = debitsData?.reduce((acc, row) => acc + (row.debit || 0), 0) || 0;
        const latestBalance = latestTransaction?.balance || 0;
        return {
            totalCredit,
            totalDebit,
            latestBalance,
            totalTransactions: creditsData?.length || 0,
        };
    }
    static async classifyTransactionRecord(tx) {
        return ClassifierClient_1.ClassifierClient.predictCategory({
            reference: tx.reference || "",
            remarks: tx.remarks || "",
            debit: tx.debit || 0,
            credit: tx.credit || 0,
        });
    }
}
exports.TransactionService = TransactionService;
