"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from "react";
import { Notification, NotificationContextType } from "@/types";
import { useAuth } from "./auth-context";
import { apiGet, apiPost, apiPut } from "@/lib/api";

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchTimeRef = useRef<number>(0);

  const fetchNotifications = useCallback(
    async (force = false) => {
      if (!user?.id) return;

      // Prevent rapid successive calls
      const now = Date.now();
      if (!force && now - lastFetchTimeRef.current < 5000) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await apiGet<{
          notifications: Notification[];
          unreadCount: number;
          pagination: any;
        }>(`/api/notifications?userId=${user.id}&limit=50`);

        setNotifications(response.notifications);
        setUnreadCount(response.unreadCount);
        lastFetchTimeRef.current = now;
      } catch (error: any) {
        console.error("Error fetching notifications:", error);
        setError(error.message || "Failed to fetch notifications");

        // Retry after 10 seconds on error
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
        }
        retryTimeoutRef.current = setTimeout(() => {
          fetchNotifications(true);
        }, 10000);
      } finally {
        setIsLoading(false);
      }
    },
    [user?.id]
  );

  const markAsRead = useCallback(
    async (notificationId: string) => {
      try {
        // Optimistic update
        setNotifications((prev) => prev.map((notification) => (notification.id === notificationId ? { ...notification, read: true, readAt: new Date().toISOString() } : notification)));
        setUnreadCount((prev) => Math.max(0, prev - 1));

        const response = await apiPut(`/api/notifications/${notificationId}`, {
          action: "markAsRead",
        });

        // Verify the update was successful
        if (!response) {
          throw new Error("Failed to mark notification as read");
        }
      } catch (error: any) {
        console.error("Error marking notification as read:", error);

        // Revert optimistic update on error
        await fetchNotifications(true);
      }
    },
    [fetchNotifications]
  );

  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((notification) => ({
          ...notification,
          read: true,
          readAt: new Date().toISOString(),
        }))
      );
      setUnreadCount(0);

      await apiPost(`/api/notifications/mark-all-read?userId=${user.id}`, {});
    } catch (error: any) {
      console.error("Error marking all notifications as read:", error);

      // Revert optimistic update on error
      await fetchNotifications(true);
    }
  }, [user?.id, fetchNotifications]);

  const addNotification = useCallback((notification: Omit<Notification, "id" | "createdAt" | "updatedAt">) => {
    const newNotification: Notification = {
      ...notification,
      id: `temp-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setNotifications((prev) => [newNotification, ...prev]);
    if (!notification.read) {
      setUnreadCount((prev) => prev + 1);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Fetch notifications when user changes
  useEffect(() => {
    if (user?.id) {
      fetchNotifications(true);
    } else {
      setNotifications([]);
      setUnreadCount(0);
      setError(null);
    }
  }, [user?.id, fetchNotifications]);

  // Set up intelligent polling
  useEffect(() => {
    if (!user?.id) return;

    // Clear existing intervals
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    // Start polling with exponential backoff
    let pollInterval = 30000; // Start with 30 seconds
    let consecutiveErrors = 0;

    const poll = async () => {
      try {
        await fetchNotifications();
        consecutiveErrors = 0;
        pollInterval = Math.max(30000, pollInterval * 0.8); // Decrease interval on success
      } catch (error) {
        consecutiveErrors++;
        pollInterval = Math.min(300000, pollInterval * 1.5); // Increase interval on error (max 5 minutes)
      }

      // Update polling interval
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      pollingIntervalRef.current = setInterval(poll, pollInterval);
    };

    // Initial poll
    poll();

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [user?.id, fetchNotifications]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    fetchNotifications,
    addNotification,
    clearError,
  };

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}
