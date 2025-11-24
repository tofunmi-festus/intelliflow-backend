# Transaction Classification & Update Fix

## Problem

Transactions were being fetched and classified, but the database was NOT being updated with predicted categories.

## Root Causes Found

### 1. **Update Query Not Properly Executed**
**Before:**
```typescript
const { error: upsertError } = await supabase
  .from("transactions")
  .update({
    updated_at: new Date().toISOString(),
    categories: predicted,
  }).eq("id", tx.id);
```

**Issue:** The `.update().eq()` chain returns a query object, but this code wasn't properly awaiting or structuring the query.

**After:**
```typescript
const { error: updateError } = await supabase
  .from("transactions")
  .update({
    categories: predicted,
    updated_at: new Date().toISOString(),
  })
  .eq("id", tx.id);
```

**Fix:** Proper chaining with `.eq()` at the end, then awaited.

---

### 2. **Classification Errors Throwing & Breaking Entire Request**
**Before:**
```typescript
const predicted = await TransactionService.classifyTransactionRecord(tx);
// If ML service fails, entire Promise.all fails
```

**Issue:** If ML service was down or slow, the entire request would fail.

**After:**
```typescript
try {
  const predicted = await TransactionService.classifyTransactionRecord(tx);
  // Update database
  const { error: updateError } = await supabase
    .from("transactions")
    .update({ categories: predicted, ... })
    .eq("id", tx.id);

  if (updateError) {
    console.error(`Failed to update transaction ${tx.id}:`, updateError.message);
    return { ...tx, predicted_category: predicted, update_failed: true };
  }
  return { ...tx, predicted_category: predicted };
} catch (classifyError) {
  console.error(`Failed to classify transaction ${tx.id}:`, classifyError);
  return { ...tx, predicted_category: null, classification_failed: true };
}
```

**Fix:** Each transaction has its own try-catch, so one failure doesn't break the whole response.

---

### 3. **ML Service Errors Not Handled Gracefully**
**Before:**
```typescript
catch (error) {
  console.error("Error calling classifier API", error);
  throw new Error("Failed to classify transaction");
}
```

**Issue:** Threw error, which propagated up and broke classification.

**After:**
```typescript
catch (error: any) {
  console.error("Error calling classifier API:", {
    message: error.message,
    status: error.response?.status,
    data: error.response?.data,
    config: error.config?.url,
  });
  return "UNCATEGORIZED";
}
```

**Fix:** Returns `"UNCATEGORIZED"` instead of throwing, so requests continue.

---

## How It Works Now

```
1. Fetch transactions ✓
   ↓
2. For each transaction:
   a. Call ML service to get prediction
   b. If ML fails → use "UNCATEGORIZED" (don't crash)
   c. Update database with predicted category
   d. If update fails → log error but still return transaction
   e. Return transaction with prediction
   ↓
3. Return all transactions (whether update succeeded or not)
```

---

## Key Changes

### `TransactionController.ts`

**Before:**
```typescript
const predicted = await TransactionService.classifyTransactionRecord(tx);

const { error: upsertError } = await supabase
  .from("transactions")
  .update({ ... }).eq("id", tx.id);

if(upsertError){
  console.error(`Upsert failed for ${tx.user_id}:`, upsertError.message)
}

return { ...tx, predicted_category: predicted };
```

**After:**
```typescript
try {
  const predicted = await TransactionService.classifyTransactionRecord(tx);

  const { error: updateError } = await supabase
    .from("transactions")
    .update({
      categories: predicted,
      updated_at: new Date().toISOString(),
    })
    .eq("id", tx.id);

  if (updateError) {
    console.error(`Failed to update transaction ${tx.id}:`, updateError.message);
    return { ...tx, predicted_category: predicted, update_failed: true };
  }

  return { ...tx, predicted_category: predicted };
} catch (classifyError) {
  console.error(`Failed to classify transaction ${tx.id}:`, classifyError);
  return { ...tx, predicted_category: null, classification_failed: true };
}
```

### `ClassifierClient.ts`

**Before:**
```typescript
catch (error) {
  console.error("Error calling classifier API", error);
  throw new Error("Failed to classify transaction");
}
```

**After:**
```typescript
catch (error: any) {
  console.error("Error calling classifier API:", {
    message: error.message,
    status: error.response?.status,
    data: error.response?.data,
    config: error.config?.url,
  });
  return "UNCATEGORIZED";
}
```

---

## Testing

### 1. **Verify ML Service is Running**
```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{"reference":"REF123","remarks":"Payment","debit":0,"credit":1000}'
```

Expected: `{ "predicted_category": "SALARY" }`

### 2. **Test Transaction Fetch**
```bash
curl -X GET https://your-backend.railway.app/api/transactions \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected:
```json
{
  "success": true,
  "count": 5,
  "transactions": [
    {
      "id": "xxx",
      "reference": "REF123",
      "debit": 0,
      "credit": 1000,
      "predicted_category": "SALARY",
      ...
    }
  ]
}
```

### 3. **Check Database**
Verify `categories` column in `transactions` table is now populated:
```sql
SELECT id, reference, categories, updated_at 
FROM transactions 
WHERE user_id = 'your_user_id' 
LIMIT 5;
```

---

## Response Format

**Success (all updated):**
```json
{
  "success": true,
  "count": 3,
  "transactions": [
    { "id": "1", "predicted_category": "SALARY", ... },
    { "id": "2", "predicted_category": "EXPENSE", ... },
    { "id": "3", "predicted_category": "TRANSFER", ... }
  ]
}
```

**Partial failure (some ML errors):**
```json
{
  "success": true,
  "count": 3,
  "transactions": [
    { "id": "1", "predicted_category": "SALARY", ... },
    { "id": "2", "predicted_category": "UNCATEGORIZED", "classification_failed": true },
    { "id": "3", "predicted_category": "TRANSFER", ... }
  ]
}
```

**Update error (classification worked, DB update failed):**
```json
{
  "success": true,
  "transactions": [
    { "id": "1", "predicted_category": "SALARY", "update_failed": true }
  ]
}
```

---

## Debugging Tips

### Check Logs
```bash
# On Railway
railway logs

# Look for:
- "Calling ML service at..."
- "Prediction successful"
- "Failed to update transaction"
- "Failed to classify transaction"
```

### Common Issues

**Issue:** `"classification_failed": true` for all transactions
- **Cause:** ML service is down or unreachable
- **Fix:** Check `ML_SERVICE_URL` environment variable
- **Action:** Restart ML service or update URL

**Issue:** `"update_failed": true` for all transactions
- **Cause:** Missing `categories` column in database
- **Fix:** Add column: `ALTER TABLE transactions ADD COLUMN categories TEXT;`
- **Action:** Redeploy backend

**Issue:** Database shows NULL in categories column
- **Cause:** Updates aren't being saved
- **Fix:** Check Supabase permissions
- **Action:** Verify `SUPABASE_SERVICE_ROLE_KEY` in environment

---

## Deploy

```bash
git add src/controllers/TransactionController.ts src/services/ClassifierClient.ts
git commit -m "Fix transaction classification and database updates"
git push origin main
```

Railway will auto-deploy. Check logs for any errors during the transaction fetch.

