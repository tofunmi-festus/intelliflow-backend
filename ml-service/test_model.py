import joblib
import pandas as pd

clf = joblib.load("transaction_classifier.pkl")
preprocessor = joblib.load("preprocessor.pkl")

# Prepare input as DataFrame (tabular form)
test_input = pd.DataFrame([{'text': 'sample transaction', 'debit': 100.0, 'credit': 0.0}])

features = preprocessor.transform(test_input)
print(clf.predict(features))
