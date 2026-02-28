'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNotifications } from '@/components/notification-provider';
import {
  AlertCircle,
  Archive,
  BellRing,
  CheckCheck,
  CheckCircle2,
  Clock3,
  Inbox,
} from 'lucide-react';

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

  const statusCounts = useMemo(
    () => ({
      all: notifications.length,
      unread: notifications.filter((n) => n.status === 'unread').length,
      read: notifications.filter((n) => n.status === 'read').length,
      archived: notifications.filter((n) => n.status === 'archived').length,
    }),
    [notifications],
  );

  const getPriorityBadgeClass = (priority: string) => {
    if (priority === 'error') return 'border-red-200 bg-red-50 text-red-700';
    if (priority === 'warning') return 'border-amber-200 bg-amber-50 text-amber-700';
    if (priority === 'success') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    return 'border-slate-200 bg-slate-50 text-slate-700';
  };

  const getPriorityIcon = (priority: string) => {
    if (priority === 'error' || priority === 'warning')
      return <AlertCircle className="h-3.5 w-3.5" />;
    if (priority === 'success') return <CheckCircle2 className="h-3.5 w-3.5" />;
    return <Clock3 className="h-3.5 w-3.5" />;
  };

  const filterOptions: Array<{ key: 'all' | 'unread' | 'read' | 'archived'; label: string }> = [
    { key: 'all', label: 'All' },
    { key: 'unread', label: 'Unread' },
    { key: 'read', label: 'Read' },
    { key: 'archived', label: 'Archived' },
  ];

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8 flex flex-col gap-4 rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50/90 via-white to-white p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-100/70 px-3 py-1 text-xs font-medium text-emerald-800">
            <BellRing className="h-3.5 w-3.5" />
            Message Center
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-600">{unreadCount} unread notifications</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => markAllRead()} disabled={unreadCount === 0}>
            <CheckCheck className="mr-1.5 h-4 w-4" />
            Mark all as read
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filter notifications</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {filterOptions.map((item) => (
            <Button
              key={item.key}
              variant={filter === item.key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(item.key)}
              className="gap-2"
            >
              {item.label}
              <Badge
                variant="secondary"
                className={filter === item.key ? 'bg-white/20 text-white' : 'bg-slate-100'}
              >
                {statusCounts[item.key]}
              </Badge>
            </Button>
          ))}
        </CardContent>
      </Card>

      <div className="mt-6 space-y-3">
        {loading && <p className="text-sm text-gray-500">Loading notifications...</p>}
        {!loading && visibleNotifications.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-200 bg-white p-12 text-center">
            <Inbox className="mx-auto mb-3 h-9 w-9 text-gray-300" />
            <p className="text-base font-semibold text-gray-900">No notifications found</p>
            <p className="mt-1 text-sm text-gray-500">Try another filter or check back soon.</p>
          </div>
        )}

        {visibleNotifications.map((notification) => (
          <div
            key={notification.id}
            className={`rounded-xl border p-4 shadow-sm transition-colors ${
              notification.status === 'unread'
                ? 'border-emerald-200 bg-emerald-50/60'
                : 'border-gray-200 bg-white'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold text-gray-900">
                  {notification.title}
                </h2>
                <p className="text-xs text-gray-500">{formatTime(notification.createdAt)}</p>
              </div>
              <Badge
                variant="outline"
                className={`shrink-0 gap-1 text-[11px] capitalize ${getPriorityBadgeClass(notification.priority)}`}
              >
                {getPriorityIcon(notification.priority)}
                {notification.priority}
              </Badge>
            </div>
            <p className="mt-2 text-sm text-gray-700">{notification.message}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {notification.status === 'unread' && (
                <Button variant="outline" size="sm" onClick={() => markRead(notification.id)}>
                  Mark read
                </Button>
              )}
              {notification.status !== 'archived' && (
                <Button variant="outline" size="sm" onClick={() => archive(notification.id)}>
                  <Archive className="mr-1.5 h-3.5 w-3.5" />
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
