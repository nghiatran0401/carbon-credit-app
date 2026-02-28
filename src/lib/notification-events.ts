export const notificationTypes = {
  ORDER_PAID: 'order_paid',
  ORDER_FAILED: 'order_failed',
  ORDER_CANCELLED: 'order_cancelled',
  ORDER_STATUS_UPDATED: 'order_status_updated',
  CERTIFICATE_ISSUED: 'certificate_issued',
  CREDITS_RETIRED: 'credits_retired',
  AUDIT_CREATED: 'audit_created',
  ANCHOR_CONFIRMED: 'anchor_confirmed',
  WEBHOOK_FAILED: 'webhook_failed',
} as const;

export type NotificationType = (typeof notificationTypes)[keyof typeof notificationTypes];

export const notificationPriorities = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
} as const;

export type NotificationPriority =
  (typeof notificationPriorities)[keyof typeof notificationPriorities];

export type NotificationEntityType =
  | 'order'
  | 'certificate'
  | 'audit'
  | 'anchor'
  | 'webhook'
  | 'order_item';

export type NotificationEventPayload = {
  title: string;
  message: string;
  priority: NotificationPriority;
  recipients: number[];
  entityType?: NotificationEntityType;
  entityId?: string;
  metadata?: Record<string, unknown>;
};

export type NotificationEvent = {
  type: NotificationType;
  dedupeKey: string;
  payload: NotificationEventPayload;
  emittedAt: string;
};

type BuildNotificationEventInput = {
  type: NotificationType;
  recipients: number[];
  title: string;
  message: string;
  priority?: NotificationPriority;
  entityType?: NotificationEntityType;
  entityId?: string | number;
  stateVersion?: string | number;
  externalId?: string | number;
  metadata?: Record<string, unknown>;
};

export function createNotificationDedupeKey({
  type,
  entityType,
  entityId,
  stateVersion,
  externalId,
}: {
  type: NotificationType;
  entityType?: NotificationEntityType;
  entityId?: string | number;
  stateVersion?: string | number;
  externalId?: string | number;
}) {
  const base = entityType && entityId !== undefined ? `${type}:${entityType}:${entityId}` : type;
  if (stateVersion !== undefined) {
    return `${base}:v:${stateVersion}`;
  }
  if (externalId !== undefined) {
    return `${base}:x:${externalId}`;
  }
  return base;
}

export function buildNotificationEvent(input: BuildNotificationEventInput): NotificationEvent {
  const normalizedEntityId =
    input.entityId === undefined || input.entityId === null ? undefined : String(input.entityId);

  return {
    type: input.type,
    dedupeKey: createNotificationDedupeKey({
      type: input.type,
      entityType: input.entityType,
      entityId: normalizedEntityId,
      stateVersion: input.stateVersion,
      externalId: input.externalId,
    }),
    emittedAt: new Date().toISOString(),
    payload: {
      recipients: input.recipients,
      title: input.title,
      message: input.message,
      priority: input.priority ?? notificationPriorities.INFO,
      entityType: input.entityType,
      entityId: normalizedEntityId,
      metadata: input.metadata,
    },
  };
}
