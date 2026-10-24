import nodemailer, { type Transporter } from 'nodemailer';
import { db } from './db.js';

interface RecipientItem {
  id: string; // member id or unique key
  name: string;
  email: string;
}

interface SendOptions {
  announcementId: string;
  groupName: string;
  subject: string;
  content: string;
  recipients: RecipientItem[];
  isRetry?: boolean;
}

interface DeliveryResult {
  total: number;
  successful: number;
  failed: number;
  recipients: Array<{
    id: string;
    email: string;
    name: string;
    status: 'delivered' | 'sent' | 'failed';
    providerMessageId?: string;
    previewUrl?: string;
    error?: string;
  }>;
}

let etherealTransporter: Transporter | null = null;

// Escape user text to prevent HTML injection while preserving line breaks
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Convert markdown-like syntax to safe HTML
function formatContentToHtml(raw: string): string {
  const escaped = escapeHtml(raw);
  
  // Format bold **text**
  let formatted = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // Format italic *text*
  formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
  // Format quote > text
  formatted = formatted.replace(/^>\s*(.*?)$/gm, '<blockquote style="border-left: 3px solid #6366f1; padding-left: 12px; margin: 12px 0; color: #4b5563;">$1</blockquote>');
  
  // Convert newlines to paragraphs / breaks
  const paragraphs = formatted.split(/\n\s*\n/).map(p => {
    const trimmed = p.trim();
    if (trimmed.startsWith('<blockquote')) return trimmed;
    return `<p style="margin: 0 0 16px 0; line-height: 1.6; color: #374151; font-size: 15px;">${trimmed.replace(/\n/g, '<br/>')}</p>`;
  });

  return paragraphs.join('\n');
}

// Generate responsive, branded HTML email template
export function buildHtmlEmail({
  subject,
  formattedBody,
  recipientName,
  groupName,
  senderName,
  appName,
}: {
  subject: string;
  formattedBody: string;
  recipientName: string;
  groupName: string;
  senderName: string;
  appName: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #1e293b;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 580px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <!-- Header -->
          <tr>
            <td style="padding: 28px 32px; border-bottom: 1px solid #f1f5f9; background-color: #ffffff;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <span style="font-weight: 700; font-size: 17px; color: #0f172a; letter-spacing: -0.3px;">${escapeHtml(appName)}</span>
                    <span style="display: inline-block; margin-left: 8px; padding: 3px 8px; background-color: #eef2ff; color: #4f46e5; font-size: 11px; font-weight: 600; border-radius: 9999px;">${escapeHtml(groupName)}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 32px 32px 24px 32px;">
              <h1 style="margin: 0 0 20px 0; font-size: 21px; font-weight: 700; color: #0f172a; line-height: 1.35; letter-spacing: -0.4px;">
                ${escapeHtml(subject)}
              </h1>
              
              <div style="color: #334155; font-size: 15px;">
                ${formattedBody}
              </div>
            </td>
          </tr>

          <!-- Signature / Footer -->
          <tr>
            <td style="padding: 24px 32px 32px 32px; border-top: 1px solid #f1f5f9; background-color: #fafafa;">
              <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: 600; color: #475569;">
                Sent by ${escapeHtml(senderName)}
              </p>
              <p style="margin: 0; font-size: 12px; color: #94a3b8; line-height: 1.5;">
                You received this announcement as a member of <strong>${escapeHtml(groupName)}</strong>.<br/>
                Community communication powered by MailFlow.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

// Get or initialize mail transporter
async function getTransporter() {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (smtpHost && smtpUser && smtpPass) {
    return {
      type: 'smtp' as const,
      transporter: nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      }),
    };
  }

  // If Resend API Key is set, we use Resend directly via fetch
  if (process.env.RESEND_API_KEY) {
    return {
      type: 'resend' as const,
      apiKey: process.env.RESEND_API_KEY,
    };
  }

  // Fallback: Ethereal test account with inspectable web preview
  if (!etherealTransporter) {
    const testAccount = await nodemailer.createTestAccount();
    etherealTransporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
  }

  return {
    type: 'ethereal' as const,
    transporter: etherealTransporter,
  };
}

