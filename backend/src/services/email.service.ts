import sgMail from '@sendgrid/mail';
import nodemailer from 'nodemailer';
import fs from 'fs/promises';
import path from 'path';
import { logger } from '../utils/logger';
import { getWebSocketService } from './websocket.service';

interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

interface EmailData {
  to: string;
  from?: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: Buffer;
    contentType?: string;
  }>;
}

interface TemplateVariables {
  [key: string]: string | number | boolean;
}

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private templates = new Map<string, EmailTemplate>();
  private emailProvider: 'sendgrid' | 'smtp';

  constructor() {
    this.emailProvider = process.env.EMAIL_PROVIDER as 'sendgrid' | 'smtp' || 'smtp';
    this.initialize();
    this.loadTemplates();
  }

  private async initialize(): Promise<void> {
    try {
      if (this.emailProvider === 'sendgrid') {
        const apiKey = process.env.SENDGRID_API_KEY;
        if (!apiKey) {
          throw new Error('SendGrid API key not provided');
        }
        sgMail.setApiKey(apiKey);
        logger.info('SendGrid initialized');
      } else {
        // SMTP configuration
        this.transporter = nodemailer.createTransporter({
          host: process.env.SMTP_HOST || 'smtp.gmail.com',
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        });

        // Verify connection
        await this.transporter.verify();
        logger.info('SMTP transporter initialized and verified');
      }
    } catch (error) {
      logger.error('Failed to initialize email service:', error);
      throw error;
    }
  }

  private async loadTemplates(): Promise<void> {
    try {
      const templatesDir = path.join(__dirname, '../templates/email');
      const templateFiles = await fs.readdir(templatesDir);

      for (const file of templateFiles) {
        if (file.endsWith('.html')) {
          const templateName = file.replace('.html', '');
          const htmlContent = await fs.readFile(
            path.join(templatesDir, file),
            'utf-8'
          );

          // Try to load corresponding text file
          let textContent: string | undefined;
          const textFile = `${templateName}.txt`;
          try {
            textContent = await fs.readFile(
              path.join(templatesDir, textFile),
              'utf-8'
            );
          } catch {
            // Text template is optional
          }

          // Extract subject from HTML title tag or use default
          const subjectMatch = htmlContent.match(/<title>(.*?)<\/title>/i);
          const subject = subjectMatch?.[1] || this.getDefaultSubject(templateName);

          this.templates.set(templateName, {
            subject,
            html: htmlContent,
            text: textContent
          });

          logger.debug(`Loaded email template: ${templateName}`);
        }
      }

      logger.info(`Loaded ${this.templates.size} email templates`);
    } catch (error) {
      logger.error('Failed to load email templates:', error);
      // Create default templates in memory
      this.createDefaultTemplates();
    }
  }

  private createDefaultTemplates(): void {
    // Application status update template
    this.templates.set('application-status-update', {
      subject: 'Application Status Update - {{institutionName}}',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
            <h1 style="color: #343a40; margin: 0;">{{institutionName}}</h1>
            <p style="color: #6c757d; margin: 5px 0;">Student Pass System</p>
          </div>
          
          <div style="padding: 30px;">
            <h2 style="color: #343a40;">Application Status Update</h2>
            
            <p>Dear {{studentName}},</p>
            
            <p>Your application for a student pass has been <strong>{{status}}</strong>.</p>
            
            {{#if message}}
            <div style="background-color: #e9ecef; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Additional Information:</strong></p>
              <p style="margin: 5px 0;">{{message}}</p>
            </div>
            {{/if}}
            
            <div style="margin: 30px 0;">
              <a href="{{dashboardUrl}}" 
                 style="background-color: #007bff; color: white; padding: 12px 24px; 
                        text-decoration: none; border-radius: 5px; display: inline-block;">
                View Application Details
              </a>
            </div>
            
            <p>If you have any questions, please contact our support team.</p>
            
            <p>Best regards,<br>{{institutionName}} Administration</p>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; font-size: 12px;">
            <p>This is an automated email. Please do not reply directly to this message.</p>
            <p>&copy; {{year}} {{institutionName}}. All rights reserved.</p>
          </div>
        </div>
      `,
      text: `
Application Status Update - {{institutionName}}

Dear {{studentName}},

Your application for a student pass has been {{status}}.

{{#if message}}
Additional Information: {{message}}
{{/if}}

View your application details: {{dashboardUrl}}

If you have any questions, please contact our support team.

Best regards,
{{institutionName}} Administration

This is an automated email. Please do not reply directly to this message.
      `
    });

    // Pass generated template
    this.templates.set('pass-generated', {
      subject: 'Your Student Pass is Ready - {{institutionName}}',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #28a745; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">🎉 Pass Generated!</h1>
            <p style="color: #d4edda; margin: 5px 0;">{{institutionName}} - Student Pass System</p>
          </div>
          
          <div style="padding: 30px;">
            <h2 style="color: #343a40;">Congratulations {{studentName}}!</h2>
            
            <p>Your student pass has been successfully generated and is now ready for use.</p>
            
            <div style="background-color: #d4edda; padding: 20px; border-radius: 5px; margin: 20px 0; text-align: center;">
              <h3 style="color: #155724; margin-top: 0;">Pass Details</h3>
              <p><strong>Pass ID:</strong> {{passId}}</p>
              <p><strong>Valid From:</strong> {{validFrom}}</p>
              <p><strong>Valid Until:</strong> {{validUntil}}</p>
              <p><strong>Institution:</strong> {{institutionName}}</p>
            </div>
            
            <div style="margin: 30px 0; text-align: center;">
              <a href="{{passUrl}}" 
                 style="background-color: #28a745; color: white; padding: 12px 24px; 
                        text-decoration: none; border-radius: 5px; display: inline-block; margin-right: 10px;">
                Download Pass
              </a>
              <a href="{{qrCodeUrl}}" 
                 style="background-color: #007bff; color: white; padding: 12px 24px; 
                        text-decoration: none; border-radius: 5px; display: inline-block;">
                View QR Code
              </a>
            </div>
            
            <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0; color: #856404;"><strong>Important:</strong> Keep your pass and QR code secure. You will need them for campus access.</p>
            </div>
            
            <p>Best regards,<br>{{institutionName}} Administration</p>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; font-size: 12px;">
            <p>This is an automated email. Please do not reply directly to this message.</p>
            <p>&copy; {{year}} {{institutionName}}. All rights reserved.</p>
          </div>
        </div>
      `
    });

    // Weekly digest template
    this.templates.set('weekly-digest', {
      subject: 'Weekly Digest - {{institutionName}} Student Pass System',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #343a40; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">📊 Weekly Digest</h1>
            <p style="color: #adb5bd; margin: 5px 0;">{{weekRange}} - {{institutionName}}</p>
          </div>
          
          <div style="padding: 30px;">
            <h2 style="color: #343a40;">System Activity Summary</h2>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 30px 0;">
              <div style="background-color: #e9ecef; padding: 20px; border-radius: 5px; text-align: center;">
                <h3 style="color: #007bff; margin: 0; font-size: 24px;">{{newApplications}}</h3>
                <p style="margin: 5px 0; color: #6c757d;">New Applications</p>
              </div>
              
              <div style="background-color: #e9ecef; padding: 20px; border-radius: 5px; text-align: center;">
                <h3 style="color: #28a745; margin: 0; font-size: 24px;">{{approvedApplications}}</h3>
                <p style="margin: 5px 0; color: #6c757d;">Approved Applications</p>
              </div>
              
              <div style="background-color: #e9ecef; padding: 20px; border-radius: 5px; text-align: center;">
                <h3 style="color: #ffc107; margin: 0; font-size: 24px;">{{generatedPasses}}</h3>
                <p style="margin: 5px 0; color: #6c757d;">Passes Generated</p>
              </div>
              
              <div style="background-color: #e9ecef; padding: 20px; border-radius: 5px; text-align: center;">
                <h3 style="color: #dc3545; margin: 0; font-size: 24px;">{{activeUsers}}</h3>
                <p style="margin: 5px 0; color: #6c757d;">Active Users</p>
              </div>
            </div>
            
            {{#if pendingActions}}
            <div style="background-color: #fff3cd; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <h3 style="color: #856404; margin-top: 0;">Pending Actions</h3>
              <ul style="color: #856404;">
                {{#each pendingActions}}
                <li>{{this}}</li>
                {{/each}}
              </ul>
            </div>
            {{/if}}
            
            <div style="margin: 30px 0; text-align: center;">
              <a href="{{dashboardUrl}}" 
                 style="background-color: #007bff; color: white; padding: 12px 24px; 
                        text-decoration: none; border-radius: 5px; display: inline-block;">
                View Full Dashboard
              </a>
            </div>
            
            <p>Best regards,<br>{{institutionName}} Administration</p>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; font-size: 12px;">
            <p>You are receiving this email because you are an administrator.</p>
            <p>To unsubscribe from weekly digests, update your notification preferences.</p>
            <p>&copy; {{year}} {{institutionName}}. All rights reserved.</p>
          </div>
        </div>
      `
    });

    logger.info('Default email templates created');
  }

  private getDefaultSubject(templateName: string): string {
    const subjects: Record<string, string> = {
      'application-status-update': 'Application Status Update',
      'pass-generated': 'Your Student Pass is Ready',
      'weekly-digest': 'Weekly System Digest',
      'password-reset': 'Password Reset Request',
      'account-verification': 'Verify Your Account'
    };
    return subjects[templateName] || 'Notification from Student Pass System';
  }

  private replaceVariables(template: string, variables: TemplateVariables): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key]?.toString() || match;
    });
  }

  public async sendEmail(emailData: EmailData): Promise<boolean> {
    try {
      if (this.emailProvider === 'sendgrid') {
        await sgMail.send({
          to: emailData.to,
          from: emailData.from || process.env.FROM_EMAIL || 'noreply@studentpass.com',
          subject: emailData.subject,
          html: emailData.html,
          text: emailData.text
        });
      } else if (this.transporter) {
        await this.transporter.sendMail({
          from: emailData.from || process.env.FROM_EMAIL || 'noreply@studentpass.com',
          to: emailData.to,
          subject: emailData.subject,
          html: emailData.html,
          text: emailData.text,
          attachments: emailData.attachments
        });
      } else {
        throw new Error('No email transporter available');
      }

      logger.info(`Email sent successfully to ${emailData.to}`);
      return true;
    } catch (error) {
      logger.error(`Failed to send email to ${emailData.to}:`, error);
      return false;
    }
  }

  public async sendTemplateEmail(
    to: string,
    templateName: string,
    variables: TemplateVariables,
    attachments?: EmailData['attachments']
  ): Promise<boolean> {
    try {
      const template = this.templates.get(templateName);
      if (!template) {
        throw new Error(`Email template '${templateName}' not found`);
      }

      // Add common variables
      const commonVariables: TemplateVariables = {
        ...variables,
        year: new Date().getFullYear(),
        currentDate: new Date().toLocaleDateString(),
        dashboardUrl: `${process.env.FRONTEND_URL}/dashboard`
      };

      const emailData: EmailData = {
        to,
        subject: this.replaceVariables(template.subject, commonVariables),
        html: this.replaceVariables(template.html, commonVariables),
        text: template.text ? this.replaceVariables(template.text, commonVariables) : undefined,
        attachments
      };

      return await this.sendEmail(emailData);
    } catch (error) {
      logger.error(`Failed to send template email '${templateName}' to ${to}:`, error);
      return false;
    }
  }

  public async sendApplicationStatusUpdate(
    applicationId: string,
    status: string,
    message?: string
  ): Promise<void> {
    try {
      const application = await prisma.application.findUnique({
        where: { id: applicationId },
        include: {
          student: {
            include: { user: true }
          },
          institution: true
        }
      });

      if (!application) {
        throw new Error('Application not found');
      }

      const variables: TemplateVariables = {
        studentName: application.student.user.name,
        status: status.charAt(0).toUpperCase() + status.slice(1),
        message: message || '',
        institutionName: application.institution.name,
        applicationId: application.id
      };

      await this.sendTemplateEmail(
        application.student.user.email,
        'application-status-update',
        variables
      );

      // Also send real-time notification
      const wsService = getWebSocketService();
      wsService.broadcastToUser(application.student.userId, 'email:sent', {
        type: 'application-status-update',
        subject: `Application ${status}`,
        timestamp: new Date()
      });
    } catch (error) {
      logger.error('Failed to send application status update email:', error);
    }
  }

  public async sendPassGenerated(passId: string): Promise<void> {
    try {
      const pass = await prisma.pass.findUnique({
        where: { id: passId },
        include: {
          student: {
            include: { user: true }
          },
          institution: true
        }
      });

      if (!pass) {
        throw new Error('Pass not found');
      }

      const variables: TemplateVariables = {
        studentName: pass.student.user.name,
        passId: pass.id,
        validFrom: pass.validFrom.toLocaleDateString(),
        validUntil: pass.validUntil.toLocaleDateString(),
        institutionName: pass.institution.name,
        passUrl: `${process.env.FRONTEND_URL}/pass/${pass.id}`,
        qrCodeUrl: `${process.env.API_URL}/api/v1/passes/${pass.id}/qr`
      };

      // Generate QR code as attachment
      const qrCodeBuffer = await this.generateQRCodeBuffer(pass.qrCode);
      const attachments = [{
        filename: 'student-pass-qr.png',
        content: qrCodeBuffer,
        contentType: 'image/png'
      }];

      await this.sendTemplateEmail(
        pass.student.user.email,
        'pass-generated',
        variables,
        attachments
      );

      // Send real-time notification
      const wsService = getWebSocketService();
      wsService.broadcastToUser(pass.student.userId, 'email:sent', {
        type: 'pass-generated',
        subject: 'Student Pass Ready',
        timestamp: new Date()
      });
    } catch (error) {
      logger.error('Failed to send pass generated email:', error);
    }
  }

  public async sendWeeklyDigest(): Promise<void> {
    try {
      // Get all admin users
      const admins = await prisma.user.findMany({
        where: {
          role: { in: ['admin', 'super_admin'] },
          isActive: true,
          emailNotifications: true
        }
      });

      // Get weekly stats
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 7);

      const [newApplications, approvedApplications, generatedPasses, activeUsers] = await Promise.all([
        prisma.application.count({
          where: { createdAt: { gte: weekStart } }
        }),
        prisma.application.count({
          where: {
            status: 'approved',
            updatedAt: { gte: weekStart }
          }
        }),
        prisma.pass.count({
          where: { createdAt: { gte: weekStart } }
        }),
        prisma.user.count({
          where: {
            lastSeen: { gte: weekStart },
            isActive: true
          }
        })
      ]);

      const pendingApplications = await prisma.application.count({
        where: { status: 'pending' }
      });

      const variables: TemplateVariables = {
        weekRange: `${weekStart.toLocaleDateString()} - ${new Date().toLocaleDateString()}`,
        newApplications,
        approvedApplications,
        generatedPasses,
        activeUsers,
        institutionName: process.env.INSTITUTION_NAME || 'Student Pass System'
      };

      // Add pending actions if any
      const pendingActions: string[] = [];
      if (pendingApplications > 0) {
        pendingActions.push(`${pendingApplications} applications pending review`);
      }

      // Send to all admins
      const emailPromises = admins.map(admin =>
        this.sendTemplateEmail(admin.email, 'weekly-digest', {
          ...variables,
          pendingActions
        })
      );

      await Promise.all(emailPromises);
      logger.info(`Weekly digest sent to ${admins.length} administrators`);
    } catch (error) {
      logger.error('Failed to send weekly digest:', error);
    }
  }

  private async generateQRCodeBuffer(qrData: string): Promise<Buffer> {
    const QRCode = require('qrcode');
    return await QRCode.toBuffer(qrData, {
      width: 200,
      margin: 2
    });
  }

  public async testEmailConnection(): Promise<boolean> {
    try {
      if (this.emailProvider === 'sendgrid') {
        // SendGrid doesn't have a direct test method, so we'll just check if API key is set
        return !!process.env.SENDGRID_API_KEY;
      } else if (this.transporter) {
        await this.transporter.verify();
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Email connection test failed:', error);
      return false;
    }
  }

  public getAvailableTemplates(): string[] {
    return Array.from(this.templates.keys());
  }
}

let emailService: EmailService | null = null;

export const getEmailService = (): EmailService => {
  if (!emailService) {
    emailService = new EmailService();
  }
  return emailService;
};