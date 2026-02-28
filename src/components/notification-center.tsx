'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, Archive, Bell, CheckCheck, CheckCircle2, Clock3, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNotifications } from '@/components/notification-provider';

function formatTime(value: string) {
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) return 'Just now';
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(timestamp);
}

export function NotificationCenter() {
  const { notifications, unreadCount, markRead, markAllRead, archive, loading } =
    useNotifications();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const recentNotifications = notifications.slice(0, 12);

  const getPriorityBadgeClass = (priority: string) => {
    if (priority === 'error') return 'border-red-200 bg-red-50 text-red-700';
    if (priority === 'warning') return 'border-amber-200 bg-amber-50 text-amber-700';
    if (priority === 'success') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    return 'border-slate-200 bg-slate-50 text-slate-600';
  };

  const getPriorityIcon = (priority: string) => {
    if (priority === 'error') return <AlertCircle className="h-3.5 w-3.5" />;
    if (priority === 'warning') return <AlertCircle className="h-3.5 w-3.5" />;
    if (priority === 'success') return <CheckCircle2 className="h-3.5 w-3.5" />;
    return <Clock3 className="h-3.5 w-3.5" />;
  };

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-emerald-50 hover:text-emerald-700"
        aria-label="Notifications"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-medium text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-[12000] w-[360px] overflow-hidden rounded-xl border bg-white shadow-xl">
          <div className="border-b bg-gradient-to-r from-emerald-50/80 to-white px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-900">Notifications</p>
                <p className="mt-0.5 text-xs text-gray-500">{unreadCount} unread</p>
              </div>
              {unreadCount > 0 && (
                <Badge className="border-emerald-200 bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                  New
                </Badge>
              )}
            </div>
          </div>

          <div className="border-b px-4 py-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => markAllRead()}
                disabled={unreadCount === 0}
                className="gap-1.5"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </Button>
              <Button variant="outline" size="sm" asChild className="gap-1.5">
                <Link href="/notifications" onClick={() => setOpen(false)}>
                  <Inbox className="h-3.5 w-3.5" />
                  Open inbox
                </Link>
              </Button>
            </div>
          </div>

          <div className="max-h-[420px] space-y-2 overflow-y-auto p-3">
            {loading && <p className="px-1 py-2 text-sm text-gray-500">Loading notifications...</p>}
            {!loading && recentNotifications.length === 0 && (
              <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50/70 px-4 py-8 text-center">
                <Inbox className="mx-auto mb-2 h-7 w-7 text-gray-300" />
                <p className="text-sm font-medium text-gray-700">No notifications yet</p>
                <p className="mt-0.5 text-xs text-gray-500">You are all caught up.</p>
              </div>
            )}
            {recentNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`rounded-lg border p-3 transition-colors ${
                  notification.status === 'unread'
                    ? 'border-emerald-200 bg-emerald-50/60'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900">
                      {notification.title}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {formatTime(notification.createdAt)}
                    </p>
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
                <div className="mt-3 flex flex-wrap gap-2">
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

          {notifications.length > recentNotifications.length && (
            <div className="border-t px-4 py-2 text-xs text-gray-500">
              Showing latest {recentNotifications.length} notifications
            </div>
          )}
        </div>
      )}
    </div>
  );
}
