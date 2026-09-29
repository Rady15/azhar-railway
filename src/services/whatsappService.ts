export enum WhatsAppProvider {
  META_CLOUD = 'meta_cloud',
  TWILIO = 'twilio',
  CUSTOM = 'custom'
}

export interface WhatsAppConfig {
  provider: WhatsAppProvider;
  apiUrl: string;
  accessToken: string;
  phoneNumberId: string;
  recipientPhone: string;
  templateName?: string;
}

export interface WhatsAppMessage {
  to: string;
  body: string;
  template?: {
    name: string;
    variables: Record<string, string>;
  };
  mediaUrl?: string;
}

export interface WhatsAppDeliveryStatus {
  status: 'pending' | 'sent' | 'failed';
  providerMessageId?: string;
  sentAt?: Date;
  errorMessage?: string;
}

export class WhatsAppService {
  private config: WhatsAppConfig;
  private deliveryLog: WhatsAppDeliveryStatus[] = [];

  constructor(config: WhatsAppConfig) {
    this.config = config;
  }

  async send(message: WhatsAppMessage): Promise<WhatsAppDeliveryStatus> {
    const status: WhatsAppDeliveryStatus = {
      status: 'pending',
      sentAt: new Date()
    };

    try {
      const provider = this.config.provider;

      if (provider === WhatsAppProvider.META_CLOUD) {
        status.status = await this.sendViaMetaCloud(message);
      } else if (provider === WhatsAppProvider.TWILIO) {
        status.status = await this.sendViaTwilio(message);
      } else {
        status.status = 'failed';
        status.errorMessage = 'Unsupported provider';
      }

      status.providerMessageId = this.generateMessageId();
      this.deliveryLog.push(status);
      return status;
    } catch (err) {
      status.status = 'failed';
      status.errorMessage = err instanceof Error ? err.message : 'Unknown error';
      this.deliveryLog.push(status);
      // Don't throw - let the caller decide how to handle
      return status;
    }
  }

  private async sendViaMetaCloud(message: WhatsAppMessage): Promise<'sent' | 'failed'> {
    const url = `${this.config.apiUrl}/messages`;
    const payload: any = {
      messaging_product: 'whatsapp',
      to: message.to,
    };

    if (message.template) {
      payload.template = {
        name: message.template.name,
        language: { code: 'en_US' },
        parameters: message.template.variables
      };
    } else {
      payload.text = message.body;
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error(`Meta API error: ${res.status}`);
    return 'sent';
  }

  private async sendViaTwilio(message: WhatsAppMessage): Promise<'sent' | 'failed'> {
    // Twilio implementation - placeholder
    // Would use Twilio Client or REST API
    throw new Error('Twilio provider not yet implemented');
  }

  private generateMessageId(): string {
    return `wm_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  getDeliveryHistory(): WhatsAppDeliveryStatus[] {
    return this.deliveryLog;
  }

  async retryFailed(): Promise<WhatsAppDeliveryStatus[]> {
    const failed = this.deliveryLog.filter(d => d.status === 'failed');
    // Attempt retry for each failed message
    const results: WhatsAppDeliveryStatus[] = [];
    for (const failedMsg of failed) {
      const status = await this.send({
        to: failedMsg.errorMessage ? '' : 'pending',
        body: failedMsg.errorMessage || 'Retry attempt'
      });
      results.push(status);
    }
    return results;
  }
}

// Export a configured instance if environment variables exist
let whatsappService: WhatsAppService | null = null;

export function isWhatsAppConfigured(): boolean {
  return whatsappService !== null;
}

/** Pure builders so create-paths and the admin Retry button share one format. */
export function buildMaintenanceWhatsApp(req: {
  id?: string; tenantName?: string; unitNumber?: string; category?: string; workActivity?: string;
  description?: string; notes?: string; priority?: string; requestDate?: string; createdAt?: string;
}): string {
  const lines = [
    'طلب صيانة جديد',
    `- المستأجر: ${req.tenantName || '-'}`,
    `- الوحدة: ${req.unitNumber || '-'}`,
    `- نوع الطلب: ${req.category || req.workActivity || '-'}`,
    `- الوصف: ${req.description || req.notes || '-'}`,
    `- الأولوية: ${req.priority || '-'}`,
    `- رقم الطلب: ${req.id || '-'}`,
    `- تاريخ الطلب: ${String(req.requestDate || req.createdAt || '').slice(0, 10) || '-'}`,
  ];
  return lines.join('\n');
}

export function buildComplaintWhatsApp(c: {
  id?: string; complainantName?: string; unitNumber?: string; category?: string;
  description?: string; createdAt?: string;
}): string {
  const lines = [
    'شكوى جديدة',
    `- المستأجر: ${c.complainantName || '-'}`,
    `- الوحدة: ${c.unitNumber || '-'}`,
    `- نوع الشكوى: ${c.category || '-'}`,
    `- التفاصيل: ${c.description || '-'}`,
    `- رقم الشكوى: ${c.id || '-'}`,
    `- التاريخ: ${String(c.createdAt || '').slice(0, 10) || '-'}`,
  ];
  return lines.join('\n');
}

export function initializeWhatsAppService(): WhatsAppService | null {
  // import.meta.env is untyped for custom keys; read defensively so a missing
  // declaration never breaks the build.
  const viteEnv: Record<string, string | undefined> = (() => {
    try { return (import.meta as any)?.env || {}; } catch { return {}; }
  })();
  const nodeEnv: Record<string, string | undefined> = (globalThis as any).process?.env || {};
  const pick = (viteKey: string, nodeKey: string): string | undefined =>
    viteEnv[viteKey] ?? nodeEnv[nodeKey];

  const provider = pick('VITE_WHATSAPP_PROVIDER', 'WHATSAPP_PROVIDER');

  if (!provider) {
    console.log('WhatsApp integration not configured - no provider specified');
    return null;
  }

  const config: WhatsAppConfig = {
    provider: provider as WhatsAppProvider,
    apiUrl: pick('VITE_WHATSAPP_API_URL', 'WHATSAPP_API_URL') || 'https://graph.facebook.com/v17.0',
    accessToken: pick('VITE_WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_ACCESS_TOKEN') || '',
    phoneNumberId: pick('VITE_WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_PHONE_NUMBER_ID') || '',
    recipientPhone: pick('VITE_WHATSAPP_RECIPIENT_PHONE', 'WHATSAPP_RECIPIENT_PHONE') || '',
    templateName: pick('VITE_WHATSAPP_TEMPLATE_NAME', 'WHATSAPP_TEMPLATE_NAME'),
  };

  whatsappService = new WhatsAppService(config);
  console.log('WhatsApp service initialized', { provider: config.provider });
  return whatsappService;
}

export function getWhatsAppService(): WhatsAppService | null {
  return whatsappService;
}