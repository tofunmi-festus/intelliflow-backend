/**
 * InvoiceFlow Hub - Automated Invoice & Collection Management System
 * 
 * This system helps small business owners:
 * 1. Create and send digital invoices
 * 2. Automatically track payments in their bank account
 * 3. Send automated reminders for overdue invoices
 * 4. Get instant alerts when invoices are paid
 */

import { supabase } from "../config/supabase";

export interface Invoice {
  id?: string;
  user_id: string;
  customer_name: string;
  customer_email: string;
  invoice_number: string;
  amount: number;
  description: string;
  issued_date: string;
  due_date: string;
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
  payment_reference?: string; // Link to transaction for verification
  sent_at?: string;
  paid_at?: string;
  reminder_sent_at?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface InvoiceReminder {
  id?: string;
  invoice_id: string;
  reminder_type: "initial" | "first_reminder" | "second_reminder" | "urgent";
  sent_at: string;
  email_sent: boolean;
  created_at?: string;
}

export class InvoiceFlowService {
  /**
   * Create a new invoice
   */
  static async createInvoice(invoice: Omit<Invoice, "id" | "created_at" | "updated_at">): Promise<Invoice> {
    try {
      const { data, error } = await supabase
        .from("invoices")
        .insert([
          {
            ...invoice,
            status: "draft",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw new Error(`Failed to create invoice: ${error.message}`);
      
      console.log(`✅ Invoice created: ${invoice.invoice_number}`);
      return data;
    } catch (err: any) {
      console.error("[InvoiceFlow] Error creating invoice:", err.message);
      throw err;
    }
  }

  /**
   * Send invoice to customer (mark as sent and send email)
   */
  static async sendInvoice(invoiceId: string): Promise<Invoice> {
    try {
      const { data, error } = await supabase
        .from("invoices")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", invoiceId)
        .select()
        .single();

      if (error) throw new Error(`Failed to send invoice: ${error.message}`);

      console.log(`📧 Invoice sent: ${data.invoice_number}`);
      
      // TODO: Send email notification to customer with invoice details
      // await sendInvoiceEmail(data.customer_email, data);

      return data;
    } catch (err: any) {
      console.error("[InvoiceFlow] Error sending invoice:", err.message);
      throw err;
    }
  }

  /**
   * Get all invoices for a user with summary
   */
  static async getUserInvoices(userId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("user_id", userId)
        .order("due_date", { ascending: false });

      if (error) throw new Error(`Failed to fetch invoices: ${error.message}`);

      // Calculate statistics
      const summary = this.calculateInvoiceSummary(data);

      return {
        invoices: data || [],
        summary,
      };
    } catch (err: any) {
      console.error("[InvoiceFlow] Error fetching invoices:", err.message);
      throw err;
    }
  }

  /**
   * Mark invoice as paid (link to transaction)
   */
  static async markInvoiceAsPaid(
    invoiceId: string,
    transactionId: string
  ): Promise<Invoice> {
    try {
      const { data, error } = await supabase
        .from("invoices")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
          payment_reference: transactionId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", invoiceId)
        .select()
        .single();

      if (error) throw new Error(`Failed to mark invoice as paid: ${error.message}`);

      console.log(`✅ Invoice marked as paid: ${data.invoice_number}`);
      return data;
    } catch (err: any) {
      console.error("[InvoiceFlow] Error marking invoice as paid:", err.message);
      throw err;
    }
  }

  /**
   * Check for overdue invoices and mark them
   */
  static async checkAndMarkOverdueInvoices(userId: string): Promise<number> {
    try {
      const now = new Date().toISOString();

      // Find invoices that are overdue
      const { data: overdueInvoices, error: fetchError } = await supabase
        .from("invoices")
        .select("id, due_date, invoice_number")
        .eq("user_id", userId)
        .eq("status", "sent")
        .lt("due_date", now);

      if (fetchError) throw fetchError;

      if (!overdueInvoices || overdueInvoices.length === 0) {
        return 0;
      }

      // Mark them as overdue
      const { error: updateError } = await supabase
        .from("invoices")
        .update({
          status: "overdue",
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .eq("status", "sent")
        .lt("due_date", now);

      if (updateError) throw updateError;

      console.log(`⏰ Marked ${overdueInvoices.length} invoices as overdue`);
      return overdueInvoices.length;
    } catch (err: any) {
      console.error("[InvoiceFlow] Error checking overdue invoices:", err.message);
      return 0;
    }
  }

  /**
   * Send reminder for overdue invoice
   */
  static async sendReminderForInvoice(invoiceId: string): Promise<InvoiceReminder> {
    try {
      // Get invoice details
      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .select("*")
        .eq("id", invoiceId)
        .single();

      if (invoiceError) throw invoiceError;

      // Determine reminder type based on how many reminders sent
      const { data: previousReminders } = await supabase
        .from("invoice_reminders")
        .select("id")
        .eq("invoice_id", invoiceId);

      let reminderType: "initial" | "first_reminder" | "second_reminder" | "urgent" = "initial";
      const reminderCount = previousReminders?.length || 0;

      if (reminderCount === 0) reminderType = "initial";
      else if (reminderCount === 1) reminderType = "first_reminder";
      else if (reminderCount === 2) reminderType = "second_reminder";
      else reminderType = "urgent";

      // Create reminder record
      const { data: reminder, error: reminderError } = await supabase
        .from("invoice_reminders")
        .insert([
          {
            invoice_id: invoiceId,
            reminder_type: reminderType,
            sent_at: new Date().toISOString(),
            email_sent: true, // TODO: Integrate email service
          },
        ])
        .select()
        .single();

      if (reminderError) throw reminderError;

      // Update invoice reminder sent date
      await supabase
        .from("invoices")
        .update({
          reminder_sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", invoiceId);

      console.log(`📧 Reminder sent for invoice: ${invoice.invoice_number}`);

      // TODO: Send email reminder to customer
      // await sendReminderEmail(invoice.customer_email, invoice, reminderType);

      return reminder;
    } catch (err: any) {
      console.error("[InvoiceFlow] Error sending reminder:", err.message);
      throw err;
    }
  }

  /**
   * Automatically detect and link paid invoices to transactions
   * This runs periodically to check if any invoices have been paid
   */
  static async autoMatchPaymentsToInvoices(userId: string): Promise<number> {
    try {
      // Get all sent/overdue invoices
      const { data: unpaidInvoices, error: invoiceError } = await supabase
        .from("invoices")
        .select("id, invoice_number, amount, due_date, customer_name")
        .eq("user_id", userId)
        .in("status", ["sent", "overdue"]);

      if (invoiceError) throw invoiceError;

      if (!unpaidInvoices || unpaidInvoices.length === 0) {
        return 0;
      }

      // Get recent transactions (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: transactions, error: txError } = await supabase
        .from("transactions")
        .select("id, credit, transaction_date, remarks, reference")
        .eq("user_id", userId)
        .gt("credit", 0)
        .gte("transaction_date", thirtyDaysAgo);

      if (txError) throw txError;

      let matched = 0;

      // Try to match invoices to transactions
      for (const invoice of unpaidInvoices) {
        for (const tx of transactions || []) {
          // Match if amount is exact or remarks/reference contains invoice number
          const amountMatch = Math.abs(tx.credit - invoice.amount) < 1; // Allow 1 unit difference for rounding
          const referenceMatch =
            tx.remarks?.includes(invoice.invoice_number) ||
            tx.reference?.includes(invoice.invoice_number) ||
            tx.remarks?.includes(invoice.customer_name) ||
            tx.reference?.includes(invoice.customer_name);

          if (amountMatch || referenceMatch) {
            // Mark invoice as paid
            await this.markInvoiceAsPaid(invoice.id, tx.id);
            matched++;
            break; // Move to next invoice
          }
        }
      }

      if (matched > 0) {
        console.log(`✅ Auto-matched ${matched} payments to invoices`);
      }

      return matched;
    } catch (err: any) {
      console.error("[InvoiceFlow] Error auto-matching payments:", err.message);
      return 0;
    }
  }

  /**
   * Calculate invoice statistics
   */
  private static calculateInvoiceSummary(invoices: Invoice[]): any {
    const summary = {
      total: 0,
      sent: 0,
      paid: 0,
      overdue: 0,
      cancelled: 0,
      draft: 0,
      paidAmount: 0,
      overdueAmount: 0,
      totalAmount: 0,
      averagePaymentDays: 0,
    };

    const paidDates: number[] = [];

    for (const invoice of invoices) {
      summary.totalAmount += invoice.amount;

      switch (invoice.status) {
        case "sent":
          summary.sent += 1;
          break;
        case "paid":
          summary.paid += 1;
          summary.paidAmount += invoice.amount;
          
          // Calculate payment days
          if (invoice.sent_at && invoice.paid_at) {
            const days = Math.floor(
              (new Date(invoice.paid_at).getTime() - new Date(invoice.sent_at).getTime()) /
                (1000 * 60 * 60 * 24)
            );
            paidDates.push(days);
          }
          break;
        case "overdue":
          summary.overdue += 1;
          summary.overdueAmount += invoice.amount;
          break;
        case "cancelled":
          summary.cancelled += 1;
          break;
        case "draft":
          summary.draft += 1;
          break;
      }

      summary.total += 1;
    }

    // Calculate average payment days
    if (paidDates.length > 0) {
      summary.averagePaymentDays = Math.round(
        paidDates.reduce((a, b) => a + b, 0) / paidDates.length
      );
    }

    return summary;
  }

  /**
   * Get invoice details with reminder history
   */
  static async getInvoiceDetails(invoiceId: string): Promise<any> {
    try {
      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .select("*")
        .eq("id", invoiceId)
        .single();

      if (invoiceError) throw invoiceError;

      const { data: reminders, error: reminderError } = await supabase
        .from("invoice_reminders")
        .select("*")
        .eq("invoice_id", invoiceId)
        .order("sent_at", { ascending: false });

      if (reminderError) throw reminderError;

      return {
        invoice,
        reminders: reminders || [],
      };
    } catch (err: any) {
      console.error("[InvoiceFlow] Error fetching invoice details:", err.message);
      throw err;
    }
  }

  /**
   * Cancel an invoice
   */
  static async cancelInvoice(invoiceId: string, reason?: string): Promise<Invoice> {
    try {
      const { data, error } = await supabase
        .from("invoices")
        .update({
          status: "cancelled",
          notes: reason || "Invoice cancelled",
          updated_at: new Date().toISOString(),
        })
        .eq("id", invoiceId)
        .select()
        .single();

      if (error) throw error;

      console.log(`❌ Invoice cancelled: ${data.invoice_number}`);
      return data;
    } catch (err: any) {
      console.error("[InvoiceFlow] Error cancelling invoice:", err.message);
      throw err;
    }
  }
}
