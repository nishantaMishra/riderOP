import fetch from "node-fetch";

export interface SMSProvider {
  name: string;
  sendSMS(
    to: string,
    message: string,
  ): Promise<{ success: boolean; error?: string; messageId?: string }>;
}

// AWS SNS SMS Provider (100 free SMS/month)
class AWSSNSProvider implements SMSProvider {
  name = "AWS SNS";

  async sendSMS(to: string, message: string) {
    try {
      const AWS = require("aws-sdk");
      const sns = new AWS.SNS({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION || "us-east-1",
      });

      const params = {
        Message: message,
        PhoneNumber: to.startsWith("+") ? to : `+1${to}`,
        MessageAttributes: {
          "AWS.SNS.SMS.SMSType": {
            DataType: "String",
            StringValue: "Transactional",
          },
        },
      };

      const result = await sns.publish(params).promise();

      return {
        success: true,
        messageId: result.MessageId,
      };
    } catch (error: any) {
      console.error("AWS SNS Error:", error);
      return {
        success: false,
        error: `AWS SNS failed: ${error.message}`,
      };
    }
  }
}

// Twilio Provider (Free trial credits available)
class TwilioProvider implements SMSProvider {
  name = "Twilio";

  async sendSMS(to: string, message: string) {
    try {
      const twilio = require("twilio");
      const client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN,
      );

      const result = await client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: to.startsWith("+") ? to : `+1${to}`,
      });

      return {
        success: true,
        messageId: result.sid,
      };
    } catch (error: any) {
      console.error("Twilio Error:", error);
      return {
        success: false,
        error: `Twilio failed: ${error.message}`,
      };
    }
  }
}

// TextBelt Provider (1 free SMS/day per number)
class TextBeltProvider implements SMSProvider {
  name = "TextBelt";

  async sendSMS(to: string, message: string) {
    try {
      const response = await fetch("https://textbelt.com/text", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: to,
          message: message,
          key: process.env.TEXTBELT_API_KEY || "textbelt", // 'textbelt' for free tier
        }),
      });

      const data = (await response.json()) as any;

      if (data.success) {
        return {
          success: true,
          messageId: data.textId,
        };
      } else {
        return {
          success: false,
          error: `TextBelt failed: ${data.error}`,
        };
      }
    } catch (error: any) {
      console.error("TextBelt Error:", error);
      return {
        success: false,
        error: `TextBelt failed: ${error.message}`,
      };
    }
  }
}

// Email OTP Provider (Completely free alternative)
class EmailProvider implements SMSProvider {
  name = "Email";

  async sendSMS(to: string, message: string) {
    try {
      // For demo purposes, we'll use a simple email service
      // In production, you'd integrate with SendGrid, Mailgun, etc.

      // Assume the 'to' parameter might be an email for this provider
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(to)) {
        return {
          success: false,
          error: "Email provider requires valid email address",
        };
      }

      // Mock email sending (replace with actual email service)
      console.log(`📧 EMAIL OTP to ${to}: ${message}`);

      // In production, integrate with email service:
      // const nodemailer = require('nodemailer');
      // const transporter = nodemailer.createTransporter({ ... });
      // await transporter.sendMail({ to, subject: 'Your OTP', text: message });

      return {
        success: true,
        messageId: `email_${Date.now()}`,
      };
    } catch (error: any) {
      console.error("Email Error:", error);
      return {
        success: false,
        error: `Email failed: ${error.message}`,
      };
    }
  }
}

// Console Provider (Development/Demo)
class ConsoleProvider implements SMSProvider {
  name = "Console (Demo)";

  async sendSMS(to: string, message: string) {
    console.log(`📱 DEMO SMS to ${to}: ${message}`);
    return {
      success: true,
      messageId: `demo_${Date.now()}`,
    };
  }
}

export class SMSService {
  private providers: SMSProvider[] = [];
  private currentProviderIndex = 0;

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders() {
    // Always add console provider for development
    if (process.env.NODE_ENV !== "production") {
      this.providers.push(new ConsoleProvider());
    }

    // Add AWS SNS if configured
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      this.providers.push(new AWSSNSProvider());
    }

    // Add Twilio if configured
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.providers.push(new TwilioProvider());
    }

    // Add TextBelt (always available, has free tier)
    this.providers.push(new TextBeltProvider());

    // Add Email as fallback
    this.providers.push(new EmailProvider());

    console.log(
      `🔧 SMS Service initialized with providers: ${this.providers.map((p) => p.name).join(", ")}`,
    );
  }

  async sendOTP(
    phoneNumber: string,
    otp: string,
  ): Promise<{ success: boolean; provider?: string; error?: string }> {
    const message = `Your RideShare Hub verification code is: ${otp}. This code expires in 5 minutes.`;

    // Try each provider in order
    for (let i = 0; i < this.providers.length; i++) {
      const provider = this.providers[this.currentProviderIndex];

      try {
        console.log(`📤 Attempting to send SMS via ${provider.name}...`);
        const result = await provider.sendSMS(phoneNumber, message);

        if (result.success) {
          console.log(
            `✅ SMS sent successfully via ${provider.name} (ID: ${result.messageId})`,
          );
          return {
            success: true,
            provider: provider.name,
          };
        } else {
          console.warn(`❌ ${provider.name} failed: ${result.error}`);
        }
      } catch (error: any) {
        console.error(`❌ ${provider.name} error:`, error.message);
      }

      // Move to next provider
      this.currentProviderIndex =
        (this.currentProviderIndex + 1) % this.providers.length;
    }

    return {
      success: false,
      error: "All SMS providers failed",
    };
  }

  getAvailableProviders(): string[] {
    return this.providers.map((p) => p.name);
  }
}

// Singleton instance
export const smsService = new SMSService();
