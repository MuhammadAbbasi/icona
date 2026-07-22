import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import { prisma } from '@/lib/prisma';
import { decryptSecret } from '@/lib/crypto';
import { resolveSmtp, type OrgEmailConfig } from '@/lib/email-config';

export interface SendEmailArgs {
  to: string | string[];
  subject: string;
  html: string;
  // When set and that org has configured its own mailbox (Settings → Email
  // Delivery), the message is sent from the tenant's own address instead of
  // the platform's global Resend sender.
  orgId?: string | null;
}

// Returns the org's SMTP config only if it is complete enough to send with.
async function getOrgEmailConfig(orgId?: string | null): Promise<OrgEmailConfig | null> {
  if (!orgId) return null;
  const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { emailConfig: true } });
  const cfg = (org?.emailConfig as unknown as OrgEmailConfig) || null;
  if (!cfg || !cfg.user || !cfg.passEnc || !cfg.fromEmail) return null;
  if (cfg.provider === 'custom' && !cfg.host) return null;
  return cfg;
}

// Send through a tenant's own SMTP mailbox. Reply-To is the tenant address so
// replies land in their real inbox — "receiving" without building one.
export async function sendViaSmtp(cfg: OrgEmailConfig, { to, subject, html }: SendEmailArgs) {
  const { host, port, secure } = resolveSmtp(cfg);
  const transporter = nodemailer.createTransport({
    host, port, secure,
    auth: { user: cfg.user, pass: decryptSecret(cfg.passEnc) },
  });
  const recipients = Array.isArray(to) ? to : [to];
  const info = await transporter.sendMail({
    from: `${cfg.fromName || 'ICONA'} <${cfg.fromEmail}>`,
    replyTo: cfg.fromEmail,
    to: recipients,
    subject,
    html,
  });
  console.log(`✉️  Email sent via tenant SMTP (${host}) to [${recipients.join(', ')}]. ID: ${info.messageId}`);
  return { success: true, messageId: info.messageId };
}

export async function sendEmail({ to, subject, html, orgId }: SendEmailArgs) {
  // 1. Tenant's own mailbox, if configured. A misconfigured tenant SMTP should
  //    surface as an error, not silently fall back to the platform sender —
  //    so this is deliberately NOT wrapped in a try/catch.
  const orgCfg = await getOrgEmailConfig(orgId);
  if (orgCfg) return sendViaSmtp(orgCfg, { to, subject, html });

  // 2. Platform default: Resend.
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM || 'ICONA <crm@muhammadabbasi.com>';
  const recipients = Array.isArray(to) ? to : [to];

  if (!apiKey) {
    // Dev fallback: no key configured, log to console.
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
