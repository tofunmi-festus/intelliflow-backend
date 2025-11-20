import { Response, Request } from "express";
import { AuthRequest } from "../middlewares/authMiddleware";
import { supabase } from "../config/supabase";
import { TransactionService } from "../services/TransactionService";

export class TransactionController {
  static async getMyTransactions(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized" });
      }

      let query = supabase
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

      if (type === "credit") query = query.gt("credit", 0);
      if (type === "debit") query = query.gt("debit", 0);

      query = query.order("transaction_date", { ascending: false });

      const { data, error } = await query;
      if (error) {
        return res.status(500).json({ success: false, error: error.message });
      }

      // ===== CLASSIFY EACH TRANSACTION =====
      const classified = await Promise.all(
        data.map(async (tx) => {
          const predicted = await TransactionService.classifyTransactionRecord(
            tx
          );

          return {
            ...tx,
            predicted_category: predicted,
          };
        })
      );

      return res.json({
        success: true,
        count: classified.length,
        transactions: classified,
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: "Server error" });
    }
  }

  static async getDashboardSummary(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id; // cast here to access user

      const summary = await TransactionService.getDashboardSummary(userId);

      return res.json({ success: true, data: summary });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

}
