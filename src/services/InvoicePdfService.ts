import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import PDFDocument from "pdfkit";
import { createWriteStream } from "fs";

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
   * Generate invoice PDF using pdfkit
   * Returns the PDF file path for attachment
   */
  static generateInvoicePdf(data: InvoicePdfData): string {
    this.initTempDir();

    const filename = `${data.invoiceNumber.replace(/[^a-z0-9]/gi, "_")}.pdf`;
    const filePath = join(this.tempDir, filename);

    try {
      const doc = new PDFDocument({
        size: "A4",
        margin: 40,
      });

      const stream = createWriteStream(filePath);
      doc.pipe(stream);

      // Header
      doc
        .fontSize(32)
        .font("Helvetica-Bold")
        .text("INVOICE", { align: "left" });

      doc
        .fontSize(11)
        .font("Helvetica")
        .moveDown(0.5)
        .text(`Invoice #${data.invoiceNumber}`, { align: "left" });

      // Company info (top right)
      doc
        .fontSize(10)
        .text("IntelliFlow", 400, 50)
        .text("Smart Financial Management", 400, 70)
        .text("support@intelliflow.com", 400, 90);

      // Dates
      const startY = 130;
      doc
        .fontSize(10)
        .text(`Issue Date: ${new Date(data.issueDate).toLocaleDateString()}`, 50, startY)
        .text(
          `Due Date: ${new Date(data.dueDate).toLocaleDateString()}`,
          50,
          startY + 20
        );

      // Bill To
      doc
        .fontSize(12)
        .font("Helvetica-Bold")
        .text("BILL TO", 50, startY + 60);

      doc
        .fontSize(10)
        .font("Helvetica")
        .text(data.customerName, 50, startY + 85)
        .text(data.customerEmail, 50, startY + 105);

      // Invoice details table
      const tableTop = startY + 150;
      const col1 = 50;
      const col2 = 400;
      const col3 = 500;

      // Table header
      doc
        .fontSize(11)
        .font("Helvetica-Bold")
        .rect(col1 - 10, tableTop - 10, 530, 30)
        .fill("#667eea");

      doc
        .fontSize(11)
        .font("Helvetica-Bold")
        .fillColor("white")
        .text("Description", col1, tableTop)
        .text("Amount", col3, tableTop, { align: "right" });

      // Table content
      doc
        .fontSize(10)
        .font("Helvetica")
        .fillColor("black")
        .text(data.description || "Professional Services", col1, tableTop + 35, {
          width: col2 - col1,
        });

      const formattedAmount = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: data.currency || "USD",
      }).format(data.amount);

      doc.text(formattedAmount, col1, tableTop + 35, {
        align: "right",
        width: 500 - col1,
      });

      // Totals section
      const totalTop = tableTop + 100;
      doc
        .fontSize(10)
        .text("Subtotal:", col2, totalTop)
        .text(formattedAmount, col3, totalTop, { align: "right" });

      doc.moveTo(col2, totalTop + 20).lineTo(500, totalTop + 20).stroke();

      doc
        .fontSize(14)
        .font("Helvetica-Bold")
        .text("Total Due:", col2, totalTop + 30)
        .text(formattedAmount, col3, totalTop + 30, { align: "right" });

      // Payment instructions
      const instructionsTop = totalTop + 80;
      doc
        .fontSize(11)
        .font("Helvetica-Bold")
        .text("PAYMENT INSTRUCTIONS", 50, instructionsTop);

      doc
        .fontSize(10)
        .font("Helvetica")
        .text(`Please make payment by ${new Date(data.dueDate).toLocaleDateString()} to avoid late fees.`, 50, instructionsTop + 25, {
          width: 480,
        })
        .text(
          "For questions about this invoice, please contact us at support@intelliflow.com",
          50,
          instructionsTop + 55,
          { width: 480 }
        );

      // Footer
      doc
        .fontSize(9)
        .fillColor("#999999")
        .text(
          "Thank you for your business!",
          50,
          doc.page.height - 50,
          {
            align: "center",
          }
        )
        .text("Generated on " + new Date().toLocaleDateString(), {
          align: "center",
        });

      doc.end();

      // Wait for stream to finish
      return new Promise((resolve, reject) => {
        stream.on("finish", () => {
          console.log(`[InvoicePdfService] PDF generated: ${filePath}`);
          resolve(filePath);
        });
        stream.on("error", (err) => {
          console.error("[InvoicePdfService] Error writing PDF:", err);
          reject(err);
        });
      }) as any;
    } catch (error) {
      console.error("[InvoicePdfService] Error generating PDF:", error);
      throw error;
    }
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