export async function getEmailProviderStatus() {
  if (process.env.RESEND_API_KEY) {
    return {
      mode: 'resend',
      name: 'Resend API',
      configured: true,
      description: 'Production API with direct email delivery.',
    };
  }
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    return {
      mode: 'smtp',
      name: `Custom SMTP (${process.env.SMTP_HOST})`,
      configured: true,
      description: 'Production SMTP server with TLS/SSL.',
    };
  }
  return {
    mode: 'ethereal',
    name: 'Ethereal Sandbox (Development Preview)',
    configured: false,
    description: 'Safe sandbox environment with live inspectable web delivery URLs. No external credentials needed.',
  };
}

// Main announcement dispatcher
export async function sendAnnouncementBatch({
  announcementId,
  groupName,
  subject,
  content,
  recipients,
  isRetry = false,
}: SendOptions): Promise<DeliveryResult> {
  const provider = await getTransporter();

  // Fetch settings from DB
  const settingsRows = await db.execute('SELECT key, value FROM application_settings');
  const settings: Record<string, string> = {};
  for (const row of settingsRows.rows) {
    settings[String(row.key)] = String(row.value);
  }

  const senderName = settings['sender_name'] || 'MailFlow Announcements';
  const senderEmail = settings['sender_email'] || 'announcements@mailflow.app';
  const appName = settings['app_name'] || 'MailFlow';

  const results: DeliveryResult['recipients'] = [];
  let successful = 0;
  let failed = 0;

  for (const recipient of recipients) {
    const nowIso = new Date().toISOString();
    const recipientKey = `rec_${announcementId}_${recipient.id}`;

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipient.email)) {
      results.push({
        id: recipient.id,
        email: recipient.email,
        name: recipient.name,
        status: 'failed',
        error: 'Invalid recipient email address syntax.',
      });
      failed++;

      await db.execute({
        sql: `INSERT OR REPLACE INTO announcement_recipients 
          (id, announcement_id, member_id, email, name, status, provider_message_id, preview_url, error_message, sent_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [recipientKey, announcementId, recipient.id, recipient.email, recipient.name, 'failed', null, null, 'Invalid recipient email address syntax.', nowIso]
      });
      continue;
    }

    // Personalize content
    const firstName = recipient.name.split(' ')[0] || recipient.name;
    const personalizedRaw = content
      .replace(/\{\{first_name\}\}/gi, firstName)
      .replace(/\{\{full_name\}\}/gi, recipient.name)
      .replace(/\{\{group_name\}\}/gi, groupName);

    const personalizedSubject = subject
      .replace(/\{\{first_name\}\}/gi, firstName)
      .replace(/\{\{group_name\}\}/gi, groupName);

    const formattedBodyHtml = formatContentToHtml(personalizedRaw);
    const htmlEmail = buildHtmlEmail({
      subject: personalizedSubject,
      formattedBody: formattedBodyHtml,
      recipientName: recipient.name,
      groupName,
      senderName,
      appName,
    });

    try {
      let messageId = '';
      let previewUrl: string | undefined = undefined;

      if (provider.type === 'resend') {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${provider.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: `${senderName} <${senderEmail}>`,
            to: [recipient.email],
            subject: personalizedSubject,
            html: htmlEmail,
            text: personalizedRaw,
          }),
        });

        const data = await res.json() as any;
        if (!res.ok) {
          throw new Error(data.message || 'Resend API returned delivery failure');
        }
        messageId = data.id || `resend_${Date.now()}`;
      } else {
        // SMTP or Ethereal
        const info = await provider.transporter.sendMail({
          from: `"${senderName}" <${senderEmail}>`,
          to: `"${recipient.name}" <${recipient.email}>`,
          subject: personalizedSubject,
          text: personalizedRaw,
          html: htmlEmail,
        });

        messageId = info.messageId;
        if (provider.type === 'ethereal') {
          previewUrl = (nodemailer.getTestMessageUrl(info) as string) || undefined;
        }
      }

      results.push({
        id: recipient.id,
        email: recipient.email,
        name: recipient.name,
        status: 'delivered',
        providerMessageId: messageId,
        previewUrl,
      });
      successful++;

      await db.execute({
        sql: `INSERT OR REPLACE INTO announcement_recipients 
          (id, announcement_id, member_id, email, name, status, provider_message_id, preview_url, error_message, sent_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [recipientKey, announcementId, recipient.id, recipient.email, recipient.name, 'delivered', messageId, previewUrl || null, null, nowIso]
      });

    } catch (err: any) {
      const errorMsg = err?.message || 'Email delivery provider rejected message';
      results.push({
        id: recipient.id,
        email: recipient.email,
        name: recipient.name,
        status: 'failed',
        error: errorMsg,
      });
      failed++;

      await db.execute({
        sql: `INSERT OR REPLACE INTO announcement_recipients 
          (id, announcement_id, member_id, email, name, status, provider_message_id, preview_url, error_message, sent_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [recipientKey, announcementId, recipient.id, recipient.email, recipient.name, 'failed', null, null, errorMsg, nowIso]
      });
    }

    // Minimal throttle between recipient sends (50ms) to respect rate limits
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  // Update Announcement record
  const overallStatus = failed === 0 ? 'sent' : successful === 0 ? 'failed' : 'partial_failure';
  const now = new Date().toISOString();

  if (isRetry) {
    // Recount total successes and failures for announcement
    const countRes = await db.execute({
      sql: `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'delivered' OR status = 'sent' THEN 1 ELSE 0 END) as successes,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failures
        FROM announcement_recipients WHERE announcement_id = ?`,
      args: [announcementId]
    });
    const row = countRes.rows[0];
    const totSuccess = Number(row?.successes || 0);
    const totFailures = Number(row?.failures || 0);
    const updatedStatus = totFailures === 0 ? 'sent' : totSuccess === 0 ? 'failed' : 'partial_failure';

    await db.execute({
      sql: `UPDATE announcements SET success_count = ?, failure_count = ?, status = ? WHERE id = ?`,
      args: [totSuccess, totFailures, updatedStatus, announcementId]
    });
  } else {
    await db.execute({
      sql: `UPDATE announcements 
        SET recipient_count = ?, success_count = ?, failure_count = ?, status = ?, sent_at = ?
        WHERE id = ?`,
      args: [recipients.length, successful, failed, overallStatus, now, announcementId]
    });
  }

  // Record audit delivery attempt
  const attemptId = `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  await db.execute({
    sql: `INSERT INTO delivery_attempts (id, announcement_id, attempt_type, recipient_count, successful, failed, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [attemptId, announcementId, isRetry ? 'retry' : 'initial', recipients.length, successful, failed, now]
  });

  return {
    total: recipients.length,
    successful,
    failed,
    recipients: results,
  };
}

// Send a quick test email to verify credentials
export async function sendTestEmail(targetEmail: string): Promise<{ success: boolean; messageId?: string; previewUrl?: string; error?: string }> {
  const provider = await getTransporter();
  const settingsRows = await db.execute('SELECT key, value FROM application_settings');
  const settings: Record<string, string> = {};
  for (const row of settingsRows.rows) {
    settings[String(row.key)] = String(row.value);
  }

  const senderName = settings['sender_name'] || 'MailFlow Announcements';
  const senderEmail = settings['sender_email'] || 'announcements@mailflow.app';
  const appName = settings['app_name'] || 'MailFlow';

  const html = buildHtmlEmail({
    subject: 'MailFlow Test Delivery',
    formattedBody: '<p style="line-height: 1.6; color: #374151;">Congratulations! Your MailFlow email delivery pipeline is configured and operating correctly. You are ready to dispatch community announcements.</p>',
    recipientName: 'Community Lead',
    groupName: 'Configuration Test',
    senderName,
    appName,
  });

  try {
    if (provider.type === 'resend') {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${provider.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `${senderName} <${senderEmail}>`,
          to: [targetEmail],
          subject: 'MailFlow Delivery Pipeline Verification',
          html,
          text: 'Congratulations! Your MailFlow email delivery pipeline is configured and operating correctly.',
        }),
      });

      const data = await res.json() as any;
      if (!res.ok) {
        throw new Error(data.message || 'Resend delivery failed');
      }
      return { success: true, messageId: data.id };
    } else {
      const info = await provider.transporter.sendMail({
        from: `"${senderName}" <${senderEmail}>`,
        to: targetEmail,
        subject: 'MailFlow Delivery Pipeline Verification',
        text: 'Congratulations! Your MailFlow email delivery pipeline is configured and operating correctly.',
        html,
      });

      const previewUrl = provider.type === 'ethereal' 
        ? ((nodemailer.getTestMessageUrl(info) as string) || undefined)
        : undefined;

      return { success: true, messageId: info.messageId, previewUrl };
    }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to send test email' };
  }
}
