# Email Sending Troubleshooting Guide

## Current Status
✅ Code is built and ready
✅ `.env` has email configuration
⚠️ Emails not sending - need to debug

## Step 1: Verify Environment Variables

Your `.env` currently has:
```
EMAIL_SERVICE=gmail
EMAIL_USER=temiidowu321@gmail.com
EMAIL_PASSWORD=yzogpeklvhnzopsn
EMAIL_FROM=noreply@intelliflow.com
```

### Check if EMAIL_PASSWORD is correct:
The password should be a **Gmail App Password**, NOT your regular Gmail password.

To generate an App Password:
1. Go to: https://myaccount.google.com/
2. Click "Security" in the left menu
3. Scroll down to "App passwords" 
4. You may need to enable 2-Factor Authentication first
5. Select "Mail" and "Windows Computer"
6. Google will generate a 16-character password
7. Use that 16-character password in `EMAIL_PASSWORD`

**Current password length:** `yzogpeklvhnzopsn` = 16 characters ✓

## Step 2: Check Server Logs

When you start the backend server, look for these log messages:

### On Startup:
```
[EmailService] Transporter is ready to send emails
```

If you see an error instead, the Gmail configuration is wrong.

### When Creating Invoice:
```
[InvoiceController] Email sending failed: Failed to send invoice email
[EmailService] Failed to send invoice email: [ERROR MESSAGE]
```

### If Email Succeeds:
```
[EmailService] Sending invoice INV-2024-001 to john@example.com
[EmailService] Attaching PDF: INV-2024-001.pdf
[EmailService] Invoice email sent successfully. Message ID: <message-id>
[InvoiceController] Invoice created and sent to customer: INV-2024-001
```

## Step 3: Common Email Issues

### Issue 1: "Invalid login credentials"
**Cause:** Wrong email or app password
**Solution:** Generate a new Gmail app password and update `.env`

### Issue 2: "SMTP Connection timeout"
**Cause:** Gmail SMTP blocked by firewall or network issues
**Solution:** 
- Check internet connection
- Try from a different network
- Check Gmail's SMTP settings: smtp.gmail.com:587

### Issue 3: "Less secure apps are blocked"
**Cause:** Gmail security settings
**Solution:** 
- Go to https://myaccount.google.com/security
- Scroll to "Less secure app access"
- Enable it (or use app passwords instead)

### Issue 4: "Too many login attempts"
**Cause:** Too many failed email attempts
**Solution:** 
- Wait 24 hours
- Verify credentials are correct
- Recover account at: https://accounts.google.com/signin/recovery

## Step 4: Test Email Sending

### Option A: Test via Postman

1. Create an invoice:
```
POST http://localhost:4000/api/invoices
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "invoice_number": "INV-TEST-001",
  "customer_name": "Test Customer",
  "customer_email": "your-test-email@gmail.com",
  "amount": 100,
  "currency": "USD",
  "issue_date": "2024-12-09",
  "due_date": "2024-12-23",
  "description": "Test Invoice"
}
```

2. Check:
   - Response status is 201
   - Invoice is in Supabase database
   - Check server logs for email messages
   - Check your test email inbox (including Spam folder)

### Option B: Manual Test Script

Create a file `test-email.js` in the backend root:

```javascript
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "temiidowu321@gmail.com",
    pass: "yzogpeklvhnzopsn",
  },
});

transporter.sendMail(
  {
    from: "noreply@intelliflow.com",
    to: "your-test-email@gmail.com",
    subject: "Test Email",
    html: "<h1>Test Email from IntelliFlow</h1>",
  },
  (err, info) => {
    if (err) {
      console.error("Error:", err.message);
    } else {
      console.log("Email sent:", info.response);
    }
  }
);
```

Run it:
```bash
node test-email.js
```

## Step 5: Check Email Headers

When you receive a test email, check:
1. **From:** Should be noreply@intelliflow.com
2. **Subject:** Should show invoice number and due date
3. **Body:** Should have HTML formatted invoice
4. **Attachments:** Should have PDF file (INV-XXXX.pdf)

## Step 6: Verify PDF Generation

Check if PDFs are being created in `temp/invoices/`:

```bash
dir "backend-node\temp\invoices"
```

Should show `.html` files like: `INV_TEST_001.html`

If no files appear:
- Check `InvoicePdfService.ts` - path might be wrong
- Check file system permissions
- Create `temp/invoices/` manually if needed

## Diagnostic Checklist

- [ ] Gmail app password generated (16-character, not regular password)
- [ ] `.env` EMAIL_PASSWORD updated with app password
- [ ] Server started and showing "[EmailService] Transporter is ready"
- [ ] Invoice created via POST /api/invoices
- [ ] Server logs show email sending attempts
- [ ] Test email received in inbox or spam folder
- [ ] Invoice status changed to "sent" in database
- [ ] PDF file exists in temp/invoices/

## Quick Fixes to Try

1. **Reset Gmail App Password:**
   - Go to App passwords in Google Account
   - Delete old password
   - Generate new password
   - Update `.env`

2. **Enable Less Secure Apps:**
   - Go to https://myaccount.google.com/security
   - Toggle "Less secure app access" to ON

3. **Check Network:**
   - Verify you have internet connection
   - Try: `ping smtp.gmail.com`

4. **Restart Server:**
   ```bash
   npm run dev
   ```

## Still Not Working?

Enable verbose logging:

Update EmailService.ts line 30 to add detailed logging:

```typescript
console.log("[EmailService] Email config:", {
  service: process.env.EMAIL_SERVICE,
  user: process.env.EMAIL_USER,
  from: process.env.EMAIL_FROM,
  passwordLength: process.env.EMAIL_PASSWORD?.length,
});
```

This will show if environment variables are loaded correctly without exposing the password.

## Support

If emails still don't send:
1. Check the exact error message in server logs
2. Verify credentials by testing with the manual test script
3. Check Gmail account is not locked
4. Verify SMTP is enabled for the email account
