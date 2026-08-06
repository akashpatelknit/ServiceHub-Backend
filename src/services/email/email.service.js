import nodemailer from 'nodemailer';

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }

  async sendOTP({ email, otp, purpose = 'LOGIN' }) {
    const subject = this._getOTPSubject(purpose);
    const html = this._getOTPTemplate(otp, purpose);

    try {
      const info = await this.transporter.sendMail({
        from: `"Service Hub" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: email,
        subject,
        html,
      });

      console.log('✅ OTP email sent:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('❌ Failed to send OTP email:', error);
      throw new Error('Failed to send OTP email');
    }
  }

  /**
   * Generic send — the escape hatch for callers (e.g. the auth EmailProvider adapter)
   * that build their own subject/html rather than using one of the templated methods above.
   */
  async sendRaw({ to, subject, html }) {
    try {
      const info = await this.transporter.sendMail({
        from: `"Service Hub" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to,
        subject,
        html,
      });

      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('❌ Failed to send email:', error);
      throw new Error('Failed to send email');
    }
  }

  /**
   * Send email verification link
   */
  async sendEmailVerification({ email, token, name }) {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
          .content { background: #f9fafb; padding: 30px; border-radius: 8px; margin-top: 20px; }
          .button { 
            display: inline-block; 
            padding: 12px 30px; 
            background: #4F46E5; 
            color: white; 
            text-decoration: none; 
            border-radius: 5px; 
            margin: 20px 0;
          }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Urban Cap!</h1>
          </div>
          <div class="content">
            <p>Hi ${name || 'there'},</p>
            <p>Thank you for registering with Urban Cap. Please verify your email address to complete your registration.</p>
            <p>Click the button below to verify your email:</p>
            <p style="text-align: center;">
              <a href="${verificationUrl}" class="button">Verify Email Address</a>
            </p>
            <p>Or copy and paste this link in your browser:</p>
            <p style="word-break: break-all; color: #4F46E5;">${verificationUrl}</p>
            <p><strong>This link will expire in 24 hours.</strong></p>
            <p>If you didn't create an account, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Urban Cap. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      const info = await this.transporter.sendMail({
        from: `"Urban Cap" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: email,
        subject: 'Verify Your Email Address - Urban Cap',
        html,
      });

      console.log('✅ Verification email sent:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('❌ Failed to send verification email:', error);
      throw new Error('Failed to send verification email');
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordReset({ email, token, name }) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #EF4444; color: white; padding: 20px; text-align: center; }
          .content { background: #f9fafb; padding: 30px; border-radius: 8px; margin-top: 20px; }
          .button { 
            display: inline-block; 
            padding: 12px 30px; 
            background: #EF4444; 
            color: white; 
            text-decoration: none; 
            border-radius: 5px; 
            margin: 20px 0;
          }
          .warning { background: #FEF3C7; padding: 15px; border-left: 4px solid #F59E0B; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
          </div>
          <div class="content">
            <p>Hi ${name || 'there'},</p>
            <p>We received a request to reset your password for your Urban Cap account.</p>
            <p>Click the button below to reset your password:</p>
            <p style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </p>
            <p>Or copy and paste this link in your browser:</p>
            <p style="word-break: break-all; color: #EF4444;">${resetUrl}</p>
            <div class="warning">
              <strong>⚠️ Security Notice:</strong>
              <p>This link will expire in 15 minutes for security reasons.</p>
              <p>If you didn't request a password reset, please ignore this email and ensure your account is secure.</p>
            </div>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Urban Cap. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      const info = await this.transporter.sendMail({
        from: `"Urban Cap Security" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: email,
        subject: 'Password Reset Request - Urban Cap',
        html,
      });

      console.log('✅ Password reset email sent:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('❌ Failed to send password reset email:', error);
      throw new Error('Failed to send password reset email');
    }
  }

  /**
   * Get OTP email subject based on purpose
   */
  _getOTPSubject(purpose) {
    const subjects = {
      LOGIN: 'Your Login OTP - Urban Cap',
      REGISTRATION: 'Welcome to Urban Cap - Verify Your Account',
      PASSWORD_RESET: 'Password Reset OTP - Urban Cap',
      EMAIL_VERIFY: 'Email Verification OTP - Urban Cap',
      TRANSACTION: 'Transaction Verification OTP - Urban Cap',
    };

    return subjects[purpose] || 'Your OTP - Urban Cap';
  }

  _getOTPTemplate(otp, purpose) {
    const titles = {
      LOGIN: 'Login Verification',
      REGISTRATION: 'Account Verification',
      PASSWORD_RESET: 'Password Reset',
      EMAIL_VERIFY: 'Email Verification',
      TRANSACTION: 'Transaction Verification',
    };

    const messages = {
      LOGIN: 'Use this OTP to complete your login:',
      REGISTRATION: 'Use this OTP to verify your account:',
      PASSWORD_RESET: 'Use this OTP to reset your password:',
      EMAIL_VERIFY: 'Use this OTP to verify your email:',
      TRANSACTION: 'Use this OTP to verify your transaction:',
    };

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
          .content { background: #f9fafb; padding: 30px; border-radius: 8px; margin-top: 20px; }
          .otp-box { 
            background: white; 
            border: 2px dashed #4F46E5; 
            padding: 20px; 
            text-align: center; 
            margin: 30px 0;
            border-radius: 8px;
          }
          .otp { 
            font-size: 36px; 
            font-weight: bold; 
            letter-spacing: 8px; 
            color: #4F46E5;
            font-family: monospace;
          }
          .warning { background: #FEF3C7; padding: 15px; border-left: 4px solid #F59E0B; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${titles[purpose] || 'Verification'}</h1>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>${messages[purpose] || 'Your OTP is:'}</p>
            <div class="otp-box">
              <div class="otp">${otp}</div>
              <p style="color: #666; margin-top: 10px; font-size: 14px;">Valid for 10 minutes</p>
            </div>
            <div class="warning">
              <strong>🔒 Security Tips:</strong>
              <ul style="margin: 10px 0; padding-left: 20px;">
                <li>Never share this OTP with anyone</li>
                <li>Urban Cap will never ask for your OTP via phone or email</li>
                <li>This OTP expires in 10 minutes</li>
              </ul>
            </div>
            <p>If you didn't request this OTP, please ignore this email or contact our support team.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Urban Cap. All rights reserved.</p>
            <p>Need help? Contact us at support@urbancap.com</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  async verifyConnection() {
    try {
      await this.transporter.verify();
      console.log('✅ Email service is ready');
      return true;
    } catch (error) {
      console.error('❌ Email service error:', error);
      return false;
    }
  }
}

export const emailService = new EmailService();
