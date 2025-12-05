import { Response, Request } from "express";
import { getCashflowForecast, Transaction } from "../services/ForecastClient";
import { supabase } from "../config/supabase";
import { InsightService } from "../services/InsightService";
import { CacheService } from "../services/CacheService";

export class ForecastController {
  /**
   * Forecast endpoint: /api/forecast?days=30
   *
   * Flow:
   * 1. User must be authenticated (authMiddleware adds req.user)
   * 2. Fetch user's transactions from Supabase
   * 3. Send transactions to Python ML service (/forecast endpoint)
   * 4. Return predicted cashflow for next N days
   *
   * Query Parameters:
   * - days: Number of days to forecast (default: 30)
   * - minTransactions: Minimum transactions required (default: 2)
   */
  static async getForecast(req: Request, res: Response) {
    try {
      // ===== STEP 1: Verify user is authenticated =====
      const user = (req as any).user;
      const userId = user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized - No user found in token",
        });
      }

      console.log(`[ForecastController] User ${userId} requesting forecast`);

      // ===== STEP 2: Get forecast parameters from query =====
      const days = Math.min(Number(req.query.days) || 30, 365); // Cap at 1 year
      const minTransactions = Number(req.query.minTransactions) || 2;

      console.log(
        `[ForecastController] Parameters - days: ${days}, minTransactions: ${minTransactions}`
      );

      // ===== STEP 3: Fetch user transactions from Supabase =====
      console.log(
        `[ForecastController] Fetching transactions for user ${userId}`
      );

      const { data: transactions, error: fetchError } = await supabase
        .from("transactions_duplicate_entry")
        .select("transaction_date, debit, credit")
        .eq("user_id", userId)
        .order("transaction_date", { ascending: true });

      if (fetchError) {
        console.error(`[ForecastController] Database error:`, fetchError);
        return res.status(500).json({
          success: false,
          message: "Failed to fetch transactions from database",
          error: fetchError.message,
        });
      }

      if (!transactions || transactions.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No transactions found for this user",
          transactionCount: 0,
        });
      }

      console.log(
        `[ForecastController] Found ${transactions.length} transactions`
      );

      // ===== CHECK IF TRANSACTIONS HAVE CHANGED =====
      const hasChanged = CacheService.hasTransactionChanged(userId, transactions);
      
      if (!hasChanged) {
        // Transactions haven't changed, try to return cached forecast
        const cachedForecast = CacheService.getForecast(userId, days);
        if (cachedForecast) {
          console.log(`[ForecastController] ⚡ Returning cached forecast for user ${userId}`);
          return res.json({
            success: true,
            data: cachedForecast,
            cached: true,
          });
        }
      } else {
        console.log(`[ForecastController] 🔄 Transactions changed, invalidating cache`);
        CacheService.invalidateForecast(userId);
      }

      // ===== STEP 4: Validate minimum transaction count =====
      if (transactions.length < minTransactions) {
        return res.status(400).json({
          success: false,
          message: `Insufficient data for forecasting. Need at least ${minTransactions} transactions, but only found ${transactions.length}`,
          transactionCount: transactions.length,
          required: minTransactions,
        });
      }

      // ===== STEP 5: Transform transactions to ML service format =====
      const txs: Transaction[] = transactions.map((t: any) => ({
        transaction_date: t.transaction_date,
        debit: t.debit ?? 0,
        credit: t.credit ?? 0,
      }));

      // ===== STEP 6: Call ML forecast service =====
      console.log(`[ForecastController] Calling ML service for forecast...`);

      const forecast = await getCashflowForecast(txs, days);

      console.log(
        `[ForecastController] Forecast successful - ${forecast.forecast.length} days predicted`
      );

      // ===== STEP 6: Generate insights from forecast =====
      console.log(`[ForecastController] Generating insights from forecast...`);
      let insights;
      try {
        // Transform forecast into format InsightService expects
        const insightInput = forecast.forecast.map((p) => ({
          date: p.date,
          value: p.predicted_cashflow,
        }));
        
        insights = InsightService.generateInsights(insightInput);
        console.log(`[ForecastController] Insights generated successfully`);
      } catch (insightError: any) {
        console.error(
          `[ForecastController] Failed to generate insights:`,
          insightError.message
        );
        // Return forecast without insights rather than failing completely
        insights = {
          summary: "Could not generate insights",
          insights: [],
          stats: {},
        };
      }

      // ===== STEP 7: Return forecast to client =====
      const responseData = {
        forecast: forecast.forecast,
        insight: insights,
        transactionCount: txs.length,
        forecastDays: days,
        generatedAt: new Date().toISOString(),
      };

      // Cache the result
      CacheService.setForecast(userId, days, responseData);

      return res.json({
        success: true,
        data: responseData,
        cached: false,
      });
    } catch (err: any) {
      console.error(`[ForecastController] Error:`, err.message);
      console.error(`[ForecastController] Stack:`, err.stack);

      // Determine appropriate status code
      let statusCode = 500;
      if (
        err.message.includes("timeout") ||
        err.message.includes("ECONNREFUSED")
      ) {
        statusCode = 503; // Service Unavailable - ML service is down
      }

      return res.status(statusCode).json({
        success: false,
        message: err.message || "Failed to generate forecast",
        error: process.env.NODE_ENV === "development" ? err.stack : undefined,
      });
    }
  }
}
