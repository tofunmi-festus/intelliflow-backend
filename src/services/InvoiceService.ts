import { supabase } from "../config/supabase";

export interface Invoice {
  id?: string;
  user_id: string;
  invoice_number: string;
  customer_name: string;
  customer_email: string;
  amount: number;
  currency: string;
  issue_date: string;
  due_date: string;
  description?: string;
  status: "draft" | "sent" | "viewed" | "paid" | "overdue" | "cancelled";
  payment_received_date?: string;
  created_at?: string;
  updated_at?: string;
}

export interface InvoicePayment {
  id?: string;
  invoice_id: string;
  payment_date: string;
  amount_paid: number;
  payment_method: string;
  created_at?: string;
}

export interface InvoiceReminder {
  id?: string;
  invoice_id: string;
  reminder_date: string;
  status: "scheduled" | "sent" | "cancelled";
  created_at?: string;
}

export class InvoiceService {
  /**
   * Create a new invoice
   */
  static async createInvoice(invoice: Invoice): Promise<Invoice> {
    try {
      const { data, error } = await supabase
        .from("invoices")
        .insert([
          {
            ...invoice,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw new Error(`Failed to create invoice: ${error.message}`);
      return data;
    } catch (err: any) {
      throw new Error(`Create invoice error: ${err.message}`);
    }
  }

  /**
   * Get all invoices for a user
   */
  static async getUserInvoices(
    userId: string,
    filters?: {
      status?: string;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<Invoice[]> {
    try {
      let query = supabase
        .from("invoices")
        .select("*")
        .eq("user_id", userId);

      if (filters?.status) {
        query = query.eq("status", filters.status);
      }

      if (filters?.startDate && filters?.endDate) {
        query = query
          .gte("issue_date", filters.startDate)
          .lte("issue_date", filters.endDate);
      }

      const { data, error } = await query.order("issue_date", {
        ascending: false,
      });

      if (error) throw new Error(`Failed to fetch invoices: ${error.message}`);
      return data || [];
    } catch (err: any) {
      throw new Error(`Get invoices error: ${err.message}`);
    }
  }

  /**
   * Get a single invoice by ID
   */
  static async getInvoice(invoiceId: string): Promise<Invoice> {
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("id", invoiceId)
        .single();

      if (error) throw new Error(`Invoice not found: ${error.message}`);
      return data;
    } catch (err: any) {
      throw new Error(`Get invoice error: ${err.message}`);
    }
  }

  /**
   * Update invoice status
   */
  static async updateInvoiceStatus(
    invoiceId: string,
    status: string
  ): Promise<Invoice> {
    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString(),
      };

      // If marking as paid, set payment received date
      if (status === "paid") {
        updateData.payment_received_date = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from("invoices")
        .update(updateData)
        .eq("id", invoiceId)
        .select()
        .single();

      if (error) throw new Error(`Failed to update invoice: ${error.message}`);
      return data;
    } catch (err: any) {
      throw new Error(`Update invoice error: ${err.message}`);
    }
  }

  /**
   * Record a payment for an invoice
   */
  static async recordPayment(
    invoiceId: string,
    amountPaid: number,
    paymentMethod: string
  ): Promise<InvoicePayment> {
    try {
      // Create payment record
      const { data: payment, error: paymentError } = await supabase
        .from("invoice_payments")
        .insert([
          {
            invoice_id: invoiceId,
            payment_date: new Date().toISOString(),
            amount_paid: amountPaid,
            payment_method: paymentMethod,
          },
        ])
        .select()
        .single();

      if (paymentError)
        throw new Error(`Failed to record payment: ${paymentError.message}`);

      // Update invoice status to paid
      await this.updateInvoiceStatus(invoiceId, "paid");

      return payment;
    } catch (err: any) {
      throw new Error(`Record payment error: ${err.message}`);
    }
  }

  /**
   * Get payment history for an invoice
   */
  static async getPaymentHistory(invoiceId: string): Promise<InvoicePayment[]> {
    try {
      const { data, error } = await supabase
        .from("invoice_payments")
        .select("*")
        .eq("invoice_id", invoiceId)
        .order("payment_date", { ascending: false });

      if (error) throw new Error(`Failed to fetch payments: ${error.message}`);
      return data || [];
    } catch (err: any) {
      throw new Error(`Get payment history error: ${err.message}`);
    }
  }

  /**
   * Schedule a payment reminder
   */
  static async scheduleReminder(
    invoiceId: string,
    reminderDate: string
  ): Promise<InvoiceReminder> {
    try {
      const { data, error } = await supabase
        .from("invoice_reminders")
        .insert([
          {
            invoice_id: invoiceId,
            reminder_date: reminderDate,
            status: "scheduled",
          },
        ])
        .select()
        .single();

      if (error) throw new Error(`Failed to schedule reminder: ${error.message}`);
      return data;
    } catch (err: any) {
      throw new Error(`Schedule reminder error: ${err.message}`);
    }
  }

  /**
   * Get pending reminders for a user
   */
  static async getPendingReminders(userId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from("invoice_reminders")
        .select(
          `
          *,
          invoices(id, invoice_number, customer_name, amount, due_date)
        `
        )
        .eq("invoices.user_id", userId)
        .eq("status", "scheduled")
        .lte("reminder_date", new Date().toISOString())
        .order("reminder_date", { ascending: true });

      if (error) throw new Error(`Failed to fetch reminders: ${error.message}`);
      return data || [];
    } catch (err: any) {
      throw new Error(`Get reminders error: ${err.message}`);
    }
  }

  /**
   * Get invoice dashboard summary
   */
  static async getInvoiceDashboardSummary(userId: string): Promise<any> {
    try {
      // Get all invoices
      const { data: invoices, error: invoicesError } = await supabase
        .from("invoices")
        .select("*")
        .eq("user_id", userId);

      if (invoicesError)
        throw new Error(
          `Failed to fetch invoices: ${invoicesError.message}`
        );

      const invoiceList = invoices || [];

      // Calculate summary statistics
      const totalInvoices = invoiceList.length;
      const paidInvoices = invoiceList.filter(
        (inv) => inv.status === "paid"
      ).length;
      const pendingInvoices = invoiceList.filter(
        (inv) => inv.status === "sent" || inv.status === "viewed"
      ).length;
      const overdueInvoices = invoiceList.filter(
        (inv) => inv.status === "overdue"
      ).length;

      const totalAmount = invoiceList.reduce(
        (sum, inv) => sum + (inv.amount || 0),
        0
      );
      const paidAmount = invoiceList
        .filter((inv) => inv.status === "paid")
        .reduce((sum, inv) => sum + (inv.amount || 0), 0);
      const pendingAmount = invoiceList
        .filter((inv) => inv.status === "sent" || inv.status === "viewed")
        .reduce((sum, inv) => sum + (inv.amount || 0), 0);
      const overdueAmount = invoiceList
        .filter((inv) => inv.status === "overdue")
        .reduce((sum, inv) => sum + (inv.amount || 0), 0);

      return {
        totalInvoices,
        paidInvoices,
        pendingInvoices,
        overdueInvoices,
        totalAmount,
        paidAmount,
        pendingAmount,
        overdueAmount,
        collectionRate: totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0,
      };
    } catch (err: any) {
      throw new Error(`Dashboard summary error: ${err.message}`);
    }
  }

  /**
   * Check for overdue invoices and update status
   */
  static async checkAndUpdateOverdueInvoices(userId: string): Promise<number> {
    try {
      const today = new Date().toISOString().split("T")[0];

      // Get all pending invoices that are overdue
      const { data: overdueInvoices, error: fetchError } = await supabase
        .from("invoices")
        .select("id")
        .eq("user_id", userId)
        .in("status", ["sent", "viewed"])
        .lt("due_date", today);

      if (fetchError)
        throw new Error(
          `Failed to fetch overdue invoices: ${fetchError.message}`
        );

      const count = overdueInvoices?.length || 0;

      if (count > 0) {
        // Update all overdue invoices
        const { error: updateError } = await supabase
          .from("invoices")
          .update({
            status: "overdue",
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId)
          .in("status", ["sent", "viewed"])
          .lt("due_date", today);

        if (updateError)
          throw new Error(
            `Failed to update overdue invoices: ${updateError.message}`
          );

        console.log(`[InvoiceService] Marked ${count} invoices as overdue`);
      }

      return count;
    } catch (err: any) {
      throw new Error(`Check overdue error: ${err.message}`);
    }
  }

  /**
   * Delete an invoice
   */
  static async deleteInvoice(invoiceId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from("invoices")
        .delete()
        .eq("id", invoiceId);

      if (error) throw new Error(`Failed to delete invoice: ${error.message}`);
    } catch (err: any) {
      throw new Error(`Delete invoice error: ${err.message}`);
    }
  }
}
