import { prisma } from '@/lib/prisma';
import {
  buildNotificationEvent,
  notificationPriorities,
  notificationTypes,
} from '@/lib/notification-events';
import { notificationService } from '@/lib/notification-service';

async function getAdminUserIds() {
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN' },
    select: { id: true },
  });
  return admins.map((admin) => admin.id);
}

export async function notifyOrderPaid(userId: number, orderId: number, orderCode: number) {
  return notificationService.publishEvent(
    buildNotificationEvent({
      type: notificationTypes.ORDER_PAID,
      recipients: [userId],
      priority: notificationPriorities.SUCCESS,
      title: 'Payment confirmed',
      message: `Order #${orderCode} was paid successfully.`,
      entityType: 'order',
      entityId: orderId,
      stateVersion: 'completed',
      metadata: { orderCode },
    }),
  );
}

export async function notifyOrderFailed(userId: number, orderId: number, orderCode: number) {
  return notificationService.publishEvent(
    buildNotificationEvent({
      type: notificationTypes.ORDER_FAILED,
      recipients: [userId],
      priority: notificationPriorities.ERROR,
      title: 'Payment failed',
      message: `Payment for order #${orderCode} failed. Please retry checkout.`,
      entityType: 'order',
      entityId: orderId,
      stateVersion: 'failed',
      metadata: { orderCode },
    }),
  );
}

export async function notifyOrderCancelled(userId: number, orderId: number, orderCode: number) {
  return notificationService.publishEvent(
    buildNotificationEvent({
      type: notificationTypes.ORDER_CANCELLED,
      recipients: [userId],
      priority: notificationPriorities.WARNING,
      title: 'Payment cancelled',
      message: `Order #${orderCode} was cancelled.`,
      entityType: 'order',
      entityId: orderId,
      stateVersion: 'cancelled',
      metadata: { orderCode },
    }),
  );
}

export async function notifyOrderStatusUpdated(
  userId: number,
  orderId: number,
  orderCode: number,
  fromStatus: string,
  toStatus: string,
) {
  return notificationService.publishEvent(
    buildNotificationEvent({
      type: notificationTypes.ORDER_STATUS_UPDATED,
      recipients: [userId],
      priority: notificationPriorities.INFO,
      title: 'Order status updated',
      message: `Order #${orderCode} changed from ${fromStatus} to ${toStatus}.`,
      entityType: 'order',
      entityId: orderId,
      stateVersion: toStatus,
      metadata: { orderCode, fromStatus, toStatus },
    }),
  );
}

export async function notifyCertificateIssued(
  userId: number,
  orderId: number,
  certificateId: string,
  orderCode: number,
) {
  return notificationService.publishEvent(
    buildNotificationEvent({
      type: notificationTypes.CERTIFICATE_ISSUED,
      recipients: [userId],
      priority: notificationPriorities.SUCCESS,
      title: 'Certificate issued',
      message: `Your certificate for order #${orderCode} is now available.`,
      entityType: 'certificate',
      entityId: certificateId,
      stateVersion: certificateId,
      metadata: { orderId, orderCode, certificateId },
    }),
  );
}

export async function notifyCreditsRetired(
  userId: number,
  orderItemId: number,
  quantity: number,
  orderId: number,
) {
  return notificationService.publishEvent(
    buildNotificationEvent({
      type: notificationTypes.CREDITS_RETIRED,
      recipients: [userId],
      priority: notificationPriorities.SUCCESS,
      title: 'Credits retired',
      message: `${quantity} carbon credits were retired successfully.`,
      entityType: 'order_item',
      entityId: orderItemId,
      stateVersion: quantity,
      metadata: { orderId, orderItemId, quantity },
    }),
  );
}

export async function notifyAuditCreated(orderId: number) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { userId: true, orderCode: true },
  });
  if (!order) return;

  return notificationService.publishEvent(
    buildNotificationEvent({
      type: notificationTypes.AUDIT_CREATED,
      recipients: [order.userId],
      priority: notificationPriorities.INFO,
      title: 'Order audit created',
      message: `Audit record for order #${order.orderCode} is available.`,
      entityType: 'audit',
      entityId: orderId,
      stateVersion: 'created',
      metadata: { orderCode: order.orderCode, orderId },
    }),
  );
}

export async function notifyAnchorConfirmed(
  anchorId: number,
  orderIds: number[],
  auditCount: number,
) {
  const adminRecipients = await getAdminUserIds();
  return notificationService.publishEvent(
    buildNotificationEvent({
      type: notificationTypes.ANCHOR_CONFIRMED,
      recipients: adminRecipients,
      priority: notificationPriorities.INFO,
      title: 'Blockchain anchor confirmed',
      message: `Anchored ${auditCount} audit records to Base.`,
      entityType: 'anchor',
      entityId: anchorId,
      stateVersion: auditCount,
      metadata: { orderIds, auditCount },
    }),
  );
}

export async function notifyWebhookFailed(orderCode: number, reason: string, signature?: string) {
  const adminRecipients = await getAdminUserIds();
  return notificationService.publishEvent(
    buildNotificationEvent({
      type: notificationTypes.WEBHOOK_FAILED,
      recipients: adminRecipients,
      priority: notificationPriorities.ERROR,
      title: 'Webhook processing failed',
      message: `PayOS webhook failed for orderCode ${orderCode}: ${reason}`,
      entityType: 'webhook',
      entityId: String(orderCode),
      externalId: signature ?? reason,
      metadata: { orderCode, reason, signature },
    }),
  );
}
