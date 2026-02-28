'use client';

import Link from 'next/link';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
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

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button className="relative text-gray-600 hover:text-green-600" aria-label="Notifications">
          <Bell className="h-6 w-6" />
          {unreadCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full text-xs min-w-5 h-5 px-1 flex items-center justify-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[360px] sm:w-[420px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Notifications</SheetTitle>
        </SheetHeader>

        <div className="mt-4 flex items-center justify-between gap-2">
          <p className="text-sm text-gray-500">{unreadCount} unread</p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllRead()}
              disabled={unreadCount === 0}
            >
              Mark all read
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/notifications">Open inbox</Link>
            </Button>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {loading && <p className="text-sm text-gray-500">Loading notifications...</p>}
          {!loading && notifications.length === 0 && (
            <p className="text-sm text-gray-500">No notifications yet.</p>
          )}
          {notifications.slice(0, 10).map((notification) => (
            <div
              key={notification.id}
              className={`rounded-md border p-3 ${notification.status === 'unread' ? 'bg-green-50 border-green-200' : 'bg-white'}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{notification.title}</p>
                  <p className="text-xs text-gray-500">{formatTime(notification.createdAt)}</p>
                </div>
                <span className="text-[10px] uppercase tracking-wide text-gray-500">
                  {notification.priority}
                </span>
              </div>
              <p className="mt-2 text-sm text-gray-700">{notification.message}</p>
              <div className="mt-3 flex gap-2">
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
      </SheetContent>
    </Sheet>
  );
}
