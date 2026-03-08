import type { Notification, NotificationAdapter, NotificationResult } from './types';

/**
 * Routes notifications to all configured adapters.
 * Failures in individual adapters are logged but do not prevent
 * delivery through other adapters.
 */
export class NotificationRouter {
  private readonly adapters: NotificationAdapter[] = [];

  /** Register a notification adapter */
  addAdapter(adapter: NotificationAdapter): void {
    this.adapters.push(adapter);
  }

  /** Send notification through all available adapters */
  async send(notification: Notification): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];

    for (const adapter of this.adapters) {
      if (!adapter.isAvailable) {
        results.push({
          success: false,
          adapter: adapter.name,
          error: 'Adapter not available',
        });
        continue;
      }

      try {
        const result = await adapter.send(notification);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          adapter: adapter.name,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  /** Check health of all adapters */
  async healthCheck(): Promise<Record<string, boolean>> {
    const status: Record<string, boolean> = {};

    for (const adapter of this.adapters) {
      try {
        status[adapter.name] = await adapter.healthCheck();
      } catch {
        status[adapter.name] = false;
      }
    }

    return status;
  }
}
