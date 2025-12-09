import { Request, Response } from "express";
import { InvoiceFlowService, Invoice } from "../services/InvoiceFlowService";

export class InvoiceFlowController {
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

      const {
        customer_name,
        customer_email,
        invoice_number,
        amount,
        description,
        issued_date,
        due_date,
        notes,
      } = req.body;

      // Validate required fields
      if (!customer_name || !customer_email || !invoice_number || !amount || !due_date) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields: customer_name, customer_email, invoice_number, amount, due_date",
        });
      }

      const invoice = await InvoiceFlowService.createInvoice({
        user_id: userId,
        customer_name,
        customer_email,
        invoice_number,
        amount: parseFloat(amount),
        description: description || "",
        issued_date: issued_date || new Date().toISOString().split("T")[0],
        due_date,
        notes: notes || "",
        status: "draft",
      });

      return res.status(201).json({
        success: true,
        message: "Invoice created successfully",
        data: invoice,
      });
    } catch (error: any) {
      console.error("[InvoiceFlow] Error creating invoice:", error.message);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to create invoice",
      });
    }
  }

  /**
   * Get all invoices for authenticated user
   * GET /api/invoices
   */
  static async getUserInvoices(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const result = await InvoiceFlowService.getUserInvoices(userId);

      return res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error("[InvoiceFlow] Error fetching invoices:", error.message);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch invoices",
      });
    }
  }

  /**
   * Get invoice details with reminder history
   * GET /api/invoices/:invoiceId
   */
  static async getInvoiceDetails(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const { invoiceId } = req.params;

      const result = await InvoiceFlowService.getInvoiceDetails(invoiceId);

      // Verify ownership
      if (result.invoice.user_id !== userId) {
        return res.status(403).json({
          success: false,
          message: "Access denied - invoice does not belong to you",
        });
      }

      return res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error("[InvoiceFlow] Error fetching invoice details:", error.message);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch invoice details",
      });
    }
  }

  /**
   * Send invoice to customer
   * POST /api/invoices/:invoiceId/send
   */
  static async sendInvoice(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const { invoiceId } = req.params;

      // Verify ownership
      const details = await InvoiceFlowService.getInvoiceDetails(invoiceId);
      if (details.invoice.user_id !== userId) {
        return res.status(403).json({
          success: false,
          message: "Access denied - invoice does not belong to you",
        });
      }

      const updatedInvoice = await InvoiceFlowService.sendInvoice(invoiceId);

      return res.json({
        success: true,
        message: "Invoice sent successfully",
        data: updatedInvoice,
      });
    } catch (error: any) {
      console.error("[InvoiceFlow] Error sending invoice:", error.message);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to send invoice",
      });
    }
  }

  /**
   * Send reminder for overdue invoice
   * POST /api/invoices/:invoiceId/reminder
   */
  static async sendReminder(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const { invoiceId } = req.params;

      // Verify ownership
      const details = await InvoiceFlowService.getInvoiceDetails(invoiceId);
      if (details.invoice.user_id !== userId) {
        return res.status(403).json({
          success: false,
          message: "Access denied - invoice does not belong to you",
        });
      }

      const reminder = await InvoiceFlowService.sendReminderForInvoice(invoiceId);

      return res.json({
        success: true,
        message: "Reminder sent successfully",
        data: reminder,
      });
    } catch (error: any) {
      console.error("[InvoiceFlow] Error sending reminder:", error.message);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to send reminder",
      });
    }
  }

  /**
   * Mark invoice as paid (manual override)
   * POST /api/invoices/:invoiceId/pay
   */
  static async markAsPaid(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const { invoiceId } = req.params;
      const { transactionId } = req.body;

      if (!transactionId) {
        return res.status(400).json({
          success: false,
          message: "Missing required field: transactionId",
        });
      }

      // Verify ownership
      const details = await InvoiceFlowService.getInvoiceDetails(invoiceId);
      if (details.invoice.user_id !== userId) {
        return res.status(403).json({
          success: false,
          message: "Access denied - invoice does not belong to you",
        });
      }

      const updatedInvoice = await InvoiceFlowService.markInvoiceAsPaid(
        invoiceId,
        transactionId
      );

      return res.json({
        success: true,
        message: "Invoice marked as paid",
        data: updatedInvoice,
      });
    } catch (error: any) {
      console.error("[InvoiceFlow] Error marking invoice as paid:", error.message);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to mark invoice as paid",
      });
    }
  }

  /**
   * Cancel invoice
   * POST /api/invoices/:invoiceId/cancel
   */
  static async cancelInvoice(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const { invoiceId } = req.params;
      const { reason } = req.body;

      // Verify ownership
      const details = await InvoiceFlowService.getInvoiceDetails(invoiceId);
      if (details.invoice.user_id !== userId) {
        return res.status(403).json({
          success: false,
          message: "Access denied - invoice does not belong to you",
        });
      }

      const cancelledInvoice = await InvoiceFlowService.cancelInvoice(invoiceId, reason);

      return res.json({
        success: true,
        message: "Invoice cancelled successfully",
        data: cancelledInvoice,
      });
    } catch (error: any) {
      console.error("[InvoiceFlow] Error cancelling invoice:", error.message);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to cancel invoice",
      });
    }
  }

  /**
   * Auto-detect and match payments to invoices
   * POST /api/invoices/auto-match
   */
  static async autoMatchPayments(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const matched = await InvoiceFlowService.autoMatchPaymentsToInvoices(userId);

      return res.json({
        success: true,
        message: `Auto-matched ${matched} payments to invoices`,
        data: { matched },
      });
    } catch (error: any) {
      console.error("[InvoiceFlow] Error auto-matching payments:", error.message);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to auto-match payments",
      });
    }
  }

  /**
   * Check for overdue invoices
   * POST /api/invoices/check-overdue
   */
  static async checkOverdue(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const overdueCount = await InvoiceFlowService.checkAndMarkOverdueInvoices(userId);

      return res.json({
        success: true,
        message: `Marked ${overdueCount} invoices as overdue`,
        data: { overdueCount },
      });
    } catch (error: any) {
      console.error("[InvoiceFlow] Error checking overdue invoices:", error.message);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to check overdue invoices",
      });
    }
  }
}
