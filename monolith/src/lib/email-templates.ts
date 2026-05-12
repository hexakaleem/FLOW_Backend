import { config } from '../config';

const brandColor = '#3b82f6';
const brandName = 'FLOW';

function baseTemplate(title: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    .container { max-width: 480px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { background: ${brandColor}; padding: 32px 24px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
    .body { padding: 32px 24px; color: #1e293b; }
    .body h2 { margin: 0 0 16px; font-size: 20px; font-weight: 700; }
    .body p { margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #475569; }
    .otp-box { background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
    .otp-code { font-size: 32px; font-weight: 800; letter-spacing: 8px; color: ${brandColor}; font-family: 'SF Mono', Monaco, monospace; }
    .footer { padding: 24px; text-align: center; font-size: 12px; color: #94a3b8; background: #f8fafc; }
    .footer a { color: ${brandColor}; text-decoration: none; }
    .button { display: inline-block; background: ${brandColor}; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px; margin: 8px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${brandName}</h1>
    </div>
    <div class="body">
      ${content}
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} ${brandName} Logistics. All rights reserved.</p>
      <p style="margin-top:8px;">Questions? Contact us at <a href="mailto:support@flow-logistics.com">support@flow-logistics.com</a></p>
    </div>
  </div>
</body>
</html>`;
}

export const emailTemplates = {
  welcome(data: Record<string, unknown>): { subject: string; html: string } {
    const firstName = (data.firstName as string) || 'there';
    const subject = `Welcome to ${brandName}, ${firstName}!`;
    const html = baseTemplate(
      subject,
      `<h2>Welcome aboard, ${firstName}!</h2>
      <p>Thanks for signing up for <strong>${brandName}</strong> — the intelligent logistics platform connecting brokers, carriers, and drivers in real-time.</p>
      <p>We've sent you a separate email with a 6-digit verification code to confirm your email address. Please enter it on the verification screen to get started.</p>
      <p style="margin-top:24px;">If you have any questions, our team is here to help.</p>`,
    );
    return { subject, html };
  },

  email_verification(data: Record<string, unknown>): { subject: string; html: string } {
    const firstName = (data.firstName as string) || 'there';
    const otp = (data.otp as string) || '000000';
    const subject = `Your ${brandName} verification code`;
    const html = baseTemplate(
      subject,
      `<h2>Verify your email</h2>
      <p>Hi ${firstName},</p>
      <p>Use the code below to verify your email address. It expires in <strong>10 minutes</strong>.</p>
      <div class="otp-box">
        <div class="otp-code">${otp}</div>
      </div>
      <p>If you didn't request this code, you can safely ignore this email.</p>`,
    );
    return { subject, html };
  },

  password_reset(data: Record<string, unknown>): { subject: string; html: string } {
    const otp = (data.otp as string) || '000000';
    const subject = `Reset your ${brandName} password`;
    const html = baseTemplate(
      subject,
      `<h2>Password reset requested</h2>
      <p>We received a request to reset your password. Use the code below to continue. It expires in <strong>10 minutes</strong>.</p>
      <div class="otp-box">
        <div class="otp-code">${otp}</div>
      </div>
      <p>If you didn't request a password reset, you can safely ignore this email.</p>`,
    );
    return { subject, html };
  },

  team_invite(data: Record<string, unknown>): { subject: string; html: string } {
    const inviteUrl = (data.inviteUrl as string) || '#';
    const orgName = (data.orgName as string) || 'your organization';
    const subject = `You've been invited to join ${orgName} on ${brandName}`;
    const html = baseTemplate(
      subject,
      `<h2>Team invitation</h2>
      <p>You've been invited to join <strong>${orgName}</strong> on ${brandName}.</p>
      <p>Click the button below to accept the invitation and create your account.</p>
      <p style="text-align:center; margin: 24px 0;">
        <a href="${inviteUrl}" class="button">Accept Invitation</a>
      </p>
      <p style="font-size:13px; color:#94a3b8;">Or copy this link: ${inviteUrl}</p>`,
    );
    return { subject, html };
  },

  booking_notification(data: Record<string, unknown>): { subject: string; html: string } {
    const loadId = (data.loadId as string) || 'N/A';
    const subject = `Booking update for load ${loadId}`;
    const html = baseTemplate(
      subject,
      `<h2>Booking update</h2>
      <p>There has been an update regarding load <strong>${loadId}</strong>.</p>
      <p>Log in to your dashboard to view the full details.</p>`,
    );
    return { subject, html };
  },

  compliance_alert(data: Record<string, unknown>): { subject: string; html: string } {
    const alertType = (data.alertType as string) || 'Compliance';
    const subject = `${alertType} alert — action required`;
    const html = baseTemplate(
      subject,
      `<h2>${alertType} alert</h2>
      <p>This is an automated compliance notification. Please review your account settings and take any necessary action.</p>`,
    );
    return { subject, html };
  },

  lane_match(data: Record<string, unknown>): { subject: string; html: string } {
    const lane = (data.lane as string) || 'a matching lane';
    const subject = `New load match: ${lane}`;
    const html = baseTemplate(
      subject,
      `<h2>New load match</h2>
      <p>A new load matching your preferred lane <strong>${lane}</strong> has been posted.</p>
      <p>Log in to your dashboard to view and book it.</p>`,
    );
    return { subject, html };
  },
};

export type EmailTemplateKey = keyof typeof emailTemplates;
