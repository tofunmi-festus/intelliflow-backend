from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List
import pandas as pd
from prophet import Prophet

app = FastAPI()

# Input data model
class Transaction(BaseModel):
    transaction_date: str  # ISO format date string
    debit: float = 0.0
    credit: float = 0.0

class ForecastRequest(BaseModel):
    transactions: List[Transaction]
    days: int = 30  # Forecast horizon

def prepare_daily(transactions_df: pd.DataFrame) -> pd.DataFrame:
    transactions_df['transaction_date'] = pd.to_datetime(transactions_df['transaction_date'])
    transactions_df['debit'] = transactions_df['debit'].fillna(0)
    transactions_df['credit'] = transactions_df['credit'].fillna(0)
    transactions_df['net'] = transactions_df['credit'] - transactions_df['debit']

    daily = transactions_df.groupby(transactions_df['transaction_date'].dt.date)['net'].sum().reset_index()
    daily.columns = ['ds', 'y']
    daily['ds'] = pd.to_datetime(daily['ds'])

    return daily

@app.post("/forecast")
def forecast_cashflow(req: ForecastRequest):
    df = pd.DataFrame([t.dict() for t in req.transactions])
    daily_df = prepare_daily(df)

    if daily_df.shape[0] < 2:
        raise HTTPException(status_code=400, detail="Not enough data to forecast (need at least 2 days).")

    # Create a new Prophet model instance per request
    model = Prophet()
    model.fit(daily_df)

    future = model.make_future_dataframe(periods=req.days)
    forecast = model.predict(future)

    results = forecast[['ds', 'yhat']].tail(req.days)

    return {
        "forecast": [
            {"date": str(row['ds'].date()), "predicted_cashflow": row['yhat']}
            for _, row in results.iterrows()
        ]
    }
