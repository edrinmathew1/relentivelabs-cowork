import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY || '';
export const resend = resendApiKey ? new Resend(resendApiKey) : null;

export const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'RelentiveLabs CoWork <onboarding@resend.dev>';

interface EmailTemplateOptions {
  to: string;
  subject: string;
  headline: string;
  bodyHtml: string;
  buttonText?: string;
  buttonUrl?: string;
}

export async function sendBrandedEmail({
  to,
  subject,
  headline,
  bodyHtml,
  buttonText,
  buttonUrl,
}: EmailTemplateOptions) {
  if (!resend) {
    console.warn('[Resend] RESEND_API_KEY is not configured. Email mock logged:', { to, subject });
    return { success: true, mocked: true };
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { background-color: #0A0A0A; color: #FFFFFF; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 40px 20px; }
          .container { max-width: 600px; margin: 0 auto; background-color: #141414; border: 1px solid #262626; border-radius: 8px; overflow: hidden; }
          .header { background-color: #050505; padding: 24px; border-bottom: 2px solid #E10600; text-align: center; }
          .logo { color: #FFFFFF; font-size: 20px; font-weight: 700; letter-spacing: -0.5px; text-decoration: none; }
          .logo span { color: #E10600; }
          .content { padding: 32px; color: #E5E5E5; line-height: 1.6; font-size: 15px; }
          .headline { font-size: 22px; font-weight: 700; color: #FFFFFF; margin-top: 0; margin-bottom: 16px; }
          .cta-btn { display: inline-block; background-color: #E10600; color: #FFFFFF; font-weight: 600; text-decoration: none; padding: 12px 28px; border-radius: 6px; margin-top: 20px; margin-bottom: 10px; }
          .footer { padding: 20px 32px; background-color: #0A0A0A; border-top: 1px solid #262626; text-align: center; font-size: 12px; color: #737373; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">RELENTIVE<span>LABS</span> COWORK</div>
          </div>
          <div class="content">
            <h2 class="headline">${headline}</h2>
            <div>${bodyHtml}</div>
            ${buttonText && buttonUrl ? `<a href="${buttonUrl}" class="cta-btn">${buttonText}</a>` : ''}
          </div>
          <div class="footer">
            RelentiveLabs CoWork — Internal Agency Operations Platform<br/>
            This is an automated notification.
          </div>
        </div>
      </body>
    </html>
  `;

  try {
    const data = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    });
    return { success: true, data };
  } catch (error: any) {
    console.error('[Resend Error]', error);
    return { success: false, error: error?.message || String(error) };
  }
}
