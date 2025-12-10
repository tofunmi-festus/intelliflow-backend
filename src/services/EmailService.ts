import * as fs from "fs";
import axios, { AxiosError } from "axios";

export interface EmailConfig {
  from: string;
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: Buffer;
    contentType?: string;
  }>;
}

/**
 * Brevo (formerly Sendinblue) Email Service
 * More reliable than Gmail for transactional emails
 */
export class EmailService {
  private static readonly BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";
  private static readonly API_KEY = process.env.BREVO_API_KEY;
  private static readonly FROM_EMAIL = process.env.EMAIL_FROM || "noreply@intelliflow.com";
  private static readonly FROM_NAME = "IntelliFlow";

  constructor() {
    EmailService.verifyConfiguration();
  }

  private static verifyConfiguration() {
    if (!this.API_KEY) {
      console.error(
        "[EmailService] ❌ BREVO_API_KEY not found in environment variables"
      );
      console.error(
        "[EmailService] Please add BREVO_API_KEY to your .env file"
      );
      console.error("[EmailService] Get a free account at: https://www.brevo.com");
    } else {
      console.log("[EmailService] ✅ Brevo API configured and ready");
    }
  }

  /**
   * Send invoice email to customer with PDF attachment
   */
  static async sendInvoiceEmail(
    customerEmail: string,
    customerName: string,
    invoiceNumber: string,
    amount: number,
    currency: string,
    dueDate: string,
    invoiceLink?: string,
    pdfPath?: string
  ): Promise<boolean> {
    try {
      const html = this.generateInvoiceEmailHTML(
        customerName,
        invoiceNumber,
        amount,
        currency,
        dueDate,
        invoiceLink
      );

      console.log(
        `[EmailService] Sending invoice ${invoiceNumber} to ${customerEmail}`
      );

      const response = await this.sendEmailWithRetry(
        {
          to: [{ email: customerEmail, name: customerName }],
          subject: `Invoice ${invoiceNumber} - Payment Due ${dueDate}`,
          htmlContent: html,
          sender: {
            name: this.FROM_NAME,
            email: this.FROM_EMAIL,
          },
          attachment: pdfPath
            ? [
                {
                  content: fs.readFileSync(pdfPath).toString("base64"),
                  name: `${invoiceNumber}.pdf`,
                },
              ]
            : undefined,
        },
        3 // max retries
      );

      console.log(
        `[EmailService] Invoice email sent successfully to ${customerEmail}`
      );
      return true;
    } catch (error: any) {
      console.error(`[EmailService] Failed to send invoice email:`, error.message);
      return false;
    }
  }

  /**
   * Send payment reminder email
   */
  static async sendPaymentReminder(
    customerEmail: string,
    customerName: string,
    invoiceNumber: string,
    amount: number,
    currency: string,
    dueDate: string,
    daysOverdue?: number
  ): Promise<boolean> {
    try {
      const html = this.generateReminderEmailHTML(
        customerName,
        invoiceNumber,
        amount,
        currency,
        dueDate,
        daysOverdue
      );

      console.log(
        `[EmailService] Sending payment reminder for ${invoiceNumber} to ${customerEmail}`
      );

      await this.sendEmailWithRetry(
        {
          to: [{ email: customerEmail, name: customerName }],
          subject: daysOverdue
            ? `URGENT: Invoice ${invoiceNumber} is ${daysOverdue} days overdue`
            : `Reminder: Invoice ${invoiceNumber} is due on ${dueDate}`,
          htmlContent: html,
          sender: {
            name: this.FROM_NAME,
            email: this.FROM_EMAIL,
          },
        },
        3
      );

      console.log(
        `[EmailService] Payment reminder sent successfully to ${customerEmail}`
      );
      return true;
    } catch (error: any) {
      console.error(`[EmailService] Failed to send reminder email:`, error.message);
      return false;
    }
  }

