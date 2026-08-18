export type WhatsAppConnectionStatus = 'UNAVAILABLE' | 'DISCONNECTED' | 'CONNECTED' | 'REVOKED';

export interface WhatsAppConnection {
  status: WhatsAppConnectionStatus;
  householdId: string;
  maskedNumber?: string;
  linkedAt?: string;
}

export interface WhatsAppLinkToken {
  code: string;
  deepLink: string;
  expiresAt: string;
}
