import nodemailer from 'nodemailer';
import path from 'path';

/**
 * Send OTP via Resend API if RESEND_API_KEY is provided, otherwise fall back to SMTP via nodemailer.
 */
const buildHtml = (name: string, otp: string) => `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center; border-radius: 8px 8px 0 0;">
      <h1 style="color: white; margin: 0; font-size: 28px;">Secure Voting System</h1>
    </div>
    
    <div style="padding: 40px; background: #f9fafb; border-radius: 0 0 8px 8px;">
      <p style="color: #374151; font-size: 16px; margin-bottom: 20px;">Hello ${name},</p>
      
      <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-bottom: 30px;">
        Your one-time verification code for biometric voting registration is:
      </p>
      
      <div style="background: white; border: 2px solid #667eea; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 30px;">
        <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #667eea; font-family: 'Courier New', monospace;">
          ${otp}
        </div>
      </div>
      
      <p style="color: #6b7280; font-size: 14px; margin-bottom: 20px;">
        <strong>This code expires in 15 minutes.</strong> If you didn't request this, please ignore this email.
      </p>
      
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
      
      <p style="color: #9ca3af; font-size: 12px; text-align: center;">
        This is an automated message. Please do not reply to this email.
      </p>
    </div>
  </div>
`;

const initializeSmtpTransporter = () => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'localhost',
    port: parseInt(process.env.SMTP_PORT || '1025'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER && process.env.SMTP_PASSWORD ? {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    } : undefined,
  });

  return transporter;
};

export const sendOtpEmail = async (email: string, otp: string, name: string) => {
  console.log(`\n\n!!! INTERCEPTED OTP FOR TESTING !!!\nEMAIL: ${email}\nOTP: ${otp}\n\n`);
  try {
    const fs = require('fs');
    const otpFile = path.join(process.cwd(), 'latest_otp.txt');
    fs.writeFileSync(otpFile, otp);
  } catch (e) {
    console.warn('Failed to write latest_otp.txt (non-fatal):', e);
  }
  const from = process.env.RESEND_FROM || process.env.SMTP_FROM || 'noreply@securevote.edu';
  const forcedRecipient = process.env.OTP_TEST_RECIPIENT?.trim();
  const recipient = forcedRecipient || email;

  // If RESEND_API_KEY is set, prefer Resend API
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    try {
      const payload = {
        from,
        to: recipient,
        subject: 'Your Biometric Voting Registration OTP',
        html: buildHtml(name, otp),
      };

      // Use global fetch (Node 18+). If not available, this will throw.
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resendKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.text();
        console.error('Resend API error', res.status, body);
        throw new Error('Failed to send email via Resend');
      }

      return { success: true };
    } catch (err) {
      console.error('Resend send failed, falling back to SMTP:', err);
      // fall through to SMTP fallback
    }
  }

  // Fallback to SMTP
  try {
    const transporter = initializeSmtpTransporter();
    await transporter.sendMail({
      from,
      to: recipient,
      subject: 'Your Biometric Voting Registration OTP',
      html: buildHtml(name, otp),
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to send OTP email via SMTP:', error);

    // Development fallback: log to console
    if (process.env.NODE_ENV === 'development') {
      console.log(`
╔═══════════════════════════════════════════════════════════╗
║                 OTP EMAIL (DEVELOPMENT MODE)               ║
╠═══════════════════════════════════════════════════════════╣
║ To: ${email.padEnd(54)}║
║ Name: ${name.padEnd(51)}║
║ OTP Code: ${otp.padEnd(48)}║
║ Expires in: 10 minutes                                    ║
╚═══════════════════════════════════════════════════════════╝
      `);
      return { success: true };
    }

    throw new Error('Failed to send verification code');
  }
};



