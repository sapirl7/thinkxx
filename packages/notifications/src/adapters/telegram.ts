import type { Notification, NotificationAdapter, NotificationResult } from '../types';

export interface TelegramAdapterConfig {
  botToken: string;
  chatId: string;
}

/**
 * Telegram adapter — sends notifications via Telegram Bot API.
 * Requires bot token and chat ID for the recipient.
 */
export class TelegramAdapter implements NotificationAdapter {
  readonly name = 'telegram';
  private config: TelegramAdapterConfig | null = null;

  get isAvailable(): boolean {
    return this.config !== null;
  }

  constructor(config?: TelegramAdapterConfig) {
    this.config = config ?? null;
  }

  async send(notification: Notification): Promise<NotificationResult> {
    if (!this.config) {
      return { success: false, adapter: this.name, error: 'Not configured' };
    }

    const emoji = this.getEmoji(notification.type);
    const text = [
      `${emoji} *${escapeMarkdown(notification.title)}*`,
      notification.body ? escapeMarkdown(notification.body) : '',
      notification.priority === 'critical' ? '🔴 CRITICAL' : '',
    ].filter(Boolean).join('\n');

    try {
      const url = `https://api.telegram.org/bot${this.config.botToken}/sendMessage`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: this.config.chatId,
          text,
          parse_mode: 'Markdown',
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        return { success: false, adapter: this.name, error: err };
      }

      return { success: true, adapter: this.name };
    } catch (err) {
      return {
        success: false,
        adapter: this.name,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  async healthCheck(): Promise<boolean> {
    if (!this.config) return false;

    try {
      const url = `https://api.telegram.org/bot${this.config.botToken}/getMe`;
      const response = await fetch(url);
      return response.ok;
    } catch {
      return false;
    }
  }

  private getEmoji(type: string): string {
    const map: Record<string, string> = {
      heartbeat_reminder: '💓',
      heartbeat_overdue: '⚠️',
      claim_started: '🚨',
      grace_period_expiring: '⏰',
      claim_cancelled: '❌',
      guardian_vote_needed: '🗳',
      claim_finalized: '💸',
      beneficiary_update_pending: '👤',
      guardian_update_pending: '🛡️',
    };
    return map[type] ?? '📢';
  }
}

/** Escape Telegram Markdown special characters */
function escapeMarkdown(text: string): string {
  return text.replace(/([_*[\]()~`>#+\-=|{}.!])/g, '\\$1');
}
