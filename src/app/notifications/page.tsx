'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/components/notification-provider';

function formatTime(value: string) {
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) return 'Just now';
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(timestamp);
}

export default function NotificationsPage() {
  const { notifications, unreadCount, loading, markRead, markAllRead, archive } =
    useNotifications();
  const [filter, setFilter] = useState<'all' | 'unread' | 'read' | 'archived'>('all');

  const visibleNotifications = useMemo(() => {
    if (filter === 'all') return notifications;
    return notifications.filter((item) => item.status === filter);
  }, [filter, notifications]);

  return (
    <div className="container py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-green-800">Notifications</h1>
          <p className="text-sm text-gray-500">{unreadCount} unread notifications</p>
        </div>
        <Button variant="outline" onClick={() => markAllRead()} disabled={unreadCount === 0}>
          Mark all as read
        </Button>
      </div>

      <div className="flex items-center gap-2">
        {(['all', 'unread', 'read', 'archived'] as const).map((item) => (
          <Button
            key={item}
            variant={filter === item ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(item)}
          >
            {item}
          </Button>
        ))}
      </div>

      <div className="space-y-3">
        {loading && <p className="text-sm text-gray-500">Loading notifications...</p>}
        {!loading && visibleNotifications.length === 0 && (
          <p className="text-sm text-gray-500">No notifications for this filter.</p>
        )}

        {visibleNotifications.map((notification) => (
          <div
            key={notification.id}
            className={`rounded-lg border p-4 ${notification.status === 'unread' ? 'bg-green-50 border-green-200' : 'bg-white'}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold text-gray-900">{notification.title}</h2>
                <p className="text-xs text-gray-500">{formatTime(notification.createdAt)}</p>
              </div>
              <span className="text-xs uppercase tracking-wide text-gray-500">
                {notification.priority}
              </span>
            </div>
            <p className="mt-2 text-sm text-gray-700">{notification.message}</p>
            <div className="mt-3 flex items-center gap-2">
              {notification.status === 'unread' && (
                <Button variant="outline" size="sm" onClick={() => markRead(notification.id)}>
                  Mark read
                </Button>
              )}
              {notification.status !== 'archived' && (
                <Button variant="outline" size="sm" onClick={() => archive(notification.id)}>
                  Archive
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
