import { Request, Response } from "express";
import { supabase } from "../config/supabase";
import { getCashflowForecast } from "../services/ForecastClient";

interface Transaction {
  transaction_date: string;
  debit: number | null;
  credit: number | null;
}

interface ForecastPoint {
  date: string;
  predicted_cashflow: number;
}

interface CreditScoreResult {
  score: number;
  factors: string[];
}

function summarizeTransactions(transactions: Transaction[]) {
  let totalCredit = 0;
  let totalDebit = 0;

  for (const t of transactions) {
    totalCredit += t.credit ?? 0;
    totalDebit += t.debit ?? 0;
  }

  const balance = totalCredit - totalDebit;

  const days = Math.max(
    1,
    (new Date(
      transactions[transactions.length - 1].transaction_date
    ).getTime() -
      new Date(transactions[0].transaction_date).getTime()) /
      (1000 * 60 * 60 * 24)
  );

  const averageDailyCashflow = balance / days;

  const creditRatio =
    totalCredit === 0 ? 0 : Number((totalDebit / totalCredit).toFixed(2));

  return {
    totalCredit,
    totalDebit,
    balance,
    averageDailyCashflow,
    creditRatio,
  };
}

function classifyRisk(score: number): string {
  if (score >= 80) return "Low Risk";
  if (score >= 50) return "Medium Risk";
  return "High Risk";
}

function calculateStability(forecast: ForecastPoint[]) {
  const values = forecast.map((f) => f.predicted_cashflow);
  const mean =
    values.reduce((sum, v) => sum + v, 0) / Math.max(values.length, 1);

  const variance =
    values.reduce((sum, v) => sum + (v - mean) ** 2, 0) /
    Math.max(values.length, 1);
  const stdDev = Math.sqrt(variance);

  const stabilityScore = Math.max(
    0,
    Math.min(100, 100 - (stdDev / (Math.abs(mean) + 1)) * 100)
  );

  return Number(stabilityScore.toFixed(2));
}

function calculateCreditScore(
  transactions: Transaction[],
  forecast: ForecastPoint[]
): CreditScoreResult {
  let score = 100;
  const factors: string[] = [];

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const recentTxns = transactions.filter(
    (t) => new Date(t.transaction_date) >= sixMonthsAgo
  );

  // Historical transaction rules (same as before)
  if (recentTxns.length < 5) {
    score -= 20;
    factors.push("Low transaction frequency in last 6 months");
  }

  const largeDebits = recentTxns.filter((t) => (t.debit ?? 0) > 50000);
  if (largeDebits.length > 3) {
    score -= 15;
    factors.push("Multiple large debit transactions");
  }

  const credits = recentTxns.map((t) => t.credit ?? 0);
  const avgCredit =
    credits.reduce((a, b) => a + b, 0) / (recentTxns.length || 1);

  if (avgCredit < 20000) {
    score -= 20;
    factors.push("Low average monthly credit");
  }

  const totalDebit = recentTxns.reduce((sum, t) => sum + (t.debit ?? 0), 0);
  const totalCredit = recentTxns.reduce((sum, t) => sum + (t.credit ?? 0), 0);

  if (totalDebit > totalCredit) {
    score -= 25;
    factors.push("Total debits exceed credits");
  }

  // --- New: Use forecast predicted cashflow to adjust score ---

  const forecastValues = forecast.map((p) => p.predicted_cashflow);
  const avgForecastCashflow =
    forecastValues.reduce((a, b) => a + b, 0) / (forecastValues.length || 1);

  if (avgForecastCashflow > 0) {
    score += 10; // Expected positive cashflow boosts score
    factors.push("Positive predicted cashflow trend");
  } else {
    score -= 15; // Negative predicted cashflow reduces score
    factors.push("Negative predicted cashflow trend");
  }

  // Optionally, check volatility of forecast (standard deviation)
  const mean = avgForecastCashflow;
  const variance =
    forecastValues.reduce((sum, val) => sum + (val - mean) ** 2, 0) /
    (forecastValues.length || 1);
  const stdDev = Math.sqrt(variance);

  if (stdDev > mean * 0.5) {
    score -= 10;
    factors.push("High volatility in predicted cashflow");
  }

  // Clamp score between 0 and 100
  score = Math.max(0, Math.min(score, 100));

  if (factors.length === 0) factors.push("Good credit behavior observed");

  return { score, factors };
}

export class CreditScoreController {
  static async getCreditScore(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const userId = user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized - No user found in token",
        });
      }

      // Fetch user transactions from Supabase
      const { data: transactions, error } = await supabase
        .from("transactions")
        .select("transaction_date, debit, credit")
        .eq("user_id", userId)
        .order("transaction_date", { ascending: true });

      if (error) {
        return res.status(500).json({
          success: false,
          message: "Failed to fetch transactions",
          error: error.message,
        });
      }

      if (!transactions || transactions.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No transactions found for this user",
          transactionCount: 0,
        });
      }

      // Also fetch forecast from your ML service or receive it via req.query/body

      // Call the forecast service internally
      const txs: Transaction[] = transactions.map((t: any) => ({
        transaction_date: t.transaction_date,
        debit: t.debit ?? 0,
        credit: t.credit ?? 0,
      }));

      const forecastResponse = await getCashflowForecast(txs, 30); // e.g., 30 days forecast

      const forecast = forecastResponse.forecast; // Array of { date, predicted_cashflow }

      const creditScoreResult = calculateCreditScore(txs, forecast);

      const summary = summarizeTransactions(txs);
      const businessStability = calculateStability(forecast);
      const riskCategory = classifyRisk(creditScoreResult.score);

      return res.json({
        success: true,
        data: {
          creditScore: creditScoreResult.score,
          factors: creditScoreResult.factors,
          summary,
          businessStabilityScore: businessStability,
          riskCategory,
          forecastDays: forecast.length,
        },
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        message: err.message || "Failed to calculate credit score",
      });
    }
  }
}
