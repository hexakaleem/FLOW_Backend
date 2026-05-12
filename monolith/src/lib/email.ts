import nodemailer from 'nodemailer';
import { config } from '../config';
import { emailTemplates, type EmailTemplateKey } from './email-templates';

const transporter =
  config.smtp.host && config.smtp.user && config.smtp.pass
    ? nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port,
        secure: config.smtp.secure,
        auth: {
          user: config.smtp.user,
          pass: config.smtp.pass,
        },
      })
    : null;

export type EmailTemplate = EmailTemplateKey;

export async function sendEmail(
  template: EmailTemplate,
  to: string,
  data: Record<string, unknown>,
): Promise<void> {
  const builder = emailTemplates[template];
  if (!builder) {
    console.error(`[EMAIL] Unknown template: ${template}`);
    return;
  }

  const { subject, html } = builder(data);

  // Always log in development (and as a fallback trace in production)
  if (config.isDevelopment || !transporter) {
    console.log(`[EMAIL] ${template} | To: ${to} | Subject: ${subject}`);
    console.log(`[EMAIL] Data:`, JSON.stringify(data, null, 2));
    if (!transporter) {
      console.warn(
        `[EMAIL] SMTP not configured — email not sent. Set SMTP_HOST, SMTP_USER, and SMTP_PASS in your environment.`,
      );
    }
    return;
  }

  try {
    const info = await transporter.sendMail({
      from: `"${config.smtp.fromName}" <${config.smtp.fromEmail}>`,
      to,
      subject,
      html,
    });

    console.log(`[EMAIL] Sent ${template} to ${to} — MessageId: ${info.messageId}`);
  } catch (err: any) {
    console.error(`[EMAIL] Failed to send ${template} to ${to}:`, err?.message || err);
  }
}
