import { Request, Response } from "express";
import { InvoiceService } from "../services/InvoiceService";

export class InvoiceController {
  /**
   * Create a new invoice
   * POST /api/invoices
   */
  static async createInvoice(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const { invoice_number, customer_name, customer_email, amount, currency, issue_date, due_date, description } = req.body;

      // Validate required fields
      if (!invoice_number || !customer_name || !customer_email || !amount || !currency || !issue_date || !due_date) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields",
        });
      }

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

      return res.status(201).json({
        success: true,
        message: "Invoice created successfully",
        data: invoice,
      });
    } catch (error: any) {
      console.error("[InvoiceController] Create invoice error:", error.message);
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
}
