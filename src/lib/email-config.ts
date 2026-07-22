// Per-tenant outbound email over SMTP. Gmail, Outlook/Live/Hotmail, Yahoo and
// any dedicated mail server all speak SMTP and differ only in host/port, so one
// nodemailer transport + a preset table covers every provider the business
// asked for. No OAuth, no per-provider SDK, no new dependency.

export type EmailProvider = 'gmail' | 'outlook' | 'yahoo' | 'custom';

export interface OrgEmailConfig {
  provider: EmailProvider;
  fromName: string;
  fromEmail: string;   // the address mail is sent AS, and Reply-To (so replies reach the tenant)
  user: string;        // SMTP login — usually the same as fromEmail
  passEnc: string;     // SMTP password / app-password, AES-256-GCM ciphertext (never plaintext at rest)
  host?: string;       // custom provider only; presets fill host/port/secure for the rest
  port?: number;
  secure?: boolean;
}

// Outlook.com / Live / Hotmail all use the same Microsoft consumer SMTP host,
// so "Live" maps onto the outlook preset rather than needing its own row.
export const PROVIDER_PRESETS: Record<Exclude<EmailProvider, 'custom'>, { host: string; port: number; secure: boolean }> = {
  gmail:   { host: 'smtp.gmail.com',        port: 587, secure: false }, // STARTTLS
  outlook: { host: 'smtp-mail.outlook.com', port: 587, secure: false }, // STARTTLS (Outlook/Live/Hotmail)
  yahoo:   { host: 'smtp.mail.yahoo.com',   port: 465, secure: true  }, // implicit TLS
};

// Resolve the transport host/port/secure for a saved config. Presets are fixed;
// a custom provider supplies its own host and (optionally) port/secure.
export function resolveSmtp(cfg: Pick<OrgEmailConfig, 'provider' | 'host' | 'port' | 'secure'>): { host: string; port: number; secure: boolean } {
  if (cfg.provider === 'custom') {
    if (!cfg.host) throw new Error('Custom email provider requires an SMTP host.');
    const port = cfg.port ?? 587;
    // Port 465 is implicit TLS; anything else defaults to STARTTLS unless told otherwise.
    return { host: cfg.host, port, secure: cfg.secure ?? port === 465 };
  }
  return PROVIDER_PRESETS[cfg.provider];
}
