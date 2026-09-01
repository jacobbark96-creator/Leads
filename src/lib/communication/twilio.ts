import { CommunicationProvider, SMSOptions, SMSResponse } from './types';

export class TwilioProvider implements CommunicationProvider {
  private accountSid: string;
  private authToken: string;

  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID || '';
    this.authToken = process.env.TWILIO_AUTH_TOKEN || '';
  }

  async sendSMS(options: SMSOptions): Promise<SMSResponse> {
    const { to, from, body, statusCallback, template, templateData } = options;

    if (!this.accountSid || !this.authToken) {
      return { success: false, sid: '', error: 'Twilio credentials missing' };
    }

    const isWhatsApp = to.startsWith('whatsapp:');
    const params = new URLSearchParams();
    params.append('To', to);
    params.append('From', from);
    if (statusCallback) {
      params.append('StatusCallback', statusCallback);
    }

    if (isWhatsApp && template && templateData) {
      params.append('ContentSid', template);
      const contentVariables: Record<string, string> = {};
      templateData.forEach((val, idx) => {
        if (val !== undefined && val !== null) {
          contentVariables[`${idx + 1}`] = String(val);
        }
      });
      if (Object.keys(contentVariables).length > 0) {
        params.append('ContentVariables', JSON.stringify(contentVariables));
      }
    } else {
      params.append('Body', body);
    }

    try {
      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${this.accountSid}:${this.authToken}`),
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params
      });

      const data = await response.json();
      if (!response.ok) {
        return { success: false, sid: '', error: data.message || 'Twilio API error' };
      }

      return {
        success: true,
        sid: data.sid,
        status: data.status
      };
    } catch (error: any) {
      return { success: false, sid: '', error: error.message };
    }
  }
}
