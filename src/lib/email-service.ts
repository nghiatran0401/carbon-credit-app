import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FROM_EMAIL = process.env.EMAIL_FROM || 'EcoCredit <noreply@ecocredit.com>';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

function isEnabled(): boolean {
  return !!resend;
}

interface OrderEmailData {
  userName: string;
  userEmail: string;
  orderId: number;
  orderCode: number;
  totalPrice: number;
  items: Array<{
    certification: string;
    vintage: number;
    quantity: number;
    pricePerCredit: number;
    subtotal: number;
    forestName?: string;
  }>;
}

interface CertificateEmailData {
  userName: string;
  userEmail: string;
  certificateId: string;
  orderId: number;
  totalCredits: number;
  forestName: string;
}

interface RetirementEmailData {
  userName: string;
  userEmail: string;
  quantity: number;
  certification: string;
  vintage: number;
  forestName: string;
}

interface WelcomeEmailData {
  userName: string;
  userEmail: string;
}

function header(): string {
  return `
    <div style="background: linear-gradient(135deg, #059669, #0d9488); padding: 32px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">
        🌿 EcoCredit
      </h1>
    </div>`;
}

function footer(): string {
  return `
    <div style="padding: 24px 32px; background: #f9fafb; text-align: center; font-size: 12px; color: #6b7280;">
      <p style="margin: 0 0 8px 0;">&copy; ${new Date().getFullYear()} EcoCredit. All rights reserved.</p>
      <p style="margin: 0;">
        <a href="${BASE_URL}/terms" style="color: #059669; text-decoration: none;">Terms of Service</a>
        &nbsp;·&nbsp;
        <a href="${BASE_URL}/privacy" style="color: #059669; text-decoration: none;">Privacy Policy</a>
      </p>
    </div>`;
}

