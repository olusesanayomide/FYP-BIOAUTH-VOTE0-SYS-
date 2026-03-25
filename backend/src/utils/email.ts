import nodemailer from 'nodemailer';

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

const buildAdminSetupHtml = (name: string, setupLink: string) => `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
    <div style="background: linear-gradient(135deg, #10b981 0%, #047857 100%); padding: 40px; text-align: center; border-radius: 8px 8px 0 0;">
      <h1 style="color: white; margin: 0; font-size: 28px;">Admin Portal Setup</h1>
    </div>
    
    <div style="padding: 40px; background: #f9fafb; border-radius: 0 0 8px 8px;">
      <p style="color: #374151; font-size: 16px; margin-bottom: 20px;">Hello ${name},</p>
      
      <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-bottom: 30px;">
        You have been invited to set up your Administrator account for the Secure Voting System. 
        Please click the button below to register your biometric credentials to access the dashboard.
      </p>
      
      <div style="text-align: center; margin-bottom: 30px;">
        <a href="${setupLink}" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
          Set Up Admin Account
        </a>
      </div>
      
      <p style="color: #6b7280; font-size: 14px; margin-bottom: 20px;">
        <strong>This link expires in 24 hours.</strong> If the button doesn't work, copy and paste this link into your browser:
        <br>
        <a href="${setupLink}" style="color: #10b981; word-break: break-all;">${setupLink}</a>
      </p>
      
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
      
      <p style="color: #9ca3af; font-size: 12px; text-align: center;">
        This is an automated message. Please do not reply to this email.
      </p>
    </div>
  </div>
`;

