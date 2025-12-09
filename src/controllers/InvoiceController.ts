import { Request, Response } from "express";
import { InvoiceService } from "../services/InvoiceService";
import { EmailService } from "../services/EmailService";
import { InvoicePdfService } from "../services/InvoicePdfService";

export class InvoiceController {
  /**
   * Create a new invoice and send to customer email
   * POST /api/invoices
   */
  static async createInvoice(req: Request, res: Response) {
    let pdfPath: string | null = null;

    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const {
        invoice_number,
        customer_name,
        customer_email,
        amount,
        currency,
        issue_date,
        due_date,
        description,
      } = req.body;

      // Validate required fields
      if (
        !invoice_number ||
        !customer_name ||
        !customer_email ||
        !amount ||
        !currency ||
        !issue_date ||
        !due_date
      ) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields",
        });
      }

      // Create invoice in database
      const invoice = await InvoiceService.createInvoice({
        user_id: userId,
        invoice_number,
        customer_name,
        customer_email,
        amount,
        currency,
        issue_date,
        due_date,
        description,
        status: "draft",
      });

      // Generate PDF
      try {
        pdfPath = InvoicePdfService.generateInvoicePdf({
          invoiceNumber: invoice.invoice_number,
          customerName: invoice.customer_name,
          customerEmail: invoice.customer_email,
          amount: invoice.amount,
          currency: invoice.currency,
          issueDate: invoice.issue_date,
          dueDate: invoice.due_date,
          description: invoice.description,
        });

        // Send email with PDF attachment
        const emailSent = await EmailService.sendInvoiceEmail(
          invoice.customer_email,
          invoice.customer_name,
          invoice.invoice_number,
          invoice.amount,
          invoice.currency,
          invoice.due_date,
          undefined, // invoiceLink
          pdfPath // pdfPath with attachment
        );

        if (emailSent && invoice.id) {
          // Update status to "sent" only if email was sent successfully
          await InvoiceService.updateInvoiceStatus(invoice.id, "sent");
          invoice.status = "sent";
          console.log(
            "[InvoiceController] Invoice created and sent to customer:",
            invoice.invoice_number
          );
        } else {
          console.warn(
            "[InvoiceController] Email failed but invoice created:",
            invoice.invoice_number
          );
        }
      } catch (emailError: any) {
        console.warn(
          "[InvoiceController] Email sending failed:",
          emailError.message,
          "- Invoice still created"
        );
      } finally {
        // Clean up PDF after sending
        if (pdfPath) {
          setTimeout(() => {
            InvoicePdfService.cleanupFile(pdfPath!);
          }, 5000);
        }
      }

      return res.status(201).json({
        success: true,
        message:
          invoice.status === "sent"
            ? "Invoice created and sent to customer successfully"
            : "Invoice created but email sending failed",
        data: invoice,
      });
    } catch (error: any) {
      console.error("[InvoiceController] Create invoice error:", error.message);

      // Clean up PDF on error
      if (pdfPath) {
        InvoicePdfService.cleanupFile(pdfPath);
      }

      return res.status(500).json({
        success: false,
        message: error.message || "Failed to create invoice",
      });
    }
  }

  /**
   * Get all invoices for the user
   * GET /api/invoices
   */
  static async getInvoices(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const { status, startDate, endDate } = req.query;

      const invoices = await InvoiceService.getUserInvoices(userId, {
        status: status as string,
        startDate: startDate as string,
        endDate: endDate as string,
      });

      return res.json({
        success: true,
        data: invoices,
        count: invoices.length,
      });
    } catch (error: any) {
      console.error("[InvoiceController] Get invoices error:", error.message);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch invoices",
      });
    }
  }

  /**
   * Get a single invoice
   * GET /api/invoices/:id
   */
  static async getInvoice(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const invoice = await InvoiceService.getInvoice(id);

      return res.json({
        success: true,
        data: invoice,
      });
    } catch (error: any) {
      console.error("[InvoiceController] Get invoice error:", error.message);
      return res.status(404).json({
        success: false,
        message: error.message || "Invoice not found",
      });
    }
  }

  /**
   * Update invoice status
   * PUT /api/invoices/:id/status
   */
  static async updateInvoiceStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({
          success: false,
          message: "Status is required",
        });
      }

      const invoice = await InvoiceService.updateInvoiceStatus(id, status);

      return res.json({
        success: true,
        message: "Invoice status updated",
        data: invoice,
      });
    } catch (error: any) {
      console.error("[InvoiceController] Update status error:", error.message);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to update invoice status",
      });
    }
  }

  /**
   * Record a payment for an invoice
   * POST /api/invoices/:id/payments
   */
  static async recordPayment(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { amount_paid, payment_method } = req.body;

      if (!amount_paid || !payment_method) {
        return res.status(400).json({
          success: false,
          message: "Amount paid and payment method are required",
        });
      }

      const payment = await InvoiceService.recordPayment(
        id,
        amount_paid,
        payment_method
      );

      return res.status(201).json({
        success: true,
        message: "Payment recorded successfully",
        data: payment,
      });
    } catch (error: any) {
      console.error("[InvoiceController] Record payment error:", error.message);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to record payment",
      });
    }
  }

  /**
   * Get payment history for an invoice
   * GET /api/invoices/:id/payments
   */
  static async getPaymentHistory(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const payments = await InvoiceService.getPaymentHistory(id);

      return res.json({
        success: true,
        data: payments,
        count: payments.length,
      });
    } catch (error: any) {
      console.error("[InvoiceController] Get payments error:", error.message);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch payment history",
      });
    }
  }

  /**
   * Schedule a payment reminder
   * POST /api/invoices/:id/reminders
   */
  static async scheduleReminder(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { reminder_date } = req.body;

      if (!reminder_date) {
        return res.status(400).json({
          success: false,
          message: "Reminder date is required",
        });
      }

      const reminder = await InvoiceService.scheduleReminder(id, reminder_date);

      return res.status(201).json({
        success: true,
        message: "Reminder scheduled successfully",
        data: reminder,
      });
    } catch (error: any) {
      console.error("[InvoiceController] Schedule reminder error:", error.message);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to schedule reminder",
      });
    }
  }

  /**
   * Get invoice dashboard summary
   * GET /api/invoices/dashboard/summary
   */
  static async getDashboardSummary(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      // Check and update overdue invoices first
      await InvoiceService.checkAndUpdateOverdueInvoices(userId);

      const summary = await InvoiceService.getInvoiceDashboardSummary(userId);

      return res.json({
        success: true,
        data: summary,
      });
    } catch (error: any) {
      console.error("[InvoiceController] Dashboard summary error:", error.message);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch dashboard summary",
      });
    }
  }

  /**
   * Delete an invoice
   * DELETE /api/invoices/:id
   */
  static async deleteInvoice(req: Request, res: Response) {
    try {
      const { id } = req.params;

      await InvoiceService.deleteInvoice(id);

      return res.json({
        success: true,
        message: "Invoice deleted successfully",
      });
    } catch (error: any) {
      console.error("[InvoiceController] Delete invoice error:", error.message);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to delete invoice",
      });
    }
  }

  /**
   * Send invoice to customer email with PDF attachment
   * POST /api/invoices/:id/send
   */
  static async sendInvoice(req: Request, res: Response) {
    let pdfPath: string | null = null;

    try {
      const { id } = req.params;
      const user = (req as any).user;

      if (!user || !user.id) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      // Fetch invoice
      const invoice = await InvoiceService.getInvoice(id);

      if (!invoice) {
        return res.status(404).json({
          success: false,
          message: "Invoice not found",
        });
      }

      // Verify invoice belongs to user
      if (invoice.user_id !== user.id) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized to send this invoice",
        });
      }

      // Generate PDF
      pdfPath = InvoicePdfService.generateInvoicePdf({
        invoiceNumber: invoice.invoice_number,
        customerName: invoice.customer_name,
        customerEmail: invoice.customer_email,
        amount: invoice.amount,
        currency: invoice.currency,
        issueDate: invoice.issue_date,
        dueDate: invoice.due_date,
        description: invoice.description,
      });

      // Send email with PDF attachment
      const emailSent = await EmailService.sendInvoiceEmail(
        invoice.customer_email,
        invoice.customer_name,
        invoice.invoice_number,
        invoice.amount,
        invoice.currency,
        invoice.due_date,
        undefined, // invoiceLink (optional)
        pdfPath // pdfPath with attachment
      );

      if (!emailSent) {
        return res.status(500).json({
          success: false,
          message: "Failed to send email",
        });
      }

      // Update status to "sent"
      const updatedInvoice = await InvoiceService.updateInvoiceStatus(
        id,
        "sent"
      );

      console.log(
        "[InvoiceController] Invoice sent successfully:",
        invoice.invoice_number
      );

      // Clean up PDF after sending
      if (pdfPath) {
        setTimeout(() => {
          InvoicePdfService.cleanupFile(pdfPath!);
        }, 5000); // Wait 5 seconds before cleanup
      }

      return res.json({
        success: true,
        message: "Invoice sent successfully to customer email",
        data: updatedInvoice,
      });
    } catch (error: any) {
      console.error("[InvoiceController] Send invoice error:", error.message);

      // Clean up PDF on error
      if (pdfPath) {
        InvoicePdfService.cleanupFile(pdfPath);
      }

      return res.status(500).json({
        success: false,
        message: error.message || "Failed to send invoice",
      });
    }
  }
}
