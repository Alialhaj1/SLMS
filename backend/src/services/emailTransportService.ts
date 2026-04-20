/**
 * Email Transport — Real SMTP delivery via Nodemailer
 * Falls back to logging if SMTP is not configured.
 * Used by EmailTemplateService.send() and store order notifications.
 */

import { config } from '../config/env';

let transporter: any = null;

async function getTransporter(): Promise<any> {
  if (transporter) return transporter;

  if (!config.SMTP_HOST || !config.SMTP_USER) {
    return null; // No SMTP configured — will fall back to logging
  }

  try {
    const nodemailer = await import('nodemailer');
    transporter = nodemailer.createTransport({
      host: config.SMTP_HOST,
      port: config.SMTP_PORT,
      secure: config.SMTP_PORT === 465,
      auth: {
        user: config.SMTP_USER,
        pass: config.SMTP_PASS,
      },
    });

    // Verify connection
    await transporter.verify();
    console.log('✅ SMTP transport ready');
    return transporter;
  } catch (err: any) {
    console.warn('⚠️ SMTP connection failed:', err.message);
    transporter = null;
    return null;
  }
}

/**
 * Send an email. Returns messageId on success.
 * If SMTP is not configured, logs the email and returns a fake messageId.
 */
export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  text?: string | null;
  from?: string;
  replyTo?: string;
}): Promise<{ success: boolean; messageId: string }> {
  const { to, subject, html, text, from, replyTo } = params;
  const sender = from || config.SMTP_FROM;

  const transport = await getTransporter();

  if (transport) {
    const info = await transport.sendMail({
      from: sender,
      to,
      subject,
      html,
      text: text || undefined,
      replyTo: replyTo || undefined,
    });
    return { success: true, messageId: info.messageId };
  }

  // Fallback: log only (dev/staging without SMTP)
  const fakeId = `dev_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  console.log(`📧 [DEV EMAIL] To: ${to} | Subject: ${subject} | ID: ${fakeId}`);
  return { success: true, messageId: fakeId };
}

/**
 * Send store order notification emails
 */
export async function sendOrderConfirmationEmail(params: {
  customerEmail: string;
  customerName: string;
  orderNumber: string;
  total: number;
  currencyCode: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  storeName: string;
}): Promise<void> {
  const { customerEmail, customerName, orderNumber, total, currencyCode, items, storeName } = params;

  const itemRows = items.map(i =>
    `<tr><td style="padding:8px;border-bottom:1px solid #eee">${i.name}</td>` +
    `<td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${i.quantity}</td>` +
    `<td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${i.price.toFixed(2)} ${currencyCode}</td></tr>`
  ).join('');

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#4f46e5;color:white;padding:20px;text-align:center;border-radius:8px 8px 0 0">
        <h1 style="margin:0;font-size:24px">${storeName}</h1>
      </div>
      <div style="padding:24px;background:#fff;border:1px solid #eee">
        <h2 style="color:#333;margin-top:0">Order Confirmation</h2>
        <p>Hi ${customerName},</p>
        <p>Thank you for your order! Here are your order details:</p>
        
        <div style="background:#f9fafb;padding:16px;border-radius:8px;margin:16px 0">
          <strong>Order Number:</strong> ${orderNumber}<br/>
          <strong>Total:</strong> ${total.toFixed(2)} ${currencyCode}
        </div>

        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <thead>
            <tr style="background:#f3f4f6">
              <th style="padding:8px;text-align:left">Item</th>
              <th style="padding:8px;text-align:center">Qty</th>
              <th style="padding:8px;text-align:right">Price</th>
            </tr>
          </thead>
          <tbody>${itemRows}</tbody>
        </table>

        <p style="color:#666;font-size:14px">
          We'll send you another email when your order ships.
        </p>
      </div>
      <div style="padding:16px;text-align:center;color:#999;font-size:12px">
        © ${new Date().getFullYear()} ${storeName}. All rights reserved.
      </div>
    </div>
  `;

  await sendEmail({
    to: customerEmail,
    subject: `Order Confirmed: ${orderNumber} — ${storeName}`,
    html,
    text: `Order ${orderNumber} confirmed. Total: ${total.toFixed(2)} ${currencyCode}. Thank you for shopping at ${storeName}!`,
  });
}

export async function sendPaymentReceivedEmail(params: {
  customerEmail: string;
  customerName: string;
  orderNumber: string;
  amount: number;
  currencyCode: string;
  gateway: string;
  storeName: string;
}): Promise<void> {
  const { customerEmail, customerName, orderNumber, amount, currencyCode, gateway, storeName } = params;

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#059669;color:white;padding:20px;text-align:center;border-radius:8px 8px 0 0">
        <h1 style="margin:0;font-size:24px">Payment Received ✓</h1>
      </div>
      <div style="padding:24px;background:#fff;border:1px solid #eee">
        <p>Hi ${customerName},</p>
        <p>We've received your payment for order <strong>${orderNumber}</strong>.</p>
        <div style="background:#f0fdf4;padding:16px;border-radius:8px;margin:16px 0;border:1px solid #bbf7d0">
          <strong>Amount:</strong> ${amount.toFixed(2)} ${currencyCode}<br/>
          <strong>Payment Method:</strong> ${gateway.charAt(0).toUpperCase() + gateway.slice(1)}
        </div>
        <p style="color:#666;font-size:14px">Your order is now being processed.</p>
      </div>
    </div>
  `;

  await sendEmail({
    to: customerEmail,
    subject: `Payment Received: ${orderNumber} — ${storeName}`,
    html,
    text: `Payment of ${amount.toFixed(2)} ${currencyCode} received for order ${orderNumber}. Your order is being processed.`,
  });
}

export default { sendEmail, sendOrderConfirmationEmail, sendPaymentReceivedEmail };
