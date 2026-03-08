/**
 * @module @thinkxx/notifications
 *
 * Modular notification adapters for the Thinkxx protocol.
 * Notifications are UX redundancy — protocol correctness
 * never depends on notification delivery.
 *
 * See docs/NOTIFICATIONS.md for architecture details.
 */

export type { NotificationAdapter, Notification, NotificationResult } from './types';
export { NotificationRouter } from './router';
