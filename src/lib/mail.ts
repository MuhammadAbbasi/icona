import { Resend } from 'resend';

export interface SendEmailArgs {
  to: string | string[];
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailArgs) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM || 'ICONA <crm@muhammadabbasi.com>';
  const recipients = Array.isArray(to) ? to : [to];

  if (!apiKey) {
    // Dev fallback: no key configured, log to console
    console.warn('⚠️  RESEND_API_KEY not set — email NOT sent. Would have sent:');
    console.log('==================================================');
    console.log(`📬 [DEV EMAIL LOG]`);
    console.log(`From:    ${from}`);
    console.log(`To:      ${recipients.join(', ')}`);
    console.log(`Subject: ${subject}`);
    console.log('==================================================');
    return { success: true, simulated: true };
  }

  const resend = new Resend(apiKey);

  const { data, error } = await resend.emails.send({
    from,
    to: recipients,
    subject,
    html,
  });

  if (error) {
    console.error(`❌ Resend failed to send email to [${recipients.join(', ')}]:`, error);
    throw new Error(error.message);
  }

  console.log(`✉️  Email sent via Resend to [${recipients.join(', ')}]. ID: ${data?.id}`);
  return { success: true, messageId: data?.id };
}
