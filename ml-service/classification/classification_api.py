# classification_api.py
from fastapi import FastAPI
from fastapi import HTTPException
from pydantic import BaseModel
import joblib
import pandas as pd

app = FastAPI()

# Load saved model and preprocessor
clf = joblib.load("transaction_classifier.pkl")
preprocessor = joblib.load("preprocessor.pkl")

class Transaction(BaseModel):
    reference: str
    remarks: str
    debit: float
    credit: float

@app.post("/predict")
def predict(tx: Transaction):
    try:
        text = (tx.reference or '') + ' ' + (tx.remarks or '')
        input_df = pd.DataFrame([{'text': text, 'debit': tx.debit, 'credit': tx.credit}])
        features = preprocessor.transform(input_df)
        pred = clf.predict(features)[0]
        return {"predicted_category": pred}
    except Exception as e:
        # Log or print the error
        print("Error during prediction:", e)
        raise HTTPException(status_code=500, detail=str(e))
