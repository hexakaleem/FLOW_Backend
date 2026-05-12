type EmailTemplate =
  | 'welcome'
  | 'password_reset'
  | 'team_invite'
  | 'booking_notification'
  | 'compliance_alert'
  | 'lane_match';

export function sendEmail(
  template: EmailTemplate,
  to: string,
  data: Record<string, unknown>,
): void {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[EMAIL] Template: ${template} | To: ${to}`);
    console.log(`[EMAIL] Data:`, JSON.stringify(data, null, 2));
  }
}
