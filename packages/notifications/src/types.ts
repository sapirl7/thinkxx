/** Notification priority levels */
export type NotificationPriority = 'low' | 'medium' | 'high' | 'critical';

/** Notification event types */
export type NotificationType =
  | 'heartbeat_reminder'
  | 'heartbeat_overdue'
  | 'claim_started'
  | 'grace_period_expiring'
  | 'claim_cancelled'
  | 'guardian_vote_needed'
  | 'claim_finalized'
  | 'beneficiary_update_pending'
  | 'guardian_update_pending';

/** A notification to be sent */
export interface Notification {
  readonly type: NotificationType;
  readonly recipient: string;
  readonly title: string;
  readonly body: string;
  readonly priority: NotificationPriority;
  readonly data?: Record<string, unknown>;
}

/** Result of a notification delivery attempt */
export interface NotificationResult {
  readonly success: boolean;
  readonly adapter: string;
  readonly error?: string;
}

/** Interface that all notification adapters must implement */
export interface NotificationAdapter {
  readonly name: string;
  readonly isAvailable: boolean;

  send(notification: Notification): Promise<NotificationResult>;
  healthCheck(): Promise<boolean>;
}
