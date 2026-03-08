import type { Notification, NotificationAdapter, NotificationResult } from '../types';

/**
 * Console adapter — logs notifications to stdout.
 * Useful for CLI and testing.
 */
export class ConsoleAdapter implements NotificationAdapter {
  readonly name = 'console';
  readonly isAvailable = true;

  async send(notification: Notification): Promise<NotificationResult> {
    const prefix = this.getPrefix(notification.type);
    console.log(`${prefix} [${notification.type}] ${notification.title}`);
    if (notification.body) {
      console.log(`  ${notification.body}`);
    }
    return { success: true, adapter: this.name };
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }

  private getPrefix(type: string): string {
    const map: Record<string, string> = {
      heartbeat_reminder: '💓',
      heartbeat_overdue: '⚠️',
      claim_started: '🚨',
      grace_period_expiring: '⏰',
      claim_cancelled: '❌',
      guardian_vote_needed: '🗳',
      claim_finalized: '💸',
      beneficiary_update_pending: '👤',
      guardian_update_pending: '🛡',
    };
    return map[type] ?? '📢';
  }
}
