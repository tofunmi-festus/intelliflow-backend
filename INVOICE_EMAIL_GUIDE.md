# Invoice Email Functionality Guide

## Overview
You can now send invoices to customers via email with a professional PDF attachment automatically generated.

## Endpoint

**POST** `/api/invoices/:id/send`

### Authentication
Requires JWT token in `Authorization: Bearer {token}` header

### Parameters
- `id` (path param): Invoice ID to send

### Request Example
```bash
curl -X POST http://localhost:4000/api/invoices/{INVOICE_ID}/send \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### Response (Success)
```json
{
  "success": true,
  "message": "Invoice sent successfully to customer email",
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "invoice_number": "INV-2024-001",
    "customer_name": "John Doe",
    "customer_email": "john@example.com",
    "amount": 1500,
    "currency": "USD",
    "issue_date": "2024-12-09",
    "due_date": "2024-12-23",
    "description": "Professional Services",
    "status": "sent",
    "payment_received_date": null,
    "created_at": "2024-12-09T10:30:00Z",
    "updated_at": "2024-12-09T10:35:00Z"
  }
}
```

### Response (Error)
```json
{
  "success": false,
  "message": "Failed to send email" | "Invoice not found" | "Unauthorized"
}
```

## What Happens When You Send an Invoice

1. **PDF Generation**: A professional invoice PDF is automatically generated with:
   - Invoice number and dates
   - Customer information
   - Amount and currency
   - Professional IntelliFlow branding
   - Responsive design for all email clients

2. **Email Sending**: An HTML email is sent to the customer with:
   - Professional invoice preview in the email body
   - PDF attachment (`INV-2024-001.pdf`)
   - Payment instructions and contact info

3. **Status Update**: Invoice status automatically changes from `draft` to `sent`

4. **Cleanup**: Temporary PDF files are automatically cleaned up 5 seconds after sending

## Environment Variables Required

Add these to your `.env` file:

```
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@intelliflow.com
```

### Gmail Setup
For Gmail, you need to use an **App Password**, not your regular password:
1. Go to Google Account: https://myaccount.google.com/
2. Select "Security" from the left menu
3. Enable 2-Factor Authentication if not already enabled
4. Go to "App passwords"
5. Generate an app password for "Mail" and "Windows Computer"
6. Use this password in `EMAIL_PASSWORD`

## Testing in Postman

1. **Create an Invoice First**
   ```
   POST http://localhost:4000/api/invoices
   Authorization: Bearer YOUR_JWT_TOKEN
   Content-Type: application/json

   {
     "customer_name": "John Doe",
     "customer_email": "john@example.com",
     "amount": 1500,
     "currency": "USD",
     "issue_date": "2024-12-09",
     "due_date": "2024-12-23",
     "description": "Professional Services"
   }
   ```

2. **Send the Invoice**
   ```
   POST http://localhost:4000/api/invoices/{INVOICE_ID}/send
   Authorization: Bearer YOUR_JWT_TOKEN
   ```

3. **Check the Response**
   - Status should be `200 OK`
   - Invoice status should change to `sent`
   - Customer should receive email with PDF attachment

## Email Templates

The system uses HTML email templates that are:
- **Professional Design**: Blue color scheme with IntelliFlow branding
- **Responsive**: Works on desktop, tablet, and mobile
- **Inclusive**: Works with all major email clients (Gmail, Outlook, Apple Mail, etc.)
- **Accessible**: Proper contrast ratios and semantic HTML

## PDF Invoice Template

The generated PDF includes:
- Company header (IntelliFlow branding)
- Invoice number and dates
- Customer details
- Amount breakdown
- Due date and payment instructions
- Professional footer

## Error Handling

The endpoint handles various error scenarios:
- **401 Unauthorized**: User not authenticated
- **403 Forbidden**: User trying to send another user's invoice
- **404 Not Found**: Invoice doesn't exist
- **500 Server Error**: Email service failed (but PDF was still attempted to be generated)

## Features

✅ Automatic PDF generation with professional design
✅ Email attachment support for PDF invoices
✅ Status tracking (draft → sent)
✅ Automatic temporary file cleanup
✅ Error handling and logging
✅ User authorization checks
✅ HTML email preview + PDF attachment
✅ Responsive email template
✅ SMTP configuration for Gmail
✅ Type-safe TypeScript implementation

## Files Created/Modified

- **Created**: `InvoicePdfService.ts` - Generates HTML invoices as PDFs
- **Created**: `InvoicePdfService.ts` - Manages PDF generation and cleanup
- **Modified**: `EmailService.ts` - Added PDF attachment support
- **Modified**: `InvoiceController.ts` - Added `sendInvoice` method
- **Modified**: `app.ts` - Added POST `/api/invoices/:id/send` route
- **Installed**: `@types/nodemailer` - TypeScript types for nodemailer

## Logs

Check server logs for debugging:
- `[EmailService] Sending invoice...` - Email sending started
- `[EmailService] Attaching PDF: INV-2024-001.pdf` - PDF attached
- `[InvoiceController] Invoice sent successfully` - Email sent and status updated

