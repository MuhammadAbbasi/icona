// Preset resolution is the one bit of non-trivial logic here; pin it.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveSmtp } from './email-config';

describe('resolveSmtp', () => {
  it('gmail → STARTTLS on 587', () => {
    assert.deepStrictEqual(resolveSmtp({ provider: 'gmail' }), { host: 'smtp.gmail.com', port: 587, secure: false });
  });

  it('outlook/live → Microsoft consumer host', () => {
    assert.deepStrictEqual(resolveSmtp({ provider: 'outlook' }), { host: 'smtp-mail.outlook.com', port: 587, secure: false });
  });

  it('yahoo → implicit TLS on 465', () => {
    assert.deepStrictEqual(resolveSmtp({ provider: 'yahoo' }), { host: 'smtp.mail.yahoo.com', port: 465, secure: true });
  });

  it('custom passes host through and infers secure from port 465', () => {
    assert.deepStrictEqual(
      resolveSmtp({ provider: 'custom', host: 'mail.acme.pk', port: 465 }),
      { host: 'mail.acme.pk', port: 465, secure: true },
    );
  });

  it('custom on a non-465 port defaults to STARTTLS', () => {
    assert.deepStrictEqual(
      resolveSmtp({ provider: 'custom', host: 'mail.acme.pk', port: 587 }),
      { host: 'mail.acme.pk', port: 587, secure: false },
    );
  });

  it('custom without a host is rejected (never silently sends nowhere)', () => {
    assert.throws(() => resolveSmtp({ provider: 'custom' }), /SMTP host/);
  });
});
