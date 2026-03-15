import type { Certificate } from '@/types';
import type { CertificateData } from './certificate-service';

interface ResolvedPdfItem {
  project: string;
  certification: string;
  vintage: number;
  quantity: number;
  pricePerCredit: number;
  subtotal: number;
}

interface ResolvedPdfData {
  holderName: string;
  holderEmail: string;
  issuedDate: string;
  purchaseDate: string;
  orderId: number | string;
  orderCode: number | string;
  statusLabel: string;
  totalCredits: number;
  totalValue: number;
  projectNames: string[];
  items: ResolvedPdfItem[];
}

export class PDFCertificateGenerator {
  async generatePDFCertificate(certificate: Certificate): Promise<Blob> {
    const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf'),
    ]);

    const resolvedData = this.resolveCertificateData(certificate);
    const certificateElement = this.createCertificateHTML(certificate, resolvedData);
    document.body.appendChild(certificateElement);

    try {
      const canvas = await html2canvas(certificateElement, {
        scale: 2, // Higher resolution
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: 800,
        height: 1120, // Fixed height for single page
        logging: false,
        removeContainer: true,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');

      pdf.addImage(imgData, 'PNG', 0, 0, 210, 295);
      return pdf.output('blob');
    } finally {
      // Clean up
      document.body.removeChild(certificateElement);
    }
  }

  /**
   * Create HTML element for the certificate
   */
  private createCertificateHTML(certificate: Certificate, data: ResolvedPdfData): HTMLElement {
    const element = document.createElement('div');
    element.style.cssText = `
      width: 800px;
      height: 1120px;
      background: #ffffff;
      border: 2px solid #d1d5db;
      border-radius: 16px;
      padding: 24px;
      font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      color: #1f2937;
      position: fixed;
      top: -9999px;
      left: -9999px;
      z-index: -1;
      box-sizing: border-box;
      overflow: hidden;
    `;

    element.innerHTML = `
      <div style="height: 100%; display: flex; flex-direction: column; border: 1px solid #e5e7eb; border-radius: 14px; overflow: hidden;">
        <div style="background: linear-gradient(90deg, #ecfdf5 0%, #f0fdfa 55%, #f8fafc 100%); border-bottom: 1px solid #d1fae5; padding: 18px 20px 16px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
            <div style="display: flex; align-items: center;">
              <div style="width: 40px; height: 40px; background: #059669; border-radius: 999px; display: flex; align-items: center; justify-content: center; margin-right: 10px;">
                <span style="color: white; font-size: 16px;">EC</span>
              </div>
              <div>
                <h1 style="font-size: 34px; line-height: 1; font-weight: 800; letter-spacing: -0.6px; color: #047857; margin: 0;">Carbon Credit Certificate</h1>
                <p style="margin: 6px 0 0; font-size: 11px; letter-spacing: .07em; text-transform: uppercase; color: #6b7280; font-weight: 700;">
                  Verified Purchase Record
                </p>
              </div>
            </div>
            <div style="text-align: right;">
              <p style="margin: 0; font-size: 11px; text-transform: uppercase; color: #6b7280; letter-spacing: .05em;">Status</p>
              <p style="margin: 4px 0 0; font-size: 15px; font-weight: 800; color: #047857;">${data.statusLabel}</p>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px;">
            <div style="background: #ffffff; border: 1px solid #d1fae5; border-radius: 9px; padding: 9px;">
              <p style="margin: 0 0 5px; font-size: 10px; text-transform: uppercase; letter-spacing: .08em; color: #6b7280; font-weight: 700;">Certificate ID</p>
              <p style="margin: 0; font-size: 12px; color: #111827; font-weight: 600;">${certificate.id}</p>
            </div>
            <div style="background: #ffffff; border: 1px solid #d1fae5; border-radius: 9px; padding: 9px;">
              <p style="margin: 0 0 5px; font-size: 10px; text-transform: uppercase; letter-spacing: .08em; color: #6b7280; font-weight: 700;">Order Code</p>
              <p style="margin: 0; font-size: 12px; color: #111827; font-weight: 600;">${data.orderCode}</p>
            </div>
            <div style="background: #ffffff; border: 1px solid #d1fae5; border-radius: 9px; padding: 9px;">
              <p style="margin: 0 0 5px; font-size: 10px; text-transform: uppercase; letter-spacing: .08em; color: #6b7280; font-weight: 700;">Issued Date</p>
              <p style="margin: 0; font-size: 12px; color: #111827; font-weight: 600;">${data.issuedDate}</p>
            </div>
          </div>
        </div>
        <div style="padding: 14px 18px 12px; flex: 1; background: #ffffff;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
            <div style="background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px;">
              <p style="margin: 0 0 6px; font-size: 10px; text-transform: uppercase; letter-spacing: .08em; color: #6b7280; font-weight: 700;">Certificate Holder</p>
              <p style="margin: 2px 0; font-size: 13px;"><strong>${data.holderName}</strong></p>
              <p style="margin: 2px 0; font-size: 12px; color: #4b5563;">${data.holderEmail}</p>
            </div>
            <div style="background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px;">
              <p style="margin: 0 0 6px; font-size: 10px; text-transform: uppercase; letter-spacing: .08em; color: #6b7280; font-weight: 700;">Order Details</p>
              <p style="margin: 2px 0; font-size: 13px;"><strong>Order ID:</strong> #${data.orderId}</p>
              <p style="margin: 2px 0; font-size: 13px;"><strong>Purchase Date:</strong> ${data.purchaseDate}</p>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1.5fr 1fr 1fr; gap: 10px; margin-bottom: 10px;">
            <div style="background: #ecfeff; border: 1px solid #bae6fd; border-radius: 10px; padding: 10px;">
              <p style="margin: 0 0 6px; font-size: 10px; text-transform: uppercase; letter-spacing: .08em; color: #0f766e; font-weight: 700;">Projects</p>
              <p style="margin: 0; font-size: 12px; color: #134e4a; line-height: 1.35;">${data.projectNames.join(' · ')}</p>
            </div>
            <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 10px; padding: 10px; text-align: center;">
              <p style="margin: 0; font-size: 10px; text-transform: uppercase; letter-spacing: .08em; color: #047857; font-weight: 700;">Total Credits</p>
              <p style="margin: 8px 0 0; font-size: 20px; font-weight: 800; color: #047857;">${data.totalCredits.toLocaleString()}</p>
              <p style="margin: 2px 0 0; font-size: 11px; color: #065f46;">tCO₂e</p>
            </div>
            <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 10px; padding: 10px; text-align: center;">
              <p style="margin: 0; font-size: 10px; text-transform: uppercase; letter-spacing: .08em; color: #047857; font-weight: 700;">Total Value</p>
              <p style="margin: 8px 0 0; font-size: 20px; font-weight: 800; color: #047857;">$${data.totalValue.toFixed(2)}</p>
              <p style="margin: 2px 0 0; font-size: 11px; color: #065f46;">USD</p>
            </div>
          </div>

          <div style="background: #ffffff; border: 1px solid #d1d5db; border-radius: 10px; overflow: hidden; margin-bottom: 10px;">
            <div style="padding: 8px 10px; background: #f9fafb; border-bottom: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 12px; font-weight: 700; color: #111827;">Purchased Carbon Credits</p>
            </div>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background: #f3f4f6;">
                  <th style="border-bottom: 1px solid #e5e7eb; padding: 7px; text-align: left; font-size: 11px;">Project</th>
                  <th style="border-bottom: 1px solid #e5e7eb; padding: 7px; text-align: left; font-size: 11px;">Certification</th>
                  <th style="border-bottom: 1px solid #e5e7eb; padding: 7px; text-align: center; font-size: 11px;">Vintage</th>
                  <th style="border-bottom: 1px solid #e5e7eb; padding: 7px; text-align: right; font-size: 11px;">Qty</th>
                  <th style="border-bottom: 1px solid #e5e7eb; padding: 7px; text-align: right; font-size: 11px;">Unit</th>
                  <th style="border-bottom: 1px solid #e5e7eb; padding: 7px; text-align: right; font-size: 11px;">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${
                  data.items
                    ?.map(
                      (item, i) => `
                  <tr style="background: ${i % 2 === 0 ? '#ffffff' : '#f9fafb'};">
                    <td style="border-bottom: 1px solid #f3f4f6; padding: 7px; font-size: 11px;">${item.project}</td>
                    <td style="border-bottom: 1px solid #f3f4f6; padding: 7px; font-size: 11px;">${item.certification}</td>
                    <td style="border-bottom: 1px solid #f3f4f6; padding: 7px; text-align: center; font-size: 11px;">${item.vintage}</td>
                    <td style="border-bottom: 1px solid #f3f4f6; padding: 7px; text-align: right; font-size: 11px;">${item.quantity.toLocaleString()}</td>
                    <td style="border-bottom: 1px solid #f3f4f6; padding: 7px; text-align: right; font-size: 11px;">$${item.pricePerCredit.toFixed(2)}</td>
                    <td style="border-bottom: 1px solid #f3f4f6; padding: 7px; text-align: right; font-size: 11px; font-weight: 700;">$${item.subtotal.toFixed(2)}</td>
                  </tr>
                `,
                    )
                    .join('') || ''
                }
              </tbody>
            </table>
          </div>

          <div style="background: #f9fafb; border: 1px dashed #d1d5db; border-radius: 10px; padding: 10px;">
            <p style="margin: 0 0 5px; font-size: 10px; text-transform: uppercase; letter-spacing: .08em; color: #6b7280; font-weight: 700;">Integrity Hash</p>
            <p style="margin: 0; font-family: ui-monospace, Menlo, Monaco, Consolas, 'Liberation Mono', monospace; font-size: 10px; color: #374151; word-break: break-all;">${certificate.certificateHash}</p>
          </div>
        </div>

        <div style="border-top: 1px solid #e5e7eb; background: #fcfcfd; padding: 10px 18px;">
          <p style="font-size: 12px; color: #374151; margin: 0 0 4px; text-align: center;">
            This certificate confirms verified carbon credit purchase for <strong>${data.projectNames.join(', ')}</strong>.
          </p>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div style="text-align: left;">
              <p style="font-size: 10px; color: #9ca3af; margin: 1px 0;">Generated by EcoCredit Platform</p>
              <p style="font-size: 10px; color: #9ca3af; margin: 1px 0;">Template: v3</p>
            </div>
            <div style="text-align: right;">
              <p style="font-size: 10px; color: #9ca3af; margin: 1px 0;">© 2026 EcoCredit</p>
              <p style="font-size: 10px; color: #9ca3af; margin: 1px 0;">All rights reserved</p>
            </div>
          </div>
        </div>
      </div>
    `;

    return element;
  }

  private resolveCertificateData(certificate: Certificate): ResolvedPdfData {
    const metadata = (certificate.metadata as unknown as CertificateData | undefined) ?? undefined;
    const order = certificate.order;

    const orderItems = order?.items ?? [];
    const items: ResolvedPdfItem[] =
      orderItems.length > 0
        ? orderItems.map((item) => ({
            project: item.carbonCredit?.forest?.name || `Credit #${item.carbonCreditId}`,
            certification: item.carbonCredit?.certification ?? 'Unknown',
            vintage: item.carbonCredit?.vintage ?? 0,
            quantity: item.quantity,
            pricePerCredit: item.pricePerCredit,
            subtotal: item.subtotal,
          }))
        : (metadata?.items ?? []).map((item) => ({
            project: metadata?.forestName || 'Forest Project',
            certification: item.certification,
            vintage: item.vintage,
            quantity: item.quantity,
            pricePerCredit: item.pricePerCredit,
            subtotal: item.subtotal,
          }));

    const projectNames = Array.from(
      new Set(
        items
          .map((item) => item.project)
          .filter((name) => typeof name === 'string' && name.trim().length > 0),
      ),
    );
    if (projectNames.length === 0 && metadata?.forestName) {
      projectNames.push(metadata.forestName);
    }
    if (projectNames.length === 0) {
      projectNames.push('Forest Project');
    }

    const totalCredits =
      items.length > 0
        ? items.reduce((sum, item) => sum + item.quantity, 0)
        : (metadata?.totalCredits ?? 0);
    const totalValue =
      typeof order?.totalPrice === 'number'
        ? order.totalPrice
        : items.length > 0
          ? items.reduce((sum, item) => sum + item.subtotal, 0)
          : (metadata?.totalValue ?? 0);
    const holderName =
      order?.user?.firstName || order?.user?.lastName
        ? `${order?.user?.firstName ?? ''} ${order?.user?.lastName ?? ''}`.trim()
        : (metadata?.userName ?? 'Unknown holder');
    const holderEmail = order?.user?.email ?? metadata?.userEmail ?? 'N/A';
    const issuedDate = new Date(certificate.issuedAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const purchaseDate = new Date(
      order?.paidAt ?? metadata?.purchaseDate ?? certificate.issuedAt,
    ).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const orderId = order?.id ?? metadata?.orderId ?? 'N/A';
    const orderCode = order?.orderCode ?? 'N/A';
    const statusLabel =
      certificate.status?.toLowerCase() === 'active'
        ? 'VERIFIED'
        : String(certificate.status ?? '').toUpperCase();

    return {
      holderName,
      holderEmail,
      issuedDate,
      purchaseDate,
      orderId,
      orderCode,
      statusLabel,
      totalCredits,
      totalValue,
      projectNames,
      items,
    };
  }
}

// Export singleton instance
export const pdfCertificateGenerator = new PDFCertificateGenerator();
