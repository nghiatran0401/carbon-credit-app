'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useAuth } from '@/components/auth-context';
import { createClient } from '@/lib/supabase/client';
import type { AppNotification, PaginatedResponse } from '@/types';
import { apiGet, apiPatch } from '@/lib/api';
import { toast } from '@/hooks/use-toast';

type NotificationContextValue = {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  refresh: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  archive: (id: string) => Promise<void>;
};

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

const REFRESH_INTERVAL_MS = 90_000;

function shouldToastNotification(notification: AppNotification) {
  return notification.priority === 'warning' || notification.priority === 'error';
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const supabaseRef = useRef(createClient());
  const latestToastById = useRef<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    if (!isAuthenticated || !user?.id) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    const [list, unread] = await Promise.all([
      apiGet<PaginatedResponse<AppNotification>>('/api/notifications?limit=20'),
      apiGet<{ unreadCount: number }>('/api/notifications/unread-count'),
    ]);

    setNotifications(list.data);
    setUnreadCount(unread.unreadCount);
    setLoading(false);
  }, [isAuthenticated, user?.id]);

  const markRead = useCallback(async (id: string) => {
    const res = await apiPatch<{ notification: AppNotification }>(`/api/notifications/${id}/read`);
    setNotifications((prev) => prev.map((item) => (item.id === id ? res.notification : item)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  const markAllRead = useCallback(async () => {
    await apiPatch('/api/notifications/read-all');
    setNotifications((prev) =>
      prev.map((item) =>
        item.status === 'unread'
          ? { ...item, status: 'read', readAt: new Date().toISOString(), archivedAt: null }
          : item,
      ),
    );
    setUnreadCount(0);
  }, []);

  const archive = useCallback(async (id: string) => {
    const res = await apiPatch<{ notification: AppNotification }>(
      `/api/notifications/${id}/archive`,
    );
    setNotifications((prev) => prev.map((item) => (item.id === id ? res.notification : item)));
  }, []);

  useEffect(() => {
    if (authLoading) return;
    refresh().catch((error) => {
      console.error('Failed to load notifications:', error);
      setLoading(false);
    });
  }, [authLoading, refresh]);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      return;
    }

    const intervalId = setInterval(() => {
      refresh().catch((error) => {
        console.error('Failed to refresh notifications:', error);
      });
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [isAuthenticated, refresh, user?.id]);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      return;
    }

    const supabase = supabaseRef.current;
    const channel = supabase
      .channel(`notifications-user-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'Notification',
          filter: `userId=eq.${user.id}`,
        },
        async (payload) => {
          await refresh();

          if (payload.eventType !== 'INSERT') return;
          const inserted = payload.new as AppNotification;
          if (!inserted?.id || latestToastById.current.has(inserted.id)) return;

          if (shouldToastNotification(inserted)) {
            latestToastById.current.add(inserted.id);
            toast({
              title: inserted.title,
              description: inserted.message,
              variant: inserted.priority === 'error' ? 'destructive' : 'info',
            });
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated, refresh, user?.id]);

  const contextValue = useMemo(
    () => ({
      notifications,
      unreadCount,
      loading,
      refresh,
      markRead,
      markAllRead,
      archive,
    }),
    [archive, loading, markAllRead, markRead, notifications, refresh, unreadCount],
  );

  return (
    <NotificationContext.Provider value={contextValue}>{children}</NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}
