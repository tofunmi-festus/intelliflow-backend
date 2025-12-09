import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

export interface InvoicePdfData {
  invoiceNumber: string;
  customerName: string;
  customerEmail: string;
  amount: number;
  currency: string;
  issueDate: string;
  dueDate: string;
  description?: string;
}

export class InvoicePdfService {
  private static tempDir = join(process.cwd(), "temp", "invoices");

  /**
   * Initialize temp directory
   */
  private static initTempDir() {
    try {
      mkdirSync(this.tempDir, { recursive: true });
    } catch (error) {
      console.error("[InvoicePdfService] Error creating temp directory:", error);
    }
  }

  /**
   * Generate invoice PDF as HTML content
   * Returns the PDF file path for attachment
   */
  static generateInvoicePdf(data: InvoicePdfData): string {
    this.initTempDir();

    const html = this.generateHtml(data);
    const filename = `${data.invoiceNumber.replace(/[^a-z0-9]/gi, "_")}.html`;
    const filePath = join(this.tempDir, filename);

    try {
      writeFileSync(filePath, html, "utf-8");
      console.log(`[InvoicePdfService] PDF generated: ${filePath}`);
      return filePath;
    } catch (error) {
      console.error("[InvoicePdfService] Error generating PDF:", error);
      throw error;
    }
  }

  /**
   * Generate HTML content for invoice PDF
   */
  private static generateHtml(data: InvoicePdfData): string {
    const formattedAmount = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: data.currency || "USD",
    }).format(data.amount);

    const formattedIssueDate = new Date(data.issueDate).toLocaleDateString(
      "en-US",
      {
        year: "numeric",
        month: "long",
        day: "numeric",
      }
    );

    const formattedDueDate = new Date(data.dueDate).toLocaleDateString(
      "en-US",
      {
        year: "numeric",
        month: "long",
        day: "numeric",
      }
    );

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice ${data.invoiceNumber}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f5f5f5;
            padding: 20px;
            color: #333;
        }
        .container {
            max-width: 900px;
            margin: 0 auto;
            background-color: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 2px solid #007bff;
        }
        .company-info h1 {
            color: #007bff;
            font-size: 32px;
            margin-bottom: 5px;
        }
        .company-info p {
            color: #666;
            font-size: 14px;
        }
        .invoice-details {
            text-align: right;
        }
        .invoice-details h2 {
            color: #007bff;
            font-size: 24px;
            margin-bottom: 10px;
        }
        .invoice-details p {
            color: #666;
            font-size: 14px;
            margin: 5px 0;
        }
        .invoice-details .invoice-number {
            font-weight: bold;
            color: #333;
            font-size: 16px;
        }
        .customer-section {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            margin-bottom: 40px;
        }
        .customer-info h3,
        .company-details h3 {
            color: #007bff;
            font-size: 14px;
            text-transform: uppercase;
            margin-bottom: 10px;
            font-weight: 600;
        }
        .customer-info p,
        .company-details p {
            color: #666;
            font-size: 14px;
            margin: 5px 0;
        }
        .items-table {
            width: 100%;
            margin: 40px 0;
            border-collapse: collapse;
        }
        .items-table thead {
            background-color: #007bff;
            color: white;
        }
        .items-table th {
            padding: 12px;
            text-align: left;
            font-weight: 600;
            font-size: 14px;
        }
        .items-table td {
            padding: 12px;
            border-bottom: 1px solid #eee;
            font-size: 14px;
        }
        .items-table tbody tr:hover {
            background-color: #f9f9f9;
        }
        .items-table .amount {
            text-align: right;
            font-weight: 500;
        }
        .summary-section {
            display: flex;
            justify-content: flex-end;
            margin: 30px 0;
        }
        .summary {
            width: 300px;
        }
        .summary-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #eee;
            font-size: 14px;
        }
        .summary-row.total {
            border-bottom: 2px solid #007bff;
            padding: 15px 0;
            font-weight: bold;
            color: #007bff;
            font-size: 18px;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            text-align: center;
            color: #666;
            font-size: 12px;
        }
        .payment-notes {
            background-color: #f0f8ff;
            border-left: 4px solid #007bff;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .payment-notes p {
            color: #333;
            font-size: 13px;
            margin: 5px 0;
        }
        .payment-notes strong {
            color: #007bff;
        }
        @media print {
            body {
                background-color: white;
            }
            .container {
                box-shadow: none;
                padding: 0;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="company-info">
                <h1>IntelliFlow</h1>
                <p>Professional Invoice Management</p>
            </div>
            <div class="invoice-details">
                <h2>INVOICE</h2>
                <p class="invoice-number">${data.invoiceNumber}</p>
                <p><strong>Issue Date:</strong> ${formattedIssueDate}</p>
                <p><strong>Due Date:</strong> ${formattedDueDate}</p>
            </div>
        </div>

        <div class="customer-section">
            <div class="customer-info">
                <h3>Bill To</h3>
                <p><strong>${data.customerName}</strong></p>
                <p>${data.customerEmail}</p>
            </div>
            <div class="company-details">
                <h3>From</h3>
                <p><strong>IntelliFlow</strong></p>
                <p>Smart Financial Management</p>
                <p>support@intelliflow.com</p>
            </div>
        </div>

        <table class="items-table">
            <thead>
                <tr>
                    <th>Description</th>
                    <th style="text-align: right;">Amount</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>${data.description || "Professional Services"}</td>
                    <td class="amount">${formattedAmount}</td>
                </tr>
            </tbody>
        </table>

        <div class="summary-section">
            <div class="summary">
                <div class="summary-row">
                    <span>Subtotal:</span>
                    <span>${formattedAmount}</span>
                </div>
                <div class="summary-row total">
                    <span>Total Due:</span>
                    <span>${formattedAmount}</span>
                </div>
            </div>
        </div>

        <div class="payment-notes">
            <p><strong>Payment Instructions:</strong></p>
            <p>Please make payment by ${formattedDueDate} to avoid late fees.</p>
            <p>For questions about this invoice, please contact us at support@intelliflow.com</p>
        </div>

        <div class="footer">
            <p>Thank you for your business!</p>
            <p>IntelliFlow - Smart Financial Management Platform</p>
            <p>Generated on ${new Date().toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}</p>
        </div>
    </div>
</body>
</html>
    `;
  }

  /**
   * Clean up temporary invoice files
   */
  static cleanupFile(filePath: string): void {
    try {
      const { unlinkSync } = require("fs");
      unlinkSync(filePath);
      console.log(`[InvoicePdfService] Cleaned up: ${filePath}`);
    } catch (error) {
      console.warn(`[InvoicePdfService] Could not clean up file: ${filePath}`);
    }
  }
}