function wrap(content: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        ${header()}
        <div style="padding: 32px;">
          ${content}
        </div>
        ${footer()}
      </div>
    </body>
    </html>`;
}

async function send(to: string, subject: string, html: string): Promise<boolean> {
  if (!resend) {
    console.warn('[email] Resend not configured, skipping email to', to);
    return false;
  }

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    });

    if (error) {
      console.error('[email] Send failed:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[email] Send error:', err);
    return false;
  }
}

export const emailService = {
  isEnabled,

  async sendOrderConfirmation(data: OrderEmailData): Promise<boolean> {
    const itemsHtml = data.items
      .map(
        (item) => `
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
            ${item.forestName ? `<strong>${item.forestName}</strong><br>` : ''}
            ${item.certification} · Vintage ${item.vintage}
          </td>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">$${item.subtotal.toFixed(2)}</td>
        </tr>`,
      )
      .join('');

    const html = wrap(`
      <h2 style="color: #111827; margin: 0 0 8px 0;">Order Confirmed</h2>
      <p style="color: #6b7280; margin: 0 0 24px 0;">Hi ${data.userName}, your carbon credit purchase was successful.</p>

      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <p style="margin: 0; font-size: 14px; color: #166534;">
          <strong>Order #${data.orderId}</strong> · Code: ${data.orderCode}
        </p>
      </div>

      <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 16px;">
        <thead>
          <tr style="border-bottom: 2px solid #e5e7eb;">
            <th style="text-align: left; padding: 8px 0; color: #6b7280; font-weight: 600;">Item</th>
            <th style="text-align: center; padding: 8px 0; color: #6b7280; font-weight: 600;">Qty</th>
            <th style="text-align: right; padding: 8px 0; color: #6b7280; font-weight: 600;">Amount</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
        <tfoot>
          <tr>
            <td colspan="2" style="padding: 12px 0; font-weight: 700; font-size: 16px;">Total</td>
            <td style="padding: 12px 0; text-align: right; font-weight: 700; font-size: 16px; color: #059669;">$${data.totalPrice.toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>

      <p style="color: #6b7280; font-size: 14px;">
        Your certificate will be generated shortly. You can view your order at any time:
      </p>
      <a href="${BASE_URL}/history" style="display: inline-block; background: #059669; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin-top: 8px;">
        View Order History
      </a>
    `);

    return send(data.userEmail, `Order #${data.orderId} Confirmed - EcoCredit`, html);
  },

  async sendCertificateIssued(data: CertificateEmailData): Promise<boolean> {
    const html = wrap(`
      <h2 style="color: #111827; margin: 0 0 8px 0;">Certificate Issued</h2>
      <p style="color: #6b7280; margin: 0 0 24px 0;">Hi ${data.userName}, your carbon credit certificate is ready.</p>

      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin-bottom: 24px; text-align: center;">
        <p style="margin: 0 0 4px 0; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px;">Certificate ID</p>
        <p style="margin: 0; font-size: 16px; font-weight: 700; color: #166534; font-family: monospace;">${data.certificateId}</p>
      </div>

      <table style="width: 100%; font-size: 14px; margin-bottom: 24px;">
        <tr>
          <td style="padding: 6px 0; color: #6b7280;">Order</td>
          <td style="padding: 6px 0; text-align: right; font-weight: 600;">#${data.orderId}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #6b7280;">Forest</td>
          <td style="padding: 6px 0; text-align: right; font-weight: 600;">${data.forestName}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #6b7280;">Credits</td>
          <td style="padding: 6px 0; text-align: right; font-weight: 600;">${data.totalCredits} tCO₂e</td>
        </tr>
      </table>

      <p style="color: #6b7280; font-size: 14px;">Download your certificate or verify it on our platform:</p>
      <a href="${BASE_URL}/certificates/${data.certificateId}" style="display: inline-block; background: #059669; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin-top: 8px;">
        View Certificate
      </a>
    `);

    return send(data.userEmail, `Your Carbon Credit Certificate - EcoCredit`, html);
  },

  async sendCreditsRetired(data: RetirementEmailData): Promise<boolean> {
    const html = wrap(`
      <h2 style="color: #111827; margin: 0 0 8px 0;">Credits Retired</h2>
      <p style="color: #6b7280; margin: 0 0 24px 0;">
        Hi ${data.userName}, you've successfully retired carbon credits as permanent offsets. Thank you for your contribution to climate action.
      </p>

      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin-bottom: 24px; text-align: center;">
        <p style="margin: 0 0 4px 0; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px;">Retired</p>
        <p style="margin: 0; font-size: 28px; font-weight: 700; color: #166534;">${data.quantity} tCO₂e</p>
      </div>

      <table style="width: 100%; font-size: 14px; margin-bottom: 24px;">
        <tr>
          <td style="padding: 6px 0; color: #6b7280;">Certification</td>
          <td style="padding: 6px 0; text-align: right; font-weight: 600;">${data.certification}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #6b7280;">Vintage</td>
          <td style="padding: 6px 0; text-align: right; font-weight: 600;">${data.vintage}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #6b7280;">Forest</td>
          <td style="padding: 6px 0; text-align: right; font-weight: 600;">${data.forestName}</td>
        </tr>
      </table>

      <p style="color: #6b7280; font-size: 13px; font-style: italic;">
        This retirement is permanent and recorded in our immutable audit trail.
      </p>

      <a href="${BASE_URL}/history" style="display: inline-block; background: #059669; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin-top: 8px;">
        View History
      </a>
    `);

    return send(data.userEmail, `Carbon Credits Retired - EcoCredit`, html);
  },

  async sendWelcome(data: WelcomeEmailData): Promise<boolean> {
    const html = wrap(`
      <h2 style="color: #111827; margin: 0 0 8px 0;">Welcome to EcoCredit</h2>
      <p style="color: #6b7280; margin: 0 0 24px 0;">
        Hi ${data.userName}, your account has been created. You're now part of the carbon credit revolution.
      </p>

      <div style="margin-bottom: 24px;">
        <h3 style="color: #111827; font-size: 15px; margin: 0 0 12px 0;">Get started:</h3>
        <table style="width: 100%; font-size: 14px;">
          <tr>
            <td style="padding: 8px 0; color: #059669; font-weight: 600;">1.</td>
            <td style="padding: 8px 0;">Browse verified carbon credits on the <a href="${BASE_URL}/marketplace" style="color: #059669;">Marketplace</a></td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #059669; font-weight: 600;">2.</td>
            <td style="padding: 8px 0;">Run a forest <a href="${BASE_URL}/biomass-only" style="color: #059669;">Biomass Analysis</a></td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #059669; font-weight: 600;">3.</td>
            <td style="padding: 8px 0;">Purchase credits and receive tamper-proof certificates</td>
          </tr>
        </table>
      </div>

      <a href="${BASE_URL}/dashboard" style="display: inline-block; background: #059669; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">
        Go to Dashboard
      </a>
    `);

    return send(data.userEmail, `Welcome to EcoCredit`, html);
  },
};
