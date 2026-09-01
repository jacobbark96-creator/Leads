export interface SMSOptions {
  to: string;
  from: string;
  body: string;
  statusCallback?: string;
  template?: string;
  templateData?: any[];
}

export interface SMSResponse {
  success: boolean;
  sid: string;
  status?: string;
  error?: string;
}

export interface CommunicationProvider {
  sendSMS(options: SMSOptions): Promise<SMSResponse>;
}
