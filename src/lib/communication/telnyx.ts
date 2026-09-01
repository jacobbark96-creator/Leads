import { CommunicationProvider, SMSOptions, SMSResponse } from './types';

export class TelnyxProvider implements CommunicationProvider {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.TELNYX_API_KEY || '';
  }

  async sendSMS(options: SMSOptions): Promise<SMSResponse> {
    const { to, from, body, statusCallback } = options;

    if (!this.apiKey) {
      return { success: false, sid: '', error: 'Telnyx API key missing' };
    }

    // Telnyx doesn't support WhatsApp in the same way Twilio does via the same API
    // If it's a WhatsApp message, we might need a different implementation or fail gracefully
    if (to.startsWith('whatsapp:')) {
      return { success: false, sid: '', error: 'WhatsApp not supported via Telnyx provider yet' };
    }

    try {
      const response = await fetch('https://api.telnyx.com/v2/messages', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: from,
          to: to,
          text: body,
          // Telnyx uses webhooks defined on the messaging profile, 
          // but we can also pass a webhook_url if needed.
          webhook_url: statusCallback
        })
      });

      const data = await response.json();
      if (!response.ok) {
        return { 
          success: false, 
          sid: '', 
          error: data.errors?.[0]?.detail || 'Telnyx API error' 
        };
      }

      return {
        success: true,
        sid: data.data.id,
        status: data.data.status
      };
    } catch (error: any) {
      return { success: false, sid: '', error: error.message };
    }
  }
}
