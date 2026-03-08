/**
 * @thinkxx/notifications
 *
 * Modular notification system for the Thinkxx protocol.
 * Supports multiple adapters (console, telegram) with graceful fallback.
 */

export { NotificationRouter } from './router';
export { ConsoleAdapter } from './adapters/console';
export { TelegramAdapter } from './adapters/telegram';
export type { TelegramAdapterConfig } from './adapters/telegram';
export type {
  NotificationAdapter,
  Notification,
  NotificationResult,
  NotificationType,
  NotificationPriority,
} from './types';
