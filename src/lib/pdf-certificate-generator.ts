import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import type { Certificate } from "@/types";

export class PDFCertificateGenerator {
  /**
   * Generate a PDF certificate from certificate data
   */
  async generatePDFCertificate(certificate: Certificate): Promise<Blob> {
    const metadata = certificate.metadata as any;

    // Create a temporary HTML element for the certificate
    const certificateElement = this.createCertificateHTML(certificate, metadata);
    document.body.appendChild(certificateElement);

    try {
      // Convert HTML to canvas
      const canvas = await html2canvas(certificateElement, {
        scale: 2, // Higher resolution
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        width: 800,
        height: 1120, // Fixed height for single page
        logging: false,
        removeContainer: true,
      });

      // Convert canvas to PDF
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");

      const imgWidth = 210; // A4 width in mm
      const imgHeight = 295; // A4 height in mm

      // Add image to single page
      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);

      // Convert to blob
      const pdfBlob = pdf.output("blob");
      return pdfBlob;
    } finally {
      // Clean up
      document.body.removeChild(certificateElement);
    }
  }

  /**
   * Create HTML element for the certificate
   */
  private createCertificateHTML(certificate: Certificate, metadata: any): HTMLElement {
    const element = document.createElement("div");
    element.style.cssText = `
      width: 800px;
      height: 1120px;
      background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
      border: 3px solid #059669;
      border-radius: 20px;
      padding: 30px;
      font-family: 'Arial', sans-serif;
      color: #1f2937;
      position: fixed;
      top: -9999px;
      left: -9999px;
      z-index: -1;
      box-sizing: border-box;
      overflow: hidden;
    `;

    const issuedDate = new Date(certificate.issuedAt).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    element.innerHTML = `
      <!-- Header -->
      <div style="text-align: center; margin-bottom: 25px;">
        <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 15px;">
          <div style="width: 50px; height: 50px; background: #059669; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 12px;">
            <span style="color: white; font-size: 24px;">🌳</span>
          </div>
          <h1 style="font-size: 28px; font-weight: bold; color: #059669; margin: 0;">Carbon Credit Certificate</h1>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; max-width: 600px; margin: 0 auto;">
          <div style="text-align: left;">
            <p style="margin: 3px 0; font-size: 12px;"><strong>Certificate ID:</strong> ${certificate.id}</p>
            <p style="margin: 3px 0; font-size: 12px;"><strong>Status:</strong> <span style="color: #059669; font-weight: bold;">${certificate.status.toUpperCase()}</span></p>
          </div>
          <div style="text-align: right;">
            <p style="margin: 3px 0; font-size: 12px;"><strong>Issued:</strong> ${issuedDate}</p>
            <p style="margin: 3px 0; font-size: 12px;"><strong>Hash:</strong> ${certificate.certificateHash.substring(0, 16)}...</p>
          </div>
        </div>
      </div>

      <!-- Certificate Holder Section -->
      <div style="background: white; border-radius: 12px; padding: 18px; margin-bottom: 20px; border: 2px solid #e5e7eb;">
        <h2 style="color: #059669; font-size: 20px; margin-bottom: 15px; border-bottom: 2px solid #059669; padding-bottom: 8px;">Certificate Holder</h2>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
          <div>
            <p style="margin: 6px 0; font-size: 14px;"><strong>Name:</strong> ${metadata.userName}</p>
            <p style="margin: 6px 0; font-size: 14px;"><strong>Email:</strong> ${metadata.userEmail}</p>
          </div>
          <div>
            <p style="margin: 6px 0; font-size: 14px;"><strong>Purchase Date:</strong> ${new Date(metadata.purchaseDate).toLocaleDateString()}</p>
            <p style="margin: 6px 0; font-size: 14px;"><strong>Order ID:</strong> #${metadata.orderId}</p>
          </div>
        </div>
      </div>

      <!-- Forest Project Section -->
      <div style="background: white; border-radius: 12px; padding: 18px; margin-bottom: 20px; border: 2px solid #e5e7eb;">
        <h2 style="color: #059669; font-size: 20px; margin-bottom: 15px; border-bottom: 2px solid #059669; padding-bottom: 8px;">Forest Project</h2>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
          <div>
            <p style="margin: 6px 0; font-size: 14px;"><strong>Forest Name:</strong> ${metadata.forestName}</p>
            <p style="margin: 6px 0; font-size: 14px;"><strong>Forest Type:</strong> ${metadata.forestType}</p>
          </div>
          <div>
            <p style="margin: 6px 0; font-size: 14px;"><strong>Total Credits:</strong> <span style="color: #059669; font-weight: bold; font-size: 16px;">${metadata.totalCredits} tCO₂</span></p>
            <p style="margin: 6px 0; font-size: 14px;"><strong>Total Value:</strong> <span style="color: #059669; font-weight: bold; font-size: 16px;">$${metadata.totalValue.toFixed(2)}</span></p>
          </div>
        </div>
      </div>

      <!-- Carbon Credits Details -->
      <div style="background: white; border-radius: 12px; padding: 18px; margin-bottom: 20px; border: 2px solid #e5e7eb;">
        <h2 style="color: #059669; font-size: 20px; margin-bottom: 15px; border-bottom: 2px solid #059669; padding-bottom: 8px;">Carbon Credits Details</h2>
        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
            <thead>
              <tr style="background: #f3f4f6;">
                <th style="border: 1px solid #d1d5db; padding: 8px; text-align: left; font-size: 12px;">Certification</th>
                <th style="border: 1px solid #d1d5db; padding: 8px; text-align: center; font-size: 12px;">Vintage</th>
                <th style="border: 1px solid #d1d5db; padding: 8px; text-align: center; font-size: 12px;">Quantity</th>
                <th style="border: 1px solid #d1d5db; padding: 8px; text-align: center; font-size: 12px;">Price/Credit</th>
                <th style="border: 1px solid #d1d5db; padding: 8px; text-align: center; font-size: 12px;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${
                metadata.items
                  ?.map(
                    (item: any) => `
                <tr>
                  <td style="border: 1px solid #d1d5db; padding: 8px; font-size: 12px;">${item.certification}</td>
                  <td style="border: 1px solid #d1d5db; padding: 8px; text-align: center; font-size: 12px;">${item.vintage}</td>
                  <td style="border: 1px solid #d1d5db; padding: 8px; text-align: center; font-size: 12px;">${item.quantity} tCO₂</td>
                  <td style="border: 1px solid #d1d5db; padding: 8px; text-align: center; font-size: 12px;">$${item.pricePerCredit.toFixed(2)}</td>
                  <td style="border: 1px solid #d1d5db; padding: 8px; text-align: center; font-size: 12px; font-weight: bold;">$${item.subtotal.toFixed(2)}</td>
                </tr>
              `
                  )
                  .join("") || ""
              }
            </tbody>
          </table>
        </div>
      </div>

      <!-- Environmental Impact -->
      <div style="background: white; border-radius: 12px; padding: 18px; margin-bottom: 20px; border: 2px solid #e5e7eb;">
        <h2 style="color: #059669; font-size: 20px; margin-bottom: 15px; border-bottom: 2px solid #059669; padding-bottom: 8px;">Environmental Impact</h2>
        <div style="display: flex; justify-content: space-between; gap: 12px; text-align: center; flex-wrap: wrap;">
          <div style="flex: 1; min-width: 180px; background: #f0f9ff; border-radius: 10px; padding: 15px; border: 1px solid #e0f2fe; margin-bottom: 8px;">
            <div style="font-size: 24px; margin-bottom: 6px; display: block;">🌱</div>
            <p style="font-size: 16px; font-weight: bold; color: #059669; margin: 3px 0; display: block;">${metadata.totalCredits}</p>
            <p style="font-size: 12px; color: #6b7280; margin: 0; display: block;">Carbon Credits</p>
          </div>
          <div style="flex: 1; min-width: 180px; background: #f0f9ff; border-radius: 10px; padding: 15px; border: 1px solid #e0f2fe; margin-bottom: 8px;">
            <div style="font-size: 24px; margin-bottom: 6px; display: block;">🌳</div>
            <p style="font-size: 16px; font-weight: bold; color: #059669; margin: 3px 0; display: block;">${Math.round(metadata.totalCredits * 0.5)}</p>
            <p style="font-size: 12px; color: #6b7280; margin: 0; display: block;">Trees Equivalent</p>
          </div>
          <div style="flex: 1; min-width: 180px; background: #f0f9ff; border-radius: 10px; padding: 15px; border: 1px solid #e0f2fe; margin-bottom: 8px;">
            <div style="font-size: 24px; margin-bottom: 6px; display: block;">🚗</div>
            <p style="font-size: 16px; font-weight: bold; color: #059669; margin: 3px 0; display: block;">${Math.round(metadata.totalCredits * 2.5)}</p>
            <p style="font-size: 12px; color: #6b7280; margin: 0; display: block;">Miles Driven</p>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div style="text-align: center; margin-top: 25px; padding-top: 20px; border-top: 2px solid #e5e7eb;">
        <p style="font-size: 14px; color: #6b7280; margin-bottom: 8px;">
          This certificate represents verified carbon credits from <strong>${metadata.forestName}</strong>
        </p>
        <p style="font-size: 12px; color: #9ca3af; margin-bottom: 12px;">
          Supporting forest conservation and climate action through sustainable carbon credit trading
        </p>
        <div style="display: flex; justify-content: space-between; align-items: center; max-width: 600px; margin: 0 auto;">
          <div style="text-align: left;">
            <p style="font-size: 11px; color: #9ca3af; margin: 1px 0;">Generated by EcoCredit Platform</p>
            <p style="font-size: 11px; color: #9ca3af; margin: 1px 0;">Certificate Hash: ${certificate.certificateHash.substring(0, 16)}...</p>
          </div>
          <div style="text-align: right;">
            <p style="font-size: 11px; color: #9ca3af; margin: 1px 0;">© 2024 EcoCredit</p>
            <p style="font-size: 11px; color: #9ca3af; margin: 1px 0;">All rights reserved</p>
          </div>
        </div>
      </div>
    `;

    return element;
  }
}

// Export singleton instance
export const pdfCertificateGenerator = new PDFCertificateGenerator();