  /**
   * Send payment confirmation email
   */
  static async sendPaymentConfirmation(
    customerEmail: string,
    customerName: string,
    invoiceNumber: string,
    amount: number,
    currency: string,
    paymentDate: string
  ): Promise<boolean> {
    try {
      const html = this.generatePaymentConfirmationHTML(
        customerName,
        invoiceNumber,
        amount,
        currency,
        paymentDate
      );

      console.log(
        `[EmailService] Sending payment confirmation for ${invoiceNumber} to ${customerEmail}`
      );

      await this.sendEmailWithRetry(
        {
          to: [{ email: customerEmail, name: customerName }],
          subject: `Payment Received - Invoice ${invoiceNumber}`,
          htmlContent: html,
          sender: {
            name: this.FROM_NAME,
            email: this.FROM_EMAIL,
          },
        },
        3
      );

      console.log(
        `[EmailService] Payment confirmation sent successfully to ${customerEmail}`
      );
      return true;
    } catch (error: any) {
      console.error(
        `[EmailService] Failed to send payment confirmation:`,
        error.message
      );
      return false;
    }
  }

  /**
   * Send email with retry logic
   */
  private static async sendEmailWithRetry(
    emailData: any,
    maxRetries: number = 3
  ): Promise<any> {
    if (!this.API_KEY) {
      throw new Error(
        "BREVO_API_KEY not configured. Get a free account at https://www.brevo.com"
      );
    }

    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[EmailService] Send attempt ${attempt}/${maxRetries}`);

        const response = await axios.post(this.BREVO_API_URL, emailData, {
          headers: {
            "api-key": this.API_KEY,
            "Content-Type": "application/json",
          },
          timeout: 30000,
        });

        console.log(`[EmailService] Email sent successfully. Message ID: ${response.data.messageId}`);
        return response.data;
      } catch (error: any) {
        lastError = error;
        const errorMessage =
          error.response?.data?.message ||
          error.message ||
          "Unknown error";

        console.warn(
          `[EmailService] Attempt ${attempt} failed: ${errorMessage}`
        );

        // Don't retry on auth errors
        if (error.response?.status === 401 || error.response?.status === 403) {
          throw new Error(`Authentication failed: ${errorMessage}. Check BREVO_API_KEY.`);
        }

        // Wait before retrying (exponential backoff)
        if (attempt < maxRetries) {
          const waitTime = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
          console.log(
            `[EmailService] Retrying in ${waitTime / 1000} seconds...`
          );
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
      }
    }

    throw lastError;
  }

  /**
   * Generate invoice email HTML
   */
  private static generateInvoiceEmailHTML(
    customerName: string,
    invoiceNumber: string,
    amount: number,
    currency: string,
    dueDate: string,
    invoiceLink?: string
  ): string {
    const formattedAmount = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(amount);

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
        .header h1 { margin: 0; font-size: 32px; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .invoice-details { background: white; padding: 20px; border-left: 4px solid #667eea; margin: 20px 0; }
        .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
        .row.total { font-weight: bold; font-size: 18px; color: #667eea; border-bottom: 2px solid #667eea; }
        .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
        .btn { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Invoice ${invoiceNumber}</h1>
            <p>Hello ${customerName},</p>
        </div>
        <div class="content">
            <p>We've created an invoice for you. Please find the details below:</p>
            
            <div class="invoice-details">
                <div class="row">
                    <span>Invoice Number:</span>
                    <strong>${invoiceNumber}</strong>
                </div>
                <div class="row">
                    <span>Amount Due:</span>
                    <strong>${formattedAmount}</strong>
                </div>
                <div class="row">
                    <span>Due Date:</span>
                    <strong>${new Date(dueDate).toLocaleDateString()}</strong>
                </div>
                <div class="row total">
                    <span>Total:</span>
                    <span>${formattedAmount}</span>
                </div>
            </div>

            <p>Your invoice is attached to this email. Please review it carefully.</p>
            
            ${
              invoiceLink
                ? `<a href="${invoiceLink}" class="btn">View Invoice Online</a>`
                : ""
            }

            <p style="margin-top: 30px; color: #999; font-size: 14px;">
                If you have any questions about this invoice, please don't hesitate to contact us.
            </p>

            <div class="footer">
                <p>© IntelliFlow. All rights reserved.</p>
                <p>Thank you for your business!</p>
            </div>
        </div>
    </div>
</body>
</html>
    `;
  }

