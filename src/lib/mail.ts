import nodemailer from 'nodemailer';

const host = process.env.SMTP_HOST;
const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
const secure = process.env.SMTP_SECURE === 'true';
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;
const from = process.env.SMTP_FROM || 'erp@icon.muhammadabbasi.com';

let transporter: nodemailer.Transporter | null = null;

if (host && user && pass) {
  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });
} else {
  console.warn(
    '⚠️ SMTP environment variables are not fully configured. Emails will be logged to the console instead.'
  );
}

export interface SendEmailArgs {
  to: string | string[];
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailArgs) {
  const recipients = Array.isArray(to) ? to.join(', ') : to;

  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: `"ICON ERP" <${from}>`,
        to: recipients,
        subject,
        html,
      });
      console.log(`✉️ Email successfully sent to [${recipients}]. Message ID: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error(`❌ Failed to send email to [${recipients}]:`, error);
      throw error;
    }
  } else {
    // Development fallback logging
    console.log('==================================================');
    console.log(`📬 [DEV EMAIL LOG]`);
    console.log(`From:    ${from}`);
    console.log(`To:      ${recipients}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body:`);
    console.log(html);
    console.log('==================================================');
    return { success: true, simulated: true };
  }
}
