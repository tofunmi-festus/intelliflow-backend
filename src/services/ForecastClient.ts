import axios from "axios";

const FORECAST_API_URL = process.env.FORECAST_API_URL || "http://localhost:8001";

export interface Transaction {
  transaction_date: string;
  debit: number | null;
  credit: number | null;
}

export interface ForecastResult {
  date: string;
  predicted_cashflow: number;
}

export interface ForecastResponse {
  forecast: ForecastResult[];
}

/**
 * Calls the Python FastAPI forecast service
 * @param transactions - Array of transactions with date, debit, credit
 * @param days - Number of days to forecast ahead (default 30)
 * @returns Forecast result with predicted cashflow for each day
 */
export async function getCashflowForecast(
  transactions: Transaction[],
  days: number = 30
): Promise<ForecastResponse> {
  try {
    console.log(`[ForecastClient] Sending ${transactions.length} transactions to forecast service`);
    console.log(`[ForecastClient] Forecast API URL: ${FORECAST_API_URL}`);
    
    const response = await axios.post(
      `${FORECAST_API_URL}/forecast`,
      {
        transactions,
        days,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 30000, // 30 second timeout for forecast calculation
      }
    );

    console.log(`[ForecastClient] Forecast successful. Got ${response.data.forecast?.length} forecast points`);
    return response.data as ForecastResponse;
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message;
    const errorStatus = error.response?.status || error.code;
    
    console.error(`[ForecastClient] Error: ${errorStatus} - ${errorMessage}`);
    console.error(`[ForecastClient] Full error:`, error);
    
    throw new Error(
      `Failed to fetch forecast from ML service: ${errorStatus} ${errorMessage}`
    );
  }
}