  /**
   * Generate payment reminder email HTML
   */
  private static generateReminderEmailHTML(
    customerName: string,
    invoiceNumber: string,
    amount: number,
    currency: string,
    dueDate: string,
    daysOverdue?: number
  ): string {
    const formattedAmount = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(amount);

    const isOverdue = daysOverdue && daysOverdue > 0;
    const bgColor = isOverdue ? "#ff6b6b" : "#ffa500";

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, ${bgColor} 0%, #d63031 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
        .header h1 { margin: 0; font-size: 32px; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .alert { background: ${bgColor}; color: white; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .invoice-details { background: white; padding: 20px; border-left: 4px solid ${bgColor}; margin: 20px 0; }
        .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
        .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${isOverdue ? "⚠️ URGENT" : "📌 REMINDER"}</h1>
            <p>Hello ${customerName},</p>
        </div>
        <div class="content">
            ${
              isOverdue
                ? `<div class="alert">⚠️ This invoice is ${daysOverdue} days overdue. Immediate payment is required.</div>`
                : `<p>This is a friendly reminder that payment for the following invoice is due:</p>`
            }
            
            <div class="invoice-details">
                <div class="row">
                    <span>Invoice Number:</span>
                    <strong>${invoiceNumber}</strong>
                </div>
                <div class="row">
                    <span>Amount Due:</span>
                    <strong>${formattedAmount}</strong>
                </div>
                <div class="row">
                    <span>Due Date:</span>
                    <strong>${new Date(dueDate).toLocaleDateString()}</strong>
                </div>
                ${
                  isOverdue
                    ? `<div class="row" style="color: #d63031;">
                    <span>Days Overdue:</span>
                    <strong>${daysOverdue} days</strong>
                </div>`
                    : ""
                }
            </div>

            <p>Please arrange payment at your earliest convenience. If payment has already been made, please disregard this message.</p>

            <p style="margin-top: 30px; color: #999; font-size: 14px;">
                If you have any questions or need to discuss payment terms, please contact us immediately.
            </p>

            <div class="footer">
                <p>© IntelliFlow. All rights reserved.</p>
            </div>
        </div>
    </div>
</body>
</html>
    `;
  }

  /**
   * Generate payment confirmation email HTML
   */
  private static generatePaymentConfirmationHTML(
    customerName: string,
    invoiceNumber: string,
    amount: number,
    currency: string,
    paymentDate: string
  ): string {
    const formattedAmount = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(amount);

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
        .header h1 { margin: 0; font-size: 32px; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .success-box { background: #d4edda; border-left: 4px solid #28a745; padding: 20px; margin: 20px 0; border-radius: 5px; }
        .invoice-details { background: white; padding: 20px; border-left: 4px solid #28a745; margin: 20px 0; }
        .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
        .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✅ Payment Received</h1>
            <p>Hello ${customerName},</p>
        </div>
        <div class="content">
            <div class="success-box">
                <h3 style="margin-top: 0; color: #28a745;">Thank you! We've received your payment.</h3>
                <p>Your invoice has been marked as paid.</p>
            </div>
            
            <div class="invoice-details">
                <div class="row">
                    <span>Invoice Number:</span>
                    <strong>${invoiceNumber}</strong>
                </div>
                <div class="row">
                    <span>Amount Paid:</span>
                    <strong>${formattedAmount}</strong>
                </div>
                <div class="row">
                    <span>Payment Date:</span>
                    <strong>${new Date(paymentDate).toLocaleDateString()}</strong>
                </div>
            </div>

            <p>Your transaction is complete. We appreciate your prompt payment and look forward to doing business with you again.</p>

            <p style="margin-top: 30px; color: #999; font-size: 14px;">
                If you have any questions about this transaction, please don't hesitate to contact us.
            </p>

            <div class="footer">
                <p>© IntelliFlow. All rights reserved.</p>
                <p>Thank you for your business!</p>
            </div>
        </div>
    </div>
</body>
</html>
    `;
  }
}