const buildVoteConfirmationHtml = (name: string, electionTitle: string, voteCount: number, timestamp: string) => `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
    <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 40px; text-align: center; border-radius: 8px 8px 0 0;">
      <h1 style="color: white; margin: 0; font-size: 28px;">Vote Confirmation</h1>
    </div>
    
    <div style="padding: 40px; background: #f9fafb; border-radius: 0 0 8px 8px;">
      <p style="color: #374151; font-size: 16px; margin-bottom: 20px;">Hello ${name},</p>
      
      <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
        Your ballot has been securely recorded for the election below. Your selections remain anonymous.
      </p>

      <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 18px; margin-bottom: 24px;">
        <p style="margin: 0 0 8px 0; color: #111827; font-weight: 600;">${electionTitle}</p>
        <p style="margin: 0; color: #6b7280; font-size: 14px;">Ballots cast: ${voteCount}</p>
        <p style="margin: 6px 0 0 0; color: #6b7280; font-size: 14px;">Time recorded: ${timestamp}</p>
      </div>
      
      <p style="color: #6b7280; font-size: 14px; margin-bottom: 20px;">
        If you did not cast this vote, please contact the election administrator immediately.
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
    // Avoid long hangs in production SMTP
    connectionTimeout: parseInt(process.env.SMTP_CONNECTION_TIMEOUT_MS || '10000'),
    greetingTimeout: parseInt(process.env.SMTP_GREETING_TIMEOUT_MS || '10000'),
    socketTimeout: parseInt(process.env.SMTP_SOCKET_TIMEOUT_MS || '15000'),
  });

  return transporter;
};

export const sendOtpEmail = async (email: string, otp: string, name: string) => {
  const from = process.env.RESEND_FROM || process.env.SMTP_FROM || 'noreply@securevote.edu';
  const forcedRecipient = process.env.OTP_TEST_RECIPIENT?.trim();
  const recipient = forcedRecipient || email;
  const textBody = `Hello ${name}, your one-time verification code is ${otp}. This code expires in 15 minutes.`;
  const start = Date.now();

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
    if (process.env.NODE_ENV !== 'production') {
      await transporter.verify();
    }

    const info = await transporter.sendMail({
      from,
      to: recipient,
      subject: 'Your Biometric Voting Registration OTP',
      html: buildHtml(name, otp),
      text: textBody,
      replyTo: from,
    });

    if (Array.isArray(info.rejected) && info.rejected.length > 0) {
      throw new Error(`SMTP rejected recipient(s): ${info.rejected.join(', ')}`);
    }

    console.log(`[EMAIL] OTP email accepted by SMTP server for recipient: ${recipient} in ${Date.now() - start}ms`);
    return { success: true };
} catch (error) {
    console.error('Failed to send OTP email via SMTP:', error);
    throw new Error('Failed to send verification code');
  }
};

export const sendAdminSetupEmail = async (email: string, name: string, setupLink: string) => {
  const from = process.env.RESEND_FROM || process.env.SMTP_FROM || 'noreply@securevote.edu';
  const forcedRecipient = process.env.OTP_TEST_RECIPIENT?.trim();
  const recipient = forcedRecipient || email;
  const textBody = `Hello ${name},\n\nYou have been invited to set up your Administrator account for the Secure Voting System. Please click the following link to register your biometric credentials:\n\n${setupLink}\n\nThis link expires in 24 hours.`;
  const start = Date.now();

  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    try {
      const payload = {
        from,
        to: recipient,
        subject: 'Admin Portal Setup Invitation',
        html: buildAdminSetupHtml(name, setupLink),
      };

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resendKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error('Failed to send email via Resend');
      }

      return { success: true };
    } catch (err) {
      console.error('Resend send failed, falling back to SMTP:', err);
    }
  }

  // Fallback to SMTP
  try {
    const transporter = initializeSmtpTransporter();
    if (process.env.NODE_ENV !== 'production') {
      await transporter.verify();
    }

    const info = await transporter.sendMail({
      from,
      to: recipient,
      subject: 'Admin Portal Setup Invitation',
      html: buildAdminSetupHtml(name, setupLink),
      text: textBody,
      replyTo: from,
    });

    console.log(`[EMAIL] Admin setup email accepted by SMTP server for recipient: ${recipient} in ${Date.now() - start}ms`);
    return { success: true };
  } catch (error) {
    console.error('Failed to send Admin Setup email via SMTP:', error);
    throw new Error('Failed to send Admin Setup email');
  }
};

export const sendVoteConfirmationEmail = async (
  email: string,
  name: string,
  electionTitle: string,
  voteCount: number,
  recordedAt: Date,
) => {
  const from = process.env.RESEND_FROM || process.env.SMTP_FROM || 'noreply@securevote.edu';
  const forcedRecipient = process.env.OTP_TEST_RECIPIENT?.trim();
  const recipient = forcedRecipient || email;
  const timestamp = recordedAt.toLocaleString();
  const textBody = `Hello ${name},\n\nYour ballot has been securely recorded for "${electionTitle}".\nBallots cast: ${voteCount}\nTime recorded: ${timestamp}\n\nIf you did not cast this vote, please contact the election administrator immediately.`;
  const start = Date.now();

  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    try {
      const payload = {
        from,
        to: recipient,
        subject: 'Your Vote Has Been Recorded',
        html: buildVoteConfirmationHtml(name, electionTitle, voteCount, timestamp),
      };

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resendKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error('Failed to send vote confirmation via Resend');
      }

      return { success: true };
    } catch (err) {
      console.error('Resend send failed, falling back to SMTP:', err);
    }
  }

  try {
    const transporter = initializeSmtpTransporter();
    if (process.env.NODE_ENV !== 'production') {
      await transporter.verify();
    }

    await transporter.sendMail({
      from,
      to: recipient,
      subject: 'Your Vote Has Been Recorded',
      html: buildVoteConfirmationHtml(name, electionTitle, voteCount, timestamp),
      text: textBody,
      replyTo: from,
    });

    console.log(`[EMAIL] Vote confirmation email accepted by SMTP server for recipient: ${recipient} in ${Date.now() - start}ms`);
    return { success: true };
  } catch (error) {
    console.error('Failed to send vote confirmation email via SMTP:', error);
    throw new Error('Failed to send vote confirmation email');
  }
};
