import { Request, Response } from "express";
import { getCashflowForecast, Transaction } from "../services/ForecastClient";
import { supabase } from "../config/supabase";

export async function forecastController(req: Request, res: Response) {
  try {
    const userId = req.user?.id; // Assuming you have auth middleware attaching user

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // Fetch user transactions from your database
    const { data: transactions, error } = await supabase
      .from("transactions")
      .select("transaction_date, debit, credit")
      .eq("user_id", userId)
      .order("transaction_date", { ascending: true });

    if (error) {
      console.error("Error fetching transactions:", error.message);
      return res.status(500).json({ success: false, message: error.message });
    }

    if (!transactions || transactions.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Not enough transactions for forecasting.",
      });
    }

    // Cast transactions to required type for forecastClient
    const txs: Transaction[] = transactions.map((t: any) => ({
      transaction_date: t.transaction_date,
      debit: t.debit ?? 0,
      credit: t.credit ?? 0,
    }));

    // Get forecast days from query params (default 30)
    const days = Number(req.query.days) || 30;

    // Call forecasting service
    const forecast = await getCashflowForecast(txs, days);

    return res.json({
      success: true,
      forecast,
    });
  } catch (err: any) {
    console.error("Forecast Controller error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Server error",
    });
  }
}
