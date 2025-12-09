import nodemailer from "nodemailer";
import { readFileSync } from "fs";
import { extname } from "path";

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

export class EmailService {
  private static transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  constructor() {
    // Verify transporter configuration on initialization
    EmailService.transporter.verify((error, success) => {
      if (error) {
        console.error("[EmailService] Transporter verification failed:", error.message);
      } else {
        console.log("[EmailService] Transporter is ready to send emails");
      }
    });
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

      const mailOptions: any = {
        from: process.env.EMAIL_FROM || "noreply@intelliflow.com",
        to: customerEmail,
        subject: `Invoice ${invoiceNumber} - Payment Due ${dueDate}`,
        html,
      };

      // Add PDF attachment if path provided
      if (pdfPath) {
        try {
          const pdfBuffer = readFileSync(pdfPath);
          mailOptions.attachments = [
            {
              filename: `${invoiceNumber}.pdf`,
              content: pdfBuffer,
              contentType: "application/pdf",
            },
          ];
          console.log(
            `[EmailService] Attaching PDF: ${invoiceNumber}.pdf`
          );
        } catch (pdfError: any) {
          console.warn(
            `[EmailService] Warning: Could not attach PDF - ${pdfError.message}`
          );
          // Continue sending email even if PDF attachment fails
        }
      }

      console.log(
        `[EmailService] Sending invoice ${invoiceNumber} to ${customerEmail}`
      );

      const info = await this.transporter.sendMail(mailOptions);

      console.log(`[EmailService] Invoice email sent successfully. Message ID: ${info.messageId}`);
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

      const mailOptions = {
        from: process.env.EMAIL_FROM || "noreply@intelliflow.com",
        to: customerEmail,
        subject: daysOverdue
          ? `URGENT: Invoice ${invoiceNumber} is ${daysOverdue} days overdue`
          : `Reminder: Invoice ${invoiceNumber} is due on ${dueDate}`,
        html,
      };

      console.log(`[EmailService] Sending reminder for invoice ${invoiceNumber} to ${customerEmail}`);

      const info = await this.transporter.sendMail(mailOptions);

      console.log(`[EmailService] Reminder email sent successfully. Message ID: ${info.messageId}`);
      return true;
    } catch (error: any) {
      console.error(`[EmailService] Failed to send reminder email:`, error.message);
      throw new Error(`Failed to send reminder email: ${error.message}`);
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

      const mailOptions = {
        from: process.env.EMAIL_FROM || "noreply@intelliflow.com",
        to: customerEmail,
        subject: `Payment Received - Invoice ${invoiceNumber}`,
        html,
      };

      console.log(`[EmailService] Sending payment confirmation for invoice ${invoiceNumber} to ${customerEmail}`);

      const info = await this.transporter.sendMail(mailOptions);

      console.log(`[EmailService] Payment confirmation sent successfully. Message ID: ${info.messageId}`);
      return true;
    } catch (error: any) {
      console.error(`[EmailService] Failed to send payment confirmation:`, error.message);
      return false;
    }
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
    return `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #2c3e50; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
            .content { background-color: #f8f9fa; padding: 20px; border-radius: 0 0 5px 5px; }
            .invoice-details { background-color: white; padding: 15px; margin: 20px 0; border-left: 4px solid #3498db; }
            .amount { font-size: 24px; font-weight: bold; color: #2c3e50; margin: 20px 0; }
            .footer { text-align: center; color: #7f8c8d; font-size: 12px; margin-top: 20px; }
            .button { background-color: #3498db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Invoice Notification</h1>
            </div>
            <div class="content">
              <p>Dear ${customerName},</p>
              <p>We have sent you an invoice. Please find the details below:</p>
              
              <div class="invoice-details">
                <p><strong>Invoice Number:</strong> ${invoiceNumber}</p>
                <p><strong>Amount Due:</strong> <span class="amount">${currency} ${amount.toFixed(2)}</span></p>
                <p><strong>Due Date:</strong> ${dueDate}</p>
              </div>
              
              <p>Please arrange payment by the due date. If you have any questions, feel free to reach out.</p>
              
              ${invoiceLink ? `<p><a href="${invoiceLink}" class="button">View Invoice</a></p>` : ""}
              
              <div class="footer">
                <p>This is an automated message. Please do not reply to this email.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Generate reminder email HTML
   */
  private static generateReminderEmailHTML(
    customerName: string,
    invoiceNumber: string,
    amount: number,
    currency: string,
    dueDate: string,
    daysOverdue?: number
  ): string {
    return `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: ${daysOverdue ? "#e74c3c" : "#f39c12"}; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
            .content { background-color: #f8f9fa; padding: 20px; border-radius: 0 0 5px 5px; }
            .invoice-details { background-color: white; padding: 15px; margin: 20px 0; border-left: 4px solid ${daysOverdue ? "#e74c3c" : "#f39c12"}; }
            .amount { font-size: 24px; font-weight: bold; color: #2c3e50; margin: 20px 0; }
            .warning { color: ${daysOverdue ? "#e74c3c" : "#f39c12"}; font-weight: bold; }
            .footer { text-align: center; color: #7f8c8d; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${daysOverdue ? "PAYMENT OVERDUE" : "Payment Reminder"}</h1>
            </div>
            <div class="content">
              <p>Dear ${customerName},</p>
              <p>${daysOverdue ? `This invoice is <span class="warning">${daysOverdue} days overdue</span>. Please settle the payment immediately.` : "This is a friendly reminder that your invoice payment is due soon."}</p>
              
              <div class="invoice-details">
                <p><strong>Invoice Number:</strong> ${invoiceNumber}</p>
                <p><strong>Amount Due:</strong> <span class="amount">${currency} ${amount.toFixed(2)}</span></p>
                <p><strong>Due Date:</strong> ${dueDate}</p>
              </div>
              
              <p>Please arrange payment as soon as possible. If you have any questions, contact us immediately.</p>
              
              <div class="footer">
                <p>This is an automated message. Please do not reply to this email.</p>
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
    return `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #27ae60; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
            .content { background-color: #f8f9fa; padding: 20px; border-radius: 0 0 5px 5px; }
            .invoice-details { background-color: white; padding: 15px; margin: 20px 0; border-left: 4px solid #27ae60; }
            .amount { font-size: 24px; font-weight: bold; color: #27ae60; margin: 20px 0; }
            .checkmark { color: #27ae60; font-size: 30px; }
            .footer { text-align: center; color: #7f8c8d; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1><span class="checkmark">✓</span> Payment Received</h1>
            </div>
            <div class="content">
              <p>Dear ${customerName},</p>
              <p>We have received your payment. Thank you for your prompt settlement!</p>
              
              <div class="invoice-details">
                <p><strong>Invoice Number:</strong> ${invoiceNumber}</p>
                <p><strong>Amount Paid:</strong> <span class="amount">${currency} ${amount.toFixed(2)}</span></p>
                <p><strong>Payment Date:</strong> ${paymentDate}</p>
                <p><strong>Status:</strong> <span style="color: #27ae60; font-weight: bold;">PAID</span></p>
              </div>
              
              <p>Your invoice has been marked as paid. We appreciate your business!</p>
              
              <div class="footer">
                <p>This is an automated message. Please do not reply to this email.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
  }
}
