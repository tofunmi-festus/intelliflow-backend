import axios from "axios";

const FORECAST_API_URL = process.env.FORECAST_API_URL || "http://localhost:8001";

export interface Transaction {
  transaction_date: string;
  debit: number | null;
  credit: number | null;
}

export interface ForecastResponse {
  forecast: Array<{ date: string; predicted_cashflow: number }>;
}

export async function getCashflowForecast(
  transactions: Transaction[],
  days: number = 30
): Promise<ForecastResponse> {
  try {
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
        timeout: 15000,
      }
    );

    return response.data as ForecastResponse;
  } catch (error: any) {
    console.error("Forecast API error:", error.message);
    throw new Error(
      `Failed to fetch forecast: ${error.response?.status || error.code} ${error.message}`
    );
  }
}
